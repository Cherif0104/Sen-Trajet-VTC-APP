# SENTRAJET PREMIUM

Plateforme d'IMPULCIA AFRIQUE pour la marque **SENTRAJET PREMIUM — Executive Chauffeur & Mobility Services** (Sénégal, montants en FCFA).

Elle réunit dans une seule application Next.js :

- **Site public** : accueil, prestations, flotte, réservation et demande de devis, page « Devenir propriétaire », partenaires, FAQ, contact, mentions légales, SEO (sitemap, robots, métadonnées) et bouton WhatsApp.
- **Espace client** (`/espace`) : demandes, devis (PDF, acceptation ou refus), réservations, factures, notifications, profil particulier ou entreprise.
- **Espace propriétaire** (`/proprietaire`) : propositions de véhicules, documents, contrats, reversements.
- **Espace chauffeur** (`/chauffeur`) : missions affectées, démarrage et clôture avec kilométrage.
- **Back-office ERP/CRM** (`/admin`) : tableau de bord, demandes, devis, missions, clients, messages, véhicules, catégories, équipements, maintenance, chauffeurs, propriétaires et propositions, contrats, factures et paiements, finances et dépenses, rapports et exports (CSV, PDF), contenus du site, partenaires, témoignages, utilisateurs et rôles, paramètres, journal d'audit.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM, PostgreSQL (Supabase) en production, PGlite en local, pdf-lib pour les devis et factures, Resend pour les e-mails.

## Démarrer en local

```bash
npm install
npm run dev
```

L'application est servie sur http://localhost:43123.

Sans `DATABASE_URL`, une base PGlite est créée dans `.data/pglite`, migrée automatiquement et remplie de **données de démonstration** (clairement marquées « démo »). Elles ne sont jamais chargées en production.

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Super administrateur | admin@demo.sentrajet.sn | Demo2026! |
| Commercial | commercial@demo.sentrajet.sn | Demo2026! |
| Flotte | flotte@demo.sentrajet.sn | Demo2026! |
| Financier | finance@demo.sentrajet.sn | Demo2026! |
| Client particulier | client@demo.sentrajet.sn | Demo2026! |
| Client entreprise | entreprise@demo.sentrajet.sn | Demo2026! |
| Propriétaire | proprietaire@demo.sentrajet.sn | Demo2026! |
| Chauffeur | chauffeur@demo.sentrajet.sn | Demo2026! |

Réinitialiser la base locale : `npm run db:reset-local`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (port 43123) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest (base PGlite en mémoire) |
| `npm run db:generate` | Génère une migration après modification de `src/server/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations sur `DATABASE_URL`, active le RLS et crée le super administrateur |

## Variables d'environnement

Voir [`.env.example`](.env.example). En production, renseigner au minimum `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD`. Le build Vercel (`npm run vercel-build`) applique les migrations avant `next build`.

## Sécurité

- Les permissions sont vérifiées côté serveur dans chaque page, Server Action et route API (`src/lib/permissions.ts`, `src/server/auth.ts`). Masquer un bouton n'accorde ni ne retire jamais un droit.
- Sessions par cookie HTTP-only, mots de passe hachés avec scrypt.
- Fichiers stockés en base et servis après contrôle d'accès (`/api/files/[id]`).
- Tables Supabase verrouillées : RLS activé sans politique, droits retirés aux rôles `anon` et `authenticated`. Seul le serveur accède aux données.
- Actions sensibles tracées dans le journal d'audit. Exports CSV protégés contre l'injection de formules.

## Contenus à fournir avant la mise en ligne commerciale

Le site n'affiche aucune information inventée. Ces éléments se saisissent dans le back-office (Contenus, Paramètres, Véhicules, Partenaires) :

- logo officiel, NINEA, RCCM, adresse, textes légaux (mentions, CGV, confidentialité) ;
- tarifs validés par véhicule (sans tarif, le site affiche « sur devis ») ;
- caractéristiques réelles et photos des véhicules ;
- chiffres clés réels (masqués tant qu'ils sont vides) ;
- partenaires, avec autorisation écrite d'utiliser leur nom et leur logo ;
- clé Resend et domaine d'envoi vérifié pour les e-mails.
