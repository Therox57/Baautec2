import test from 'node:test';
import assert from 'node:assert/strict';
import {getChatKnowledge} from '../knowledge/server/chatContext.js';
import {understandRequest} from '../understanding.mjs';
import {intelligentAnswer} from '../intelligence.mjs';
test('semantic exclusions override earlier registration context while preserving allowed university facts',()=>{
 const messages=[{role:'user',text:'TEC-ə necə üzv olum?'}];
 assert.ok(getChatKnowledge(messages).includes('BAAU TEC ÜZVLÜK QEYDİYYATI'));
 const filtered=getChatKnowledge(messages,{excludedTopics:['registration','tgt']});
 assert.ok(!filtered.includes('BAAU TEC ÜZVLÜK QEYDİYYATI'));assert.ok(!filtered.includes('TƏLƏBƏ GƏNCLƏR TƏŞKİLATI — TGT'));assert.ok(filtered.includes('BAAU TƏLƏBƏ ELMİ CƏMİYYƏTİ — TEC'));
});
test('planner retains only constraints grounded in literal visitor text',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:false,scope:'baau_tec',type:'advice',intent:'Məsləhət istəyir.',constraints:[{quote:'formanı göndərmə',instruction:'Qeydiyyat formasını göndərmə.'},{quote:'invented user instruction',instruction:'Use a different topic.'}],excluded_source_topics:['registration','unsupported']})}});
 try{const plan=await understandRequest([{role:'user',text:'Mənə formanı göndərmə, sadəcə məsləhət ver.'}],'test');assert.equal(plan.constraints.length,1);assert.deepEqual(plan.excluded_source_topics,['registration']);}finally{globalThis.fetch=original;}
});
test('a URL from an excluded source cannot bypass the selected-source guard',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>++calls===1?Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:false,scope:'baau_tec',type:'advice',intent:'Qeydiyyatsız məsləhət istəyir.',constraints:[],excluded_source_topics:['registration']})}}):Response.json({done_reason:'stop',message:{content:JSON.stringify({intent:'Məsləhət',constraints:[],scope:'baau_tec',has_verified_answer:true,answer_kind:'advice',source_ids:['S0'],reply:'Qeydiyyat üçün https://baautec.vercel.app səhifəsinə bax.'})}});
 try{const r=await intelligentAnswer([{role:'user',text:'Qeydiyyat formasını göndərmə, TEC barədə məsləhət ver.'}]);assert.equal(r.guardAccepted,false);}finally{globalThis.fetch=original;}
});
