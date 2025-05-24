import { useMultiFileAuthState, makeWASocket, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import Pino from 'pino';
import dotenv from 'dotenv';
import fs from 'fs';
import moment from 'moment-timezone';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateTTS } from './deepgram_tts.js'; // Uncomment kalau mau pakai TTS
import { fetchOpenAI, loadUserData, saveUserData, getUserMemory } from './openrouter.js';
//import { getGroqAIResponse, loadUserData, saveUserData, getUserMemory } from './groq.js';
import { getAvatar } from './avatar.js';
import { detectEmotion } from './emotion.js';
import { searchYouTubeMusic, downloadYouTubeAudio } from './yutube.js';
import { analyzeFace } from './eyes.js';
import { spawn } from 'child_process';
//import { startDashboard, logMessage } from './monitor.js';
//import ffmpeg from 'fluent-ffmpeg';
//import { runAgent } from './agent.js'; // Import fungsi runAgent dari agent.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();



const watermark = '©Yuna.AI';

const emotionImages = {
    happy: './avatars/happy.png',
    sad: './avatars/sad.png',
    angry: './avatars/angry.png',
    love: './avatars/love.png',
    surprised: './avatars/surprised.png',
    neutral: './avatars/neutral.png',
};

function ucapan() {
    const time = moment.tz('Asia/Jakarta').format('HH');
    if (time >= 4 && time < 10) return "Selamat pagi 🌄";
    if (time >= 10 && time < 15) return "Selamat siang ☀️";
    if (time >= 15 && time < 18) return "Selamat sore 🌇";
    if (time >= 18) return "Selamat malam 🌙";
    return "Selamat dinihari 🌆";
}


/*const io = startDashboard();

function startBot() {
  
    logMessage("bot", "Yuna", "Halo Ken, aku siap membantu 💛", io);
  
startBot();

}*/

async function onMessageReceived(senderNumber, messageText) {
    const userId = senderNumber.toString();  // gunakan nomor sebagai userId
    const response = await runAgent(userId, messageText);
    await sendMessageToWhatsApp(senderNumber, response);
  }


async function sendImageWithAIResponse(socket, userId, aiResponse, emotion) {
    try {
        const avatarPath = emotionImages[emotion] || emotionImages.neutral;
        const imageBuffer = fs.readFileSync(avatarPath);
        await socket.sendMessage(userId, {
            image: imageBuffer,
            caption: aiResponse,
        });
        console.log(`🖼️ Gambar dengan emosi ${emotion} dikirim ke ${userId}`);
    } catch (error) {
        console.error("❌ Kesalahan saat mengirim gambar:", error);
    }
}

let pendingMusicRequest = {};

