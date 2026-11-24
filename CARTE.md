# Carte : racine

## docs/
La documentation classée par sujet.

- README.md : sommaire par profil de lecteur, et table des autorités
- format/ : forme publiée, sa compatibilité et son historique
- guides/ : geste du designer, recette externe, kit de règles et modules consommateurs

## docs/references/
- README.md : trois couches, licences, fraîcheur et commandes des guides de composants
- systemes.json : registre des 18 références, rôles et modes
- design-systems/ : noms et valeurs des tokens de 15 systèmes du marché, figés par SHA-256, et noms d'UCM
- _outils/ : `guide.ts` (`etat`, `relever`, `verifier`, `rendre`), schémas de l'index, des fiches et des guides, gabarit HTML

## docs/inventaire/
L'inventaire du dépôt, vue générée sans autorité : chaque section nomme le fichier qui définit ce qu'elle montre.

- ../../INVENTAIRE-UCM.html : la page générée, commitée à la racine du dépôt ; `tests/inventaire.test.ts` la compare à `genererInventaire`
- generer-inventaire.ts : `genererInventaire` (asynchrone : la CLI se lit par `import()`) assemble `gabarit.html`, `page.css` et `page.js` ; un `{{nom}}` sans valeur échoue (`npm run vues`)
- releves.ts : ce que la page lit dans le kit compilé (à travers un `Proxy` qui relève chaque nom lu), le moteur de couleur, la CLI, le socle et les fichiers du dépôt ; valide `pistes.json` et `decisions.json`
- couverture.ts : `EXCLUSIONS`, les noms que la page ne montre pas exprès, un groupe par raison
- plans.ts : lit un plan Markdown (lots, marques, hash, groupe), son état, son lot suivant et la date de son dernier lot
- extraire.ts : une section, un tableau ou des sous-titres d'un Markdown, par son titre
- gabarit.html : le texte de la page écrit à la main, avec ses trous `{{nom}}`
- page.css : feuille de la page
- page.js : script de la page : panneau des variables, trajet du Button, feuille de route, filtres, destinataires
- package.json : marque le dossier en ESM, pour que `npm run vues` charge le générateur
- sources.json : les fichiers dont la page dépend, lus par `npm run agents:diff` (« Vues à régénérer »)

## docs/notes/
- Archives/ : notes archivées
- Recherches/ : recherches et plans en cours
- baseline-prose.json : mesure de référence du volume de la prose, écrite par `scripts/mesurer-prose.mjs`

## .agents/
- domiciles.json : manifeste des domiciles, des domaines d'invariants et des cartes

## .agents/skills/
Procédures qu'un agent charge à la demande.

- consommer-contrat/ : reconstruire un composant depuis son seul contrat
- guide-composant/ : écrire le guide d'un composant d'après les design systems du marché
- publier-paquets/ : publier les paquets du kit après une montée de version
- rediger-diagnostics-ucm/ : écrire un message que le designer peut suivre
- rediger-pour-agents/ : écrire les fichiers lus par les agents dans la forme compacte du dépôt
- relire-le-style/ : liste de relecture du style et paires avant/après

## scripts/
- construire-plugin.mjs : construit, ouvre en galerie ou teste un paquet après le kit
- empreinte-du-kit.mjs : empreinte des sources compilées du kit, écrite dans `dist`
- controle-style.mjs : règles de style à deux niveaux (refus, signal), pour le test et pour les hooks
- hook-style.mjs : même contrôle, au moment où un agent écrit un fichier
- hook-reponse.mjs : motifs de refus communs, appliqués à la dernière réponse d'un agent (`Stop`, `SubagentStop`)
- hook-documents.mjs : refuse qu'un agent crée un document Markdown hors du registre
- mesurer-prose.mjs : volume de la prose, document et commentaire
- pins-servis.mjs : versions que le registre sert
- run-tests.cjs : découvreur de tests
- agents-contexte.mjs : documents à lire avant de modifier un fichier et à relire après, calculés depuis `.agents/domiciles.json`
- nouveau-sujet.mjs : `npm run sujet`, crée le dossier de recherche d'une piste, son motif au registre, sa ligne du sommaire et le champ `recherche` de `pistes.json`
- archiver-sujet.mjs : `npm run sujet:archiver`, propose garder, relire ou supprimer pour chaque fichier du dossier d'une piste livrée ; `--figer` réécrit les liens vers un commit
- vues.mjs : `npm run vues`, reconstruit le kit si besoin et régénère la planche, les données de la vue illustrée et l'inventaire
- ouvrir-inventaire.mjs : `npm run inventaire`, génère la page de l'inventaire depuis l'arbre de travail dans le dossier temporaire du système, puis l'ouvre ; la page commitée ne change pas
- verifier-conservation.mjs : garde de conservation de la réécriture d'`AGENTS.md`

## .claude/
- settings.json : hook d'écriture sur Write et Edit, hook de réponse sur Stop et SubagentStop

## .github/workflows/
- ci.yml : intégration continue
- publish.yml : publie sans jeton

