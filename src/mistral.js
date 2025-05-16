// src/ollama.js
import fetch from 'node-fetch';

export async function askOllama(messages, model = "gemma:2b", temperature = 0.7) {
    try {
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                options: { temperature }
            })
        });

        const data = await response.json();
        return data.message?.content || "Maaf, tidak ada respons.";
    } catch (err) {
        console.error("Error saat menghubungi Ollama:", err);
        return "⚠️ Gagal menghubungi model lokal Mistral.";
    }
}
