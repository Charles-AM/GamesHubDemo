import type {Request,Response,NextFunction} from 'express';
import {SignJWT,jwtVerify} from 'jose';
import {randomUUID} from 'node:crypto';
import {config,secureCookie} from './config.js';
import {db,redis} from './db.js';
import {nextStreak} from './security.js';
const key=new TextEncoder().encode(config.JWT_SECRET);
export const cookieOptions={httpOnly:true,secure:secureCookie,sameSite:'lax' as const,path:'/'};
export type AuthRequest=Request&{userId?:string;sessionId?:string};
export async function authenticate(raw?:string){if(!raw)throw new Error('Missing session');const {payload}=await jwtVerify(raw,key,{algorithms:['HS256'],issuer:'arcadia',audience:'arcadia-web'});if(!payload.sub||!payload.jti||await redis.get(`session:${payload.jti}`)!==payload.sub)throw new Error('Expired session');return {userId:payload.sub,sessionId:payload.jti};}
export async function requireAuth(req:AuthRequest,res:Response,next:NextFunction){try{Object.assign(req,await authenticate(req.cookies.session));next();}catch{res.status(401).json({error:'Please sign in to continue.'});}}
export async function createSession(userId:string,res:Response){
 const sid=randomUUID();await redis.set(`session:${sid}`,userId,{EX:604800});
 const token=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(userId).setJti(sid).setIssuer('arcadia').setAudience('arcadia-web').setIssuedAt().setExpirationTime('7d').sign(key);
 // Serialize same-day logins so simultaneous tabs cannot increment a streak twice.
 await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;const user=await tx.user.findUniqueOrThrow({where:{id:userId}});await tx.user.update({where:{id:userId},data:nextStreak(user.lastLogin,user.streak)});});
 res.cookie('session',token,{...cookieOptions,maxAge:604800000});
}
export const profileSelect={id:true,username:true,xp:true,streak:true} as const;
