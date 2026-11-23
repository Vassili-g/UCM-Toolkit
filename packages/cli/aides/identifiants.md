---
aide: identifiants
quand: toujours
---

## Sens

Le point d'entrée du composant et sa surface de propriétés portent les noms que
le contrôle de parité du repository attend. Ces noms se lisent dans les
conventions du repository, ou dans l'erreur du contrôle, et jamais dans le
source d'un autre composant. `name` garde le nom Figma exact. L'identifiant de code vient de `codeIdentifier`, et le guide l'imprime dans « Contexte du contrat » : il nomme le fichier du contrat. Avec l'adaptateur TypeScript, l'interface attendue est `<identifiant>Props`.

## Question

Quels noms portent le point d'entrée du composant et sa surface de propriétés ?

## Preuve

`ucm check`, section parité.
