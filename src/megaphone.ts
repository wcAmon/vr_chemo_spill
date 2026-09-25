import {Color3,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
/** Dimensions are metres, baked into geometry; editor supplies measured collision. */
export function createMegaphone(scene:Scene):BuiltModel{
 const root=new TransformNode('megaphone',scene),meshes:Record<string,Mesh>={};
 const materials=['#FFF6DF','#557D67','#384D46'].map((color,i)=>{const m=new StandardMaterial('megaphone-material-'+i,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.setAll(.12);return m;});
 const attach=(name:string,mesh:Mesh,position:Vector3,index:number)=>{mesh.parent=root;mesh.position.copyFrom(position);mesh.material=materials[index];meshes[name]=mesh;return mesh;};
 const profile=[new Vector3(.037,-.15,0),new Vector3(.045,-.11,0),new Vector3(.125,.14,0),new Vector3(.112,.14,0),new Vector3(.030,-.11,0)];
 const horn=attach('horn',MeshBuilder.CreateLathe('megaphone-horn',{shape:profile,tessellation:48,sideOrientation:Mesh.DOUBLESIDE},scene),new Vector3(0,.23,.025),0);horn.rotation.x=Math.PI/2;
 const rim=attach('rim',MeshBuilder.CreateTorus('megaphone-rim',{diameter:.249,thickness:.022,tessellation:48},scene),new Vector3(0,.23,.165),1);rim.rotation.x=Math.PI/2;
 const rear=attach('rear',MeshBuilder.CreateCylinder('megaphone-rear',{height:.1,diameter:.096,tessellation:32},scene),new Vector3(0,.23,-.175),1);rear.rotation.x=Math.PI/2;
 const mic=attach('microphone',MeshBuilder.CreateCylinder('megaphone-microphone',{height:.018,diameter:.075,tessellation:32},scene),new Vector3(0,.23,-.234),2);mic.rotation.x=Math.PI/2;
 attach('handle',MeshBuilder.CreateBox('megaphone-handle',{width:.055,height:.18,depth:.065},scene),new Vector3(0,.09,-.135),1);
 attach('trigger',MeshBuilder.CreateBox('megaphone-trigger',{width:.025,height:.036,depth:.012},scene),new Vector3(0,.135,-.097),2);
 for(let i=-2;i<=2;i++)attach('grille-'+i,MeshBuilder.CreateBox('megaphone-grille-'+i,{width:.045,height:.0025,depth:.002},scene),new Vector3(0,.23+i*.009,-.244),0);
 return {root,nodes:{root},meshes,bodies:{},constraints:[],physicsScale:1,dispose(){root.dispose();materials.forEach(m=>m.dispose());}};
}
