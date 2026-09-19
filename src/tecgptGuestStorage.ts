export type GuestMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type GuestChat = {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: GuestMessage[]
}

const STORAGE_KEY = 'baautec-tecgpt-guest-chats-v1'

export function readGuestChats(): GuestChat[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function saveGuestChats(chats: GuestChat[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
}
