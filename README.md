# Duitku 💰 — Aplikasi Pencatat Keuangan Pribadi

Aplikasi mobile (React Native + Expo) untuk mencatat pemasukan, pengeluaran, transfer antar dompet, dan anggaran bulanan. **Data 100% offline** — semuanya disimpan di perangkat (AsyncStorage), tanpa server, tanpa akun. (Hanya dikte suara yang memakai mesin Google dan butuh internet.)

## Fitur

- **Input kilat** — catat dengan **dikte bahasa Indonesia** ("makan siang 35rb pakai tunai", "gaji 8,5 juta masuk BCA", "transfer 100rb dari BCA ke GoPay") atau **foto struk belanja** (OCR), lalu periksa dan simpan
- **Tampilan "Pastel Play"** — latar krem hangat, kartu saldo bergradasi ungu→biru, aksen pastel (lilac, mint, peach, butter), sudut membulat besar, font **Plus Jakarta Sans** dengan angka `tabular-nums`, grafik digambar tanpa library
- **Dompet fleksibel**: pilih jenis bawaan (Tunai/Bank/E-wallet/Kartu) atau tulis jenis sendiri ("Investasi", "Paylater", ...) plus 14 pilihan ikon.
- **Mode gelap**: plum malam hangat (bukan hitam pekat) dengan aksen pastel yang sama; ikut tema sistem saat pertama dibuka, lalu bisa diganti manual lewat tombol bulan/matahari di header Beranda (tersimpan di `AsyncStorage` kunci `duitku/theme`).
- **Logo & ikon lucu** — logo Duitku (mark + wordmark) di splash beranimasi dan header Beranda; ikon kategori/dompet digambar dari `<View>` (uang kertas, kartu ATM, celengan, makanan, kendaraan, dst)
- **Multi dompet** — Tunai, Bank, E-Wallet, Kartu (tambah/ubah/hapus sendiri)
- **Transaksi** — pengeluaran, pemasukan, transfer antar dompet; kategori + catatan + tanggal
- **Riwayat** — filter per bulan, per tipe, per dompet; subtotal harian
- **Laporan** — pemasukan/pengeluaran bulan ini, perbandingan bulan lalu, grafik pengeluaran harian, proporsi per kategori, tren 6 bulan
- **Anggaran** — batas per kategori per bulan, progress bar, peringatan saat ≥80% atau lewat batas
- **Data contoh** — tombol "Muat data contoh" di tab Dompet untuk coba-coba
- Format Rupiah otomatis, bahasa Indonesia, tema terang pastel

## Cara menjalankan di HP (tanpa Android Studio)

1. Install **Expo Go** di HP:
   - Android: Play Store → "Expo Go"
   - iPhone: App Store → "Expo Go"
2. Di komputer, buka terminal:
   ```bash
   cd ~/Projects/duitku
   npx expo start
   ```
3. Scan QR code yang muncul:
   - **Android** → scan dari dalam aplikasi Expo Go
   - **iPhone** → scan pakai app **Camera** bawaan
4. HP dan komputer harus di **Wi-Fi yang sama**. Kalau beda jaringan / gagal connect, jalankan dengan tunnel:
   ```bash
   npx expo start --tunnel
   ```
5. Aplikasi akan terbuka di HP. Data tersimpan di HP itu sendiri — tetap ada walau app ditutup.

> **APK release lokal sudah jadi.** `android/app/build/outputs/apk/release/app-release.apk`
> (±69 MB) — build dengan `./gradlew :app:assembleRelease` dari folder `android/`, lalu
> `adb install -r` file itu. APK ini sudah ditandatangani dengan debug keystore, cukup untuk
> dipakai sendiri; untuk Play Store tetap perlu keystore rilis + `eas build`. Ingat
> `./gradlew :app:clean` lebih dulu kalau ada aset/dependensi native yang dihapus, kalau tidak
> sisa aset lama masih ikut ke dalam APK.

### Dikte suara (STT) — mesin Google

