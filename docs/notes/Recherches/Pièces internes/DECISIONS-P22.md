# Les décisions de P22, expliquées simplement

Ce document prépare la séance où le mainteneur tranche l'étape 0 du [plan](./PLAN-P22.md). Pour chaque question, il donne la réponse recommandée, pourquoi, et ce qu'elle change dans Figma. Le détail technique et les preuves sont dans l'[audit](./AUDIT-CONCEPTION-P22.md), sous le numéro de faille cité.

## 1. Le sujet en trois phrases

Un composant contient souvent d'autres composants. Aujourd'hui, l'Exporter les aplatit dans le composant hôte, et le contrat perd tout ce que l'hôte ne montre pas. P22 donne à chaque sous-composant interne sa propre description complète dans le contrat de l'hôte.

Deux composants de test servent de référence :

- Button contient `.sizeWrapperButton`, qui porte le texte, les icônes et l'axe de taille. Ses propriétés sont exposées sur le Button : dans Figma, le designer règle la taille et le texte directement sur le Button. Ses couleurs ne servent qu'à le voir dans Figma ; le Button les remplace toutes.
- Groupe contient cinq segments `.Segment`. Ils portent tous les axes qui comptent (sélection, état, position) et leurs vraies couleurs. Leurs propriétés restent internes, et aucun réglage de segment ne se fait depuis le Groupe.

## 2. Le vocabulaire

| Mot | Sens |
|---|---|
| Dépendance | Un composant publié, avec ses règles et son propre contrat, comme `Icon` |
| Pièce | Un sous-composant interne, au nom préfixé par `.` ou `_`, sans contrat propre, comme `.Segment` ou `.Ring` |
| Wrapper | Une pièce dont les propriétés sont exposées sur l'hôte, comme `.sizeWrapperButton` |
| Couleur d'aperçu | Une couleur posée dans le maître d'une pièce seulement pour la voir dans Figma, que l'hôte remplace partout |
| Renvoi | Ce que le contrat de l'hôte écrit à l'endroit où il pose une pièce : quelle variante, et ce qu'il y change |

## 3. Les réponses en un tableau

| # | La question | Réponse recommandée | Confiance |
|---|---|---|---|
| D1 | Comment distinguer un wrapper d'une pièce ? | Par l'exposition Figma des propriétés | Forte, vérifiée sur les 3 cas réels |
| Choix 1 | Où ranger les pièces dans le contrat ? | Un bloc `pieces` à part | Forte |
| Choix 3 | Une pièce dans une pièce ? | Toutes les pièces à plat, chacune décrite une fois | Forte |
| D2 | Quelles couleurs d'une pièce publier ? | Jugées emplacement par emplacement, sur leur liaison et leur surcharge | Forte |
| D3 | La couleur d'une icône posée par l'hôte ? | L'hôte la publie ; le contrat d'`Icon` dit qu'elle vient de l'hôte | Forte |
| D4 | Comment écrire un renvoi ? | Toujours complet, sans héritage implicite | Forte |
| D5 | Qu'est-ce qui oblige une pièce à avoir des règles ? | Une propriété qui laisse un choix | Forte |
| D6 | Une pièce dans un `SLOT` ? | Le contenu par défaut du `SLOT` de l'hôte est décrit ; le `SLOT` d'une pièce rempli par l'hôte avertit d'abord | Moyenne, à confirmer sur un fichier de test |
| D7 | Une pièce partagée par deux hôtes ? | Décrite dans chaque hôte, sans détection | Forte |
| Q5 | Les dépendances posées dans une pièce ? | Rangées dans l'entrée de la pièce | Forte |
| Choix 5 | Garder les deux préfixes `.` et `_` ? | Oui | Forte |
| Parité | Comparer le code d'une pièce ? | Seulement si le code déclare `<Pièce>Props` | Forte |
| D8 | Où « Relier le composant » écrit-il la liaison d'une pièce ? | Couleur réelle dans le maître, couleur d'aperçu dans l'instance | Moyenne, attend la maquette de P31 |
| D10 | Garder l'essai R1 dans Figma ? | Non, les captures l'ont établi | Forte |
| 2.3c | Que conseiller quand un même token de contour a deux épaisseurs ? | Seulement « reliez-les à deux variables différentes » | Forte |

D9, les noms tirés d'une capture client, est déjà tranchée : noms inventés, historique purgé.

## 4. Chaque décision

### D1. Comment distinguer un wrapper d'une pièce ?

Réponse : par l'exposition des propriétés dans Figma. Une instance imbriquée dont le designer a coché « Expose properties from nested instances » est un wrapper, et ses propriétés font partie de l'API de l'hôte, comme Figma les montre. Une instance préfixée non exposée est une pièce, décrite dans le bloc `pieces`.

