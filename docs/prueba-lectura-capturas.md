# Prueba de lectura de ofertas — 20 de octubre de 2026

Actualización 21 de octubre: ya se instaló el SDK local, se compiló Kotlin y se generó el APK interno ARM64 con firma y contenido verificados. El límite pendiente es ejecutarlo sobre imágenes reales en el teléfono. Sigue [la guía de instalación USB](compilacion-android.md); los límites de herramientas descritos en la verificación inicial más abajo corresponden al estado del día 20.

Inicio → Probar lectura de oferta permite pegar texto o cargar las transcripciones anonimizadas de las dos capturas en Expo Go/web. Esto prueba interpretación, no OCR. En una compilación Android propia permite seleccionar una imagen guardada y leerla con ML Kit latino incluido en la app.

Se muestran los campos detectados para revisarlos en el evaluador. Nada se guarda automáticamente. El historial solo conserva valores revisados, procedencia y versión del extractor; no incluye imagen, URI ni texto original. El selector puede conservar temporalmente la imagen en su caché. No se suben capturas a Supabase.

Esta etapa no es captura en vivo, accesibilidad ni superposición. No solicita cámara o micrófono. La prueba se realiza con el vehículo detenido.

## Reglas

Solo Pon Tu Precio: un importe principal y un botón Aceptar coincidentes, exactamente dos segmentos de tiempo/distancia y totales positivos. Descarta contraofertas posteriores al botón, normaliza metros y coma decimal y se abstiene ante ambigüedades. Los descuentos permanecen desconocidos. No interpreta puntos o calificaciones como dinero ni corrige silenciosamente números dudosos.

El orden recogida/viaje se basa en las muestras y confirmación de Julio. La revisión humana sigue siendo necesaria: una lectura coherente también puede contener errores. No hay precisión medida sobre un conjunto de imágenes reales.

## Prueba en Expo Go

1. Detener Metro y ejecutar `npx expo start --go --lan --port 8082 --clear`.
2. Inicio → Probar lectura de oferta → Ejemplo 1 → Interpretar oferta.
3. Verificar $61.23, recogida de 8 min/2.2 km y viaje de 21 min/9.5 km.
4. Revisar en el evaluador → Evaluar y guardar; comprobar historial.
5. Modificar el importe de Aceptar en el texto y comprobar que aparece Lectura incompleta, sin evaluar ni guardar automáticamente.

## OCR real en Android

Expo Go no incorpora nuestro módulo nuevo. Para compilar localmente se necesita Android Studio con SDK/herramientas, JDK compatible con Gradle/Expo y un dispositivo con depuración USB autorizada:

```sh
npm run android:device
```

Tras instalar la app propia, usar `npm run start:dev -- --lan --port 8082` para sesiones posteriores. El identificador `com.margen.piloto` es provisional; se debe cerrar antes de configurar OAuth o publicar.

Alternativa: perfiles development/preview de `eas.json`. Requieren cuenta Expo, vincular proyecto y configurar firma antes de construir. No se han iniciado compilaciones remotas ni subido archivos. Preview genera APK con bundle incluido; development usa Metro.

## Verificación

- TypeScript y 16 pruebas de motor/extracción aprobadas.
- Bundles web/Android/iOS exportados.
- Autolinking detecta MargenOcrModule.
- Prebuild Android aprobado; android/ queda ignorado en Git.
- Kotlin/Gradle y lectura real de imágenes pendientes: esta Mac no tiene Android SDK instalado. Las pruebas automatizadas usan transcripciones, no ejecutan ML Kit.
- La captura en vivo y sus tiempos se validan después de comprobar lectura de capturas.

Fuentes: [módulos locales](https://docs.expo.dev/modules/get-started/), [ML Kit Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android), [selector de imágenes](https://docs.expo.dev/versions/latest/sdk/imagepicker/).

Revisión en navegador: se comprobó Inicio → lectura → Ejemplo 1 → interpretación → campos editables del evaluador. Evidencia en `docs/diseno/piloto-lectura-revision.png`.
