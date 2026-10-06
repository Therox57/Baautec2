import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ClipboardList, Menu, MessageCircle, Network, X } from 'lucide-react'

export function PublicLayout({ section, children }: { section: 'registration' | 'structure' | 'tecgpt'; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  function closeMenu() { setOpen(false); toggle.current?.focus() }
  useEffect(() => {
    if (!open) return
    const media = window.matchMedia('(max-width: 800px)')
    const previousOverflow = document.body.style.overflow
    if (media.matches) {
      document.body.style.overflow = 'hidden'
      panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }
    const onResize = () => { if (!media.matches) setOpen(false) }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
      if (event.key !== 'Tab' || !media.matches) return
      const controls = panel.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!controls?.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    media.addEventListener('change', onResize)
    return () => { window.removeEventListener('keydown', onKey); media.removeEventListener('change', onResize); document.body.style.overflow = previousOverflow }
  }, [open])
  return <div className="tec-public-layout">
    <header className="tec-mobile-bar">
      <button ref={toggle} type="button" className="icon-btn" aria-label="Menyunu aç" aria-expanded={open} aria-controls="tec-public-menu" onClick={() => setOpen(!open)}><Menu size={22}/></button>
      <strong>BAAU TEC</strong>
    </header>
    {open && <button type="button" tabIndex={-1} className="tec-menu-backdrop" aria-label="Menyunu bağla" onClick={closeMenu}/>}
    <aside ref={panel} id="tec-public-menu" className={`tec-public-sidebar${open ? ' is-open' : ''}`}>
      <button type="button" className="icon-btn tec-menu-close" aria-label="Menyunu bağla" onClick={closeMenu}><X size={22}/></button>
      <div className="tec-menu-brand"><img src="/baau-tec-official.png" alt=""/><div><strong>BAAU TEC</strong><span>Tələbə Elmi Cəmiyyəti</span></div></div>
      <nav aria-label="TEC bölmələri">
        <a href="/" aria-current={section === 'registration' ? 'page' : undefined}><ClipboardList size={22}/><span>Qeydiyyat</span></a>
        <a href="/struktur" aria-current={section === 'structure' ? 'page' : undefined}><Network size={22}/><span>Struktur</span></a>
        <a href="/tecgpt-guest" aria-current={section === 'tecgpt' ? 'page' : undefined}><MessageCircle size={22}/><span>TECGPT</span></a>
      </nav>
    </aside>
    <div className="tec-public-body">{children}</div>
    {section !== 'tecgpt' && <a className="tecgpt-float" href="/tecgpt-guest" aria-label="TECGPT-ni aç" title="TECGPT-ni aç"><img src="/tecgpt-logo.png" alt="" aria-hidden="true" className="tecgpt-float-logo"/><span className="tecgpt-float-label">TECGPT</span></a>}
  </div>
}

export function StructurePage() {
  return <main className="tec-coming-soon"><div className="card tec-coming-soon-card"><Network size={40} aria-hidden="true"/><p className="tec-section-label">Struktur</p><h1>Hazırlanır</h1><p>Bu bölmə tezliklə istifadəyə veriləcək.</p></div></main>
}
