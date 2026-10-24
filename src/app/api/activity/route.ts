import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { activity } from "@/server/services"

export async function GET() {
  return handle(async () => activity(await requireUserId()))
}
