import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase() {
  const db = await open({
    filename: './barq.db',
    driver: sqlite3.Database
  });

  console.log('🌱 Adding demo data...');

  // Add demo user
  const userId = uuidv4();
  await db.run(
    'INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
    [userId, 'demo', '123456', 'demo@barq.com', 'cashier']
  );
  console.log('✅ Demo user created: demo / 123456');

  // Add demo products
  const products = [
    // Hot drinks
    { name: 'قهوة تركي', price: 45, category: 'مشروبات ساخنة', sku: 'HOT001', stock: 100 },
    { name: 'قهوة تركي دوبل', price: 55, category: 'مشروبات ساخنة', sku: 'HOT002', stock: 100 },
    { name: 'قهوة فرنسية', price: 60, category: 'مشروبات ساخنة', sku: 'HOT003', stock: 100 },
    { name: 'اسبريسو سينجل', price: 50, category: 'مشروبات ساخنة', sku: 'HOT004', stock: 100 },
    { name: 'اسبريسو دبل', price: 65, category: 'مشروبات ساخنة', sku: 'HOT005', stock: 100 },
    { name: 'نسكافيه بالحليب', price: 60, category: 'مشروبات ساخنة', sku: 'HOT006', stock: 100 },
    { name: 'امريكانو', price: 65, category: 'مشروبات ساخنة', sku: 'HOT007', stock: 100 },
    { name: 'كابتشينو', price: 75, category: 'مشروبات ساخنة', sku: 'HOT008', stock: 100 },
    { name: 'لاتيه', price: 70, category: 'مشروبات ساخنة', sku: 'HOT009', stock: 100 },
    { name: 'اسبانيش لاتيه', price: 80, category: 'مشروبات ساخنة', sku: 'HOT010', stock: 100 },
    { name: 'كورتادو', price: 80, category: 'مشروبات ساخنة', sku: 'HOT011', stock: 100 },
    { name: 'فلات وايت', price: 80, category: 'مشروبات ساخنة', sku: 'HOT012', stock: 100 },
    { name: 'ماكياتو', price: 70, category: 'مشروبات ساخنة', sku: 'HOT013', stock: 100 },

    // Cold & blended
    { name: 'فرابيه كلاسيك', price: 100, category: 'فرابيه', sku: 'FRAP001', stock: 80 },
    { name: 'فرابيه كراميل', price: 100, category: 'فرابيه', sku: 'FRAP002', stock: 80 },
    { name: 'فرابيه لوتس', price: 105, category: 'فرابيه', sku: 'FRAP003', stock: 80 },
    { name: 'فرابيه موكا', price: 100, category: 'فرابيه', sku: 'FRAP004', stock: 80 },
    { name: 'فرابيه نوتيلا', price: 105, category: 'فرابيه', sku: 'FRAP005', stock: 80 },

    // Smoothies
    { name: 'سموذي ليمون', price: 80, category: 'سموذي', sku: 'SMO001', stock: 80 },
    { name: 'سموذي ليمون نعناع', price: 85, category: 'سموذي', sku: 'SMO002', stock: 80 },
    { name: 'سموذي مانجو', price: 90, category: 'سموذي', sku: 'SMO003', stock: 80 },
    { name: 'سموذي فراولة', price: 90, category: 'سموذي', sku: 'SMO004', stock: 80 },
    { name: 'سموذي بيتش', price: 90, category: 'سموذي', sku: 'SMO005', stock: 80 },
    { name: 'سموذي بطيخ', price: 90, category: 'سموذي', sku: 'SMO006', stock: 80 },

    // Fresh juices
    { name: 'عصير مانجو', price: 80, category: 'فريش', sku: 'FRESH001', stock: 120 },
    { name: 'عصير فراولة', price: 80, category: 'فريش', sku: 'FRESH002', stock: 120 },
    { name: 'عصير برتقال', price: 80, category: 'فريش', sku: 'FRESH003', stock: 120 },
    { name: 'عصير جوافة', price: 80, category: 'فريش', sku: 'FRESH004', stock: 120 },
    { name: 'عصير كيوي', price: 85, category: 'فريش', sku: 'FRESH005', stock: 120 },
    { name: 'عصير افوكادو', price: 90, category: 'فريش', sku: 'FRESH006', stock: 120 },

    // Soft drinks
    { name: 'مياه', price: 15, category: 'مشروبات غازية', sku: 'SFT001', stock: 300 },
    { name: 'صودا', price: 45, category: 'مشروبات غازية', sku: 'SFT002', stock: 200 },
    { name: 'ريد بول', price: 90, category: 'مشروبات غازية', sku: 'SFT003', stock: 150 },

    // Ice cream & desserts
    { name: 'ايس كريم كلاسيك', price: 60, category: 'ايس كريم', sku: 'ICE001', stock: 50 },
    { name: 'ايس كريم سوبر', price: 90, category: 'ايس كريم', sku: 'ICE002', stock: 50 },
    { name: 'دسر اوريو', price: 110, category: 'حلويات', sku: 'DES001', stock: 40 },
    { name: 'براونيز', price: 110, category: 'حلويات', sku: 'DES002', stock: 40 },
    { name: 'تشيز كيك', price: 71.5, category: 'حلويات', sku: 'DES003', stock: 30 },

    // Pizza
    { name: 'بيتزا مارغريتا', price: 150, category: 'بيتزا', sku: 'PIZ001', stock: 40 },
    { name: 'بيتزا بيف', price: 205, category: 'بيتزا', sku: 'PIZ002', stock: 40 },

    // Sandwiches
    { name: 'شاورما فراخ', price: 190, category: 'ساندوتش', sku: 'SND001', stock: 60 },
    { name: 'فاهيتا فراخ', price: 135, category: 'ساندوتش', sku: 'SND002', stock: 60 },

    // Burgers
    { name: 'برجر كلاسيك', price: 150, category: 'برجر', sku: 'BURG001', stock: 80 },
    { name: 'برجر تشيكن', price: 175, category: 'برجر', sku: 'BURG002', stock: 80 },

    // Pasta
    { name: 'باشاميل لحم', price: 180, category: 'باستا', sku: 'PAST001', stock: 40 },
    { name: 'الفريدو', price: 190, category: 'باستا', sku: 'PAST002', stock: 40 },

    // Grilled & mains
    { name: 'شيش طاووق', price: 150, category: 'مشويات', sku: 'GRL001', stock: 40 },
    { name: 'كباب مشوي', price: 245, category: 'مشويات', sku: 'GRL002', stock: 40 },

    // Extras
    { name: 'صلصة', price: 30, category: 'إضافات', sku: 'EXT001', stock: 200 },
    { name: 'حليب', price: 25, category: 'إضافات', sku: 'EXT002', stock: 200 },

    // Hookah / Games
    { name: 'شيشة فاخرة', price: 75, category: 'شيشة', sku: 'HOOK001', stock: 20 },
    { name: 'ساعة كيدز اريا', price: 50, category: 'العاب', sku: 'GAME001', stock: 10 },

    // Representative additional items from images
    { name: 'آيس لاتيه', price: 95, category: 'ايس كوفي', sku: 'ICF001', stock: 60 },
    { name: 'سبانش لاتيه مثلج', price: 105, category: 'ايس كوفي', sku: 'ICF002', stock: 60 },
    { name: 'ليمون نعناع', price: 80, category: 'فريش', sku: 'FRESH007', stock: 120 },
    { name: 'بانا بوت', price: 95, category: 'حلويات', sku: 'DES004', stock: 30 },
    { name: 'فواكه', price: 40, category: 'إضافات', sku: 'EXT003', stock: 200 },
    { name: 'باستا نغريسكو', price: 180, category: 'باستا', sku: 'PAST003', stock: 30 },
    { name: 'فاهيتا فراخ طبق', price: 270, category: 'اطباق فراخ', sku: 'CHKN001', stock: 30 },
    { name: 'وافل نوتيلا', price: 77, category: 'حلويات', sku: 'WAF001', stock: 40 },
    { name: 'بقلاوة مشكلة', price: 231, category: 'حلويات شرقية', sku: 'BKL001', stock: 30 },
    { name: 'كنافة', price: 264, category: 'حلويات شرقية', sku: 'KNAF001', stock: 30 }
  ];

  for (const product of products) {
    const id = uuidv4();
    await db.run(
      'INSERT INTO products (id, name, price, category, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
      [id, product.name, product.price, product.category, product.stock, product.sku]
    );
  }
  console.log(`✅ ${products.length} demo products added`);

  // Add demo orders
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now() - i * 1000000}`;
    const amount = Math.floor(Math.random() * 200) + 50;
    
    const orderDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    await db.run(
      `INSERT INTO orders 
       (id, order_number, user_id, total_amount, status, payment_status, 
        customer_name, customer_phone, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNumber, userId, amount, 'completed', 'paid', 
       `عميل ${i+1}`, '+20' + Math.floor(Math.random() * 1000000000),
       orderDate.toISOString()]
    );

    // Add payment
    const paymentId = uuidv4();
    await db.run(
      `INSERT INTO payments (id, order_id, amount, method, transaction_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [paymentId, orderId, amount, 'cash', `TXN-${Date.now()}-${i}`]
    );
  }
  console.log('✅ 10 demo orders added');

  console.log('\n✨ Database seeded successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Username: demo');
  console.log('   Password: 123456');
  
  await db.close();
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});
