import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import whatsappPkg from 'whatsapp-web.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, initializePool, initializeDatabase, getDefaultTenantId, closePool } from './db.js';

const { Client, LocalAuth } = whatsappPkg;

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SKIP_WHATSAPP = (process.env.DISABLE_WHATSAPP === '1' || process.env.DISABLE_WHATSAPP === 'true');

// Middleware
app.use(cors());
app.use(express.json());

// JWT Middleware - verify token if provided
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.log('Token verification failed:', err.message);
    }
  }
  next();
}

// Require JWT - must have valid token
function requireJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.use(verifyJWT);

let whatsappClientReady = false;
let whatsappClient;

function clearStaleWhatsAppSession() {
  const sessionDir = path.join(__dirname, '.wwebjs_auth');
  if (!fs.existsSync(sessionDir)) {
    return;
  }

  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('🧹 Cleared stale WhatsApp session data');
  } catch (error) {
    console.warn('⚠️ Could not clear stale WhatsApp session data:', error.message);
  }
}

function initializeWhatsAppClient() {
  if (SKIP_WHATSAPP) {
    console.log('⚠️ WhatsApp client initialization skipped (DISABLE_WHATSAPP set)');
    return;
  }
  clearStaleWhatsAppSession();

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ clientId: 'barq-cashier' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  whatsappClient.on('qr', qr => {
    console.log('📱 WhatsApp QR code: scan it with your phone');
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    whatsappClientReady = true;
    console.log('✅ WhatsApp client ready');
  });

  whatsappClient.on('auth_failure', msg => {
    console.error('❌ WhatsApp authentication failure', msg);
  });

  whatsappClient.on('disconnected', reason => {
    whatsappClientReady = false;
    console.log('⚠️ WhatsApp client disconnected:', reason);
  });

  whatsappClient.initialize().catch(error => {
    console.error('❌ Failed to initialize WhatsApp client:', error.message);
    if (error.message.includes('browser is already running')) {
      clearStaleWhatsAppSession();
      setTimeout(() => initializeWhatsAppClient(), 3000);
    }
  });
}

