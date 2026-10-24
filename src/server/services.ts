import { randomUUID } from "node:crypto"
import type { ActivityDTO, CarpoolDTO, MeDTO, RideDTO } from "@/lib/dto"
import {
  approachSeconds,
  measureFallback,
  cancelFee,
  carpoolRefund,
  CATEGORIES,
  dakarDate,
  demandZones,
  haversineKm,
  norm,
  paymentReference,
  priceBandError,
  priceRoute,
  projectRide,
  quoteAll,
  rankDrivers,
  ridePhase,
  suggestSeatPrice,
  tripMotionSeconds,
  type CategoryId,
  type PayMethod,
  type RankableDriver,
} from "@/lib/domain"
import type { GeoPoint } from "@/lib/places"
import { now } from "@/server/clock"
import { withDb } from "@/server/db"
import { ApiError } from "@/server/http"
import { hashPassword, verifyPassword } from "@/server/password"
import { planRoute } from "@/server/routing"
import { flag, iso, num, parseJson, text, type Sql } from "@/server/sql"

const ACTIVE_SQL = "('matching','accepted','arrived','in_progress')"
const AMENITIES = ["clim", "bagage", "musique", "non_fumeur"]

type RideRow = Record<string, unknown>
type DriverFull = RankableDriver & {
  name: string
  phone: string
  make: string
  model: string
  color: string
  plate: string
}

function point(value: unknown, label: string): GeoPoint {
  if (!value || typeof value !== "object") throw new ApiError(`Indiquez ${label}.`)
  const place = value as Partial<GeoPoint>
  if (typeof place.lat !== "number" || typeof place.lng !== "number" || !place.label || !place.city) {
    throw new ApiError(`${label} est incomplet.`)
  }
  if (place.lat < 12 || place.lat > 17 || place.lng < -18 || place.lng > -11) {
    throw new ApiError("Yoon couvre le Sénégal. Choisissez un point dans le pays.")
  }
  return {
    label: place.label.slice(0, 120),
    city: place.city.slice(0, 60),
    area: place.area,
    lat: place.lat,
    lng: place.lng,
  }
}

function categoryOf(value: unknown): CategoryId {
  if (value === "jakarta" || value === "eco" || value === "confort" || value === "van") return value
  throw new ApiError("Choisissez un type de véhicule.")
}

function methodOf(value: unknown): PayMethod {
  if (value === "wallet" || value === "wave" || value === "orange" || value === "free" || value === "cash") {
    return value
  }
  throw new ApiError("Choisissez un moyen de paiement.")
}

