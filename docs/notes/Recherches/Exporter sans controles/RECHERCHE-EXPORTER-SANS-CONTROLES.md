# Exporter sans controles

P33 retire de l'Exporter le jugement du composant, et laisse Architect le tenir. Cette recherche relève les constats de l'Exporter et isole ceux qui ne doivent pas disparaître.

## Résultat

Huit constats doivent rester dans l'Exporter, parce que seul l'Exporter connaît le dépôt et le fichier qu'il écrit. Les constats sur le dessin peuvent quitter l'interface de l'Exporter : Architect les reçoit déjà tous. Les pertes du contrat doivent quitter l'interface sans quitter `meta.diagnostics`, que le développeur et `ucm check` lisent.

## Le moteur est commun

Les constats sur le composant naissent dans le moteur de `packages/plugin-socle/src/composant/`, que l'Exporter et Architect appellent tous deux. Architect traduit chaque point du moteur en constat du kit (`packages/plugin-architect/src/constatsDuMoteur.ts`, `TABLE_DU_MOTEUR`) : C30, C34, C35, C41, C42 ou C44. Un point qu'aucune règle de la table ne reconnaît devient un C42 « à vérifier » avec son contenu.

Retirer un contrôle du moteur le retirerait donc aussi d'Architect. P33 change seulement ce que l'Exporter montre et ce qui fait son verdict, pas le moteur.

Aucun point du moteur ne bloque la publication aujourd'hui (`packages/plugin-exporter/src/prevol.ts`, `verdictDePrevol`) : le bouton Publier tombe seulement sur un refus du dépôt ou un réglage.

## Constats à garder dans l'Exporter

Architect ne voit ni le dépôt, ni la configuration, ni le `tokens.json` produit. Ces constats restent dans l'Exporter, en agnostique comme en full UCM.

| Constat | Où | Effet |
|---|---|---|
| Deux composants écriraient le même contrat | `packages/plugin-exporter/src/depot.ts`, `refusDeCollision` | refus |
| Le contrat cite une variable absente du `tokens.json` de la base et des demandes ouvertes | `packages/plugin-exporter/src/depot.ts`, `refusDeReferences` | refus |
| Gestion des tokens désactivée | `packages/plugin-exporter/src/code.ts` | refus des tokens |
| Jeton refusé | `packages/plugin-exporter/src/connexion.ts` | refus |
| `ucm.config.json` mal formé | `packages/plugin-exporter/src/depot.ts` | refus |
| Tokens à faire fusionner d'abord | `packages/plugin-exporter/src/prevol.ts` | consigne |
| Deux variables donnent le même token, le même groupe ou la même extension | `packages/plugin-socle/src/composant/variables.ts`, `packages/plugin-exporter/src/tokens/exportTokens.ts` | avertissement |
| Une donnée des variables se perd dans `tokens.json` (graisse, mode, profil de couleur, famille typographique, référence écartée) | `packages/plugin-exporter/src/tokens/exportTokens.ts` | avertissement |

Les deux dernières lignes portent sur l'export des tokens, qu'Architect ne fait pas.

## Constats du contrat à garder dans le contrat

Ces points disent au designer ce que le développeur n'aura pas. Architect les reçoit, en C42 pour la plupart, mais le développeur les lit dans `meta.diagnostics` du contrat et dans le corps de la demande de fusion.

- Un composant imbriqué sans ses règles, seul point `danger` du moteur (`packages/plugin-socle/src/composant/contract/imbriques.ts`). La demande de fusion le publie en `UCM_PORTABLE_PROJECTION_WARNING`.
- Une propriété Figma que le contrat ne représente pas : dégradé, mode de fusion, masque, pointillé, OpenType (`unsupportedProperties.ts`).
- Un alignement ou une taille de grille illisible (`flexLayout.ts`, `extractSlotTokens.ts`).
- Un calque absent, en double ou trop profond dans le contrat (`resultat.ts`, `structureTree.ts`, `extractStructure.ts`).
- Une dépendance non décrite ou introuvable (`composedComponents.ts`, `layoutNodes.ts`).
- Une propriété qui pilote un calque d'une manière que le contrat ne publie pas (`propertyBindings.ts`).
- Une règle `@icons` ou une description qui vise une cible absente ou ambiguë (`mergeIconRules.ts`, `merge*Descriptions.ts`).
- Deux propriétés au même nom (`propertySurface.ts`, `proprietesEtEtats.ts`).

Retirer ces points de l'Exporter les retirerait de `meta.diagnostics`, et le développeur recevrait un contrat incomplet sans le savoir. L'Exporter peut cesser de les montrer au designer, mais il doit continuer de les écrire dans le contrat.

## Constats sur le dessin

Liaison manquante, couleur en dur, calque masqué sans pilote, état mal écrit, style de texte absent, auto layout absent, effet sans style, règles absentes : Architect reçoit chacun, par la table du moteur ou par ses propres contrôles (C25, C29, C34, C35, C43, C64, C65, C80). L'auto layout absent et l'effet sans style n'ont pas de contrôle propre dans Architect, et arrivent en C42 « à vérifier ».

Ces constats peuvent quitter l'interface de l'Exporter. Une liaison absente reste vraie dans le contrat (le token manque), donc `meta.diagnostics` peut aussi les garder sans coût.

## Décisions du mainteneur

1. Les pertes du contrat quittent l'interface de l'Exporter et restent dans `meta.diagnostics` et dans le corps de la demande de fusion, pour le développeur.
2. Le sceau de P34 ne se pose pas tant qu'un point « à vérifier » reste ouvert. Le designer écarte un point « à vérifier » avec Ignorer, et le sceau se pose ensuite. Ignorer existe déjà dans un fichier full UCM (`packages/plugin-architect/src/ecriture/ignores.ts`). Un point ignoré reste dans `meta.diagnostics`, puisque le contrat garde ses pertes.
3. L'Exporter ne garde dans son interface que les huit constats du tableau.
