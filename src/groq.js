// src/groq.js

import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import { writeFile } from 'fs/promises';

dotenv.config();

// === Set up ===
const USER_DATA_FILE = path.join('./users.json');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

// === AI Response ===

async function getGroqAIResponse(userMessage, userId) {
    const userData = await loadUserData(userId);
    const history = userData.history || [];
    const lowerMessage = userMessage.toLowerCase();

    // Pencarian musik
    if (lowerMessage.includes('musik') || lowerMessage.includes('lagu') || lowerMessage.includes('play') || lowerMessage.includes('dj') || lowerMessage.includes('carikan')) {
        const query = lowerMessage.replace(/(musik|lagu|play|dj|carikan)/g, '').trim();
        const songUrl = await searchYouTubeMusic(query);

        if (songUrl && !songUrl.includes('Tidak dapat')) {
            userData.lastMusicRequest = { success: true, title: query, url: songUrl };
            await saveUserData(userId, userData);
            return `🎵 Ini dia yang aku temukan untuk *${query}*:\n${songUrl}`;
        } else {
            userData.lastMusicRequest = { success: false, query };
            await saveUserData(userId, userData);
            return `😔 Maaf, aku tidak menemukan musik untuk "${query}". Mau coba kata kunci lain?`;
        }
    }

    // Tanya tanggal
    if (lowerMessage.includes("tanggal berapa sekarang") || lowerMessage.includes("bulan apa sekarang")) {
        const currentDate = await getRealTimeDate();
        history.push({ role: "assistant", content: currentDate });
        userData.history = history;
        await saveUserData(userId, userData);
        return currentDate;
    }

    // Chat biasa
    return await fetchGroqAI(userMessage, history, userId);
}

async function fetchGroqAI(userMessage, history, userId) {
    const language = 'Indonesian';
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: `You are an AI assistant named Yuna speaking ${language}.` },
                ...history,
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            max_tokens: 300,
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
        return "Maaf, terjadi kesalahan dalam memproses pesan.";
    }
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
    getUserMemory
};
