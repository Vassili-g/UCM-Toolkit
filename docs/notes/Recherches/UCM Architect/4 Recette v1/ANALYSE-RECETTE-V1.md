# Recette v1 d'Architect : analyse et proposition

Ce document part de la première recette Figma du mode Composant sur Alert, le
24 octobre. Il traite trois demandes du mainteneur :

1. la carte « Lier le stroke d'Alert à ses tokens de taille », jugée fausse ;
2. un rangement du panneau des constats par sorte d'élément plutôt que par action ;
3. un langage visuel commun des sortes de tokens et d'objets, rangé dans le kit.

La maquette [MAQUETTE-RECETTE-V1.html](./MAQUETTE-RECETTE-V1.html) montre
chaque proposition sur les écrans réels figés de la galerie d'Architect.

## 1. La carte du stroke d'Alert

### Ce que le designer a vu

L'onglet Corrections montre une carte « Lier le stroke d'Alert à ses tokens de
taille », « 8 variants, stroke weight ». Elle porte 36 lignes identiques :
« valeur en dur » à gauche, `Stroke/outline-weight` à droite. Or le stroke
d'Alert est lié à une variable.

### La cause : un layer sans contour garde une épaisseur

Figma donne une épaisseur de contour à tout layer, même sans contour : 1 par
défaut. Deux lectures du même composant traitent ce cas différemment.

| Lecture | Fichier | Condition pour juger `strokeWeight` |
|---|---|---|
| Vue Composant | `packages/plugin-architect/src/lectureDuComposant.ts:185` | une peinture de contour visible |
| Relevé analysé par le kit | `packages/plugin-architect/src/releveDuComposant.ts:123` | aucune |

Le relevé range donc dans `valeursEnDur` l'épaisseur de chaque layer sans
contour : le titre, le message, l'icône, les frames internes. Le kit
(`packages/kit/src/controles/corrections.ts`, `constatsDeValeursEnDur`) en tire
un constat C29 par layer et par variant. La seule variable `layout` qui vaut
1 px, `Stroke/outline-weight`, devient la correction exacte de chacun.
Les 36 lignes viennent de ces layers, pas du contour d'Alert, qui est lié.

La même liste alimente la préparation des tokens
(`packages/kit/src/controles/preparation.ts:216`) : elle proposerait un token
`border-width` pour chacun de ces layers.

Pour le vérifier dans Figma : cliquer la carte. Le plugin sélectionne ses
layers ; aucun n'a de contour.

Correction proposée : le relevé ne garde `strokeWeight` que si le layer a une
peinture de contour visible, comme la vue Composant. Un test de régression
couvre un frame sans contour d'épaisseur 1. Le kit n'est pas touché : la règle
reste au point de lecture.

### La carte reste illisible même quand le constat est juste

Le faux constat n'explique pas tout. Pour un vrai contour en dur, la carte
poserait les mêmes problèmes.

| Ce que la carte montre | Ce qui manque au designer |
|---|---|
| 36 lignes « valeur en dur » | le layer et le variant de chaque ligne, et la valeur lue (1 px) |
| `Stroke/outline-weight` | la collection de la variable, et le fait qu'elle existe déjà |
| « à ses tokens de taille » | un stroke weight n'est pas une taille ; « ses » fait croire à un token d'Alert |

Le designer ne peut pas savoir si la variable sera créée. Elle ne l'est pas :
une correction C29 lie seulement une variable `layout` existante, de même
valeur. Seule la préparation des tokens crée des variables.

Proposition, montrée par le cadre 1b :

- titre : « Lier le stroke weight de container » ;
- une ligne par layer, avec le nombre de variants : `container ×8` ;
- à gauche : `1 px en dur` ;
- à droite : la variable, sa collection et sa valeur : `layout` › `stroke/outline-weight`, 1 px ;
- une marque « existe » ou « à créer », la même dans tout le plugin (section 3).

