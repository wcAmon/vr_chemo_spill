import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NullEngine,Scene,HavokPlugin,Vector3} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {ParkourController} from '../src/runtime/controller';
const wasm=readFileSync('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm');
const results:number[]=[];
for(const fps of [30,60,120]){
 const engine=new NullEngine(),scene=new Scene(engine);scene.enablePhysics(new Vector3(0,0,0),new HavokPlugin(false,await HavokPhysics({wasmBinary:wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)})));scene.getPhysicsEngine()!.setSubTimeStep(1000/60);
 const player=new ParkourController(scene,Vector3.Zero());let ticks=0;
 scene.onBeforePhysicsObservable.add(()=>{ticks++;player.setInput({x:1,z:0,run:false,jump:false});player.tick(1/60);});
 for(let n=0;n<fps*2;n++)scene._advancePhysicsEngineStep(1000/fps);
 assert(ticks>=119&&ticks<=120);results.push(player.feet.x);player.dispose();scene.dispose();engine.dispose();
}
assert(Math.max(...results)-Math.min(...results)<.06,JSON.stringify(results));console.log('PASS 30/60/120 Hz two-second movement matches:',results);
