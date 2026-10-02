# Suivi de la vue composant de l'explorateur

Ce suivi porte l'état du [plan d'implémentation](./PLAN-IMPLEMENTATION-VUE-COMPOSANT.md) :
lots livrés, preuves et recette Figma restante. Il
suffit pour reprendre le travail sans l'historique de conversation.

## État

| Lot | État | Preuve principale |
|---|---|---|
| 0. État des lieux | Livré | Ligne de base ci-dessous, typings relus |
| 1. Modèle pur | Livré | `tests/composant.test.ts`, 13 tests |
| 2. Lecture dans le sandbox | Livré | `tests/lectureDuComposant.test.ts`, 12 tests ; `tests/lecture.test.ts` vert sans changement |
| 3. Messages, routes, fenêtre | Livré | `tests/fenetre.test.ts`, `tests/apercu.test.ts`, `tests/galerie.test.ts` |
| 4. La vue, états simples | Livré | 9 états de galerie étroite et l'onglet de la fenêtre large ; tests d'interface « une sélection affiche le composant », « un clic déplie la chaîne », « une réponse […] remplacée », « le nom d'un calque […] HTML » |
| 5. Composant complexe | Livré | 7 états de galerie ; tests d'interface « un composant complexe replié tient sans défilement », « une frontière envoie lire-composant », « le filtre s'ouvre par la loupe » |
| 6. Aperçu et survol | Livré | 2 états de galerie ; test d'interface « le survol d'une ligne à 12 calques pose 12 cadres » |
| 7. Documentation et lois | Livré | `SPEC.md`, `AGENTS.md`, `README.md` du paquet ; `tests/inventaireInvariants.test.ts` et `tests/docLinks.test.ts` verts |
| 8. Recette Figma | Recette écrite, non exécutée | [RECETTE-VUE-COMPOSANT.md](./RECETTE-VUE-COMPOSANT.md) |

**Validations restantes** : relire les écarts de fidélité ci-dessous et
exécuter la recette Figma. Les modules de la vue composant sont suivis dans le
dépôt ; aucune reprise d'un arbre de travail partagé n'est nécessaire.

## Typings relus

`@figma/plugin-typings` 1.138.0, `plugin-api.d.ts`. Aucun écart avec le plan.

| Déclaration | Forme lue |
|---|---|
| `InstanceNode.overrides` | `{ id: string; overriddenFields: NodeChangeProperty[] }[]` |
| `InstanceNode.getMainComponentAsync` | `Promise<ComponentNode \| null>` ; un maître distant ou supprimé peut n'avoir aucun parent |
| `exportAsync` | `Promise<Uint8Array>` pour `{ format: 'PNG', constraint: { type: 'WIDTH', value } }` |
| `absoluteBoundingBox`, `absoluteRenderBounds` | `Rect \| null` |
| `getStyleByIdAsync` | `Promise<BaseStyle \| null>` |
| `textStyleId` | `string \| PluginAPI['mixed']` |
| `ComponentSetNode.defaultVariant` | `ComponentNode` |
| `ShowUIOptions.visible`, `figma.ui.show()` | Présents |

## Décisions prises pendant l'exécution

| Sujet | Décision |
|---|---|
| Mots des natures et des libellés | `natureDe` rend des identifiants (`couleur`, `fond`, `rayon`). Leurs mots sont dans `src/ui/textes.ts`, seul catalogue des textes |
| Calques d'une ligne | Chaque calque compte une fois, même s'il porte le token sur deux propriétés. `×N` compte des calques |
| Préfixe commun | `prefixeCommun` reçoit les noms des tokens du sujet entier, pas ceux de la portée : un nom court ne change pas quand le designer sélectionne un calque |
| Modes nommés | L'en-tête et la chaîne nomment le mode d'une étape quand sa collection en déclare plusieurs |
| Liaisons du pied | Le compte réunit les variables liées et les styles de texte portés, comme la maquette |
| Fixtures | `tests/fixturesDeComposant.ts` porte Button, Alert, TileLink, StressTest, Tag et Avatar ; `tests/fixtures.ts` les réexporte. Chaque liaison de la maquette y donne une liaison : une marge horizontale tient sur `paddingLeft` seul. Avatar reçoit un calque de texte, sans lequel sa couleur de texte n'aurait pas de calque porteur |
| `lireLesVariables` | Reçoit `options` en quatrième argument : `lues` pour compléter une lecture, `membres` pour lire aussi les membres des collections, `auDepart` pour recevoir chaque variable de départ telle que Figma la rend. La vue composant lit sans `membres` : une collection de bibliothèque de mille variables ne se lit pas pour un token |
| Relevé d'un composant | Chaque collection ne garde que ses variables lues. Le message reste court |
| `lireLeComposant` | Reçoit une horloge en quatrième argument, pour dater le relevé |
| Surcharge `boundVariables` | Quand `overriddenFields` cite `boundVariables`, la lecture garde les liaisons du calque visé hors peintures, effets et grilles : Figma ne dit pas quel champ a changé |
| Frontière | L'instance elle-même ne donne aucune liaison propre : ses liaisons viennent du composant imbriqué. Seules ses surcharges comptent |
| Sujet d'un jeu de variants | `sujet.id` est l'identifiant du jeu, et la racine lue est le variant par défaut. Une portée absente des calques lus retombe sur la racine |
| Boîtes | `calque.boite` garde la boîte de Figma, dans le repère de la page. Le message de l'aperçu porte l'origine de l'image ; l'interface fait la différence |
| `exporterLApercu` | Reçoit un port et l'identifiant du calque. `code.ts` lui passe la racine lue, le variant par défaut pour un jeu |
| Sélection sans sujet | La vue oublie la lecture en mémoire. Désélectionner puis sélectionner de nouveau relit le composant : c'est le seul geste d'actualisation de la fenêtre étroite |
| Lecture en vol | Une nouvelle demande envoie `annuler` pour la précédente, puis ignore sa réponse |
| Pile et sélection | Un message `selection` qui désigne un composant de la pile y revient sans relecture |
| « Tout déplier ou replier » | Suit le lot 5 : avec toutes les sections ouvertes, le geste ferme les lignes et oublie les choix de sections. La maquette, elle, replie alors toutes les sections, y compris sous 12 lignes |
| Pied sous un écran vide | Le pied reste affiché, vide, comme dans la maquette, où `display: flex` l'emporte sur `hidden` |
| Rôles de couleur | Cinq rôles ajoutés à `roles.css`, et non trois : le violet d'un composant, les deux cadres, puis le fond clair de l'aperçu et l'encre d'une pastille claire, que la maquette écrit aussi en dur |
| Onglet large | La vue remplit le panneau, sans largeur maximale |
| Acronyme | `PNG` entre dans `ACRONYMES` de `scripts/controle-style.mjs` |
| Test du clavier | `tests/interface/interface.test.mjs` presse Droite deux fois pour atteindre « Comparer » : « Composant » le précède |

