# Vue composant de l'explorateur : plan d'implémentation

Ce plan transforme le [plan de recherche](./PLAN-RECHERCHE-VUE-COMPOSANT.md) et
la [maquette](./MAQUETTE-VUE-COMPOSANT.html) en tâches exécutables dans
`packages/plugin-explorateur`. Le mainteneur a validé D1 à D5 et D9 à D15. Aucun
essai n'a été fait dans Figma : les questions R1 à R14 restent ouvertes, et le
lot 8 livre la recette qui les lève.

## 1. Consigne à l'agent chargé de l'exécution

Avancer dans l'ordre des lots. Les choix des sections 2 et 3 suffisent pour
développer et vérifier hors de Figma. Ne pas demander au mainteneur de choisir
un nom de module, une forme de message ou un agencement défini ici.

Avant le lot 0, lire :

- [AGENTS.md](../../../../../AGENTS.md), groupe d'invariants de l'explorateur
  compris, et [CONTRIBUTING.md](../../../../../CONTRIBUTING.md), sections
  « Interface du plugin », « Tests » et « Rédiger un document » ;
- [SPEC.md](../../../../../packages/plugin-explorateur/SPEC.md) du paquet ;
- le plan de recherche et la maquette de ce dossier ;
- la skill [`rediger-sans-tics-ia`](../../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md)
  avant tout commentaire ou document, et
  [`rediger-diagnostics-ucm`](../../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md)
  avant tout texte de `src/ui/textes.ts` que la maquette ne fixe pas.

La maquette fixe le dessin et les comportements. La vue livrée reproduit la
fenêtre du plugin de la maquette à l'identique : la section 3 en donne les
mesures et le contrôle. Le script de la maquette lit des contrats : ne pas le
porter dans le plugin, qui lit des calques Figma.

### Reprise et preuves

- [x] Créer `SUIVI-VUE-COMPOSANT.md` dans ce dossier, sur le modèle de
  [SUIVI-IMPLEMENTATION.md](../SUIVI-IMPLEMENTATION.md) : lot courant, prochaine
  tâche, fichiers touchés, commandes et résultats, décisions prises.
- [x] Cocher une tâche quand son résultat et sa preuve existent. Un test non
  exécuté reste non vérifié.
- [x] Après chaque lot, mettre à jour les cases de ce plan et le suivi.
- [ ] Avant une interruption, écrire dans le suivi la prochaine commande utile.

### Travail dans l'arbre partagé

Une autre session modifie le même arbre de travail. Au lancement de ce plan,
`git status` montre des fichiers de `packages/plugin-explorateur` modifiés et
non commités, dont `src/lecture.ts`, `src/ui/index.ts`, `src/ui/styles.css`,
`src/ui/textes.ts`, `SPEC.md` et `AGENTS.md`.

- [ ] Construire sur l'état du disque. Ne jamais lancer `git stash`,
  `git checkout -- <fichier>` ni `git reset` dans cet arbre.
- [ ] Rester sur `main`, sans branche. Un commit par lot, par chemins
  explicites, jamais `git add -A`.
- [ ] Commiter un fichier quand toutes ses modifications viennent de ce plan.
  Sinon, le laisser non commité et le noter dans le suivi.
- [ ] Avant chaque commit, lancer les commandes de la section 6.

### Limites de l'autonomie

L'agent n'ouvre pas Figma. Une recette rejouée sur des doubles de test ne vaut
pas recette réelle : le lot 8 reste non coché jusqu'au passage du mainteneur.
Ne pas publier le plugin ni un paquet npm pour ce plan.

## 2. Périmètre et décisions d'exécution

