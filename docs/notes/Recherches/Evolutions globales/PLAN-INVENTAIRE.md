# Plan d'implémentation de l'inventaire généré

L'inventaire d'UCM Toolkit devient une vue générée dans `docs/inventaire/`, au même rang que le hub, la planche du moteur et la vue illustrée. Il n'a autorité sur rien : chaque section affiche « Défini dans » et le fichier source. Le plan applique les 13 recommandations acceptées par le mainteneur. Les pistes de la feuille de route et les décisions vivent dans ce dossier, dans `pistes.json` et `decisions.json`.

Chaque case cochée porte le hash du commit qui la livre.

## Stratégie de coût

- Un agent reçoit la note de son lot, la sortie de `npm run agents:lire -- <chemins>` et ses critères de fin, rien d'autre.
- Deux agents au plus en même temps. Deux lots qui touchent le même fichier ne tournent jamais ensemble.
- Les lots indépendants de la page (code du kit, outillage) partent pendant la refonte de la page.
- Un implémenteur lance seulement les tests ciblés de son lot. Un `verificateur` (Haiku) lance `npm test`, `npm run typecheck` et `npm run build` une fois par phase.
- La page de 200 Ko n'est lue en entier que par les lots qui la transforment (R1, R2, G1). Les autres lisent leurs fichiers.
- La montée de version du kit et de la CLI se fait une seule fois, au lot P1. D'ici là, `tests/versionSuitLeContenu.test.mjs` échoue après C1 : c'est attendu.
- La conversation principale relit chaque diff, lance `npm run agents:diff` et commite par chemins explicites.

## Phase R : refonte de la page locale

La page vit dans `_local/inventaire-ucm/INVENTAIRE-UCM.html` tant qu'elle n'est pas générée.

- [x] R1 (page locale, hors Git). Structure, textes, termes, marques à trois destinataires, erreurs relevées, extrait de contrat, tableau « Qui contrôle quoi ». Agent : `implementeur-exigeant`.
- [x] R2 (page locale, hors Git). Trajet du Button, rapport d'`ucm check`, cycle d'une demande, panneau des 7 collections avec menu latéral, feuille de route comme outil de décision, piste P21, annexes visuelles (icônes, marque, références, outillage), retours de design. Agent : `implementeur-exigeant`. Après R1.

## Phase C : catalogues dans le code

- [x] C1 (0822b7eb). Catalogue des codes de constat et commandes de la CLI. Agent : `implementeur-exigeant` (23 fichiers lisent les codes). Pendant R1.
  - [ ] C1.1. `packages/kit/src/controles/codes.ts` exporte `CODES_DES_CONSTATS` : code, familles (un code peut en avoir plusieurs), types possibles, sens en une phrase. Le type `CodeDeConstat` remplace `` `C${number}` `` dans `constat.ts`.
  - [ ] C1.2. Un test relève les littéraux `code: 'Cnn'` de `packages/kit/src/` et de `packages/plugin-architect/src/` et les trouve tous au catalogue.
  - [ ] C1.3. `ELEMENT_DE_LA_FAMILLE` de `packages/plugin-architect/src/ui/panneau/elements.ts` est exporté.
  - [ ] C1.4. `packages/cli/src/ucm.mjs` exporte `COMMANDES`, d'où l'aide se construit sans changer sa sortie.
  - Fin : `npm run test --workspace @ucm-kit/core`, `npm run test:paquet -- architect`, `npm run test:paquet -- cli` et `npm run typecheck` passent. La sortie de `ucm --help` est identique.

## Phase O : outillage des vues

- [x] O1 (ea201dd3). Extraction, style des JSON, rappel des vues. Agent : `implementeur`. Après C1, pendant R2.
  - [ ] O1.1. `docs/inventaire/extraire.ts` lit une section d'un Markdown par son titre et lève « ancre X absente de Y ». Test sur des chaînes de fixture.
  - [ ] O1.2. `scripts/controle-style.mjs` reçoit le juge `fautesDuJson`, qui parcourt les chaînes des JSON listés (`docs/inventaire/textes.json`, `pistes.json`, `decisions.json` de ce dossier). Une note du mainteneur (`decisions.json`, champ `note`) reste hors contrôle. Test dans `tests/styleMotifs.test.ts`.
  - [ ] O1.3. `diff()` de `scripts/agents-contexte.mjs` rend une 5e liste « Vues à régénérer », lue dans `docs/inventaire/sources.json` quand le fichier existe. `npm run vues` entre aux vérifications du domaine `explorateur` de `.agents/domiciles.json`.
  - Fin : `npx tsx --test tests/styleMotifs.test.ts tests/domiciles.test.ts` et le test d'`extraire.ts` passent. `npm run agents:diff` tourne sans `sources.json`.

