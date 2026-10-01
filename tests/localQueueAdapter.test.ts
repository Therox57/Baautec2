import test from 'node:test';
import assert from 'node:assert/strict';
import {answerWithLocalPreview,localJobId,localRequestKey} from '../server/localPreview.js';
import {HttpError} from '../server/security.js';
const messages=[{role:'user' as const,text:'Salam'}];
test('local adapter passes through valid job state and rejects malformed queue metadata',async()=>{
 const names=['VERCEL_ENV','TECGPT_LOCAL_URL','TECGPT_LOCAL_BRIDGE_KEY'];const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 Object.assign(process.env,{VERCEL_ENV:'preview',TECGPT_LOCAL_URL:'https://example.trycloudflare.com',TECGPT_LOCAL_BRIDGE_KEY:'test-secret'});
 try{
  const id='b'.repeat(64);
  const fake:typeof fetch=async(_url,init)=>{assert.deepEqual(JSON.parse(String(init?.body)),{messages,jobId:id});return Response.json({pending:true,jobId:id,state:'queued',position:2},{status:202});};
  const queued=await answerWithLocalPreview(messages,fake,id);assert.ok('pending' in queued);assert.equal(queued.position,2);
  for(const data of [{pending:true,jobId:'bad',state:'queued',position:1},{pending:true,jobId:id,state:'done',position:1},{pending:true,jobId:id,state:'queued',position:99}])await assert.rejects(()=>answerWithLocalPreview(messages,async()=>Response.json(data,{status:202})),e=>e instanceof HttpError&&e.status===503);
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>new Response('bad-json')),e=>e instanceof HttpError&&e.status===503);
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>new Response('',{status:404})),e=>e instanceof HttpError&&e.status===404);
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>Response.json({reason:'quota'},{status:429,headers:{'Retry-After':'30'}})),e=>e instanceof HttpError&&e.status===429&&e.retryAfter===30&&e.message.includes('limit'));
 }finally{for(const n of names)if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n];}
});
test('poll capability and retry key input are validated; keys are scoped by owner',()=>{
 const id='c'.repeat(64);assert.equal(localJobId({body:{localJobId:id}}),id);assert.equal(localJobId({body:JSON.stringify({localJobId:id})}),id);
 for(const id of ['bad',[],null])assert.throws(()=>localJobId({body:{localJobId:id}}),HttpError);
 const req={headers:{'x-tecgpt-request-id':'12345678-1234-1234-1234-123456789abc'}};
 assert.equal(localRequestKey(req,'guest:a'),localRequestKey(req,'guest:a'));assert.notEqual(localRequestKey(req,'guest:a'),localRequestKey(req,'guest:b'));
 assert.throws(()=>localRequestKey({headers:{'x-tecgpt-request-id':['bad']}},'guest:a'),HttpError);
});
