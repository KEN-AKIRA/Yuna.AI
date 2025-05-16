
import { exec } from 'child_process';

export function analyzeFace(filePath) {
  return new Promise((resolve, reject) => {
    exec(`python analyze.py ${filePath}`, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ DeepFace Error:', err);
        return reject(err);
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseErr) {
        console.error('❌ JSON Parse Error:', parseErr);
        reject(parseErr);
      }
    });
  });
}


