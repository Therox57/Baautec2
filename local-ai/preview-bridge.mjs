import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {intelligentAnswer} from './intelligence.mjs';
const file=new URL('preview-secret.json',import.meta.url);
let secret;try{secret=JSON.parse(await readFile(file,'utf8')).secret}catch{secret=randomBytes(32).toString('hex');await writeFile(file,JSON.stringify({secret}));}
let busy=false;const windows=new Map();
function equal(value){const a=Buffer.from(value||''),b=Buffer.from('Bearer '+secret);return a.length===b.length&&timingSafeEqual(a,b);}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.url==='/setup'&&req.method==='GET'&&['127.0.0.1:4178','localhost:4178'].includes(req.headers.host)&&!req.headers['cf-connecting-ip']){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; form-action 'none'");return res.end('<h1>TECGPT preview bağlantı ayarı</h1><label for="key">Yalnız Vercel serverinə əlavə ediləcək bağlantı açarı</label><input id="key" type="password" readonly value="'+secret+'">');
 }
 if(!equal(req.headers.authorization)){res.statusCode=401;return res.end();}
 if(req.method!=='POST'||req.url!=='/api/chat'){res.statusCode=404;return res.end();}
 if(req.headers.origin){res.statusCode=403;return res.end();}
 if(!req.headers['content-type']?.startsWith('application/json')){res.statusCode=415;return res.end();}
 if(busy){res.statusCode=429;res.setHeader('Retry-After','15');return res.end();}
 let body='',owned=false;
 try{
  for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>64000){res.statusCode=413;return res.end();}}
  const {messages}=JSON.parse(body);
  if(!Array.isArray(messages)||!messages.length||messages.length>12||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>4000)||messages.at(-1).role!=='user'||messages.reduce((n,m)=>n+m.text.length,0)>12000){res.statusCode=400;return res.end();}
  if(busy){res.statusCode=429;return res.end();}
  const now=Date.now();for(const [k,v] of windows)if(now-v.start>60000)windows.delete(k);
  const quota=windows.get('all')||{start:now,count:0};if(quota.count>=6){res.statusCode=429;return res.end();}quota.count++;windows.set('all',quota);
  owned=busy=true;
  const r=await intelligentAnswer(messages,{review:true});if(!r.guardAccepted){res.statusCode=503;return res.end();}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({reply:r.reply,model:r.model,provider:'local-9b',rejected:['out_of_scope','private_data'].includes(r.scope),needsReview:r.kind==='unknown',reviewed:r.reviewed,seconds:r.seconds}));
 }catch{res.statusCode=503;res.end();}finally{if(owned)busy=false;}
});server.requestTimeout=15000;server.headersTimeout=10000;server.listen(4178,'127.0.0.1',()=>console.log('Protected TECGPT preview bridge ready on localhost:4178'));
