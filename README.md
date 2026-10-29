# Katalog Inventaris Rumah · Home Treasures

Home Treasures membantu mencatat barang-barang penting di rumah supaya informasinya mudah dicari kembali. Tampilannya memakai warna pink pastel dan bisa dibuka lewat browser. Proyek ini juga disiapkan untuk digunakan bersama Cordova di Android.

## Fitur

- Akun dan mode tamu — masuk dengan email dan password, atau coba aplikasi sebagai tamu.
- Kelola inventaris — tambah, lihat, edit, dan hapus data barang.
- Detail barang — simpan nama, nomor seri, merek, kategori, ruangan, harga beli, tanggal pembelian, garansi, kondisi, dan catatan.
- Foto barang — ambil foto dengan kamera atau pilih dari galeri. Foto dikompres di perangkat sebelum disimpan.
- Pencarian dan filter — cari barang berdasarkan nama, merek, nomor seri, dan informasi terkait; urutkan berdasarkan nama atau harga.
- Pengelompokan ruangan — lihat koleksi berdasarkan ruangan.
- Ringkasan inventaris — lihat jumlah barang, jumlah ruangan, estimasi nilai barang, dan garansi yang akan berakhir dalam 30 hari.
- Ekspor CSV — unduh data barang untuk dibuka di aplikasi spreadsheet.

## Teknologi yang digunakan

- HTML, CSS, dan JavaScript
- Firebase Authentication
- Cloud Firestore
- Apache Cordova untuk versi Android

## Sebelum mulai

Aplikasi menggunakan Firebase untuk login dan penyimpanan data. Gunakan project Firebase yang sudah disiapkan untuk aplikasi ini: `uts-inventaris-243026010`.

### 1. Siapkan Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) dan pilih project `uts-inventaris-243026010`.
2. Buka Build → Firestore Database. Buat database jika belum tersedia, lalu pilih lokasi yang sesuai. Lokasi database tidak dapat diganti setelah database dibuat.
3. Buka Build → Authentication → Sign-in method, lalu aktifkan dua metode berikut:
   - Anonymous, untuk tombol Jelajahi sebagai tamu.
   - Email/Password, untuk pendaftaran dan login menggunakan email.
4. Buka Firestore Database → Rules, salin aturan dari file `firestore.rules`, lalu pilih Publish.
5. Pastikan project tetap menggunakan paket Spark jika ingin tetap pada paket gratis. Aplikasi ini tidak menggunakan Firebase Cloud Storage dan tidak perlu mengaktifkannya.

> Catatan keamanan: jangan mengganti aturan Firestore dengan `allow read, write: if true;`. Aturan di `firestore.rules` membatasi akses sehingga pengguna hanya dapat membaca dan mengubah inventaris milik UID yang sedang login.

