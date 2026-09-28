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

Groq konfiqurasiya olunanda model son 8 mesajı və BAAU/TEC bilik bazasından seçilmiş bölmələri görür. Son istifadəçi niyyətini kontekstdə anlayır; assistant tarixçəsi fakt mənbəyi sayılmır. Cavablar yalnız BAAU, TEC və əlaqəli universitet həyatı ilə məhdudlaşdırılır.

Server dəyişənləri: GROQ_API_KEY, istəyə bağlı GROQ_MODEL (default openai/gpt-oss-120b), KV_REST_API_URL, KV_REST_API_TOKEN. Açarı VITE_ prefiksi ilə frontend-ə çıxarmayın.

Model cavabı scope, təsdiqlənmiş cavab bayrağı və reply JSON formatındadır. Fakt bilik bazasında yoxdursa server uydurma cavabı gizlədir, təsdiqlənmiş məlumatın olmadığını deyir və BAAU/TEC rəsmi səhifələrinə yönləndirir. Mövzudan kənar və şəxsi məlumat sorğularında server hazır sərhəd cavabı qaytarır. Modelin semantik qərarı qüsursuz təhlükəsizlik zəmanəti deyil. Yanlış URL, yarımçıq/boş/malformed cavab və provider xətalarında lokal ehtiyat cavabı işləyir; qonaq interfeysi sadə rejimə keçidi göstərir.

Yoxlama: npm run test:security və npm run build. Ətraflı qaydalar: TECGPT-GUARDRAILS.md.
