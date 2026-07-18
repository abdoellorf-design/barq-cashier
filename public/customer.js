const API_URL = 'http://localhost:3000/api';
const currentTenantId = new URLSearchParams(window.location.search).get('tenantId') || 'default';
const currentTable = new URLSearchParams(window.location.search).get('table') || null;

function buildHeaders(extra = {}) {
    return {
        'Content-Type': 'application/json',
        'x-tenant-id': currentTenantId,
        ...extra
    };
}

let customerCart = [];
let currentCustomer = null;
let currentOrder = null;
let orderInterval = null;
let allProducts = [];
let productCategories = [];
let previousOrder = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reuse-previous-order-btn').addEventListener('click', reusePreviousOrder);
    document.getElementById('submit-order-btn').addEventListener('click', submitCustomerOrder);
    document.getElementById('customer-search').addEventListener('input', filterCustomerProducts);
    document.getElementById('customer-category').addEventListener('change', filterCustomerProducts);
    document.getElementById('customer-payment-method').addEventListener('change', () => {
        updatePaymentInstructions();
        renderInvoicePreview();
    });
    loadProducts();
    restoreSavedOrder();
    updatePaymentInstructions();
    renderInvoicePreview();

    // If opened via table link, show table and skip auth
    if (currentTable) {
        const tableEl = document.getElementById('customer-table-display');
        if (tableEl) {
            tableEl.textContent = `رقم الطاولة: ${currentTable}`;
            tableEl.style.display = 'block';
        }
        // proceed to shop directly for quick ordering from table
        requestCode();
    }
});

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, { headers: buildHeaders() });
        const products = await response.json();
        allProducts = products;
        productCategories = Array.from(new Set(products.map(p => p.category || 'بدون فئة'))).sort();
        renderCategoryOptions();
        renderProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderCategoryOptions() {
    const select = document.getElementById('customer-category');
    if (!select) return;
    select.innerHTML = `<option value="">كل الأقسام</option>` +
        productCategories.map(category => `<option value="${category}">${category}</option>`).join('');
}



function filterCustomerProducts() {
    const search = document.getElementById('customer-search').value.trim().toLowerCase();
    const category = document.getElementById('customer-category').value;

    const filtered = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(search) || (product.category || '').toLowerCase().includes(search);
        const matchesCategory = !category || (product.category || 'بدون فئة') === category;
        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

function renderProducts(products) {
    const container = document.getElementById('products-selection');
    container.innerHTML = products.length === 0 ?
        '<p style="color: var(--gray);">لا يوجد منتجات مطابقة للبحث.</p>' :
        products.map(product => {
            const available = product.stock > 0;
            const lowStock = available && product.stock <= 20;
            return `
            <div class="product-card ${available ? '' : 'disabled'} ${lowStock ? 'low-stock' : ''}">
                <h4>${product.name}</h4>
                <p style="margin:8px 0; color: var(--gray);">${product.category || 'بدون فئة'}</p>
                <div class="product-card-price">${product.price} ج.م</div>
                ${!available ? `<div style="margin:10px 0; color:#b02a37; font-size: 13px;">غير متوفر</div>` : ''}
                ${lowStock ? `<div style="margin-bottom:10px; color:#d97706; font-size:13px; font-weight:700;">تنبيه: المنتج على وشك النفاد</div>` : ''}
                <div style="display:flex; gap:10px; align-items:center; margin:10px 0;">
                    <input type="number" min="1" value="1" id="qty-${product.id}" style="width:70px; padding:8px; border:1px solid var(--border); border-radius:6px;" ${available ? '' : 'disabled'} />
                    <button class="btn btn-primary" onclick="addToCart('${product.id}', '${product.name}', ${product.price})" ${available ? '' : 'disabled'}>${available ? 'أضف' : 'غير متوفر'}</button>
                </div>
            </div>
        `;
        }).join('');
}

function requestCode() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const message = document.getElementById('auth-message');

    currentCustomer = { customerName, customerPhone };
    message.textContent = '';
    document.getElementById('customer-previous-order').style.display = 'none';
    previousOrder = null;

    if (customerPhone) {
        fetchPreviousOrder(customerPhone);
    }

    document.getElementById('customer-auth').style.display = 'none';
    document.getElementById('customer-shop').style.display = 'block';
    document.getElementById('auth-message').textContent = 'يمكنك الآن اختيار المنتجات ووضعها في سلة التسوق.';
    renderCart();
}

