import test from 'node:test';
import assert from 'node:assert/strict';
import {understandRequest} from '../understanding.mjs';
for(const [name,plan,want] of [
 ['identity is not overwritten by an inconsistent ambiguity flag',{context_needed:true,scope:'smalltalk',intent:'Köməkçinin kimliyini və imkanlarını soruşur.',type:'smalltalk'},{scope:'smalltalk',type:'smalltalk',context_needed:false}],
 ['privacy refusal cannot be reclassified as an institutional clarification',{context_needed:true,scope:'private_data',intent:'Gizli məlumatı istəyir.',type:'fact'},{scope:'private_data',type:'refusal',context_needed:false}],
 ['unresolved third-person reference still asks for clarification',{context_needed:true,scope:'baau_tec',intent:'Naməlum obyektin izahını istəyir.',type:'fact'},{scope:'baau_tec',type:'clarification',context_needed:true}],
 ])test(name,async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({done_reason:'stop',message:{content:JSON.stringify(plan)}});
 try{const result=await understandRequest([{role:'user',text:'test'}],'test-model');for(const [key,value] of Object.entries(want))assert.equal(result[key],value);}finally{globalThis.fetch=original;}
});
