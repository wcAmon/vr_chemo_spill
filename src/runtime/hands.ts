import { Color3, Matrix, Mesh, MeshBuilder, Quaternion, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { BuiltModel } from '../shared/types';
import { solveArm } from './armIk';
export type HandGesture = 'rest' | 'grip' | 'support' | 'press' | 'pinch' | 'wear' | 'seal';
export type HandSide = 'left' | 'right';
export interface HandTarget { position: Vector3; rotation: Quaternion; gesture: HandGesture; amount?: number }
export interface HandView { root: TransformNode; palm: Mesh; thumb: Mesh; grip: TransformNode; surfaces: Mesh[] }
export interface Hands {
 hand(side: HandSide): HandView;
 shoulder(side: HandSide): Vector3;
 reach: number;
 pose(side: HandSide,target: HandTarget): void;
 rest(): void;
 setGloves(worn:boolean,dirty:boolean):void;
 dispose():void;
}
const FIGURE_SIDE={left:'r',right:'l'} as const;
const PALM_GRIP=new Vector3(0,0,.075);
const CURL:Record<HandGesture,number>={rest:.16,grip:1.35,support:.7,press:.8,pinch:1.05,wear:.35,seal:.95};
export function createHands(scene:Scene,model:BuiltModel):Hands {
 const skin=new StandardMaterial('training-hand-skin',scene);skin.diffuseColor=new Color3(.77,.52,.38);
 const glove=new StandardMaterial('training-hand-glove',scene);glove.diffuseColor=new Color3(.55,.35,.75);
 const dirty=new StandardMaterial('training-hand-dirty',scene);dirty.diffuseColor=new Color3(.45,.2,.3);
 const S=model.physicsScale, upper=.0205*S, lower=.0205*S;
 const views={} as Record<HandSide,HandView>;
 const thumbs={} as Record<HandSide,TransformNode>;
 const hinges={} as Record<HandSide,{node:TransformNode;index:number;joint:number}[]>;
 for(const side of ['left','right'] as const) {
  const legacy=FIGURE_SIDE[side];
  model.meshes[`hand-${legacy}`].isVisible=false;
  const root=model.nodes[`hand-${legacy}`]; root.parent=model.root;
  root.rotationQuaternion=Quaternion.Identity();
  const surfaces:Mesh[]=[];hinges[side]=[];
  const attach=(mesh:Mesh,parent:TransformNode,at:Vector3)=>{mesh.parent=parent;mesh.position.copyFrom(at);mesh.material=skin;mesh.isPickable=false;surfaces.push(mesh);return mesh;};
  const palm=attach(MeshBuilder.CreateBox(`training-${side}-palm`,{width:.135,height:.048,depth:.13},scene),root,new Vector3(0,0,.065));
  attach(MeshBuilder.CreateCylinder(`training-${side}-cuff`,{diameter:.15,height:.038,tessellation:16},scene),root,new Vector3(0,0,-.012)).rotation.x=Math.PI/2;
  for(let i=0;i<4;i++) {
   let parent=root;
   for(let j=0;j<3;j++) {
    const node=new TransformNode(`training-${side}-finger-${i}-${j}`,scene);node.parent=parent;
    node.position.set(j===0?(i-1.5)*.031:0,0,j===0?.123:.037);
    const segment=attach(MeshBuilder.CreateCapsule(`${node.name}-surface`,{radius:.014,height:.047,tessellation:8,subdivisions:1},scene),node,new Vector3(0,0,.018));segment.rotation.x=Math.PI/2;
    hinges[side].push({node,index:i,joint:j});parent=node;
   }
  }
  const thumbPivot=new TransformNode(`training-${side}-thumb-pivot`,scene);thumbPivot.parent=root;thumbPivot.position.set(side==='left'?.073:-.073,0,.025);thumbPivot.rotation.y=side==='left'?.65:-.65;thumbs[side]=thumbPivot;
  const thumb=attach(MeshBuilder.CreateCapsule(`training-${side}-thumb`,{radius:.018,height:.082,tessellation:10,subdivisions:1},scene),thumbPivot,new Vector3(0,0,.03));thumb.rotation.x=Math.PI/2;
  const grip=new TransformNode(`training-${side}-grip`,scene);grip.parent=root;grip.position.copyFrom(PALM_GRIP);
  views[side]={root,palm,thumb,grip,surfaces};
 }
 const world=(v:Vector3)=>Vector3.TransformCoordinates(v,model.root.computeWorldMatrix(true));
 const shoulder=(side:HandSide)=>{const torso=model.nodes.torso;torso.computeWorldMatrix(true);return Vector3.TransformCoordinates(new Vector3((side==='right'?1:-1)*.0255*S,.011*S,0),torso.getWorldMatrix());};
 const aimBone=(id:string,start:Vector3,end:Vector3,pivot:number)=>{
  const inv=Matrix.Invert(model.root.computeWorldMatrix(true));const a=Vector3.TransformCoordinates(start,inv),b=Vector3.TransformCoordinates(end,inv);
  const direction=b.subtract(a).normalize();const q=Quaternion.FromUnitVectorsToRef(Vector3.Down(),direction,new Quaternion());
  const node=model.nodes[id];node.rotationQuaternion=q;node.position.copyFrom(a.subtract(new Vector3(0,pivot*S,0).rotateByQuaternionToRef(q,new Vector3())));node.computeWorldMatrix(true);
 };
 const api:Hands={
  hand:side=>views[side],shoulder,reach:upper+lower,
  pose(side,target){
   const hand=views[side]; const wrist=target.position.subtract(PALM_GRIP.rotateByQuaternionToRef(target.rotation,new Vector3()));
   const pole=world(new Vector3(side==='right'?1:-1,-.4,-.4)).subtract(model.root.absolutePosition);
   const q=solveArm(shoulder(side),wrist,upper,lower,pole);
   const legacy=FIGURE_SIDE[side];aimBone(`upper-arm-${legacy}`,shoulder(side),q.elbow,.01);aimBone(`forearm-${legacy}`,q.elbow,q.wrist,.0095);
   hand.root.position.copyFrom(Vector3.TransformCoordinates(q.wrist,Matrix.Invert(model.root.computeWorldMatrix(true))));
   hand.root.rotationQuaternion=Quaternion.Inverse(model.root.absoluteRotationQuaternion).multiply(target.rotation);
   thumbs[side].rotation.x=CURL[target.gesture]*(target.amount??1)*.7;
   for(const h of hinges[side]) h.node.rotation.x=(target.gesture==='press' && h.index===0?.08:CURL[target.gesture])*(target.amount??1)*(h.joint===0?.75:1);
   hand.root.computeWorldMatrix(true);for(const mesh of hand.surfaces) mesh.computeWorldMatrix(true);hand.grip.computeWorldMatrix(true);
  },
  rest(){for(const side of ['left','right'] as const) api.pose(side,{position:world(new Vector3(side==='right'?.3:-.3,model.nodes.torso.position.y-.10,.50)),rotation:model.root.absoluteRotationQuaternion.clone(),gesture:'rest'});},
  setGloves(worn,isDirty){for(const hand of Object.values(views))for(const mesh of hand.surfaces)mesh.material=worn?(isDirty?dirty:glove):skin;},
  dispose(){for(const hand of Object.values(views))hand.root.dispose();skin.dispose();glove.dispose();dirty.dispose();},
 };
 return api;
}
