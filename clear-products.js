import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function clearProducts() {
  const db = await open({ filename: './barq.db', driver: sqlite3.Database });
  console.log('🧹 Deleting existing products...');
  await db.run('DELETE FROM products');
  await db.run('DELETE FROM order_items');
  await db.run('DELETE FROM orders');
  await db.run('DELETE FROM payments');
  await db.close();
  console.log('✅ Cleared products, orders, payments, and order_items.');
}

clearProducts().catch(err => { console.error('❌ Failed to clear products:', err); process.exit(1); });
