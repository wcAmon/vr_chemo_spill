import {Color3,Mesh,MeshBuilder,Scene,StandardMaterial,Vector3} from '@babylonjs/core';
import type {GameModel} from './geometry';
export const BROADCAST='現場發生化療藥物潑灑，請保持距離，並通知現場人員。';
export type ActionDefinition={label:string;requirement:'placed'|'held';description:string};
export const actionForKind=(kind:string):ActionDefinition|undefined=>({
 'chemo-iv-bag':{label:'破裂',requirement:'placed',description:'先放好點滴袋，再啟動破裂；顯示塌扁袋體與所在表面的藥液。可重設後再試。'},
 'training-console':{label:'開始訓練',requirement:'placed',description:'在運行模式使用此啟動台，開始訓練並觸發已設定的物件動作。'},
 'spill-warning-sign':{label:'展開警示牌',requirement:'held',description:'原態收折平放；拿起時展開為站立警示牌。'},
 'chemo-spill-kit':{label:'打開處理包',requirement:'placed',description:'掀開上蓋，將吸附墊取出放在盒旁。'},
 'ppe-set':{label:'穿戴防護裝備',requirement:'held',description:'拿起後穿戴防護衣與手套。'},
 'filled-waste-bag':{label:'投入廢棄物桶',requirement:'held',description:'拿起紅色袋子，靠近黃色廢棄物桶後投入。'},
 'megaphone':{label:'廣播',requirement:'held',description:'拿在手上啟動，會抬到嘴邊並播放示範廣播。可停止後再試；不使用麥克風錄音。'},
} as Record<string,ActionDefinition>)[kind]??{label:'切換啟動態',requirement:'placed',description:'此物件已提供兩態欄位，目前兩態外觀相同。請描述啟動態應有的外觀與動作，供後續製作。'};
export interface ObjectAction {readonly active:boolean;start():void;tick(dt:number):void;reset():void;dispose():void;}
/** Runtime effects are deliberately separate from the saved authoring document. */
export function createObjectAction(scene:Scene,model:GameModel,kind:string):ObjectAction|undefined{
 if(!actionForKind(kind))return;
 let active=false,elapsed=0;const drops:Mesh[]=[];let dropOrigin:Vector3|undefined;const spawned:Mesh[]=[];let material:StandardMaterial|undefined;
 const visibility=new Map<Mesh,boolean>();let consoleColor:Color3|undefined;const consoleMaterial=kind==='training-console'?model.model.meshes.button?.material as StandardMaterial:undefined;let spill:Mesh|undefined;
 const reset=()=>{if(consoleMaterial&&consoleColor)consoleMaterial.emissiveColor.copyFrom(consoleColor);active=false;elapsed=0;for(const [mesh,visible] of visibility)mesh.isVisible=visible;visibility.clear();for(const mesh of spawned)mesh.dispose();spawned.length=0;drops.length=0;dropOrigin=undefined;if(kind==='spill-warning-sign'||kind==='chemo-spill-kit')model.setActivePose(false);spill=undefined;material?.dispose();material=undefined;};
 return {get active(){return active;},start(){
  if(active)return;active=true;elapsed=0;
  if(kind==='spill-warning-sign'||kind==='chemo-spill-kit')model.setActivePose(true);
  if(kind==='chemo-spill-kit'){
   material=new StandardMaterial(model.itemId+'/pad-material',scene);material.diffuseColor.set(.95,.96,.84);
   const pad=MeshBuilder.CreateBox(model.itemId+'/ejected-pad',{width:.25,height:.012,depth:.19},scene);pad.parent=model.model.root;pad.position.set(-.38,.006,0);pad.material=material;pad.isPickable=false;spawned.push(pad);
  }
  if(kind==='ppe-set')for(const mesh of model.model.root.getChildMeshes() as Mesh[]){visibility.set(mesh,mesh.isVisible);mesh.isVisible=false;}
  if(consoleMaterial){consoleColor=consoleMaterial.emissiveColor.clone();consoleMaterial.emissiveColor.set(.1,.7,.2);}
  if(kind==='chemo-iv-bag'){
   const hanging=!!model.model.root.metadata?.hangingBag;const {bag,liquid,label}=model.model.meshes;for(const mesh of hanging?[liquid]:[bag,liquid,label])if(mesh){visibility.set(mesh,mesh.isVisible);mesh.isVisible=false;}
   const flat=MeshBuilder.CreateBox(model.itemId+'/flat',{width:.14,height:.01,depth:.19},scene);flat.parent=model.model.root;flat.position.y=hanging?-.07:.005;if(hanging){flat.rotation.x=Math.PI/2;flat.position.z=.025;}flat.material=bag.material;flat.isPickable=true;flat.metadata={gameItem:model.itemId};spawned.push(flat);
   material=new StandardMaterial(model.itemId+'/spill-material',scene);material.diffuseColor=new Color3(.90,.76,.26);material.alpha=.65;material.specularColor.setAll(.35);material.backFaceCulling=false;
   spill=MeshBuilder.CreateDisc(model.itemId+'/spill',{radius:.30,tessellation:64,updatable:true,sideOrientation:Mesh.DOUBLESIDE},scene);spill.rotation.x=Math.PI/2;spill.position.copyFrom(model.model.root.position);spill.position.y=hanging?.004:spill.position.y+model.minY+.002;spill.material=material;spill.isPickable=false;spawned.push(spill);
   if(hanging){
    dropOrigin=model.model.root.position.add(new Vector3(0,-.075,0));
    for(let n=0;n<12;n++){const drop=MeshBuilder.CreateSphere(model.itemId+'/drip-'+n,{diameter:.022,segments:6},scene);drop.material=material;drop.isPickable=false;drop.setEnabled(false);drops.push(drop);spawned.push(drop);}
    const tear=MeshBuilder.CreateBox(model.itemId+'/tear',{width:.075,height:.012,depth:.013},scene);tear.parent=model.model.nodes.bag;tear.position.set(0,.023,.075);tear.rotation.y=.3;tear.material=material;tear.isPickable=false;spawned.push(tear);
   }

  }
 },tick(dt){
  if(!active)return;elapsed+=Math.max(0,Math.min(dt,3));
  if(dropOrigin)for(let n=0;n<drops.length;n++){
   const age=elapsed-n*.075,cycle=.8,t=((age%cycle)+cycle)%cycle;
   drops[n].setEnabled(age>=0&&elapsed<7);drops[n].position.set(dropOrigin.x+Math.sin(n*2.4)*.045*t,Math.max(.015,dropOrigin.y-2.45*t*t),dropOrigin.z+Math.cos(n*2.4)*.065*t);
  }
  if(spill){const radius=.025+(dropOrigin?.42:.275)*Math.min(1,Math.max(0,elapsed-(dropOrigin?.65:0))/2);const positions=spill.getVerticesData('position')!;for(let i=3;i<positions.length;i+=3){const length=Math.hypot(positions[i],positions[i+1]);if(length){positions[i]=positions[i]/length*radius;positions[i+1]=positions[i+1]/length*radius;}}spill.updateVerticesData('position',positions,true);}
 },reset,dispose:reset};
}
