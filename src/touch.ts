/** Gesture ownership is local to the game surface; menus retain native scrolling. */
function guard(surface:HTMLElement):()=>void {
 const prevent=(e:Event)=>{if(e.cancelable)e.preventDefault();};
 const types=['contextmenu','selectstart','dragstart','touchstart','touchmove','dblclick'];
 for(const type of types)surface.addEventListener(type,prevent,{passive:false});
 return ()=>{for(const type of types)surface.removeEventListener(type,prevent);};
}
abstract class CapturedPointer {
 protected pointer:number|null=null;
 protected enabled=true;
 private unguard:()=>void;
 constructor(protected surface:HTMLElement){
  this.unguard=guard(surface);
  surface.addEventListener('pointerdown',this.down);
  surface.addEventListener('pointermove',this.move);
  surface.addEventListener('pointerup',this.up);
  surface.addEventListener('pointercancel',this.cancel);
  surface.addEventListener('lostpointercapture',this.cancel);
 }
 protected abstract start(e:PointerEvent):void;
 protected abstract change(e:PointerEvent):void;
 protected end(_e?:PointerEvent):void{}
 protected accepts(e:PointerEvent):boolean{return e.button===0;}
 private down=(e:PointerEvent)=>{
  if(!this.enabled||this.pointer!==null||!this.accepts(e))return;
  e.preventDefault();this.pointer=e.pointerId;
  try{this.surface.setPointerCapture(e.pointerId);}catch{this.pointer=null;return;}
  this.start(e);
 };
 private move=(e:PointerEvent)=>{if(this.pointer===e.pointerId){e.preventDefault();this.change(e);}};
 private up=(e:PointerEvent)=>{if(this.pointer===e.pointerId){e.preventDefault();this.release();this.end(e);}};
 private cancel=(e:PointerEvent)=>{if(this.pointer===e.pointerId)this.reset();};
 private release():void{const id=this.pointer;this.pointer=null;if(id!==null)try{if(this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);}catch{}}
 reset():void{this.release();this.end();}
 setEnabled(enabled:boolean):void{this.enabled=enabled;if(!enabled)this.reset();}
 dispose():void{this.reset();this.unguard();this.surface.removeEventListener('pointerdown',this.down);this.surface.removeEventListener('pointermove',this.move);this.surface.removeEventListener('pointerup',this.up);this.surface.removeEventListener('pointercancel',this.cancel);this.surface.removeEventListener('lostpointercapture',this.cancel);}
}
export class Joystick extends CapturedPointer {
 private centerX=0;private centerY=0;private radius=1;
 constructor(surface:HTMLElement,private emit:(x:number,y:number)=>void){super(surface);}
 protected start(e:PointerEvent):void{const r=this.surface.getBoundingClientRect();this.centerX=r.left+r.width/2;this.centerY=r.top+r.height/2;this.radius=Math.max(1,Math.min(r.width,r.height)/2-10);this.change(e);}
 protected change(e:PointerEvent):void{
  const dx=(e.clientX-this.centerX)/this.radius,dy=(this.centerY-e.clientY)/this.radius,length=Math.hypot(dx,dy),magnitude=Math.max(0,(Math.min(1,length)-.12)/.88);
  const x=length?dx/length*magnitude:0,y=length?dy/length*magnitude:0;
  this.surface.style.setProperty('--stick-x',`${x*this.radius}px`);this.surface.style.setProperty('--stick-y',`${-y*this.radius}px`);this.emit(x,y);
 }
 protected end():void{this.surface.style.setProperty('--stick-x','0px');this.surface.style.setProperty('--stick-y','0px');this.emit(0,0);}
}
export class DragLook extends CapturedPointer {
 private x=0;private y=0;
 constructor(surface:HTMLElement,private emit:(dx:number,dy:number)=>void){super(surface);}
 protected start(e:PointerEvent):void{this.x=e.clientX;this.y=e.clientY;}
 protected change(e:PointerEvent):void{const dx=e.clientX-this.x,dy=e.clientY-this.y;this.x=e.clientX;this.y=e.clientY;this.emit(dx,dy);}
}
export function bindActionButton(button:HTMLButtonElement,action:()=>void):{reset():void;dispose():void}{
 class ActionPointer extends CapturedPointer {
  protected start():void{}protected change():void{}
  protected end(e?:PointerEvent):void{if(!e||button.disabled)return;const r=button.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)action();}
 }
 const pointer=new ActionPointer(button);
 const click=(e:MouseEvent)=>{e.preventDefault();if(e.detail===0&&!button.disabled)action();};
 button.addEventListener('click',click);
 return {reset:()=>pointer.reset(),dispose(){pointer.dispose();button.removeEventListener('click',click);}};
}
