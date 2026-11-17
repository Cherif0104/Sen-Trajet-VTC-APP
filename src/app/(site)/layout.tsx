import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { homeFor } from "@/lib/permissions";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <>
      <SiteHeader
        logoUrl={settings.branding.logoUrl}
        phone={settings.company.phone}
        account={user ? { name: user.fullName, href: homeFor(user.role) } : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppButton number={settings.company.whatsapp} />
    </>
  );
}
