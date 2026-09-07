import {describe,it,expect} from 'vitest';
import {SnakeEngine,PongEngine} from './index.js';
describe('Snake',()=>{
 it('rejects reversal across buffered inputs',()=>{const s=new SnakeEngine();s.turn('up');s.turn('left');s.update(180);expect(s.snake[0]).toEqual({x:10,y:9});});
 it('wraps with ghost power',()=>{const s=new SnakeEngine();s.snake=[{x:19,y:10}];s.ghostUntil=5000;s.update(180);expect(s.snake[0].x).toBe(0);expect(s.over).toBe(false);});
 it('hits obstacles',()=>{const s=new SnakeEngine();s.snake=[{x:4,y:5}];s.update(180);expect(s.over).toBe(true);});
 it('allows a vacating tail cell',()=>{const s=new SnakeEngine();s.snake=[{x:10,y:10},{x:10,y:11},{x:11,y:11},{x:11,y:10}];s.update(180);expect(s.over).toBe(false);});
 it('grows and scores once',()=>{const s=new SnakeEngine();s.food={x:11,y:10};s.update(180);expect(s.score).toBe(10);expect(s.snake).toHaveLength(4);});
 it('expires ghost power before a wall collision',()=>{const s=new SnakeEngine();s.snake=[{x:19,y:10}];s.ghostUntil=100;s.update(180);expect(s.over).toBe(true);});
});
describe('Pong',()=>{
 it('is consistent across render rates',()=>{const a=new PongEngine(),b=new PongEngine();for(let i=0;i<60;i++)a.update(1000/60);for(let i=0;i<120;i++)b.update(1000/120);expect(a.state.ball.x).toBeCloseTo(b.state.ball.x,4);});
 it('rejects nonfinite input and clamps targets',()=>{const p=new PongEngine();p.input(0,Infinity);expect(p.targets[0]).toBe(240);p.input(0,-900);expect(p.targets[0]).toBe(50);});
 it('finishes at seven',()=>{const p=new PongEngine();p.state.scores[0]=6;p.state.ball.x=809;p.update(20);expect(p.state.scores[0]).toBe(7);expect(p.state.over).toBe(true);});
});
