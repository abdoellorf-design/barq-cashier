// API Base URL
const API_URL = 'http://localhost:3000/api';
const currentTenantId = new URLSearchParams(window.location.search).get('tenantId') || 'default';

function buildHeaders(extra = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenantId,
        ...extra
    };
    
    // Add JWT token if available
    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Global State
let currentUser = null;
let currentOrder = {
    items: [],
    total: 0
};
let allProducts = [];
let allOrders = [];

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkApiHealth();
    // Try to load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    if (savedUser && authToken) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
});

function setupEventListeners() {
    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const pageId = e.target.dataset.page + '-page';
            showPage(pageId);
        });
    });

    // Order Form
    document.getElementById('payment-method').addEventListener('change', (e) => {
        const cardDetails = document.getElementById('card-details');
        cardDetails.style.display = e.target.value === 'card' ? 'block' : 'none';
    });

    // Search and Filter
    document.getElementById('search-orders')?.addEventListener('input', filterOrders);
    document.getElementById('filter-status')?.addEventListener('change', filterOrders);
    document.getElementById('search-products')?.addEventListener('input', filterProducts);
}

// ===================== AUTH FUNCTIONS =====================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Save token and user
        currentUser = data.user;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('current-user').textContent = currentUser.username;
        
        // Clear form
        document.getElementById('login-form').reset();
        showDashboard();
    } catch (error) {
        alert('خطأ في الدخول: ' + error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ username, email, password, role, tenantId: currentTenantId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Auto-login after registration
        currentUser = data.user;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('current-user').textContent = currentUser.username;
        
        // Clear form
        document.getElementById('register-form').reset();
        showDashboard();
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    showLogin();
}

// ===================== SCREEN NAVIGATION =====================
function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('dashboard').classList.remove('active');
}

function showRegister() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('register-screen').classList.add('active');
}

function showDashboard() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    loadOrders();
    loadProducts();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'orders-page') loadOrders();
    if (pageId === 'products-page') loadProducts();
    if (pageId === 'stock-page') loadStockData();
    if (pageId === 'reports-page') loadReports();
}

// ===================== PRODUCTS =====================
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, { headers: buildHeaders() });
        allProducts = await response.json();
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts() {
    const productsList = document.getElementById('products-list');
    const productsGrid = document.getElementById('products-grid');

    if (productsList) {
        productsList.innerHTML = allProducts.map(product => `
            <div class="product-item">
                <h4>${product.name}</h4>
                <div class="product-item-price">${product.price} ج.م</div>
                <div class="product-item-stock">
                    <span>${product.category}</span>
                    <span>المخزون: ${product.stock}</span>
                </div>
                <button class="btn btn-secondary" onclick="editProduct('${product.id}')">تعديل</button>
            </div>
        `).join('');
    }

    if (productsGrid) {
        productsGrid.innerHTML = allProducts.map(product => `
            <div class="product-card" data-product-id="${product.id}" onclick="selectProduct('${product.id}', '${product.name}', ${product.price}, ${product.stock})">
                <div class="product-card-name">${product.name}</div>
                <div class="product-card-price">${product.price} ج.م</div>
                <div class="product-card-stock">المتاح: ${product.stock}</div>
            </div>
        `).join('');
    }
}

async function submitProduct() {
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;
    const sku = document.getElementById('product-sku').value;
    const stock = parseInt(document.getElementById('product-stock').value);

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ name, price, category, sku, stock, tenantId: currentTenantId })
        });

        if (!response.ok) throw new Error('خطأ في إضافة المنتج');
        
        alert('تم إضافة المنتج بنجاح!');
        closeProductModal();
        loadProducts();
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

function openNewProduct() {
    document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-sku').value = '';
    document.getElementById('product-stock').value = '';
}

function filterProducts() {
    const search = document.getElementById('search-products').value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(search)
    );
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = filtered.map(product => `
        <div class="product-item">
            <h4>${product.name}</h4>
            <div class="product-item-price">${product.price} ج.م</div>
            <div class="product-item-stock">
                <span>${product.category}</span>
                <span>المخزون: ${product.stock}</span>
            </div>
            <button class="btn btn-secondary" onclick="editProduct('${product.id}')">تعديل</button>
        </div>
    `).join('');
}

