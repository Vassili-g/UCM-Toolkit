# Carte : racine

## docs/
La documentation classée par sujet.

- README.md : sommaire par profil de lecteur, et table des autorités
- format/ : forme publiée, sa compatibilité et son historique
- guides/ : geste du designer et recette externe

## docs/references/
- README.md : trois couches, licences, fraîcheur et commandes des guides de composants
- systemes.json : registre des 18 références, rôles et modes
- design-systems/ : noms et valeurs des tokens de 15 systèmes du marché, figés par SHA-256, et noms d'UCM
- _outils/ : `guide.ts` (`etat`, `relever`, `verifier`, `rendre`), schémas de l'index, des fiches et des guides, gabarit HTML

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
- vues.mjs : `npm run vues`, reconstruit le kit si besoin et régénère le hub, la planche et les données de la vue illustrée
- verifier-conservation.mjs : garde de conservation de la réécriture d'`AGENTS.md`

## .claude/
- settings.json : hook d'écriture sur Write et Edit, hook de réponse sur Stop et SubagentStop

## .github/workflows/
- ci.yml : intégration continue
- publish.yml : publie sans jeton

## tests/
Les tests du monorepo lui-même.

- docLinks.test.ts : liens et ancres de la documentation
- domiciles.test.ts : chaque fichier de `packages/*/src/` a un seul domicile dans `.agents/domiciles.json`
- finsDeLigne.test.mjs : aucun fichier texte en CRLF dans l'index
- registreDesDocuments.test.ts : chaque document Markdown du dépôt a un emplacement dans le registre de `.agents/domiciles.json`
- verifierConservation.test.mjs : garde de la réécriture d'AGENTS.md relève et compare ses atomes
- inventaireInvariants.test.ts : accord des fichiers d'invariants avec le code, dans les deux sens
- textesEcrits.test.mjs : aucun catalogue de textes des plugins ne porte `TODO(texte)`
- cartes.test.ts : chaque chemin des cartes existe, et la section `tests/` liste exactement les tests de `tests/`
- referencesComposants.test.ts : registre des systèmes, extraction des noms et valeurs, schémas, guide d'essai et données réelles de `docs/references/`
- styleDocumentaire.test.ts : tics de rédaction refusés sur tout le dépôt, hors `EXCLUS_DU_CONTROLE`
- styleMotifs.test.ts : chaque motif de style, le niveau refus ou signal, les hooks d'écriture et de réponse
- pinDocumente.test.mjs : versions montrées par une commande copiable
- registrePortableDocuments.test.ts : aucun document portable ne promet une stack
- versionSuitLeContenu.test.mjs : un numéro publié annonce bien ce qu'il publie
- monorepoCoherent.test.mjs : chaque paquet lit le kit d'à côté, jamais le registre
- kitCompileAJour.test.mjs : un plugin ne se construit pas sur un kit compilé périmé
- portesDocumentees.test.mjs : chaque porte publique du kit est décrite dans son README
- pluginsSepares.test.ts : aucun des quatre plugins n'importe un autre
- referentielUnique.test.ts : aucune liste littérale ne recopie une donnée du référentiel
- reglesUniques.test.ts : une règle que porte une fonction unique n'est recopiée nulle part
- vueIllustree.test.ts : vue illustrée montre le référentiel d'aujourd'hui
- corpusUcm.test.ts : noms, registres et empreintes du corpus UCM suivent leurs sources
- manifestsDesPlugins.test.ts : chaque plugin a son propre `id` de manifest
- nomsDePalettes.test.ts : aller-retour : Nomenclature renomme les palettes que Palettes a écrites, et le plan de Palettes ne renomme plus rien
- guideDuKitDeRegles.test.ts : guide du kit de règles cite les maîtres, calques, sections et marqueur de la grammaire du kit
- axesDeModes.test.ts : le socle et l'exporteur appellent `deciderAxesDesCollections` du kit et retiennent les mêmes axes de modes, avant et après un renommage de collection
- loisEntreProduits.test.ts : huit lois entre Palettes et UCM Architect (renommage et lecture), pour chaque convention de nommage ; ses fabriques sont dans `fabriquesDeFichiers.ts`
