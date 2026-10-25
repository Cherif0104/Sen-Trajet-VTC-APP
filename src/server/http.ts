import { connection } from "next/server"

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function handle(work: () => Promise<unknown>) {
  try {
    await connection()
    return Response.json(await work())
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      return Response.json({ error: error.message }, { status: 503 })
    }
    return Response.json(
      { error: "Une erreur est survenue. Réessayez dans un instant." },
      { status: 500 },
    )
  }
}
