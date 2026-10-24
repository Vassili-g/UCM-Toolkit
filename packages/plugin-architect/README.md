# UCM Architect

UCM Architect est le plugin de [UCM Toolkit](../../README.md) qui
explique les variables d'un fichier Figma : collections, groupes, alias,
modes et tokens d'un composant. Il fonctionne sur toute architecture de tokens,
avec ou sans UCM. Dans un fichier déclaré UCM, ses corrections peuvent écrire
des noms, des scopes, des alias et des liaisons dans le document.

## Ouvrir le plugin

Depuis la racine du dépôt, avec Node 22 :

```sh
npm install
npm run build --workspace ucm-architect-plugin
```

Dans Figma Desktop, ouvrez `Plugins > Development > Import plugin from manifest`
et choisissez `packages/plugin-architect/dist/manifest.json`.

Le manifeste porte l'`id` que Figma a attribué au plugin de développement,
sans publication. Figma reconnaît un plugin par cet `id` : n'y recopiez jamais
celui d'un autre plugin du dépôt, ce que `tests/manifestsDesPlugins.test.ts`
refuse.

## Choisir un mode

La bascule de la barre passe de **Tokens**, l'explorateur des collections, à
**Composant**, la lecture du composant sélectionné. La fenêtre prend la taille
rangée pour chaque mode : 1360 × 800 pour le premier, 520 × 760 pour le second
(1040 × 760 avec le panneau des constats ouvert). Quand la sélection a un
composant pour sujet, elle s'ouvre sur **Composant** ; sinon sur **Tokens**.

## Explorer les variables

À l'ouverture, le plugin lit les variables locales et les cibles de leurs
alias. **Actualiser** relit le fichier ; le pied de la fenêtre donne l'heure
et le numéro du relevé.

- **Arbre.** Une collection montre toutes ses variables ; un groupe montre les
  siennes et celles de ses descendants. Le chevron replie l'arbre sans
  changer la table. Le bouton à droite de Collections replie toutes les
  sections, sauf celle qui est choisie. La recherche, sous le titre de
  l'arbre, porte sur toutes les collections : l'arbre ne liste alors que celles
  qui ont un résultat, avec leur nombre. `terme:background` cherche un terme
  et ses formes, `vise:Card/bg/default` les variables qui visent ce nom. Trois
  liens écrivent leur recherche dans le champ : « Voir les N variables » sous
  une question, « Filtrer le tableau des tokens » dans la feuille d'un terme,
  « Afficher ces N variables » dans la fiche d'une variable.
- **Table.** Une colonne par mode de la collection, avec l'alias direct ou la
  valeur rangée, puis le résultat. La vue compacte garde la seule colonne du
  contexte actif. Sous le titre, « Modes affichés » tient sur une ligne : un
  menu par collection à plusieurs modes.
- **Contexte.** Chaque collection prend son mode par défaut. Les onglets
  Comparer, Dépendants, Diagnostics, Intégrations et Relevés sont retirés ;
  leurs calculs purs restent dans le code.
- **Chaîne.** Survoler un nom ou lui donner le focus montre la chaîne
  complète après 250 ms ; Échap la ferme. Cliquer sur le nom ouvre la fiche
  de la variable, cliquer sur un alias suit sa cible.
- **Fiche d'une variable.** Une feuille sur le panneau latéral : la chaîne
  d'alias dans les modes affichés, le renommage que Corrections propose, et
  les variables qui la visent (« Utilisée par »). La croix ou Échap la ferme.

Le nom d'une variable est un chemin : les groupes en gris, le dernier segment en gris clair. Quand un renommage coché de Corrections change un terme, la table montre le nom entier après l'application et ce terme en vert ; un clic sur lui ouvre sa carte dans Corrections.

Le centre ne montre plus que la table. Le panneau latéral de 640 px porte Nomenclature ; la fiche d'une variable s'ouvre sur lui.
Les onglets du panneau latéral sont Corrections, Questions, À faire dans Figma et Règles. La collection choisie dans l'arbre les filtre : une puce « collection » sous les onglets la nomme, et sa croix enlève le filtre. Sous le filtre, Appliquer n'écrit que les noms de cette collection. À faire dans Figma ne suit pas ce filtre : ses constats (alias, modes, valeurs, couches) disent chacun où le régler dans la fenêtre Variables, et « Ouvrir la fiche » montre la variable dans l'explorateur. Corrections ajoute à ses renommages les corrections de modes et de scopes, sous Modes et Scopes, avec les cases de l'onglet Scope de Figma avant et après (Show in all, Frame fill, Shape fill…).

