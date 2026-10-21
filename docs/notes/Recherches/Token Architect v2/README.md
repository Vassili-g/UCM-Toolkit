# UCM Token Architect

Ce dossier prépare UCM Token Architect, qui réunit UCM Token Explorer
(`packages/plugin-explorateur`) et UCM Nomenclature
(`packages/plugin-nomenclature`). Le mode Composant valide un composant et aide
à lier ses variables ; le mode Tokens affiche Nomenclature à côté de l'arbre des
variables.

| Document | Contenu |
|---|---|
| [PREPARATION-TOKEN-ARCHITECT.md](./PREPARATION-TOKEN-ARCHITECT.md) | Les demandes du mainteneur, l'existant, les contraintes, chaque fonction possible avec sa faisabilité et son utilité, l'avis, l'ordre proposé et les décisions |
| [GRAMMAIRE-DES-COMPOSANTS.md](./GRAMMAIRE-DES-COMPOSANTS.md) | Forme proposée des chemins de `components`, ses règles, et les écarts que Token Architect relèverait sur l'export du mainteneur |
| [APERCU-GENERATION-TOKENS-COMPOSANT.md](./APERCU-GENERATION-TOKENS-COMPOSANT.md) | Ce que donnerait la génération des tokens d'un composant : déductions, questions, parcours entre les deux fichiers, prérequis, coût et avis |

Les recherches antérieures sur Nomenclature et sur le contrôle de structure des
tokens restent dans [Plugin Architect](../Plugin%20Architect/README.md).

## Où en est le sujet

Document préparatoire écrit ; les réponses du mainteneur sont rangées à sa
section 8. Prochains gestes : les maquettes des deux modes, et le déplacement
des contrôles de l'export dans le kit. Q6 (génération, avec son aperçu) et Q13
(grammaire des composants) restent ouvertes.
