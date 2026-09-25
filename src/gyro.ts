/** Sensor-derived look deltas only: camera ownership and manual look stay with input. */
export type GyroStatus='off'|'requesting'|'waiting'|'on'|'denied'|'unavailable';
export interface GyroEnvironment {
  window:EventTarget;
  document:EventTarget & {hidden:boolean};
  screenOrientation?:EventTarget;
  secure:boolean;
  supported:boolean;
  requestPermission?:()=>Promise<string>;
  setTimeout:(callback:()=>void,ms:number)=>unknown;
  clearTimeout:(handle:unknown)=>void;
}
type Look={yaw:number|null;pitch:number};
const radians=Math.PI/180;
const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));
/** Device -Z rotated by Rz(alpha) Rx(beta) Ry(gamma), with Earth Z as up. */
export function orientationLook(alpha:number|null,beta:number|null,gamma:number|null):Look|null {
  if(alpha===null||beta===null||gamma===null||![alpha,beta,gamma].every(Number.isFinite))return null;
  const a=alpha*radians,b=beta*radians,g=gamma*radians;
  const x=-Math.cos(a)*Math.sin(g)-Math.sin(a)*Math.sin(b)*Math.cos(g);
  const y=-Math.sin(a)*Math.sin(g)+Math.cos(a)*Math.sin(b)*Math.cos(g);
  const z=-Math.cos(b)*Math.cos(g);
  return {yaw:Math.hypot(x,y)<.05?null:Math.atan2(x,y),pitch:-Math.asin(Math.max(-1,Math.min(1,z)))};
}
function browserEnvironment():GyroEnvironment {
  const win=typeof window==='undefined'?undefined:window;
  const doc=typeof document==='undefined'?undefined:document;
  const orientation=win?.DeviceOrientationEvent as (typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>})|undefined;
  const host=win?.location?.hostname;
  return {
    window:win??new EventTarget(),document:doc??Object.assign(new EventTarget(),{hidden:false}),
    screenOrientation:win?.screen?.orientation,
    secure:!!win&&(win.isSecureContext||host==='localhost'||host==='127.0.0.1'||host==='[::1]'),supported:!!orientation,
    requestPermission:orientation?.requestPermission?()=>orientation.requestPermission!():undefined,
    setTimeout:(cb,ms)=>globalThis.setTimeout(cb,ms),clearTimeout:handle=>globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}
export class GyroLook {
  private readonly env:GyroEnvironment;
  private status:GyroStatus='off';
  private generation=0;
  private enabled=false;
  private active=true;
  private disposed=false;
  private listening=false;
  private baseline:Look|null=null;
  private pendingYaw=0;
  private pendingPitch=0;
  private sensitivity=1;
  private timer:unknown;
  constructor(private readonly applyLook:(yawDelta:number,pitchDelta:number)=>void,private readonly report:(state:GyroStatus)=>void,env?:GyroEnvironment){
    this.env=env??browserEnvironment();
    this.env.document.addEventListener('visibilitychange',this.onVisibility);
    this.env.window.addEventListener('orientationchange',this.onOrientation);
    this.env.screenOrientation?.addEventListener('change',this.onOrientation);
    this.report('off');
  }
  private setStatus(state:GyroStatus){if(this.status!==state){this.status=state;this.report(state);}}
  async enable():Promise<void>{
    if(this.disposed||this.enabled||this.status==='requesting')return;
    const generation=++this.generation;
    if(!this.env.secure||!this.env.supported){this.setStatus('unavailable');return;}
    this.setStatus('requesting');
    try {
      if(this.env.requestPermission){
        const permission=this.env.requestPermission();
        const result=await permission;
        if(generation!==this.generation||this.disposed)return;
        if(result!=='granted'){this.setStatus('denied');return;}
      }
    }catch{
      if(generation===this.generation&&!this.disposed)this.setStatus('denied');
      return;
    }
    if(generation!==this.generation||this.disposed)return;
    this.enabled=true;
    this.env.window.addEventListener('deviceorientation',this.onSample);
    this.listening=true;
    this.recenter();
  }
  disable(){
    ++this.generation;this.enabled=false;
    if(this.listening)this.env.window.removeEventListener('deviceorientation',this.onSample);
    this.listening=false;this.clearTimer();this.clearMotion();this.setStatus('off');
  }
  setActive(active:boolean){if(this.active===active)return;this.active=active;this.recenter();}
  recenter(){
    this.clearMotion();this.clearTimer();
    if(this.enabled){this.setStatus('waiting');if(this.canMove())this.armTimeout();}
  }
  setSensitivity(value:number){if(Number.isFinite(value))this.sensitivity=Math.max(.1,Math.min(3,value));}
  tick(dtSeconds:number){
    if(!this.canMove()||!Number.isFinite(dtSeconds)||dtSeconds<=0)return;
    const blend=1-Math.exp(-Math.min(dtSeconds,.1)*18);
    const yaw=this.pendingYaw*blend,pitch=this.pendingPitch*blend;
    this.pendingYaw-=yaw;this.pendingPitch-=pitch;
    if(Math.abs(yaw)+Math.abs(pitch)>1e-10)this.applyLook(yaw,pitch);
  }
  dispose(){if(this.disposed)return;this.disable();this.disposed=true;this.env.document.removeEventListener('visibilitychange',this.onVisibility);this.env.window.removeEventListener('orientationchange',this.onOrientation);this.env.screenOrientation?.removeEventListener('change',this.onOrientation);}
  private canMove(){return this.enabled&&this.active&&!this.env.document.hidden;}
  private clearMotion(){this.baseline=null;this.pendingYaw=0;this.pendingPitch=0;}
  private clearTimer(){if(this.timer!==undefined)this.env.clearTimeout(this.timer);this.timer=undefined;}
  private armTimeout(){
    this.clearTimer();
    this.timer=this.env.setTimeout(()=>{
      this.timer=undefined;
      if(!this.canMove())return;
      this.disable();this.setStatus('unavailable');
    },4000);
  }
  private onVisibility=()=>this.recenter();
  private onOrientation=()=>this.recenter();
  private onSample=(event:Event)=>{
    if(!this.canMove())return;
    const e=event as DeviceOrientationEvent;
    const look=orientationLook(e.alpha,e.beta,e.gamma);
    if(!look)return;
    if(this.baseline){
      if(look.yaw!==null&&this.baseline.yaw!==null)this.pendingYaw+=wrap(look.yaw-this.baseline.yaw)*this.sensitivity;
      this.pendingPitch+=(look.pitch-this.baseline.pitch)*this.sensitivity;
    }
    this.baseline=look;this.setStatus('on');this.clearTimer();
  };
}
