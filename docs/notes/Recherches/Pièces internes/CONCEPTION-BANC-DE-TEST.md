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
5. Le comparateur ramène la vue résolue et le rendu du modèle de vérité à un même rendu normalisé : par identité de calque, couleurs et contours par token, visibilité, texte, composant placé.
6. Un écart sans perte qui le couvre fait échouer l'épreuve. Les deux seules pertes admises sont la sélection non unique et l'appariement ambigu (§2.12 de la forme).
7. Les constats du dessin que le modèle connaît (mode forcé efficace, `SLOT` rempli, instance exposée, échange vers une pièce) doivent chacun avoir leur perte publiée (§2.13, dernier paragraphe).

Une épreuve qui échoue se réduit au plus petit composant qui échoue encore, comme dans le générateur d'Architect (`reduction.ts`).

## Les cinq pièces du banc

| Pièce | Rôle | Domicile | Vient de |
|---|---|---|---|
| Générateur et double | tire des composants à pièces et les rend lisibles par le moteur | `packages/plugin-socle/tests/generateur/`, déplacé depuis `packages/plugin-architect/tests/generateur/` | le générateur d'Architect, enrichi des familles d'`opus/gen.cjs` et de `codex/fuzz/generer-relais.cjs` |
| Modèle de vérité | rendu attendu de chaque occurrence selon la convention d'UCM | même dossier, `verite.ts` | `confrontation/lab-b.cjs`, conservation `identite` seule |
| Comparateur | rendu normalisé, comparaison, couverture par les pertes, réduction | même dossier | `opus/analyse.cjs`, `reduire.cjs` |
| Fabriques de contrats | contrats 15.0 écrits dans les tests du kit, sans fixture | `packages/kit/tests/banc/` | les cas de `codex/cas/` et de `confrontation/cas15.cjs` |
| Couverture de l'API de Figma | classe chaque propriété des typages, échoue sur une propriété non classée | `packages/plugin-socle/tests/couvertureFigma.test.ts` et sa table | `codex/couverture-relais.cjs`, 1 284 propriétés rapprochées |

Le générateur passe dans le socle, parce que le socle porte le moteur commun aux deux plugins. Architect et l'Exporter l'importent tous les deux. Son double s'appuie sur `atelierDeCalques`, que le générateur d'Architect emploie déjà. Aucun nouveau test des pièces n'emploie `figmaFaux.ts`. Le banc garde ainsi un seul double de Figma pour les composants générés.

Les fabriques du kit existent parce que le kit ne dépend pas du socle. Les lots 3.1 à 3.3 testent le kit avant que le moteur 15.0 existe. Une fabrique écrit un contrat en quelques lignes (`contrat15({ pieces: … })`), et chaque cas nommé y a son contrat attendu, tiré de la forme. Les mutations s'appliquent à ces contrats.

## Ce qui entre dans le dépôt

| Outil des laboratoires | Devient |
|---|---|
| validateur `codex/valider15.cjs` | rien de séparé : ses règles entrent dans `validation-contrat.mjs` (case 3.3) |
| lecteur `codex/deplier15.cjs`, façade de `codex/preuves-forme.mjs` | rien de séparé : `variant-views.mjs` porte la résolution (case 3.2) |
| mutations (`codex/mutations*.cjs`, 22 de la confrontation, 73 en tout) | une table de mutations dans `packages/kit/tests/banc/`, chacune avec le refus attendu ; les 2 que le contrat seul ne décide pas vont aux tests du moteur |
| 45 cas, 30 assemblages adverses, 22 attentes manuscrites de Codex | des cas nommés dans la langue du modèle, joués de bout en bout ; leur contrat attendu dans les fabriques du kit |
| 19 constructions de `StressTest` | des cas nommés avant la capture ; puis le rejeu de la capture (question 1) |
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

Ils remplacent les lots 1.7 et suivants du plan, après validation de cette note.

- 1.7 Déplacer le générateur d'Architect dans le socle, sans changer ce qu'il génère. Les tests d'Architect passent à l'identique. Agent : `implementeur`.
- 1.8 Le double fait tourner `exportComponent` sur un document généré. Test d'abord : un composant généré sans pièce s'exporte, et la sortie passe les lois. Agent : `implementeur`.
- 1.9 Le modèle de vérité, le rendu normalisé et le comparateur, avec la réduction. Test d'abord : chaque défaut injecté fait échouer le comparateur. Le banc passe sur le moteur 14.0 pour les familles de composants sans pièce. Agent : `implementeur-exigeant`.
- 1.10 Les familles de composants à pièces du générateur (exposition, états, échanges, `SLOT`, modes forcés, frères de même nom, sélection double ou absente, imbrication jusqu'à la borne) et les cas nommés, marqués « attendu en 15.0 ». Agent : `implementeur-exigeant`.
- 1.11 Les fabriques de contrats et la table des mutations, dans le kit. Elles servent les cases 3.1 à 3.3. Agent : `implementeur`.
- 1.12 La table de couverture de l'API de Figma et son test sur les typages. Agent : `implementeur`.

Les lots 1.7, 1.11 et 1.12 touchent des fichiers disjoints et peuvent tourner ensemble, deux à la fois.

## Questions au mainteneur

| # | Question | Recommandation |
|---|---|---|
| 1 | La capture de `StressTest` (1.3) peut-elle entrer dans le dépôt comme entrée d'un test ? Elle vient d'UCM-Playground et ne contient aucune donnée de client. | Oui, avec une attente écrite par construction, jamais un instantané du contrat. Les captures de Button et de Groupe restent dans `_local/`. |
| 2 | Combien de tirages dans `npm test` ? | 200 tirages à graine fixe dans `npm test`, comme l'échantillon d'Architect. Les 5 200 tirages tournent par une commande séparée, avant chaque publication. |
| 3 | Faut-il faire passer le banc sur le moteur 14.0 avant tout changement du moteur ? | Oui. C'est la seule preuve que le banc juge juste avant de juger la 15.0. |
