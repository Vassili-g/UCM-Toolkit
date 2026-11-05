# E5a. Layers masqués et rôles

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E1b.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f3-composant/`. Lisez `PLAN-STRESS-F3-F4-COMPOSANT.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.1 Layers masqués (Q-F3-1). C25 et C29 jugent un layer masqué ou sous un ancêtre masqué. La carte dit que le layer est masqué.
  Une instance imbriquée reste une frontière (Q-F3-2).
- [x] E5.2 C25 juge toute peinture sans token, pas seulement `title` (E-25, N-11). Il saute l'opacité 0 et la lecture mixte (N-12).
- [ ] E5.3 Nom et rôle (Q-F3-3, N-22). C24 lit la table de E1.5 dans les deux sens. La correction propose le token ou le nom, s'il est
  unique.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E5.1. Une phrase précède la phrase du constat C25 ou C29 : `Le layer ${layer} est masqué.`, ou `Le layer ${layer} est dans ${ancetre}, qui est masqué.` pour un ancêtre masqué. Le statut ne change pas.
- E5.3. Les cases de correction : `Lier à \`${token}\`` quand le token est unique, `Renommer le layer en ${nom}` quand le nom est unique.

## Avancement

Code et tests écrits, non commités. E5.2 est cochée ; E5.1 et E5.3 restent ouvertes parce que l'interface d'Architect n'est pas dans les fichiers du lot.

Fait :

- E5.1, côté kit. `controles/corrections.ts` : C25 et C29 jugent un layer masqué ou sous un ancêtre masqué. Le constat porte `faits.masque` (`layer` ou `ancetre`) et `faits.ancetre` (nom du parent masqué). L'instance imbriquée reste une frontière pour C25 comme pour C29.
- E5.2. C25 juge toute peinture unie visible d'opacité non nulle, une par peinture, y compris celles des plages de texte (`faits.plageDebut`, `faits.plageFin`, id `C25:variant:layer:champ:p0-5`). Un champ dont la lecture a échoué est sauté. Le token proposé se choisit par les rôles de `rolesAdmisDuLayer` (`mapping.ts`), la lecture du token (rôle, valeur de chaque axe du jeu, élément qui nomme le layer) et non plus par le suffixe du nom : l'ordre des propriétés du jeu ne compte plus (N-11). Deux candidats ou plus donnent une question sans case cochée. `couleursDuComposant` quitte l'index, remplacé par un cache des candidats par variant, rôles et forme du nom.
- E5.3, côté kit. `mapping.ts` exporte `rolesAdmisDuLayer`, qui lit `roleQueLeLayerDesigne` : un layer `Divider`, `Separator`, `Ring` ou `Focus ring` (hors texte) n'admet que son rôle, sur son fond comme sur son trait ; un token `divider`, `ring` ou `icon` sur un autre layer reçoit déjà un constat ; `inverse` ne donne plus de constat. La correction de C24 propose le token du rôle attendu quand il est unique, sinon une question.
- Oracles du harnais F3 : U1 (`Ring` en rôle `ring`, `Shape` et `Union` en `background`, plage de texte avec son début), U2-8 et U2-9 (layers masqués jugés), K4 (fond de `Ring` en rôle `ring`), `C25` dans `CODES_A_PLAGE`. Plus aucun cas `mesure` dans U1 et U2.

Tests : `tests/layers-masques-et-roles.test.ts` (13 tests, E5.1 à E5.3), retouches de `corrections.test.ts`, `corrections-index.test.ts` (empreinte reprise), `controles-c29-perimetre.test.ts`, `stressComposantOperateursBis.test.ts`. Les 23 tests ajoutés ou changés des lots E5a et E5b échouent sur les sources d'avant (vérifié sur une copie).

Commandes : `npm run build --workspace @ucm-kit/core` passe. `npm run test --workspace @ucm-kit/core` : 1585 tests, seul « 32 000 noms » dépasse son chrono sous charge, il passe seul. `npm run typecheck` rend 0. `node scripts/run-tests.cjs` : `versionSuitLeContenu` attendu, trois échecs dans des fichiers d'autres sessions. `npm run stress:composant -- --operateur U` (et M, K1, R) : 0 écart.

Reste :

- E5.1 : la phrase `Le layer ${layer} est masqué.` ou `Le layer ${layer} est dans ${ancetre}, qui est masqué.` se pose avant celle du constat dans `packages/plugin-architect/src/ui/ignores/modele.ts` (cas `C25` et `C29`) et dans la carte de la question. Elle lit `faits.masque` et `faits.ancetre`.
- E5.3 : `Renommer le layer en ${nom}` suppose un type de correction qui renomme un layer ; `Correction.sorte` n'en a pas et l'écriture d'Architect non plus. Le libellé `Lier à \`${token}\`` relève aussi de l'interface. Question ouverte pour le mainteneur : ajouter cette sorte (`format/types.ts`, schéma, écriture) ou garder la seule liaison.
- Cartes : lignes de `corrections.ts`, `couche.ts` et `mapping.ts` ajoutées à `packages/kit/CARTE.md`.
