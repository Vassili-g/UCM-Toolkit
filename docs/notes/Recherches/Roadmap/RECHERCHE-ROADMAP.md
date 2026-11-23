# Recherche sur la Roadmap de l'inventaire (P25)

La section 7 de `INVENTAIRE-UCM.html`, « La suite », devient « Roadmap ». Elle
montre chaque piste à venir dans une table calculée depuis le dépôt : prio,
état, avancement en tag, ce qui est en attente, et une fiche qui s'ouvre au
clic. Le mainteneur a retenu la [maquette A2 v2](./maquettes/maquette-A2-v2.html)
et toutes les propositions de cette recherche. Le [plan](./PLAN-ROADMAP.md)
distribue le travail.

Le mainteneur est le seul lecteur de la page. Il l'ouvre pour se souvenir des
sujets en cours d'une semaine à l'autre, voir les priorités et l'avancement,
comprendre les enjeux d'un sujet en un clic et ouvrir ses documents. Il lit la
page sur grand écran.

## Décisions du mainteneur

| Sujet | Décision |
|---|---|
| Forme | La table de la maquette A2 v2. L'avancement tient dans un tag (« 6/28 »). Les lots ne s'affichent que dans la fiche ouverte. |
| Vocabulaire | « Prio » remplace « Rang » partout, dans la page et dans `pistes.json` (`prio`, `prioDuMainteneur`). La colonne s'appelle « En attente ». |
| Changer une prio | Un sélecteur, un champ « Pourquoi ? » d'une ligne et un bouton qui copie la demande pour un agent. L'agent écrit `prioDuMainteneur: { prio, raison }` et commite. Un point violet marque la prio posée par le mainteneur. |
| Décisions « On fait », « On ne fait pas », note | Supprimées. La prio posée et sa raison les remplacent, avec une seule option « Écartée », motivée. |
| Graphe des dépendances | Supprimé. « Dépend de » et « Débloque » restent dans la fiche, « Après Pn » dans la colonne « En attente ». |
| Questions ouvertes T1 à T10 | Chacune passe dans la fiche des pistes qu'elle vise. T2, T3 et T4 sont tranchées par P19 et sortent. T9 est écrite et sort. T7 et T8 se tranchent ou sortent. |
| Autres règles décidées | Les règles déjà écrites dans leur domicile sortent de `decisions.json`. Les autres vont dans la partie 6. |
| Bandeau « À régler » | Supprimé. Le filtre « Attend ta décision » de la Roadmap le remplace, et le champ `alertes` disparaît. |
| Mise à jour | `npm run inventaire` régénère la page dans un fichier temporaire avant de l'ouvrir. Le test de fraîcheur reste. |
| `ROADMAP.md` | Le fichier devient « Validations du MVP », sous un nouveau nom. |
| Repère « a bougé » | Oui, la date de la dernière visite reste dans le navigateur. |
| Gardes | Un test vérifie que chaque hash cité par une case de plan existe. Un hash d'un autre repository s'écrit `depot@hash`. Un autre test vérifie que chaque `PLAN*.md` de `docs/notes/Recherches/` est cité par une piste. |
| Un sujet, un dossier | Chaque nouveau sujet de recherche a son dossier dans `docs/notes/Recherches/`, jamais dans `_local/`. Il est enregistré dans `.agents/domiciles.json` et dans `docs/notes/Recherches/README.md`, par un script et sous un test. |
| Sujets terminés | Une piste livrée est archivée. Elle reste dans la partie « Terminés » de la Roadmap, avec la date de son dernier lot. Les documents de sa recherche qui ne servent plus sont supprimés. |

## Relevé de l'état réel des pistes

Relevé fait sur `main` au commit a6715b6f. Le prototype
[`maquettes/donnees.mjs`](./maquettes/donnees.mjs) refait ce calcul.

