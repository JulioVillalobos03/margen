# Compilación Android local

Configuración preparada el 21 de octubre de 2026. Julio autorizó explícitamente aceptar la licencia del SDK de Android e instalar las herramientas dentro del proyecto.

## Herramientas locales

Se utiliza `.tooling/` (ignorado en Git):

- Temurin JDK 21 ARM64 de Adoptium, verificado con SHA-256 publicado por su API.
- Android Command Line Tools para Mac ARM64, SHA-256 contrastado con la página oficial de Android.
- SDK Platform 36, Build Tools 36.0.0, Platform Tools, NDK 27.1.12297006 y CMake 3.22.1.
- Caché Gradle local al proyecto.

No se cambia Java global ni archivos de configuración del shell. El SDK y Gradle pueden ocupar varios GB. No agregar herramientas, cachés, licencias, claves o APK al repositorio.

## Generar APK del piloto

```sh
bash scripts/build-android.sh
```

El script usa el entorno de `scripts/android-env.sh`, verifica TypeScript y fórmulas, genera un APK release con firma de desarrollo para ARM64 y lo copia a:

```text
artifacts/margen-piloto-arm64.apk
artifacts/margen-piloto-arm64.apk.sha256
```

También ejecuta las pruebas Kotlin del extractor que funciona en segundo plano y de caducidad. La APK actual incluye la [lectura de pantalla con tarjeta flotante](lectura-pantalla.md), que requiere permisos nuevos desde la app después de instalarla.

Es un APK interno con el bundle JavaScript incluido. No requiere Expo Go ni Metro. No es una firma de publicación ni acredita compatibilidad con Android de 32 bits o emuladores x86. El paquete es `com.margen.piloto`.

La configuración reproducible es app.json, package-lock.json y modules/. Android/ se genera mediante Expo prebuild y se ignora solamente en la raíz; el código modules/margen-ocr/android/ sí debe conservarse.

## Instalar por cable

En Android, habilitar Opciones de desarrollador → Depuración USB. Conectar el teléfono y aceptar en él la autorización de la Mac. Después:

```sh
source scripts/android-env.sh
adb devices -l
adb install -r artifacts/margen-piloto-arm64.apk
```

Si aparece `unauthorized`, desbloquear el teléfono y autorizar la conexión. Si hay varios dispositivos, especificar `adb -s SERIAL install -r ...`. No desinstalar ni borrar datos para solucionar un error de firma sin exportar antes el historial. Margen y Expo Go guardan sus datos en espacios distintos; el historial de Expo Go no aparece automáticamente en el APK propio.

También puedes usar `npm run install:android:pilot`: detecta un único dispositivo autorizado, comprueba soporte ARM64 e instala sin desinstalar ni borrar datos.

Se alineó explícitamente expo-font a SDK 57: la versión transitiva 58 impedía compilar aunque el bundle web se generaba correctamente.

## Probar con Android Studio

Se dejó creado `Margen_API35` con Android 15, Google APIs y arquitectura ARM64. En Android Studio: More Actions → Virtual Device Manager → botón de iniciar junto a Margen API35. También, desde la raíz del proyecto:

```sh
npm run emulator:android
```

Ejecutarlo solamente si el dispositivo está apagado. Una vez iniciado, abrir Margen desde las aplicaciones; ya está instalado y no requiere Metro. Para actualizar el APK se puede usar `npm run install:android:pilot`, o `bash scripts/install-android.sh emulator-5554` si hay varios dispositivos. Reporte y evidencia en [prueba del emulador](prueba-emulador.md).

## Verificar OCR en teléfono

1. Abrir Margen → Inicio → Probar lectura de oferta.
2. Seleccionar una captura anonimizada de Pon Tu Precio.
3. Comprobar precio, recogida y viaje contra la imagen.
4. Abrir revisión, corregir si hace falta, evaluar y guardar.
5. Probar también una captura incompleta: debe abstenerse, sin inventar campos.

El OCR se ejecuta en el dispositivo con el modelo incluido. No es aún captura en vivo ni tarjeta sobre DiDi. Registrar modelo, versión de Android, captura usada, campos correctos/incorrectos, tiempo y errores sin guardar datos personales del pasajero.

## Fuentes

- [Descargas oficiales Android](https://developer.android.com/studio)
- [Compatibilidad Gradle/Java](https://docs.gradle.org/current/userguide/compatibility.html)
- [Temurin Adoptium](https://adoptium.net/temurin/releases/)
