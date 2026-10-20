# Plan des groupes et des variables d'UCM Nomenclature

Ce plan applique les décisions du mainteneur sur les maquettes de
`Maquettes/vocabulaire-3/`. Les chemins `src/…` et `tests/…`
partent de `packages/plugin-nomenclature/`. Le kit ne change pas : la place de
chaque occurrence se lit déjà avec `categorieDuSegment`.

## Décisions

| N° | Décision | Source |
|---|---|---|
| G1 | L'interface dit « groupe » et « variable ». « Dossier » disparaît. « Noms » ne désigne plus la place du dernier segment ; il reste pour les comptes qui incluent des collections. | retour sur MAQUETTE-PLACES |
| G2 | Une pastille de groupe est orchidée, une pastille de variable est olive. Un terme sans règle prend la même couleur sur son texte. | piste D aux couleurs de A |
| G3 | L'origine (UCM, Personnalisé) s'écrit en texte gris partout : liste, cartes de question, fiche, cartes de Renommages. « À trancher », « Nouveau », « Bloqué » et « Protégé » gardent leur pastille. | piste D |
| G4 | Un terme employé aux deux places a une ligne par place, écrite dans la convention de cette place (`LineHeight` en groupe, `line-height` en variable). | MAQUETTE-PLACES, non contesté |
| G5 | En tri A → Z, chaque section montre ses groupes, puis ses variables, avec un intertitre par place quand la section a les deux, et un « Afficher les n autres » par place. | retour sur MAQUETTE-PLACES |
| G6 | En tri par nombre, les deux places se mêlent ; un seul « Afficher les n autres » par section. | réponse à la question ouverte |
| G7 | Le titre de chaque section occupe une bande grise en tête du cadre de sa liste, avec son compte, une ligne de description et le chevron. Les intertitres de place passent en petites capitales grises, sans fond. | T3 de MAQUETTE-TITRES-DE-SECTION |
| G8 | L'onglet Questions sans question montre la vue `.etat` : « Aucune question pour l’instant », une ligne, « Voir les renommages ». Les sections Plus tard et Autres pistes restent dessous. L'onglet perd son compte. | Q1 et Q2 de MAQUETTE-GROUPES-VARIABLES |
| G9 | Le menu « Filtrer » reçoit un groupe « Place » : Groupes, Variables. | MAQUETTE-GROUPES-VARIABLES |
| G10 | La fiche reste une fiche par terme : les deux lignes de `LineHeight` et `line-height` ouvrent la même fiche. | choix du plan |

## Textes

| Clé `TEXTES` (`src/ui/textes.ts`) | Texte |
|---|---|
| `phraseDesConventions` | Comment s’écrivent les groupes, les variables et les collections. |
| `ecritureDesNoms` | Variables |
| `choisirLEcritureDesNoms` | Écriture des variables |
| `ecrireEn.variables` | Écrire les variables en |
| `titreDeLEcriture` | Écriture des groupes et des variables |
| `modifierLEcriture` | Modifier l’écriture |
| `detailDeTerme`, « Dans les noms » | Dans les variables |
| `nomsProtegesExplication` | UCM Palettes écrit ces variables, et leur groupe garde son nom. Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici. |
| `trierNombre` | Trier : nombre de variables |
| ligne de la section À trancher | Termes qui attendent votre réponse dans l’onglet Questions. |
| ligne de Remplace | Termes qui remplacent des variantes dans le fichier. |
| ligne de Conforme | Termes déjà écrits selon leur règle. |
| ligne de Sans règle | Termes qu’aucune règle ne couvre encore. |
| ligne de Composants | Noms des composants du fichier. |
| ligne de Palettes | Noms des palettes du fichier. |
| intertitres | Groupes, Variables |
| suite d'une place | Afficher les n autres groupes, Afficher les n autres variables (au singulier : l’autre groupe, l’autre variable) |
| filtre | Place ; Groupes ; Variables |
| Questions vide, titre | Aucune question pour l’instant |
| Questions vide, ligne | Aucun terme du fichier n’en rappelle un autre. Une question apparaîtra si une variante arrive, comme `bg` à côté de `background`. |
| Questions vide, ligne avec Plus tard | Vous avez gardé n questions pour plus tard. Elles sont ci-dessous. |
| Questions vide, bouton | Voir les renommages |

