---
name: publier-paquets
description: "Publier @ucm-kit/core, @ucm-kit/cli ou @ucm-kit/adapter-typescript sur npm après une montée de version. Charger dès qu'un numéro de version d'un de ces paquets change."
---

# Publier les paquets

- **Verrou P27.** Ne publier ni `@ucm-kit/core`, ni `@ucm-kit/cli`, ni `@ucm-kit/adapter-typescript` tant que cette puce existe : `main` porte un travail de P27 non publié (`docs/notes/Recherches/Parametres partages/PLAN-CORRECTIONS-P27.md`). Rendre la question au mainteneur. La case 11.3 du plan la retire.
- **Monter un numéro de version ne publie rien.** `publish.yml` se déclenche à la main, un paquet par exécution :

```sh
gh workflow run publish.yml -f paquet="@ucm-kit/core"
gh workflow run publish.yml -f paquet="@ucm-kit/cli"
gh workflow run publish.yml -f paquet="@ucm-kit/adapter-typescript"
```

- **L'agent lance ces commandes lui-même.** Publier termine le geste qui monte un numéro. Rendre la main au mainteneur pour cette seule étape laisse le registre en retard sur les documents, qui épinglent déjà la version montée.
- **Attendre la fin de chaque exécution avant la suivante :** `gh run watch <id>`.
- **Le noyau part le premier.** `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` épinglent `@ucm-kit/core` à l'exact ; l'ordre compte quand plusieurs paquets montent ensemble.
- **Une exécution intermédiaire finit rouge, par construction.** `scripts/pins-servis.mjs` tourne après la publication et exige que toutes les versions épinglées par la documentation soient servies ; tant qu'un paquet de la série n'est pas parti, son pin manque. Seule la dernière exécution passe au vert.
- **Le paquet publié se constate par `npm view <paquet>@<version> version`,** jamais par la couleur du run.
- **Une version ne se publie qu'une fois.** Relancer sans monter le numéro rend 409, comportement voulu.

## Quel chiffre monter

- **Le kit monte le chiffre du milieu (0.17.0 vers 0.18.0) quand la prise `@ucm-kit/core/modules` casse ou que le format change, le dernier chiffre pour tout le reste.** Casse : nom retiré ou renommé, signature changée, résultat différent pour la même entrée. Format : nouvelle majeure de `CONTRACT_VERSION`, nouvelle `TOKENS_FORMAT_VERSION`. Ajout d'un nom, dépréciation et changement interne : dernier chiffre. `packages/kit/tests/apiPublique.test.mjs` refuse un chiffre du milieu qui ne monte pas. Règles : `packages/kit/invariants/versionnage.md`.
- **Le journal `packages/kit/CHANGELOG.md` s'écrit avant de monter, pour tout changement de la prise** : `ajout`, `déprécié` ou `rupture`, avec « Décidé par ... ». Un changement interne n'y figure pas. Une montée du chiffre du milieu pour le format renvoie à `docs/format/CHANGELOG-FORMAT.md`. Le test nomme l'entrée qui manque.
- **L'agent ne décide ni d'un ajout, ni d'une dépréciation, ni d'une rupture de la prise** : il rend la question au mainteneur.
- **`@ucm-kit/cli` et `@ucm-kit/adapter-typescript` montent leur dernier chiffre à chaque nouveau kit qu'ils épinglent.** Ils épinglent la même version exacte du kit ; un module en épingle la même.
