import { useEffect,useRef,useState } from 'react';
import { io,type Socket } from 'socket.io-client';
import { PongEngine,type PongState } from '@arcadia/engine';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiBase } from '../api';
import { useResult } from './useResult';
export default function Pong({online}:{online:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef(new PongEngine()),snapshot=useRef<PongState>(engine.current.state),socket=useRef<Socket|null>(null),side=useRef<0|1>(0),target=useRef(240),save=useResult('pong'),saveRef=useRef(save),client=useQueryClient();
 const [status,setStatus]=useState(online?'Connecting…':'Practice vs AI'),[connected,setConnected]=useState(false),[code,setCode]=useState(''),[join,setJoin]=useState(''),[scores,setScores]=useState<[number,number]>([0,0]),[over,setOver]=useState(false);
 saveRef.current=save;
 useEffect(()=>{
  if(!online)return;
  const s=io(apiBase||undefined,{withCredentials:true});socket.current=s;
  s.on('connect',()=>{setConnected(true);setStatus('Create a room or join a friend.');});
  s.on('connect_error',err=>{setConnected(false);setStatus(err.message);});
  s.on('room:joined',(data:{code:string;side:0|1})=>{setCode(data.code);side.current=data.side;setStatus('Waiting for your opponent…');});
  s.on('room:started',()=>setStatus('Match on. You control the '+(side.current===0?'left':'right')+' paddle.'));
  s.on('game:state',(state:PongState)=>{snapshot.current=state;setScores(state.scores);});
  s.on('room:error',(message:string)=>setStatus(message));
  s.on('room:closed',(message:string)=>{setStatus(message);setCode('');});
  s.on('room:finished',(state:PongState)=>{snapshot.current=state;setScores(state.scores);setOver(true);toast.success('Match saved. Account XP earned.');void client.invalidateQueries({queryKey:['me']});void client.invalidateQueries({queryKey:['matches']});});
  s.on('disconnect',()=>{setConnected(false);setCode('');setStatus('Disconnected. Reconnect to start a new match.');});
  return()=>{s.disconnect();socket.current=null;};
 },[online]);
 useEffect(()=>{
  let frame=0,last=0,lastInput=0;const ctx=canvas.current!.getContext('2d')!,keys=new Set<string>();
  const keydown=(ev:KeyboardEvent)=>{if(ev.target instanceof HTMLInputElement)return;if(['ArrowUp','ArrowDown','w','s'].includes(ev.key)){ev.preventDefault();keys.add(ev.key);}};
  const keyup=(ev:KeyboardEvent)=>keys.delete(ev.key);
  const blur=()=>keys.clear();
  const draw=(now:number)=>{
   const dt=last?now-last:0;last=now;if(keys.has('ArrowUp')||keys.has('w'))target.current-=Math.min(dt,50)*.6;if(keys.has('ArrowDown')||keys.has('s'))target.current+=Math.min(dt,50)*.6;target.current=Math.max(50,Math.min(430,target.current));
   if(online){if(now-lastInput>34){socket.current?.emit('paddle',target.current);lastInput=now;}}else{engine.current.input(0,target.current);if(!document.hidden)engine.current.update(dt,true);snapshot.current=engine.current.state;if(snapshot.current.over){saveRef.current(snapshot.current.scores[0],snapshot.current.elapsed/1000);setOver(true);}setScores([...snapshot.current.scores]);}
   const state=snapshot.current;ctx.fillStyle='#10170e';ctx.fillRect(0,0,800,480);ctx.strokeStyle='#3d4c32';ctx.setLineDash([7,12]);ctx.beginPath();ctx.moveTo(400,0);ctx.lineTo(400,480);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#c3f85c';ctx.fillRect(22,state.paddles[0]-50,12,100);ctx.fillStyle='#c7a4f6';ctx.fillRect(766,state.paddles[1]-50,12,100);ctx.fillStyle='#f1f5e9';ctx.beginPath();ctx.arc(state.ball.x,state.ball.y,8,0,Math.PI*2);ctx.fill();frame=requestAnimationFrame(draw);
  };
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);};
 },[online]);
 return <section className="game-stage">{online&&!code&&!over&&<div className="surface row"><button className="primary" disabled={!connected} onClick={()=>socket.current?.emit('room:create')}>Create room</button><form className="row" onSubmit={ev=>{ev.preventDefault();socket.current?.emit('room:join',join.toUpperCase());}}><label>Room code<input value={join} maxLength={6} minLength={6} pattern="[a-fA-F0-9]{6}" required onChange={ev=>setJoin(ev.target.value)}/></label><button disabled={!connected}>Join room</button></form></div>}{code&&<div className="surface"><small className="muted">INVITE YOUR FRIEND</small><div className="room-code">{code}</div><button onClick={()=>navigator.clipboard.writeText(code).then(()=>toast.success('Room code copied.')).catch(()=>toast.error('Copy the code above manually.'))}>Copy code</button></div>}<p role="status" className="game-status muted">{status}</p><div className="scorebar"><strong>{online?'Left player':'You'} · {scores[0]}</strong><strong>{scores[1]} · {online?'Right player':'AI'}</strong></div><canvas ref={canvas} width={800} height={480} aria-label="Pong court. Move your pointer or use up and down arrow keys to control your paddle." onPointerDown={ev=>{ev.currentTarget.setPointerCapture(ev.pointerId);const r=ev.currentTarget.getBoundingClientRect();target.current=(ev.clientY-r.top)*480/r.height;}} onPointerMove={ev=>{const r=ev.currentTarget.getBoundingClientRect();target.current=(ev.clientY-r.top)*480/r.height;}}/><p className="muted">Move your pointer, touch the court, or use ↑ / ↓.</p>{over&&<div className="surface" role="status"><h2>{scores[side.current]>scores[1-side.current]?'Victory. Well played.':scores[0]===scores[1]?'A hard-fought draw.':'Good game. Next one is yours.'}</h2><p>{online?'Your ranked result has been saved.':'Your practice result has been saved.'} Leave the game to play again.</p></div>}</section>;
}
