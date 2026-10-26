package expo.modules.margenocr

import java.text.Normalizer

/** Native counterpart of extractOffer: runs even while the React UI is in background. */
data class LiveOffer(val amount: Double, val pickupKm: Double, val tripKm: Double,
  val pickupMinutes: Double, val tripMinutes: Double) {
  val km get() = pickupKm + tripKm
  val minutes get() = pickupMinutes + tripMinutes
  fun asMap(): Map<String, Any?> = mapOf("amount" to amount, "pickupKm" to pickupKm,
    "tripKm" to tripKm, "pickupMinutes" to pickupMinutes, "tripMinutes" to tripMinutes, "deductions" to null)
}

object LiveOfferParser {
  private val start = Regex("pon\\s+tu\\s+precio", RegexOption.IGNORE_CASE)
  private val accept = Regex("aceptar\\s*\\$\\s*(\\d+(?:[.,]\\d{1,2})?)(?![\\d.,])", RegexOption.IGNORE_CASE)
  private val price = Regex("\\$\\s*(\\d+(?:[.,]\\d{1,2})?)(?![\\d.,])")
  private val segment = Regex("(?:^|\\n)[^\\d\\n]*?(\\d+(?:[.,]\\d+)?)\\s*min\\s*\\(?\\s*(\\d+(?:[.,]\\d+)?)\\s*(km|m)\\s*\\)?(?=\\s|$)", RegexOption.IGNORE_CASE)
  private fun number(s: String) = s.replace(',', '.').toDouble()
  fun parse(raw: String): LiveOffer? {
    if (raw.length > 20000) return null
    val text = Normalizer.normalize(raw, Normalizer.Form.NFKC).replace("\r", "").replace('\u00a0', ' ')
    val header = start.find(text) ?: return null
    val body = text.substring(header.range.last + 1)
    val accepts = accept.findAll(body).toList()
    if (accepts.size != 1) return null
    val before = body.substring(0, accepts[0].range.first)
    val prices = price.findAll(before).toList()
    val segments = segment.findAll(before).toList()
    if (prices.size != 1 || segments.size != 2 || prices[0].range.first > segments[0].range.first) return null
    val amount = number(prices[0].groupValues[1])
    if (amount <= 0 || amount != number(accepts[0].groupValues[1])) return null
    fun km(s: MatchResult) = number(s.groupValues[2]) / if (s.groupValues[3].equals("m", true)) 1000 else 1
    val offer = LiveOffer(amount, km(segments[0]), km(segments[1]),
      number(segments[0].groupValues[1]), number(segments[1].groupValues[1]))
    if (!listOf(offer.amount, offer.km, offer.minutes).all { it.isFinite() } || offer.km <= 0 || offer.minutes <= 0) return null
    return offer
  }
}

/** A result expires even if capture stops delivering frames or OCR stalls. */
class ReadingLease(private val ttl: Long = 3000) {
  private var value: LiveOffer? = null
  private var observedAt: Long = 0
  fun update(offer: LiveOffer?, frameAt: Long) { value = offer; observedAt = frameAt }
  fun current(now: Long): LiveOffer? = if (now >= observedAt && now - observedAt < ttl) value else null
}
