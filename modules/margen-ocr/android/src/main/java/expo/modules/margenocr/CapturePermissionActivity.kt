package expo.modules.margenocr

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings

/** Each launch obtains a new single-use MediaProjection token from Android. */
class CapturePermissionActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (savedInstanceState != null) { LiveSession.state = LiveState(message = "Vuelve a iniciar la lectura"); finish(); return }
    if (!Settings.canDrawOverlays(this)) { LiveSession.state = LiveState(message = "Falta permitir la tarjeta flotante"); finish(); return }
    LiveSession.state = LiveState(requesting = true, message = "Esperando autorización de Android")
    try {
      val manager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      @Suppress("DEPRECATION")
      startActivityForResult(manager.createScreenCaptureIntent(), 701)
    } catch (e: Exception) { LiveSession.state = LiveState(message = "No se pudo solicitar la captura"); finish() }
  }

  @Deprecated("Activity result supported for this internal bridge")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != 701) return
    if (!LiveSession.state.requesting) { finish(); return }
    if (resultCode != RESULT_OK || data == null) {
      LiveSession.state = LiveState(message = "Captura no autorizada"); finish(); return
    }
    val service = Intent(this, ScreenReadService::class.java)
      .putExtra("resultCode", resultCode).putExtra("projectionData", data)
      .putExtra("minPerKm", intent.getDoubleExtra("minPerKm", 6.0))
      .putExtra("maxMinutes", intent.getDoubleExtra("maxMinutes", 30.0))
    try {
      if (Build.VERSION.SDK_INT >= 26) startForegroundService(service) else startService(service)
    } catch (e: Exception) { LiveSession.state = LiveState(message = "No se pudo iniciar la lectura. Vuelve a intentarlo.") }
    finish()
  }
}
