import { z } from 'zod';
export const gameId=z.enum(['snake','pong']);
export type GameId=z.infer<typeof gameId>;
export const credentials=z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(128)});
export const registration=credentials.extend({username:z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/)});
/** Client IDs make retries idempotent, but do not attest that a score is legitimate. */
export const resultInput=z.object({id:z.uuid(),game:gameId,score:z.number().int().min(0).max(100000),duration:z.number().int().min(0).max(86400),playedAt:z.iso.datetime()});
export type GameResult=z.infer<typeof resultInput>;
export interface Profile{id:string;username:string;xp:number;streak:number;}
export interface Match extends GameResult{ranked?:boolean;opponent?:string|null;}
export interface Ranking{rank:number;username:string;score:number;userId:string;}
export interface Leaderboard{top:Ranking[];me:Ranking|null;}
