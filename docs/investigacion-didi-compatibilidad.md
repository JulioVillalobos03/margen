# Investigación DiDi y compatibilidad móvil

Consulta: 13 de octubre de 2026. Investigación documental; no prueba de funcionamiento en dispositivos.

## DiDi México

- La página oficial de [Pon Tu Precio](https://web.didiglobal.com/mx/conductor/didi-pon-tu-precio/) confirma elección de tarifas, contraofertas, destino antes de aceptar y existencia de una tasa de servicio. No establece aquí un porcentaje universal para Morelos ni explica si el importe principal de las capturas ya descuenta esa tasa.
- La página oficial de [cálculo de ganancias](https://web.didiglobal.com/mx/conductor/calcula-tus-ganancias/) menciona tarifa de servicio e impuestos retenidos al describir las ganancias. No demuestra cómo están representados esos conceptos en las dos pantallas aportadas. No codificar una comisión o retención fija ni descontarla dos veces.
- El [centro de ayuda de México](https://web.didiglobal.com/mx/centro-de-ayuda/) menciona 15 segundos para aceptar una alerta de servicio. Es una referencia general, no confirmación de un plazo universal para Pon Tu Precio. Medir el plazo efectivo en pruebas; no deducir segundos de la longitud o color de la barra.
- Julio confirmó que las filas verde y naranja representan recogida y viaje respectivamente, y que los tiempos se suman. No se encontró una leyenda oficial de esta interfaz exacta en las páginas consultadas; conservar el origen de la confirmación.
- La consulta no estableció acceso a una API pública de ofertas de DiDi para este producto ni autorización de una integración externa. Revisar términos mexicanos aplicables antes de distribuir; no extrapolar términos encontrados para otros países.

## Decisión de arquitectura Android

Mantener React Native/Expo para interfaz y lógica compartida; aislar lectura y presentación entre apps en un módulo nativo Android.

Dos alternativas a prototipar:

1. `AccessibilityService`: comprobar si la pantalla expone campos legibles y estructurados. Su disponibilidad no está demostrada con capturas. [Google Play](https://support.google.com/googleplay/android-developer/answer/10964491?hl=es) contempla usos que no son herramientas de accesibilidad, con declaración, aviso destacado y consentimiento. No declarar falsamente que esta app es una herramienta para discapacidad ni asumir aprobación.
2. `MediaProjection` + OCR local: el usuario inicia una sesión de captura. [Android](https://developer.android.com/media/grow/media-projection) documenta consentimiento por sesión y requisitos del servicio en primer plano para apps orientadas a Android 14+. Evaluar campos capturables, privacidad, batería y latencia. No implica pulsar manualmente una captura por cada oferta, aunque las sesiones pueden finalizar y requerir reinicio.

Para mostrar resultados, investigar una tarjeta compacta con `TYPE_APPLICATION_OVERLAY` y permiso correspondiente. Está documentado desde [Android 8](https://developer.android.com/about/versions/oreo/android-8.0-changes). Lectura y superposición son capacidades distintas y se prueban por separado. La tarjeta no debe cubrir aceptar, rechazar o proponer precio ni interceptar esas acciones.

No hay mecanismo elegido definitivamente: primero medir precisión y viabilidad, después integración estable.

## Matriz de pruebas propuesta

La [tabla de Expo](https://docs.expo.dev/versions/latest/) consultada incluye SDK 57 con Android 7+ como mínimo del framework, target/compile API 36 e iOS 16.4+. Estos datos no equivalen a compatibilidad demostrada del producto ni cierran la elección de SDK estable y dependencias.

- Objetivo inicial propuesto del producto: Android 10 en adelante, sujeto a ensayo técnico. No es un mínimo obligatorio de Expo ni una decisión ya confirmada por Julio.
- Ejecutar pruebas por versión de Android 10 a 16 y añadir versiones posteriores estables disponibles al preparar el lanzamiento.
- Android 8 y 9: evaluar ampliación según alcance del piloto y esfuerzo de soporte; no anunciar soporte sin pruebas.
- En emuladores: instalación, UI, distintos tamaños de pantalla/texto, permisos, interrupciones, reinicio de proceso, persistencia y conectividad.
- En teléfonos físicos de fabricantes distintos: lectura real de DiDi, batería, suspensión, superposición, latencia, presión de memoria y coexistencia con navegación.
- Distinguir mínimo instalable (`minSdk`), versión objetivo (`targetSdk`) y versiones realmente probadas.
- Registrar resultados por capacidad: app base, captura, presentación y sincronización. Fallar una capacidad no debe ocultarse bajo una etiqueta genérica de compatible.

El dispositivo del conductor solo será un caso dentro de esta matriz. No condiciona la investigación previa.

## iOS

[Apple documenta captura y difusión con ReplayKit](https://support.apple.com/en-ca/guide/security/seca5fc039dd/web), iniciada por el usuario, y procesamiento por extensiones. La [documentación actual de ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit) también describe captura en plataformas Apple y sustitución de ReplayKit para streaming/mirroring; comprobar disponibilidad concreta por versión y API al construir la prueba.

Esto justifica investigar iOS, pero no demuestra captura de DiDi ni una interfaz equivalente a la superposición de Android. Validar obtención de frames, procesamiento local, ejecución en segundo plano y presentación oportuna de resultados como problemas separados. No declarar que es imposible ni prometer paridad sin un prototipo físico.

## Próxima ejecución

Preparar extractor y motor con las dos muestras etiquetadas; ampliar casos para medir errores. Construir pruebas separadas de accesibilidad y proyección, con inicio explícito por el usuario y procesamiento local. Elegir la vía según evidencia. Ninguna captura de pasajeros se subirá a la nube por defecto.
