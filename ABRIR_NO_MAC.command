#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 iniciar_painel.py
elif command -v python >/dev/null 2>&1; then
  python iniciar_painel.py
else
  echo "Python não encontrado. Instale o Python 3 para iniciar o painel."
  read -p "Pressione Enter para fechar."
fi
