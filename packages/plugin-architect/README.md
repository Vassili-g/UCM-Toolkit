# UCM Architect

UCM Architect est le plugin de [UCM Toolkit](../../README.md) qui
explique les variables d'un fichier Figma : collections, groupes, alias,
modes et tokens d'un composant. Il fonctionne sur toute architecture de tokens, avec
ou sans UCM, et n'écrit jamais dans le document. Le nom est provisoire ; il ne
s'écrit que dans `manifest.json`, `src/ui/textes.ts` et `src/ui/index.html`.

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
  changer la table. La recherche, sous le titre de l'arbre, porte sur toutes
  les collections.
- **Table.** Une colonne par mode de la collection, avec l'alias direct ou la
  valeur rangée, puis le résultat. La vue compacte garde la seule colonne du
  contexte actif.
- **Contexte.** Chaque collection prend son mode par défaut. Les onglets
  Comparer, Dépendants, Diagnostics, Intégrations et Relevés sont retirés ;
  leurs calculs purs restent dans le code.
- **Chaîne.** Survoler un nom ou lui donner le focus montre la chaîne
  complète après 250 ms ; Échap la ferme. Cliquer sur le nom l'épingle dans
  l'inspecteur, cliquer sur un alias suit sa cible.
- **Inspecteur.** Valeur terminale, chaîne, valeurs par mode, provenance,
  dépendants, copies et contraste d'une paire.

Le dernier segment du nom reste clair ; son chemin prend la couleur secondaire.

Le centre ne montre plus que la table. Le panneau latéral de 640 px porte Nomenclature, à la place de l'inspecteur, jusqu'à la fiche d'une variable.

La [maquette de la navigation](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Recette%201/MAQUETTE-RECETTE-1.html)
montre la bascule des deux modes et la recherche dans l'arbre.

## Lire les tokens d'un composant

Choisissez **Composant** dans la barre, puis sélectionnez un composant, une instance ou un jeu de variants dans Figma. La
vue composant affiche ses tokens, une ligne par token, groupés par nature :
couleur, forme, espacement, taille, texte.

- **Ligne.** La pastille, le nom du token sans le préfixe commun au
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
- **Sans token.** Le pied compte les valeurs qu'aucune variable ne lie, et les
  liste au clic.

## Intégrations facultatives

L'onglet Intégrations est retiré. Le profil d'architecture UCM (`src/integrations/profilUcm.ts`) et la lecture de la recette d'UCM Palettes (`lireLaRecette`) restent dans le code, sans écran ; le contrôle du fichier déclaré UCM les reprend.

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
de texte.

Après un échec de `test:ui` sur `dist/galerie-fixtures.cjs` introuvable,
relancez `npm run galerie --workspace ucm-architect-plugin` : il compile les
fixtures que les tests d'interface lisent.

## Licence

[MIT](../../LICENSE).
