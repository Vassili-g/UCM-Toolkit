# Comparer, harmoniser, différencier : dossier

**Statut : proposition à valider.** Ce dossier repense le sujet de l'onglet
Comparer à partir de toutes les recherches d'interface antérieures et des
mécanismes du plugin. Il propose dix briques et trois parcours, puis
recommande l'un d'eux. La [maquette](./Maquettes/MAQUETTE-COMPARER.html) montre
l'existant, chaque brique et les parcours. Les décisions C1 à C8 sont en
section 11.

## 1. Le besoin

| Tâche | Question du designer | Nature de l'écart |
|---|---|---|
| Comparer | Mes palettes vont-elles ensemble, cran par cran et sur des composants ? | Visuelle : elle se juge à l'œil, sur des composants |
| Harmoniser | Comment donner la même clarté et la même saturation à mes statuts ? | Une propriété des réglages : une palette s'écarte parce qu'un réglage propre l'en éloigne |
| Différencier | Deux statuts se ressemblent : laquelle déplacer, de combien, vers où ? | Une propriété d'une paire : leurs teintes, ou leurs chromas près du gris |

La recette critique a établi les causes chiffrées. Aux réglages communs, la
clarté des quatre utilitaires tient à 0,002 près hors références ; les écarts
de 0,016 à 0,047 viennent des luminosités propres. La saturation s'écarte de
×4,2 avec la part constante, de ×1,7 avec l'enveloppe. Orange et Poppy se
confondent sur le fond teinté en Dark, à une distance de 0,019.

Conséquence pour l'interface : harmoniser revient surtout à retirer ou
aligner des réglages propres, et différencier revient à tourner une teinte.
Seule la comparaison demande une vue nouvelle.

## 2. Ce que les recherches précédentes ont proposé

