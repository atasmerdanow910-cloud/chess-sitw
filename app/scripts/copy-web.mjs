// Копирует сайт из корня репозитория в app/www — оттуда Capacitor упаковывает его в APK.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(app, '..');
const www = join(app, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const item of ['index.html', 'manifest.webmanifest', 'assets', 'vendor']) {
  cpSync(join(root, item), join(www, item), { recursive: true });
}
console.log('Сайт скопирован в', www);
