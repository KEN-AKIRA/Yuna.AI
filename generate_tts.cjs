const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const model = "playai-tts";
const voice = "Celeste-PlayAI";
const responseFormat = "wav";

async function generateTTS(text, userId) {
    const url = "https://api.groq.com/openai/v1/audio/speech";

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            voice: voice,
            input: text,
            response_format: responseFormat
        })
    });

    if (!response.ok) {
        throw new Error(`❌ Gagal request: ${response.status} ${await response.text()}`);
    }

    const buffer = await response.arrayBuffer();
    const outputDir = './audio';

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const outputPath = `${outputDir}/${userId}_response.wav`;
    fs.writeFileSync(outputPath, Buffer.from(buffer));

    console.log(`✅ File audio disimpan di: ${outputPath}`);
    return outputPath;
}

// CLI mode
if (require.main === module) {
    const text = process.argv[2];
    const userId = process.argv[3];

    generateTTS(text, userId).catch(err => {
        console.error("❌ Gagal menghasilkan file audio:", err.message);
    });
}

module.exports = generateTTS;
