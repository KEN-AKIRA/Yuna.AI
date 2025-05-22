import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

export async function generateTTS(text, userId) {
    const url = "https://api.deepgram.com/v1/speak?model=aura-2-amalthea-en&encoding=linear16&sample_rate=16000";

    try {
        const wavPath = `./temp/${userId}_tts.wav`;
        const oggPath = `./temp/${userId}_tts.ogg`;

        const response = await axios.post(url, { text }, {
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        fs.writeFileSync(wavPath, response.data);

        // Konversi WAV ke OGG
        await new Promise((resolve, reject) => {
            ffmpeg(wavPath)
                .output(oggPath)
                .audioCodec('libopus')
                .format('ogg')
                .on('end', () => {
                    console.log("🎧 Konversi ke OGG selesai:", oggPath);
                    resolve();
                })
                .on('error', (err) => {
                    console.error("❌ Gagal konversi ke OGG:", err);
                    reject(err);
                })
                .run();
        });

        return oggPath;
    } catch (error) {
        console.error("❌ Gagal generate TTS:", error.response?.data || error.message);
        return null;
    }
}
