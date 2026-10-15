import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligentAnswer,violatesExcludedTopics,removeExcludedContent} from '../intelligence.mjs';

test('excluded topics are enforced on the final response, not merely hidden from retrieval',()=>{
 assert.equal(violatesExcludedTopics('Qeydiyyatdan keçməlisiniz.',['registration']),true);
 assert.equal(violatesExcludedTopics('Instagram bio-sundakı linkdən keç.',['registration']),true);
 assert.equal(violatesExcludedTopics('Elmi tədqiqat və təqdimat bacarıqları öyrənə bilərsən.',['registration']),false);
 assert.equal(violatesExcludedTopics('TGT-yə də bax.',['tgt']),true);
});
test('excluded earlier chat is removed, and an uncorrected forbidden reply cannot pass the guard',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_,init)=>{
  calls++;const input=JSON.parse(init.body);
  if(calls===1)return Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:false,scope:'baau_tec',type:'advice',intent:'TEC-də inkişaf barədə məsləhət',constraints:[{quote:'Qeydiyyatı izah etmə',instruction:'Qeydiyyat təlimatı vermə'}],excluded_source_topics:['registration']})}});
  assert.equal(input.messages.length,2);
  assert.ok(!input.messages.some(message=>message.content==='Əvvəlki qeydiyyat təlimatı'));
  if(calls===3)return Response.json({done_reason:'stop',message:{content:JSON.stringify({valid:true,issues:[]})}});
  return Response.json({done_reason:'stop',message:{content:JSON.stringify({intent:'məsləhət',constraints:[],scope:'baau_tec',has_verified_answer:true,answer_kind:'advice',source_ids:['S0'],reply:'Qeydiyyatdan keçməlisiniz.'})}});
 };
 try {
  const result=await intelligentAnswer([{role:'user',text:'TEC-ə necə qoşulum?'},{role:'assistant',text:'Əvvəlki qeydiyyat təlimatı'},{role:'user',text:'Qeydiyyatı izah etmə. TEC-də nə öyrənə bilərəm?'}],{review:true,fastSingleTurn:true});
  assert.equal(calls,4);assert.equal(result.guardAccepted,false);
 }finally{globalThis.fetch=original;}
});


test('literal negative instructions override a planner summary that inverted their meaning',async()=>{
 const {understandRequest}=await import('../understanding.mjs');
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:false,scope:'baau_tec',type:'advice',intent:'İstifadəçi qeydiyyat izahı istəyir.',constraints:[{quote:'Qeydiyyatı izah etmə',instruction:'Qeydiyyatı izah etmə'}],excluded_source_topics:[]})}});
 const text='Qeydiyyatı izah etmə və link atma. Sadəcə TEC-də nələr öyrənə bilərəm de.';
 try{const plan=await understandRequest([{role:'user',text}],'test');assert.ok(plan.excluded_source_topics.includes('registration'));assert.equal(plan.intent,text);}finally{globalThis.fetch=original;}
});


test('excluded sentences can be removed without replacing the requested useful answer',()=>{
 const reply='Qeydiyyatdan keç. Tədqiqat bacarıqlarını inkişaf etdirə bilərsən. Rəsmi səhifə: https://example.com';
 const filtered=removeExcludedContent(reply,['registration'],'Qeydiyyatı izah etmə və link atma.');
 assert.match(filtered,/Tədqiqat bacarıqlarını inkişaf etdirə bilərsən/);
 assert.doesNotMatch(filtered,/qeydiyyat|https?:/iu);
 assert.equal(removeExcludedContent('Qeydiyyatdan keç.',['registration']), '');
});
