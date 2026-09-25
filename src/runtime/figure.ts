import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import type { BuiltModel } from '../shared/types';
import spec from '../models/action-figure/spec.json';
import type { GroundState } from './grounding';
import { clampJoint, composeJoint } from './joint';
import { ANKLE_TO_SOLE, HIP_TO_KNEE, KNEE_TO_ANKLE, lungeLeg, solveAnkle, solveLeg } from './legik';
export interface Clip { model:string; fps:number; frames:number; tracks:Record<string,number[]>; root?:{rotation:number[][]} }
export const BODY_IDS:string[]=spec.physics.bodies.map(b=>b.id);
/** 各 body 的局部半長（spec 單位，鏡射 factory 尺寸常數：box 半邊、sphere 半徑、capsule 半徑／半高）。 */
export const HALF_EXTENTS:Record<string,[number,number,number]>={
 torso:[0.018,0.015,0.011],head:[0.015,0.015,0.015],
 'upper-arm-l':[0.0065,0.01,0.0065],'upper-arm-r':[0.0065,0.01,0.0065],
 'forearm-l':[0.0065,0.009,0.0065],'forearm-r':[0.0065,0.009,0.0065],
 'thigh-l':[0.007,0.008,0.007],'thigh-r':[0.007,0.008,0.007],
 'calf-l':[0.0075,0.012,0.0075],'calf-r':[0.0075,0.012,0.0075],
 'boot-l':[0.008,0.005,0.014],'boot-r':[0.008,0.005,0.014],
};
/** 各 body 的碰撞形狀種類（鏡射 factory BODY_DEFS；spec.json 不含形狀）。 */
export const BODY_SHAPE:Record<string,'box'|'sphere'|'capsule'>={
 torso:'box',head:'sphere','boot-l':'box','boot-r':'box',
 'upper-arm-l':'capsule','upper-arm-r':'capsule','forearm-l':'capsule','forearm-r':'capsule',
 'thigh-l':'capsule','thigh-r':'capsule','calf-l':'capsule','calf-r':'capsule',
};
/** body 在旋轉 q 下沿世界 y 的半長（世界單位）：依形狀種類精確計算（球恆定、膠囊 r+半長·|軸分量|、box 三軸加權）。 */
export function halfExtentY(id:string,q:Quaternion,S:number):number{
 const e=HALF_EXTENTS[id];if(!e)throw new Error(`未知 body：${id}`);
 const kind=BODY_SHAPE[id];
 if(kind==='sphere')return e[1]*S;
 const m=Matrix.Identity();q.toRotationMatrix(m);const v=m.m;
 if(kind==='capsule')return (e[0]+(e[1]-e[0])*Math.abs(v[5]))*S;
 return (Math.abs(v[1])*e[0]+Math.abs(v[5])*e[1]+Math.abs(v[9])*e[2])*S;
}
export function validateClip(value:unknown):Clip {
  const d=value as Clip;
  if(!d||d.model!=='action-figure'||!Number.isFinite(d.fps)||d.fps<=0||!Number.isInteger(d.frames)||d.frames<2||!d.tracks)throw new Error('動作檔格式錯誤');
  for(const [key,v]of Object.entries(d.tracks))if(!key.startsWith('servo:')||!Array.isArray(v)||v.length!==d.frames||!v.every(Number.isFinite))throw new Error(`動作軌跡無效：${key}`);
  if(d.root!==undefined){
    const r=d.root?.rotation;
    if(!Array.isArray(r)||r.length!==d.frames||!r.every(q=>Array.isArray(q)&&q.length===4&&q.every(Number.isFinite)&&Math.abs(Math.hypot(q[0],q[1],q[2],q[3])-1)<=1e-3))throw new Error('動作根軌跡無效');
  }
  return d;
}
export function sampleClip(clip:Clip,phase:number,loop:boolean):Record<string,number>{
  const t=loop?((phase%1)+1)%1:Math.max(0,Math.min(1,phase));
  const f=t*(clip.frames-1),i=Math.floor(f),j=Math.min(clip.frames-1,i+1),k=f-i;
  return Object.fromEntries(Object.entries(clip.tracks).map(([key,v])=>[key,v[i]+(v[j]-v[i])*k]));
}
/** 根（軀幹）朝向：相鄰幀 slerp；phase 夾在 [0,1]。 */
export function sampleRoot(clip:Clip,phase:number):Quaternion{
  if(!clip.root)throw new Error('動作缺 root 軌跡');
  const t=Math.max(0,Math.min(1,phase));
  const f=t*(clip.frames-1),i=Math.floor(f),j=Math.min(clip.frames-1,i+1),k=f-i;
  return Quaternion.Slerp(Quaternion.FromArray(clip.root.rotation[i]),Quaternion.FromArray(clip.root.rotation[j]),k);
}
type Constraint={bodyA:string;bodyB:string;pivotA:number[];pivotB:number[]};
const CONSTRAINTS=spec.physics.constraints as unknown as Constraint[];
const leg=(side:'l'|'r')=>({hip:CONSTRAINTS.find(j=>j.bodyB===`thigh-${side}`)!,knee:CONSTRAINTS.find(j=>j.bodyB===`calf-${side}`)!,ankle:CONSTRAINTS.find(j=>j.bodyB===`boot-${side}`)!});
const LEGS={l:leg('l'),r:leg('r')};
/** 擺動腳判定：踝比較低那隻踝高出這麼多（世界單位）即權重 0（run clip 經平滑後兩踝差最大約 2.5 cm）。 */
export const FOOT_LIFT=0.02;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const clampAbs=(v:number,lim:number)=>Math.max(-lim,Math.min(lim,v));
export interface ApplyOptions { torso?:Quaternion; floor?:'boots'|'all'; ground?:GroundState }
export interface PoseOptions { slack?:number }
export class FigurePose {
  readonly angles:Record<string,number>={};
  /** 骨盆偏移（根局部 y、世界單位、[−0.25,0]）；只在帶 ground 的 apply 更新。 */
  pelvisOffset=0;
  readonly tilt={pitch:0,roll:0};
  readonly footWeight={l:0,r:0};
  /** 上一次 apply 結束時兩踝的世界座標 [左,右]；reset 後為 null（GroundSensor 改用 feet ± 髖寬）。 */
  lastAnkles:[Vector3,Vector3]|null=null;
  private readonly slack:number;
  constructor(readonly model:BuiltModel,opts:PoseOptions={}){this.slack=opts.slack??0.0006;}
  reset():void{this.pelvisOffset=0;this.tilt.pitch=0;this.tilt.roll=0;this.footWeight.l=0;this.footWeight.r=0;this.lastAnkles=null;}
  apply(target:Record<string,number>,dt:number,lean=0,squash=0,grounded=true,opts:ApplyOptions={}):void{
    const alpha=1-Math.exp(-18*dt);
    for(const key of new Set([...Object.keys(this.angles),...Object.keys(target)]))this.angles[key]=(this.angles[key]??0)+((target[key]??0)-(this.angles[key]??0))*alpha;
    const {nodes,physicsScale:S}=this.model;
    const g=opts.ground;
    if(g)this.updateTilt(g,dt);
    nodes.torso.position.set(0,0.057*S-squash,0);
    nodes.torso.rotationQuaternion=opts.torso?opts.torso.clone():g
      ?Quaternion.RotationAxis(Vector3.Right(),lean+squash*1.2+this.tilt.pitch).multiply(Quaternion.RotationAxis(Vector3.Forward(),this.tilt.roll))
      :Quaternion.RotationAxis(Vector3.Right(),lean);
    this.fk(CONSTRAINTS,key=>this.angles[key]??0);
    if(g){this.recordAnkles();this.groundLegs(g,dt);}
    else{
      if(grounded){
        const ids=opts.floor==='all'?BODY_IDS:['boot-l','boot-r'];
        let low=Infinity;
        for(const id of ids){const b=nodes[id];low=Math.min(low,b.position.y-halfExtentY(id,b.rotationQuaternion!,S));}
        const shift=-low;
        for(const id of BODY_IDS)nodes[id].position.y+=shift;
      }
      this.recordAnkles();   // 無 ground 路徑照舊：在整體平移之後記錄（節點逐位不變）
    }
  }
  /** FK：沿指定關節依 angleOf 取角，寫入 bodyB 的旋轉與位置（與原迴圈同一條算式）。 */
  private fk(constraints:Constraint[],angleOf:(key:string)=>number):void{
    const {nodes,physicsScale:S}=this.model;
    for(const joint of constraints){
      const a=nodes[joint.bodyA],b=nodes[joint.bodyB];
      const q=composeJoint(angleOf(`servo:${joint.bodyB}.x`),angleOf(`servo:${joint.bodyB}.y`),angleOf(`servo:${joint.bodyB}.z`));
      const aq=a.rotationQuaternion??Quaternion.Identity();b.rotationQuaternion=aq.multiply(q);
      const pa=Vector3.FromArray(joint.pivotA).scale(S).rotateByQuaternionToRef(aq,new Vector3());
      const pb=Vector3.FromArray(joint.pivotB).scale(S).rotateByQuaternionToRef(b.rotationQuaternion,new Vector3());
      b.position.copyFrom(a.position.add(pa).subtract(pb));
    }
  }
  /** 踝關節（根局部）：小腿位置 ＋ 小腿朝向下的踝 pivot。 */
  private ankle(side:'l'|'r'):Vector3{
    const j=LEGS[side].ankle;const calf=this.model.nodes[j.bodyA];
    return calf.position.add(Vector3.FromArray(j.pivotA).scale(this.model.physicsScale).rotateByQuaternionToRef(calf.rotationQuaternion!,new Vector3()));
  }
  /** 世界方向 → 根局部（只去 yaw；根用 rotation.y）。 */
  private toLocal(v:Vector3):Vector3{return v.rotateByQuaternionToRef(Quaternion.RotationAxis(Vector3.Up(),-this.model.root.rotation.y),new Vector3());}
  /** 軀幹傾斜：法線的前分量→pitch（上坡前傾為正）、側分量→roll；各夾 ±0.35，8/s 平滑。 */
  private updateTilt(g:GroundState,dt:number):void{
    const n=this.toLocal(g.normal);const k=1-Math.exp(-8*dt);
    const pitch=clampAbs(-Math.asin(clampAbs(n.z,1))*0.5,0.35),roll=clampAbs(Math.asin(clampAbs(n.x,1))*0.5,0.35);
    this.tilt.pitch+=(pitch-this.tilt.pitch)*k;this.tilt.roll+=(roll-this.tilt.roll)*k;
  }
  /** 著地權重 → 骨盆偏移（平滑）→ 整體下移 → 每腳 IK（只對該腿重跑 FK）。 */
  private groundLegs(g:GroundState,dt:number):void{
    const {nodes,physicsScale:S}=this.model;const feetY=this.model.root.position.y;
    const a={l:this.ankle('l'),r:this.ankle('r')};const low=Math.min(a.l.y,a.r.y);
    const feet={l:g.left,r:g.right};const w={l:0,r:0},gy={l:0,r:0};
    for(const s of ['l','r'] as const){const fg=feet[s];if(!fg)continue;gy[s]=fg.y-feetY;w[s]=1-clamp01((a[s].y-low)/FOOT_LIFT);}
    const raw=Math.max(-0.25,Math.min(0,Math.min(w.l*Math.min(gy.l,0),w.r*Math.min(gy.r,0))));
    this.pelvisOffset+=(raw-this.pelvisOffset)*(1-Math.exp(-12*dt));
    const shift=this.pelvisOffset-this.slack*S;
    for(const id of BODY_IDS)nodes[id].position.y+=shift;
    const override:Record<string,number>={};const angleOf=(key:string)=>override[key]??this.angles[key]??0;
    for(const s of ['l','r'] as const){
      const fg=feet[s];if(!fg||w[s]<=0){this.footWeight[s]=0;continue;}
      const {hip,knee,ankle}=LEGS[s];const torsoQ=nodes.torso.rotationQuaternion!;
      const hipPos=nodes.torso.position.add(Vector3.FromArray(hip.pivotA).scale(S).rotateByQuaternionToRef(torsoQ,new Vector3()));
      const ankleFK=this.ankle(s);
      const hy=this.angles[`servo:thigh-${s}.y`]??0,hz=this.angles[`servo:thigh-${s}.z`]??0;
      const q0=torsoQ.multiply(Quaternion.RotationAxis(Vector3.Forward(),hy)).multiply(Quaternion.RotationAxis(Vector3.Down(),hz));
      const t=new Vector3(ankleFK.x,gy[s]+ANKLE_TO_SOLE*S,ankleFK.z).subtract(hipPos).rotateByQuaternionToRef(Quaternion.Inverse(q0),new Vector3());
      const sol=t.length()<1e-6*S?null:solveLeg(t,HIP_TO_KNEE*S,KNEE_TO_ANKLE*S);
      if(!sol||!Number.isFinite(sol.hipX)||!Number.isFinite(sol.kneeX)){this.footWeight[s]=0;continue;}
      const lunge=lungeLeg(t,sol,HIP_TO_KNEE*S,KNEE_TO_ANKLE*S);   // 踝飽和時改弓步解（腳前移由 FK 自然帶出，tz 不另外用）
      const hipX=lunge?lunge.hipX:sol.hipX,kneeX=lunge?lunge.kneeX:sol.kneeX;
      const wt=w[s];this.footWeight[s]=wt;
      const kh=`servo:thigh-${s}.x`,kk=`servo:calf-${s}.x`;
      override[kh]=clampJoint(kh,angleOf(kh)+wt*(hipX-angleOf(kh)));override[kk]=clampJoint(kk,angleOf(kk)+wt*(kneeX-angleOf(kk)));   // 混合後仍夾限（clip 端點也可能超限）
      this.fk([hip,knee],angleOf);
      const an=solveAnkle(nodes[`calf-${s}`].rotationQuaternion!,this.toLocal(fg.normal));
      for(const [axis,v] of [['x',an.x],['y',an.y],['z',an.z]] as const){const key=`servo:boot-${s}.${axis}`;override[key]=clampJoint(key,angleOf(key)+wt*(v-angleOf(key)));}
      this.fk([ankle],angleOf);
    }
  }
  /** 記錄兩踝世界座標（根 position ＋ yaw 旋轉），供下一 tick 的 GroundSensor。 */
  private recordAnkles():void{
    const root=this.model.root;const q=Quaternion.RotationAxis(Vector3.Up(),root.rotation.y);
    const w=(v:Vector3)=>v.rotateByQuaternionToRef(q,new Vector3()).addInPlace(root.position);
    this.lastAnkles=[w(this.ankle('l')),w(this.ankle('r'))];
  }
  maxJointError():number{
    let error=0;
    for(const j of spec.physics.constraints){
      const a=this.model.nodes[j.bodyA],b=this.model.nodes[j.bodyB];
      const pa=Vector3.FromArray(j.pivotA).scale(this.model.physicsScale).rotateByQuaternionToRef(a.rotationQuaternion!,new Vector3()).add(a.position);
      const pb=Vector3.FromArray(j.pivotB).scale(this.model.physicsScale).rotateByQuaternionToRef(b.rotationQuaternion!,new Vector3()).add(b.position);
      error=Math.max(error,Vector3.Distance(pa,pb));
    }
    return error;
  }
}
