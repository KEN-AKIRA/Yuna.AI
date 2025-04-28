import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { detectEmotion } from './emotion.js'; // ⬅️ Import emotion detector

export async function createTTS(text, userId, socket) {
    const wavPath = `./audio/${userId}_response.wav`;
    const oggPath = `./audio/${userId}_response.ogg`;

    // Deteksi emosi dari teks
    const emotion = detectEmotion(text);
    console.log(`🎭 Emosi terdeteksi: ${emotion}`);

    // Tentukan style suara berdasarkan emosi
    let voiceStyle = "normal"; // default
    if (emotion === 'happy') voiceStyle = "cheerful";
    else if (emotion === 'sad') voiceStyle = "sad";
    else if (emotion === 'angry') voiceStyle = "angry";
    else if (emotion === 'afraid') voiceStyle = "nervous";
    else if (emotion === 'love') voiceStyle = "romantic";
    else if (emotion === 'neutral') voiceStyle = "normal";

    // Jalankan JavaScript untuk membuat TTS (generate .wav) dengan emosi style
    exec(`node generate_tts.cjs "${text.replace(/"/g, "'")}" "${userId}" "${voiceStyle}"`, async (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Gagal menjalankan TTS JavaScript: ${error.message}`);
            return;
        }

        // Setelah file .wav selesai dibuat
        if (fs.existsSync(wavPath)) {
            try {
                // Konversi ke OGG Opus
                execSync(`ffmpeg -y -i "${wavPath}" -c:a libopus -b:a 64k "${oggPath}"`);
                
                // Kirim ke WhatsApp
                const audioBuffer = fs.readFileSync(oggPath);
                await socket.sendMessage(userId, {
                    audio: audioBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                });

                console.log(`🔊 Audio berhasil dikirim ke ${userId}`);
            } catch (convErr) {
                console.error("❌ Gagal mengkonversi ke .ogg:", convErr.message);
            } finally {
                // Hapus file
                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
                if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
            }
        } else {
            console.error("❌ File .wav tidak ditemukan setelah proses TTS.");
        }
    });
}
