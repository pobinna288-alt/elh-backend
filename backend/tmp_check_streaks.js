const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const appDb = path.join(process.cwd(), 'backend', 'data', 'app.db');
const authDb = path.join(process.cwd(), 'backend', 'data', 'auth-security.sqlite');
console.log('appDb', fs.existsSync(appDb), appDb);
console.log('authDb', fs.existsSync(authDb), authDb);
if (fs.existsSync(appDb)) {
  const db = new Database(appDb, { readonly: true });
  const rows = db.prepare('SELECT id,email,phone,data FROM users LIMIT 10').all();
  console.log('app users', rows.length);
  rows.forEach((r, i) => {
    try {
      const data = JSON.parse(r.data);
      console.log(i, r.id, r.email, r.phone, data.daily_streak, data.current_streak, data.streak_count, data.last_active_date);
    } catch (e) {
      console.error('parse fail', i, e.message);
    }
  });
}
if (fs.existsSync(authDb)) {
  const db = new Database(authDb, { readonly: true });
  const rows = db.prepare('SELECT userId,normalizedPhone,userJson FROM auth_users LIMIT 10').all();
  console.log('auth users', rows.length);
  rows.forEach((r, i) => {
    try {
      const user = JSON.parse(r.userJson);
      console.log(i, r.userId, r.normalizedPhone, user.daily_streak, user.current_streak, user.streak_count, user.last_active_date);
    } catch (e) {
      console.error('parse fail auth', i, e.message);
    }
  });
}
