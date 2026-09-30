# Plan d'implémentation : Color shift, mise en page stable et architecture des tokens

## Objet et lecteur

Ce plan s'adresse à l'agent qui écrira le code. Il ordonne en une seule liste
de tâches trois chantiers validés par le mainteneur :

- le Color shift, la carte « Réglage global » bornée et les glyphes des cartes,
  décrits par l'[étude du Color shift](./ETUDE-COLOR-SHIFT.md) et sa
  [maquette](./MAQUETTE-COLOR-SHIFT.html) ;
- les avertissements qui ne déplacent rien, section 7 de la même étude ;
- l'architecture des tokens, décisions D1 à D17, décrite tâche par tâche par le
  [plan d'intégration de l'architecture](../../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md).

Une tâche de ce plan d'intégration garde son numéro (`A1.2`) et son texte
là-bas : ce plan-ci la place dans l'ordre et dit ce qui change à cause du
Color shift. Une tâche nouvelle porte un numéro de phase (`M3`, `C5`).

## Avant de commencer

- [ ] Lire [AGENTS.md](../../../../../AGENTS.md), puis
  [CONTRIBUTING.md](../../../../../CONTRIBUTING.md), puis l'étude du Color
  shift, puis le plan d'intégration de l'architecture et sa
  [vue illustrée](../../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html).
- [ ] Charger la skill `rediger-sans-tics-ia` avant toute phrase de document ou
  de commentaire, et `rediger-diagnostics-ucm` avant tout texte affiché au
  designer.
- [ ] Ouvrir la maquette dans un navigateur et rejouer ses six essais.
- [ ] Travailler sur une branche par phase, jamais sur `main`.

**Fin d'une tâche.** `npm test`, `npm run typecheck` et `npm run build`
passent. Un document modifié passe `node scripts/controle-style.mjs <fichier>`
et `npx tsx --test tests/docLinks.test.ts`. Un invariant nouveau entre dans
AGENTS.md dans le même commit que le test qui le tient. Cocher la case ici, et
celle du plan d'intégration pour une tâche `A`.

**Arrêt.** Une case marquée « Arrêt » attend la réponse du mainteneur. Écrire
ce qui est prêt, ce qu'il doit regarder, et ne pas commencer la phase
suivante.

## Arbitrages entre les deux plans

| Point | Ce que ce plan retient |
|---|---|
| Format de la recette | Un seul format 7 porte les deux chantiers : listes avec 400 et 950, préréglage à neuf nuances retiré (A1.5, A1.6) et objets `saturation` et `clarte` de la dérive (C1). Aucune conversion, selon la réponse R2 : une recette de format 6 est refusée. L'étude du Color shift prévoyait une migration de 6 à 7 ; R2 la remplace. La direction globale prend le format 8 (A3.6) |
| Paires jugées par les limites | Les limites du Color shift se calculent sur les dix-neuf paires du kit (A1.2), dont trois visent 400 et 950. La mesure de l'étude, faite sur seize paires, se refait en C5 |
| Spécification d'UCM Palettes | Les sections 7, 11.2, 12 et 13 changent pour les deux chantiers : une seule phase les réécrit, la phase 1 |
| Pied de la fenêtre | Le pied de la phase 2 est celui que la direction globale prévoit. Il se construit ici sans le bouton « Vérifier », qui arrivera avec elle |
| Essais dans Figma (A5) | Faits par le mainteneur. A3 attend leurs résultats et reste hors de ce plan tant qu'ils manquent |
| Playground (A6) | Dépôt `UCM-Playground`, après A0 à A4 : dernière phase, sur demande du mainteneur |
| Questions Q3 et Q4 du plan d'intégration | Q4 est tranchée : les courbes et les parts 0,45 et 0,95 sont validées. Q3 : le mainteneur prévoit le fond de page `#F8FAFC`. Aucune tâche n'attend l'une ou l'autre. Les limites lisent le fond rangé dans la recette et suivent un changement de fond sans code ; la mesure C5 prend le fond retenu à ce moment. La nuance 50 à 0,975 borne l'éclaircissement des nuances claires vers +0,040 |

## Phase 1 : les documents d'autorité

- [ ] **A0.1 à A0.11** ARCHITECTURE-FINALE, `verifier-courbes.mjs`, la vue
  illustrée et `docs/README.md`, comme le plan d'intégration les décrit.
- [ ] **A2.1, A2.2, A2.3, A2.10** Spécification d'UCM Palettes : dix-neuf
  paires, 400 et 950 obligatoires, format 7 sans conversion, préréglages 11 et
  13, vocabulaire commun dans le kit.
- [ ] **S1** Spécification, section 6.4 : le poids d'une nuance, les trois
  grandeurs, la lecture du poids sur la clarté de la courbe (étude, section 4).
  `teinteA` reste l'autorité de la teinte.
