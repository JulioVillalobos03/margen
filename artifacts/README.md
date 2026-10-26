# APK de prueba — Margen 0.1.0

Generado el 21 de octubre de 2026 mediante compilación local Gradle, sin subir código a EAS.

- Archivo: `margen-piloto-arm64.apk`, aproximadamente 57 MB.
- Paquete: `com.margen.piloto`; versión 0.1.0 (código 1).
- Arquitectura incluida: arm64-v8a; no incluye soporte x86 ni ARM de 32 bits.
- Firma de desarrollo v2 verificada. No es una firma de publicación.
- Bundle JavaScript, clase `MargenOcrModule` y modelos ML Kit presentes en el APK.
- SHA-256: `49d0cd9b4c6c16ea776afbe6dfd02ab9bc23c342d0b4b89c74b0fc4858ad69bb`.
- Compilación, TypeScript, 43 pruebas de dominio/seguridad y 11 pruebas Kotlin aprobados. Instalación, OCR de capturas, evaluación y persistencia comprobados en el emulador Android 15 ARM64. Prueba física pendiente.
- El OCR ordena las líneas por posición vertical antes de interpretarlas para conservar las contraofertas debajo de Aceptar.
- Incluye lectura de pantalla con MediaProjection y tarjeta flotante. Deben concederse ambos permisos desde Inicio → Leer pantalla de DiDi. Ver [funcionamiento y límites](../docs/lectura-pantalla.md).

Con el Android conectado y autorizado por USB:

```sh
npm run install:android:pilot
```

Luego abrir Margen → Probar lectura de oferta → Seleccionar una captura. No necesita Metro ni Expo Go. Su almacenamiento es independiente del historial de Expo Go. Guía completa en [compilación Android](../docs/compilacion-android.md).

APK y checksum están ignorados en Git. Para regenerarlos: `npm run build:android:pilot`.

Esta APK incluye Supabase conectado, registro/acceso por correo y Google, recuperación, almacenes por cuenta, respaldo manual y correcciones de desplazamiento/navegación. Google se comprobó de extremo a extremo en web; en Android se comprobó apertura del navegador y cancelación. El primer acceso real en teléfono y el envío de correo con SMTP propio quedan pendientes.
