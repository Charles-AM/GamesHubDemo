import { it,expect } from 'vitest';
import { hashPassword,verifyPassword,nextStreak } from './security.js';
it('salts hashes and verifies passwords in constant-length comparison',async()=>{const a=await hashPassword('a sufficiently long password'),b=await hashPassword('a sufficiently long password');expect(a).not.toBe(b);expect(await verifyPassword('a sufficiently long password',a)).toBe(true);expect(await verifyPassword('wrong',a)).toBe(false);});
it('increments only consecutive UTC login days',()=>{const now=new Date('2026-09-07T14:00:00Z');expect(nextStreak('2026-09-06',4,now).streak).toBe(5);expect(nextStreak('2026-09-07',5,now).streak).toBe(5);expect(nextStreak('2026-09-04',9,now).streak).toBe(1);});
