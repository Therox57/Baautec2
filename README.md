# BAAU TEC Membership Portal — portable source

Bu paket Lovable kreditindən asılı olmadan işləmək üçün təmiz Vite + React versiyasıdır. Mövcud Supabase/Lovable Cloud backend dəyişdirilmir: `tec_members`, `user_roles`, admin giriş və RLS siyasətləri olduğu kimi istifadə olunur.

## Daxildir
- İctimai TEC üzvlük formu və mövcud validasiyalar
- Mövcud `tec_members` cədvəlinə qeydiyyat yazılması
- `/admin` giriş, `user_roles` üzərindən admin yoxlaması
- Axtarış, fakültə/ixtisas/kurs filtrləri, sıralama, statistika, pagination, CSV
- Mobil admin görünüşündə üfüqi geniş cədvəl əvəzinə kartlar
- Səhifə açılışında 2.1 saniyəlik tam ekran TEC intro animasiyası
- `prefers-reduced-motion` dəstəyi

## Logo
Hazırda `VITE_TEC_LOGO_URL` mövcud Lovable assetinə işarə edir ki, eyni rəsmi logo göstərilsin. Tam Lovable müstəqilliyi üçün rəsmi `baau-tec-official.png` faylını `public/` qovluğuna qoyun və dəyişəni `/baau-tec-official.png` edin.

## Local run
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```

## Vacib təhlükəsizlik
Frontend-də yalnız publishable Supabase açarı istifadə olunur. Heç vaxt service-role və ya `sb_secret_...` açarını frontend/repository-yə əlavə etməyin. Məlumatların qorunması Supabase RLS ilə davam edir.


## TECGPT — söhbət + lokal ehtiyat cavabları

OpenRouter konfiqurasiya olunanda model son 8 mesajı, BAAU/TEC bilik bazasından seçilmiş bölmələri və adminin mənbə ilə təsdiqlədiyi uyğun cavabları görür. BAAU/TEC faktlarını bu mənbələrdən, ümumi mövzulara cavabları isə modelin öz biliyindən alır. Azərbaycan dilində rahat danışır, istifadəçinin istədiyi dilə və izah uzunluğuna uyğunlaşır. Assistant tarixçəsi fakt mənbəyi sayılmır. OpenRouter ayrıca məlumat bazası və ya canlı internet axtarışı deyil.

Vercel-də server dəyişənləri: `TECGPT_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, istəyə bağlı `OPENROUTER_MODEL` (default `openai/gpt-oss-120b`), mövcud `KV_REST_API_URL` və `KV_REST_API_TOKEN`. OpenRouter açarında kredit olmalıdır. Dəyişənləri hədəf mühitə əlavə etdikdən sonra həmin mühiti yenidən deploy edin. Açarı çata, repository-yə və ya `VITE_` prefiksi ilə frontend-ə çıxarmayın. Köhnə `TECGPT_PROVIDER=groq` və ya `local` dəyəri varsa, onu `openrouter` ilə əvəz edin; Groq yalnız açıq şəkildə `TECGPT_PROVIDER=groq` seçildikdə işləyir.

Model cavabı scope, təsdiqlənmiş cavab bayrağı və reply JSON formatındadır. BAAU/TEC faktı bilik bazasında yoxdursa server təsdiqlənmiş məlumatın olmadığını deyir və rəsmi mənbələrə yönləndirir. Ümumi suallar üçün institusional mənbə tələb olunmur. Qeydiyyat bazasındakı şəxsi tələbə məlumatları modelə ötürülmür. Şəxsi məlumat sorğuları, natamam/boş/səhv formatlı cavablar və BAAU/TEC cavablarında naməlum linklər yoxlanılır. Modelin semantik qərarı qüsursuz təhlükəsizlik zəmanəti deyil. Aktiv provider cavab verməsə, API yenidən cəhd edilə bilən xəta qaytarır; provider açarı yoxdursa məhdud lokal ehtiyat rejimi qalır.

Yoxlama: npm run test:security və npm run build. Ətraflı qaydalar: TECGPT-GUARDRAILS.md.
