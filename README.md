# 🌟 Yuna.AI WhatsApp Bot

Bot WhatsApp cerdas dengan AI Chat, TTS, Avatar Emosi, dan fitur Play Musik!

---

## 📦 Fitur
- Chatbot AI cerdas menggunakan Groq.
- Deteksi emosi otomatis & kirim avatar sesuai mood.
- Putar musik dari YouTube dengan perintah teks.
- Dukungan Text-to-Speech (opsional, menggunakan Suno Bark).
- Multi device login (Baileys).

---

## 🚀 Cara Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/username/bot-wa-yuna.git
cd Yuna.Ai

Install Dependency

npm install

Run Bot 

npm start

--------------------------------------------------------------------------------------------------------------------------------------------------------------------

⚙️ Struktur Project

.
├── auth/               # Penyimpanan sesi login WhatsApp
├── avatars/            # Folder gambar ekspresi avatar
├── temp/               # File audio sementara
├── index.js            # File utama bot
├── groq.js             # Modul AI Groq
├── emotion.js          # Deteksi emosi dari AI response
├── avatar.js           # Kirim avatar berdasarkan emosi
├── yutube.js           # Fungsi cari dan unduh musik YouTube
├── tts-bark.js         # (Opsional) TTS generator
├── .env                # Setting environment
├── .gitignore          # Agar file sensitif tidak keupload ke Git
└── README.md           # Dokumentasi

--------------------------------------------------------------------------------------------------------------------------------------------------------------------

📚 Rangkuman Langkah Instalasi cepat:
Clone project ➔ git clone

Masuk folder ➔ cd Yuna.Ai

Install dependencies ➔ npm install

Buat file .env = GROQ_API_KEY=masukkan-api-key-anda

Jalankan ➔ node index.js

Scan QR di terminal

Bot langsung jalan 🚀

note: Buat lingkungan virtual environment terlebih dahulu sebelum npm install

python -m venv venv
.\venv\Scripts\Activate

