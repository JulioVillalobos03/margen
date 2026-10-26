# Plan de desarrollo — Asistente de rentabilidad para conductores

Fecha: 13 de octubre de 2026. Estado actualizado el 20 de octubre: primera base local implementada; servicios remotos y lectura automática pendientes. Ver [estado de desarrollo](docs/estado-desarrollo.md).

Actualización del 20 de octubre de 2026: [respuestas del conductor piloto](docs/entrevista-conductor-piloto.md), confirmadas por Julio como correspondientes a DiDi. Incluyen rendimiento declarado, objetivos y tiempos observados de respuesta; no son reglas universales de la plataforma.

Avance de descubrimiento: se recibieron dos capturas de ofertas «Pon Tu Precio» de DiDi. Campos, cálculos descriptivos y pendientes documentados en [Muestra inicial de ofertas](docs/ofertas-didi-muestra-inicial.md). No se ha validado lectura automática ni integración en vivo.

## 1. Dirección del producto

Ayudar al conductor a evaluar una oferta de DiDi antes de aceptarla, mostrando margen estimado, rendimiento por hora y por kilómetro, y cumplimiento de sus objetivos. Los resultados describen los costos incluidos; no son utilidad neta fiscal ni garantía de ganancias.

Piloto: un conductor de DiDi en Morelos con Android. Producto dirigido a Android y iOS. Presupuesto reducido. Julio conoce React Native/Expo y Flutter; desarrollará con ayuda del asistente de IA.

La prioridad es obtener e interpretar los datos de la oferta y presentar el resultado a tiempo. El historial y la gestión de jornada complementan esa función. Una calculadora manual sirve para validar las fórmulas, pero no demuestra que hayamos resuelto la necesidad principal.

## 2. Decisiones y pendientes

### Base acordada

- React Native con Expo y TypeScript para la aplicación.
- Supabase desde el inicio para identidad y datos remotos.
- SQLite en el teléfono para persistencia y cálculo sin esperar al servidor.
- Inicio con Google; incluir Apple en iOS para cubrir los requisitos aplicables al acceso social.
- Preparar suscripciones, pruebas y acceso de cortesía.
- Probar primero en el Android disponible, manteniendo un proyecto compatible con ambas plataformas.

### Propuestas de este plan

- Un nivel funcional Pro; mensual al lanzamiento y anual después de validar permanencia.
- Prueba de 14 días sin suscripción automática. Duración y mecanismo final sujetos a validación y reglas de distribución.
- Cortesía durante el piloto y seis meses después del lanzamiento para el primer conductor.
- Supabase y RevenueCat gestionados para reducir trabajo operativo.

### Pendientes que bloquean decisiones específicas

- Matriz de compatibilidad Android por versiones y capacidades. Modelo del teléfono del piloto como dato de pruebas, no requisito para avanzar en investigación o arquitectura; municipio o zona de trabajo en Morelos.
- Capturas de ofertas antes de aceptar y ejemplos del resultado después del viaje, sin datos personales de pasajeros.
- Qué representa el importe visible en DiDi: comisión, bonos, reembolsos y retenciones, según el caso real.
- Mecanismo permitido, fiable y suficientemente rápido para obtener ofertas y presentar resultados en cada sistema.
- Disponibilidad de un iPhone para pruebas reales y de las cuentas de publicación.
- Nombre comercial, precio, presupuesto máximo mensual y condiciones finales de incentivos.

## 3. Tecnologías seleccionadas

