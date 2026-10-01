import test from 'node:test';
import assert from 'node:assert/strict';
import {readGuestChats,saveGuestChats,type GuestChat} from '../src/tecgptGuestStorage.js';
test('two browser tabs cannot overwrite each other’s completed replies; explicit deletion still works',()=>{
 const store=new Map<string,string>();const old=globalThis.localStorage;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)}});
 const chat=(id:string,messages:GuestChat['messages']):GuestChat=>({id,title:id,created_at:'2026-10-01',updated_at:'2026-10-01',messages});
 try{
  const a=chat('a',[{id:'a-user',role:'user',text:'Salam'}]);saveGuestChats([a],[]);
  const b=chat('b',[{id:'b-user',role:'user',text:'TEC nədir?'}]);saveGuestChats([b,a],[a]);
  const aDone={...a,messages:[...a.messages,{id:'a-reply',role:'assistant' as const,text:'Salam!'}]};saveGuestChats([aDone],[a]);
  const bDone={...b,messages:[...b.messages,{id:'b-reply',role:'assistant' as const,text:'TEC...'}]};saveGuestChats([bDone,a],[b,a]);
  assert.equal(readGuestChats().length,2);assert.equal(readGuestChats().find(c=>c.id==='a')?.messages.length,2);assert.equal(readGuestChats().find(c=>c.id==='b')?.messages.length,2);
  saveGuestChats([bDone],[aDone,bDone]);assert.deepEqual(readGuestChats().map(c=>c.id),['b']);
  store.set('baautec-tecgpt-guest-chats-v1','[{"id":"bad"}]');assert.deepEqual(readGuestChats(),[]);
 }finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:old});}
});
