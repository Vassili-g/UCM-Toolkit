# Guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG.
L'analyse et la publication ne modifient jamais le document Figma. Un seul
geste y écrit : la création des règles d'usage, qui pose une instance de
`.componentRules` à côté du composant, ou remplit une instance vierge.
Supprimer cette instance défait la création.

Ce document dit **ce que le projet garantit** : où se trouve chaque chose, et
quelles règles le code tient. [CONTRIBUTING.md](./CONTRIBUTING.md) dit **comment
travailler** : écrire du code, un message, un test, un document, et vérifier
avant de proposer un changement. Une règle du produit s'écrit ici ; une règle de
travail s'écrit là-bas.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [docs/format/FORMAT.md](./docs/format/FORMAT.md) si la tâche touche à la forme de ce qui
   est publié, [packages/plugin-exporter/SPEC.md](./packages/plugin-exporter/SPEC.md) si elle
   touche à la façon dont le plugin lit Figma. Ce que les versions précédentes
   publiaient est dans [docs/format/CHANGELOG-FORMAT.md](./docs/format/CHANGELOG-FORMAT.md),
   à ouvrir dès qu'une tâche touche à la compatibilité ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `packages/kit/src/format/types.ts` et les tests voisins pour la forme concrète.

Les [invariants](#invariants) sont groupés par domaine : portée du contrat,
tokens, couleurs, composition, arbre des slots, layout, grilles, diagnostics,
échantillon de maquette, versionnage, écriture dans le document. Lire le groupe
que la tâche touche, pas la section entière.

**Avant d'écrire une phrase, dans un document ou dans un commentaire, charger la
skill [`rediger-sans-tics-ia`](./.agents/skills/rediger-sans-tics-ia/SKILL.md).**
Un commentaire ne se justifie que par un fait absent du code : une décision, une
précondition, une conséquence, une limite. Six contrôles refusent le reste, et
[CONTRIBUTING.md](./CONTRIBUTING.md#rédiger-un-document) les énumère.

Pour créer ou modifier un message destiné au designer, charger aussi la skill
[`rediger-diagnostics-ucm`](./.agents/skills/rediger-diagnostics-ucm/SKILL.md).

Pour reconstruire à froid un composant depuis son contrat, ce qui est le geste
de la recette dans le repository consommateur, charger la skill
[`consommer-contrat`](./.agents/skills/consommer-contrat/SKILL.md). Elle est
rangée ici parce que c'est un savoir du format : le repository de recette, lui, ne doit
rien apprendre du produit.

Pour toucher à l'interface du plugin, lire d'abord
[CONTRIBUTING.md](./CONTRIBUTING.md#interface-du-plugin) : la hiérarchie de
l'information et le protocole de relecture y font autorité, et la galerie des
états rend chaque écran atteignable hors de Figma.

[ROADMAP.md](./ROADMAP.md) porte la maturité et les priorités,
[PISTES-EVOLUTION.md](./docs/notes/Recherches/Evolutions%20globales/PISTES-EVOLUTION.md) les idées non décidées.

## Carte du code

```text
packages/plugin-exporter/         le moteur : extraction Figma, dépend du kit
  src/
    code.ts                    routage UI → commandes
    contract/
      exportComponent.ts       orchestration et métadonnées
      componentTree.ts         axes, matrice et wrapper de layout
      compactVariants.ts       catalogue par partie de vue, et liaisons exactes
      elideNeutrals.ts         ce que le contrat n’écrit pas : null, {} et []
      serializeJson.ts         une entrée par ligne, sur deux niveaux
      layoutNodes.ts           élection du node de layout, une fois par variant
      exportableNodes.ts       parcours de l'arbre, hors dépendances composées
      porteeDAnalyse.ts        ce qu'une analyse garde le temps d'un export : un maître par instance
      mesure.ts                la trace de chaque analyse : durées, compteurs, avancement de la barre
      parsers.ts               propriétés Figma → API publique
      merge*.ts                doc et icônes des règles, rangées sur leur axe
      rulesModel.ts            modèle pur des règles d’usage
      semantics.ts             vocabulaire sémantique partagé
      colorKeys.ts             clé d'une couleur dans la feuille d'un variant
      structureTree.ts         qui est un conteneur, qui est une feuille
      textRendering.ts         les propriétés de texte sans variable, en CSS
      unsupportedProperties.ts ce qu'un calque publié porte et que le schéma ignore
      localisation.ts          le Constat : où, quoi, impact et action, séparés
      extract*.ts              structure, layout, tailles, tokens et règles
      flexLayout.ts            propriétés de flux et avertissements non portables
      extractSamples.ts        ce que la maquette montre, sans rien exiger
      slotNames.ts             nommage des slots et calques d'icônes
      slotRelations.ts         composition et visibilité dans un slot
      composedComponents.ts    dépendances entre composants
      nodeBindings.ts          groupes complets de liaisons Figma
      propertyBindings.ts      component properties situées dans chaque variant
      propertySurface.ts       surface publique élue : owner direct et wrapper
    template/modele.ts         du contrat au modèle des règles à poser, sans Figma
    template/sources.ts        ce que le document offre, et les maîtres à copier
    template/ecriture.ts       le seul fichier qui écrive dans le document
    tokens/exportTokens.ts     export DTCG
    tokens/familles.ts         le type d'une famille STRING, décidé sur une composante d'alias
    tokens/graisses.ts         le type d'une graisse STRING, décidé sur tout le graphe d'alias
    tokens/mouvement.ts        une TIMING en durée, une EASING en courbe, et les easings sans courbe
    variables.ts               index commun, collisions et alias
    base64.ts                  encodage UTF-8/Base64 sans dépendance au sandbox
    config.ts                  la configuration locale : dépôts, dépôt actif, clé de destination, reprise des anciennes clés
    fenetre.ts                 les bornes et la clé de la fenêtre ; le socle la lit et la range
    connexion.ts               ce que vaut la connexion au dépôt, et le geste qu'elle demande
    prevol.ts                  ce que l'analyse conclut avant d'écrire, et l'action qu'elle propose
    cible.ts                   ce sur quoi l'export porte, et pourquoi il ne porte pas
    depot.ts                   où écrire, immobilité, collision et corps de la demande
    forges/forge.ts            le port qu'une forge implémente
    forges/termes.ts           les mots et les limites de chaque forge
    forges/index.ts            l'adaptateur que la configuration désigne
    forges/github.ts           branche, fichier et pull request par l'API GitHub
    forges/gitlab.ts           commit atomique et merge request par l'API GitLab
    messages.ts                les DEUX sens de la frontière sandbox ↔ UI
    ui/                        interface du plugin
  galerie/                   les états de l'UI, atteignables hors de Figma
  tests/
  README.md                  ouvrir le plugin, ses deux commandes, ses limites
  SPEC.md                    le moteur : ce que le plugin lit, élit et signale
  manifest.json              chargé dans Figma depuis packages/plugin-exporter/dist/

packages/kit/            le format et ses lecteurs : @ucm-kit/core, publié
  src/format/              sous-chemin SANS dépendance Node ni Figma
    types.ts                 schéma TypeScript du contrat
    version.ts               CONTRACT_VERSION, seul endroit où elle est écrite
    tokens.ts                la forme de tokens.json, TOKENS_FORMAT_VERSION et la lecture de sa marque
    names.ts                 normalizeName, codeIdentifier, tokenCssVariable
    references.ts            la forme d'une référence de token, et son enveloppe
    configuration.ts         la grammaire de ucm.config.json, pour la CI et le plugin
    identite.ts              « ces deux contrats sont-ils le même composant ? »
    typography.ts            les graisses et styles DTCG qu'un text style emploie
    index.ts                 ce que le sous-chemin publie
  src/emplois/             sous-chemin SANS dépendance : le vocabulaire qu'UCM Palettes et `ucm check` partagent
    emplois.ts               la table fixe des emplois et les crans que la recette doit porter, 400 et 950 compris
    paires.ts                les dix-neuf paires, leurs dix associations et les emplois d'un cran
    rangs.ts                 les quatre rangs d'état et la table de l'état d'un composant vers son rang
    usages.ts                la collection `usage` : noms, cibles, ce que chaque usage peint et ses portées Figma
    contraste.ts             le contraste WCAG 2 et sa comparaison au seuil à dix décimales
    index.ts                 ce que le sous-chemin publie
  src/lecteurs/            ce qui juge un contrat écrit ; `ajv` et `node:fs`
    validation-contrat.mjs       la forme d'un contrat, champ par champ
    validation-graphe-contrats.mjs  composition, doublons et collisions d'identifiant
    validation-echantillons.mjs  les adresses que les échantillons visent
    variant-views.mjs            la vue exacte d'un variant
    version-contrat.mjs          la plage lue, et le SENS d'un écart de version
    references-token.mjs         la forme d'une référence, et son relevé
    tokens-dtcg.mjs              ce que le fichier de tokens contient, donc ce qui existe
    modes-tokens.mjs             les axes de modes du fichier de tokens, sans CSS
    caracteristiques.mjs         ce qu'un contrat porte, qui décide des aides à imprimer
    typography-token-types.mjs   les types DTCG qu'un style typographique exige
    schema-contrat.mjs           le schéma publié, chargé pour Ajv
    configuration.mjs            OUVRIR ucm.config.json ; sa grammaire est dans format/
    implementation.mjs           OÙ se trouve une implémentation, et SI elle est là
    trouver-contrats.mjs         retrouver les contrats d'un dossier
    controle-repository.mjs      le contrôle complet et le rapport du designer
    verdict-bilan.mjs            ce qui refuse une fusion, et le titre de ce refus
    perimetre-rapport.mjs        ce que la demande de fusion touche, et si elle concerne UCM
    avertissements-export.mjs    ce que l'export n'a pas su décrire
    diagnostic-tokens.mjs        les références que la source de tokens ne porte pas
    diagnostic-emplois.mjs       les couleurs d'un contrat contre la table des emplois : support, paire, état, hors de la table
    diagnostic-parite.mjs        l'écart contrat ↔ code : le juger et le dire
    diagnostic-tests.mjs         ce qu'une suite de tests rouge dit au designer
    diagnostic-markdown.mjs      le rendu markdown d'un diagnostic
    index.mjs                    la porte publique `@ucm-kit/core/lecteurs`
    index.d.mts                  ce que cette porte promet à un consommateur TS
    navigateur.mjs               la porte `@ucm-kit/core/lecteurs/navigateur` : les lecteurs sans Node ni Ajv, pour un plugin ou une page
    navigateur.d.mts             ce que cette porte promet à un consommateur TS
  scripts/build-schema.ts  génère le schéma depuis types.ts
  scripts/generer-refus.mjs  les refus de version, rendus pour la relecture
  schema/                  le schéma commité, publié en `@ucm-kit/core/schema`
  fixtures/contrats/       jeux figés que le moteur ne sait plus fabriquer : 12.0 (N-1), 11.0
  fixtures/tokens/         le tokens.json d'origine, antérieur à la version 1 du format de tokens
  tests/                   `.test.ts` pour le format, `.test.mjs` pour les lecteurs

packages/cli/            la ligne de commande : @ucm-kit/cli, publiée
  src/ucm.mjs              l'aiguillage et les codes de sortie
  src/init.mjs             installe ce qui manque, sans jamais écraser
  src/check.mjs            lance le contrôle du kit, imprime, écrit le rapport
  src/adaptateur.mjs       découvre l'adaptateur de stack installé dans le repo
  src/icons.mjs            les icônes que les contrats du repo réclament
  src/rapport-gitlab.mjs   la note du rapport sur une merge request GitLab
  src/tokens-css.mjs       la feuille CSS des tokens et de leurs modes, depuis tokens.json
  src/aides.mjs            ucm aides : le catalogue, une aide, la copie dans les conventions
  src/guide.mjs            ucm guide : procédure, diagnostics, API des dépendances, aides et modes
  src/conventions.mjs      .ucm/conventions.md : le fichier le plus proche, ses sections, ses anomalies
  aides/                   une aide par caractéristique : sens, écriture par défaut, preuve
  procedure.md             ce qui décide de quoi quand un agent implémente un contrat
  tests/                   dont recette.test.mjs, sur des repositories temporaires
  tests/cascade/           la feuille des tokens rendue dans trois moteurs, par npm run cascade

packages/adapter-typescript/  l'adaptateur opt-in : parité TS/TSX et types générés
  src/parite.mjs              lit les props et la composition avec TypeScript
  src/generation.mjs          dérive les unions depuis les contrats
  src/types-variants.mjs      la forme des unions produites
  src/cli.mjs                 commande `ucm-typescript`
  src/index.mjs               ce que `ucm check` charge quand il le découvre
  src/index.d.mts             ce que cette porte promet à un consommateur TS

packages/couleur/        le moteur de couleur d'UCM Palettes : ucm-couleur, privé, lu en source
  src/conversions.ts       hexa, sRGB, linéaire, Oklab, OKLCH et Display P3
  src/plafond.ts           la plus grande chroma que sRGB porte, mémorisée
  src/rampe.ts             un cran, le poids d'une nuance, la teinte pivotée, le Color shift, le facteur des fonds du thème Dark, les rampes des deux profils
  src/tailwind.ts          le préréglage Tailwind et son relevé
  src/contraste.ts         niveaux WCAG, ΔEok, part de chroma, écriture à virgule ; le contraste vient du kit
  src/recette.ts           la forme de la recette, sa validation, son classement à la lecture, sans conversion d'un format antérieur
  src/protocole.ts         l'espace et la clé partagés de la recette, qu'UCM Palettes écrit et que l'explorateur lit
  src/empreinte.ts         JSON canonique, encodeur UTF-8 et FNV-1a
  src/palette.ts           une palette lue contre sa recette : ses intensités, ses parts, le gris pur et la palette grise, le départ et le pivot de ses réglages, l'ancrage de sa référence, ses rampes ancrées, les clartés de leurs crans et les bornes des fonds du thème Dark
  src/reglages.ts          la référence réglée, tirée du départ par la teinte et la clarté du porteur
  src/nuances.ts           les deux préréglages de nuances, 11 et 13, la luminosité d'un numéro absent de la liste, la liste d'une palette libre
  src/ajustement.ts        la proposition d'un ajustement de la référence, par pas de luminosité
  src/promesses.ts         les dix-neuf paires du kit, jugées par mode et par intensité présente
  src/alertes.ts           les alertes de conception et la notice
  src/garantie.ts          la garantie des courbes : crans 600 et 700 contre le cran 50 gris, sur 360 teintes
  src/limites.ts           la limite dynamique d'un réglage et la cause de chaque borne, balayée un pas à la fois
  src/constats.ts          les sévérités et leur ordre d'affichage
  src/index.ts             la porte du paquet, qui republie `@ucm-kit/core/emplois`
  scripts/mesurer-temps.mjs  la médiane de cent palettes, hors des tests
  scripts/mesurer-garantie.mjs  la médiane de vingt garanties des courbes, hors des tests
  scripts/mesurer-ancrage.mjs   l'effet de l'ancrage sur les voisines et les promesses, hors des tests
  scripts/mesurer-limites.mjs   les limites du Color shift sur six références, et leur durée, hors des tests
  tests/                   vecteurs figés, propriétés, et la loi de pureté

packages/plugin-socle/   ce que les plugins partagent : ucm-plugin-socle, privé, lu en source
  build/inline-ui.cjs      du bundle et des feuilles de style à un HTML autonome
  build/manifest.cjs       le manifest de distribution
  build/run-tests.cjs      le découvreur de tests, que chaque plugin appelle
  src/fenetre.ts           la taille bornée de la fenêtre, rangée dans clientStorage
  src/cheminsDeTokens.ts   le chemin publié d'un token, collection puis variable : UCM Exporter l'écrit, l'explorateur le recalcule
  src/ui/socle.css         échelle de texte, trame, rôles de couleur et replis sombres, avant la feuille de chaque plugin
  src/ui/                  bouton, onglets, interrupteur, poignée de redimensionnement, engrenage et bascule de l'en-tête
  galerie/                 le banc de galerie, sa capture et le décalque du thème Figma
  lois/                    les lois des styles, du gabarit, du manifest et de la galerie, que le test de chaque plugin appelle
  tests/                   le build, le manifest, la fenêtre, le banc et la loi des styles, pour un plugin quelconque

packages/plugin-palettes/  le plugin UCM Palettes : ucm-palettes-plugin, privé
  src/code.ts              routage des demandes de l'interface, une porte par geste d'écriture
  src/fileDuDocument.ts    file commune des lectures et mutations du document ; un refus libère le geste suivant
  src/messages.ts          les deux sens de la frontière sandbox ↔ interface
  src/lecture.ts           la recette rangée, classée, son empreinte, le profil du document, les cadres retrouvés où qu'ils soient, et les pages du fichier
  src/analyse.ts           une palette pour l'onglet : rampes, promesses, alertes et notices triées
  src/edition.ts           ce qu'une saisie fait à une palette, avant tout rangement, ajustement de la référence compris ; la palette du plugin qu'une palette du fichier devient, recalculée ou figée
  src/ajustementDeLaReference.ts  le panneau d'ajustement sans DOM : pas, proposition, nuance visée, annonce d'un pas, garanties avant et après
  src/configuration.ts     les champs de la configuration, fonds et seuils compris, les palettes que chacun touche, et « Rétablir » par carte
  src/importation.ts       un fichier importé, classé comme la recette rangée, son écart avec elle, champ par champ, et la nature de cet écart
  src/rapport.ts           le rapport de vérification : crans, promesses, alertes, empreinte et écarts du dernier dessin
  src/presentation.ts      les promesses manquées groupées, la place de chaque alerte, le réglage que chaque message ouvre, les accolades de l'aperçu, le verdict d'une palette, l'état d'une fiche de Gestion
  src/planche/modele.ts    le modèle pur d'un cadre de planche : par thème, rampes, usages de chaque intensité et leurs garanties avec leur niveau WCAG, grilles, selon les parties choisies ; styles nommés, empreinte
  src/planche/fraicheur.ts chaque cadre à jour, périmé, jamais dessiné, introuvable ou illisible, les cadres orphelins et copiés, et l'effet d'un import
  src/planche/peints.ts    les couleurs relues sur la planche, comparées à celles de l'aperçu
  src/ecriture/recette.ts  le rangement de la recette : validation, empreinte lue, commitUndo
  src/ecriture/planche.ts  le dessin de la planche : page, cadres possédés remplacés à leur place, polices, calques étrangers, un commitUndo par dessin ; le retrait du cadre d'une palette supprimée ; le choix de la page des planches, qui y déplace les cadres possédés
  src/lectureDesVariables.ts  les collections locales, les variables de couleur, le suivi rangé et les collections des bibliothèques activées ; avec l'écriture, le seul appel à `figma.variables` et à `figma.teamLibrary`
  src/variables/           le modèle pur des variables, sans Figma ni DOM
  src/variables/destination.ts  où les palettes s'écrivent : collection, groupe, thèmes ; son défaut et sa validation
  src/variables/noms.ts    le segment d'une palette dans le chemin de ses variables, et la collision de deux palettes
  src/variables/plan.ts    ce qu'une palette écrit : clé stable, nom de variable, mode et couleur de chaque entrée
  src/variables/suivi.ts   le suivi rangé sous `ucm_palettes/variables` : destination, variables de chaque palette, lecture tolérante et versionnée
  src/variables/releve.ts  ce que la lecture rend : collections, variables de couleur, et une couleur de Figma arrondie à l'octet
  src/variables/etat.ts    l'état des tokens d'une palette, sur trois lectures, avec les couleurs concernées
  src/variables/detection.ts  les palettes que le fichier porte déjà dans ses variables
  src/variables/reprise.ts la reprise d'une palette du fichier : le mode que chaque thème vise, la liaison du suivi, la palette du fichier qu'une liaison désigne, et l'origine sous laquelle ses autres variables se créent
  src/variables/bibliotheques.ts  les collections de bibliothèque et les palettes que leurs noms de variables dessinent, sans leurs couleurs
  src/variables/gestion.ts ce que Gestion montre des tokens : ce qu'une écriture créerait et remplacerait, la simulation d'une destination, les variables d'une palette supprimée
  src/ecriture/variables.ts  l'écriture des palettes dans les variables : collection, modes, nom déjà pris, création sans portée, valeurs, suivi, un commitUndo ; le rangement de la destination ; le retrait des variables d'une palette supprimée ; la reprise d'une palette du fichier ; la copie d'une palette de bibliothèque
  src/navigation.ts        « Afficher dans Figma » : ouvre la page du cadre et le cadre, sans toucher au document
  src/fenetre.ts           les bornes et la clé de la fenêtre ; le socle la lit et la range
  src/i18n/                le registre des langues, les catalogues anglais et français, le traducteur, le séparateur décimal
  src/preferences.ts       la langue de l'interface et la vue de Gestion, lues et rangées dans clientStorage, rangements ordonnés
  src/planche/textes.ts    les textes des planches : le catalogue français, quelle que soit la langue de l'interface
  src/ui/                  l'en-tête du socle, les onglets Création, Vérification et Gestion, la configuration
  src/ui/paletteOuverte.ts la recette affichée, la palette ouverte, le thème montré, son analyse, l'état du geste et le verdict de chaque palette, sans DOM ; ses abonnés prévenus à chaque rendu complet, et ceux du thème à chaque changement
  src/ui/barreDePalette.ts la barre de la palette ouverte, en un exemplaire que l'onglet actif place dans son panneau et qui reste en haut pendant le défilement : sélecteur, « Nouvelle palette », menu, bascule Light/Dark du thème montré, confirmation de suppression
  src/ui/ongletCreation.ts l'onglet Création : la barre, le titre « Palette [nom] », l'encart d'une palette reprise du fichier, les cartes, puis le pied qui compte les messages ; l'état du geste en cours
  src/ui/ongletVerification.ts l'onglet Vérification : la barre, le verdict de la palette ouverte, ses messages, la carte des garanties fixe, le pied vers Gestion ou Création
  src/ui/ligneFixe.ts      un message sur une ligne de 24 px, présente même vide, et sa bulle au clic
  src/ui/piedDeLaPalette.ts le pied de l'onglet Création : bilan des garanties et des alertes, « Vérifier », annonce en fin de geste
  src/ui/champs.ts         le libellé au-dessus de ses saisies, le choix du modèle, les deux cartes des intensités de la création, les segments des intensités de la configuration et le choix du profil porteur
  src/ui/carte.ts          une carte de la configuration, fixe ou repliable : glyphe, titre, sous-titre et résumé
  src/ui/glyphes.ts        le glyphe de chaque carte titrée, en formes à rôle de couleur, que la maquette du Color shift dessine aussi
  src/ui/calculDesLimites.ts les limites dynamiques calculées par tranches entre les images, terminées au début d'un geste
  src/ui/localisation.ts   le contexte de langue d'une interface : textes liés aux éléments, retraduits à la bascule
  src/ui/socleLocalise.ts  les composants du socle, libellés liés au contexte de langue
  src/ui/couleur/          le sélecteur de couleur embarqué, ses formats Hex, RGB et HSL, les pastilles qu'il propose, une couleur par image pendant un glisser suivi sur le document
  src/ui/nuancier.ts       l'aperçu peint du fond du thème montré, sans bascule : pastille on-solid, pastilles en grille, accolades des rôles, choix et relâche d'une nuance, détail d'une nuance
  src/ui/badge.ts          le badge d'un niveau WCAG, AAA, AA ou AA ✗, et ce qu'il juge pour l'assistance technique
  src/ui/garanties.ts      la carte des garanties, fixe, dans Vérification : thème montré nommé dans l'en-tête et liens vers l'autre thème, choix Soft/Vivid « Afficher » pour deux intensités, réglette et arcs, un encadré par minimum, les états en colonnes, une ligne par association
  src/ui/specimens.ts      le spécimen d'un rôle : bouton, texte, champ, anneau, trait ou aplat
  src/ui/selecteur.ts      la palette ouverte, en liste déroulante avec la pastille de chaque référence et le verdict de chaque palette
  src/ui/creation.ts       une palette neuve, en carte : nom, référence, modèle, intensités
  src/ui/menuPalette.ts    dupliquer, monter, descendre, supprimer
  src/ui/frontiere.ts      la numérotation des demandes, un seul rangement en vol, l'écriture des variables et le dessin après lui, un seul choix de page et un seul rangement de destination en vol
  src/ui/ongletGestion.ts  l'onglet Gestion : les sections repliables, la liste dépliable des palettes ; une ligne par palette, et dépliée « Modifier » et sa fiche : rampes, référence, garanties, lignes de sortie, encart d'écriture et encart des couleurs changées dans Figma ; « Déjà dans le fichier » et « Dans les bibliothèques » dans la même liste ; une carte par palette supprimée ; notices, recette repliée
  src/ui/connexion.ts      la section « Connexion à Figma » : destination des tokens et page des planches en résumé ; dépliée, leurs gestes « Changer », l’heure du dernier état lu et « Synchroniser »
  src/ui/destination.ts    la carte « Destination des tokens » : collection en liste à choix unique, groupe, thèmes, simulation du panneau des variables, et le refus du sandbox
  src/ui/pageDesPlanches.ts la carte « Page des planches » : une page du fichier ou une page neuve, en liste à choix unique, et le refus du sandbox
  src/ui/sorties.ts        les lignes de sortie d'une fiche : nom, pastille d'état, détail, gestes
  src/ui/dessin.ts         le suivi d'un dessin : progression, résultat, confirmation des calques étrangers, écarts de peinture
  src/ui/configuration.ts  les Réglages communs en cartes : aperçu de la palette ouverte, fonds, intensités et fonds du thème Dark, courbes ; seuils et contenu des planches repliés
  src/ui/traceDesCourbes.ts le tracé des deux courbes au-dessus de leur table, et le ◆ de la référence insérée
  src/ui/largeur.ts        la largeur affichée d'un graphe, suivie une fois par image : Color shift, réglette des garanties et tracé s'étirent sans grandir
  src/ui/apercuCompact.ts  les rampes présentes d'une palette et le résultat de ses garanties, pour une fiche ou les réglages
  src/ui/reglagesDeLaPalette.ts la carte « Réglage global » : profil visé, trois réglettes bornées par leur limite, et en lignes fixes l'avertissement de la référence, la butée, la note d'une palette grise et la première alerte
  src/ui/messagesDePalette.ts les messages de la palette ouverte : ceux de la liste, ceux des intensités, et la liste entière de Vérification
  src/ui/ajustement.ts     la modale « Ajuster la référence » : pourquoi ajuster, originale et proposition, pas, code, tableau avant et après, Appliquer
  src/ui/interfaceDeTest.ts la dernière carte de l'onglet : l'écran de réglages E2 peint de la palette ouverte, par emploi et par état, avec Soft et Vivid côte à côte pour « Les deux »
  src/ui/choixDuProfil.ts  le choix du profil commun aux cartes : libellé « Régler » ou « Afficher », segments Soft, Vivid et Les deux dans cet ordre, ◆ sur le profil porteur
  src/ui/gestesDeLaRecette.ts exporter la recette ou le rapport, importer avec l'écart, repartir de la recette par défaut
  src/ui/telechargement.ts le fichier proposé au designer, par un lien vers un blob
  src/ui/derive/           la carte « Color shift » : choix du profil à régler, onglets de grandeur, géométrie pure, graphe SVG et ses rails, glisser, clavier, préréglage de la teinte, lien, annulation et butée
  src/ui/derive/reglette.ts la réglette bornée, commune au Color shift et au réglage global : piste peinte, zones hachurées, pouce arrêté sur la borne
  src/ui/textes.ts         tous les textes destinés au designer, provisoires jusqu'au point M2
  galerie/                 les états de l'interface, à la taille par défaut et à la taille minimale
  tests/                   dont la loi d'écriture, et interface/ pour Chromium
  scripts/mesurer-glisser.mjs  le coût d'un mouvement de poignée, hors des tests
  scripts/capturer-etats.mjs   des états de la galerie en thème sombre, aux deux tailles, hors des tests
  scripts/mesurer-glisser-couleur.mjs  le coût d'un glisser dans le sélecteur de couleur et ses rendus par image, hors des tests
  manifest.json            identifiant attribué par Figma (point M1)

packages/plugin-explorateur/  le plugin UCM Token Explorer : ucm-explorateur-plugin, privé, en lecture seule
  src/code.ts              routage des demandes de l'interface ; aucune route n'écrit dans le document
  src/messages.ts          les deux sens de la frontière sandbox ↔ interface, numérotés par demande
  src/lecture.ts           collections et variables locales, cibles d'alias lues par identifiant, huit à la fois, importées par leur clé quand Figma ne les rend pas
  src/modele.ts            le relevé sérialisable : collections, modes, extensions, valeurs typées, lectures manquées
  src/groupes.ts           l'arbre des groupes, des seuls segments `/` des noms Figma
  src/indexation.ts        l'index d'identité, les familles de collections et les références inverses par mode
  src/resolution.ts        la chaîne explicative dans un contexte de modes, et sa mémoire
  src/comparaison.ts       deux contextes : première cible différente, mode différent, valeurs égales ou non
  src/diagnostics.ts       les chaînes qui n'aboutissent pas, regroupées par cause
  src/copie.ts             les formats de copie et leur précision
  src/contraste.ts         le contraste d'une paire choisie, par le calcul du kit
  src/consommateurs.ts     les liaisons d'un calque et d'un style, et les modes effectifs d'un calque
  src/composant.ts         le modèle pur de la vue composant : natures, lignes, sections, résumés, portée, préfixe
  src/lectureDuComposant.ts  le sujet d'une sélection, ses calques, ses frontières, ses liaisons, ses styles de texte
  src/apercu.ts            l'image du sujet, exportée en mémoire, et la boîte de chaque calque
  src/fenetre.ts           les deux dispositions de la fenêtre, une par mode, leurs bornes et leurs clés
  src/rapport.ts           le rapport versionné des diagnostics
  src/releves.ts           le relevé exporté, réimporté et comparé à un autre
  src/simulation.ts        une substitution dans une copie en mémoire
  src/preferences.ts       vue compacte, intégrations, associations et largeurs réglées, dans clientStorage
  src/integrations/        contrats et tokens importés, recette UCM Palettes, profil d'architecture UCM
  src/ui/                  la barre et sa bascule de mode, l'arbre et sa recherche, la table, l'inspecteur, la bulle de chaîne, la poignée des largeurs et les vues des onglets
  src/ui/vues/composant.ts la vue composant : fil d'Ariane, en-tête, aperçu, frontières, sections, pied
  src/ui/roles.css         les couleurs sombres, placées avant la feuille du socle
  galerie/                 les états de l'interface, à 1200 × 800, à 560 × 480 et à 364 × 724, et la comparaison à la maquette de la vue composant
  tests/                   dont la loi de lecture seule, les doubles de Figma, et interface/ pour Chromium
  scripts/mesurer.mjs      la mesure sur 10 000 variables, hors des tests
  SPEC.md                  ce que le plugin lit, résout et refuse de conclure

docs/                    la documentation classée par sujet
  README.md              le sommaire par profil de lecteur, et la table des autorités
  format/                la forme publiée, sa compatibilité et son historique
  guides/                le geste du designer et la recette externe
  notes/
    modes-et-aides/      le plan et les tâches des modes et des aides
    produit/             les pistes d'évolution et le coût de génération
    qualite/             les relevés de qualité éditoriale
    verification/        les plans et constats de vérification

.agents/skills/          les procédures qu'un agent charge à la demande
  consommer-contrat/       reconstruire un composant depuis son seul contrat
  rediger-diagnostics-ucm/ écrire un message que le designer peut suivre
  rediger-sans-tics-ia/    le standard d'écriture, documents et commentaires

scripts/
  controle-style.mjs     les règles de style, pour le test et pour le hook
  hook-style.mjs         le même contrôle, au moment où un agent écrit
  mesurer-prose.mjs      le volume de la prose, document et commentaire
  pins-servis.mjs        les versions que le registre sert
  run-tests.cjs          le découvreur de tests
.claude/settings.json    le hook d'écriture, branché sur Write et Edit
.github/workflows/       ci.yml, et publish.yml qui publie sans jeton

tests/                   les tests du monorepo lui-même
  docLinks.test.ts       les liens et les ancres de la documentation
  inventaireInvariants.test.ts  l'accord d'AGENTS.md avec le code, dans les deux sens
  styleDocumentaire.test.ts  les tics de rédaction, interdits sans exemption
  pinDocumente.test.mjs  les versions montrées par une commande copiable
  registrePortableDocuments.test.ts  aucun document portable ne promet une stack
  versionSuitLeContenu.test.mjs  un numéro publié annonce bien ce qu'il publie
  monorepoCoherent.test.mjs  chaque paquet lit le kit d'à côté, jamais le registre
  pluginsSepares.test.ts  aucun des trois plugins n'importe un autre
```

## Invariants

Chaque entrée donne la règle, sa borne, et l’autorité qui la porte dans le code.
La spécification en lien porte le raisonnement.

### Portée et forme du contrat

- Le contrat publié est portable : aucune donnée d’extraction Figma n’entre dans
  l’artefact. Toute limite de traduction produit un diagnostic et rend
  `meta.coverage.portable` partiel.
- Aucune logique liée au nom d’un composant.
- Figma reste traçable après normalisation (`figmaName`, `figmaLayer`).
- `variants` décrit chaque combinaison réellement présente, `COMPONENT` sans axe
  et matrice clairsemée comprises, et référence une vue de `variantViews`. Une
  vue est six renvois : `structure`, `typography`, `composes`, `icons`,
  `paintPlacements`, `effects`, chacun catalogué à part et partagé par égalité
  stricte de son bloc JSON, à l’ordre des clés près. Ni merge, ni héritage, ni
  défaut.
  `structure` est la projection du variant de référence, publiée elle aussi par
  renvoi, inconditionnellement. → [spec](./docs/format/FORMAT.md#sortie)
- Le contrat n’écrit aucune valeur neutre : une clé qui vaudrait `null`, `{}` ou
  `[]` est absente. Cette borne porte tout : un seul passage, jamais de point
  fixe. Une valeur qui est vide ne s’écrit pas ; une valeur qui contient du vide
  s’écrit sans lui et reste : sous un dictionnaire, la clé est une donnée, et
  `stateModel.states.default` vaut `{}`. Un `slotPath` d’effet vaut `[]` pour
  la racine, une adresse et non un vide. `elideNeutrals.ts` en est l’unique
  autorité, et chaque sous-arbre n’y passe qu’une fois.
- L’artefact s’écrit une entrée par ligne sur deux niveaux (`serializeJson.ts`),
  sans seuil : la forme du fichier ne dépend jamais du nombre de variants.
- Une propriété native garde son type (`INSTANCE_SWAP`, `SLOT`) et ses liaisons
  `visible`, `characters`, `mainComponent` : définition dans
  `propertyBindingDefinitions`, `nodeId` dans `variants[].bindings`, aucun
  rapprochement par nom de calque. → [spec](./docs/format/FORMAT.md#1-props)
- Un enum renommé porte la même clé dans `props`, `variantAxes` et les arbres de
  variantes. → [spec](./docs/format/FORMAT.md#1-props)
- Un axe possède sa clé publique : `parsers.ts` la lui réserve avant les autres
  propriétés, si bien que l'ordre des déclarations Figma ne décide de rien. Deux
  axes que la normalisation confond refusent l'export, aucun artefact ne sort et
  le designer en renomme un.
  → [spec](./packages/plugin-exporter/SPEC.md#1-props)
- La convention `State`/`States`/`Status` porte sur un axe, donc sur le seul
  type `VARIANT`. Une propriété d'un autre type qui porte ce nom reste une prop.
  `STATE_AXIS_NAMES` (`semantics.ts`) est l'unique liste de ces noms : les props
  et `stateModel` la lisent toutes deux.
  → [spec](./docs/format/FORMAT.md#1-props)
- Les axes d’API sont dans `props`, l’axe d’états dans `stateModel` ; une règle
  `@prop` suit cette répartition. N’est une faute de frappe que ce que le contrat
  ne publie nulle part.
  → [spec](./docs/format/FORMAT.md#7-intention-et-documentation-des-props)
- Une règle dont un calque lu contient `[À compléter]` n'est pas rédigée : elle
  n'entre pas dans le contrat et ne produit que son warning, une ligne par tag
  qui porte toutes les règles marquées de ce tag. Un conteneur dont
  `component-name` porte le marqueur ne documente aucun composant, et
  `rulesContainerOwner` ne le rattache à personne. `MARQUEUR_A_COMPLETER` et
  `porteLeMarqueur` (`extractRules.ts`) en sont l'unique autorité.
  → [spec](./docs/format/FORMAT.md#7-intention-et-documentation-des-props)

### Tokens et variables

- Les tokens restent des références ; leurs alias ne sont jamais aplatis.
- `normalizeName()` et `indexVariables()` sont communs aux deux commandes.
- Une collision feuille/groupe ou deux chemins identiques sont tranchés avant la
  construction de l’arbre ; aucun alias ne pointe vers une variable rejetée.
  → [spec](./docs/format/FORMAT.md#partie-2--export-tokens)
- Le contrat ne publie aucun index de ses tokens : `tokensUsed` se dérivait du
  contrat terminé, et ce qui se dérive ne se publie pas. Un consommateur qui en
  a besoin balaie les références du contrat, `samples` et `meta` exclus.
  → [spec](./docs/format/FORMAT.md#8-rendu-sémantique-et-garde-fous)
- Un nom de token se projette de trois façons, et chacune a un propriétaire, tous
  trois dans `packages/kit/src/format/names.ts` : `normalizeName` va du chemin
  Figma au token, `codeIdentifier` du nom Figma à l'identifiant de code, et
  `tokenCssVariable` du token à la propriété personnalisée CSS ;
  `attributDeMode` en dérive l'attribut HTML d'un axe de modes, et
  `axeDesExtensions` le nom de l'axe de ses collections étendues. Une projection
  recopiée ailleurs est une faute : elle diverge sans produire d'erreur. Le
  chemin d'un token s'assemble dans `joinTokenPath` seul
  (`packages/plugin-exporter/src/variables.ts`) : collection et variable passent par
  `normalizeName`, leurs segments perdent accolades et `$` de tête, puis la
  collection n'est écrite qu'une fois. Figma accepte ces caractères dans un nom
  de collection, et une référence DTCG ne sait pas les citer. Borne
  de `tokenCssVariable` : elle retire les accents, pour qu'un nom composé et le
  même nom décomposé donnent la même propriété ; elle ne coupe pas sur les
  bosses de casse, ce qui la
  distingue d'un `kebabCase` de bibliothèque, et elle n'est pas une bijection.
  → [spec](./docs/format/FORMAT.md#nommer-et-citer-un-token)
- `tokens.json` porte la version du format de tokens à la racine du document,
  et nulle part ailleurs : `$extensions["com.ucm.formatVersion"]`, un entier
  positif, écrit une fois et avant les groupes. `TOKENS_FORMAT_VERSION`
  (`packages/kit/src/format/tokens.ts`) est l'unique endroit où le numéro
  courant s'écrit. Une forme de valeur qui change monte ce numéro, jamais
  `CONTRACT_VERSION`, et laisse les chemins et les alias en place.
  → [spec](./docs/format/FORMAT.md#partie-2--export-tokens)
- `tokens.json` déclare ses axes de modes à la racine, après la marque :
  `$extensions["com.ucm.axes"]`, écrit dès qu'une feuille porte `com.ucm.modes`,
  et `{}` quand l'export les a tous écartés. La clé d'un axe vient de
  `prefixeDeCollection`, que `joinTokenPath` emploie aussi ; `modes` suit
  l'ordre de la collection, et `default` nomme le défaut sans le déduire de
  l'ordre. Une feuille d'un axe retenu le nomme dans `com.ucm.axis`, et le
  premier segment de son chemin ne le désigne pas. Un préfixe vide ou partagé,
  un mode sans nom ou en collision et un défaut introuvable écartent l'axe sous
  un constat ; un alias d'un autre type dans un mode ou dans une surcharge
  d'extension se constate sans l'écarter. Une collection à un seul mode que des
  collections étendues surchargent est aussi un axe.
  `axesDesCollections` (`tokens/exportTokens.ts`) décide pour l'export,
  `axesDeTokens` (`lecteurs/modes-tokens.mjs`) classe ce qu'un lecteur reçoit.
  → [spec](./docs/format/FORMAT.md#partie-2--export-tokens)
- Le kit classe la marque avant de lire un seul token : absente, `origine` ;
  la version courante, `courante` ; une version antérieure que
  `VERSIONS_DE_TOKENS_LUES` énumère, `ancienne` ; entier supérieur, `future` ;
  toute autre valeur, ou un document ou `$extensions` qui n'est pas un objet,
  `invalide`. `future` et `invalide` refusent le contrôle, y compris dans un
  repository sans contrat ; `ancienne` se lit comme `courante`. Seule la racine
  est lue. La fenêtre est énumérée et jamais déduite : une version inférieure
  n'est pas présumée lisible, une version future non plus.
  `etatDuFormatDeTokens()` en est l'unique autorité.
  → [compatibilité](./docs/format/COMPATIBILITE.md#la-version-du-format-de-tokens)
- Une couleur s'écrit `{ colorSpace, components, alpha }`. L'espace vient de
  `documentColorProfile`, lu une fois par export ; `LEGACY` donne `srgb` sous un
  seul avertissement. Les composantes gardent la précision de Figma et `alpha`
  est toujours écrit. Une dimension s'écrit `{ value, unit: "px" }`. Chaque
  valeur de `com.ucm.modes` a la forme de `$value`, et un alias reste une
  référence dans tous les modes.
- Le type d'une graisse `STRING` se décide une fois par variable, sur tous ses
  modes et son graphe d'alias, avant la sérialisation. Des littéraux que
  `poidsDeGraisse()` reconnaît sous un segment `fontweight` ou `font-weight`,
  et des alias qui aboutissent tous à `number`, donnent `number` ; une variable
  faite d'alias seuls suit ses cibles quel que soit son nom. Tout le reste, une
  cible absente et une boucle comprises, donne `string`. La table des graisses
  n'est jamais recopiée, et la décision ne dépend d'aucun ordre.
  `graissesNumeriques` (`tokens/graisses.ts`) en est l'unique autorité.
  → [spec](./packages/plugin-exporter/SPEC.md#partie-2--export-tokens)
- Le type d'une famille `STRING` se décide sur une composante connexe du graphe
  d'alias, tous modes confondus, et jamais sur la feuille courante ni sur son
  nom. Une composante devient `fontFamily` avec au moins une preuve positive,
  liaison `fontFamily` d'un text style local ou scope `FONT_FAMILY` seul, et
  aucun conflit ; une liaison par un autre champ de chaîne, un scope de texte
  posé à côté de `FONT_FAMILY` et un alias qui quitte l'index sont des conflits.
  Une composante sans preuve reste `string`. `graissesNumeriques` décide avant,
  et `famillesDeTokens` (`tokens/familles.ts`) ne voit pas ce qu'elle a retenu :
  les deux ensembles sont disjoints.
  → [spec](./packages/plugin-exporter/SPEC.md#partie-2--export-tokens)
- Une variable `TIMING` devient une durée en secondes, sans conversion ni
  arrondi. Une variable `EASING` devient une courbe dès que l'API joint ses
  quatre points, quel que soit son `type`, s'ils sont finis et si les abscisses
  sont dans `[0, 1]` ; les ordonnées restent libres. `LINEAR` en a une par
  définition, un ressort jamais, même accompagné de points. Toute autre valeur écarte la
  variable entière du fichier sous un constat, et un alias vers elle suit la
  politique des cibles absentes. Aucune valeur de l'API Figma n'est recopiée :
  `dtcgType` et `formatValue` traitent les six membres de
  `VariableResolvedDataType` sans branche par défaut, et un septième produit
  une erreur de compilation. `easingsSansCourbe` (`tokens/mouvement.ts`) en est
  l'unique autorité.
  → [spec](./packages/plugin-exporter/SPEC.md#partie-2--export-tokens)

### Couleurs

- Aucune couleur n’est perdue par troncature. Le dernier segment est la base de
  la clé ; deux couleurs qui cohabitent dans une même feuille en le partageant
  l’allongent des segments qui les séparent (`userinput.background` /
  `divider.background`).
- `colorKeys.ts` en est l’unique autorité et décide sur toute la matrice : la clé
  d’un token est la même dans toutes les feuilles. Borne du coût : sélection
  exacte jusqu’à seize profondeurs candidates, gloutonne et déterministe au-delà.
  → [spec](./docs/format/FORMAT.md#2-tokens-de-variantes)
- Le site tranche la nature de ce qu’une couleur peint, le nom précise à
  l’intérieur de cette nature. Un dernier segment qui nomme un rôle partagé
  l’emporte seulement s’il est de la nature du calque, ce qui distingue un
  `ring` d’un `border`, et il ne tranche rien de plus. Un `…/foreground` posé
  en contour peint un contour, sans un mot. Le nom se lit sur le dernier segment
  du token, jamais sur la clé publiée.
- Une clé de couleur ne porte pas un rôle. `rendering.roles` est le vocabulaire
  partagé, identique dans tous les contrats ; `rendering.keyRoles` porte le rôle
  de chaque clé observée qui n’en porte pas le nom, en deux tables que `colorKeys`
  sépare comme il sépare ses feuilles (`fills`, `strokes`). Résolution :
  `roles[keyRoles[côté][clé] ?? clé]`, et `packages/plugin-exporter/tests/lois.ts` vérifie sur chaque
  contrat que la réponse existe et qu’elle est de la bonne nature.
- Un rôle de contour ne cite jamais une propriété CSS qui consomme la boîte :
  `border` se rend en `box-shadow` et `ring` en `outline`, jamais l'un ni
  l'autre en bordure, et `align` donne la forme de l'ombre.
  `defaultRenderingSemantics()` en est l’unique autorité.
  → [spec](./docs/format/FORMAT.md#8-rendu-sémantique-et-garde-fous)
- Le contrat ne publie que les couleurs liées. `lirePeintures` est l’unique
  lecture : ce qui est retenu et ce dont on avertit en sortent ensemble, la liste
  du node servant de repli. Une peinture posée à la main sur un calque parcouru
  avertit et rend `meta.coverage.portable` partiel. Réserves muettes : paint
  masqué ou d’opacité nulle, stroke d’épaisseur zéro, peinture non `SOLID`.
- `variantViews.*.paintPlacements` situe fills et strokes par les chemins de
  l’arbre publié ; `[]` cible la racine, et les chemins sont collectés pendant
  l’unique extraction de `structure.children`. Le chemin est celui du calque
  publié qui porte la peinture : une couleur sous une feuille appartient à cette
  feuille, et deux tracés d’une même icône ne donnent qu’une cible. Les deux
  relevés ne parcourent pas le même arbre ; leur égalité n’est pas exigée.
  → [spec](./docs/format/FORMAT.md#2-tokens-de-variantes)

### Composition

- Un composant unifié imbriqué est déclaré dans `composes`. Le critère « ce node
  porte les règles de X » n’existe qu’une fois (`rulesContainerOwner`). Une
  dépendance est reconnue quand un conteneur posé sur la page de son maître écrit
  son nom (`indexContractedNames`) : une dépendance de bibliothèque ne l’est
  jamais, et un calque `component-name` masqué dans une instance ne compte pas.
  L’analyse ne charge que les pages de ces maîtres, et
  `loiDuDocumentIntact.test.ts` refuse `loadAllPagesAsync` dans
  `src/contract/`. Les règles documentent sans autoriser : tout `COMPONENT` ou
  `COMPONENT_SET` sélectionné est exportable, et le parent ne réexporte pas les
  internes d’une dépendance reconnue. Une seule chose en remonte, et elle n’est
  pas normative : ce que ce parent a changé par rapport au maître, soit les
  surcharges de `InstanceNode.overrides`, soit le remplacement d’une instance,
  que ce relevé ne rapporte pas et qui se lit en comparant l’instance à son
  maître, position par position. → [échantillon](#échantillon-de-maquette)
- Le parcours conserve le calque de l’instance pour le décrire comme un slot ;
  ce qu’il porte reste hors du contrat parent. Ses couleurs appartiennent à son
  contrat (`getSlotTokens`), ses dimensions ne le font pas élire node de layout
  (`findLayoutNode`).
- `composes` ne désigne que le calque qui est l’instance. Un calque qui
  l’enveloppe appartient au contrat parent : il publie son flux et range la
  dépendance dans `children`. Trois liens donnent trois enfants, et le cadre ne
  reprend une `visibilityProp` que lorsqu’une seule dépendance l’occupe.
  → [spec](./docs/format/FORMAT.md#cadre-de-dépendance)
- Ce cadre publie tous ses calques, pas seulement les branches de dépendance.
  `structureTree.publishesChildren` tranche l’unique exception : un cadre dont
  aucune branche ne mène à une dépendance ne publie rien. Chemins de typographie
  et signatures suivent cette réponse.
- Chaque `variantViews[variants[].view].composes` se dérive de son arbre publié,
  dans son ordre ; le `composes` global en est l’union ordonnée à cardinalité
  maximale. Une dépendance non située sort des deux champs à la fois, sous
  avertissement. → [spec](./docs/format/FORMAT.md#composition-et-dépendances)

### Arbre des slots

- `structure.children` descend dès qu’un descendant porte une information qu’une
  feuille ne sait pas exprimer (texte, icône, dépendance, liaison de variable),
  à n’importe quelle profondeur. Borne : un calque dont aucun descendant ne porte
  d’information reste une feuille. `structureTree.ts` en est l’unique autorité ;
  extraction, `textSlots` et signatures la consultent sans la recalculer.
  Profondeur bornée à 12 niveaux, coupure dite dès qu’elle emporte autre chose
  qu’un dessin. → [spec](./docs/format/FORMAT.md#6-structure)
- Un conteneur publie tous ses calques rendables, à quelque profondeur qu’ils
  soient, jamais une sélection. `variants[].tokens` relève les couleurs du
  variant entier.
- Une typographie appartient à un calque texte et vient de son text style.
  `textStyles` lie le style à ses variables (`tokens`) et publie en CSS ce
  qu’aucune variable ne porte (`literals`). La vue exacte situe son usage par un
  chemin de slots, et l’usage porte l’alignement du calque et sa troncature
  quand `maxLines` la borne. `textRendering.ts` fait ces traductions. Un calque
  dont `textCase`, `textDecoration`, `textWrapStyle` ou `leadingTrim` diffère de
  son style avertit, et le contrat publie la valeur du style ; du gras ou de
  l’italique ajouté par-dessus le style (`textStyleOverrides`) avertit de même.
  Borne : un calque sans text style ne publie aucun usage, donc ni alignement
  ni troncature.
  Un slot à plusieurs textes décrit ses parts dans `children` :
  les nodes représentés y portent leur visibilité, les cibles graphiques non
  représentées restent dans `visibilityTargets`.
  → [spec](./docs/format/FORMAT.md#5-typographie)
- `icons.*.slot` et `icons.*.size` disent où et à quelle taille placer chaque
  icône. `slotNames.ts` est l’unique autorité sur le nommage : un `icons.*.slot`
  publié désigne toujours un slot réel de `structure.children`.
- Deux enfants d’un même parent ne portent jamais le même slot : `slotNames.ts`
  numérote parmi les slots déjà réservés sous ce parent, et les lecteurs refusent
  un arbre qui les confond. Deux parents distincts les nomment librement de la
  même façon, une adresse étant un chemin.
  → [spec](./docs/format/FORMAT.md#6-structure)
- Un dessin qu’aucune règle `@icons` ne désigne avertit : le contrat n’exporte
  aucun tracé, et le développeur recevra la place et les couleurs du calque,
  jamais son dessin. Le déclencheur est le tracé (`nodeBindings.estUnTrace`, la
  même autorité que pour les dimensions), jamais l’absence de texte. Un seul
  message par dessin, sur le calque le plus profond qui le contienne encore en
  entier ; un composant qui est un dessin ne dit rien. Un dessin interne d’un
  composant imbriqué qui attend ses règles se tait aussi : son point bloquant
  dit la cause (`sousUnImbriqueSansRegles`, `src/contract/imbriques.ts`).
- Masquer et remplacer sont deux libertés distinctes : le booléen Figma dit si
  une icône s’affiche, la prop runtime dit laquelle rendre. Une icône toujours
  visible est modifiable comme une autre, sans booléen et sans signalement.
  → [spec](./docs/format/FORMAT.md#7-intention-et-documentation-des-props)
- Le contrat donne le carré d’une icône, jamais son dessin ni de quoi le
  trouver : il ne nomme aucun jeu d’icônes, ne porte aucune correspondance vers
  l’identifiant d’un tel jeu, et ne dit rien de la taille du glyphe à
  l’intérieur de ce carré. Ces trois décisions appartiennent au repository
  consommateur, et `ucm icons` est leur contrepartie : elle énumère ce
  qu’il y a à couvrir, jamais ce qui est couvert.
  → [spec](./docs/format/FORMAT.md#ce-que-le-contrat-ne-dit-pas-dune-icône)

### Layout, dimensions et bornes

- Le node de layout d’un variant s’élit au score, donc en fonction de la racine
  d’où part la recherche. `layoutNodes.ts` en est l’unique autorité. Aucune
  extraction ne choisit le calque qu’elle décrit : toutes reçoivent l’élection,
  `sizes` comprise. → [spec](./docs/format/FORMAT.md#3-layout)
- Ce que l’élection écarte, la vue exacte le publie. La projection de
  référence ne décrit que le node élu ; la vue exacte de chaque variant part de
  sa racine, et tout calque de `getAllNodes` y reçoit un chemin, en slot ou sous
  la feuille qui le contient. Aucun message ne dit donc perdu un calque que
  l’élection écarte. → [spec](./packages/plugin-exporter/SPEC.md#3-layout)
- Un auto-layout linéaire publie ses alignements (`justifyContent`,
  `alignItems`) ; ses slots ne publient que leurs exceptions (`alignSelf`,
  `flexGrow`). Une absence signifie hors flux ou non applicable, jamais
  `flex-start` deviné. → [spec](./docs/format/FORMAT.md#flux-et-alignement)
- Le menu de dimensionnement Figma fait autorité, axe par axe ; un axe ne décide
  jamais de l’autre. Pour un slot : `Fill` se publie, `Fixed` cite une variable
  dans `size`, l’absence vaut `Hug`, une dimension figée sans variable avertit.
  Pour le composant : `structure.sizing` est toujours publié, en vocabulaire CSS
  (`stretch`, `fit-content`) et par propriété (`width`, `height`).
- Sous un auto layout linéaire, un axe `Fixed` que Figma étire se lit `Fill` :
  `layoutAlign: STRETCH` sur l’axe secondaire, `layoutGrow: 1` sur l’axe
  principal. Figma rend ainsi un enfant masqué réglé `Fill`, et réclamer sa
  variable contredirait le `alignSelf: stretch` publié. `Hug` reste `Hug`. La
  racine, un enfant absolu et un enfant de grille lisent le menu seul.
  `menuDeDimensionnement` (`flexLayout.ts`) est l’unique lecture du menu d’un
  enfant. → [spec](./docs/format/FORMAT.md#flux-et-alignement)
- Ce qui sépare une taille de maquette d’une décision du design system est la
  liaison, jamais le fait d’être figé : sans variable une largeur fixe vaut
  `stretch`, avec variable elle publie son token. Un nombre brut n’est jamais
  contractuel, une variable liée l’est toujours, sauf là où Figma ne permet pas
  de lier. Ces exceptions sont énumérées : les pistes et cellules d’une
  grille, et la place d’un calque hors du flux. Toutes publient en pixels sous
  une notice, sans devenir des tokens et sans dégrader la couverture. Un
  composant sans auto layout fait exception à la taille de maquette : ses
  layers ne lui donnent aucune taille, et un axe figé sans variable y avertit
  tout en publiant `stretch` (`warnUntokenizedFreeSize`, `extractLayout.ts`).
  → [spec](./docs/format/FORMAT.md#dimensions-et-bornes)
- Un tracé n’est pas une boîte : sur un `VECTOR`, `BOOLEAN_OPERATION`, `STAR` ou
  `POLYGON`, la dimension est le dessin, et le contrat ne lui réclame aucune
  variable ; liée, elle se publie comme partout ailleurs. `RECTANGLE`, `ELLIPSE`
  et `LINE` en sont exclus : ce sont les formes que la règle « le type du node ne
  tranche pas » vise nommément.
- Un calque hors du flux est placé : `constraints` dit à quels bords il
  s’accroche, `inset` à quelle distance, en pixels et avec une seule
  signification par clé : les côtés publiés sont ceux de l’accroche, les deux
  d’un axe sous `stretch`, `center` et `scale`. Le calcul passe par le centre.
  Rien n’est publié quand la géométrie manque. Un enfant d’un cadre, d’un
  composant ou d’une instance sans auto layout est placé de la même façon ;
  un enfant de groupe ne l’est pas. `estPlaceParSesContraintes`
  (`flexLayout.ts`) en est l’unique autorité, et une contrainte ne dispense
  aucun axe figé de sa variable.
  → [spec](./docs/format/FORMAT.md#position-absolue)
- La `rotation` d’un calque publié est écrite, en convention CSS, absente sous
  le centième de degré. `flexLayout.rotationDegrees` en est l’unique autorité.
  Une notice dit le seul écart restant : dans un auto layout, Figma espace ses
  voisins d’après la boîte tournée, CSS d’après la boîte droite.
- `bounds` publie les bornes sur le composant et sur chaque slot, indépendamment
  du menu de dimensionnement, à la règle commune. Le geste demandé est de nommer
  la borne, jamais de la retirer. Un calque intermédiaire n’en est pas
  propriétaire et avertit. → [spec](./docs/format/FORMAT.md#dimensions-et-bornes)
- Une valeur uniforme n’est valide que si tout le groupe requis est lié. Les
  côtés d’un même champ peuvent citer des variables différentes : le contrat
  publie alors le détail (`padding.x`, `padding.y`, `radius`, largeur d’un
  stroke), et garde la forme courte quand ils la partagent. Un groupe par côté
  peut être partiel si les côtés absents valent zéro ; un côté fixe non neutre
  avertit. La taille d’un slot n’en est pas un et exige une variable unique.
  L’élection du node de layout ne compte que `hasCompleteBinding`.
- `wrap` est une propriété de flux et reste au niveau haut même sous `sizes`.
  `rowGap` est un token à la règle commune ; son absence sous `wrap` vaut `gap`.
  → [spec](./docs/format/FORMAT.md#passage-à-la-ligne)
- Une propriété Figma qu’aucun champ du schéma ne porte avertit au lieu de
  disparaître. `layout` reste publié parce que sa forme l’exige, et son repli
  `flex-row` se signale.
- Une propriété à effet visuel qu’aucun champ du schéma n’écrit avertit, mais
  seulement sur un calque publié et jamais pour une valeur au défaut de Figma.
  La première réserve écarte le masque d’une icône, dont ce relevé ne voit jamais
  les tracés ; la seconde écarte `clipsContent` et un `listSpacing` nul. Aucune
  réserve ne se lit sur l’usage supposé d’un calque : sur un calque publié,
  `isMask` avertit comme le reste. Une propriété que le contrat écrit n’y figure
  jamais, `rotation`, `opacity`, l’alignement et la casse d’un texte compris.
  `opacity` cite sa variable, et une dépendance ne la porte que si son instance
  diffère de son composant principal ; `resolveOpacity` (`nodeBindings.ts`) en
  est l’unique lecture. Pour le soulignement et `openTypeFeatures`, dont Figma
  ne documente pas les défauts, la valeur neutre est celle que CSS rend sans
  déclaration.
  → [spec](./docs/format/FORMAT.md#propriétés-non-portables)
  → [spec](./docs/format/FORMAT.md#opacité)
- Un effet se publie par son effect style, jamais par le calque : le catalogue
  `effectStyles` lit les liaisons sur `style.effects[i]`, et la vue exacte situe
  chaque usage par un chemin de slots, `[]` pour la racine. Seuls les calques
  publiés d’une vue exacte sont relevés ; une dépendance garde ses effets pour
  son contrat. Un effet sans style, un style introuvable ou dont le calque
  s’écarte, un champ sans variable et un effet que le contrat n’écrit pas
  avertissent. `effects` suit l’ordre de CSS, traduit de celui de Figma par
  `ordreCss` (`effectStyles.ts`), qui en est l’unique autorité.
  → [spec](./docs/format/FORMAT.md#effets)

### Grilles

- Sous une grille, la cellule fixe la boîte ; les pistes (`columnSizes`,
  `rowSizes`) et la place de chaque enfant (`columnStart`, `rowStart`, spans) la
  décrivent. Le menu de dimensionnement n’y fait plus autorité : un enfant ne
  publie sa dimension que s’il cite une variable, et son absence ne se réclame
  jamais. Borne : un alignement explicite le détache de sa cellule et la règle
  commune revient.
- Exception propre aux grilles : une piste `FIXED` publie sa valeur en pixels,
  sans devenir un token ni dégrader la couverture, et **sans un mot au
  designer** : rien ne manque, aucun geste n’existe, et l’exception est écrite
  dans la spécification. Un runtime qui n’expose pas les pistes ne publie rien et
  n’avertit de rien ; une piste illisible, elle, avertit.
- L’exception s’étend de la piste à la cellule, et là seulement : sous une piste
  `HUG`, `GridTrackSize.value` n’existe pas et la mesure ne porte que sur l’enfant,
  publiée en pixels dans `structuralSize`, elle aussi sans diagnostic. Trois
  bornes : une variable liée l’emporte et se publie dans `size`, qui reste
  strictement tokenisé ; une seule piste non `HUG` sous l’étendue de l’enfant
  rend l’axe indécis et rien n’est publié ; un alignement explicite retire
  l’exception, sans quoi la valeur contredirait l’avertissement de
  `resolveSlotSize` sur le même axe. → [spec](./docs/format/FORMAT.md#grilles)

### Diagnostics

- Une donnée facultative incomplète avertit. Les préconditions explicitement
  définies dans la spécification bloquent. Unique exception, motivée plus bas :
  l’échantillon de maquette ne réclame jamais rien.
  → [échantillon](#échantillon-de-maquette)
- `ucm check` juge les couleurs d'un contrat contre la table des emplois de
  `@ucm-kit/core/emplois`, la même que celle d'UCM Palettes, quand
  `tokens.json` porte la collection `usage`, et n'en bloque jamais la fusion.
  Le fond d'une couleur suit la règle de FORMAT.md, section 2 : le plus long
  préfixe de son chemin qui porte un `background`. Un contraste se mesure à
  8 bits dans chaque marque et chaque thème, et une couleur hors de sRGB ou
  translucide n'est pas jugée. `diagnostic-emplois.mjs` en est l'unique
  autorité ; `packages/kit/tests/diagnostic-emplois.test.mjs` tient un
  contrat par constat et un contrat conforme. Borne : le diagnostic ne lit que
  le premier alias d'un token de composant.
  → [format](./docs/format/FORMAT.md#2-tokens-de-variantes)
- On n’avertit que sur ce qu’on publie. Une valeur que le contrat va jeter,
  comme les dimensions du calque de référence quand `sizes` existe, n’est ni
  relevée ni signalée.
- Un avertissement s’adresse au designer : nom Figma exact, ce qui manquera,
  geste à faire. Les trois sont exigés ; un constat qui ne nomme aucun geste
  n’est pas un avertissement, et il ne s’écrit nulle part. Un message qui vise
  la racine de chaque variant du set exporté ne nomme aucun calque : le nom
  change d’une racine à l’autre, et la phrase s’écrit une fois pour toutes
  (`pousserPourLesVariants`, `src/contract/localisation.ts`).
- **Un point bloquant se lit en tête de la liste, quel que soit son rang
  d’arrivée.** Il dit que le contrat est déjà faux, là où un avertissement le
  laisse exact. Le moteur le place en tête de `meta.diagnostics`, parce que la
  demande de fusion coupe sa liste par la fin ; l’interface l’insère avant le
  premier avertissement, sans trier les autres, quel que soit l’ordre où il
  arrive (`tests/interface/interface.test.mjs`).
- **Un composant imbriqué sans ses règles se signale dans le contrat.** Le
  moteur en fait l’unique relevé (`releverLesImbriques`,
  `src/contract/imbriques.ts`) : un composant publié, non contracté et qui
  n’est pas une icône donne un point bloquant, publié dans `meta.diagnostics`
  et la demande de fusion en `UCM_PORTABLE_PROJECTION_WARNING`, puisque le
  contrat n’a pas la dépendance qu’il devrait réutiliser. La création des
  règles relit le relevé que l’export lui rend. Le verdict compte ce que la
  liste montre.
- **Les trois parties voyagent séparées**, du site d’émission jusqu’à
  l’interface : un site écrit un `Constat` (`src/contract/localisation.ts`),
  jamais une phrase. Un point bloquant porte en plus la liste que son titre
  annonce (`elements`), que la phrase écrit après le titre. La phrase compacte
  que publient `meta.diagnostics`, la demande de fusion et le journal s’en
  dérive (`phraseDe`), sans seconde rédaction ; l’interface, elle, met les
  parties en page et ne recoupe rien. Deux lois le
  tiennent (`tests/loiDesParties.test.ts`) : l’une lit la source et refuse
  qu’un message s’écrive ailleurs qu’à l’autorité, l’autre lit la sortie du
  moteur et refuse un message sans ses parties.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- **Un export ne remonte que ce qui demande une décision.** Trois portes, et
  rien d’autre. Une transformation entièrement prise en charge est silencieuse
  dans le plugin, dans la demande de fusion et dans `meta.diagnostics` ; la
  spécification et les tests du format portent cette règle.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- **Le rapport CI suit la même règle que l’export : il ne parle que d’une
  demande de fusion qu’il concerne.** Le contrôle, lui, tourne sur toutes, sans
  filtre de chemin : la conformité se casse aussi dans le code seul. Une demande
  qui ne touche ni contrat, ni `tokens.json`, ni `ucm.config.json`, ni
  l’implémentation résolue d’un contrat reçoit le rapport sans objet, une ligne
  qui remplace un verdict devenu faux et ne crée jamais un commentaire. Un
  refus, lui, s’écrit toujours en entier. `perimetre-rapport.mjs` est l’autorité
  unique de ce périmètre, et le marqueur `<!-- ucm-sans-objet -->` le porte
  jusqu’aux deux publicateurs.
- `meta.diagnostics` est l’unique propriétaire des messages publiés dans le
  contrat. Un consommateur qui veut la liste lisible lit `diagnostics[].message`,
  sans filtrer sur `severity`.
- Le corps de la demande de fusion a deux zones. L’en-tête dit l’identité de ce qui
  est déposé : le chemin, puis le schéma de contrat pour un contrat ou la
  version du format de tokens pour `tokens.json`. La liste ne porte que des
  gestes. Ce que le plugin compte, ce que la demande liste et
  ce que `meta.diagnostics` publie sont la même liste.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- `meta.figma.url` est absent des contrats produits aujourd’hui, ce qui est un
  état normal.
  Le plugin se distribue par la Community, donc sans
  `enablePrivatePluginApi`, donc sans `figma.fileKey`. Le champ reste optionnel
  au schéma, puisqu’un contrat plus ancien le porte encore, et son absence ne
  produit aucun diagnostic : la traçabilité passe par `fileName` et `nodeId`, annoncés
  dans le corps de la demande de fusion.
  → [spécification](./docs/format/FORMAT.md#métadonnées)
- Le numéro annoncé dans l’en-tête est lu dans le fichier déposé :
  `versionDeContrat()` (`format/version.ts`) pour un contrat,
  `etatDuFormatDeTokens()` (`format/tokens.ts`) pour `tokens.json`. Il ne vient
  jamais de `CONTRACT_VERSION` ni de `TOKENS_FORMAT_VERSION`.
  → [spécification](./packages/plugin-exporter/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)
- Un export identique n’ouvre jamais une seconde demande de fusion. L’immobilité
  se juge sur la branche de base **et** sur les demandes d’export encore
  ouvertes (`exportsEnVol()`, `src/depot.ts`), sur l'une et l'autre forge. Le
  verdict porte l’endroit où le contenu identique a été trouvé, et le journal le
  dit. Un contenu différent pendant qu’une demande est ouverte est un réexport
  après correction, donc le geste normal, et il n’est pas refusé.
  → [spécification](./packages/plugin-exporter/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)
- Un avertissement entre dans le corps de la demande en Markdown, et chaque
  forge y neutralise ses formes actives. `sansLienAutomatique()` publie en
  `code` `@nom` et `#123` sur GitHub (`src/forges/github.ts`), et en plus
  `!123`, `~label`, `%jalon`, `$123`, `&123`, la référence croisée et une
  ligne qui commence par `/` sur GitLab (`src/forges/gitlab.ts`), où cette
  ligne serait exécutée comme action rapide. Le rendu Markdown du kit, qui ne
  sait pas sur quelle forge le rapport part, neutralise les formes des deux.
  → [spécification](./packages/plugin-exporter/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)
- Un jeton ne part que vers le dépôt qui l'a reçu. Il voyage dans l'entrée de
  son adresse, écrite en une seule écriture de `depots`, et l'adresse d'une
  entrée enregistrée ne change plus : le sandbox refuse une modification qui la
  changerait. `validateSettings()` (`src/config.ts`) valide chaque entrée avec
  son propre jeton, et l'ouverture, le pré-vol, la publication et
  l'enregistrement passent tous par elle. Une file du sandbox ordonne les
  écritures de la configuration : une modification ne fait pas revenir une
  entrée supprimée dans la même fenêtre.
  → [spécification](./packages/plugin-exporter/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)
- Tout texte du plugin qui nomme une forge, sa demande ou son jeton lit
  `src/forges/termes.ts` ; aucun message ne teste la forge. La galerie tient
  la frontière dans les deux sens : un état GitLab n'affiche aucun mot de
  GitHub, et l'inverse. Un état `mixte`, où la liste des dépôts montre les
  deux forges, vérifie chaque message contre la forge de son sujet : l'entrée
  désignée pour `depot-teste`, la clé de destination d'un résultat
  d'opération, le dépôt actif pour le reste (`tests/galerie.test.ts`).
  → [spécification](./packages/plugin-exporter/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)

### Échantillon de maquette

- `figmaLayer` est une **identité** Figma, jamais un contenu, que Figma nomme ou
  non un calque texte d’après ce qu’il dit. Le contenu se lit dans `samples`, ou
  nulle part.
- L’échantillon ne contient que des valeurs qu’un développeur pourrait écrire
  lui-même : texte, booléen, valeur d’enum, nom de composant. Jamais un token,
  une couleur, une dimension, un layout. Une donnée de rendu qui manquerait ici
  manque au contrat normatif, seul endroit où la corriger.
- Tout le non normatif tient sous `samples` et `variants[].sample`, et nulle part
  ailleurs. Les retirer laisse un contrat strictement normatif ; aucun contrôle
  ne compare ce contenu au code.
- Corollaire : une donnée non normative ne doit jamais pouvoir dégrader une
  structure normative, ni sa taille, ni sa déduplication, ni sa validation. D’où
  un catalogue à part, et non un champ dans `variantViews`.
- L’échantillon n’avertit de rien et ne dégrade jamais `meta.coverage.portable` :
  ce qu’il ne sait pas lire, il l’omet. En contrepartie, la spécification énumère
  ce qu’il ne sait structurellement pas porter, et `args` est publié comme un
  SOUS-ENSEMBLE. En cas de désaccord avec une donnée normative, la normative
  l’emporte.
- `args` est la projection fermée de la même surface publique que `props` :
  owner direct, puis unique wrapper de dimensions élu et exposé. Aucun repli
  sur une clé brute, aucune autre instance exposée, aucun `SLOT`. Une collision
  ou une provenance ambiguë s’omet au lieu de choisir une première occurrence.
- Ce que la visibilité effective filtre est le relevé positionnel nu (`text`,
  `override.text`, `swaps`), celui qui rapporte ce qu’un calque porte sans
  rapporter la condition qui le masque. Une valeur d’`args` n’en est jamais, le
  booléen qui la masque voyageant dans le même `args` : restent donc publiés
  sous un calque masqué une valeur `false` d’`args`, un `override.visible` et
  l’entrée d’une dépendance. La frontière de la remontée est la racine du
  composant exporté, jamais l’instance de dépendance, et `isVisibleInSample` en
  est l’unique autorité. Perte assumée : le variant qui affiche ce cadre publie,
  lui, ce que le relevé y trouve.
- Un `SLOT` ne borne que les comparaisons positionnelles, qui supposent
  l’instance isomorphe à son maître. Une lecture nominale, qui joint
  `componentPropertyReferences` à une propriété déclarée, le traverse.
- `propertySurfaces` est l’unique autorité sur la surface publique d’une
  dépendance, parce qu’elle a élu son wrapper, du même geste que l’export
  autonome de cette dépendance. Un owner absent de l’index laisse la
  dépendance sans `args`, plutôt qu’une surface fabriquée en dernier recours.
- L’adressage est asymétrique, et le nom de calque Figma en est la charnière :
  seule identité que deux contrats partagent, il adresse ce que ce contrat ne
  décrit pas, là où un slot adresse ce qu’il décrit. D’où `text` chez soi et
  `overrides` chez autrui.
  → [spec](./docs/format/FORMAT.md#9-échantillon-de-maquette)
- Un remplacement d’instance dans une dépendance se publie dans `swaps`, jamais
  dans `overrides` : les deux relevés n’ont ni la même source, Figma ne
  rapportant pas `mainComponent`, ni la même adresse. `masterPath` nomme les
  calques du maître, parce que Figma renomme le calque remplacé d’après son
  nouveau composant et que le nom du maître est le seul que le contrat de la
  dépendance publie. Bornes : on compare le composant propriétaire et non la
  variante, et le relevé s’arrête sur une dépendance de la dépendance, un
  `SLOT`, ou un calque déjà déclaré remplacé.
  → [spec](./docs/format/FORMAT.md#9-échantillon-de-maquette)
- `swaps` ne rapporte que ce qu’`args` ne sait pas dire. Une INSTANCE_SWAP native
  a déjà sa prop dans le contrat de la dépendance, `mergeIconRules` y posant
  `runtimeProp` plutôt qu’une prop de synthèse.
- Une valeur d’INSTANCE_SWAP se publie par le nom du composant propriétaire,
  jamais par l’identifiant de node que rend `componentProperties`.
  `propertyBindings.appliedValue` porte cette règle pour le composant exporté,
  `argumentsOf` pour ses dépendances ; ni l’un ni l’autre n’ajoute d’aller-retour.
  Un remplacement qu’on ne sait pas nommer est omis, et `swaps` reste seul.

### Versionnage

- Un changement de forme du JSON incrémente `contractVersion` et met à jour la
  spécification et les consommateurs.
- Le kit qui connaît une nouvelle version du format de tokens sort avec la CLI
  et l'adaptateur, le kit en premier, avant le plugin qui la produit.
  → [compatibilité](./docs/format/COMPATIBILITE.md#lordre-dune-nouvelle-version-du-format-de-tokens)
- `packages/kit/schema/ucm-contract.schema.json` est dérivé de `types.ts` par `npm run
  schema`, jamais rédigé. Il décrit la forme, pas la cohérence : il ignore les
  renvois internes et le format des valeurs tokenisées, et ne remplace aucun
  contrôle du consommateur. Sa propre `description` énonce ses limites.

### Écriture dans le document

- Un seul fichier du moteur écrit dans Figma, `src/template/ecriture.ts`, et il
  est le seul exclu de `loiDuDocumentIntact.test.ts`. `src/template/modele.ts`
  et `src/template/sources.ts` restent balayés : un fichier de lecture ajouté
  au dossier ne passerait pas sous l'exclusion sans que la loi le dise.
- Une seule porte y mène : `creerRegles` dans `src/code.ts`, routée par la
  demande `creer-regles`. Aucun fichier de `src/contract/`, `src/tokens/`,
  `src/forges/`, ni `depot.ts` ni `prevol.ts` n'importe `src/template/`.
- Le parcours des sources charge une page à la fois, par `PageNode.loadAsync`,
  et s'arrête à la première qui porte une source. `loadAllPagesAsync` et
  `importComponentByKeyAsync` restent refusés dans tout `src/template/`.
- `figma.skipInvisibleInstanceChildren` ne se pose qu'autour d'un relevé
  synchrone, et reprend sa valeur d'avant. Deux fichiers le posent :
  `src/template/sources.ts` pour les sources, `src/contract/composedComponents.ts`
  pour le balayage de page de l'index. À `true` pendant un `await`, il ferait
  lire à une analyse concurrente une politique d'icône fausse, `visibilityOfLayer`
  dépendant d'un calque masqué.
- Ce que la création écrit se défait d'un geste : supprimer le conteneur. Le
  plugin n'appelle pas `commitUndo`, un Ctrl+Z défaisant déjà la création
  entière.
- Une règle s'écrit hors de l'arbre, puis se range d'un seul geste. Un ajout
  dans un slot déjà imbriqué laisse une coquille à l'ancien chemin du node, et
  tout parcours du conteneur lève jusqu'à la fin de la session.
- Aucun handle de sous-calque ne se garde d'une écriture à l'autre : son id est
  un chemin, et le chemin bouge. Toute écriture se relit, une écriture perdue
  ne levant pas.
  → [spec](./packages/plugin-exporter/SPEC.md#comment-lécriture-range-une-règle)

### Moteur de couleur

- Le moteur de couleur ne lit ni `figma`, ni le DOM, ni l'heure, ni le hasard,
  ni la langue du poste : les mêmes entrées rendent les mêmes octets dans Node,
  dans l'iframe d'un plugin et dans le sandbox Figma. Le `tsconfig.json` de
  `packages/couleur` compile `src/` en ES2020 sans type d'environnement, et
  `packages/couleur/tests/loiDePurete.test.ts` refuse ce qu'ES2020 déclare :
  `Date`, `Math.random`, `Intl`, `toLocaleString`, avec `TextEncoder`. La même
  loi lit `packages/kit/src/emplois/`, que le moteur importe. Borne : la loi
  lit le texte ligne à ligne, commentaires retirés.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#6-le-moteur-de-couleur)
- La table des emplois, les dix-neuf paires, les quatre rangs, la table des
  états, la collection `usage` et le contraste WCAG 2 ont une seule source,
  `@ucm-kit/core/emplois` (`packages/kit/src/emplois/`). `ucm-couleur`
  l'importe et la republie sans la recopier, et le kit n'importe rien de
  `ucm-couleur` : `packages/kit/tests/emplois.test.ts` le tient. Borne : le
  test lit les instructions d'import, pas un chemin calculé.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#112-promesses-des-emplois)
- À la clarté de la couleur de référence, la teinte vaut celle de la référence,
  quel que soit le Color shift. `teinteA` (`packages/couleur/src/rampe.ts`) en est
  l'unique autorité, et `proprietes.test.ts` l'éprouve sur vingt mille tirages.
  La saturation et la luminosité du Color shift lisent le même poids, `poidsA` :
  nul à la clarté du pivot, il n'y décale aucune des trois grandeurs, et
  `proprietes.test.ts` l'éprouve sur vingt mille tirages. Sans saturation ni
  luminosité, chaque cran est celui de la teinte seule, à l'octet, et une part
  nulle reste nulle : une palette grise reste grise sous toute saturation.
  Sous des réglages de teinte ou de luminosité, chaque profil pivote sur son
  départ : à la clarté du départ, sa teinte vaut celle de son pivot, et un
  décalage de clarté ne change la teinte d'aucun cran. `pivotDe`
  (`packages/couleur/src/palette.ts`) en est l'unique autorité, et
  `packages/couleur/tests/reglages.test.ts` l'éprouve sur des tirages.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran)
- Dans son intensité porteuse, chaque mode d'une palette contient les octets
  exacts de sa couleur de référence, au cran de clarté la plus proche. Les
  autres crans gardent le calcul commun, et aucune vue ne recalcule une
  référence : promesses, alertes, planche, rapport et Color shift lisent
  `rampesDe` et `ancrageDe` (`packages/couleur/src/palette.ts`), qui en sont
  l'unique autorité. `packages/couleur/tests/ancrage.test.ts` l'éprouve sur deux
  mille références, puis sous vingt mille Color shift tirés au hasard. Le cran porteur se lit sur la clarté du départ des réglages :
  une luminosité réglée translate la rampe sans changer la nuance du ◆. La
  référence réglée sort de `referenceReglee` (`packages/couleur/src/reglages.ts`),
  que seuls les gestes appellent ; la validation ne la recalcule pas, et
  `packages/plugin-palettes/tests/reglages.test.ts` tient l'égalité. Borne :
  l'ancrage ne promet pas qu'une promesse reste tenue.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran)
- À deux intensités, le profil porteur prend la part de chroma de la
  référence, qu'une palette de base Soft ou Vivid le force (l'interface
  l'appelle « Référence exacte dans »), que `reglages.porteur` le fige ou que
  le classement automatique le choisisse. Sous la part commune de soft,
  l'autre profil garde le rapport des parts communes ; au-dessus, il garde sa
  part commune, bornée pour que soft ne dépasse pas vivid. La part de la
  référence se lit à sa clarté bornée à l'étendue de la liste de la palette,
  et vaut 0 pour un gris pur, dont R, G et B ne diffèrent pas de plus d'une
  unité. Ces parts se calculent à la lecture et ne se rangent jamais :
  `partsDe`, `partDeLaReference` et `profilPorteur`
  (`packages/couleur/src/palette.ts`) en sont l'unique autorité, et des parts
  propres du designer passent avant elles. Sans palette de base, le premier
  réglage de la carte « Réglage global » fige le porteur dans
  `reglages.porteur`, qui passe avant le classement automatique.
  `packages/couleur/tests/base.test.ts` l'éprouve sur des teintes, des
  clartés et des parts communes variées, et
  `packages/couleur/tests/desaturees.test.ts` sur les gris et les références
  ternes.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#81-une-palette)
- Une palette porte une intensité ou deux. À une intensité, elle n'a qu'une
  rampe par mode, sans nom de profil, égale à celle du profil porteur forcé :
  la part de la référence, la référence exacte à son cran. Aucune vue ne
  suppose Soft et Vivid : rampes, promesses, alertes, planche, rapport et
  interface parcourent la liste que rend `intensitesDe`
  (`packages/couleur/src/palette.ts`), unique autorité.
  `packages/couleur/tests/intensites.test.ts` le tient, sur cinq cents
  références pour l'égalité au profil forcé.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#81-une-palette)
- En Dark, les nuances de fond, 50 à 300, prennent la part de leur intensité
  multipliée par un facteur réglé dans la recette ; les nuances 400 et
  au-delà, et tout le thème Light, restent identiques à l'octet. Le facteur
  se lit sur la clarté que la courbe vise, jamais sur un rang, et la
  référence exacte garde ses octets. `facteurSombre`
  (`packages/couleur/src/rampe.ts`) en est l'unique autorité : `fabriquerRampe`
  l'applique, et « Profils confondus » le lit pour se taire sur les nuances
  atténuées. `fabriquerCran`, que la garantie des courbes, l'ajustement et les
  pistes peintes des réglettes appellent, ne l'applique pas. `packages/couleur/tests/fondsSombres.test.ts`
  le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#63-fabriquer-un-cran)
- Chaque valeur de la limite dynamique d'un réglage garde les promesses tenues
  au départ du geste et, pour la luminosité, 0,01 de clarté entre nuances
  voisines. Une promesse manquée au départ ne borne rien. Chaque borne porte
  sa cause : la première promesse qui manquerait un pas au-delà, ou l'ordre
  des nuances. `balayerLaLimite` et `limiteDynamique`
  (`packages/couleur/src/limites.ts`) en sont l'unique autorité : le Color
  shift et le réglage global leur passent leur palette candidate.
  `packages/couleur/tests/limites.test.ts` le tient sur Bleu, Rouge, Jaune et
  Sauge. Borne : le balayage juge les valeurs au pas du réglage, pas entre
  deux pas.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#123-les-limites)

### Écriture d'UCM Palettes

- Seuls les fichiers de `packages/plugin-palettes/src/ecriture/` écrivent dans
  le document. `packages/plugin-palettes/tests/loiDEcriture.test.ts` cherche
  ailleurs, ligne à ligne, une liste explicite de motifs : `figma.create*`,
  `.remove(`, `setPluginData`, `setSharedPluginData`, `appendChild`,
  `insertChild`, l'affectation de `fills`, `strokes`, `name`, `characters`,
  `x`, `y`, `layoutMode`, `fontName` et `fontSize`, et `.resize(` hors de
  `figma.ui.resize`. `src/ui/` en est exclu : l'iframe n'a pas de global
  `figma`. Borne : une affectation absente de la liste lui échappe.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#143-le-plugin)
- Seuls `src/ecriture/variables.ts`, qui écrit, et
  `src/lectureDesVariables.ts`, qui lit, appellent `figma.variables`,
  `figma.teamLibrary` ou une méthode de leur API. Aucun fichier de `src/`, interface et écriture
  comprises, n'appelle `loadAllPagesAsync` ni une API de style. La même loi
  le tient.
- `src/code.ts` est le seul fichier qui importe `src/ecriture/`, avec une porte
  par geste d'écriture : `ranger-recette`, `dessiner`, `retirer-cadre`,
  `choisir-page`, `ecrire-variables`, `ranger-destination`,
  `retirer-variables`, `reprendre-palette` et `copier-palette`.
- Le plugin ne retire un cadre de Figma que sur « Supprimer définitivement »,
  geste explicite du designer. Le sandbox relit la recette rangée et le cadre :
  il ne retire qu'un cadre possédé qui porte encore l'identifiant de sa
  palette, quand la recette se lit et ne contient plus cette palette. Le cadre
  et son entrée du suivi partent dans une seule écriture, close par un seul
  `commitUndo`. Un cadre déjà disparu fait seulement oublier son entrée ; un
  suivi plus récent refuse avant toute écriture.
  `packages/plugin-palettes/tests/retrait.test.ts` le tient, contre le double
  de `tests/figmaDeTest.ts`.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#91-emplacement-et-propriété)
- Changer la page des planches range la page dans le suivi, puis déplace
  vers elle chaque cadre possédé qui vit ailleurs, à la place qu'un cadre
  neuf y prendrait. Un cadre déjà sur la page, section comprise, garde sa
  place, et une copie ne bouge pas. `choisirLaPage`
  (`src/ecriture/planche.ts`) refuse avant toute écriture une page que
  Figma ne connaît plus, un nom de page neuve vide ou déjà porté, et un
  suivi d'une version plus récente. Un seul `commitUndo` clôt le
  changement. `packages/plugin-palettes/tests/dessin.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#91-emplacement-et-propriété)
- Le dessin part de la recette rangée, jamais de couleurs envoyées par
  l'interface : la demande ne porte que des identifiants de palette et
  l'empreinte lue, et une recette rangée depuis n'est pas dessinée. Un cadre
  appartient au plugin quand son propriétaire rangé est son propre
  identifiant : une copie du designer n'est jamais réécrite. Les polices se
  chargent avant tout calque ; une erreur au milieu d'un cadre retire tout ce
  qu'il avait posé. Redessiner construit le cadre neuf, puis retire l'ancien
  et reprend sa place : même parent, même rang, même transformation ;
  l'identifiant du cadre change à chaque dessin. Un cadre que Figma refuse de
  lire arrête le dessin de sa palette, et un suivi des cadres d'une version
  plus récente arrête tout dessin. Un seul `commitUndo` clôt le dessin. `packages/plugin-palettes/tests/dessin.test.ts`
  le tient, contre le double de `tests/figmaDeTest.ts`.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#9-sortie-1--la-planche)
- Chaque calque posé porte le marqueur `ucm_palettes/calque`. Un calque sans
  marqueur dans un cadre à redessiner arrête le dessin avant tout calque, et
  l'interface le nomme ; le dessin ne part qu'avec l'identifiant de chaque
  calque confirmé par le designer. Chaque dessin relit la peinture des
  pastilles qu'il a posées, et l'interface compare ces hexas à son aperçu.
  `packages/plugin-palettes/tests/dessin.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#91-emplacement-et-propriété)
- Un cadre est à jour quand l'empreinte qu'il range égale celle du modèle
  que la recette donne aujourd'hui, styles de texte compris. La lecture
  retrouve chaque cadre par son identifiant rangé, sur n'importe quelle page,
  puis parcourt la seule page de la planche, sections comprises ; elle ne
  parcourt toutes les pages qu'au geste « Synchroniser ». Un
  cadre rangé que Figma ne connaît plus est introuvable, un cadre qu'il
  refuse de lire est illisible : aucun des deux n'est « jamais dessiné ».
  L'interface recalcule la fraîcheur après chaque état lu et chaque
  rangement, sur l'onglet Gestion ouvert ; elle ne redessine jamais sans le
  geste du designer. `packages/plugin-palettes/tests/fraicheur.test.ts`
  le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#96-fraîcheur)
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#9-sortie-1--la-planche)
- La recette se range sous la clé partagée `ucm_palettes/recette`, en JSON
  canonique, si elle passe la validation et si la recette rangée porte encore
  l'empreinte que l'interface a lue. `commitUndo` suit l'écriture. Un refus
  n'écrit rien. `packages/plugin-palettes/tests/rangement.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#73-rangement-et-version)
- L'interface range à la fin d'un geste, jamais pendant une saisie, et un seul
  rangement est en vol : un geste suivant attend l'empreinte que la réponse
  apporte. Après un refus, rien ne se range ni ne se dessine avant
  « Recharger », et le brouillon reste exportable. Un dessin demandé pendant
  un rangement part après lui ; un refus l'abandonne. Une écriture de
  variables suit la même règle, et part avant le dessin. Un seul choix de
  page et un seul rangement de destination sont en vol, et aucune écriture
  ne part pendant un conflit.
  `src/ui/frontiere.ts` en est l'unique autorité, et
  `packages/plugin-palettes/tests/frontiere.test.ts` le tient.
- Un import ne range rien avant la confirmation du designer : le fichier se
  classe comme la recette rangée, et un fichier cassé, invalide ou futur
  laisse la recette du fichier intacte. L'écart compare les palettes par
  identifiant, champ par champ, et annonce les cadres à jour qu'il
  périmerait. Une recette illisible ou future s'exporte telle qu'elle est
  rangée. `packages/plugin-palettes/tests/importation.test.ts` et les tests
  d'interface le tiennent.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#101-la-recette-exportée)
- L'écriture des variables part de la recette rangée, jamais de couleurs
  envoyées par l'interface : la demande ne porte que des identifiants de
  palette, l'empreinte lue et les palettes dont le designer remet les
  couleurs. Le plugin reconnaît ses variables par l'identifiant que le suivi
  garde, jamais par leur nom, et la liste locale fait foi : une variable
  suivie qui n'y est plus se recrée. Une palette dont Figma a changé une
  couleur ne s'écrit pas sans ce choix. Un nom déjà pris par une variable
  hors du suivi arrête la palette avant toute création. Une variable créée
  naît sans portée (D14). Une erreur au milieu d'une palette retire les
  variables que l'écriture venait de créer pour elle, et les autres palettes
  continuent. Aucune écriture ne renomme ni ne déplace une variable ; seul
  `retirerLesVariables` en retire, pour une palette que la recette rangée ne
  contient plus. Le suivi se range après les valeurs, et un seul
  `commitUndo` clôt l'écriture. `packages/plugin-palettes/tests/variables.test.ts`
  le tient, contre le double de `tests/figmaDeTest.ts`.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#173-lécriture)
- Une palette reprise du fichier garde ses variables d'origine pour tokens.
  `reprendreLaPalette` range la recette qui la porte et la liaison de
  reprise de son suivi ensemble, sous un seul `commitUndo`, sans écrire une
  variable ; le sandbox retrouve lui-même la palette du fichier, et la
  liaison ne vient jamais de l'interface. Le suivi garde le groupe du chemin
  source à la reprise, puis celui de la destination après écriture. Le plan
  emploie le groupe configuré si celui-ci a changé ; sinon il suit le groupe
  relu dans les variables suivies. Le dernier segment du chemin source nomme
  la palette. Le suivi garde le chemin cible après écriture. Si toutes les
  variables d'origine disparaissent, le plan peut les recréer sous ce chemin.
  Pour une palette figée, le plan ne rend que les entrées que le suivi désigne
  tant qu'une variable d'origine subsiste. L'écriture remplace les couleurs
  des variables suivies, peut renommer leurs chemins sans changer leurs
  identifiants, et crée les entrées manquantes. Un suffixe non vide après un
  tiret, placé après le numéro de nuance, est conservé lors d'un renommage et
  ne déclenche pas seul une mise à jour. Un tiret final seul reste un
  renommage. Un mode suivi disparu refuse l'écriture avant toute mutation.
  Le suivi ne suit pas une variable dans le thème où elle porte
  un alias. Une palette reprise puis supprimée rend ses variables à « Déjà
  dans le fichier ».
  `packages/plugin-palettes/tests/reprise.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#174-les-palettes-du-fichier)
- Le plan des variables d'une palette prend ses couleurs dans `rampesDe`,
  celles de l'aperçu et de la planche, et donne à chaque entrée une clé
  `{intensité}/{thème}/{nuance}` qui ne dépend ni du nom de la palette ni de
  la destination. `planDesVariables` (`src/variables/plan.ts`) en est
  l'unique autorité.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#171-la-forme-et-la-destination)
- L'état des tokens d'une palette se décide sur trois lectures, dans cet
  ordre : une variable suivie absente du fichier, introuvables ; une couleur
  lue différente de la dernière écrite, modifiés dans Figma ; une couleur
  calculée différente de la dernière écrite, une clé du plan hors du suivi
  ou une destination changée, à mettre à jour. Un ancien groupe rangé ne
  signale pas de changement si les variables suivies sont déjà dans la
  collection et aux noms prévus par le plan. Deux couleurs sont égales à
  l'octet, après arrondi des composantes de Figma (`hexaDeFigma`,
  `src/variables/releve.ts`). Un suivi d'une forme inattendue se lit vide,
  et un suivi d'une version plus récente ne se lit pas. `etatDesTokens`
  (`src/variables/etat.ts`) en est l'unique autorité.
  `packages/plugin-palettes/tests/modeleDesVariables.test.ts` tient ces deux
  règles.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#172-la-propriété-et-létat)
- Une collection de bibliothèque se lit sans s'écrire. La lecture liste les
  collections activées et les palettes que leurs noms dessinent, sans
  importer une variable ; si `figma.teamLibrary` manque ou lève, elle rend
  une liste vide, dite illisible, et le reste de Gestion fonctionne. Seul
  « Copier dans le plugin » importe des variables : celles de la palette
  copiée, par `copierLaPalette`, qui range la recette sous un seul
  `commitUndo`. La copie n'a pas de liaison de reprise : elle s'écrit dans
  la destination des tokens, jamais dans la bibliothèque.
  `packages/plugin-palettes/tests/bibliotheques.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#174-les-palettes-du-fichier)
- Le manifest n'ouvre aucun domaine et ne déclare pas
  `enablePrivatePluginApi`. Il déclare la seule permission `teamlibrary`,
  que la lecture des collections de bibliothèque demande.
  `packages/plugin-palettes/tests/manifest.test.ts` le tient.
- Aucun des deux plugins n'importe l'autre : `tests/pluginsSepares.test.ts` lit
  les deux sens, à la racine, sans qu'un paquet lise les sources de l'autre.

### Langue d'UCM Palettes

- L'interface s'ouvre en anglais ; une langue rangée absente ou inconnue donne
  l'anglais, sans lire la langue de Figma ni du système. La préférence se
  range dans `figma.clientStorage` sous `ucm-palettes.langue`, jamais dans
  le document. `src/preferences.ts` ne reçoit que `getAsync` et `setAsync`,
  et ordonne ses rangements : le dernier choix est celui de l'ouverture
  suivante. Les sections ouvertes de Gestion s'y rangent de même, sous
  `ucm-palettes.sections`.
  `packages/plugin-palettes/tests/i18n.test.ts` le tient.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#131-fenêtre-et-onglets)
- Les vues de `src/ui/` ne posent aucun mot en dur : chaque texte, infobulle
  et nom accessible vient des catalogues de `src/i18n/`, et les catalogues
  ont les mêmes clés et les mêmes types. `packages/plugin-palettes/tests/loiDesTextes.test.ts`
  et `tests/i18n.test.ts` le tiennent. Borne : la loi ne lit qu'un littéral
  posé directement dans une destination connue.
- Changer de langue ne reconstruit aucun élément et n'envoie aucune demande de
  rangement, de dessin ou de retrait. Les planches importent
  `src/planche/textes.ts` et restent en français : leur modèle et leur
  empreinte ne dépendent pas de la langue. Les tests d'interface le tiennent.
- Le registre `src/i18n/langues.ts` n'importe aucun catalogue, pour que le
  sandbox valide la préférence sans embarquer les textes de l'interface.

### Interface d'UCM Palettes

- Pendant un geste, aucun contrôle de l'onglet Création ne se déplace. Un
  message qui peut paraître pendant un glisser tient dans une ligne fixe de
  24 px, présente même sans message (`src/ui/ligneFixe.ts`) ; le bilan des
  garanties et des alertes passe dans le pied, qui garde sa hauteur
  (`src/ui/piedDeLaPalette.ts`) ; le résumé d'une carte repliable tient sur
  une ligne. Les messages et la carte des garanties se lisent dans l'onglet
  Vérification, qui ne se rend que visible et à la fin d'un geste
  (`src/ui/ongletVerification.ts`). `ongletCreation.ts` pose l'état du geste là où la
  prévisualisation et la validation passent, et le pied n'annonce son bilan
  qu'à la fin d'un geste. Les tests `[UI-20]` de
  `packages/plugin-palettes/tests/interface/interface.test.mjs` relèvent,
  fenêtre sans défilement, la position d'une réglette du réglage global, du
  graphe et d'une réglette du Color shift à chaque image d'un glisser, et
  échouent au premier pixel d'écart. Borne : ils ne relèvent que ces trois
  contrôles, et un élément placé sous le contrôle saisi peut encore changer
  de hauteur.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#132-écrans)
- Le thème montré, Light ou Dark, ne se range nulle part et ne produit aucune
  demande au sandbox : il vit dans `src/ui/paletteOuverte.ts`, s'ouvre en
  Light, et seule la barre de la palette (`src/ui/barreDePalette.ts`) le
  choisit. Cette barre reste en haut du panneau pendant le défilement, si bien
  qu'un changement de thème depuis l'Interface de test ne défile pas la page.
  `tests/paletteOuverte.test.ts` tient l'état. Les tests `[UI-23]` de
  `interface.test.mjs` tiennent la bascule dans Création et dans Vérification,
  la barre au haut de la zone visible à 600 × 720 et à 500 × 520, sa ligne
  unique à 500 px en français et en anglais, et la liste du sélecteur au-dessus
  des cartes ; « changer de thème n'envoie aucune demande au sandbox » et le
  test `[VER-20]` tiennent le reste. Borne : le test des demandes relève les
  messages vers le sandbox, pas le contenu de `clientStorage`, et la tenue en
  haut ne se mesure qu'avec l'Interface de test dépliée.
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#132-écrans)
- Un geste du Color shift ou du réglage global ne range jamais une valeur
  au-delà de la limite dynamique calculée au début du geste : la poignée et la
  réglette s'arrêtent sur la borne, et la ligne fixe sous les réglettes en nomme la
  cause. Le calcul s'étale entre les images (`src/ui/calculDesLimites.ts`) ;
  un geste qui commence avant sa fin le termine d'abord. Les tests `[DER-19]`,
  `[DER-09]` et `[ENT-15]` de `interface.test.mjs` glissent, saisissent et
  pressent Fin au-delà d'une borne. Borne : une valeur rangée qu'un autre
  réglage a sortie de sa plage reste en place ([DER-23]).
  → [spec](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md#123-les-limites)

### Explorateur de tokens

- L'explorateur ne crée ni ne modifie rien dans le document. Hors de
  `src/ui/`, aucun fichier n'appelle une création, une suppression, un setter
  de variable, un import de composant ou de style, `setPluginData`,
  `setSharedPluginData`, `commitUndo` ni `loadAllPagesAsync`, et aucun ne
  change la page courante, la sélection ni la vue du designer. Seule
  `src/lecture.ts` appelle `importVariableByKeyAsync`.
  `packages/plugin-explorateur/tests/loiDeLectureSeule.test.ts` lit les
  sources ; les doubles de `tests/figmaDeTest.ts` lèvent à toute affectation
  et à tout appel hors des lectures permises. Borne : la loi lit le texte
  ligne à ligne.
  → [spec](./packages/plugin-explorateur/SPEC.md#lecture-seule)
- Le noyau, `modele.ts`, `groupes.ts`, `indexation.ts`, `resolution.ts`,
  `comparaison.ts` et `diagnostics.ts`, ne lit ni `figma`, ni le DOM, ni une
  intégration UCM, et aucune règle hors de `src/integrations/` ne nomme une
  collection. Un groupe vient des seuls segments `/` du nom Figma et
  s'identifie par sa collection et ses segments (`cleDeGroupe`). La même loi
  le tient, avec `tests/groupes.test.ts`.
  → [spec](./packages/plugin-explorateur/SPEC.md#architecture-libre)
- Un contexte choisit un mode par famille, une collection et ses extensions.
  Une famille absente prend le `defaultModeId` de sa collection ; un mode
  n'est jamais rapproché par son nom d'une collection à l'autre. Un cycle se
  détecte sur les couples variable–mode du chemin, et une chaîne de plus de
  `BORNE_DES_ETAPES` étapes est interrompue sans être déclarée cyclique.
  `tests/resolution.test.ts` le tient.
  → [spec](./packages/plugin-explorateur/SPEC.md#résolution)
- Une cible d'alias que `getVariableByIdAsync` ne rend pas s'importe par la
  clé que porte son identifiant de bibliothèque (`cleDeBibliotheque`,
  `src/lecture.ts`). Aucune autre variable n'est importée : ni un identifiant
  local, ni une variable qu'aucun alias du relevé ne vise. Une cible que
  l'import ne rend pas non plus reste introuvable, ou refusée quand la
  lecture a levé ; aucune n'est déclarée supprimée. Au plus `CONCURRENCE`
  lectures par identifiant sont en vol, une seule par identifiant.
  `tests/lecture.test.ts` le tient.
- Un identifiant de mode désigne une seule collection du relevé. Figma
  numérote les modes par fichier : quand plusieurs collections déclarent le
  même identifiant, la collection locale le garde, et chaque collection
  distante le reçoit préfixé du sien. `separerLesModes` (`src/lecture.ts`) en
  est l'unique autorité, et `tests/lecture.test.ts` le tient.
  → [spec](./packages/plugin-explorateur/SPEC.md#lecture)
- Une variable liée à un calque ne s'importe jamais : seules les cibles de
  ses alias le peuvent. `lireLesVariables` (`src/lecture.ts`) lit chaque
  départ par `getVariableByIdAsync` seul, et `src/lectureDuComposant.ts`
  n'appelle aucun import. `tests/lectureDuComposant.test.ts` et
  `tests/loiDeLectureSeule.test.ts` le tiennent. Borne : une variable de
  départ que Figma ne rend pas par son identifiant reste introuvable.
  → [spec](./packages/plugin-explorateur/SPEC.md#vue-composant)
- La vue composant ne parcourt aucun calque sous une instance imbriquée.
  `lireLeComposant` (`src/lectureDuComposant.ts`) s'arrête à toute `INSTANCE`
  strictement sous le sujet, et n'en lit que les liaisons des champs que
  `InstanceNode.overrides` dit surchargés par le parent, rattachées au calque
  de l'instance. `tests/lectureDuComposant.test.ts` le tient.
  → [spec](./packages/plugin-explorateur/SPEC.md#vue-composant)
- Seuls `src/code.ts` et `src/apercu.ts` appellent `exportAsync`, qui rend
  des octets en mémoire. `tests/loiDeLectureSeule.test.ts` lit les sources, et
  `tests/apercu.test.ts` tient la borne de 720 px et l'export qui lève.
- Les modes d'un calque suivent la table de `separerLesModes` :
  `traduireLesModes` (`src/lecture.ts`) la leur applique avant toute
  résolution de la vue composant, si bien qu'un mode de bibliothèque renommé
  se rapproche encore du mode du calque. `tests/lectureDuComposant.test.ts`
  le tient.
  → [spec](./packages/plugin-explorateur/SPEC.md#lecture)
- L'interface est sombre quel que soit le thème de l'hôte : `src/ui/roles.css`
  précède la feuille du socle et `styles.css` affecte ses couleurs à chaque
  rôle. `tests/stylesUi.test.ts` refuse un rôle oublié et toute lecture de
  `--figma-color` ; les tests d'interface relisent les fonds sous les deux
  thèmes.
- Une réponse du sandbox porte le numéro de sa demande, et l'interface ignore
  celle d'une lecture remplacée (`src/ui/index.ts`). Les tests de
  `tests/interface/interface.test.mjs` le tiennent.
- Les intégrations s'activent explicitement et leur absence ne produit aucun
  constat. Le profil UCM ne contrôle que les collections que le designer
  associe à une couche (`src/integrations/profilUcm.ts`). Les contrats et
  `tokens.json` se jugent par `@ucm-kit/core/lecteurs/navigateur`, jamais par
  la porte Node ; `tests/bundle.test.ts` refuse toute dépendance Node dans les
  deux bundles, et `packages/kit/tests/porteNavigateur.test.mjs` la tient
  dans le kit.
  → [spec](./packages/plugin-explorateur/SPEC.md#intégrations-facultatives)

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

Chaque paquet a son `scripts/run-tests.cjs`, `build/run-tests.cjs` dans le socle,
qui découvre les fichiers `tests/*.test.ts` et `tests/*.test.mjs` de son dossier.
Tout bug corrigé
reçoit un test de régression.

`npm run cascade` charge la feuille des tokens dans Chromium, Firefox et
WebKit, hors de `npm test`. Ses moteurs s'installent par
`npx playwright install chromium firefox webkit`, et le job `cascade` de
`ci.yml` le lance.

Un changement dans `packages/kit/src/format/types.ts` demande `npm run schema` :
le schéma commité en est dérivé, et `packages/kit/tests/schema.test.ts` refuse
une version périmée en la régénérant pour la comparer.

**Le moteur ne se teste sur aucun contrat commité.** Un `.contract.json`
appartient au repository qui le consomme, à côté du code qu’il décrit. Un
exemplaire commité pour juger le moteur serait un instantané : il ne bougerait
qu’au réexport, si bien qu’une régression ne s’y verrait jamais, et un test posé
dessus ne prouverait que sa propre immobilité. Les tests de
`packages/plugin-exporter/tests/` jugent ce que le moteur fabrique au moment du test.

**Le lecteur, lui, pose la question inverse.**
`packages/kit/fixtures/contrats/` porte un corpus de la version **précédente**,
quatre contrats 12.0, et ce corpus est nécessaire : la fenêtre de lecture à deux
versions n’est observable qu’à partir de contrats que le moteur ne produit
plus. L’immobilité, qui est le défaut de l’instantané côté moteur, est ici
la propriété recherchée.

Trois bornes le tiennent :

- il n’est **jamais** comparé à une sortie du moteur ; un tel test serait
  exactement ce que la règle ci-dessus interdit ;
- il n’est **jamais** rafraîchi : un réexport le rendrait inutile, puisqu’il
  cesserait d’être N‑1. Ses empreintes SHA‑256, dans le README voisin, sont ce
  qui empêche de le croire frais ;
- il **disparaît** quand la fenêtre de lecture se referme au-dessus de sa
  version, en même temps que le code de compatibilité qu’il couvre, jamais avant.

Le jeu 11.0 est sorti de la fenêtre et reste en place : `validation-contrat.mjs`
garde le code qui lit la 11.0, et `refus-enregistres.test.mjs` mesure ce code
sur lui. Il disparaît avec ce code.

Il n’est pas publié : `files` du kit ne l’inclut pas.

`packages/kit/fixtures/tokens/origine/` pose la même question à `tokens.json`.
Il porte un fichier de la forme d'origine, antérieure à la version `1` du
format de tokens, produit par le moteur d'avant cette version depuis le mock
du producteur. Les tests du kit le lisent pour l'état `origine`. Les trois
bornes du corpus de contrats valent pour lui : aucun test permanent ne le
compare à une sortie du moteur ; il n'est jamais rafraîchi, et son empreinte
SHA‑256 est dans le README voisin ; il disparaît avec le code qui lit la forme
d'origine, jamais avant. Il n'est pas publié non plus.

`packages/plugin-exporter/tests/dtcg-2025.10/` porte le schéma du module Format DTCG
`2025.10`, tel que designtokens.org le sert, avec son empreinte.
`conformiteDtcg.test.ts` y juge chaque feuille des exports du fichier simulé et
fixe les chemins exacts du dialecte. Il ajoute les contrôles que le schéma ne
porte pas : marque à la racine, alpha, unité `px`, motif des segments. Le schéma
ne se rafraîchit pas : le remplacer suit la décision de viser une autre version
du module. `styleDictionary.test.ts` passe le même export sérialisé à Style
Dictionary, à la version exacte des `devDependencies` du plugin. Il refuse
`[object Object]`, une propriété absente, une référence non résolue et une valeur
vide. Il ne lit pas la configuration du Playground, dont la preuve est son
propre build.

`packages/plugin-exporter/tests/lois.ts` est l’unique autorité sur les lois de forme d’un
contrat, et `packages/plugin-exporter/tests/exportComponent.test.ts` les applique à chaque
contrat que le moteur fabrique : renvois qui se résolvent, catalogues sans doublon ni entrée
orpheline, adresses (slotPath de typographie, chemins de peintures,
`icons.*.slot`) qui désignent un calque de l’arbre qui les porte, absence de
valeur neutre écrite, résolution de chaque clé de couleur vers un rôle de la
bonne nature, `inset` réservé aux calques hors du flux, `textOverflow` publié
seulement avec son `lineClamp`, accord avec le schéma publié, aller-retour de
l’écriture.

La vérification est posée sur le chemin d’appel, une fois, et non à chaque
scénario : un cas ajouté demain y est soumis sans que personne y pense, et une
loi ajoutée à `lois.ts` s’applique du même geste à tous les cas existants.
Le même endroit porte la seule question que le schéma ne peut pas trancher
seul : accepte-t-il ce que le moteur écrit, et non ce que `types.ts` déclare ?
Un champ requis qu’une élision retire passe le compilateur et casse le
consommateur.

### La frontière de recette

Tout ce qui précède se prouve ici, hors de Figma et hors des forges. `npm test`
couvre le moteur sur ses propres sorties, les lecteurs sur des contrats
fabriqués, le CLI et l’adaptateur sur des fixtures, et `packages/cli/tests/`
`recette.test.mjs` sur des repositories temporaires, dont le cas nominal n’a
même pas de `package.json`. Aucun de ces tests n’ouvre un clone voisin.

Ce qui ne se prouve pas ici : **Figma, une forge et une vraie demande de
fusion**. Ces trois-là se rejouent dans
[UCM-Playground](https://github.com/Vassili-g/UCM-Playground) pour GitHub, et
dans le projet GitLab de recette pour GitLab. UCM-Playground est une application
React qui ne porte aucun script UCM à elle. Son empreinte du produit se limite
aux huit fichiers qu’`ucm init` écrit et aux lignes qu’il demande d’ajouter,
dont `@ucm-kit/cli` en `devDependencies`, ce qui rend la recette probante : un
contrôle qui manque là-bas se referme ici, jamais par un script rendu au
consommateur. [docs/guides/RECETTE.md](./docs/guides/RECETTE.md) porte la marche à suivre, ses
critères de fin et le geste de publication qui la suit.

Aucun contrôle ne la réclame et `publish.yml` ne la mentionne pas : le numéro
publié est gardé par `npm test`, par l'épreuve du registre et par le contrôle
des pins servis. La rejouer est une décision du mainteneur.

## Publier les paquets

Monter un numéro de version ne publie rien. `publish.yml` se déclenche à la
main, un paquet par exécution :

```sh
gh workflow run publish.yml -f paquet="@ucm-kit/core"
gh workflow run publish.yml -f paquet="@ucm-kit/cli"
gh workflow run publish.yml -f paquet="@ucm-kit/adapter-typescript"
```

**L'agent lance ces commandes lui-même.** Publier termine le geste qui monte un
numéro. Rendre la main au mainteneur pour cette seule étape laisse le registre
en retard sur les documents, qui épinglent déjà la version montée. Attendre la
fin de chaque exécution avant la suivante, par `gh run watch <id>`.

L'ordre compte quand plusieurs paquets montent ensemble. `@ucm-kit/cli` et
`@ucm-kit/adapter-typescript` épinglent `@ucm-kit/core` à l'exact, donc le
noyau part le premier.

**Une exécution intermédiaire finit rouge, par construction.**
`scripts/pins-servis.mjs` tourne après la publication et exige que toutes les
versions épinglées par la documentation soient servies ; tant qu'un paquet de
la série n'est pas parti, son pin manque. Seule la dernière exécution passe au
vert. Le paquet publié se constate par `npm view <paquet>@<version> version`,
jamais par la couleur du run.

Une version ne se publie qu'une fois. Relancer sans monter le numéro rend 409,
qui est le comportement voulu.

## Limites d’environnement

- L’agent ne peut pas exécuter l’export dans Figma. Une validation runtime
  nécessite un réexport utilisateur.
- Le réseau du plugin est limité à `https://api.github.com` et
  `https://gitlab.com`.
- La configuration du dépôt est facultative ; toute erreur conserve un
  téléchargement local.
- Le plugin ouvre une demande de fusion par artefact et ne fusionne jamais
  automatiquement.

Avant de terminer une modification, relire les documents directement affectés
et retirer toute description devenue fausse ou dupliquée.
