import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameResult } from '@arcadia/shared';
interface Pending extends GameResult { owner: string | null; }
interface LocalState { light: boolean; history: Pending[]; pending: Pending[]; setLight: (v:boolean)=>void; record:(r:GameResult,owner:string|null)=>void; acknowledge:(id:string,owner:string)=>void; }
export const useLocal = create<LocalState>()(persist((set)=>({light:false,history:[],pending:[],setLight:light=>set({light}),record:(r,owner)=>set(s=>({history:[{...r,owner},...s.history].slice(0,100),pending:owner?[...s.pending,{...r,owner}].slice(-100):s.pending})),acknowledge:(id,owner)=>set(s=>({pending:s.pending.filter(r=>!(r.id===id&&r.owner===owner))}))}),{name:'arcadia-progress-v1',version:1}));
