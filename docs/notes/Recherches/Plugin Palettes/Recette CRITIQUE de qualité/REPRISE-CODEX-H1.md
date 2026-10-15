# Reprise Codex : onglet Harmonisation

## Fichiers créés

- `packages/plugin-palettes/src/harmonisation.ts` : état sans DOM et transitions
  par identifiant de palette.
- `packages/plugin-palettes/src/ui/ongletHarmonisation.ts` : en-tête, choix
  d'intensité et de thème, ligne fixe et compteur de paires.
- `packages/plugin-palettes/tests/harmonisation.test.ts` : sept tests de l'état.
- Ce fichier de reprise.

## Fichiers modifiés

- `packages/plugin-palettes/src/ui/index.ts` : insertion entre Vérification et
  Gestion, disponibilité selon le nombre de palettes, panneau et inertie
  pendant le dessin.
- `packages/plugin-palettes/src/ui/styles.css` : en-tête à 8 px d'écart,
  titre poussé à gauche, libellés vides masqués, ligne sans bouton.
- `packages/plugin-palettes/src/i18n/fr.ts` et `en.ts` : nom de l'onglet,
  nom accessible de l'intensité et bilan au singulier ou au pluriel.
- `packages/plugin-palettes/galerie/etats.cjs` et `build-galerie.cjs` : état
  `harmonisation-arrivee`, recette du mainteneur lue depuis la référence
  existante et passage dans les quatre galeries.
- `packages/plugin-palettes/tests/interface/interface.test.mjs` : cinq tests
  `[UI-39]`, navigation principale nommée et inertie d'Harmonisation.
- `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md` :
  clause `[UI-39]` dans la section Harmonisation déjà présente après Vérification.

## Comportement

Les choix d'Harmonisation restent dans la session. Cocher conserve l'ordre et
refuse une cinquième palette. La palette à régler doit être cochée. Un
renommage conserve les identifiants ; une suppression, un import ou une
synchronisation retire ceux qui ont disparu. Sous deux palettes, tout l'état
revient à ses valeurs initiales. Une entrée vide les départs de l'annulation.

Le compteur et la ligne fixe lisent `pairesTropProches` sur toute la recette.
Le compteur disparaît à zéro ; le nom accessible de l'onglet reprend le bilan.
Les choix Soft/Vivid et Light/Dark ne produisent aucune demande au sandbox.
Les cartes de sélection, de comparaison, de réglage et la roue restent à faire
dans les tâches suivantes. Les départs sont déclarés dans l'état ; leur prise
au premier réglage et la restauration seront raccordées avec la carte Réglages.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run build --workspace @ucm-kit/core` | Réussite |
| `npm test --workspace ucm-palettes-plugin` | 502 tests réussis |
| `npm run typecheck` | Réussite sur tous les espaces de travail et la racine |
| `node --test --test-name-pattern="UI-39" tests/interface/interface.test.mjs`, depuis le paquet | 5 tests réussis |
| `npm run test:ui --workspace ucm-palettes-plugin` | 280 tests réussis ; relance complète après les dernières modifications du code et des tests |
| `node scripts/run-tests.cjs` | 29 tests réussis |
| `node scripts/controle-style.mjs` | Style conforme |
| `git diff --check` et lecture des octets des fichiers touchés | Aucun écart ; fins de ligne LF |

La première suite Chromium a révélé une attente erronée du test de traduction :
le jeu du mainteneur n'a aucune paire trop proche avec le moteur courant. Le
test emploie deux palettes identiques pour vérifier le compteur et sa traduction.

## Écarts avec la maquette et relecture

Les cartes H2 à H5 sont absentes, conformément au périmètre demandé. La recette
du mainteneur passe par `classerRecette` et le moteur courant : cet état montre
« Toutes vos palettes se distinguent » et aucun compteur, au lieu d'imposer le
résultat des calculs de la maquette.

Les captures `packages/plugin-palettes/dist/revue-harmonisation-*.png` couvrent
500 × 520 et 600 × 720, français et anglais, thèmes clair et sombre. Les tests
mesurent l'alignement des choix, l'absence de recouvrement et de défilement
horizontal. La relecture des captures confirme la tenue de l'en-tête aux deux
tailles. Le contraste sur le thème natif de Figma reste à relire dans Figma ;
le décalque de galerie ne le mesure pas.

La connexion au navigateur intégré a échoué avant toute navigation. Les
captures proviennent de la suite Chromium du dépôt.

## Questions ouvertes

Aucune question de conception pour ce périmètre. Aucun commit, push ou
cochage du plan. Les modifications des autres sessions restent intactes.
