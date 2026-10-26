package expo.modules.margenocr

import org.junit.Assert.*
import org.junit.Test

class LiveOfferTest {
  private val sample = "Pon Tu Precio\n\$61.23\n5 puntos\n8 min (2.2 km)\n21 min (9.5 km)\nAceptar \$61.23\n\$63.23 \$65.23 \$67.23"

  @Test fun excludesCounteroffersAndIncludesPickup() {
    val offer = LiveOfferParser.parse(sample)!!
    assertEquals(61.23, offer.amount, .0001)
    assertEquals(11.7, offer.km, .0001)
    assertEquals(29.0, offer.minutes, .0001)
    assertEquals(5.2333, offer.amount / offer.km, .0001)
  }
  @Test fun convertsMetersAndKeepsSecondOfferDistinct() {
    val offer = LiveOfferParser.parse("Pon Tu Precio\n\$22.70\n10 min (2.2 km)\n3 min (770 m)\nAceptar \$22.70\n\$23.70 \$24.70")!!
    assertEquals(.77, offer.tripKm, .0001)
    assertEquals(13.0, offer.minutes, .0001)
    assertEquals(7.6431, offer.amount / offer.km, .0001)
  }
  @Test fun toleratesOcrSpacesAndDecimalComma() {
    val offer = LiveOfferParser.parse(sample.replace('.', ',').replace("8 min (", "8 min\n("))!!
    assertEquals(61.23, offer.amount, .0001)
    assertEquals(2.2, offer.pickupKm, .0001)
  }
  @Test fun rejectsMismatchInsteadOfUsingCounteroffer() {
    assertNull(LiveOfferParser.parse(sample.replace("Aceptar \$61.23", "Aceptar \$67.23")))
  }
  @Test fun rejectsMissingFields() {
    for (part in listOf("Pon Tu Precio", "8 min (2.2 km)", "21 min (9.5 km)", "Aceptar \$61.23", "\$61.23\n5")) {
      assertNull(part, LiveOfferParser.parse(sample.replace(part, "")))
    }
  }
  @Test fun rejectsAmbiguousScreens() {
    assertNull(LiveOfferParser.parse("$sample\n$sample"))
    assertNull(LiveOfferParser.parse(sample.replace("5 puntos", "\$65.23\n5 puntos")))
    assertNull(LiveOfferParser.parse(sample.replace("5 puntos", "10 min (3 km)")))
  }
  @Test fun ignoresMapAndPassengerMetadata() {
    assertEquals(61.23, LiveOfferParser.parse("MARGEN\n\$5.23/km\n" + sample.replace("5 puntos", "5 puntos\n4.80 · 386 viajes · Calle 21"))!!.amount, .0001)
  }
  @Test fun rejectsTruncationUnknownUnitsAndZeroTotals() {
    assertNull(LiveOfferParser.parse(sample.replace("61.23", "61.234")))
    assertNull(LiveOfferParser.parse(sample.replace("9.5 km", "9.5 mi")))
    assertNull(LiveOfferParser.parse(sample.replace("8 min", "0 min").replace("21 min", "0 min")))
    assertNull(LiveOfferParser.parse(""))
    assertNull(LiveOfferParser.parse("a".repeat(20001)))
  }
  @Test fun expiresAtDeadlineWithoutNewFrames() {
    val lease = ReadingLease(); val offer = LiveOfferParser.parse(sample)
    lease.update(offer, 1000)
    assertEquals(offer, lease.current(3999))
    assertNull(lease.current(4000))
    assertNull(lease.current(999))
  }
  @Test fun incompleteNewFrameInvalidatesPreviousOfferImmediately() {
    val lease = ReadingLease(); lease.update(LiveOfferParser.parse(sample), 1000)
    lease.update(null, 1100)
    assertNull(lease.current(1100))
  }
  @Test fun changedOfferReplacesPreviousValue() {
    val lease = ReadingLease(); lease.update(LiveOfferParser.parse(sample), 1000)
    val changed = LiveOfferParser.parse(sample.replace("61.23", "62.23"))
    lease.update(changed, 1500)
    assertEquals(62.23, lease.current(1500)!!.amount, .0001)
  }
}
