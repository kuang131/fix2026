@echo off
title SERVIDOR LAB CULTIVO
color 0A

echo [SISTEMA] Iniciando servidor en IP directa 127.0.0.1...
start http://127.0.0.1:8000/index.html

echo [ESTADO] Ejecutando Python (via Launcher 'py')...
py -m http.server 8000 --bind 0.0.0.0

:: Si falla, pausamos
echo.
color 0C
echo [ERROR] EL SERVIDOR SE DETUVO.
pause