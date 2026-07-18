import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function clearDemoUser() {
  const db = await open({ filename: './barq.db', driver: sqlite3.Database });
  console.log('🧹 Deleting demo user if exists...');
  await db.run("DELETE FROM users WHERE username = 'demo'");
  await db.close();
  console.log('✅ Demo user removed.');
}

clearDemoUser().catch(err => { console.error('❌ Failed to clear demo user:', err); process.exit(1); });
