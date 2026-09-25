import { CharacterSupportedState, PhysicsCharacterController, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
export interface MoveInput { x:number; z:number; run:boolean; jump:boolean }
export interface ControllerOptions { capsuleHeight?:number; capsuleRadius?:number; strength?:number; hardLanding?:number }
export class ParkourController {
  readonly capsule:PhysicsCharacterController;
  readonly feet=Vector3.Zero();
  readonly velocity=Vector3.Zero();
  checkpoint:Vector3;
  grounded=false; jumps=0; respawns=0; landings=0; landingImpact=0; yaw=0; airTime=0; speed=0;
  /** 重落地硬直剩餘秒數；>0 時目標速度 ×0.3、忽略跳躍。 */
  stagger=0; hardLandings=0;
  private readonly hardLanding:number;
  private input:MoveInput={x:0,z:0,run:false,jump:false};
  private jumpHeld=false;
  private jumpGuard=0;
  private fallSpeed=0;
  readonly halfHeight:number;
  constructor(scene:Scene,spawn:Vector3,opts:ControllerOptions={}) {
    const h=opts.capsuleHeight??1.06,r=opts.capsuleRadius??0.19;
    this.hardLanding=opts.hardLanding??6.0;
    this.halfHeight=h/2;
    this.checkpoint=spawn.clone();
    this.capsule=new PhysicsCharacterController(spawn.add(new Vector3(0,this.halfHeight,0)),{capsuleHeight:h,capsuleRadius:r},scene);
    this.capsule.keepDistance=0.015;this.capsule.keepContactTolerance=0.04;
    this.capsule.characterMass=12;this.capsule.characterStrength=opts.strength??70;
    this.capsule.maxSlopeCosine=Math.cos(Math.PI/4);
    this.feet.copyFrom(spawn);
  }
  setInput(input:MoveInput):void { this.input={...input}; }
  clearInput():void {this.input={x:0,z:0,run:false,jump:false};this.jumpHeld=false;}
  reset(position=this.checkpoint):void {
    this.capsule.setPosition(position.add(new Vector3(0,this.halfHeight,0)));this.capsule.setVelocity(Vector3.Zero());
    this.velocity.setAll(0);this.feet.copyFrom(position);this.grounded=false;this.airTime=0;this.jumpGuard=0;this.fallSpeed=0;this.stagger=0;
  }
  /** 停放：ragdoll 期間 capsule 移出場外、不再 tick；feet 保留給鏡頭與重生。 */
  park():void {
    this.capsule.setPosition(new Vector3(0,-50,0));this.capsule.setVelocity(Vector3.Zero());
    this.velocity.setAll(0);this.grounded=false;this.airTime=0;this.jumpGuard=0;this.fallSpeed=0;this.stagger=0;
  }
  tick(dt:number):void {
    const support=this.capsule.checkSupport(dt,Vector3.Down());
    const wasGrounded=this.grounded;
    this.jumpGuard=Math.max(0,this.jumpGuard-dt);
    this.stagger=Math.max(0,this.stagger-dt);
    this.grounded=support.supportedState===CharacterSupportedState.SUPPORTED && this.jumpGuard===0 && this.velocity.y<0.5;
    const landed=this.grounded && !wasGrounded;
    if(landed){this.landings++;this.landingImpact=Math.max(this.fallSpeed,-this.velocity.y);this.fallSpeed=0;}
    if(this.grounded)this.airTime=0;else this.airTime+=dt;
    const length=Math.hypot(this.input.x,this.input.z);const speed=(this.input.run?3.5:1.7)*(this.stagger>0?0.3:1);
    const tx=length>0?this.input.x/Math.max(1,length)*speed:0;
    const tz=length>0?this.input.z/Math.max(1,length)*speed:0;
    const blend=1-Math.exp(-(this.grounded?18:5)*dt);
    this.velocity.x+=(tx-this.velocity.x)*blend;this.velocity.z+=(tz-this.velocity.z)*blend;
    if(length>0.05){const target=Math.atan2(this.input.x,this.input.z);const delta=Math.atan2(Math.sin(target-this.yaw),Math.cos(target-this.yaw));this.yaw+=delta*(1-Math.exp(-15*dt));}
    this.velocity.y=this.grounded?-0.3:this.velocity.y-9.81*dt;
    if(!this.grounded)this.fallSpeed=Math.max(this.fallSpeed,-this.velocity.y);
    if(this.input.jump&&!this.jumpHeld&&this.grounded&&this.stagger===0){this.velocity.y=4.5;this.jumpGuard=0.16;this.grounded=false;this.airTime=0;this.jumps++;}
    this.jumpHeld=this.input.jump;
    this.capsule.setVelocity(this.velocity);this.capsule.integrate(dt,support,new Vector3(0,-9.81,0));
    if(landed&&this.landingImpact>=this.hardLanding){this.stagger=0.25;this.hardLandings++;}
    const old=this.feet.clone();this.feet.copyFrom(this.capsule.getPosition()).y-=this.halfHeight;
    this.speed=Math.hypot(this.feet.x-old.x,this.feet.z-old.z)/dt;
    const actual=this.capsule.getVelocity();
    if(!this.grounded)this.velocity.y=actual.y;
    if(this.feet.y < -5 || ![this.feet.x,this.feet.y,this.feet.z].every(Number.isFinite)){this.respawns++;this.reset();}
  }
  dispose():void {this.capsule.dispose();}
}
