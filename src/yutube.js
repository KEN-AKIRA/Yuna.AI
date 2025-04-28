// src/youtube.js

import youtubedl from 'youtube-dl-exec';  // Pastikan menggunakan youtube-dl-exec
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

async function searchYouTubeMusic(query) {
    try {
        // Ini contoh search manual karena pakai ytdl-core tidak ada search, biasanya cari ID dulu.
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+official+audio`;
        const res = await fetch(searchUrl);
        const text = await res.text();
        const videoIdMatch = text.match(/"videoId":"(.*?)"/);
        if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            return `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            return 'Tidak dapat menemukan lagu.';
        }
    } catch (error) {
        console.error('Error saat mencari musik:', error);
        return 'Tidak dapat menemukan lagu.';
    }
}

async function downloadYouTubeAudio(url, outputPath) {
    return new Promise((resolve, reject) => {
        youtubedl(url, {
            format: 'bestaudio/best',
            output: outputPath  // Ganti --outtmpl dengan --output
        })
        .then(() => resolve())
        .catch(reject);
    });
}

let musicRequestContext = null; // Menyimpan konteks permintaan musik

// Fungsi untuk menangani permintaan musik
async function handlePlayMusic(query, sender, searchYouTubeMusic, downloadYouTubeAudio, sendMessageToWhatsApp, sendAudioToWhatsApp) {
    const { videoUrl, title } = await searchYouTubeMusic(query);

    if (videoUrl) {
        // Menyimpan konteks permintaan musik
        musicRequestContext = { query, title, videoUrl };

        // Mengunduh musik
        const outputPath = path.join(__dirname, 'temp', `${sender}_music.mp3`);
        await downloadYouTubeAudio(videoUrl, outputPath);

        // Kirim pesan bahwa musik sudah siap diputar
        sendMessageToWhatsApp(sender, `wait, saya akan memutarkan musik "${title}".`);

        // Kirim musik ke WhatsApp
        sendAudioToWhatsApp(sender, outputPath);
    } else {
        sendMessageToWhatsApp(sender, 'Maaf, saya tidak bisa menemukan lagu itu.');
    }
}

// Fungsi untuk memeriksa konteks saat pertanyaan dilontarkan
function handleContextInquiry(sender, sendMessageToWhatsApp) {
    if (musicRequestContext) {
        sendMessageToWhatsApp(sender, `Ya, kamu tadi meminta untuk memutar musik "${musicRequestContext.title}".`);
    } else {
        sendMessageToWhatsApp(sender, 'Saya tidak menemukan permintaan musik sebelumnya.');
    }
}

export { searchYouTubeMusic, downloadYouTubeAudio, handlePlayMusic, handleContextInquiry };