// ===================== ORDERS =====================
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`, { headers: buildHeaders() });
        allOrders = await response.json();
        displayOrders(allOrders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.customer_name || 'عميل'}</td>
            <td>${order.table_number ? `ترابية ${order.table_number}` : '-'}</td>
            <td>${order.total_amount} ج.م</td>
            <td>
                <span class="status status-${order.status}">${getOrderStatusText(order.status)}</span>
            </td>
            <td>
                <span class="payment-status payment-${order.payment_status}">${order.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span>
            </td>
            <td>
                <button class="btn btn-primary" style="padding:5px 10px;width:auto;" onclick="viewOrder('${order.id}')">عرض</button>
                ${order.payment_status === 'unpaid' ? `<button class="btn btn-success" style="padding:5px 10px;width:auto;" onclick="openPaymentModal('${order.id}', ${order.total_amount})">دفع</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function getOrderStatusText(status) {
    const map = {
        pending: 'قيد الانتظار',
        accepted: 'تم القبول',
        ready: 'جاهز',
        completed: 'مكتمل',
        cancelled: 'ملغى'
    };
    return map[status] || status;
}

function selectProduct(productId, name, price, stock) {
    if (stock <= 0) {
        alert('هذا المنتج غير متوفر حالياً');
        return;
    }

    const existingItem = currentOrder.items.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        currentOrder.items.push({
            productId,
            name,
            price,
            quantity: 1
        });
    }

    updateOrderSummary();
}

function updateOrderSummary() {
    const itemsDiv = document.getElementById('order-items');
    const totalDiv = document.getElementById('order-total-amount');

    if (!itemsDiv) return;

    currentOrder.total = 0;
    itemsDiv.innerHTML = currentOrder.items.map((item, index) => {
        const subtotal = item.price * item.quantity;
        currentOrder.total += subtotal;
        return `
            <div class="order-item">
                <div>
                    <strong>${item.name}</strong>
                    <input type="number" value="${item.quantity}" min="1" 
                           onchange="updateItemQuantity(${index}, this.value)" 
                           style="width:50px;padding:5px;">
                </div>
                <div>${subtotal} ج.م</div>
                <button onclick="removeOrderItem(${index})" style="background:var(--danger);color:white;border:none;padding:5px 10px;cursor:pointer;border-radius:3px;">حذف</button>
            </div>
        `;
    }).join('');

    totalDiv.textContent = currentOrder.total + ' ج.م';
}

function updateItemQuantity(index, quantity) {
    currentOrder.items[index].quantity = parseInt(quantity);
    updateOrderSummary();
}

function removeOrderItem(index) {
    currentOrder.items.splice(index, 1);
    updateOrderSummary();
}

