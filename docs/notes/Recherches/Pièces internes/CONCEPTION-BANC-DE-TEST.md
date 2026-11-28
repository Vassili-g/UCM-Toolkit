# Banc de test du contrat 15.0

Le banc prouve trois choses à chaque `npm test`. Le moteur publie, pour un composant à pièces, un contrat que le kit accepte. Le kit résout chaque occurrence comme la convention d'UCM le dit. Chaque écart restant est couvert par une perte publiée. La note dit ce que deviennent les outils des laboratoires (case 1.0 du [plan](./PLAN-P22.md)). Le mainteneur la valide avant les lots 1.7 et suivants.

## Le principe

Le banc compare le contrat à un modèle de vérité, jamais à un contrat de référence. La règle de `packages/plugin-exporter/invariants/tests-du-moteur.md` l'impose : un instantané ne prouve que son immobilité.

Le banc ne contient qu'un seul moteur, celui du socle. Les laboratoires avaient chacun leur constructeur de contrats (`codex/constructeur15.cjs`, `opus/lab.cjs`, `confrontation/lab-b.cjs`), c'est-à-dire un second moteur simulé. Dans le dépôt, deux moteurs divergeraient à chaque changement du format. Le banc passe donc toujours par le vrai moteur, sur un double de Figma.

Le modèle de vérité ne connaît pas le format. Il décrit un composant comme Figma le dessine (calques, variantes, instances, valeurs imposées), et il calcule le rendu attendu de chaque occurrence selon la convention d'UCM. Une 16.0 changerait le moteur et le kit, pas le modèle de vérité ni le générateur. Le même banc éprouvera donc les versions suivantes.

## Le parcours d'une épreuve

1. Le générateur tire un composant à graine, ou un cas nommé le décrit à la main, dans la même langue de modèle.
2. Le double de Figma rend ce composant lisible par le moteur.
3. Le moteur exporte le contrat. Les lois de `packages/plugin-exporter/tests/lois.ts` et la validation du kit s'appliquent à la sortie.
4. Pour chaque variant de l'hôte, chaque occurrence et chaque combinaison atteignable (axes exposés, état de la pièce), le kit résout la vue par `variant-views.mjs`.
5. Le comparateur ramène la vue résolue et le rendu du modèle de vérité à un même rendu normalisé. Il porte, par identité de calque, les couleurs et contours par token, la visibilité, le texte, le composant placé, la boîte effective (taille, bornes, rotation, opacité), le flux intérieur, les styles typographiques et les effets représentés.
6. Un écart fait échouer l'épreuve, sauf si une perte prévue au §2.11 ou au §2.14 de la forme le couvre par son chemin et son objet. Les deux seules pertes de résolution d'état admises sont la sélection non unique et l'appariement ambigu (§2.12).
7. Les constats du dessin que le modèle connaît se vérifient contre le contrat (§2.13, dernier paragraphe). Un mode forcé efficace et un `SLOT` de pièce rempli ont chacun leur perte. Une instance exposée a sa prop complète et sa `source` dans l'API, et reçoit la perte L6 seulement si l'exposition est partielle. Une valeur préférée d'échange exposé qui désigne une pièce reçoit sa perte ; une pièce posée par échange reçoit un renvoi.

Une épreuve qui échoue se réduit au plus petit composant qui échoue encore, comme dans le générateur d'Architect (`reduction.ts`).

## Les cinq pièces du banc

| Pièce | Rôle | Domicile | Vient de |
|---|---|---|---|
| Générateur et double | tire des composants à pièces et les rend lisibles par le moteur | `packages/plugin-socle/tests/generateur/`, déplacé depuis `packages/plugin-architect/tests/generateur/` | le générateur d'Architect, enrichi des familles d'`opus/gen.cjs` et de `codex/fuzz/generer-relais.cjs` |
| Modèle de vérité | rendu attendu de chaque occurrence selon la convention d'UCM | même dossier, `verite.ts` | `confrontation/lab-b.cjs`, conservation `identite` seule |
| Comparateur | rendu normalisé, comparaison, couverture par les pertes, réduction | même dossier | `opus/analyse.cjs`, `reduire.cjs` |
| Fabriques de contrats | contrats 15.0 écrits dans les tests du kit, sans fixture | `packages/kit/tests/banc/` | les cas de `codex/cas/` et de `confrontation/cas15.cjs` |
| Couverture de l'API de Figma | classe chaque propriété des typages, échoue sur une propriété non classée | `packages/plugin-socle/tests/couvertureFigma.test.ts` et sa table | `codex/couverture-relais.cjs`, 1 284 propriétés rapprochées |

Le générateur passe dans le socle, parce que le socle porte le moteur commun aux deux plugins. Architect et l'Exporter l'importent tous les deux. Le raccord à l'analyse d'Architect reste dans Architect, et le tirage reçoit la fonction de jugement en paramètre : le socle n'importe rien d'Architect. Son double s'appuie sur `atelierDeCalques`, que le générateur d'Architect emploie déjà. Aucun nouveau test des pièces n'emploie `figmaFaux.ts`. Le banc garde ainsi un seul double de Figma pour les composants générés.

Les fabriques du kit existent parce que le kit ne dépend pas du socle. Les lots 3.1 à 3.3 testent le kit avant que le moteur 15.0 existe. Une fabrique écrit un contrat en quelques lignes (`contrat15({ pieces: … })`), et chaque cas nommé y a son contrat attendu, tiré de la forme. Les mutations s'appliquent à ces contrats.

