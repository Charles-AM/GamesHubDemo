import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@arcadia/shared';
import { useLocal } from './state';
export const apiBase = import.meta.env.VITE_API_URL ?? '';
export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
export async function api<T>(path:string,body?:unknown,method=body?'POST':'GET'):Promise<T>{
 const res=await fetch(`${apiBase}/api${path}`,{method,credentials:'include',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 if(!res.ok){const data=await res.json().catch(()=>({}));throw new ApiError(data.error??'The server is unavailable. Try again shortly.',res.status);}
 return res.status===204?undefined as T:res.json();
}
export function useProfile(){return useQuery({queryKey:['me'],queryFn:()=>api<Profile>('/me'),retry:false});}
/** Each queued result stays bound to the account that played it. Guest data is never uploaded. */
export function useSync(){
 const {data:user}=useProfile(),pending=useLocal(s=>s.pending),ack=useLocal(s=>s.acknowledge),client=useQueryClient();
 const mutation=useMutation({mutationFn:async()=>{if(!user)return;for(const r of useLocal.getState().pending.filter(r=>r.owner===user.id)){await api('/results',r);ack(r.id,user.id);}},onSuccess:()=>{void client.invalidateQueries({queryKey:['matches']});}});
 useEffect(()=>{if(user&&pending.some(r=>r.owner===user.id)&&navigator.onLine&&!mutation.isPending&&!mutation.isError)mutation.mutate();},[user,pending,mutation.isPending,mutation.isError]);
 useEffect(()=>{const sync=()=>{mutation.reset();};window.addEventListener('online',sync);return()=>window.removeEventListener('online',sync);},[]);
 return {pending:pending.filter(r=>r.owner===user?.id).length,retry:()=>mutation.mutate(),failed:mutation.isError};
}
