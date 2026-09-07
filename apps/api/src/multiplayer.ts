import type {Server as HttpServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {Server,type Socket} from 'socket.io';
import {PongEngine} from '@arcadia/engine';
import {config} from './config.js';
import {authenticate} from './auth.js';
import {redis,logger,db} from './db.js';
import {rebuildRanking} from './results.js';
interface Player{socket:Socket;userId:string;sessionId:string;}
interface Room{code:string;id:string;players:Player[];engine:PongEngine;created:number;started?:number;saving?:boolean;retryAt?:number;}
export function attachMultiplayer(server:HttpServer){
 const io=new Server(server,{cors:{origin:config.WEB_ORIGIN,credentials:true},maxHttpBufferSize:2048,allowRequest:(req,cb)=>cb(null,req.headers.origin===config.WEB_ORIGIN)}),rooms=new Map<string,Room>();
 io.use(async(socket,next)=>{try{const cookies=Object.fromEntries((socket.handshake.headers.cookie??'').split(';').map(s=>{const i=s.indexOf('=');return [s.slice(0,i).trim(),s.slice(i+1)];}));socket.data.auth=await authenticate(cookies.session);const key=`socket-connect:${socket.data.auth.userId}`;const count=await redis.incr(key);if(count===1)await redis.expire(key,60);if(count>20)throw new Error('Connection limit');next();}catch{next(new Error('Sign in to play online, or try again in a minute.'));}});
 const close=(room:Room,reason:string)=>{io.to(room.code).emit('room:closed',reason);for(const p of room.players){p.socket.leave(room.code);delete p.socket.data.room;}rooms.delete(room.code);};
 io.on('connection',socket=>{
  let start=Date.now(),events=0;
  socket.use((_packet,next)=>{if(Date.now()-start>1000){start=Date.now();events=0;}if(++events>90){socket.disconnect(true);return;}next();});
  const player=():Player=>({socket,...socket.data.auth});
  const occupied=()=>[...rooms.values()].some(r=>r.players.some(p=>p.userId===socket.data.auth.userId));
  socket.on('room:create',()=>{if(socket.data.room)return;if(rooms.size>=100||occupied()){socket.emit('room:error','You already have a room, or the arcade is full.');return;}let code:string;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const room:Room={code,id:randomUUID(),players:[player()],engine:new PongEngine(),created:Date.now()};rooms.set(code,room);socket.join(code);socket.data.room=code;socket.emit('room:joined',{code,side:0});});
  socket.on('room:join',(raw:unknown)=>{if(socket.data.room)return;if(typeof raw!=='string'||!/^[A-F0-9]{6}$/.test(raw)){socket.emit('room:error','Enter a six-character room code.');return;}const room=rooms.get(raw);if(!room||room.players.length!==1||occupied()){socket.emit('room:error','Room unavailable. Try another code.');return;}room.players.push(player());room.started=Date.now();socket.join(raw);socket.data.room=raw;socket.emit('room:joined',{code:raw,side:1});io.to(raw).emit('room:started');});
  socket.on('paddle',(y:unknown)=>{const room=rooms.get(socket.data.room);if(!room||typeof y!=='number'||!Number.isFinite(y))return;const side=room.players.findIndex(p=>p.socket.id===socket.id);if(side===0||side===1)room.engine.input(side,y);});
  const leave=()=>{const room=rooms.get(socket.data.room);if(room&&!room.engine.state.over)close(room,'A player left. This match was not ranked.');};socket.on('room:leave',leave);socket.on('disconnect',leave);
 });
 async function finish(room:Room){
  room.saving=true;
  try{
   // Commit both players and their XP atomically. Stable keys also make retries safe.
   await db.$transaction(async tx=>{
    for(const p of [...room.players].sort((a,b)=>a.userId.localeCompare(b.userId)))await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${p.userId} FOR UPDATE`;
    for(const [side,p] of room.players.entries()){
     const clientId=`${room.id}:${side}`;if(await tx.match.findUnique({where:{userId_clientId:{userId:p.userId,clientId}}}))continue;
     const opponent=await tx.user.findUniqueOrThrow({where:{id:room.players[1-side].userId},select:{username:true}}),score=room.engine.state.scores[side];
     await tx.match.create({data:{clientId,userId:p.userId,game:'pong',score,duration:Math.round(room.engine.state.elapsed/1000),playedAt:new Date(),ranked:true,opponent:opponent.username}});
     await tx.user.update({where:{id:p.userId},data:{xp:{increment:20+score*5}}});
    }
   });
   await rebuildRanking();io.emit('leaderboard:updated');io.to(room.code).emit('room:finished',room.engine.state);close(room,'Match saved. Ready for another round?');
  }catch(error){logger.error({error:String(error)},'Match save failed; retrying in five seconds');room.saving=false;room.retryAt=Date.now()+5000;}
 }
 let last=performance.now(),ticks=0,checking=false;
 const interval=setInterval(()=>{
  const now=performance.now(),dt=now-last;last=now;
  for(const room of rooms.values()){
   if(!room.started&&Date.now()-room.created>300000){close(room,'Room expired. Create a new one.');continue;}
   if(room.players.length===2){if(room.engine.state.over){if(!room.saving&&Date.now()>=(room.retryAt??0))void finish(room);continue;}room.engine.update(dt);io.to(room.code).emit('game:state',room.engine.state);}
  }
  // Logged-out or expired sessions cannot continue playing on an existing socket.
  if(++ticks%30===0&&!checking){checking=true;void(async()=>{try{for(const room of rooms.values())for(const p of room.players)if(await redis.get(`session:${p.sessionId}`)!==p.userId)p.socket.disconnect(true);}catch{for(const room of rooms.values())if(!room.engine.state.over)close(room,'Connection to the session service was lost.');}finally{checking=false;}})();}
 },1000/30);
 return {io,stop:async()=>{clearInterval(interval);await io.close();}};
}