| Sujet | Choix |
|---|---|
| Sujet lu | Le calque sélectionné s'il est `COMPONENT`, `INSTANCE` ou `COMPONENT_SET`, sinon son plus proche ancêtre de l'un de ces types. Aucun ancêtre : état « Sélectionnez un composant » |
| Sélection multiple | Le premier calque de la sélection décide du sujet. Le pied affiche le nombre de calques ignorés |
| `COMPONENT_SET` (D7) | La vue lit `defaultVariant`. Un `<select>` natif dans l'en-tête liste les variants et relit celui choisi |
| Frontière (D10) | Toute `INSTANCE` strictement sous le sujet. Ses calques ne sont pas parcourus |
| Surcharges du parent | Une liaison posée par le parent dans une instance frontière se lit dans `InstanceNode.overrides`. Elle appartient au sujet et se rattache au calque de l'instance. Sans cette règle, la couleur qu'Alert pose sur son icône quitterait la vue d'Alert |
| Unité de la liste (D9) | Une ligne par couple variable et chaîne résolue. Deux calques qui portent la même variable sous des modes différents donnent deux lignes |
| Style de texte | Un calque `TEXT` qui porte un `textStyleId` donne une ligne par style. Les liaisons de texte du calque que le style porte déjà ne font pas de ligne |
| Natures (D2) | Couleur, Forme, Espacement, Taille, Texte, puis Autre pour toute propriété hors de la table du lot 1 |
| Repli (D11) | `SEUIL_DE_REPLI = 12` lignes dans la portée affichée |
| Regroupement (D13) | Par nature. Le regroupement par partie de la maquette n'est pas implémenté |
| Ligne (D14) | Compacte. La ligne détaillée de la maquette n'est pas implémentée |
| Sélection d'un calque (D12) | Un calque sélectionné sous le sujet déjà lu change la portée, sans relecture. Un sujet différent déclenche une lecture |
| Départ d'une chaîne (R1, R3) | Une variable liée à un calque se lit par `getVariableByIdAsync`, jamais par import. Ses cibles d'alias suivent la règle existante de `src/lecture.ts` |
| Modes (R4, R5) | Chaque ligne se résout avec les modes du calque qui la porte. La table de renommage de `separerLesModes` s'applique aussi aux modes des calques |
| Valeur de Figma (R8) | Le sandbox joint `resolveForConsumer` à chaque ligne. Une valeur différente de celle de la chaîne s'affiche comme un écart, sans masquer la chaîne |
| Aperçu (R10) | `exportAsync` en PNG, 720 px de large au plus, envoyé après la liste |
| Survol (D15, R12) | Les boîtes viennent d'`absoluteBoundingBox`, rapportées à `absoluteRenderBounds` du sujet. Une boîte absente retire le survol de ce calque, sans constat |
| Volume (R13) | Lecture par lots de `LOT = 400` calques avec pause, annulable. Au-delà de `BORNE_DES_CALQUES = 2000`, la lecture s'arrête et le pied compte les calques non lus |
| Index | La vue indexe son propre relevé, limité aux variables atteintes depuis le sujet. Elle ne dépend pas du relevé du fichier |
| Fichier sans variable locale (D1, D8) | La fenêtre s'ouvre à 364 × 680, minimum 320 × 420, sur la vue seule : ni barre, ni arbre, ni onglets, ni inspecteur |
| Fichier avec variables locales (D6) | Un onglet « Composant » après « Table », dans la fenêtre de 1200 × 800 |
| « Afficher dans Figma » | La vue ne propose pas ce geste. Le survol de l'aperçu situe les calques |
| Valeurs sans token (D4) | Les propriétés de la table du lot 2, quand aucune variable ne les lie |
| Textes | Français, dans `src/ui/textes.ts` seul |

### Hors périmètre

- Réparer une liaison, modifier un calque ou une variable.
- Lire les `reactions`, les valeurs par défaut des propriétés d'instance et les
  calques masqués des instances, déjà dans `NON_INSPECTE`.
- Les intégrations UCM : la vue ne lit ni contrat ni recette.

## 3. Fidélité au dessin de la maquette

Le dessin validé est la fenêtre `.plugin` de la maquette, sélecteurs
« Nature » et « Compacte ». La vue livrée le reproduit sans écart : mêmes
éléments, même ordre, mêmes tailles, mêmes espacements, mêmes couleurs, mêmes
glyphes, mêmes textes. L'agent n'ajoute, ne retire et ne redessine aucun
élément. Un écart que le code impose se note dans le suivi avec sa cause, et
attend l'accord du mainteneur avant le commit du lot.

La feuille `<style>` de la maquette fait autorité sur toute valeur absente du
tableau ci-dessous. Lire chaque règle de la maquette avant d'écrire la règle
correspondante de `src/ui/styles.css`.

| Élément | Règle de la maquette | Mesures |
|---|---|---|
| Fenêtre | `.plugin` | 364 × 680 px, une colonne |
| Texte courant | `body` | 13 px, interligne 1,5 |
| Fil d'Ariane | `.fil` | 11,5 px, marge 8 px 16 px 0, séparateur `›` |
| En-tête | `.tete`, `.tete h2`, `.sous` | Marge 12 px 16 px 10 px, nom en 15 px et graisse 600, variant en 12 px |
| Pastille de mode | `.mode` | 10,5 px, hauteur 17 px, bordure 1 px, rayon 99 px |
| Bouton d'outil | `.icone` | 26 × 26 px, rayon 6 px |
| Aperçu | `.apercu` | Marge latérale 16 px, rayon 8 px, hauteur minimale 72 px, image dans 310 × 170 px |
| Frontières | `.imbriques button` | 11,5 px, bordure 1 px, rayon 6 px, écart 6 px |
| Titre de section | `.section-tete` | 10 px, capitales, interlettrage 0,9 px, marge 9 px 16 px 3 px, compte à la suite |
| Résumé | `.resume` | Pastilles de 14 px, écart 3 px, retrait gauche 30 px, texte en chasse fixe 11 px |
| Ligne | `.ligne` | Grille `18px minmax(0,1fr) auto auto`, écart 9 px, marge 5 px 16 px, filet 1 px au-dessus |
| Pastille de ligne | `.pastille` | 16 × 16 px, rayon 4 px ; contour : bordure 3 px sur fond transparent |
| Nom | `.nom` | Chasse fixe 11,5 px, coupé par le début, une ligne |
| Points | `.points i` | 4 px, écart 3 px, le dernier plus clair |
| Valeur | `.valeur` | Chasse fixe 11,5 px ; `×N` en 10,5 px |
| Chaîne | `.chaine`, `.etape-col`, `.etape-nom` | Rail de 1 px, nœud de 7 px, collection en 10,5 px, nom en chasse fixe 11,5 px |
| Champs d'un style | `.champs li` | Grille `92px minmax(0,1fr) auto`, 11,5 px |
| Pied | `.pied` | 11 px, marge 7 px 16 px, filet 1 px au-dessus |

