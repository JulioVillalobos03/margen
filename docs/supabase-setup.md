# Configuración de Supabase

Los identificadores del entorno se omiten en esta copia pública. Configura tu propio proyecto con `.env.example`; no uses credenciales de terceros.

## Estado de la configuración

Proyecto **Margen** creado el 21 de octubre de 2026 en el plan gratuito de la organización existente de Julio.

- Referencia: `TU_REFERENCIA`.
- URL pública: `https://TU_REFERENCIA.supabase.co`.
- Región asignada por Supabase: West US (Oregon), `us-west-2`.
- Data API activa, exposición automática de tablas nuevas desactivada y RLS automático activo.
- URL y clave pública `publishable` guardadas en `.env` local, ignorado por Git. La app no contiene claves privadas.
- Las tres migraciones existentes se ejecutaron en orden desde SQL Editor, con resultado `Success`.
- Consulta de verificación: las tres tablas tienen RLS activo; `access_grants` tiene 1 política, `offer_evaluations` 3 y `profiles` 4. El rol `anon` no tiene acceso de lectura a ninguna.
- Registro por correo y confirmación de correo activos, acceso anónimo desactivado, contraseña mínima de 8 caracteres.
- Site URL: `margen://auth/callback`. Guardados los retornos de acceso y recuperación para Android y localhost/127.0.0.1:8081; también los patrones acotados `margen://auth/callback**`, `http://localhost:8081/auth/callback**` y `http://127.0.0.1:8081/auth/callback**` para parámetros PKCE del SDK. La app valida el esquema, origen y ruta exacta antes de canjear códigos.

No se crearon cuentas de prueba ni se introdujeron contraseñas de usuarios. El acceso con Google ya devolvió una sesión real de Julio a la app web. Se probaron respaldo, recuperación y persistencia de sesión; confirmación y recuperación por correo siguen pendientes.

## Google

Se creó el proyecto independiente de Google Cloud **Margen**, ID `TU_PROYECTO_GOOGLE`, sin conectar facturación. La pantalla de consentimiento OAuth está creada en modo de prueba. Julio creó personalmente la credencial web y la guardó en Supabase; el panel confirmó **Google ENABLED** sin que el asistente consultara el secreto.

El retorno que Google debe permitir es `https://TU_REFERENCIA.supabase.co/auth/v1/callback`.

## Google aplicado y comprobado

- Nombre de app: **Margen**.
- Contacto y asistencia: la cuenta de Julio ya autenticada en Google.
- Audiencia: externa, **modo de prueba**.
- Julio autorizó expresamente la [Política de Datos del Usuario de los Servicios de las APIs de Google](https://developers.google.com/terms/api-services-user-data-policy); se aceptó después de esa confirmación.
- Cliente: **Aplicación web**, **Margen Supabase**, retorno de Supabase indicado arriba. Sin orígenes JavaScript adicionales.
- Julio completó personalmente la creación y pegado del ID y secreto en Supabase. El secreto nunca se introdujo en Expo, `.env`, archivos o chat.
- El panel de Supabase mostró **Google ENABLED**.
- Prueba web en `http://localhost:8081`: botón Google abre el selector real; después de la intervención de Julio vuelve a Margen y **Cuenta** muestra **Sesión iniciada** y su correo. No se creó ninguna contraseña.

Para el piloto hay que revisar los usuarios de prueba antes de invitar al conductor. No se pidieron permisos de Drive, Gmail, contactos ni otros datos adicionales; el flujo solicita identificación básica para iniciar sesión.

## Pruebas pendientes y correo

El registro con contraseña ya está habilitado en el servidor; Julio debe probar creación de su cuenta por correo, confirmación y recuperación. No se crearon usuarios ficticios para sortear esta comprobación.

Prueba de datos realizada con autorización específica de Julio para su configuración y las dos evaluaciones de ejemplo, sin capturas, texto OCR ni datos de pasajeros:

1. En `localhost:8081`, acceso Google y guardado local de las muestras de $61.23 y $22.70.
2. **Respaldar mi cuenta**: 2 evaluaciones enviadas. Repetición: 0 enviadas y 0 recuperadas, sin duplicados.
3. En `127.0.0.1:8081`, almacenamiento web independiente, se volvió a acceder con Google. Se comprobó historial vacío antes de recuperar.
4. **Recuperar mi respaldo**: 0 enviadas y **2 recuperadas**; el historial mostró las dos muestras.
5. Consulta SQL del servidor: `source=example`, 2 evaluaciones, 1 cuenta, 1 perfil y ningún payload OCR (`extraction` nulo).
6. Recarga de la app: sesión y las dos evaluaciones persistieron.

La revisión automática detuvo el primer intento de respaldo por falta de autorización específica. No se rodeó el bloqueo; se ejecutó después de que Julio autorizó expresamente esos datos y destino.

Evidencia visual del historial recuperado: `docs/diseno/respaldo-recuperado-web.png`.

El proveedor de correo incluido por Supabase tiene restricciones para pruebas. Antes de ofrecer registro público hay que configurar SMTP propio y verificar el dominio remitente. No se desactivó la confirmación de correo para evitar esas restricciones.

La app conserva el piloto local mientras se completa y verifica el acceso remoto. No se activaron planes pagados ni facturación.