## Ce qui entre dans le dépôt

| Outil des laboratoires | Devient |
|---|---|
| validateur `codex/valider15.cjs` | rien de séparé : ses règles entrent dans `validation-contrat.mjs` (case 3.3) |
| lecteur `codex/deplier15.cjs`, façade de `codex/preuves-forme.mjs` | rien de séparé : `variant-views.mjs` porte la résolution (case 3.2) |
| mutations (`codex/mutations*.cjs`, 58, et 15 de la confrontation, 73 en tout) | une table de mutations dans `packages/kit/tests/banc/`, chacune avec le refus attendu et son autorité ; celles que le JSON seul tranche se jouent dans le kit, celles qui demandent les constats du dessin (mode forcé, `SLOT` rempli, clé exposée, échange, perte de maître, identifiant hors instance) se jouent de bout en bout |
| 45 cas, 30 assemblages adverses, 22 attentes manuscrites de Codex | des cas nommés dans la langue du modèle, joués de bout en bout ; leur contrat attendu dans les fabriques du kit |
| 25 constructions de `StressTest` | des cas nommés avant la capture, puis le rejeu de la capture (question 1). Les attentes suivent la convention des états, jamais une perte de transfert retirée (constructions 7, 9 et 15). La construction 19, que l'export refuse, vit dans un composant séparé. |
| générateurs à graine (`opus/gen.cjs`, `codex/fuzz/generer*.cjs`) | des familles du générateur unique |
| modèle de vérité `identite` | `verite.ts` |
| témoins de `codex/fuzz/temoins-relais.cjs` | des défauts injectés : un quart des cas de chaque famille, comme dans le générateur d'Architect, pour prouver que le comparateur voit un défaut |
| table de couverture | la table et son test |

Les lois et la validation ne se doublent pas. `lois.ts` appelle la validation du kit pour tout ce qu'elle couvre et garde seulement les lois propres au moteur : constats du dessin contre pertes, occurrences masquées, chaînes d'identifiants, pertes des variantes non posées.

## Ce qui reste dans `_local/`

- Le modèle `valeurInitiale`, qui suit la règle documentée de Figma. Il a servi à chiffrer l'écart entre Figma et la convention (13,3 % des bascules tirées), et aucune épreuve ne s'y juge.
- La comparaison de la 14.0 et de la 15.0 (`mesure-14/`). Elle sert une décision prise, et elle se rejoue une fois avec le vrai moteur (case 10.2).
- Les mesures sur les captures de Button et de Groupe, et tout script qui lit une capture issue d'un client.
- Le plugin d'essai de `regles/essai-figma/`, les journaux et les copies des laboratoires.

## Le banc avant le moteur 15.0

Le banc tourne d'abord sur le moteur 14.0, sur des composants sans pièce préfixée. Il doit y passer sans écart. Ce passage prouve le banc lui-même avant que le moteur change : un écart à ce stade vient du banc, du double ou d'un défaut de la 14.0, et chacun reçoit sa case. Les familles de composants à pièces sont marquées « attendu en 15.0 » et s'activent avec la case 5.8.

## Les lots du banc

Le plan porte les lots du banc, de 1.1b à 1.12, avec leurs fichiers, leurs commandes et leurs dépendances. Un composant généré passe par le double du socle, que le lot 1.8 complète pour les pièces (instances exposées, `componentProperties`, `overrides`, `SLOT`, modes, maîtres, pages, calques masqués). Le lot 1.1b fait enregistrer à la capture d'Architect les champs de rendu du §2.14, avant les captures du mainteneur. La commande `npm run banc:pieces` joue les 5 200 tirages, et la vérification finale du plan la lance.

## Revue de Codex

Deux agents de Codex ont relu le plan et cette note contre la forme et contre le code. Ils ont relevé 20 défauts, dont 8 bloquants, tous intégrés au plan et à cette note. Les journaux sont dans `_local/p22/revue-plan/`. Un essai y fait tourner `handleExportComponent` sur trois documents générés par le double d'Architect, et les trois sorties 14.0 passent les lois, le schéma et le lecteur.

## Questions au mainteneur

| # | Question | Recommandation |
|---|---|---|
| 1 | La capture de `StressTest` (1.3) peut-elle entrer dans le dépôt comme entrée d'un test ? Elle vient d'UCM-Playground et ne contient aucune donnée de client. | Oui, avec une attente écrite par construction, jamais un instantané du contrat. Les captures de Button et de Groupe restent dans `_local/`. |
| 2 | Combien de tirages dans `npm test` ? | 200 tirages à graine fixe dans `npm test`, comme l'échantillon d'Architect. Les 5 200 tirages tournent par une commande séparée, avant chaque publication. |
| 3 | Faut-il faire passer le banc sur le moteur 14.0 avant tout changement du moteur ? | Oui. C'est la seule preuve que le banc juge juste avant de juger la 15.0. |

## Réponses du mainteneur

Le mainteneur retient les trois recommandations. La capture de `StressTest` entre dans le dépôt comme entrée d'un test, avec une attente écrite par construction. `npm test` joue 200 tirages à graine fixe, et une commande séparée joue les 5 200 tirages avant chaque publication. Le banc passe sur le moteur 14.0 avant tout changement du moteur.