function addToCart(productId, productName, productPrice) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyInput.value, 10);
    const product = allProducts.find(p => p.id === productId);

    if (!product || product.stock <= 0) {
        alert('هذا المنتج غير متوفر حالياً');
        return;
    }

    if (quantity <= 0) {
        alert('اختر كمية صحيحة');
        return;
    }

    if (quantity > product.stock) {
        alert(`الكمية القصوى المتاحة لهذا المنتج هي ${product.stock}.`);
        return;
    }

    const existing = customerCart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity + quantity > product.stock) {
            alert(`لا يمكن إضافة أكثر من ${product.stock} من هذا المنتج.`);
            return;
        }
        existing.quantity += quantity;
    } else {
        customerCart.push({ productId, name: productName, price: productPrice, quantity });
    }

    qtyInput.value = '1';
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalLabel = document.getElementById('cart-total');
    if (customerCart.length === 0) {
        container.innerHTML = '<p style="color: var(--gray);">السلة فارغة. أضف منتجات من الأعلى.</p>';
        totalLabel.textContent = '0 ج.م';
        renderInvoicePreview();
        return;
    }

    let total = 0;
    container.innerHTML = customerCart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <div style="font-size:12px; color: var(--gray);">${item.quantity} × ${item.price} ج.م</div>
                </div>
                <div>${subtotal} ج.م</div>
            </div>
        `;
    }).join('');
    totalLabel.textContent = `${total} ج.م`;
    renderInvoicePreview();
}

function renderInvoicePreview() {
    const phone = currentCustomer?.customerPhone?.trim() || 'زائر';
    const total = customerCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const payment = document.getElementById('customer-payment-method')?.value || 'cash';
    const paymentLabel = {
        cash: 'نقدي',
        visa: 'فيزا (ماكينة فوري)',
        fawry: 'فوري',
        insta: 'إنستا',
        vodafone: 'فودافون'
    }[payment] || 'نقدي';

    document.getElementById('invoice-phone').textContent = phone;
    document.getElementById('invoice-payment-method').textContent = paymentLabel;
    document.getElementById('invoice-total').textContent = `${total} ج.م`;
}

async function submitCustomerOrder() {
    if (customerCart.length === 0) {
        alert('السلة فارغة');
        return;
    }

    const paymentMethod = document.getElementById('customer-payment-method').value;
    const orderBody = {
        customerName: currentCustomer?.customerName,
        customerPhone: currentCustomer?.customerPhone,
        items: customerCart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        notes: '',
        tableNumber: currentTable || null,
        paymentMethod
    };

    try {
        const response = await fetch(`${API_URL}/customer/orders`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ ...orderBody, tenantId: currentTenantId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'فشل إرسال الطلب');

        currentOrder = { orderId: data.orderId, orderNumber: data.orderNumber, totalAmount: data.totalAmount };
        localStorage.setItem('barqCustomerOrder', JSON.stringify(currentOrder));
        showTrackingSection();
        startOrderPolling(data.orderId);
        alert('تم إرسال الطلب بنجاح! يمكنك متابعة الحالة الآن.');
    } catch (error) {
        alert(error.message);
    }
}

function restoreSavedOrder() {
    const saved = localStorage.getItem('barqCustomerOrder');
    if (saved) {
        currentOrder = JSON.parse(saved);
        showTrackingSection();
        startOrderPolling(currentOrder.orderId);
    }
}

function showTrackingSection() {
    document.getElementById('customer-status').style.display = 'block';
    document.getElementById('tracking-order-number').textContent = currentOrder.orderNumber;
    document.getElementById('tracking-order-total').textContent = `${currentOrder.totalAmount} ج.م`;
}

function updateLamp(status) {
    const lamp = document.getElementById('order-lamp');
    lamp.className = 'lamp-indicator';
    lamp.classList.add(`lamp-${status}`);
}

async function startOrderPolling(orderId) {
    if (orderInterval) clearInterval(orderInterval);
    await fetchOrderStatus(orderId);
    orderInterval = setInterval(() => fetchOrderStatus(orderId), 5000);
}

async function fetchOrderStatus(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, { headers: buildHeaders() });
        const order = await response.json();
        if (!order || order.error) return;

        const statusText = getStatusText(order.status);
        document.getElementById('tracking-order-status').textContent = statusText;
        updateLamp(order.status || 'pending');

        const note = document.getElementById('tracking-note');
        if (order.status === 'pending') {
            note.textContent = 'الطلب قيد الاستلام من البار/المطبخ.';
        } else if (order.status === 'accepted') {
            note.textContent = 'تم قبول الطلب، ويجري تحضيره الآن.';
        } else if (order.status === 'ready') {
            note.textContent = 'الطلب جاهز. سيتم إشعارك فور الاستلام.';
        } else if (order.status === 'completed') {
            note.textContent = 'اكتمل الطلب. شكراً لك.';
        } else if (order.status === 'cancelled') {
            note.textContent = 'تم إلغاء الطلب. تواصل مع الدعم.';
        }
    } catch (error) {
        console.error('Failed to fetch order status:', error);
    }
}

async function fetchPreviousOrder(phone) {
    try {
        const response = await fetch(`${API_URL}/customer/orders?phone=${encodeURIComponent(phone)}`, { headers: buildHeaders() });
        const orders = await response.json();
        if (Array.isArray(orders) && orders.length > 0) {
            previousOrder = orders[0];
            showPreviousOrderSection(previousOrder);
        }
    } catch (error) {
        console.error('Failed to fetch previous order:', error);
    }
}

function showPreviousOrderSection(order) {
    const section = document.getElementById('customer-previous-order');
    if (!section) return;
    section.style.display = 'block';
    section.querySelector('p').textContent = `تم العثور على طلب سابق رقم ${order.order_number}. يمكنك إعادة طلبه بسرعة.`;
}

async function reusePreviousOrder() {
    if (!previousOrder) return;
    try {
        const response = await fetch(`${API_URL}/orders/${previousOrder.id}`, { headers: buildHeaders() });
        const order = await response.json();
        if (!order || !order.items) {
            alert('لا يمكن استرجاع تفاصيل الطلب السابق الآن.');
            return;
        }
        customerCart = order.items.map(item => ({
            productId: item.product_id,
            name: item.name,
            price: item.unit_price,
            quantity: item.quantity
        }));
        renderCart();
        alert('تم استرجاع الطلب السابق إلى السلة. يمكنك التعديل عليه أو إرساله.');
    } catch (error) {
        console.error('Failed to reuse previous order:', error);
        alert('حدث خطأ أثناء استرجاع الطلب السابق.');
    }
}


function updatePaymentInstructions() {
    const method = document.getElementById('customer-payment-method').value;
    const instructions = document.getElementById('payment-instructions');
    let text = '';

    switch (method) {
        case 'visa':
            text = 'طريقة الدفع فيزا: يجب أن يأخذ الوايتر ماكينة فوري لإتمام العملية.';
            break;
        case 'fawry':
            text = 'طريقة الدفع فوري: استخدم ماكينة فوري لإدخال رقم الفاتورة.';
            break;
        case 'insta':
            text = 'طريقة الدفع إنستا: أعطِ الزبون رقم التحويل الخاص بحسابه في إنستا.';
            break;
        case 'vodafone':
            text = 'طريقة الدفع فودافون: أعطِ الزبون رقم حساب فودافون كاش للتحويل.';
            break;
        default:
            text = 'اختر طريقة الدفع. نقدي أو إلكتروني حسب رغبة الزبون.';
    }

    if (instructions) instructions.textContent = text;
}

function getStatusText(status) {
    const map = {
        pending: 'قيد الانتظار',
        accepted: 'تم القبول',
        ready: 'جاهز',
        completed: 'اكتمل',
        cancelled: 'ملغى'
    };
    return map[status] || status;
}