La [maquette de la navigation](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Recette%201/MAQUETTE-RECETTE-1.html)
montre la bascule des deux modes et la recherche dans l'arbre.

## Lire les tokens d'un composant

Choisissez **Composant** dans la barre, puis sélectionnez un composant, une instance ou un jeu de variants dans Figma. La
vue composant affiche ses tokens, une ligne par token, groupés par nature :
couleur, forme, espacement, taille, texte.

- **Ligne.** Le signe de sa sorte (padding, radius, usage d'une couleur…),
  gris, rempli de la couleur pour un token de couleur ; le nom du token sans le préfixe commun au
  composant, un point par étape de sa chaîne, la valeur, puis `×N` quand
  plusieurs calques le portent. Un clic déplie la chaîne : chaque alias avec
  sa collection et son mode, puis la valeur, qu'un clic copie.
- **Style de texte.** Un style tient sur une ligne ; dépliée, elle liste ses
  variables.
- **Composant imbriqué.** La vue le nomme sous l'aperçu sans lire ses calques.
  Un clic l'ouvre, et le fil d'Ariane ramène au parent.
- **Calque.** Sélectionner un calque du composant restreint la vue à ce calque
  et à ses descendants.
- **Aperçu.** Survoler une ligne entoure ses calques dans l'image.
- **Variants.** Après une analyse, un jeu de variants montre sous l'aperçu une
  ligne par property : une puce pour la valeur affichée et pour chaque valeur
  qui porte un constat, « +N » pour les autres. Une puce relit le variant qui
  garde le plus de valeurs affichées ; **Tableau** croise deux properties.
  **Copier ses liaisons aux autres variants** prend le variant affiché pour
  modèle : ses liaisons se proposent aux autres variants dans Corrections, et
  les cas douteux dans Questions. Le bouton est inactif quand l'analyse est
  périmée.
- **Constats.** Le bouton ouvre le panneau des constats, à droite de la vue, et
  la fenêtre passe à 1040 × 760 sans ranger cette taille. Sa pastille compte
  les constats de la dernière analyse, dans la couleur du plus grave. La
  frontière entre la vue et le panneau se tire à la souris ou aux flèches.
  Le panneau range l'analyse par élément du composant : Couleurs, Tailles et
  forme, Texte, Tokens du composant, Variants et layers, Règles d'utilisation,
  Accessibilité. Un sommaire de puces donne le nombre de points de « Tout » et
  de chaque élément qui en a ; une puce choisie ne montre que son élément.
  Sous « Tout », les points Bloquant viennent en tête, puis une section par
  élément, puis les éléments tenus, réduits à leur coche. Une section s'ouvre
  jusqu'à cinq points. Elle range ses cartes de corrections, toutes cochées,
  puis ses questions, puis ses constats à faire dans Figma. Appliquer, sur une
  carte, écrit les lignes cochées de cette carte ; Appliquer tout, dans le
  pied, écrit toutes les lignes cochées, un seul lot que Ctrl+Z défait dans
  Figma. Ouvrir une carte
  sélectionne ses layers dans Figma et les entoure dans l'aperçu. Une question
  du moteur a sa carte : le titre cite le premier candidat,
  les autres ont leur bouton, et rien n'est choisi avant le clic ; la réponse
  devient une carte de corrections de la section, et Annuler la réponse la
  retire. Un constat à faire dans Figma porte le type de son alerte. Sous Contraste et accessibilité, une carte de
  contraste ouverte donne le rapport mesuré sans arrondi, son seuil (AA ou AAA,
  lu dans la Configuration) et le mode ; la zone cliquable, l'anneau de focus
  et le texte sous 12 px sont des recommandations, les variants State=disabled
  une information, et un fond ou une peinture que le plugin ne sait pas lire
  une limite, jamais un verdict. Ignorer en écarte un, sauf une limite de
  lecture, et les constats ignorés restent sous Ignorés, avec Ne plus ignorer. Après
  l'écriture, ou un changement du composant, le panneau garde ses constats et
  attend Actualiser ou Analyser. Une analyse partielle, annulée ou arrêtée ne
  conclut jamais « aucun constat ».
- **Sans token.** Le pied compte les valeurs qu'aucune variable ne lie, et les
  liste au clic.

## Préparer les tokens d'un composant

Un composant sans tokens de `components` montre **Préparer les tokens** dans
le panneau des constats. Les composants et les tokens vivent souvent dans
deux fichiers ; la préparation passe de l'un à l'autre.

1. Dans le fichier des composants, cliquez **Préparer les tokens**. Chaque
   choix porte son terme UCM, sa description et les tokens qu'il viserait.
   **Préparer** reste inactif tant qu'une question reste ouverte.
2. La préparation se range sur ce poste. Pour un autre poste, copiez-la en
   texte ; l'autre designer clique **Coller une préparation** dans la Configuration.
3. Dans le fichier des tokens, une alerte annonce les variables à créer.
   **Voir les N variables** ouvre la liste ; **Créer N variables** ne crée que les
   variables qui manquent dans `components`.
4. Publiez la library : Assets, Libraries, Publish.
5. Dans le fichier des composants, cliquez **Actualiser** : Corrections
   propose de lier les nouvelles variables.

L'Historique de la Configuration annule la dernière création, tant que le
plugin reste ouvert. Une variable créée qu'un alias ou un layer du fichier
emploie déjà n'est pas supprimée. Le plugin ne voit pas les usages dans
d'autres fichiers.

## Modules sans écran

Le profil d'architecture UCM (`src/integrations/profilUcm.ts`) et la lecture
de la recette d'UCM Palettes (`lireLaRecette`) restent dans le code, avec
leurs tests, sans écran.

## Limites

- Les changements de variables ne sont pas signalés par Figma sans charger
  toutes les pages : actualisez après une modification.
- Une variable de bibliothèque non utilisée dans le fichier n'est pas lue ;
  une cible non lue s'affiche « inaccessible », jamais « supprimée ».
- La résolution des collections étendues, des modes hérités et des
  bibliothèques distantes reste à confirmer dans Figma ; la vue composant
  marque l'écart entre sa chaîne et `resolveForConsumer` sur chaque calque lu.
- La vue composant ne lit ni les réactions de prototype, ni les valeurs par
  défaut des propriétés de composant, ni les calques masqués des instances.
- La vue composant lit un composant à la fois et 2 000 calques au plus ; le
  pied compte les calques non lus. Elle ne se relit pas seule après une
  modification : désélectionnez le composant, puis sélectionnez-le de nouveau.
- La vue composant n'a pas été essayée dans Figma. Sa
  [recette](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md)
  liste ce qui reste à y vérifier.

## Vérifier

```sh
npm run test --workspace ucm-architect-plugin
npm run typecheck --workspace ucm-architect-plugin
npm run build --workspace ucm-architect-plugin
npm run test:ui --workspace ucm-architect-plugin
npm run galerie:captures --workspace ucm-architect-plugin
npm run mesure --workspace ucm-architect-plugin
```

`test:ui` reconstruit l'interface et la galerie, puis demande le Chromium de
`npx playwright install chromium`. La galerie s'écrit dans `dist/galerie/` à
1200 × 800, dans `dist/galerie-minimale/` à 560 × 480, et dans
`dist/galerie-etroite/` à 364 × 724 pour la vue composant. `mesure`
imprime les durées du noyau et du premier rendu sur 10 000 variables.

`npm run fidelite --workspace ucm-architect-plugin -- [<cadre>…]` compare
chaque cadre de `galerie/cadres.json` à l'état de galerie du même identifiant,
dans la maquette d'UCM Architect : il range les captures côte à côte dans
`dist/fidelite/` et imprime chaque écart de taille, de police, de couleur ou
de texte. Deux champs facultatifs d'un cadre bornent ce que la maquette
contredit elle-même : `zonesDeDonnees` (sélecteurs dont les descendants ne se
comparent que sur leurs styles) et `ecartsDeclares` (textes dont la présence
d'un seul côté n'est pas un écart, chacun avec sa raison). Le comparateur
imprime à la fin ce que chacun couvre. Un cadre `sorte: "seul"` se compare sur la
barre latérale seule, à la taille du cadre : la galerie lui ajoute une feuille
qui cache le reste (`galerie/build-galerie.cjs`), dont les éléments listés par
`masque` et, par `extrait`, la ligne que la maquette écrit à leur place.

Après un échec de `test:ui` sur `dist/galerie-fixtures.cjs` introuvable,
relancez `npm run galerie --workspace ucm-architect-plugin` : il compile les
fixtures que les tests d'interface lisent.

## Licence

[MIT](../../LICENSE).
