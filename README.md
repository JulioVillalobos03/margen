# Margen — piloto para conductores

Compilación Android local: [guía de APK y conexión USB](docs/compilacion-android.md). Herramientas aisladas en `.tooling/`, comandos `npm run build:android:pilot` y `npm run install:android:pilot`. La prueba real de OCR se registra en el [checklist del teléfono](docs/checklist-ocr-telefono.md).

Nueva entrega: [lectura de pantalla Android](docs/lectura-pantalla.md) con permiso por sesión, OCR local y tarjeta flotante. Requiere la nueva APK. La validación con DiDi real en el teléfono del conductor sigue pendiente. También está disponible la [lectura de capturas](docs/prueba-lectura-capturas.md); texto y ejemplos funcionan en Expo Go.

Aplicación Expo/React Native basada en los mockups aprobados. Evalúa ofertas de DiDi Pon Tu Precio con recogida incluida. Nombre provisional.

## Ejecutar

Usar una versión de Node compatible con el SDK instalado (ver `package.json`) y npm.

```sh
npm ci
npm start
# Android con Expo Go compatible con SDK 57, misma red Wi-Fi:
npx expo start --go --lan --port 8082 --clear
# Vista web
npm run web
# Verificaciones
npm run typecheck
npm test
npm run export:web
```

Esta entrega admite entrada manual, ejemplos, capturas seleccionadas y sesiones de lectura de pantalla autorizadas en Android. No acepta viajes ni envía contraofertas. Supabase y Google están conectados; también hay formularios de correo con confirmación y recuperación. El envío de correos a conductores externos requiere SMTP propio. No hay cobros. El piloto funciona sin cuenta y almacena sus registros en este dispositivo.

## Incluido

- Inicio, configuración del vehículo, objetivos, evaluación, detalle, historial y cuenta.
- Registro/correo, confirmación, recuperación y Google con PKCE. Sesión nativa en SecureStore; datos locales separados por cuenta y por piloto.
- Respaldo y recuperación manuales en Supabase, con fusión de historial sin duplicados y políticas RLS por usuario.
- Navegación con regreso al origen, desplazamiento conservado y protección frente a arrastres que activen botones.
- Lectura Android mediante MediaProjection y ML Kit, tarjeta flotante movible, detención explícita y caducidad de resultados. Sin grabar pantalla ni subir imágenes/texto. Solo Pon Tu Precio con campos completos y precio consistente.
- Costos de combustible y reservas por kilómetro editables. Los desconocidos permanecen vacíos; cero es una elección explícita.
- Mínimo por kilómetro y duración máxima provisional; tasas calculadas sobre importe antes de descuentos, sin presentarlas como ganancia.
- Margen calculado solo al conocer descuentos, combustible y reservas. No incluye retorno, espera adicional ni costos fijos.
- SQLite en Android/iOS y localStorage en la vista web. Historial con copia de los parámetros y versión del motor.
- Exportación JSON descargable en web; en móvil comparte el contenido mediante el selector del sistema. Importación de respaldos pendiente.

## Supabase y acceso

Proyecto gratuito Margen configurado: migraciones aplicadas, RLS por usuario, email con confirmación y Google activado. Solo URL y clave pública de cliente están en `.env`, ignorado en Git. Nunca colocar `service_role`, claves secretas ni el secreto OAuth en variables `EXPO_PUBLIC`.

El acceso con Google, un respaldo de dos ejemplos y su recuperación desde almacenamiento vacío se comprobaron con una cuenta real en web. Las operaciones de cuenta no importan el historial del piloto local. En Cuenta, «Respaldar mi cuenta» envía configuración y fusiona evaluaciones; «Recuperar mi respaldo» trae los ajustes y fusiona el historial. No se suben imágenes ni texto OCR.

Para correo: el proveedor predeterminado de Supabase solo envía a miembros del equipo del proyecto y limita el envío. Configurar SMTP propio antes de registrar conductores externos; no se desactivó la confirmación. Google sigue en modo de prueba; revisar acceso del conductor antes de invitarlo.

Guías: [configuración real del servidor](docs/supabase-setup.md), [cuentas y navegación](docs/auth-ux-validacion.md), [sincronización](docs/sincronizacion-cuentas.md).

## Siguientes entregas

1. Validar la captura consentida con OCR sobre ofertas reales de DiDi; medir latencia, errores y batería en Android físico.
2. Validar Google y sesión persistente en teléfono; configurar SMTP para correo y probar confirmación/recuperación. Apple y sincronización automática quedan pendientes.
3. Ajustar permisos y estados del análisis según los resultados del piloto y ampliar compatibilidad Android.
4. Piloto con el conductor, más muestras y contraste de descuentos reales.
5. Compras de tiendas/RevenueCat, panel de cortesías, borrado de cuenta y publicación.

La vista web sirve para revisar la experiencia; no valida funciones nativas. La compatibilidad real se establecerá por pruebas. No se requieren capturas originales ni datos personales de pasajeros para ejecutar los ejemplos.

Plan: [PLAN_DESARROLLO.md](PLAN_DESARROLLO.md). Diseño: [docs/diseno](docs/diseno/README.md).
