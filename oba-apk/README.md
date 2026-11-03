# OBA Tarix Nəzarəti — Android test APK

Bu qovluq OBA Tarix Nəzarəti üçün Android test APK-sı hazırlayır.

## Daxildir
- Yaşıl-ağ Azərbaycan dilində interfeys APK-ya yığılır və offline açılır.
- IndexedDB məhsul bazası və mövcud son istifadə tarixi axını qalır.
- Kamera icazəsi / web barkod axını; əl ilə barkod girişi həmişə qalır.
- Native Android bildiriş körpüsü.
- 3 gün, 1 gün, 3 saat əvvəl və məhsul yığışdırılana qədər təxminən hər 2 saatdan bir fon xatırlatması.
- Telefon restartından sonra xatırlatmalar yenidən qurulur.

Android-in batareya optimizasiyası / Doze bildirişləri bir qədər gecikdirə bilər.

## Local build
JDK 17, Android SDK 35, Gradle 8.9 lazımdır.

```bash
python3 tools/fetch_web.py https://oba-tarix-nezareti.lovable.app app/src/main/assets/www
gradle :app:assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`.

## Vacib
Bu ilk APK local/offline test versiyasıdır. Planlaşdırılan ortaq `Oba.7mkr` hesabı və cloud sinxronizasiya hələ aktiv deyil; təhlükəsiz backend hesab qurulması qalır. Heç bir ortaq şifrə və secret repo-ya yazılmır.
