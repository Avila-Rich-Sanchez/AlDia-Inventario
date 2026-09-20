import os
import sys
from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from openpyxl import load_workbook
from uuid import uuid4

DB_PATH = os.environ.get('MIPOS_DB_PATH')

if not DB_PATH:
    if sys.platform == 'win32':
        base = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
        DB_DIR = os.path.join(base, 'MiPOS')
    elif sys.platform == 'darwin':
        DB_DIR = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'MiPOS')
    else:
        DB_DIR = os.path.join(os.path.expanduser('~'), '.mipos')
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, 'database.db')

app = Flask(__name__)
# SQLite local, offline, en la carpeta del usuario
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modelo de Producto para la Base de Datos
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    codigo = db.Column(db.String(50), unique=True, nullable=True)
    categoria = db.Column(db.String(50), nullable=True)
    precio_costo = db.Column(db.Float, nullable=True, default=0)
    precio_venta = db.Column(db.Float, nullable=True, default=0)
    ganancia = db.Column(db.Float, nullable=True, default=0)
    stock_actual = db.Column(db.Integer, nullable=False, default=0)
    stock_minimo = db.Column(db.Integer, nullable=False, default=5)
    proveedor = db.Column(db.String, default="Vacio")

    # Método para calcular el estado del semáforo en el servidor
    def estado_semaforo(self):
        if self.stock_actual == 0:
            return 'rojo'
        elif self.stock_actual <= self.stock_minimo:
            return 'amarillo'
        return 'verde'


class HistorialVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), unique=True, nullable=False)
    nombre_producto = db.Column(db.String(100), nullable=False)
    cantidad_vendida = db.Column(db.Integer, nullable=False, default=0)
    precio_obtenido = db.Column(db.Float, nullable=False, default=0)
    ultima_venta = db.Column(db.DateTime, nullable=False, server_default=db.func.current_timestamp())

    producto = db.relationship('Producto')

from datetime import datetime

from datetime import datetime, timezone

class AlertaStock(db.Model):
    __tablename__ = 'alerta_stock'

    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    stock_al_momento = db.Column(db.Integer, nullable=False)
    stock_minimo = db.Column(db.Integer, nullable=False)
    fecha_creada = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    leida = db.Column(db.Boolean, default=False)
    resuelta = db.Column(db.Boolean, default=False)
    fecha_resuelta = db.Column(db.DateTime, nullable=True)

    producto = db.relationship('Producto', backref='alertas')

# Crear la base de datos si no existe
with app.app_context():
    db.create_all()

def verificar_alerta_stock(producto):
    """
    Revisa el estado del producto y:
    - Si está en amarillo y no tiene alerta activa → crea una.
    - Si está en verde y tiene alerta activa → la marca como resuelta.
    
    NO hace commit. Lo deja para quien la llama.
    """
    if producto is None or producto.id is None:
        return None  # producto aún no guardado

    stock = producto.stock_actual or 0
    minimo = producto.stock_minimo or 0

    esta_en_amarillo = stock < minimo  # incluye rojo (0)
    esta_en_verde = stock >= minimo

    # Buscar alerta activa (no resuelta) para este producto
    alerta_activa = AlertaStock.query.filter_by(
        producto_id=producto.id,
        resuelta=False
    ).first()

    if esta_en_amarillo and alerta_activa is None:
        # Crear nueva alerta
        nueva = AlertaStock(
            producto_id=producto.id,
            stock_al_momento=stock,
            stock_minimo=minimo
        )
        db.session.add(nueva)
        return nueva

    if esta_en_verde and alerta_activa is not None:
        # Resolver la alerta existente
        alerta_activa.resuelta = True
        alerta_activa.fecha_resuelta = datetime.now(timezone.utc).replace(tzinfo=None)
        return alerta_activa

    return None  # sin cambios

@app.route('/')
def inventario():
    # Obtenemos todos los productos ordenados
    productos = Producto.query.all()
    return render_template('inventario.html', productos=productos)


