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

- dossiers.ts : table des dossiers `solid`, `surface` et `page` et de `ring`, une par thème et par sens, le neutre, les crans requis, les trois états, les variables de chaque dossier, ce que chaque variable peint et ses portées Figma
- garanties.ts : les neuf garanties G1 à G9, leurs fonds (une variable de la palette, la page ou la carte), l'état de chaque fond et leur jugeabilité selon les crans présents
- contraste.ts : contraste WCAG 2 et sa comparaison au seuil à dix décimales, contraste tronqué et écrit, encre noire ou blanche d'un fond
- couleur.ts : une couleur de Figma en octets bornés (`versOctet`, `versRgb8`) et en hexadécimal majuscule (`hexaDeFigma`)
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
- integrite.ts : `controlerLIntegriteUcm` (C82) : les variables que le thème prévoit et que `theme` n'a pas, avec la création exacte (`Correction.creation`) quand la règle et les variables jumelles donnent une seule cible ; un cran absent d'une rampe est un constat de rampe ; le cran que chaque variable de `theme` vise, jugé sur la table et le sens de la palette (correction ou question) ; les couches visées, les valeurs directes, les scopes, les modes de `theme`, le type et le rangement des variables de palette
- oublis.ts : C31 (combinaison d'axes absente), C32 (token inutilisé ou sans variant) et C33 ; C32 lit aussi les variants des wrappers de dimensions (`ReleveDeComposant.wrappers`) pour les tokens dont un segment joue un rôle d'axe que seul un wrapper porte
- preparation.ts : `preparerLesTokens` : variables de `components` à créer pour un composant, ce qu'elles visent dans `theme` et `layout`, questions ouvertes ; nomme variables et cibles par chemin complet (collection en tête), lit la première collection de `theme` et de `layout` et rend les autres dans `collectionsEnDouble`
- propagation.ts : `proposerLaPropagation` (C24) : liaisons d'un variant modèle reportées sur les autres variants par substitution des segments d'axe, en correction exacte ou en question ; `candidatsDeModele` et `constatsDeModele` (C81) : par sorte, couleurs ou tailles, le variant le plus lié que les autres variants pourraient suivre, émis par `controlerCouchesParEtapes`
- releve.ts : les faits lus dans Figma avant tout jugement (`ReleveDeComposant`) ; `wrappers` porte, par jeu de wrapper de dimensions, ses axes et les liaisons de ses variants, sans le reste des layers

## src/referentiel/
- composition.ts : les quatre sortes de composant imbriqué et `sorteDeLImbrique(faits)`, depuis nom, règles trouvées et dimensions liées
- signes.ts : les signes des sortes d’objets (14 familles, dont `rubrique-tokens` pour les dix catégories du mode Tokens, identifiant, libellé, sens, tracé SVG unique, mot de repli), les reprises entre familles et `svgDuSigne` ; données seules, la tuile se pose dans le socle

## scripts/
- build-schema.ts : génère le schéma depuis `types.ts`
- generer-refus.mjs : refus de version, rendus pour la relecture

## tests/stress/
Harnais de stress test d'Architect, hors de `npm test` : `run-tests.cjs` ne lit que le premier niveau de `tests/`.

- f1-noms/ : noms de Nomenclature (`npm run stress:f1` à la racine) ; `corpus.ts` convertit les `noms.json` des design systems en inventaires, lit le fichier Slice (`lireLaSlice`, seulement sur `--slice` ou `--verifier-fuite`) et cherche ses mots dans les fichiers suivis par Git (`fichiersEnFuite`), `dictionnaire.ts` compte les mots et rend les listes de candidats, `mutations.ts` rend les fautes M-01 à M-06 et les variantes de pluriel, de casse et de séparateur, `scenarios.ts` bâtit le squelette et les strates S1 à S17 (`--scenarios` compte les cas contre le plan et écrit l'empreinte), `oracle.ts` juge la sortie du kit cas par cas (rôles `oracle`, `provisoire` Q-Fx, `informatif`), `detecteur.ts` applique la règle de D1 et D2 sans seuil de fréquence, `execution.ts` appelle `nomsSelonLesReglesSync` puis `detecterLesQuestions` (N1 au seuil 0, N2 déduit de N1), juge S16 par passes et mesure P-21, P-22, P-23 et les six cas du plan, `rapport.ts` écrit `rapport.md`, `rapport.json`, `manques.csv` et `collisions-sans-question.csv`, `faux-positifs.ts` exécute les 64 passes du corpus, classe chaque sortie en FP-A à FP-D (`faux-positifs.csv`, `a-juger.csv` à 200 lignes au plus, `faux-positifs-par-type.csv`) et mesure la courbe du seuil L de 3 à 8 (`courbe-seuil.csv`, règle Q-F4), `seuil.mjs` est le chargeur Node qui réécrit `LONGUEUR_MINIMALE_D_UNE_FAUTE` en mémoire (`STRESS_F1_SEUIL`) et sort en erreur si la ligne change de forme, `donnees/` range `formes.json`, `synonymes.json` et `distincts.json` (30 paires écrites à la main, lues par `scenarios.ts`), `index.ts` lit les options (`--rapide`, `--strate`, `--graine`, `--attendre-zero`, `--sortie`, `--faux-positifs`, `--slice <chemin>`, `--verifier-fuite`) et lance la mesure sans `--corpus` ni `--scenarios` ; `--slice` mesure le fichier client (une passe de faux positifs, P-21 et P-22 sur 1 500 noms, S16 sur ce seul fichier) et n'écrit que des comptes et des identifiants de cas sous `_local/stress/f1-noms/slice/`, `--verifier-fuite` sort 1 si un mot de Slice hors vocabulaire, hors dictionnaire et hors `mots-admis.txt` (local) revient comme mot entier dans un fichier de `git ls-files` ; le reste s'écrit sous `_local/stress/f1-noms/`
- f2-structure/ : thème UCM de base des stress tests de structure ; `themeUcm.ts` fabrique un catalogue sans constat de `controlerLeCatalogue` ni de `controlerLIntegriteUcm` pour chacun des 72 profils (`PROFILS_DE_THEME`, P0 = p14, p37), `carte.ts` dit le sens de chaque palette par mode et la variable que chaque rôle de `theme` vise ; `tests/stressThemeBase.test.ts` en garde P0, p37 et un échantillon ; `cas.ts` fixe le type `CasDeStructure`, la clé de rattachement `cleDeConstat` (genre, variable, mode), les constats des deux contrôles dédoublonnés comme le sandbox (`constatsDeStructure`), la dégradation réversible du thème et les gabarits d'oracle, `operateursRoles.ts` (R1 à R4), `operateursCrans.ts` (K1 à K4) et `operateursModes.ts` (M1 à M4) rendent 172 cas sur P0 à l'oracle écrit d'après la carte et le référentiel, `operateursAlias.ts` (L1 à L5, C63 alias, library, valeurs), `operateursScopes.ts` (S1, S1b, S1c, S2), `operateursStructure.ts` (Y1 à Y4 couches, types et rangement ; X1 à X6 thèmes en double, variables illisibles, fichier libre, entrées malformées), `operateursEchelle.ts` (E1, E2, doublons de `sizing`) et `operateursNoms.ts` (Q1 à Q3, noms inconnus dans `theme`) en rendent 254 de plus, `operateurs.ts` en est le point d'entrée (`GENERATEURS`, 426 cas), `interactions.ts` rend les 24 interactions déclarées (8 couples I1 à I8 sur P0, p37 et le profil tiré, `unCouple` pour un couple sur un autre profil), `fauxPositifs.ts` rend les 85 thèmes justes (A0 les 72 profils, A1 à A7 les 13 thèmes ciblés), `metamorphiques.ts` rejoue un cas avec l'ordre des variables mélangé et la casse des noms changée (P8), `mesurer.ts` (`npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts [--section A|B|C] [--operateur K1] [--cas K1-12]`) passe les cas dans les contrôles, attrape les exceptions et écrit `operateurs.txt` et `operateurs.json` sous `_local/stress/f2-structure/` ; `tests/stressStructureOperateurs.test.ts` et `tests/stressStructureOperateursBis.test.ts` en gardent les nombres de cas, les cas `mesure`, un échantillon d'oracles, les faux positifs, les 24 interactions et la réversibilité
- f3-composant/ : composant de base des stress tests de liaisons et de tailles ; `composantDeBase.ts` fabrique un relevé, un catalogue et une carte sans constat de la portée (`constatsDeLaPortee`) à partir d'une `SpecDeComposant`, `profils.ts` donne les 96 profils et P0, `carte.ts` dit le token attendu par layer, champ et variant ; `operateursAxes.ts` (L1 à L5), `operateursRoles.ts` (R1, R2) et `operateursCibles.ts` (K1 à K4) copient le composant, le dégradent de façon réversible et rendent des `CasDeStress` à l'oracle écrit (150 cas sur P0), le premier portant aussi l'outillage commun (`Degradation`, `Registre`, `cleDeConstat`, `porteeAdmise`) ; `operateursModele.ts` (M1 fratrie, M2 propagation, avec `cleDeConstatEtendue` pour C63 et C81), `operateursPeinture.ts` (U1 à U4, C25, et les gestes de construction partagés), `operateursTheme.ts` (T1, T2, C59) et `operateursStructure.ts` (S1 à S3, C63) en rendent 126 de plus ; `operateursTailles.ts` (Z1 à Z8, C29, famille F4, avec `borneDeProximite` recalculée d'après la SPEC), `operateursEntrees.ts` (X1 lecture partielle, X2 entrées dégradées) et `fauxPositifs.ts` (A0 les 96 profils, A1 à A9 les 43 thèmes ciblés) en rendent 143 et 139 ; `tests/stressComposantBase.test.ts` en garde P0 et un échantillon, `tests/stressComposantOperateurs.test.ts` et `tests/stressComposantOperateursBis.test.ts` et `tests/stressComposantTailles.test.ts` les nombres de cas, un échantillon d'oracles et la réversibilité
- f5-variants/ : stress tests des variants, du nommage des tokens du composant (F5), de la typographie et des icônes (F6) ; `portF3.ts` est le seul fichier qui importe le générateur de F3, `composantDeBase.ts` fabrique P0 (`Button`, 72 variants, `Style` × `Color` × `Size` × `State`), tout composant à axes libres sans constat de la portée (C7 à C13, C31 à C33, `constatsDeLaPortee`) avec `verifierLaLecture` pour la lecture des tokens, et la base de F6 (`composantF6`, 12 variants `Size` × `State`, un style de texte par taille, une icône en instance de library que `Icon#1:2` pilote, sans constat C64 à C67 hors la limite de C67 ; `avecLesCouchesF6` pose ces couches sur un autre composant), `profils.ts` charge les corpus `corpus/axes-attestes.json` (35 noms) et `corpus/valeurs-attestees.json` (88 valeurs) et donne les 60 profils p01 à p60 (10 jeux d'axes, 3 écritures du nom, 2 des valeurs) ; `cas.ts` fixe le type `CasDeVariants`, la clé de rattachement `cleDeConstat`, la dégradation réversible (`Degradation`) et le modèle de référence dont les opérateurs de F5 tirent leurs oracles (`attendusDuModele`, calculé au premier accès), `operateursAxes.ts` (A1 à A4), `operateursValeurs.ts` (V1 à V5), `operateursQuestions.ts` (Q1 à Q3), `operateursMatrice.ts` (M1 à M5) et `operateursOrphelins.ts` (O1 à O6) rendent 270 cas sur P0 ; `typo/operateursTexte.ts` (le cadre `casF6` à oracle écrit à la main, S1 à S3 : style de texte, taille et graisse liées), `typo/operateursIcones.ts` (I1 à I5 : icône hors library, taille, couleur, plusieurs icônes, propriété INSTANCE_SWAP) et `typo/definitionsDIcone.ts` (I6 : les 31 layers que les contrôles C66, C49 et C17 jugent chacun, d'où l'écart E-26) rendent 101 cas sur la base de F6 ; `operateurs.ts` en est le point d'entrée (`GENERATEURS` pour F5, `GENERATEURS_F6`, `tousLesCasDeLaSectionB` pour les 371 cas) ; `fauxPositifs.ts` rend les 180 composants justes (FP1 les 60 profils, FP2 les 88 valeurs attestées à l'oracle tiré des registres, FP3 les 9 valeurs limites, FP4 les 23 composants de F6) ; `interactions.ts` rend les 32 interactions déclarées (16 couples sur P0 et p18) ; `relations.ts` rejoue un cas avec l'ordre des variants mélangé puis les noms d'axe réécrits ; `mesurer.ts` (`npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts [--section A|B|C] [--famille F5|F6] [--operateur V1] [--cas V1-4] [--profil p07]`) passe les cas dans `controlerNommage`, `controlerOublis` et `controlerLaTypographie`, rejoue les relations, compare les trois définitions d'icône, attrape les exceptions, abandonne un cas M3 au-delà de dix fois son budget et écrit `operateurs.txt` et `operateurs.json` sous `_local/stress/f5-variants/` ; `tests/stressVariantsOperateurs.test.ts` et `tests/stressTypographieOperateurs.test.ts` en gardent les corpus, les bases, les nombres de cas, les cas `mesure`, un oracle écrit à la main par opérateur et par couple, et la réversibilité
- f7-accessibilite/ : stress tests de l'accessibilité du mode Composant (F7, C49 à C53) ; `oracleContraste.ts` calcule le rapport WCAG 2 sans rien importer de `emplois/` (table de 256 luminances, composition de bas en haut avec un seul arrondi à 8 bits, troncature à deux décimales), `paires.ts` cherche pour un fond la paire d'octets la plus proche de chaque seuil, au-dessus et au-dessous, et les six compositions que deux ordres d'arrondi jugent différemment, `couleursDeStress.ts` pose les valeurs de `theme` par mode (chaque paire dépasse son seuil de 25 %), `composantDeContraste.ts` impose ces couleurs, les quatre états de `State`, l'anneau et le contour à 2 px et les fonds d'élévation au composant de base de F3, `profils.ts` donne les 48 profils sRGB p001 à p048 (P0 = p013, `button-36` à 48 variants), qui ne produisent aucun constat C49 à C52 ; `cas.ts` fixe le type `CasAccessibilite`, la clé de rattachement `cleDeConstat` (usage, layer, plage, fond), les constructeurs d'attendus et la fabrique de cas, `degradation.ts` la dégradation réversible et la scène qui isole le variant cible, `operateursSeuils.ts` (S1 à S3, G1 à G3), `operateursOpacites.ts` (O1 à O6), `operateursFonds.ts` (F1 à F7), `operateursModes.ts` (M1 à M7) et `operateursGaranties.ts` (Y1, Y2) rendent 294 cas sur P0 à l'oracle écrit d'après `oracleContraste.ts`, `operateursIcones.ts` (I1 à I6), `operateursContours.ts` (R1 à R5), `operateursCibles.ts` (Z1 à Z4, X1 à X5), `operateursBorne.ts` (Q1 à Q5, avec le constructeur de variants à collections de modes `poserLaBorne`) et `operateursTexteEtEntrees.ts` (T1, T2, L1, L2) rendent 225 cas de plus ; les opérateurs d'espace E1 à E3 sont retirés avec Display P3 ; `operateurs.ts` en est le point d'entrée (`GENERATEURS`, `GENERATEURS_DU_LOT_2`, `tousLesCasDesOperateurs` : 519 cas) ; `fauxPositifs.ts` pose les 22 thèmes ciblés et, avec `garantiesDePalettes.ts`, les 72 cas de garantie de quatre palettes tirées de la graine ; `interactions.ts` pose sept couples déclarés sur P0, Pα et le profil tiré (21 cas) ; `metamorphiques.ts` rejoue l'ordre mélangé et la casse changée ; `mesureDesCas.ts` mesure un cas et agrège le tableau, `mesurer.ts` (`npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts [--section A|B|C|R] [--operateur S1] [--cas S1-4]`) passe les cas dans `controlerLAccessibilite`, compare par `commun/comparer.ts`, attrape les exceptions (le cas dont le contrôle ne finit pas s'exécute dans un processus à délai) et écrit `operateurs.txt` et `operateurs.json` sous `_local/stress/f7-accessibilite/` ; `tests/oracleContraste.test.ts`, `tests/stressAccessibiliteOperateurs.test.ts` et `tests/stressAccessibiliteOperateursBis.test.ts` en gardent l'oracle, les nombres de cas, les cas `mesure`, un oracle écrit à la main par opérateur et par couple et la réversibilité
- rejeu-fichiers/ : rejeu des deux contrôles du mode Tokens sur des exports DTCG réels (`npm run stress:rejeu`), qui mesure sans rien corriger ; `dtcg.ts` convertit un `tokens.json` en `CatalogueDeReference` et chiffre la conversion (jetons sautés, alias non résolus), `proprietes.ts` mesure R1 constats de base, R2 déterminisme, R3 ordre, R4 point fixe des corrections `scope`, `alias-de-mode` et `variable`, et R5 vingt tirages de cinq défauts mêlés injectés par sept injecteurs repris d'opérateurs de F2, `index.ts` lit `--source slice|intencial`, `--fichier <chemin>` et `--propriete R1..R5`, chronomètre avec `--chrono` les deux contrôles (médiane de 11 passes, `_local/stress/rejeu-fichiers/chrono.txt`), écrit les détails nommés sous `_local/stress/rejeu-fichiers/<source>/` et un `resume.txt` de nombres et de codes, puis cherche les mots de Slice dans la sortie ; `tests/stressRejeuFichiers.test.ts` en garde la conversion, R2, R4 et un injecteur sur un document fabriqué
- commun/ : tirage à graine, types des cas et comparaison des constats attendus et émis, partagés par toutes les familles

## fixtures/contrats/
Jeux figés que le moteur ne sait plus fabriquer.

- 13.0/ : jeu N-1
- 12.0/ : hors fenêtre, gardé pour `tests/refus-enregistres.test.mjs`
- 11.0/ : hors fenêtre, gardé pour `tests/refus-enregistres.test.mjs`

## fixtures/
- tokens/ : `tokens.json` d'origine, antérieur à la version 1 du format de tokens
