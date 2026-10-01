# UCM Token Explorer

UCM Token Explorer est le plugin de [UCM Toolkit](../../README.md) qui
explique les variables d'un fichier Figma : collections, groupes, alias,
modes et consommateurs. Il fonctionne sur toute architecture de tokens, avec
ou sans UCM, et n'écrit jamais dans le document. Le nom est provisoire ; il ne
s'écrit que dans `manifest.json`, `src/ui/textes.ts` et `src/ui/index.html`.

## Ouvrir le plugin

Depuis la racine du dépôt, avec Node 22 :

```sh
npm install
npm run build --workspace ucm-explorateur-plugin
```

Dans Figma Desktop, ouvrez `Plugins > Development > Import plugin from manifest`
et choisissez `packages/plugin-explorateur/dist/manifest.json`.

Le manifeste ne porte pas encore d'identifiant attribué par Figma. Si Figma
refuse l'import pour cette raison, créez un plugin vide par `Plugins >
Development > New plugin…`, recopiez son `id` dans
`packages/plugin-explorateur/manifest.json`, puis relancez le build. N'y
recopiez jamais l'identifiant d'un autre plugin du dépôt : `tests/manifest.test.ts`
le refuse.

## Explorer les variables

À l'ouverture, le plugin lit les variables locales et les cibles de leurs
alias. **Actualiser** relit le fichier ; le pied de la fenêtre donne l'heure
et le numéro du relevé.

- **Arbre.** Une collection montre toutes ses variables ; un groupe montre les
  siennes et celles de ses descendants. Le chevron replie l'arbre sans
  changer la table.
- **Table.** Une colonne par mode de la collection, avec l'alias direct ou la
  valeur rangée, puis le résultat. La vue compacte garde la seule colonne du
  contexte actif. La recherche porte sur toutes les collections.
- **Contexte.** La barre choisit un mode par collection à plusieurs modes ;
  une collection non choisie prend son mode par défaut.
- **Chaîne.** Survoler un nom ou lui donner le focus montre la chaîne
  complète après 250 ms ; Échap la ferme. Cliquer sur le nom l'épingle dans
  l'inspecteur, cliquer sur un alias suit sa cible, **Retour** revient au
  groupe, au token et à la position précédents.
- **Inspecteur.** Valeur terminale, chaîne, valeurs par mode, provenance,
  dépendants, copies et contraste d'une paire.

Les onglets ajoutent **Comparer** deux contextes, **Dépendants**,
**Diagnostics** avec export du rapport, **Calques** pour les consommateurs
dans Figma, **Graphe**, **Intégrations** et **Relevés**.

## Intégrations facultatives

Le plugin est complet sans elles, et aucune ne s'active seule :

- importer des contrats `*.contract.json` et un `tokens.json` relie une
  variable à sa référence publiée et à ses emplacements dans les contrats ;
- lire la recette UCM Palettes, puis associer une variable à un cran, montre
  les emplois de ce cran ;
- appliquer le profil d'architecture UCM, après avoir associé chaque
  collection à sa couche, contrôle les alias, les valeurs directes et les
  portées.

Le détail de chaque lecture et de ses limites est dans la
[spécification](./SPEC.md).

## Limites

- Les changements de variables ne sont pas signalés par Figma sans charger
  toutes les pages : actualisez après une modification.
- Une variable de bibliothèque non utilisée dans le fichier n'est pas lue ;
  une cible non lue s'affiche « inaccessible », jamais « supprimée ».
- La résolution des collections étendues, des modes hérités et des
  bibliothèques distantes reste à confirmer dans Figma ; l'onglet Calques
  compare le résolveur à `resolveForConsumer` sur un calque sélectionné.
- L'analyse des calques ne lit ni les réactions de prototype, ni les valeurs
  par défaut des propriétés de composant, ni les calques masqués des
  instances.

## Vérifier

```sh
npm run test --workspace ucm-explorateur-plugin
npm run typecheck --workspace ucm-explorateur-plugin
npm run build --workspace ucm-explorateur-plugin
npm run test:ui --workspace ucm-explorateur-plugin
npm run galerie:captures --workspace ucm-explorateur-plugin
npm run mesure --workspace ucm-explorateur-plugin
```

`test:ui` reconstruit l'interface et la galerie, puis demande le Chromium de
`npx playwright install chromium`. La galerie s'écrit dans `dist/galerie/` à
1200 × 800 et dans `dist/galerie-minimale/` à 560 × 480. `mesure` imprime les
durées du noyau et du premier rendu sur 10 000 variables.

Après un échec de `test:ui` sur `dist/galerie-fixtures.cjs` introuvable,
relancez `npm run galerie --workspace ucm-explorateur-plugin` : il compile les
fixtures que les tests d'interface lisent.

## Licence

[MIT](../../LICENSE).
