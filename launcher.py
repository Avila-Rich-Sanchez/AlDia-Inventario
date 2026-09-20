import os
import sys
import socket
import threading
import time
import urllib.request
import webview

# ---------------- Calcular ruta de la BD ----------------
if sys.platform == 'win32':
    base = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
    DB_DIR = os.path.join(base, 'MiPOS')
elif sys.platform == 'darwin':
    DB_DIR = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'MiPOS')
else:
    DB_DIR = os.path.join(os.path.expanduser('~'), 'MiPOS')

os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'database.db')

os.environ['MIPOS_DB_PATH'] = DB_PATH

from app import app


# ---------------- Puerto libre ----------------
def puerto_libre(preferido=5000):
    for p in range(preferido, preferido + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', p)) != 0:
                return p
    return preferido


# ---------------- Arrancar Flask ----------------
def arrancar_flask(puerto):
    app.run(host='127.0.0.1', port=puerto, debug=False, use_reloader=False, threaded=True)


# ---------------- Esperar a que responda ----------------
def esperar_servidor(url, timeout=20):
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.15)
    return False


if __name__ == '__main__':
    puerto = puerto_libre(5000)
    url = f'http://127.0.0.1:{puerto}'

    # Arrancar Flask en hilo
    threading.Thread(target=arrancar_flask, args=(puerto,), daemon=True).start()

    if not esperar_servidor(url):
        print('❌ No se pudo iniciar el servidor')
        sys.exit(1)

    webview.create_window(
        title='AlDia',
        url=url,
        width=1280,
        height=800,
        min_size=(1024, 600),
        confirm_close=True,
    )
    webview.start()