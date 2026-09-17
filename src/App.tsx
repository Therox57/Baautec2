import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  CheckCircle2,
  Download,
  GraduationCap,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { supabase } from './supabase'

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
const COURSES = ['1-ci kurs','2-ci kurs','3-cü kurs','4-cü kurs','Magistr 1','Magistr 2']
const LANGUAGES = ['İngilis dili','Rus dili','Digər']
const LEVELS = ['A1–A2','B1–B2','C1–C2']
const PAGE_SIZE = 20
const LOGO_URL = (import.meta.env.VITE_TEC_LOGO_URL as string | undefined) || '/baau-tec-official.png'

type LangEntry = { language?: string; level?: string }
type Member = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  father_name: string
  birth_date: string
  gender: string
  phone: string
  email: string
  faculty: string
  specialty: string
  course: string
  membership_reason: string
  languages: LangEntry[] | null
  skills: string | null
  additional_note: string | null
  privacy_accepted: boolean
}

type Errors = Partial<Record<'firstName'|'lastName'|'fatherName'|'birth'|'gender'|'phone'|'email'|'faculty'|'specialty'|'course'|'reason'|'languages'|'skills'|'privacy', string>>

export function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/admin' ? <AdminPage /> : <MembershipPage />
}

function formatPhone(digits: string) {
  const d = digits.slice(0, 9)
  const parts = [d.slice(0,2), d.slice(2,5), d.slice(5,7), d.slice(7,9)].filter(Boolean)
  return parts.length ? `+994 ${parts.join(' ')}` : '+994 '
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return <div className="field">
    <label>{label}{required ? <span className="required"> *</span> : null}</label>
    {children}
    {hint && !error ? <p className="hint">{hint}</p> : null}
    {error ? <p className="field-error">{error}</p> : null}
  </div>
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Bağla"><X size={20}/></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}

function PrivacyContent() {
  return <div className="privacy-text">
    <p className="muted">Tələbə Elmi Cəmiyyəti şəxsi məlumatlarınızı necə toplayır və istifadə edir.</p>
    <section><h3>Hansı məlumatlar toplanır?</h3><p>Ad, soyad, ata adı, doğum tarixi, cins, əlaqə nömrəsi, e-poçt ünvanı, fakültə, ixtisas, kurs, üzvlük motivasiyanız, bildiyiniz xarici dillər və səviyyələri, bacarıqlarınız və əlavə qeydiniz.</p></section>
    <section><h3>Nə üçün toplanır?</h3><p>Məlumatlar yalnız Tələbə Elmi Cəmiyyətinə üzvlüyün rəsmiləşdirilməsi, üzvlərlə əlaqə saxlanılması, elmi tədbirlərin və təşkilati işlərin planlaşdırılması məqsədilə istifadə olunur.</p></section>
    <section><h3>Kim baxa bilər?</h3><p>Məlumatlara yalnız səlahiyyətli TEC administratorları şifrə ilə qorunan idarəetmə paneli vasitəsilə çıxış edə bilər. Məlumatlar ictimai şəkildə yayımlanmır və üçüncü şəxslərə ötürülmür.</p></section>
    <section><h3>Saxlanma və hüquqlarınız</h3><p>Məlumatlar təhlükəsiz serverdə saxlanılır. Məlumatlarınızın düzəldilməsini və ya silinməsini istəsəniz, Tələbə Elmi Cəmiyyəti ilə əlaqə saxlaya bilərsiniz.</p></section>
  </div>
}

function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2500)
    return () => window.clearTimeout(id)
  }, [onDone])
  return <div className="intro-screen" aria-label="TEC açılış ekranı">
    <div className="intro-glow"/>
    <div className="intro-logo-wrap">
      <img src={LOGO_URL} alt="BAAU TEC" className="intro-logo" />
      <div className="intro-line"/>
      <p>BAKI AVRASİYA UNİVERSİTETİ</p>
      <span>TƏLƏBƏ ELMİ CƏMİYYƏTİ</span>
    </div>
  </div>
}

