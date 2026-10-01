export type GuestMessage = {id:string;role:'user'|'assistant';text:string}
export type GuestChat = {id:string;title:string;created_at:string;updated_at:string;messages:GuestMessage[]}
const STORAGE_KEY='baautec-tecgpt-guest-chats-v1'
export function readGuestChats():GuestChat[]{
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')
  if(!Array.isArray(saved))return []
  return saved.filter((c:GuestChat)=>c&&typeof c.id==='string'&&typeof c.title==='string'&&typeof c.created_at==='string'&&typeof c.updated_at==='string'&&Array.isArray(c.messages)&&c.messages.every(m=>m&&typeof m.id==='string'&&['user','assistant'].includes(m.role)&&typeof m.text==='string')).slice(0,100)
 }catch{return []}
}
// Apply only this tab's changes to the latest storage. Another tab's completed
// reply must not disappear when this tab saves an older in-memory chat list.
export function saveGuestChats(chats:GuestChat[],previous:GuestChat[]=[]):void{
 const stored=readGuestChats();const before=new Map(previous.map(c=>[c.id,c]));const localIds=new Set(chats.map(c=>c.id));
 const removed=new Set(previous.filter(c=>!localIds.has(c.id)).map(c=>c.id));
 const merged=new Map(stored.filter(c=>!removed.has(c.id)).map(c=>[c.id,c]));
 for(const chat of chats){
  if(JSON.stringify(chat)===JSON.stringify(before.get(chat.id)))continue
  const other=merged.get(chat.id)
  const ids=new Set(other?.messages.map(m=>m.id)??[])
  merged.set(chat.id,{...chat,messages:[...(other?.messages??[]),...chat.messages.filter(m=>!ids.has(m.id))],updated_at:other&&other.updated_at>chat.updated_at?other.updated_at:chat.updated_at})
 }
 localStorage.setItem(STORAGE_KEY,JSON.stringify([...merged.values()].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,100)))
}
