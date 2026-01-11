// API endpoints
const API_URL = '/api/orders';
const PASSWORDS_API_URL = '/api/passwords';

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
    document.getElementById('closeLogin').addEventListener('click', closeBaristaModal);
    document.getElementById('baristaLoginForm').addEventListener('submit', handleBaristaLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Password change
    document.getElementById('closePassword').addEventListener('click', closePasswordModal);
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);
    
    // History toggle
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', toggleHistory);
    }

    // Order form
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

    // Add selected class to checkbox options
    document.querySelectorAll('input[type="checkbox"][name="drinks"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const parent = this.closest('.coffee-option');
            if (parent) {
                if (this.checked) {
                    parent.classList.add('selected');
                } else {
                    parent.classList.remove('selected');
                }
            }
            updateMilkGroupVisibility();
        });
    });

    // Add selected class to radio options
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Remove selected class from siblings
            const siblings = document.querySelectorAll(`input[name="${this.name}"]`);
            siblings.forEach(sibling => {
                const parent = sibling.closest('.radio-option');
                if (parent) {
                    parent.classList.remove('selected');
                }
            });
            // Add selected class to current option
            const parent = this.closest('.radio-option');
            if (parent) {
                parent.classList.add('selected');
            }
        });
    });

    // Function to update milk group visibility based on selected drinks
    function updateMilkGroupVisibility() {
        const selectedDrinks = Array.from(document.querySelectorAll('input[name="drinks"]:checked'));
        const milkGroup = document.getElementById('milkGroup');
        const milkInputs = document.querySelectorAll('input[name="milk"]');
        
        // Check if any selected drink requires milk selection
        const needsMilk = selectedDrinks.some(drink => !drink.dataset.noMilk);
        
        if (needsMilk && selectedDrinks.length > 0) {
            milkGroup.style.display = 'block';
            milkInputs.forEach(input => input.required = true);
        } else {
            milkGroup.style.display = 'none';
            milkInputs.forEach(input => {
                input.required = false;
                input.checked = false;
            });
        }
    }


    // Close modal on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('baristaModal');
        if (event.target === modal) {
            closeBaristaModal();
        }
        const passwordModal = document.getElementById('changePasswordModal');
        if (event.target === passwordModal) {
            closePasswordModal();
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

async function handleBaristaLogin(e) {
    e.preventDefault();
    const name = document.getElementById('baristaName').value;
    const password = document.getElementById('baristaPassword').value;

    try {
        // Check password via API
        const response = await fetch(PASSWORDS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'check',
                name: name,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            isBarista = true;
            currentBarista = name;
            sessionStorage.setItem('isBarista', 'true');
            sessionStorage.setItem('baristaName', name);
            if (data.mustChangePassword) {
                sessionStorage.setItem('mustChangePassword', 'true');
            } else {
                sessionStorage.removeItem('mustChangePassword');
            }
            closeBaristaModal();
            
            // Check if password change is required
            if (data.mustChangePassword) {
                showPasswordChangeModal();
            } else {
                showBaristaView();
            }
        } else {
            document.getElementById('loginError').textContent = data.error || 'Nesprávné jméno nebo heslo';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = 'Chyba při komunikaci se serverem';
    }
}

function checkBaristaSession() {
    const stored = sessionStorage.getItem('isBarista');
    if (stored === 'true') {
        const mustChange = sessionStorage.getItem('mustChangePassword');
        if (mustChange === 'true') {
            // User must change password, log them out
            handleLogout();
            return;
        }
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
    loadBaristaHistory();
}

function showPasswordChangeModal() {
    document.getElementById('changePasswordModal').style.display = 'block';
    document.getElementById('passwordError').textContent = '';
}

function closePasswordModal() {
    // If user closes password change modal without changing password, log them out
    if (currentBarista) {
        const mustChange = sessionStorage.getItem('mustChangePassword');
        if (mustChange === 'true') {
            handleLogout();
            showNotification('Pro přístup je nutné změnit heslo');
        }
    }
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const oldPassword = document.getElementById('oldPasswordChange').value;

    if (newPassword !== confirmPassword) {
        document.getElementById('passwordError').textContent = 'Hesla se neshodují';
        return;
    }

    if (newPassword.length < 4) {
        document.getElementById('passwordError').textContent = 'Heslo musí mít alespoň 4 znaky';
        return;
    }

    try {
        const response = await fetch(PASSWORDS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'change',
                name: currentBarista,
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.removeItem('mustChangePassword');
            closePasswordModal();
            showBaristaView();
            showNotification('Heslo bylo úspěšně změněno');
        } else {
            document.getElementById('passwordError').textContent = data.error || 'Chyba při změně hesla';
        }
    } catch (error) {
        console.error('Password change error:', error);
        document.getElementById('passwordError').textContent = 'Chyba při komunikaci se serverem';
    }
}

function toggleHistory() {
    const historySection = document.getElementById('baristaHistory');
    const toggleBtn = document.getElementById('toggleHistoryBtn');
    
    if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        toggleBtn.textContent = 'Skrýt historii';
        loadBaristaHistory();
    } else {
        historySection.style.display = 'none';
        toggleBtn.textContent = 'Zobrazit historii';
    }
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
    const selectedDrinks = Array.from(document.querySelectorAll('input[name="drinks"]:checked')).map(cb => cb.value);
    
    if (selectedDrinks.length === 0) {
        alert('Prosím vyberte alespoň jeden nápoj');
        return;
    }
    
    const milkValue = formData.get('milk') || null;
    
    // Create order for each selected drink
    const orders = selectedDrinks.map((drink, index) => ({
        id: Date.now() + index,
        name: document.getElementById('customerName').value,
        coffee: drink,
        milk: milkValue,
        sugar: parseInt(document.getElementById('sugar').value),
        treatForSunny: false,
        status: 'pending',
        timestamp: new Date().toISOString(),
        barista: null,
        acceptedAt: null,
        deliveringAt: null
    }));

    // Send all orders
    Promise.all(orders.map(order => 
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'create', order: order })
        })
    ))
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(results => {
        if (results.every(r => r.success)) {
            e.target.reset();
            document.getElementById('milkGroup').style.display = 'none';
            loadOrders();
            showNotification('Objednávka byla úspěšně vytvořena!');
        } else {
            alert('Chyba při vytváření objednávky: ' + results.find(r => !r.success)?.error);
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

function loadBaristaHistory() {
    fetch(API_URL + '?action=getHistory')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayBaristaHistory(data.orders);
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
        let statusClass, statusText;
        
        if (order.status === 'delivering') {
            statusClass = 'delivering';
            statusText = 'Už se to nese!';
        } else if (order.status === 'pending') {
            statusClass = 'pending';
            statusText = 'Čeká na přijetí';
        } else {
            statusClass = 'in-progress';
            statusText = 'Připravuje se';
        }
        
        let baristaInfo = '';
        if (order.barista && order.status !== 'delivering') {
            const workingTime = getTimeAgo(order.acceptedAt);
            baristaInfo = `<div class="order-barista">Barista: ${order.barista} (pracuje ${workingTime})</div>`;
        }

        const milkText = order.milk ? ` - ${escapeHtml(order.milk)}` : '';

        return `
            <div class="order-card ${statusClass}">
                <div class="order-header">
                    <span class="order-name">${escapeHtml(order.name)}</span>
                    <span class="order-time">${timeAgo}</span>
                </div>
                <div class="order-details">
                    <strong>${escapeHtml(order.coffee)}</strong>${milkText}
                    ${order.sugar > 0 ? `, ${order.sugar} lžiček cukru` : ''}
                </div>
                <div class="order-status ${statusClass}">${statusText}</div>
                ${baristaInfo}
            </div>
        `;
    }).join('');
}

function displayBaristaHistory(orders) {
    const container = document.getElementById('baristaHistoryContainer');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Zatím není žádná historie</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const timeAgo = getTimeAgo(order.completedAt || order.deliveringAt || order.timestamp);
        const milkText = order.milk ? ` - ${escapeHtml(order.milk)}` : '';
        const completedTime = order.completedAt || order.deliveringAt || order.timestamp;
        const completedDate = new Date(completedTime);

        return `
            <div class="barista-order-card completed" style="opacity: 0.8;">
                <div class="order-header">
                    <span class="order-name">${escapeHtml(order.name)}</span>
                    <span class="order-time">Dokončeno ${timeAgo}</span>
                </div>
                <div class="order-details">
                    <strong>${escapeHtml(order.coffee)}</strong>${milkText}
                    ${order.sugar > 0 ? `, ${order.sugar} lžiček cukru` : ''}
                </div>
                ${order.barista ? `<div class="order-barista">Připravil: ${escapeHtml(order.barista)}</div>` : ''}
                <div class="order-status completed" style="background: #6c757d; color: white; margin-top: 10px;">Dokončeno</div>
            </div>
        `;
    }).join('');
}

