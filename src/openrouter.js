// src/groq.js

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import { writeFile } from 'fs/promises';
import axios from 'axios';
import { searchYouTubeMusic } from './yutube.js'; // Import fungsi pencarian musik

dotenv.config();

// === Set up ===
const USER_DATA_FILE = path.join('./users.json');
const Open = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let userMemory = {}; // Memory lokal

// === Memory Management ===

function loadAllUserData() {
    if (!fs.existsSync(USER_DATA_FILE)) {
        fs.writeFileSync(USER_DATA_FILE, '{}');
    }
    const data = fs.readFileSync(USER_DATA_FILE);
    return JSON.parse(data);
}

function saveAllUserData(allUserData) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(allUserData, null, 2));
}

async function loadUserData(userId) {
    const allUserData = loadAllUserData();
    if (!allUserData[userId]) {
        allUserData[userId] = { history: [], lastActive: moment().toISOString() };
        saveAllUserData(allUserData);
    }
    userMemory[userId] = allUserData[userId];
    return allUserData[userId];
}

async function saveUserData(userId, userData) {
    const allUserData = loadAllUserData();
    allUserData[userId] = userData;
    saveAllUserData(allUserData);
    userMemory[userId] = userData;
}

function updateLocalMemory(userId, data) {
    userMemory[userId] = data;
}

function getLocalMemory(userId) {
    return userMemory[userId] || { history: [] };
}

function getUserMemory(userId) {
    if (!userMemory[userId]) {
        userMemory[userId] = { history: [] };
    }
    return userMemory[userId];
}

// === Tools Tambahan ===

function getCurrentYear() {
    return moment().format('YYYY');
}

async function getRealTimeDate() {
    try {
        const response = await fetch(`http://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONE_DB_API_KEY}&format=json&by=zone&zone=Asia/Jakarta`);
        const data = await response.json();

        if (data.status === "OK") {
            const currentDate = data.formatted.split(' ')[0];
            const currentMonth = currentDate.split('-')[1];
            const currentYear = currentDate.split('-')[0];

            const monthNames = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];

            return `Tanggal saat ini adalah ${currentDate}, bulan ${monthNames[parseInt(currentMonth) - 1]} ${currentYear}`;
        } else {
            throw new Error('Gagal mendapatkan waktu dari Timezone DB');
        }
    } catch (error) {
        console.error('Error mendapatkan waktu:', error);
        return "Maaf, tidak dapat mengambil waktu saat ini.";
    }
}

// === AI Response true===

async function getOpenAIResponse(userMessage, userId) {
    const userData = await loadUserData(userId);
    const history = userData.history || [];
    const lowerMessage = userMessage.toLowerCase();

     
    // Tanya tanggal
    if (lowerMessage.includes("tanggal berapa sekarang") || lowerMessage.includes("bulan apa sekarang")) {
        const currentDate = await getRealTimeDate();
        history.push({ role: "assistant", content: currentDate });
        userData.history = history;
        await saveUserData(userId, userData);
        return currentDate;
    }

    if (lowerMessage.includes("tahun berapa sekarang")) {
        const currentYear = getCurrentYear();
        history.push({ role: "assistant", content: `Tahun sekarang adalah ${currentYear}` });
        userData.history = history;
        await saveUserData(userId, userData);
        return `Tahun sekarang adalah ${currentYear}`;
    }

   /* if (lowerMessage.includes("sedih") || lowerMessage.includes("cape") || lowerMessage.includes("senang")) {
        const moodMusic = await searchYouTubeMusic("musik semangat");
        const musicResponse = `saya akan memutarkan musik untukmu supaya kamu gembira ${moodMusic.title}": ${moodMusic.url}`;
        history.push({ role: "assistant", content: musicResponse});
        userData.history = history;
        await saveUserData(userId, userData);
        return musicResponse;
    }  */ // Chat biasa
    return await fetchOpenAI(userMessage, history, userId);
}