function MembershipPage() {
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => Array.from({ length: 40 }, (_, i) => currentYear - 15 - i), [currentYear])
  const [intro, setIntro] = useState(true)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [firstName,setFirstName] = useState('')
  const [lastName,setLastName] = useState('')
  const [fatherName,setFatherName] = useState('')
  const [day,setDay] = useState('')
  const [month,setMonth] = useState('')
  const [year,setYear] = useState('')
  const [gender,setGender] = useState('')
  const [phoneDigits,setPhoneDigits] = useState('')
  const [email,setEmail] = useState('')
  const [faculty,setFaculty] = useState('')
  const [specialty,setSpecialty] = useState('')
  const [course,setCourse] = useState('')
  const [reason,setReason] = useState('')
  const [selectedLangs,setSelectedLangs] = useState<string[]>([])
  const [langLevels,setLangLevels] = useState<Record<string,string>>({})
  const [otherLang,setOtherLang] = useState('')
  const [skills,setSkills] = useState('')
  const [note,setNote] = useState('')
  const [privacy,setPrivacy] = useState(false)
  const [errors,setErrors] = useState<Errors>({})
  const [submitting,setSubmitting] = useState(false)
  const [submitError,setSubmitError] = useState('')
  const [done,setDone] = useState(false)

  function toggleLang(lang: string) {
    setSelectedLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }
  function validate(): Errors {
    const e: Errors = {}
    if (firstName.trim().length < 2) e.firstName = 'Adınızı daxil edin.'
    if (lastName.trim().length < 2) e.lastName = 'Soyadınızı daxil edin.'
    if (fatherName.trim().length < 2) e.fatherName = 'Ata adınızı daxil edin.'
    if (!day || !month || !year) e.birth = 'Doğum tarixini tam seçin.'
    else {
      const d = new Date(Number(year), Number(month)-1, Number(day))
      if (d.getFullYear() !== Number(year) || d.getMonth() !== Number(month)-1 || d.getDate() !== Number(day) || d > new Date()) e.birth = 'Doğum tarixi düzgün deyil.'
    }
    if (!gender) e.gender = 'Cinsi seçin.'
    if (phoneDigits.length !== 9 || !/^(10|50|51|55|60|70|77|99|12)/.test(phoneDigits)) e.phone = 'Nömrəni +994 XX XXX XX XX formatında daxil edin.'
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim())) e.email = 'Düzgün e-poçt ünvanı daxil edin.'
    if (faculty.trim().length < 2) e.faculty = 'Fakültəni daxil edin.'
    if (specialty.trim().length < 2) e.specialty = 'İxtisası daxil edin.'
    if (!course) e.course = 'Kursu seçin.'
    if (reason.trim().length < 10) e.reason = 'Ən azı bir neçə cümlə ilə cavab yazın.'
    if (selectedLangs.length === 0) e.languages = 'Ən azı bir dil seçin.'
    selectedLangs.forEach(l => { if (!langLevels[l]) e.languages = 'Hər seçilmiş dil üçün səviyyəni göstərin.' })
    if (selectedLangs.includes('Digər') && otherLang.trim().length < 2) e.languages = 'Digər dilin adını yazın.'
    if (!skills.trim()) e.skills = 'Xüsusi qabiliyyət və bacarıqlarınızı qeyd edin.'
    if (!privacy) e.privacy = 'Davam etmək üçün razılıq verməlisiniz.'
    return e
  }
  async function submit(ev: FormEvent) {
    ev.preventDefault(); if (submitting) return
    setSubmitError('')
    const e = validate(); setErrors(e)
    if (Object.keys(e).length) {
      window.setTimeout(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior:'smooth', block:'center' }), 0)
      return
    }
    setSubmitting(true)
    try {
      const languages = selectedLangs.map(l => ({ language: l === 'Digər' ? otherLang.trim() : l, level: langLevels[l] ?? '' }))
      const { error } = await supabase.from('tec_members').insert({
        first_name:firstName.trim(), last_name:lastName.trim(), father_name:fatherName.trim(),
        birth_date:`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`, gender,
        phone:formatPhone(phoneDigits), email:email.trim().toLowerCase(), faculty:faculty.trim(), specialty:specialty.trim(), course,
        membership_reason:reason.trim(), languages, skills:skills.trim() || null, additional_note:note.trim() || null, privacy_accepted:true,
      })
      if (error) throw error
      setDone(true); window.scrollTo({ top:0, behavior:'smooth' })
    } catch (err) {
      console.error(err); setSubmitError('Xəta baş verdi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.')
    } finally { setSubmitting(false) }
  }

  if (intro) return <Intro onDone={() => setIntro(false)} />
  if (done) return <main className="center-page"><div className="card success-card"><CheckCircle2 className="success-icon"/><h1>Qeydiyyatınız uğurla tamamlandı!</h1><p>Tələbə Elmi Cəmiyyətinə göstərdiyiniz marağa görə təşəkkür edirik.</p></div></main>

  return <main className="page">
    <header className="site-header"><div className="header-inner"><div className="cap-badge"><GraduationCap/></div><p>BAKI AVRASİYA UNİVERSİTETİ</p><span>TƏLƏBƏ ELMİ CƏMİYYƏTİ</span></div></header>
    <div className="content narrow">
      <div className="card hero-card"><h1>TEC-ə Üzvlük Formu</h1><p>Tələbə Elmi Cəmiyyətinə üzv olmaq üçün aşağıdakı məlumatları doldurun.</p></div>
      <form onSubmit={submit} noValidate className="form-stack">
        <section className="card section-card"><h2>Şəxsi məlumatlar</h2>
          <div data-error={!!errors.firstName}><Field label="Ad" required error={errors.firstName}><input className="control" value={firstName} onChange={e=>setFirstName(e.target.value)} autoComplete="given-name"/></Field></div>
          <div data-error={!!errors.lastName}><Field label="Soyad" required error={errors.lastName}><input className="control" value={lastName} onChange={e=>setLastName(e.target.value)} autoComplete="family-name"/></Field></div>
          <div data-error={!!errors.fatherName}><Field label="Ata adı" required error={errors.fatherName}><input className="control" value={fatherName} onChange={e=>setFatherName(e.target.value)}/></Field></div>
          <div data-error={!!errors.birth}><Field label="Doğum tarixi" required error={errors.birth}><div className="grid-3"><select className="control" value={day} onChange={e=>setDay(e.target.value)}><option value="">Gün</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}</select><select className="control" value={month} onChange={e=>setMonth(e.target.value)}><option value="">Ay</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select><select className="control" value={year} onChange={e=>setYear(e.target.value)}><option value="">İl</option>{years.map(y=><option key={y}>{y}</option>)}</select></div></Field></div>
          <div data-error={!!errors.gender}><Field label="Cins" required error={errors.gender}><div className="gender-grid">{['Kişi','Qadın'].map(g=><button key={g} type="button" className={`choice ${gender===g?'active':''}`} onClick={()=>setGender(g)}>{g}</button>)}</div></Field></div>
          <div data-error={!!errors.phone}><Field label="Əlaqə nömrəsi" required error={errors.phone} hint="Format: +994 XX XXX XX XX"><input className="control" inputMode="tel" value={formatPhone(phoneDigits)} onChange={e=>{const raw=e.target.value.replace(/\D/g,''); setPhoneDigits((raw.startsWith('994')?raw.slice(3):raw).slice(0,9))}}/></Field></div>
          <div data-error={!!errors.email}><Field label="E-poçt" required error={errors.email}><input className="control" type="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></Field></div>
        </section>
        <section className="card section-card"><h2>Təhsil məlumatları</h2>
          <div data-error={!!errors.faculty}><Field label="Fakültə" required error={errors.faculty}><input className="control" value={faculty} onChange={e=>setFaculty(e.target.value)}/></Field></div>
          <div data-error={!!errors.specialty}><Field label="İxtisas" required error={errors.specialty}><input className="control" value={specialty} onChange={e=>setSpecialty(e.target.value)}/></Field></div>
          <div data-error={!!errors.course}><Field label="Kurs" required error={errors.course}><select className="control" value={course} onChange={e=>setCourse(e.target.value)}><option value="">Seçin</option>{COURSES.map(c=><option key={c}>{c}</option>)}</select></Field></div>
        </section>
        <section className="card section-card"><h2>Motivasiya və bacarıqlar</h2>
          <div data-error={!!errors.reason}><Field label="Niyə Tələbə Elmi Cəmiyyətinə üzv olmaq istəyirsiniz?" required error={errors.reason}><textarea className="control textarea tall" value={reason} onChange={e=>setReason(e.target.value)}/></Field></div>
          <div data-error={!!errors.languages}><Field label="Bildiyiniz xarici dil" required error={errors.languages} hint="Bir neçə dil seçə bilərsiniz."><div className="lang-list">{LANGUAGES.map(lang=>{const active=selectedLangs.includes(lang); return <div className={`lang-card ${active?'active':''}`} key={lang}><label className="check-row"><input type="checkbox" checked={active} onChange={()=>toggleLang(lang)}/><span>{lang}</span></label>{active?<div className="lang-extra">{lang==='Digər'?<input className="control" placeholder="Dilin adı" value={otherLang} onChange={e=>setOtherLang(e.target.value)}/>:null}<select className="control" value={langLevels[lang]??''} onChange={e=>setLangLevels(p=>({...p,[lang]:e.target.value}))}><option value="">Dil səviyyəsi</option>{LEVELS.map(lv=><option key={lv}>{lv}</option>)}</select></div>:null}</div>})}</div></Field></div>
          <div data-error={!!errors.skills}><Field label="Xüsusi qabiliyyət və bacarıqlar" required error={errors.skills}><textarea className="control textarea" value={skills} onChange={e=>setSkills(e.target.value)}/></Field></div>
          <Field label="Əlavə qeyd" hint="Məcburi deyil."><textarea className="control textarea" value={note} onChange={e=>setNote(e.target.value)}/></Field>
        </section>
        <section className="card section-card privacy-card"><div data-error={!!errors.privacy}><label className="check-row privacy-check"><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/><span>Şəxsi məlumatlarımın Tələbə Elmi Cəmiyyəti tərəfindən üzvlük və təşkilati məqsədlər üçün işlənməsinə razılıq verirəm.</span></label>{errors.privacy?<p className="field-error">{errors.privacy}</p>:null}</div><button type="button" className="link-btn" onClick={()=>setPrivacyOpen(true)}>Məxfilik haqqında</button>{submitError?<p className="submit-error">{submitError}</p>:null}<button className="primary-btn" type="submit" disabled={submitting}>{submitting?<Loader2 className="spin" size={20}/>:null}{submitting?'Göndərilir...':'Göndər'}</button></section>
      </form>
    </div>
    <Modal open={privacyOpen} onClose={()=>setPrivacyOpen(false)} title="Məxfilik haqqında"><PrivacyContent/></Modal>
  </main>
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('az-AZ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
}

