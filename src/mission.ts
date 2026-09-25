/** Monotonic per-player clock; independent of rendering and persisted state. */
export class Mission {
 stage=0;
 private started=0;private stopped=0;private pausedAt:number|null=null;private pausedMs=0;
 constructor(private now:()=>number=()=>performance.now()){}
 get elapsed():number{return this.stage===0?0:Math.max(0,(this.stage===6?this.stopped:this.pausedAt??this.now())-this.started-this.pausedMs);}
 start():boolean{if(this.stage!==0)return false;this.started=this.now();this.stage=1;return true;}
 complete(stage:number):boolean{if(stage!==this.stage||stage<1||stage>5||this.pausedAt!==null)return false;this.stage++;if(this.stage===6)this.stopped=this.now();return true;}
 pause(value:boolean):void{if(this.stage<1||this.stage>5)return;if(value&&this.pausedAt===null)this.pausedAt=this.now();else if(!value&&this.pausedAt!==null){this.pausedMs+=this.now()-this.pausedAt;this.pausedAt=null;}}
 reset():void{this.stage=0;this.started=0;this.stopped=0;this.pausedAt=null;this.pausedMs=0;}
}
export const formatTime=(ms:number):string=>`${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}.${Math.floor(ms/10%100).toString().padStart(2,'0')}`;
export const STATIONS=[
 '你可以自由查看各站的物品閱讀各站說明',
 '第一站 · 立即通報：F 拿起大聲公，左鍵廣播',
 '第二站 · 封鎖現場：F 拿起警示牌，對準地面標誌按左鍵放置',
 '第三站 · 穿戴防護：F 拿起防護裝備，左鍵穿上',
 '第四站 · 安全清理：F 開啟處理盒、拿起毒物吸附墊，對準桌面標誌按左鍵放置',
 '第五站 · 廢棄物處理：F 拿起紅色袋子，對準黃色桶按左鍵投入',
 '五站完成 · 過關！',
] as const;
