@echo off
REM Abre el panel del admin en este PC (http://localhost:3000)
REM Se conecta al backend de Railway indicado en VITE_API_URL del archivo .env
cd /d "%~dp0"
title SE7EN Admin (no cierres esta ventana)

REM Redes de empresa con inspeccion SSL: usar los certificados de Windows si Node lo permite
node --use-system-ca -e "" >nul 2>&1 && set "NODE_OPTIONS=--use-system-ca"

if not exist node_modules\.bin\vite.cmd (
  echo Instalando dependencias, solo la primera vez...
  if exist node_modules rmdir /s /q node_modules
  call npm install || goto error_install
)
echo Preparando el panel...
call npm run build:admin || goto error
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
echo.
echo Panel listo en http://localhost:3000
echo Para cerrarlo, cierra esta ventana.
call npm run start:admin
goto :eof

:error_install
echo.
echo No se pudieron descargar las dependencias.
echo Si ves SELF_SIGNED_CERT_IN_CHAIN, tu red bloquea npm: revisa la seccion 8 del manual.
pause
goto :eof

:error
echo.
echo Hubo un error. Revisa que Node.js 22 este instalado y que exista el archivo .env
pause