Les autres « noms » (`rienAFaire`, `nomsCoches`, `aucunNomCoche`, les comptes
de Renommages, `afficherLesAutresNoms` des cartes) restent : ils comptent
variables et collections.

## Lots

Un lot par appel d'agent, deux agents au plus en même temps. La conversation
principale relit chaque diff, contrôle les fins de ligne contre `HEAD` et
commite par chemins explicites.

### L1 · La liste par place (sandbox) · `implementeur-exigeant`

Fichiers : `src/messages.ts`, `src/projection.ts`, `src/session.ts` si la
requête y transite, `tests/projection.test.ts`, `tests/messages.test.ts`,
`tests/session.test.ts`.

- [ ] `PlaceDuTerme = 'groupes' | 'variables'` ; `TermeDeListe.place`.
- [ ] `listeDesTermes` rend une entrée par terme et par place où le terme ou
  une de ses variantes remplacées apparaît (`categorieDuSegment` ; toute
  catégorie autre que `groupes` compte comme `variables`, comme
  `categorieDesOccurrences`). Un terme sans occurrence garde une entrée, à la
  place que donne `categorieDEmploi`. Composants et palettes : `groupes`.
- [ ] Par entrée : `forme` dans la convention de sa place
  (`TERME_SELON_LA_PLACE` compris : `Small` en groupe, `sm` en variable),
  `remplace` et `nombre` limités aux occurrences de cette place, `type`
  calculé à cette place (`remplace` si une variante y est remplacée).