Informasi paket dan penagihan Firebase tersedia di [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

## Foto dan batas penyimpanan

Home Treasures tidak menggunakan Firebase Cloud Storage. Foto dikompres menjadi JPEG langsung di perangkat, lalu disimpan sebagai data URL di dokumen Cloud Firestore.

- Setiap barang menyimpan satu foto utama.
- Batas data foto pada aplikasi sekitar 420 KiB untuk string Data URL. Ukuran gambar hasil kompresi biasanya sekitar 300–315 KiB.
- Foto ikut memakai kuota penyimpanan dan ukuran dokumen Firestore.
- Batas ukuran satu dokumen Firestore adalah **1 MiB**. Hindari menyimpan data atau foto berukuran besar dalam satu barang.
- File CSV hanya berisi informasi barang, bukan file foto.

Cara ini praktis untuk tugas kuliah dan katalog rumah berukuran kecil, tetapi bukan pilihan ideal untuk koleksi foto yang besar.

## Menjalankan di browser

Jangan membuka `index.html` langsung melalui alamat `file://`. Jalankan aplikasi lewat server lokal agar JavaScript ES Modules dapat dimuat dengan benar.

### Opsi A — VS Code Live Server

1. Buka folder proyek di VS Code.
2. Pasang ekstensi Live Server jika belum tersedia.
3. Klik kanan `index.html`, lalu pilih Open with Live Server.

### Opsi B — Python

Buka terminal di folder proyek yang berisi `index.html`, lalu jalankan:

```bash
python -m http.server 8000
```

Buka alamat berikut di browser:

```text
http://localhost:8000
```

## Menjalankan di Android dengan Cordova

Untuk menyiapkan build Android, komputer perlu memiliki Node.js LTS, Java Development Kit (JDK) yang sesuai dengan versi Cordova Android, serta Android Studio dan Android SDK.

Periksa struktur aset sebelum build. Cordova umumnya membaca berkas aplikasi dari folder `www/`. Jika `index.html`, `css/`, dan `js/` masih berada langsung di root seperti pada struktur proyek saat ini, buat folder `www/` lalu tempatkan berkas tersebut di dalamnya. Biarkan `config.xml`, `package.json`, dan `firestore.rules` tetap di root proyek.

Struktur aset untuk Cordova:

```text
Katalog_Inventaris/
├── config.xml
├── package.json
├── firestore.rules
├── README.md
└── www/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js
        └── firebase.js
```

Setelah struktur aset siap, jalankan perintah berikut dari root proyek:

```bash
npm install
npx cordova platform add android
npx cordova prepare android
npx cordova run android
```

Untuk membangun aplikasi tanpa langsung menjalankannya di perangkat:

```bash
npx cordova build android
```

Plugin kamera dan file sudah didaftarkan di `config.xml` dan `package.json`. Plugin tersebut digunakan untuk membantu pemilihan foto dari kamera atau galeri pada perangkat Android.

Dokumentasi resmi: [Cordova Camera Plugin](https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-camera/) dan [Cordova File Plugin](https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-file/).

## Cara menggunakan

1. Pilih Jelajahi sebagai tamu atau daftar menggunakan email dan password.
2. Tekan Tambah Barang untuk membuka formulir.
3. Isi informasi barang. Nama, kategori, ruangan, dan foto wajib disertakan sesuai validasi aplikasi; informasi lainnya dapat diisi jika tersedia.
4. Simpan barang. Nomor seri yang sama dengan barang lain akan ditolak.
5. Gunakan pencarian dan filter di halaman Semua Barang. Buka halaman Ruangan untuk menjelajahi koleksi berdasarkan lokasi penyimpanan.
6. Gunakan tombol pensil untuk mengedit barang dan tombol `×` untuk membuka konfirmasi hapus.
7. Pilih Ekspor CSV untuk mengunduh data barang sesuai hasil pencarian dan filter yang sedang digunakan.

### Mode tamu dan akun email

- Mode tamu menggunakan UID anonim Firebase. Data terikat pada UID tersebut dan tidak otomatis berpindah ke perangkat lain. Jika keluar dari mode tamu, akses ke koleksi itu mungkin tidak bisa dipulihkan.
- Akun email dapat digunakan untuk masuk kembali dari perangkat lain dan membuka koleksi milik akun yang sama.
- Data pada UID tamu tidak otomatis digabungkan dengan akun email baru.

Gunakan akun email untuk koleksi yang ingin kamu akses kembali dalam jangka panjang.

## Struktur proyek

Struktur folder saat aplikasi dijalankan di browser:

```text
Katalog_Inventaris/
├── config.xml
├── package.json
├── firestore.rules
├── README.md
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    └── firebase.js
```

## Jika ada kendala

| Masalah | Yang perlu diperiksa |
|---|---|
| `auth/operation-not-allowed` | Aktifkan metode Anonymous atau Email/Password yang diperlukan di Firebase Authentication. |
| `permission-denied` | Pastikan Firestore sudah dibuat dan aturan dari `firestore.rules` sudah dipublikasikan. |
| Halaman kosong atau Firebase gagal dimuat | Jalankan aplikasi melalui HTTP/HTTPS, bukan `file://`, dan pastikan koneksi internet tersedia. |
| Kamera tidak terbuka di browser | Akses kamera native memerlukan Cordova dan plugin yang sesuai. Di browser, gunakan pemilih file/foto yang tersedia. |
| Foto ditolak karena terlalu besar | Coba gambar lain. Aplikasi akan mengompres foto, tetapi batas ukuran dokumen Firestore tetap berlaku. |
| Data tidak tersimpan atau tidak muncul | Periksa koneksi, kuota Firebase, metode login, aturan Firestore, serta pesan pada Console browser. |

## Batasan yang perlu diketahui

- Aplikasi memerlukan koneksi internet untuk memuat dan menyinkronkan data dengan Cloud Firestore.
- Foto disimpan langsung di dokumen Firestore, sehingga pendekatan ini lebih cocok untuk katalog kecil daripada inventaris dengan banyak foto.
- Ekspor CSV berisi metadata dan tidak menyertakan gambar.
- Perilaku kamera dan pengunduhan berkas dapat berbeda antara browser dan WebView Android.
- Sebelum presentasi atau distribusi, uji kembali pada browser dan perangkat Android yang akan digunakan. Pengaturan Firebase Console dan hasil build perangkat perlu diperiksa langsung di lingkungan masing-masing.