## tests/
Les tests du monorepo lui-même.

- docLinks.test.ts : liens et ancres de la documentation
- plans.test.ts : lecture des lots, marques et hash d'un plan
- dossiersDeRecherche.test.ts : un sujet, un dossier au registre et au sommaire, au plus un plan non livré par dossier
- archiverSujet.test.ts : propositions et liens figés du calcul de l'archivage
- ouvrirInventaire.test.ts : `npm run inventaire` écrit une page complète hors de la racine
- plansDeRecherche.test.ts : hash cités par les plans existants, dépôts connus, marques `attend Pn` vers une piste non livrée, chaque `PLAN*.md` rattaché à une piste ou à `PLANS_SANS_PISTE`
- ecrituresDesAidesJugees.test.mjs : chaque écriture `propriete: valeur` de la section « Écriture par défaut » des aides de `packages/cli/aides/` passe `jugerDeclaration`, et chaque propriété qui y reçoit un token figure dans `PROPRIETES_PAR_FAMILLE`
- domiciles.test.ts : chaque fichier de `packages/*/src/` a un seul domicile dans `.agents/domiciles.json`
- finsDeLigne.test.mjs : aucun fichier texte en CRLF dans l'index
- registreDesDocuments.test.ts : chaque document Markdown du dépôt a un emplacement dans le registre de `.agents/domiciles.json`
- verifierConservation.test.mjs : garde de la réécriture d'AGENTS.md relève et compare ses atomes
- iconesDuKit.test.ts : un tracé d'icône s'écrit seulement dans `signes.ts` du kit et `FORMES` du socle ; une exception se déclare avec son motif
- inventaireInvariants.test.ts : accord des fichiers d'invariants avec le code, dans les deux sens
- textesEcrits.test.mjs : aucun catalogue de textes des plugins ne porte `TODO(texte)`
- copiesDocumentees.test.ts : copies du code dans la documentation (familles, rendu, version du contrat, nombres)
- pluginsSombres.test.mjs : les trois plugins sont sombres
- cartes.test.ts : chaque chemin des cartes existe, et la section `tests/` liste exactement les tests de `tests/`
- referencesComposants.test.ts : registre des systèmes, extraction des noms et valeurs, schémas, guide d'essai et données réelles de `docs/references/`
- styleDocumentaire.test.ts : tics de rédaction refusés sur tout le dépôt, hors `EXCLUS_DU_CONTROLE`
- extraireInventaire.test.ts : `docs/inventaire/extraire.ts` rend une section, un tableau ou des sous-titres d'un Markdown, et lève sur un titre absent
- inventaire.test.ts : la page de l'inventaire commitée égale la page régénérée, reste autonome sous 1 Mo, montre ou exclut chaque élément de ses univers (exports du kit, paquets, dossiers, skills, commandes, codes), et chaque source de `docs/inventaire/sources.json` désigne un fichier
- styleMotifs.test.ts : chaque motif de style, le niveau refus ou signal, les hooks d'écriture et de réponse
- pinDocumente.test.mjs : versions montrées par une commande copiable
- registrePortableDocuments.test.ts : aucun document portable ne promet une stack
- versionSuitLeContenu.test.mjs : un numéro publié annonce bien ce qu'il publie
- monorepoCoherent.test.mjs : chaque paquet lit le kit d'à côté, jamais le registre
- kitCompileAJour.test.mjs : un plugin ne se construit pas sur un kit compilé périmé
- portesDocumentees.test.mjs : chaque porte publique du kit est décrite dans son README
- modulesParLaPrise.test.mjs : un paquet qui se déclare module (`"ucmModule": true`) importe le kit par `@ucm-kit/core/modules` seulement, à la version exacte de la CLI
- pluginsSepares.test.ts : aucun des trois plugins n'importe un autre
- referentielUnique.test.ts : aucune liste littérale ne recopie une donnée du référentiel, dans les paquets, `tests/` et `docs/inventaire/*.ts`
- reglesUniques.test.ts : une règle que porte une fonction unique n'est recopiée nulle part
- vueIllustree.test.ts : vue illustrée montre le référentiel d'aujourd'hui
- corpusUcm.test.ts : noms, registres et empreintes du corpus UCM suivent leurs sources
- manifestsDesPlugins.test.ts : chaque plugin a son propre `id` de manifest
- nomsDePalettes.test.ts : aller-retour : Nomenclature renomme les palettes que Palettes a écrites, et le plan de Palettes ne renomme plus rien
- guideDuKitDeRegles.test.ts : guide du kit de règles cite les maîtres, calques, sections et marqueur de la grammaire du kit
- axesDeModes.test.ts : le socle et l'exporteur appellent `deciderAxesDesCollections` du kit et retiennent les mêmes axes de modes, avant et après un renommage de collection
- loisEntreProduits.test.ts : huit lois entre Palettes et UCM Architect (renommage et lecture), pour chaque convention de nommage ; ses fabriques sont dans `fabriquesDeFichiers.ts`