| Source | Proposition | Sort |
|---|---|---|
| [Proposition finale](../Intégration%20du%20marché/03%20Proposition%20finale/PROPOSITION-FINALE.md), piste 13 | « Comparer à » dans l'en-tête de l'aperçu : une seconde palette peinte sous la palette ouverte, ligne Δ par cran, pour la session. « Proches à dessein » range une paire voulue et tait l'alerte | Non implémentée ; la direction simple a retiré les marques qui portaient la portée de l'alerte |
| Même source, piste « Distinguer les statuts » | Une carte repliée : quatre spécimens de statut, choix d'une vision (Viénot 1999, Brettel 1997), paires sous le seuil dans cette vision, aucune alerte, car `[VER-08]` veut qu'une alerte mène au réglage qui la lève | Non implémentée ; l'onglet Système qui la portait a disparu |
| [Direction globale](../Intégration%20du%20marché/06%20Direction%20globale/DIRECTION-GLOBALE.md) | « Comparer à une autre palette » repliée dans l'onglet Vérifier | Abandonnée avec la direction globale, jugée trop complexe |
| [Plan d'harmonisation](../Harmonisation%20entre%20palettes/PLAN-RECHERCHE-HARMONISATION.md) | Quatre hypothèses : témoin dans Création (A), carte dans Vérification (B), vue de cohérence dans Gestion (C), réglage de groupe (D). Recommandait A, parce que l'écart naît pendant le réglage | Non tranchée |
| [Dossier d'harmonisation](../Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md) | Comparer dans Vérification sans palette ouverte, groupe choisi à la volée, alignement de la luminosité seule par une modale | Décisions D1 à D7 en attente |
| Première version de ce dossier | Un onglet Comparer sur un groupe « Statuts » | Le groupe n'avait ni création ni règle : la maquette supposait un objet que le plugin ne connaît pas |

Quatre leçons :

1. **Chaque proposition a buté sur le groupe.** Un groupe nommé demande sa
   création, son renommage, sa survie à une suppression et une place dans la
   recette. Aucune n'a résolu ces règles à un coût acceptable.
2. **Une alerte mène au réglage qui la lève** (`[VER-08]`). Un écart qu'aucun
   geste ne corrige est une information, pas une alerte.
3. **Le mainteneur a écarté la complexité** : la direction globale a cédé la
   place à la direction simple, en trois onglets.
4. **L'écart naît pendant le réglage.** Le plan d'harmonisation le notait ; la
   recette critique le confirme : les écarts mesurés viennent tous de réglages
   faits dans Création.

## 3. Ce que le plugin fait aujourd'hui

| Mécanisme | Où | Ce qu'il fait | Ce qu'il apporte à la refonte |
|---|---|---|---|
| Sélecteur | Barre de Création et de Vérification | Ouvre une palette ; porte la marque de verdict | Peut accepter plusieurs palettes |
| Nuancier | Création et Vérification sans palette ouverte | Trois aplats par palette ; un clic ouvre la palette | Surface naturelle d'une sélection multiple |
| Réglage global | Création, carte repliée | « Régler » Soft, Vivid ou les deux ; repère de l'autre profil sur chaque réglette ; zones hachurées des limites ; « Rétablir » | Précédent d'un réglage qui porte sur plusieurs cibles ; repères réutilisables pour d'autres palettes |
| Color shift | Création, carte repliée | Teinte, saturation et luminosité aux deux bouts | Même logique de cibles |
| Interface de test | Création, carte repliée | La palette ouverte sur un écran d'exemple | Peut peindre plusieurs palettes |
| « Annuler les modifications » et « Rétablir » | Barre de la palette | Défait les changements de la palette ouverte depuis son ouverture | S'étend à une sélection |
| Bilan | Vérification sans palette ouverte | Filtres À corriger, À vérifier, Conformes ; une ligne par message | Accueille les écarts avec leur geste |
| Alerte `palettes-proches` | Pied de Création, bilan de Vérification | ΔEok moyen des crans 500 à 700 en Light, Vivid contre Vivid ; geste : changer la référence | À redéfinir par rôle, dans les deux thèmes, avec la rotation qui sépare |
| Réglages communs | Engrenage | Courbes, parts communes, fonds, seuils | Accueille le préréglage |

La recette porte déjà ce que le préréglage demande : les parts communes
(`profils.soft.part`, `profils.vivid.part`), les courbes communes, et, par
palette, les réglages propres (`parts`, `reglages.clarte`, `reglages.part`,
`derive.*.clarte`, `derive.*.saturation`). Une palette « personnalisée » se
reconnaît donc sans nouveau champ.

## 4. Ce que fait le marché

Outils lus dans leur code ou leur documentation publique. Atmos, Supa Palette
et l'aide de Coolors n'ont pas pu être vérifiés au-delà de leurs pages
commerciales.

| Outil | Vue | Harmoniser | Différencier |
|---|---|---|---|
| [Huetone](https://github.com/ardov/huetone) | Grille teintes × crans ; graphiques L, C, H du cran choisi pour toutes les teintes | « Apply current luminance to column » : une action par colonne de cran | Contraste de la couleur choisie ; pas de vision des couleurs |
| [Harmonizer](https://github.com/evilmartians/harmonizer), plugin Figma | Grille niveaux × teintes ; L, contraste, C, H sur chaque cellule | L'en-tête d'une colonne fixe un contraste cible et un plafond de chroma pour toutes les teintes ; « Even chroma » prend le plus petit des maximums | Aucun |
| [Leonardo](https://leonardocolor.io/theme.html) | Rampes sur un fond commun ; roue avec un point par rampe | Curseurs de clarté, contraste et saturation sur tout le thème | Protanopie, deutéranopie, tritanopie avec un ΔE minimum affiché |
| [Adobe Color](https://blog.adobe.com/en/publish/2020/05/21/celebrate-global-accessibility-awareness-day-with-adobe-color) | Roue à cinq pastilles | Non documenté | Une ligne de conflit relie deux pastilles indiscernables pour une vision ; badge sans conflit |
| [Material](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/blend/blend.ts) | Rôles des couleurs étendues | `Blend.harmonize` tourne la teinte vers la couleur source, de la moitié de l'écart et de 15° au plus ; chroma et ton gardés | Aucun |
| [Radix](https://www.radix-ui.com/colors/custom), [uicolors.app](https://uicolors.app/create) | Rampes et composants d'exemple | Non documenté | Aucun |

Constats :

1. **Le cran est l'unité d'harmonisation** : une colonne de la grille porte
   l'action ou le réglage qui vaut pour toutes les teintes.
2. **Le réglage global sur un jeu existe chez Leonardo seul.** Les autres
   outils règlent une palette à la fois.
3. **Harmonizer aligne la chroma par un plafond commun**, le plus petit des
   maximums. C'est le principe de l'enveloppe de la recette critique.
4. **La rotation vers une source est bornée chez Material**, à 15°. UCM borne
   déjà sa rotation de teinte à 30°.
5. **La différenciation passe par la vision des couleurs** : lignes de conflit
   sur la roue (Adobe Color), ΔE minimum (Leonardo). Aucun outil ne signale
   deux teintes trop proches en vision normale.
6. **Aucun outil ne montre d'avant et d'après** : l'aperçu est l'édition en
   direct, et une annulation n'est documentée nulle part.
7. **Aucun outil ne pose plusieurs jeux rangés côte à côte** ; tous montrent
   un seul jeu, entier.

Ce que la refonte en retient : la grille alignée cran par cran (B3), le réglage
direct de plusieurs palettes (B4), le plafond commun de chroma (l'enveloppe),
les lignes de conflit sur la roue (B10), et une rotation bornée et nommée (B5).
L'avant et l'après de B9 sont propres à UCM : ils servent un geste qui
modifie plusieurs palettes rangées.

## 5. Les mécanismes à repenser

### M1. Le préréglage et l'état « Personnalisée »

- **Ce qui le compose** : la saturation de chaque profil, la luminosité de
  chaque profil, le Color shift de luminosité et de saturation. La teinte, le
  Color shift de teinte et la référence restent des choix de couleur, propres
  à chaque palette.
- **Où il se règle** : une carte « Préréglage des palettes » dans les
  réglages communs, qui reprend les parts communes et, si l'enveloppe est
  adoptée, ses bornes.
- **Ce que voit le designer** : « Personnalisée » dans le sélecteur à côté du
  nom, un point gris sur la carte du nuancier, « Personnalisée » en résumé des
  cartes Réglage global et Color shift. La carte ouverte liste chaque écart au
  préréglage en clair.
- **Les gestes** : « Revenir au préréglage » dans la carte d'une palette ;
  « Tout revenir au préréglage… » dans les réglages communs, qui liste les
  palettes avant d'agir. Une luminosité réglée sur le profil qui porte la
  référence déplace la référence : le geste l'annonce (« la référence redevient
  `#ED0007` ») et la fiche Gestion passe à « À mettre à jour ».
- **Ce que ce mécanisme règle seul** : une palette ne peut plus s'écarter sans
  le dire. Harmoniser devient l'inverse d'un écart visible.

### M2. Des écarts définis par leurs causes

- **Un écart** est une palette personnalisée, ou une paire qui se confond sur
  un rôle suivi. Le reste est une information : la saturation qui reste
  différente d'une teinte à l'autre, les références ancrées à des crans
  différents, la proximité dans une vision des couleurs simulée.
- **L'alerte `palettes-proches` change de mesure.** Elle compare le plein
  (`solid/default`), le fond teinté (`surface/default`) et son texte
  (`surface/foreground`), en Light et en Dark, en Soft et en Vivid. Seuils
  d'essai de distance Oklab : 0,10 pour le plein, 0,06 pour le texte, 0,025
  pour le fond teinté. Son geste devient la rotation de teinte qui sépare la
  paire (M4), et non plus « changez la référence ».
- **« Proches à dessein »** (piste 13) reste possible pour deux variantes
  voulues d'une même teinte. Il range la paire dans la recette ; c'est le seul
  ajout de format de ce dossier, et il est facultatif (C8).

### M3. La sélection multiple

- **Comment** : Maj-clic ou Cmd-clic sur les cartes du nuancier, comme dans
  Figma, ou les cases du sélecteur. Une barre « N palettes choisies · Ouvrir
  ensemble » confirme. Une sélection est éphémère, comme une sélection de
  calques : rien n'est rangé.
- **Ce que montre Création** :

  | Carte | Une palette | Plusieurs palettes |
  |---|---|---|
  | Titre | « Palette Orange » | « 4 palettes » |
  | Configuration | Nom, référence, réglages avancés | Masquée : elle porte l'identité d'une palette |
  | Aperçu | Soft et Vivid, bandes des dossiers | Une ligne par palette, un profil à la fois ; une marque sous chaque cran qui s'écarte ; un clic sur la marque choisit les palettes qui s'écartent à ce cran, comme l'action par colonne de Huetone (B3) |
  | Réglage global | Les réglettes de la palette | Les réglettes de la sélection : « Mixte », un repère par palette, celui du préréglage (B4) |
  | Color shift | La palette | Les bouts clair et sombre de la sélection, en « Mixte » ; la teinte des bouts désactivée |
  | Interface de test | La palette | Une ligne de composants par palette (B6) |
  | Pied | Les garanties de la palette | Les garanties de la sélection, la palette en échec nommée |

- **Règles de réglage** : une valeur saisie ou un pouce lâché s'applique à
  toute la sélection, comme dans le panneau de propriétés de Figma. Une
  valeur qu'une palette refuse (zone hachurée) s'arrête à sa limite pour
  celle-ci, et la ligne de confirmation la nomme : « Sky s'arrête à 0,94 ».
  La teinte et le Color shift de teinte ne se règlent qu'une palette à la
  fois : une même valeur effacerait les teintes.
- **Palettes particulières** : une palette figée se choisit pour être vue, et
  les réglages la laissent telle quelle ; une palette à une intensité montre
  sa rampe unique dans Soft et dans Vivid ; une palette libre s'aligne par
  numéro, et un numéro absent reste vide.
- **Annuler** : « Annuler les modifications » s'étend à la sélection et
  défait le dernier geste de groupe en une fois.

### M4. Les repères des autres palettes sur la réglette de teinte

Palette seule ouverte, la réglette de teinte du Réglage global porte un repère
coloré par autre palette. Quand une paire se confond (M2), un pouce fantôme
montre la plus petite rotation qui la sépare sur tous les rôles suivis, dans
la borne du réglage (±30°). Le bouton nomme le sens par le secteur visé :
« +9° · plus jaune ». Un clic l'applique ; rien ne s'applique seul. Sans
rotation possible, la ligne le dit et propose la chroma des fonds (Terracota
et Poppy, Terracota et Deep).

### M5. L'onglet Comparer

Pour le parcours P2. Toutes les palettes en lignes sur des composants, un
profil et un thème à la fois. « Masquer » retire une ligne de la vue, sans rien
changer aux calculs. Une carte « Écarts » liste les écarts de M2, chacun avec
son geste. Le compteur de l'onglet ne compte que les paires qui se
confondent : une marque volontairement différente ne le fait pas sonner.
« Harmoniser » et « Écarter » s'ouvrent en modales avant et après (B9).

### M6. Distinguer les palettes

Une carte repliée de Vérification sans palette ouverte, ou une vue de l'onglet
Comparer : la roue des teintes de toutes les palettes, les paires qui se
confondent rôle par rôle, et une vision des couleurs simulée (Viénot 1999 pour
la protanopie et la deutéranopie, Machado 2009 pour la tritanopie). La
simulation ne lève aucune alerte. Dans la recette du mainteneur, en
deutéranopie, les fonds teintés Dark d'Orange et de Poppy deviennent la même
couleur (`#282817`), et le plein de Grass rejoint celui de Terracota à 0,013.

### M7. Le couplage de la luminosité entre Light et Dark

Le Color shift de luminosité agit sur une clarté : le bout clair porte les
fonds en Light et les textes en Dark. Aligner les fonds de Light déplace donc
les textes de Dark. Deux réponses : l'afficher avant d'appliquer (retenu dans
les parcours), ou ranger un Color shift de luminosité par thème (changement de
moteur et de format, hors de cette proposition).

## 6. Les dix briques

| # | Brique | Mécanisme | Tâche |
|---|---|---|---|
| B1 | Préréglage et « Personnalisée », dans la palette et dans les réglages communs | M1 | Harmoniser |
| B2 | Ouvrir plusieurs palettes depuis le nuancier ou le sélecteur | M3 | Comparer |
| B3 | L'aperçu de la sélection, aligné cran par cran | M3 | Comparer |
| B4 | Régler la sélection : « Mixte », repères, préréglage | M3 | Harmoniser |
| B5 | Différencier en réglant la teinte : repères et fantôme | M4 | Différencier |
| B6 | L'interface de test de la sélection | M3 | Comparer |
| B7 | Le bilan de Vérification ouvre la bonne sélection | M2 | Les trois |
| B8 | L'onglet Comparer | M5 | Comparer |
| B9 | Harmoniser en une modale | M5 | Harmoniser |
| B10 | Distinguer les palettes, avec la vision des couleurs | M6 | Différencier |

## 7. Trois parcours

### P1. Tout dans Création (recommandé)

- **Comparer** : choisir les palettes dans le nuancier (B2), lire l'aperçu
  aligné (B3) et l'interface de test (B6).
- **Harmoniser** : régler la sélection (B4), ou « Revenir au préréglage ».
- **Différencier** : ouvrir une palette, suivre le fantôme de la réglette de
  teinte (B5).
- **Depuis Vérification** : chaque écart ouvre sa sélection dans Création (B7).
- **Ce qui change ailleurs** : le sélecteur et le nuancier acceptent plusieurs
  palettes ; aucune carte, aucun onglet, aucune modale ne s'ajoute.
- **Coût** : élevé. L'état partagé `PaletteOuverte` (`ui/paletteOuverte.ts`)
  porte un seul identifiant, une palette et son analyse ; le module des
  réglages (`reglagesDeLaPalette.ts`) affiche et valide une palette à la fois.
  La sélection remplace l'identifiant par une liste en un seul point, puis
  chaque carte de Création choisit son comportement à plusieurs.
- **Risque** : la densité de l'aperçu à vingt palettes ; il montre un profil à
  la fois et une ligne de 16 px par palette.

### P2. Onglet Comparer

- **Comparer** : l'onglet montre toutes les palettes sur des composants (B8).
- **Harmoniser** : « Harmoniser… » ouvre la modale (B9), cases cochées sur les
  palettes personnalisées.
- **Différencier** : « Écarter… » ouvre la roue et les deux rotations ; la vue
  Teintes porte la vision des couleurs (B10).
- **Ce qui change ailleurs** : un quatrième onglet ; Création reste à une
  palette.
- **Coût** : moyen, dans un module isolé.
- **Risque** : l'écart se lit après le réglage, en changeant d'onglet.

### P3. Le minimum

- **Comparer** : la roue et les paires de la carte Distinguer (B10) ; aucune
  vue de composants.
- **Harmoniser** : préréglage, « Revenir au préréglage », « Tout revenir »
  (B1).
- **Différencier** : la nouvelle alerte et sa rotation chiffrée (B7, M4).
- **Coût** : faible.
- **Risque** : aucune vue ne pose les statuts côte à côte sur des composants.

### Recommandation

P1, livré en deux temps. D'abord le socle commun aux trois parcours : B1, B7,
B10 et la nouvelle alerte, sans changement de format. Puis la sélection
multiple (B2 à B6). Le socle traite seul les causes mesurées ; la sélection
multiple ajoute la vue d'ensemble là où naissent les écarts, avec un idiome
que tout utilisateur de Figma connaît. Si la sélection multiple coûte trop à
Création, P2 se construit sur le même socle.

## 8. Réponses aux questions du mainteneur

| Question | Réponse |
|---|---|
| Combien de palettes à la fois ? | Autant que la sélection, sans limite ; l'aperçu passe à une ligne de 16 px par palette |
| En prenant quelle référence ? | Le préréglage ; une palette de la sélection peut servir de modèle en saisissant sa valeur |
| Selon quelle règle ? | Une valeur pour toute la sélection, chaque palette arrêtée à sa limite et nommée |
| Uniquement la luminosité ? | Luminosité et saturation, ensemble ou séparément ; la teinte se différencie, elle ne s'aligne pas |
| Tons clairs et foncés séparément ? | Oui, par les bouts clair et sombre du Color shift, avec le couplage Light et Dark affiché (M7) |
| Comparer les ressemblances de teinte ? | Les repères de la réglette (B5), la roue (B10), les paires par rôle (M2) |
| Écarter les teintes ? | La plus petite rotation qui sépare la paire, nommée par le secteur visé, appliquée d'un clic |
| Basculer en Création ou rester ? | Avec P1, tout se passe dans Création ; Vérification y renvoie |
| N crans identiques au minimum ? | Remplacé par des rôles nommés : un seuil sur des crans peu employés tiendrait alors que deux badges se confondent |

## 9. États et cas limites

| Cas | Comportement |
|---|---|
| Une palette dans le fichier | Aucune sélection multiple ; la réglette de teinte n'a pas de repère |
| Vingt palettes | Le nuancier reste la surface de choix ; l'aperçu, une ligne par palette et un profil à la fois |
| Palette figée | Visible dans une sélection ; aucun réglage ne la touche ; la confirmation la nomme |
| Palette à une intensité | Sa rampe unique dans Soft et Vivid, marquée « 1 intensité » |
| Palette libre | Alignée par numéro ; un numéro absent reste vide ; ses garanties suivent ses crans |
| Palette grise | Aucune teinte : ni repère sur la réglette, ni rotation proposée |
| Référence ancrée ◆ | Son cran n'entre pas dans la marque d'écart de l'aperçu ; son écart s'affiche en information |
| Valeur refusée par une palette | Elle s'arrête à sa limite ; la ligne de confirmation la nomme |
| Thème inversé | Les rôles suivis lisent la table du sens du thème |
| Après un geste | Un rangement ; « Annuler les modifications » le défait ; Gestion passe les palettes à « À mettre à jour » |

## 10. Ce que chaque parcours touche

| Lot | Fichiers | P1 | P2 | P3 |
|---|---|---|---|---|
| Préréglage et état personnalisé | `packages/couleur` (détection, retour), `ui/reglagesDeLaPalette.ts`, réglages communs, sélecteur, nuancier | Oui | Oui | Oui |
| Écarts par rôle et rotation | `alertes.ts`, `analyse.ts`, `presentation.ts`, nouveau calcul de rotation minimale | Oui | Oui | Oui |
| Vision des couleurs | Nouveau module pur, ses matrices et leurs tests | Oui | Oui | Oui |
| Sélection multiple | État de l'interface, `nuancier.ts`, `barreDePalette.ts`, `ongletCreation.ts`, `reglagesDeLaPalette.ts`, Color shift, interface de test, pied | Oui | Non | Non |
| Onglet Comparer et modales | Nouveau module d'onglet, `ui/frontiere.ts`, galerie | Non | Oui | Non |
| Textes en deux langues, galerie, tests d'interface | `i18n/fr.ts`, `i18n/en.ts`, `galerie/etats.cjs`, tests Chromium | Oui | Oui | Oui |
| Recette | Aucun changement, sauf « Proches à dessein » (C8) | | | |

## 11. Décisions

| # | Décision | Proposition |
|---|---|---|
| C1 | Le parcours | P1, en deux temps : le socle (B1, B7, B10, nouvelle alerte), puis la sélection multiple. P2 en repli |
| C2 | Le préréglage | Saturation, luminosité, Color shift de luminosité et de saturation ; la teinte reste propre à la palette |
| C3 | La sélection | Éphémère, comme dans Figma ; aucun groupe, rien dans la recette |
| C4 | Régler plusieurs palettes | Une valeur pour toute la sélection, « Mixte » sinon ; la teinte une palette à la fois |
| C5 | Ce qui compte comme écart | Une palette personnalisée, une paire qui se confond sur un rôle suivi ; le reste en information |
| C6 | Différencier | La plus petite rotation qui sépare, nommée par le secteur visé, appliquée d'un clic |
| C7 | La vision des couleurs | Une simulation à la demande, sans alerte |
| C8 | « Proches à dessein » | À garder pour les variantes voulues d'une même teinte, si le mainteneur en emploie |

## 12. Limites

- Les seuils de distance par rôle sont des valeurs d'essai.
- La sélection multiple n'a pas été prototypée dans le plugin ; son coût est
  estimé à la lecture de `PaletteOuverte` et des modules qui la lisent.
- La rotation de teinte passe par le réglage de la carte et déplace la
  référence ; une marque qui garde sa référence exacte n'a pas ce geste.
- La simulation des visions des couleurs suppose une dichromatie complète ;
  elle ne prouve pas qu'un composant reste lisible.
