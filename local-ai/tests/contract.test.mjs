import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligentAnswer,UNKNOWN,OFFTOPIC} from '../intelligence.mjs';
async function withDecision(decision,check){const original=globalThis.fetch;globalThis.fetch=async(_url,request)=>{const input=JSON.parse(request.body);if(input.messages[0].content.startsWith('Interpret the latest'))return Response.json({message:{content:JSON.stringify({context_needed:decision.answer_kind==='clarification',scope:decision.answer_kind==='smalltalk'?'smalltalk':decision.scope,intent:'test task',type:decision.answer_kind==='unknown'?'fact':decision.answer_kind})},done_reason:'stop'});return Response.json({message:{content:JSON.stringify({intent:'test task',constraints:[],source_ids:[],...decision})},done_reason:'stop'});};try{await check(await intelligentAnswer([{role:'user',text:'Əvvəl yazdığımı nəzərdə tuturam.'}]))}finally{globalThis.fetch=original}}
test('a clarification is a question, not an unknown institutional-fact fallback',async()=>{
 await withDecision({scope:'baau_tec',has_verified_answer:false,answer_kind:'clarification',reply:'Hansı mövzunu nəzərdə tutursan?'},r=>{assert.equal(r.reply,'Hansı mövzunu nəzərdə tutursan?');assert.equal(r.guardAccepted,true);assert.equal(r.kind,'clarification')});
});
test('assistant identity metadata does not require a university-fact source',async()=>{
 await withDecision({scope:'baau_tec',has_verified_answer:false,answer_kind:'smalltalk',reply:'Mən TECGPT-yəm, süni intellekt köməkçisiyəm.'},r=>{assert.equal(r.scope,'smalltalk');assert.equal(r.guardAccepted,true);assert.notEqual(r.reply,UNKNOWN)});
});
test('missing institutional facts still use the required official-source fallback',async()=>{
 await withDecision({scope:'baau_tec',has_verified_answer:false,answer_kind:'unknown',reply:''},r=>{assert.equal(r.reply,UNKNOWN);assert.equal(r.kind,'unknown')});
});
test('a supposed fact without supporting source IDs cannot become a verified answer',async()=>{
 await withDecision({scope:'baau_tec',has_verified_answer:true,answer_kind:'fact',reply:'TEC ofisinin otağı 999-dur.'},r=>{assert.equal(r.reply,UNKNOWN);assert.equal(r.verified,false)});
});

test('a refusal cannot be rendered as missing university knowledge',async()=>{
 await withDecision({scope:'baau_tec',has_verified_answer:false,answer_kind:'refusal',reply:''},r=>{assert.equal(r.reply,OFFTOPIC);assert.equal(r.kind,'refusal')});
});
