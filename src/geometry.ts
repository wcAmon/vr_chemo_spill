import {Color3,Mesh,MeshBuilder,PhysicsBody,PhysicsMotionType,PhysicsShapeBox,Quaternion,Scene,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
import {registry} from './registry';
import {createNotice,noticeForKind} from './notice-model';
import {createMegaphone} from './megaphone';
import {propPoses} from './prop-poses';
import {createFilledBag} from './filled-bag';
import {constrainCarry} from './carry';
import type {WorldItem} from './state';
export interface GameModel {itemId:string;model:BuiltModel;size:Vector3;minY:number;center:Vector3;setActivePose(active:boolean):void;setPose(position:Vector3,yaw:number,held:boolean):void;dispose():void;}
const palette={wall:'#F7F4EC',floor:'#E6DFD2',wood:'#CFAF87',sage:'#91AA97',metal:'#BDC5C5'};
function mat(scene:Scene,name:string,color:string):StandardMaterial{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.08);return m;}
export function createFurniture(scene:Scene,kind:string):BuiltModel{
 const root=new TransformNode(kind,scene),meshes:Record<string,Mesh>={},bodies:Record<string,PhysicsBody>={};
 const materials=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,mat(scene,`${kind}-${k}`,v)]));
 const box=(name:string,p:number[],s:number[],color='wood')=>{const m=MeshBuilder.CreateBox(`${kind}/${name}`,{width:s[0],height:s[1],depth:s[2]},scene);m.parent=root;m.position=Vector3.FromArray(p);m.material=materials[color];meshes[name]=m;
  const body=new PhysicsBody(m,PhysicsMotionType.STATIC,false,scene);body.shape=new PhysicsShapeBox(Vector3.Zero(),Quaternion.Identity(),Vector3.FromArray(s),scene);body.disablePreStep=false;bodies[name]=body;};
 const legs=(w:number,d:number,h:number)=>{for(const x of [-1,1])for(const z of [-1,1])box(`leg-${x}-${z}`,[x*(w/2-.08),h/2,z*(d/2-.08)],[.06,h,.06],'metal');};
 if(kind==='work-table'||kind==='supply-table'){const w=kind==='work-table'?1.35:1.5,d=kind==='work-table'?.9:1.65;box('top',[0,.71,0],[w,.1,d]);legs(w,d,.66);}
 else if(kind==='chair'){box('seat',[0,.45,0],[.48,.08,.48],'sage');box('back',[0,.73,.23],[.48,.5,.07],'sage');legs(.48,.48,.42);}
 else if(kind==='iv-stand'){box('base',[0,.025,0],[.55,.05,.55],'metal');box('pole',[0, .92,0],[.04,1.8,.04],'metal');box('arm',[-.14,1.79,0],[.34,.03,.04],'metal');box('hook',[-.3,1.72,0],[.03,.14,.04],'metal');}
 else if(kind==='supply-cabinet'){box('cabinet',[0,.45,0],[.65,.9,1.4],'wall');box('top',[0,.93,0],[.7,.06,1.45]);box('handle',[.34,.57,0],[.05,.05,.22],'metal');}
 else if(kind==='exam-bed'){box('frame',[0,.32,0],[1.9,.12,.9],'metal');box('mattress',[0,.45,0],[1.9,.14,.9],'wall');box('pillow',[-.65,.56,0],[.45,.1,.7],'sage');legs(1.7,.9,.3);}
 else if(kind==='training-console'){box('base',[0,.42,0],[.55,.84,.4]);box('button',[0,.9,0],[.43,.08,.3],'sage');}
 else if(kind==='station-sign'){box('base',[0,.025,0],[.5,.05,.4],'metal');box('post',[0,.56,0],[.04,1.05,.04],'metal');box('sign',[0,1.25,0],[.85,.42,.05],'wall');}
 else throw new Error(`未知家具 ${kind}`);
 return {root,nodes:{root},meshes,bodies,constraints:[],physicsScale:1,dispose(){for(const b of Object.values(bodies)){b.shape?.dispose();b.dispose();}root.dispose(false,true);}};
}
export async function createGameModel(scene:Scene,item:WorldItem):Promise<GameModel>{
 const loader=registry[item.kind];const model=item.kind==='filled-waste-bag'?createFilledBag(scene):item.kind==='megaphone'?createMegaphone(scene):noticeForKind(item.kind)?createNotice(scene,item.kind):loader?(await loader()).default(scene,{physics:false}):createFurniture(scene,item.kind);
 for(const body of Object.values(model.bodies)){const shape=body.shape;body.dispose();shape?.dispose();}
 for(const key of Object.keys(model.bodies))delete model.bodies[key];
 for(const mesh of model.root.getChildMeshes()){mesh.isPickable=true;mesh.metadata={...mesh.metadata,gameItem:item.id};mesh.computeWorldMatrix(true);}
 if(item.kind==='chemo-iv-bag'&&item.position[1]>1.2){model.nodes.bag.rotation.x=Math.PI/2;model.root.metadata={...model.root.metadata,hangingBag:true};}
 const pose=propPoses(model,item.kind);pose(false);
 const bounds=model.root.getHierarchyBoundingVectors(true);const size=bounds.max.subtract(bounds.min),center=bounds.min.add(bounds.max).scale(.5),minY=bounds.min.y;
 const assemblyBody=new PhysicsBody(model.root,PhysicsMotionType.STATIC,false,scene);
 let assemblyShape=new PhysicsShapeBox(center,Quaternion.Identity(),size,scene);assemblyShape.filterMembershipMask=1;assemblyBody.shape=assemblyShape;assemblyBody.disablePreStep=false;model.bodies.assembly=assemblyBody;
 let previousHeld:boolean|null=null;
 const api:GameModel={itemId:item.id,model,size,minY,center,
  setActivePose(active){
   const savedPosition=model.root.position.clone(),savedRotation=model.root.rotationQuaternion?.clone();
   model.root.position.setAll(0);model.root.rotationQuaternion=Quaternion.Identity();pose(active);
   for(const mesh of model.root.getChildMeshes())mesh.computeWorldMatrix(true);
   const b=model.root.getHierarchyBoundingVectors(true);size.copyFrom(b.max.subtract(b.min));center.copyFrom(b.min.add(b.max).scale(.5));api.minY=b.min.y;
   const old=assemblyShape;assemblyShape=new PhysicsShapeBox(center,Quaternion.Identity(),size,scene);assemblyShape.filterMembershipMask=previousHeld?0:1;assemblyBody.shape=assemblyShape;old.dispose();
   model.root.position.copyFrom(savedPosition);model.root.rotationQuaternion=savedRotation??Quaternion.Identity();model.root.computeWorldMatrix(true);
  },
  setPose(position,yaw,held){
   model.root.position.copyFrom(held?constrainCarry(position,size,center,yaw):position);model.root.rotationQuaternion=Quaternion.RotationYawPitchRoll(yaw,0,0);model.root.computeWorldMatrix(true);
   if(previousHeld!==held){assemblyShape.filterMembershipMask=held?0:1;
    for(const mesh of model.root.getChildMeshes())mesh.visibility=held&&Math.max(size.x,size.z)>1?.65:1;previousHeld=held;}
  },dispose(){delete model.bodies.assembly;assemblyBody.dispose();assemblyShape.dispose();model.dispose();}};
 api.setPose(Vector3.FromArray(item.position),item.rotationY,item.status==='held');return api;
}
export function createRoom(scene:Scene):void{
 const wall=mat(scene,'world-wall',palette.wall),floor=mat(scene,'world-floor',palette.floor),wood=mat(scene,'world-wood',palette.wood),sky=mat(scene,'world-window','#DCECF0');sky.emissiveColor.set(.3,.35,.36);
 const solid=(name:string,p:number[],s:number[],material:StandardMaterial,pick=true)=>{const m=MeshBuilder.CreateBox(name,{width:s[0],height:s[1],depth:s[2]},scene);m.position=Vector3.FromArray(p);m.material=material;m.isPickable=pick;m.metadata={gameSurface:true};const b=new PhysicsBody(m,PhysicsMotionType.STATIC,false,scene);b.shape=new PhysicsShapeBox(Vector3.Zero(),Quaternion.Identity(),Vector3.FromArray(s),scene);return m;};
 solid('world-floor',[0,-.05,0],[10,.1,10],floor);
 for(const sign of [-1,1]){solid('world-wall-x'+sign,[sign*5.05,1.6,0],[.1,3.2,10.2],wall);solid('world-wall-z'+sign,[0,1.6,sign*5.05],[10.2,3.2,.1],wall);}
 solid('world-window',[.6,2.05,4.99],[4.8,1.5,.025],sky);
 for(const x of [-1.85,.6,3.05])solid('world-window-frame',[x,2.05,4.95],[.06,1.65,.07],wall);
 for(const y of [1.25,2.85])solid('world-window-sill',[.6,y,4.93],[5,.06,.18],wood);
}