- [ ] **S2** Spécification, section 7 : la dérive rangée du format 7 porte
  `saturation` et `clarte`, facultatifs, zéro quand ils manquent ; leurs
  bornes et leurs arrondis ; `derive-lien` compare les trois grandeurs ;
  `origine` ne mesure que la teinte.
- [ ] **S3** Spécification, section 12 renommée « Le Color shift » : onglets,
  graphe à trois unités, rails, réglettes à zones interdites, ligne de la
  plage sûre, cas limites, limites dynamiques et leur cause (étude, sections 5
  et 6). Garder les numéros `[DER-xx]` qui restent vrais ; un comportement
  nouveau prend un numéro libre.
- [ ] **S4** Spécification, section 13 : la carte « Réglage global » et ses
  limites (décision Q6) ; le titre de section « Ajuster la palette » ; un
  glyphe par carte ; les six règles de la mise en page stable (étude,
  section 7.2) ; le pied et le volet.
- [ ] **S5** [TEXTES-A-VALIDER.md](../TEXTES-A-VALIDER.md) : chaque texte
  nouveau, en anglais et en français, dont « Color shift » dans les deux
  langues et « Réglage global ».

## Phase 2 : les avertissements qui ne déplacent rien

Cette phase corrige un défaut présent dans le plugin. Elle ne dépend ni du
moteur ni du Color shift.

- [ ] **M1** Écrire d'abord le test qui échoue :
  `packages/plugin-palettes/tests/interface/interface.test.mjs` place la
  palette `#16A34A` avec deux intensités, glisse la luminosité de la carte
  globale de 0 à +0,02, et relève `getBoundingClientRect().top` du curseur à
  chaque image. Il échoue au premier pixel d'écart. Même relevé pour une
  poignée du graphe de dérive. Le constater en échec sur `main`.
- [ ] **M2** Nouveau `src/ui/ligneFixe.ts` : une ligne de 24 px, ellipse,
  texte entier dans `title` et pour le lecteur d'écran, un ton (`neutre`,
  `avertissement`, `butee`). Le clic ouvre une bulle superposée, positionnée
  dans la fenêtre du plugin ; Échap et un clic ailleurs la ferment.
- [ ] **M3** Nouveau `src/ui/piedDeLaPalette.ts`, sous le contenu défilant de
  l'onglet Création : icône, compte des garanties et des alertes, premier
  message, bouton « Détails ». Le volet superposé liste les messages par
  sévérité avec `blocDeConstat` et leurs liens `ouvrir` ; Échap le ferme. Une
  région `aria-live="polite"` annonce le bilan à la fin d'un geste, pas
  pendant.
- [ ] **M4** `src/ui/ongletPalettes.ts` : les zones `messagesDeBase`,
  `messagesDApercu` et `messagesDeLaDerive` quittent le flux et alimentent le
  pied. `manqueDeLaReference`, `lienDAjustement` et `traceDeLAjustement`
  deviennent une ligne fixe de la carte de la référence ; `choixAutomatique`
  aussi ; `repereDeReference` tient sur une ligne.
- [ ] **M5** `src/ui/reglagesDeLaPalette.ts` : l'avertissement devient une
  ligne fixe toujours présente, avec l'état neutre « Ce réglage ne touche pas
  la couleur de référence ». Origine des parts, retour aux parts communes et
  messages de la carte tiennent chacun dans une ligne fixe réservée.
- [ ] **M6** `src/ui/carte.ts` et `styles.css` : le résumé d'une carte
  repliable tient sur une ligne, coupé par une ellipse ; `.carte-bascule`
  perd son `flex-wrap`. Le titre ne se coupe toujours pas.
- [ ] **M7** Pendant un geste, aucun élément ne change de hauteur : un volet
  ouvert garde sa taille et fait défiler son contenu. Poser l'état du geste à
  un seul endroit, là où `previsualiser` et `valider` passent.
- [ ] **M8** Textes anglais et français des états neutres, du pied et du
  volet ; `loiDesTextes` et `i18n` passent. Galerie : un état « avertissement
  long » et un état « volet ouvert », à la taille par défaut et à 500 × 520.
- [ ] **M9** AGENTS.md, invariant de l'interface : pendant un geste, aucun
  contrôle de l'onglet Création ne se déplace ; le test M1 le tient. Carte du
  code : `ligneFixe.ts` et `piedDeLaPalette.ts`.
- [ ] **M10** Arrêt : le mainteneur essaie le plugin dans Figma, glisse près
  d'un seuil et confirme l'absence de clignotement.

## Phase 3 : le vocabulaire commun et le format 7

- [ ] **A1.1 à A1.5** Le point d'entrée `@ucm-kit/core/emplois`, les
  dix-neuf paires, les rangs, l'import par `ucm-couleur`, le préréglage à neuf
  nuances retiré.
