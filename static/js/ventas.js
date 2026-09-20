document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    const CONFIG = {
    IVA: 0.16,
    STORAGE_KEY: 'ventas_cart',
    PENDING_KEY: 'ventas_pendientes',
    SALES_KEY: 'ventas_historial',
    SYNC_INTERVAL: 15000,       
    MAX_INTENTOS: 10
};

    let cart = [];
    let currentTicket = document.querySelector('.ticket-number')?.textContent || 'V-00000';
    let syncing = false;

    const elements = {
        productGrid: document.getElementById('productGrid'),
        searchInput: document.getElementById('searchProduct'),
        filterPills: document.querySelectorAll('.filter-pill'),
        cartItemsList: document.getElementById('cartItemsList'),
        emptyCartMessage: document.getElementById('emptyCartMessage'),
        cartItemsCount: document.getElementById('cartItemsCount'),
        subtotalDisplay: document.getElementById('subtotalDisplay'),
        ivaDisplay: document.getElementById('ivaDisplay'),
        totalDisplay: document.getElementById('totalDisplay'),
        completarBtn: document.getElementById('completarVenta'),
        noResults: document.getElementById('noResults'),
        // Modales
        ticketModal: document.getElementById('ticketModal'),
        cambioModal: document.getElementById('cambioModal'),
        // Estado conexión
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        clockDisplay: document.getElementById('clockDisplay')
    };

    function init() {
        // Cargar carrito desde localStorage
        loadCart();
        
        // Actualizar UI
        updateCartUI();
        
        // Iniciar reloj
        updateClock();
        setInterval(updateClock, 1000);
        
        // Verificar conexión
        checkConnection();
        setInterval(checkConnection, CONFIG.SYNC_INTERVAL);
        window.addEventListener('online', sincronizarVentas);
        
        // Event listeners
        setupEventListeners();
        
        // Atajos de teclado
        setupKeyboardShortcuts();
        
        console.log('🛒 AlDía POS inicializado');
    }


    function addToCart(productId) {
        const productCard = document.querySelector(`.product-card-venta[data-id="${productId}"]`);
        if (!productCard) return;

        const stock = parseInt(productCard.dataset.stock);
        if (stock <= 0) {
            showNotification('Producto sin stock', 'error');
            return;
        }

        const nombre = productCard.dataset.nombre;
        const codigo = productCard.dataset.codigo;
        const precio = parseFloat(productCard.dataset.precio);

        // Verificar si ya existe en el carrito
        const existing = cart.find(item => item.id === productId);
        if (existing) {
            if (existing.cantidad >= stock) {
                showNotification('Stock insuficiente', 'error');
                return;
            }
            existing.cantidad++;
        } else {
            cart.push({
                id: productId,
                nombre: nombre,
                codigo: codigo,
                precio: precio,
                cantidad: 1,
                maxStock: stock
            });
        }

        updateCartUI();
        showNotification(`${nombre} agregado`, 'success');
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        updateCartUI();
    }

    function updateQuantity(productId, delta) {
        const item = cart.find(i => i.id === productId);
        if (!item) return;

        const newQty = item.cantidad + delta;
        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }
        if (newQty > item.maxStock) {
            showNotification('Stock insuficiente', 'error');
            return;
        }

        item.cantidad = newQty;
        updateCartUI();
    }

    function setQuantity(productId, qty) {
        const item = cart.find(i => i.id === productId);
        if (!item) return;
        if (qty < 1) qty = 1;
        if (qty > item.maxStock) {
            showNotification('Stock insuficiente', 'error');
            qty = item.maxStock;
        }
        item.cantidad = qty;
        updateCartUI();
    }

    function getCartTotal() {
        return cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    }

    function getCartItemsCount() {
        return cart.reduce((sum, item) => sum + item.cantidad, 0);
    }


    function updateCartUI() {
        const totalItems = getCartItemsCount();
        elements.cartItemsCount.textContent = totalItems;

        if (cart.length === 0) {
            elements.emptyCartMessage.classList.remove('hidden');
            elements.cartItemsList.innerHTML = '';
            elements.completarBtn.disabled = true;
            elements.subtotalDisplay.textContent = '$0.00';
            elements.ivaDisplay.textContent = '$0.00';
            elements.totalDisplay.textContent = '$0.00';
            saveCart();
            return;
        }

        elements.emptyCartMessage.classList.add('hidden');

        // Renderizar items
        elements.cartItemsList.innerHTML = cart.map((item, index) => `
            <div class="cart-item flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm" style="animation-delay: ${index * 0.05}s">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">${item.nombre}</p>
                    <p class="text-xs text-slate-400">${item.codigo}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="window.updateQuantity(${item.id}, -1)" 
                            class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">
                        -
                    </button>
                    <input type="number" value="${item.cantidad}" min="1" max="${item.maxStock}"
                        class="qty-input py-1 px-0 text-center border-0 bg-transparent font-bold text-slate-700"
                        onchange="window.setQuantity(${item.id}, parseInt(this.value) || 1)">
                    <button onclick="window.updateQuantity(${item.id}, 1)" 
                            class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">
                        +
                    </button>
                </div>
                <div class="text-right min-w-[70px]">
                    <span class="text-sm font-semibold text-slate-700">$${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
                <button onclick="window.removeFromCart(${item.id})" 
                        class="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Actualizar totales
        const subtotal = getCartTotal();
        const iva = subtotal * CONFIG.IVA;
        const total = subtotal + iva;

        elements.subtotalDisplay.textContent = `$${subtotal.toFixed(2)}`;
        elements.ivaDisplay.textContent = `$${iva.toFixed(2)}`;
        elements.totalDisplay.textContent = `$${total.toFixed(2)}`;

        elements.completarBtn.disabled = false;

        // Guardar en localStorage
        saveCart();
    }

    function saveCart() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage');
        }
    }

    function loadCart() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                cart = JSON.parse(saved);
                // Verificar que los productos aún existan en el DOM
                cart = cart.filter(item => {
                    const exists = document.querySelector(`.product-card-venta[data-id="${item.id}"]`);
                    return exists;
                });
            }
        } catch (e) {
            console.warn('No se pudo cargar el carrito');
        }
    }

    function filterProducts() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const activeCategory = document.querySelector('.filter-pill.active');
        const category = activeCategory ? activeCategory.dataset.categoria : 'todos';
        const cards = document.querySelectorAll('.product-card-venta');
        let visible = 0;

        cards.forEach(card => {
            const nombre = card.dataset.nombre.toLowerCase();
            const codigo = card.dataset.codigo.toLowerCase();
            const categoria = card.dataset.categoria;

            let match = true;
            if (searchTerm) {
                match = nombre.includes(searchTerm) || codigo.includes(searchTerm);
            }
            if (match && category !== 'todos') {
                match = categoria === category;
            }

            if (match) {
                card.style.display = '';
                visible++;
            } else {
                card.style.display = 'none';
            }
        });

        elements.noResults.classList.toggle('hidden', visible > 0);
    }

    async function completarVenta() {
        if (cart.length === 0) {
            showNotification('Carrito vacío', 'error');
            return;
        }
        await procesarVenta();
    }

    function calcularVuelto() {
        const total = parseFloat(document.getElementById('cambioTotal').textContent.replace('$', ''));
        const recibido = parseFloat(document.getElementById('dineroRecibido').value) || 0;
        const vuelto = recibido - total;
        const display = document.getElementById('vueltoDisplay');
        
        if (vuelto >= 0) {
            display.textContent = `$${vuelto.toFixed(2)}`;
            display.className = 'text-2xl font-bold text-emerald-600';
        } else {
            display.textContent = '$0.00';
            display.className = 'text-2xl font-bold text-red-500';
        }
    }

    function confirmarVuelto() {
        const total = parseFloat(document.getElementById('cambioTotal').textContent.replace('$', ''));
        const recibido = parseFloat(document.getElementById('dineroRecibido').value) || 0;
        
        if (recibido < total) {
            showNotification('El monto recibido es insuficiente', 'error');
            return;
        }
        
        cerrarCambioModal();
        procesarVenta();
    }

    function cancelarVuelto() {
        cerrarCambioModal();
    }

    function cerrarCambioModal() {
        document.getElementById('cambioModal').classList.add('hidden');
        document.getElementById('cambioModal').style.display = 'none';
    }

    async function procesarVenta() {
        const subtotal = getCartTotal();
        const iva = subtotal * CONFIG.IVA;
        const total = subtotal + iva;

        elements.completarBtn.disabled = true;
        const venta = {
            ticket: currentTicket,
            items: cart.map(item => ({ id: item.id, cantidad: item.cantidad })),
            subtotal: subtotal,
            iva: iva,
            total: total,
            fecha: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: venta.items })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No se pudo registrar la venta.');
        } catch (error) {
            if (!navigator.onLine || error instanceof TypeError) {
                guardarVentaPendiente(venta);
                mostrarTicket(cart, subtotal, iva, total, venta.ticket);
                guardarVenta({ ...venta, sincronizado: false });
                cart = [];
                updateCartUI();
                showNotification('Venta guardada localmente. Se sincronizará al volver la conexión.', 'warning');
                return;
            }
            elements.completarBtn.disabled = false;
            showNotification(error.message, 'error');
            return;
        }

        // Generar número de ticket
        const ticketNumber = currentTicket;
        
        // Mostrar ticket
        mostrarTicket(cart, subtotal, iva, total, ticketNumber);
        
        // Guardar en historial
        guardarVenta({ ...venta, sincronizado: true });

        // Limpiar carrito
        cart = [];
        updateCartUI();
        
        showNotification(`Venta #${ticketNumber} completada`, 'success');
    }

    function mostrarTicket(items, subtotal, iva, total, ticketNumber) {
        const modal = document.getElementById('ticketModal');
        document.getElementById('ticketNumberDisplay').textContent = ticketNumber;
        document.getElementById('ticketDateDisplay').textContent = new Date().toLocaleString('es-VE');
        
        // Items
        document.getElementById('ticketItems').innerHTML = items.map(item => `
            <div class="flex justify-between py-1 border-b border-slate-100">
                <div>
                    <span class="font-medium">${item.nombre}</span>
                    <span class="text-xs text-slate-400 ml-1">x${item.cantidad}</span>
                </div>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
        `).join('');
        
        document.getElementById('ticketSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('ticketIVA').textContent = `$${iva.toFixed(2)}`;
        document.getElementById('ticketTotal').textContent = `$${total.toFixed(2)}`;
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function closeTicketModal() {
        document.getElementById('ticketModal').classList.add('hidden');
        document.getElementById('ticketModal').style.display = 'none';
    }

    function printTicket() {
        window.print();
    }

    function guardarVenta(venta) {
        try {
            // Guardar en localStorage
            let historial = JSON.parse(localStorage.getItem(CONFIG.SALES_KEY) || '[]');
            historial.push(venta);
            localStorage.setItem(CONFIG.SALES_KEY, JSON.stringify(historial));
            
        } catch (e) {
            console.warn('No se pudo guardar la venta localmente');
        }
    }

    function guardarVentaPendiente(venta) {
        try {
            const pendientes = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
            pendientes.push(venta);
            localStorage.setItem(CONFIG.PENDING_KEY, JSON.stringify(pendientes));
        } catch (e) {
            console.warn('No se pudo guardar la venta pendiente');
        }
    }

    async function sincronizarVentas() {
        if (syncing || !navigator.onLine) return;
        syncing = true;
        try {
            const pendientes = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
            
            if (pendientes.length === 0) return;
            
            const response = await fetch('/api/ventas/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ventas: pendientes })
            });
            if (!response.ok) return;

            const resultado = await response.json();
            const indicesPendientes = new Set((resultado.pendientes || []).map(item => item.indice));
            const ventasRestantes = pendientes.filter((_, indice) => indicesPendientes.has(indice));
            localStorage.setItem(CONFIG.PENDING_KEY, JSON.stringify(ventasRestantes));

            const historial = JSON.parse(localStorage.getItem(CONFIG.SALES_KEY) || '[]');
            const sincronizadas = new Set(resultado.sincronizadas || []);
            const ticketsSincronizados = new Set(
                pendientes.filter((_, indice) => sincronizadas.has(indice)).map(venta => venta.ticket)
            );
            localStorage.setItem(CONFIG.SALES_KEY, JSON.stringify(
                historial.map(venta => ticketsSincronizados.has(venta.ticket)
                    ? { ...venta, sincronizado: true }
                    : venta)
            ));
        } catch (e) {
            console.log('⏳ No se pudo sincronizar, pendientes para después');
        } finally {
            syncing = false;
        }
    }


    function checkConnection() {
        const isOnline = navigator.onLine;
        elements.statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        elements.statusText.textContent = isOnline ? 'En línea' : 'Sin conexión';
        if (isOnline) sincronizarVentas();
    }


    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-VE', { hour12: false });
        const dateStr = now.toLocaleDateString('es-VE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        elements.clockDisplay.textContent = `${dateStr} ${timeStr}`;
    }

    function showNotification(message, type = 'success') {
        const colors = {
            success: 'bg-emerald-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-lg animate-slideIn max-w-sm`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // F10 - Completar venta
            if (e.key === 'F10') {
                e.preventDefault();
                if (!elements.completarBtn.disabled) {
                    completarVenta();
                }
            }
            
            // Ctrl+F o Ctrl+B - Enfocar búsqueda
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'b')) {
                e.preventDefault();
                elements.searchInput.focus();
                elements.searchInput.select();
            }
            
            // Escape - Cerrar modales
            if (e.key === 'Escape') {
                if (document.getElementById('ticketModal').style.display === 'flex') {
                    closeTicketModal();
                }
                if (document.getElementById('cambioModal').style.display === 'flex') {
                    cancelarVuelto();
                }
            }
        });
    }

    function setupEventListeners() {
        // Búsqueda
        elements.searchInput.addEventListener('input', filterProducts);

        // Filtros por categoría
        elements.filterPills.forEach(pill => {
            pill.addEventListener('click', function() {
                elements.filterPills.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                filterProducts();
            });
        });

        // Cerrar modal de ticket
        document.getElementById('closeTicketModal')?.addEventListener('click', closeTicketModal);
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('ticketModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeTicketModal();
        });
        
        document.getElementById('cambioModal')?.addEventListener('click', function(e) {
            if (e.target === this) cancelarVuelto();
        });

        // Cerrar con Escape (ya está en setupKeyboardShortcuts)
        
    }

    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateQuantity = updateQuantity;
    window.setQuantity = setQuantity;
    window.completarVenta = completarVenta;
    window.calcularVuelto = calcularVuelto;
    window.confirmarVuelto = confirmarVuelto;
    window.cancelarVuelto = cancelarVuelto;
    window.closeTicketModal = closeTicketModal;
    window.printTicket = printTicket;
    window.showNotification = showNotification;

    init();
});