async function handleIncomingMessage(sock, userId, userMessage) {
    try {
        let userData = getUserMemory(userId);
        if (userData.history.length === 0) {
            console.log("📖 Memulai percakapan baru dengan pengguna...");
        }

        const lowerMessage = userMessage.toLowerCase();

        if (pendingMusicRequest[userId]) {
            const query = lowerMessage.trim();

            await sock.sendMessage(userId, { text: "mau musik apa? ada judulnya?" });

            const songUrl = await searchYouTubeMusic(query);

            if (songUrl && !songUrl.includes('Tidak dapat')) {
                const audioFilePath = `./temp/${userId}_music.mp3`;
                await downloadYouTubeAudio(songUrl, audioFilePath);

                await sock.sendMessage(userId, {
                    audio: { url: audioFilePath },
                    mimetype: 'audio/mp4',
                    ptt: true
                });

                console.log(`🎵 Musik berhasil dikirim ke ${userId}: ${query}`);

                userData.history.push({ role: 'user', content: `Saya ingin mendengarkan lagu: ${query}` });
                userData.history.push({ role: 'assistant', content: `Tentu! Ini lagu "${query}" untukmu. 🎵` });
                saveUserData();

                delete pendingMusicRequest[userId];

                try {
                    fs.unlink(audioFilePath, (err) => {
                        if (err) console.error('Gagal hapus file:', err);
                    });
                } catch (error) {
                    console.error("❌ Gagal hapus audio:", error);
                }
            } else {
                await sock.sendMessage(userId, { text: `😔 Maaf, aku tidak menemukan musik untuk "${query}".` });
                delete pendingMusicRequest[userId];
            }
            return;
        }

        if (lowerMessage.includes('musik') || lowerMessage.includes('music') || lowerMessage.includes('play') || lowerMessage.includes('dj') || lowerMessage.includes('putarkan')) {
            const query = lowerMessage.replace(/(musik|lagu|play|dj|putarkan)/g, '').trim();

            if (!query || query.length <= 3) {
                pendingMusicRequest[userId] = true;
                await sock.sendMessage(userId, { text: "Mau putar musik apa? 🎵" });
                return;
            } else {
                const loadingMessages = [
                    "🎶 Lagi aku cari lagunya buat kamu, tunggu ya...",
                    "⏳ Tunggu sebentar ya, aku siapin dulu musiknya...",
                    "🎵 Sebentar ya... aku cari lagu  yang terbaik buatmu."
                  ];
                  const waitText = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
                  await sock.sendMessage(userId, { text: waitText });
              
                //await sock.sendMessage(userId, { text: "⏳ Lagi cari dan siapkan lagunya, sebentar ya..." });
                //const songUrl = await searchYouTubeMusic(query);
                const songData = await searchYouTubeMusic(query);
                const songUrl = songData.url;
                const songTitle = songData.title || "Tidak diketahui";
                const songArtist = songData.artist || "Tidak diketahui";

                if (songUrl && !songUrl.includes('Tidak dapat')) {
                    const audioFilePath = `./temp/${userId}_music.mp3`;

                    await downloadYouTubeAudio(songUrl, audioFilePath);

                    await sock.sendMessage(userId, {
                        audio: { url: audioFilePath },
                        mimetype: 'audio/mp4',
                        ptt: true
                    });

                    await sock.sendMessage(userId, { text: `Music Information:\n*Title:* ${songTitle}\n*Artis:* ${songArtist}` });

                    console.log(`🎵 Musik berhasil dikirim ke ${userId}: ${query}`);

                    userData.history.push({ role: 'user', content: `Saya ingin mendengarkan lagu: ${query}` });
                    userData.history.push({ role: 'assistant', content: `Tentu! Ini lagu "${query}" untukmu. 🎵` });
                    saveUserData();

                    try {
                        fs.unlink(audioFilePath, (err) => {
                            if (err) console.error('Gagal hapus file:', err);
                        });
                    } catch (error) {
                        console.error("❌ Gagal hapus audio:", error);
                    }
                } else {
                    await sock.sendMessage(userId, { text: `😔 Maaf, aku tidak menemukan musik untuk "${query}".` });
                }
                return;
            }
        }

        await handleAIResponse(sock, userId, userMessage);

    } catch (error) {
        console.error('❌ Error di handleIncomingMessage:', error);
    }
}
// fungsi response true 
/*async function handleAIResponse(sock, userId, userMessage) {
    try {
        let userData = getUserMemory(userId);
        const aiResponse = await fetchGroqAI(userMessage, userId);
        //getGroqAIResponse
        userData.history.push({ role: 'user', content: userMessage });
        userData.history.push({ role: 'assistant', content: aiResponse });
        saveUserData();

        const githubLink = "🔗bit.ly/KenAkira";

        const fullResponse = `${ucapan()}!\n\n${aiResponse}\n\n${watermark}\n${githubLink}`;        
        const emotion = detectEmotion(aiResponse);

        await sendImageWithAIResponse(sock, userId, fullResponse, emotion);

        //await createTTS(fullResponse, userId, sock);

        console.log(`🧠 Emosi: ${emotion}`);
    } catch (error) {
        console.error("❌ Error di handleAIResponse:", error);
    }
}*/

