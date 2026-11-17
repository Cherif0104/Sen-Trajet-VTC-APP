import { PageHero } from "./blocks";

export function LegalPage({
  title,
  content,
  facts,
  children,
}: {
  title: string;
  content: string;
  facts?: [string, string][];
  children?: React.ReactNode;
}) {
  const shownFacts = (facts ?? []).filter(([, v]) => v);
  return (
    <>
      <PageHero title={title} />
      <section className="bg-white py-14 md:py-20">
        <div className="container-page max-w-3xl space-y-10">
          {shownFacts.length > 0 && (
            <dl className="divide-y divide-border rounded-2xl border border-border">
              {shownFacts.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[200px_1fr]">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {content ? (
            <div className="space-y-4 leading-relaxed whitespace-pre-line text-graphite/90">{content}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gold/50 bg-accent p-6 text-sm text-graphite">
              Le texte complet de cette page est en cours de validation par IMPULCIA AFRIQUE et sera publié prochainement. Pour toute question,
              contactez-nous au numéro indiqué en bas de page.
            </div>
          )}
          {children}
        </div>
      </section>
    </>
  );
}