@app.route('/productos', methods=['POST'])
def crear_producto():
    datos = request.get_json(silent=True)
    if datos is None:
        datos = request.form

    codigo = str(datos.get('codigo', '')).strip()
    nombre = str(datos.get('nombre', '')).strip()
    categoria = str(datos.get('categoria', '')).strip()

    

    if not nombre or len(nombre) > 100:
        return jsonify({'error': 'El nombre del producto es obligatorio (máx 100).'}), 400
    if not categoria or len(categoria) > 50:
        return jsonify({'error': 'La categoría es obligatoria (máx 50).'}), 400

    try:
        stock = int(datos.get("stock", ''))
        stock_min = int(datos.get("stockmin", ''))
        precio_costo = float(datos.get('precio_costo', ''))
        precio_venta = float(datos.get('precio_venta', ''))
    except (TypeError, ValueError):
        return jsonify({'error': 'Stock y precios deben ser números válidos.'}), 400

    if precio_costo < 0 or precio_venta < 0:
        return jsonify({'error': 'Los precios no pueden ser negativos.'}), 400
    if stock < 1:
        return jsonify({'error': 'El stock debe ser mayor que cero.'}), 400
    if codigo and Producto.query.filter_by(codigo=codigo).first():
        return jsonify({'error': f'El código "{codigo}" ya está en uso.'}), 409

    ganancia = round(precio_venta - precio_costo, 2)

    producto = Producto(
        nombre=nombre,
        codigo=codigo or f'PROD-{uuid4().hex[:8].upper()}',
        categoria=categoria,
        precio_costo=precio_costo,
        precio_venta=precio_venta,
        ganancia=ganancia,
        stock_actual=stock,
        stock_minimo=stock_min
    )

    try:
        db.session.add(producto)
        db.session.flush()
        verificar_alerta_stock(producto)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al guardar: {e}'}), 500

    if request.is_json:
        return jsonify({'mensaje': 'Producto creado correctamente.', 'id': producto.id}), 201
    return redirect(url_for('inventario'))

# En app.py - Añadir esta ruta

@app.route('/ventas')
def ventas():
    # Obtener productos para el catálogo
    productos = Producto.query.order_by(Producto.nombre).all()

    ultimo_ticket = 124
    ticket_number = f"V-{str(ultimo_ticket + 1).zfill(5)}"
    
    # Obtener categorías únicas para filtros
    categorias = list(set([p.categoria for p in productos if p.categoria]))
    categorias.sort()
    
    return render_template('ventas.html',
            productos=productos, 
            ticket_number=ticket_number,
            categorias=categorias)


@app.route('/historial')
def historial():
    ventas_registradas = HistorialVenta.query.order_by(HistorialVenta.ultima_venta.desc()).all()
    return render_template('historial.html', ventas=ventas_registradas)


@app.route('/api/ventas', methods=['POST'])
def registrar_venta():
    datos = request.get_json(silent=True) or {}
    items = datos.get('items')
    if not isinstance(items, list) or not items:
        return jsonify({'error': 'La venta debe contener productos.'}), 400

    cantidades = {}
    for item in items:
        try:
            producto_id = int(item.get('id'))
            cantidad = int(item.get('cantidad'))
        except (AttributeError, TypeError, ValueError):
            return jsonify({'error': 'Producto o cantidad inválidos.'}), 400
        if cantidad < 1:
            return jsonify({'error': 'La cantidad debe ser mayor que cero.'}), 400
        cantidades[producto_id] = cantidades.get(producto_id, 0) + cantidad

    productos = {producto.id: producto for producto in Producto.query.filter(Producto.id.in_(cantidades)).all()}
    if len(productos) != len(cantidades):
        return jsonify({'error': 'Uno de los productos ya no existe.'}), 404

    for producto_id, cantidad in cantidades.items():
        if productos[producto_id].stock_actual < cantidad:
            return jsonify({'error': f'Stock insuficiente para {productos[producto_id].nombre}.'}), 409

    try:
        for producto_id, cantidad in cantidades.items():
            producto = productos[producto_id]
            precio_venta = producto.precio_venta 
            producto.stock_actual -= cantidad
            verificar_alerta_stock(producto)
            registro = HistorialVenta.query.filter_by(producto_id=producto.id).first()
            if registro is None:
                registro = HistorialVenta(
                    producto_id=producto.id,
                    nombre_producto=producto.nombre,
                    cantidad_vendida=0,
                    precio_obtenido=0
                )
                db.session.add(registro)
            registro.nombre_producto = producto.nombre
            registro.cantidad_vendida += cantidad
            registro.precio_obtenido += precio_venta * cantidad
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'No se pudo registrar la venta.'}), 500

    return jsonify({'mensaje': 'Venta registrada correctamente.'}), 201


