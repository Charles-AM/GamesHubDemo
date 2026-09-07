import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { Leaderboard as Rankings } from '@arcadia/shared';
import { api,apiBase,useProfile } from './api';
import { Link } from 'react-router-dom';
export default function Leaderboard(){
 const {data:user}=useProfile();
 const query=useQuery({queryKey:['leaderboard'],queryFn:()=>api<Rankings>('/leaderboard'),refetchInterval:30000});
 useEffect(()=>{if(!user)return;const socket=io(apiBase||undefined,{withCredentials:true});socket.on('leaderboard:updated',()=>void query.refetch());return()=>{socket.disconnect();};},[user?.id]);
 return <main><p className="eyebrow">THE GLOBAL TOP 100</p><h1>A little friendly rivalry.</h1><p className="muted">Pong points earned in completed online matches. Practice scores stay unranked.</p><Link className="primary" to="/game/pong">Challenge a friend ↗</Link><section className="surface">{query.isPending?<div className="skeleton"/>:query.isError?<div role="alert"><p>Rankings are unavailable right now.</p><button onClick={()=>query.refetch()}>Try again</button></div>:<>{query.data.me&&<p>Your rank: #{query.data.me.rank} · {query.data.me.score} points</p>}{!query.data.top.length?<p>The board is wide open. Finish an online Pong match to set the pace.</p>:<div className="table-scroll"><table><thead><tr><th>Rank</th><th>Player</th><th>Points</th></tr></thead><tbody>{query.data.top.map(r=><tr key={r.userId}><td>#{r.rank}</td><td>{r.username}</td><td>{r.score}</td></tr>)}</tbody></table></div>}</>}</section></main>;
}