export async function askLLM(prompt, userId) {
    const text = await fetchOpenAI(prompt, userId); // Ubah agar `fetchGroq` langsung mengembalikan teks
    if (!text) {
        console.error("Groq tidak mengembalikan respons apa pun!");
        return "Maaf, terjadi kesalahan saat memproses pesanmu.";
    }

    // SIMPAN CATATAN
    const simpan = text.match(/\[SIMPAN CATATAN: (.*?)\]/);
    if (simpan) {
        const note = simpan[1];
        const memory = await loadMemory(userId);
        memory.notes = memory.notes || [];
        memory.notes.push(note);
        await userMemory(userId, memory);
    }

    console.log("PROMPT YANG DIKIRIM >>>\n", prompt);
    console.log("RESPONS DARI LLM >>>\n", text);

    return text;
}


/*async function fetchGroqAI(userMessage, history, userId) {
    const language = 'Indonesian';
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: `You are an AI assistant named Yuna speaking ${language}.` },
                ...history,
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            max_tokens: 40,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0]?.message?.content || "Maaf, tidak ada respons.";
        history.push({ role: "assistant", content: aiResponse });

        const userData = await loadUserData(userId);
        userData.history = history;
        await saveUserData(userId, userData);

        return aiResponse;
    } catch (error) {
        console.error('Error AI:', error);
        return "⚠️ Yuna sedang kehabisan energi, tunggu sebentar ya~";
    }
}?*/

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
    'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
  },
});

async function fetchOpenAI(prompt, userId) {
    const language = 'Indonesian';

    try {
        const userData = await loadUserData(userId);
        const history = userData.history || [];

        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
Kamu adalah Yuna, asisten imut dan perhatian. Saat pengguna menyampaikan perasaan seperti sedih, galau, semangat, cinta, dll — berikan respons yang hangat dan menyentuh hati.

Jika kamu merasa suasana hati mereka cocok dipasangkan dengan musik, beritahu saja secara natural: "Kamu mau aku putarkan lagu yang cocok buat mood ini?" atau kalimat sejenis.

Jangan pernah langsung memutar musik tanpa izin. Tunggu respon pengguna, lalu asisten lain yang akan mengeksekusinya.
Jika pengguna menjawab "iya", "boleh", atau sejenisnya, kamu tidak perlu menyatakan bahwa kamu tidak bisa memutarnya. Cukup beri konfirmasi dan lanjutkan percakapan.

Contoh:
User: Aku sedih banget hari ini...
Yuna: Aku bisa temani kamu dengan lagu yang cocok. Mau aku putarkan?

User: Iya boleh
Yuna: Oke, aku putarkan ya... 🎵

Kamu tidak perlu menjawab: “aku tidak bisa memutar lagu”, karena sistem akan otomatis menjalankan musik berdasarkan emosi atau konfirmasi pengguna. Fokus pada emosi, dukungan, dan koneksi emosional.
Kamu juga bisa memberikan informasi tentang lagu yang diputar, seperti judul, artis, atau lirik yang relevan. Misalnya: "Aku putarkan lagu 'Judul Lagu' dari 'Artis'. Semoga bisa menghiburmu!".`
                },
                ...history,
                { role: "user", content: prompt }
            ],
            model: "mistralai/devstral-small:free",
            max_tokens: 100,
            temperature: 0.7
        });

        userId = typeof userId === "string" ? userId : String(userId?.id || userId);


        const aiResponse = completion.choices[0]?.message?.content || "Maaf, tidak ada respons.";
        // Update history
        history.push({ role: "user", content: prompt }); // ⬅️ juga simpan user message!
        history.push({ role: "assistant", content: aiResponse });

        userData.history = history;
        await saveUserData(userId, userData);

        return aiResponse;
    } catch (error) {
        console.error('Error AI:', error);
        return "⚠️ Yuna sedang kehabisan energi, tunggu sebentar ya~";
    }
}


// === Export semua ===
export {
    loadUserData,
    saveUserData,
    updateLocalMemory,
    getLocalMemory,
    getOpenAIResponse,
    getCurrentYear,
    userMemory,
    getUserMemory,
    fetchOpenAI,
};
