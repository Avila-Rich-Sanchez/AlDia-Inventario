# generar_plantilla.py
"""
Genera la plantilla Excel que el usuario descargará para importar productos.
Se ejecuta UNA sola vez. El archivo queda en static/plantillas/.
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter


def crear_plantilla():
    carpeta = os.path.join('static', 'plantillas')
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(carpeta, 'plantilla_productos.xlsx')

    wb = Workbook()

    # ---------- Hoja 1: Productos ----------
    ws = wb.active
    ws.title = 'Productos'

    columnas = [
        ('codigo', 'Código (opcional)'),
        ('nombre', 'Nombre'),
        ('categoria', 'Categoría'),
        ('precio_costo', 'Precio costo'),
        ('precio_venta', 'Precio venta'),
        ('stock_actual', 'Stock actual'),
        ('stock_minimo', 'Stock mínimo'),
        ('proveedor', 'Proveedor (WhatsApp)'),
    ]

    # Estilo de cabecera
    header_fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True)
    header_align = Alignment(horizontal='center', vertical='center')

    for i, (clave, titulo) in enumerate(columnas, start=1):
        celda = ws.cell(row=1, column=i, value=clave)
        celda.fill = header_fill
        celda.font = header_font
        celda.alignment = header_align

        # Comentario explicativo
        if clave == 'codigo':
            celda.comment = None

        ws.column_dimensions[get_column_letter(i)].width = max(len(clave) + 4, 15)

    # Filas de ejemplo
    ejemplos = [
        ['', 'Smart TV 55"', 'Electrónicos', 350.00, 499.99, 10, 3, '+584121234567'],
        ['ELEC-0001', 'Laptop Pro', 'Electrónicos', 800.00, 1199.00, 5, 2, '+584129876543'],
    ]

    for fila_idx, fila in enumerate(ejemplos, start=2):
        for col_idx, valor in enumerate(fila, start=1):
            ws.cell(row=fila_idx, column=col_idx, value=valor)

    # ---------- Hoja 2: Instrucciones ----------
    ws2 = wb.create_sheet('Instrucciones')
    ws2.column_dimensions['A'].width = 100

    instrucciones = [
        ('INSTRUCCIONES PARA IMPORTAR PRODUCTOS', True),
        ('', False),
        ('1. Rellena la hoja "Productos" con tus datos.', False),
        ('2. No cambies el nombre de las columnas de la primera fila.', False),
        ('3. Cada fila es un producto.', False),
        ('', False),
        ('COLUMNAS:', True),
        ('', False),
        ('• codigo (opcional):', True),
        ('    - Si lo dejas vacío, la app genera uno automáticamente.', False),
        ('    - Si pones uno que YA existe, se ACTUALIZA ese producto.', False),
        ('    - Si pones uno nuevo, se CREA un producto nuevo.', False),
        ('', False),
        ('• nombre (obligatorio):', True),
        ('    - Nombre del producto. Máximo 100 caracteres.', False),
        ('', False),
        ('• categoria (obligatoria):', True),
        ('    - Ej: Electrónicos, Alimentos, Hogar, Ropa, etc.', False),
        ('', False),
        ('• precio_costo y precio_venta:', True),
        ('    - Números. Pueden ser decimales (ej: 12.50).', False),
        ('    - La ganancia se calcula sola (precio_venta - precio_costo).', False),
        ('', False),
        ('• stock_actual y stock_minimo:', True),
        ('    - Números enteros.', False),
        ('    - stock_minimo por defecto es 5 si lo dejas vacío.', False),
        ('', False),
        ('• proveedor:', True),
        ('    - Número de WhatsApp del proveedor.', False),
        ('    - Formato internacional: +584121234567', False),
        ('    - Si no tienes proveedor, deja vacío.', False),
        ('', False),
        ('COMPORTAMIENTO CON DUPLICADOS:', True),
        ('', False),
        ('• Si pones CÓDIGO y ya existe → se ACTUALIZA (stock, precios, ganancia, proveedor).', False),
        ('• Si NO pones CÓDIGO pero el NOMBRE + CATEGORÍA ya existen → se ACTUALIZA.', False),
        ('• Si NO existe → se CREA un producto nuevo.', False),
        ('', False),
        ('Cuando termines, guarda el archivo y súbelo desde la app.', False),
    ]

    for fila_idx, (texto, negrita) in enumerate(instrucciones, start=1):
        celda = ws2.cell(row=fila_idx, column=1, value=texto)
        if negrita:
            celda.font = Font(bold=True)

    wb.save(ruta)
    print(f'✅ Plantilla creada en: {ruta}')


if __name__ == '__main__':
    crear_plantilla()