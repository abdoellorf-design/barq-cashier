import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

let pool;
let defaultTenantId = null;

export async function initializePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });

  console.log('🔗 Connecting to PostgreSQL...');
  
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    throw error;
  }
}

export async function initializeDatabase() {
  if (!pool) {
    throw new Error('Pool not initialized. Call initializePool first.');
  }

  try {
    // Create all tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'cashier',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        UNIQUE(username, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category TEXT,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        sku TEXT UNIQUE,
        image_url TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        user_id TEXT,
        total_amount DECIMAL(10, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'unpaid',
        customer_name TEXT,
        customer_phone TEXT,
        table_number TEXT,
        notes TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        UNIQUE(order_number, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        modifiers TEXT,
        tenant_id TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method TEXT,
        status TEXT DEFAULT 'completed',
        transaction_id TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        movement_type TEXT,
        quantity INTEGER,
        reason TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        phone_number TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        tenant_id TEXT,
        sent_at TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL,
        customer_name TEXT,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );
    `);

    console.log('✅ Database schema created/verified');

    // Create default tenant if needed
    const defaultTenantSlug = 'default';
    const result = await pool.query('SELECT id FROM tenants WHERE slug = $1', [defaultTenantSlug]);
    
    if (result.rows.length === 0) {
      defaultTenantId = uuidv4();
      await pool.query(
        'INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)',
        [defaultTenantId, 'Default Tenant', defaultTenantSlug]
      );
      console.log('✅ Default tenant created');
    } else {
      defaultTenantId = result.rows[0].id;
    }

    // Seed default products
    await seedDefaultMenuProducts();

  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

export async function seedDefaultMenuProducts() {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1',
      [defaultTenantId]
    );

    if (parseInt(result.rows[0].count) > 0) {
      return; // Already seeded
    }

    const products = [
      { name: 'سموذي بطيخ', price: 100, category: 'سموثي', sku: 'SMO001', stock: 50 },
      { name: 'سموذي رمان', price: 100, category: 'سموثي', sku: 'SMO002', stock: 50 },
      { name: 'سموذي أفوكادو', price: 100, category: 'سموثي', sku: 'SMO003', stock: 50 },
      { name: 'سموذي فراولة', price: 100, category: 'سموثي', sku: 'SMO004', stock: 50 },
      { name: 'سموذي مانجو', price: 100, category: 'سموثي', sku: 'SMO005', stock: 50 },
      { name: 'برجر بقري', price: 95, category: 'برجرز', sku: 'BRG001', stock: 100 },
      { name: 'برجر دجاج', price: 85, category: 'برجرز', sku: 'BRG002', stock: 100 },
      { name: 'برجر نباتي', price: 80, category: 'برجرز', sku: 'BRG003', stock: 50 },
      { name: 'بطاطس مقلية', price: 35, category: 'جانب', sku: 'SID001', stock: 200 },
      { name: 'حلقات بصل', price: 40, category: 'جانب', sku: 'SID002', stock: 100 },
      { name: 'مشروب غازي صغير', price: 20, category: 'مشروبات', sku: 'DRK001', stock: 500 },
      { name: 'مشروب غازي وسط', price: 30, category: 'مشروبات', sku: 'DRK002', stock: 500 },
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (id, name, price, category, sku, stock, tenant_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (sku) DO NOTHING`,
        [uuidv4(), product.name, product.price, product.category, product.sku, product.stock, defaultTenantId]
      );
    }

    console.log('✅ Default menu products seeded');
  } catch (error) {
    console.error('⚠️ Could not seed products:', error.message);
  }
}

// Compatibility wrapper for SQLite-style queries
export const db = {
  async get(sql, params) {
    const result = await pool.query(convertSQL(sql), params);
    return result.rows[0] || null;
  },

  async all(sql, params) {
    const result = await pool.query(convertSQL(sql), params);
    return result.rows;
  },

  async run(sql, params) {
    const result = await pool.query(convertSQL(sql), params);
    return result;
  },

  async exec(sql) {
    // Split multiple statements
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
  }
};

// Convert SQLite SQL to PostgreSQL
function convertSQL(sql) {
  let converted = sql;
  
  // Replace ? with $1, $2, etc.
  let paramCount = 0;
  converted = converted.replace(/\?/g, () => {
    paramCount++;
    return `$${paramCount}`;
  });

  // DATETIME to TIMESTAMP
  converted = converted.replace(/DATETIME/gi, 'TIMESTAMP');
  
  // REAL to DECIMAL
  converted = converted.replace(/\bREAL\b/gi, 'DECIMAL(10, 2)');
  
  // TEXT PRIMARY KEY to UUID
  converted = converted.replace(/TEXT PRIMARY KEY/gi, 'TEXT PRIMARY KEY');

  return converted;
}

export function getPool() {
  return pool;
}

export function getDefaultTenantId() {
  return defaultTenantId;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}
