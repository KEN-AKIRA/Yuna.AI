import { useMultiFileAuthState, makeWASocket, DisconnectReason } from '@whiskeysockets/baileys';
import Pino from 'pino';
import dotenv from 'dotenv';
import fs from 'fs';
import moment from 'moment-timezone';
import { getGroqAIResponse, loadUserData, saveUserData, getUserMemory } from './groq.js';
// import { createTTS } from './tts-bark.js'; // Uncomment kalau mau pakai TTS
import { getAvatar } from './avatar.js';
import { detectEmotion } from './emotion.js';
import { searchYouTubeMusic, downloadYouTubeAudio } from './yutube.js';

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

        if (lowerMessage.includes('musik') || lowerMessage.includes('lagu') || lowerMessage.includes('play') || lowerMessage.includes('dj') || lowerMessage.includes('carikan')) {
            const query = lowerMessage.replace(/(musik|lagu|play|dj|carikan)/g, '').trim();

            if (!query || query.length === 3) {
                pendingMusicRequest[userId] = true;
                await sock.sendMessage(userId, { text: "Mau putar musik apa? 🎵" });
                return;
            } else {
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

async function handleAIResponse(sock, userId, userMessage) {
    try {
        let userData = getUserMemory(userId);
        const aiResponse = await getGroqAIResponse(userMessage, userId);

        userData.history.push({ role: 'user', content: userMessage });
        userData.history.push({ role: 'assistant', content: aiResponse });
        saveUserData();

        const fullResponse = `${ucapan()}!\n\n${aiResponse}\n\n${watermark}`;
        const emotion = detectEmotion(aiResponse);

        await sendImageWithAIResponse(sock, userId, fullResponse, emotion);

        //await createTTS(fullResponse, userId, sock);

        console.log(`🧠 Emosi: ${emotion}`);
    } catch (error) {
        console.error("❌ Error di handleAIResponse:", error);
    }
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
            if (type === "notify") {
                for (const message of messages) {
                    const userId = message.key.remoteJid;
                    const userMessage =
                        message.message?.conversation ||
                        message.message?.extendedTextMessage?.text ||
                        message.message?.imageMessage?.caption;

                    if (!userMessage) return;

                    console.log(`📩 Pesan dari ${userId}: ${userMessage}`);
                    await handleIncomingMessage(socket, userId, userMessage);
                }
            }
        });
    } catch (error) {
        console.error("❌ Kesalahan saat koneksi WhatsApp:", error);
    }
}

loadUserData();
connectToWhatsapp().catch(err => console.error("❌ Bot error:", err));
