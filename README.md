# Sen Trajet

Courses immédiates et sièges réservés, pour le Sénégal. Le prix en francs CFA est calculé avant la confirmation, le dispatch et les remboursements tournent sans validation manuelle.

Sen Trajet : *sen* pour le Sénégal, *trajet* pour la route. La promesse : *la route, sans négocier au feu.*

## Lancer

```bash
npm install
npm run dev
```

L’application écoute sur [http://127.0.0.1:43123](http://127.0.0.1:43123). L’ouverture est un écran : créer un compte, ou se connecter.

Comptes gardés pour les tests, mot de passe `Yoon2026!` (ils ne sont plus proposés à l’écran) :

| Rôle | E-mail |
| --- | --- |
| Passagère | awa.ndiaye@yoon.sn |
| Chauffeur | moussa.diop@yoon.sn |

Exploitation : `ops@sentrajet.sn`, mot de passe `SenTrajet2026!`. Le lien n’apparaît que sur ce compte.

Awa a 15 000 F de crédit. Moussa est chauffeur Éco, hors ligne, Hyundai Grand i10, plaque DK 2026 SN. Une course sans chauffeur humain reste en recherche : personne n’est inventé.

## Ce que fait le produit

- **Course** : Éco, Confort, Confort+. Le prix est affiché avant de monter. Jakarta (livraison et moto) et le van ne sont pas dans le choix passager.
- **Covoiturage** : le chauffeur publie un départ, les passagers réservent un siège. Les départs marqués démo ne sortent plus dans la recherche.
- **Trajet Serein** : conductrice uniquement. S’il n’y en a pas, la course est refusée.
- **Paiement** : solde et espèces. Wave, Orange Money et Free Money affichent « Bientôt » et ne sont pas encaissés.
- **Commission** : 12 % sur Éco, Confort et Confort+, 10 % sur le Jakarta (moteur) et le covoiturage.
- **Chauffeur** : un nouveau dossier reste en revue tant qu’un admin ne le valide pas. Hors ligne tant que ce n’est pas fait.

## Données

Sans `DATABASE_URL`, les données vivent dans `data/pglite` (ignoré par git). Le schéma `src/server/schema.sql` s’applique au démarrage.

Les villes des 14 régions sont dans `src/data/senegal-lieux.json` (25 octobre 2026). Limites régionales : geoBoundaries SEN-ADM1, millésime 2019, OCHA et Gouvernement du Sénégal, mise à jour du 19 janvier 2023. Lieux : GeoNames SN, chefs-lieux et localités d’au moins 5 000 habitants. La recherche les place devant Photon et Nominatim. Le catalogue de rues de Dakar ne sert que si les deux géocodeurs échouent.

Pour Supabase ou un Postgres de VPS :

```bash
DATABASE_URL="postgresql://..." AUTH_SECRET="un-secret-long" npm run dev
```

Sur Vercel, ces deux variables sont obligatoires : une fonction serverless ne conserve pas le fichier PGlite d’une instance à l’autre. Sans `DATABASE_URL`, l’API répond que le Postgres dédié manque. Utilisez la chaîne de connexion en mode transaction (`prepare: false` est déjà réglé). Les politiques RLS sont activées sans policy pour le rôle anonyme : seul le serveur, avec l’utilisateur propriétaire, lit et écrit.

Un nom de domaine n’est pas nécessaire pour une première version, ni pour un essai sur Vercel, ni pour préparer une fiche Play Store : le magasin identifie l’application par son nom de paquet. Un domaine sert plus tard aux liens, aux e-mails et au site. Un VPS n’est pas nécessaire non plus. Vercel sert l’application. Le seul service à ajouter est un Postgres neuf (Neon, ou un projet Supabase créé pour Sen Trajet). Le projet Supabase déjà nommé SEN TRAJET ne doit pas être réutilisé.

L’espace admin enregistre la grille (base, kilomètre, commission, forfait aéroport, prix des sièges). L’espace client peut passer un compte en entreprise et ouvrir ou fermer course, sièges, lieux, facture, plafond et Trajet Serein.

## Ce qu’un acheteur peut voir, et ce qui reste simulé

Une course et un siège se déroulent de bout en bout : prix verrouillé, recherche d’un chauffeur, portefeuille, commission, annulation, remboursement. Les écritures du solde sont de vraies lignes.

Wave, Orange Money et Free Money ne débitent personne et ne se confirment plus tout seuls. Les comptes `awa.ndiaye@yoon.sn` et `moussa.diop@yoon.sn` restent des comptes de test.

Les commissions en vigueur sont celles du code : 12 % pour Éco, Confort et Confort+, 10 % pour le Jakarta et le covoiturage. Le projet Supabase déjà nommé SEN TRAJET n’est pas la base de cette application. Un déploiement durable attend un `DATABASE_URL` dédié.

## Scripts

```bash
npm test
npm run lint
npm run build
```
