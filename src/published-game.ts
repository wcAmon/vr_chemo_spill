import {catalogItem} from './catalog';
import {Mission} from './mission';
import type {GameDocument,WorldItem,Vec3} from './state';
export interface GameResult {ok:boolean;message:string;effect?:'start'|'broadcast'|'unfold'|'wear'|'open-kit'|'clean'|'dispose'|'place';id?:string;}
const distance=(a:Vec3,b:Vec3)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const fail=(message:string):GameResult=>({ok:false,message});
const success=(message:string,effect?:GameResult['effect'],id?:string):GameResult=>({ok:true,message,effect,id});
const required=['chemo-iv-bag','megaphone','spill-warning-sign','ppe-set','chemo-spill-kit','filled-waste-bag','cytotoxic-waste-bin','training-console'];
const names=['化療藥袋','大聲公','警示牌','防護裝備','處理包','紅色廢棄物袋','廢棄物桶','啟動台'];
/** Only explicit interactions enter the mission. No author prose is evaluated. */
export class PublishedGame {
 readonly mission=new Mission();readonly originals:Map<string,WorldItem>;
 broadcastFinished=false;gloves=false;kitOpen=false;padId:string|null=null;
 constructor(readonly doc:GameDocument){this.originals=new Map(doc.state.items.map(i=>[i.id,structuredClone(i)]));}
 item(kind:string):WorldItem|undefined{return this.doc.state.items.find(i=>i.kind===kind&&this.originals.get(i.id)?.status==='placed');}
 validate():string|null{const missing=required.filter(k=>!this.item(k));return missing.length?'請先在製作模式放好：'+missing.map(k=>names[required.indexOf(k)]).join('、'):null;}
 get signTarget():Vec3{const i=this.item('spill-warning-sign');const p=i?this.originals.get(i.id)!.position:[-3.6,.76,.7];return [Math.max(-4.4,Math.min(4.4,p[0]+(p[0]<0?1:-1))),0,p[2]];}
 get cleanTarget():Vec3{const p=this.item('chemo-spill-kit')?.position??[3,.76,2];return [p[0]-.12,p[1]+.012,p[2]+.48];}
 get binTarget():Vec3{const p=this.item('cytotoxic-waste-bin')?.position??[4,0,1];return [p[0],p[1]+.48,p[2]];}
 get objectiveTarget():Vec3|null{switch(this.mission.stage){case 2:return this.signTarget;case 4:return this.kitOpen?this.cleanTarget:this.item('chemo-spill-kit')?.position??null;case 5:return this.binTarget;default:return null;}}
 start():GameResult{const error=this.validate();if(error)return fail(error);if(!this.mission.start())return fail('已啟動；使用重新開始可再挑戰');return success('計時開始 · 藥袋破裂，請到第一站拿起大聲公廣播','start');}
 canTake(id:string):boolean{const i=this.doc.item(id);if(!i||i.status!=='placed')return false;const kind=({1:'megaphone',2:'spill-warning-sign',3:'ppe-set',4:'absorbent-pad',5:'filled-waste-bag'} as Record<number,string>)[this.mission.stage];return i.kind===kind&&(this.mission.stage!==4||id===this.padId);}
 take(id:string,player:Vec3):GameResult{const i=this.doc.item(id);if(!this.canTake(id)||!i)return fail(this.mission.stage===0?'先對準啟動台按 F 開始計時；現在可以自由閱讀各站說明':'請依上方任務順序操作');if(this.doc.held)return fail('請先完成手上物件的動作');if(distance(player,i.position)>3)return fail('請靠近物件');this.doc.take(id);return success('已拿起 · '+(i.kind==='spill-warning-sign'?'警示牌已展開，請放到桌旁光圈':'按滑鼠左鍵使用'),i.kind==='spill-warning-sign'?'unfold':undefined,id);}
 use(id:string,player:Vec3):GameResult{
  const i=this.doc.item(id),stage=this.mission.stage;if(!i)return fail('請對準任務物件');
  if(i.kind==='training-console')return distance(player,i.position)<=3?this.start():fail('請靠近啟動台');
  if(stage===4&&i.id===this.item('chemo-spill-kit')?.id){if(distance(player,i.position)>3)return fail('請靠近處理包');if(this.kitOpen)return fail('處理包已打開，請拿起旁邊的吸附墊');this.kitOpen=true;this.padId='runtime-pad-'+i.id;const p=padSpawnPosition(i.position,player);this.doc.state.items.push({id:this.padId,kind:'absorbent-pad',status:'placed',position:p,rotationY:0,note:''});return success('處理包已打開 · 拿取旁邊的吸附墊','open-kit',id);}
  if(this.doc.held?.id!==id)return fail('請先拿起本站物件');
  if(stage===2&&i.kind==='megaphone'&&this.broadcastFinished){this.returnBroadcast();return success('麥克風已放回原位 · 前往第二站','place',id);}
  if(stage===1&&i.kind==='megaphone'){this.mission.complete(1);return success('正在播放廣播，播放完請放下麥克風','broadcast',id);}
  if(stage===3&&i.kind==='ppe-set'){this.gloves=true;this.doc.retrieve(id);this.mission.complete(3);return success('防護裝備已穿戴 · 前往第四站','wear',id);}
  if(stage===4&&id===this.padId)return fail('請對準桌面標誌，按滑鼠左鍵放下毒物吸附墊');
  return fail(stage===2?'請將警示牌放到指定光圈':stage===5?'請將紅色袋子投入黃色廢棄物桶':'請依上方任務順序操作');
 }
 place(point:Vec3,player:Vec3):GameResult{
  const i=this.doc.held;if(!i)return fail('請先拿起本站物品');
  if(this.mission.stage===2&&i.kind==='spill-warning-sign'){
   if(distance(point,this.signTarget)>.55||distance(player,this.signTarget)>2.2)return fail('請靠近並對準桌旁的黄色光圈');this.doc.place(this.signTarget);this.mission.complete(2);return success('警示牌已站立於指定位置 · 前往第三站','place',i.id);
  }
  if(this.mission.stage===4&&i.id===this.padId){
   if(distance(point,this.cleanTarget)>.45||distance(player,this.cleanTarget)>2.2)return fail('請靠近並對準桌面標誌，按左鍵放下毒物吸附墊');
   this.doc.place(this.cleanTarget);this.mission.complete(4);return success('毒物吸附墊已放到標誌上 · 前往第五站','clean',i.id);
  }
  if(this.mission.stage===5&&i.kind==='filled-waste-bag'){
   if(distance(point,this.binTarget)>.8||distance(player,this.binTarget)>2.2)return fail('請靠近並對準黃色廢棄物桶');this.doc.place(this.binTarget);this.doc.retrieve(i.id);this.mission.complete(5);return success('五站完成！','dispose',i.id);
  }
  return fail('請按滑鼠左鍵完成本站操作；Esc 可重新開始');
 }
 returnBroadcast():void{const i=this.item('megaphone');if(i&&this.doc.held?.id===i.id)Object.assign(i,structuredClone(this.originals.get(i.id)!));}
}

