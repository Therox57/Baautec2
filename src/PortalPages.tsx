import { useState } from 'react'
import { ArrowUpRight, BookOpen, CalendarDays, Check, Clock3, MapPin, MessageCircle, Mic2, Newspaper, PenLine } from 'lucide-react'
import { clubs, dateLabel, events, instagram, upcomingEvents, writersPlan, type PlannedEvent } from './siteContent'

const icons = { book: BookOpen, pen: PenLine, talk: Mic2 }
function PageIntro({ title, text }: { title: string; text: string }) {
  return <header className="portal-page-heading"><span className="portal-eyebrow">BAAU TEC / 2026–2027</span><h1>{title}</h1><p>{text}</p></header>
}
function EventCard({ event }: { event: PlannedEvent }) {
  const [, month, day] = event.date.split('-')
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
  return <article className="portal-event">
    <div className="portal-event-top"><time className="portal-date-block" dateTime={event.date} aria-label={dateLabel(event.date)}><strong>{day}</strong><span>{months[Number(month) - 1]} {event.date.slice(0, 4)}</span></time><span className="portal-tag">{event.club}</span></div>
    <h3>{event.title}</h3><p>{event.format}</p>
    <div className="portal-event-meta"><span><MapPin size={15}/> BAAU · otaq dəqiqləşdirilir</span><span><Clock3 size={15}/> Saat elan edilməyib</span></div>
    {event.note && <p>{event.note}</p>}
    <a href={instagram} target="_blank" rel="noopener noreferrer">İştirak haqqında <ArrowUpRight size={16}/></a>
  </article>
}
export function HomePage() {
  const next = upcomingEvents().slice(0, 2)
  return <main className="portal-page">
    <div className="portal-topline"><span>Tələbə portalı</span><span>2026 / 2027</span></div>
    <section className="portal-hero">
      <div className="portal-hero-copy"><span className="portal-eyebrow">Bakı Avrasiya Universiteti</span><h1>Tələbə Elmi<br/>Cəmiyyəti</h1><p>Elmi tədqiqat, kitab müzakirələri, yazı və debat. TEC-in klubları, fəaliyyət planı və üzvlük məlumatları burada.</p><div className="portal-actions"><a className="portal-button portal-button-gold" href="/qeydiyyat">TEC-ə qoşul <ArrowUpRight size={18}/></a><a className="portal-button portal-button-light" href="/klublar">Klublara bax</a></div><span className="portal-hero-note"><Check size={16}/> BAAU tələbələri üçün üzvlük ödənişsizdir</span></div>
      <div className="portal-hero-art"><img src="/baau-tec-official.png" alt="BAAU Tələbə Elmi Cəmiyyətinin loqosu" width="190" height="190"/><span>BAAU TEC<span>Tələbə Elmi Cəmiyyəti</span></span></div>
    </section>
    <div className="portal-stat-row"><a href="/klublar"><strong>3 klub</strong><span>Oxucular · Yazıçılar · Debat</span></a><a href="/tedbirler"><strong>İllik plan</strong><span>2026–2027 fəaliyyətləri</span></a><a href="#elaqe"><strong>205-ci otaq</strong><span>B korpusu · 2-ci mərtəbə</span></a></div>
    <section className="portal-section"><div className="portal-section-title"><div><span className="portal-eyebrow">TEC-dən</span><h2>Son xəbərlər</h2></div><a href="/xeberler">Bütün xəbərlər <ArrowUpRight size={17}/></a></div><NewsEmpty compact/></section>
    <section className="portal-section"><div className="portal-section-title"><div><span className="portal-eyebrow">İllik plandan</span><h2>Yaxın tədbirlər</h2></div><a href="/tedbirler">Bütün tarixlər <ArrowUpRight size={17}/></a></div><p className="portal-plan-note">Saat və iştirak şərtləri rəsmi elanlarda dəqiqləşdiriləcək. Plan tarixləri dəyişə bilər.</p><div className="portal-event-grid">{next.map(event => <EventCard key={event.id} event={event}/>)}{next.length === 0 && <p>Yeni tədbir tarixi təqdim edilməyib.</p>}</div></section>
    <section className="portal-section"><div className="portal-section-title"><div><span className="portal-eyebrow">TEC-in nəzdində</span><h2>Klublar</h2></div><a href="/klublar">Ətraflı <ArrowUpRight size={17}/></a></div><div className="portal-club-grid">{clubs.map((club, index) => { const Icon = icons[club.icon]; return <a className={'portal-club-preview club-' + club.id} key={club.id} href={'/klublar#' + club.id}><div className="portal-club-mark"><Icon size={32}/><span>0{index + 1}</span></div><h3>{club.name}</h3><p>{club.leader}<br/>Klub rəhbəri</p><span>Fəaliyyətlərə bax <ArrowUpRight size={17}/></span></a> })}</div></section>
    <section className="portal-help"><div className="portal-help-icon"><MessageCircle size={29}/></div><div><span className="portal-eyebrow">BAAU və TEC haqqında</span><h2>TECGPT-yə sual ver</h2><p>Üzvlük, klublar və universitet haqqında məlumat almaq üçün.</p></div><a className="portal-button" href="/tecgpt-guest">Söhbəti aç <ArrowUpRight size={18}/></a></section>
    <section className="portal-contact" id="elaqe"><div><span className="portal-eyebrow">Əlaqə</span><h2>B korpusu, 205-ci otaq</h2><p>BAAU · 2-ci mərtəbə. Qəbul saatlarını əvvəlcədən soruş.</p></div><a href={instagram} target="_blank" rel="noopener noreferrer">TEC-in rəsmi Instagram səhifəsi <ArrowUpRight size={17}/></a></section>
    <footer className="portal-footer">Bakı Avrasiya Universiteti · Tələbə Elmi Cəmiyyəti</footer>
  </main>
}
export function EventsPage() {
  const [filter, setFilter] = useState('Hamısı')
  const [archive, setArchive] = useState(false)
  const upcoming = upcomingEvents()
  const activeIds = new Set(upcoming.map(event => event.id))
  const list = (archive ? events.filter(event => !activeIds.has(event.id)) : upcoming).filter(event => filter === 'Hamısı' || event.club === filter)
  return <main className="portal-page"><PageIntro title="Tədbirlər" text="Oxucular, Debat və Yazıçılar klublarının fəaliyyət planı."/><p className="portal-plan-note portal-notice"><CalendarDays size={20}/><span>Planlaşdırılan tarixlərdir. Saat, otaq və iştirak şərtləri hələ təqdim edilməyib.</span></p><div className="portal-filters" aria-label="Kluba görə süzgəc">{['Hamısı', 'Oxucular Klubu', 'Debat Klubu'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}<button className="portal-archive" aria-pressed={archive} onClick={() => setArchive(!archive)}>{archive ? 'Yaxın tarixləri göstər' : 'Keçmiş plan tarixləri'}</button></div><div className="portal-event-grid">{list.map(event => <EventCard key={event.id} event={event}/>)}{list.length === 0 && <p>Bu seçim üzrə tədbir yoxdur.</p>}</div><section className="portal-section"><h2>Yazıçılar Klubunun aylıq planı</h2><p className="portal-plan-note">Dəqiq tarixlər ayrıca elan ediləcək.</p><div className="portal-monthly-plan">{writersPlan.map(([month, title]) => <div key={month}><span>{month}</span><strong>{title}</strong></div>)}</div><p className="portal-plan-note">Tarixlər akademik təqvimə və təşkilati imkanlara görə dəyişə bilər. Elektron toplu imkan daxilində hazırlanacaq.</p></section></main>
}
export function ClubsPage() {
  return <main className="portal-page"><PageIntro title="Klublar" text="Hazırda TEC-in nəzdində üç klub fəaliyyət göstərir."/>{clubs.map(club => { const Icon = icons[club.icon]; return <section className={'portal-club-detail club-' + club.id} id={club.id} key={club.id}><div className="portal-club-symbol"><Icon size={38}/></div><div><h2>{club.name}</h2><div className="portal-leader"><span>Klub rəhbəri</span><strong>{club.leader}</strong></div><p>{club.description}</p><ul>{club.activities.map(activity => <li key={activity}><Check size={16}/>{activity}</li>)}</ul><div className="portal-actions"><a className="portal-button" href={instagram} target="_blank" rel="noopener noreferrer">Qoşulmaq üçün yaz <ArrowUpRight size={17}/></a><a className="portal-text-link" href="/tedbirler">Fəaliyyət planı</a></div></div></section> })}<section className="portal-help"><div><h2>TEC üzvlüyü</h2><p>Qeydiyyat ödənişsizdir. Kluba qoşulmaq üçün rəsmi səhifəyə yaz və ya 205-ci otağa yaxınlaş.</p></div><a className="portal-button" href="/qeydiyyat">Qeydiyyat <ArrowUpRight size={17}/></a></section></main>
}

function NewsEmpty({ compact = false }: { compact?: boolean }) {
  return <div className={`portal-news-empty${compact ? ' is-compact' : ''}`}>
    <div className="portal-news-symbol"><Newspaper size={28} aria-hidden="true"/></div>
    <div><h2>Hələ xəbər paylaşılmayıb</h2><p>TEC-in tədbirləri, klub fəaliyyətləri və yenilikləri bu bölmədə paylaşılacaq.</p></div>
    <a href={instagram} target="_blank" rel="noopener noreferrer">Rəsmi səhifəyə bax <ArrowUpRight size={17}/></a>
  </div>
}
export function NewsPage() {
  return <main className="portal-page"><PageIntro title="Xəbərlər" text="TEC-in tədbirləri, klubları və fəaliyyəti haqqında yeniliklər."/><NewsEmpty/></main>
}
