# E1b. Icône, anneau et rôle de layer

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E1a.

Fichiers : `packages/kit/src/controles/mapping.ts`, `packages/kit/src/controles/typographie.ts`,
`packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/composant/signes.ts`.
Auditez aussi `packages/plugin-socle/src/composant/contract/imbriques.ts`, sans changer sa règle d’export sur son seul nom.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E1.3 Définition unique d'une icône (Q-F6-3, Q-F3-4, Q-F6-4, E-26). L'instance d'un composant `Icon` est le cas principal. Puis
  une instance qu'une propriété INSTANCE_SWAP pilote, dont la propriété ou le layer porte un mot d'icône, ou un VECTOR ou
  BOOLEAN_OPERATION dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol`. Un FRAME ou un TEXT n'est jamais
  une icône. Les contrôles importent la définition commune du kit. Auditez aussi
  `packages/plugin-architect/src/ui/composant/signes.ts` (`estUnLayerDIcone`, `estUnTokenDIcone`).
  Distinguez la responsabilité d'export de `packages/plugin-socle/src/composant/contract/imbriques.ts` (`estUneIcone`).
  Ne supprimez pas ce lecteur sur son seul nom.
- [ ] E1.4 Définition d'un anneau (Q-F7-9). Un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `NOM_D_ANNEAU`
  passe dans le référentiel.
- [ ] E1.5 Rôles qui désignent un layer (Q-F3-3). `divider` (noms `Divider`, `Separator`), `ring` (noms `Ring`, `Focus ring`) et `icon`
  (instance d'`Icon`). Les autres rôles ne regardent pas le nom.
- [ ] E1.7 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Avancement

Pas commencé.
