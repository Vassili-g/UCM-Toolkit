---
name: publier-paquets
description: "Publier @ucm-kit/core, @ucm-kit/cli ou @ucm-kit/adapter-typescript sur npm après une montée de version. Charger dès qu'un numéro de version d'un de ces paquets change."
---

# Publier les paquets

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
