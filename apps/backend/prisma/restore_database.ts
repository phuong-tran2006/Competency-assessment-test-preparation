import 'dotenv/config';
import { restoreDatabase } from './lib/postgres-tools';

const index = process.argv.indexOf('--input');
const input = index >= 0 ? process.argv[index + 1] : undefined;
if (!process.env.RESTORE_DATABASE_URL || !input) {
  console.error('Đặt RESTORE_DATABASE_URL trỏ tới DB kiểm thử rỗng, chạy npm run db:restore -- --input backups/ten.dump');
  process.exitCode = 1;
} else {
  restoreDatabase(process.env.RESTORE_DATABASE_URL, input)
    .then(() => console.log('Restore thành công vào database kiểm thử rỗng.'))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
