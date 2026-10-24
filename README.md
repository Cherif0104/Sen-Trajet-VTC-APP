# Sen Trajet

Courses immédiates et sièges réservés, pour le Sénégal. Le prix en francs CFA est calculé avant la confirmation, le dispatch et les remboursements tournent sans validation manuelle.

Sen Trajet : *sen* pour le Sénégal, *trajet* pour la route. La promesse : *la route, sans négocier au feu.*

## Lancer

```bash
npm install
npm run dev
```

L’application écoute sur [http://127.0.0.1:43123](http://127.0.0.1:43123).

Comptes de démonstration, mot de passe `Yoon2026!` :

| Rôle | E-mail |
| --- | --- |
| Passagère | awa.ndiaye@yoon.sn |
| Chauffeur | moussa.diop@yoon.sn |

Awa a 15 000 F de crédit. Moussa est chauffeur Éco, hors ligne, Hyundai Grand i10, plaque DK 2026 SN, basé à Sacré-Cœur. Un réseau de chauffeurs de démonstration est déjà en ligne pour qu’une course se termine en environ une minute.

## Ce que fait le produit

- **Course** : Jakarta, Éco, Confort, 7 places. Affectation automatique du chauffeur libre le plus proche. Un indépendant en ligne passe devant le réseau de démonstration.
- **Covoiturage** : le chauffeur publie un départ, les passagers réservent un ou plusieurs sièges. Le départ est maintenu même si le véhicule n’est pas plein.
- **Trajet Serein** : conductrice uniquement. S’il n’y en a pas, la course est refusée au lieu d’être réassignée en silence.
- **Paiement** : Wave, Orange Money, Free Money, portefeuille Sen Trajet, espèces. En pré-production, le mobile money se confirme sans débit réel. Le portefeuille, lui, est débité et recrédité pour de vrai dans la base.
- **Commission** : 12 % sur Éco, Confort et 7 places, 10 % sur le Jakarta et le covoiturage. Le net est montré au chauffeur avant d’accepter.
- **Vérification chauffeur** : mobile sénégalais et plaque du type `DK 1234 AB`. Une note sous 3,8 après six évaluations bloque la mise en ligne.

## Données

Sans `DATABASE_URL`, les données vivent dans `data/pglite` (ignoré par git). Le schéma `src/server/schema.sql` s’applique au démarrage.

Pour Supabase ou un Postgres de VPS :

```bash
DATABASE_URL="postgresql://..." AUTH_SECRET="un-secret-long" npm run dev
```

Sur Vercel, ces deux variables sont obligatoires : une fonction serverless ne conserve pas le fichier PGlite d’une instance à l’autre. Utilisez la chaîne de connexion en mode transaction (`prepare: false` est déjà réglé). Les politiques RLS sont activées sans policy pour le rôle anonyme : seul le serveur, avec l’utilisateur propriétaire, lit et écrit.

## Scripts

```bash
npm test
npm run lint
npm run build
```
