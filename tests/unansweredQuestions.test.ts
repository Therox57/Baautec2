import test from 'node:test';
import assert from 'node:assert/strict';
import questions from '../api/admin/tecgpt-questions.js';
import { isSafeQuestionForReview } from '../server/unansweredQuestions.js';

function response(){let status=0;let body:any;return {res:{setHeader(){},status(code:number){status=code;return this;},json(value:unknown){body=value;return this;}},get status(){return status;},get body(){return body;}}}

test('review queue rejects messages likely to contain personal contact details',()=>{
  assert.equal(isSafeQuestionForReview('TEC-in otaq nömrəsi neçədir?'),true);
  assert.equal(isSafeQuestionForReview('Mənim emailim test@example.com, qeydiyyatım necədir?'),false);
  assert.equal(isSafeQuestionForReview('Telefon: +994 50 123 45 67'),false);
  assert.equal(isSafeQuestionForReview('x'.repeat(1001)),false);
});

test('question queue refuses requests without a signed-in administrator',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Unauthenticated request must not call Supabase');};
  try{const out=response();await questions({method:'GET',headers:{}},out.res);assert.equal(out.status,401);}
  finally{globalThis.fetch=original;}
});

test('tester role cannot read administrator question queue',async()=>{
  const originalFetch=globalThis.fetch;const oldUrl=process.env.SUPABASE_URL;const oldKey=process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-key';let calls=0;
  globalThis.fetch=(async()=>{calls++;return calls===1?Response.json({id:'user-1'}):Response.json([{role:'tester'}]);}) as typeof fetch;
  try{const out=response();await questions({method:'GET',headers:{authorization:'Bearer signed-session'},query:{status:'pending'}},out.res);assert.equal(out.status,403);assert.equal(calls,2);}
  finally{globalThis.fetch=originalFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=oldKey;}
});
