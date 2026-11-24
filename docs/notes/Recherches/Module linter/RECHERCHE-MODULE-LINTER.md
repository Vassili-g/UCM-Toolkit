# Module linter

Ce document s'adresse au développeur qui écrit le module linter
d'intencial-library (piste P26). Il dit ce qu'UCM fournit, ce qu'UCM impose et
pourquoi, ce qui reste libre, et ce qu'UCM ne sait pas encore. Il ne dit pas
comment écrire le module. Les sources citées font autorité. Ce document y
renvoie sans les recopier.

## 1. Le contexte en bref

Le designer exporte de Figma un contrat par composant (`Button.contract.json`)
et un fichier de tokens commun (`tokens.json`). Le contrat dit quelles valeurs
visuelles le composant emploie, en citant des tokens. Le développeur écrit le
composant contre ce contrat. Dans chaque pull request, `ucm check` compare le
code au contrat et bloque un écart, selon la règle du dernier modifié.

Le module linter montre ces écarts dans l'éditeur, avant la pull request. Le
premier lot porte deux règles :

| Règle | Ce qu'elle signale |
|---|---|
| `token-inconnu` | une référence ou une variable CSS qui ne nomme aucun token de `tokens.json` |
| `valeur-en-dur` | une couleur, une longueur ou un nombre visuel que le contrat ne publie pas |

