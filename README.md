# Forge, coach muscu

Application web installable (PWA) d'entraînement : un programme de musculation personnalisé, des séances libres (cardio, abdos, muscu ciblée, superset) et un suivi des progrès.

## Fonctionnalités

**Programme** (onglets Aujourd'hui et Programme)
- Programme selon le poids, la taille, le niveau, l'objectif et le nombre de séances par semaine, renouvelé chaque semaine.
- Cycles de 4 semaines : accumulation, progression, intensification, récupération.
- Charges de départ estimées, puis ajustées séance après séance (double progression, conversion par le 1RM estimé quand la fourchette de reps change).
- Forme du jour (sommeil, cœur au repos, VFC via Apple Santé) : séance allégée si la récupération est insuffisante.
- Avertissement si un muscle de la séance a déjà été travaillé en séance libre il y a moins de 36 h.

**Séance libre** (onglet Libre), hors programme
- Cardio (15 min à 1 h 30) et abdos (15 à 30 min) : séances chronométrées selon le lieu (salle, maison, plein air, plage) et le matériel ; lecteur avec décompte et bips.
- Muscu ciblée : un muscle, découpé par zones (ex. haut / milieu / bas des pecs), séries à noter comme dans le programme.
- Superset : deux muscles en paires A/B, repos après la paire.
- Mêmes règles que le programme : pas de sauts pour les débutants, forme du jour, charges reprises de l'historique.

**Progrès** : poids de corps, records (1RM estimé), historique consultable, badges (régularité, records, lieux), série de semaines d'affilée.

**Partout** : photos départ / arrivée ou silhouettes animées, repères « Sentir / Ralentir / Bloquer » sur chaque exercice, minuteur de repos sonore, fonctionnement hors ligne.

## Données

- Stockées sur le téléphone (localStorage), et synchronisées avec un compte si l'utilisateur en crée un (Supabase : `js/config.js`, `supabase/schema.sql`). Chaque utilisateur ne voit que ses données (Row Level Security).
- Données de santé importées depuis Apple Santé via un raccourci iOS (`supabase/sante.sql`).
- Un seul identifiant par mouvement dans tous les volets (`js/ids.js` convertit les anciens identifiants de l'historique).

## Code

Aucun outil de build : HTML, CSS et JavaScript (modules ES).

| Fichier | Rôle |
|---|---|
| `js/app.js` | Écrans et navigation |
| `js/engine.js` | Moteur du programme (séances, charges, forme du jour) |
| `js/exercises.js` | Exercices du programme |
| `js/libre.js` | Générateur des séances libres cardio / abdos |
| `js/cible.js` | Muscu ciblée et superset (zones, exercices maison) |
| `js/coaching.js` | Repères Sentir / Ralentir / Bloquer |
| `js/stats.js` | Calculs partagés (séances, tonnage, records) |
| `js/rewards.js` | Badges et régularité |
| `js/sync.js` | Compte et synchronisation (Supabase) |
| `sw.js` | Cache hors ligne et mises à jour (incrémenter `CACHE` à chaque mise en ligne) |

Photos des exercices : [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense). Les exercices absents de cette base ont une silhouette animée maison (`media/anim/`).

## Tests

Aucune dépendance :

```
node --test
```

À lancer avant chaque mise en ligne : une erreur de calcul de charge ne se voit pas à l'écran, mais se sent à la salle.

## Mise en ligne

Chaque fusion dans `main` est publiée automatiquement (GitHub Pages). Les téléphones récupèrent la nouvelle version à l'ouverture suivante de l'appli.

À faire côté Supabase (tableau de bord) : serveur d'envoi d'emails personnalisé (sinon confirmation de compte et mot de passe oublié ne partent pas), URL du site dans *URL Configuration*, longueur minimale du mot de passe à 8.
