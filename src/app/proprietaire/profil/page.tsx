import { PasswordForm, ProfileForm } from "@/components/app/profile-forms";
import { Card, PageHeader } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getProfile } from "@/server/queries/profile";

export const metadata = { title: "Mon profil" };

export default async function OwnerProfilePage() {
  const user = await requireRole("proprietaire");
  const profile = await getProfile(user.id);
  return (
    <>
      <PageHeader title="Mon profil" description="Vos coordonnées de propriétaire partenaire." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Informations">
          <ProfileForm profile={profile} showCompany />
        </Card>
        <Card title="Sécurité">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
