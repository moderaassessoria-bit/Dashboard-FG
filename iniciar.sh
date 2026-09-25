#!/bin/bash
echo "========================================================"
echo "        GARDEN SALES - GESTAO COMERCIAL"
echo "========================================================"
echo ""
echo "Iniciando o sistema..."

if [ ! -d "node_modules" ]; then
    echo "Instalando dependências pela primeira vez..."
    npm install
fi

echo "Abrindo o navegador em http://localhost:5173"
if which xdg-open > /dev/null; then
    xdg-open http://localhost:5173 &
elif which open > /dev/null; then
    open http://localhost:5173 &
fi

npm run dev
