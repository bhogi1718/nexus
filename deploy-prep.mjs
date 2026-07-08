// Builds the React client and copies it into server/public so the Express
// app can serve it. Run before `eb deploy`:
//   node deploy-prep.mjs
import { execSync } from 'child_process';
import { cpSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));

console.log('▶ Building client...');
execSync('npm run build', { cwd: path.join(root, 'client'), stdio: 'inherit', shell: true });

console.log('▶ Copying build to server/public...');
rmSync(path.join(root, 'server', 'public'), { recursive: true, force: true });
cpSync(path.join(root, 'client', 'dist'), path.join(root, 'server', 'public'), { recursive: true });

console.log('✓ Done. Now run: cd server && eb deploy');