async function postTx(
  sql: Sql,
  input: {
    userId: string
    amount: number
    type: string
    method: string
    status?: string
    reference?: string | null
    affects?: boolean
    rideId?: string | null
    bookingId?: string | null
  },
) {
  const affects = input.affects ?? true
  if (affects && input.amount !== 0) {
    await sql.query(`update wallets set balance_xof = balance_xof + $1 where user_id = $2`, [
      input.amount,
      input.userId,
    ])
  }
  await sql.query(
    `insert into transactions (id, user_id, amount_xof, type, method, status, reference, affects_balance, ride_id, booking_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      randomUUID(),
      input.userId,
      input.amount,
      input.type,
      input.method,
      input.status ?? "paid",
      input.reference ?? null,
      affects,
      input.rideId ?? null,
      input.bookingId ?? null,
    ],
  )
}

async function notify(sql: Sql, userId: string, title: string, body: string, href?: string) {
  await sql.query(
    `insert into notifications (id, user_id, title, body, href) values ($1,$2,$3,$4,$5)`,
    [randomUUID(), userId, title, body, href ?? null],
  )
}

async function balanceOf(sql: Sql, userId: string) {
  const rows = await sql.query(`select balance_xof from wallets where user_id = $1`, [userId])
  return num(rows[0]?.balance_xof)
}

async function charge(
  sql: Sql,
  input: { userId: string; amount: number; method: PayMethod; type: string; rideId?: string; bookingId?: string },
) {
  const reference = paymentReference(input.method)
  if (input.method === "wallet") {
    if ((await balanceOf(sql, input.userId)) < input.amount) {
      throw new ApiError("Solde insuffisant. Rechargez le portefeuille, ou payez avec Wave.")
    }
    await postTx(sql, {
      userId: input.userId,
      amount: -input.amount,
      type: input.type,
      method: "wallet",
      reference,
      affects: true,
      rideId: input.rideId,
      bookingId: input.bookingId,
    })
    return { reference, status: "paid" }
  }
  await postTx(sql, {
    userId: input.userId,
    amount: -input.amount,
    type: input.type,
    method: input.method,
    reference,
    affects: false,
    status: input.method === "cash" ? "pending" : "paid",
    rideId: input.rideId,
    bookingId: input.bookingId,
  })
  return { reference, status: input.method === "cash" ? "pending" : "paid" }
}

function rideRecord(row: RideRow) {
  return {
    id: text(row.id),
    riderId: text(row.rider_id),
    driverId: row.driver_id ? text(row.driver_id) : null,
    exclusiveDriverId: row.exclusive_driver_id ? text(row.exclusive_driver_id) : null,
    status: text(row.status),
    category: text(row.category) as CategoryId,
    serene: flag(row.serene),
    pickup: { label: text(row.pickup_label), city: text(row.pickup_city), lat: num(row.pickup_lat), lng: num(row.pickup_lng) },
    dropoff: { label: text(row.dropoff_label), city: text(row.dropoff_city), lat: num(row.dropoff_lat), lng: num(row.dropoff_lng) },
    route: parseJson<[number, number][]>(row.route_json, []),
    distanceM: num(row.distance_m),
    durationS: num(row.duration_s),
    fare: num(row.fare_xof),
    surge: num(row.surge),
    surgeLabel: row.surge_label ? text(row.surge_label) : null,
    commission: num(row.commission_xof),
    driverNet: num(row.driver_net_xof),
    paymentMethod: text(row.payment_method) as PayMethod,
    paymentStatus: text(row.payment_status),
    paymentRef: row.payment_ref ? text(row.payment_ref) : null,
    settled: flag(row.settled),
    approachS: num(row.approach_s),
    tripMotionS: num(row.trip_motion_s),
    driverStartLat: row.driver_start_lat == null ? null : num(row.driver_start_lat),
    driverStartLng: row.driver_start_lng == null ? null : num(row.driver_start_lng),
    createdAt: iso(row.created_at) ?? now().toISOString(),
    acceptedAt: iso(row.accepted_at),
    arrivedAt: iso(row.arrived_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    offerExpiresAt: iso(row.offer_expires_at),
    offeredDriverId: row.offered_driver_id ? text(row.offered_driver_id) : null,
    offered: parseJson<string[]>(row.offered_json, []),
    riderScore: row.rider_score == null ? null : num(row.rider_score),
    driverScore: row.driver_score == null ? null : num(row.driver_score),
    riderComment: row.rider_comment ? text(row.rider_comment) : null,
    cancelledBy: row.cancelled_by ? text(row.cancelled_by) : null,
    cancelReason: row.cancel_reason ? text(row.cancel_reason) : null,
    bot: flag(row.bot),
  }
}

type Ride = ReturnType<typeof rideRecord>

async function lockRide(sql: Sql, id: string) {
  const rows = await sql.query(`select * from rides where id = $1 for update`, [id])
  return rows[0] ? rideRecord(rows[0]) : null
}

async function loadDrivers(sql: Sql, category: CategoryId): Promise<DriverFull[]> {
  const rows = await sql.query(
    `select d.*, u.name, u.phone, u.rating as user_rating
     from drivers d join users u on u.id = d.user_id
     where d.category = $1 and d.online = true and d.busy = false and d.kyc = 'verified'
       and not exists (
         select 1 from rides r where r.status = 'matching' and r.offered_driver_id = d.user_id
       )`,
    [category],
  )
  return rows.map((row) => ({
    id: text(row.user_id),
    lat: num(row.lat),
    lng: num(row.lng),
    online: flag(row.online),
    busy: flag(row.busy),
    category: text(row.category) as CategoryId,
    serene: flag(row.serene),
    bot: flag(row.bot),
    rating: num(row.user_rating),
    acceptance: num(row.acceptance),
    kyc: text(row.kyc),
    name: text(row.name),
    phone: text(row.phone),
    make: text(row.make),
    model: text(row.model),
    color: text(row.color),
    plate: text(row.plate),
  }))
}

async function driverById(sql: Sql, id: string) {
  const found = await sql.query(
    `select d.*, u.name, u.phone, u.rating as user_rating
     from drivers d join users u on u.id = d.user_id where d.user_id = $1`,
    [id],
  )
  const row = found[0]
  if (!row) return null
  return {
    id: text(row.user_id),
    lat: num(row.lat),
    lng: num(row.lng),
    online: flag(row.online),
    busy: flag(row.busy),
    category: text(row.category) as CategoryId,
    serene: flag(row.serene),
    bot: flag(row.bot),
    rating: num(row.user_rating),
    acceptance: num(row.acceptance),
    kyc: text(row.kyc),
    name: text(row.name),
    phone: text(row.phone),
    make: text(row.make),
    model: text(row.model),
    color: text(row.color),
    plate: text(row.plate),
  } satisfies DriverFull
}

async function releaseDriver(sql: Sql, driverId: string | null) {
  if (!driverId) return
  await sql.query(
    `update drivers set busy = false,
       lat = case when bot then home_lat else lat end,
       lng = case when bot then home_lng else lng end
     where user_id = $1`,
    [driverId],
  )
}

async function cancelRide(sql: Sql, ride: Ride, by: string, reason: string, fee: number) {
  if (ride.status === "cancelled" || ride.status === "completed" || ride.settled) return
  const refund = ride.paymentMethod === "wallet" ? Math.max(0, ride.fare - fee) : 0
  if (refund > 0) {
    await postTx(sql, {
      userId: ride.riderId,
      amount: refund,
      type: "refund",
      method: "wallet",
      reference: ride.paymentRef,
      affects: true,
      rideId: ride.id,
    })
  }
  if (fee > 0 && ride.paymentMethod !== "wallet") {
    await postTx(sql, {
      userId: ride.riderId,
      amount: -fee,
      type: "cancel_fee",
      method: ride.paymentMethod,
      affects: false,
      rideId: ride.id,
    })
  }
  await sql.query(
    `update rides set status = 'cancelled', cancelled_by = $2, cancel_reason = $3, payment_status = $4 where id = $1`,
    [ride.id, by, reason, refund > 0 ? "refunded" : ride.paymentStatus],
  )
  await releaseDriver(sql, ride.driverId)
  if (by === "rider") {
    await sql.query(`update users set cancel_count = cancel_count + 1 where id = $1`, [ride.riderId])
  }
  await notify(sql, ride.riderId, "Course annulée", reason, `/app/course/${ride.id}`)
  if (ride.driverId) await notify(sql, ride.driverId, "Course annulée", reason, "/app/chauffeur")
}

async function settleRide(sql: Sql, ride: Ride) {
  if (ride.settled || !ride.driverId) return
  if (ride.paymentMethod === "cash") {
    await postTx(sql, {
      userId: ride.driverId,
      amount: -ride.commission,
      type: "commission",
      method: "cash",
      affects: true,
      rideId: ride.id,
    })
  } else {
    await postTx(sql, {
      userId: ride.driverId,
      amount: ride.driverNet,
      type: "ride_earning",
      method: ride.paymentMethod,
      affects: true,
      rideId: ride.id,
    })
  }
  await sql.query(
    `update rides set status = 'completed', settled = true, completed_at = $2, payment_status = 'paid' where id = $1`,
    [ride.id, now().toISOString()],
  )
  await sql.query(`update users set trip_count = trip_count + 1 where id = $1 or id = $2`, [
    ride.riderId,
    ride.driverId,
  ])
  await releaseDriver(sql, ride.driverId)
  await notify(sql, ride.riderId, "Course terminée", "Notez le chauffeur pour aider les prochains passagers.", `/app/course/${ride.id}`)
  await notify(sql, ride.driverId, "Course terminée", "Le montant net est dans votre activité.", "/app/chauffeur")
}

async function acceptRide(sql: Sql, ride: Ride, driver: DriverFull) {
  const km = haversineKm(driver, ride.pickup)
  await sql.query(
    `update rides set status = 'accepted', driver_id = $2, bot = $3, accepted_at = $4,
       approach_s = $5, trip_motion_s = $6, driver_start_lat = $7, driver_start_lng = $8,
       offered_driver_id = null, offer_expires_at = null
     where id = $1`,
    [
      ride.id,
      driver.id,
      driver.bot,
      now().toISOString(),
      approachSeconds(km, driver.bot),
      tripMotionSeconds(ride.durationS, driver.bot),
      driver.lat,
      driver.lng,
    ],
  )
  await sql.query(
    `update drivers set busy = true, acceptance = least(1, acceptance + 0.01) where user_id = $1`,
    [driver.id],
  )
  await notify(
    sql,
    ride.riderId,
    `${driver.name.split(" ")[0]} arrive`,
    `${driver.color} ${driver.make} ${driver.model} · ${driver.plate}`,
    `/app/course/${ride.id}`,
  )
}

async function dispatchRide(sql: Sql, rideId: string) {
  const ride = await lockRide(sql, rideId)
  if (!ride || ride.status !== "matching") return
  const pool = await loadDrivers(sql, ride.category)
  const ranked = rankDrivers({
    drivers: pool,
    pickup: ride.pickup,
    category: ride.category,
    serene: ride.serene,
    exclude: ride.offered,
  }).filter((item) => !ride.exclusiveDriverId || item.driver.id === ride.exclusiveDriverId)
  const next = ranked[0]?.driver as DriverFull | undefined
  if (!next) {
    await cancelRide(sql, ride, "system", "Aucun chauffeur n’a accepté la course. Vous n’êtes pas débité au-delà du remboursement automatique.", 0)
    return
  }
  if (next.bot && !ride.exclusiveDriverId) {
    await acceptRide(sql, ride, next)
    return
  }
  const expires = new Date(now().getTime() + 15_000).toISOString()
  await sql.query(
    `update rides set offered_driver_id = $2, offer_expires_at = $3 where id = $1`,
    [ride.id, next.id, expires],
  )
  await notify(sql, next.id, "Course à proximité", `${ride.pickup.label} → ${ride.dropoff.label}`, "/app/chauffeur")
}

async function dropOffer(sql: Sql, ride: Ride) {
  const offered = ride.offeredDriverId ? [...ride.offered, ride.offeredDriverId] : ride.offered
  if (ride.offeredDriverId) {
    await sql.query(
      `update drivers set acceptance = greatest(0.4, acceptance - 0.05) where user_id = $1 and bot = false`,
      [ride.offeredDriverId],
    )
  }
  await sql.query(
    `update rides set offered_json = $2, offered_driver_id = null, offer_expires_at = null where id = $1`,
    [ride.id, JSON.stringify(offered)],
  )
  const fresh = await lockRide(sql, ride.id)
  if (!fresh) return
  if (fresh.exclusiveDriverId) {
    await cancelRide(sql, fresh, "driver", "Le chauffeur n’a pas pris la course.", 0)
    return
  }
  await dispatchRide(sql, ride.id)
}

async function applyRide(sql: Sql, rideId: string) {
  const ride = await lockRide(sql, rideId)
  if (!ride) return
  const projection = projectRide(
    {
      status: ride.status,
      bot: ride.bot,
      acceptedAt: ride.acceptedAt,
      arrivedAt: ride.arrivedAt,
      startedAt: ride.startedAt,
      approachS: ride.approachS,
      tripMotionS: ride.tripMotionS,
      offerExpiresAt: ride.offerExpiresAt,
      offeredDriverId: ride.offeredDriverId,
    },
    now(),
  )
  if (projection.event === "offer_expired") {
    await dropOffer(sql, ride)
    return
  }
  if (projection.event === "arrived") {
    await sql.query(`update rides set status = 'arrived', arrived_at = $2 where id = $1 and status = 'accepted'`, [
      ride.id,
      now().toISOString(),
    ])
    await notify(sql, ride.riderId, "Votre chauffeur est là", "Confirmez que vous montez.", `/app/course/${ride.id}`)
    return
  }
  if (projection.event === "noshow") {
    await cancelRide(sql, ride, "system", "Absence au point de prise en charge. Des frais d’attente ont été retenus.", cancelFee(ride.fare))
    return
  }
  if (projection.event === "completed") await settleRide(sql, ride)
}

async function presentRide(sql: Sql, id: string, viewerId: string): Promise<RideDTO> {
  const rows = await sql.query(
    `select r.*,
        du.name as driver_name, du.rating as driver_user_rating, du.phone as driver_phone,
        d.plate, d.make, d.model, d.color, d.serene as driver_serene, d.bot as driver_bot,
        ru.name as rider_name, ru.rating as rider_user_rating, ru.phone as rider_phone
     from rides r
     left join users du on du.id = r.driver_id
     left join drivers d on d.user_id = r.driver_id
     join users ru on ru.id = r.rider_id
     where r.id = $1`,
    [id],
  )
  const row = rows[0]
  if (!row) throw new ApiError("Course introuvable.", 404)
  const ride = rideRecord(row)
  const viewer =
    ride.riderId === viewerId ? "rider" : ride.driverId === viewerId || ride.offeredDriverId === viewerId ? "driver" : "other"
  if (viewer === "other") throw new ApiError("Course introuvable.", 404)
  const phase = ridePhase(
    {
      status: ride.status,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      approachS: ride.approachS,
      tripMotionS: ride.tripMotionS,
      driverStartLat: ride.driverStartLat,
      driverStartLng: ride.driverStartLng,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      route: ride.route,
    },
    now(),
  )
  const showPhone = ["accepted", "arrived", "in_progress"].includes(ride.status)
  return {
    id: ride.id,
    status: ride.status,
    category: ride.category,
    serene: ride.serene,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    route: ride.route,
    distanceM: ride.distanceM,
    durationS: ride.durationS,
    fare: ride.fare,
    surge: ride.surge,
    surgeLabel: ride.surgeLabel,
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
    paymentRef: ride.paymentRef,
    createdAt: ride.createdAt,
    acceptedAt: ride.acceptedAt,
    arrivedAt: ride.arrivedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    approachS: ride.approachS,
    tripMotionS: ride.tripMotionS,
    progress: phase.progress,
    etaS: phase.etaS,
    driverPoint: phase.point,
    driver: ride.driverId
      ? {
          id: ride.driverId,
          name: text(row.driver_name),
          rating: num(row.driver_user_rating),
          phone: showPhone ? text(row.driver_phone) : null,
          plate: text(row.plate),
          make: text(row.make),
          model: text(row.model),
          color: text(row.color),
          category: ride.category,
          serene: flag(row.driver_serene),
          launchFleet: flag(row.driver_bot),
        }
      : null,
    rider: {
      id: ride.riderId,
      name: text(row.rider_name),
      rating: num(row.rider_user_rating),
      phone: showPhone && viewer === "driver" ? text(row.rider_phone) : null,
    },
    riderScore: ride.riderScore,
    driverScore: ride.driverScore,
    riderComment: ride.riderComment,
    cancelReason: ride.cancelReason,
    cancelledBy: ride.cancelledBy,
    net: viewer === "driver" ? ride.driverNet : null,
    offerExpiresAt: viewer === "driver" ? ride.offerExpiresAt : null,
    viewer,
  }
}

async function sweepCarpools(sql: Sql) {
  const due = await sql.query<{ id: string; driver_id: string }>(
    `select id, driver_id from carpools
     where status in ('published','full','departed')
       and depart_at + (duration_s * interval '1 second') < now()`,
  )
  for (const trip of due) {
    const bookings = await sql.query(
      `select * from bookings where carpool_id = $1 and status = 'confirmed' and settled = false`,
      [trip.id],
    )
    for (const booking of bookings) {
      await postTx(sql, {
        userId: text(trip.driver_id),
        amount: num(booking.driver_net_xof),
        type: "carpool_earning",
        method: text(booking.payment_method),
        affects: true,
        bookingId: text(booking.id),
      })
      await sql.query(`update bookings set status = 'completed', settled = true where id = $1`, [booking.id])
    }
    await sql.query(`update carpools set status = 'completed' where id = $1`, [trip.id])
  }
}

function carpoolOf(row: Record<string, unknown>, viewerId: string, booking: Record<string, unknown> | null): CarpoolDTO {
  return {
    id: text(row.id),
    driver: {
      id: text(row.driver_id),
      name: text(row.driver_name),
      rating: num(row.driver_rating),
      ratingCount: num(row.driver_rating_count),
      plate: text(row.plate),
      make: text(row.make),
      model: text(row.model),
      color: text(row.color),
      serene: flag(row.driver_serene),
      launchFleet: flag(row.bot),
    },
    origin: { label: text(row.origin_label), city: text(row.origin_city), lat: num(row.origin_lat), lng: num(row.origin_lng) },
    destination: { label: text(row.dest_label), city: text(row.dest_city), lat: num(row.dest_lat), lng: num(row.dest_lng) },
    departAt: iso(row.depart_at) ?? now().toISOString(),
    seatsTotal: num(row.seats_total),
    seatsLeft: num(row.seats_left),
    pricePerSeat: num(row.price_per_seat),
    notes: text(row.notes),
    amenities: parseJson<string[]>(row.amenities_json, []),
    status: text(row.status),
    serene: flag(row.serene),
    distanceM: num(row.distance_m),
    durationS: num(row.duration_s),
    mine: text(row.driver_id) === viewerId,
    booking: booking
      ? {
          id: text(booking.id),
          seats: num(booking.seats),
          amount: num(booking.amount_xof),
          status: text(booking.status),
          refund: num(booking.refund_xof),
        }
      : null,
  }
}

const CARPOOL_SELECT = `
  select c.*, u.name as driver_name, u.rating as driver_rating, u.rating_count as driver_rating_count,
         d.plate, d.make, d.model, d.color, d.serene as driver_serene, d.bot
  from carpools c
  join users u on u.id = c.driver_id
  join drivers d on d.user_id = c.driver_id
`

async function presentCarpool(sql: Sql, id: string, viewerId: string) {
  const rows = await sql.query(`${CARPOOL_SELECT} where c.id = $1`, [id])
  if (!rows[0]) throw new ApiError("Départ introuvable.", 404)
  const booking = await sql.query(
    `select * from bookings where carpool_id = $1 and rider_id = $2 and status = 'confirmed' limit 1`,
    [id, viewerId],
  )
  return carpoolOf(rows[0], viewerId, booking[0] ?? null)
}

export async function signup(input: { name: string; email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (name.length < 2) throw new ApiError("Indiquez votre nom complet.")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Cet e-mail n’est pas valide.")
  if (input.password.length < 8) throw new ApiError("Le mot de passe doit faire au moins 8 caractères.")
  const { normalizePhone } = await import("@/lib/domain")
  const phone = normalizePhone(input.phone)
  if (!phone) throw new ApiError("Indiquez un mobile sénégalais, par exemple 77 123 45 67.")
  return withDb(async (sql) => {
    const existing = await sql.query(`select id from users where email = $1`, [email])
    if (existing[0]) throw new ApiError("Un compte existe déjà avec cet e-mail.")
    const id = randomUUID()
    const password = hashPassword(input.password)
    await sql.query(
      `insert into users (id, email, password_hash, password_salt, name, phone) values ($1,$2,$3,$4,$5,$6)`,
      [id, email, password.hash, password.salt, name, phone],
    )
    await sql.query(`insert into wallets (user_id, balance_xof) values ($1, 15000)`, [id])
    await postTx(sql, {
      userId: id,
      amount: 15000,
      type: "welcome",
      method: "wallet",
      reference: "BIENVENUE",
      affects: false,
    })
    await sql.query(`update wallets set balance_xof = 15000 where user_id = $1`, [id])
    return id
  })
}

export async function login(email: string, password: string) {
  return withDb(async (sql) => {
    const rows = await sql.query(`select * from users where email = $1`, [email.trim().toLowerCase()])
    const user = rows[0]
    if (!user || !verifyPassword(password, text(user.password_salt), text(user.password_hash))) {
      throw new ApiError("E-mail ou mot de passe incorrect.", 401)
    }
    return text(user.id)
  })
}

export async function getMe(userId: string): Promise<MeDTO> {
  return withDb(async (sql) => {
    const users = await sql.query(`select * from users where id = $1`, [userId])
    const user = users[0]
    if (!user) throw new ApiError("Compte introuvable.", 401)
    const wallet = await sql.query(`select balance_xof from wallets where user_id = $1`, [userId])
    const drivers = await sql.query(`select * from drivers where user_id = $1`, [userId])
    const driver = drivers[0]
    const transactions = await sql.query(
      `select * from transactions where user_id = $1 order by created_at desc limit 12`,
      [userId],
    )
    const notifications = await sql.query(
      `select * from notifications where user_id = $1 order by created_at desc limit 10`,
      [userId],
    )
    const unread = await sql.query<{ n: number }>(
      `select count(*)::int as n from notifications where user_id = $1 and read = false`,
      [userId],
    )
    const active = await sql.query<{ id: string }>(
      `select id from rides
       where status in ${ACTIVE_SQL} and (rider_id = $1 or driver_id = $1 or offered_driver_id = $1)
       order by created_at desc limit 1`,
      [userId],
    )
    return {
      id: userId,
      email: text(user.email),
      name: text(user.name),
      phone: text(user.phone),
      rating: num(user.rating),
      ratingCount: num(user.rating_count),
      tripCount: num(user.trip_count),
      balance: num(wallet[0]?.balance_xof),
      driver: driver
        ? {
            category: text(driver.category) as CategoryId,
            make: text(driver.make),
            model: text(driver.model),
            color: text(driver.color),
            plate: text(driver.plate),
            seats: num(driver.seats),
            serene: flag(driver.serene),
            online: flag(driver.online),
            launchFleet: flag(driver.bot),
            rating: num(user.rating),
          }
        : null,
      transactions: transactions.map((item) => ({
        id: text(item.id),
        amount: num(item.amount_xof),
        type: text(item.type),
        method: item.method ? text(item.method) : null,
        status: text(item.status),
        reference: item.reference ? text(item.reference) : null,
        createdAt: iso(item.created_at) ?? now().toISOString(),
        affectsBalance: flag(item.affects_balance),
      })),
      notifications: notifications.map((item) => ({
        id: text(item.id),
        title: text(item.title),
        body: text(item.body),
        href: item.href ? text(item.href) : null,
        read: flag(item.read),
        createdAt: iso(item.created_at) ?? now().toISOString(),
      })),
      unread: num(unread[0]?.n),
      activeRideId: active[0]?.id ?? null,
    }
  })
}

export async function updateProfile(userId: string, input: { name: string; phone: string }) {
  const { normalizePhone } = await import("@/lib/domain")
  const phone = normalizePhone(input.phone)
  const name = input.name.trim()
  if (name.length < 2) throw new ApiError("Indiquez votre nom complet.")
  if (!phone) throw new ApiError("Indiquez un mobile sénégalais, par exemple 77 123 45 67.")
  await withDb(async (sql) => {
    await sql.query(`update users set name = $2, phone = $3 where id = $1`, [userId, name, phone])
  })
  return getMe(userId)
}

export async function markNotificationsRead(userId: string) {
  await withDb(async (sql) => {
    await sql.query(`update notifications set read = true where user_id = $1`, [userId])
  })
}

export async function becomeDriver(
  userId: string,
  input: { category: string; make: string; model: string; color: string; plate: string; serene: boolean },
) {
  const { normalizePlate } = await import("@/lib/domain")
  const category = categoryOf(input.category)
  const plate = normalizePlate(input.plate)
  if (!plate) throw new ApiError("La plaque doit ressembler à DK 1234 AB.")
  if (input.make.trim().length < 2 || input.model.trim().length < 1 || input.color.trim().length < 2) {
    throw new ApiError("Indiquez la marque, le modèle et la couleur.")
  }
  await withDb(async (sql) => {
    const users = await sql.query(`select phone, name from users where id = $1`, [userId])
    if (!users[0] || text(users[0].phone).length < 8 || text(users[0].name).length < 2) {
      throw new ApiError("Ajoutez votre nom et un mobile sénégalais avant de passer chauffeur.")
    }
    const clash = await sql.query(`select user_id from drivers where plate = $1 and user_id <> $2`, [plate, userId])
    if (clash[0]) throw new ApiError("Cette plaque est déjà enregistrée.")
    const existing = await sql.query(`select user_id from drivers where user_id = $1`, [userId])
    const values = [category, input.make.trim(), input.model.trim(), input.color.trim(), plate, CATEGORIES[category].seats, input.serene]
    if (existing[0]) {
      await sql.query(
        `update drivers set category = $2, make = $3, model = $4, color = $5, plate = $6, seats = $7, serene = $8, kyc = 'verified' where user_id = $1`,
        [userId, ...values],
      )
    } else {
      await sql.query(
        `insert into drivers (user_id, category, make, model, color, plate, seats, serene, online, lat, lng, home_lat, home_lng, kyc, bot, acceptance)
         values ($1,$2,$3,$4,$5,$6,$7,$8,false,14.7165,-17.4678,14.7165,-17.4678,'verified',false,1)`,
        [userId, ...values],
      )
    }
  })
  return getMe(userId)
}

export async function topup(userId: string, amount: number, method: string) {
  const pay = methodOf(method)
  if (pay === "wallet" || pay === "cash") throw new ApiError("Rechargez avec Wave, Orange Money ou Free Money.")
  if (!Number.isFinite(amount) || amount < 500 || amount > 500_000) {
    throw new ApiError("Le montant doit être compris entre 500 F et 500 000 F.")
  }
  const rounded = Math.round(amount / 50) * 50
  await withDb(async (sql) => {
    const reference = paymentReference(pay)
    await postTx(sql, {
      userId,
      amount: rounded,
      type: "topup",
      method: pay,
      reference,
      affects: true,
    })
    await notify(sql, userId, "Portefeuille rechargé", `${rounded} F confirmés (${reference}).`, "/app/compte")
  })
  return getMe(userId)
}

async function nearestByCategory(sql: Sql, pickup: GeoPoint) {
  const nearest: Partial<Record<CategoryId, { km: number; bot: boolean } | null>> = {}
  const serene: Partial<Record<CategoryId, boolean>> = {}
  for (const category of Object.keys(CATEGORIES) as CategoryId[]) {
    const pool = await loadDrivers(sql, category)
    const ranked = rankDrivers({ drivers: pool, pickup, category, serene: false })
    const first = ranked[0]
    nearest[category] = first ? { km: first.km, bot: first.driver.bot } : null
    serene[category] = rankDrivers({ drivers: pool, pickup, category, serene: true }).length > 0
  }
  return { nearest, serene }
}

export async function quoteTrip(pickupInput: unknown, dropoffInput: unknown) {
  const pickup = point(pickupInput, "le départ")
  const dropoff = point(dropoffInput, "l’arrivée")
  const planned = await planRoute(pickup, dropoff)
  return withDb(async (sql) => {
    const supply = await nearestByCategory(sql, pickup)
    return {
      distanceM: planned.distanceM,
      durationS: planned.durationS,
      quotes: quoteAll({
        pickup,
        dropoff,
        at: now(),
        distanceM: planned.distanceM,
        durationS: planned.durationS,
        nearest: supply.nearest,
      }).map((quote) => ({
        ...quote,
        sereneAvailable: supply.serene[quote.category] === true,
      })),
    }
  })
}

export async function createRide(input: {
  riderId: string
  pickup: unknown
  dropoff: unknown
  category: string
  method: string
  serene: boolean
  exclusiveDriverId?: string
}) {
  const pickup = point(input.pickup, "le départ")
  const dropoff = point(input.dropoff, "l’arrivée")
  const category = categoryOf(input.category)
  const method = methodOf(input.method)
  const planned = await planRoute(pickup, dropoff)
  return withDb(async (sql) => {
    const active = await sql.query(
      `select id from rides where rider_id = $1 and status in ${ACTIVE_SQL} limit 1`,
      [input.riderId],
    )
    if (active[0]) throw new ApiError("Vous avez déjà une course en cours.")
    const priced = priceRoute(category, planned.distanceM, planned.durationS, pickup, dropoff, now())
    const supply = await nearestByCategory(sql, pickup)
    const quote = quoteAll({
      pickup,
      dropoff,
      at: now(),
      distanceM: planned.distanceM,
      durationS: planned.durationS,
      nearest: supply.nearest,
    }).find((item) => item.category === category)
    if (input.serene && !input.exclusiveDriverId && !supply.serene[category]) {
      throw new ApiError("Aucun chauffeur Trajet Serein n’est libre à proximité. Décochez l’option, ou changez de catégorie.")
    }
    if (!input.exclusiveDriverId && quote && !quote.available) {
      throw new ApiError(quote.reason ?? "Aucun chauffeur disponible.")
    }
    if ((planned.distanceM / 1000) < 0.35) throw new ApiError("Ce trajet est trop court.")
    if (category === "jakarta" && ((planned.distanceM / 1000) > 25 || priced.airport)) {
      throw new ApiError("Le Jakarta reste dans Dakar.")
    }
    const id = randomUUID()
    await sql.query(
      `insert into rides (
        id, rider_id, exclusive_driver_id, status, category, serene,
        pickup_label, pickup_city, pickup_lat, pickup_lng,
        dropoff_label, dropoff_city, dropoff_lat, dropoff_lng,
        route_json, distance_m, duration_s, fare_xof, surge, surge_label, commission_xof, driver_net_xof,
        payment_method, payment_status, payment_ref, offered_json
      ) values (
        $1,$2,$3,'matching',$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,
        $22,$23,$24,'[]'
      )`,
      [
        id,
        input.riderId,
        input.exclusiveDriverId ?? null,
        category,
        input.serene,
        pickup.label,
        pickup.city,
        pickup.lat,
        pickup.lng,
        dropoff.label,
        dropoff.city,
        dropoff.lat,
        dropoff.lng,
        JSON.stringify(planned.route),
        planned.distanceM,
        planned.durationS,
        priced.fare,
        priced.surge,
        priced.surgeLabel,
        priced.commission,
        priced.driverNet,
        method,
        "pending",
        null,
      ],
    )
    const payment = await charge(sql, {
      userId: input.riderId,
      amount: priced.fare,
      method,
      type: "ride_payment",
      rideId: id,
    })
    await sql.query(`update rides set payment_status = $2, payment_ref = $3 where id = $1`, [
      id,
      payment.status,
      payment.reference,
    ])
    if (input.exclusiveDriverId) {
      await sql.query(
        `update rides set offered_driver_id = $2, offer_expires_at = $3 where id = $1`,
        [id, input.exclusiveDriverId, new Date(now().getTime() + 20_000).toISOString()],
      )
      await notify(sql, input.exclusiveDriverId, "Demande test", `${pickup.label} → ${dropoff.label}`, "/app/chauffeur")
    } else {
      await dispatchRide(sql, id)
    }
    return presentRide(sql, id, input.riderId)
  })
}

export async function syncRide(rideId: string, viewerId: string) {
  return withDb(async (sql) => {
    await applyRide(sql, rideId)
    return presentRide(sql, rideId, viewerId)
  })
}

export async function listRides(userId: string) {
  return withDb(async (sql) => {
    const ids = await sql.query<{ id: string }>(
      `select id from rides where rider_id = $1 or driver_id = $1 order by created_at desc limit 30`,
      [userId],
    )
    for (const row of ids) await applyRide(sql, row.id)
    const rides: RideDTO[] = []
    for (const row of ids) rides.push(await presentRide(sql, row.id, userId))
    return rides
  })
}

export async function actOnRide(
  userId: string,
  rideId: string,
  action: string,
  extra?: { rating?: number; comment?: string },
) {
  return withDb(async (sql) => {
    await applyRide(sql, rideId)
    const ride = await lockRide(sql, rideId)
    if (!ride) throw new ApiError("Course introuvable.", 404)
    if (action === "cancel") {
      if (ride.riderId !== userId) throw new ApiError("Seul le passager peut annuler ici.")
      if (ride.status === "in_progress" || ride.status === "completed" || ride.status === "cancelled") {
        throw new ApiError("Cette course ne peut plus être annulée.")
      }
      const fee = ride.status === "arrived" ? cancelFee(ride.fare) : 0
      await cancelRide(sql, ride, "rider", fee ? "Annulée après l’arrivée du chauffeur." : "Annulée par le passager.", fee)
    } else if (action === "start") {
      if (ride.riderId !== userId && ride.driverId !== userId) throw new ApiError("Action impossible.")
      if (ride.status !== "arrived" && ride.status !== "accepted") {
        throw new ApiError("Le chauffeur n’est pas encore au point de rendez-vous.")
      }
      await sql.query(
        `update rides set status = 'in_progress', started_at = $2, arrived_at = coalesce(arrived_at, $2) where id = $1`,
        [ride.id, now().toISOString()],
      )
    } else if (action === "complete") {
      if (ride.status !== "in_progress") throw new ApiError("La course n’a pas commencé.")
      if (ride.riderId !== userId && ride.driverId !== userId) throw new ApiError("Action impossible.")
      await settleRide(sql, ride)
    } else if (action === "rate") {
      const score = extra?.rating
      if (!score || score < 1 || score > 5) throw new ApiError("Choisissez une note de 1 à 5.")
      if (ride.status !== "completed") throw new ApiError("La course n’est pas terminée.")
      if (userId === ride.riderId && ride.driverId && ride.driverScore == null) {
        await sql.query(`update rides set driver_score = $2, rider_comment = $3 where id = $1`, [
          ride.id,
          score,
          extra?.comment?.slice(0, 240) ?? null,
        ])
        await sql.query(
          `update users set rating = ((rating * rating_count) + $2) / (rating_count + 1.0), rating_count = rating_count + 1 where id = $1`,
          [ride.driverId, score],
        )
      } else if (userId === ride.driverId && ride.riderScore == null) {
        await sql.query(`update rides set rider_score = $2 where id = $1`, [ride.id, score])
        await sql.query(
          `update users set rating = ((rating * rating_count) + $2) / (rating_count + 1.0), rating_count = rating_count + 1 where id = $1`,
          [ride.riderId, score],
        )
      }
    } else {
      throw new ApiError("Action inconnue.")
    }
    return presentRide(sql, rideId, userId)
  })
}

export async function driverDesk(userId: string) {
  return withDb(async (sql) => {
    const driver = await driverById(sql, userId)
    if (!driver) throw new ApiError("Activez d’abord votre profil chauffeur.")
    const offer = await sql.query<{ id: string }>(
      `select id from rides where offered_driver_id = $1 and status = 'matching' limit 1`,
      [userId],
    )
    if (offer[0]) await applyRide(sql, offer[0].id)
    const active = await sql.query<{ id: string }>(
      `select id from rides where driver_id = $1 and status in ('accepted','arrived','in_progress') order by created_at desc limit 1`,
      [userId],
    )
    if (active[0]) await applyRide(sql, active[0].id)
    const offerAfter = await sql.query<{ id: string }>(
      `select id from rides where offered_driver_id = $1 and status = 'matching' limit 1`,
      [userId],
    )
    const activeAfter = await sql.query<{ id: string }>(
      `select id from rides where driver_id = $1 and status in ('accepted','arrived','in_progress') order by created_at desc limit 1`,
      [userId],
    )
    const start = `${dakarDate(now())}T00:00:00.000Z`
    const earned = await sql.query(
      `select coalesce(sum(amount_xof),0) as net from transactions
       where user_id = $1 and created_at >= $2 and type in ('ride_earning','carpool_earning','commission') and affects_balance = true`,
      [userId, start],
    )
    const fresh = await driverById(sql, userId)
    return {
      online: fresh?.online ?? false,
      vehicle: fresh ? `${fresh.color} ${fresh.make} ${fresh.model}` : "",
      plate: fresh?.plate ?? "",
      category: fresh?.category ?? "eco",
      earningsToday: num(earned[0]?.net),
      zones: demandZones(now()),
      offer: offerAfter[0] ? await presentRide(sql, offerAfter[0].id, userId) : null,
      active: activeAfter[0] ? await presentRide(sql, activeAfter[0].id, userId) : null,
    }
  })
}

export async function setDriverOnline(userId: string, online: boolean) {
  await withDb(async (sql) => {
    const driver = await driverById(sql, userId)
    if (!driver) throw new ApiError("Complétez votre véhicule pour passer en ligne.")
    const users = await sql.query(`select rating, rating_count from users where id = $1`, [userId])
    if (online && num(users[0]?.rating) < 3.8 && num(users[0]?.rating_count) >= 6) {
      throw new ApiError("Note sous 3,8 : les mises en ligne sont suspendues automatiquement.")
    }
    if (online && driver.busy) throw new ApiError("Terminez la course en cours avant de changer de statut.")
    await sql.query(`update drivers set online = $2 where user_id = $1`, [userId, online])
  })
  return driverDesk(userId)
}

export async function driverAct(userId: string, action: string, extra?: { lat?: number; lng?: number; rating?: number }) {
  if (action === "online") return setDriverOnline(userId, true)
  if (action === "offline") return setDriverOnline(userId, false)
  if (action === "rate") {
    const current = await driverDesk(userId)
    if (!current.active) throw new ApiError("Aucune course à noter.")
    await actOnRide(userId, current.active.id, "rate", { rating: extra?.rating })
    return driverDesk(userId)
  }
  if (action === "location" && typeof extra?.lat === "number" && typeof extra?.lng === "number") {
    await withDb(async (sql) => {
      await sql.query(`update drivers set lat = $2, lng = $3 where user_id = $1 and bot = false`, [
        userId,
        extra.lat,
        extra.lng,
      ])
    })
    return driverDesk(userId)
  }
  if (action === "demo") {
    return withDb(async (sql) => {
      const driver = await driverById(sql, userId)
      if (!driver) throw new ApiError("Complétez votre véhicule.")
      if (!driver.online) throw new ApiError("Passez en ligne pour recevoir une demande.")
      if (driver.busy) throw new ApiError("Vous avez déjà une course.")
      const rider = await sql.query<{ id: string }>(`select id from users where email = 'bineta.sarr@yoon.sn'`)
      if (!rider[0]) throw new ApiError("La demande test est indisponible.")
      const existing = await sql.query(
        `select id from rides where rider_id = $1 and status in ${ACTIVE_SQL}`,
        [rider[0].id],
      )
      for (const row of existing) {
        const ride = await lockRide(sql, text(row.id))
        if (ride) await cancelRide(sql, ride, "system", "Remplacée par une nouvelle demande test.", 0)
      }
      return { created: true as const, riderId: rider[0].id, driver }
    }).then(async (prepared) => {
      await createRide({
        riderId: prepared.riderId,
        pickup: {
          label: "À proximité",
          city: "Dakar",
          lat: prepared.driver.lat + 0.004,
          lng: prepared.driver.lng,
        },
        dropoff: {
          label: "Destination test",
          city: "Dakar",
          lat: prepared.driver.lat + 0.028,
          lng: prepared.driver.lng - 0.01,
        },
        category: prepared.driver.category,
        method: "wave",
        serene: false,
        exclusiveDriverId: userId,
      })
      return driverDesk(userId)
    })
  }
  return withDb(async (sql) => {
    const offer = await sql.query<{ id: string }>(
      `select id from rides where offered_driver_id = $1 and status = 'matching' limit 1`,
      [userId],
    )
    const active = await sql.query<{ id: string }>(
      `select id from rides where driver_id = $1 and status in ('accepted','arrived','in_progress') order by created_at desc limit 1`,
      [userId],
    )
    if (action === "accept" || action === "decline") {
      if (!offer[0]) throw new ApiError("Cette demande n’est plus là.")
      const ride = await lockRide(sql, offer[0].id)
      if (!ride) throw new ApiError("Cette demande n’est plus là.")
      if (action === "decline") await dropOffer(sql, ride)
      else {
        const driver = await driverById(sql, userId)
        if (!driver) throw new ApiError("Profil chauffeur incomplet.")
        await acceptRide(sql, ride, driver)
      }
    } else if (action === "arrive" || action === "start" || action === "complete") {
      if (!active[0]) throw new ApiError("Aucune course en cours.")
      const ride = await lockRide(sql, active[0].id)
      if (!ride) throw new ApiError("Aucune course en cours.")
      if (action === "arrive") {
        await sql.query(`update rides set status = 'arrived', arrived_at = $2 where id = $1 and driver_id = $3`, [
          ride.id,
          now().toISOString(),
          userId,
        ])
      } else if (action === "start") {
        await sql.query(
          `update rides set status = 'in_progress', started_at = $2, arrived_at = coalesce(arrived_at, $2) where id = $1 and driver_id = $3`,
          [ride.id, now().toISOString(), userId],
        )
      } else if (action === "complete") {
        await settleRide(sql, ride)
      }
    } else {
      throw new ApiError("Action inconnue.")
    }
    return null
  }).then((result) => result ?? driverDesk(userId))
}

export async function searchCarpools(input: {
  userId: string
  origin: unknown
  destination: unknown
  date: string
  seats: number
}) {
  const origin = point(input.origin, "le départ")
  const destination = point(input.destination, "l’arrivée")
  const seats = Math.max(1, Math.min(6, Math.round(input.seats || 1)))
  return withDb(async (sql) => {
    await sweepCarpools(sql)
    const rows = await sql.query(
      `${CARPOOL_SELECT}
       where c.status = 'published' and c.seats_left >= $1
         and (c.depart_at at time zone 'Africa/Dakar')::date = $2::date
       order by c.depart_at asc`,
      [seats, input.date],
    )
    const urban = norm(origin.city) === "dakar" && norm(destination.city) === "dakar"
    const trips = rows
      .filter((row) => {
        const originOk =
          norm(text(row.origin_city)) === norm(origin.city) ||
          haversineKm(origin, { lat: num(row.origin_lat), lng: num(row.origin_lng) }) <= (urban ? 8 : 25)
        const destOk =
          norm(text(row.dest_city)) === norm(destination.city) ||
          haversineKm(destination, { lat: num(row.dest_lat), lng: num(row.dest_lng) }) <= (urban ? 8 : 30)
        if (urban) {
          return (
            haversineKm(origin, { lat: num(row.origin_lat), lng: num(row.origin_lng) }) <= 8 &&
            haversineKm(destination, { lat: num(row.dest_lat), lng: num(row.dest_lng) }) <= 8
          )
        }
        return originOk && destOk
      })
      .map((row) => carpoolOf(row, input.userId, null))
    return { seats, trips }
  })
}

export async function publishCarpool(input: {
  driverId: string
  origin: unknown
  destination: unknown
  departAt: string
  seats: number
  price: number
  notes: string
  amenities: string[]
  serene: boolean
}) {
  const origin = point(input.origin, "le départ")
  const destination = point(input.destination, "l’arrivée")
  const depart = new Date(input.departAt)
  if (Number.isNaN(depart.getTime()) || depart.getTime() < now().getTime() + 30 * 60 * 1000) {
    throw new ApiError("Le départ doit être au moins 30 minutes dans le futur.")
  }
  const measured = measureFallback(origin, destination)
  const suggestion = suggestSeatPrice(origin.city, destination.city, measured.distanceM / 1000)
  const band = priceBandError(input.price, suggestion)
  if (band) throw new ApiError(band)
  const amenities = input.amenities.filter((item) => AMENITIES.includes(item))
  return withDb(async (sql) => {
    const driver = await driverById(sql, input.driverId)
    if (!driver || driver.kyc !== "verified") {
      throw new ApiError("Publiez un départ une fois votre véhicule vérifié.")
    }
    const cap = driver.category === "van" ? 6 : 4
    const seats = Math.max(1, Math.min(cap, Math.round(input.seats)))
    if (driver.category === "jakarta") throw new ApiError("Le covoiturage se publie en voiture, pas en Jakarta.")
    const id = randomUUID()
    await sql.query(
      `insert into carpools (
        id, driver_id, origin_label, origin_city, origin_lat, origin_lng,
        dest_label, dest_city, dest_lat, dest_lng, depart_at, seats_total, seats_left,
        price_per_seat, notes, amenities_json, status, serene, distance_m, duration_s, demo
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15,'published',$16,$17,$18,false)`,
      [
        id,
        input.driverId,
        origin.label,
        origin.city,
        origin.lat,
        origin.lng,
        destination.label,
        destination.city,
        destination.lat,
        destination.lng,
        depart.toISOString(),
        seats,
        Math.round(input.price),
        input.notes.slice(0, 240),
        JSON.stringify(amenities),
        input.serene || driver.serene,
        measured.distanceM,
        measured.durationS,
      ],
    )
    return presentCarpool(sql, id, input.driverId)
  })
}

export async function getCarpool(id: string, userId: string) {
  return withDb(async (sql) => {
    await sweepCarpools(sql)
    return presentCarpool(sql, id, userId)
  })
}

export async function bookCarpool(input: { riderId: string; carpoolId: string; seats: number; method: string }) {
  const method = methodOf(input.method)
  const seats = Math.max(1, Math.round(input.seats))
  return withDb(async (sql) => {
    const rows = await sql.query(`select * from carpools where id = $1 for update`, [input.carpoolId])
    const trip = rows[0]
    if (!trip || text(trip.status) !== "published") throw new ApiError("Ce départ n’est plus ouvert.")
    if (text(trip.driver_id) === input.riderId) throw new ApiError("Vous ne pouvez pas réserver votre propre départ.")
    if (num(trip.seats_left) < seats) throw new ApiError("Plus assez de sièges sur ce départ.")
    const amount = num(trip.price_per_seat) * seats
    const commission = Math.round(amount * 0.1)
    const id = randomUUID()
    const updated = await sql.query(
      `update carpools set seats_left = seats_left - $2,
         status = case when seats_left - $2 = 0 then 'full' else status end
       where id = $1 and seats_left >= $2 and status = 'published'
       returning seats_left`,
      [input.carpoolId, seats],
    )
    if (!updated[0]) throw new ApiError("Plus assez de sièges sur ce départ.")
    await sql.query(
      `insert into bookings (id, carpool_id, rider_id, seats, amount_xof, commission_xof, driver_net_xof, status, payment_method, payment_ref)
       values ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,null)`,
      [id, input.carpoolId, input.riderId, seats, amount, commission, amount - commission, method],
    )
    const payment = await charge(sql, {
      userId: input.riderId,
      amount,
      method,
      type: "carpool_payment",
      bookingId: id,
    })
    await sql.query(`update bookings set payment_ref = $2 where id = $1`, [id, payment.reference])
    await notify(sql, text(trip.driver_id), "Siège réservé", `${seats} siège(s) confirmé(s).`, `/app/covoiturage/${input.carpoolId}`)
    await notify(sql, input.riderId, "Réservation confirmée", "Votre siège est tenu. Le départ ne dépend plus du remplissage.", `/app/covoiturage/${input.carpoolId}`)
    return presentCarpool(sql, input.carpoolId, input.riderId)
  })
}

export async function cancelBooking(userId: string, carpoolId: string) {
  return withDb(async (sql) => {
    const bookings = await sql.query(
      `select * from bookings where carpool_id = $1 and rider_id = $2 and status = 'confirmed' for update`,
      [carpoolId, userId],
    )
    const booking = bookings[0]
    if (!booking) throw new ApiError("Aucune réservation à annuler.")
    if (flag(booking.settled)) throw new ApiError("Ce trajet est déjà terminé.")
    const trips = await sql.query(`select depart_at, seats_left, status from carpools where id = $1 for update`, [carpoolId])
    const trip = trips[0]
    if (!trip) throw new ApiError("Départ introuvable.", 404)
    const rule = carpoolRefund(num(booking.amount_xof), new Date(text(trip.depart_at)), now())
    if (text(booking.payment_method) === "wallet" && rule.refund > 0) {
      await postTx(sql, {
        userId,
        amount: rule.refund,
        type: "refund",
        method: "wallet",
        affects: true,
        bookingId: text(booking.id),
      })
    } else if (rule.refund > 0) {
      await postTx(sql, {
        userId,
        amount: rule.refund,
        type: "refund",
        method: text(booking.payment_method),
        affects: false,
        bookingId: text(booking.id),
      })
    }
    await sql.query(`update bookings set status = 'cancelled', refund_xof = $2 where id = $1`, [booking.id, rule.refund])
    await sql.query(
      `update carpools set seats_left = seats_left + $2, status = case when status = 'full' then 'published' else status end where id = $1`,
      [carpoolId, num(booking.seats)],
    )
    return { message: rule.label, carpool: await presentCarpool(sql, carpoolId, userId) }
  })
}

export async function cancelCarpoolTrip(userId: string, carpoolId: string) {
  return withDb(async (sql) => {
    const trips = await sql.query(`select * from carpools where id = $1 for update`, [carpoolId])
    const trip = trips[0]
    if (!trip || text(trip.driver_id) !== userId) throw new ApiError("Départ introuvable.", 404)
    if (!["published", "full"].includes(text(trip.status))) throw new ApiError("Ce départ ne peut plus être annulé.")
    const bookings = await sql.query(`select * from bookings where carpool_id = $1 and status = 'confirmed'`, [carpoolId])
    for (const booking of bookings) {
      if (text(booking.payment_method) === "wallet") {
        await postTx(sql, {
          userId: text(booking.rider_id),
          amount: num(booking.amount_xof),
          type: "refund",
          method: "wallet",
          affects: true,
          bookingId: text(booking.id),
        })
      }
      await sql.query(`update bookings set status = 'cancelled', refund_xof = amount_xof where id = $1`, [booking.id])
      await notify(sql, text(booking.rider_id), "Départ annulé par le chauffeur", "Vous êtes remboursé intégralement.", "/app/activite")
    }
    await sql.query(`update carpools set status = 'cancelled' where id = $1`, [carpoolId])
    return presentCarpool(sql, carpoolId, userId)
  })
}

export async function activity(userId: string): Promise<ActivityDTO> {
  return withDb(async (sql) => {
    await sweepCarpools(sql)
    const rideIds = await sql.query<{ id: string }>(
      `select id from rides where rider_id = $1 or driver_id = $1 order by created_at desc limit 20`,
      [userId],
    )
    for (const row of rideIds) await applyRide(sql, row.id)
    const rides: RideDTO[] = []
    for (const row of rideIds) rides.push(await presentRide(sql, row.id, userId))
    const bookings = await sql.query(
      `select b.*, c.depart_at, c.origin_label, c.dest_label, c.id as carpool_id
       from bookings b join carpools c on c.id = b.carpool_id
       where b.rider_id = $1 order by b.created_at desc limit 20`,
      [userId],
    )
    const publishedRows = await sql.query(`${CARPOOL_SELECT} where c.driver_id = $1 order by c.depart_at desc limit 20`, [userId])
    return {
      rides,
      bookings: bookings.map((item) => ({
        id: text(item.id),
        seats: num(item.seats),
        amount: num(item.amount_xof),
        status: text(item.status),
        refund: num(item.refund_xof),
        departAt: iso(item.depart_at) ?? now().toISOString(),
        origin: text(item.origin_label),
        destination: text(item.dest_label),
        carpoolId: text(item.carpool_id),
      })),
      published: publishedRows.map((row) => carpoolOf(row, userId, null)),
    }
  })
}

export async function suggestPrice(origin: unknown, destination: unknown) {
  const from = point(origin, "le départ")
  const to = point(destination, "l’arrivée")
  const measured = (await import("@/lib/domain")).measureFallback(from, to)
  return {
    price: suggestSeatPrice(from.city, to.city, measured.distanceM / 1000),
    distanceM: measured.distanceM,
    durationS: measured.durationS,
  }
}
