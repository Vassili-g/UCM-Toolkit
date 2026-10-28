# Carte : kit

Le format et ses lecteurs : @ucm-kit/core, publié.

## ./
- invariants/ : les invariants du paquet, un fichier par groupe
- schema/ : schéma commité, publié en `@ucm-kit/core/schema`
- tests/ : `.test.ts` pour le format, `.test.mjs` pour les lecteurs

## src/format/
Sous-chemin sans dépendance Node ni Figma.

- types.ts : schéma TypeScript du contrat
- version.ts : `CONTRACT_VERSION`, seul endroit où elle est écrite
- tokens.ts : forme de tokens.json, `TOKENS_FORMAT_VERSION` et lecture de sa marque
- names.ts : `normalizeName`, `codeIdentifier`, `tokenCssVariable`
- chemins-de-tokens.ts : chemin publié d’un token, commun aux plugins
- axes-de-collections.ts : décision des axes de modes et de leurs collisions, que l'exporteur et le socle appellent
- roles-de-rendu.ts : table des rôles de rendu (nature, propriétés CSS, repli) dont l'exporteur et le diagnostic des contrastes dérivent
- references.ts : forme d'une référence de token, et son enveloppe
- configuration.ts : grammaire de `ucm.config.json`, pour la CI et le plugin
- identite.ts : « ces deux contrats sont-ils le même composant ? »
- typography.ts : graisses et styles DTCG qu'un text style emploie
- index.ts : ce que le sous-chemin publie

## src/protocoles/
- nommage.ts : entrées de nommage que Nomenclature range et que Palettes relit : clés, écriture, lecture versionnée, rangement avec retour au texte d'avant et entrées futures (`futures`)

## src/nommage/
Sous-chemin sans Figma : calcul de renommage sur un inventaire portable.

- inventaire.ts : forme de l'inventaire, `estProtegee`, `palettesLibres`, `causeDeProtection`
- chemins-publies.ts : renommages qui feraient disparaître un token de `tokens.json` ou un axe de modes de l'export (`axesDeLExport`)
- calcul.ts : `nomsSelonLesRegles` et sa version synchrone, qu'UCM Architect et UCM Palettes appellent ; `idsNonRenommables` en tire les noms figés

## src/emplois/
Sous-chemin sans dépendance : vocabulaire qu'UCM Palettes et `ucm check` partagent.

- dossiers.ts : table des dossiers `solid`, `surface` et `page` et de `ring`, une par thème et par sens, le neutre, les crans requis, les trois états, ce que chaque variable peint et ses portées Figma
- garanties.ts : les sept garanties G1 à G7, leurs fonds (une variable de la palette, la page ou la carte) et leur jugeabilité selon les crans présents
- contraste.ts : contraste WCAG 2 et sa comparaison au seuil à dix décimales
- index.ts : ce que le sous-chemin publie

## src/lecteurs/
Ce qui juge un contrat écrit ; `ajv` et `node:fs`.

- validation-contrat.mjs : forme d'un contrat, champ par champ
- validation-graphe-contrats.mjs : composition, doublons et collisions d'identifiant
- validation-echantillons.mjs : adresses que les échantillons visent
- variant-views.mjs : vue exacte d'un variant
- version-contrat.mjs : plage lue, et sens d'un écart de version
- references-token.mjs : forme d'une référence, et son relevé
- tokens-dtcg.mjs : ce que le fichier de tokens contient, donc ce qui existe
- modes-tokens.mjs : axes de modes du fichier de tokens, sans CSS
- caracteristiques.mjs : ce qu'un contrat porte, qui décide des aides à imprimer
- typography-token-types.mjs : types DTCG qu'un style typographique exige
- schema-contrat.mjs : schéma publié, chargé pour Ajv
- configuration.mjs : ouvrir `ucm.config.json` ; sa grammaire est dans `format/`
- implementation.mjs : où se trouve une implémentation, et si elle est là
- trouver-contrats.mjs : retrouver les contrats d'un dossier
- controle-repository.mjs : contrôle complet et rapport du designer
- verdict-bilan.mjs : ce qui refuse une fusion, et titre de ce refus
- perimetre-rapport.mjs : ce que la demande de fusion touche, et si elle concerne UCM
- avertissements-export.mjs : ce que l'export n'a pas su décrire
- diagnostic-tokens.mjs : références que la source de tokens ne porte pas
- diagnostic-contrastes.mjs : contraste de chaque couleur d'un contrat contre son fond, en information
- diagnostic-parite.mjs : écart contrat ↔ code : le juger et le dire
- diagnostic-tests.mjs : ce qu'une suite de tests rouge dit au designer
- diagnostic-markdown.mjs : rendu markdown d'un diagnostic
- index.mjs : porte publique `@ucm-kit/core/lecteurs`
- index.d.mts : ce que cette porte promet à un consommateur TS
- navigateur.mjs : porte `@ucm-kit/core/lecteurs/navigateur` : lecteurs sans Node ni Ajv, pour un plugin ou une page
- navigateur.d.mts : ce que cette porte promet à un consommateur TS

## src/controles/
- candidatsDeLongueur.ts : valeur en pixels d'une variable, alias suivis (`candidatDeLongueur`), classement exact ou proche (`classerLesCandidats`, C29 seul) ; `candidatsDeLongueur` cherche dans `layout`, par index de catalogue, pour `preparerLesTokens` ; C29 classe les tokens `components` du composant
- preparation.ts : `preparerLesTokens` : variables de `components` à créer pour un composant, ce qu'elles visent dans `theme` et `layout`, questions ouvertes
- propagation.ts : `proposerLaPropagation` (C24) : liaisons d'un variant modèle reportées sur les autres variants par substitution des segments d'axe, en correction exacte ou en question

## src/referentiel/
- signes.ts : les signes des sortes d’objets (13 familles, identifiant, libellé, sens, tracé SVG, mot de repli), les reprises entre familles et `svgDuSigne` ; données seules, la tuile se pose dans le socle

## scripts/
- build-schema.ts : génère le schéma depuis `types.ts`
- generer-refus.mjs : refus de version, rendus pour la relecture

## fixtures/contrats/
Jeux figés que le moteur ne sait plus fabriquer.

- 13.0/ : jeu N-1
- 12.0/ : hors fenêtre, gardé pour `tests/refus-enregistres.test.mjs`
- 11.0/ : hors fenêtre, gardé pour `tests/refus-enregistres.test.mjs`

## fixtures/
- tokens/ : `tokens.json` d'origine, antérieur à la version 1 du format de tokens