- [ ] `RequeteDeTermes` reçoit `places` (filtre, vide = toutes) et `place`
  (page d'une seule place dans une section, `null` sinon) ;
  `ComptesDeTermes.places` compte les lignes par place.
- [ ] Tri `alpha` : groupes avant variables, puis l'ordre actuel. Sans
  `section`, chaque section porte jusqu'à `LIGNES_PAR_SECTION` groupes et
  autant de variables ; `SectionDeTermes.totaux` donne le total de chaque
  place. Avec `section` et `place`, la page ne lit que cette place.
- [ ] Tri `nombre` : places mêlées, `LIGNES_PAR_SECTION` lignes par section,
  pagination inchangée.
- [ ] Tests sur l'extrait du Playground : `line-height` a deux lignes,
  `Small`/`sm` selon la place, ordre groupes puis variables, pages par place,
  filtre de place, comptes.

### L2 · Textes et couleurs · `implementeur`

Fichiers : `src/ui/textes.ts`, `src/ui/styles.css`, tests de textes s'il y en a.
En parallèle de L1.

- [ ] Les textes du tableau ci-dessus. Les lignes de section sous
  `ligneDeSection: Record<TypeDeTerme, string>`.
- [ ] Rôles de couleur, clair et sombre, à côté de `--fond-pastille-ucm` :
  `--fond-groupe` / `--texte-groupe` (sombre `rgb(80 36 84)` /
  `rgb(244 180 248)`, clair `rgb(250 228 251)` / `rgb(134 25 143)`),
  `--fond-variable` / `--texte-variable` (sombre `rgb(58 62 28)` /
  `rgb(222 228 150)`, clair `rgb(240 242 214)` / `rgb(84 90 20)`).
  Contraste du texte sur son fond : 4,5:1 au moins.
- [ ] Classes : `.jeton-groupe`, `.jeton-variable`, `.mot-groupe`,
  `.mot-variable`, `.origine` (texte gris, sans fond), `.bande-section`,
  `.intertitre-place` et son échantillon, d'après
  `Maquettes/vocabulaire-3/MAQUETTE-TITRES-DE-SECTION.html` (cadre T3).
- [ ] Retirer `--fond-pastille-ucm`, `--texte-pastille-ucm`,
  `--fond-pastille-personnalise`, `--texte-pastille-personnalise`, leurs
  classes et leurs usages CSS une fois L3 et L4 passés (sinon au lot L4).

### L3 · L'onglet Règles · `implementeur-exigeant` (après L1 et L2)

Fichiers : `src/ui/regles.ts`, `src/ui/listeDesTermes.ts`,
`src/ui/frontiere.ts` si la requête change, `tests/listeDesTermes.test.ts`,
`tests/regles.test.ts`, `tests/frontiereUi.test.ts`.

- [ ] Section : la bande de G7 (icône, titre, compte, ligne, chevron) ; toute
  la bande déplie ou replie ; l'icône À trancher reste ambre.
- [ ] Ligne : jeton ou mot coloré selon `terme.place` ; origine en
  `.origine` (G3) ; `pastilleDeLaLigne` et le nom accessible suivent.
- [ ] Tri A → Z : intertitres de place (section à deux places seulement),
  « Afficher les n autres groupes / variables » qui demande la page de la
  place. Tri par nombre : places mêlées, un seul « Afficher les n autres ».
- [ ] Menu Filtrer : groupe Place (G9), avec ses comptes ; le filtre actif
  s'affiche en jeton retirable comme les autres.
- [ ] Conventions d'écriture : lignes Groupes et Variables, spécimen dans la
  couleur de la place, partie de l'exemple colorée ; textes de L2.
- [ ] Le nom accessible d'une ligne dit sa place (« groupe », « variable »).

### L4 · Origine grise et onglet Questions vide · `implementeur` (après L2, en parallèle de L3)

Fichiers : `src/ui/aTrancher.ts`, `src/ui/feuilles.ts`, `src/ui/aAppliquer.ts`,
`src/ui/panneaux.ts` ou `src/ui/coquille.ts`, leurs tests.

- [ ] UCM et Personnalisé en `.origine` dans la carte de question, la fiche
  (« UCM · catégorie » compris) et les cartes de Renommages.
- [ ] Onglet Questions sans question à poser et avec au moins un renommage :
  vue `.etat` de G8 au-dessus de Plus tard et Autres pistes ; « Voir les
  renommages » sélectionne l'onglet Renommages. Après la réponse à la dernière
  question, la ligne de réussite reste au-dessus de la vue jusqu'au changement
  d'onglet. Sans question ni renommage, l'état `rien-a-faire` actuel
  s'applique.
- [ ] Tests : vue vide, vue vide avec Plus tard, bouton.

### L5 · Galerie · `implementeur` (après L3 et L4)

Fichiers : `galerie/donnees.cjs`, `galerie/etats.cjs`.

- [ ] Données du Playground avec des termes aux deux places.
- [ ] États : `regles-places` (A → Z, intertitres), `regles-tri-nombre`,
  `regles-filtre-place`, `questions-vide`, `questions-vide-plus-tard`.
- [ ] Les états `regles-*` atteignent `data-galerie="pret"`. Aujourd'hui,
  `Mesures/extraire-galerie.mjs` dépasse son délai sur `regles-sections` et
  `regles-noms`. Trouver la cause (galerie ou extracteur) et la corriger.

### L6 · Vérification · `verificateur`

- [ ] `npm run typecheck` et `npm test` dans `packages/plugin-nomenclature`,
  puis `npm test` à la racine.
- [ ] `npm run build` du plugin, puis `npm run galerie` ; chaque état atteint
  `pret`.
- [ ] `node scripts/controle-style.mjs` sur les fichiers touchés.

### F · Fin · conversation principale

- [ ] Relire chaque diff ; fins de ligne identiques à `HEAD` ; commits par
  chemins explicites ; plan coché avec les hashes.
- [ ] `AGENTS.md`, section UCM Nomenclature : une ligne par place dans le
  vocabulaire, origine en texte gris.
- [ ] Recette dans Figma par le mainteneur.

## Ordre

L1 et L2 en parallèle, puis L3 et L4 en parallèle, puis L5, L6 et F.
