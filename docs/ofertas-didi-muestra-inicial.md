# Muestra inicial de ofertas DiDi

Fecha de análisis: 13 de octubre de 2026. Fuente: dos capturas proporcionadas por Julio en el chat. Lectura visual manual; no se ha implementado ni probado OCR, captura automática o integración con DiDi.

No se copian las imágenes ni sus direcciones, rutas exactas o datos del pasajero al proyecto.

## Campos visibles

| Campo | Oferta A (imagen 1) | Oferta B (imagen 2) |
| --- | --- | --- |
| Modalidad | Pon Tu Precio | Pon Tu Precio |
| Importe principal | $22.70 | $61.23 |
| Botón principal | Aceptar $22.70 | Aceptar $61.23 |
| Primera fila de tiempo/distancia, icono verde | 10 min / 2.2 km | 8 min / 2.2 km |
| Segunda fila de tiempo/distancia, icono naranja | 3 min / 770 m | 21 min / 9.5 km |
| Importes alternativos, de izquierda a derecha | $23.70 / $23.70 / $24.70 | $63.23 / $65.23 / $67.23 |
| Etiqueta adicional | No visible | Al precio de Express |

Ambas muestran «5 puntos», «Rechazo permitido», información del pasajero y un icono de lápiz. Estos elementos no son el importe base. No se infiere la duración restante a partir de la barra ni se deducen sus reglas o significados solo por el color.

Julio confirmó que la primera fila corresponde a recogida y la segunda al trayecto con pasajero, con tiempos que se suman. Confirmación del usuario, no verificación documental independiente: la investigación pública inicial no encontró una leyenda oficial de estas filas exactas. MXN se asume por el contexto de Morelos; las imágenes solo muestran el símbolo $.

## Cálculos descriptivos

Suponiendo que las dos filas describen segmentos consecutivos que deben sumarse:

| Cálculo | Oferta A | Oferta B |
| --- | --- | --- |
| Distancia combinada | 2.97 km | 11.70 km |
| Tiempo combinado | 13 min | 29 min |
| Importe mostrado / km combinado | $7.64/km | $5.23/km |
| Importe mostrado / hora de tiempo combinado | $104.77/h | $126.68/h |

Fórmulas: importe / (km de ambas filas); importe × 60 / (minutos de ambas filas). Convertir 770 m a 0.770 km antes de sumar.

Son tasas del importe mostrado, antes de costos y posibles descuentos no aclarados. No son ganancia neta ni promedio de jornada. No incluyen espera adicional, regreso, reposicionamiento ni tiempo sin ofertas.

La oferta B tiene más importe total y mayor tasa por hora bajo estos supuestos, pero menor importe por kilómetro. No se puede declarar cuál conviene al conductor sin costos, objetivos y confirmación del importe que recibiría.

## Requisitos de extracción derivados de esta muestra

1. Distinguir importe principal de alternativas y de cifras no monetarias; nunca tomar el mayor número como tarifa.
2. Usar coincidencia entre importe principal y botón de aceptar como comprobación, sin considerarla garantía suficiente de lectura correcta.
3. Mantener separadas las dos filas de tiempo/distancia y normalizar metros/kilómetros.
4. Detectar bloques por etiquetas y estructura; no depender exclusivamente de coordenadas fijas, pues la segunda captura agrega una etiqueta.
5. Conservar propuestas de precio por separado del importe base. Un precio propuesto no es ingreso aceptado o garantizado.
6. No convertir «puntos», calificaciones, número de viajes o estado del pasajero en ingresos o variables de rentabilidad.
7. Ante campos ausentes, inconsistencias o imágenes ilegibles, abstenerse o solicitar revisión; no generar una evaluación positiva por defecto.
8. La prueba inicial solo cubre dos ejemplos de «Pon Tu Precio». No demuestra compatibilidad con otras modalidades, pantallas o versiones.

## Oportunidad de producto

Proponer una función de «precio objetivo» para Pon Tu Precio: estimar qué ingreso al conductor necesitaría para cumplir costos y objetivos por hora y kilómetro. Transformarlo a precio de oferta requiere conocer los descuentos aplicables. La función solo orientaría; no enviaría contraofertas automáticamente ni prometería su aceptación.

## Preguntas pendientes

- Resuelto por confirmación de Julio: filas verde/naranja = recogida/viaje; tiempos sumables.
- ¿El importe mostrado es lo que recibe el conductor o todavía tiene descuentos? Contrastar con el detalle final de un viaje comparable, ocultando datos personales.
- ¿Cuánto dura la oferta y qué sucede al elegir un importe alternativo o el lápiz?
- Vehículo, rendimiento, precio de combustible y objetivos personales siguen pendientes. El modelo de teléfono se registrará al ejecutar pruebas físicas, sin bloquear investigación ni diseño de compatibilidad para múltiples versiones.

## Próxima prueba

Construir un extractor sobre una muestra más amplia de imágenes con campos etiquetados manualmente y comparar sus salidas esperadas. Medir importes, unidades, segmentos, abstenciones y latencia. Esta prueba no sustituye validar cómo se obtiene una oferta en vivo ni sus condiciones de uso.
