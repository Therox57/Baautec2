import test from 'node:test';
import assert from 'node:assert/strict';
import {createJobQueue} from '../job-queue.mjs';
const messages=[{role:'user',text:'Salam'}];
const answer={guardAccepted:true,reply:'Salam!',model:'qwen3.5:9b-best',scope:'smalltalk',kind:'smalltalk'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const options={log:()=>{},leaseMs:1000};
test('simultaneous requests are FIFO with one generation; polls and duplicates do not consume quota',async()=>{
 let active=0,max=0,calls=0;const starts=[];let release;
 const gate=new Promise(r=>release=r);
 const queue=createJobQueue(async(m)=>{calls++;starts.push(m[0].text);max=Math.max(max,++active);if(calls===1)await gate;active--;return answer;},{...options,quota:2});
 try{
  const a=queue.request(messages,{requestId:'a'});const bMessages=[{role:'user',text:'TEC nədir?'}];const b=queue.request(bMessages,{requestId:'b'});
  assert.equal(a.status,202);assert.equal(a.body.state,'running');assert.equal(b.body.state,'queued');assert.equal(b.body.position,1);
  for(let i=0;i<12;i++)assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,202);
  assert.equal(queue.request(messages,{requestId:'a'}).body.jobId,a.body.jobId);
  assert.equal(queue.request(bMessages,{requestId:'a'}).status,409);
  assert.equal(queue.request(messages,{requestId:'c'}).body.reason,'quota');
  release();await delay(10);
  assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,200);
  assert.equal(queue.request(bMessages,{jobId:b.body.jobId}).status,200);
  assert.equal(calls,2);assert.equal(max,1);assert.deepEqual(starts,['Salam','TEC nədir?']);
 }finally{release();queue.close();}
});
test('job capability is unguessable and bound to its original messages',async()=>{
 const queue=createJobQueue(async()=>answer,options);
 try{const a=queue.request(messages);assert.match(a.body.jobId,/^[a-f0-9]{64}$/);assert.equal(queue.request([{role:'user',text:'other'}],{jobId:a.body.jobId}).status,404);assert.equal(queue.request(messages,{jobId:'0'.repeat(64)}).status,404);}finally{queue.close();}
});
test('bounded queue distinguishes capacity rejection from quota',async()=>{
 const queue=createJobQueue(async(_m,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort')),{once:true})),{...options,capacity:2});
 try{queue.request(messages);queue.request(messages);const r=queue.request(messages);assert.equal(r.status,429);assert.equal(r.body.reason,'queue_full');assert.equal(r.body.retryAfter,15);}finally{queue.close();}
});
test('failed or guard-rejected generation releases the next job',async()=>{
 let calls=0;const queue=createJobQueue(async()=>{if(++calls===1)throw Error('provider');if(calls===2)return {...answer,guardAccepted:false};return answer;},options);
 try{const a=queue.request(messages),b=queue.request(messages),c=queue.request(messages);await delay(15);assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,503);assert.equal(queue.request(messages,{jobId:b.body.jobId}).status,503);assert.equal(queue.request(messages,{jobId:c.body.jobId}).status,200);}finally{queue.close();}
});
test('generation deadline cancels in-flight work and drains next request',async()=>{
 let calls=0,aborted=false;
 const queue=createJobQueue(async(_m,{signal})=>{if(++calls>1)return answer;return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'))},{once:true}));},{...options,runMs:15});
 try{const a=queue.request(messages),b=queue.request(messages);await delay(35);assert.equal(aborted,true);assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,503);assert.equal(queue.request(messages,{jobId:b.body.jobId}).status,200);}finally{queue.close();}
});
test('abandoned browser job is cancelled rather than leaving model busy',async()=>{
 let aborted=false;
 const queue=createJobQueue(async(_m,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'))},{once:true})),{...options,leaseMs:15});
 try{const a=queue.request(messages);await delay(40);assert.equal(aborted,true);assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,503);}finally{queue.close();}
});
test('completed result retention expires; private message bodies are not logged',async()=>{
 const logs=[];const queue=createJobQueue(async()=>answer,{...options,ttlMs:10,log:(...args)=>logs.push(args)});
 try{const a=queue.request(messages);await delay(25);assert.equal(queue.request(messages,{jobId:a.body.jobId}).status,404);assert.ok(!JSON.stringify(logs).includes('Salam'));}finally{queue.close();}
});
