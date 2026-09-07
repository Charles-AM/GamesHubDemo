import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { randomBytes, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { credentials, registration, resultInput } from '@arcadia/shared';
import { config } from './config.js';
import { db, redis, logger } from './db.js';
import { requireAuth, createSession, profileSelect, cookieOptions, authenticate, type AuthRequest } from './auth.js';
import { hashPassword, verifyPassword } from './security.js';
import { saveResult } from './results.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);
app.use(helmet(), cors({ origin: config.WEB_ORIGIN, credentials: true }), express.json({ limit: '16kb' }), cookieParser());
// Cookies cannot authorize cross-origin mutations. GET endpoints must remain side-effect free,
// except OAuth's single-use, state-bound callback.
app.use((req, res, next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin !== config.WEB_ORIGIN) { res.status(403).json({ error: 'Invalid request origin.' }); return; }
  next();
});
const limiter = (prefix: string, limit: number) => rateLimit({ windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false, store: new RedisStore({ prefix, sendCommand: (...args: string[]) => redis.sendCommand(args) as never }), message: { error: 'Too many requests. Try again in a minute.' } });
app.use('/api', limiter('rate:api:', 180));
app.use('/api/auth', limiter('rate:auth:', 15));
app.get('/health', async (_req,res) => { try { await db.$queryRaw`SELECT 1`; await redis.ping(); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'unavailable' }); } });
app.post('/api/auth/register', async (req, res) => {
  const input = registration.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({ data: { email: input.email, username: input.username, passwordHash } });
  await createSession(user.id, res);
  res.status(201).json(await db.user.findUnique({ where: { id: user.id }, select: profileSelect }));
});
const dummyHash = await hashPassword('constant-work-for-unknown-account');
app.post('/api/auth/login', async (req,res) => {
  const input = credentials.parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid || !user.passwordHash) { res.status(401).json({ error: 'Email or password is incorrect.' }); return; }
  await createSession(user.id, res);
  res.json(await db.user.findUnique({ where: { id: user.id }, select: profileSelect }));
});
app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => { await redis.del(`session:${req.sessionId}`); res.clearCookie('session', cookieOptions); res.status(204).end(); });
app.get('/api/me', requireAuth, async (req: AuthRequest,res) => { res.json(await db.user.findUniqueOrThrow({ where: { id: req.userId }, select: profileSelect })); });
app.get('/api/auth/providers', (_req,res) => res.json({ google: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI) }));
const google = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
app.get('/api/auth/google', async (_req,res) => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) { res.status(503).json({ error: 'Google sign-in is not configured.' }); return; }
  const state = randomBytes(32).toString('hex'), verifier = randomBytes(32).toString('base64url');
  await redis.set(`oauth:${state}`, verifier, { EX: 600 });
  res.cookie('oauth_state',state,{ ...cookieOptions, maxAge: 600000 });
  res.redirect(google.generateAuthUrl({ scope: ['openid','email','profile'], state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' as never }));
});
app.get('/api/auth/google/callback', async (req,res) => {
  const state = req.query.state;
  if (typeof state !== 'string' || state !== req.cookies.oauth_state || typeof req.query.code !== 'string') { res.status(400).json({ error: 'Invalid OAuth state.' }); return; }
  const verifier = await redis.getDel(`oauth:${state}`);
  res.clearCookie('oauth_state',cookieOptions);
  if (!verifier) { res.status(400).json({ error: 'Sign-in expired. Please try again.' }); return; }
  const { tokens } = await google.getToken({ code: req.query.code, codeVerifier: verifier });
  const ticket = await google.verifyIdToken({ idToken: tokens.id_token!, audience: config.GOOGLE_CLIENT_ID });
  const identity = ticket.getPayload();
  if (!identity?.email || !identity.email_verified) { res.status(401).json({ error: 'A verified Google email is required.' }); return; }
  let user = await db.user.findUnique({ where: { googleId: identity.sub } });
  if (!user) {
    // Do not silently link an existing password account by matching an email.
    if (await db.user.findUnique({ where: { email: identity.email.toLowerCase() } })) { res.redirect(`${config.WEB_ORIGIN}/login?error=existing-account`); return; }
    user = await db.user.create({ data: { googleId: identity.sub, email: identity.email.toLowerCase(), username: (identity.name ?? 'Player').slice(0,24) } });
  }
  await createSession(user.id,res); res.redirect(`${config.WEB_ORIGIN}/profile`);
});
app.post('/api/results', requireAuth, async (req: AuthRequest,res) => {
  const result = resultInput.parse(req.body);
  if (new Date(result.playedAt).getTime() > Date.now()+60000) { res.status(400).json({ error: 'Result timestamp is in the future.' }); return; }
  const match = await saveResult(req.userId!,result);
  res.status(201).json({ ...match, id: match.clientId });
});
app.get('/api/matches', requireAuth, async (req: AuthRequest,res) => {
  const rows = await db.match.findMany({ where: { userId: req.userId }, orderBy: { playedAt: 'desc' }, take: 100 });
  res.json(rows.map(row => ({ ...row, id: row.clientId })));
});
app.get('/api/leaderboard', async (req,res) => {
  const entries = await redis.zRangeWithScores('leaderboard:pong',0,99,{ REV: true });
  const users = await db.user.findMany({ where: { id: { in: entries.map(e => e.value) } }, select: { id:true,username:true } });
  const names = new Map(users.map(u => [u.id,u.username]));
  const top = entries.map((e,i) => ({ rank:i+1, userId:e.value, username:names.get(e.value) ?? 'Player', score:e.score }));
  let me = null;
  try {
    const session = await authenticate(req.cookies.session);
    const rank = await redis.zRevRank('leaderboard:pong',session.userId);
    if (rank !== null) { const user = await db.user.findUnique({ where: { id: session.userId }, select: { username:true } }); me = { rank:rank+1,userId:session.userId,username:user?.username ?? 'Player',score:await redis.zScore('leaderboard:pong',session.userId) ?? 0 }; }
  } catch { /* Public rankings also work for signed-out visitors. */ }
  res.json({ top,me });
});
app.use((error: unknown,_req: express.Request,res: express.Response,_next: express.NextFunction) => {
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') { res.status(400).json({ error:'Please check the submitted fields.' }); return; }
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') { res.status(409).json({ error:'An account with those details already exists.' }); return; }
  logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Request failed');
  res.status(500).json({ error:'Something went wrong. Please try again.' });
});
