# AlDía — Sistema de Inventario y Punto de Venta

**AlDía** es una aplicación de escritorio ligera para la gestión de inventario y ventas de pequeños y medianos comercios. Funciona **100 % offline**, sin servidores, sin internet y sin cuentas. Cada computadora tiene su propia base de datos local.

---

## ✨ Características

- 📦 **Inventario completo** — Alta, consulta y control de productos con estado visual (verde / amarillo / rojo).
- 💰 **Punto de venta** — Registro de ventas con cálculo automático de IVA, ganancia y ticket.
- 📥 **Importación desde Excel** — Carga masiva de productos desde un archivo `.xlsx` con lógica de *upsert* (crea o actualiza).
- 🔔 **Alertas de stock** — Notificaciones automáticas cuando un producto baja del stock mínimo.
- 📱 **Pedidos a proveedores** — Envío de pedidos de reposición por WhatsApp con un clic.
- 📊 **Historial de ventas** — Registro histórico por producto.
- 🖥️ **App de escritorio** — Ventana nativa con icono propio, sin navegador visible.
- 🔌 **100 % offline** — Sin dependencia de internet ni servidores externos.
- 💾 **Base de datos local** — SQLite en la carpeta del usuario, portátil y rápida.

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|------------|
| Backend | Python 3 · Flask |
| Base de datos | SQLite + SQLAlchemy |
| Frontend | HTML · TailwindCSS · JavaScript vanilla |
| Ventana nativa | pywebview |
| Empaquetado | PyInstaller |
| Importación Excel | openpyxl |

---

## 🚀 Instalación (para desarrollo)

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/aldia-pos.git
cd aldia-pos

# 2. Entorno virtual
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # Mac/Linux

# 3. Dependencias
pip install -r requirements.txt

# 4. Arrancar
python app.py