import notices from './notices.json';
export interface CatalogItem {kind:string;name:string;category:'用品'|'家具';description:string;icon:string;authored?:boolean;}
export const CATALOG:readonly CatalogItem[]=[
 {kind:'chemo-spill-kit',name:'化療潑灑處理包',category:'用品',description:'處理包與鉸鏈上蓋',icon:'▣'},
 {kind:'chemo-iv-bag',name:'化療點滴袋',category:'用品',description:'點滴袋與管線',icon:'◒'},
 {kind:'cytotoxic-waste-bin',name:'細胞毒性廢棄物桶',category:'用品',description:'桶身、蓋與踏板',icon:'▥'},
 {kind:'absorbent-powder-shaker',name:'吸附粉罐',category:'用品',description:'瓶身與掀蓋',icon:'▤'},
 {kind:'spill-warning-sign',name:'警示立牌',category:'用品',description:'A 字型警示牌',icon:'△'},
 {kind:'absorbent-pad',name:'毒物吸附墊',category:'用品',description:'可對摺墊面',icon:'▱'},
 {kind:'ppe-set',name:'防護裝備組',category:'用品',description:'衣物、護目鏡、手套組',icon:'♧'},
 {kind:'disinfectant-spray',name:'噴瓶',category:'用品',description:'瓶身與扳機',icon:'◫'},
 {kind:'cytotoxic-waste-bag',name:'廢棄物袋',category:'用品',description:'自立袋與袋口',icon:'▢'},
 {kind:'scoop-and-scraper',name:'鏟與刮板',category:'用品',description:'保留兩件組的配置',icon:'⊔'},
 {kind:'work-table',name:'工作桌',category:'家具',description:'1.35 × 0.9 m 木色工作桌',icon:'⊓'},
 {kind:'supply-table',name:'備品桌',category:'家具',description:'1.5 × 1.65 m 寬桌面',icon:'⊓'},
 {kind:'chair',name:'椅子',category:'家具',description:'木色框架與鼠尾草綠坐墊',icon:'⑁'},
 {kind:'iv-stand',name:'點滴架',category:'家具',description:'底座、立柱與掛臂',icon:'┬'},
 {kind:'supply-cabinet',name:'備品櫃',category:'家具',description:'淺色櫃體與木色檯面',icon:'▥'},
 {kind:'exam-bed',name:'診療床',category:'家具',description:'床架、床墊與枕頭',icon:'▰'},
 {kind:'training-console',name:'啟動台',category:'家具',description:'對準按鈕按 F 開始五站任務與計時',icon:'▣'},
 {kind:'station-sign',name:'站點說明牌',category:'家具',description:'站點教學說明',icon:'⚑'},
 {kind:'megaphone',name:'大聲公',category:'用品',description:'手持擴音器；拿起後可抬到嘴邊播放示範廣播',icon:'◁',authored:true},
 {kind:'filled-waste-bag',name:'紅色醫療廢棄物袋',category:'用品',description:'裝滿示範醫療廢棄物的紅色袋子；投入黃色廢棄物桶完成第五站',icon:'▢',authored:true},
 ...notices.map(row=>({kind:row.kind,name:row.title,category:'家具' as const,description:row.body,icon:'▧',authored:true})),
];
export const catalogItem=(kind:string):CatalogItem=>{const item=CATALOG.find(c=>c.kind===kind);if(!item)throw new Error(`未知物件 ${kind}`);return item;};
