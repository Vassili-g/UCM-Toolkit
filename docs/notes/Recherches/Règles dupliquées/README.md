# Règles dupliquées

Le [référentiel UCM](../Référentiel%20UCM/README.md) range les définitions
UCM dans `packages/kit/src/referentiel/`, et `tests/referentielUnique.test.ts`
refuse une liste recopiée. Les règles écrites en code qui lisent ces
définitions n'ont pas de loi équivalente. Ce dossier en fait l'inventaire et
propose, pour chaque règle, un propriétaire unique et une loi anticopie.

Les règles retenues et leur implémentation sont suivies dans le
[plan Intégrité de la structure](../UCM%20Architect/8%20Intégrité%20de%20la%20structure/PLAN-IMPLEMENTATION.md).
L'audit conserve l'inventaire qui a servi aux décisions.

## Fichiers

| Fichier | Contenu |
|---|---|
| [AUDIT-REGLES-DUPLIQUEES.md](./AUDIT-REGLES-DUPLIQUEES.md) | Méthode, inventaire, une fiche par règle, non-doublons, documents en contradiction, questions, ordre proposé |

## Questions au mainteneur

L'audit relève vingt-neuf règles dupliquées. Sept sont de gravité haute : D-01, D-02, D-03, D-04, D-07, D-18 et D-20. Les lots U0 à U10 du plan portent les propriétaires et les lois anticopie. L'[audit](./AUDIT-REGLES-DUPLIQUEES.md#questions-au-mainteneur) détaille chaque question.

| Question | Sujet | Fiches | État |
|---|---|---|---|
| Q-01 | Reprise de session d'Architect quand les constats changent | D-01 | retenue, voir le plan |
| Q-02 | Retrait de `cleDuTheme` | D-02 | retenue, voir le plan |
| Q-03 | `État` et `Etat` reconnus comme axe d'états | D-03 | retenue, voir le plan |
| Q-04 | `tiny` et `huge` comme tailles UCM | D-06 | retenue, voir le plan |
| Q-05 | Domicile des champs de typographie | D-07 | retenue, voir le plan |
| Q-06 | Contraste dans la planche et les tests du navigateur | D-09 | retenue, voir le plan |
| Q-07 | Rôle d'une palette deviné par la teinte dans le hub | D-14 | retenue, voir le plan |
| Q-08 | Peinture visible : une règle pour Figma brut et pour le relevé | D-20 | retenue, voir le plan |
| Q-09 | Comptage des liaisons de layout d'un imbriqué par Architect | D-21 | retenue, voir le plan |
| Q-10 | Découpe en camel d'un terme saisi dans Nomenclature | D-25 | retenue, voir le plan |
| Q-11 | Une loi racine ou une loi par fiche | toutes | retenue, voir le plan |
