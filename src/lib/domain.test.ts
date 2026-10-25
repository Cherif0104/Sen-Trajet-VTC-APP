import assert from "node:assert/strict"
import test from "node:test"
import {
  approachSeconds,
  defaultTariff,
  cancelFee,
  carpoolRefund,
  CATEGORIES,
  normalizePhone,
  normalizePlate,
  priceBandError,
  priceRoute,
  projectRide,
  quoteAll,
  rankDrivers,
  suggestSeatPrice,
} from "./domain"

const plateau = { lat: 14.6696, lng: -17.4281 }
const almadies = { lat: 14.7452, lng: -17.5256 }
const aibd = { lat: 14.6703, lng: -17.0733 }
const tuesday = new Date("2026-10-27T11:00:00.000Z")

test("normalise un mobile sénégalais", () => {
  assert.equal(normalizePhone("77 123 45 67"), "+221771234567")
  assert.equal(normalizePhone("+221 76 000 00 00"), "+221760000000")
  assert.equal(normalizePhone("331234567"), null)
})

test("accepte une plaque dakaroise", () => {
  assert.equal(normalizePlate("dk 3182 bf"), "DK 3182 BF")
  assert.equal(normalizePlate("12-AB"), null)
})

test("fixe un prix Éco Plateau–Almadies sans surprise de pointe", () => {
  const measured = { distanceM: 14_000, durationS: 32 * 60 }
  const price = priceRoute("eco", measured.distanceM, measured.durationS, plateau, almadies, tuesday)
  assert.equal(price.surge, 1)
  assert.ok(price.fare >= 3000 && price.fare <= 7000)
  assert.equal(price.driverNet, price.fare - price.commission)
  assert.equal(price.commission, Math.round(price.fare * CATEGORIES.eco.commission))
})

test("une grille enregistrée change la commission", () => {
  const tariff = defaultTariff()
  tariff.eco.commission = 0.2
  const priced = priceRoute("eco", 14_000, 32 * 60, plateau, almadies, tuesday, tariff)
  assert.equal(priced.commission, Math.round(priced.fare * 0.2))
})

test("ajoute le forfait aéroport et bloque le Jakarta", () => {
  const airport = priceRoute("eco", 45_000, 50 * 60, plateau, aibd, tuesday)
  assert.match(airport.surgeLabel ?? "", /aéroport/)
  const quotes = quoteAll({
    pickup: plateau,
    dropoff: aibd,
    at: tuesday,
    distanceM: 45_000,
    durationS: 50 * 60,
    nearest: { eco: { km: 2, bot: true }, jakarta: { km: 1, bot: true } },
  })
  const jakarta = quotes.find((quote) => quote.category === "jakarta")
  assert.equal(jakarta?.available, false)
})

test("préfère un chauffeur humain proche à un bot plus près", () => {
  const ranked = rankDrivers({
    pickup: plateau,
    category: "eco",
    serene: false,
    drivers: [
      {
        id: "bot",
        lat: 14.672,
        lng: -17.43,
        online: true,
        busy: false,
        category: "eco",
        serene: false,
        bot: true,
        rating: 5,
        acceptance: 1,
        kyc: "verified",
      },
      {
        id: "human",
        lat: 14.676,
        lng: -17.434,
        online: true,
        busy: false,
        category: "eco",
        serene: false,
        bot: false,
        rating: 4.8,
        acceptance: 0.95,
        kyc: "verified",
      },
    ],
  })
  assert.equal(ranked[0]?.driver.id, "human")
})

test("le programme serein ne propose que les chauffeuses inscrites", () => {
  const ranked = rankDrivers({
    pickup: almadies,
    category: "confort",
    serene: true,
    drivers: [
      {
        id: "homme",
        lat: almadies.lat,
        lng: almadies.lng,
        online: true,
        busy: false,
        category: "confort",
        serene: false,
        bot: false,
        rating: 5,
        acceptance: 1,
        kyc: "verified",
      },
    ],
  })
  assert.equal(ranked.length, 0)
})

test("suggère les prix de corridor et refuse les écarts", () => {
  assert.equal(suggestSeatPrice("Dakar", "Thiès", 70), 2000)
  assert.equal(suggestSeatPrice("Dakar", "Saint-Louis", 260), 6000)
  assert.equal(priceBandError(1500, 2000), null)
  assert.ok(priceBandError(400, 2000))
  assert.ok(priceBandError(5000, 2000))
})

test("applique la politique de remboursement du covoiturage", () => {
  const depart = new Date("2026-10-28T08:00:00.000Z")
  assert.equal(carpoolRefund(2000, depart, new Date("2026-10-28T04:00:00.000Z")).refund, 2000)
  assert.equal(carpoolRefund(2000, depart, new Date("2026-10-28T07:00:00.000Z")).refund, 1000)
  assert.equal(carpoolRefund(2000, depart, new Date("2026-10-28T09:00:00.000Z")).refund, 0)
})

test("compresse l’approche de la flotte de lancement et clôt la course", () => {
  assert.ok(approachSeconds(8, true) <= 40)
  assert.ok(approachSeconds(8, false) > 40)
  const started = projectRide(
    {
      status: "in_progress",
      bot: true,
      acceptedAt: "2026-10-27T11:00:00.000Z",
      arrivedAt: "2026-10-27T11:00:20.000Z",
      startedAt: "2026-10-27T11:00:30.000Z",
      approachS: 20,
      tripMotionS: 30,
      offerExpiresAt: null,
      offeredDriverId: null,
    },
    new Date("2026-10-27T11:01:05.000Z"),
  )
  assert.equal(started.event, "completed")
  assert.equal(cancelFee(2500), 500)
  assert.equal(cancelFee(300), 300)
})
