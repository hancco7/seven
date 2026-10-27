# Guía para Compilar el APK — SE7EN Barbershop

## Requisitos previos

| Herramienta | Versión mínima | Enlace |
|-------------|----------------|--------|
| Java JDK | 17 o 21 | https://adoptium.net |
| Android Studio | Hedgehog o superior | https://developer.android.com/studio |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | incluido con Node |

> Android Studio instala automáticamente el SDK de Android y Gradle.

---

## Paso 1 — Instalar dependencias

```bash
cd Barber-v11/frontend
npm install
```

---

## Paso 2 — Configurar variables de entorno

Copia `.env.example` a `.env` y edita:

```env
VITE_API_URL=https://tu-backend.railway.app
```

---

## Paso 3 — Compilar el frontend (React → dist/)

```bash
# Linux/Mac
node ./node_modules/vite/bin/vite.js build

# Windows (PowerShell)
node .\node_modules\vite\bin\vite.js build
```

Salida esperada:
```
✓ built in ~2.5s
PWA mode: generateSW
precache 8 entries
```

---

## Paso 4 — Sincronizar con Capacitor

```bash
node ./node_modules/@capacitor/cli/bin/capacitor sync android
```

Esto copia el `dist/` dentro del proyecto Android.

---

## Paso 5 — Abrir Android Studio

```bash
node ./node_modules/@capacitor/cli/bin/capacitor open android
```

O abre manualmente `Barber-v11/frontend/android/` desde Android Studio.

---

## Paso 6 — Compilar APK debug (para pruebas)

**Opción A — Desde Android Studio:**
1. Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)
2. El APK se genera en: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opción B — Línea de comandos (requiere Android SDK configurado):**
```bash
cd android
./gradlew assembleDebug          # Linux/Mac
.\gradlew.bat assembleDebug      # Windows
```

---

## Paso 7 — APK de producción (firmado)

1. En Android Studio: Build → Generate Signed Bundle / APK
2. Selecciona **APK**
3. Crea o selecciona tu **keystore**:
   - Guárdalo en lugar seguro (necesario para actualizaciones futuras)
   - Key alias: `se7en_key`
4. Build Variants: **release**
5. APK generado en: `android/app/build/outputs/apk/release/app-release.apk`

**Desde línea de comandos:**
```bash
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=ruta/keystore.jks \
  -Pandroid.injected.signing.store.password=TU_PASSWORD \
  -Pandroid.injected.signing.key.alias=se7en_key \
  -Pandroid.injected.signing.key.password=TU_KEY_PASSWORD
```

---

## Instalar en dispositivo Android

```bash
# Con adb (Android Debug Bridge)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# O copia el .apk al dispositivo y ábrelo desde el explorador de archivos
# (requiere activar "Instalar fuentes desconocidas" en Configuración → Seguridad)
```

---

## Información de la app

| Campo | Valor |
|-------|-------|
| App ID | `com.se7en.barbershop` |
| Nombre | SE7EN Barbershop |
| minSdkVersion | 24 (Android 7.0) |
| targetSdkVersion | 36 (Android 16) |
| Versión | 1.0 |

