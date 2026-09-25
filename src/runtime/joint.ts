import { Quaternion, Vector3 } from '@babylonjs/core';
import spec from '../models/action-figure/spec.json';

/** 每條 servo 軌的限位（弧度），key 形如 `servo:<bodyB>.<axis>`；與 forge/retarget.py 的 servo_tracks_from_spec 同一組。 */
export const JOINT_LIMITS:Record<string,[number,number]>={};
for(const j of spec.physics.constraints as Array<{type:string;bodyB:string;limits?:number[];angular?:Record<string,unknown>}>){
 if(j.type==='hinge'){JOINT_LIMITS[`servo:${j.bodyB}.x`]=[j.limits![0],j.limits![1]];continue;}
 for(const k of ['x','y','z'] as const){const v=j.angular?.[k];if(Array.isArray(v))JOINT_LIMITS[`servo:${j.bodyB}.${k}`]=[v[0] as number,v[1] as number];}
}
export function clampJoint(key:string,value:number):number{const l=JOINT_LIMITS[key];return l?Math.max(l[0],Math.min(l[1],value)):value;}

/** FK 關節旋轉：先 Right(x)、再 Down(z)、最後 Forward(y)（Hamilton 積 Forward·Down·Right），與 FigurePose 原公式同一條。 */
export function composeJoint(x:number,y:number,z:number):Quaternion{
 return Quaternion.RotationAxis(Vector3.Forward(),y).multiply(Quaternion.RotationAxis(Vector3.Down(),z)).multiply(Quaternion.RotationAxis(Vector3.Right(),x));
}
/** composeJoint 的反解。等價於 Rz(y)·Ry(−z)·Rx(x)，用旋轉後的基底向量解 ZYX 順序；z 取 (−π/2,π/2)。 */
export function decomposeJoint(q:Quaternion):{x:number;y:number;z:number}{
 const ex=Vector3.Right().rotateByQuaternionToRef(q,new Vector3());
 const ey=Vector3.Up().rotateByQuaternionToRef(q,new Vector3());
 const ez=Vector3.Forward().rotateByQuaternionToRef(q,new Vector3());
 const y=Math.atan2(ex.y,ex.x);
 const z=Math.atan2(ex.z,Math.hypot(ex.x,ex.y));
 const x=Math.atan2(ey.z,ez.z);
 return {x:x===0?0:x,y:y===0?0:y,z:z===0?0:z};
}