Les couleurs de la maquette sont celles de `src/ui/roles.css`. Trois couleurs
n'y figurent pas : le violet du glyphe de composant, le cadre du survol et le
cadre de la portée. Les ajouter à `roles.css` comme rôles, avec les valeurs de
la maquette. `tests/stylesUi.test.ts` refuse une couleur écrite ailleurs.

Les glyphes sont ceux de la maquette : `◇` composant, `#` calque, `▸` et `▾`
section, `◜` forme, `↔` espacement, `⤢` taille, `─` épaisseur, `Aa` style,
`A` couleur de texte, `›` fil d'Ariane, `×` compte.

Les textes sont ceux de la maquette, au caractère près : « Sélectionnez un
composant », « Filtrer », « Tout déplier ou replier », « interrompue »,
« Aucun token · valeurs directes », « Sans token », « Aucun token ne
correspond. », « N tokens », « N liaisons », « N sans token ».

Trois éléments de la vue n'ont pas de dessin dans la maquette : le `<select>`
des variants, la marque d'écart avec Figma et l'état de lecture en cours. Les
dessiner avec les règles voisines de la maquette, `.mode` pour le sélecteur,
`.valeur.rompue` pour la marque, `.vide` pour la lecture. Les lister dans le
suivi pour la relecture du mainteneur.

### Contrôle de fidélité

Les fixtures `composantSimple` et `composantComplexe` reprennent les noms, les
valeurs et les comptes que la maquette affiche pour Alert et StressTest. La
capture de la galerie et celle de la maquette montrent alors le même contenu.

- [ ] Écrire `galerie/comparer-maquette.cjs` : il ouvre la maquette et la
  galerie étroite dans Chromium, joue les mêmes gestes, capture la fenêtre
  `.plugin` et l'état de galerie, et range les deux images côte à côte dans
  `dist/fidelite/`.
- [ ] Le script mesure aussi, par `getBoundingClientRect` et
  `getComputedStyle`, les éléments du tableau dans les deux pages, et imprime
  chaque écart de taille, de marge, de police ou de couleur. La tolérance est
  de 1 px sur une position et de zéro sur une taille de police, une couleur et
  un texte.
- [ ] Paires à comparer : Alert ouvert ; chaîne dépliée ; style de texte
  déplié ; StressTest replié ; section Couleur dépliée ; calque `UserInput`
  sélectionné ; Button ouvert depuis StressTest ; filtre « radius » ; Tag avec
  chaîne interrompue et valeurs sans token ; Avatar sans token ; état vide.
- [ ] À la fin des lots 4, 5 et 6, lancer le script, ouvrir chaque paire
  d'images et corriger jusqu'à un relevé sans écart. Un lot dont le relevé
  porte un écart sans accord du mainteneur n'est pas livré.
- [ ] Ranger le relevé du dernier passage dans le suivi.

## 4. Organisation cible

```text
packages/plugin-explorateur/
  src/
    composant.ts            modèle pur de la vue : natures, lignes, sections, résumés, portée, préfixe
    lectureDuComposant.ts   le sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles
    apercu.ts               l'image du sujet et la boîte de chaque calque
    lecture.ts              + lireLesVariables, extrait de lireLeReleve ; separerLesModes rend sa table
    messages.ts             + lire-composant, composant, apercu-du-composant, disposition ; selection porte le sujet
    fenetre.ts              + les bornes de la fenêtre étroite
    code.ts                 + les routes, la disposition choisie avant d'afficher la fenêtre
    ui/
      vues/composant.ts     l'en-tête, le fil d'Ariane, l'aperçu, les frontières, les sections, le pied
      etat.ts               + onglet composant, disposition, lecture du composant
      index.ts              + la disposition étroite et la réception des trois messages
      textes.ts, styles.css
  galerie/etats.cjs         + les états de la vue, aux deux dispositions
  tests/
    composant.test.ts
    lectureDuComposant.test.ts
    apercu.test.ts
    fixtures.ts             + composantSimple, composantComplexe
    figmaDeTest.ts          + les doubles de calques, de styles et d'export
```

`composant.ts` ne lit ni `figma` ni le DOM et n'importe aucune intégration.
`lectureDuComposant.ts` et `apercu.ts` reçoivent un port, comme
`consommateurs.ts`.

## 5. Lots

Chaque lot se termine par les commandes de la section 6 et par un commit. Les
lots 4, 5 et 6 passent aussi le contrôle de fidélité de la section 3.

