# Plan de la Roadmap de l'inventaire (P25)

Ce plan remplace la section 7 de `INVENTAIRE-UCM.html`, « La suite », par la
Roadmap de la [maquette A2 v2](./maquettes/maquette-A2-v2.html). L'état de
chaque piste se calcule depuis son plan, et le champ `etat` disparaît. Le plan
pose aussi deux gardes : chaque sujet a son dossier de recherche, et chaque
sujet terminé s'archive par une skill. La [recherche](./RECHERCHE-ROADMAP.md)
porte les décisions du mainteneur, la convention des marques de cases et la
procédure d'archivage. Aucun lot n'est commencé.

## Ordre avec P6

Le plan de P6 (`docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md`)
écrit `docs/inventaire/*` au lot 3.2 et `pistes.json` au lot 4.4. Les vagues 1
et 2 de ce plan n'écrivent aucun de ces fichiers et peuvent commencer tout de
suite. La vague 3 commence après la case 4.4 de P6.

`CARTE.md` est partagé avec P6 (lots 2.3 et 3.3). Un lot de ce plan rend ses
lignes de carte dans son compte rendu, et la conversation principale les ajoute
au point de synchronisation, quand `git status` montre `CARTE.md` propre.

## Vagues

Une vague commence quand la précédente est commitée. Dans une vague, les lots
n'écrivent aucun fichier en commun, et ceux de la colonne « Fichiers écrits »
sont les seuls permis. Trois agents au plus travaillent en même temps.

| Vague | Lot | Agent | Fichiers écrits | Dépend de |
|---|---|---|---|---|
| 0 | 0.1 Recherche, piste et plan | conversation principale | ce dossier, `pistes.json`, `.agents/domiciles.json`, `docs/notes/Recherches/README.md`, `INVENTAIRE-UCM.html` | rien |
| 0 | 0.2 Réponses du mainteneur | mainteneur | `RECHERCHE-ROADMAP.md` (décisions) | 0.1 |
| 1 | 1.1 Lecture des plans | `implementeur` | `docs/inventaire/plans.ts` (créé), `tests/plans.test.ts` (créé) | 0.1 |
| 1 | 1.2 Un sujet, un dossier | `implementeur` | `tests/dossiersDeRecherche.test.ts` (créé), `scripts/nouveau-sujet.mjs` (créé), `scripts/hook-documents.mjs`, `package.json` (racine, clé `scripts`) | 0.1 |
| 1 | 1.3 Calcul de l'archivage | `implementeur` | `scripts/archiver-sujet.mjs` (créé), `tests/archiverSujet.test.ts` (créé) | 0.1 |
| 2 | 2.1 Gardes des plans | `implementeur` | `tests/plansDeRecherche.test.ts` (créé), `docs/notes/Recherches/Socle intencial-library/PLAN-SOCLE-INTENCIAL-LIBRARY.md` | 1.1 |
| 2 | 2.2 Skill d'archivage et règles | conversation principale | `.agents/skills/archiver-un-sujet/SKILL.md` (créé), `CONTRIBUTING.md`, `docs/notes/Recherches/README.md` | 1.2, 1.3, 0.2 |
| 2 | 2.3 `npm run inventaire` à jour | `implementeur` | `scripts/ouvrir-inventaire.mjs`, `tests/ouvrirInventaire.test.ts` (créé) | 0.1 |
| 3 | 3.1 Données et générateur | `implementeur-exigeant` | `docs/inventaire/releves.ts`, `docs/inventaire/generer-inventaire.ts`, `docs/inventaire/extraire.ts`, `docs/inventaire/sources.json`, `tests/inventaire.test.ts`, `tests/extraireInventaire.test.ts`, `pistes.json`, `decisions.json`, plan de P6 (une case) | case 4.4 de P6, vague 2 |
| 3 | 3.2 Interface de la Roadmap | `implementeur-exigeant` | `docs/inventaire/gabarit.html`, `docs/inventaire/page.js`, `docs/inventaire/page.css` | case 4.4 de P6, vague 2 |
| 3 | 3.3 Questions dans les recherches | `executant` | les sept documents de recherche listés au lot 3.3 | case 4.4 de P6 |
| 4 | 4.1 `ROADMAP.md` devient `VALIDATIONS-MVP.md` | `executant` | `ROADMAP.md` (renommé), les fichiers listés au lot 4.1 | vague 3 |
| 4 | 4.2 Fichiers d'agents | conversation principale | `AGENTS.md` | vague 3 |
| 5 | 5.1 Premier archivage, P19 et P21 | conversation principale | dossiers `Linter Dev/` et `Archi Tokens Multi-marques/`, `docs/notes/Recherches/README.md`, `.agents/domiciles.json`, `pistes.json`, `tests/plansDeRecherche.test.ts` (exceptions) | vague 4 |
| 5 | 5.2 Confirmation de la suppression | mainteneur | rien | 5.1 |
| 5 | 5.3 Clôture | conversation principale, `verificateur` | ce plan, `RECHERCHE-ROADMAP.md`, `docs/notes/Recherches/README.md`, `INVENTAIRE-UCM.html` | 5.2 |

