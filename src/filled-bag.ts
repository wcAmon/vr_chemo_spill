import {Color3,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';
import type {BuiltModel} from './shared/types';
export function createFilledBag(scene:Scene):BuiltModel{
 const root=new TransformNode('filled-waste-bag',scene),meshes:Record<string,Mesh>={};
 const red=new StandardMaterial('filled-bag-red',scene);red.diffuseColor=Color3.FromHexString('#CE393D');red.specularColor.setAll(.12);
 const white=new StandardMaterial('filled-bag-label',scene);white.diffuseColor=Color3.FromHexString('#FFF1D9');
 const body=MeshBuilder.CreateSphere('filled-bag-body',{diameterX:.32,diameterY:.38,diameterZ:.28,segments:16},scene);body.parent=root;body.position.y=.19;body.material=red;meshes.body=body;
 const neck=MeshBuilder.CreateCylinder('filled-bag-neck',{height:.11,diameterTop:.1,diameterBottom:.055,tessellation:12},scene);neck.parent=root;neck.position.y=.405;neck.material=red;meshes.neck=neck;
 const tie=MeshBuilder.CreateTorus('filled-bag-tie',{diameter:.058,thickness:.012,tessellation:16},scene);tie.parent=root;tie.position.y=.37;tie.material=white;meshes.tie=tie;
 const label=MeshBuilder.CreateBox('filled-bag-label',{width:.15,height:.09,depth:.008},scene);label.parent=root;label.position.set(0,.22,-.132);label.material=white;meshes.label=label;
 const cross=MeshBuilder.CreateBox('filled-bag-mark',{width:.1,height:.014,depth:.01},scene);cross.parent=root;cross.position.set(0,.22,-.14);cross.material=red;meshes.mark=cross;
 return {root,nodes:{root},meshes,bodies:{},constraints:[],physicsScale:1,dispose(){root.dispose(false,true);red.dispose();white.dispose();}};
}
