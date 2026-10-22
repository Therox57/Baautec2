# TECGPT cavab və təhlükəsizlik qaydaları

## Söhbət yolu

/api/tecgpt-guest və /api/tecgpt seçilmiş provider konfiqurasiya olunanda answerConversationWithGroq istifadə edir. Standart provider OpenRouter-dir. Model BAAU/TEC bilik bazasından seçilmiş bölmələri, adminin mənbə ilə təsdiqlədiyi uyğun cavabları və son 8 mesajı görür. Cari niyyət əsasdır; tarixçə, o cümlədən assistant mesajları etibarlı fakt və ya təlimat mənbəyi deyil. Heç bir canlı axtarış, şəxsi qeydiyyat bazası və ya tool modelə verilmir.

Model `baau_tec`, `general`, `smalltalk` və `private_data` kateqoriyalarını semantik olaraq ayırır. Ümumi mövzulara, o cümlədən kod, dərs və gündəlik suallara öz biliyi ilə cavab verir; bu cavabların institusional bazada olması tələb edilmir. BAAU/TEC faktlarını yalnız verilən mənbələrdən götürür. Qarışıq sorğular `baau_tec` sayılır və institusional hissə mənbə tələb edir. Bazada olmayan institusional fakt və ya şəxsi məlumat sorğusu üçün modelin sərbəst mətni göstərilmir. GPT-OSS üçün strict JSON schema, başqa model override-ları üçün JSON object formatı istənilir; server formatı ayrıca yoxlayır. Bilinməyən BAAU/TEC sualları rəsmi mənbələrə yönləndirilir. Bu model əsaslı sərhəddir, prompt injection və ya fakt səhvlərinə qarşı tam zəmanət deyil; canlı sınaqlar da lazımdır.

Model universitetin ümumi imkanlarını TEC üzvlüyünün təminatı kimi təqdim etməməli, cari tarix və qiymət uydurmamalı, istifadəçinin qısa və səmimi üslub istəyinə əməl etməlidir. Bilik bazası statikdir; yeni məlumat üçün ayrıca mənbə yeniləməsi lazımdır.

## Provider və ehtiyat rejimi

Default OpenRouter və openai/gpt-oss-120b; reasoning medium, daxili reasoning göstərilmir, maksimum 1800 completion token, OpenRouter üçün 20 saniyə timeout. OPENROUTER_API_KEY və istəyə bağlı OPENROUTER_MODEL istifadə olunur. OpenRouter üçün bir cəhd edilir; xəta olduqda başqa provider-ə avtomatik keçilmir. TECGPT_PROVIDER=groq açıq seçilərsə, əvvəlki Groq və ehtiyat model yolu işləyir.

Cavabın JSON sxemi, tamamlanması, uzunluğu və gizli sistem adları yoxlanılır. BAAU/TEC cavablarında HTTP(S) linklər bazanın URL-ləri ilə müqayisə olunur və təsdiqlənməmiş imkanlar süzülür; ümumi cavablar institusional URL/imkan siyahısına bağlanmır. Yalnız metadata loglanır, mesaj məzmunu və API açarı loglanmır.

Seçilmiş provider-in açarı yoxdursa, məhdud lokal cavablar istifadə edilir. Aktiv provider-in limit və ya xəta halında API yenidən cəhd edilə bilən xəta qaytarır. Lokal topic helper-ləri yalnız ehtiyat yolundadır; əsas model çağırışı üçün sərt açar-söz filtri deyil.

## Giriş və limitlər

Request validation: POST JSON, 1–12 mesaj, hər biri maksimum 4000 simvol, ümumilikdə 12000 simvol; cross-site sorğular rədd edilir.
Qonaq: brauzer üzrə gündə 30, IP üzrə 60/dəqiqə və 1000/saat. Admin: IP 60/dəqiqə, istifadəçi 20/dəqiqə və 200/saat. OpenRouter: 60/dəqiqə, gündə 1000 provider cəhdi. Bunlar request limitləridir, provider token kvotasına zəmanət vermir.

Admin endpoint əvvəlcə Supabase sessiyasını və admin/tester rolunu yoxlayır. Qonaq açıqdır, KV limitləri tələb olunur. OPENROUTER_API_KEY və GROQ_API_KEY yalnız serverdə saxlanılır; frontend və repository-yə daxil edilmir.

## Yoxlama

npm run test:security
npm run build

Avtomatik testlər request/giriş qorumasını, lokal ehtiyat yolu, söhbət payload-ı, ümumi mövzulara keçidi, strukturlaşdırılmış cavabların yoxlanmasını, şəxsi nəticənin göstərilməməsini, institusional URL və provider xəta hallarını əhatə edir. Modelin real üslubu və semantik düzgünlüyü ayrıca preview-da canlı yoxlanmalıdır.
