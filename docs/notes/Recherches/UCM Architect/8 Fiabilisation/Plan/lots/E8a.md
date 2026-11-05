# E8a. Icônes du composant

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E7b, E1b.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E8.1 Icône (Q-F6-1, option A). C66 contrôle que l'icône est une instance d'`Icon`, que son remplissage suit le token de premier
  plan du composant (`button/color/primary/solid/foreground`), et que sa propriété `Size` suit la taille du variant. Les textes « Liez-la
  à une taille de layout/icon » changent.
- [x] E8.2 Les `strokes` d'une icône à tracé tiennent lieu de couleur sans fill visible. C17 y admet `icon` ou `foreground` (Q-F6-5).
- [x] E8.5 Un slot sans mot d'icône n'est pas une icône, et C67 ne le compte pas (Q-F6-4).
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

E8.1, E8.2 et E8.5 faites côté kit, avec leurs textes. E8.6 reste pour F2. Le lecteur d'Architect ne remplit pas encore `instanceDe.valeurs`, donc le motif `taille-differente` ne se déclenche pas dans Figma. Pas de commit.

Fichiers :
- `packages/kit/src/controles/typographie.ts` (C66) :
  - L'icône doit être une instance d'`Icon` (`estUneInstanceDIcone`). Motifs : `pas-une-instance` (aucune instance), `autre-composant` (instance d'un autre composant, `faits.composant`). `instance-locale` disparaît : une instance locale d'`Icon` est une instance d'`Icon`.
  - Le fill doit suivre un token de premier plan du composant : COLOR, famille `color`, rôle `icon` ou `foreground`. Motifs `couleur-sans-variable` et `couleur-hors-premier-plan`, qui portent `faits.attendu` : les tokens que le variant prévoit (`tokenVautPourLeLayer`), séparés par une virgule. Le constat regroupe les variants et supprime `attendu` quand ils n'attendent pas tous les mêmes tokens.
  - `Size` de l'instance doit valoir la taille du variant : motif `taille-differente` (`faits.valeur`, `faits.taille`). Le kit lit la valeur dans le nouveau fait `LayerLu.instanceDe.valeurs`. Elle n'est jugée que si le fait existe, que le jeu a un axe de taille et que la valeur dit une taille (terme du registre ou valeur de l'axe) ; `sm` pour `Small` est accepté. Largeur et hauteur ne se jugent plus (`taille-sans-variable` et `taille-hors-icone` disparaissent).
  - Sans fill visible, les `strokes` visibles tiennent lieu de couleur et se jugent comme le fill (E8.2).
- `packages/kit/src/controles/mapping.ts` : `rolesAdmisDuLayer` admet `icon` ou `foreground` pour les `strokes` d'une icône sans fill visible, `border` ou `foreground` sinon (E8.2, C17). `roleDuToken` remplace l'expression propre à C17 et à C25.
- `packages/kit/src/controles/nommage.ts` : `roleDuToken` et `tokenVautPourLeLayer`, tirés de C25 (`corrections.ts`), qui les emploie maintenant ; C66 s'en sert pour les tokens attendus.
- `packages/kit/src/controles/releve.ts` : `instanceDe.valeurs` (optionnel).
- E8.5. Un slot sans mot d'icône n'est pas une icône pour C66 ni C67 : la définition d'E1b le tenait déjà, la régression est ajoutée.
- `packages/plugin-architect/src/ui/textes/ignores.ts` et `src/ui/ignores/modele.ts` : les textes de la note remplacent `iconeSansLibrary`, `iconeSansTaille`, `iconeTailleHorsIcon` et `iconeTailleStatut`. Sans token prévu par le variant, la couleur garde le texte et le statut d'avant (« Liez-la à un token icon ou foreground »).
- `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` : le gabarit de la typographie lit `instanceDe.valeurs`, les axes, l'état des fills et des strokes, le type et l'état des variables.
- Tests : `packages/kit/tests/icones-du-composant.test.ts` (15 tests) ; sur les sources d'avant le lot, 14 échouent, le 15e (E8.5) passe sans le lot et ne casse que si on retire le mot d'icône de la définition (vérifié). `packages/plugin-architect/tests/textesDeLaMatriceEtDesIcones.test.ts` pour les phrases. Attentes qui changent : `typographie.test.ts`, `controles-lectures-manquees.test.ts`, `stressTypographieOperateurs.test.ts`.
- Harnais F5 : la base de F6 pose une instance d'`Icon` dont `Size` vaut la taille du variant et dont le fill suit le token `icon` du composant, sans largeur ni hauteur liées (`composantDeBase.ts`) ; I1 à I5, FP4 et les couples I1+I2, I1+I5, I2+I3, V1+I2 sont réécrits sur cette forme ; les cas qui attendaient Q-F6-1, Q-F6-4 et Q-F6-5 (I2, I3, I5, couple I2+I3) ne sont plus `mesure` ; seuls les cas d'I6 qui attendent Q-F6-3 le restent. `mesurer.ts --operateur I1|I2|I3|I4|I5|I6|FP4` : 0 écart, 0 en attente.
- Carte, invariants : `packages/kit/CARTE.md` (mapping, nommage, releve, typographie, f5-variants), `packages/kit/invariants/referentiel.md` (une puce).

Décisions prises :
- Une instance locale d'`Icon` convient (la décision demande une instance d'`Icon`, pas une instance distante).
- Un composant principal ou un FRAME n'est jamais une icône : I1-3 et I1-4 n'attendent plus de constat.
- Un token de premier plan d'une autre palette ou taille que celles du variant n'est pas jugé par C66 : C15 et C22 le jugent.
- Le fichier `composant.ts` des textes n'a pas reçu les textes : ils remplacent ceux d'`ignores.ts`, où la note les situe.

Commandes :
- `npm run build --workspace @ucm-kit/core` passe ; `npm run test --workspace @ucm-kit/core` : 1674 tests, seul « 32 000 noms » dépasse son chrono sous charge, il passe seul.
- `npm run test:paquet -- architect` : voir E7b (2 échecs hors lot).
- `npm run typecheck` : voir E7b.
- `npx tsx --test tests/referentielUnique.test.ts` (racine) : une liste `['default', 'hover']` dans `tests/referencesComposants.test.ts:180`, hors lot.

Reste :
- Le lecteur du relevé (`packages/plugin-architect/src/releveDuComposant.ts`) doit remplir `instanceDe.valeurs` avec les propriétés de variant de l'instance : sans lui, `taille-differente` reste muet dans Figma. Ce fichier n'est pas dans le lot.
- Une ligne à écrire dans `packages/plugin-architect/SPEC.md` si le mainteneur veut l'expliquer : la lecture de `instanceDe.valeurs`.
- E8.6, montée de version du kit en F2.