function AdminPage() {
  const [checking,setChecking] = useState(true)
  const [userEmail,setUserEmail] = useState<string|null>(null)
  const [isAdmin,setIsAdmin] = useState(false)
  useEffect(()=>{
    let active=true
    async function check(){
      setChecking(true)
      const {data}=await supabase.auth.getUser(); if(!active)return
      const user=data.user
      if(!user){setUserEmail(null);setIsAdmin(false);setChecking(false);return}
      const {data:role}=await supabase.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle(); if(!active)return
      setUserEmail(user.email??null); setIsAdmin(role?.role==='admin'); setChecking(false)
    }
    void check(); const {data:sub}=supabase.auth.onAuthStateChange(()=>void check())
    return()=>{active=false;sub.subscription.unsubscribe()}
  },[])
  if(checking)return <div className="center-page"><Loader2 className="spin muted"/></div>
  if(!userEmail)return <AdminLogin/>
  if(!isAdmin)return <Unauthorized email={userEmail}/>
  return <AdminDashboard email={userEmail}/>
}

function AdminLogin(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault(); if(loading)return; setError('');setLoading(true); const {error:err}=await supabase.auth.signInWithPassword({email:email.trim(),password}); setLoading(false); if(err)setError('E-poçt və ya şifrə yanlışdır.')}
  return <main className="center-page"><div className="card login-card"><div className="login-head"><ShieldCheck/><h1>TEC İdarəetmə Paneli</h1><p>Yalnız səlahiyyətli administratorlar üçün.</p></div><form onSubmit={submit} className="form-stack compact"><Field label="E-poçt"><input className="control" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></Field><Field label="Şifrə"><input className="control" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></Field>{error?<p className="field-error">{error}</p>:null}<button className="primary-btn" disabled={loading}>{loading?<Loader2 className="spin" size={20}/>:null}Daxil ol</button></form></div></main>
}