## 2. Ranger le panneau par sorte d'élément

Le mainteneur a retenu la variante C, modifiée : voir la section 4.

### Aujourd'hui

Trois onglets par action : Corrections, Questions, À faire dans Figma. Chaque
onglet a ses propres intertitres : Liaisons, Tailles, Règles d'usage dans
Corrections ; Tokens, Variants, Contraste et accessibilité dans À faire. Une
même sorte d'élément se lit donc dans trois onglets, sous des intertitres
différents.

### La demande

Des onglets par sorte d'élément (Couleurs, Tailles et radius, Tokens…), et
dans chacun, les éléments triés par action.

### Avis : oui au rangement par élément, non aux onglets

Le rangement par élément suit le travail du designer. Il règle les couleurs
d'un composant, puis ses tailles. Une question et la correction qu'elle
produit restent au même endroit. La colonne de gauche range déjà les tokens par
nature : le panneau prendrait le même ordre.

Les onglets posent quatre problèmes :

- Sept sortes d'éléments ne tiennent pas dans un panneau de 520 à 640 px.
- Un onglet vide est soit grisé, soit absent. Grisé, il encombre. Absent, les onglets changent de place d'une analyse à l'autre.
- Appliquer devient ambigu. Un bouton global applique des corrections cachées dans d'autres onglets. Un bouton par onglet fait sept lots et sept retours en arrière.
- Le mode Tokens garde ses onglets par action. Les deux modes divergent.

Proposition B, recommandée : une seule liste, en sections par sorte
d'élément. Chaque section se replie et compte ses éléments par action. Dans
une section, les corrections viennent d'abord, puis les questions, puis ce qui
se fait dans Figma. Trois compteurs en tête filtrent la liste par action, comme
une recherche. Appliquer reste unique, en pied, et nomme les sections
concernées. Une section sans constat montre une ligne Tenu : le designer voit
ce qui a été contrôlé.

Les sections du mode Composant :

| Section | Constats rangés |
|---|---|
| Couleurs | liaisons de fill, stroke et effet ; texte sans fond (C59) ; modèle de variant |
| Tailles et forme | padding, gap, width, height, taille d'icône, radius, stroke weight (C29, C30, C10) |
| Texte | text styles, font size, liaisons typographiques |
| Tokens du composant | noms et rangement des tokens d'Alert, tokens prévus sans variant, variable disparue de la library |
| Variants et layers | noms de variants et de properties, variant manquant, visibilité |
| Règles d'utilisation | instance `.componentRules`, règles à rédiger |
| Accessibilité | contraste, anneau de focus, cible tactile |

Le contraste touche aussi les couleurs. Il reste en Accessibilité : le
designer y vérifie un objectif, pas une liaison.

Variante C, la moins chère : garder les trois onglets et donner à chacun les
mêmes sept intertitres, avec leurs signes. Elle unifie le vocabulaire sans
rapprocher une question de sa correction.

Le mode Tokens n'est pas concerné par cette recette. Il garde Corrections,
Questions, À faire dans Figma et Règles.

## 3. Le langage visuel des sortes d'objets

### Ce qui existe

Le kit porte `SIGNAUX_DU_LANGAGE` et `TYPES_D_ALERTE`
(`packages/kit/src/referentiel/signaux.ts`). Le socle porte leurs styles
(`packages/plugin-socle/src/ui/langage.css`). Ces signaux couvrent les
chemins, les changements, les alertes, les décisions de nom, les filtres et les
boutons. Aucun ne dit la sorte d'un objet.

La vue Composant d'Architect dessine seule cette sorte, avec des caractères :
◇ composant, # layer, ◜ rayon, ↔ espacement, ⤢ taille, ─ épaisseur, Aa style,
A texte, • autre, ? couleur inconnue, ≠ écart. Ils sont gris, 11 px, sans
cadre. Le panneau des constats, Palettes, l'exporteur et le Hub n'en emploient
aucun.

