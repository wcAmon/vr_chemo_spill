import { Quaternion, Vector3 } from '@babylonjs/core';
import { clampJoint, decomposeJoint, JOINT_LIMITS } from './joint';

/** 腿的幾何常數（spec 單位；使用時 ×physicsScale）。 */
export const HIP_TO_KNEE=0.0175;   // thigh pivotB 0.009 ＋ 膝 pivotA 0.0085
export const KNEE_TO_ANKLE=0.0185; // calf pivotB 0.0125 ＋ 踝 pivotA 0.006
export const ANKLE_TO_SOLE=0.006;  // boot pivotB 0.001 ＋ 靴半高 0.005
/** 踝 x 限位（弧度、與尺度無關）＝ spec 的 servo:boot-*.x 上界；小腿傾角超過它，靴子就放不平。 */
export const ANKLE_MAX=0.5;
/** 弓步最多把腳往前挪這麼多（**世界單位**，不隨 physicsScale 換算）；超過就寧可讓踝飽和，不要腳飛出去。 */
export const LUNGE_MAX=0.12;
export interface LegSolution { hipX:number; kneeX:number; reachable:boolean }
const clamp1=(v:number)=>Math.max(-1,Math.min(1,v));

/**
 * 矢狀面兩段 IK。t：目標踝關節相對髖關節的位移，已轉到「髖 y／z 已套用」的框架（局部 y 上、z 前）；只解髖 x 與膝 x，t.x 忽略。
 * Rx(x) 把大腿方向 (0,−1,0) 轉成 (0,−cos x,−sin x)：髖 x 負＝大腿向前；膝 x 正＝小腿向後（膝蓋朝前）。
 * 不可達（L>0.995·(l1+l2)）→ 腿伸直指向目標；L≈0 → 全 0、reachable=false（呼叫端把該腳權重設 0）。
 */
export function solveLeg(t:Vector3,l1:number,l2:number):LegSolution{
 const L=Math.hypot(t.y,t.z);
 if(!(L>1e-6*(l1+l2)))return {hipX:0,kneeX:0,reachable:false};
 const theta=Math.atan2(t.z,-t.y);
 if(L>0.995*(l1+l2))return {hipX:clampJoint('servo:thigh-l.x',-theta),kneeX:0,reachable:false};
 const gamma=Math.acos(clamp1((l1*l1+l2*l2-L*L)/(2*l1*l2)));
 const alpha=Math.acos(clamp1((l1*l1+L*L-l2*l2)/(2*l1*L)));
 return {hipX:clampJoint('servo:thigh-l.x',-(theta+alpha)),kneeX:clampJoint('servo:calf-l.x',Math.PI-gamma),reachable:true};
}

/**
 * 弓步規則：站上高階時 solveLeg 的解（踝在髖正下方）會把小腿壓到 c=hipX+kneeX>ANKLE_MAX，靴子放不平、鞋底穿地。
 * 改把小腿固定在 c=ANKLE_MAX（膝前頂過腳尖），只解髖：h=−t.y（q0 框架的髖→目標垂直距）、cos hipX=(h−l2·cos c)/l1，
 * 腳因此自然前移到 tz=−(l1·sin hipX + l2·sin c)（q0 框架 +z 為前）。垂直距仍精確命中，只有 z 變。
 * 不適用時回 null（呼叫端保留原解、接受踝飽和）：小腿沒飽和、|cos hipX|>1（幾何無解）、髖角超出限位、膝角超出限位、或前移超過 LUNGE_MAX。
 * 髖／膝兩個限位都必須退回原解而不是夾住：夾任何一角都會破壞閉式解的精確性（垂直距不再命中），所以回傳非 null 時解一定精確。
 * 只處理向後飽和（c>ANKLE_MAX）；向前飽和（大跨步 clip）不動。
 */
export function lungeLeg(t:Vector3,sol:LegSolution,l1:number,l2:number):{hipX:number;kneeX:number;tz:number}|null{
 if(sol.hipX+sol.kneeX<=ANKLE_MAX)return null;
 const cosHx=(-t.y-l2*Math.cos(ANKLE_MAX))/l1;
 if(!(Math.abs(cosHx)<=1))return null;
 const hipX=-Math.acos(cosHx),tz=-(l1*Math.sin(hipX)+l2*Math.sin(ANKLE_MAX));
 if(hipX<JOINT_LIMITS['servo:thigh-l.x'][0])return null;   // 髖超限就退回原解
 if(ANKLE_MAX-hipX>JOINT_LIMITS['servo:calf-l.x'][1])return null;   // 膝超限同理（hipX∈(−2,−1.94) 這段髖還沒超、膝已破 2.44）
 if(tz-t.z>LUNGE_MAX)return null;
 return {hipX,kneeX:ANKLE_MAX-hipX,tz};
}

/** 踝：靴子 up 對齊地面法線、forward 對齊根局部 +z 在法線平面上的投影；回傳靴子相對小腿的 servo 角（x 夾 ±0.5、y 夾 ±0.3、z 鎖 0）。左右靴限位相同，一律用 boot-l 的 key。用 RotationQuaternionFromAxis（讓 gate 過）。 */
export function solveAnkle(calfQ:Quaternion,normal:Vector3):{x:number;y:number;z:number}{
 const up=normal.normalizeToNew();
 const fwd=Vector3.Forward().subtract(up.scale(up.z));
 if(fwd.lengthSquared()<1e-6)return {x:0,y:0,z:0};
 fwd.normalize();
 const right=Vector3.Cross(up,fwd).normalize();
 const desired=Quaternion.RotationQuaternionFromAxis(right,up,fwd);
 const d=decomposeJoint(Quaternion.Inverse(calfQ).multiply(desired));
 return {x:clampJoint('servo:boot-l.x',d.x),y:clampJoint('servo:boot-l.y',d.y),z:0};
}
