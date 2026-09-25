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


## TECGPT — lokal + Groq

TECGPT BAAU/TEC mövzusunu lokal təhlükəsizlik filtri ilə yoxlayır. Salam və bəzi sadə keçid cavabları lokal qalır; digər təsdiqlənmiş BAAU/TEC söhbətləri Groq tərəfindən verified lokal faktlar əsasında təbii formada qurulur.

Server environment dəyişənləri:

```text
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-20b
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

`GROQ_API_KEY` heç vaxt `VITE_` prefiksi ilə frontend-ə çıxarılmamalıdır. Açar yoxdursa TECGPT lokal fallback ilə işləməyə davam edir.

Groq konfiqurasiya olunubsa, normal BAAU/TEC sualları və təhlükəsiz davam mesajları Groq-a gedir. Provider limit/xəta zamanı TECGPT lokal cavaba geri dönür. Assistant tarixçəsi fakt mənbəyi kimi provider-ə ötürülmür; davam konteksti yalnız uyğun istifadəçi mesajlarından qurulur.

Ətraflı təhlükəsizlik qaydaları üçün `TECGPT-GUARDRAILS.md` faylına baxın.
