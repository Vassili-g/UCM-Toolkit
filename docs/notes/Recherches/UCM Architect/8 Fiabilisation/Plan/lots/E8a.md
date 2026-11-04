# E8a. Icônes du composant

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E7b, E1b.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E8.1 Icône (Q-F6-1, option A). C66 contrôle que l'icône est une instance d'`Icon`, que son remplissage suit le token de premier
  plan du composant (`button/color/primary/solid/foreground`), et que sa propriété `Size` suit la taille du variant. Les textes « Liez-la
  à une taille de layout/icon » changent.
- [ ] E8.2 Les `strokes` d'une icône à tracé tiennent lieu de couleur sans fill visible. C17 y admet `icon` ou `foreground` (Q-F6-5).
- [ ] E8.5 Un slot sans mot d'icône n'est pas une icône, et C67 ne le compte pas (Q-F6-4).
- [ ] E8.6 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E8.1. Ces textes remplacent `iconeSansLibrary`, `iconeSansTaille`, `iconeTailleHorsIcon` et `iconeTailleStatut` de `packages/plugin-architect/src/ui/textes/ignores.ts` :
  - pas une instance d'Icon : « L’icône n’est pas une instance du composant Icon. » Statut : « Remplacez-la par une instance d’Icon ».
  - couleur : `La couleur de l’icône est liée à \`${token}\`. Le composant prévoit \`${attendu}\`.` Statut : `Liez-la à \`${attendu}\``. Sans token : « La couleur de l’icône n’a pas de token. », même statut.
  - taille : `La propriété Size de l’icône vaut ${valeur}. Le variant est en ${taille}.` Statut : `Réglez Size sur ${taille}`.
- E8.2. Le statut de couleur garde « Liez-la à un token icon ou foreground ».

## Avancement

Pas commencé.
