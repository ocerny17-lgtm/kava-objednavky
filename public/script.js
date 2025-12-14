// API endpoint
const API_URL = '/api/orders';

// State
let isBarista = false;
let currentBarista = null;
let refreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkBaristaSession();
    setupEventListeners();
    loadOrders();
    startAutoRefresh();
});

function setupEventListeners() {
    // Barista login
    document.getElementById('baristaLoginBtn').addEventListener('click', openBaristaModal);
    document.querySelector('.close').addEventListener('click', closeBaristaModal);
    document.getElementById('baristaLoginForm').addEventListener('submit', handleBaristaLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Order form
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

    // Add selected class to radio options
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Remove selected class from siblings
            const siblings = document.querySelectorAll(`input[name="${this.name}"]`);
            siblings.forEach(sibling => {
                const parent = sibling.closest('.coffee-option, .radio-option');
                if (parent) {
                    parent.classList.remove('selected');
                }
            });
            // Add selected class to current option
            const parent = this.closest('.coffee-option, .radio-option');
            if (parent) {
                parent.classList.add('selected');
            }
        });
    });

    // Add selected class to checkbox
    document.getElementById('treatForSunny').addEventListener('change', function() {
        const parent = this.closest('.treat-option');
        if (this.checked) {
            parent.classList.add('selected');
        } else {
            parent.classList.remove('selected');
        }
    });

    // Close modal on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('baristaModal');
        if (event.target === modal) {
            closeBaristaModal();
        }
    });
}

function openBaristaModal() {
    document.getElementById('baristaModal').style.display = 'block';
    document.getElementById('loginError').textContent = '';
}

function closeBaristaModal() {
    document.getElementById('baristaModal').style.display = 'none';
    document.getElementById('baristaLoginForm').reset();
}

function handleBaristaLogin(e) {
    e.preventDefault();
    const name = document.getElementById('baristaName').value;
    const password = document.getElementById('baristaPassword').value;

    // Baristé: Sunny - 1711, Ondrej - 1711, Anet - Sunny
    const baristas = {
        'Sunny': '1711',
        'Ondrej': '1711',
        'Anet': 'Sunny'
    };

    if (baristas[name] && baristas[name] === password) {
        isBarista = true;
        currentBarista = name;
        sessionStorage.setItem('isBarista', 'true');
        sessionStorage.setItem('baristaName', name);
        closeBaristaModal();
        showBaristaView();
    } else {
        document.getElementById('loginError').textContent = 'Nesprávné jméno nebo heslo';
    }
}

function checkBaristaSession() {
    const stored = sessionStorage.getItem('isBarista');
    if (stored === 'true') {
        isBarista = true;
        currentBarista = sessionStorage.getItem('baristaName');
        showBaristaView();
    }
}

function showBaristaView() {
    document.getElementById('customerView').style.display = 'none';
    document.getElementById('baristaView').style.display = 'block';
    document.getElementById('baristaLoginBtn').style.display = 'none';
    loadBaristaOrders();
}

function handleLogout() {
    isBarista = false;
    currentBarista = null;
    sessionStorage.removeItem('isBarista');
    sessionStorage.removeItem('baristaName');
    document.getElementById('customerView').style.display = 'block';
    document.getElementById('baristaView').style.display = 'none';
    document.getElementById('baristaLoginBtn').style.display = 'block';
    loadOrders();
}

function handleOrderSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const order = {
        id: Date.now(),
        name: document.getElementById('customerName').value,
        coffee: formData.get('coffee'),
        milk: formData.get('milk'),
        sugar: parseInt(document.getElementById('sugar').value),
        treatForSunny: document.getElementById('treatForSunny').checked,
        status: 'pending',
        timestamp: new Date().toISOString(),
        barista: null,
        acceptedAt: null
    };

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create', order: order })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            e.target.reset();
            loadOrders();
            showNotification('Objednávka byla úspěšně vytvořena!');
        } else {
            alert('Chyba při vytváření objednávky: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Chyba při komunikaci se serverem');
    });
}

