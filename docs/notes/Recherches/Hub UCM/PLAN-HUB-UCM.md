# Plan du Hub UCM

Le Hub UCM est une page HTML locale. Elle montre tout ce que les kits UCM
produisent à partir de quelques couleurs : rampes, variables de thème, tokens,
composants et contrastes. Chaque règle s'affiche à côté de ce qu'elle produit,
avec la définition que le kit lui donne. Le banc d'essai du moteur en est la
première version ; il est devenu `packages/hub/HUB-UCM.html` au lot H0.

La maquette des vues décrites ici se dessine avant H2, dans `Maquettes/`.

## 1. Décisions prises

| Sujet | Décision |
|---|---|
| Nom | Hub UCM |
| Forme | Un fichier HTML local, autonome, ouvert par un double clic |
| Accès | Un lien dans le `README.md` à la racine du dépôt |
| Interface | Une seule carte d'interface composée ; une bascule Light / Dark |
| Couleurs | Un sélecteur de couleur par rôle ; la palette se recalcule à la volée |
| Préconfigurations | Terracota, Slate, Green, Amber, Red, Sky ; et la recette exportée par Palettes |
| Marque secondaire | Pas pour le moment |
| Mise à jour | Une commande, `npm run vues`, après tout changement du moteur ou du kit |
| Place (D1) | `packages/hub/`, page `HUB-UCM.html` à la racine du paquet |
| Bouton sans fond sur la page (D3) | Texte `page/foreground`, dans le hub et dans l'interface de test de Palettes |
| Notifications dans Palettes (D4) | Non : Palettes montre une palette à la fois |
| Arbre des tokens (D5) | Tiré par le kit |
| `layout` et `typography` (D6) | Lus dans le `tokens.json` déposé seulement |
| Maquette | Dessinée avant H2 |

## 2. Principes

**Le hub lit, il ne définit rien.** Les crans, les variables, les garanties,
les registres et les définitions viennent de `@ucm-kit/core` et du moteur
`ucm-couleur`. Une règle qui manque entre d'abord dans le kit. Le hub l'affiche
ensuite.

**Le hub reprend les formes validées.** L'écran « Studio Nord », la grille des
états et la bulle viennent de l'interface de test d'UCM Palettes
(`packages/plugin-palettes/src/ui/interfaceDeTest.ts`). Le bloc « Aperçu » de
Palettes montre la table des dossiers. Les onglets, les alertes et les chemins
suivent `socle.css` et `langage.css` du socle.

**Une seule correspondance des composants.** La couleur que prend chaque
élément d'un composant n'est pas une règle du kit. Le hub et Palettes lisent la
même correspondance. Le hub la présente comme une hypothèse de démonstration.

**Le hub ne fige pas les données de l'utilisateur.** Une recette ou un
`tokens.json` se lit à l'ouverture. Changer une palette ne demande aucune
régénération.

**Le hub est sombre par défaut.** Il suit le thème du système, comme les
plugins dans Figma.

## 3. Commandes communes

Ces commandes restent visibles dans toutes les vues.

- Les onglets des sept vues, en haut.
- La bascule Light / Dark. Elle change le thème de la vue affichée.
- La bascule Soft / Vivid. Elle change l'intensité des palettes qui en portent
  deux.
- La case « Mesures ». Elle affiche le contraste de chaque élément.
- Le panneau des rôles, à gauche : marque, neutre, succès, avertissement,
  danger, information. Chaque rôle a un sélecteur de couleur et son code hexa.
- Le choix de la préconfiguration : « Démonstration » ou « Ma recette
  Palettes ». Une recette se charge aussi par dépôt de fichier.
- Le tiroir « Essai » : table des dossiers, exigences, profils et courbes du
  moteur. Il reprend les réglages du banc.

## 4. Les vues

### 4.1. Interface

Une carte d'application composée : l'écran « Studio Nord » de Palettes,
peint avec la palette de marque. Une zone « Notifications » lui est ajoutée.
Elle porte une alerte par statut, avec son action, et les badges de statut des
membres. Elle montre les palettes de statut dans le même écran que la marque.

Survoler un élément ouvre la bulle de Palettes : une ligne par propriété, la
variable et sa nuance. Cliquer un élément ouvre l'inspecteur.

### 4.2. Composants

La grille des états de Palettes, une par rôle : bouton plein, soft, contour et
sans fond, champ, lien, badge, case, interrupteur, alerte. Les colonnes sont
`default`, `hover`, `pressed`, `focus` et `disabled`. Un élément sous le seuil
porte une alerte « À corriger ».

### 4.3. Thème