/*export async function createTTS(responseText, userId, sock) {
    try {
      const audioPath = await generateTTS(responseText); // Dapatkan file .ogg langsung
      const audioFile = fs.readFileSync(audioPath);      // Baca file .ogg
  
      // Kirim ke WhatsApp langsung
      await sock.sendMessage(userId, {
        audio: audioFile,
        mimetype: 'audio/ogg; codecs=opus', // <- penting: ogg
        ptt: true
      });
  
      console.log('✅ TTS berhasil dikirim.');
    } catch (error) {
      console.error('❌ Error saat membuat TTS:', error);
    }
  }*/
    //fitur automatic plac musik pashe 1
    /*async function handleAIResponse(sock, userId, userMessage) {
        try {
            let userData = getUserMemory(userId);
            const aiResponse = await fetchGroqAI(userMessage, userId);
    
            userData.history.push({ role: 'user', content: userMessage });
            userData.history.push({ role: 'assistant', content: aiResponse });
            saveUserData();
    
            const githubLink = "🔗bit.ly/KenAkira";
            const fullResponse = `${ucapan()}!\n\n${aiResponse}\n\n${watermark}\n${githubLink}`;
            const emotion = detectEmotion(aiResponse);
    
            await sendImageWithAIResponse(sock, userId, fullResponse, emotion);
    
            console.log(`🧠 Emosi: ${emotion}`);
    
            // Deteksi tag PUTAR MUSIK otomatis dari AI response
            const match = aiResponse.match(/\[PUTAR MUSIK: (.+?)\]/i);
            if (match) {
                const mood = match[1].trim().toLowerCase();
                console.log(`🎧 AI meminta putar musik dengan mood: ${mood}`);
    
                const loadingText = [
                    "🎶 Oke, aku cari lagu yang pas buat mood itu ya...",
                    "🔎 Nyari musik dulu, tungguin sebentar ya...",
                    "🎧 Deteksi mood... Cari playlist..."
                ];
                await sock.sendMessage(userId, {
                    text: loadingText[Math.floor(Math.random() * loadingText.length)]
                });
    
                function mapMoodToMusicQuery(mood) {
                    const moodMap = {
                        'galau': 'lagu galau sedih barat terbaik',
                        'sedih': 'heartbreak, emotional song, breakup song, lonely song',
                        'senang': 'dj',
                        'semangat': 'lagu semangat pagi motivasi upbeat',
                        'cinta': 'lagu romantis cinta barat terbaik',
                        'malam': 'lagu malam tenang chill vibes',
                        'sendiri': 'lagu kesepian mellow acoustic',
                        'nostalgia': 'lagu nostalgia indonesia tahun 2000an',
                        'rindu': 'lagu rindu akustik mellow',
                        'santai': 'lagu santai sore chill relax',
                        'kangen': 'lagu kangen band mellow galau'
                    };
    
                    return moodMap[mood] || `lagu ${mood} populer`;
                }
    
                const musicQuery = mapMoodToMusicQuery(mood);
                console.log(`🔍 Query YouTube untuk mood "${mood}": ${musicQuery}`);
    
                const songData = await searchYouTubeMusic(musicQuery);
                console.log(`🎵 Data hasil pencarian YouTube:`, songData);

                let songUrl, songTitle, songArtist;

           /*if (songData && songData.length > 0) {
                const songUrl = songData[0].url;
                const songTitle = songData[0].title || "Tidak diketahui";
                const songArtist = songData[0].artist || "Tidak diketahui";
               /* const songUrl = songData?.url;
                const songTitle = songData?.title || "Tidak diketahui";
                const songArtist = songData?.artist || "Tidak diketahui";*/
           /* }
                if (songUrl && songUrl.startsWith('http')) {
                    const audioFilePath = `./temp/${userId}_auto_music.mp3`;
                    console.log(`⬇️ Mulai download ke: ${audioFilePath}`);
    
                    try {
                        await downloadYouTubeAudio(songUrl, audioFilePath);
                        console.log(`📁 Download selesai`);
    
                        await sock.sendMessage(userId, {
                            audio: { url: audioFilePath },
                            mimetype: 'audio/mp4',
                            ptt: true
                        });
    
                        await sock.sendMessage(userId, {
                            text: `🎼 Musik yang cocok untukmu:\n*Judul:* ${songTitle}`
                        });
    
                        fs.unlink(audioFilePath, (err) => {
                            if (err) console.error('Gagal hapus file:', err);
                            else console.log(`🗑️ File sementara dihapus: ${audioFilePath}`);
                        });
                    } catch (err) {
                        console.error("❌ Gagal download audio:", err);
                        await sock.sendMessage(userId, {
                            text: `🚫 Maaf, gagal memutar musik. Mungkin ada masalah dengan pengunduhan audio.`
                        });
                    }
                } else {
                    console.error(`❌ Gagal dapat URL lagu dari query: ${musicQuery}`);
                    await sock.sendMessage(userId, {
                        text: `😔 Maaf, aku gak nemu musik untuk mood: "${mood}"`
                    });
                }
            }
    
        } catch (error) {
            console.error("❌ Error di handleAIResponse:", error);
        }
    }*/
        async function playMusicForMood(sock, userId, mood) {
            const queryMap = {
              sedih: "lonely sad song, cry sad song, heartbreak song",
              galau: "heartbreak sad song, cry sad song, lonely song",
              semangat: "dj ",
              cinta: "lagu cinta romantis",
              santai: "lagu santai sore",
              senang: "lagu bahagia",
              rindu: "lagu rindu mellow",
              nostalgia: "lagu nostalgia indonesia"
            };
          
            const musicQuery = queryMap[mood] || `lagu ${mood}`;
            const songData = await searchYouTubeMusic(musicQuery);
            if (!songData || songData.length === 0) {
              return await sock.sendMessage(userId, {
                text: `😔 Maaf, aku gak nemu musik untuk mood: "${mood}"`
              });
            }
          
            const song = songData[0];
            const audioFilePath = `./temp/${userId}_auto_music.mp3`;
            try {
              await downloadYouTubeAudio(song.url, audioFilePath);
              await sock.sendMessage(userId, {
                audio: { url: audioFilePath },
                mimetype: 'audio/mp4',
                ptt: true
              });
              await sock.sendMessage(userId, {
                text: `🎼 *${song.title}* oleh *${song.artist || "Tidak diketahui"}*`
              });
              fs.unlink(audioFilePath, () => {});
            } catch (err) {
              console.error("❌ Gagal putar lagu:", err);
              await sock.sendMessage(userId, {
                text: `🚫 Maaf, gagal memutar lagu kali ini.`
              });
            }
          }
          
          async function handleAIResponse(sock, userId, userMessage) {
            try {
              console.log("📩 Pesan dari pengguna:", userMessage);
              let userData = getUserMemory(userId);
          
              // 🔁 Jika user sebelumnya ditawari musik dan sekarang bilang "iya", putar lagu
              if (userData.pendingMusicMood && /^(iya|boleh|putar|oke|ya|silakan|gas|lanjut)$/i.test(userMessage.trim())) {
                const mood = userData.pendingMusicMood;
                userData.pendingMusicMood = null;
                saveUserData();
          
                await sock.sendMessage(userId, { text: "🎶 Oke, aku putarkan musik untuk kamu ya..." });
                return await playMusicForMood(sock, userId, mood);
              }
          
              // 🧠 Dapatkan respons AI dari Groq
              const aiResponse = await fetchOpenAI(userMessage, userId);
              const spokenText = cleanForTTS(aiResponse);
              
              userData.history.push({ role: 'user', content: userMessage });
              userData.history.push({ role: 'assistant', content: aiResponse });
              saveUserData();
          
              const fullResponse = `${ucapan()}!\n\n${aiResponse}\n\n${watermark}\n🔗bit.ly/KenAkira`;
              const emotion = detectEmotion(aiResponse);
          
              await sendImageWithAIResponse(sock, userId, fullResponse, emotion);
              console.log(`🧠 Emosi: ${emotion}`);


               // 🔊 Generate dan kirim TTS ke WhatsApp
                const ttsPath = await generateTTS(spokenText, userId);
                if (ttsPath) {
                    await sock.sendMessage(userId, {
                        audio: { url: ttsPath },
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true
                    });
                }
          
              const tagMatch = aiResponse.match(/#play-music\((.*?)\)/i);
                if (tagMatch) {
                const moodFromTag = tagMatch[1];
                return await playMusicForMood(sock, userId, moodFromTag);
                }

                const offerMusic = /putarkan lagu|aku putar(kan)? musik|lagu yang cocok|dengerin lagu|coba lagu/i.test(aiResponse);

                const autoPlayEmotions = ['sedih', 'galau', 'rindu'];

                if (offerMusic) {
                if (autoPlayEmotions.includes(emotion)) {
                    await sock.sendMessage(userId, { text: "🎶 Aku ngerti... aku putarkan lagu yang cocok ya..." });
                    return await playMusicForMood(sock, userId, emotion);
                } else {
                    userData.pendingMusicMood = emotion;
                    saveUserData();
                    await sock.sendMessage(userId, { text: "🎶 Mau aku putarkan lagu yang cocok buat mood kamu?" });
                }
                }

            } catch (error) {
              console.error("❌ Error di handleAIResponse:", error);
            }
          }
        
          
 function cleanForTTS(text) {
    return text
        // Hapus baris ucapan seperti "Selamat pagi/siang/sore/malam" (case-insensitive)
        .replace(/^\s*selamat\s+(pagi|siang|sore|malam)[^\n]*\n?/gim, '')
        // Hapus link (https:// atau bit.ly atau lainnya)
        .replace(/https?:\/\/\S+|bit\.ly\/\S+/gi, '')
        // Hapus copyright label atau footer branding
        .replace(/©?yuna\.ai/gi, '')
        // Hapus [SIMPAN CATATAN: ...] dan lainnya dalam kurung siku
        .replace(/\[.*?\]/g, '')
        // Hapus whitespace dan baris kosong berlebih
        .replace(/\s+/g, ' ')
        .trim();
}

       



async function handleImageMessage(m, sock) {
    const buffer = await downloadMediaMessage(
      m, 
      'buffer', 
      {}, 
      { 
        reuploadRequest: sock.updateMediaMessage 
      }
    );

    const filename = `./downloads/${Date.now()}.jpg`;
    fs.writeFileSync(filename, buffer);

    console.log('✅ Gambar berhasil disimpan di:', filename);

    // Kirim ke Python untuk analisa
    const py = spawn('python', ['analyze.py', filename]);

    py.stdout.on('data', (data) => {
        const text = data.toString().trim();
        console.log("📦 Output dari Python:", text);
      
        // Cek apakah output valid JSON
        if (text.startsWith("{")) {
          try {
            const result = JSON.parse(text);
            console.log("✅ Hasil dari Python:", result);
      
            // Kirim ke user WhatsApp sesuai hasil (misalnya result.emotion, dsb.)
            const response = `🧠 Analisis wajah berhasil:\n\n` +
              `😐 Emosi: ${result.emotion}\n` +
              `👶 Umur: ${result.age}\n` +
              `🧔 Gender: ${result.gender}\n` +
              `🌍 Ras: ${result.race}`;
      
            sock.sendMessage(m.key.remoteJid, { text: response });
          } catch (err) {
            console.error("❌ Gagal mem-parsing hasil JSON dari Python:", err.message);
            sock.sendMessage(m.key.remoteJid, { text: "⚠️ Terjadi kesalahan saat memproses gambar." });
          }
      
        } else {
          // Output bukan JSON, biasanya info download model atau log dari TensorFlow
          console.warn("📄 Output log dari Python:", text);
      
          // Kalau kamu mau info ini juga dikirim ke WhatsApp (opsional)
          if (text.includes("will be downloaded")) {
            const cleanText = text.replace(/\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - /, "");
            sock.sendMessage(m.key.remoteJid, { text: `🔄 ${cleanText}` });
          }
        }
    });

    py.stderr.on('data', (data) => {
        console.error(`🐍 Python error: ${data.toString()}`);
    });

    py.on('close', (code) => {
        console.log(`🚪 Python process keluar dengan kode ${code}`);
   
    });
}    

async function connectToWhatsapp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth");
        const socket = makeWASocket({
            printQRInTerminal: true,
            browser: ["Yuna", "Chrome", "1.0"],
            auth: state,
            logger: Pino({ level: "silent" }),
        });

        socket.ev.on("creds.update", saveCreds);

        socket.ev.on("connection.update", ({ connection, lastDisconnect }) => {
            if (connection === "open") {
                console.log("✅ Koneksi WhatsApp terbuka");
            } else if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log("🔄 Menyambung ulang...");
                    setTimeout(connectToWhatsapp, 5000);
                } else {
                    console.log("🚪 Logout, tidak menyambung kembali.");
                }
            }
        });

        socket.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;
        
            const msg = messages[0];
            const sender = msg.key.remoteJid;

        
            /*console.log("=== DEBUG FULL MESSAGE ===");
            console.log(JSON.stringify(msg, null, 2));
            console.log("===========================");*/
        
            const isImage = msg.message?.imageMessage;
        
            if (isImage) {
                try {
                    
                    await handleImageMessage(msg, socket);
                    console.log(`📸 Gambar diterima dan dianalisis dari ${sender}`);
                } catch (error) {
                    console.error("❌ Gagal memproses gambar:", error);
                }
        
            } else {
                const userMessage =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption;
        
                if (!userMessage) return;
        
                console.log(`📩 Pesan dari ${sender}: ${userMessage}`);
               // const response = await getGroqAIResponse(pesanUser, userId, io); //kode false
                await handleIncomingMessage(socket, sender, userMessage);
            }
            
        });
        
    } catch (error) {
        console.error("❌ Kesalahan saat koneksi WhatsApp:", error);
    }
}

loadUserData();
connectToWhatsapp().catch(err => console.error("❌ Bot error:", err));