### Lot 0 : état des lieux

Prérequis : aucun. Sortie : suivi créé, commandes vertes avant tout changement.

- [x] Relever `git status --short` dans le suivi, avec la liste des fichiers du
  paquet déjà modifiés.
- [x] Lancer les commandes de la section 6 et noter leur résultat. Un test
  rouge avant le lot 1 se note et ne se corrige pas dans ce plan.
- [x] Lire `src/consommateurs.ts`, `src/lecture.ts`, `src/resolution.ts`,
  `src/navigation.ts`, `src/ui/index.ts`, `src/ui/application.ts`,
  `src/ui/etat.ts`, `src/ui/vues/calques.ts`, `src/ui/chaine.ts`,
  `src/ui/valeurs.ts`, `galerie/etats.cjs`, `tests/figmaDeTest.ts`,
  `tests/loiDeLectureSeule.test.ts`, `tests/galerie.test.ts`.
- [x] Lire dans `node_modules/@figma/plugin-typings/plugin-api.d.ts` les
  déclarations d'`InstanceNode.overrides`, `getMainComponentAsync`,
  `exportAsync`, `absoluteBoundingBox`, `absoluteRenderBounds`,
  `getStyleByIdAsync`, `textStyleId` et `ComponentSetNode.defaultVariant`.
  Noter dans le suivi tout écart avec ce plan.

### Lot 1 : modèle pur de la vue

Prérequis : lot 0. Sortie : `src/composant.ts` et `tests/composant.test.ts`.

Le modèle reçoit une lecture sérialisable et un index. Il ne résout rien par
lui-même : il appelle `resoudre` avec les modes du calque.

- [x] Déclarer les types d'entrée dans `src/composant.ts` :

  ```ts
  interface CalqueDuComposant {
    id: string; nom: string; type: string;
    parent: string | null;
    modes: Record<string, ModeDeCalque>;
    frontiere?: { composant: string };
    boite?: { x: number; y: number; largeur: number; hauteur: number };
  }
  interface LiaisonDuComposant { calque: string; propriete: string; variable: string; valeurDeFigma?: ValeurSource }
  interface StyleDeTexte { id: string; nom: string; liaisons: Array<{ champ: string; variable: string }> }
  interface LectureDeComposant {
    sujet: { id: string; nom: string; type: string; variant: string | null; variants: Array<{ id: string; nom: string }> };
    ancetres: Array<{ id: string; nom: string }>;
    calques: CalqueDuComposant[];
    liaisons: LiaisonDuComposant[];
    styles: StyleDeTexte[];
    usagesDeStyle: Array<{ calque: string; style: string }>;
    directes: Array<{ calque: string; propriete: string; valeur: string }>;
    releve: Releve;
    calquesNonLus: number;
    erreurs: Array<{ calque: string; message: string }>;
  }
  ```

- [x] `natureDe(propriete, typeDuCalque)` rend la nature et le libellé, d'après
  cette table. Le chemin est celui de `liaisonsDuNoeud`, indices retirés.

  | Chemin de propriété | Nature | Libellé |
  |---|---|---|
  | `fills` sur un calque `TEXT`, `texte[…].fills` | Couleur | Texte |
  | `fills` | Couleur | Fond |
  | `strokes` | Couleur | Contour |
  | `effects.color` | Couleur | Effet |
  | `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`, `cornerRadius` | Forme | Rayon |
  | `strokeWeight`, `strokeTopWeight`, `strokeRightWeight`, `strokeBottomWeight`, `strokeLeftWeight` | Forme | Épaisseur |
  | `opacity` | Forme | Opacité |
  | `itemSpacing`, `counterAxisSpacing`, `gridRowGap`, `gridColumnGap` | Espacement | Écart |
  | `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom` | Espacement | Marge |
  | `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` | Taille | Taille |
  | `fontFamily`, `fontSize`, `fontStyle`, `fontWeight`, `lineHeight`, `letterSpacing`, `paragraphSpacing`, `paragraphIndent`, avec ou sans préfixe `texte[…]` | Texte | Texte |
  | tout autre chemin | Autre | le chemin |

- [x] `porteeDe(lecture, calque)` rend le calque et ses descendants.
- [x] `lignesDe(lecture, index, portee)` rend une ligne par clé. La clé d'un
  token est l'identifiant de la variable suivi des modes retenus par chaque
  étape de sa chaîne. La clé d'un style est `style:` suivi de son identifiant.
  Une ligne porte : clé, nature, libellés, calques, `Resultat` de `resoudre`,
  nom complet, nom court, écart avec la valeur de Figma.
- [x] `prefixeCommun(lignes)` reprend la règle de la maquette : le premier
  segment le plus fréquent, puis les segments partagés par tous les noms de ce
  groupe, en laissant au moins un segment à chaque nom. Moins de deux noms dans
  le groupe : préfixe vide.
- [x] `sectionsDe(lignes)` range par nature, dans l'ordre de la section 2, et
  retire les sections vides.
