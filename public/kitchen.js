const API_URL = 'http://localhost:3000/api';
let kitchenOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refresh-orders').addEventListener('click', loadKitchenOrders);
    document.getElementById('kitchen-search').addEventListener('input', filterKitchenOrders);
    loadKitchenOrders();
    setInterval(loadKitchenOrders, 5000);
});

async function loadKitchenOrders() {
    try {
        const response = await fetch(`${API_URL}/orders?includeItems=true`);
        kitchenOrders = await response.json();
        displayKitchenOrders(kitchenOrders);
        renderRunSummary(kitchenOrders);
    } catch (error) {
        console.error('Error loading kitchen orders:', error);
    }
}

function displayKitchenOrders(orders) {
    const tbody = document.getElementById('kitchen-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.customer_name || 'عميل'}</td>
            <td>${order.table_number ? `ترابية ${order.table_number}` : '-'}</td>
            <td>${order.customer_phone || '-'}</td>
            <td>${order.total_amount} ج.م</td>
            <td><span class="status-chip status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>
                ${renderKitchenActions(order)}
            </td>
        </tr>
    `).join('');
}

function renderRunSummary(orders) {
    const summary = {};
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    activeOrders.forEach(order => {
        if (!Array.isArray(order.items)) return;
        const seen = new Set();
        order.items.forEach(item => {
            const name = item.name || 'عنصر';
            const key = name;
            if (!summary[key]) {
                summary[key] = { orderCount: 0, quantity: 0 };
            }
            summary[key].quantity += item.quantity || 0;
            if (!seen.has(key)) {
                summary[key].orderCount += 1;
                seen.add(key);
            }
        });
    });

    const container = document.getElementById('run-summary');
    if (!container) return;
    if (Object.keys(summary).length === 0) {
        container.innerHTML = '<p style="color: var(--gray);">لا توجد طلبات تشغيل حالياً.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table" style="margin-bottom:0;">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>عدد الطلبات</th>
                    <th>الكمية الإجمالية</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary).map(([name, value]) => `
                    <tr>
                        <td>${name}</td>
                        <td>${value.orderCount}</td>
                        <td>${value.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderKitchenActions(order) {
    const accept = `<button class="btn btn-success" onclick="updateKitchenOrderStatus('${order.id}', 'accepted')">قبول</button>`;
    const ready = `<button class="btn btn-primary" onclick="updateKitchenOrderStatus('${order.id}', 'ready')">جاهز</button>`;
    const complete = `<button class="btn btn-secondary" onclick="updateKitchenOrderStatus('${order.id}', 'completed')">تم</button>`;
    if (order.status === 'pending') return accept;
    if (order.status === 'accepted') return ready;
    if (order.status === 'ready') return complete;
    return '<span style="color: var(--gray);">لا يوجد إجراءات</span>';
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

async function updateKitchenOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'فشل تحديث الحالة');
        loadKitchenOrders();
    } catch (error) {
        alert(error.message);
    }
}

function filterKitchenOrders() {
    const search = document.getElementById('kitchen-search').value.trim().toLowerCase();
    const filtered = kitchenOrders.filter(order =>
        order.order_number.toLowerCase().includes(search) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(search)) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(search)) ||
        (order.table_number && order.table_number.toLowerCase().includes(search))
    );
    displayKitchenOrders(filtered);
}
