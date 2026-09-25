import {Color3,Color4,Matrix,Engine,HavokPlugin,HemisphericLight,DirectionalLight,Quaternion,Scene,UniversalCamera,Vector3} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import wasm from '../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import {registry} from './registry';
import {createPlayer,FIGURE_SCALE} from './player';
import {validateClip} from './runtime/figure';
import motion from './run-pose.json';
import world from './world.json';
import {GameDocument,type WorldState,type Vec3} from './state';
import {createRoom,createGameModel,type GameModel} from './geometry';
import {GameInput} from './input';
import {MobileControls} from './mobile';
import {PublishedGame,canReadPublished,publishedHint,type GameResult} from './published-game';
import {STATIONS,formatTime} from './mission';
import {GameView} from './game-view';
import {catalogItem} from './catalog';
import {createObjectAction,BROADCAST,type ObjectAction} from './object-actions';
import {createFilledBag} from './filled-bag';
import {visiblePickable} from './picking';
import './style.css';
const el=(id:string)=>document.getElementById(id)!;
async function boot(){
 const canvas=el('app') as HTMLCanvasElement,engine=new Engine(canvas,true,{preserveDrawingBuffer:true}),scene=new Scene(engine);
 const bytes=wasm.startsWith('data:')?Uint8Array.from(atob(wasm.split(',')[1]),c=>c.charCodeAt(0)):new Uint8Array(await (await fetch(wasm)).arrayBuffer());
 scene.enablePhysics(new Vector3(0,-9.81,0),new HavokPlugin(false,await HavokPhysics({wasmBinary:bytes.buffer})));
 scene.getPhysicsEngine()!.setSubTimeStep(1000/60);
 scene.clearColor=new Color4(.969,.957,.925,1);
 const light=new HemisphericLight('daylight',new Vector3(.1,1,.2),scene);light.intensity=.9;light.groundColor=new Color3(.76,.72,.64);
 const sun=new DirectionalLight('sun',new Vector3(-.4,-1,.4),scene);sun.intensity=.35;sun.diffuse=new Color3(1,.97,.91);createRoom(scene);
 const camera=new UniversalCamera('eyes',new Vector3(0,1.55,-3.5),scene);camera.minZ=.025;camera.fov=1.1;camera.inputs.clear();camera.rotation.x=.16;
 const figure=(await registry['action-figure']()).default(scene,{physics:false,physicsScale:FIGURE_SCALE});
 const player=createPlayer(scene,figure,validateClip(motion),new Vector3(0,0,-3.5));
 const doc=new GameDocument(structuredClone(world) as WorldState);let game=new PublishedGame(doc);
 const view=new GameView(scene,figure,player.hands),models=new Map<string,GameModel>(),actions=new Map<string,ObjectAction>(),pending=new Set<string>();
 let panel='entry',target:string|null=null,busy=false,generation=0,broadcastId:string|null=null,broadcastTime=0,toastTimer=0;
 let mobile:MobileControls;
 const toast=(message:string)=>{el('toast').textContent=message;el('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el('toast').classList.remove('show'),3000);};
 const stopBroadcast=()=>{if(broadcastId){actions.get(broadcastId)?.reset();broadcastId=null;if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}};
 const close=()=>{if(busy)return;panel='none';el('overlay').hidden=true;document.documentElement.dataset.menu='false';scene.physicsEnabled=true;game.mission.pause(false);input.resume(true);mobile?.setActive(true);if(broadcastId&&typeof speechSynthesis!=='undefined')speechSynthesis.resume();};
 const open=(type:string,id?:string)=>{
  panel=type;input.pause();mobile?.setActive(false);scene.physicsEnabled=false;game.mission.pause(true);document.documentElement.dataset.menu='true';el('overlay').hidden=false;
  if(broadcastId&&typeof speechSynthesis!=='undefined')speechSynthesis.pause();
  const title=type==='entry'?'化療藥物潑灑處理':type==='complete'?'五站完成，過關！':type==='object'?catalogItem(doc.item(id!)!.kind).name:'暫停';el('panel-title').textContent=title;el('panel-body').replaceChildren();el('panel-actions').replaceChildren();
  const text=type==='entry'?'你可以自由查看各站的物品閱讀各站說明。準備好後，對準中間啟動台按 F 開始計時。依序完成通報、警示、防護、清理與廢棄物處理。':type==='complete'?'完成時間 '+formatTime(game.mission.elapsed):type==='object'?catalogItem(doc.item(id!)!.kind).description:'計時已暫停。';
  const p=document.createElement('p');p.textContent=text;el('panel-body').append(p);
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;el('panel-actions').append(b);};
  button(type==='entry'?'進入世界':type==='complete'?'繼續參觀':'繼續遊戲',close);
  if(type!=='entry'&&type!=='object')button('重新開始',()=>void restart());
  if(type==='entry'){const note=document.createElement('small');note.textContent='教學情境遊戲；實務操作依院內規範與指導。';el('panel-body').append(note);}
 };
 const refreshTarget=()=>{const hit=scene.pickWithRay(camera.getForwardRay(4),m=>visiblePickable(m)&&m.metadata?.gameItem!==doc.held?.id&&!m.metadata?.trainingAvatar);target=hit&&hit.distance<=3?hit.pickedMesh?.metadata?.gameItem??null:null;};
 const handle=(result:GameResult)=>{
  toast(result.message);if(!result.ok)return;const id=result.id;
  if(result.effect==='start')for(const i of doc.state.items)if(i.kind==='chemo-iv-bag'||i.kind==='training-console')actions.get(i.id)?.start();
  if((result.effect==='unfold'||result.effect==='open-kit')&&id){actions.get(id)?.start();if(result.effect==='open-kit')scene.getMeshByName(id+'/ejected-pad')?.setEnabled(false);}
  if(result.effect==='broadcast'&&id){stopBroadcast();actions.get(id)?.start();broadcastId=id;broadcastTime=0;const current=game;
   const finish=()=>{if(game!==current||broadcastId!==id)return;game.broadcastFinished=true;stopBroadcast();toast('廣播播放完畢 · 按左鍵放下麥克風');};
   if(typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined'){const utterance=new SpeechSynthesisUtterance(BROADCAST);utterance.lang='zh-TW';utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance);}
  }
  if(result.effect==='clean')for(const i of doc.state.items)if(i.kind==='chemo-iv-bag')actions.get(i.id)?.reset();
  if(result.effect==='dispose'&&id){
   const original=models.get(id),from=original?.model.root.position.clone()??player.eye.clone(),to=Vector3.FromArray(game.binTarget),token=generation;original?.model.root.setEnabled(false);
   const thrown=createFilledBag(scene);for(const m of thrown.root.getChildMeshes())m.isPickable=false;let elapsed=0;
   const animate=()=>{if(token!==generation){scene.unregisterBeforeRender(animate);thrown.dispose();return;}if(panel!=='none')return;elapsed+=Math.min(.05,engine.getDeltaTime()/1000);const t=Math.min(1,elapsed/.6);thrown.root.position.copyFrom(Vector3.Lerp(from,to,t));thrown.root.position.y+=Math.sin(Math.PI*t)*.35;thrown.root.rotation.y=t*Math.PI;if(t===1){scene.unregisterBeforeRender(animate);thrown.dispose();open('complete');}};scene.registerBeforeRender(animate);
  }
 };
 const input=new GameInput(canvas,camera,{pause:()=>open('pause'),action:code=>{
  if(busy)return;if(panel!=='none'){if(code==='Escape')close();return;}refreshTarget();
  if(code==='KeyF'&&!doc.held&&target){const i=doc.item(target)!;if(i.kind==='training-console'||i.kind==='chemo-spill-kit'&&game.mission.stage===4&&!game.kitOpen)handle(game.use(target,player.position.asArray() as Vec3));else if(game.canTake(target))handle(game.take(target,player.position.asArray() as Vec3));else if(canReadPublished(i.kind))open('object',target);}
  if(code==='MouseLeft'&&doc.held){if(['spill-warning-sign','absorbent-pad','filled-waste-bag'].includes(doc.held.kind)){const hit=scene.pickWithRay(camera.getForwardRay(4),m=>visiblePickable(m)&&m.metadata?.gameItem!==doc.held?.id&&!m.metadata?.trainingAvatar);if(hit?.pickedPoint)handle(game.place(hit.pickedPoint.asArray() as Vec3,player.position.asArray() as Vec3));else toast('請對準發光的指定位置');}else handle(game.use(doc.held.id,player.position.asArray() as Vec3));}
 }});input.setPublished(true);mobile=new MobileControls(canvas,input);
 const load=async()=>{for(const item of doc.state.items){if(item.status==='backpack'||models.has(item.id)||pending.has(item.id))continue;pending.add(item.id);const token=generation;try{const model=await createGameModel(scene,item);if(token!==generation){model.dispose();continue;}models.set(item.id,model);const action=createObjectAction(scene,model,item.kind);if(action)actions.set(item.id,action);}finally{pending.delete(item.id);}}};
 const restart=async()=>{busy=true;open('loading');el('panel-title').textContent='正在重新開始';generation++;stopBroadcast();for(const a of actions.values())a.dispose();actions.clear();for(const m of models.values())m.dispose();models.clear();pending.clear();doc.state=structuredClone(world) as WorldState;game=new PublishedGame(doc);player.reset(new Vector3(0,0,-3.5));camera.rotation.set(.16,0,0);await load();view.update(game);busy=false;close();};
 scene.onBeforePhysicsObservable.add(()=>{
  const dt=1/60;if(broadcastId){broadcastTime+=dt;if(broadcastTime>8&&(typeof speechSynthesis==='undefined'||!speechSynthesis.speaking)){game.broadcastFinished=true;stopBroadcast();toast('廣播播放完畢 · 按左鍵放下麥克風');}}
  for(const a of actions.values())a.tick(dt);mobile.tick(dt);player.setMovement(input.frameMovement(),input.running);player.tick(dt,camera.getForwardRay().direction);camera.position.copyFrom(player.eye);
  for(const model of models.values()){
   const item=doc.item(model.itemId)!;model.model.root.setEnabled(item.status!=='backpack');
   if(item.status==='held'){
    const f=camera.getForwardRay().direction,horizontal=new Vector3(f.x,0,f.z).normalize(),center=player.eye.add(horizontal.scale(.7)).add(new Vector3(0,-.38,0)),offset=model.center.rotateByQuaternionToRef(Quaternion.RotationYawPitchRoll(item.rotationY,0,0),new Vector3());model.setPose(center.subtract(offset),item.rotationY,true);
    if(item.id===broadcastId){const forward=new Vector3(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y)),right=new Vector3(forward.z,0,-forward.x);model.setPose(player.eye.add(forward.scale(.43)).add(right.scale(.16)).add(new Vector3(0,-.38,0)),camera.rotation.y+.65,true);}
    item.position=model.model.root.position.asArray() as Vec3;
   }else model.setPose(Vector3.FromArray(item.position),item.rotationY,item.status==='backpack');
  }
 });
 scene.onAfterPhysicsObservable.add(()=>{
  camera.position.copyFrom(player.eye);const held=doc.held?models.get(doc.held.id):null;
  if(!held&&game.gloves){const forward=camera.getForwardRay().direction,right=new Vector3(Math.cos(camera.rotation.y),0,-Math.sin(camera.rotation.y));for(const side of ['left','right'] as const)player.hands.pose(side,{position:player.eye.add(forward.scale(.48)).add(right.scale(side==='right'?.21:-.21)).add(new Vector3(0,-.28,0)),rotation:Quaternion.RotationYawPitchRoll(camera.rotation.y,0,0),gesture:'rest'});}
  if(held){const b=held.model.root.getHierarchyBoundingVectors(true),center=b.min.add(b.max).scale(.5),half=b.max.subtract(b.min).scale(.5),forward=new Vector3(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y)),right=new Vector3(forward.z,0,-forward.x),width=Math.abs(right.x)*half.x+Math.abs(right.z)*half.z,depth=Math.abs(forward.x)*half.x+Math.abs(forward.z)*half.z;
   for(const side of ['left','right'] as const){if(doc.held?.kind==='megaphone'){const root=held.model.root,local=side==='right'?new Vector3(.025,.105,-.135):new Vector3(-.075,.18,.045);player.hands.pose(side,{position:root.position.add(local.rotateByQuaternionToRef(root.rotationQuaternion!,new Vector3())),rotation:root.rotationQuaternion!,gesture:side==='right'?'grip':'support'});}else{const point=center.add(right.scale((side==='right'?1:-1)*(width+.035))).subtract(forward.scale(depth+.035));point.y=Math.max(player.eye.y-.27,center.y+half.y*.4);player.hands.pose(side,{position:point,rotation:Quaternion.RotationYawPitchRoll(camera.rotation.y,0,0),gesture:'support'});}}
  }
 });
 scene.onAfterRenderObservable.add(()=>{
  if(busy)return;refreshTarget();view.update(game);if(game.padId&&!models.has(game.padId)&&!pending.has(game.padId))void load().catch(e=>toast(String(e)));
  el('mission-step').textContent=game.mission.stage===0?'自由參觀':game.mission.stage===6?'任務完成':`第 ${game.mission.stage} / 5 站`;
  el('mission-task').textContent=game.mission.stage===2&&doc.held?.kind==='megaphone'?(game.broadcastFinished?'廣播播放完畢 · 左鍵放下麥克風，再前往第二站':'廣播播放中 · 播放完請放下麥克風'):STATIONS[game.mission.stage];
  el('mission-time').textContent=(game.mission.stage===6?'完成時間 ':'計時 ')+formatTime(game.mission.elapsed);el('object-hint').textContent=publishedHint(game,target);
  const i=doc.item(target??''),canF=!doc.held&&!!i&&(i.kind==='training-console'||canReadPublished(i.kind));
  mobile.update(canF,i?.kind==='training-console'?'啟動':i&&game.canTake(i.id)?'拿起':'開啟／說明',!!doc.held,game.broadcastFinished&&doc.held?.kind==='megaphone'?'放下麥克風':['absorbent-pad','spill-warning-sign'].includes(doc.held?.kind??'')?'放到標誌':doc.held?.kind==='filled-waste-bag'?'投入':'使用');
  const bubble=el('console-bubble'),consoleItem=game.mission.stage===0?game.item('training-console'):null;bubble.hidden=true;
  if(consoleItem&&panel==='none'){const point=Vector3.FromArray(consoleItem.position).add(new Vector3(0,1.15,0));if(Vector3.Dot(point.subtract(camera.position),camera.getForwardRay().direction)>0){const screen=Vector3.Project(point,Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));bubble.hidden=screen.z<0||screen.z>1;bubble.style.left=`${screen.x/engine.getRenderWidth()*100}%`;bubble.style.top=`${screen.y/engine.getRenderHeight()*100}%`;}}
 });
 await load();open('entry');engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());document.addEventListener('visibilitychange',()=>{if(document.hidden&&panel==='none')open('pause');});
 if(import.meta.env.DEV&&location.search.includes('qa=1'))Object.assign(window,{__gameQa:{snapshot:()=>({effects:scene.meshes.filter(m=>m.name.endsWith('/spill')).map(m=>({name:m.name,position:m.position.asArray(),bounds:m.getBoundingInfo().boundingBox.extendSize.asArray(),enabled:m.isEnabled()})),active:input.active,panel,target,held:doc.held?.kind,stage:game.mission.stage,items:doc.snapshot().items,signTarget:game.signTarget,cleanTarget:game.cleanTarget,binTarget:game.binTarget,padId:game.padId,gloves:game.gloves}),aim:(position:Vec3,point:Vec3)=>{player.reset(Vector3.FromArray(position));camera.position.copyFrom(player.eye);camera.setTarget(Vector3.FromArray(point));},input:(code:string)=>input.trigger(code)}});
}
void boot().catch(error=>{el('panel-title').textContent='無法啟動遊戲';el('panel-body').textContent=String(error);const b=document.createElement('button');b.textContent='重新載入';b.onclick=()=>location.reload();el('panel-actions').append(b);});
