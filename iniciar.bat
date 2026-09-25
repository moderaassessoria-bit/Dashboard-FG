@echo off
echo ========================================================
echo         GARDEN SALES - GESTAO COMERCIAL
echo ========================================================
echo.
echo Iniciando o sistema...
echo.

IF NOT EXIST "node_modules" (
    echo Instalando dependencias pela primeira vez...
    call npm install
)

echo Abrindo o navegador em http://localhost:5173
start http://localhost:5173

call npm run dev
pause
