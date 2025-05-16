import os
import json
from deepface import DeepFace
import numpy as np
from pathlib import Path
import time

# Fungsi untuk memeriksa apakah gambar ada
def check_image_exists(image_path):
    if not os.path.exists(image_path):
        raise ValueError(f"File gambar tidak ditemukan di {image_path}")

# Fungsi untuk mengonversi float32 ke float biasa
def convert_to_float(obj):
    if isinstance(obj, np.float32):
        return float(obj)
    raise TypeError(f'Object of type {obj.__class__.__name__} is not serializable')

# Fungsi untuk menganalisis gambar
def analyze_image(image_path):
    try:
        check_image_exists(image_path)
    except ValueError as e:
        print(e)
        return
    else:
        # Lakukan analisis wajah menggunakan DeepFace dengan enforce_detection=False
        result = DeepFace.analyze(image_path, actions=['emotion', 'age', 'gender', 'race'], enforce_detection=False)

        # Hasil analisis
        emotion = result[0]['dominant_emotion']
        age = result[0]['age']

        gender_data = result[0]['gender']
        gender = max(gender_data, key=gender_data.get)
        
        race = result[0]['dominant_race']

        # Output yang akan diserialisasi menjadi JSON
        output = {
            "emotion": emotion,
            "age": age,
            "gender": gender,
            "race": race
        }

        # Menyusun hasil menjadi format JSON dengan konversi float32 ke float
        print(json.dumps(output, default=convert_to_float, ensure_ascii=False))


def get_latest_image(folder_path):
    # Ambil semua file gambar dalam folder
    image_files = list(Path(folder_path).glob("*.[jp][pn]g"))  # cocokkan jpg, jpeg, png
    if not image_files:
        return None
    
    # Urutkan berdasarkan waktu modifikasi terakhir
    latest_file = max(image_files, key=lambda f: f.stat().st_mtime)
    return latest_file

# Gunakan di kode utama
folder = './downloads'
latest_image = get_latest_image(folder)

if latest_image:
    print(f"Gambar terbaru: {latest_image.name}")
    analyze_image(latest_image)
else:
    print("⚠️ Tidak ada gambar ditemukan di folder.")

# Misal gambar yang baru saja diterima disimpan di folder './downloads'
#image_filename = '1745904668281.jpg'
#image_path = Path('./downloads') / image_filename

# Analisis gambar yang baru diterima
#analyze_image(get_latest_image(folder))
