"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/client"
import type { MeDTO } from "@/lib/dto"

export function useMe() {
  const router = useRouter()
  const [me, setMe] = useState<MeDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const next = await api<MeDTO>("/api/me")
      setMe(next)
      setError(null)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Erreur"
      if (message.toLowerCase().includes("connectez-vous")) router.replace("/connexion")
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  return { me, loading, error, reload }
}
