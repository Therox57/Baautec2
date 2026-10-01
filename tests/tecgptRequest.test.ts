import test from 'node:test';
import assert from 'node:assert/strict';
import {requestChat} from '../src/tecgptRequest.js';
const messages=[{role:'user' as const,text:'Salam'}];const id='a'.repeat(64);
test('client follows queued/running job without repeating original generation',async()=>{
 const bodies:any[]=[],progress:string[]=[];let n=0;
 const fake:typeof fetch=async(_url,init)=>{bodies.push({body:JSON.parse(String(init?.body)),headers:init?.headers});return ++n<3?Response.json({pending:true,jobId:id,state:n===1?'queued':'running',position:1},{status:202}):Response.json({reply:'Salam!'});};
 assert.equal((await requestChat('/api/tecgpt-guest',messages,{},text=>progress.push(text),fake,async()=>{})).reply,'Salam!');
 assert.equal(bodies[0].body.localJobId,undefined);assert.equal(bodies[1].body.localJobId,id);assert.equal(bodies[2].body.localJobId,id);
 assert.deepEqual(bodies[1].body.messages,messages);assert.equal(bodies[0].headers['x-tecgpt-request-id'],bodies[2].headers['x-tecgpt-request-id']);
 assert.match(progress[0],/Növbədəsən/);assert.equal(progress[1],'Cavab hazırlanır...');
});
test('client retries transport interruption with the same idempotency key',async()=>{
 const keys:string[]=[];let calls=0;const fake:typeof fetch=async(_url,init)=>{keys.push((init?.headers as Record<string,string>)['x-tecgpt-request-id']);if(++calls===1)throw Error('network');return Response.json({reply:'Cavab'});};
 await requestChat('/api/tecgpt',messages,{Authorization:'Bearer session'},()=>{},fake,async()=>{});assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
});
test('client fails visibly for empty, malformed, full queue and cancelled request',async()=>{
 for(const response of [Response.json({reply:''}),new Response('not JSON'),Response.json({pending:true,jobId:'bad',state:'running'},{status:202}),Response.json({error:'Növbə doludur.'},{status:429})])await assert.rejects(()=>requestChat('/api/tecgpt-guest',messages,{},()=>{},async()=>response,async()=>{}));
 const c=new AbortController();c.abort();let called=false;await assert.rejects(()=>requestChat('/api/tecgpt-guest',messages,{},()=>{},async()=>{called=true;return Response.json({reply:'x'})},async()=>{},c.signal));assert.equal(called,false);
});
test('cancelling a live client request aborts transport without creating retries',async()=>{
 const controller=new AbortController();let calls=0;
 const fake:typeof fetch=async(_url,init)=>{calls++;setTimeout(()=>controller.abort(),2);return new Promise((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('cancel','AbortError')),{once:true}));};
 await assert.rejects(()=>requestChat('/api/tecgpt-guest',messages,{},()=>{},fake,async()=>{},controller.signal));assert.equal(calls,1);
});
