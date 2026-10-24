import assert from "node:assert/strict"
import test from "node:test"

process.env.YOON_DB = "memory"
process.env.YOON_SKIP_ROUTING = "1"
process.env.AUTH_SECRET = "test-secret"

test("une course se termine seule et un siège ne se survend pas", async () => {
  const { setNow } = await import("./clock")
  const services = await import("./services")
  setNow(() => new Date("2026-10-27T11:00:00.000Z"))

  const riderId = await services.login("awa.ndiaye@yoon.sn", "Yoon2026!")
  const before = await services.getMe(riderId)
  const ride = await services.createRide({
    riderId,
    pickup: { label: "Sacré-Cœur", city: "Dakar", lat: 14.7165, lng: -17.4678 },
    dropoff: { label: "Almadies", city: "Dakar", lat: 14.7452, lng: -17.5256 },
    category: "eco",
    method: "wallet",
    serene: false,
  })
  assert.equal(ride.status, "accepted")
  assert.equal(ride.viewer, "rider")

  setNow(() => new Date("2026-10-27T11:02:00.000Z"))
  const arrived = await services.syncRide(ride.id, riderId)
  assert.equal(arrived.status, "arrived")
  await services.actOnRide(riderId, ride.id, "start")
  setNow(() => new Date("2026-10-27T11:05:00.000Z"))
  const done = await services.syncRide(ride.id, riderId)
  assert.equal(done.status, "completed")
  const after = await services.getMe(riderId)
  assert.ok(after.balance < before.balance)

  const driverId = await services.login("moussa.diop@yoon.sn", "Yoon2026!")
  const trip = await services.publishCarpool({
    driverId,
    origin: { label: "Gare des Baux Maraîchers", city: "Dakar", lat: 14.7512, lng: -17.4288 },
    destination: { label: "Thiès centre", city: "Thiès", lat: 14.7886, lng: -16.925 },
    departAt: "2026-10-28T07:30:00.000Z",
    seats: 2,
    price: 2000,
    notes: "Climatisé",
    amenities: ["clim"],
    serene: false,
  })
  const booked = await services.bookCarpool({
    riderId,
    carpoolId: trip.id,
    seats: 2,
    method: "wallet",
  })
  assert.equal(booked.seatsLeft, 0)
  const otherId = await services.signup({
    name: "Fatou Ba",
    email: "fatou.ba@example.sn",
    phone: "78 111 22 33",
    password: "Yoon2026!",
  })
  await assert.rejects(
    () => services.bookCarpool({ riderId: otherId, carpoolId: trip.id, seats: 1, method: "wallet" }),
    /siège|ouvert/,
  )
})