export function publishedActionLabel(kind:string):string|undefined{return ({'megaphone':'動作 · 廣播','ppe-set':'動作 · 穿戴防護裝備','chemo-spill-kit':'動作 · 打開處理包','absorbent-pad':'動作 · 吸附清理','training-console':'啟動 · 開始計時'} as Record<string,string>)[kind];}

export function canReadPublished(kind:string):boolean{return catalogItem(kind).category!=='家具'||kind==='station-sign'||kind.startsWith('notice-');}
export function padSpawnPosition(kit:Vec3,player:Vec3):Vec3{const dx=player[0]-kit[0],dz=player[2]-kit[2],length=Math.hypot(dx,dz);return [kit[0]+(length>.01?dx/length:-1)*.48,kit[1]+.006,kit[2]+(length>.01?dz/length:0)*.48];}
export function publishedHint(game:PublishedGame,target:string|null):string{
 const held=game.doc.held,item=game.doc.item(target??'');
 if(held?.kind==='megaphone'&&game.mission.stage===2)return game.broadcastFinished?'麥克風播放完畢 · 左鍵 放下麥克風，再前往第二站':'麥克風廣播播放中…';
 if(held){const action:Record<string,string>={'megaphone':'左鍵 廣播','spill-warning-sign':'對準地面標誌 · 左鍵 放置','ppe-set':'左鍵 穿戴','absorbent-pad':'對準桌面污染標誌 · 左鍵 放置','filled-waste-bag':'對準黃色桶 · 左鍵 投入'};return (item&&item.id!==held.id?catalogItem(item.kind).name+' · ':'')+catalogItem(held.kind).name+' · '+(action[held.kind]??'左鍵 使用');}
 if(!item)return '';
 const name=catalogItem(item.kind).name;
 if(item.kind==='training-console')return name+(game.mission.stage===0?' · F 開始計時':' · 計時已啟動');
 if(game.canTake(item.id))return name+' · F 拿起';
 if(item.kind==='chemo-spill-kit'&&game.mission.stage===4)return name+(game.kitOpen?' · 已打開，拿取旁邊吸附墊':' · F 打開');
 return name+(canReadPublished(item.kind)?' · F 查看說明':'');
}
