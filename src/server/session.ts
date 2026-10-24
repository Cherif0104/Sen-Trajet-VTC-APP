import { cookies } from "next/headers"
import { ApiError } from "@/server/http"
import { readSession, signSession } from "@/server/token"

const NAME = "yoon_session"

export async function currentUserId() {
  const jar = await cookies()
  return readSession(jar.get(NAME)?.value)
}

export async function requireUserId() {
  const userId = await currentUserId()
  if (!userId) throw new ApiError("Connectez-vous pour continuer.", 401)
  return userId
}

export async function setSession(userId: string) {
  const jar = await cookies()
  jar.set(NAME, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(NAME)
}