### Trois canaux, un sens chacun

| Canal | Sens | Exemple |
|---|---|---|
| Forme, un signe dans une tuile de 16 px | la sorte d'objet | radius, layer, question |
| Couleur | un jugement ou un changement | À corriger, segment qui arrive |
| Mot | le nom exact, au premier usage ou au survol | `stroke weight`, `layout` |

Une sorte d'objet ne prend pas de couleur. Les écrans emploient déjà dix
teintes : cinq types d'alerte, vert et rouge des changements, rose et olive des
chemins, bleu de la sélection. Une teinte par sorte de token rendrait chacune
ambiguë. La seule couleur d'un signe de sorte est celle d'une valeur de
couleur, dans sa pastille.

Un objet de Figma garde le signe que Figma lui donne : component, instance,
frame, text, variable, property. Le designer le reconnaît déjà, comme il
reconnaît les termes anglais de Figma.

### La liste

Les familles 1 à 9 sont nouvelles. Les familles 10 à 14 existent et gardent
leur forme.

| Famille | Signes |
|---|---|
| 1. Type de variable Figma | Color, Number, String, Boolean |
| 2. Usage d'une couleur | fill, texte, icône, stroke, effet (shadow), couleur inconnue |
| 3. Usage d'un nombre | padding, gap, width, height, taille d'icône, radius, stroke weight, opacity |
| 4. Typographie | text style, font family, font size, font weight, line height, letter spacing |
| 5. Couche UCM | primitives, brands, utility, layout, typography, theme, components ; le signe montre l'étage |
| 6. État d'un token | variable liée, alias (chaîne), valeur en dur, existe, à créer, library, local, chaîne rompue, écart avec Figma, mode, scope |
| 7. Objet de Figma | component set, component, variant, instance, composant imbriqué, frame, group, text, vector, slot, sélection de Figma |
| 8. Property de composant | variant, boolean, text, instance swap, slot ; prop d'icône du contrat |
| 9. Règles d'utilisation (`.componentRules`) | instance de règles ; tags `@usage`, `@do`, `@dont`, `@pairs`, `@prop`, `@boolean`, `@default`, `@icons` ; sections GÉNÉRAL, PROPRIÉTÉS, OPTIONS, ICONES, DOCUMENTATION ; marques modifiable et strict ; texte `[À compléter]` |
| 10. Sorte de proposition | correction, question, à faire dans Figma, copie d'un modèle, préparation, ignoré, plus tard, appliqué, défait, analyse périmée |
| 11. Accessibilité | paire de contraste, seuil, anneau de focus, cible tactile |
| 12. Palettes | palette, cran, mode Light et Dark ; soft et vivid restent des mots |
| 13. Publication | contrat de composant, tokens DTCG, feuille CSS, demande de fusion, version du kit |
| 14. Signaux existants | chemins, changements, alertes, décisions de nom, filtres, actions |

Les signes de la famille 9 reprennent ceux des familles 7 et 8 quand la règle
vise le même objet : `@prop` prend le signe de la property variant, `@boolean`
celui de la property boolean, `@icons` celui de l'instance swap.

`@do` et `@dont` prennent ✓ et ✕ en gris. Le vert et le rouge appartiennent
déjà aux changements.

La question prend un « ? » gris dans sa tuile. À vérifier garde son « ? »
cerclé, en jaune.

### Où le ranger

| Couche | Contenu |
|---|---|
| Kit, `referentiel/signaux.ts` | Chaque signe : identifiant, famille, libellé, sens, tracé SVG sur une grille de 16 et mot de repli pour un texte brut |
| Socle, `src/ui/Signe.ts` et `langage.css` | Le composant qui pose la tuile, et ses deux tailles (12 et 16 px) |
| Galerie du socle | La planche de tous les signes, en sombre et en clair |
| Hub UCM | Les mêmes signes, lus dans le kit construit |
| `ucm check` et les rapports de la CI | Le mot de repli |

