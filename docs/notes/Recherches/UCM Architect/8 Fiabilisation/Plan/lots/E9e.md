# E9e. Désactivés et limites de lecture

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9d.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.10 Variants désactivés (Q-F7-10, N-51, N-55, N-60). Gardez `disabled` et `disable`, ajoutez `Disabled=True` et `Enabled=False`.
  C53 dit que contraste et cible sont exclus. Mesurez encore `Inactive`, `read-only`, `dimmed` et le texte sous 12 px, même désactivé.
  `Survol` est une forme tolérée de `hover`.
- [ ] E9.12 Mode de fusion et flou d'arrière-plan (Q-F7-14, N-46). La limite dit « mode de fusion » pour un mode de fusion.
  N-46. Testez la priorité de `peinture-superposee` sur `degrade` quand les remplissages se superposent.
- [x] E9.13 Lecture partielle (N-53, N-54). Un cycle de `parent` termine. C49 et C50 ne jugent pas ce qui n'a pas été lu.
- [ ] E9.14 Monter la version du kit. Les nouvelles régressions F7 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E9.10, C53. Phrase : `Le variant ${variant} est désactivé : le contraste et la taille de la cible ne sont pas contrôlés.`
- E9.12. Nouvelles causes dans `CAUSES_DE_LIMITE` de `packages/plugin-architect/src/ui/textes/ignores.ts` : `'mode-de-fusion': 'a un mode de fusion'` et `'flou-arriere-plan': 'est posé sur un flou d’arrière-plan'`. N'écrivez ni « peinture » ni « mélange » dans un texte nouveau (Q-F7-14).

## Avancement

E9.10 et E9.13 faits. E9.12 est fait pour la cause `mode-de-fusion` et la priorité de `peinture-superposee`, pas pour le flou. E9.14 reste, la montée de version étant interdite dans cet appel.

- `packages/kit/src/controles/accessibilite.ts` : `ecritureDeLaDesactivation` désigne un variant désactivé par un état `disabled` ou `disable`, ou par `Disabled=True` ou `Enabled=False` ; C53 porte `faits.ecriture` (`Axe=Valeur`). `Inactive`, `read-only` et `dimmed` restent mesurés. `controlerLeTexteMinimal` lit aussi les variants désactivés. Un variant de `lecture.variantsNonLus` n'est pas jugé. C49 et C50 sautent un texte dont `texte` ou `fills` n'a pas été lu, un contour dont `strokes` manque, un layer dont un ancêtre a des `fills` manquants ; un anneau dont les peintures manquent compte comme existant. `pileDePeintures` rend `mode-de-fusion` pour un mode de fusion de remplissage, et `peinture-superposee` quand un autre remplissage visible est sous un dégradé ou une image. Le cycle de `parent` terminait déjà depuis E9b ; une régression le garde.
- `packages/kit/src/referentiel/vocabulaire.ts` : `ETATS_FRANCAIS_INTERACTIFS` (`survol`) fait lire C52 sur l'axe `État` à `Défaut` et `Survol`. `survol` n'est pas ajouté à `toleres` de `hover` : Nomenclature en tirerait la question `paire:hover|survol` et les faux positifs de F5 changeraient.
- `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` : `releve.lecture.variantsNonLus` entre dans le gabarit `controle-accessibilite`. `tests/projectionsDesControles.test.ts` compte donc l'accessibilité parmi les projections de la lecture d'une page de variants.
- `packages/plugin-architect/src/ui/textes/ignores.ts` et `ui/panneau/informations.ts` : phrase de C53 et deux causes de limite, telles que la note les écrit. Tests : `panneauElements.test.ts`, `panneauSections.test.ts`, `interface/accessibilite.test.mjs`.
- Tests du kit : 6 tests E9.10 à E9.13 dans `accessibilite.test.ts`. Le harnais F7 passe X1 à X3, G3, F3, F4, L1, L2 et Z2-14 à `attendu` ; la section B n'a plus d'écart nouveau.

Décisions prises :
- `Disabled ` (avec une espace) vaut `disabled` : le nom et la valeur sont rognés avant la comparaison.
- Le texte de C53 nomme l'écriture trouvée (`Disabled=True`, `State=disabled`). Sans `faits.ecriture`, l'interface garde l'ancien repli sur la valeur `Disabled`.

Reste de E9.12 : le relevé ne lit ni le mode de fusion du layer ni ses effets (`LayerLu` n'a que `blendMode` par peinture). La cause `flou-arriere-plan` a son texte mais aucun code ne l'émet ; il faut lire `effects` et `blendMode` du layer dans `packages/plugin-architect/src/releveDuComposant.ts` (fichier hors de ce lot).

Reste de E9.14 : monter la version du kit (F2).

Textes manquants : aucun.