| Área | Tecnología | Uso |
| --- | --- | --- |
| Aplicación | React Native + Expo + TypeScript | Interfaz y lógica compartidas |
| Navegación | Expo Router | Acceso, configuración, evaluación, historial y cuenta |
| Compilación | Expo development builds | Probar módulos nativos; Expo Go no será el entorno de validación final |
| Persistencia local | expo-sqlite | Vehículo, parámetros, ofertas y cola de sincronización |
| Base remota | Supabase PostgreSQL | Datos por usuario y trazabilidad de cálculos |
| Identidad | Supabase Auth | Google y Apple |
| Autorización | PostgreSQL RLS y permisos mínimos | Aislar datos de usuarios y administración |
| Operaciones privadas | Supabase Edge Functions | Beneficios, recepción de eventos y operaciones con secretos |
| Suscripciones | RevenueCat + compras de las tiendas | Estado de compras, restauración y acceso Pro |
| Cálculos | Funciones puras de TypeScript | Reglas deterministas con versiones y redondeo explícito |
| Pruebas | Jest y React Native Testing Library | Fórmulas, sincronización y flujos críticos |
| Versionado | Git y migraciones SQL | Cambios reproducibles de app y base de datos |

No habrá un servidor adicional de Node, microservicios, mapas propios ni un modelo de IA de pago en el MVP.

Si la prueba técnica lo justifica, se incorporará Kotlin para funciones específicas de Android y código nativo de iOS para sus mecanismos disponibles. Google ML Kit es candidato para OCR de imágenes proporcionadas por el usuario; no está decidida la vía de captura. Leer texto no equivale a identificar correctamente tarifa, bono y distancia.

Se escogerán versiones estables compatibles entre sí al crear el proyecto y se conservará el archivo de dependencias bloqueadas.

## 4. Arquitectura y datos

Flujo: fuente de oferta validada → extracción → validación de campos → motor local de rentabilidad → resultado → SQLite → sincronización con Supabase.

La nube no participa en el cálculo urgente. La app conserva la versión de costos utilizada en cada evaluación. Si faltan campos necesarios, muestra un resultado incompleto o abstención; no inventa valores ni asume cero silenciosamente.

### Tablas iniciales

- `profiles`: preferencias, moneda y zona horaria; referencia a identidad de Supabase.
- `vehicles`: vehículo y parámetros generales.
- `cost_profiles`: versiones de consumo, combustible, mantenimiento, llantas y depreciación.
- `driver_goals`: mínimos personales por hora y kilómetro.
- `offer_evaluations`: datos disponibles, origen, versión de extracción y cálculo, resultado y advertencias.
- `driver_decisions`: decisión confirmada por el usuario; desconocida por defecto.
- `trip_outcomes`: resultados reales opcionales para contrastar estimaciones.
- `access_grants`: prueba o cortesía, inicio, fin, motivo y autor de la concesión.
- `billing_events`: identificadores de eventos de compra procesados y estado validado.
- `admin_audit_log`: acciones administrativas.

Jornadas y gastos se agregan cuando el evaluador esté validado. El piloto guarda datos estructurados; no sube automáticamente capturas completas, direcciones exactas ni datos de pasajeros.

### Reglas técnicas

- Identificadores únicos para impedir duplicados al reenviar registros.
- Cola local con reintentos y estado visible de sincronización.
- Evaluaciones inmutables; las correcciones generan una revisión. Parámetros con versiones para evitar sobrescrituras silenciosas.
- Logout y cambio de cuenta no deben mostrar datos del usuario anterior.
- Cuenta estable compartida con RevenueCat; no unir identidades únicamente porque coincida un correo enviado por el cliente.
- El usuario no puede modificar sus propios permisos Pro ni administrativos.
- Secretos de servidor fuera de la app y del repositorio.
- Exportación recuperable y política de respaldo desde el piloto; borrado de cuenta antes de publicación.

## 5. Modelo económico de cada oferta

Usar el ingreso que recibiría el conductor y evitar descontar comisiones dos veces. Considerar recogida, viaje, espera y reposicionamiento cuando exista información válida. Mostrar cada supuesto.

Separar margen de la oferta de resultado de jornada. El promedio horario de jornada incluye tiempo sin viaje. Si se usan varias plataformas simultáneamente, el tiempo no se suma dos veces.

Separar consumo de combustible de la compra de gasolina, y reserva de mantenimiento de desembolso real. No descontar ambos como si fueran dos costos adicionales del mismo concepto.

