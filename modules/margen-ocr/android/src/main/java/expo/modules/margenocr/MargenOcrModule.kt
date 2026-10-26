package expo.modules.margenocr

import android.net.Uri
import android.content.Intent
import android.provider.Settings
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class MargenOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MargenOcr")
    Function("getLiveStatus") {
      val context = appContext.reactContext
      LiveSession.snapshot() + mapOf("overlayAllowed" to (context != null && Settings.canDrawOverlays(context)))
    }
    AsyncFunction("openOverlaySettings") {
      val activity = appContext.currentActivity ?: throw IllegalStateException("Abre Margen para configurar el permiso.")
      activity.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${activity.packageName}")))
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("startLive") { minPerKm: Double, maxMinutes: Double ->
      val activity = appContext.currentActivity ?: throw IllegalStateException("Abre Margen para iniciar la lectura.")
      if (!Settings.canDrawOverlays(activity)) throw IllegalStateException("Primero permite la tarjeta flotante.")
      if (LiveSession.state.active || LiveSession.state.requesting) throw IllegalStateException("Ya hay una sesión en curso.")
      if (!minPerKm.isFinite() || minPerKm <= 0 || !maxMinutes.isFinite() || maxMinutes <= 0) throw IllegalArgumentException("Revisa tus objetivos.")
      LiveSession.reviewReading = null
      LiveSession.state = LiveState(requesting = true, message = "Esperando autorización de Android")
      try {
        activity.startActivity(Intent(activity, CapturePermissionActivity::class.java).putExtra("minPerKm", minPerKm).putExtra("maxMinutes", maxMinutes))
      } catch (e: Exception) { LiveSession.state = LiveState(); throw e }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stopLive") {
      LiveSession.state = LiveState()
      LiveSession.reviewReading = null
      appContext.reactContext?.let { it.stopService(Intent(it, ScreenReadService::class.java)) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("recognize") { uriString: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_CONTEXT", "No se encontró el contexto de Android.", null)
        return@AsyncFunction
      }
      val uri = Uri.parse(uriString)
      if (uri.scheme != "file" && uri.scheme != "content") {
        promise.reject("ERR_LOCAL_IMAGE", "Selecciona una imagen local.", null)
        return@AsyncFunction
      }
      try {
        val image = InputImage.fromFilePath(context, uri)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        recognizer.process(image)
          .addOnSuccessListener { result ->
            // ML Kit groups text into semantic blocks, not screen reading order.
            // Use physical line positions so counteroffers remain below Accept.
            val orderedLines = result.textBlocks.flatMap { it.lines }
              .sortedWith(compareBy({ it.boundingBox?.top ?: Int.MAX_VALUE }, { it.boundingBox?.left ?: Int.MAX_VALUE }))
            promise.resolve(orderedLines.joinToString("\n") { it.text })
          }
          .addOnFailureListener { error -> promise.reject("ERR_OCR", "No se pudo leer la captura.", error) }
          .addOnCompleteListener { recognizer.close() }
      } catch (error: Exception) {
        promise.reject("ERR_IMAGE", "No se pudo abrir la imagen seleccionada.", error)
      }
    }
  }
}