Pourquoi : aujourd'hui, l'Exporter devine le wrapper à ses dimensions liées, et il se trompe. Il prend `.Segment` pour le wrapper de Groupe, ce qui fait entrer six propriétés du segment dans l'API du Groupe et produit les faux messages « theme est déclaré deux fois ». L'audit proposait une autre devinette (un axe de taille). L'exposition est mieux : c'est le designer qui l'a déclarée, et elle tombe juste sur les trois cas mesurés (`.sizeWrapperButton` exposé dans 90 variantes sur 90, `.Ring` dans 0 sur 18, `.Segment` dans 0 sur 15).

Ce que ça change pour toi : rien à faire de nouveau. Une pièce dont tu veux régler les propriétés depuis l'hôte, tu l'exposes, comme tu le fais déjà pour le wrapper du Button. Le Button garde son API actuelle.

Faille : F1, F4.

### Choix 1. Où ranger les pièces dans le contrat ?

Réponse : un bloc `pieces` à la racine du contrat, une entrée par pièce. `composes` garde son sens actuel, la liste des dépendances qui ont leur propre contrat.

Pourquoi : un lecteur du contrat ne doit pas deviner si une entrée de `composes` a un contrat ailleurs ou non.

Ce que ça change pour toi : rien dans Figma.

### Choix 3. Une pièce posée dans une autre pièce ?

Réponse : toutes les pièces à plat. Chacune a une seule entrée, même si elle est posée à plusieurs niveaux ; chaque endroit où elle est posée y renvoie.

Pourquoi : une pièce décrite à deux endroits finirait par se contredire.

Ce que ça change pour toi : rien.

### D2. Quelles couleurs d'une pièce publier ?

Réponse : chaque emplacement coloré du maître de la pièce (un calque, un champ, une couleur) se juge sur deux faits.

1. Lié à un token du composant hôte : couleur réelle, publiée.
2. Non lié à un token du composant, et remplacé par chaque instance posée qui le montre : couleur d'aperçu, ignorée sans message.
3. Tous les autres cas : anomalie signalée, jamais supprimée ni publiée en silence.

Trois précisions viennent de l'audit :

- Le jugement porte sur l'emplacement, sur toutes les variantes de la pièce. Sinon, les variantes `Large` et `Small` du wrapper, que le Button ne pose jamais, produiraient 8 faux avertissements (F14).
- Le cas 2 exige qu'au moins une instance posée montre l'emplacement. Sans instance, rien ne prouve qu'il est remplacé, et il tombe dans le cas 3 (F15).
- « Token du composant » a une seule définition, dans le kit : un token rangé sous le dossier des composants, la collection `components` en full UCM, ou le dossier désigné dans un fichier libre. Aujourd'hui, deux définitions coexistent et se contredisent (F13). Dans un fichier libre sans dossier désigné, l'Exporter ne juge que le remplacement et publie le reste comme aujourd'hui (F17).

Ce que ça change pour toi : dans le maître d'une pièce, les couleurs qui comptent se lient aux tokens du composant hôte. Les couleurs d'aperçu restent libres. Le Button ne produit aucun message ; le Groupe signale les couleurs de `container` et du halo de focus, à relier.

Failles : F13, F14, F15, F17, F18.

### D3. La couleur d'une icône posée par l'hôte

Réponse : l'hôte publie la couleur qu'il pose sur chaque icône, et le contrat d'`Icon` dit que sa couleur vient de l'hôte. Une règle `@icons` de l'hôte peut viser une icône devenue dépendance ; le contrat garde alors la prop qui choisit le glyphe (`iconLeftName`).

Pourquoi : aujourd'hui, une couleur posée dans une dépendance disparaît du contrat sans message. Dans le Groupe, la couleur de l'icône suit la sélection et l'état du segment, ce que l'axe `Color` d'`Icon` ne sait pas dire. La couleur posée par l'hôte est la seule source exacte (F19). Le moteur la reconnaît en comparant la liaison de chaque emplacement à celle du maître d'`Icon`, et non par la liste des surcharges de Figma, qui confond une couleur voulue avec celle d'un glyphe échangé (F20).

Ce que ça change pour toi : rien de nouveau. Tu continues de poser la couleur de l'icône dans l'hôte ou dans la pièce, liée au bon token.

Failles : F19, F20, F21.

### D4. Comment écrire un renvoi ?

Réponse : un renvoi est toujours complet. Il nomme la variante de la pièce par son identifiant Figma, et publie toujours la vue et les couleurs effectives à cet endroit. Une couleur absente veut dire « pas de couleur », comme partout ailleurs dans le contrat.

Pourquoi : si un champ absent voulait dire « reprendre celui de la variante », le contrat aurait deux sens pour l'absence, et une couleur vidée volontairement disparaîtrait à l'écriture du fichier (F6). Le prix est un contrat un peu plus long ; la mesure de taille du plan (case 1.5) le chiffrera.

Ce que ça change pour toi : rien.

Failles : F6, avec Q3 et Q4 de l'étude.

### D5. Qu'est-ce qui oblige une pièce à avoir des règles d'usage ?

Réponse : une propriété qui laisse un choix. Un axe à au moins deux valeurs, un booléen, un texte, un échange d'instance ou un `SLOT`. Une pièce sans choix n'a pas de règles, mais reçoit quand même son entrée dans le contrat (Q2).

