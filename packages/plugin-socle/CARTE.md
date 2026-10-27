# Carte : plugin-socle

Ce que les plugins partagent : ucm-plugin-socle, privé, lu en source.

## ./
- galerie/ : banc de galerie, sa capture et décalque du thème Figma ; `planche.cjs` et `planche/` : la planche des signaux du langage et la planche des signes, leurs sources et leurs coques
- lois/ : lois des styles, du gabarit, du manifest et de la galerie, que le test de chaque plugin appelle
- tests/ : build, manifest, fenêtre, banc et loi des styles, pour un plugin quelconque

## build/
- inline-ui.cjs : du bundle et des feuilles de style à un HTML autonome
- manifest.cjs : manifest de distribution
- run-tests.cjs : découvreur de tests, que chaque plugin appelle

## src/
- fenetre.ts : taille bornée de la fenêtre, rangée dans clientStorage
- inventaireDeNoms.ts : acquisition de l'inventaire depuis Figma : ports de lecture, lecture par lots, lecture du suivi de Palettes ; forme de l'inventaire et protection sont dans `@ucm-kit/core/nommage`
- bibliotheque.ts : noms des variables des libraries activées (sans valeur), lus huit collections à la fois par `limiteur.ts`, et choix de la library la plus liée
- ui/ : bouton, onglets dont un peut être indisponible (désactivé, sauté par les flèches), interrupteur, chevron `Chevron.ts` (SVG qui tourne par CSS), feuille modale, poignée de redimensionnement, bouton « Configuration » (engrenage puis libellé), bascule de l'en-tête et composants du langage visuel (voir `## src/ui/`)

## src/composant/
- annonce.ts : le type `Annonce`, par lequel le moteur dit son étape sans dépendre de l'UI
- variables.ts : index commun, collisions et alias

