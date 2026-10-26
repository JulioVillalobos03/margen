# Acceso, cuentas y navegación — 21 de octubre de 2026

## Entrega

Supabase aloja la autenticación y los registros de cada cuenta. La URL y clave pública están en `.env`, ignorado en Git; no se incluyen secretos de servidor. Los formularios incluyen registro e inicio con correo/contraseña, confirmación y reenvío, recuperación, cambio de contraseña y Google mediante navegador con PKCE S256. Expo SecureStore guarda la sesión nativa en segmentos para soportar tokens grandes. Hay un único proveedor de sesión para todas las rutas.

Las cuentas y el piloto local conservan almacenes separados: iniciar sesión no importa ni sube el historial de invitado. Cerrar sesión vuelve al piloto original. La primera cuenta puede usar Cuenta → Respaldar mi cuenta para enviar configuración y fusionar historial, o Recuperar mi respaldo para traer su configuración. Las operaciones capturan el propietario y descartan resultados si cambia la sesión. El respaldo es manual, aditivo y no graba imágenes ni texto OCR.

## Correcciones de interacción

- Volver y el botón Android regresan a la pantalla de origen; un detalle puede regresar a Historial.
- Cada pantalla conserva su desplazamiento al navegar. Un refresco de token no cambia pantalla.
- Pulsar la pestaña ya activa no vuelve a inicializar el formulario.
- Los gestos que superan diez puntos de movimiento no activan botones al soltar.
- La barra inferior reserva un espacio fijo para el indicador activo.
- La caja de texto OCR tiene altura fija y desplazamiento interno. El estado del lector reserva altura para que caducar una lectura no comprima bruscamente la pantalla.
- Los avisos globales no se insertan encima del contenido desplazable, y se pueden cerrar.
- Cambiar de cuenta limpia borradores y navegación; la vista espera al almacén del nuevo propietario antes de mostrar datos.

## Verificación

Pruebas de dominio, seguridad de configuración, callback, sesiones segmentadas, separación de cuentas, sincronización y gestos: 43 aprobadas. Las once pruebas Kotlin del lector permanecen en el proceso de compilación. Supabase: migraciones aplicadas y RLS/grants revisados en servidor; ver `supabase-setup.md`.

Comprobado de extremo a extremo con Google en Chrome: sesión real, dos ejemplos respaldados, repetición sin duplicados, descarga de los dos registros desde un origen con almacenamiento vacío y persistencia tras recargar. Servidor: dos evaluaciones y un perfil de la cuenta, sin payload OCR. La autorización explícita de Julio se obtuvo antes del envío; ver `supabase-setup.md`.

Comprobado en Android 15 con la APK: seis arrastres sobre tarjetas y botones conservaron Inicio; Volver desde un detalle regresó a Historial; tocar Mi auto estando ya en esa pestaña conservó un borrador modificado sin guardarlo. Los registros del piloto anterior se mantuvieron. Al pasar de Inicio a Historial y volver, el mismo elemento conservó exactamente su posición vertical (1512 px en esta prueba). Google abrió el navegador y cancelarlo regresó al formulario con mensaje claro. No se aceptó la bienvenida contractual inicial de Chrome del emulador ni se introdujeron credenciales Google allí: el acceso nativo completo queda para la prueba humana.

Se revisó la vista de acceso en anchuras equivalentes a 320, 375, 414 y 768 dp sin contenido fuera del ancho, con capturas `docs/diseno/auth-*.png`. La densidad original del emulador se restauró. La prueba de teléfono físico y los emails reales de confirmación/recuperación permanecen pendientes.

## Correo para el piloto

El envío por defecto de Supabase está restringido a direcciones del equipo del proyecto y dos mensajes por hora. Para registrar conductores externos con confirmación de correo y recuperar sus contraseñas hace falta SMTP propio; no se desactivó la confirmación como solución. Google depende de su configuración OAuth y usuarios admitidos en modo prueba. Ver [SMTP oficial](https://supabase.com/docs/guides/auth/auth-smtp).
