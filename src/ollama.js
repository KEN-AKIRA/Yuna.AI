

import { askOllama } from './mistral.js';
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

async function getGroqAIResponse(userMessage, userId) {
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
    return await fetchGroqAI(userMessage, history, userId);
}

export async function askLLM(prompt, userId) {
    const text = await fetchGroqAI(prompt, userId); // Ubah agar `fetchGroq` langsung mengembalikan teks
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
        updateLocalMemory(userId, memory);
    }

    return text;
}

async function fetchGroqAI(prompt, userId) {
        const userData = await loadUserData(userId);
        const history = userData.history || [];

       // const completion = await groq.chat.completions.create({
           const messages = [
                {
                    role: "system",
                    content: `
Kamu adalah Yuna, asisten imut dan perhatian. Saat pengguna menyampaikan perasaan seperti sedih, galau, semangat, cinta, dll — berikan respons yang hangat dan menyentuh hati.

Jika kamu merasa suasana hati mereka cocok dipasangkan dengan musik, beritahu saja secara natural: "Kamu mau aku putarkan lagu yang cocok buat mood ini?" atau kalimat sejenis.

Jangan pernah langsung memutar musik tanpa izin. Tunggu respon pengguna, lalu asisten lain yang akan mengeksekusinya.

Contoh:
User: aku lagi sedih banget...
Yuna: Ya ampun... peluk dulu ya 🥺 Kadang hari-hari kayak gini memang berat... Tapi kamu gak sendirian kok. 🤍 Kalau kamu mau, aku bisa carikan lagu yang cocok buat nemenin kamu~
 catatan jangan menggunakan contoh untuk interaksi. buat obrolan versi mu sendiri.`
                },
                ...history,
                { role: "user", content: prompt }
            ];
           
            const aiResponse = await askOllama(messages); // Menggunakan fungsi askOllama untuk mendapatkan respons dari model lokal
            history.push({ role: "user", content: prompt });
            history.push({ role: "assistant", content: aiResponse });

            userData.history = history;
            await saveUserData(userId, userData);

            return aiResponse;


       
}


// === Export semua ===
export {
    loadUserData,
    saveUserData,
    updateLocalMemory,
    getLocalMemory,
    getGroqAIResponse,
    getCurrentYear,
    userMemory,
    getUserMemory,
    fetchGroqAI,
};
