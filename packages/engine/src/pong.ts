export interface PongState{ball:{x:number;y:number;vx:number;vy:number};paddles:[number,number];scores:[number,number];over:boolean;elapsed:number;}
/** Shared 120 Hz simulation. Inputs are targets; clients cannot teleport paddles or submit ranked scores. */
export class PongEngine{
 readonly width=800;readonly height=480;
 state:PongState={ball:{x:400,y:240,vx:330,vy:150},paddles:[240,240],scores:[0,0],over:false,elapsed:0};
 targets:[number,number]=[240,240];private accumulator=0;
 input(player:0|1,y:number){if(Number.isFinite(y))this.targets[player]=Math.max(50,Math.min(430,y));}
 update(deltaMs:number,ai=false){if(this.state.over||!Number.isFinite(deltaMs)||deltaMs<=0)return;this.accumulator+=Math.min(deltaMs,100);while(this.accumulator>=1000/120&&!this.state.over){this.accumulator-=1000/120;this.step(1/120,ai);}}
 private step(dt:number,ai:boolean){const s=this.state,b=s.ball;s.elapsed+=dt*1000;if(s.elapsed>=300000){s.over=true;return;}if(ai)this.targets[1]=b.y;
  for(const p of [0,1] as const){const speed=ai&&p===1?245:560;s.paddles[p]=Math.max(50,Math.min(430,s.paddles[p]+Math.max(-speed*dt,Math.min(speed*dt,this.targets[p]-s.paddles[p]))));}
  b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<8||b.y>472){b.y=Math.max(8,Math.min(472,b.y));b.vy*=-1;}
  for(const p of [0,1] as const)if((p===0?b.vx<0&&b.x<=38&&b.x>=20:b.vx>0&&b.x>=762&&b.x<=780)&&Math.abs(b.y-s.paddles[p])<=58){b.x=p===0?39:761;b.vx=(p===0?1:-1)*Math.min(650,Math.abs(b.vx)*1.07);b.vy=(b.y-s.paddles[p])*7;}
  if(b.x< -8||b.x>808){const scorer=b.x<0?1:0;s.scores[scorer]++;s.over=s.scores[scorer]>=7;s.ball={x:400,y:240,vx:scorer===0?-330:330,vy:150};}
 }
}