## Écarts avec le plan ou la maquette, à relire

Ces points attendent l'accord du mainteneur.

| Sujet | Ce qui est livré | Pourquoi |
|---|---|---|
| Chaîne dépliée | La vue dessine sa chaîne elle-même, collection puis nom, comme la maquette. Elle n'emploie pas `rendreChaine`, dont l'ordre est nom puis collection. Les deux partagent `constatDeResultat`, extrait de `constatDeChaine` | Le lot 4 demande `rendreChaine`, la section 3 demande le dessin de la maquette |
| Chaîne non résolue | La ligne affiche « interrompue », texte de la maquette. Le titre du constat est l'infobulle de la ligne et la cause écrite au bout de la chaîne ; son détail et son geste sont l'infobulle de la cause | Le lot 4 demande le titre du constat sur la ligne, la section 3 demande « interrompue » |
| Cause d'une chaîne interrompue | « Cible inaccessible », titre du constat existant. La maquette écrit « Bibliothèque inaccessible » | La lecture établit qu'une cible n'a pas été lue, pas que sa bibliothèque est inaccessible |
| Libellé d'une marge | « Marge ». La maquette écrit « Marge horizontale » | La table des natures du lot 1 donne un libellé par famille de propriétés |
| Style de texte sans variable | Il donne une ligne, sans valeur ni champ | La section 2 demande une ligne par style |

Éléments sans dessin dans la maquette, dessinés avec les règles voisines :

| Élément | Dessin |
|---|---|
| Choix du variant | Un `<select>` natif aux mesures de `.mode` |
| Marque d'écart avec Figma | `≠` avant la valeur, couleur de `.valeur.rompue`. La ligne dépliée ajoute une étape « Figma rend … » |
| Lecture en cours, lecture échouée | Une phrase dans le bloc `.vide`, sans pictogramme |
| Nature « Autre » | Pastille `·` |
| Annonce d'une copie | L'annonce de l'explorateur, plus grande que celle de la maquette |
| Poignée de redimensionnement | Celle du socle, dans le coin bas droit, au-dessus du pied |

## Relevé de fidélité

`npm run fidelite --workspace ucm-explorateur-plugin`, dernier passage. La
page de galerie est ouverte à 362 × 643 px, la zone que la maquette laisse au
plugin sous la barre de titre de Figma qu'elle dessine.

```text
Alert ouvert (composant-simple) : aucun écart
Chaîne dépliée (composant-chaine) : aucun écart
Style de texte déplié (composant-style) : aucun écart
StressTest replié (composant-complexe) : aucun écart
Section Couleur dépliée (composant-section) : aucun écart
Calque UserInput sélectionné (composant-portee) : aucun écart
Button ouvert depuis StressTest (composant-frontiere) : aucun écart
Filtre « radius » (composant-filtre) : aucun écart
Tag, chaîne interrompue et valeurs sans token (composant-interrompu) : 4 écarts
  Cause : largeur 127.2 dans la maquette, 88.5 dans le plugin
  Cause : texte « Bibliothèque inaccessible » dans la maquette, « Cible inaccessible » dans le plugin
  Partie de valeur sans token 1 : largeur 97.2 dans la maquette, 34.4 dans le plugin
  Partie de valeur sans token 1 : texte « Marge horizontale » dans la maquette, « Marge » dans le plugin
Avatar sans token (composant-sans-token) : aucun écart
État vide (composant-vide) : aucun écart
Total : 4 écarts sur 11 paires.
```

