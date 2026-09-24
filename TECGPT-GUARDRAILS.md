# TECGPT backend qoruması

Əsas: `Therox57/Baautec2`, `origin/main` commit `72e6795`. `origin/tecgpt-beta` bu commit-dən köhnədir. İş branch-i: `tecgpt-guardrails`.

## Davranış

- `/api/tecgpt` və `/api/tecgpt-guest` eyni mövzu filtrindən və Gemini xidmətindən istifadə edir.
- Son mesaj məhdud, yoxlanmış sözlük ilə standart BAAU/TEC mövzusuna çevrilir. Naməlum sözlər, kod, qarışıq mövzudan kənar istəklər və gizli Unicode simvolları yerli izahla rədd edilir. Rədd cavabı mövcud chat interfeysi ilə uyğun `200 {reply, model: 'local', rejected: true}` formatındadır.
- İstifadəçi mesajı və müştərinin göndərdiyi assistant tarixçəsi Gemini-yə ötürülmür. Bu, prompt injection üçün əsas giriş yolunu bağlayır. Filtr semantik süni intellekt deyil: bəzi düzgün, lakin tanınmayan ifadələr də rədd edilə bilər. Sözlük yeni test nümunələri ilə genişləndirilməlidir. Azərbaycan və məhdud ingilis ifadələri qəbul edilir, cavab Azərbaycan dilindədir. Kontekstdən asılı “bəs necə?” tipli davam sualı açıq mövzu ilə yenidən yazılmalıdır.
- Əvvəlki Supabase istifadəçi/rol yoxlamaları və IP/user limitləri saxlanılıb. Rədd edilən mövzu üçün yalnız sabit ictimai izah qaytarılır, autentifikasiya və xarici xidmət çağırılmır. Keçərli suallar üçün cache hit də daxil olmaqla əvvəlki IP/user limitləri işləyir.
- Qonaq: 10/dəqiqə, 60/saat; giriş IP-si: 60/dəqiqə; istifadəçi: 20/dəqiqə, 200/saat. Əvvəlki ayrı gündəlik request sayğacları əvəzinə bütün istifadəçilər və endpoint-lər üçün 1000/gün Gemini cəhd büdcəsi tətbiq olunur. Retry və fallback də ayrıca sayılır. Bu rəqəm Google layihəsinin real kvotasına uyğun tənzimlənməlidir.
- Redis cache TTL 300 saniyədir; açar bilik bazası, qaydalar, kanonik mövzu və model parametrlərindən asılıdır. Yalnız standart ictimai cavab saxlanılır, fərdi sual/tarixçə saxlanılmır. Xətalar və yarımçıq cavab cache edilmir. Bilik bazası dəyişəndə əvvəlki cavablar istifadə edilmir.
- Paralel eyni suallar Redis `SET NX` kilidi ilə məhdudlaşdırılır, kilid yalnız sahibi tərəfindən silinir. TTL 40 saniyədir. Redis işləmirsə yeni Gemini sorğusu göndərilmir.
- Hər Gemini cəhdi 6.5 saniyə timeout: əsas model maksimum iki dəfə, müvəqqəti xətalar davam edərsə fallback bir dəfə. Artan gecikmə və təsadüfi kiçik əlavə tətbiq edilir. 400/401/403/404, boş və bloklanmış cavablar təkrarlanmır.
- 429 halında əlavə model çağırılmır; Retry-After əsasında 60–3600 saniyə ümumi fasilə, digər uğursuz nəticədə 15 saniyə fasilə qoyulur. Cache-dəki uğurlu cavablar fasilədə də işləyir. Fallback mətnində rəsmi ünvanlar verilir; bu cavab AI fakt cavabı kimi göstərilmir (`degraded: true`).

## Konfiqurasiya və yoxlama

Yeni paket lazım deyil. Mövcud server dəyişənləri: `GEMINI_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` və mövcud Supabase URL/publishable key. Heç bir secret frontend dəyişəninə yazılmamalıdır. İstəyə bağlı `GEMINI_MODEL` və `GEMINI_FALLBACK_MODEL` mövcud model adlarını əvəz edir. Default model adları işləyən koddan saxlanılıb; bu işdə canlı model əlçatanlığı sınaqdan keçirilməyib.

`npm ci --ignore-scripts`, `npm run test:security`, `npm run build`.

13 test keçdi: mövzu nümunələri, injection/Unicode/şəxsi məlumat istəkləri, hər iki endpoint-də şəbəkəsiz rədd, saxta tarixçə, cache və model açarı, retry/backoff/fallback, 429 fasiləsi, boş/permanent xəta, bağlı Redis, büdcə və paralel kilid; əvvəlki dörd təhlükəsizlik testi də daxildir. Xarici xidmətlər testlərdə əvəzlənib. Canlı Redis, Supabase və Gemini inteqrasiyası və production deploy bu işdə edilməyib. Build keçdi.

Deploy-dan əvvəl staging-də mövcud giriş/rol, Redis limitləri, normal BAAU sualı, təkrar sual və əlaqəsiz sual yoxlanmalıdır. Redis backend açarları yalnız etibarlı server xidmətləri üçün olmalıdır. Dəyişiklik API xərclərini azaldır, sıfır xərc və ya heç vaxt xəta olmaması zəmanəti vermir.

Texniki istinadlar: https://ai.google.dev/gemini-api/docs/troubleshooting və https://supabase.com/docs/reference/javascript/auth-getuser .