function normalizePhoneForWhatsApp(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '20' + digits.slice(1);
  }
  if (!digits.endsWith('@c.us')) {
    digits = `${digits}@c.us`;
  }
  return digits;
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsAppMessage(phoneNumber, message) {
  const normalized = normalizePhoneForWhatsApp(phoneNumber);
  if (!whatsappClientReady) {
    console.warn('WhatsApp client is not ready yet, message will not be sent:', normalized, message);
    return false;
  }

  try {
    await whatsappClient.sendMessage(normalized, message);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

async function sendOrderInvoiceToCustomer(phoneNumber, customerName, orderNumber, orderId, totalAmount) {
  if (!phoneNumber) return false;

  const items = await db.all(
    `SELECT oi.quantity, oi.unit_price, oi.subtotal, p.name
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const itemLines = items.map(item => `- ${item.name} × ${item.quantity} = ${Number(item.subtotal).toFixed(2)} ج.م`).join('\n');
  const message = `فاتورة طلب Barq\nرقم الطلب: ${orderNumber}\nالعميل: ${customerName}\n\nالمنتجات:\n${itemLines || '- لا توجد عناصر'}\n\nالإجمالي: ${Number(totalAmount).toFixed(2)} ج.م\nشكراً لزيارتك!`;

  const sent = await sendWhatsAppMessage(phoneNumber, message);
  await db.run(
    'INSERT INTO whatsapp_messages (id, order_id, phone_number, message, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), orderId, phoneNumber, message, sent ? 'sent' : 'failed', new Date().toISOString()]
  );

  return sent;
}

// Database is initialized in db.js via initializePool() and initializeDatabase()

// Default menu seeding is handled in db.js via seedDefaultMenuProducts()

// Tenant product seeding can be added here if needed

async function resolveTenantId(inputTenantId) {
  const candidate = (inputTenantId || 'default').toString().trim();
  if (!candidate) {
    return getDefaultTenantId();
  }

  const existingTenant = await db.get('SELECT id FROM tenants WHERE id = ? OR slug = ?', [candidate, candidate]);
  if (existingTenant) {
    return existingTenant.id;
  }

  const tenantId = uuidv4();
  await db.run('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [tenantId, candidate, candidate]);
  return tenantId;
}

function getTenantIdFromRequest(req) {
  return req.headers['x-tenant-id'] || req.headers['x-tenantId'] || req.query?.tenantId || req.query?.tenant || req.body?.tenantId || req.body?.tenant || 'default';
}
// ===================== TENANT APIs ======================
app.post('/api/tenants', async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم العمل مطلوب' });
    }

    const tenantId = uuidv4();
    const tenantSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await db.run('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [tenantId, name, tenantSlug]);

    res.json({ success: true, tenant: { id: tenantId, name, slug: tenantSlug } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Shortcut link for tables: redirects to customer page with table query
app.get('/t/:table', (req, res) => {
  try {
    const table = req.params.table;
    const tenant = req.query.tenantId || req.query.tenant || req.query.xTenant || '';
    const tenantParam = tenant ? `&tenantId=${encodeURIComponent(tenant)}` : '';
    const target = `/customer.html?table=${encodeURIComponent(table)}${tenantParam}`;
    return res.redirect(target);
  } catch (err) {
    return res.status(400).send('Invalid table link');
  }
});

app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await db.all('SELECT id, name, slug, created_at FROM tenants ORDER BY created_at DESC');
    res.json(tenants);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// ===================== AUTH APIs =====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const id = uuidv4();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? AND tenant_id = ?',
      [username, tenantId]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await db.run(
      'INSERT INTO users (id, username, password, email, role, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, hashedPassword, email, role || 'cashier', tenantId]
    );

    // Create JWT token
    const token = jwt.sign(
      { userId: id, username, role: role || 'cashier', tenantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      userId: id, 
      tenantId,
      token,
      user: { id, username, email, role: role || 'cashier' }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Username and password are required' });
    }

    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND tenant_id = ?',
      [username, tenantId]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, tenantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      tenantId 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout endpoint (optional - for token blacklist)
app.post('/api/auth/logout', requireJWT, async (req, res) => {
  // Token is invalidated on client side by removing it from localStorage
  // For production, implement token blacklist in database
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user info
app.get('/api/auth/me', requireJWT, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Setup helper: create tenant and admin user
app.post('/api/setup/create-tenant', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'name, username and password are required' });
    }

    const tenantId = uuidv4();
    const tenantSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    await db.run('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [tenantId, name, tenantSlug]);

    const userId = uuidv4();
    await db.run('INSERT INTO users (id, username, password, role, tenant_id) VALUES (?, ?, ?, ?, ?)', [userId, username, password, 'admin', tenantId]);

    // seed default menu for this tenant
    await seedMenuProductsForTenant(tenantId);

    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, tenantId, admin: { username, password }, links: {
      dashboard: `${base}/?tenantId=${tenantId}`,
      customer: `${base}/customer.html?tenantId=${tenantId}`,
      kitchen: `${base}/kitchen.html?tenantId=${tenantId}`
    }});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a demo/trial tenant and return public links (no forced login for customer/kitchen pages)
app.post('/api/setup/create-demo', async (req, res) => {
  try {
    const name = req.body.name || `Demo-${Date.now()}`;
    const tenantId = uuidv4();
    const tenantSlug = `demo-${Date.now()}`;
    await db.run('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [tenantId, name, tenantSlug]);

    // create an admin account (for owner's later use) with simple credentials
    const adminUser = `admin_${tenantSlug}`;
    const adminPass = `demo`;
    const userId = uuidv4();
    await db.run('INSERT INTO users (id, username, password, role, tenant_id) VALUES (?, ?, ?, ?, ?)', [userId, adminUser, adminPass, 'admin', tenantId]);

    // seed products for demo tenant
    await seedMenuProductsForTenant(tenantId);

    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, tenantId, admin: { username: adminUser, password: adminPass }, links: {
      dashboard: `${base}/?tenantId=${tenantId}`,
      customer: `${base}/customer.html?tenantId=${tenantId}`,
      kitchen: `${base}/kitchen.html?tenantId=${tenantId}`
    }});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/customer/request-code', async (req, res) => {
  try {
    const { customerName, customerPhone } = req.body;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));

    if (customerPhone) {
      const existingOrders = await db.all(
        'SELECT * FROM orders WHERE customer_phone = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1',
        [customerPhone, tenantId]
      );

      return res.json({
        success: true,
        message: 'يمكنك المتابعة مباشرة دون تحقق.',
        previousOrder: existingOrders[0] || null
      });
    }

    res.json({
      success: true,
      message: 'يمكنك المتابعة مباشرة دون تحقق.',
      previousOrder: null
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/customer/verify-code', async (req, res) => {
  res.json({ success: true, customerName: null });
});

app.post('/api/customer/orders', async (req, res) => {
  try {
    const { customerName, customerPhone, items, notes, verificationCode, tableNumber, paymentMethod } = req.body;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('يجب اختيار عناصر من القائمة');
    }

    const orderId = uuidv4();
    const orderNumber = `CUST-${Date.now()}`;
    let totalAmount = 0;

    for (const item of items) {
      const product = await db.get('SELECT price FROM products WHERE id = ?', [item.productId]);
      if (!product) throw new Error('المنتج غير موجود');
      totalAmount += product.price * item.quantity;
    }

    let discount = 0;
    if (customerPhone) {
      const customerOrdersCount = await db.get(
        'SELECT COUNT(*) as count FROM orders WHERE customer_phone = ? AND tenant_id = ? AND payment_status = ?',
        [customerPhone, tenantId, 'paid']
      );
      if (customerOrdersCount?.count >= 2) {
        discount = totalAmount * 0.05;
        totalAmount = Number((totalAmount - discount).toFixed(2));
      }
    }

    await db.run(
      'INSERT INTO orders (id, order_number, user_id, total_amount, status, payment_method, payment_status, customer_name, customer_phone, notes, table_number, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, orderNumber, null, totalAmount, 'pending', paymentMethod || null, 'unpaid', customerName, customerPhone, notes || null, tableNumber || null, tenantId]
    );

    for (const item of items) {
      const itemId = uuidv4();
      const product = await db.get('SELECT price FROM products WHERE id = ?', [item.productId]);
      const subtotal = product.price * item.quantity;

      await db.run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, modifiers, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, orderId, item.productId, item.quantity, product.price, subtotal, item.modifiers || null, tenantId]
      );

      await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );

      const movementId = uuidv4();
      await db.run(
        'INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [movementId, item.productId, 'sale', item.quantity, `Order ${orderNumber}`, tenantId]
      );
    }

    res.json({ success: true, orderId, orderNumber, totalAmount, discount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/customer/orders', async (req, res) => {
  try {
    const { phone } = req.query;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const orders = await db.all(
      'SELECT * FROM orders WHERE customer_phone = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 20',
      [phone, tenantId]
    );
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/tables', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const activeTables = await db.all(
      `SELECT DISTINCT table_number FROM orders 
       WHERE table_number IS NOT NULL 
         AND status IN ('pending','accepted','ready') 
         AND tenant_id = ?`,
      [tenantId]
    );

    const occupiedSet = new Set(activeTables.map(row => row.table_number));
    const tables = Array.from({ length: 8 }, (_, index) => {
      const tableId = String(index + 1);
      return {
        id: tableId,
        label: `طاولة ${tableId}`,
        occupied: occupiedSet.has(tableId)
      };
    });

    res.json(tables);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const order = await db.get('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
    const items = await db.all(
      `SELECT oi.*, p.name, p.sku FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ? AND oi.tenant_id = ?`,
      [req.params.id, tenantId]
    );
    
    res.json({ ...order, items });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== PAYMENT APIs =====================
app.get('/api/products', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const products = await db.all('SELECT * FROM products WHERE tenant_id = ? ORDER BY name', [tenantId]);
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category, stock, sku } = req.body;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const id = uuidv4();

    await db.run(
      'INSERT INTO products (id, name, price, category, stock, sku, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, price, category, stock, sku, tenantId]
    );

    res.json({ success: true, productId: id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, category, stock } = req.body;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    await db.run(
      'UPDATE products SET name = ?, price = ?, category = ?, stock = ? WHERE id = ? AND tenant_id = ?',
      [name, price, category, stock, req.params.id, tenantId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== ORDER APIs =====================
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, customerName, customerPhone, notes, tableNumber } = req.body;
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;
    
    let totalAmount = 0;
    
    // Calculate total
    for (const item of items) {
      const product = await db.get('SELECT price FROM products WHERE id = ?', [item.productId]);
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
    }

    // Insert order
    await db.run(
      'INSERT INTO orders (id, order_number, user_id, total_amount, customer_name, customer_phone, notes, table_number, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, orderNumber, userId, totalAmount, customerName, customerPhone, notes, tableNumber || null, tenantId]
    );

    // Insert order items and update stock
    for (const item of items) {
      const itemId = uuidv4();
      const product = await db.get('SELECT price FROM products WHERE id = ?', [item.productId]);
      const subtotal = product.price * item.quantity;

      await db.run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, modifiers, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, orderId, item.productId, item.quantity, product.price, subtotal, item.modifiers || null, tenantId]
      );

      // Update stock
      await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );

      // Record stock movement
      const movementId = uuidv4();
      await db.run(
        'INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [movementId, item.productId, 'sale', item.quantity, `Order ${orderNumber}`, tenantId]
      );
    }

    if (customerPhone) {
      await sendOrderInvoiceToCustomer(customerPhone, customerName, orderNumber, orderId, totalAmount);
    }

    res.json({ success: true, orderId, orderNumber, totalAmount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const includeItems = req.query.includeItems === 'true';
    const orders = await db.all(
      'SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100',
      [tenantId]
    );

    if (includeItems && orders.length) {
      const orderIds = orders.map(order => order.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await db.all(
        `SELECT oi.*, p.name, p.sku FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id IN (${placeholders}) AND oi.tenant_id = ?`,
        [...orderIds, tenantId]
      );

      const itemsByOrderId = items.reduce((carry, item) => {
        const list = carry[item.order_id] || [];
        list.push(item);
        carry[item.order_id] = list;
        return carry;
      }, {});

      orders.forEach(order => {
        order.items = itemsByOrderId[order.id] || [];
      });
    }

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    const order = await db.get('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
    const items = await db.all(
      `SELECT oi.*, p.name, p.sku FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ? AND oi.tenant_id = ?`,
      [req.params.id, tenantId]
    );
    
    res.json({ ...order, items });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'حالة الطلب غير صحيحة' });
    }

    const tenantId = await resolveTenantId(getTenantIdFromRequest(req));
    await db.run('UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?', [status, req.params.id, tenantId]);

    if (status === 'ready') {
      const order = await db.get('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
      if (order && order.customer_phone) {
        const message = `طلب رقم ${order.order_number} جاهز للاستلام الآن.`;
        await db.run(
          'INSERT INTO whatsapp_messages (id, order_id, phone_number, message, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), req.params.id, order.customer_phone, message, 'sent', new Date().toISOString()]
        );
        console.log(`📱 WhatsApp notification to ${order.customer_phone}: ${message}`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== PAYMENT APIs =====================
app.post('/api/payments', async (req, res) => {
  try {
    const { orderId, amount, method } = req.body;
    const paymentId = uuidv4();
    const transactionId = `TXN-${Date.now()}`;

    await db.run(
      'INSERT INTO payments (id, order_id, amount, method, transaction_id) VALUES (?, ?, ?, ?, ?)',
      [paymentId, orderId, amount, method, transactionId]
    );

    // Update order payment status
    await db.run(
      'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
      ['paid', 'completed', orderId]
    );

    res.json({ success: true, paymentId, transactionId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments/:orderId', async (req, res) => {
  try {
    const payments = await db.all(
      'SELECT * FROM payments WHERE order_id = ?',
      [req.params.orderId]
    );
    res.json(payments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== STOCK APIs =====================
app.get('/api/stock/movements', async (req, res) => {
  try {
    const movements = await db.all(
      `SELECT sm.*, p.name FROM stock_movements sm 
       JOIN products p ON sm.product_id = p.id 
       ORDER BY sm.created_at DESC LIMIT 100`
    );
    res.json(movements);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/stock/adjust', async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    const movementId = uuidv4();

    await db.run(
      'INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason) VALUES (?, ?, ?, ?, ?)',
      [movementId, productId, 'adjustment', quantity, reason]
    );

    await db.run(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [quantity, productId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/stock/low-stock', async (req, res) => {
  try {
    const lowStockItems = await db.all(
      'SELECT * FROM products WHERE stock <= min_stock ORDER BY stock'
    );
    res.json(lowStockItems);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== REPORTS APIs =====================
app.get('/api/reports/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const sales = await db.all(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount
      FROM orders
      WHERE payment_status = 'paid'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [startDate, endDate]
    );
    
    res.json(sales);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/products', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const productSales = await db.all(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as quantity_sold,
        SUM(oi.subtotal) as revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid'
        AND DATE(o.created_at) BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY revenue DESC`,
      [startDate, endDate]
    );
    
    res.json(productSales);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/summary', async (req, res) => {
  try {
    const summary = await db.all(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order,
        COUNT(DISTINCT user_id) as unique_customers
      FROM orders
      WHERE payment_status = 'paid'`
    );
    
    res.json(summary[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== WHATSAPP APIs =====================
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { orderId, phoneNumber, message } = req.body;
    const msgId = uuidv4();
    const sent = await sendWhatsAppMessage(phoneNumber, message);

    await db.run(
      'INSERT INTO whatsapp_messages (id, order_id, phone_number, message, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, orderId, phoneNumber, message, sent ? 'sent' : 'failed', new Date().toISOString()]
    );

    if (!sent) {
      return res.status(500).json({ error: 'فشل إرسال رسالة واتساب' });
    }

    res.json({ success: true, messageId: msgId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===================== HEALTH CHECK =====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ===================== STATIC FILES =====================
app.use(express.static(path.join(__dirname, 'public')));

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    await initializePool();
    await initializeDatabase();
    if (!SKIP_WHATSAPP) initializeWhatsAppClient();
    
    app.listen(PORT, HOST, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🚀 Barq Cashier System Started!     ║
║   API: http://${HOST}:${PORT}          ║
║   Web: http://${HOST}:${PORT}/          ║
║   Database: PostgreSQL (Neon)         ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
