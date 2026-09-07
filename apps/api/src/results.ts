import { db, redis } from './db.js';
import type { GameResult } from '@arcadia/shared';

/** The PostgreSQL repository is authoritative; Redis is a rebuildable ranking projection. */
export async function saveResult(userId: string, result: GameResult, ranked = false, opponent?: string) {
  const match = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const existing = await tx.match.findUnique({ where: { userId_clientId: { userId, clientId: result.id } } });
    if (existing) return existing;
    const saved = await tx.match.create({ data: { userId, clientId: result.id, game: result.game, score: result.score, duration: result.duration, playedAt: new Date(result.playedAt), ranked, opponent } });
    // Only server-owned matches award account XP. Offline practice XP is device-local.
    if (ranked) await tx.user.update({ where: { id: userId }, data: { xp: { increment: 20 + result.score * 5 } } });
    return saved;
  });
  return match;
}
export async function rebuildRanking() {
  const best = await db.match.groupBy({ by: ['userId'], where: { game: 'pong', ranked: true }, _sum: { score: true } });
  const transaction = redis.multi().del('leaderboard:pong');
  for (const entry of best) transaction.zAdd('leaderboard:pong', { score: entry._sum.score ?? 0, value: entry.userId });
  await transaction.exec();
}
