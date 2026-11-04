#!/usr/bin/env bash
# Abre el panel del admin en este equipo (http://localhost:3000)
# Se conecta al backend de Railway indicado en VITE_API_URL del archivo .env
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run build:admin
( sleep 3; (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000) ) &
echo "Panel listo en http://localhost:3000 — Ctrl+C para cerrarlo"
npm run start:admin
