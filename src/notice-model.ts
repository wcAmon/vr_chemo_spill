import {Color3,DynamicTexture,MeshBuilder,Scene,StandardMaterial,TransformNode} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
import notices from './notices.json';
export const noticeForKind=(kind:string)=>notices.find(row=>row.kind===kind);
export function wrapNotice(text:string,measure:(s:string)=>number,max:number):string[]{
 const lines:string[]=[];let line='';
 for(const char of text){if(char==='\n'){lines.push(line);line='';continue;}if(line&&measure(line+char)>max){lines.push(line);line=char;}else line+=char;}
 if(line)lines.push(line);return lines;
}
export function createNotice(scene:Scene,kind:string):BuiltModel{
 const row=noticeForKind(kind);if(!row)throw new Error(`Unknown notice ${kind}`);
 const root=new TransformNode(kind,scene),frame=MeshBuilder.CreateBox(`${kind}-frame`,{width:row.width,height:row.height,depth:.055},scene);
 frame.parent=root;const wood=new StandardMaterial(`${kind}-wood`,scene);wood.diffuseColor=Color3.FromHexString('#CFAF87');wood.specularColor.setAll(.06);frame.material=wood;
 const face=MeshBuilder.CreatePlane(`${kind}-lettering`,{width:row.width-.07,height:row.height-.07},scene);face.parent=root;face.position.z=-.029;
 const ink=new StandardMaterial(`${kind}-ink`,scene);ink.disableLighting=true;ink.emissiveColor=Color3.White();ink.diffuseColor=Color3.White();face.material=ink;
 let texture:DynamicTexture|undefined;
 if(typeof document!=='undefined'||typeof OffscreenCanvas!=='undefined'){
  const w=2048,h=Math.round(w*(row.height-.07)/(row.width-.07));texture=new DynamicTexture(`${kind}-text`,{width:w,height:h},scene,true);ink.diffuseTexture=texture;ink.emissiveTexture=texture;
  const c=texture.getContext() as CanvasRenderingContext2D;
  c.fillStyle='#fffdf5';c.fillRect(0,0,w,h);c.fillStyle='#76947C';c.fillRect(0,0,28,h);
  const font="'PingFang TC','Noto Sans TC',system-ui,sans-serif";c.textBaseline='top';c.fillStyle='#647C68';c.font=`600 46px ${font}`;c.fillText('化療潑灑防護訓練',96,64);
  c.fillStyle='#274D40';c.font=`700 124px ${font}`;c.fillText(row.title,92,158);
  c.fillStyle='#D9CBB4';c.fillRect(96,322,w-192,3);
  let size=96,lines:string[]=[];do{c.font=`500 ${size}px ${font}`;lines=wrapNotice(row.body,t=>c.measureText(t).width,w-192);if(376+lines.length*size*1.3<h-64)break;size-=2;}while(size>=90);
  c.fillStyle='#354B41';lines.forEach((line,i)=>c.fillText(line,96,376+i*size*1.3));texture.update(true);
 }
 return {root,nodes:{root},meshes:{frame,face},bodies:{},constraints:[],physicsScale:1,dispose(){root.dispose();wood.dispose();ink.dispose();texture?.dispose();}};
}