async function submitOrder() {
    if (currentOrder.items.length === 0) {
        alert('الرجاء إضافة منتجات للطلب');
        return;
    }

    const customerName = document.getElementById('order-customer-name').value || 'عميل';
    const customerPhone = document.getElementById('order-customer-phone').value;
    const notes = document.getElementById('order-notes').value;

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({
                userId: currentUser.id,
                items: currentOrder.items,
                customerName,
                customerPhone,
                notes
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        alert('تم إنشاء الطلب بنجاح!\nرقم الطلب: ' + data.orderNumber);
        
        // Open payment modal
        closeOrderModal();
        currentOrder = { items: [], total: 0 };
        openPaymentModal(data.orderId, data.totalAmount);
        loadOrders();
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

function openNewOrder() {
    currentOrder = { items: [], total: 0 };
    document.getElementById('order-customer-name').value = '';
    document.getElementById('order-customer-phone').value = '';
    document.getElementById('order-notes').value = '';
    document.getElementById('order-items').innerHTML = '';
    document.getElementById('order-total-amount').textContent = '0 ج.م';
    document.getElementById('order-modal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('active');
}

function filterOrders() {
    const search = document.getElementById('search-orders').value.toLowerCase();
    const status = document.getElementById('filter-status').value;

    const filtered = allOrders.filter(order => {
        const matchSearch = order.order_number.includes(search) || 
                           (order.customer_name && order.customer_name.toLowerCase().includes(search)) ||
                           (order.table_number && order.table_number.toLowerCase().includes(search));
        const matchStatus = !status || order.status === status;
        return matchSearch && matchStatus;
    });

    displayOrders(filtered);
}

async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, { headers: buildHeaders() });
        const order = await response.json();

        let itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit_price} ج.م</td>
                <td>${item.subtotal} ج.م</td>
            </tr>
        `).join('');

        alert(`
طلب #${order.order_number}
العميل: ${order.customer_name}
الترابية: ${order.table_number ? `رقم ${order.table_number}` : 'غير محددة'}
الهاتف: ${order.customer_phone}
المبلغ: ${order.total_amount} ج.م
الحالة: ${order.status}
الدفع: ${order.payment_status}
        `);
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===================== PAYMENTS =====================
function openPaymentModal(orderId, amount) {
    document.getElementById('current-order-id').value = orderId;
    document.getElementById('payment-amount').textContent = amount + ' ج.م';
    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

async function processPayment() {
    const orderId = document.getElementById('current-order-id')?.value;
    const method = document.getElementById('payment-method').value;
    const amount = parseFloat(document.getElementById('payment-amount').textContent);

    try {
        const response = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ orderId, amount, method, tenantId: currentTenantId })
        });

        if (!response.ok) throw new Error('خطأ في معالجة الدفع');

        alert('تم الدفع بنجاح!');
        closePaymentModal();
        loadOrders();
        
        // Send WhatsApp notification
        const order = allOrders.find(o => o.id === orderId);
        if (order && order.customer_phone) {
            await sendWhatsAppMessage(orderId, order.customer_phone, 
                `شكراً على شرائك من Barq! طلبك #${order.order_number} تم دفعه بنجاح.`);
        }
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

// ===================== STOCK =====================
async function loadStockData() {
    try {
        // Load low stock items
        const lowStockResponse = await fetch(`${API_URL}/stock/low-stock`, { headers: buildHeaders() });
        const lowStockItems = await lowStockResponse.json();

        const lowStockDiv = document.getElementById('low-stock-items');
        lowStockDiv.innerHTML = lowStockItems.map(item => `
            <div class="low-stock-item">
                <div class="low-stock-item-name">${item.name}</div>
                <div class="low-stock-item-info">
                    المتاح: ${item.stock} | الحد الأدنى: ${item.min_stock}
                </div>
            </div>
        `).join('');

        // Load stock movements
        const movementsResponse = await fetch(`${API_URL}/stock/movements`, { headers: buildHeaders() });
        const movements = await movementsResponse.json();

        const tbody = document.getElementById('stock-movements-tbody');
        tbody.innerHTML = movements.slice(0, 50).map(movement => `
            <tr>
                <td>${movement.name}</td>
                <td>${movement.movement_type}</td>
                <td>${movement.quantity}</td>
                <td>${movement.reason}</td>
                <td>${new Date(movement.created_at).toLocaleDateString('ar-EG')}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading stock data:', error);
    }
}

// ===================== REPORTS =====================
async function loadReports() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];

        document.getElementById('report-start-date').value = monthAgo;
        document.getElementById('report-end-date').value = today;

        // Load summary
        const summaryResponse = await fetch(`${API_URL}/reports/summary`, { headers: buildHeaders() });
        const summary = await summaryResponse.json();

        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h4>إجمالي الطلبات</h4>
                <div class="stat-card-value">${summary.total_orders || 0}</div>
            </div>
            <div class="stat-card">
                <h4>الإيرادات</h4>
                <div class="stat-card-value">${(summary.total_revenue || 0).toFixed(2)} ج.م</div>
            </div>
            <div class="stat-card">
                <h4>متوسط الطلب</h4>
                <div class="stat-card-value">${(summary.average_order || 0).toFixed(2)} ج.م</div>
            </div>
            <div class="stat-card">
                <h4>العملاء الفريدين</h4>
                <div class="stat-card-value">${summary.unique_customers || 0}</div>
            </div>
        `;

        // Load sales by date
        const salesResponse = await fetch(`${API_URL}/reports/sales?startDate=${monthAgo}&endDate=${today}`, { headers: buildHeaders() });
        const sales = await salesResponse.json();

        if (sales.length > 0) {
            const maxSales = Math.max(...sales.map(s => s.total_amount || 0));
            const chartHtml = sales.map(sale => {
                const height = (sale.total_amount / maxSales) * 250;
                return `
                    <div class="chart-bar" style="height: ${height}px;">
                        <div class="chart-bar-label">${sale.total_amount.toFixed(0)}</div>
                    </div>
                `;
            }).join('');
            document.getElementById('sales-chart').innerHTML = chartHtml;
        }

        // Load top products
        const productsResponse = await fetch(`${API_URL}/reports/products?startDate=${monthAgo}&endDate=${today}`, { headers: buildHeaders() });
        const topProducts = await productsResponse.json();

        const tbody = document.getElementById('top-products-tbody');
        tbody.innerHTML = topProducts.slice(0, 10).map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.quantity_sold || 0}</td>
                <td>${(product.revenue || 0).toFixed(2)} ج.م</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// ===================== WHATSAPP =====================
async function sendWhatsAppMessage(orderId, phone, message) {
    try {
        await fetch(`${API_URL}/whatsapp/send`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ orderId, phoneNumber: phone, message, tenantId: currentTenantId })
        });
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
    }
}

