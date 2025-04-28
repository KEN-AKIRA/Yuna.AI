import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { detectEmotion } from './emotion.js';

export async function createTTS(text, userId, socket) {
    const wavPath = `./audio/${userId}_response.wav`;
    const oggPath = `./audio/${userId}_response.ogg`;

    const emotion = detectEmotion(text);
    console.log(`🎭 Emosi terdeteksi: ${emotion}`);

    // Jalankan Python Bark
    const pythonCommand = `python bark_tts.py "${text.replace(/"/g, "'")}" "${wavPath}" "${emotion}"`;

    exec(pythonCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Gagal menjalankan Bark TTS: ${error.message}`);
            return;
        }

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
                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
                if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath);
            }
        } else {
            console.error("❌ File .wav tidak ditemukan setelah proses Bark TTS.");
        }
    });
}
