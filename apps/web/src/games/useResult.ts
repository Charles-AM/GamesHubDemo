import { useRef } from 'react';
import { toast } from 'sonner';
import type { GameId } from '@arcadia/shared';
import { useLocal } from '../state';
import { useProfile } from '../api';
export function useResult(game:GameId){
 const {data:user}=useProfile(),owner=useRef(user?.id??null),record=useLocal(s=>s.record),recorded=useRef(false);
 return (score:number,duration:number)=>{if(recorded.current)return;recorded.current=true;record({id:crypto.randomUUID(),game,score,duration:Math.round(duration),playedAt:new Date().toISOString()},owner.current);toast.success('Round complete. +10 practice XP',{description:'Your result is saved on this device.'});};
}
