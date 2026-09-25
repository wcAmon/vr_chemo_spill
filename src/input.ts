import type {UniversalCamera} from '@babylonjs/core';
export interface InputActions {action(code:string):void;pause():void;}
export interface Movement {x:number;y:number;}
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight']);
export class GameInput {
 active=false;touchMode=false;private published=false;
 private keys=new Set<string>();private pending=new Set<string>();private drag=false;private ignoreUnlock=false;
 private analog:Movement={x:0,y:0};private resets=new Set<()=>void>();
 constructor(private canvas:HTMLCanvasElement,private camera:UniversalCamera,private actions:InputActions){
  window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.blur);
  window.addEventListener('pointermove',this.move);window.addEventListener('pointerup',this.mouseUp);window.addEventListener('orientationchange',this.reset);
  canvas.addEventListener('pointerdown',this.mouseDown);canvas.addEventListener('contextmenu',this.context);
  document.addEventListener('pointerlockchange',this.lock);document.addEventListener('visibilitychange',this.visibility);
 }
 frameKeys():ReadonlySet<string>{const keys=new Set([...this.keys,...this.pending]);this.pending.clear();return keys;}
 frameMovement():Movement{const keys=this.frameKeys();if(!this.active)return {x:0,y:0};const x=this.analog.x+Number(keys.has('KeyD'))-Number(keys.has('KeyA')),y=this.analog.y+Number(keys.has('KeyW'))-Number(keys.has('KeyS')),length=Math.max(1,Math.hypot(x,y));return {x:x/length,y:y/length};}
 get running():boolean{return this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');}
 setMove(x:number,y:number):void{if(!this.active||![x,y].every(Number.isFinite))return;const length=Math.max(1,Math.hypot(x,y));this.analog={x:x/length,y:y/length};}
 look(yaw:number,pitch:number):void{if(!this.active||![yaw,pitch].every(Number.isFinite))return;this.camera.rotation.y+=yaw;this.camera.rotation.x=Math.max(-1.4,Math.min(1.4,this.camera.rotation.x+pitch));}
 onReset(fn:()=>void):()=>void{this.resets.add(fn);return ()=>this.resets.delete(fn);}
 private reset=()=>{this.keys.clear();this.pending.clear();this.analog={x:0,y:0};this.drag=false;for(const fn of this.resets)fn();};
 setPublished(value:boolean):void{this.published=value;this.drag=false;}
 setTouchMode(touch:boolean):void{this.touchMode=touch;this.reset();if(touch)this.unlock();}
 resume(lock=true):void{this.active=true;this.canvas.focus({preventScroll:true});if(lock&&!this.touchMode)try{const request=this.canvas.requestPointerLock?.();if(request&&'catch' in request)request.catch(()=>{});}catch{}}
 private unlock():void{if(document.pointerLockElement===this.canvas){this.ignoreUnlock=true;document.exitPointerLock();}}
 pause():void{this.active=false;this.reset();this.unlock();}
 trigger(code:string):void{
  if(code==='Escape'){if(this.active){this.pause();this.actions.pause();}else this.actions.action(code);return;}
  if(!this.active)return;
  if(['KeyF','MouseLeft'].includes(code))this.actions.action(code);
  if(this.active)this.canvas.focus({preventScroll:true});
 }
 private down=(event:KeyboardEvent)=>{
  if(event.metaKey||event.ctrlKey||event.altKey)return;
  const editing=event.target instanceof Element&&!!event.target.closest('input,textarea,select,[contenteditable="true"]');
  if(event.code==='Escape'){event.preventDefault();this.trigger('Escape');return;}
  if(editing)return;
  if(!this.active)return;
  if(document.activeElement!==this.canvas&&document.pointerLockElement!==this.canvas)return;
  if(movement.has(event.code)){event.preventDefault();this.keys.add(event.code);this.pending.add(event.code);return;}
  if(event.code.startsWith('Arrow')){event.preventDefault();this.look((Number(event.code==='ArrowRight')-Number(event.code==='ArrowLeft'))*.1,(Number(event.code==='ArrowDown')-Number(event.code==='ArrowUp'))*.1);return;}
  if(['KeyF'].includes(event.code)){event.preventDefault();if(!event.repeat)this.trigger(event.code);}
 };
 private up=(e:KeyboardEvent)=>this.keys.delete(e.code);
 private mouseDown=(e:MouseEvent)=>{if(e.target!==this.canvas||!this.active||this.touchMode)return;this.canvas.focus();if(this.published){e.preventDefault();if(e.button===0){this.resume();this.trigger('MouseLeft');}return;}if(e.button===2)this.drag=true;else if(e.button===0)this.resume();};
 private mouseUp=()=>{this.drag=false;};
 private move=(e:MouseEvent)=>{if(!this.active||this.touchMode||(!this.published&&!this.drag&&document.pointerLockElement!==this.canvas))return;this.look(e.movementX*.0023,e.movementY*.0023);};
 private lock=()=>{if(document.pointerLockElement===this.canvas){if(!this.active||this.touchMode){this.ignoreUnlock=true;document.exitPointerLock();}else this.ignoreUnlock=false;return;}if(this.ignoreUnlock){this.ignoreUnlock=false;return;}if(this.active){this.pause();this.actions.pause();}};
 private blur=()=>{if(this.active){this.pause();this.actions.pause();}else this.reset();};
 private visibility=()=>{if(document.visibilityState==='hidden')this.blur();};
 private context=(e:Event)=>e.preventDefault();
 dispose():void{this.pause();window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.blur);window.removeEventListener('pointermove',this.move);window.removeEventListener('pointerup',this.mouseUp);window.removeEventListener('orientationchange',this.reset);this.canvas.removeEventListener('pointerdown',this.mouseDown);this.canvas.removeEventListener('contextmenu',this.context);document.removeEventListener('pointerlockchange',this.lock);document.removeEventListener('visibilitychange',this.visibility);this.resets.clear();}
}