| Piste | Rang | `etat` écrit | État réel | Preuve |
|---|---|---|---|---|
| P19 | 1 | à faire | livrée, 8 lots sur 8 | `PLAN-VERDICT-UCM-CHECK.md` lignes 14 à 21, lot 8 coché e4250a9b |
| P21 | 1 | proposé | livrée, 5 lots sur 5 | `PLAN-REFERENCE-COMPLETE.md`, release 21b78694 |
| P18 | 1 | proposé | en cours, 2 cases sur 4, la case 2 attend le premier contrat (P1) | `PLAN-SOCLE-INTENCIAL-LIBRARY.md` lignes 13 à 16, commit 275d8676 |
| P6 | 2 | proposé | en cours, plan à cases | `PLAN-IMPLEMENTATION-P6-KIT.md` |
| P22 | 1 | proposé | recherche faite, 4 questions au mainteneur | `RECHERCHE-PIECES-INTERNES.md`, commit 81dc997f |
| P10 | 2 | proposé | recherche faite, 4 choix au mainteneur | `RECHERCHE-COMPARATEUR-RENDU.md` lignes 203 à 244 |
| P23 | 2 | proposé | recherche faite, 10 questions dans la recherche, 6 recopiées dans `pistes.json` | `RECHERCHE-SELECTION-ET-STYLE-DICTIONARY.md` lignes 44 à 53 et section 7 |
| P20 | 3 | proposé | recherche (`PLAN-CONFORMITE-RENDU.md`, un document sans case), prérequis P10, P9 et P17 non livrés | `pistes.json` |
| P8 | 4 | proposé | recherche ancienne, prérequis non livrés | `Optimisation Tokens/Formalisation de la solution/PLAN-IMPLEMENTEUR.md` |
| P11 | 4 | proposé | recherche ancienne avec 99 cases vides, citée comme `recherche` et non comme `plan` | `PLAN-DIFF-SEMANTIQUE.md` |
| P13 | 5 | ouvert | idée, sa « recherche » est le catalogue `PISTES-EVOLUTION.md` | `pistes.json` |
| P1 | 0 | à faire | rien de commencé, aucune décision dans `decisions.json` | `decisions.json`, clé `pistes` |
| P17 | 0 | ouvert | rien de commencé, décision « on fait » avec la note « On le fait mais plus tard, ce n'est pas prioritaire pour le moment. » | `decisions.json`, clé `pistes.P17` |
| P9, P24, P16 | 2, 4, 5 | proposé | idée, sans recherche ni plan | `pistes.json` |

Le champ `etat` était faux pour 6 pistes sur 16. La page en cachait une partie,
car `generer-inventaire.ts` retire les pistes livrées et `page.js` remplace
`etat` par l'avancement dès qu'un plan existe. L'erreur restait visible sur P1
et P17, dont la fiche et les boutons se contredisaient.

Trois faits fixent les sources possibles de l'état :

- `git log --grep` ne sert pas. `git log --grep "\bP1\b"` rend 22 commits, dont 996dae5a, qui parle du lot P1 de `PLAN-INVENTAIRE.md`.
- La date du dernier commit d'un fichier ne sert pas. La page commitée la contiendrait, et le commit qui régénère la page changerait cette date. La date d'un lot se lit dans le hash que cite sa case, par `git show -s --format=%cs`. Le CI clone tout l'historique (`ci.yml`, `fetch-depth: 0`).
- Le hash de P18 (62d32976) est un commit d'intencial-library, et `git show 62d32976` échoue dans ce dépôt. D'où la forme `depot@hash`.

## Critique de la section « La suite »

La section mesurait 4114 px de haut à 1400 px de large, fiches fermées, dont
2596 px pour la liste des 14 pistes. Elle tenait dans 980 px de large
(`page.css`, `section.partie`, 1000 px au plus). Les captures
`maquettes/captures/avant-*.png` montrent l'état d'origine.