Le bloc « Aperçu » de Palettes pour chaque rôle. La rampe porte les marques de
`solid`, `surface` et `page`. À côté, le tableau des variables du thème : cran
en Light, cran en Dark, sens du thème et définition du kit. Le texte des
boutons explique le sens : normal ou inversé. La table modifiée dans le tiroir
« Essai » s'affiche ici, cran du kit à côté.

### 4.4. Palettes

Les rampes de chaque palette, avec la référence ◆ et les valeurs OKLCH. La
famille Tailwind 3.4 la plus proche est posée dessous. L'harmonisation compare
les palettes colorées cran par cran : courbes de chroma et de clarté, et
tableau des écarts à la médiane.

### 4.5. Contrastes

Le bilan des garanties et des usages non garantis. La matrice des sept
garanties, fond par fond. La matrice des usages que les composants posent sans
garantie. Chaque constat prend le type d'alerte du langage commun.

### 4.6. Tokens

L'arbre des tokens que l'architecture UCM tire des palettes : `primitives`,
`brands`, `utility` et `theme`. Chaque token montre son alias, sa variable CSS
et sa valeur dans chaque mode. Deux téléchargements : le JSON DTCG et le CSS.

Un `tokens.json` exporté de Figma se dépose sur la vue. Le hub compare alors
le fichier à l'arbre attendu :

- une variable attendue absente du fichier ;
- une variable qui vise un autre cran que la table ;
- un nom que la grammaire des chemins ne reconnaît pas ;
- un alias qui ne se résout pas.

`layout` et `typography` s'affichent depuis le fichier déposé. Le kit ne leur
donne pas de valeurs.

### 4.7. Règles

Le référentiel du kit, consultable :

- les collections et leurs cibles (`CIBLES_DES_COLLECTIONS`) ;
- la grammaire des chemins (`FORMES_DES_CHEMINS`) ;
- les registres : crans, modes, profils, états, tailles, statuts, rôles,
  groupes, côtés ;
- les conventions de nommage ;
- la table des dossiers et les garanties ;
- le langage visuel (`SIGNAUX_DU_LANGAGE`, `TYPES_D_ALERTE`) ;
- les recommandations, et ce que chaque produit lit ou écrit (`PRODUITS`).

Un champ de recherche filtre les fiches. Le filtre s'affiche comme une puce
dans le champ. L'inspecteur renvoie vers la fiche de chaque règle.

## 5. L'inspecteur

L'inspecteur s'ouvre sur l'élément cliqué de l'interface ou de la grille.

- **Chaîne.** Une ligne par étape, du composant à la couleur :
  `components…` puis `theme…`, `brands…` ou `utility…`, puis `primitives…`,
  puis l'hexa. Les chemins sont gris. La variable du thème est en olive.
- **Cran.** Le cran visé dans le thème affiché, et dans l'autre thème.
- **Définition.** Le libellé et la définition du kit, par exemple « bouton
  survolé : fond et contour du bouton sous le pointeur ».
- **Contrastes.** Chaque garantie qui juge cette variable, son fond, sa valeur
  et son type d'alerte. Les usages non garantis suivent.
- **Règle.** Un lien vers la fiche de la vue Règles.

## 6. La commande `npm run vues`

Elle se lance à la racine du dépôt.

1. Elle compare l'empreinte des sources du kit à
   `packages/kit/dist/.empreinte`. Si elles diffèrent, elle compile le kit. Le
   hub lit le kit compilé.
2. Elle régénère le hub, la planche du moteur et les données de la vue
   illustrée, tant que cette vue existe.
3. Elle liste les fichiers réécrits, ou écrit « Aucune vue à mettre à jour ».

Chaque page générée a un test de fraîcheur. Il compare la page commitée à la
page régénérée. Tous ces tests donnent le même message : « La vue n'est plus à
jour. Lancez `npm run vues`. » `npm test` et la CI échouent tant que la page
est périmée.

`npm run agents:diff` cite la commande dans ses vérifications quand un de ces
chemins change :

- `packages/couleur/src/` ;
- `packages/kit/src/referentiel/`, `emplois/` et `format/` ;
- `packages/plugin-socle/src/ui/` ;
- les sources du hub.

## 7. Architecture du code

| Partie | Place proposée | Contenu |
|---|---|---|
| Paquet | `packages/hub/` | Paquet privé `ucm-hub` : guide, carte, tests, `tsconfig` |
| Modèle | `packages/hub/src/modele/` | Calcul pur : jeux de couleurs, mesures, arbre attendu, comparaison d'un fichier |
| Vues | `packages/hub/src/vues/` | Une vue par onglet, l'inspecteur, le panneau des rôles |
| Générateur | `packages/hub/src/generer.ts` | Compile la page par esbuild et l'écrit |
| Page | `packages/hub/HUB-UCM.html` | Fichier commité, cité dans le `README.md` racine |
| Écran partagé | `packages/plugin-socle/src/ui/ecranDeTest.ts` | L'écran « Studio Nord », la grille des états et la bulle, extraits de Palettes |
| Arbre des tokens | `packages/kit/src/emplois/` | Les chemins et alias que l'architecture tire d'une palette et de son rôle |

