# TECGPT cavab və təhlükəsizlik qaydaları

## Söhbət yolu

/api/tecgpt-guest və /api/tecgpt Groq konfiqurasiya olunanda answerConversationWithGroq istifadə edir. Model BAAU/TEC bilik bazasından seçilmiş bölmələri və son 8 mesajı görür. Cari niyyət əsasdır; tarixçə, o cümlədən assistant mesajları etibarlı fakt və ya təlimat mənbəyi deyil. Heç bir axtarış, qeydiyyat bazası və ya tool modelə verilmir.

Model BAAU/TEC, salamlaşma, mövzudan kənar və şəxsi məlumat sorğularını semantik olaraq ayırır; konkret fakt bazada yoxdursa bunu ayrıca bildirir və sərbəst cavabı göstərmir. GPT-OSS üçün strict JSON schema, başqa model override-ları üçün JSON object formatı istənilir; server formatı ayrıca yoxlayır. Mövzudan kənar/şəxsi məlumat və bazada olmayan konkret fakt nəticəsində modelin sərbəst mətni göstərilmir. Bilinməyən TEC sualı BAAU rəsmi saytına və TEC Instagram səhifəsinə, digər bilinməyən BAAU sualı BAAU rəsmi saytına yönləndirilir. Bu model əsaslı sərhəddir, prompt injection və ya fakt səhvlərinə qarşı tam zəmanət deyil; adversarial canlı sınaqlar da lazımdır.

Model universitetin ümumi imkanlarını TEC üzvlüyünün təminatı kimi təqdim etməməli, cari tarix və qiymət uydurmamalı, istifadəçinin qısa və səmimi üslub istəyinə əməl etməlidir. Bilik bazası statikdir; yeni məlumat üçün ayrıca mənbə yeniləməsi lazımdır.

## Provider və ehtiyat rejimi

Default openai/gpt-oss-120b; reasoning medium, daxili reasoning göstərilmir, maksimum 1800 completion token, 10 saniyə timeout. Bir cəhd edilir. Model konfiqurasiyası GROQ_MODEL ilə dəyişə bilər; başqa model seçimi yenidən canlı yoxlanmalıdır.

Cavabın JSON sxemi, tamamlanması, uzunluğu, gizli sistem adları və bütün HTTP(S) linklərin bilik bazasındakı URL-lərə dəqiq uyğunluğu yoxlanılır. Yalnız metadata loglanır, mesaj məzmunu və API açarı loglanmır.

Groq yoxdursa, limit və ya xəta olduqda lokal cavablar istifadə edilir. Lokal topic helper-ləri yalnız ehtiyat yolundadır; əsas model çağırışı üçün sərt açar-söz filtri deyil. Qonaq interfeysi sərbəst söhbətin müvəqqəti əlçatan olmadığını göstərir.

## Giriş və limitlər

Request validation: POST JSON, 1–12 mesaj, hər biri maksimum 4000 simvol, ümumilikdə 12000 simvol; cross-site sorğular rədd edilir.
Qonaq: 10/dəqiqə, 60/saat. Admin: IP 60/dəqiqə, istifadəçi 20/dəqiqə və 200/saat. Provider: 6/dəqiqə, 900/gün. Bunlar request limitləridir, Groq token kvotasına zəmanət vermir.

Admin endpoint əvvəlcə Supabase sessiyasını və admin/tester rolunu yoxlayır. Qonaq açıqdır, KV limitləri tələb olunur. GROQ_API_KEY yalnız serverdə saxlanılır; frontend və repository-yə daxil edilmir.

## Yoxlama

npm run test:security
npm run build

Avtomatik testlər request/giriş qorumasını, lokal ehtiyat yolu, söhbət payload-ı, strukturlaşdırılmış cavabların yoxlanması, şəxsi/mövzudan kənar nəticənin göstərilməməsi, URL və provider xəta hallarını əhatə edir. Modelin real üslubu və semantik düzgünlüyü ayrıca preview-da canlı yoxlanmalıdır.