@app.route('/api/ventas/sync', methods=['POST'])
def sincronizar_ventas():
    datos = request.get_json(silent=True) or {}
    ventas_pendientes = datos.get('ventas', [])
    sincronizadas = []
    pendientes = []

    for indice, venta in enumerate(ventas_pendientes):
        registrar = app.test_request_context(json={'items': venta.get('items', [])})
        with registrar:
            respuesta = registrar_venta()
            codigo = respuesta[1] if isinstance(respuesta, tuple) else respuesta.status_code
            if codigo >= 400:
                cuerpo = respuesta[0].get_json() if isinstance(respuesta, tuple) else respuesta.get_json()
                pendientes.append({'indice': indice, 'error': cuerpo.get('error', 'No se pudo sincronizar.')})
            else:
                sincronizadas.append(indice)

    return jsonify({
        'mensaje': 'Sincronización completada.',
        'sincronizadas': sincronizadas,
        'pendientes': pendientes
    })

@app.route('/plantilla/productos')
def descargar_plantilla():
    ruta = os.path.join(app.static_folder, 'plantillas', 'plantilla_productos.xlsx')
    if not os.path.exists(ruta):
        return jsonify({'error': 'La plantilla no está disponible.'}), 404
    return send_file(
        ruta,
        as_attachment=True,
        download_name='plantilla_productos.xlsx'
    )

# =========================================================
# IMPORTAR PRODUCTOS DESDE EXCEL
# =========================================================

