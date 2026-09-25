import {Color3,DynamicTexture,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
import type {PublishedGame} from './published-game';
import type {Hands} from './runtime/hands';
export class GameView {
 private tornBag:TransformNode;private ring:Mesh;private liquid:Mesh;private gown:TransformNode;private materials:StandardMaterial[]=[];
 constructor(scene:Scene,figure:BuiltModel,private hands:Hands){
  const material=(name:string,color:string)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);this.materials.push(m);return m;};
  const gold=material('mission-target','#FFC83D');gold.emissiveColor.set(.6,.35,.03);
  this.ring=MeshBuilder.CreateTorus('mission-target',{diameter:.8,thickness:.04,tessellation:48},scene);this.ring.material=gold;this.ring.isPickable=true;this.ring.metadata={missionTarget:true};this.ring.setEnabled(false);
  this.liquid=MeshBuilder.CreateDisc('cleaning-practice-liquid',{radius:.19,tessellation:48,sideOrientation:Mesh.DOUBLESIDE},scene);this.liquid.rotation.x=Math.PI/2;this.liquid.material=material('practice-liquid','#D7B842');this.liquid.isPickable=true;this.liquid.metadata={missionTarget:true};this.liquid.setEnabled(false);
  this.tornBag=new TransformNode('practice-broken-chemo-bag',scene);
  const plastic=material('practice-bag-plastic','#D9EEEE');plastic.alpha=.85;
  const fluid=material('practice-bag-drug','#E8CA55');
  const piece=(name:string,w:number,h:number,d:number,x:number,z:number,mat:StandardMaterial)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.parent=this.tornBag;mesh.position.set(x,.008,z);mesh.material=mat;mesh.isPickable=true;mesh.metadata={missionTarget:true};return mesh;};
  piece('broken-bag-body',.16,.012,.22,-.04,0,plastic);
  piece('broken-bag-liquid',.12,.014,.14,-.04,-.02,fluid);
  const torn=piece('broken-bag-torn-end',.16,.009,.035,-.015,.15,plastic);torn.rotation.y=.3;
  const label=piece('broken-bag-label',.13,.017,.09,-.04,-.03,material('practice-bag-label','#FFFFFF'));
  const texture=new DynamicTexture('broken-bag-label-text',{width:512,height:256},scene,false);texture.drawText('化療藥袋・破裂',null,150,'bold 48px sans-serif','#542154','#FFFFFF',true);(label.material as StandardMaterial).diffuseTexture=texture;
  this.tornBag.setEnabled(false);
  this.gown=new TransformNode('worn-ppe',scene);this.gown.parent=figure.root;
  const fabric=material('worn-ppe-fabric','#B9D6D1');
  const body=MeshBuilder.CreateBox('worn-ppe-gown',{width:.57,height:.64,depth:.34},scene);body.parent=this.gown;body.position.set(0,figure.nodes.torso.position.y-.08,0);body.material=fabric;body.isPickable=false;
  for(const side of [-1,1]){const sleeve=MeshBuilder.CreateCylinder('worn-ppe-sleeve',{height:.34,diameter:.19,tessellation:12},scene);sleeve.parent=figure.nodes[side===1?'forearm-l':'forearm-r'];sleeve.position.y=-.035;sleeve.material=fabric;sleeve.isPickable=false;/* enable via metadata group */sleeve.metadata={ppeSleeve:true};}
  this.setProtection(false);
 }
 setProtection(worn:boolean):void{this.gown.setEnabled(worn);this.hands.setGloves(worn,false);for(const mesh of this.gown.getScene().meshes)if(mesh.metadata?.ppeSleeve)mesh.setEnabled(worn);}
 update(game:PublishedGame|null):void{const target=game?.objectiveTarget;this.ring.setEnabled(!!target);if(target)this.ring.position.copyFrom(Vector3.FromArray(target).add(new Vector3(0,.025,0)));const show=!!game&&game.mission.stage===4&&game.kitOpen;this.liquid.setEnabled(show);this.tornBag.setEnabled(show);if(show)this.tornBag.position.copyFrom(Vector3.FromArray(game!.cleanTarget));if(show)this.liquid.position.copyFrom(Vector3.FromArray(game!.cleanTarget));this.setProtection(!!game?.gloves);}
}
