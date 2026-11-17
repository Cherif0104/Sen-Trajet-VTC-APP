import { PasswordForm, ProfileForm, TestimonialForm } from "@/components/app/profile-forms";
import { Card, PageHeader } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getProfile } from "@/server/queries/profile";
import { accountTypeLabel } from "@/lib/domain";

export const metadata = { title: "Mon profil" };

export default async function ClientProfilePage() {
  const user = await requireRole("client");
  const profile = await getProfile(user.id);
  return (
    <>
      <PageHeader title="Mon profil" description={`Compte ${accountTypeLabel(profile.accountType).toLowerCase()}`} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Informations personnelles">
          <ProfileForm profile={profile} showCompany={profile.accountType !== "particulier"} />
        </Card>
        <div className="space-y-6">
          <Card title="Sécurité">
            <PasswordForm />
          </Card>
          <Card title="Laisser un avis">
            <p className="mb-4 text-sm text-muted-foreground">Votre témoignage est publié sur le site après validation par notre équipe.</p>
            <TestimonialForm />
          </Card>
        </div>
      </div>
    </>
  );
}
