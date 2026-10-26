package expo.modules.margenocr

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.*
import android.provider.Settings
import android.view.*
import android.widget.LinearLayout
import android.widget.TextView
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.Locale

/** Pixels and OCR text exist only in memory. No disk, network, accessibility or input injection. */
class ScreenReadService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val lease = ReadingLease()
  private var projection: MediaProjection? = null
  private var display: VirtualDisplay? = null
  private var reader: ImageReader? = null
  private var recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  private var width = 0
  private var height = 0
  private var generation = 0
  private var lastFrame = 0L
  private var busy = false
  private var readScheduled = false
  private val pendingFrame = Runnable { readScheduled = false; reader?.let { processFrame(it) } }
  private var visible = true
  private var destroying = false
  private var minPerKm = 6.0
  private var maxMinutes = 30.0
  private var card: LinearLayout? = null
  private var summary: TextView? = null
  private var details: TextView? = null
  private lateinit var windowManager: WindowManager
  private var overlayParams: WindowManager.LayoutParams? = null
  private var displayed: LiveOffer? = null

  private val callback = object : MediaProjection.Callback() {
    override fun onStop() { stopSelf() }
    override fun onCapturedContentResize(w: Int, h: Int) {
      if (w > 0 && h > 0 && !destroying) resize(w, h)
    }
    override fun onCapturedContentVisibilityChanged(isVisible: Boolean) {
      visible = isVisible
      if (!visible) clearReading("La app compartida no está visible")
    }
  }
  private val screenOff = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) { stopSelf() }
  }
  private val expiration = object : Runnable {
    override fun run() {
      if (destroying) return
      if (!Settings.canDrawOverlays(this@ScreenReadService)) { stopSelf(); return }
      if (lease.current(SystemClock.elapsedRealtime()) == null && displayed != null) clearReading("Esperando una oferta completa")
      handler.postDelayed(this, 250)
    }
  }

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenOff, filter, RECEIVER_NOT_EXPORTED)
    else @Suppress("DEPRECATION") registerReceiver(screenOff, filter)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
    if (intent == null) { stopSelf(); return START_NOT_STICKY }
    if (projection != null || destroying) return START_NOT_STICKY
    try {
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel("margen_screen", "Lectura de ofertas", NotificationManager.IMPORTANCE_LOW))
      val stop = PendingIntent.getService(this, 11, Intent(this, ScreenReadService::class.java).setAction("STOP"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val open = PendingIntent.getActivity(this, 12, packageManager.getLaunchIntentForPackage(packageName)!!, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, "margen_screen") else @Suppress("DEPRECATION") Notification.Builder(this)
      val notification = builder.setSmallIcon(android.R.drawable.ic_menu_view).setContentTitle("Margen · lectura de pantalla activa")
        .setContentText("Análisis local. Puedes detenerlo en cualquier momento.").setContentIntent(open)
        .addAction(Notification.Action.Builder(null, "Detener", stop).build()).setOngoing(true).build()
      if (Build.VERSION.SDK_INT >= 29) startForeground(410, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
      else startForeground(410, notification)
      if (!Settings.canDrawOverlays(this)) throw IllegalStateException("overlay")
      val data = if (Build.VERSION.SDK_INT >= 33) intent?.getParcelableExtra("projectionData", Intent::class.java)
        else @Suppress("DEPRECATION") intent?.getParcelableExtra<Intent>("projectionData")
      if (data == null || intent.getIntExtra("resultCode", 0) != Activity.RESULT_OK) throw IllegalStateException("consent")
      minPerKm = intent.getDoubleExtra("minPerKm", 6.0).takeIf { it.isFinite() && it > 0 } ?: 6.0
      maxMinutes = intent.getDoubleExtra("maxMinutes", 30.0).takeIf { it.isFinite() && it > 0 } ?: 30.0
      projection = (getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager).getMediaProjection(Activity.RESULT_OK, data)
      projection!!.registerCallback(callback, handler)
      addOverlay()
      val metrics = resources.displayMetrics
      val bounds = if (Build.VERSION.SDK_INT >= 30) windowManager.maximumWindowMetrics.bounds else null
      resize(bounds?.width() ?: metrics.widthPixels, bounds?.height() ?: metrics.heightPixels)
      LiveSession.state = LiveState(active = true, message = "Esperando una oferta completa")
      handler.post(expiration)
    } catch (e: Exception) {
      LiveSession.state = LiveState(message = "No se pudo iniciar. Revisa los permisos y vuelve a intentarlo.")
      stopSelf()
    }
    return START_NOT_STICKY // Tokens are single-use: never restart a capture automatically.
  }

  private fun resize(w: Int, h: Int) {
    val scale = minOf(1.0, 1080.0 / w, 2400.0 / h)
    val nextW = (w * scale).toInt().coerceAtLeast(1)
    val nextH = (h * scale).toInt().coerceAtLeast(1)
    if (nextW == width && nextH == height) return
    handler.removeCallbacks(pendingFrame); readScheduled = false
    generation++; width = nextW; height = nextH
    clearReading("Esperando una oferta completa")
    val previous = reader
    reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
    reader!!.setOnImageAvailableListener({ source -> processFrame(source) }, handler)
    if (display == null) {
      display = projection!!.createVirtualDisplay("MargenLocalOCR", width, height, resources.displayMetrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader!!.surface, null, handler)
    } else {
      display!!.resize(width, height, resources.displayMetrics.densityDpi)
      display!!.surface = reader!!.surface
    }
    previous?.close()
  }

  private fun processFrame(source: ImageReader) {
    if (destroying || source !== reader) return
    val now = SystemClock.elapsedRealtime()
    if (visible && (busy || now - lastFrame < 850)) {
      // Do not acquire-and-discard the final frame of a transition. ImageReader
      // keeps a bounded queue; drain its latest image when the throttle permits.
      if (!readScheduled) {
        readScheduled = true
        handler.postDelayed(pendingFrame, maxOf(50L, 850L - (now - lastFrame)))
      }
      return
    }
    handler.removeCallbacks(pendingFrame); readScheduled = false
    val image = try { source.acquireLatestImage() } catch (_: Exception) { null } ?: return
    val captured = SystemClock.elapsedRealtime()
    val frameGeneration = generation
    var bitmap: Bitmap? = null
    try {
      if (destroying || !visible) return
      lastFrame = captured
      val plane = image.planes[0]
      if (plane.pixelStride != 4) { clearReading("Formato de pantalla no compatible"); return }
      val padded = Bitmap.createBitmap(plane.rowStride / plane.pixelStride, image.height, Bitmap.Config.ARGB_8888)
      try {
        padded.copyPixelsFromBuffer(plane.buffer)
        bitmap = Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
      } finally { if (padded !== bitmap) padded.recycle() }
    } catch (_: Exception) { bitmap?.recycle(); clearReading("No se pudo leer este fotograma"); return }
    finally { image.close() }
    val frame = bitmap ?: return
    busy = true
    try {
      recognizer.process(InputImage.fromBitmap(frame, 0))
        .addOnSuccessListener { result ->
          if (!destroying && visible && generation == frameGeneration) {
            val text = result.textBlocks.flatMap { it.lines }
              .sortedWith(compareBy({ it.boundingBox?.top ?: Int.MAX_VALUE }, { it.boundingBox?.left ?: Int.MAX_VALUE }))
              .joinToString("\n") { it.text }
            val offer = LiveOfferParser.parse(text)
            lease.update(offer, captured)
            val now = SystemClock.elapsedRealtime()
            val current = lease.current(now)
            if (current != null) LiveSession.reviewReading = current to captured
            LiveSession.state = LiveState(active = true, message = if (current == null) "Esperando una oferta completa" else "Lectura provisional · verifica las cifras", offer = current, observedAt = captured, latencyMs = now - captured)
            render(current)
          }
        }
        .addOnFailureListener { if (!destroying) clearReading("No se pudo leer este fotograma") }
        .addOnCompleteListener { frame.recycle(); busy = false }
    } catch (_: Exception) { frame.recycle(); busy = false; clearReading("No se pudo leer este fotograma") }
  }

  private fun clearReading(message: String) {
    lease.update(null, SystemClock.elapsedRealtime())
    if (LiveSession.state.active) LiveSession.state = LiveState(active = true, message = message)
    render(null)
  }
  private fun dp(n: Int) = (n * resources.displayMetrics.density).toInt()
  private fun label(text: String, size: Float, bold: Boolean = false) = TextView(this).apply {
    this.text = text; textSize = size; setTextColor(Color.parseColor("#101D2D"))
    if (bold) setTypeface(typeface, Typeface.BOLD)
  }
  private fun addOverlay() {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; setPadding(dp(12), dp(8), dp(12), dp(10))
      background = GradientDrawable().apply { setColor(Color.parseColor("#FAF9F5")); cornerRadius = dp(14).toFloat(); setStroke(dp(1), Color.parseColor("#075D46")) }
      elevation = dp(5).toFloat()
    }
    val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
    val handle = label("⋮⋮  MARGEN", 12f, true).apply { contentDescription = "Mover tarjeta de Margen"; setPadding(0, dp(8), 0, dp(8)) }
    bar.addView(handle, LinearLayout.LayoutParams(0, dp(40), 1f))
    bar.addView(label("✕", 20f, true).apply { contentDescription = "Detener lectura de pantalla"; gravity = Gravity.CENTER; setOnClickListener { stopSelf() } }, LinearLayout.LayoutParams(dp(44), dp(40)))
    root.addView(bar)
    summary = label("Esperando oferta…", 17f, true); root.addView(summary)
    details = label("Pon Tu Precio · verifica las cifras", 11f); root.addView(details)
    val type = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(dp(264), WindowManager.LayoutParams.WRAP_CONTENT, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START; x = dp(12); y = dp(100) }
    var downX = 0f; var downY = 0f; var startX = 0; var startY = 0
    handle.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; startX = params.x; startY = params.y; true }
        MotionEvent.ACTION_MOVE -> {
          params.x = (startX + event.rawX - downX).toInt().coerceIn(0, (resources.displayMetrics.widthPixels - dp(264)).coerceAtLeast(0))
          params.y = (startY + event.rawY - downY).toInt().coerceIn(0, (resources.displayMetrics.heightPixels - dp(160)).coerceAtLeast(0))
          try { windowManager.updateViewLayout(root, params) } catch (_: Exception) { stopSelf() }; true
        }
        MotionEvent.ACTION_UP -> { handle.performClick(); true }
        else -> false
      }
    }
    card = root; overlayParams = params
    windowManager.addView(root, params)
    render(null)
  }
  private fun render(offer: LiveOffer?) {
    displayed = offer
    if (offer == null) {
      summary?.text = "Esperando oferta…"
      summary?.setTextColor(Color.parseColor("#667080"))
      details?.text = "Sin lectura vigente · Pon Tu Precio"
    } else {
      val perKm = offer.amount / offer.km
      val meets = perKm >= minPerKm && offer.minutes <= maxMinutes
      summary?.text = String.format(Locale.US, "$%.2f/km · %.0f min", perKm, offer.minutes)
      summary?.setTextColor(Color.parseColor(if (meets) "#075D46" else "#8A480C"))
      details?.text = String.format(Locale.US, "%s · %.2f km\nAntes de costos · verifica cifras", if (meets) "Cumple tus criterios" else "Fuera de tus criterios", offer.km)
    }
  }

  override fun onBind(intent: Intent?) = null
  override fun onDestroy() {
    destroying = true
    handler.removeCallbacksAndMessages(null)
    try { unregisterReceiver(screenOff) } catch (_: Exception) {}
    card?.let { try { windowManager.removeView(it) } catch (_: Exception) {} }; card = null
    display?.release(); display = null
    reader?.close(); reader = null
    projection?.unregisterCallback(callback); projection?.stop(); projection = null
    recognizer.close()
    val previous = LiveSession.state
    LiveSession.reviewReading = null
    LiveSession.state = LiveState(message = if (previous.active || previous.requesting) "Lectura detenida" else previous.message)
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
