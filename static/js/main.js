document.addEventListener('DOMContentLoaded', function() {
    // ===== ELEMENTOS =====
    const filterButton = document.getElementById('filterButton');
    const filterModal = document.getElementById('filterModal');
    const closeModal = document.getElementById('closeModal');
    const filterForm = document.getElementById('filterForm');
    const resetFilters = document.getElementById('resetFilters');
    const searchInput = document.getElementById('searchInput');
    const productRows = document.querySelectorAll('#productTableBody tr');
    const productCount = document.getElementById('productCount');
    const filterStatus = document.getElementById('filterStatus');
    const filterBadge = document.getElementById('filterBadge');
    const newProductButton = document.getElementById('newProductButton');
    const productModal = document.getElementById('productModal');
    const closeProductModal = document.getElementById('closeProductModal');
    const productForm = document.getElementById('productForm');
    const importButton = document.getElementById('importButton');
    const importModal = document.getElementById('importModal');
    const closeImportModal = document.getElementById('closeImportModal');
    const importFile = document.getElementById('importFile');
    const doImport = document.getElementById('doImport');
    const cancelImport = document.getElementById('cancelImport');
    const importResult = document.getElementById('importResult');
    const notifBell = document.getElementById('notifBell');
    const notifBadge = document.getElementById('notifBadge');
    const notifPanel = document.getElementById('notifPanel');
    const notifBackdrop = document.getElementById('notifBackdrop');
    const notifList = document.getElementById('notifList');
    const notifPanelCount = document.getElementById('notifPanelCount');
    const closeNotifPanel = document.getElementById('closeNotifPanel');
    const markAllRead = document.getElementById('markAllRead');

    // ===== ABRIR MODAL =====
    function openModal() {
        filterModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // ===== CERRAR MODAL =====
    function closeModalFunc() {
        filterModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openProductModal() {
        productModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('productName').focus();
    }

    function closeProductModalFunc() {
        productModal.classList.remove('active');
        document.body.style.overflow = '';
    }

        function openImportModal() {
        importModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        importResult.classList.add('hidden');
        importResult.innerHTML = '';
        importFile.value = '';
    }

    function closeImportModalFunc() {
        importModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ===== EVENTOS DEL MODAL =====
    filterButton.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalFunc);
    newProductButton.addEventListener('click', openProductModal);
    closeProductModal.addEventListener('click', closeProductModalFunc);
    importButton.addEventListener('click', openImportModal);
    closeImportModal.addEventListener('click', closeImportModalFunc);
    cancelImport.addEventListener('click', closeImportModalFunc);

        // ===== IMPORTAR PRODUCTOS =====
    doImport.addEventListener('click', async function() {
        if (!importFile.files.length) {
            showImportResult('Selecciona un archivo .xlsx primero.', 'error');
            return;
        }

        const archivo = importFile.files[0];
        if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
            showImportResult('Solo se permiten archivos .xlsx', 'error');
            return;
        }

        const fd = new FormData();
        fd.append('archivo', archivo);

        doImport.disabled = true;
        doImport.textContent = 'Importando...';
        showImportResult('⏳ Procesando archivo...', 'info');

        try {
            const res = await fetch('/api/productos/importar', {
                method: 'POST',
                body: fd
            });
            const data = await res.json();

            if (!res.ok) {
                showImportResult('❌ ' + (data.error || 'Error al importar'), 'error');
                return;
            }

            let html = '<p class="text-emerald-600 font-semibold">✅ ' + data.mensaje + '</p>';
            html += '<ul class="text-sm text-slate-600 mt-2 space-y-1">';
            html += '<li>📦 Creados: <strong>' + data.creados + '</strong></li>';
            html += '<li>🔄 Actualizados: <strong>' + data.actualizados + '</strong></li>';
            if (data.errores && data.errores.length) {
                html += '<li>⚠️ Con errores: <strong class="text-red-600">' + data.errores.length + '</strong></li>';
            }
            html += '</ul>';

            if (data.errores && data.errores.length) {
                html += '<details class="mt-3"><summary class="cursor-pointer text-amber-600 text-sm font-semibold">Ver errores</summary>';
                html += '<ul class="list-disc ml-5 mt-2 text-xs text-slate-600 max-h-40 overflow-y-auto">';
                html += data.errores.slice(0, 30).map(e => '<li>' + e + '</li>').join('');
                html += '</ul></details>';
            }

            showImportResult(html, 'success');

            // Recargar después de 3s si hubo al menos algo importado
            if (data.creados + data.actualizados > 0) {
                setTimeout(() => window.location.reload(), 3500);
            }
        } catch (err) {
            showImportResult('❌ Error de red: ' + err.message, 'error');
        } finally {
            doImport.disabled = false;
            doImport.textContent = 'Importar';
        }
    });

    function showImportResult(html, tipo) {
        importResult.classList.remove('hidden');
        importResult.className = 'mb-5 p-4 rounded-xl border text-sm';
        if (tipo === 'error') {
            importResult.classList.add('bg-red-50', 'border-red-200', 'text-red-700');
        } else if (tipo === 'success') {
            importResult.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
        } else {
            importResult.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700');
        }
        importResult.innerHTML = html;
    }
    
    filterModal.addEventListener('click', function(e) {
        if (e.target === this) closeModalFunc();
    });

    productModal.addEventListener('click', function(e) {
        if (e.target === this) closeProductModalFunc();
    });

    importModal.addEventListener('click', function(e) {
        if (e.target === this) closeImportModalFunc();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (filterModal.classList.contains('active')) closeModalFunc();
            if (productModal.classList.contains('active')) closeProductModalFunc();
            if (importModal.classList.contains('active')) closeImportModalFunc();
        }
    });

    console.log(productForm)

    productForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const response = await fetch('/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(productForm)))
        });
        const result = await response.json();
        if (!response.ok) {
            window.alert(result.error || 'No se pudo registrar el producto.');
            return;
        }
        window.location.reload();
    });

    // ===== FUNCIÓN DE FILTRADO COMBINADO =====
    function filterProducts() {
        // Obtener valores de búsqueda
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // Obtener valores de filtros (si existen)
        const categoria = document.getElementById('categoriaFilter')?.value || '';
        const precioMin = parseFloat(document.getElementById('precioMin')?.value) || 0;
        const precioMax = parseFloat(document.getElementById('precioMax')?.value) || Infinity;
        
        const stockVerde = document.getElementById('stockVerde')?.checked || false;
        const stockAmarillo = document.getElementById('stockAmarillo')?.checked || false;
        const stockRojo = document.getElementById('stockRojo')?.checked || false;

        const stockFilters = [];
        if (stockVerde) stockFilters.push('verde');
        if (stockAmarillo) stockFilters.push('amarillo');
        if (stockRojo) stockFilters.push('rojo');

        let visibleCount = 0;
        let filterCount = 0;
        let filterMessages = [];

        // Filtrar productos
        productRows.forEach(row => {
            const rowNombre = row.dataset.nombre?.toLowerCase() || '';
            const rowCodigo = row.dataset.codigo?.toLowerCase() || '';
            const rowCategoria = row.dataset.categoria || '';
            const rowPrecio = parseFloat(row.dataset.precio) || 0;
            const rowEstado = row.dataset.estado || '';

            let show = true;

            // ===== FILTRO DE BÚSQUEDA =====
            if (searchTerm) {
                const searchMatch = rowNombre.includes(searchTerm) || 
                                rowCodigo.includes(searchTerm) || 
                                rowCategoria.toLowerCase().includes(searchTerm);
                if (!searchMatch) {
                    show = false;
                }
            }

            // ===== FILTRO POR CATEGORÍA =====
            if (show && categoria && rowCategoria !== categoria) {
                show = false;
            }

            // ===== FILTRO POR PRECIO =====
            if (show && (rowPrecio < precioMin || rowPrecio > precioMax)) {
                show = false;
            }

            // ===== FILTRO POR STOCK =====
            if (show && stockFilters.length > 0 && !stockFilters.includes(rowEstado)) {
                show = false;
            }

            // Mostrar u ocultar
            if (show) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // ===== ACTUALIZAR CONTADOR =====
        productCount.textContent = `${visibleCount} productos`;

        // ===== ACTUALIZAR ESTADO DE FILTROS =====
        if (searchTerm) {
            filterCount++;
            filterMessages.push(`Búsqueda: "${searchTerm}"`);
        }

        if (categoria) {
            filterCount++;
            filterMessages.push(`Categoría: ${categoria}`);
        }

        if (precioMin > 0 || precioMax < Infinity) {
            filterCount++;
            const minStr = precioMin > 0 ? `$${precioMin.toFixed(2)}` : '$0';
            const maxStr = precioMax < Infinity ? `$${precioMax.toFixed(2)}` : '∞';
            filterMessages.push(`Precio: ${minStr} - ${maxStr}`);
        }

        if (stockFilters.length > 0 && stockFilters.length < 3) {
            filterCount++;
            const estados = stockFilters.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
            filterMessages.push(`Stock: ${estados}`);
        }

        // Actualizar badge del botón
        if (filterCount > 0) {
            filterBadge.textContent = filterCount;
            filterBadge.classList.remove('hidden');
        } else {
            filterBadge.classList.add('hidden');
        }

        // Actualizar estado del footer
        if (filterCount > 0) {
            filterStatus.textContent = `Filtros aplicados: ${filterMessages.join(' | ')}`;
            filterStatus.classList.add('text-emerald-600');
        } else {
            filterStatus.textContent = 'Mostrando todos los productos';
            filterStatus.classList.remove('text-emerald-600');
        }
    }

    // ===== APLICAR FILTROS (desde el modal) =====
    function applyFilters(event) {
        if (event) event.preventDefault();
        filterProducts();
        closeModalFunc();
    }

    // ===== RESETEAR FILTROS =====
    function resetFiltersFunc() {
        document.getElementById('categoriaFilter').value = '';
        document.getElementById('precioMin').value = '';
        document.getElementById('precioMax').value = '';
        document.getElementById('stockVerde').checked = false;
        document.getElementById('stockAmarillo').checked = false;
        document.getElementById('stockRojo').checked = false;
        searchInput.value = '';

        filterProducts();
    }

    function abrirPanelNotif() {
        notifPanel.classList.remove('translate-x-full');
        notifBackdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderizarAlertas();
    }

    function cerrarPanelNotif() {
        notifPanel.classList.add('translate-x-full');
        notifBackdrop.classList.add('hidden');
        document.body.style.overflow = '';
    }

    async function cargarAlertas() {
        try {
            const res = await fetch('/api/alertas');
            const data = await res.json();
            if (!res.ok) return;

            const noLeidas = data.no_leidas || 0;
            if (noLeidas > 0) {
                notifBadge.textContent = noLeidas > 99 ? '99+' : noLeidas;
                notifBadge.classList.remove('hidden');
            } else {
                notifBadge.classList.add('hidden');
            }

            window._alertasCache = data.alertas || [];
        } catch (e) {
            console.warn('No se pudieron cargar las alertas:', e);
        }
    }

    function renderizarAlertas() {
        const alertas = window._alertasCache || [];
        notifPanelCount.textContent = alertas.length;

        if (alertas.length === 0) {
            notifList.innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <svg class="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm">No hay alertas activas</p>
                </div>
            `;
            return;
        }

        notifList.innerHTML = alertas.map(a => `
            <div class="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow ${a.leida ? '' : 'border-l-4 border-l-amber-500'}">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-slate-800 text-sm truncate">${a.nombre}</p>
                        <p class="text-xs text-slate-400 font-mono">${a.codigo || '—'}</p>
                    </div>
                    <span class="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        ⚠️ Bajo stock
                    </span>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-600 mb-3">
                    <span>Stock actual: <strong class="text-red-600">${a.stock_actual}</strong></span>
                    <span>Mínimo: <strong>${a.stock_minimo}</strong></span>
                </div>
                <div class="text-xs text-slate-500 mb-3">
                    Proveedor: <span class="font-mono">${a.proveedor || 'No asignado'}</span>
                </div>
                <button class="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        data-alerta-id="${a.id}"
                        ${!a.proveedor || a.proveedor === 'Vacio' ? 'disabled title="Este producto no tiene proveedor asignado"' : ''}>
                    📱 Pedir a proveedor
                </button>
            </div>
        `).join('');

        notifList.querySelectorAll('button[data-alerta-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.alertaId);
                const alerta = alertas.find(a => a.id === id);
                if (alerta) pedirAProveedor(alerta);
            });
        });
    }

        function pedirAProveedor(alerta) {
        // Guardar alerta actual
        window._alertaActual = alerta;

        // Rellenar datos del modal
        document.getElementById('pedidoNombre').textContent = alerta.nombre;
        document.getElementById('pedidoCodigo').textContent = alerta.codigo || '—';
        document.getElementById('pedidoStockActual').textContent = alerta.stock_actual;
        document.getElementById('pedidoStockMinimo').textContent = alerta.stock_minimo;
        document.getElementById('pedidoProveedor').textContent = alerta.proveedor || '—';

        // Sugerir una cantidad objetivo por defecto: el doble del mínimo
        const objetivoSugerido = alerta.stock_minimo * 2;
        document.getElementById('pedidoObjetivo').value = objetivoSugerido;

        // Calcular y mostrar el mensaje inicial
        actualizarPedido();

        // Abrir modal (y cerrar el panel de notificaciones)
        cerrarPanelNotif();
        document.getElementById('pedidoModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function actualizarPedido() {
        const alerta = window._alertaActual;
        if (!alerta) return;

        const objetivo = parseInt(document.getElementById('pedidoObjetivo').value) || 0;
        const cantidad = Math.max(0, objetivo - alerta.stock_actual);

        document.getElementById('pedidoCantidad').textContent = cantidad;

        // Armar mensaje
        const mensaje =
            `Hola, buen día. Le escribo de AlDia.\n\n` +
            `Necesito reponer el siguiente producto:\n\n` +
            `• ${alerta.nombre}\n` +
            `¿Podría indicarme disponibilidad y precio de ${cantidad} ${alerta.nombre}?\n\n` +
            `Gracias.`;

        document.getElementById('pedidoMensaje').value = mensaje;
    }

    function cerrarPedidoModal() {
        document.getElementById('pedidoModal').classList.remove('active');
        document.body.style.overflow = '';
        window._alertaActual = null;
    }

    function enviarPedidoWhatsApp() {
        const alerta = window._alertaActual;
        if (!alerta || !alerta.proveedor) return;

        const cantidad = parseInt(document.getElementById('pedidoCantidad').textContent) || 0;
        if (cantidad < 1) {
            alert('La cantidad a pedir debe ser mayor que cero.');
            return;
        }

        const mensaje = document.getElementById('pedidoMensaje').value;
        const textoCodificado = encodeURIComponent(mensaje);

        // Limpiar el número: quitar espacios, guiones, paréntesis, el "+"
        const numeroLimpio = String(alerta.proveedor).replace(/[^\d]/g, '');

        // wa.me funciona en web y app (si está instalada, el SO la abre)
        const url = `https://wa.me/${numeroLimpio}?text=${textoCodificado}`;

        // Abrir en nueva pestaña/ventana. En pywebview se abre en el navegador del sistema.
        window.open(url, '_blank');
    }

    // ===== EVENTOS DEL MODAL DE PEDIDO =====
    const pedidoModal = document.getElementById('pedidoModal');
    const closePedidoModalBtn = document.getElementById('closePedidoModal');
    const cancelPedidoBtn = document.getElementById('cancelPedido');
    const enviarPedidoBtn = document.getElementById('enviarPedido');
    const pedidoObjetivoInput = document.getElementById('pedidoObjetivo');

    if (pedidoModal) {
        closePedidoModalBtn.addEventListener('click', cerrarPedidoModal);
        cancelPedidoBtn.addEventListener('click', cerrarPedidoModal);
        enviarPedidoBtn.addEventListener('click', enviarPedidoWhatsApp);
        pedidoObjetivoInput.addEventListener('input', actualizarPedido);

        pedidoModal.addEventListener('click', function(e) {
            if (e.target === this) cerrarPedidoModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && pedidoModal.classList.contains('active')) {
                cerrarPedidoModal();
            }
        });
    }

    notifBell.addEventListener('click', abrirPanelNotif);
    closeNotifPanel.addEventListener('click', cerrarPanelNotif);
    notifBackdrop.addEventListener('click', cerrarPanelNotif);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !notifPanel.classList.contains('translate-x-full')) {
            cerrarPanelNotif();
        }
    });

    cargarAlertas();
    setInterval(cargarAlertas, 30000);

    // ===== EVENT LISTENERS =====
    filterForm.addEventListener('submit', applyFilters);
    resetFilters.addEventListener('click', resetFiltersFunc);
    
    // Búsqueda en tiempo real (con debounce para mejor rendimiento)
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterProducts, 300);
    });

    // ===== ANIMAR FILAS AL CARGAR =====
    const rows = document.querySelectorAll('.product-card');
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.animation = `fadeInUp 0.5s ease-out forwards`;
        row.style.animationDelay = `${index * 0.05}s`;
    });

    // ===== OBSERVER PARA EL MODAL =====
    const modalObserver = new MutationObserver(() => {
        if (filterModal.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    modalObserver.observe(filterModal, { attributes: true, attributeFilter: ['class'] });
});
