import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ClipboardList, Menu, Network, X } from 'lucide-react'

export function PublicLayout({ structure, children }: { structure: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return <div className="tec-public-layout">
    <header className="tec-mobile-bar">
      <button ref={toggle} type="button" className="icon-btn" aria-label={open ? 'Menyunu bağla' : 'Menyunu aç'} aria-expanded={open} aria-controls="tec-public-menu" onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      <strong>BAAU TEC</strong>
    </header>
    <aside id="tec-public-menu" className={`tec-public-sidebar${open ? ' is-open' : ''}`}>
      <div className="tec-menu-brand"><img src="/baau-tec-official.png" alt=""/><div><strong>BAAU TEC</strong><span>Tələbə Elmi Cəmiyyəti</span></div></div>
      <nav aria-label="TEC bölmələri">
        <a href="/" aria-current={!structure ? 'page' : undefined}><ClipboardList size={22}/><span>Qeydiyyat</span></a>
        <a href="/struktur" aria-current={structure ? 'page' : undefined}><Network size={22}/><span>Struktur</span></a>
      </nav>
    </aside>
    <div className="tec-public-body" onClick={() => open && setOpen(false)}>{children}</div>
  </div>
}

export function StructurePage() {
  return <main className="tec-coming-soon"><div className="card tec-coming-soon-card"><Network size={40} aria-hidden="true"/><p className="tec-section-label">Struktur</p><h1>Hazırlanır</h1><p>Bu bölmə tezliklə istifadəyə veriləcək.</p></div></main>
}
