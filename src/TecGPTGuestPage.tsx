import {requestChat, type ClientMessage} from './tecgptRequest'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  readGuestChats,
  saveGuestChats,
  type GuestChat,
  type GuestMessage,
} from './tecgptGuestStorage'

const welcome =
  'Salam! Mən TECGPT-yəm 👋 BAAU və TEC haqqında suallarını verə bilərsən.'

function makeTitle(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean
}

export function TecGPTGuestPage() {
  const [chats, setChats] = useState<GuestChat[]>(readGuestChats)
  const [activeId, setActiveId] = useState<string | null>(
    () => readGuestChats()[0]?.id ?? null
  )
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [typing, setTyping] = useState(false)
  const [failed, setFailed] = useState<{chatId:string;messages:ClientMessage[]}|null>(null)
  const savedChats=useRef(chats)
  const inFlight=useRef(false)
  const controller=useRef<AbortController|null>(null)
  useEffect(()=>()=>controller.current?.abort(),[])

  useEffect(() => {
    try {
      saveGuestChats(chats,savedChats.current)
      savedChats.current=chats
    } catch {
      setNotice('Brauzerin yaddaşı doludur. Tarixçə saxlanılmaya bilər.')
    }
  }, [chats])

  const activeChat = chats.find(chat => chat.id === activeId)
  const orderedChats = [...chats].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime()
  )

  function newChat() {
    setActiveId(null)
    setInput('')
    setNotice('')
    setFailed(null)
  }

  function openChat(id: string) {
    setActiveId(id)
    setInput('')
    setNotice('')
    setFailed(null)
  }

  function deleteChat(id: string) {
    if (!window.confirm('Bu söhbət silinsin?')) return

    const remaining = chats.filter(chat => chat.id !== id)
    setChats(remaining)

    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null)
    }

    setNotice('')
    setFailed(null)
  }

  async function send(event?: FormEvent) {
    event?.preventDefault()

    const value = input.trim()
    if (!value || inFlight.current) return
    inFlight.current=true

    const now = new Date().toISOString()
    const chatId = activeId ?? crypto.randomUUID()

    const userMessage: GuestMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: value,
    }

    const outgoing = [
      ...(activeChat?.messages ?? []),
      userMessage,
    ]

    setChats(previous => {
      const existing = previous.find(chat => chat.id === chatId)

      if (existing) {
        return previous.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                updated_at: now,
                messages: [...chat.messages, userMessage],
              }
            : chat
        )
      }

      return [
        {
          id: chatId,
          title: makeTitle(value),
          created_at: now,
          updated_at: now,
          messages: [userMessage],
        },
        ...previous,
      ]
    })

    setActiveId(chatId)
    setInput('')
    setNotice('')
    await deliver(chatId,outgoing.slice(-12).map(({role,text})=>({role,text})))
  }

  async function deliver(chatId:string,messages:ClientMessage[]) {
    inFlight.current=true
    setTyping(true)
    setFailed(null)
    setNotice('Cavab hazırlanır...')
    controller.current=new AbortController()
    try {
      const data=await requestChat('/api/tecgpt-guest',messages,{},setNotice,fetch,undefined,controller.current.signal)
      setNotice(data.degraded?'Hazırda sadə məlumat rejimindəyəm; sərbəst söhbət müvəqqəti əlçatan deyil.':'')
      const reply=data.reply

      const assistantMessage: GuestMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: reply,
      }

      setChats(previous => previous.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              updated_at: new Date().toISOString(),
              messages: [...chat.messages, assistantMessage],
            }
          : chat
      ))
    } catch (error) {
      if(controller.current?.signal.aborted)return
      setFailed({chatId,messages})
      setNotice(
        error instanceof Error
          ? error.message
          : 'TECGPT-də xəta baş verdi.'
      )
    } finally {
      inFlight.current=false
      setTyping(false)
    }
  }

  return (
    <main className="tecgpt-shell">
      <aside className="tecgpt-sidebar">
        <div className="tecgpt-brand">
          <div className="tecgpt-logo">T</div>
          <div>
            <strong>TECGPT</strong>
            <span>BAAU TEC AI</span>
          </div>
        </div>

        <button className="tecgpt-new" disabled={typing} onClick={newChat}>
          ＋ Yeni söhbət
        </button>

        <div className="tecgpt-side-note">
          <span className="tecgpt-dot" /> Hesabsız beta
          <p>Tarixçə yalnız bu brauzerdə saxlanılır.</p>
        </div>

        <div className="tecgpt-history">
          <div className="tecgpt-history-title">Söhbətlər</div>

          {orderedChats.length === 0 ? (
            <div className="tecgpt-history-empty">
              Hələ söhbət yoxdur.
            </div>
          ) : (
            orderedChats.map(chat => (
              <div
                key={chat.id}
                className={
                  `tecgpt-history-row ${
                    activeId === chat.id ? 'active' : ''
                  }`
                }
              >
                <button
                  className="tecgpt-history-open"
                  disabled={typing}
                  onClick={() => openChat(chat.id)}
                  title={chat.title}
                >
                  <span>{chat.title}</span>
                </button>

                <button
                  className="tecgpt-history-delete"
                  disabled={typing}
                  onClick={() => deleteChat(chat.id)}
                  aria-label="Söhbəti sil"
                  title="Söhbəti sil"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="tecgpt-user">
          <small>Test rejimi</small>
          <strong>Qonaq istifadəçi</strong>
        </div>
      </aside>

      <section className="tecgpt-main">
        <header className="tecgpt-topbar">
          <div>
            <h1>TECGPT <span>BETA</span></h1>
            <p>BAAU Tələbə Elmi Cəmiyyətinin ağıllı köməkçisi</p>
          </div>

          <div className="tecgpt-top-actions">
            <select
              className="tecgpt-mobile-history"
              disabled={typing}
              value={activeId ?? ''}
              onChange={event => {
                const id = event.target.value
                if (id) openChat(id)
                else newChat()
              }}
              aria-label="Söhbətlər"
            >
              <option value="">＋ Yeni söhbət</option>
              {orderedChats.map(chat => (
                <option key={chat.id} value={chat.id}>
                  {chat.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="tecgpt-chat">
          <div className="tecgpt-messages">
            <div className="tecgpt-message assistant">
              <div className="tecgpt-avatar">T</div>
              <div className="tecgpt-bubble">
                {welcome}
              </div>
            </div>

            {activeChat?.messages.map(message => (
              <div
                key={message.id}
                className={`tecgpt-message ${message.role}`}
              >
                <div className="tecgpt-avatar">
                  {message.role === 'assistant' ? 'T' : 'S'}
                </div>
                <div className="tecgpt-bubble">
                  {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="tecgpt-compose-wrap">
            {notice ? <p role="status" aria-live="polite">{notice}</p> : null}
            {failed?.chatId===activeId&&!typing ? <button className="tecgpt-new" onClick={()=>{if(!inFlight.current)void deliver(failed.chatId,failed.messages)}}>Mesajı yenidən sına</button> : null}

            <form className="tecgpt-compose" onSubmit={send}>
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    send()
                  }
                }}
                maxLength={4000}
                placeholder="Mesaj yaz..."
                rows={1}
              />

              <button disabled={!input.trim() || typing}>
                {typing ? 'Cavab hazırlanır...' : 'Göndər'}
              </button>
            </form>

            <p>
              TECGPT beta • Tarixçə bu brauzerdə saxlanılır
              • BAAU və TEC məlumat köməkçisi • Cavabsız universitet/TEC sualları admin yoxlaması üçün anonim saxlanıla bilər; şəxsi məlumat yazma.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
