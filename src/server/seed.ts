import { randomUUID } from "node:crypto"
import { DEMO_ACCOUNTS } from "@/lib/demo"
import { CATEGORIES, measureFallback, type CategoryId } from "@/lib/domain"
import { placeById } from "@/lib/places"
import { hashPassword } from "@/server/password"
import { num, type Sql } from "@/server/sql"

const botPassword = hashPassword(randomUUID())

type Person = {
  email: string
  password: string
  name: string
  phone: string
  balance: number
  rating?: number
  ratingCount?: number
  tripCount?: number
}

async function ensureUser(sql: Sql, person: Person) {
  const existing = await sql.query<{ id: string }>(`select id from users where email = $1`, [
    person.email,
  ])
  if (existing[0]) return existing[0].id
  const id = randomUUID()
  const password =
    person.password === "bot" ? botPassword : hashPassword(person.password)
  await sql.query(
    `insert into users (id, email, password_hash, password_salt, name, phone, rating, rating_count, trip_count)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      person.email,
      password.hash,
      password.salt,
      person.name,
      person.phone,
      person.rating ?? 5,
      person.ratingCount ?? 0,
      person.tripCount ?? 0,
    ],
  )
  await sql.query(`insert into wallets (user_id, balance_xof) values ($1,$2)`, [id, person.balance])
  if (person.balance > 0) {
    await sql.query(
      `insert into transactions (id, user_id, amount_xof, type, method, status, reference, affects_balance)
       values ($1,$2,$3,'welcome','wallet','paid',$4,true)`,
      [randomUUID(), id, person.balance, "BIENVENUE"],
    )
  }
  return id
}

async function ensureAdmin(sql: Sql) {
  const email = "ops@sentrajet.sn"
  const id = await ensureUser(sql, {
    email,
    password: "SenTrajet2026!",
    name: "Ops Sen Trajet",
    phone: "+221770000001",
    balance: 0,
  })
  await sql.query(`update users set role = 'admin' where id = $1`, [id])
}

async function ensureDriver(
  sql: Sql,
  input: {
    email: string
    category: CategoryId
    make: string
    model: string
    color: string
    plate: string
    place: string
    serene: boolean
    online: boolean
    acceptance: number
  },
) {
  const rows = await sql.query<{ id: string }>(`select id from users where email = $1`, [input.email])
  const userId = rows[0]?.id
  if (!userId) return
  const existing = await sql.query(`select user_id from drivers where user_id = $1`, [userId])
  if (existing[0]) return
  const place = placeById(input.place)
  if (!place) return
  await sql.query(
    `insert into drivers (
      user_id, category, make, model, color, plate, seats, serene, online, busy,
      lat, lng, home_lat, home_lng, kyc, bot, acceptance
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10,$11,$10,$11,'verified',$12,$13)`,
    [
      userId,
      input.category,
      input.make,
      input.model,
      input.color,
      input.plate,
      CATEGORIES[input.category].seats,
      input.serene,
      input.online,
      place.lat,
      place.lng,
      input.email !== DEMO_ACCOUNTS.driver.email,
      input.acceptance,
    ],
  )
}

function stamp(days: number, hour: number, minute: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  date.setUTCHours(hour, minute, 0, 0)
  if (date.getTime() < Date.now() + 45 * 60 * 1000) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

export async function ensureSeed(sql: Sql) {
  await ensureUser(sql, {
    email: DEMO_ACCOUNTS.rider.email,
    password: DEMO_ACCOUNTS.rider.password,
    name: DEMO_ACCOUNTS.rider.name,
    phone: "+221771112233",
    balance: 15000,
    rating: 4.9,
    ratingCount: 18,
    tripCount: 22,
  })
  await ensureUser(sql, {
    email: DEMO_ACCOUNTS.driver.email,
    password: DEMO_ACCOUNTS.driver.password,
    name: DEMO_ACCOUNTS.driver.name,
    phone: "+221775556677",
    balance: 8000,
    rating: 4.8,
    ratingCount: 64,
    tripCount: 210,
  })
  await ensureUser(sql, {
    email: "bineta.sarr@yoon.sn",
    password: "bot",
    name: "Bineta Sarr",
    phone: "+221770000001",
    balance: 80000,
    rating: 4.7,
    ratingCount: 9,
  })

  const fleet: Parameters<typeof ensureDriver>[1][] = [
    { email: "aissatou.diallo@yoon.sn", category: "eco", make: "Kia", model: "Rio", color: "Blanc", plate: "DK 3182 BF", place: "mermoz", serene: true, online: true, acceptance: 0.97 },
    { email: "ibrahima.fall@yoon.sn", category: "confort", make: "Mercedes", model: "C180", color: "Noir", plate: "DK 9044 AA", place: "independance", serene: false, online: true, acceptance: 0.94 },
    { email: "mariama.sow@yoon.sn", category: "jakarta", make: "Jakarta", model: "RX", color: "Rouge", plate: "DK 2210 JK", place: "ouakam", serene: true, online: true, acceptance: 0.98 },
    { email: "omar.ba@yoon.sn", category: "van", make: "Toyota", model: "Hiace", color: "Blanc", plate: "DK 1187 TH", place: "baux", serene: false, online: true, acceptance: 0.91 },
    { email: "cheikh.ndiaye@yoon.sn", category: "eco", make: "Hyundai", model: "i10", color: "Gris", plate: "DK 6402 PK", place: "pikine", serene: false, online: true, acceptance: 0.9 },
    { email: "ndeye.faye@yoon.sn", category: "confort", make: "Toyota", model: "Corolla", color: "Noire", plate: "DK 7721 AL", place: "almadies", serene: true, online: true, acceptance: 0.96 },
    { email: "papa.ndiaye@yoon.sn", category: "van", make: "Toyota", model: "Hiace", color: "Bleu", plate: "DK 1502 DS", place: "aibd", serene: false, online: true, acceptance: 0.93 },
    { email: "fatou.sall@yoon.sn", category: "jakarta", make: "Jakarta", model: "CRF", color: "Bleu", plate: "DK 4419 GY", place: "grand-yoff", serene: true, online: true, acceptance: 0.95 },
    { email: "abdoulaye.gueye@yoon.sn", category: "eco", make: "Dacia", model: "Logan", color: "Argent", plate: "DK 5560 LB", place: "liberte6", serene: false, online: true, acceptance: 0.92 },
  ]

  for (const driver of fleet) {
    await ensureUser(sql, {
      email: driver.email,
      password: "bot",
      name: driver.email
        .split("@")[0]
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
        .replace("Ndeye", "Ndèye"),
      phone: "+221770000099",
      balance: 0,
      rating: 4.8,
      ratingCount: 40,
      tripCount: 120,
    })
    await ensureDriver(sql, driver)
  }

  await ensureDriver(sql, {
    email: DEMO_ACCOUNTS.driver.email,
    category: "eco",
    make: "Hyundai",
    model: "Grand i10",
    color: "Blanc",
    plate: "DK 2026 SN",
    place: "sacre-coeur",
    serene: false,
    online: false,
    acceptance: 0.96,
  })

  await ensureAdmin(sql)

  const supply = await sql.query<{ n: number }>(
    `select count(*)::int as n from carpools where demo = true and status in ('published','full') and depart_at > now()`,
  )
  if (num(supply[0]?.n) >= 4) return

  const trips: {
    email: string
    origin: string
    dest: string
    days: number
    hour: number
    minute: number
    seats: number
    left: number
    price: number
    amenities: string[]
    notes: string
    serene?: boolean
  }[] = [
    { email: "omar.ba@yoon.sn", origin: "baux", dest: "thies", days: 1, hour: 7, minute: 30, seats: 6, left: 4, price: 2000, amenities: ["clim", "bagage"], notes: "Départ à l’heure, même si le véhicule n’est pas plein." },
    { email: "cheikh.ndiaye@yoon.sn", origin: "pikine", dest: "independance", days: 1, hour: 7, minute: 0, seats: 3, left: 2, price: 700, amenities: ["clim"], notes: "Trajet boulot. Deux arrêts maximum." },
    { email: "ndeye.faye@yoon.sn", origin: "almadies", dest: "ucad", days: 1, hour: 8, minute: 15, seats: 3, left: 2, price: 1000, amenities: ["clim", "non_fumeur"], notes: "Programme Sérénité. Départ pile.", serene: true },
    { email: "ibrahima.fall@yoon.sn", origin: "mermoz", dest: "mbour", days: 1, hour: 15, minute: 0, seats: 3, left: 3, price: 2500, amenities: ["clim", "bagage"], notes: "Saly et Mbour, climatisée." },
    { email: "papa.ndiaye@yoon.sn", origin: "baux", dest: "touba", days: 2, hour: 6, minute: 0, seats: 6, left: 5, price: 5000, amenities: ["clim", "bagage"], notes: "Sept places. Une valise par personne." },
    { email: "omar.ba@yoon.sn", origin: "baux", dest: "saint-louis", days: 2, hour: 8, minute: 0, seats: 6, left: 4, price: 6000, amenities: ["clim", "bagage"], notes: "Pause à Louga si besoin." },
    { email: DEMO_ACCOUNTS.driver.email, origin: "mermoz", dest: "independance", days: 1, hour: 8, minute: 45, seats: 3, left: 3, price: 750, amenities: ["clim"], notes: "Je pars à l’heure du bureau." },
  ]

  for (const trip of trips) {
    const origin = placeById(trip.origin)
    const destination = placeById(trip.dest)
    const driver = await sql.query<{ id: string }>(`select id from users where email = $1`, [trip.email])
    if (!origin || !destination || !driver[0]) continue
    const measured = measureFallback(origin, destination)
    await sql.query(
      `insert into carpools (
        id, driver_id, origin_label, origin_city, origin_lat, origin_lng,
        dest_label, dest_city, dest_lat, dest_lng, depart_at, seats_total, seats_left,
        price_per_seat, notes, amenities_json, status, serene, distance_m, duration_s, demo
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published',$17,$18,$19,true)`,
      [
        randomUUID(),
        driver[0].id,
        origin.label,
        origin.city,
        origin.lat,
        origin.lng,
        destination.label,
        destination.city,
        destination.lat,
        destination.lng,
        stamp(trip.days, trip.hour, trip.minute),
        trip.seats,
        trip.left,
        trip.price,
        trip.notes,
        JSON.stringify(trip.amenities),
        Boolean(trip.serene),
        measured.distanceM,
        measured.durationS,
      ],
    )
  }
}