- [x] `resumeDe(section)` rend les couleurs résolues dans l'ordre des lignes,
  puis un texte : valeurs distinctes triées pour les nombres, noms pour les
  styles.
- [x] `frontieresDe(lecture, portee)` rend les composants imbriqués de la
  portée, comptés par nom, avec l'identifiant de la première instance.
- [x] `filtrer(lignes, texte)` cherche dans le nom complet, la valeur affichée
  et les libellés, sans casse.
- [x] `ecartAvecFigma(resultat, valeurDeFigma)` rend vrai quand la chaîne est
  résolue et que `valeursEgales` rend faux. Une chaîne non résolue ne produit
  aucun écart.
- [x] Ajouter `composantSimple()` et `composantComplexe()` à
  `tests/fixtures.ts`, construits à la main. `composantSimple` reprend Alert : 7 calques,
  1 frontière, 10 lignes. `composantComplexe` reprend StressTest : 52 calques,
  10 frontières dont `TileLink` sept fois, un token lié à 12 calques, 5 styles
  de texte, 52 lignes. Ajouter le Tag et l'Avatar de la maquette. Les noms et
  les valeurs sont ceux que la maquette affiche. Ne copier aucun
  `.contract.json`.
- [x] Tests de `tests/composant.test.ts` : chaque ligne de la table des
  natures ; un token sur 12 calques donne une ligne et 12 calques ; deux modes
  donnent deux lignes ; un style donne une ligne ; la portée d'un calque
  retire les lignes des autres branches ; le préfixe sur trois jeux de noms ;
  le résumé de chaque nature ; les frontières comptées ; le filtre ; l'écart
  avec Figma.
- [x] Ajouter `composant.ts` à la liste du noyau de
  `tests/loiDeLectureSeule.test.ts`.

### Lot 2 : lecture du composant dans le sandbox

Prérequis : lot 1. Sortie : `src/lectureDuComposant.ts`, `src/lecture.ts`
étendu, `tests/lectureDuComposant.test.ts`.

- [ ] Dans `src/lecture.ts`, extraire de `lireLeReleve` la lecture par vagues
  des cibles d'alias en `lireLesVariables(port, departs, suivi)`. Les
  identifiants de `departs` se lisent par `getVariableByIdAsync` seul. Les
  cibles d'alias gardent l'import par clé. `lireLeReleve` appelle cette
  fonction et ses tests restent verts sans changement.
- [ ] `separerLesModes` rend la table des modes renommés, par collection.
  `traduireLesModes(table, modes)` l'applique aux modes d'un calque.
- [ ] Déclarer `PortDuComposant` dans `src/lectureDuComposant.ts` : la
  sélection, `getNodeByIdAsync`, `getStyleByIdAsync`, le port de lecture des
  variables, `pause`. `NoeudLu` reçoit en facultatif `children`, `overrides`,
  `textStyleId`, `getMainComponentAsync`, `defaultVariant`,
  `absoluteBoundingBox`, `absoluteRenderBounds` et les propriétés du tableau
  des valeurs sans token.
- [ ] `sujetDe(noeud)` remonte au plus proche `COMPONENT`, `INSTANCE` ou
  `COMPONENT_SET` et rend le sujet, la portée demandée et les ancêtres de ces
  types. Un `COMPONENT` enfant d'un `COMPONENT_SET` prend le nom du jeu et son
  propre nom comme variant.
- [ ] `lireLeComposant(port, depart, suivi)` parcourt les calques du sujet par
  `children`, s'arrête à chaque `INSTANCE`, et relève pour chaque calque
  `liaisonsDuNoeud` et `modesDuNoeud`. Une erreur sur un calque se range dans
  `erreurs` et le parcours continue.
- [ ] Pour chaque instance frontière : son nom vient de
  `getMainComponentAsync`, du jeu parent quand il existe, du nom du calque
  quand la lecture échoue. Ses surcharges viennent d'`overrides` : pour chaque
  entrée dont `overriddenFields` cite `fills`, `strokes`, `effects`,
  `boundVariables` ou un champ de la table des natures, lire les liaisons du
  calque visé, garder celles de ces champs, les rattacher au calque de
  l'instance.
- [ ] Pour chaque calque `TEXT` : un `textStyleId` de type chaîne se lit par
  `getStyleByIdAsync`, une fois par identifiant. Un `textStyleId` mixte se lit
  par `getStyledTextSegments(['textStyleId'])`. Les liaisons du calque dont le
  champ et la variable égalent ceux du style sont retirées.
- [ ] Relever les valeurs sans token. Une valeur compte quand aucune liaison ne
  couvre la propriété sur ce calque.

  | Propriété | Condition | Valeur affichée |
  |---|---|---|
  | `fills[i]` | `SOLID`, visible, opacité non nulle | Hexa |
  | `strokes[i]` | `SOLID`, visible, épaisseur non nulle | Hexa |
  | Rayons | non nul | Nombre |
  | `strokeWeight` | non nul et au moins un contour visible | Nombre |
  | `itemSpacing`, marges | auto-layout et non nul | Nombre |
  | `fontSize` | calque `TEXT` sans style de texte | Nombre |

