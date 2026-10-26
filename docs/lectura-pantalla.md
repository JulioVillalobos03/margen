# Lectura de pantalla — piloto Android

## Funcionamiento

Inicio → Leer pantalla de DiDi permite preparar una sesión explícita de MediaProjection. Margen solicita mostrar una tarjeta sobre otras apps y luego abre el diálogo de captura de Android. En Android 14 o superior se recomienda compartir solo DiDi si el dispositivo ofrece esa opción; en versiones anteriores la captura puede incluir toda la pantalla. No se usan servicios de accesibilidad ni se realizan acciones sobre DiDi.

El servicio nativo permanece activo mientras Margen está en segundo plano. Lee fotogramas con ML Kit incluido en el APK, sin escribir imágenes ni texto OCR en archivos, registros o base de datos. La captura es visual; no solicita micrófono. Conserva en memoria los cinco campos de una lectura vigente y su latencia. Además, retiene una única lectura numérica durante un máximo de 60 segundos para revisión explícita al volver a Margen, identificada como posiblemente vencida; nunca alimenta la tarjeta con esa copia. Al detener la sesión se descarta. La revisión y guardado manual siguen disponibles; el registro guarda `extraction.input = 'screen'`, sin rutas ni texto original.

La tarjeta muestra importe/km, minutos y kilómetros totales, con recogida incluida. Compara el importe antes de descuentos y costos con los objetivos vigentes al iniciar la sesión. Los descuentos siguen desconocidos. No equivale a una estimación de ganancia neta y no acepta, rechaza ni propone viajes.

## Permisos y controles

1. Marcar la explicación de acceso a pantalla dentro de Margen.
2. Configurar «Mostrar sobre otras apps» para Margen y volver.
3. Pulsar Autorizar e iniciar lectura y aprobar la sesión en Android. Elegir solo DiDi cuando sea posible.
4. Arrastrar el encabezado de la tarjeta sobre un área del mapa que no tape botones.
5. Detener desde la ✕, desde Margen o desde el control del sistema. Bloquear la pantalla también detiene el servicio.

El token se utiliza una sola vez y no se guarda. El servicio no se reinicia automáticamente tras su cierre o al arrancar el teléfono. El permiso de tarjeta puede revocarse en ajustes. Android muestra una sesión de captura; la notificación del servicio contiene la acción Detener y se presenta conforme a los permisos de notificaciones del dispositivo.

## Lecturas incompletas y vigencia

Se exige Pon Tu Precio, un importe principal, un único Aceptar con el mismo importe y exactamente dos filas de tiempo/distancia. Se descartan precios de contraoferta posteriores al botón. Una lectura incompleta invalida la anterior; un resultado sin fotogramas nuevos caduca a los tres segundos. Se limita el OCR a como máximo un fotograma cada 850 ms y una tarea simultánea. Un fotograma que tarda más que su plazo no publica cifras.

En el visor de fotos, Android puede dejar de emitir fotogramas cuando la imagen queda estática: la tarjeta vuelve entonces a «Esperando oferta». No se renueva su vigencia reutilizando una imagen antigua. El comportamiento con el contador y las animaciones de las ofertas reales necesita medición en teléfono.

Android 14+ permite cambios de tamaño de la región compartida: se redimensiona el mismo VirtualDisplay, sin reutilizar el token. Ocultar la app compartida, bloquear pantalla o detener la proyección retira los datos. Pantallas protegidas con FLAG_SECURE pueden verse negras: no se intenta eludir esa protección.

## Validación pendiente en DiDi real

Probar con el conductor detenido, primero fuera de jornada: comprobar precio, recogida, viaje, demora de la tarjeta y desaparición al vencer la oferta. Probar cancelación de permisos, cierre de tarjeta, bloqueo, rotación, interrupción de captura y modo avión. Medir latencia durante varias ofertas y consumo en un teléfono físico; el emulador y dos capturas no acreditan compatibilidad con DiDi real, todas las versiones de Android ni su ventana de doce segundos.

iOS, Expo Go y web no incluyen este servicio Android; conservan sus flujos disponibles de evaluación. La publicación en tiendas requiere revisión de permisos, divulgaciones y requisitos de distribución antes del lanzamiento.

## Comprobado en el emulador el 21 de octubre de 2026

Android 15/API 35 ARM64, AVD Margen_API35. Se concedieron los permisos desde sus interfaces de Android con autorización de Julio. La sesión compartió solamente Photos con las imágenes originales de prueba, no una cuenta de DiDi.

- Servicio de primer plano `mediaProjection` activo mientras Margen estaba en segundo plano; comprobado con el estado de Android.
- Primera imagen: $61.23, recogida 8 min/2.2 km y viaje 21 min/9.5 km; la tarjeta calculó $5.23/km y 29 min.
- Segunda imagen: $22.70, recogida 10 min/2.2 km y viaje 3 min/0.77 km; la tarjeta calculó $7.64/km y 13 min.
- Cambio de imagen y revisión de los cinco campos en Margen. Se corrigió la adquisición de imágenes para conservar el último fotograma durante el límite de frecuencia, en lugar de adquirirlo y descartarlo.
- Ocultar la app compartida retiró los valores vigentes e indicó que la app no estaba visible. Las imágenes estáticas también caducaron al dejar de llegar fotogramas.
- La ✕ eliminó la tarjeta, detuvo el servicio y dejó la proyección del sistema en `null`.
- Detener y revisar última lectura abrió los campos correctos y también dejó servicio y proyección detenidos. El guardado explícito añadió una evaluación de $61.23 al historial conservando los registros anteriores.

Las capturas de evidencia que contienen las rutas originales se conservan en `.tooling/`, ignorado en Git. La [pantalla de configuración](diseno/lectura-pantalla-configuracion.png) y el [estado final detenido](diseno/lectura-pantalla-detenida.png) no incluyen datos del pasajero. No se midió una distribución de latencia ni batería; tampoco se probó todavía DiDi real, bloqueo, rotación o distintas versiones Android. No se dejó una sesión de captura activa al terminar.

Verificaciones de esta APK: TypeScript, 16 pruebas de dominio y 11 pruebas Kotlin aprobadas; firma y SHA-256 verificados. La migración `202610210001_screen_provenance.sql` está preparada, sin ejecutarse en un servidor.

## Fuentes técnicas oficiales

- [MediaProjection y consentimiento por sesión](https://developer.android.com/media/grow/media-projection).
- [Permiso de superposición](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW).
- [ML Kit: reconocimiento de texto en Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android).
- [Pantallas protegidas con FLAG_SECURE](https://developer.android.com/security/fraud-prevention/activities).