- La colonne de décision prenait 300 px sur 980 pour trois boutons et une note que le mainteneur n'employait pas.
- « Enregistrer dans le dépôt » appelait `showSaveFilePicker` et gardait une poignée de fichier dans IndexedDB. Le geste dépendait du navigateur et laissait un fichier modifié sans commit.
- La fiche répétait « Si on ne fait pas » sous « Pourquoi », et sa ligne méta alignait 7 faits.
- « Points touchés » recopiait le plan. « Critères de fin » affichait des cases vides en dur, même quand le plan les cochait (P18).
- « Questions au mainteneur » recopiait la recherche, par exemple 6 questions sur les 10 de P23.
- Le lien vers la recherche se cachait dans le label du sujet.
- « Attend une décision sur P1 » sous P18 et P6 venait de boutons que personne ne cochait, et se lisait comme un blocage.
- Le graphe était replié, ne disait ni l'état ni l'avancement, et ses courbes traversaient des boîtes. Son cadre vert, une décision « on fait », n'avait pas de légende.
- Le bandeau « À régler » vivait en tête de page, loin de la section, et ses deux alertes recopiaient le plan de P6.
- « Défini dans `ROADMAP.md` » était faux, les données venaient de `pistes.json`.
- Aucune des 10 questions transverses n'était tranchée, et trois visaient seulement P19, livrée. « Les autres règles décidées » recopiait des règles déjà écrites dans `CONCEPT.md` et `PLAN-CONFORMITE-RENDU.md`.

La ligne « Livrées », calculée depuis les plans, fonctionnait. Elle devient la
partie « Terminés ».

## Formes comparées

Hauteurs mesurées à 1400 px, fiches fermées.

| Forme | Hauteur | Prio visible | Avancement visible | Défaut |
|---|---|---|---|---|
| Liste d'origine | 2596 px | titres de rang | étiquette de 2 pistes | longue, colonne de décision inutile |
| [A, table calculée](./maquettes/maquette-A-table.html) | 1276 px (A1), 1308 px (A2) | groupes et colonne | état, rangée des lots en A2 | 5 colonnes à tenir dans 1100 px |
| [B, board à colonnes calculées](./maquettes/maquette-B-board.html) | 1013 px | dans la carte seulement | colonnes d'état | la prio passe au second plan |
| [C, matrice prio et état](./maquettes/maquette-C-matrice.html) | 1087 px | lignes | colonnes d'état | 10 cases vides sur 18 |
| Maintenant, ensuite, plus tard | courte | perdue | paquet « Maintenant » | trois paquets cachent les 6 prios |
| Gantt | sans objet | non | dates | aucune piste n'a de date |

Une board sert une équipe qui fait avancer des cartes. Ici un décideur range,
et des agents cochent les cases d'un plan. La table garde l'ordre de priorité
et met l'état sur la même ligne. La [version 2](./maquettes/maquette-A2-v2.html)
retire les carrés de la ligne et les garde dans la fiche.

## État calculé

| État | Condition |
|---|---|
| Livrée | `plan` existe et toutes ses cases de premier niveau sont cochées |
| En cours | `plan` existe |
| Recherche faite | `recherche` existe, pas de `plan` |
| Idée | ni `recherche` ni `plan` |
| Écartée | `ecartee: { raison }`, écrit à la demande du mainteneur |

La colonne « En attente » se calcule :

- « Ta décision, lot N » : la première case non faite marquée `(mainteneur)`.
- « Tes réponses, N questions » : une recherche sans plan, avec une section « Questions au mainteneur ».
- « Lot N attend Pn » : une case marquée `(attend Pn)`.
- « Après Pn » : un prérequis non livré.
- « À lancer, rien de commencé » : une idée de prio 0 ou 1.

