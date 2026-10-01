import {polishAzerbaijani,keepRequestedLength} from './language.mjs';
import {IDENTITY,APPROVED_TEC_KNOWLEDGE} from './persona.mjs';
import {REVIEW_SCHEMA,reviewPolicy} from './reviewer.mjs';
import {understandRequest} from './understanding.mjs';
import {getChatKnowledge} from './knowledge/server/chatContext.js';
import {conversationPolicy,editorPolicy} from './conversation-policy.mjs';
import {answerConversationWithGroq} from './knowledge/server/groq.js';
export const UNKNOWN='Bu barədə məndə təsdiqlənmiş məlumat yoxdur, məlumatı uydurmaq istəmirəm. BAAU-nun rəsmi saytı: https://baau.edu.az. TEC-in yenilənən məlumatı üçün rəsmi səhifəyə bax: https://www.instagram.com/baau__tec/';
export const OFFTOPIC='Mən yalnız BAAU, TEC və universitetdəki tələbə həyatı haqqında kömək edə bilərəm. İstəsən, bu mövzulardan danışaq.';
const scopeValues=['baau_tec','smalltalk','out_of_scope','private_data'];
const schema={type:'object',properties:{intent:{type:'string'},constraints:{type:'array',items:{type:'string'},maxItems:4},scope:{type:'string',enum:scopeValues},has_verified_answer:{type:'boolean'},answer_kind:{type:'string',enum:['fact','advice','clarification','unknown','smalltalk','refusal']},source_ids:{type:'array',items:{type:'string'},maxItems:6},reply:{type:'string'}},required:['intent','constraints','scope','has_verified_answer','answer_kind','source_ids','reply'],additionalProperties:false};
export async function intelligentAnswer(messages,{model='qwen3.5:9b-best',review=false,diagnostics=false,signal}={}){
 messages=messages.slice(-12);while(messages.length>1&&messages.reduce((n,m)=>n+m.text.length,0)>6000)messages=messages.slice(1);
 const started=performance.now();let plan;try{plan=await understandRequest(messages,model,signal)}catch{return {reply:UNKNOWN,model,scope:'unknown',verified:false,kind:'unknown',sourceIds:[],guardAccepted:false,reviewed:false,seconds:Number(((performance.now()-started)/1000).toFixed(1)),tokensPerSecond:null};}
 if(['out_of_scope','private_data'].includes(plan.scope))return {reply:OFFTOPIC,model,scope:plan.scope,verified:false,kind:'refusal',sourceIds:[],guardAccepted:true,reviewed:false,seconds:Number(((performance.now()-started)/1000).toFixed(1)),tokensPerSecond:null};
 const knowledgeContext=(plan.scope==='smalltalk'||plan.type==='clarification')?'':getChatKnowledge([...messages.slice(0,-1),{role:'user',text:plan.intent},messages.at(-1)]);
 let result,decision,sourceIds=new Set(),didReview=false,qualityCheck=null,totalOutput=0,totalGeneration=0;
 const guarded=await answerConversationWithGroq(messages,{apiKey:'local-runtime-only',model,approvedKnowledge:(plan.scope==='smalltalk'||plan.type==='clarification')?'ASSISTANT METADATA\n'+IDENTITY:APPROVED_TEC_KNOWLEDGE,knowledgeContext,fetch:async(_url,request)=>{
  const payload=JSON.parse(request.body);
  const source=payload.messages[0].content.split('\nVERIFIED_KNOWLEDGE\n')[1]?.split('\nEND VERIFIED_KNOWLEDGE')[0];
  if(!source)throw Error('Verified source unavailable');
  const parts=source.split(/\n\n+/).filter(Boolean).map((text,i)=>({id:'S'+i,text}));
  sourceIds=new Set(parts.map(p=>p.id));
  payload.messages[0].content=conversationPolicy(parts)+'\nREQUEST UNDERSTANDING (task summary only, not factual evidence): ' + JSON.stringify(plan) + '\nPerform this task, checking the original user message if anything differs.';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000),body:JSON.stringify({model,think:false,stream:false,format:{...schema,properties:{...schema.properties,scope:{type:'string',enum:[plan.scope]},...(['smalltalk','clarification'].includes(plan.type)?{answer_kind:{type:'string',enum:[plan.type]},has_verified_answer:{type:'boolean',enum:[true]},reply:{type:'string',minLength:1,...(plan.type==='clarification'?{maxLength:180}:{})}}:{}),source_ids:{...schema.properties.source_ids,items:{type:'string',enum:[...sourceIds]}}}},keep_alive:'30m',options:{num_ctx:8192,num_gpu:99,num_predict:700,temperature:0.15},messages:payload.messages})});
  if(!response.ok)return response;
  result=await response.json();totalOutput+=result.eval_count||0;totalGeneration+=result.eval_duration||0;
  if(review){
   let draft;try{draft=JSON.parse(result.message.content)}catch{}
   if(draft&&scopeValues.includes(draft.scope)&&draft.scope!=='private_data'&&typeof draft.reply==='string'){
    try{
     const validation=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000),body:JSON.stringify({model,think:false,stream:false,format:REVIEW_SCHEMA,keep_alive:'30m',options:{num_ctx:8192,num_gpu:99,num_predict:360,temperature:0},messages:payload.messages.map((m,i)=>i===0?{...m,content:reviewPolicy(parts,draft)}:m)})});
     if(!validation.ok)throw Error('Review unavailable');
     const assessed=await validation.json();qualityCheck=JSON.parse(assessed.message.content);if(assessed.done_reason==='length'||typeof qualityCheck.valid!=='boolean'||!Array.isArray(qualityCheck.issues))throw Error('Invalid review');
     totalOutput+=assessed.eval_count||0;totalGeneration+=assessed.eval_duration||0;didReview=true;
     if(!qualityCheck.valid){
      const instructions=editorPolicy(messages.at(-1).text,draft)+'\nCORRECT THESE DEFECTS: '+JSON.stringify(qualityCheck.issues);
      const repaired=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000),body:JSON.stringify({model,think:false,stream:false,format:{...schema,properties:{...schema.properties,scope:{type:'string',enum:[plan.scope]},...(['smalltalk','clarification'].includes(plan.type)?{answer_kind:{type:'string',enum:[plan.type]},has_verified_answer:{type:'boolean',enum:[true]},reply:{type:'string',minLength:1,...(plan.type==='clarification'?{maxLength:180}:{})}}:{}),source_ids:{...schema.properties.source_ids,items:{type:'string',enum:[...sourceIds]}}}},keep_alive:'30m',options:{num_ctx:8192,num_gpu:99,num_predict:700,temperature:0.1},messages:payload.messages.map((m,i)=>i===0?{...m,content:m.content+'\n'+instructions}:m)})});
      if(!repaired.ok)throw Error('Repair unavailable');const checked=await repaired.json();JSON.parse(checked.message.content);if(checked.done_reason==='length')throw Error('Repair incomplete');result=checked;totalOutput+=checked.eval_count||0;totalGeneration+=checked.eval_duration||0;
     }
    }catch{qualityCheck={valid:false,issues:['Quality review incomplete or unavailable.']};result.message.content='{}';}
   }
  }
  try{decision=JSON.parse(result.message.content);if(!Array.isArray(decision.source_ids)||decision.source_ids.some(id=>!sourceIds.has(id)))throw Error('Invalid source');if(decision.answer_kind==='refusal'){decision.scope=decision.scope==='private_data'?'private_data':'out_of_scope';decision.has_verified_answer=false;decision.reply='';}if(decision.answer_kind==='smalltalk')decision.scope='smalltalk';if(decision.scope==='baau_tec'&&decision.answer_kind==='clarification'&&decision.reply.trim())decision.has_verified_answer=true;if(decision.scope==='baau_tec'&&decision.answer_kind==='fact'&&decision.has_verified_answer&&!decision.source_ids.length){decision.has_verified_answer=false;decision.reply='';}if(decision.scope==='baau_tec'&&(decision.answer_kind==='unknown'||/(?:məlumat.{0,50}(?:yoxdur|mövcud deyil)|təsdiq edə bilmir|yoxlaya bilmir)/iu.test(decision.reply))){decision.has_verified_answer=false;decision.answer_kind='unknown';decision.reply='';}result.message.content=JSON.stringify(decision);}catch{decision=null;result.message.content='{}';}
  return Response.json({choices:[{finish_reason:result.done_reason==='length'?'length':'stop',message:{content:result.message.content}}],usage:{prompt_tokens:result.prompt_eval_count}});
 }});
 const usedVerifiedFallback=decision?.scope==='baau_tec'&&!decision.has_verified_answer&&!!guarded?.reply&&guarded.needsReview!==true&&!guarded.rejected;
 let reply=guarded?.reply||UNKNOWN;
 if(['out_of_scope','private_data'].includes(decision?.scope))reply=OFFTOPIC;
 if(decision?.answer_kind==='advice')reply=reply.replace(/[^.!?]*(?:dərslərin|təhsilin)[^.!?]*(?:mane olmayacaq[^.!?]*vaxt tələb edir|mane olmur|mane olmayacaqdır|zidd gəlmir)[^.!?]*[.!?]?/giu,' Dərslərinə mane olmayacaq qədər vaxt ayırmağa çalış.');
 reply=keepRequestedLength(polishAzerbaijani(reply),messages.at(-1).text,decision?.answer_kind);
 reply=reply.replace(/\s*[[(]S\d+(?:\s*[,;]\s*S\d+)*[\])]/g,'');
 reply=reply.replace(/\[\*\*(.*?)\*\*\]\((.*?)\)/g,(_match,_label,url)=>url);
 return {reply,model,...(diagnostics?{diagnostics:{plan,qualityCheck,decision}}:{}),scope:decision?.scope??'unknown',verified:usedVerifiedFallback||(decision?.has_verified_answer??false),kind:usedVerifiedFallback?'fact':(decision?.answer_kind??'unknown'),usedVerifiedFallback,sourceIds:decision?.source_ids??[],guardAccepted:!!guarded,reviewed:didReview,seconds:Number(((performance.now()-started)/1000).toFixed(1)),tokensPerSecond:totalGeneration?Number((totalOutput/(totalGeneration/1e9)).toFixed(1)):null};
}

