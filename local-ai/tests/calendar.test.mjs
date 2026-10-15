import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationPolicy} from '../conversation-policy.mjs';
import {reviewPolicy} from '../reviewer.mjs';
import {understandRequest} from '../understanding.mjs';

test('generation, review and request planning share the actual Baku calendar', async () => {
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const source=[{id:'S0',text:'2026-10-21 — Martin İden'}];
 assert.ok(conversationPolicy(source).includes('Current Baku date: '+date));
 assert.ok(reviewPolicy(source,{}).includes('Current Baku date: '+date));
 const original=globalThis.fetch;
 globalThis.fetch=async (_,init)=>{
  assert.ok(JSON.parse(init.body).messages[0].content.includes('Current Baku date: '+date));
  return Response.json({done_reason:'stop',message:{content:JSON.stringify({context_needed:false,scope:'baau_tec',intent:'Tədbir tarixi',type:'fact',constraints:[],excluded_source_topics:[]})}});
 };
 try {await understandRequest([{role:'user',text:'Sabah tədbir varmı?'}],'test');}finally{globalThis.fetch=original;}
});
