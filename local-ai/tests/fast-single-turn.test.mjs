import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligentAnswer,PRIVATE,OFFTOPIC,UNKNOWN} from '../intelligence.mjs';

async function run(decision,{review=true,failReview=false}={}) {
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_,init)=>{
  calls++;const body=JSON.parse(init.body);
  assert.ok(!body.messages[0].content.startsWith('Interpret the latest'));
  if(calls===1){
   assert.deepEqual(body.format.properties.scope.enum,['baau_tec','smalltalk','out_of_scope','private_data']);
   return Response.json({done_reason:'stop',message:{content:JSON.stringify({intent:'test',constraints:[],...decision})}});
  }
  if(failReview)return new Response('',{status:503});
  return Response.json({done_reason:'stop',message:{content:JSON.stringify({valid:true,issues:[]})}});
 };
 try{return {result:await intelligentAnswer([{role:'user',text:'TEC otağı haradadır?'}],{review,fastSingleTurn:true}),calls};}finally{globalThis.fetch=original;}
}

test('single-turn optimization keeps source IDs and the independent fact review',async()=>{
 const {result,calls}=await run({scope:'baau_tec',answer_kind:'fact',has_verified_answer:true,source_ids:['S0'],reply:'TEC otağı B korpusu, 2-ci mərtəbə, 205-ci otaqdadır.'});
 assert.equal(calls,2);assert.equal(result.guardAccepted,true);assert.match(result.reply,/205/);assert.equal(result.reviewed,true);
});
test('single-turn optimization does not pin unrelated or private questions into university scope',async()=>{
 for(const scope of ['out_of_scope','private_data']){
  const {result,calls}=await run({scope,answer_kind:'refusal',has_verified_answer:false,source_ids:[],reply:''});
  assert.equal(calls,1);assert.equal(result.kind,'refusal');assert.equal(result.scope,scope);
  assert.equal(result.reply,scope==='private_data'?PRIVATE:OFFTOPIC);
 }
});
test('unknown facts stay unknown without spending a second inference on an empty answer',async()=>{
 const {result,calls}=await run({scope:'baau_tec',answer_kind:'unknown',has_verified_answer:false,source_ids:[],reply:''});
 assert.equal(calls,1);assert.equal(result.reply,UNKNOWN);assert.equal(result.verified,false);
});
test('fact-review failure fails closed and cannot return an unchecked draft',async()=>{
 const {result}=await run({scope:'baau_tec',answer_kind:'fact',has_verified_answer:true,source_ids:['S0'],reply:'TEC otağı 999-dur.'},{failReview:true});
 assert.equal(result.guardAccepted,false);assert.equal(result.reply,UNKNOWN);
});
test('missing source IDs do not become verified facts on the optimized path',async()=>{
 const {result}=await run({scope:'baau_tec',answer_kind:'fact',has_verified_answer:true,source_ids:[],reply:'TEC otağı 999-dur.'});
 assert.equal(result.verified,false);assert.equal(result.kind,'unknown');assert.equal(result.reply,UNKNOWN);
});


test('a refusal draft is normalized to rejection without an unnecessary factual review',async()=>{
 const {result,calls}=await run({scope:'baau_tec',answer_kind:'refusal',has_verified_answer:false,source_ids:[],reply:'Do not expose this draft.'});
 assert.equal(calls,1);assert.equal(result.kind,'refusal');assert.equal(result.scope,'out_of_scope');assert.equal(result.reply,OFFTOPIC);
});


test('a bare third-person reference still gets clarification instead of the optimized greeting path',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_,init)=>{
  calls++;assert.ok(JSON.parse(init.body).messages[0].content.startsWith('Interpret the latest'));
  return Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:true,scope:'baau_tec',type:'clarification',intent:'Referent yoxdur',constraints:[],excluded_source_topics:[]})}});
 };
 try{
  const result=await intelligentAnswer([{role:'user',text:'O necədi?'}],{review:true,fastSingleTurn:true});
  assert.equal(calls,0);assert.equal(result.kind,'clarification');assert.match(result.reply,/nəzərdə tutursan/);assert.doesNotMatch(result.reply,/Salam/);
 }finally{globalThis.fetch=original;}
});


test('local replies preserve the supplied club leader surname like the cloud path',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({done_reason:'stop',message:{content:JSON.stringify({intent:'rəhbərlik',constraints:[],scope:'baau_tec',has_verified_answer:true,answer_kind:'fact',source_ids:['S0'],reply:'Yazıçılar klubunun sədri Məryəm Əliyevdir.'})}});
 try{
  const result=await intelligentAnswer([{role:'user',text:'TEC klub rəhbərləri kimdir?'}],{fastSingleTurn:true});
  assert.equal(result.guardAccepted,true);assert.match(result.reply,/Məryəm Əliyevadır/);
 }finally{globalThis.fetch=original;}
});


test('independent review reuses the generation prefix and retains its evidence and original user request',async()=>{
 const original=globalThis.fetch;const requests=[];
 globalThis.fetch=async(_,init)=>{
  const body=JSON.parse(init.body);requests.push(body);
  return Response.json({done_reason:'stop',message:{content:JSON.stringify(requests.length===1?{intent:'TEC yeri',constraints:[],scope:'baau_tec',answer_kind:'fact',has_verified_answer:true,source_ids:['S0'],reply:'TEC B korpusu, 2-ci mərtəbə, 205-ci otaqdadır.'}:{valid:true,issues:[]})}});
 };
 try{
  const result=await intelligentAnswer([{role:'user',text:'TEC-in otağı haradadır?'}],{review:true,fastSingleTurn:true});
  assert.equal(requests.length,2);assert.equal(result.reviewed,true);assert.equal(result.guardAccepted,true);
  const generated=requests[0],reviewed=requests[1];
  assert.ok(reviewed.messages[0].content.startsWith(generated.messages[0].content));
  assert.equal((reviewed.messages[0].content.match(/END VERIFIED_SOURCES/g)||[]).length,1);
  assert.match(reviewed.messages[0].content,/UNTRUSTED DRAFT/);
  assert.deepEqual(reviewed.messages.slice(1),generated.messages.slice(1));
  assert.deepEqual(reviewed.format.required,['valid','issues']);
 }finally{globalThis.fetch=original;}
});
