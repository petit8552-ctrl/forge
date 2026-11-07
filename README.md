# Forge, coach muscu

Application web installable (PWA) de musculation : programme personnalisé selon le poids, la taille, le niveau, l'objectif et le nombre de séances par semaine, renouvelé chaque semaine.

- Cycles de 4 semaines : accumulation, progression, intensification, récupération.
- Exercices principaux changés à chaque cycle, accessoires chaque semaine, techniques d'intensité tournantes.
- Charges de départ estimées à partir du poids, puis ajustées selon les séances notées.
- Bilan calories, macros et hydratation.
- Photos départ / arrivée pour chaque exercice et lien vers des vidéos.
- Données stockées uniquement sur le téléphone (localStorage).

Aucun outil de build : HTML, CSS et JavaScript (modules ES).

Photos des exercices : [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense).

## Tests

Le moteur de coaching (charges, choix des exercices) et la fusion téléphone / compte sont couverts par des tests, sans aucune dépendance :

```
node --test
```

À lancer avant chaque mise en ligne : une erreur de calcul de charge ne se voit pas à l'écran, mais se sent à la salle.
