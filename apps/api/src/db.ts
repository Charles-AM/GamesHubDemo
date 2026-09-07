import {PrismaClient} from '../generated/prisma/client.js';
import {PrismaPg} from '@prisma/adapter-pg';
import {createClient} from 'redis';
import pino from 'pino';
import {config} from './config.js';
export const logger=pino({redact:['req.headers.cookie','req.headers.authorization','password','passwordHash','email']});
export const db=new PrismaClient({adapter:new PrismaPg({connectionString:config.DATABASE_URL})});
export const redis=createClient({url:config.REDIS_URL});
redis.on('error',error=>logger.error({message:error.message},'Redis connection error'));