Le tracé SVG entre dans le kit comme une donnée. Le kit ne dessine toujours
rien : il ne crée aucun élément. Le Hub, généré hors des plugins, lit ainsi les
mêmes signes que le socle.

## 4. Décisions du 24 octobre

Le mainteneur a relu la première version de la maquette. La maquette montre
la deuxième.

**Chevrons.** Un chevron pointe vers la droite quand l'élément est replié, vers
le bas quand il est ouvert. La règle vaut pour la maquette et pour tous les
plugins.

**Panneau.** La variante C est retenue, avec quatre modifications :

- Les trois onglets par action restent. Chaque onglet range ses éléments dans les sept sections, et ne montre que ses sections occupées, puis les sections tenues.
- La bande d'une section reprend la bande de section de Nomenclature : fond de bloc, signe de 24 px, titre, nombre, chevron. Elle ne compte pas par action.
- Une section tenue montre la coche seule, sans mot ni chevron.
- Chaque carte de correction a son bouton Appliquer. Le bouton du pied devient « Appliquer tout » (R-8, à valider).

**Un signe par catégorie.** Un endroit montre un seul signe par catégorie. Les
cartes, règles et lignes d'une section ne répètent pas son signe : l'état, la
couche et les drapeaux `modifiable` et `strict` s'écrivent en mots. La liste des
tokens de la vue Composant garde un signe par ligne, parce que chaque ligne est
un token d'une sorte différente.

**Tailles.** 24 px sur la bande d'une section, 16 px sur une ligne de token,
14 px dans un texte ou un bouton. Le format 12 px disparaît.

**Signes changés.**

| Signe | Changement |
|---|---|
| icône (usage d'une couleur) | une étoile plus grande ; la même étoile sert à la taille d'icône et à `@icons` |
| padding | sept signes, comme Figma : les quatre côtés, `padding-x`, `padding-y`, puis chaque côté seul |
| couches UCM | l'ordre de la library : `primitives` en haut, `components` en bas |
| component set | le cadre en pointillés de Figma autour du signe du component |
| correction | une clé ; la case cochée se lisait comme une correction faite |
| question | un « ? » |
| ignoré | une poubelle |

**Le kit.** Les signes entrent dans `packages/kit/src/referentiel/signes.ts` :
identifiant, famille, libellé, sens, tracé et mot de repli. Une fonction pure,
`svgDuSigne(id)`, rend le SVG en texte. Le socle pose la tuile
(`plugin-socle/src/ui/Signe.ts`, styles dans `langage.css`). Un test du socle
refuse dans un plugin les anciens caractères de sorte. Le Hub lit
`svgDuSigne` dans le kit construit. La CLI et les rapports de la CI écrivent le
mot de repli. La section 4 de la maquette détaille ces étapes.

## 5. Questions au mainteneur

| N° | Question | État |
|---|---|---|
| R-1 | Corriger la lecture du stroke weight, avec son test | Oui |
| R-2 | Un layer d'Alert en dur : le lier à la variable `layout`, ou au token d'Alert qui renvoie à elle ? | Reformulée dans la maquette, section 6. Proposition : le token d'Alert s'il existe avec ce rôle et cette valeur, sinon la variable `layout`. |
| R-3 | Rangement du panneau | C, avec les modifications de la section 4 |
| R-4 | Le mode Tokens garde ses onglets par action | Oui |
| R-5 | Faut-il une couleur par famille de signes ? | Reformulée dans la maquette, section 6, avec une comparaison. Proposition : non. |
| R-6 | Les tracés entrent dans le kit | Oui |
| R-7 | Les objets de Figma reprennent les signes de Figma | Oui |
| R-8 | Un bouton Appliquer par carte, et Appliquer tout en pied | Proposé, à valider |
