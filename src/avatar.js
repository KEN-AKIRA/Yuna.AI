// avatar.js

import fs from 'fs';
import path from 'path';

// Lokasi avatar statis sesuai emosi (ganti dengan gambar sesuai kebutuhanmu)
const avatarPaths = {
    happy: './avatars/happy.png',
    sad: './avatars/sad.png',
    angry: './avatars/angry.png',
    afraid: './avatars/afraid.png',
    love: './avatars/love.png',
    neutral: './avatars/neutral.png'
};

// Fungsi untuk mendapatkan gambar avatar berdasarkan emosi
export function getAvatar(emotion) {
    const filePath = avatarPaths[emotion] || avatarPaths['neutral'];

    // Pastikan file gambar ada
    if (!fs.existsSync(filePath)) {
        console.warn(`Avatar tidak ditemukan untuk emosi: ${emotion}`);
        return avatarPaths['neutral']; // default avatar jika tidak ditemukan
    }

    return filePath;
}