function loadOrders() {
    fetch(API_URL + '?action=get')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function loadBaristaOrders() {
    fetch(API_URL + '?action=get')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayBaristaOrders(data.orders);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Zatím nejsou žádné objednávky</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const timeAgo = getTimeAgo(order.timestamp);
        const statusClass = order.status === 'pending' ? 'pending' : 'in-progress';
        const statusText = order.status === 'pending' ? 'Čeká na přijetí' : 'Připravuje se';
        
        let baristaInfo = '';
        if (order.barista) {
            const workingTime = getTimeAgo(order.acceptedAt);
            baristaInfo = `<div class="order-barista">Barista: ${order.barista} (pracuje ${workingTime})</div>`;
        }

        return `
            <div class="order-card ${statusClass}">
                <div class="order-header">
                    <span class="order-name">${escapeHtml(order.name)}</span>
                    <span class="order-time">${timeAgo}</span>
                </div>
                <div class="order-details">
                    <strong>${escapeHtml(order.coffee)}</strong> - ${escapeHtml(order.milk)}
                    ${order.sugar > 0 ? `, ${order.sugar} lžiček cukru` : ''}
                    ${order.treatForSunny ? ' 🍪 <strong>Pamlsek pro Sunny</strong>' : ''}
                </div>
                <div class="order-status ${statusClass}">${statusText}</div>
                ${baristaInfo}
            </div>
        `;
    }).join('');
}

function displayBaristaOrders(orders) {
    const container = document.getElementById('baristaOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Zatím nejsou žádné objednávky</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const timeAgo = getTimeAgo(order.timestamp);
        const statusClass = order.status === 'pending' ? 'pending' : 'in-progress';
        const isAccepted = order.status === 'in-progress';
        const isMyOrder = order.barista === currentBarista;
        
        let acceptButton = '';
        let completeButton = '';
        
        if (!isAccepted) {
            acceptButton = `<button class="btn-accept" onclick="acceptOrder(${order.id})">Přijmout objednávku</button>`;
        } else if (isMyOrder) {
            completeButton = `<button class="btn-complete" onclick="completeOrder(${order.id})">Označit jako odnášené</button>`;
        } else {
            completeButton = `<button class="btn-complete" disabled>Připravuje: ${escapeHtml(order.barista)}</button>`;
        }

        return `
            <div class="barista-order-card ${statusClass}">
                <div class="order-header">
                    <span class="order-name">${escapeHtml(order.name)}</span>
                    <span class="order-time">${timeAgo}</span>
                </div>
                <div class="order-details">
                    <strong>${escapeHtml(order.coffee)}</strong> - ${escapeHtml(order.milk)}
                    ${order.sugar > 0 ? `, ${order.sugar} lžiček cukru` : ''}
                    ${order.treatForSunny ? ' 🍪 <strong>Pamlsek pro Sunny</strong>' : ''}
                </div>
                ${order.barista && isAccepted ? `<div class="order-barista">Připravuje: ${escapeHtml(order.barista)}</div>` : ''}
                <div class="barista-actions">
                    ${acceptButton}
                    ${completeButton}
                </div>
            </div>
        `;
    }).join('');
}

function acceptOrder(orderId) {
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            action: 'accept', 
            orderId: orderId,
            barista: currentBarista
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadBaristaOrders();
            showNotification('Objednávka byla přijata');
        } else {
            alert('Chyba: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Chyba při komunikaci se serverem');
    });
}

function completeOrder(orderId) {
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            action: 'complete', 
            orderId: orderId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadBaristaOrders();
            showNotification('Objednávka byla označena jako odnášená');
        } else {
            alert('Chyba: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Chyba při komunikaci se serverem');
    });
}

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (isBarista) {
            loadBaristaOrders();
        } else {
            loadOrders();
        }
    }, 3000); // Refresh every 3 seconds
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds

    if (diff < 60) {
        return `před ${diff} sekundami`;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `před ${minutes} ${minutes === 1 ? 'minutou' : minutes < 5 ? 'minutami' : 'minutami'}`;
    } else {
        const hours = Math.floor(diff / 3600);
        return `před ${hours} ${hours === 1 ? 'hodinou' : hours < 5 ? 'hodinami' : 'hodinami'}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    // Simple notification - you can enhance this with a toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

