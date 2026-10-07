import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { clubs, dateLabel, events, instagram, upcomingEvents, writersPlan, type PlannedEvent } from './siteContent'

function EventRow({ event }: { event: PlannedEvent }) {
  return <article className="portal-event">
    <time dateTime={event.date}>{dateLabel(event.date)}</time>
    <div><span className="portal-event-club">{event.club} · {event.format}</span><h3>{event.title}</h3>{event.note && <p>{event.note}</p>}</div>
  </article>
}

export function HomePage() {
  const next = upcomingEvents().slice(0, 3)
  return <main className="portal-page">
    <header className="portal-hero">
      <span className="portal-eyebrow">Bakı Avrasiya Universiteti</span>
      <h1>Tələbə Elmi<br />Cəmiyyəti</h1>
      <p>TEC tələbələrin elmi tədqiqat, kitab müzakirələri, yazı və debat fəaliyyətlərini təşkil edir.</p>
      <div className="portal-actions"><a className="portal-button" href="/qeydiyyat">Üzvlük üçün qeydiyyat <ArrowUpRight size={16}/></a><span>BAAU tələbələri üçün ödənişsizdir.</span></div>
    </header>
    <section className="portal-section">
      <div className="portal-section-title"><h2>Yaxın tarixlər</h2><a href="/tedbirler">Tam plan <ArrowUpRight size={16}/></a></div>
      <p className="portal-plan-note">2026–2027 illik planından. Saat və otaq rəsmi elanlarda dəqiqləşdiriləcək.</p>
      <div className="portal-event-list">{next.map(event => <EventRow key={event.id} event={event}/>)}{next.length === 0 && <p>Yeni tədbir tarixi təqdim edilməyib.</p>}</div>
    </section>
    <section className="portal-section">
      <div className="portal-section-title"><h2>Klublar</h2><a href="/klublar">Ətraflı <ArrowUpRight size={16}/></a></div>
      <div className="portal-club-list">{clubs.map((club, index) => <a key={club.id} href={'/klublar#' + club.id}><span className="portal-index">0{index + 1}</span><div><h3>{club.name}</h3><p>{club.leader} · klub rəhbəri</p></div><ArrowUpRight size={18}/></a>)}</div>
    </section>
    <section className="portal-contact"><div><h2>Əlaqə</h2><p>B korpusu, 2-ci mərtəbə, 205-ci otaq.</p><a href={instagram} target="_blank" rel="noopener noreferrer">TEC-in rəsmi Instagram səhifəsi ↗</a></div><div><h2>TECGPT</h2><p>BAAU və TEC haqqında suallar üçün.</p><a href="/tecgpt-guest">Sual ver ↗</a></div></section>
    <footer className="portal-footer">Bakı Avrasiya Universiteti · Tələbə Elmi Cəmiyyəti</footer>
  </main>
}

export function EventsPage() {
  const [filter, setFilter] = useState('Hamısı')
  const [archive, setArchive] = useState(false)
  const upcoming = upcomingEvents()
  const activeIds = new Set(upcoming.map(event => event.id))
  const list = (archive ? events.filter(event => !activeIds.has(event.id)) : upcoming).filter(event => filter === 'Hamısı' || event.club === filter)
  return <main className="portal-page">
    <header className="portal-page-heading"><span className="portal-eyebrow">2026–2027</span><h1>Tədbir planı</h1><p>Klubların təqdim etdiyi illik fəaliyyət cədvəli.</p></header>
    <p className="portal-plan-note">Tarixlər dəyişə bilər. Saat, otaq və iştirak şərtləri hələ təqdim edilməyib. <a href={instagram} target="_blank" rel="noopener noreferrer">Rəsmi elanlara bax ↗</a></p>
    <div className="portal-filters" aria-label="Kluba görə süzgəc">{['Hamısı', 'Oxucular Klubu', 'Debat Klubu'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}<button aria-pressed={archive} onClick={() => setArchive(!archive)}>{archive ? 'Yaxın tarixlər' : 'Keçmiş plan tarixləri'}</button></div>
    <div className="portal-event-list">{list.map(event => <EventRow key={event.id} event={event}/>)}{list.length === 0 && <p>Bu seçim üzrə tədbir yoxdur.</p>}</div>
    <section className="portal-section"><h2>Yazıçılar Klubunun aylıq planı</h2><p className="portal-plan-note">Dəqiq tarixlər ayrıca elan ediləcək.</p><div className="portal-monthly-plan">{writersPlan.map(([month, title]) => <div key={month}><span>{month}</span><strong>{title}</strong></div>)}</div><p className="portal-plan-note">Plan akademik təqvimə və təşkilati imkanlara görə dəyişə bilər. Elektron toplu imkan daxilində hazırlanacaq.</p></section>
  </main>
}

export function ClubsPage() {
  return <main className="portal-page">
    <header className="portal-page-heading"><span className="portal-eyebrow">TEC</span><h1>Klublar</h1><p>Hazırda üç klub fəaliyyət göstərir.</p></header>
    {clubs.map((club, index) => <section className="portal-club-detail" id={club.id} key={club.id}><span className="portal-index">0{index + 1}</span><div><h2>{club.name}</h2><p className="portal-leader">Rəhbər: {club.leader}</p><p>{club.description}</p><ul>{club.activities.map(activity => <li key={activity}>{activity}</li>)}</ul><a className="portal-text-link" href="/tedbirler">Fəaliyyət planı ↗</a></div></section>)}
    <section className="portal-contact"><div><h2>Kluba qoşulmaq</h2><p>Rəsmi TEC səhifəsinə yaz və ya 205-ci otağa yaxınlaş.</p><a href={instagram} target="_blank" rel="noopener noreferrer">Instagram-da əlaqə saxla ↗</a></div><a className="portal-button" href="/qeydiyyat">TEC qeydiyyatı <ArrowUpRight size={16}/></a></section>
  </main>
}
