import {readFileSync,writeFileSync} from 'node:fs';
import {basename} from 'node:path';
let html=readFileSync('.build/app.html','utf8');
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,p)=>{
 let js=readFileSync('.build/assets/'+basename(p),'utf8');
 // Vite inlines both Havok's fallback URL and our supplied binary; share one literal.
 const blobs=[...new Set(js.match(/"data:application\/wasm;base64,[A-Za-z0-9+/=]+"/g)??[])];let prelude='';
 blobs.forEach((blob,i)=>{if(blob.length>100000){const name='__embeddedWasm'+i;js=js.split(blob).join(name);prelude+='const '+name+'='+blob+';';}});
 return '<script type="module">'+(prelude+js).replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,p)=>'<style>'+readFileSync('.build/assets/'+basename(p),'utf8')+'</style>');
if(Buffer.byteLength(html)>10000000)throw Error('HTML exceeds platform limit: '+Buffer.byteLength(html));
html=html.replace('</body>','<!-- Runtime licenses\n'+readFileSync('LICENSES/BabylonJS-Apache-2.0.txt','utf8')+'\n'+readFileSync('LICENSES/Havok-MIT.txt','utf8')+'\n--></body>');
writeFileSync('index.html',html);console.log('Single HTML:',Buffer.byteLength(html),'bytes');
