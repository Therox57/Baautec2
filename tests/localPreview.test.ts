import test from 'node:test';
import assert from 'node:assert/strict';
import {answerWithLocalPreview,isLocalPreviewConfigured} from '../server/localPreview.js';
import {HttpError} from '../server/security.js';
const messages=[{role:'user' as const,text:'TEC nədir?'}];
const names=['VERCEL_ENV','TECGPT_LOCAL_URL','TECGPT_LOCAL_BRIDGE_KEY'];
test('local 9B adapter is preview-only, sends credentials server-side, and fails closed',async()=>{
 const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{
  Object.assign(process.env,{VERCEL_ENV:'production',TECGPT_LOCAL_URL:'https://example.trycloudflare.com',TECGPT_LOCAL_BRIDGE_KEY:'test-only-secret'});
  assert.equal(isLocalPreviewConfigured(),false);
  await assert.rejects(()=>answerWithLocalPreview(messages),e=>e instanceof HttpError&&e.status===503);
  process.env.VERCEL_ENV='preview';assert.equal(isLocalPreviewConfigured(),true);
  const fake:typeof fetch=async(url,init)=>{assert.equal(String(url),'https://example.trycloudflare.com/api/chat');assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-only-secret');assert.equal(init?.redirect,'error');assert.deepEqual(JSON.parse(init?.body as string),{messages});return Response.json({reply:'TEC tələbələrin elmi fəaliyyətinə yönəlir.',model:'qwen3.5:9b-best',provider:'local-9b',needsReview:false,rejected:false});};
  const answer=await answerWithLocalPreview(messages,fake);assert.ok('provider' in answer);assert.equal(answer.provider,'local-9b');
  process.env.TECGPT_LOCAL_URL='https://example.com';let called=false;
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>{called=true;throw Error();}),e=>e instanceof HttpError&&e.status===503);assert.equal(called,false);
  process.env.TECGPT_LOCAL_URL='https://example.trycloudflare.com';
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>new Response(null,{status:429})),e=>e instanceof HttpError&&e.status===429);
  await assert.rejects(()=>answerWithLocalPreview(messages,async()=>Response.json({reply:'x',model:'groq'})),e=>e instanceof HttpError&&e.status===503);
 }finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n];}}
});