function displayBaristaOrders(orders) {
    const container = document.getElementById('baristaOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Zatím nejsou žádné aktivní objednávky</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const timeAgo = getTimeAgo(order.timestamp);
        let statusClass = order.status === 'pending' ? 'pending' : order.status === 'delivering' ? 'delivering' : 'in-progress';
        const isAccepted = order.status === 'in-progress' || order.status === 'delivering';
        const isMyOrder = order.barista === currentBarista;
        
        let acceptButton = '';
        let completeButton = '';
        let deleteButton = `<button class="btn-delete" onclick="deleteOrder(${order.id})">Smazat</button>`;
        
        if (!isAccepted) {
            acceptButton = `<button class="btn-accept" onclick="acceptOrder(${order.id})">Přijmout objednávku</button>`;
        } else if (isMyOrder && order.status === 'in-progress') {
            completeButton = `<button class="btn-complete" onclick="completeOrder(${order.id})">Označit jako odnášené</button>`;
        } else if (order.status === 'delivering') {
            completeButton = `<button class="btn-complete" disabled>Už se to nese!</button>`;
        } else {
            completeButton = `<button class="btn-complete" disabled>Připravuje: ${escapeHtml(order.barista)}</button>`;
        }

        const milkText = order.milk ? ` - ${escapeHtml(order.milk)}` : '';

        return `
            <div class="barista-order-card ${statusClass}">
                <div class="order-header">
                    <span class="order-name">${escapeHtml(order.name)}</span>
                    <span class="order-time">${timeAgo}</span>
                </div>
                <div class="order-details">
                    <strong>${escapeHtml(order.coffee)}</strong>${milkText}
                    ${order.sugar > 0 ? `, ${order.sugar} lžiček cukru` : ''}
                </div>
                ${order.barista && order.status === 'in-progress' ? `<div class="order-barista">Připravuje: ${escapeHtml(order.barista)}</div>` : ''}
                ${order.status === 'delivering' ? `<div class="order-status delivering">Už se to nese!</div>` : ''}
                <div class="barista-actions">
                    ${acceptButton}
                    ${completeButton}
                    ${deleteButton}
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
            action: 'deliver', 
            orderId: orderId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadBaristaOrders();
            loadOrders(); // Update customer view too
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

function deleteOrder(orderId) {
    if (!confirm('Opravdu chcete smazat tuto objednávku?')) {
        return;
    }
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            action: 'delete', 
            orderId: orderId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadBaristaOrders();
            loadOrders(); // Update customer view too
            showNotification('Objednávka byla smazána');
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

function showConfetti(message) {
    const modal = document.getElementById('confettiModal');
    const messageEl = document.getElementById('confettiMessage');
    messageEl.textContent = message;
    modal.style.display = 'block';
    
    // Create confetti effect
    createConfetti();
    
    // Close after 5 seconds
    setTimeout(() => {
        modal.style.display = 'none';
        const canvas = document.getElementById('confettiCanvas');
        if (canvas) {
            canvas.remove();
        }
    }, 5000);
}

function createConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * canvas.height,
            r: Math.random() * 10 + 5,
            d: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncrement: Math.random() * 0.1 + 0.05,
            tiltAngle: Math.random() * Math.PI
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fillStyle = c.color;
            ctx.fill();
            
            c.y += c.d;
            c.tiltAngle += c.tiltAngleIncrement;
            c.x += Math.sin(c.tiltAngle) * 2;
            c.tilt += c.tiltAngleIncrement;
            
            if (c.y > canvas.height) {
                c.y = -c.r;
                c.x = Math.random() * canvas.width;
            }
        });
        
        requestAnimationFrame(draw);
    }
    
    draw();
    
    // Stop after 5 seconds
    setTimeout(() => {
        canvas.remove();
    }, 5000);
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