- [ ] Lire les variables atteintes par `lireLesVariables`, puis traduire les
  modes de chaque calque par la table de `separerLesModes`.
- [ ] Joindre `valeurDeFigma` à chaque liaison par `resolveForConsumer` sur son
  calque, convertie par `convertirValeur`. Une levée laisse le champ absent.
- [ ] Appeler `port.pause()` tous les `LOT` calques et vérifier
  `suivi.annulee()`. Au-delà de `BORNE_DES_CALQUES`, arrêter le parcours et
  compter le reste dans `calquesNonLus`.
- [ ] Ajouter les doubles à `tests/figmaDeTest.ts`, enveloppés par
  `enLectureSeule` : calque, instance avec `overrides`, style de texte.
- [ ] Tests de `tests/lectureDuComposant.test.ts` : le sujet depuis un calque
  profond, depuis une instance imbriquée, depuis un calque hors composant ;
  aucun calque d'une frontière dans la lecture ; une surcharge de `fills`
  rattachée à l'instance ; une surcharge sans liaison ignorée ; le style de
  texte lu une fois pour douze calques ; les liaisons doublons retirées ;
  chaque ligne du tableau des valeurs sans token ; une variable de départ
  jamais importée ; une cible d'alias importée par sa clé ; les modes d'un
  calque traduits quand deux collections distantes partagent un identifiant de
  mode ; l'annulation ; la borne des calques ; aucune écriture relevée par le
  journal d'`enLectureSeule`.
- [ ] Étendre `tests/loiDeLectureSeule.test.ts` : seuls `code.ts` et
  `apercu.ts` appellent `exportAsync`.

### Lot 3 : messages, routes et disposition de la fenêtre

Prérequis : lot 2. Sortie : `src/messages.ts`, `src/code.ts`, `src/fenetre.ts`,
`src/apercu.ts`, leurs tests.

- [ ] Ajouter à `UiRequest` :
  `{ type: 'lire-composant'; demande: number; calque: string | null }`. `null`
  lit la sélection. Un identifiant lit ce calque sans changer la sélection : il
  sert au fil d'Ariane, aux frontières et au choix d'un variant.
- [ ] Ajouter à `PluginMessage` :
  - `{ type: 'composant'; demande: number; lecture: LectureDeComposant | null }` ;
  - `{ type: 'apercu-du-composant'; demande: number; sujet: string; octets: Uint8Array; largeur: number; hauteur: number; origine: { x: number; y: number } }` ;
  - `{ type: 'disposition'; disposition: 'etroite' | 'large' }`.
- [ ] Le message `selection` reçoit `sujet: { id: string; portee: string } | null`
  et `ignores: number`, calculés par `sujetDe`.
- [ ] `src/apercu.ts` : `exporterLApercu(port, sujet)` appelle `exportAsync`
  avec `{ format: 'PNG', constraint: { type: 'WIDTH', value } }`, `value` étant
  la largeur du sujet bornée à 720. Une levée rend `null`, et la vue affiche le
  composant sans image.
- [ ] `src/code.ts` : la route `lire-composant` envoie `composant`, puis
  `apercu-du-composant`. La demande suit `annulees` comme `lire-releve`.
- [ ] `src/fenetre.ts` : ajouter `TAILLE_ETROITE = 364 × 680`,
  `TAILLE_MINIMALE_ETROITE = 320 × 420` et la clé
  `ucm-explorateur/tailleFenetreEtroite`. Les bornes larges ne changent pas.
- [ ] `src/code.ts` : ouvrir l'interface avec `visible: false`, lire
  `getLocalVariablesAsync`, choisir `etroite` quand la liste est vide, poser la
  taille rangée pour cette disposition, appeler `figma.ui.show()`, puis envoyer
  `disposition` en réponse à `lire-preferences`. Une levée de la lecture choisit
  `large`.
- [ ] Tests : `tests/fenetre.test.ts` pour les deux jeux de bornes ;
  `tests/apercu.test.ts` pour la borne de largeur, l'origine et la levée.

### Lot 4 : la vue, états simples

Prérequis : lot 3. Sortie : `src/ui/vues/composant.ts` branché, états de
galerie, tests d'interface.

- [ ] `src/ui/etat.ts` : ajouter l'onglet `composant` après `table`, le champ
  `disposition`, et `composant: { demande, statut, lecture, index, pile, portee, apercu }`.
  `pile` porte les sujets ouverts depuis une frontière.
- [ ] `src/ui/index.ts` : recevoir `disposition`, `composant` et
  `apercu-du-composant`, en ignorant une réponse dont la demande est remplacée.
  En disposition étroite, la racine ne monte que la vue, l'annonce et la poignée.
- [ ] À la réception de `selection` : même sujet que la lecture en mémoire,
  changer `portee` et rendre ; autre sujet, vider la pile et envoyer
  `lire-composant` avec `null` ; `sujet` nul, afficher l'état vide.
