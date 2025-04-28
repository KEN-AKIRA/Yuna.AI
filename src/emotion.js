// emotion.js

/**
 * Deteksi emosi sederhana berdasarkan kata-kata dalam teks
 * @param {string} text - Kalimat yang akan dianalisis
 * @returns {string} - Salah satu emosi: happy, sad, angry, afraid, love, atau neutral
 */
export function detectEmotion(text) {
    if (typeof text !== 'string' || !text.trim()) {
        console.warn("⚠️ Input tidak valid untuk fungsi detectEmotion.");
        return 'neutral';
    }

    const lowerText = text.toLowerCase();

    const emotionKeywords = {
        happy: ['senang', 'bahagia', 'gembira', 'ceria', 'asyik', 'haha'],
        sad: ['sedih', 'kecewa', 'menangis', 'galau', 'luka'],
        angry: ['marah', 'kesal', 'geram', 'benci', 'emosi', 'marah'],
        afraid: ['takut', 'cemas', 'khawatir', 'waswas'],
        love: ['cinta', 'sayang', 'rindu', 'romantis'],
        neutral: ['biasa', 'normal', 'netral'],
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return emotion;
        }
    }

    return 'neutral';
}
