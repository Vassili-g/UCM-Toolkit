# E4b. Échecs, ignorés et alias à écrire

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E4a, E3d.

Fichiers : `packages/plugin-architect/src/sandbox/structure.ts`, `packages/plugin-architect/src/ecriture/structure.ts`,
`packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.2 Chaque motif de saut a un texte (E-24). Une lecture qui lève, un catalogue `null` ou un refus de Figma ne disent plus « Rien à
  régler » (E-23).
- [ ] E4.3 Ignorer la proposition d'un constat de scopes range le constat sous Ignorés (E-21).
- [ ] E4.5 La correction `alias-de-mode` part à l'écriture (E-28).

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot. La galerie expose ses cartes et ses refus.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E4.2, motifs de saut (`motifDeSaut` de `packages/plugin-architect/src/ui/textes/structure.ts`) :
  - `occupe` : « Une autre écriture était en cours. Relancez Appliquer. »
  - `correction-inconnue` : « Cette correction ne correspond plus au fichier. Actualisez, puis recommencez. »
  - `non-pris-en-charge` : « Le plugin ne sait pas écrire cette correction. Faites-la dans la fenêtre Variables. »
  - `erreur` : « Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables. »
- E4.2, lecture en échec, à la place de « Rien à régler dans la fenêtre Variables de Figma. » :
  - lecture qui lève : « Le plugin n’a pas pu lire les variables du fichier. Actualisez pour relancer la lecture. »
  - catalogue `null` : « Le plugin n’a pas pu lire la library de tokens. Vérifiez-la dans la Configuration, puis actualisez. »
  - refus de Figma : « Figma a refusé la lecture des variables. Actualisez pour relancer la lecture. »

## Avancement

Pas commencé.
