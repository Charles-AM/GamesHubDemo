import 'dotenv/config';
import {z} from 'zod';
export const config=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),PORT:z.coerce.number().default(3001),WEB_ORIGIN:z.url().default('http://localhost:5173'),DATABASE_URL:z.string().min(1),REDIS_URL:z.string().min(1),JWT_SECRET:z.string().min(32),GOOGLE_CLIENT_ID:z.string().optional(),GOOGLE_CLIENT_SECRET:z.string().optional(),GOOGLE_REDIRECT_URI:z.url().optional(),TRUST_PROXY:z.coerce.number().int().min(0).default(0)}).parse(process.env);
export const secureCookie=config.NODE_ENV==='production';
