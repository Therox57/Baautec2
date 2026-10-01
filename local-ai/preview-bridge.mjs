import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {intelligentAnswer} from './intelligence.mjs';
import {createJobQueue} from './job-queue.mjs';
const file=new URL('preview-secret.json',import.meta.url);
let secret;try{secret=JSON.parse(await readFile(file,'utf8')).secret}catch{secret=randomBytes(32).toString('hex');await writeFile(file,JSON.stringify({secret}));}
const queue=createJobQueue(intelligentAnswer);
function equal(value){const a=Buffer.from(value||''),b=Buffer.from('Bearer '+secret);return a.length===b.length&&timingSafeEqual(a,b);}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.url==='/setup'&&req.method==='GET'&&['127.0.0.1:4178','localhost:4178'].includes(req.headers.host)&&!req.headers['cf-connecting-ip']){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; form-action 'none'");return res.end('<h1>TECGPT preview bağlantı ayarı</h1><label for="key">Yalnız Vercel serverinə əlavə ediləcək bağlantı açarı</label><input id="key" type="password" readonly value="'+secret+'">');
 }
 if(!equal(req.headers.authorization)){res.statusCode=401;return res.end();}
 if(req.method!=='POST'||req.url!=='/api/chat'){res.statusCode=404;return res.end();}
 if(req.headers.origin){res.statusCode=403;return res.end();}
 if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'){res.statusCode=415;return res.end();}
 try{
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>64000){res.statusCode=413;return res.end();}}
  let input;try{input=JSON.parse(body)}catch{res.statusCode=400;return res.end();}
  const {messages,jobId,requestId}=input||{};
  if(!Array.isArray(messages)||!messages.length||messages.length>12||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>4000)||messages.at(-1).role!=='user'||messages.reduce((n,m)=>n+m.text.length,0)>12000||(jobId!==undefined&&!/^[a-f0-9]{64}$/.test(jobId))||(requestId!==undefined&&!/^[a-f0-9]{64}$/.test(requestId))){res.statusCode=400;return res.end();}
  const result=queue.request(messages,{jobId,requestId});
  if(result.body.retryAfter)res.setHeader('Retry-After',String(result.body.retryAfter));
  res.statusCode=result.status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(result.body));
 }catch(error){console.warn('[TECGPT bridge]',{error:error.name});res.statusCode=503;res.end();}
});server.requestTimeout=15000;server.headersTimeout=10000;server.listen(4178,'127.0.0.1',()=>console.log('Protected TECGPT queued preview bridge ready on localhost:4178'));
