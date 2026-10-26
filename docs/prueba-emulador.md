# Prueba nativa en emulador — 21 de octubre de 2026

## Entorno

- Mac Apple Silicon y Android Studio instalado.
- AVD `Margen_API35`, perfil Pixel 7, Android 15/API 35, Google APIs, ARM64.
- SDK del emulador en `~/Library/Android/sdk`; herramientas de compilación y JDK 21 del proyecto en `.tooling/`.
- APK `com.margen.piloto` 0.1.0, release con firma de desarrollo y bundle JS incluido. No requiere Expo Go ni Metro.
- Julio autorizó instalar las herramientas, aceptar su licencia y controlar exclusivamente el dispositivo virtual mediante ADB.

El AVD anterior de API 37 se conservó sin borrar sus datos. No completó el arranque durante la prueba; se usó el nuevo API 35. La configuración actual reserva 3 GB de RAM, 4 núcleos y renderizado por software.

## Resultados comprobados desde la interfaz

Se copiaron las dos imágenes proporcionadas por Julio a Download del emulador como `didi-oferta-22.jpeg` y `didi-oferta-61.jpeg`. Se seleccionaron mediante el selector de fotos del sistema; no se sustituyó la imagen por texto de ejemplo.

| Captura | Precio | Recogida | Viaje | Total | Importe/km | Importe/hora |
| --- | --- | --- | --- | --- | --- | --- |
| 61 | $61.23 | 8 min / 2.2 km | 21 min / 9.5 km | 29 min / 11.7 km | $5.23 | $126.68 |
| 22 | $22.70 | 10 min / 2.2 km | 3 min / 0.77 km | 13 min / 2.97 km | $7.64 | $104.77 |

Ambas lecturas coincidieron en los cinco campos necesarios con sus imágenes. Se revisaron los campos editables y se guardaron las dos evaluaciones. Se forzó el cierre y se volvió a abrir la app: ambas permanecen en el historial SQLite con procedencia «Lectura revisada».

Con el umbral provisional de $6/km y máximo 30 minutos, la oferta de $61.23 queda fuera del criterio por kilómetro; la de $22.70 cumple ambos criterios. Los valores son anteriores a descuentos y costos. Los descuentos se conservaron desconocidos; esto no acredita ganancia neta.

La primera lectura detectó un problema real: ML Kit devolvía bloques con las contraofertas antes de «Aceptar», por lo que el extractor rechazaba la entrada. Se corrigió el módulo Kotlin para ordenar las líneas por su posición en la imagen. Tras recompilar, reinstalar sin borrar datos y repetir ambas capturas, las dos se interpretaron correctamente.

## Volver a probar

1. Iniciar Margen API35 desde Virtual Device Manager si está apagado, o ejecutar `npm run emulator:android` desde el proyecto.
2. Abrir Margen. Entrar al piloto local si aparece la bienvenida.
3. Inicio → Probar lectura de oferta → Seleccionar una captura. Las dos fotos están disponibles en el selector.
4. Comparar los datos detectados, pulsar Revisar en el evaluador y después Evaluar y guardar.
5. Historial muestra las evaluaciones conservadas.

Para instalar una nueva compilación: `npm run install:android:pilot`. Si hay más de un dispositivo conectado, usar `bash scripts/install-android.sh emulator-5554` (comprobar antes el identificador con `adb devices`). No desinstalar para actualizar: `install -r` conserva los datos.

## Evidencia

- Configuración de Android Studio: evidencia conservada solo en el entorno local.
- Lectura de $61.23: evidencia OCR conservada localmente; [resultado sin rutas](diseno/emulador-evaluacion-61.png).
- Lectura de $22.70: evidencia OCR conservada localmente; [resultado sin rutas](diseno/emulador-evaluacion-22.png).
- [Historial después de cerrar y reabrir](diseno/emulador-historial.png).

Compilación Gradle, TypeScript y 16 pruebas automatizadas aprobadas con este APK. Solo se comprobó esta versión de Android y estas dos capturas: teléfono físico, otras versiones, modo avión, latencia y consumo de batería permanecen pendientes. Tampoco se probó captura en vivo sobre DiDi: el flujo actual procesa imágenes seleccionadas por el usuario.
