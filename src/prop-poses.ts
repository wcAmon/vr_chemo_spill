import {Quaternion,Vector3} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
/** Geometry poses local to the game; imported training assets remain untouched. */
export function propPoses(model:BuiltModel,kind:string):(active:boolean)=>void{
 const keys=kind==='spill-warning-sign'?['panel-front','panel-back']:kind==='chemo-spill-kit'?['lid']:[];
 const original=keys.map(key=>({node:model.nodes[key],position:model.nodes[key].position.clone(),rotation:model.nodes[key].rotation.clone()}));
 return active=>{
  for(const p of original){p.node.position.copyFrom(p.position);p.node.rotation.copyFrom(p.rotation);}
  if(kind==='spill-warning-sign'&&!active)original.forEach((p,index)=>{p.node.rotation.set(Math.PI/2,0,0);p.node.position.set(0,.016+index*.021,0);});
  if(kind==='chemo-spill-kit'&&active){const p=original[0],hinge=new Vector3(0,.13,.15);p.node.rotation.x=1.65;p.node.position.copyFrom(hinge.add(p.position.subtract(hinge).rotateByQuaternionToRef(Quaternion.RotationYawPitchRoll(0,1.65,0),new Vector3())));}
  for(const mesh of model.root.getChildMeshes())mesh.computeWorldMatrix(true);
 };
}
