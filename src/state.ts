export type Vec3=[number,number,number];
export interface WorldItem {id:string;kind:string;status:'backpack'|'held'|'placed';position:Vec3;rotationY:number;note?:string;}
export interface WorldState {items:WorldItem[];}
export class GameDocument {
 constructor(public state:WorldState){}
 get held(){return this.state.items.find(i=>i.status==='held');}
 item(id:string){return this.state.items.find(i=>i.id===id);}
 take(id:string){const i=this.item(id);if(!i||this.held)return false;i.status='held';return true;}
 place(position:Vec3){const i=this.held;if(!i)return false;i.position=[...position];i.status='placed';return true;}
 retrieve(id:string){const i=this.item(id);if(!i)return false;i.status='backpack';return true;}
 snapshot(){return structuredClone(this.state);}
}
