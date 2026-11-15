import 'dotenv/config';
import { backupDatabase } from './lib/postgres-tools';

const index = process.argv.indexOf('--output');
const output = index >= 0 ? process.argv[index + 1] : undefined;
if (!process.env.DATABASE_URL || !output) {
  console.error('Dùng: npm run db:backup -- --output backups/ten-moi.dump (DATABASE_URL từ .env)');
  process.exitCode = 1;
} else {
  backupDatabase(process.env.DATABASE_URL, output)
    .then((file) => console.log('Backup thành công: ' + file))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