Les quatre écarts viennent de deux textes, listés ci-dessus. Le relevé compare
40 éléments par paire : boîte, police, couleurs, espacements et texte. Il ne
compare ni l'image de l'aperçu, dessin de test dans la galerie, ni les
infobulles.

## Conduite quand une étape échoue

| Question | Si la recette échoue |
|---|---|
| R1 | Lire le départ par la clé de son identifiant : passer les départs en importables dans `lireLesVariables`, et étendre l'invariant d'import d'`AGENTS.md` aux variables liées à un calque |
| R2 | Garder la chaîne interrompue. Relever la cause que Figma donne et l'écrire dans le détail du constat |
| R3 | Si l'import laisse une trace gênante dans le fichier client, retirer l'import des cibles pour la vue composant : la chaîne s'arrête à la première cible que Figma ne rend pas |
| R4, R5 | Si `resolvedVariableModes` ne nomme pas les collections de bibliothèque, résoudre sans mode de calque et afficher la valeur de `resolveForConsumer` à la place de celle de la chaîne. Si le renommage casse le rapprochement, relever les identifiants des deux côtés avant de corriger `traduireLesModes` |
| R6 | Si le calque expose les variables du style sans `textStyleId` lisible, retirer la lecture du style et garder les liaisons du calque |
| R7 | Corriger `sujetDe` pour le type de sélection en cause, et ajouter son cas à `tests/lectureDuComposant.test.ts` |
| R8 | Relever le calque, le token et les deux valeurs. Une opacité d'alias ou un mode hérité sont les premières pistes |
| R10 | Si l'export écrit dans l'historique du fichier ou dépasse une seconde, retirer l'aperçu : `code.ts` n'appelle plus `exporterLApercu`, et la zone disparaît |
| R11 | Si l'instance ouverte ne donne pas les surcharges du parent, lire aussi `overrides` de la racine quand elle est une instance |
| R12 | Retirer le survol : supprimer les cadres de `src/ui/vues/composant.ts`, et `boite` de la lecture |
| R13 | Baisser `LOT`, ou envoyer la liste avant la lecture de `resolveForConsumer` |
| R14 | Parcourir les instances dont le maître n'est pas publié, au lieu de s'arrêter à toute instance |

## Ce qui reste non vérifié dans Figma

L'agent n'a pas accès à Figma. Tout ce qui suit tient sur des doubles de test.

- La lecture d'une variable de bibliothèque liée à un calque, et de sa chaîne.
- Les clés de `resolvedVariableModes` pour une collection de bibliothèque.
- Le contenu d'`InstanceNode.overrides` pour une liaison posée par le parent.
- L'accord entre l'image d'`exportAsync` et les boîtes des calques.
- Le choix de la disposition avant l'affichage, `visible: false` puis
  `figma.ui.show()`.
- L'envoi d'un `Uint8Array` de l'image par `postMessage`.
- Le temps de lecture de StressTest.

## Commandes exécutées

| Commande | Résultat |
|---|---|
| `npm test --workspace ucm-explorateur-plugin` (ligne de base) | 113 tests, 0 échec |
| `npm run typecheck` (ligne de base) | Vert |
| `npm run build --workspace ucm-explorateur-plugin` (ligne de base) | Vert |
| `npm run test:ui --workspace ucm-explorateur-plugin` (ligne de base) | 13 tests, 0 échec |
| `npm test` (ligne de base) | 2 452 tests, 0 échec |
| Les cinq commandes après le lot 1 | Vertes ; 126 tests dans le paquet |
| `npm test --workspace ucm-explorateur-plugin` (arbre de travail, lots 2 à 7) | 144 tests, 0 échec |
| `npm run typecheck` (arbre de travail) | Vert |
| `npm run build --workspace ucm-explorateur-plugin` (arbre de travail) | Vert |
| `npm run test:ui --workspace ucm-explorateur-plugin` (arbre de travail) | 23 tests, 0 échec ; trois galeries, dont 18 états à 364 × 680 |
| `npm test` (arbre de travail) | Vert |
| `npm run fidelite --workspace ucm-explorateur-plugin` | 4 écarts sur 11 paires, relevé ci-dessus |
| Tête commitée, dans un worktree séparé, sans les fichiers de l'autre session | Typage vert ; 125 tests du paquet ; 12 tests d'interface ; liens et style des documents verts |

## Reprendre après un échec

| Échec | Reprise |
|---|---|
| `test:ui` ne trouve pas `dist/galerie-fixtures.cjs` | `npm run galerie --workspace ucm-explorateur-plugin` |
| `fidelite` ne trouve pas `dist/galerie-etroite` | `npm run galerie --workspace ucm-explorateur-plugin` |
| Chromium absent | `npx playwright install chromium` |
