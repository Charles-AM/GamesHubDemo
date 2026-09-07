import {randomBytes,scrypt as callback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(callback);
/** Versioned, salted password adapter. Never persist the plaintext password. */
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex'),key=await scrypt(password,salt,64) as Buffer;return `scrypt:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const [version,salt,digest]=stored.split(':');if(version!=='scrypt'||!salt||!digest||digest.length!==128)return false;const expected=Buffer.from(digest,'hex'),actual=await scrypt(password,salt,64) as Buffer;return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export function nextStreak(last:string|null,count:number,now=new Date()){const today=now.toISOString().slice(0,10),yesterday=new Date(now.getTime()-86400000).toISOString().slice(0,10);return {lastLogin:today,streak:last===today?count:last===yesterday?count+1:1};}
