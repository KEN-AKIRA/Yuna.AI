# 🌟 Yuna.AI WhatsApp Bot

**Yuna.AI** adalah bot WhatsApp cerdas yang dirancang untuk memberikan pengalaman interaktif dengan fitur AI Chat, deteksi emosi, avatar reaktif, dan kemampuan untuk memainkan musik dari YouTube! Semua fitur ini digabungkan untuk memberikan interaksi yang menyenangkan dan imersif.

---

## 📦 Fitur Utama

- 🤖 **Chatbot AI Cerdas**: Dibangun menggunakan **Groq** untuk memberikan respons cerdas dan relevan.
- 😄 **Deteksi Emosi**: AI akan mendeteksi emosi dalam percakapan dan menyesuaikan avatar dengan mood kamu.
- 🎶 **Putar Musik**: Dapat memutar musik dari YouTube berdasarkan perintah teks.
- 🗣 **Text-to-Speech**: TTS (Text-to-Speech) menggunakan **Suno Bark** untuk balasan suara natural (opsional).
- 📱 **Multi-device Login**: Dukungan login multi perangkat menggunakan **Baileys**.
  
---

## 🚀 Cara Instalasi

Ikuti langkah-langkah berikut untuk menginstal dan menjalankan **Yuna.AI** di sistem kamu:

### 1. Clone Repository

```bash
git clone https://github.com/KEN-AKIRA/Yuna.AI.git
cd Yuna.Ai
```

### 2. Install Dependency
Pastikan kamu memiliki Node.js terpasang di sistemmu. Kemudian, jalankan perintah berikut untuk menginstal semua dependensi:

```bash
npm install
```
3. Setup .env
Buat file .env di root direktori project dan masukkan GROQ_API_KEY kamu untuk autentikasi API.

```bash
GROQ_API_KEY=masukkan-api-key-anda
```
4. Jalankan Bot
Setelah semua dependensi terinstal dan konfigurasi selesai, jalankan bot dengan perintah berikut:

```bash
npm start
```
5. Scan QR
Bot akan memberikan QR code di terminal untuk login ke WhatsApp. Scan QR code tersebut menggunakan WhatsApp di smartphone kamu.

Bot siap digunakan! 🚀

⚙️ Struktur Proyek
Berikut adalah struktur folder dari proyek ini:

.
├── auth/               # Penyimpanan sesi login WhatsApp
├── avatars/            # Folder gambar ekspresi avatar
├── temp/               # File audio sementara
├── index.js            # File utama bot
├── groq.js             # Modul AI Groq
├── emotion.js          # Deteksi emosi dari AI response
├── avatar.js           # Kirim avatar berdasarkan emosi
├── youtube.js          # Fungsi cari dan unduh musik YouTube
├── tts-bark.js         # (Opsional) TTS generator menggunakan Suno Bark
├── .env                # File konfigurasi environment (API key, dll)
├── .gitignore          # Menghindari upload file sensitif ke GitHub
└── README.md           # Dokumentasi dan petunjuk penggunaan
📚 Langkah Instalasi Cepat
Clone project:

```bash
git clone https://github.com/KEN-AKIRA/Yuna.AI.git
```
Masuk ke folder project:

```bash
cd Yuna.Ai
```
Install dependencies:
```bash
npm install
```
Buat file .env dan masukkan GROQ_API_KEY kamu.

Jalankan bot:
```bash
node index.js
```
Scan QR code yang muncul di terminal dengan aplikasi WhatsApp.

Bot siap digunakan! 🚀

🛠 Tools dan Teknologi
Groq: AI untuk membuat bot berbasis percakapan cerdas.

Suno Bark: Untuk konversi Teks ke Suara (TTS).

Baileys: Untuk multi-device login WhatsApp.

YouTube API: Untuk mencari dan memutar musik dari YouTube.

📜 Lisensi
Distribusi kode ini dilindungi oleh MIT License. Untuk informasi lebih lanjut, silakan baca LICENSE.
