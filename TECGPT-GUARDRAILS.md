# TECGPT backend qoruması

İş branch-i: `tecgpt-local-ai`

TECGPT hazırda hibrid arxitekturaya keçir:

- dəqiq və sadə BAAU/TEC sualları yerli cavab bazasından cavablanır;
- sərbəst və təbii BAAU/TEC sualları təhlükəsiz scope yoxlamasından sonra Groq-a göndərilə bilər;
- Groq işləməsə, limitə düşsə və ya cavab etibarsız sayılsa yerli fallback cavabı istifadə olunur.

## Mövzu sərhədi

TECGPT yalnız Bakı Avrasiya Universiteti (BAAU) və BAAU Tələbə Elmi Cəmiyyəti (TEC) haqqında cavab verməlidir.

Sadə suallar üçün `classifyTopic()` sərt lokal filtr kimi qalır. Bu filtr tanınmış BAAU/TEC mövzularını qəbul edir və əlaqəsiz, qarışıq, injection, gizli Unicode və şəxsi məlumat sorğularını yerli şəkildə rədd edir.

Sərbəst danışıq üçün `resolveGroqTopic()` ayrıca məhdudlaşdırılmış yol açır:

- son mesajda açıq BAAU/TEC anchor-u olmalıdır; və ya
- yalnız qısa, əvvəlki tanınmış BAAU/TEC mövzusuna aid davam ifadələri qəbul edilir;
- davam konteksti yalnız əvvəlki istifadəçi mesajından götürülür, client-in göndərdiyi assistant tarixçəsi etibar mənbəyi deyil;
- prompt injection, sistem promptu, API key/token/parol, telefon/e-mail, malware/hack, açıq off-topic və kod yazma tipli istəklər provider-ə buraxılmır.

## Groq istifadəsi

Default model:

`openai/gpt-oss-20b`

Endpoint:

`https://api.groq.com/openai/v1/chat/completions`

Groq-a tam TECGPT bilik bazası və ya sərbəst sistem məlumatı göndərilmir. Cari implementasiyada yalnız `getLocalAnswer(topic)` ilə seçilmiş təsdiqlənmiş BAAU/TEC konteksti provider promptuna daxil edilir.

Provider qaydaları:

- yalnız `VERIFIED_CONTEXT` fakt mənbəyidir;
- modeldən həmin kontekstdən kənar fakt əlavə etməmək tələb olunur;
- browser search və başqa tool verilmir;
- yeni URL uydurmaq qadağandır;
- cavabda kontekstdə olmayan URL aşkarlanarsa cavab qəbul edilmir və lokal fallback işləyir;
- cavab boş, həddən artıq uzun və ya provider xətalı olarsa lokal fallback işləyir;
- Groq üçün ayrıca retry yoxdur; burst və xərci böyütməmək üçün bir provider cəhdi edilir.

## Limitlər

İstifadəçi limitləri:

- qonaq: 10/dəqiqə, 60/saat;
- giriş IP-si: 60/dəqiqə;
- giriş etmiş istifadəçi: 20/dəqiqə, 200/saat.

Groq Free üçün əlavə qlobal qoruma:

- provider: 6 sərbəst sorğu/dəqiqə;
- provider: 900 sərbəst sorğu/gün.

Bu limitlər Groq-un pulsuz planındakı request və token limitlərinə ehtiyat payı saxlamaq üçündür. Provider limiti dolanda istifadəçiyə 429 göstərmək əvəzinə mümkün olduqda yerli BAAU/TEC cavabı qaytarılır.

## Admin endpoint

`/api/tecgpt` əvvəlcə Bearer tokeni, Supabase istifadəçisini və `admin` / `tester` rolunu yoxlayır. Girişsiz istifadəçi hətta lokal salamlaşma cavabı da ala bilmir.

`/api/tecgpt-guest` ictimai endpoint-dir, amma request validation, mövzu filtri və Redis limitləri saxlanılır.

## Konfiqurasiya

Server dəyişənləri:

- `GROQ_API_KEY` — sərbəst cavabları aktiv edir;
- `GROQ_MODEL` — istəyə bağlı model override;
- `KV_REST_API_URL`;
- `KV_REST_API_TOKEN`;
- mövcud Supabase URL və publishable key dəyişənləri.

`GROQ_API_KEY` frontend dəyişəni olmamalıdır və repository-yə yazılmamalıdır.

Əgər `GROQ_API_KEY` yoxdursa TECGPT tam dayanmaz; sərbəst suallar da mümkün olduqda lokal fallback ilə cavablanır.

## Yoxlama

Əsas yoxlamalar:

```bash
npm ci --ignore-scripts
npm audit --audit-level=high
npm run test:security
npm run build
```

Testlər aşağıdakıları əhatə edir:

- BAAU/TEC scope qəbul və rədd nümunələri;
- injection, private-data və off-topic qoruması;
- saxta assistant tarixçəsinin yeni mövzu açmaması;
- lokal üzvlük və link davamı;
- admin girişsiz cavab verməməsi;
- sərbəst TEC sualının Groq route-a çevrilməsi;
- əvvəlki istifadəçi mesajından təhlükəsiz follow-up;
- Groq request-in yalnız verified local context istifadə etməsi;
- 429 və etibarsız URL zamanı lokal fallback.

Production deploy-dan əvvəl canlı Supabase, Redis və Groq inteqrasiyası preview/staging mühitində ayrıca yoxlanmalıdır.
