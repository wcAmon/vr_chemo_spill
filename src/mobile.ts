import {Joystick,DragLook,bindActionButton} from './touch';
import {GyroLook} from './gyro';
import type {GameInput} from './input';
export class MobileControls {
 private root=document.createElement('div');private stick:Joystick;private lookStick:Joystick;private lookX=0;private lookY=0;private drag:DragLook;private gyro:GyroLook;private active=false;
 constructor(canvas:HTMLCanvasElement,private input:GameInput,tap:(x:number,y:number)=>void){
  this.root.className='mobile-controls';this.root.innerHTML='<button class="touch-pause" data-key="Escape">暫停</button><div id="joystick"><span class="stick-knob"></span></div><div id="look-joystick" aria-label="鏡頭搖桿"><span class="stick-knob"></span><small>環視</small></div><div class="touch-actions"><button data-key="MouseLeft">使用／放置</button><button data-key="KeyF">拿起／開啟</button></div>';
  document.getElementById('game-ui')!.append(this.root);
  const settings=document.getElementById('control-settings')!;settings.innerHTML='<label><input id="touch-mode" type="checkbox"> 螢幕觸控操作</label><p>左搖桿移動、右搖桿環視；輕點物件操作，也可滑動畫面環視。</p><button id="gyro">啟用體感環視</button><span id="gyro-status"></span>';
  this.stick=new Joystick(this.root.querySelector('#joystick')!,(x,y)=>input.setMove(x,y));this.drag=new DragLook(canvas,(x,y)=>input.look(x*.003,y*.003),tap);this.lookStick=new Joystick(this.root.querySelector('#look-joystick')!,(x,y)=>{this.lookX=x;this.lookY=y;});
  this.gyro=new GyroLook((yaw,pitch)=>input.look(yaw,pitch),state=>{document.getElementById('gyro-status')!.textContent=state==='on'?'體感已啟用':state==='denied'||state==='unavailable'?'使用滑動環視':'';});
  for(const b of this.root.querySelectorAll<HTMLButtonElement>('[data-key]'))bindActionButton(b,()=>input.trigger(b.dataset.key!));
  let gyro=false;document.getElementById('gyro')!.onclick=()=>{gyro=!gyro;if(gyro)void this.gyro.enable();else this.gyro.disable();document.getElementById('gyro')!.textContent=gyro?'關閉體感環視':'啟用體感環視';};
  const toggle=document.getElementById('touch-mode') as HTMLInputElement;toggle.checked=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0;
  const change=()=>{input.setTouchMode(toggle.checked);document.documentElement.dataset.touch=String(toggle.checked);this.setActive(this.active);};toggle.onchange=change;change();input.onReset(()=>{this.stick.reset();this.lookStick.reset();this.drag.reset();});
 }
 setActive(active:boolean){this.active=active;const enabled=active&&this.input.touchMode;this.root.hidden=!enabled;this.stick.setEnabled(enabled);this.lookStick.setEnabled(enabled);this.drag.setEnabled(enabled);this.gyro.setActive(enabled);}
 tick(dt:number){if(this.active&&this.input.touchMode)this.input.look(this.lookX*dt*1.7,-this.lookY*dt*1.4);this.gyro.tick(dt);}
 update(canF:boolean,fLabel:string,held:boolean,leftLabel:string){const f=this.root.querySelector<HTMLButtonElement>('[data-key=KeyF]')!,left=this.root.querySelector<HTMLButtonElement>('[data-key=MouseLeft]')!;f.disabled=!canF;f.textContent=fLabel;left.disabled=!held;left.textContent=leftLabel;}
}