function Unauthorized({email}:{email:string}){return <main className="center-page"><div className="card login-card center-text"><ShieldCheck className="muted"/><h1>Giriş icazəsi yoxdur</h1><p className="muted">{email} hesabına administrator səlahiyyəti verilməyib.</p><button className="primary-btn" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/> Çıxış</button></div></main>}


function AddAdminCard(){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')

  async function createAdmin(){
    const cleanEmail=email.trim().toLowerCase()
    setMessage("")
    setError("")
    if(!cleanEmail){setError("E-poçt daxil et.");return}
    if(password.length<8){setError("Şifrə ən azı 8 simvol olmalıdır.");return}
    setLoading(true)
    try{
      const {data}=await supabase.auth.getSession()
      const token=data.session?.access_token
      if(!token) throw new Error("Admin sessiyası tapılmadı. Yenidən daxil ol.")
      const res=await fetch("https://tec-qeydiyyat-portal.lovable.app/api/public/create-admin",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({email:cleanEmail,password})})
      const result=await res.json().catch(()=>({})) as {success?:boolean;message?:string;error?:string}
      if(!res.ok||!result.success) throw new Error(result.error||"Admin hesabı yaradıla bilmədi.")
      setMessage(result.message||"Yeni admin uğurla yaradıldı.")
      setEmail("")
      setPassword("")
    }catch(err){setError(err instanceof Error?err.message:"Xəta baş verdi.")}
    finally{setLoading(false)}
  }

  return (
    <div className="card add-admin-card">
      <div className="add-admin-head">
        <h2>Yeni admin əlavə et</h2>
        <p className="muted">Yeni administrator üçün e-poçt və ilkin şifrə təyin et.</p>
      </div>

      <form
        className="add-admin-grid"
        onSubmit={e=>{
          e.preventDefault()
          void createAdmin()
        }}
      >
        <label>
          <span>E-poçt</span>
          <input
            className="control"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="off"
            required
          />
        </label>

        <label>
          <span>İlkin şifrə</span>
          <input
            className="control"
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Minimum 8 simvol"
            autoComplete="new-password"
            required
          />
        </label>

        <button className="primary-btn" disabled={loading}>
          {loading ? <Loader2 className="spin" size={18}/> : null}
          Admin əlavə et
        </button>
      </form>

      {message ? <p className="admin-success">{message}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}


function AdminDashboard({email}:{email:string}){
  const [rows,setRows]=useState<Member[]>([]); const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState(''); const [search,setSearch]=useState(''); const [faculty,setFaculty]=useState(''); const [specialty,setSpecialty]=useState(''); const [course,setCourse]=useState(''); const [sort,setSort]=useState<'new'|'old'>('new'); const [page,setPage]=useState(1); const [selected,setSelected]=useState<Member|null>(null)
  async function load(){setLoading(true);setLoadError(''); const {data,error}=await supabase.from('tec_members').select('*').order('created_at',{ascending:false}); if(error){console.error(error);setLoadError('Məlumatlara giriş icazəniz yoxdur və ya xəta baş verdi.');setRows([])}else setRows((data??[]) as Member[]);setLoading(false)}
  useEffect(()=>{void load()},[])
  const faculties=useMemo(()=>Array.from(new Set(rows.map(r=>r.faculty))).sort(),[rows]); const specialties=useMemo(()=>Array.from(new Set(rows.map(r=>r.specialty))).sort(),[rows]); const courses=useMemo(()=>Array.from(new Set(rows.map(r=>r.course))).sort(),[rows])
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase(); const list=rows.filter(r=>{const name=`${r.first_name} ${r.last_name}`.toLowerCase();return(!q||name.includes(q))&&(!faculty||r.faculty===faculty)&&(!specialty||r.specialty===specialty)&&(!course||r.course===course)});return sort==='new'?list:[...list].reverse()},[rows,search,faculty,specialty,course,sort])
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const currentPage=Math.min(page,totalPages); const pageRows=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const today=new Date();today.setHours(0,0,0,0); const weekAgo=new Date(Date.now()-7*86400000); const todayCount=rows.filter(r=>new Date(r.created_at)>=today).length; const weekCount=rows.filter(r=>new Date(r.created_at)>=weekAgo).length
  function exportCsv(){const headers=['Ad','Soyad','Ata adı','Doğum tarixi','Cins','Telefon','E-poçt','Fakültə','İxtisas','Kurs','Motivasiya','Dillər','Bacarıqlar','Əlavə qeyd','Qeydiyyat tarixi']; const lines=filtered.map(r=>[r.first_name,r.last_name,r.father_name,r.birth_date,r.gender,r.phone,r.email,r.faculty,r.specialty,r.course,r.membership_reason,(r.languages??[]).map(l=>`${l.language} (${l.level})`).join('; '),r.skills??'',r.additional_note??'',formatDate(r.created_at)].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')); const url=URL.createObjectURL(new Blob(['\uFEFF'+[headers.join(','),...lines].join('\n')],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download=`tec-qeydiyyatlar-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
  return <main className="page admin-page"><header className="site-header admin-header"><div className="content wide header-row"><div><h1>TEC İdarəetmə Paneli</h1><p>{email}</p></div><div className="header-actions"><button className="ghost-light" onClick={()=>void load()}>Yenilə</button><button className="ghost-light" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Çıxış</button></div></div></header>
    <div className="content wide admin-content">{loadError?<div className="card alert-error">{loadError}</div>:null}<div className="stats-grid">{[['Ümumi qeydiyyat sayı',rows.length],['Bu gün qeydiyyatdan keçənlər',todayCount],['Bu həftə qeydiyyatdan keçənlər',weekCount]].map(([label,value])=><div className="card stat" key={String(label)}><p>{label}</p><strong>{value}</strong></div>)}</div>
      <AddAdminCard />
      <div className="card filters"><div className="search-wrap"><Search size={18}/><input className="control" placeholder="Ad və ya soyad üzrə axtarış" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><div className="filter-grid"><select className="control" value={faculty} onChange={e=>{setFaculty(e.target.value);setPage(1)}}><option value="">Bütün fakültələr</option>{faculties.map(x=><option key={x}>{x}</option>)}</select><select className="control" value={specialty} onChange={e=>{setSpecialty(e.target.value);setPage(1)}}><option value="">Bütün ixtisaslar</option>{specialties.map(x=><option key={x}>{x}</option>)}</select><select className="control" value={course} onChange={e=>{setCourse(e.target.value);setPage(1)}}><option value="">Bütün kurslar</option>{courses.map(x=><option key={x}>{x}</option>)}</select><select className="control" value={sort} onChange={e=>setSort(e.target.value as 'new'|'old')}><option value="new">Əvvəlcə yenilər</option><option value="old">Əvvəlcə köhnələr</option></select></div><button className="outline-btn" onClick={exportCsv}><Download size={16}/> CSV olaraq yüklə</button></div>
      <div className="card records">{loading?<div className="loading-box"><Loader2 className="spin"/></div>:filtered.length===0?<div className="empty">Qeydiyyat tapılmadı.</div>:<><div className="mobile-cards">{pageRows.map(r=><button key={r.id} className="member-card" onClick={()=>setSelected(r)}><div className="member-top"><strong>{r.first_name} {r.last_name}</strong><span>{r.course}</span></div><p>{r.faculty}</p><p>{r.specialty}</p><div className="member-meta"><span>{r.phone}</span><span>{formatDate(r.created_at)}</span></div></button>)}</div><div className="desktop-table-wrap"><table><thead><tr><th>Ad Soyad</th><th>Fakültə</th><th>İxtisas</th><th>Kurs</th><th>Telefon</th><th>E-poçt</th><th>Qeydiyyat tarixi</th></tr></thead><tbody>{pageRows.map(r=><tr key={r.id} onClick={()=>setSelected(r)}><td><strong>{r.first_name} {r.last_name}</strong></td><td>{r.faculty}</td><td>{r.specialty}</td><td>{r.course}</td><td>{r.phone}</td><td>{r.email}</td><td>{formatDate(r.created_at)}</td></tr>)}</tbody></table></div></>}</div>
      {totalPages>1?<div className="pager"><button className="outline-btn" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Əvvəlki</button><span>{currentPage} / {totalPages}</span><button className="outline-btn" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>Növbəti</button></div>:null}
    </div>
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?`${selected.first_name} ${selected.last_name}`:''}>{selected?<dl className="details">{[['Ata adı',selected.father_name],['Doğum tarixi',selected.birth_date],['Cins',selected.gender],['Telefon',selected.phone],['E-poçt',selected.email],['Fakültə',selected.faculty],['İxtisas',selected.specialty],['Kurs',selected.course],['Motivasiya',selected.membership_reason],['Xarici dillər',(selected.languages??[]).map(l=>`${l.language} — ${l.level}`).join(', ')],['Bacarıqlar',selected.skills??'—'],['Əlavə qeyd',selected.additional_note??'—'],['Qeydiyyat tarixi',formatDate(selected.created_at)]].map(([k,v])=><div key={String(k)}><dt>{k}</dt><dd>{v||'—'}</dd></div>)}</dl>:null}</Modal>
  </main>
}
