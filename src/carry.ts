import {Vector3} from '@babylonjs/core';
/** Clamp the complete yaw-rotated assembly, not just its pivot, inside the room. */
export function constrainCarry(position:Vector3,size:Vector3,center:Vector3,yaw:number):Vector3{
 const c=Math.cos(yaw),s=Math.sin(yaw),offset=new Vector3(center.x*c+center.z*s,center.y,-center.x*s+center.z*c);
 const half=new Vector3((Math.abs(c)*size.x+Math.abs(s)*size.z)/2,size.y/2,(Math.abs(s)*size.x+Math.abs(c)*size.z)/2);
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 const actual=position.add(offset);
 actual.x=clamp(actual.x,-4.95+half.x,4.95-half.x);actual.z=clamp(actual.z,-4.95+half.z,4.95-half.z);actual.y=clamp(actual.y,.01+half.y,3.18-half.y);
 return actual.subtract(offset);
}