El indicador principal dirá «Cumple tus mínimos», «No cumple tus mínimos» o «Datos insuficientes». No prometerá que es la mejor oferta disponible.

## 6. Fases y criterios de salida

### Fase 0 — Evidencia del problema y muestra de datos

Tareas: entrevista corta, teléfono objetivo, entre 3 y 5 capturas iniciales anonimizadas, costos del vehículo y ejemplos de ofertas buenas/malas. Ampliar la muestra antes de medir precisión.

Entregable: campos visibles de DiDi en Morelos, casos iniciales y objetivos personales.

Criterio de salida: conocemos qué datos existen antes de aceptar y cuáles solo se conocen después. La captura se hace con el vehículo detenido.

### Fase 1 — Viabilidad de evaluación durante una solicitud

Tareas: investigar mecanismos permitidos de captura/presentación, contrastar documentación oficial y condiciones de tiendas/plataformas; probar en Android físico y hacer una investigación específica de iOS. Medir latencia de todo el flujo, campos mal interpretados, permisos y batería.

Entregable: prototipo técnico mínimo, matriz por sistema operativo y decisión documentada.

Criterio de salida: un flujo suficientemente rápido para la ventana real de decisión, que se abstiene ante datos ambiguos, sin exigir una secuencia insegura de interacción. Como objetivo preliminar, procesamiento local p95 menor a 2 segundos desde que la app recibe los datos; esto no sustituye medir el tiempo completo desde la oferta.

Si no existe una vía viable en un sistema, se redefine explícitamente su alcance antes de prometer o cobrar por esa función. Compartir interfaz no garantiza equivalencia de capacidades nativas. No presentar una calculadora manual como validación del flujo automático.

### Fase 2 — Base de aplicación y cuentas

Tareas: inicializar proyecto, configurar ambientes separados de pruebas y producción, crear migraciones, RLS, Google, Apple, perfil de vehículo, SQLite y sincronización básica. Implementar corte de sesión, recuperación de acceso y exportación.

Entregable: aplicación instalable que guarda y recupera datos del usuario.

Criterio de salida: los datos sobreviven a reinicios y pérdida de conexión, los reintentos no duplican registros y dos cuentas no pueden leer ni modificar datos entre sí.

### Fase 3 — MVP del evaluador

Tareas: motor de costos, adaptación de la fuente validada, tarjeta de resultado, indicadores de datos faltantes, historial y contraste con resultado real. Configuración breve con costos editables.

Entregable: evaluación completa en el teléfono del piloto.

Criterio de salida: fórmulas verificadas con casos independientes; validación de ceros, unidades, decimales y campos faltantes; ningún error conocido convierte un dato ambiguo en una recomendación positiva. Se mide el recorrido completo y no solo OCR.

### Fase 4 — Piloto de 14 días, ajustable a disponibilidad

Tareas: observar uso sin manipulación durante la conducción, revisar semanalmente errores, contrastar ofertas y resultados, mejorar captura y comprensión. El conductor recibe acceso de cortesía.

Entregable: informe con fallos, utilidad, uso y cambios priorizados.

Criterio de salida: el conductor entiende el resultado y vuelve a usarlo; no hay errores críticos de lectura conocidos pendientes. Reportar tamaño de muestra, errores por campo y ofertas no evaluables. Un solo usuario no demuestra demanda comercial ni superioridad.

Métricas: éxito de captura, latencia p50/p95 del flujo, exactitud de importe/tiempo/distancia, abstenciones, fallos, consumo de batería comparado con una jornada similar, uso repetido y voluntad de pago.

### Fase 5 — Monetización y administración

Tareas: productos de tienda, RevenueCat, prueba gratuita, panel privado mínimo, concesiones de cortesía, eventos de servidor, restauración de compras y estados de expiración/reembolso. Si es suficiente durante el piloto, otorgar accesos con una operación administrativa controlada antes de crear todo el panel.

Entregable: cobros probados en sandbox y acceso coherente entre dispositivos.