Les plans ont aujourd'hui trois formes : une case par lot (P19), des titres et
des cases numérotées (P6), un lot parent coché sur des étapes vides
(`PLAN-INVENTAIRE.md`, compté 10 sur 26 alors qu'il est fini). La convention
retenue prolonge la forme `1 (62d32976).` déjà employée :

- Un lot est une case de premier niveau. Une case indentée ne compte pas.
- Le dernier titre `##` qui précède une case la range dans un groupe.
- `- [x] 3 (bd04e26a).` est fait, avec le hash du commit. Un hash d'un autre repository s'écrit `intencial-library@62d32976`.
- `- [ ] 0.7 (mainteneur).` attend le mainteneur.
- `- [ ] 2 (attend P1).` attend une autre piste. Un test refuse la marque quand P1 est livrée ou n'existe pas.

Le jugement reste écrit dans `pistes.json`, car aucun fichier ne le porte :
`titre`, `titreCourt`, `sujet`, `resume`, `prio`, `importance`,
`raisonImportance`, `complexite`, `raisonComplexite`, `coutHumain`,
`dependances`, `risques`, `recherche`, `plan`, `prioDuMainteneur` et `ecartee`.
`points` et `criteresDeFin` servent tant qu'il n'y a pas de plan. Les questions
d'une piste qui a une recherche se lisent dans sa section « Questions au
mainteneur ».

## Un sujet, un dossier

Le hook `scripts/hook-documents.mjs` refuse déjà la création d'un `.md` hors
du registre, `_local/` compris. Le dossier de chaque sujet se crée par
`npm run sujet`, qui l'inscrit au registre et au sommaire, puis renseigne
`recherche` dans `pistes.json`. Un test vérifie que chaque dossier de premier
niveau de `docs/notes/Recherches/` a son motif au registre et sa ligne au
sommaire, que chaque `recherche` et chaque `plan` y vivent, et qu'un dossier
porte au plus un plan de piste non livrée.

## Archiver un sujet terminé

Aujourd'hui, un dossier clos part dans `docs/notes/Archives/`, en attente de
suppression, et les documents vivants y renvoient par un lien figé sur un
commit (`docs/notes/Recherches/README.md`, section « Archive »). Le lien figé
suffit à retrouver un document supprimé. La procédure supprime donc
directement, sans passer par `docs/notes/Archives/`.

Un document reste s'il est utile, c'est-à-dire s'il contient un outil (script,
générateur, fixture, maquette réutilisée) ou une information dont un autre
sujet dépend. Un script en calcule la plus grande part :

| Calcul | Source |
|---|---|
| Liens entrants depuis un document vivant | chemins relatifs et URL encodées dans les `.md` suivis, hors du dossier et hors de `docs/notes/Archives/` |
| Chemins cités par le code | `packages/`, `scripts/`, `tests/`, `docs/inventaire/`, `.github/` |
| Citations dans les données | `pistes.json` (`recherche`, `plan`, `points`), `decisions.json` (`domicileCible`), `.agents/domiciles.json` (`specs`, `lies`, `fichier`), `docs/inventaire/sources.json` |
| Outil | extension `.mjs`, `.ts`, `.cjs`, `.js`, dossier `fixtures/`, page `.html` citée |
| Liens sortants vers un fichier supprimé | les fichiers gardés du dossier |

Le jugement reste à l'agent. Il relit un document cité seulement par un
document vivant, et déplace le fait unique dans son domicile (`FORMAT.md`,
`CONCEPT.md`, un invariant) avant de remplacer le lien par un lien figé.

La suppression demande la confirmation du mainteneur, une fois par sujet, sur
la table des fichiers à supprimer. Un fait unique mal jugé se perd sans
qu'aucun test ne le voie, et la confirmation coûte un message.

La piste reste dans `pistes.json` avec `archive: "<commit>"`, le commit où son
plan existait encore. Le générateur lit le plan à ce commit par
`git show <commit>:<chemin>`. Il en tire les lots et la date de complétion,
date du dernier hash coché. La partie « Terminés » de la Roadmap, repliée,
liste chaque piste avec cette date et un lien figé vers son plan.

## Questions au mainteneur

1. T7 (une clé `modules` dans `ucm.config.json` n'activerait rien) : écrire le fait dans `PLAN-CONFORMITE-RENDU.md` et retirer T7 (proposé), ou en faire une question de P6.
2. T8 (langue des modules) : écrire dans `CONTRIBUTING.md` « code du kit en français, format et README de la CLI en anglais » (proposé), ou laisser la question à P6.
3. Les sujets déjà dans `docs/notes/Archives/` : les passer à la même procédure, sujet par sujet (proposé), ou les laisser.
4. Les plans sans piste (`PLAN-HUB-UCM.md`, `PLAN-INVENTAIRE.md`, `PLAN-API-MODULES.md`, les plans d'UCM Architect et de Palettes) : archiver ceux qui sont finis et créer une piste pour les autres (proposé), ou les garder en exception nommée.
5. `npm run sujet` écrit le registre sans demander : la piste validée vaut accord (proposé), ou le mainteneur confirme chaque dossier.
