# E4c. Fusion de variables

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E4b, E3c.

Fichiers : `packages/plugin-architect/src/ecriture/structure.ts`, `packages/plugin-architect/src/ecriture/journal.ts`,
`packages/plugin-architect/src/messages/structure.ts`, `packages/plugin-architect/src/sandbox/structure.ts`
et les cartes de `packages/plugin-architect/src/ui/structure/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.4 Fusion de deux variables du même rôle (Q-F2-6, option C). Architect relie à la variable gardée chaque token et chaque layer du
  fichier, puis fait de l'autre un alias de la variable gardée, marquée à retirer. Un second constat propose de la retirer quand plus
  rien ne l'emploie.

Fin : `npm run test:paquet -- architect` passe. Les tests vérifient tokens, layers, alias et marquage, avec refus et écriture partielle. Le critère de retrait reste soumis à la preuve demandée au mainteneur dans le rapport de relecture.

## Avancement

E4.4 faite en partie, non commitée, case laissée ouverte : la fusion s'écrit et se défait, le second constat qui propose de retirer la variable n'existe pas. Rien n'est écrit dans le kit.

Fait :

- Écriture. `ecriture/structure.ts` `fusionnerLesVariables` relit les variables (absente, distante, renommée, autre collection ou autre type : `objet-change` ; gardée qui vise une retirée, valeur directe d'une retirée : `fait-faux`), parcourt le fichier (`erreur` si le parcours lève), puis relie à la gardée chaque token (`setValueForMode`) et chaque layer (champ numérique, peinture de fond ou de contour, effet, plage de texte), fait de chaque retirée un alias de la gardée dans chaque mode et pose la marque `a-retirer` dans ses données partagées (`CLE_A_RETIRER`, valeur `{"garde": clé}`). Un layer lié à un emplacement qu'elle ne réécrit pas refuse toute la fusion (`non-pris-en-charge`). Un seul point d'annulation.
- Journal. `ecriture/journal.ts` gagne les lignes `marque` et `lien-de-layer` ; les alias de tokens et de la variable retirée sont des lignes `alias-de-mode`. L'ordre est tokens, layers, alias de la retirée, marque ; l'Historique les défait à l'envers (`defaireLaLigne`). Une écriture que Figma refuse laisse la fusion `erreur` : les lignes faites restent au journal, un nouvel essai finit le reste. Un journal qui ne tient pas empêche toute écriture (`journal-impossible`).
- Sandbox et messages. `fusionner-variables` (`messages/structure.ts`) porte le constat et la clé gardée ; `sandbox/structure.ts` `fusionner` retrouve les candidates dans la dernière lecture, jamais dans la demande, et répond par `structure-appliquee` sous l'identifiant du constat. Il périme l'analyse du composant quand une écriture a eu lieu.
- Écran. Les choix « Garder … » de `role-en-double` deviennent des boutons texte (`aFaire.ts`, `GestesDIgnorer.fusionner`), sans case, sans pied. Le résultat réemploie la ligne verte et `TEXTES.motifDeSaut`.

Décisions prises :

- La fusion passe par un message à part et non par une `Correction` du kit : la sorte `Correction` n'a pas de fusion, et une question reste sans correction exacte (Q-F2-6, sans case cochée).
- La marque est une donnée partagée de la variable, invisible dans la fenêtre Variables : écrire une description exigerait un texte du designer.
- Une retirée dont la valeur est directe dans un mode refuse la fusion (`fait-faux`) : ce mode ne se journalise pas.

Textes du designer absents de la note, à fournir :

- La carte `role-en-double` garde le statut « Supprimez les autres dans la fenêtre Variables », qui contredit maintenant le bouton « Garder … ».
- Aucune confirmation avant la fusion, aucune phrase de résultat propre (la ligne « 1 correction écrite. » sert), aucun libellé visible pour la marque « à retirer ».

Changement du kit demandé, non écrit : le second constat. Il faut que le catalogue sache qu'une variable porte la marque `a-retirer` (lecture des données partagées dans `src/lecture.ts`, champ du catalogue), puis qu'un contrôle propose de retirer une variable marquée quand aucune variable ni aucun layer du fichier ne l'emploie. Le critère « plus rien ne l'emploie » ne voit pas les autres fichiers : il attend la preuve que le mainteneur doit donner. Une suppression ne se défait pas depuis l'Historique, il faut donc aussi décider si le journal la porte.

Tests : `tests/fusionDeVariables.test.ts` (20 tests : tokens, layers, alias, marque, ordre, journal, annulation, refus, écriture partielle et reprise, sandbox) et `tests/fusionDeVariablesEcran.test.ts` (5 tests). Treize retraits de la correction, un par un : onze font échouer un test ; `autres.some(cle === undefined)` du sandbox et `envoyees = [constat]` de l'écran restent sans test. `tests/figmaDeTest.ts` gagne les données partagées d'une variable et `setBoundVariableForEffect`.

Galerie : `t-fusion-de-variables`, `t-fusion-ecrite`, `t-fusion-sautee`.

Commandes : `npm run typecheck --workspace ucm-architect-plugin` rend 0. `npm run test:paquet -- architect` : 2142 tests, 0 échec. `npm run galerie:plugin -- architect` construit 140 états.

Documents : `CARTE.md`, `SPEC.md` et `invariants/explorateur.md` d'Architect (une règle de fusion).

Reste : le second constat de retrait (kit et preuve du mainteneur), le statut de la carte, la confirmation éventuelle ; relecture de la galerie par le mainteneur.