À lire d'abord : [`CONCEPT.md`](../../../../CONCEPT.md) (le modèle, une page), puis
le guide [`LINTER-UCM.md`](../../../guides/LINTER-UCM.md) (ce que vérifient les
deux règles et ce qu'elles ne voient pas).

## 2. Ce qu'UCM fournit

Trois paquets publiés sur npm. Le module les épingle à la version exacte :
`@ucm-kit/core` 0.18.0, `@ucm-kit/cli` 0.4.0 et `@ucm-kit/adapter-typescript`
0.3.0.

| Pièce | Où | Ce qu'elle fait |
|---|---|---|
| `preparerControle` | `@ucm-kit/core/modules` | Juge un fichier de composant contre son contrat et `tokens.json`, applique les dérogations, rend des constats et des limites, chacun avec son message complet |
| `lecteurDuCode` | `@ucm-kit/adapter-typescript/usages` | Lit la syntaxe d'un fichier `.ts` ou `.tsx`, sans juger, et trouve les fichiers d'un composant |
| `ucm check` | `@ucm-kit/cli` | Rend le verdict de la pull request avec le même juge |
| `ucm deroger` | `@ucm-kit/cli` | Écrit une exception motivée dans `.ucm/derogations.json`. Chaque message d'écart donne la commande complète |
| `ucm tokens references` | `@ucm-kit/cli` | Remplace dans le code chaque `"{chemin}"` par `"var(--nom)"` exact |

Les formes exactes :

- les types de la prise du kit, `packages/kit/src/modules/index.d.mts` (`ControleDuFichier`, `Constat`, `Limite`, et le relevé du code) ;
- les types du lecteur, `packages/adapter-typescript/src/usages.d.mts` ;
- des appels réels et leurs résultats, `packages/kit/tests/prise-exemples.mjs` et `prise-attendus.json` ;
- la façon dont un module reçoit le kit, [`MODULES.md`](../../../guides/MODULES.md) ;
- le détail du juge et du lecteur, le [cadrage de P6, §6 et §7](../Linter%20Dev/RECHERCHE-CADRAGE-P6.md#6-la-séparation-entre-kit-adaptateur-et-module).

Faits utiles :

- `debut` et `fin` d'un constat sont des décalages dans le texte reçu, sans BOM.
- Le juge ne garde rien d'un appel à l'autre et ne lève jamais : une panne de lecture devient une limite.
- Les listes du juge (familles, propriétés, valeurs neutres, codes) vivent dans `packages/kit/src/lecteurs/controle-du-code-listes.mjs`. La section 6 de [`INVENTAIRE-UCM.html`](../../../../INVENTAIRE-UCM.html) les affiche.

## 3. Ce qu'UCM impose, et pourquoi

| Règle | Pourquoi |
|---|---|
| Le module importe seulement `@ucm-kit/core/modules` et `@ucm-kit/adapter-typescript/usages` | Ces deux portes sont promises et versionnées ; tout autre chemin peut changer sans préavis |
| Une règle ESLint par valeur de `regle` d'un constat, sans recopier les codes ni les listes du kit | Une liste réglée côté UCM change avec la version du kit ; une copie divergerait |
| Le message d'un constat s'affiche tel que le juge le rend | Il porte la commande de dérogation, et le même texte apparaît dans le rapport d'`ucm check` |
| Un constat qui porte `deroge` ne s'affiche jamais en erreur ; un constat `non-analyse` au plus en information | L'éditeur doit dire ce que dira la CI |
| `eslint-disable` n'a aucun effet sur une règle UCM | `ucm check` ignore les commentaires et rend `desactivation-interdite` ; la seule exception admise est la dérogation motivée |
| Le cache d'ESLint reste désactivé pour les règles UCM | Le juge relit le contrat et `tokens.json` à chaque appel ; un cache montrerait un verdict périmé après un réexport |
| Le module et la CLI emploient le même `@ucm-kit/core`, épinglé à l'exact | Deux kits différents jugeraient différemment ; `ucm check` avertit quand ils diffèrent |
| Une correction automatique se limite à remplacer `"{chemin}"` par `"var(--nom)"` | Plusieurs tokens peuvent porter la même valeur : corriger une valeur en dur serait deviner |
| Le verdict de la pull request appartient à `ucm check` | Il applique la règle du dernier modifié, que le module ne connaît pas |

La règle du dernier modifié et ses cas :
[`DECISION-VERDICT-UCM-CHECK.md`](../Linter%20Dev/DECISION-VERDICT-UCM-CHECK.md)
et [`POUR-LES-DESIGNERS.md`, §6](../../../guides/POUR-LES-DESIGNERS.md#6-ce-qui-bloque-la-fusion-et-ce-qui-avertit).

## 4. Ce qui est libre

- L'emplacement du module : plugin local dans intencial-library, ou paquet à part.
- Son organisation, sa configuration, son niveau de sévérité par défaut et son intégration dans l'éditeur.
- La présentation des limites et des valeurs non jugées, dans le respect de la section 3.
- Ses tests (par exemple `RuleTester`) et la mesure du temps d'analyse.
- Les autres règles ESLint de la bibliothèque, et le job ESLint de la CI pour elles.

## 5. Ce qu'UCM ne couvre pas encore

- Le lecteur lit les objets `style`, les objets typés `CSSProperties` et les tables de valeurs. Il ne lit ni CSS Modules ni CSS-in-JS. Si intencial-library écrit ses styles autrement, le linter n'aura presque rien à juger : dites-le, l'adaptateur recevra un second relevé.
- Une valeur calculée par le code (`taille * 2`) n'est pas jugée ; le constat `non-analyse` la compte.
- Les règles 3 et 4 (une prop, une variante ou un élément absents du contrat) ne sont pas décidées.
- L'adaptateur embarque TypeScript 5.9. `@typescript-eslint/parser` refuse encore TypeScript 7, donc le projet reste en TypeScript 6.

## 6. Quand quelque chose cloche

| Constat | Ce qui se passe |
|---|---|
| Un faux positif d'une liste (une valeur neutre qui manque, une propriété mal classée) | Le mainteneur règle la liste dans le kit ; une nouvelle version suit |
| Un défaut de lecture du code | Un correctif de l'adaptateur, dernier chiffre de sa version |
| Une forme de la prise qui gêne le module | Le mainteneur décide d'un ajout ou d'une rupture de la prise |

La fiche de la piste, dans la Roadmap de l'inventaire, donne les critères de
fin du module.

## Questions au mainteneur

- Comment intencial-library écrit-elle ses styles : objets `style`, CSS Modules ou CSS-in-JS ?
- Le linter refuse-t-il une prop, une variante ou un élément absents du contrat (règles 3 et 4) ?
