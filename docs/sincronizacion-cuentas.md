# Respaldo por cuenta

La primera versión usa un respaldo manual y una recuperación manual. Ambas operaciones fusionan las evaluaciones por su UUID; no eliminan el historial local ni vuelven a calcular los resultados históricos con los ajustes actuales.

## Almacenamiento local

- El piloto sin cuenta conserva el archivo SQLite y la fila `app_state` originales. En web conserva la clave `margen:state:v1`.
- Cada cuenta guarda un estado separado en `account_state`, identificado por el ID de Auth. Web utiliza una clave de cuenta distinta.
- Al entrar por primera vez con una cuenta se carga un estado vacío. El historial del piloto no se asigna ni se sube a esa cuenta automáticamente.
- Cambiar de cuenta debe invalidar operaciones pendientes en la interfaz. `load(scope)` y `persist(data, scope)` reciben el dueño explícitamente; nunca consultan una variable global de «cuenta actual» durante la escritura.

## Servicio

`syncAccountData(userId, localData, { settingsMode })`:

- `settingsMode: 'local'`: respalda los ajustes actuales y fusiona el historial remoto y local.
- `settingsMode: 'remote'`: recupera los ajustes remotos si existen y fusiona ambos historiales. Si aún no existe configuración remota, conserva la local.
- Devuelve `{ data, uploaded, downloaded }`. La interfaz debe guardar `data` en el mismo `userId` y aplicarlo solo si sigue activa la misma sesión.
- La recuperación también respalda las evaluaciones locales que falten en el servidor. Ninguna de las dos operaciones propaga eliminaciones en esta versión.
- Los registros existentes son inmutables: se insertan con `ignoreDuplicates: true`, sin solicitar permisos `UPDATE` en `offer_evaluations`. Se vuelve a leer el resultado para comprobar que las inserciones estén disponibles. Un mismo UUID con contenido distinto detiene la operación.
- Los ajustes de `profiles` sí se pueden actualizar. Se respetan las políticas RLS que comparan `auth.uid()` con `user_id`.

El servicio verifica la identidad con `auth.getUser()` antes y después de las operaciones y antes de cada página/lote. Un cierre o cambio de sesión produce un error y la interfaz no debe aplicar el resultado antiguo. La aplicación selecciona los campos estructurados explícitamente; no respalda capturas, texto OCR ni campos adicionales de la lectura.

## Preparación de Supabase

Se requieren las migraciones existentes, en este orden:

1. `202610200001_initial.sql`
2. `202610200002_capture_provenance.sql`
3. `202610210001_screen_provenance.sql`

La app utiliza la URL del proyecto y la clave pública. Nunca debe incluir una clave `service_role`. La configuración de proveedores y redirecciones de Auth se documenta con la implementación de acceso.

## Verificación y límites actuales

Las pruebas automatizadas usan un transporte falso para comprobar aislamiento de invitado/cuentas, reintentos después de fallos parciales, duplicados, conservación de snapshots, normalización de fechas de Postgres, descarte de texto OCR y cambios de sesión durante operaciones pendientes. Son pruebas de lógica y almacenamiento web; no acreditan que se hayan ejecutado las migraciones ni probado RLS en un servidor real.

Antes del piloto con cuentas reales: aplicar las migraciones en un proyecto propio, probar acceso con dos cuentas, comprobar que una no pueda consultar ni escribir datos de la otra, y repetir el respaldo/recuperación en dos instalaciones. No hay sincronización automática en segundo plano ni propagación de borrados todavía.

Referencias oficiales consultadas: [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [upsert e ignoreDuplicates](https://supabase.com/docs/reference/javascript/upsert).
