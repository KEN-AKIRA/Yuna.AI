import sys
import os
from bark import generate_audio, preload_models
from bark.generation import SAMPLE_RATE  # Import dari bark.generation langsung
import soundfile as sf

def main():
    # Mengecek apakah argument yang diperlukan sudah diberikan
    if len(sys.argv) < 4:
        print("Usage: python bark_tts.py <text> <output_path> <style>")
        return

    # Mengambil argumen input
    text = sys.argv[1]
    output_path = sys.argv[2]
    style = sys.argv[3]

    print(f"Menghasilkan audio Bark dengan gaya: {style}")
    print(f"Teks yang akan diubah menjadi audio: {text}")
    print(f"Audio akan disimpan di: {output_path}")

    # Memuat model untuk pertama kali
    print(f"⏳ Memuat model...")

    try:
        preload_models()
        print(f"[INFO] Memuat model...")

    except Exception as e:
        print(f"Gagal memuat model: {e}")
        return

    # Menentukan preset suara berdasarkan gaya yang dipilih
    voice_presets = {
        "normal": "v2/en_speaker_1",
        "cheerful": "v2/en_speaker_2",
        "sad": "v2/en_speaker_3",
        "angry": "v2/en_speaker_4",
        "romantic": "v2/en_speaker_5",
        "nervous": "v2/en_speaker_6",
        "neutral": "v2/en_speaker_1"
    }

    # Menyimpan preset yang sesuai dengan gaya
    preset = voice_presets.get(style, "v2/en_speaker_1")
    print(f"🎙️ Menggunakan preset suara: {preset}")

    # Menghasilkan audio
    print("⏳ Memulai proses generasi audio...")
    try:
        audio_array = generate_audio(text, history_prompt=preset)
        print("✅ Audio berhasil dihasilkan.")
    except Exception as e:
        print(f"❌ Gagal menghasilkan audio: {e}")
        return

    # Mengecek apakah direktori tempat menyimpan audio ada, jika tidak, buat direktori tersebut
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        print(f"✅ Direktori tempat menyimpan audio sudah ada atau berhasil dibuat.")
    except Exception as e:
        print(f"❌ Gagal membuat direktori: {e}")
        return

    # Menyimpan audio ke file WAV
    try:
        sf.write(output_path, audio_array, SAMPLE_RATE)
        print(f"✅ Audio disimpan ke {output_path}")
    except Exception as e:
        print(f"❌ Gagal menyimpan audio: {e}")
        return

if __name__ == "__main__":
    main()
