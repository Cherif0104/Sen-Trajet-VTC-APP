import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function getProfile(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({
      fullName: schema.users.fullName,
      email: schema.users.email,
      phone: schema.users.phone,
      companyName: schema.users.companyName,
      jobTitle: schema.users.jobTitle,
      address: schema.users.address,
      city: schema.users.city,
      accountType: schema.users.accountType,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return u;
}