Criterio de salida: probar compra, renovación, cancelación, expiración, devolución, restauración y eventos repetidos o fuera de orden. Cancelar renovación no retira anticipadamente el periodo ya pagado. Una cortesía no cancela una suscripción existente.

No lanzar cobros hasta validar el valor de la función principal. Las pruebas por cuenta requieren controles razonables contra repetición; iniciar sesión con Google no garantiza una persona única.

### Fase 6 — Beta ampliada y publicación

Tareas: incorporar más conductores, probar distintos teléfonos y un iPhone físico, verificar flujos de privacidad/borrado, preparar fichas y material de soporte, revisar las reglas vigentes de tiendas y condiciones de plataformas.

Entregable: versiones candidatas con capacidades descritas por sistema y lista de compatibilidad probada.

Criterio de salida: autenticación, datos, facturación y función principal superan pruebas en cada plataforma ofrecida. La aprobación de las tiendas no se presupone.

## 7. Monetización y costos

Un único acceso Pro puede provenir de suscripción, prueba o cortesía. Se valida en servidor y se conserva localmente con una vigencia definida para tolerar desconexiones; no queda desbloqueado para siempre por una bandera local.

Al expirar Pro, se mantienen consulta y exportación del historial. No insertar una pantalla de compra durante la decisión de una oferta ni interrumpir una evaluación ya iniciada.

Supabase gratuito es el punto de partida del piloto, sujeto a cuotas y condiciones vigentes. Presupuestar por separado tiendas, compilaciones, dominio opcional, respaldo, servicio de suscripciones y soporte. No equiparar infraestructura gratuita con publicación gratuita. RevenueCat y tiendas tienen condiciones y costos independientes.

Antes de cobrar, calcular precio neto tras comisiones, impuestos aplicables y costo de servicio por usuario. El precio y el límite mensual de gasto siguen pendientes; configurar alertas y revisar cuotas antes de contratar planes de pago.

## 8. Fuera del MVP

Aceptación automática, predicción de demanda, navegación propia, rankings públicos, chat de IA, marketplace, flotas, referidos complejos y mapas de zonas rentables sin datos suficientes.

Después del piloto: explicar cambios del margen, costos personalizados más precisos, jornadas y gastos, comparación entre estimado y real y análisis del historial propio.

## 9. Forma de trabajar

El asistente ayudará a escribir código, migraciones, pruebas, documentación y correcciones. Julio aportará las decisiones de negocio, cuentas necesarias y resultados del conductor. Los servicios externos y dispositivos reales se usarán cuando estén disponibles; no se declararán pruebas no realizadas.

Cada entrega será pequeña e instalable: objetivo, cambio implementado, verificación y pendientes. No iniciar varias funciones grandes antes de verificar el flujo principal. No se fija fecha de lanzamiento hasta terminar la prueba técnica y conocer la disponibilidad real.

### Primer bloque de trabajo

1. Obtener teléfono, capturas anonimizadas y costos básicos del vehículo.
2. Completar matriz de campos y restricciones Android/iOS.
3. Construir motor de cálculo con ejemplos independientes y casos límite.
4. Crear una prueba de captura e interpretación en el Android disponible.
5. Definir viabilidad y alcance; después completar autenticación, almacenamiento y experiencia del MVP.

## 10. Referencias técnicas consultadas

- [Supabase con Expo](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Google con Supabase Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Arquitectura local con Expo](https://docs.expo.dev/guides/local-first/)
- [Development builds de Expo](https://docs.expo.dev/develop/development-builds/faq/)
- [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Precios de Supabase](https://supabase.com/pricing)
- [Accesos en RevenueCat](https://www.revenuecat.com/docs/getting-started/entitlements)
- [Precios de RevenueCat](https://www.revenuecat.com/pricing)
- [Reglas de Apple](https://developer.apple.com/app-store/review/guidelines/)
- [Pagos en Google Play](https://support.google.com/googleplay/android-developer/answer/9858738)

Estas referencias no certifican una integración con DiDi ni aprobación de las tiendas; esa investigación sigue pendiente.