- [ ] **Arrêt** avant A1.6 : prévenir le mainteneur que ses recettes d'essai
  de format 6 seront refusées. Il les exporte s'il veut garder leurs
  références.
- [ ] **A1.6** `FORMAT_RECETTE` passe à 7, conversions retirées, `[REC-05]`
  exige 400 et 950.
- [ ] **C1** Dans le même format 7, `recette.ts` : `DeriveRangee` gagne
  `saturation` et `clarte`, facultatifs ; validation des bornes, ±1 au
  centième et ±0,15 au millième ; `derive-lien` compare les trois grandeurs ;
  message de refus de chaque borne, anglais et français, avec le libellé du
  champ dans l'écart d'un import (`importation.ts`, catalogues).
- [ ] **A1.7, A1.8** Les tests du vocabulaire et du moteur, la version
  mineure du kit. Ajouter pour C1 : une recette avec les deux objets se valide
  et se range à l'octet ; une borne dépassée est refusée ; deux dérives liées
  qui diffèrent par la saturation sont refusées.

## Phase 4 : les quatre rangs dans UCM Palettes

- [ ] **A2.4 à A2.9** Noms des rangs lus dans le kit, planche, garanties,
  nuancier, présentation et ajustement sur quatre rangs, boutons 11 et 13,
  tests, galerie, carte du code.

Ces tâches touchent `presentation.ts` et `ui/garanties.ts` après la phase 2 :
les messages qu'elles produisent vont déjà au pied.

## Phase 5 : le moteur du Color shift et ses limites

- [ ] **C2** `packages/couleur/src/rampe.ts` : extraire `poidsA` de
  `teinteA`, sans changer `teinteA` ; `Derive` porte la teinte, la saturation
  et la clarté de chaque bout ; `fabriquerRampe` applique la part
  `part × (1 + s × poids)` bornée à [0, 1], puis la clarté
  `L + décalage + c × poids`. Poids et facteur des fonds se lisent sur la
  clarté de la courbe. `palette.ts` passe la dérive entière à
  `fabriquerPalette` et à `rampeUnique`.
- [ ] **C3** Tests de propriétés dans `packages/couleur/tests/` :
  - décalage nul à la clarté du pivot, pour les trois grandeurs ;
  - les octets de la référence au cran porteur, sous vingt mille tirages de
    décalages, dans `ancrage.test.ts` ;
  - `proprietes.test.ts` et les vecteurs figés inchangés quand saturation et
    clarté manquent ;
  - une palette grise reste grise sous toute saturation.
- [ ] **C4** Nouveau `packages/couleur/src/limites.ts`, pur :
  `limiteDynamique` reçoit la recette, la palette, une fonction qui rend la
  palette candidate pour une valeur, les bornes fixes, le pas, et l'exigence
  d'ordre des nuances. Elle rend les deux bornes et leur cause : la première
  promesse tenue au départ qui manquerait, lue par `verifierPromesses`, ou
  l'ordre. Une promesse manquée au départ ne borne rien. La fonction ne
  dépend ni d'`edition.ts` ni du plugin : le Color shift et le réglage global
  lui passent chacun leur candidate.
- [ ] **C5** Mesure : `packages/couleur/scripts/mesurer-limites.mjs`, sur le
  modèle de `mesurer-temps.mjs`, relève la durée d'une limite dans Node et
  rejoue le tableau de l'étude sur les dix-neuf paires. Mettre à jour la
  section 5.2 de l'étude avec ces nombres. Si une limite dépasse 50 ms,
  écrire la mesure et s'arrêter : le mainteneur choisit entre un balayage
  grossier puis fin et un calcul hors du fil de l'interface.
- [ ] **C6** Tests de `limites.ts` : toute valeur dans la limite garde les
  promesses tenues au départ ; la valeur d'un pas au-delà d'une borne à cause
  en fait manquer une ; les limites se croisent (luminosité en butée, puis
  teinte bornée) sur Bleu, Rouge, Jaune et Sauge.
- [ ] **C7** AGENTS.md, invariants du moteur de couleur : l'invariant de
  `teinteA` couvre les trois grandeurs ; un invariant nouveau pour
  `limiteDynamique` et le test qui le tient. Carte du code : `limites.ts`.

## Phase 6 : l'interface

### Édition

- [ ] **C8** `src/edition.ts` : `reglerDecalage(recette, palette, profil,
  grandeur, bout, valeur)` remplace `reglerBout` ; les préréglages ne règlent
  que la teinte ; `lierLesProfils` copie les trois grandeurs de Vivid ;
  « Tout rétablir » rend la teinte Tailwind, la saturation et la clarté à
  zéro. Tests d'édition et de rangement.

### Le Color shift