Pourquoi : `.Ring` n'a que l'axe `Property 1 = Default`, que Figma crée par défaut. Avec la règle actuelle, il exigerait un bloc de règles, et l'export du Button bloquerait pour rien (F33).

Ce que ça change pour toi : tu écris les règles des pièces qui ont de vrais réglages, et seulement elles.

### D6. Une pièce dans un `SLOT`

**La réponse, en deux parties.** Le contenu par défaut d'un `SLOT` de l'hôte reste décrit dans le contrat, comme aujourd'hui, et la pièce qu'il contient reçoit son renvoi (c'est le segment du milieu du Groupe). Le cas inverse, un `SLOT` d'une pièce que l'hôte remplit, avertit d'abord ; il sera décrit quand un fichier de test le contiendra (Q6).

Pourquoi : le premier cas existe et se décrit sans changer le sens du contrat. Le second n'a encore aucun exemple réel pour vérifier une forme.

Ce que ça change pour toi : rien pour le Groupe. Le fichier de test du plan (case 1.3) peut ajouter le second cas.

Faille : F12.

### D7. Une pièce partagée par deux hôtes

Réponse : elle est décrite dans chaque hôte, sans détection. Ses couleurs se jugent contre l'hôte exporté ; une couleur liée aux tokens d'un autre hôte avertit.

Pourquoi : la forme par hôte la décrit déjà sans perte. La détecter demanderait de lire tout le document, ce que l'Exporter s'interdit.

Ce que ça change pour toi : rien. Une pièce vraiment partagée gagne à devenir un composant publié avec son contrat.

Faille : F5.

### Q5. Les dépendances posées dans une pièce

Réponse : chaque entrée de pièce garde ses propres dépendances. Les lecteurs font l'union quand ils ont besoin de la liste complète.

Pourquoi : une dépendance reste attachée au composant qui la pose, et le compte des instances reste juste (F27).

### Choix 5. Les préfixes `.` et `_`

Réponse : garder les deux. Figma ne documente que le point pour masquer un composant à la publication, mais la reconnaissance d'une pièce ne dépend pas de la publication.

### Parité

Réponse : l'Adaptateur compare les props d'une pièce quand le fichier de l'hôte déclare `<Pièce>Props`, exportée ou non. Sinon, le rapport dit « pièce non comparée ».

Pourquoi : exiger un export du type contredirait une pratique courante (les modules internes de Primer).

### D8. Où « Relier le composant » écrit la liaison d'une pièce

Réponse : une couleur réelle se relie dans le maître de la pièce, une couleur d'aperçu dans chaque instance posée. C'est ce que font déjà le Groupe (dans le maître) et le Button (dans les instances).

À trancher avec la maquette de P31 (case 2.1 de son plan), qui montrera le geste.

Faille : F32.

### D10. L'essai R1 dans Figma

Réponse : le retirer du plan. Les captures montrent qu'Architect lit les 90 variantes de `.Segment` rangées sur une autre page, et le moteur charge déjà la page de chaque pièce. Un geste de moins pour toi.

Faille : F42.

### 2.3c. Deux épaisseurs pour un même token de contour

Réponse : garder un seul conseil, « reliez la couleur de contour de chaque position à une variable différente ». Le conseil « réglez les deux strokes de la même façon » casserait un dessin juste. Le message disparaîtra avec la version du contrat de P22, où chaque variante de la pièce a ses propres contours.

Faille : F44.

## 5. Réponses du mainteneur

Le mainteneur valide la réponse recommandée de Choix 1, Choix 3, D2, D3, D4, D6, D7, Choix 5, Parité, D10 et 2.3c.

D1 est tranchée par l'[étude de D1](./ETUDE-D1-WRAPPER-ET-PIECE.md). Le mainteneur retient l'option E, la description fidèle sans classement, et ses cinq réponses recommandées (E1 à E7, avec L6). Toute instance préfixée qui n'est pas une dépendance est une pièce, et la sorte `wrapper-de-dimensions` disparaît. L'exposition ne classe rien : elle remplit l'API de l'hôte, qui contient exactement les propriétés que Figma montre sur l'hôte. Le critère de l'exposition est refusé, parce qu'un designer peut oublier la case. La taille de `.sizeWrapperButton` se choisit sur une instance de Button (Small, Medium, Large), sans valeur libre, et le Button règle le texte et les couleurs du wrapper.

Q5 est validée : `Icon` est une dépendance de la pièce `.sizeWrapperButton`, et se range dans l'entrée de la pièce. D5 est validée, avec la précision E5 de l'étude : les props d'une pièce exposée se documentent dans le bloc de l'hôte, et une pièce dont tous les choix sont exposés n'a pas de bloc à elle. D8 attend la maquette de P31.

## 6. Après la séance

Les réponses retenues cochent les cases 0.1 à 0.15 du plan, avec le hash du commit. Les lots de code commencent ensuite, dans l'ordre du plan ; la case 2.3 ne change pas le contrat, mais elle attend P33, qui décide quels diagnostics l'Exporter garde.