// ===================== UTILITIES =====================
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_URL}/health`, { headers: buildHeaders() });
        if (response.ok) {
            console.log('✅ API connected');
            document.getElementById('api-status').textContent = 'حالة الـ API: ✅ متصل';
        }
    } catch (error) {
        console.error('API not responding');
        document.getElementById('api-status').textContent = 'حالة الـ API: ❌ غير متصل';
    }
}

function saveWhatsAppSettings() {
    const phone = document.getElementById('whatsapp-number').value;
    const msg = document.getElementById('whatsapp-order-msg').value;
    localStorage.setItem('whatsapp-settings', JSON.stringify({ phone, msg }));
    alert('تم حفظ الإعدادات بنجاح!');
}

function backupDatabase() {
    alert('سيتم إنشاء نسخة احتياطية من البيانات...');
}

function restoreDatabase() {
    alert('سيتم استعادة النسخة الاحتياطية...');
}

// ===================== PRINTING REPORTS =====================
async function printReports() {
    try {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;

        const [summaryRes, productsRes, salesRes] = await Promise.all([
            fetch(`${API_URL}/reports/summary`),
            fetch(`${API_URL}/reports/products?startDate=${startDate}&endDate=${endDate}`),
            fetch(`${API_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}`)
        ]);

        const summary = await summaryRes.json();
        const products = await productsRes.json();
        const sales = await salesRes.json();

        const title = `تقرير المبيعات من ${startDate} إلى ${endDate}`;

        const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="/reports-print.css"></head><body>
            <div class="header"><h1>${title}</h1><p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p></div>
            <div class="stat-row">
                <div class="stat"><h3>إجمالي الطلبات</h3><div>${summary.total_orders || 0}</div></div>
                <div class="stat"><h3>الإيرادات</h3><div>${(summary.total_revenue || 0).toFixed(2)} ج.م</div></div>
                <div class="stat"><h3>متوسط الطلب</h3><div>${(summary.average_order || 0).toFixed(2)} ج.م</div></div>
                <div class="stat"><h3>العملاء الفريدين</h3><div>${summary.unique_customers || 0}</div></div>
            </div>

            <h2>أعلى منتجات مبيعاً</h2>
            <table class="table"><thead><tr><th>المنتج</th><th>كمية مباعة</th><th>الإيرادات</th></tr></thead><tbody>
            ${products.map(p => `<tr><td>${p.name}</td><td>${p.quantity_sold || 0}</td><td>${(p.revenue || 0).toFixed(2)} ج.م</td></tr>`).join('')}
            </tbody></table>

            <h2>مبيعات حسب التاريخ</h2>
            <table class="table"><thead><tr><th>التاريخ</th><th>عدد الطلبات</th><th>الإيرادات</th></tr></thead><tbody>
            ${sales.map(s => `<tr><td>${s.date}</td><td>${s.order_count}</td><td>${(s.total_amount || 0).toFixed(2)} ج.م</td></tr>`).join('')}
            </tbody></table>

            <div style="margin-top:20px;text-align:center;"><button onclick="window.print()">طباعة</button></div>
        </body></html>`;

        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    } catch (error) {
        console.error('Error printing reports:', error);
        alert('فشل توليد التقرير للطباعة: ' + error.message);
    }
}

// Add missing input for order modal
document.addEventListener('DOMContentLoaded', () => {
    const input = document.createElement('input');
    input.id = 'current-order-id';
    input.type = 'hidden';
    document.body.appendChild(input);
});