Fichiers que deux lots de vagues différentes écrivent, dans l'ordre :
`pistes.json` (0.1, 3.1, 5.1), `docs/notes/Recherches/README.md` (0.1, 2.2,
5.1, 5.3), `.agents/domiciles.json` (0.1, 4.1, 5.1),
`tests/plansDeRecherche.test.ts` (2.1, 5.1). Le chemin de `pistes.json` et de
`decisions.json` est `docs/notes/Recherches/Evolutions globales/`.

## Règles d'exécution

| Travail | Agent |
|---|---|
| Relecture des diffs, commits, fichiers d'agents, skill, archivage | conversation principale |
| Lot de code à périmètre fixé | `implementeur` |
| Lot qui touche plusieurs lecteurs d'une même donnée, ou une interface au pixel près | `implementeur-exigeant` |
| Remplacement listé, déplacement de texte | `executant` |
| `npm run agents:diff`, `npm run vues`, `npm test`, `npm run typecheck` | `verificateur` |

- Le prompt d'un lot contient, et rien d'autre : la note du lot, la nature de la tâche, sa ligne « Fichiers écrits » et la sortie de `npm run agents:lire -- <fichiers écrits du lot>`. Le lot 3.2 reçoit aussi le chemin de la maquette A2 v2.
- L'agent lance `git status` d'abord. Un fichier de son lot modifié hors de ce plan l'arrête, et il rend la question.
- L'agent lance seulement les tests de ses fichiers, par `npx tsx --test <fichier>`, puis `npm run typecheck`. Il ne lance ni `npm run vues` ni `npm test` à la racine. Aucun agent ne lance `test:ui`, et aucun agent ne commite.
- Un agent rend ses lignes de carte (`CARTE.md`, `- <nom> : <rôle>`) dans son compte rendu.
- Le seul échec admis dans un compte rendu est la fraîcheur de `tests/inventaire.test.ts` (« La vue n'est plus à jour »).

### Point de synchronisation

À la fin de chaque vague, la conversation principale :

1. relit le diff de chaque lot contre sa note ;
2. ajoute les lignes de carte rendues par les agents ;
3. fait lancer par un `verificateur`, dans cet ordre : `npm run agents:diff`, `npm run vues`, `npm test`, `npm run typecheck` ;
4. commite chaque lot par chemins explicites, avec `INVENTAIRE-UCM.html` dans le dernier commit de la vague ;
5. coche les cases avec leur hash, fait relancer `npm run vues`, commite ce plan et la page (`docs(recherches): P25, cases de la vague <n>`), puis pousse.

## Vague 0

- [x] 0.1 Conversation principale. Commiter ce dossier, la piste P25 de `pistes.json`, le motif du registre, la ligne du sommaire et `INVENTAIRE-UCM.html` régénéré. Commit : `8f76a1fc`
- [ ] 0.2 (mainteneur). Répondre aux cinq questions de la [recherche](./RECHERCHE-ROADMAP.md#questions-au-mainteneur).

## Vague 1

- [ ] 1.1 `implementeur`. Lecture des plans. Commit : `…`
- [ ] 1.2 `implementeur`. Un sujet, un dossier. Commit : `…`
- [ ] 1.3 `implementeur`. Calcul de l'archivage. Commit : `…`

### Lot 1.1. Lecture des plans

Nature : module pur nouveau, sans appelant avant le lot 3.1.

`docs/inventaire/plans.ts` n'importe que `node:path`. Il exporte :

- `lireLePlan(texte: string): Lot[]`. Un lot est une ligne `- [ ]` ou `- [x]` de premier niveau (aucune indentation). `[X]` vaut `[x]`, `*` et `+` valent `-`. Une case indentée ne compte pas. Une ligne dans un bloc de code ne compte pas. Le groupe d'un lot est le texte du dernier titre `##` qui le précède, sans le numéro de tête (`## Vague 2` donne `Vague 2`).
- `Lot` : `{ groupe, numero, fait, hashes, marque, texte }`. `numero` est le premier mot après la case, sans point final. La parenthèse qui suit le numéro porte les marques, séparées par des virgules : un hash de 7 à 40 caractères hexadécimaux, `depot@hash`, `mainteneur`, `attend Pn`. Un autre texte de la parenthèse est ignoré (`publiés : core 0.17.1`). `hashes` vaut `[{ depot: string | null, hash }]`. `marque` vaut `'mainteneur'`, `{ attend: 'Pn' }` ou `null`. `texte` est la première phrase après la parenthèse, sans les noms d'agents de tête (`implementeur`, `implementeur-exigeant`, `executant`, `verificateur`, `Conversation principale`, `Décision du mainteneur`) ni les liens Markdown, coupée à 90 caractères avec `…`.
- `etatDuPlan(lots)` : `{ faits, total, livre }`, `livre` quand `total > 0` et que tous les lots sont faits.
- `lotSuivant(lots)` : le premier lot non fait sans marque, ou `null`.
- `dateDuDernierLot(lots, dateDuCommit: (hash) => string | null)` : la date la plus récente des hashes locaux (`depot === null`) des lots faits, ou `null`.

`tests/plans.test.ts` porte les cas de test « Lecture des plans ».

### Lot 1.2. Un sujet, un dossier

Nature : un test de garde, un script et un message de hook.

`tests/dossiersDeRecherche.test.ts` lit `.agents/domiciles.json` (clé
`registre`), `docs/notes/Recherches/README.md` et `pistes.json`. Il vérifie :

- chaque dossier de premier niveau de `docs/notes/Recherches/` a le motif `docs/notes/Recherches/<dossier>/**` au registre et un lien `./<dossier encodé>/` dans le sommaire ;
- chaque `recherche` et chaque `plan` d'une piste vit sous `docs/notes/Recherches/<dossier>/` ;
- un `plan` ne vit pas dans `Evolutions globales/`, le dossier du catalogue ;
- un dossier porte au plus un `plan` de piste non livrée, l'état livré venant de `lireLePlan` du lot 1.1 si le lot est commité, sinon d'un comptage simple des cases à remplacer au lot 3.1.

Chaque échec nomme le dossier ou la piste et le geste qui le corrige :
« Lancez `npm run sujet -- "<Nom>" <Pn>` ».

`scripts/nouveau-sujet.mjs`, lancé par `npm run sujet -- "<Nom du dossier>" <Pn> "<utilité>"` :

- refuse un nom déjà pris, une piste inconnue, ou une piste qui a déjà une `recherche` ;
- crée `docs/notes/Recherches/<Nom>/RECHERCHE-<NOM EN MAJUSCULES SANS ESPACE>.md` avec un titre et une section `## Questions au mainteneur` vide ;
- ajoute le motif au registre, avant `docs/notes/Recherches/README.md` et dans l'ordre alphabétique des dossiers ;
- ajoute la ligne du sommaire après la dernière ligne de la table « Sujets », statut « Recherche en cours », et sa référence de lien ;
- renseigne `recherche` dans `pistes.json` en gardant l'indentation de deux espaces et la fin de ligne ;
- affiche les quatre fichiers touchés et la commande `npm run vues`.

`scripts/hook-documents.mjs` : pour un chemin sous `_local/`, le message de
refus dit « Une recherche vit dans `docs/notes/Recherches/<sujet>/`. Lancez
`npm run sujet`. » Le reste du hook ne change pas.

`package.json` à la racine gagne `"sujet": "node scripts/nouveau-sujet.mjs"`.

### Lot 1.3. Calcul de l'archivage

Nature : script nouveau, la part calculable de la skill du lot 2.2.

`scripts/archiver-sujet.mjs`, lancé par `npm run sujet:archiver -- <Pn>` (le
lot 2.2 ajoute la clé à `package.json`, ce lot exporte les fonctions) :

- refuse une piste dont le plan n'est pas livré (`lireLePlan` du lot 1.1, ou comptage des cases si 1.1 n'est pas commité) ;
- prend le dossier de `recherche` et de `plan`, et ses fichiers suivis (`git ls-files`) ;
- pour chaque fichier, relève ses citations dans les fichiers suivis hors du dossier, hors de `docs/notes/Archives/` et hors de `INVENTAIRE-UCM.html`. Une citation est le chemin depuis la racine, le chemin relatif depuis le fichier qui cite, ou l'une de ces formes encodée pour une URL ;
- range chaque citation : `code` (`packages/`, `scripts/`, `tests/`, `docs/inventaire/`, `.github/`), `donnée` (`pistes.json`, `decisions.json`, `.agents/domiciles.json`, `docs/inventaire/sources.json`), `document` (un autre `.md`) ;
- marque `outil` un fichier `.mjs`, `.ts`, `.cjs`, `.js`, un fichier sous `fixtures/`, ou une page `.html` citée ;
- propose `garder` (cité par du code ou une donnée, ou outil cité), `relire` (cité seulement par un document) ou `supprimer` (aucune citation) ;
- liste les liens des fichiers gardés vers un fichier proposé à la suppression ;
- écrit une table Markdown, ou du JSON avec `--json`.

`--figer <commit> <fichier>…` remplace, dans les documents vivants, chaque lien
relatif vers ces fichiers par
`https://github.com/Vassili-g/UCM-Toolkit/blob/<commit>/<chemin encodé>`, ancre
gardée, et affiche les fichiers modifiés.

`tests/archiverSujet.test.ts` porte les cas de test « Archivage », sur un
dépôt Git temporaire.

## Vague 2

- [ ] 2.1 `implementeur`. Gardes des plans. Commit : `…`
- [ ] 2.2 Conversation principale. Skill d'archivage et règles. Commit : `…`
- [ ] 2.3 `implementeur`. `npm run inventaire` à jour. Commit : `…`

### Lot 2.1. Gardes des plans

Nature : test de garde, et un hash d'un autre repository à réécrire.

`tests/plansDeRecherche.test.ts` emploie `lireLePlan` (lot 1.1). Il vérifie :

- chaque hash local cité par un lot d'un plan de piste existe (`git cat-file -e <hash>^{commit}`) ; un hash `depot@hash` est admis si `depot` est dans `DEPOTS_CONNUS = ['intencial-library', 'UCM-Playground']` ;
- chaque marque `attend Pn` nomme une piste qui existe et n'est pas livrée ;
- chaque fichier `PLAN*.md` sous `docs/notes/Recherches/` est le `plan` ou la `recherche` d'une piste, sauf ceux de `PLANS_SANS_PISTE`, une liste `{ chemin, raison }` dont chaque chemin existe. La liste de départ nomme chaque plan sans piste d'aujourd'hui, avec la raison « sujet livré, à archiver » ou « sujet sans piste, voir la question 4 de P25 ».

Dans `PLAN-SOCLE-INTENCIAL-LIBRARY.md`, les deux `62d32976` deviennent
`intencial-library@62d32976`.

### Lot 2.2. Skill d'archivage et règles

Nature : fichiers d'agents. Charger la skill `rediger-pour-agents` avant d'écrire.

`.agents/skills/archiver-un-sujet/SKILL.md` décrit la procédure de la
[recherche](./RECHERCHE-ROADMAP.md#archiver-un-sujet-terminé) :

1. `npm run sujet:archiver -- <Pn>` rend la table.
2. L'agent relit chaque fichier `relire`. Un fait que seul ce fichier porte part dans son domicile (`npm run agents:domicile`), dans un commit à part.
3. L'agent présente au mainteneur la table des fichiers à supprimer et à garder, et attend sa confirmation.
4. Après confirmation : noter `C = git rev-parse --short HEAD`, déjà poussé ; lancer `node scripts/archiver-sujet.mjs --figer C <fichiers supprimés>` ; supprimer les fichiers ; passer la ligne du sommaire dans la table « Archive » avec un lien figé ; retirer le motif du registre si le dossier est vide ; écrire `archive: "C"` sur la piste ; `npm run vues` ; faire lancer `npm test` par un `verificateur` ; commiter par chemins explicites ; pousser.

Le même lot ajoute `"sujet:archiver": "node scripts/archiver-sujet.mjs"` à
`package.json`, après le commit de 1.2.

`CONTRIBUTING.md` gagne quatre règles, chacune avec le test qui la tient :

- un sujet de recherche a son dossier dans `docs/notes/Recherches/`, créé par `npm run sujet`, jamais dans `_local/` (`tests/dossiersDeRecherche.test.ts`, `scripts/hook-documents.mjs`) ;
- les marques d'une case de plan : `(hash)`, `(depot@hash)`, `(mainteneur)`, `(attend Pn)` (`tests/plansDeRecherche.test.ts`) ;
- un agent ne change ni ne retire un `prioDuMainteneur` sans demande du mainteneur ;
- un sujet livré s'archive par la skill `archiver-un-sujet`.

`docs/notes/Recherches/README.md` : la section « Archive » renvoie à la skill,
et dit que le lien figé remplace le passage par `docs/notes/Archives/`.

### Lot 2.3. `npm run inventaire` à jour

Nature : script existant à étendre.

`scripts/ouvrir-inventaire.mjs` appelle `genererInventaireEtCouverture` de
`docs/inventaire/generer-inventaire.ts` (chargé par `tsx`, comme
`scripts/vues.mjs`), écrit la page dans
`<dossier temporaire du système>/INVENTAIRE-UCM.html`, puis l'ouvre. Le
fichier commité ne change pas. Le script exporte
`ecrireLaPage(chemin): Promise<void>`, et l'ouverture n'a lieu qu'au
lancement direct. `tests/ouvrirInventaire.test.ts` appelle `ecrireLaPage` sur
un chemin temporaire et vérifie que la page commence par `<!doctype html>`.

## Vague 3

Elle commence après la case 4.4 de P6.

- [ ] 3.1 `implementeur-exigeant`. Données et générateur. Commit : `…`
- [ ] 3.2 `implementeur-exigeant`. Interface de la Roadmap. Commit : `…`
- [ ] 3.3 `executant`. Questions dans les recherches. Commit : `…`

### Contrat entre 3.1 et 3.2

Le gabarit garde `{{pistes:nombre}}`, `{{js:PISTES}}` et `{{js:SUJETS}}`. Il
perd `{{alertes:bandeau}}`, `{{lignes-transverses}}`, `{{js:DECISIONS}}` et
`{{js:LIVREES}}`. Il gagne `{{js:TERMINEES}}` dans la section 7, et
`{{lignes-regles}}` passe dans la partie 6, sous « Les règles décidées, pas
encore dans le code ». Le script de la page reçoit :

```
PISTES : [{ id, titre, titreCourt, sujet, prio, prioDeLAgent, prioPosee: { raison } | null,
  importance, complexite, coutHumain, resume, raisonImportance, risques, criteresDeFin,
  dependances, debloque, recherche, plan, etat: 'idee' | 'recherche' | 'en-cours',
  avancement: { faits, total } | null,
  lots: [{ groupe, numero, fait, marque: 'mainteneur' | 'attend Pn' | '', suivant, texte, hash }] | null,
  attentes: [{ genre: 'toi' | 'piste', texte, detail }],
  questions: [texte], transverses: [{ id, titre, texte, pistes }], dernierLot: 'AAAA-MM-JJ' | null }]
TERMINEES : [{ id, titreCourt, date: 'AAAA-MM-JJ' | null, lien, ecartee: raison | null }]
```

`prio` est la prio affichée : `prioDuMainteneur.prio` si elle existe, sinon
`prio`. `dependances` ne garde que les pistes non terminées. `lien` est le lien
GitHub du plan, figé sur `archive` quand la piste est archivée. Les attentes
suivent la table « État calculé » de la recherche.

### Lot 3.1. Données et générateur

Nature : données, lecteurs et générateur. Plusieurs lecteurs de `pistes.json`.

`pistes.json` :

- retirer `etat` de chaque piste, et `alertes` ;
- renommer `rang` en `prio` ;
- poser sur P17 `prioDuMainteneur: { "prio": 4, "raison": "On le fait mais plus tard, ce n'est pas prioritaire pour le moment." }`, tirée de sa note dans `decisions.json` ;
- retirer `questions` des pistes qui ont une `recherche`, une fois le lot 3.3 commité.

`decisions.json` : retirer la clé `pistes` ; retirer T2, T3, T4 et T9, et T7 et
T8 selon les réponses de 0.2 ; retirer les règles de genre `liste` dont
`ecrite` vaut `oui`.

L'alerte « Playground » de P6 devient la dernière case de son plan, marquée
`(mainteneur)`, mot pour mot.

`docs/inventaire/releves.ts` :

- `pistes()` refuse `etat`, `alertes`, `rang`, `questions` à côté d'une `recherche`, un `prioDuMainteneur` sans `raison` ou hors de 0 à 5, un `ecartee` sans `raison`, et un `archive` dont le plan manque à ce commit (`git cat-file -e <archive>:<plan>`) ;
- le plan se lit dans l'arbre de travail, ou par `git show <archive>:<plan>` pour une piste archivée ;
- l'état, les lots, l'avancement, les attentes et `dernierLot` viennent de `docs/inventaire/plans.ts` ; `compterLesCases` disparaît, et ses tests passent à `tests/plans.test.ts` s'ils manquent ;
- les questions d'une piste qui a une recherche viennent de sa section dont le titre contient « Questions au mainteneur », un élément de liste ou une ligne de table par question ;
- les transverses restantes de `decisions.json` vont dans la fiche de chaque piste qu'elles nomment.

`docs/inventaire/extraire.ts` gagne la lecture d'une section par un titre qui
contient un texte, avec son test dans `tests/extraireInventaire.test.ts`.

`docs/inventaire/generer-inventaire.ts` applique le contrat ci-dessus et retire
`bandeauDesAlertes`. `docs/inventaire/sources.json` gagne
`docs/notes/Recherches/**/*.md`.

`tests/inventaire.test.ts` porte les cas de test « Données ».

### Lot 3.2. Interface de la Roadmap

Nature : interface à reproduire au pixel près. Ouvrir
`docs/notes/Recherches/Roadmap/maquettes/maquette-A2-v2.html` à 1400 px et la
reproduire dans la page.

`docs/inventaire/gabarit.html`, section 7 :

- titre « Roadmap », ligne « Défini dans » qui nomme `pistes.json` et les plans de `docs/notes/Recherches/` ;
- outils : choix segmenté « Grouper par Prio / État », filtre « Attend ta décision » avec son compte, compte des pistes et légende du point violet ;
- table à quatre colonnes (Prio, Piste, État, En attente), groupes « Prio 0 » à « Prio 5 » avec leur libellé ;
- partie « Terminés » repliée (`details.pli`), une ligne par piste de `TERMINEES` : identifiant, titre court, date, lien vers le plan, mention « écartée » et sa raison ;
- retirer le bandeau « À régler » de la partie 1, le graphe, la table « Questions ouvertes », les boutons et le pli « Les autres règles décidées » ;
- glossaire : « Piste, prio » remplace « Piste, rang ».

`docs/inventaire/page.js` :

- retirer le code des décisions, de `localStorage` pour les décisions, de `showSaveFilePicker`, d'IndexedDB, des incohérences, du graphe et du bilan ;
- la ligne : prio et point violet si `prioPosee`, chevron, identifiant, titre court, sujet, taille, liens « Recherche ↗ » et « Plan ↗ », état et tag `faits/total`, attentes ;
- la fiche : à gauche le résumé, « Si on ne fait pas », « Ce que ça te demande », les risques, la prio posée et le formulaire ; à droite les lots (rangée de carrés avec détail au survol, légende, cases faites repliées, groupe en cours et groupes marqués `mainteneur` ouverts), ou les questions, ou les critères de fin, puis les transverses, « Dépend de » et « Débloque » ;
- le formulaire : sélecteur des prios 0 à 5 et « Écartée », champ « Pourquoi ? » d'une ligne, bouton « Copier pour l'agent » grisé tant que le champ est vide, qui devient « Copié ✓ » pendant 2 s. Le texte copié : « Dans pistes.json, pose la prio <n> sur <Pn> (<titre court>) dans prioDuMainteneur, avec la raison « <raison> ». Puis lance npm run vues et commite. », ou pour « Écartée » : « Dans pistes.json, écarte <Pn> (<titre court>) avec la raison « <raison> ». Puis lance npm run vues et commite. » ;
- le repère « a bougé » : `localStorage` garde `{ derniere, avant }` sous `inventaire-ucm-visite`, chaque accès dans `try`. Au chargement, si `derniere` n'est pas aujourd'hui, `avant` prend `derniere` et `derniere` prend aujourd'hui. Une ligne dont `dernierLot` est après `avant` porte un point « a bougé » ;
- la liste du graphe pour téléphone disparaît avec le graphe.

`docs/inventaire/page.css` : les styles de la maquette, sous les noms de la
page, et le retrait des styles morts (`.graphe`, `.choix-ligne`, `.a-regler`,
`.ecart-decisions`, `.bilan-decisions`). La section 7 prend toute la largeur
de `main`.

Vérification : ouvrir la page régénérée à 1400 px, comparer à la maquette,
lancer `node scripts/controle-style.mjs docs/inventaire/gabarit.html`.

### Lot 3.3. Questions dans les recherches

Nature : déplacement de texte. Chaque document gagne, ou renomme, une section
`## Questions au mainteneur` qui liste une question par puce. Le texte vient
mot pour mot du champ `questions` de la piste dans `pistes.json`, sauf quand le
document porte déjà la question, auquel cas la puce renvoie à sa section par un
lien.

| Piste | Document |
|---|---|
| P22 | `Pièces internes/RECHERCHE-PIECES-INTERNES.md` |
| P10 | `Comparateur de rendu/RECHERCHE-COMPARATEUR-RENDU.md` |
| P23 | `Plugin Exporter/RECHERCHE-SELECTION-ET-STYLE-DICTIONARY.md` |
| P20 | `Linter Dev/PLAN-CONFORMITE-RENDU.md` |
| P8 | `Optimisation Tokens/Formalisation de la solution/PLAN-IMPLEMENTEUR.md` |
| P11 | `Diff Sémantique/PLAN-DIFF-SEMANTIQUE.md` |
| P13 | `Evolutions globales/PISTES-EVOLUTION.md` |

## Vague 4

- [ ] 4.1 `executant`. `ROADMAP.md` devient `VALIDATIONS-MVP.md`. Commit : `…`
- [ ] 4.2 Conversation principale. Fichiers d'agents. Commit : `…`

### Lot 4.1. `ROADMAP.md` devient `VALIDATIONS-MVP.md`

Nature : renommage listé. `git mv ROADMAP.md VALIDATIONS-MVP.md`, titre
`# Validations du MVP`. Remplacer `ROADMAP.md` par `VALIDATIONS-MVP.md` dans les
fichiers que rend `git grep -l "ROADMAP"`, sauf `AGENTS.md` (lot 4.2),
`INVENTAIRE-UCM.html` (généré), `docs/notes/Archives/**` et
`docs/notes/Recherches/Roadmap/**`. Un texte qui dit « la roadmap » pour ce
fichier dit « les validations du MVP ». Lancer `npx tsx --test tests/docLinks.test.ts tests/extraireInventaire.test.ts`.

### Lot 4.2. Fichiers d'agents

Nature : fichiers d'agents. Charger `rediger-pour-agents`. Dans `AGENTS.md` :
`VALIDATIONS-MVP.md` à la place de `ROADMAP.md`, la skill
`archiver-un-sujet` dans la table des skills, et la ligne « Piste et décision »
de « Où écrire » qui nomme `prio`, `prioDuMainteneur` et les marques de cases.

## Vague 5

- [ ] 5.1 Conversation principale. Premier archivage, P19 et P21, par la skill `archiver-un-sujet`. Commit : `…`
- [ ] 5.2 (mainteneur). Confirmer la table des fichiers à supprimer de P19 et de P21.
- [ ] 5.3 Conversation principale. Clôture. Commit : `…`

### Lot 5.1. Premier archivage

La conversation principale suit la skill pour P19, puis pour P21. Le dossier
`Archi Tokens Multi-marques/` porte des générateurs que `npm run vues` appelle :
la table doit les rendre `garder`. Les plans archivés sortent de
`PLANS_SANS_PISTE` s'ils y étaient.

### Lot 5.3. Clôture

Cocher les cases, passer la ligne de P25 du sommaire au statut « Implémenté »,
écrire dans `RECHERCHE-ROADMAP.md` les écarts avec la maquette, puis archiver
P25 par la skill quand le mainteneur l'a regardée.

## Cas de test

### Lecture des plans (`tests/plans.test.ts`)

- `- [x] 3 (bd04e26a). Texte.` donne `{ numero: '3', fait: true, hashes: [{ depot: null, hash: 'bd04e26a' }], marque: null, texte: 'Texte.' }`.
- `- [x] 1 (intencial-library@62d32976). Socle.` donne un hash de dépôt `intencial-library`.
- `- [x] 8 (21b78694, publiés : core 0.17.1). Publication.` garde le hash et ignore le reste.
- `- [ ] 0.7 (mainteneur). Relire.` donne `marque: 'mainteneur'` ; `- [ ] 2 (attend P1). Contrat.` donne `{ attend: 'P1' }`.
- Une case indentée sous un lot coché ne compte pas : `PLAN-INVENTAIRE.md` d'aujourd'hui donne 8 lots sur 8 et `livre: true`.
- Une case dans un bloc de code ne compte pas. `[X]` et `* [ ]` comptent.
- Le groupe d'une case est le dernier titre `##` qui la précède.
- `lotSuivant` saute un lot marqué. `dateDuDernierLot` ignore un hash de dépôt et un lot non fait.

### Un sujet, un dossier (`tests/dossiersDeRecherche.test.ts`)

- Le dépôt d'aujourd'hui passe.
- Sur une copie modifiée du registre, un dossier sans motif échoue en nommant le dossier.
- Une piste dont le `plan` vit dans `Evolutions globales/` échoue.
- Deux plans de pistes non livrées dans un dossier échouent.
- `nouveau-sujet.mjs` sur un dépôt temporaire crée le dossier, le document, le motif, la ligne et le champ `recherche`, et refuse un second appel avec le même nom.

### Archivage (`tests/archiverSujet.test.ts`)

- Un fichier cité par un `.ts` de `scripts/` est `garder`, un fichier cité seulement par un `.md` est `relire`, un fichier sans citation est `supprimer`.
- Une citation relative encodée (`Archi%20Tokens%20Multi-marques/x.md`) compte.
- Une citation depuis `docs/notes/Archives/` ou `INVENTAIRE-UCM.html` ne compte pas.
- Une piste non livrée est refusée.
- `--figer` réécrit un lien relatif avec son ancre et laisse un lien externe intact.

### Gardes des plans (`tests/plansDeRecherche.test.ts`)

- Le dépôt passe après la réécriture de `62d32976`.
- Un hash inventé fait échouer le test en nommant le plan et la case.
- `foo@1234567` échoue, `foo` n'étant pas dans `DEPOTS_CONNUS`.
- `(attend P99)` échoue, et `(attend P19)` échoue, P19 étant livrée.
- Un `PLAN-X.md` ajouté sans piste échoue ; une entrée de `PLANS_SANS_PISTE` dont le fichier manque échoue.

### Données (`tests/inventaire.test.ts`)

- Une piste avec `etat`, `alertes` ou `rang` est refusée, en nommant le champ.
- `prioDuMainteneur` sans raison, ou à 6, est refusé.
- `questions` à côté d'une `recherche` est refusé.
- P17 sort à la prio 4 avec `prioDeLAgent` 0.
- P19 et P21 sortent dans `TERMINEES` avec la date de leur dernier hash.
- Une piste avec `archive` lit son plan au commit et sort dans `TERMINEES` avec un lien figé.
- La page ne contient plus `showSaveFilePicker`, `localStorage.setItem('inventaire-ucm-decisions'`, ni `id="graphe"`.

## Critères de fin

- La section 7 de `INVENTAIRE-UCM.html` s'appelle « Roadmap » et reproduit la maquette A2 v2 à 1400 px.
- `pistes.json` n'a plus de champ `etat`, `rang` ni `alertes`, et `decisions.json` n'a plus de clé `pistes`.
- Un agent qui finit un lot coche sa case avec le hash, et la page montre le nouvel état après `npm run vues`, sans autre écriture.
- `npm run sujet` crée un sujet complet, et `tests/dossiersDeRecherche.test.ts` refuse un dossier non enregistré.
- `tests/plansDeRecherche.test.ts` refuse un hash inconnu et un plan sans piste.
- P19 et P21 sont archivées par la skill, et la partie « Terminés » les montre avec leur date.
- `ROADMAP.md` n'existe plus, et `VALIDATIONS-MVP.md` le remplace partout.
- `npm test`, `npm run typecheck` et `npm run agents:diff` passent.