## src/composant/analyse/
- acquisition.ts : copieurs de la mise en page scalaire d'un nœud (`layoutMode`, espacements, rayons, épaisseurs de contour) et de ses peintures (`fills`, `strokes`, avec une variante qui cède la main) en états de `faits.ts` ; lecture des segments de texte en une union de champs (`lireLesSegments`) et projection par lecteur avec fusion des plages voisines égales sur la valeur lue (`projeterLesPlages`) ; le relevé d'Architect, `contract/nodeBindings.ts`, `contract/extractSlotTokens.ts` et `contract/unsupportedProperties.ts` en tirent chacun leur projection
- ressources.ts : mémoire des variables, collections, styles et maîtres d'instance lus par identifiant, une lecture par id et par demande, rendus en `FaitDeRessource` (acquis, `leve`, `introuvable`) ; `lireUneFoisParIdentifiant` mémorise l'appel natif et son refus, que le moteur lit pour les styles et les maîtres ; relevé d'Architect (variables, collections, style nommé, maître copié en `MaitreLu`) et `VariableNameResolver` la consomment
- inventaires.ts : les inventaires d'une demande d'analyse, lus une fois pour tous ses lecteurs : collections et variables locales, scan des règles d'une page, libraries ; `creerInventairesDeLaDemande` crée l'objet que la demande oublie à sa fin
- limiteur.ts : `executerAuPlus`, les requêtes d'une liste connue au plus `REQUETES_EN_VOL` (huit) à la fois, résultats à leur rang, arrêt par `avant` ; libraries, vagues d'alias et modes d'Architect l'emploient
- topologie.ts : lecture de la topologie d'un jeu (jeu, enfants directs, descendants par `findAll`) avec sa couverture, et inventaire de péremption qu'Architect surveille ; un `children` ou un `findAll` qui lève devient un trou, une page non écoutée s'ajoute aux trous
- proprietesEtEtats.ts : première famille de requêtes pures, le modèle de propriétés (`props`) et le modèle d'états (`stateModel`) : entrées en paramètres, résultat et points à pousser dans l'ordre de l'ancien chemin, dépendances déclarées ; `parsers.ts` et `semantics.ts` ré-exportent ses points d'entrée
- resultat.ts : `calculerLAnalyse`, étapes `regles` à `structure.tailles` de l'analyse d'un composant, et son résultat interne (messages joints, parties, localisations, `props`, `stateModel`, imbriqués, règles, couverture, entrées de la publication) ; `joindreLesCanaux` joint les canaux dans l'ordre bloquants, principal, structure
- couverture.ts : matrice de couverture des événements, par entrée lue (`nodechange` sous condition de page, `stylechange` pour les styles locaux, ou relecture à chaque demande), et portée d'un changement reçu (sujet, hors sujet, inconnue) d'après l'inventaire, les ancêtres, les anciens parents (suppression, déplacement), les maîtres suivis ou les styles suivis ; `relecturesObligatoires` liste les ressources d'une acquisition à relire avant réutilisation et les maîtres qu'un événement couvre
- journal.ts : journal ordonné des changements de nœuds et de styles reçus (type, identifiant, propriétés, identifiant du parent à la réception, sans objet Figma), avec curseur, oubli par curseur, débordement à une borne et interruptions d'écoute de page (`couvertureDepuis`), écritures du plugin (`ecritureDepuis`)
- session.ts : la session d'analyse, une entrée par sujet : sorties des lecteurs, requêtes pures avec le nom de leurs entrées, suivi de l'acquisition (curseur, inventaire, couverture) ; types génériques, aucun champ d'état affiché (réponses, corrections fixées, identité de génération) ; marques d'invalidation à part de l'entrée, levées par la promotion qui la remplace
- invalidations.ts : `raisonsDInvalidation`, les raisons (sujet touché, portée inconnue, style, écriture, page interrompue, journal débordé) pour lesquelles une entrée de session ne tient plus, lues dans le journal depuis un curseur et dans le suivi retenu, sans Figma ; les changements de nœuds se rejouent dans l'ordre avec leurs anciens parents
- validation.ts : `egalesExactement`, égalité exacte de deux sorties lues (ordre des listes, des clés, des `Map` et `Set` compris, `Object.is` pour les primitives, identité pour un objet qui n'est pas simple), et `ecartsDesSorties`, les sorties relues qui diffèrent de leur version retenue ; Architect en tire la validation d'une entrée de session avant réutilisation
- retention.ts : les bornes de la session d'analyse (sujets, octets estimés, arêtes) et `estimerLesOctets`, estimation pure, déterministe et plafonnée ; `session.ts` évince le moins récent, jamais le sujet rangé, et ne retient pas un sujet qui dépasse seul une borne
- revisions.ts : la révision de travail d'une demande d'analyse : contenu préparé hors de la session, promu seulement quand l'appelant le dit valide, sinon jeté ; la session garde l'entrée d'avant
- requetes.ts : l'ossature des requêtes pures incrémentales : clé d'une requête (nom, arguments en forme canonique, session du document, version d'algorithme, jamais la génération d'interface ni l'identité d'analyse) et registre de révisions (révision globale, `revisionVerifiee` et `revisionChangee` par valeur ; un fait ou un résultat égal exactement ne monte rien) ; sans dépendances ni validation à la demande
- faits.ts : faits ordinaires d'une analyse, sans type Figma : topologie, champs acquis, mixtes, refusés ou non demandés, segments, maîtres, ressources, provenance et couverture

## src/composant/contract/
- exportComponent.ts : orchestration : `calculerLAnalyse`, puis `publierLeContrat` sauf avec l'option `publier: false`
- publication.ts : `publierLeContrat`, qui écrit le contrat depuis le résultat interne : échantillons, compaction, métadonnées, élision, signatures, sérialisation, `ComponentExport`
- componentTree.ts : axes, matrice et wrapper de layout
- compactVariants.ts : catalogue par partie de vue, et liaisons exactes
- elideNeutrals.ts : ce que le contrat n’écrit pas : null, {} et []
- serializeJson.ts : une entrée par ligne, sur deux niveaux
- layoutNodes.ts : élection du node de layout, une fois par variant
- exportableNodes.ts : parcours de l'arbre, hors dépendances composées
- porteeDAnalyse.ts : mémoire des maîtres par instance, des styles par identifiant (`styleDeLaPortee`, `ressources.ts`), des peintures copiées par nœud et champ (`peinturesDuNoeud`), des champs lus par nœud (`champDuNoeud`, `etatDuChamp` : `name`, `layoutMode`, `boundVariables`, `layoutPositioning`), des plages de texte par nœud (`plagesDuNoeud` : un appel pour `listOptions` et `textStyleOverrides`) et du parcours brut, du parcours filtré et des chemins de texte par racine, et budget coopératif injectable partagé avec les lecteurs
- mesure.ts : trace de chaque analyse : durées, compteurs, avancement de la barre
- budget.ts : budget de layers et préfixe admis, voies synchrone et coopérative du même parcours
- parsers.ts : propriétés Figma → API publique (le modèle est dans `analyse/proprietesEtEtats.ts`)
- merge*.ts : doc et icônes des règles, rangées sur leur axe
- rulesModel.ts : modèle pur des règles d’usage
- semantics.ts : vocabulaire sémantique partagé
- colorKeys.ts : clé d'une couleur dans la feuille d'un variant
- structureTree.ts : qui est un conteneur, qui est une feuille
- textRendering.ts : propriétés de texte sans variable, en CSS
- unsupportedProperties.ts : ce qu'un calque publié porte et que le schéma ignore
- localisation.ts : le Constat : où, quoi, impact et action, séparés
- extract*.ts : structure, layout, tailles, tokens et règles
- flexLayout.ts : propriétés de flux et avertissements non portables
- extractSamples.ts : ce que la maquette montre, sans rien exiger
- slotNames.ts : nommage des slots et calques d'icônes
- slotRelations.ts : composition et visibilité dans un slot
- composedComponents.ts : dépendances entre composants
- nodeBindings.ts : groupes complets de liaisons Figma
- propertyBindings.ts : component properties situées dans chaque variant
- propertySurface.ts : surface publique élue : owner direct et wrapper

## src/composant/template/
- modele.ts : du contrat au modèle des règles à poser, sans Figma
- sources.ts : ce que le document offre, et les maîtres à copier
- ecriture.ts : le seul fichier qui écrive dans le document

## src/ui/
- socle.css : échelle de texte, trame, rôles de couleur et replis sombres, avant la feuille de chaque plugin
- langage.css : le langage visuel commun, après `socle.css` : rôles `--ton-*`, `--teinte-*` et de place, classes de chemin, jeton, alerte, changement, filtre, signe ; sa loi est dans `lois/styles.ts`
- Chemin.ts : chemin de token, chemin ou variant dans une phrase, segment qui part ou arrive, pastille de couleur
- Jeton.ts : jeton d'un renommage, flèche, mot de place
- Alerte.ts : les cinq types d'alerte, tirés de `TYPES_D_ALERTE` du kit : icône, gravité, alerte, liseré, pastille de compte, lien externe
- Changement.ts : colonnes et ligne de diff, ligne de réussite, carte ciblée
- Filtre.ts : puce de filtre et recherche active
- Signe.ts : la tuile d'un signe de `SIGNES` (kit) : taille 14, 16 ou 24 px, gris ou dans la teinte de sa famille, valeur de couleur de token dans la tuile
- PoigneeDeSeparation.ts : poignée entre deux vues