## Phase G : génération

- [x] G1 (5df9c3ba). Page générée depuis le code. Agent : `implementeur-exigeant`. Après R2 et O1.
  - [ ] G1.1. `docs/inventaire/generer-inventaire.ts`, `page.css` et `page.js`, sur le modèle de `packages/couleur/planche/generer-planche.ts` : fonction pure, écriture au seul lancement direct, textes rendus en HTML statique, page autonome.
  - [ ] G1.2. Données du code à la place des constantes recopiées : `donneesDuReferentiel()` exportée de `Archi Tokens Multi-marques/generer-donnees-referentiel.ts`, table du thème, garanties, clarté des crans, rampes des palettes de démonstration, registres, signes, produits, versions, points d'entrée et exports, paquets, aides, skills, design systems, `CODES_DES_CONSTATS`, `COMMANDES`. Hash de commit et comptes de lignes retirés.
  - [ ] G1.3. Extraits de `ROADMAP.md`, `CONCEPT.md`, `CHANGELOG-FORMAT.md`, `COMPATIBILITE.md` et du sommaire des recherches par `extraire.ts`.
  - [ ] G1.4. Deux entrées dans `VUES` de `scripts/vues.mjs` : la page et `docs/inventaire/sources.json`. `tests/inventaire.test.ts` vérifie la fraîcheur, l'autonomie (seuls `url(data:` et `url(#`), la taille sous 1 Mo. Une ligne dans `CARTE.md`. `tests/referentielUnique.test.ts` balaie aussi `docs/inventaire/*.ts`.
  - Fin : un second `npm run vues` ne change rien, un octet changé dans la page fait échouer le test, `npx tsx --test tests/inventaire.test.ts tests/cartes.test.ts tests/styleDocumentaire.test.ts tests/referentielUnique.test.ts tests/vueIllustree.test.ts` passe.
- [x] G2 (5df9c3ba). Données éditoriales et couverture. Agent : `implementeur`. Après G1.
  - [ ] G2.1. `pistes.json` et `decisions.json` dans ce dossier. Les règles décidées et les décisions transverses viennent de `decisions.json`, clé `regles`, avec `domicileCible` et `ecrite`. Les textes restent dans `docs/inventaire/gabarit.html`, que le contrôle de style lit déjà : pas de `textes.json`. Les nombres des textes du gabarit sont des trous remplis depuis le code.
  - [ ] G2.2. `docs/inventaire/couverture.ts` et ses `EXCLUSIONS` nommées une par une. Le générateur lit le kit à travers un `Proxy`. Le test refuse un export sans place, une exclusion d'un nom montré ou disparu, une source qui n'existe pas.
  - Fin : un export ajouté au kit sans place fait échouer `tests/inventaire.test.ts` avec son nom. Un tiret cadratin dans `textes.json` est refusé.
- [x] G3 (33d54de6). Décisions versionnées. Agent : `implementeur`. Après G2.
  - [ ] G3.1. La page compare `decisions.json` embarqué et le `localStorage`, et affiche « N décisions pas encore dans le dépôt ».
  - [ ] G3.2. « Enregistrer dans le dépôt » écrit `decisions.json` par `showSaveFilePicker`, avec téléchargement en repli. « Revenir à la version du dépôt » efface l'écart local.
  - [ ] G3.3. Le générateur refuse un identifiant de piste inconnu et un choix hors `oui`, `non` ou vide.
  - Fin : test Node de la validation. Essai du mainteneur dans son navigateur.

## Phase P : liens et publication

- [ ] P1. Liens, version, publication. Agent : `implementeur` pour les liens, puis la skill `publier-paquets` dans la conversation principale.
  - [ ] P1.1. Liens vers `docs/inventaire/INVENTAIRE-UCM.html` dans `README.md`, `docs/README.md` (en tête et dans la table des autorités), `AGENTS.md` (une phrase sous 300 octets, et « Où écrire » pour les pistes et les décisions), `CONCEPT.md`, `ROADMAP.md`. Script `npm run inventaire` qui ouvre la page.
  - [ ] P1.2. Montée de version de `@ucm-kit/core` et `@ucm-kit/cli` (catalogue des codes, `COMMANDES`), puis publication.
  - Fin : `AGENTS.md` sous 12 288 octets, `npx tsx --test tests/domiciles.test.ts tests/docLinks.test.ts tests/styleDocumentaire.test.ts` passe, `npm test` passe en entier, paquets servis par le registre.

## Vérification de phase

Un `verificateur` lance `npm test`, `npm run typecheck` et `npm run build` à la fin des phases C, G et P, et rend un tableau des résultats.
