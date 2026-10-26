package expo.modules.margenocr

data class LiveState(val active: Boolean = false, val requesting: Boolean = false,
  val message: String = "Lectura detenida", val offer: LiveOffer? = null,
  val observedAt: Long = 0, val latencyMs: Long = 0)

object LiveSession {
  @Volatile var state = LiveState()
  // Keep at most one numeric reading briefly for explicit review after switching apps.
  // It is never used as a current overlay result, and disappears when the session stops.
  @Volatile var reviewReading: Pair<LiveOffer, Long>? = null
  fun snapshot(): Map<String, Any?> {
    val value = state
    val now = android.os.SystemClock.elapsedRealtime()
    val fresh = now - value.observedAt in 0L..2999L
    val review = reviewReading
    val age = review?.let { now - it.second } ?: Long.MAX_VALUE
    val canReview = value.active && age in 0L..59999L
    return mapOf("active" to value.active, "requesting" to value.requesting,
      "message" to value.message, "offer" to if (value.active && fresh) value.offer?.asMap() else null,
      "reviewOffer" to if (canReview) review?.first?.asMap() else null,
      "reviewAgeSeconds" to if (canReview) age / 1000 else null,
      "latencyMs" to value.latencyMs)
  }
}
