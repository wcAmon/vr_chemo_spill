import {Vector3,type Scene} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
import {ParkourController} from './runtime/controller';
import {FigurePose,sampleClip,type Clip} from './runtime/figure';
import {createHands} from './runtime/hands';
import type {Movement} from './input';
export const FIGURE_SCALE=17;
/** Game-specific analog locomotion, retaining the shared capsule and figure rig. */
export function createPlayer(scene:Scene,model:BuiltModel,run:Clip,spawn:Vector3){
 const controller=new ParkourController(scene,spawn,{capsuleHeight:1.65,capsuleRadius:.25,strength:30});
 const pose=new FigurePose(model);pose.apply({},1,0,0,true);
 const eyeHeight=model.nodes.head.position.y;model.meshes.nose.computeWorldMatrix(true);
 const eyeForward=model.meshes.nose.getBoundingInfo().boundingBox.maximumWorld.z-model.root.position.z+.015;
 const hands=createHands(scene,model);
 for(const mesh of model.root.getChildMeshes()){mesh.isPickable=false;mesh.metadata={...mesh.metadata,trainingAvatar:true};}
 for(const mesh of model.nodes.head.getChildMeshes())mesh.isVisible=false;
 model.root.position.copyFrom(spawn);
 let input:Movement={x:0,y:0},running=false,phase=0;
 return {
  hands,
  get position(){return controller.feet;},
  get eye(){const yaw=model.root.rotation.y;return controller.feet.add(new Vector3(Math.sin(yaw)*eyeForward,eyeHeight,Math.cos(yaw)*eyeForward));},
  setMovement(movement:Movement,run=false){const length=Math.max(1,Math.hypot(movement.x,movement.y));input={x:movement.x/length,y:movement.y/length};running=run;},
  tick(dt:number,cameraForward:Vector3){
   const forward=new Vector3(cameraForward.x,0,cameraForward.z);if(forward.lengthSquared()<1e-8)forward.set(0,0,1);forward.normalize();
   const right=new Vector3(forward.z,0,-forward.x),direction=forward.scale(input.y).add(right.scale(input.x));
   if(input.x===0&&input.y===0){controller.velocity.x=0;controller.velocity.z=0;}
   controller.setInput({x:direction.x,z:direction.z,run:running,jump:false});controller.tick(dt);
   phase+=dt*Math.max(.15,controller.speed)/1.45;
   const target:Record<string,number>=controller.speed>.08?sampleClip(run,phase,true):{};
   const weight=Math.min(1,controller.speed/.8);for(const key in target)target[key]*=weight;
   pose.apply(target,dt,Math.min(.14,controller.speed*.035),0,true);
   model.root.position.copyFrom(controller.feet);model.root.rotation.y=Math.atan2(forward.x,forward.z);model.root.computeWorldMatrix(true);hands.rest();
  },
  reset(position:Vector3){controller.reset(position);input={x:0,y:0};running=false;phase=0;},
  dispose(){hands.dispose();controller.dispose();},
 };
}
