export type Point={x:number;y:number};
export type Direction='up'|'down'|'left'|'right';
const vectors:Record<Direction,Point>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
/** Fixed-step rules, independent of React, canvas, and browser scheduling. */
export class SnakeEngine{
 readonly size=20;
 snake:Point[]=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
 obstacles:Point[]=[{x:5,y:5},{x:6,y:5},{x:14,y:14},{x:15,y:14}];
 direction:Direction='right';private next:Direction='right';private accumulator=0;
 elapsed=0;score=0;over=false;ghostUntil=0;boostUntil=0;food:Point;
 power:(Point&{kind:'ghost'|'boost'})|null=null;
 constructor(private random:()=>number=Math.random){this.food=this.freeCell()!;}
 get ghost(){return this.elapsed<this.ghostUntil;}
 get boost(){return this.elapsed<this.boostUntil;}
 get interval(){return Math.max(65,180-this.score/5)*(this.boost?.65:1);}
 turn(dir:Direction){const a=vectors[this.direction],b=vectors[dir];if(a.x!==-b.x||a.y!==-b.y)this.next=dir;}
 private freeCell():Point|null{
  // Enumerating cells guarantees termination when the board is full.
  const free:Point[]=[];for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){const p={x,y};if(![...this.snake,...this.obstacles].some(s=>same(s,p))&&(!this.power||!same(this.power,p)))free.push(p);}
  return free[Math.min(free.length-1,Math.floor(this.random()*free.length))]??null;
 }
 update(deltaMs:number){if(this.over||!Number.isFinite(deltaMs)||deltaMs<=0)return;const dt=Math.min(deltaMs,250);this.elapsed+=dt;if(this.elapsed>=60000){this.over=true;return;}this.accumulator+=dt;while(this.accumulator>=this.interval&&!this.over){this.accumulator-=this.interval;this.step();}}
 private step(){
  this.direction=this.next;const v=vectors[this.direction],head={x:this.snake[0].x+v.x,y:this.snake[0].y+v.y};
  if(this.ghost){head.x=(head.x+this.size)%this.size;head.y=(head.y+this.size)%this.size;}
  const eating=same(head,this.food),body=eating?this.snake:this.snake.slice(0,-1);
  // The tail vacates on a non-growing step, so entering its old cell is legal.
  if(head.x<0||head.x>=this.size||head.y<0||head.y>=this.size||body.some(s=>same(s,head))||this.obstacles.some(s=>same(s,head))){this.over=true;return;}
  this.snake.unshift(head);if(!eating)this.snake.pop();
  if(this.power&&same(head,this.power)){if(this.power.kind==='ghost')this.ghostUntil=this.elapsed+6000;else this.boostUntil=this.elapsed+5000;this.power=null;}
  if(eating){this.score+=this.boost?20:10;const food=this.freeCell();if(!food){this.over=true;return;}this.food=food;if(!this.power&&this.score%30===0){const p=this.freeCell();if(p&&!same(p,food))this.power={...p,kind:this.random()<.5?'ghost':'boost'};}}
 }
}