- [ ] Rendre, dans l'ordre de la maquette : fil d'Ariane, en-tête, aperçu,
  frontières, filtre, sections, valeurs sans token, pied.
- [ ] En-tête : `◇` et le nom du sujet, ou `#` et le nom du calque quand la
  portée n'est pas le sujet ; le variant ; une pastille par mode nommé dans les
  chaînes de la portée ; les boutons « Filtrer » et « Tout déplier ou replier ».
- [ ] Ligne compacte : pastille, nom court, points, valeur, `×N`. La pastille
  suit la maquette : pleine pour un fond, évidée pour un contour, marquée « A »
  pour un texte, signe de la nature pour un nombre. L'infobulle porte les
  libellés et les calques.
- [ ] Ligne dépliée d'un token : la chaîne de `rendreChaine` de
  `src/ui/chaine.ts`, la valeur copiable par `copierTexte`, puis les libellés et
  les calques. Si `rendreChaine` impose l'application du relevé du fichier, en
  extraire une fonction qui reçoit l'index.
- [ ] Ligne dépliée d'un style : une ligne par champ, avec les collections
  traversées et la valeur.
- [ ] Chaîne non résolue : la ligne affiche le titre du constat de
  `constatDeChaine`, la chaîne dépliée s'arrête sur la cause, sans valeur.
- [ ] Écart avec Figma : la ligne garde la valeur de la chaîne et reçoit une
  marque d'avertissement. La ligne dépliée affiche les deux valeurs.
- [ ] Pied : nombre de tokens, nombre de liaisons quand il est supérieur,
  calques non lus, calques ignorés de la sélection, bouton des valeurs sans
  token.
- [ ] États sans token : « Aucun token », puis les valeurs sans token.
- [ ] Clavier : chaque ligne, section, frontière et miette est un `button`.
  `aria-expanded` suit le repli. Le focus revient sur l'élément actionné après
  un rendu.
- [ ] Textes dans `src/ui/textes.ts`, classes dans `src/ui/styles.css` avec les
  rôles existants. Aucune couleur en dur hors de `roles.css`.
- [ ] États de `galerie/etats.cjs`, en disposition étroite : vide, composant
  simple, chaîne dépliée, chaîne interrompue, composant sans token, valeurs sans
  token dépliées, lecture en cours, écart avec Figma. En disposition large :
  l'onglet « Composant ».
- [ ] `galerie/build-galerie.cjs` construit une troisième galerie à 364 × 680,
  dans `dist/galerie-etroite/`.
- [ ] Tests d'interface dans `tests/interface/interface.test.mjs` : une
  sélection affiche le composant ; un clic déplie la chaîne et la copie écrit la
  valeur ; une réponse d'une demande remplacée est ignorée ; la disposition
  étroite ne monte ni arbre ni onglets ; le texte d'un nom de calque s'insère
  sans HTML.

### Lot 5 : composant complexe

Prérequis : lot 4. Sortie : repli, résumés, frontières, portée, filtre.

- [ ] Au-delà de `SEUIL_DE_REPLI` lignes dans la portée, chaque section s'ouvre
  repliée, avec son résumé. Un choix du designer sur une section tient jusqu'au
  changement de sujet.
- [ ] Un clic sur une pastille du résumé ouvre la section, déplie la ligne et
  la fait défiler dans la vue.
- [ ] « Tout déplier ou replier » : une section fermée, tout ouvrir ; sinon
  fermer les lignes et rendre aux sections leur état par défaut.
- [ ] Rangée des frontières : `◇ Nom ×N`. Un clic empile le sujet courant et
  envoie `lire-composant` avec l'identifiant de la première instance.
- [ ] Fil d'Ariane : les ancêtres de la lecture, la pile, puis le calque de la
  portée. Une miette de la pile dépile sans relecture si sa lecture est en
  mémoire. Une miette d'ancêtre envoie `lire-composant`.
- [ ] `<select>` des variants quand `sujet.variants` en porte plus d'un.
- [ ] Filtre : le champ s'ouvre par la loupe, filtre à la frappe, ouvre toutes
  les sections tant qu'il porte un texte. « Aucun token ne correspond » quand
  la liste est vide.
- [ ] États de galerie : composant complexe replié, section dépliée, portée
  d'un calque, frontière ouverte avec fil d'Ariane, filtre, variants.
- [ ] Tests d'interface : `composantComplexe` replié tient sans défilement à
  364 × 680 ; la pastille ouvre sa ligne ; la frontière envoie
  `lire-composant` avec le bon identifiant ; la miette revient ; un message
  `selection` sous le même sujet n'envoie aucune demande.

### Lot 6 : aperçu et survol

Prérequis : lot 5. Sortie : image et boîtes dans la vue.

- [ ] L'aperçu affiche l'image par une URL de blob, révoquée au changement de
  sujet. Il tient dans 332 × 170 px, réduit sans rognage. Sans image, la zone
  disparaît.
- [ ] Le survol ou le focus d'une ligne pose un cadre sur chaque boîte de ses
  calques, réduit du même facteur que l'image. La portée d'un calque pose un cadre d'une
  autre couleur de rôle.