Le banc quitte `packages/couleur/planche/` pour `packages/hub/`.

## 8. Lots

Chaque lot se termine par `npm test`, `npm run typecheck` et `npm run vues`.

### H0. Le paquet et la commande

- Créer `packages/hub/` : `package.json`, `tsconfig.json`, `AGENTS.md`,
  `CARTE.md`, domicile dans `.agents/domiciles.json`.
- Déplacer le banc : modèle, page, générateur et tests.
- Écrire `scripts/vues.mjs` et le script `vues` de la racine.
- Unifier le message des tests de fraîcheur.
- Ajouter la vérification `npm run vues` aux domaines de `agents:diff`.

Fin : un second `npm run vues` écrit « Aucune vue à mettre à jour ». Une
modification de `TABLE_DES_DOSSIERS` fait échouer le test de fraîcheur du hub.

### H1. L'écran de test partagé

- Extraire de `interfaceDeTest.ts` l'écran « Studio Nord », la grille des
  états et la bulle vers `packages/plugin-socle/src/ui/ecranDeTest.ts`. Le
  module reçoit les couleurs, les textes et la correspondance des composants.
- Palettes dessine sa section « Interface de test » avec ce module.

Fin : les captures de la galerie de Palettes, Light et Dark, sont identiques
avant et après. Les tests de Palettes passent sans changement.

- Puis appliquer D3, dans un commit à part : le bouton « Annuler » de l'écran
  et le bouton sans fond au repos de la grille prennent `page/foreground`.
  Seules ces deux captures changent.

### H2. La coquille et l'interface

- Panneau des rôles : six rôles, sélecteur de couleur, code hexa, choix de la
  préconfiguration, dépôt d'une recette.
- Bascules Light / Dark et Soft / Vivid, case « Mesures », onglets.
- Vue Interface : l'écran partagé, avec la zone « Notifications » des
  statuts, et la bulle.
- Vue Composants : la grille des états par rôle.
- Tiroir « Essai » : les réglages du banc.

Fin : changer une couleur redessine l'écran en moins de 100 ms sur la recette
de démonstration. Le test du modèle compare toujours ses promesses à
`verifierPromesses`.

### H3. L'inspecteur et les règles

- L'inspecteur : chaîne, cran, définition, contrastes, lien vers la règle.
- La vue Règles : fiches du référentiel, recherche par puce.

Fin : chaque variable du thème ouvre une fiche. Un test vérifie que chaque
terme des registres du kit a sa fiche.

### H4. Thème, palettes et contrastes

- Vue Thème : le bloc « Aperçu » par rôle et le tableau des variables.
- Vues Palettes et Contrastes : les sections du banc, au langage visuel
  commun.

Fin : les constats de la vue Contrastes égalent les mesures du modèle.

### H5. Les tokens

- Ajouter au kit la fonction qui tire l'arbre des tokens d'une palette et de
  son rôle. Ses chemins passent la grammaire des chemins.
- Vue Tokens : arbre, variables CSS, téléchargements.
- Comparaison d'un `tokens.json` déposé.

Fin : l'arbre tiré de la recette de démonstration passe
`reconnaitreLeChemin` pour chaque token. La comparaison retrouve les écarts
relevés à la main sur le Button d'UCM Tests.

### H6. La mise en service

- Le lien dans le `README.md` racine.
- La ligne du hub dans l'état des recherches.
- Le retrait de la planche et de la vue illustrée, si la décision D2 le
  retient.

## 9. Décisions ouvertes

D1 et D3 à D6 sont tranchées (section 1). Une seule reste ouverte.

| Numéro | Question | Proposition |
|---|---|---|
| D2 | Retirer la planche et la vue illustrée une fois couvertes ? | Le mainteneur juge sur pièce. Après H4, lui montrer la planche à côté de la vue Palettes ; après H5, la vue illustrée à côté de la vue Tokens |

## 10. Risques

| Risque | Parade |
|---|---|
| L'extraction de l'écran change Palettes | Captures de la galerie comparées avant et après (H1) |
| Le hub recopie une règle du kit | Le modèle importe chaque règle ; la relecture refuse un cran écrit en dur |
| La page dépasse 1 Mo | Test de taille, comme pour le banc |
| La page est périmée | Tests de fraîcheur et `npm run vues` |
| L'écran étendu se sépare de celui de Palettes | La zone « Notifications » s'ajoute au module partagé, pas à une copie |
