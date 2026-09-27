import type { Topic } from './topic.js';

// ==========================================
// TECGPT — GEMINI-SİZ CAVAB BAZASI
// ==========================================

export const LOCAL_UNKNOWN_REPLY =
  'Bu barədə məndə təsdiqlənmiş məlumat yoxdur. ' +
  'Daha dəqiq məlumat üçün BAAU-nun rəsmi saytına ' +
  'və ya TEC-in rəsmi Instagram hesabına baxa bilərsən. 😊';

export const LOCAL_OFF_TOPIC_REPLY =
  'Mən BAAU və TEC haqqında məlumat vermək üçün yaradılmışam. 😊 ' +
  'Universitet, fakültələr, TEC üzvlüyü, tələbə həyatı və tədbirlər ' +
  'haqqında sual verə bilərsən.';

const ANSWERS: Record<string, string> = {
  baau:
    'Bakı Avrasiya Universiteti (BAAU) 1992-ci ildə əsası qoyulmuş ali təhsil müəssisəsidir.\n\n' +
    'Universitetdə bakalavriat, magistratura və doktorantura səviyyələrində təhsil istiqamətləri mövcuddur.\n\n' +
    'BAAU-da Regionşünaslıq və iqtisadiyyat fakültəsi və Filologiya fakültəsi fəaliyyət göstərir.\n\n' +
    'Rəsmi sayt: https://baau.edu.az',

  tec:
    'TEC — Bakı Avrasiya Universitetinin Tələbə Elmi Cəmiyyətidir. 😊\n\n' +
    'TEC tələbələrin elmi-tədqiqat və praktiki fəaliyyətlərinin təşkilinə, akademik inkişafına və tədqiqat bacarıqlarının artırılmasına dəstək verir.\n\n' +
    'Əsas fəaliyyət istiqamətləri:\n' +
    '• Elmi seminarlar\n' +
    '• Konfranslar\n' +
    '• Tədqiqat və elmi layihələr\n' +
    '• Tələbə klubları\n' +
    '• Bilik və təcrübə mübadiləsi\n\n' +
    'TEC haqqında yenilənən məlumatlar üçün @baau__tec hesabına baxa bilərsən.',

  membership:
    'BAAU Tələbə Elmi Cəmiyyətinə üzv olmaq üçün onlayn qeydiyyat formasından istifadə edə bilərsən. 😊\n\n' +
    'Qeydiyyat ünvanı:\nhttps://baautec.vercel.app\n\n' +
    'Sayta daxil olub üzvlük formasını doldura bilərsən.\n\n' +
    'Cari üzvlük şərtləri ilə bağlı əlavə məlumat üçün @baau__tec hesabına müraciət edə bilərsən.',

  'student-life':
    'BAAU-da tələbə həyatı yalnız dərslərlə məhdudlaşmır. 😊\n\n' +
    'Tələbələr elmi fəaliyyət, könüllülük, mədəni tədbirlər, idman, intellektual yarışlar, tələbə klubları, beynəlxalq proqramlar, təlimlər, seminarlar və konfranslarda iştirak edə bilərlər.\n\n' +
    'Əsas tələbə strukturlarından ikisi TEC və TGT-dir. TEC daha çox elmi və akademik fəaliyyətə, TGT isə ictimai fəaliyyət və könüllülük istiqamətlərinə yönəlir.',

  clubs:
    'BAAU TEC-in rəsmi mənbələrində adı çəkilən klublara Yazıçılar klubu, Debat klubu və Oxucular klubu daxildir. 😊\n\n' +
    'Bu məlumatların bir hissəsi 2024-cü ilə aiddir. Klubların hazırkı fəaliyyəti və rəhbərləri ayrıca təsdiqlənməlidir.\n\n' +
    'Cari klub siyahısı üçün @baau__tec hesabına müraciət edə bilərsən.',

  study:
    'BAAU-da iki əsas fakültə fəaliyyət göstərir:\n\n' +
    '1. Regionşünaslıq və iqtisadiyyat fakültəsi\n' +
    '2. Filologiya fakültəsi\n\n' +
    'Təhsil pillələri:\n' +
    '• Bakalavriat\n' +
    '• Magistratura\n' +
    '• Doktorantura / dissertantura\n\n' +
    'İxtisaslara İnformasiya texnologiyaları, Beynəlxalq münasibətlər, İqtisadiyyat, Maliyyə, Biznesin idarə edilməsi, Filologiya və Tərcümə kimi istiqamətlər daxildir.\n\n' +
    'Dəqiq qəbul planı, yerlər və təhsil haqqı dəyişə bilər. Cari məlumat üçün https://baau.edu.az saytına bax.',

  library:
    'BAAU-da Kitabxana və İnformasiya Mərkəzi fəaliyyət göstərir. 📚\n\n' +
    'Mövcud imkanlara çap kitabları, elmi ədəbiyyat, elektron kitabxana, qiraət zalı, elektron resurslar, kompüter və internet imkanları daxildir.\n\n' +
    'Kitabxana və İnformasiya Mərkəzi 2023-cü ildə yenilənib.',

  housing:
    'BAAU-nun “Tələbə dünyası” adlı qız tələbələr üçün yataqxanası haqqında məlumat mövcuddur.\n\n' +
    'Bilik bazasında yataqxananın 5 mərtəbəli olduğu və 2, 4, 6 nəfərlik otaqların mövcud ola bildiyi göstərilir.\n\n' +
    'İmkanlara internet, oxu zalları, yeməkxana və camaşırxana daxildir.\n\n' +
    'Qiymət, boş yerlər və cari qəbul şərtləri barədə təsdiqlənmiş aktual məlumatım yoxdur. Rəsmi sayt: https://baau.edu.az',

  career:
    'BAAU-da tələbələrin karyera və peşəkar inkişafına dəstək göstərən fəaliyyətlər mövcuddur. 💼\n\n' +
    'Dəstək istiqamətlərinə CV hazırlama, müsahibə bacarıqları, karyera planlaması, təcrübə imkanları, mentorluq və əmək bazarına hazırlıq daxildir.\n\n' +
    'Cari təcrübə elanları və proqramlar üçün universitetin rəsmi məlumatlarını yoxlamaq lazımdır.',

  exchange:
    'BAAU beynəlxalq əməkdaşlıq və akademik mobillik istiqamətində fəaliyyət göstərir. 🌍\n\n' +
    'Bilik bazasında adı çəkilən mübadilə proqramları:\n' +
    '• Erasmus+\n' +
    '• Mövlana Mübadilə Proqramı\n' +
    '• Orhun Mübadilə Proqramı\n\n' +
    'Cari müraciət tarixləri, şərtlər və tərəfdaş universitetlər rəsmi elanlardan dəqiqləşdirilməlidir.',

  research:
    'BAAU-da tələbələr elmi konfranslar, seminarlar, vebinarlar, elmi məqalələr, tədqiqat layihələri və beynəlxalq elmi əməkdaşlıq kimi fəaliyyətlərə qoşula bilərlər. 🔬\n\n' +
    'Tələbə Elmi Cəmiyyəti də tələbələrin elmi fəaliyyətə cəlb edilməsində iştirak edir.\n\n' +
    'Ətraflı və cari məlumat üçün @baau__tec hesabına baxa bilərsən.',

  events:
    'BAAU TEC seminarlar, konfranslar, elmi görüşlər və layihələr kimi fəaliyyətlərdə iştirak edir.\n\n' +
    'Hazırkı tədbirlərin dəqiq tarixləri və qeydiyyat şərtləri barədə canlı məlumatım yoxdur.\n\n' +
    'Son elanlar üçün Instagram: @baau__tec',

  leadership:
    'Bilik bazasındakı məlumatlara görə BAAU-nun rektoru Səyavuş Kamran oğlu Qasımovdur.\n\n' +
    'BAAU TEC üzrə 22 sentyabr 2026-cı il tarixli məlumatda sədr Rəşad Əliyev kimi göstərilir. Sədr müavini barədə təsdiqlənmiş məlumat yoxdur.\n\n' +
    'Rəhbərlik və vəzifələr dəyişə bildiyi üçün cari vəziyyəti rəsmi mənbədən yoxlamaq lazımdır.',

  location:
    'Bilik bazasında Bakı Avrasiya Universitetinin cari rəsmi ünvanı belə göstərilir:\n\n' +
    'AZ-1110, Bakı şəhəri, Nərimanov rayonu, İsa Bulağı küçəsi 18.\n\n' +
    'Əvvəlki ünvan adı Akademik Həsən Əliyev küçəsi 135 A olub.\n\n' +
    'TEC-in otağı və universitet korpuslarının cari yerləşməsi dəyişə bildiyi üçün otaq nömrəsini təsdiqlənmiş cari məlumat olmadan demirəm.\n\n' +
    'Rəsmi sayt: https://baau.edu.az',

  contact:
    'BAAU və TEC haqqında məlumat almaq üçün bu mənbələrdən istifadə edə bilərsən:\n\n' +
    'BAAU rəsmi saytı: https://baau.edu.az\n\n' +
    'TEC üzvlük qeydiyyatı: https://baautec.vercel.app\n\n' +
    'TEC Instagram: @baau__tec',
};

export function getLocalAnswer(topic: Topic): string | null {
  if (!topic || typeof topic.id !== 'string') {
    return null;
  }

  const ids = topic.id.split('+');

  if (ids.length === 0 || ids.length > 3) {
    return null;
  }

  if (
    ids.some(
      id => !Object.prototype.hasOwnProperty.call(ANSWERS, id)
    )
  ) {
    return null;
  }

  const uniqueIds = [...new Set(ids)];
  return uniqueIds.map(id => ANSWERS[id]).join('\n\n---\n\n');
}
