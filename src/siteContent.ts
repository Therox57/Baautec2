export const instagram = 'https://www.instagram.com/baau__tec/'
export const clubs = [
  {id:'readers',name:'Oxucular Klubu',leader:'Röya Məmmədova',tag:'Kitab · Müzakirə · Yeni baxışlar',description:'Kitab oxumağa marağını başqaları ilə bölüş. Mütaliə görüşləri, kitab müzakirələri və ədəbi oyunlarda iştirak et.',activities:['Kitab müzakirələri və mütaliə görüşləri','Yazıçı və ədəbiyyat nümayəndələri ilə görüşlər','Kitab tövsiyələri, sərgilər və mübadilə'],icon:'book'},
  {id:'writers',name:'Yazıçılar Klubu',leader:'Məryəm Əliyeva',tag:'Yaradıcılıq · Söz · Özünü ifadə',description:'Şeir, hekayə və esse yazırsansa, yaradıcılığını inkişaf etdirmək və əsərlərini paylaşmaq üçün bu klubu kəşf et.',activities:['Şeir, hekayə və esse müsabiqələri','Yazı texnikası üzrə təlimlər','Ədəbi gecələr və açıq mikrofon'],icon:'pen'},
  {id:'debate',name:'Debat Klubu',leader:'Zamiq Rəhmanlı',tag:'Fikir · Arqument · Natiqlik',description:'Fikrini əsaslandırmağı, fərqli baxışları dinləməyi və auditoriya qarşısında danışmağı debatlarla inkişaf etdir.',activities:['Aktual mövzularda və parlament debatları','Debat və natiqlik təlimləri','Universitetlərarası debat yarışları'],icon:'talk'},
] as const
export type PlannedEvent = {id:string;date:string;title:string;club:string;format:string;note?:string}
export const events:PlannedEvent[] = [
  {id:'r1',date:'2026-10-21',title:'Martin İden — Cek London',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'d1',date:'2026-10-14',title:'Feminizm: azadlıq yoxsa ayrıseçkilik?',club:'Debat Klubu',format:'Sosial debat'},
  {id:'r2',date:'2026-10-28',title:'İçimizdəki Şeytan — Sabahattin Ali',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r3',date:'2026-11-11',title:'Aylak Adam — Yusuf Atılgan',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r4',date:'2026-11-25',title:'Yeraltından Qeydlər — Dostoyevski',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r5',date:'2026-12-09',title:'Yüz ilin Tənhalığı — Qabriel Qarsia Markes',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'d2',date:'2026-12-16',title:'Qloballaşma və milli kimlik',club:'Debat Klubu',format:'Akademik debat'},
  {id:'r6',date:'2026-12-23',title:'Notre-Dame de Paris — Viktor Hüqo',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r7',date:'2027-01-27',title:'Çöküş — Albert Camus',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'d3',date:'2027-02-22',title:'Sosial medianın həyatımıza təsiri',club:'Debat Klubu',format:'Açıq müzakirə'},
  {id:'r9',date:'2027-03-10',title:'Şəxsi otaq — Virginia Woolf',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r10',date:'2027-03-24',title:'Belə Buyurdu Zərdüşt — Fridrix Nitşe',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'d4',date:'2027-03-24',title:'Süni intellekt: insan üçün imkan yoxsa təhlükə?',club:'Debat Klubu',format:'Tələbələrarası debat'},
  {id:'r11',date:'2027-04-07',title:'Dəyərsiz bir Həyat — Hanya Yanagihara',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'d5',date:'2027-04-16',title:'Gənclərin cəmiyyətdə rolu',club:'Debat Klubu',format:'Açıq müzakirə'},
  {id:'r12',date:'2027-04-21',title:'Film müzakirəsi',club:'Oxucular Klubu',format:'Film və fikir mübadiləsi',note:'Film iştirakçıların marağına uyğun seçiləcək.'},
  {id:'r13',date:'2027-05-05',title:'Karamazov Qardaşlar — Dostoyevski',club:'Oxucular Klubu',format:'Kitab müzakirəsi'},
  {id:'r14',date:'2027-05-22',title:'Film müzakirəsi',club:'Oxucular Klubu',format:'Film və fikir mübadiləsi',note:'Film iştirakçıların marağına uyğun seçiləcək.'},
]
export const writersPlan = [
 ['Oktyabr 2026','Klubun təqdimatı və yeni üzvlərin qəbulu'],['Noyabr 2026','Gənc yazarlarla görüş'],['Dekabr 2026','Şeir və hekayə müsabiqəsi'],['Yanvar 2027','Ədəbi müzakirə və fəaliyyətlərin planlaşdırılması'],['Fevral 2027','“Hekayə necə yazılır?” yaradıcılıq təlimi'],['Mart 2027','Şeir gecəsi / açıq mikrofon'],['Aprel 2027','Yazıçı və ya şairlə görüş'],['May 2027','Elektron ədəbi toplunun hazırlanması'],['İyun 2027','Yekun ədəbi tədbir və fəaliyyət hesabatı'],
]
export function dateLabel(date:string){return new Date(date+'T12:00:00+04:00').toLocaleDateString('az-AZ',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Baku'})}
export function upcomingEvents(){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return events.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))}
