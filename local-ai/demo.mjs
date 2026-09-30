import {intelligentAnswer} from './intelligence.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
export async function answerFast(messages){
 return intelligentAnswer(messages,{model:'qwen3.5:9b-best',review:false});
}
export async function answer(messages,mode='quality'){
 if(mode==='fast')return answerFast(messages);
 return intelligentAnswer(messages,{model:'qwen3.5:9b-best',review:true});
}
if(process.argv[1]?.endsWith('demo.mjs')){
 let busy=false;
 const html=await readFile(new URL('./index.html',import.meta.url));
 http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['127.0.0.1:4177','localhost:4177'].includes(req.headers.host)){res.statusCode=403;return res.end();}
  if(req.method==='GET'&&req.url==='/api/status'){res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({model:'qwen3.5:9b-best',local:true,modes:['quality','fast'],defaultMode:'quality'}));}
  if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
  if(req.method!=='POST'||req.url!=='/api/chat'){res.statusCode=404;return res.end();}
  if(req.headers.origin&&!['http://127.0.0.1:4177','http://localhost:4177'].includes(req.headers.origin)){res.statusCode=403;return res.end();}
  if(!req.headers['content-type']?.startsWith('application/json')){res.statusCode=415;return res.end();}
  if(busy){res.statusCode=409;return res.end(JSON.stringify({error:'Model hazırda cavab yazır. Bir az gözlə.'}));}
  let body='',owned=false;
  try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32000){res.statusCode=413;return res.end();}}
   const {messages,mode='quality'}=JSON.parse(body);
   if(!['quality','fast'].includes(mode)){res.statusCode=400;return res.end();}
   if(!Array.isArray(messages)||messages.length<1||messages.length>12||messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>2000)||messages.at(-1).role!=='user'){res.statusCode=400;return res.end();}
   if(busy){res.statusCode=409;return res.end(JSON.stringify({error:'Model hazırda cavab yazır.'}));}
   owned=busy=true;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(await answer(messages,mode)));
  }catch(error){res.statusCode=503;res.end(JSON.stringify({error:error.message}));}finally{if(owned)busy=false;}
 }).listen(4177,'127.0.0.1',()=>console.log('TECGPT yerli sınaq: http://127.0.0.1:4177'));
}