Tombol **Bicara** di Beranda memakai Speech-to-Text **native di dalam aplikasi** — bukan
voice keyboard HP. Mesinnya **Google Speech Recognition** (`expo-speech-recognition` →
layanan `com.google.android.googlequicksearchbox`, bahasa `id-ID`), jadi **butuh internet**
dan aplikasi Google harus terpasang di HP. Di iOS dipakai mesin Apple, di browser dipakai
Web Speech API (Chrome/Edge).

Data transaksi tetap **100% offline** — hanya audio dikte yang dikirim ke mesin suara.

Kalau modul native tidak ada (Expo Go), sheet menampilkan penjelasan + kolom tulis manual
(parsing tetap jalan). Modul native **tidak bisa dimuat Expo Go** — untuk mencoba dikte
sungguhan:

```bash
npx expo run:android      # butuh Android Studio / HP dengan USB debugging
# atau
eas build --profile development --platform android
```


## Preview di browser (opsional)

```bash
npx expo start --web
```
Lalu buka `http://localhost:8081`.

## Struktur proyek

```
App.js                     shell aplikasi: tab bar, init store, modal form, Splash animasi
src/theme.js               palet "Pastel Play", radius, shadow, gradient, tint ikon
src/fonts.js               peta font Plus Jakarta Sans (400–800) untuk useFonts
src/utils.js               format Rupiah, tanggal, helper bulan
src/store.js               state global + persist AsyncStorage (key: duitku/v1) + selector
src/components/UI.js       primitif UI: T, Row, Card, Btn, Sheet, Input, Field, Bar, ...
src/components/CuteIcons.js ikon vektor lucu dari <View> + pemetaan kata→ikon
src/components/Charts.js   BarChart, CategoryBars, TrendChart (tanpa library chart)
src/components/TxRow.js    baris transaksi
src/components/VoiceSheet.js  bottom sheet rekam suara (dikte + fallback tulis manual)
src/lib/speech.js          STT via mesin sistem: Google (Android) / Apple (iOS) / Web Speech API
src/lib/parser.js          parser teks Indonesia → transaksi (nominal, kategori, dompet)
src/lib/safeRequire.js     pemuat modul opsional yang aman di Expo Go
src/components/Header.js   header + tombol kembali
src/screens/Home.js        beranda: total saldo, kartu dompet, anggaran, transaksi terbaru
src/screens/TxForm.js      form tambah/edit transaksi (expense/income/transfer)
src/screens/History.js     riwayat + filter
src/screens/Report.js      laporan & grafik
src/screens/Wallets.js     kelola dompet + data contoh + reset
src/screens/Budgets.js     anggaran per kategori
assets/brand/              logo hasil olahan (mark, wordmark, horizontal, putih)
scripts/build-brand-assets.py  generator aset brand (PIL): hapus latar putih + ekspor ikon
scripts/check-syntax.cjs   cek sintaks semua file JSX
```

## Struktur data (AsyncStorage `duitku/v1`)

```js
{
  wallets:      [{ id, name, type, initial, color }],
  categories:   [{ id, name, icon, color, type }],
  transactions: [{ id, type, amount, category, wallet, toWallet, date, note }],
  budgets:      { "2026-11": { "c_makan": 1200000, ... } },
  initialZeroed: true   // penanda migrasi saldo awal 0
}
```

Saldo dompet = `initial` + pemasukan − pengeluaran (+/− transfer). Dompet bawaan
(Tunai, BCA, GoPay) dibuat dengan `initial: 0`, jadi angka di Beranda murni dari
transaksi yang kamu catat. Data lama ikut dimigrasi sekali jalan: kalau belum ada
penanda `initialZeroed: true`, saldo awal tiga dompet itu dipaksa 0 tanpa menghapus
transaksi.

## Cek sintaks & uji parser

```bash
node scripts/check-syntax.cjs .
node scripts/test-parser.cjs
```

## Mengosongkan data

Tab **Dompet** → bagian *Data & cadangan* → **Reset data**. Atau hapus data aplikasi dari pengaturan HP.
