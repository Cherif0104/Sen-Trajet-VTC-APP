import assert from "node:assert/strict"
import test from "node:test"

process.env.YOON_DB = "memory"
process.env.YOON_SKIP_ROUTING = "1"
process.env.AUTH_SECRET = "test-secret"

const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=="

test("un chauffeur s’inscrit, est validé, puis bloqué par sa dette", async () => {
  const services = await import("./services")
  const { withDb } = await import("./db")

  const driverId = await services.signup({
    name: "Ibrahima Sarr",
    email: "ibrahima.sarr@example.sn",
    phone: "77 555 12 34",
    password: "Chauffeur2026!",
  })
  assert.equal((await services.getMe(driverId)).balance, 0)

  await assert.rejects(services.submitDriver(driverId))
  const draft = await services.becomeDriver(driverId, {
    category: "confort",
    make: "Toyota",
    model: "Corolla",
    color: "Grise",
    plate: "DK 4321 IS",
    serene: true,
    year: 2019,
    licenseNumber: "sn-123456",
    licenseExpiry: "2030-05-01",
  })
  assert.equal(draft.kyc, "draft")
  assert.equal(draft.licenseNumber, "SN-123456")
  await assert.rejects(services.submitDriver(driverId), /photo|pièce/i)
  await assert.rejects(services.saveDriverDocument(driverId, "selfie", "data:text/plain;base64,AAAA"))
  for (const kind of ["selfie", "permis", "carte_grise", "vehicule"]) {
    await services.saveDriverDocument(driverId, kind, photo)
  }
  await services.submitDriver(driverId)
  assert.equal((await services.driverProfile(driverId)).kyc, "pending")
  await assert.rejects(services.setDriverOnline(driverId, true))

  const opsId = await services.login("ops@sentrajet.sn", "SenTrajet2026!")
  const desk = await services.adminDesk(opsId)
  const pending = desk.drivers.find((driver) => driver.id === driverId)
  assert.equal(pending?.documents.length, 4)

  await assert.rejects(services.adminAct(opsId, "reject", driverId, { reason: "non" }))
  await services.adminAct(opsId, "reject", driverId, { reason: "Photo du permis floue." })
  const rejected = await services.driverProfile(driverId)
  assert.equal(rejected.kyc, "rejected")
  assert.equal(rejected.rejectReason, "Photo du permis floue.")

  await services.saveDriverDocument(driverId, "permis", photo)
  await services.submitDriver(driverId)
  await services.adminAct(opsId, "approve", driverId)
  await services.setDriverOnline(driverId, true)

  await withDb((sql) => sql.query(`update wallets set balance_xof = -6000 where user_id = $1`, [driverId]))
  await services.setDriverOnline(driverId, false)
  await assert.rejects(services.setDriverOnline(driverId, true), /dette/i)
  const fleet = (await services.adminDesk(opsId)).fleet.find((driver) => driver.id === driverId)
  assert.equal(fleet?.blocked, true)

  await services.adminAct(opsId, "deposit", driverId, { amount: 2000 })
  assert.equal((await services.getMe(driverId)).balance, -4000)
  await services.setDriverOnline(driverId, true)
  await services.adminAct(opsId, "deposit", driverId, { amount: 4000 })
})

test("une offre ignorée revient au chauffeur, un refus l’exclut", async () => {
  const services = await import("./services")
  const { setNow } = await import("./clock")
  const start = new Date("2026-10-27T11:00:00.000Z").getTime()
  setNow(() => new Date(start))

  const driverId = await services.login("ibrahima.sarr@example.sn", "Chauffeur2026!")
  await services.driverAct(driverId, "location", { lat: 14.7829, lng: -16.9131 })
  const riderId = await services.login("awa.ndiaye@yoon.sn", "Yoon2026!")
  const ride = await services.createRide({
    riderId,
    pickup: { label: "Thiès", city: "Thiès", lat: 14.78944, lng: -16.92602 },
    dropoff: { label: "Avenue Lat Dior", city: "Thiès", lat: 14.7967, lng: -16.9295 },
    category: "confort",
    method: "cash",
    serene: false,
  })
  assert.equal(ride.status, "matching")
  assert.ok((await services.driverDesk(driverId)).offer)

  setNow(() => new Date(start + 16_000))
  await services.syncRide(ride.id, riderId)
  assert.equal((await services.driverDesk(driverId)).offer?.id, ride.id)

  await services.driverAct(driverId, "decline")
  assert.equal((await services.driverDesk(driverId)).offer, null)
  assert.equal((await services.syncRide(ride.id, riderId)).status, "matching")
})
