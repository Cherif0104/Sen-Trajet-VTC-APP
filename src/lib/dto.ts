import type { CategoryId, PayMethod } from "@/lib/domain"
import type { GeoPoint } from "@/lib/places"

export type PublicDriver = {
  category: CategoryId
  make: string
  model: string
  color: string
  plate: string
  seats: number
  serene: boolean
  online: boolean
  launchFleet: boolean
  rating: number
}

export type TransactionDTO = {
  id: string
  amount: number
  type: string
  method: string | null
  status: string
  reference: string | null
  createdAt: string
  affectsBalance: boolean
}

export type NotificationDTO = {
  id: string
  title: string
  body: string
  href: string | null
  read: boolean
  createdAt: string
}

export type MeDTO = {
  id: string
  email: string
  name: string
  phone: string
  rating: number
  ratingCount: number
  tripCount: number
  balance: number
  driver: PublicDriver | null
  transactions: TransactionDTO[]
  notifications: NotificationDTO[]
  unread: number
  activeRideId: string | null
}

export type RideDriverDTO = {
  id: string
  name: string
  rating: number
  phone: string | null
  plate: string
  make: string
  model: string
  color: string
  category: CategoryId
  serene: boolean
  launchFleet: boolean
}

export type RideDTO = {
  id: string
  status: string
  category: CategoryId
  serene: boolean
  pickup: GeoPoint
  dropoff: GeoPoint
  route: [number, number][]
  distanceM: number
  durationS: number
  fare: number
  surge: number
  surgeLabel: string | null
  paymentMethod: PayMethod
  paymentStatus: string
  paymentRef: string | null
  createdAt: string
  acceptedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  completedAt: string | null
  approachS: number
  tripMotionS: number
  progress: number
  etaS: number | null
  driverPoint: { lat: number; lng: number } | null
  driver: RideDriverDTO | null
  rider: { id: string; name: string; rating: number; phone: string | null }
  riderScore: number | null
  driverScore: number | null
  riderComment: string | null
  cancelReason: string | null
  cancelledBy: string | null
  net: number | null
  offerExpiresAt: string | null
  viewer: "rider" | "driver" | "other"
}

export type CarpoolDTO = {
  id: string
  driver: {
    id: string
    name: string
    rating: number
    ratingCount: number
    plate: string
    make: string
    model: string
    color: string
    serene: boolean
    launchFleet: boolean
  }
  origin: GeoPoint
  destination: GeoPoint
  departAt: string
  seatsTotal: number
  seatsLeft: number
  pricePerSeat: number
  notes: string
  amenities: string[]
  status: string
  serene: boolean
  distanceM: number
  durationS: number
  mine: boolean
  booking: { id: string; seats: number; amount: number; status: string; refund: number } | null
}

export type ActivityDTO = {
  rides: RideDTO[]
  bookings: {
    id: string
    seats: number
    amount: number
    status: string
    refund: number
    departAt: string
    origin: string
    destination: string
    carpoolId: string
  }[]
  published: CarpoolDTO[]
}