- [ ] **C9** Nouveau `src/ui/derive/reglette.ts` : piste peinte par le moteur,
  zones hachurées hors limite, repère Tailwind pour la teinte, champ, bouton
  « Tailwind » ou « Rétablir », clavier (flèches, Maj, Origine et Fin aux
  bornes permises), `aria-valuemin`, `aria-valuemax` et `aria-valuetext` sur
  les bornes permises.
- [ ] **C10** `src/ui/derive/editeur.ts`, `graphe.ts`, `geometrie.ts` : trois
  onglets de grandeur avec leurs valeurs et leur pastille ; échelles par
  grandeur ; rails permis et hachurés aux poignées ; rampes sans et avec Color
  shift sous le graphe ; ligne fixe de la plage sûre, qui devient la butée et
  sa cause. La limite se calcule au début de l'éditeur et au relâchement,
  jamais pendant un glisser. Palette grise : teinte et saturation désactivées,
  luminosité active.
- [ ] **C11** `src/ui/ongletPalettes.ts` : titre de section « Ajuster la
  palette » et sa phrase ; carte « Réglage global » puis carte « Color
  shift », titres et sous-titres de l'étude ; pied de la carte globale « Le
  Color shift s'applique ensuite, autour de la référence. » ; résumé replié du
  Color shift. Catalogues : `TEXTES_DE_L_ONGLET.derive`, `LIBELLES_DES_CIBLES`,
  `TEXTES_DE_LA_DERIVE`, `TEXTES_DE_CONFIGURATION.pied`, et chaque message qui
  nomme « hue shift » ou « dérive de teinte ».

### Le réglage global borné (décision Q6)

- [ ] **C12** `src/ui/reglagesDeLaPalette.ts` : chaque curseur prend la
  limite de `limiteDynamique`, avec `reglerTeinte`, `reglerSaturation` ou
  `reglerClarte` comme candidate, pour la cible choisie (Vivid, Soft, les
  deux). Même réglette à zones hachurées, même ligne de plage sûre et de
  butée. Les Réglages communs restent sans limite.
- [ ] **C13** Tests d'interface Chromium : onglets, glisser borné, clavier,
  annulation, butée annoncée, curseur global borné, déplacement nul (M1)
  pendant chaque geste du Color shift. Galerie : un état par onglet, un état
  en butée, un état de palette grise, à la taille par défaut et à 500 × 520.

### Les glyphes des cartes

- [ ] **G1** Maquette : un glyphe par carte titrée, dans le style des deux
  glyphes validés (cadre de 44 × 28, affiché en 38 × 24, trait de 1,8, rôles
  `--texte-second` et `--texte-marque`, aucune couleur de donnée). Cartes de
  l'onglet Création : référence et configuration, Réglage global, Color
  shift, Garanties de contraste, Interface de test, création d'une palette.
  Réglages communs : fonds, intensités, courbes, seuils de contraste,
  couleurs proches, contenu des planches. Onglet Palettes : palettes et
  réglages. Les fiches et les cadres, titrés par un nom de palette, n'en ont
  pas. Ajouter la planche des glyphes à la maquette de l'étude, dans les deux
  thèmes de Figma.
- [ ] **G2** Arrêt : le mainteneur valide la planche des glyphes.
- [ ] **G3** Nouveau `src/ui/glyphes.ts` : un SVG par carte, `aria-hidden`,
  couleurs par les rôles de la feuille. `carte.ts` accepte un glyphe à gauche
  du titre ; chaque appel à `createCarte` qui porte un titre de la liste G1
  passe le sien. La loi des styles du socle passe.
- [ ] **G4** Galerie : les cartes avec leur glyphe, dans les deux thèmes.

## Phase 7 : `ucm check`

- [ ] **A4.1 à A4.4** Le diagnostic des emplois, lu dans
  `@ucm-kit/core/emplois`, comme le plan d'intégration le décrit. Cette phase
  ne dépend que de la phase 3 ; elle peut précéder la phase 5 si le mainteneur
  le demande.

## Phase 8 : clôture

- [ ] **F1** AGENTS.md : relire la carte du code et les invariants touchés par
  les phases 2 à 7 ; `tests/inventaireInvariants.test.ts` passe.
- [ ] **F2** [docs/README.md](../../../../README.md) : l'étude et ce plan ont
  leur ligne ; la ligne du plan d'intégration de l'architecture renvoie à ce
  plan pour l'ordre des tâches.
- [ ] **F3** Arrêt : essais du mainteneur dans Figma. Pour le Color shift, les
  six essais de la maquette dans le plugin ; pour l'architecture, A5.1 à A5.3.
- [ ] **F4** A3.1 à A3.6, la consigne de la direction globale, une fois les
  résultats d'A5 connus.
- [ ] **F5** A6.1 à A6.3, dans le dépôt `UCM-Playground`, sur demande du
  mainteneur.
