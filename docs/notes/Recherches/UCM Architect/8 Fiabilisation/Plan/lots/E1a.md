# E1a. Valeurs de variant et axes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E0, D6b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/ecriture-des-mots.ts`,
`packages/kit/src/referentiel/architecture.ts`, `packages/kit/src/referentiel/conventions.ts`,
`packages/kit/src/controles/nommage.ts` (`axeDePropriete`).
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E1.1 Écriture d'une valeur de variant (Q-F5-5, Q-F5-6). Le variant s'écrit en toutes lettres, avec une majuscule à chaque mot
  (`Small`, `Extra Large`, `Danger`). Le token s'écrit en minuscules et en abréviation (`sm`, `xl`, `danger`). Une table du kit passe de
  l'un à l'autre. `S`, `M`, `L`, `sm` et `Middle` dans un variant ont une correction vers le mot entier.
- [x] E1.2 Rôle d'un nom d'axe (Q-F5-1, Q-F5-9, E-27). `Type`, `Kind` et `Shape` pilotent le style. `Density` et `Spacing` pilotent la
  taille. Un nom français prend le rôle de son équivalent anglais et reçoit un renommage vers l'anglais. Un axe booléen ne pilote aucun segment.
- [x] E1.6 Segment d'une valeur à point ou à barre (Q-F5-10). Le point et la barre deviennent un tiret (`16-9`, `1-5`).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E1.1, E1.2 et E1.6 faits (Claude, `implementeur-exigeant`), cases à cocher avec le hash du commit. Pas de commit, pas de montée de version.

Fichiers :
- `packages/kit/src/referentiel/vocabulaire.ts` : `TAILLES_DE_VARIANT` (E1.1).
- `packages/kit/src/referentiel/conventions.ts` : `CONVENTION_DE_VALEUR_DE_VARIANT`, `CONVENTION_DE_SEGMENT_DE_TOKEN` (E1.1, E1.6).
- `packages/kit/src/referentiel/ecriture-des-mots.ts` : `ecritureDuVariant`, `segmentDeToken`, types `EcritureDeVariant` et `RoleDeValeur` (E1.1, E1.6).
- `packages/kit/src/referentiel/architecture.ts` : `NOMS_D_AXES`, `NOMS_D_AXES_FRANCAIS`, `INTERRUPTEURS`, type `RoleDAxe` (E1.2).
- `packages/kit/src/controles/nommage.ts` : `axeDePropriete` lit ces tables ; `nomDAxeEnAnglais`, `estUnInterrupteur` (E1.2).
- `packages/kit/src/referentiel/index.ts` et `packages/kit/src/controles/index.ts` : une ligne d'export chacun.
- Tests nouveaux : `packages/kit/tests/valeursDeVariant.test.ts` (E1.1, E1.6), `packages/kit/tests/rolesDesNomsDAxe.test.ts` (E1.2).

Régressions : avant la correction, `axeDePropriete` rendait `undefined` pour `Type`, `Kind`, `Shape`, `Density`, `Spacing`, `Couleur`, `Variante` et `Hiérarchie` (mesuré avec `npx tsx -e`). Les deux fichiers de test échouent à l'import sans les nouvelles définitions, puis passent : 23 tests, 0 échec avec `npx tsx --test`.

Commandes :
- `npm run test --workspace @ucm-kit/core` après les reclassements : 1473 passent, 2 todo. Échecs restants : « 32 000 noms » sous charge (passe seul) et trois tests de `signes.test.ts`, qu'une autre session modifie.
- `npm run test:paquet -- architect` : 1901 passent, 3 échouent. Un échoue par ma décision (ci-dessous). `rapport.test.ts` (« la structure mesure la taille… », `src/ui/structure/index.ts`) et `stylesUi.test.ts` (« toute règle de la feuille du plugin… ») tiennent aux fichiers d'interface qu'une autre session modifie.
- `npx tsx --test tests/referentielUnique.test.ts` (racine) : une liste `['default', 'hover']` dans `tests/referencesComposants.test.ts:180`, hors de ce lot.
- `npm run typecheck` : le kit passe ; le plugin Exporter échoue sur `creerSvgDuSigne` dans `packages/plugin-socle/src/ui/ResizeGrip.ts`, hors de ce lot.
- `node scripts/controle-style.mjs` : conforme.

Tests existants dont le résultat change. Les trois reclassements viennent de la section « Reclassement des cas provisoires » de `COUVERTURE.md` (cohorte « F3 profils d'axes inconnus, ancienne référence Q-08 ») et de la décision du mainteneur ; aucune attente n'est modifiée pour masquer un défaut :
- `packages/kit/tests/stressComposantOperateurs.test.ts`, renommé « …Badge lit Type et Tone, ses cas restent attendus (Q-F5-1) ». Ancien : le profil Badge porte `Type` et `Tone`, que le kit ne lisait pas, donc L2 passait en mesure Q-08. Nouveau : `Type` (style) et `Tone` (palette) ont un rôle, `verdictDesAxes` rend `attendu`, et le test vérifie que tout cas de Badge est `attendu` sans question. L'oracle tient : j'ai passé les opérateurs L, R et K des 16 profils Badge dans `mesurerLesGroupes` (`packages/plugin-architect/scripts/stress/f3-composant/operateurs.ts`), qui donne 1768 cas attendus sans écart autre que les C18 de SHAPE_FILL déjà connus (todo de `stressComposantBase.test.ts`), et 64 cas `mesure` d'autres références (Q-F3-15, Q-F3-8). Aucune correction du produit ne relève d'E7a ici. Commentaires mis à jour : `operateursAxes.ts` (`verdictDesAxes`) et `profils.ts` (`JEUX_DE_VARIANTS`). Reste hors de ce lot : `Z5-7` dans `operateursTailles.ts` garde sa référence Q-08, chargé à E6.
- `packages/kit/tests/stressTypographieOperateurs.test.ts`, « les couches de F6 se posent sur P0 et sur p18… », attente inchangée, marqué `todo` avec « Q-F5-2, E7a : la valeur primary d'un axe de style se lit à la position du style ». p18 (axe `Kind`) a le rôle style depuis E1a, donc `controlerOublis` rend un C7 `style:primary`. Q-F5-2 dit que le nom décide et que la lecture d'un token accepte d'abord la valeur de l'axe à la position de cet axe : E7a corrige la lecture, p18 doit redevenir muet, et le `todo` se retire alors.
- `packages/plugin-architect/tests/projectionsDesControles.test.ts`, « changer la liaison d'un variant de wrapper… », attente inchangée. La fixture `releveRicheAvecWrapper` (`packages/plugin-architect/tests/aides/donneesRiches.ts`) renommait `Size` en `Density`, qui a maintenant le rôle taille. Elle renomme `Size` en `Scale`, sans rôle dans `NOMS_D_AXES`, donc le wrapper porte seul l'axe de taille comme avant. Le fichier passe : 99 tests, 0 échec.
- `tests/versionSuitLeContenu.test.mjs` et `tests/corpusUcm.test.ts` échouent comme prévu, faute de montée de version.

Reste : les contrôles qui lisent ces définitions (C7 à C10, C31 à C33) changent dans E7a. `packages/kit/tests/stress/f5-variants/corpus/*.json` (champs `roleSelonLaProposition`, `constatSelonLaProposition`) et `profils.ts` attendent E0 et E7a.
