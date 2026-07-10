from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import webbrowser
import socket
import os

BASE = Path(__file__).resolve().parent
os.chdir(BASE)

PORT = 8765
local_url = f"http://localhost:{PORT}"

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    local_ip = s.getsockname()[0]
    s.close()
except Exception:
    local_ip = "IP-DO-COMPUTADOR"

mobile_url = f"http://{local_ip}:{PORT}"

print("=" * 58)
print("PAINEL DIÁRIO — CLODOALDO")
print("=" * 58)
print(f"No computador: {local_url}")
print(f"No celular, na mesma rede Wi-Fi: {mobile_url}")
print("Mantenha esta janela aberta enquanto estiver usando o painel.")
print("Para encerrar, pressione Ctrl+C ou feche esta janela.")
print("=" * 58)

webbrowser.open(local_url)
ThreadingHTTPServer(("0.0.0.0", PORT), SimpleHTTPRequestHandler).serve_forever()