- [ ] Une boîte hors de l'image ou absente ne pose aucun cadre.
- [ ] États de galerie : aperçu avec survol, aperçu absent.
- [ ] Tests d'interface : le nombre de cadres au survol d'une ligne à
  12 calques ; aucun cadre sans boîte.

### Lot 7 : documentation et lois

Prérequis : lot 6. Sortie : documents d'autorité à jour.

- [ ] `packages/plugin-explorateur/SPEC.md` : une section « Vue composant » qui
  porte le sujet, la frontière et les surcharges, l'unité de la liste, le
  style de texte, les modes, l'écart avec Figma, la borne des calques, la
  disposition de la fenêtre.
- [ ] [AGENTS.md](../../../../../AGENTS.md) : ajouter les trois fichiers à la
  carte du code, et les invariants suivants au groupe de l'explorateur, chacun
  avec son autorité et son test :
  - une variable liée à un calque ne s'importe jamais, seules ses cibles
    d'alias le peuvent ;
  - la vue ne parcourt aucun calque sous une instance imbriquée, et n'en lit
    que les surcharges du parent ;
  - seuls `code.ts` et `apercu.ts` appellent `exportAsync` ;
  - les modes d'un calque suivent la table de `separerLesModes`.
- [ ] Vérifier que `tests/inventaireInvariants.test.ts` passe : il compare
  AGENTS.md et le code dans les deux sens.
- [ ] `packages/plugin-explorateur/README.md` : la vue, ses deux dispositions,
  ses limites.
- [ ] Plan de recherche : renvoyer vers ce plan à l'étape 5.

### Lot 8 : recette Figma

Prérequis : lot 7. Sortie : `RECETTE-VUE-COMPOSANT.md` dans ce dossier, à
exécuter par le mainteneur. Les cases de ce lot se cochent après son passage.

- [ ] Écrire la recette : un fichier vide qui consomme `intencial-library`,
  puis un fichier qui porte des variables locales. Composants : Alert et
  StressTest.
- [ ] Une étape par question, avec le geste, le résultat attendu et la case à
  cocher :

  | Question | Geste | Attendu |
  |---|---|---|
  | R1 | Sélectionner Alert | Chaque ligne nomme son token, aucune n'affiche un identifiant |
  | R2 | Lier un calque à un token dont une cible est masquée à la publication | La chaîne se lit jusqu'à la primitive, ou s'arrête sur une cause nommée |
  | R3 | Ouvrir le panneau des variables du fichier après une lecture | Le designer note ce que le panneau montre des variables de la chaîne |
  | R4, R5 | Poser un mode explicite sur un calque d'Alert | L'étape de la collection affiche ce mode, et la valeur le suit |
  | R6 | Sélectionner Alert | Une ligne par style de texte, sans doublon de ses variables |
  | R7 | Sélectionner une instance, un composant, un jeu de variants, un calque interne, un calque masqué | Le sujet et la portée de la section 2 |
  | R8 | Lire StressTest | Aucune ligne ne porte la marque d'écart |
  | R10, R12 | Survoler la ligne à 12 calques de StressTest | Douze cadres posés sur les tuiles de l'aperçu |
  | R11 | Ouvrir Button depuis StressTest | Les tokens de Button, surcharges du parent comprises |
  | R13 | Lire StressTest | La liste s'affiche en moins d'une seconde |
  | R14 | Sélectionner Alert | La couleur de l'icône figure dans les couleurs d'Alert |

- [ ] R9 reste hors de cette recette : l'essai des outils du marché ne dépend
  pas du code.
- [ ] Écrire dans le suivi, pour chaque question, la conduite à tenir quand la
  recette échoue. R1 en échec : lire le départ par la clé de son identifiant et
  étendre l'invariant d'import. R12 en échec : retirer le survol. R14 en
  échec : parcourir les instances sans maître publié.

## 6. Vérification

Avant chaque commit :

```sh
npm test --workspace ucm-explorateur-plugin
npm run typecheck
npm run build --workspace ucm-explorateur-plugin
npm run test:ui --workspace ucm-explorateur-plugin
npm test
```

`npm run test:ui` demande Chromium, installé par
`npx playwright install chromium`. Regarder la galerie à 364 × 680 après les
lots 4, 5 et 6, selon le protocole de relecture de CONTRIBUTING.md.

## 7. Définition de fini

- Les lots 0 à 7 sont cochés, chacun avec sa preuve dans le suivi.
- Les commandes de la section 6 sont vertes.
- Le relevé de fidélité de la section 3 ne porte aucun écart, sur les onze
  paires.
- `tests/loiDeLectureSeule.test.ts` couvre les trois fichiers ajoutés.
- Chaque membre ajouté à `PluginMessage` a un état de galerie.
- `composantComplexe` replié tient dans 364 × 680 sans défilement.
- La recette du lot 8 existe, et le bilan final nomme ce qui reste non vérifié
  dans Figma.