def _leer_excel(stream):
    """Lee el archivo .xlsx y devuelve lista de dicts (una por fila)."""
    wb = load_workbook(stream, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    if not filas:
        return []

    headers = [str(h or '').strip().lower() for h in filas[0]]
    resultado = []
    for fila in filas[1:]:
        if all(c is None or str(c).strip() == '' for c in fila):
            continue
        fila_dict = {}
        for i, h in enumerate(headers):
            fila_dict[h] = fila[i] if i < len(fila) else None
        resultado.append(fila_dict)
    return resultado


def _num(valor, default=0.0):
    if valor is None or str(valor).strip() == '':
        return default
    try:
        return float(valor)
    except (TypeError, ValueError):
        raise ValueError(f'valor numérico inválido ({valor!r})')


def _validar_fila(fila, fila_num):
    """Valida y normaliza una fila. Lanza ValueError si hay problema."""
    nombre = str(fila.get('nombre') or '').strip()
    categoria = str(fila.get('categoria') or '').strip()
    codigo = str(fila.get('codigo') or '').strip()
    proveedor = str(fila.get('proveedor') or '').strip() or 'Vacio'

    if not nombre:
        raise ValueError(f'Fila {fila_num}: el nombre está vacío')
    if len(nombre) > 100:
        raise ValueError(f'Fila {fila_num}: nombre demasiado largo (máx 100)')
    if not categoria:
        raise ValueError(f'Fila {fila_num}: la categoría está vacía')
    if len(categoria) > 50:
        raise ValueError(f'Fila {fila_num}: categoría demasiado larga (máx 50)')

    precio_costo = _num(fila.get('precio_costo'), 0.0)
    precio_venta = _num(fila.get('precio_venta'), 0.0)
    stock_actual = int(_num(fila.get('stock_actual'), 0))
    stock_minimo = int(_num(fila.get('stock_minimo'), 5))

    if precio_costo < 0 or precio_venta < 0:
        raise ValueError(f'Fila {fila_num}: precios no pueden ser negativos')
    if stock_actual < 0 or stock_minimo < 0:
        raise ValueError(f'Fila {fila_num}: stock no puede ser negativo')

    ganancia = round(precio_venta - precio_costo, 2)

    return {
        'codigo': codigo or None,  # None → se genera
        'nombre': nombre,
        'categoria': categoria,
        'precio_costo': precio_costo,
        'precio_venta': precio_venta,
        'ganancia': ganancia,
        'stock_actual': stock_actual,
        'stock_minimo': stock_minimo,
        'proveedor': proveedor,
    }


@app.route('/api/productos/importar', methods=['POST'])
def importar_productos():
    archivo = request.files.get('archivo')
    if not archivo or not archivo.filename:
        return jsonify({'error': 'No se envió archivo.'}), 400

    if not archivo.filename.lower().endswith('.xlsx'):
        return jsonify({'error': 'Solo se aceptan archivos .xlsx'}), 400

    try:
        filas = _leer_excel(archivo.stream)
    except Exception as e:
        return jsonify({'error': f'No se pudo leer el archivo: {e}'}), 400

    if not filas:
        return jsonify({'error': 'El archivo está vacío.'}), 400

    creados = 0
    actualizados = 0
    errores = []

    try:
        for i, fila in enumerate(filas, start=2):
            try:
                datos = _validar_fila(fila, i)
            except ValueError as e:
                errores.append(str(e))
                continue

            codigo = datos['codigo']

            # ===== LÓGICA UPSERT (Opción B) =====
            producto = None
            if codigo:
                # Buscar por código
                producto = Producto.query.filter_by(codigo=codigo).first()
            else:
                # Buscar por nombre + categoría
                producto = Producto.query.filter_by(
                    nombre=datos['nombre'],
                    categoria=datos['categoria']
                ).first()

            if producto:
                # ACTUALIZAR
                producto.precio_costo = datos['precio_costo']
                producto.precio_venta = datos['precio_venta']
                producto.ganancia = datos['ganancia']
                producto.stock_actual = datos['stock_actual']
                producto.stock_minimo = datos['stock_minimo']
                producto.proveedor = datos['proveedor']
                verificar_alerta_stock(producto)
                # El nombre y categoría se respetan los de la BD
                actualizados += 1
            else:
                # CREAR
                nuevo = Producto(
                    codigo=codigo or f'PROD-{uuid4().hex[:8].upper()}',
                    nombre=datos['nombre'],
                    categoria=datos['categoria'],
                    precio_costo=datos['precio_costo'],
                    precio_venta=datos['precio_venta'],
                    ganancia=datos['ganancia'],
                    stock_actual=datos['stock_actual'],
                    stock_minimo=datos['stock_minimo'],
                    proveedor=datos['proveedor'],
                )
                db.session.add(nuevo)
                db.session.flush()
                verificar_alerta_stock(nuevo)
                creados += 1

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al guardar: {e}'}), 500

    return jsonify({
        'mensaje': f'{creados} creados, {actualizados} actualizados.',
        'creados': creados,
        'actualizados': actualizados,
        'errores': errores,
        'total_filas': len(filas),
    }), 200

@app.route('/api/alertas', methods=['GET'])
def listar_alertas():
    """Devuelve las alertas activas (no resueltas), ordenadas por fecha reciente."""
    alertas = (
        AlertaStock.query
        .filter_by(resuelta=False)
        .order_by(AlertaStock.fecha_creada.desc())
        .all()
    )

    resultado = []
    for a in alertas:
        producto = Producto.query.get(a.producto_id)
        if producto is None:
            continue  # producto eliminado, ignorar
        resultado.append({
            'id': a.id,
            'producto_id': producto.id,
            'nombre': producto.nombre,
            'codigo': producto.codigo,
            'categoria': producto.categoria,
            'proveedor': producto.proveedor,
            'stock_actual': producto.stock_actual,
            'stock_minimo': producto.stock_minimo,
            'stock_al_momento': a.stock_al_momento,
            'fecha_creada': a.fecha_creada.isoformat() if a.fecha_creada else None,
            'leida': a.leida,
        })

    no_leidas = sum(1 for a in alertas if not a.leida)

    return jsonify({
        'total': len(resultado),
        'no_leidas': no_leidas,
        'alertas': resultado
    }), 200


@app.route('/api/alertas/<int:alerta_id>/marcar-leida', methods=['POST'])
def marcar_alerta_leida(alerta_id):
    """Marca una alerta como leída (no la resuelve)."""
    alerta = AlertaStock.query.get(alerta_id)
    if not alerta:
        return jsonify({'error': 'Alerta no encontrada.'}), 404
    alerta.leida = True
    db.session.commit()
    return jsonify({'mensaje': 'Alerta marcada como leída.'}), 200


@app.route('/api/alertas/marcar-todas-leidas', methods=['POST'])
def marcar_todas_leidas():
    """Marca todas las alertas activas como leídas."""
    AlertaStock.query.filter_by(resuelta=False, leida=False).update({'leida': True})
    db.session.commit()
    return jsonify({'mensaje': 'Todas las alertas marcadas como leídas.'}), 200

if __name__ == '__main__':
    app.run(debug=True)