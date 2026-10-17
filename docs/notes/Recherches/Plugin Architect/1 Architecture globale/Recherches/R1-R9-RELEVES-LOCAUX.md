# R1 et R9. Relevés dans le dépôt

**Statut :** relevés partiels des sujets R1 et R9 de
[PLAN-DE-RECHERCHE.md](../PLAN-DE-RECHERCHE.md). Les observations de
designers et les mesures dans Figma restent à faire.

Lecteur : le mainteneur, pour le découpage en plugins et le retrait de
l'onglet Intégrations.

## 1. R1. Le poids des trois plugins

Tailles des fichiers construits présents dans `packages/*/dist/`. Ces builds
peuvent dater d'avant les derniers commits : relancer `npm run build` avant
une mesure qui sert à décider.

| Plugin | `ui.html` | `code.js` |
|---|---|---|
| UCM Contract Exporter | 64 ko | 435 ko |
| UCM Palettes | 583 ko | 182 ko |
| UCM Token Explorer | 225 ko | 45 ko |

Un plugin unique qui réunirait les trois dépasserait 1,5 Mo avant
l'Architecte. Le temps d'ouverture dans Figma reste à mesurer : il dépend
aussi des lectures du document au démarrage.

## 2. R9. Ce que touche le retrait de l'onglet Intégrations

| Élément | Fichiers |
|---|---|
| Logique des trois intégrations | `src/integrations/contrats.ts`, `palettes.ts`, `profilUcm.ts` |
| Vue de l'onglet | `src/ui/vues/integrations.ts` |
| Routage et messages | `src/code.ts` (lecture de la recette), `src/messages.ts`, `src/ui/index.ts`, `src/ui/etat.ts` (`ONGLETS`) |
| Textes | `src/ui/textes.ts`, de `integrationsTitre` aux règles du profil |
| Préférences rangées | `palettes`, `profilUcm`, `associations`, `exceptions` dans `src/preferences.ts` |
| Galerie | `galerie/etats.cjs` |
| Tests | `tests/contrats.test.ts`, `tests/integrationsUcm.test.ts`, `tests/interface/interface.test.mjs`, et les références dans `tests/loiDeLectureSeule.test.ts`, `tests/manifest.test.ts` |
| Volume | 1 163 lignes pour les modules, la vue et les deux tests dédiés |

**Dépendances libérées.** Seules les intégrations importent la porte
`@ucm-kit/core/lecteurs/navigateur` et le moteur `ucm-couleur` dans
l'explorateur. Après le retrait, l'explorateur ne garde du kit que le calcul
du contraste (`src/contraste.ts`). Son bundle doit diminuer d'autant ; la
mesure se fait après le retrait.

**Préférences.** Un designer qui a associé des collections ou ignoré des
écarts perd ces réglages. La lecture tolérante de `preferences.ts` ignore une
clé inconnue : retirer les champs ne casse pas une préférence déjà rangée.
L'Architecte pourrait reprendre `associations` et `exceptions` s'il range sa
déclaration ailleurs que dans `clientStorage`.

**Ordre possible.** Le profil et la recette n'ont pas de remplaçant tant que
l'Architecte n'existe pas ; l'import de contrats n'en a pas tant que
l'exporteur ne montre pas l'écart avec le dépôt. Retirer l'onglet d'abord
prive le mainteneur du seul contrôle d'architecture existant pendant cette
période.
