# Confrontation de la contre-expertise d'Opus et de la passe finale de Codex

La [contre-expertise d'Opus](./CONTRE-EXPERTISE-OPUS-15.md) (A) porte sur la forme du commit `46b221bc`. La passe finale de Codex (B) a produit la [forme finale](./FORME-CONTRAT-15.md) et la section « Passe finale » du [stress test](./STRESS-TEST-CONTRAT-15.md). Ce document rejoue chaque point d'A contre B. B résout E01, E02 et E06, et la preuve le confirme. B laisse E05, E07 et l'échange exposé vers une pièce sans traitement. B traite E04 et E10 par une perte ou une règle écrite que rien n'exécute. E03, E08 et E09 sont des désaccords. Sur la règle des états, B tient sur 5 200 tirages là où l'adresse seule et la proposition d'Opus laissent 921 à 2 334 tirages faux selon la règle de Figma retenue, au prix de 36 % de coordonnées non résolues. Deux défauts échappent aux deux côtés : la valeur posée par variant d'un axe exposé et l'exposition partielle d'une pièce de pièce.

## Le tableau des points

| Point | Verdict | Ce que la preuve montre |
|---|---|---|
| E01, la bascule exposée recopie le renvoi | résolu par B | l'étape 5 du §2.12 déduit les écarts du renvoi ; A15 passe, 6 bascules résolues sur le cas minimal |
| E02, état d'une occurrence non exposée | résolu par B | règle écrite (étapes 3 et 6), perte quand le transfert n'est pas prouvé ; A07 passe |
| E03, deux instances exposées à la même clé | désaccord | B publie une clé et une perte, A publie les deux clés ; les deux passent, B perd 35 959 clés dans 2 870 tirages |
| E04, mode de variable forcé | accord sur le minimum, désaccord sur le champ | B déclare une perte (§2.14) ; `Button.15.json` n'en écrit aucune pour ses 94 modes forcés, tous inertes |
| E05, aperçu atteint par un état | non traité par B | A21 reste faux avec B ; la proposition d'Opus le corrige |
| E06, `source` dans une entrée | résolu par B | §2.5 admet la source de propriétaire en propriétaire ; A16 passe |
| E07, valeur posée par variant | non traité par B | A et B laissent la valeur dans `samples` ; les deux seules graines fausses de B viennent de là |
| E08, adresse contre identité Figma | désaccord, B partiellement | A13 passe par une perte, A13b reste faux avec B et passe avec la clé d'identité |
| E09, trois assemblages valides | contredit par un choix de B (A09), résolu par une perte (A03), non traité (A04 exposé) | F29 refuse la clé `Item2` ; A04b donne 4 écarts avec toutes les règles |
| E10, treize propriétés sans route | résolu sur le papier, non prouvé | 11 sont classées chez Codex, 2 types de nœud manquent à son inventaire |
| Question 4, règle des états | désaccord | B : 0 tirage faux sous les deux règles de Figma ; A : 235 ou 2 267 sur 5 200 selon la règle |
| Renvoi complet ou en écarts | désaccord | O1 retire 0 octet de Button et 1,4 % de Groupe sur la forme de B |
| Pertes répétées par variante | accord, A ne s'y oppose pas | 475 pertes, 22 classes, la liste des variantes se retrouve depuis le contrat dans 21 classes sur 21 |
| Exposition partielle d'une pièce de pièce | non traité par A ni par B | 5 tirages sur 5 200 faux avec B, 0 avec la correction `BX` |
| Inventaire Figma | non traité par B | `TextPathNode` et `TransformGroupNode` n'ont aucune ligne chez Codex |

## Méthode et bornes

Le laboratoire `_local/p22/confrontation/` prolonge celui d'Opus. `lab-b.cjs` est fabriqué par `fabriquer-lab-b.cjs` à partir de `_local/p22/opus/lab.cjs`. Il ajoute cinq lecteurs et deux règles de conservation d'une surcharge dans le modèle de vérité.

| Paire | Constructeur et lecteur |
|---|---|
| F46 | forme du commit `46b221bc`, lecteur de la première passe d'Opus |
| `ADR` | lecture par adresse de slots seule, sans perte de transfert : la proposition de la question 4 prise à la lettre |
| A | proposition d'Opus : appariement par chemin de `figmaLayer`, perte quand il est ambigu, clés préfixées pour deux instances exposées, valeur posée dans `renvoi.values`, jugement d'aperçu par variantes atteintes |
| A1 | A où la première instance garde sa clé et les suivantes reçoivent le préfixe de leur slot |
| B | forme finale : clé d'adresse de slots, transfert prouvé par la valeur initiale, perte sur le renvoi entier sinon |
| `BID` | B avec la clé d'identité Figma pour l'appariement et pour la preuve |
| `BX`, `BXID` | B ou `BID` avec une perte de transfert quand l'ensemble des instances exposées, leur variante ou leurs valeurs posées diffèrent entre V et V′ |

Deux règles de conservation se confrontent dans le modèle de vérité. La règle `identite` est celle du laboratoire d'Opus : une surcharge suit le nom et le rang du calque. La règle `valeurInitiale` est celle de B : la surcharge tombe si la valeur initiale du calque diffère entre les deux variantes. L'aide de Figma sur les [changements d'instance](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances) écrit les deux conditions : « The layer names of the current instance and the variant or instance you're selecting must match » et « When selecting variants, Figma also checks if the layer properties you've changed originally matched between variants ». Pour les calques de texte, elle dit : « Figma keeps any changes you've made to text layers if the name of the text layer is the same between components ». La règle `valeurInitiale` suit donc la documentation, et la règle `identite` est plus large qu'elle pour les couleurs. Aucune des deux n'a été rejouée dans Figma.

Bornes du laboratoire. Le modèle de Figma ne calcule ni auto layout ni pixels. Il applique la règle de valeur initiale à toutes les surcharges de peinture, de boîte et de style, texte compris. Les surcharges transmises à une instance imbriquée suivent la règle propre à cette instance. Le lecteur d'Opus lit la valeur posée par variant dans un échantillon (`_args`) ; l'option `args: false` coupe cette lecture pour les cas E07. Les tirages sont ceux de `_local/p22/opus/gen.cjs`, graines 1 à 5 200, avec ses trois réglages (complet, sans exposition double, modes forcés sur 10 % des occurrences). La comparaison d'Opus est reproduite exactement : F46 donne 1 302 tirages faux en état et 945 en bascule, `ADR` 29 et 48, avec sa règle de chaîne directe (`sorties/tirages-opus-chaine-directe.txt`). Les autres tables comptent un écart sous un nœud non résolu comme déclaré, ce que la lecture de B exige.

## Les erreurs d'Opus, une par une

### E01, la bascule exposée recopie le renvoi entier

Passage de B : « Déduire les seuls écarts de l'occurrence en comparant V au renvoi, par adresse et par champ […] Une occurrence sans surcharge prend les couleurs de V′, jamais celles de V figées dans son renvoi » (§2.12, étape 5). L'état est résolu.

Preuve. `cas/M-E01-bascule-sans-surcharge.json` : 0 écart, 0 perte, 6 bascules résolues, validateur sans refus (`cas15.cjs`). A15 : F46 donne 1 écart, B et A donnent 0 sous les deux règles. La graine 108 réduite par Opus (2 272 octets) donne 0 écart avec B. Avec une surcharge de l'hôte sur le fond (`E01b`), B déclare une perte et laisse les coordonnées non résolues quand les valeurs initiales diffèrent. L'écart reste invisible dans un cas : une surcharge égale à la valeur du maître. Un renvoi complet ne dit pas qu'il y a eu surcharge, alors que l'API de Figma liste les champs surchargés. Ce point n'a pas de cas qui l'exerce.

### E02, aucune règle pour l'état d'une occurrence non exposée

Passage de B : « Le code applicatif choisit l'état dans `stateModel` de la pièce, exposée ou non » (étape 3) et la vérification de transfert de l'étape 6. L'état est résolu.

Preuve. `M-E02-etat-non-expose-valeur-commune` : 2 états résolus, 0 perte. `M-E02-etat-non-expose-valeurs-differentes` : 2 pertes de transfert, 2 coordonnées non résolues, 0 écart silencieux. Le validateur refuse ce contrat sans la perte (`transfert-peinture-non-prouve`). A07 : F46 1 écart, B 0 avec coordonnées non résolues. La graine 5 réduite (2 140 octets) donne 0 écart avec B.

### E03, deux instances exposées du même set n'ont qu'une clé

Passage de B : « La première instance dans l'ordre de l'arbre publié garde la clé et sa `source`. Pour l'autre, la propriété se lit comme non exposée à son slot […] et une perte vise `props.<clé>` » (§2.5). L'état est contredit par un choix de B : l'erreur d'écart silencieux disparaît, l'API manquante de la seconde instance est déclarée et non publiée.

Preuve. `M-E03-deux-instances-exposees` : 0 écart, 5 pertes de collision, validateur sans refus. A12 : F46 1 écart, A et B 0. La graine 2 réduite (1 998 octets) donne 0 écart avec B et avec A. Sur 5 200 tirages, B publie une perte de collision dans 2 870 tirages et perd 35 959 clés. A publie 27 456 clés préfixées dans 1 942 tirages. Le détail est au premier désaccord.

### E04, le mode de variable forcé n'est publié nulle part

Passage de B : « déclarer la perte de `explicitVariableModes` ; la référence de token seule ne dit pas ce forçage » (§2.14). L'état est résolu au minimum que recommandait A (une perte écrite), sans champ `modes`.

Preuve. `M-E04-mode-force` : 0 écart, 2 pertes de mode. A20 : F46 1 écart, A et B 0. Le validateur ne voit pas l'absence de la perte : le même contrat sans les pertes de mode est accepté (`validateurSansPerteModeSlotCollision` vide dans `sorties/cas15.json`). Seul le producteur de `generer-relais.cjs` la vérifie. La simulation `Button.15.json` écrit 3 pertes, toutes sur `.Ring`, et aucune perte de mode, alors que la capture de Button force 94 modes dont 90 sur `.sizeWrapperButton`. Tous visent la collection `…/7:268`, absente des collections de la capture, et aucune des 226 variables liées de la capture ne lui appartient : ces modes ne changent aucun rendu. La forme ne dit pas qu'un mode sans variable liée de sa collection est sans effet. Cette règle de neutralité n'existe que dans la borne de `couverture-figma.json`.

### E05, une couleur d'aperçu peut se montrer à l'exécution

Passage de B : §2.7 juge l'emplacement « remplacé par chaque instance posée qui le montre ». Aucune phrase ne compte les occurrences qui atteignent la variante par un état ou une prop exposée. L'état est non traité.

Preuve. A21 : F46, `ADR`, B, `BID` et `BX` donnent 1 écart, sous les deux règles ; A et A1 donnent 0. `cas/E05-apercu-atteint-par-un-etat.json` est accepté par le validateur avec la seule perte d'adresse du premier renvoi : au survol de la seconde occurrence, le `Halo` n'a aucune couleur dans le contrat et garde le gris du maître dans Figma.

### E06, le §2.2 interdit la source que la réponse 1 exige

Passage de B : « Une propriété de pièce peut elle-même porter `source`. Résoudre successivement les sources de propriétaire en propriétaire » (§2.5). L'état est résolu.

Preuve. `M-E06-source-dans-entree` : 0 écart, validateur sans refus, 2 états résolus avec le booléen de la pièce de pièce réglé depuis l'occurrence. `codex/Q-source-deux-niveaux` est accepté. A16 : 0 écart avec B et avec A.

### E07, la valeur posée d'une prop exposée vit dans l'échantillon seul

Passage de B : « Une propriété exposée prend la valeur de la prop de l'hôte, et n'entre jamais dans `values` » (§2.4). Le §2.10 laisse la valeur par variant dans `samples[].args`, non normatif. L'état est non traité.

Preuve. `cas/E07-valeur-par-variant.json` est accepté par le validateur : le variant `y` pose `voir=false`, la prop de l'hôte n'a qu'un `default`, la valeur de `y` vit dans `samples.sy`. Avec la lecture de l'échantillon coupée, le cas E07 donne 1 écart pour F46, `ADR`, B, `BID`, `BX` et 0 pour A. Le défaut dépasse les booléens que A corrige. Les deux graines que B laisse fausses avec la perte d'exposition (365 et 5012, réduites dans `cas/residu-bx-*.lib.json`) sont des axes exposés dont la variante posée change avec la variante du propriétaire. `renvoi.values` de A ne porte pas les axes.

### E08, une adresse de slot n'est pas l'identité de Figma

Passage de B : « Un écart de couleur est prouvé quand V et V′ portent la même valeur initiale à cette adresse et dans ce champ » (§2.12, étape 6). La preuve s'appuie sur l'adresse de slot. L'état est partiellement résolu : la perte déclarée couvre A13, pas A13b.

Preuve. A13 (deux textes `Titre` et `Sous-titre`, un seul au survol) : `ADR` 1 écart, A, B, `BID` 0 avec une perte. A13b donne à `Sous-titre` du survol la même valeur initiale que `Titre` : B et `BX` donnent 1 écart sous les deux règles, `BID`, `BXID` et A 0 avec une perte. `cas/E08-adresse-sans-identite.json` est accepté par le validateur de B sans aucune perte, donc B certifie lui-même le transfert vers un autre calque. Le texte de B ne dit pas de comparer les `figmaLayer`.

### E09, trois assemblages valides sans description

Passage de B : « Deux pièces de même identifiant de code bloquent l'export (F29) » (§2.11) et « Le contenu d'un `SLOT` de pièce rempli par l'hôte reste hors de la projection 15.0 (D6) » (§2.9). L'état est contredit par un choix de B pour A09, résolu par une perte pour A03 et non traité pour A04 exposé.

Preuve. A09 : le contrat avec les clés `Item` et `Item2` pour deux entrées de nom `.Item` est refusé par le validateur (`cle-piece`) ; le constructeur d'Opus refuse aussi la seconde clé. A03 : `M-A03-slot-rempli` donne 0 écart et 2 pertes de SLOT, que le validateur ne voit pas non plus. A04 non exposé : 0 écart avec toutes les paires. A04b, la valeur posée sur l'hôte désigne la pièce `.Q` : 4 écarts avec toutes les paires, A comprise, parce que la vue d'une pièce échangée n'est décrite nulle part.

### E10, douze autres propriétés Figma ne sont ni portées ni signalées

Passage de B : le tableau du §2.14 et son principe (« Une propriété ajoutée à l'API doit être classée avant que le moteur annonce une couverture complète »). L'état est résolu sur le papier et non prouvé : aucun moteur n'exécute la règle.

Preuve. Voir la section des couvertures. 11 des 13 propriétés sont classées. `TextPathNode` et `TransformGroupNode` ne le sont pas.

## Les assemblages adverses

Les cellules donnent le nombre d'écarts silencieux sous la règle `valeurInitiale`. `i` signale des coordonnées non résolues sous une perte, `R` un refus de l'export. `_local/p22/confrontation/sorties/adverses-b.json` porte les deux règles.

| Assemblage | F46 | `ADR` | A | B | `BID` | `BX` | Lecture |
|---|---|---|---|---|---|---|---|
| A01 trois niveaux d'exposition | 0 | 0 | 0 | 0 | 0 | 0 | juste ; `M-A01` : 6 bascules résolues |
| A02 dépendance et pièce, prop de dépendance exposée | 0 | 0 | 0 | 0 | 0 | 0 | juste ; `Q-dependance-exposee` accepté |
| A03 pièce dans le `SLOT` d'une pièce | sans objet | sans objet | sans objet | perte de SLOT | | | résolu par une perte |
| A04 échange vers une pièce, non exposé | 0 | 0 | 0 | 0 | 0 | 0 | juste |
| A05 boucle indirecte | | | | refusé | | | `cycle-piece` ; le refus de Figma n'est pas rejoué |
| A06, A08 surcharge sur une adresse absente de V′ | 0 | 0 | 0 | 0i | 0i | 0i | perte de transfert |
| A07 état qui change la structure | 1 | 1 | 1 | 0i | 0i | 0i | A et `ADR` faux sous la règle de Figma |
| A09 deux `.Item` | exception | | | refusé | | | F29 refuse `Item2` |
| A10 composant préfixé à règles | | | | accepté | | | `codex/L5-prefixe` accepté ; le contrat propre est ignoré, aucune perte |
| A11 axe `Size` de l'hôte et axe `Size` exposé | 0R | 0R | 0 | 0R | 0R | 0R | B garde le refus, A publie les deux |
| A12 deux instances exposées | 1 | 1 | 0 | 0 | 0 | 0 | B par une perte, A par deux clés |
| A13 deux textes, un manque au survol | 0 | 1 | 0i | 0i | 0i | 0i | `ADR` faux |
| A13b même valeur initiale sous les deux noms | 0 | 1 | 0i | 1 | 0i | 1 | B faux, A et `BID` justes |
| A14 glyphe d'icône différent entre deux états | 1 | 0 | 0 | 0 | 0 | 0 | non reproduit avec B ; le laboratoire n'apparie pas deux glyphes |
| A15 bascule exposée, valeurs réelles différentes | 1 | 0 | 0 | 0 | 0 | 0 | E01 |
| A16 pièce de pièce exposée dans une pièce non exposée | 0 | 0 | 0 | 0 | 0 | 0 | E06 ; faux avec le texte de `46b221bc` (source absente de l'entrée) |
| A17 booléen posé par variant | 0 | 0 | 0 | 0 | 0 | 0 | juste parce que le lecteur lit l'échantillon ; voir E07 |
| A18 combinaison absente | 0i | 0i | 0i | 0i | 0i | 0i | perte de sélection, aucun choix |
| A19 coordonnées répétées, rendus différents | 0i | 0i | 0i | 0i | 0i | 0i | perte de sélection, aucun choix |
| A20 mode forcé | 1 | 1 | 0 | 0 | 0 | 0 | B par une perte |
| A21 aperçu atteint par un état | 1 | 1 | 0 | 1 | 1 | 1 | E05, non traité par B |

Les assemblages ajoutés par la confrontation sont A04b (échange exposé vers une pièce, 4 écarts partout), A07b (cadre à valeur initiale commune, B 0), A13b, A01b (trois niveaux avec axe exposé, B 0), E01b (surcharge du fond, valeurs initiales différentes : `ADR` et A 1 sous la règle de Figma, B 0i) et E01c (valeur commune, 0 partout).

## Les deux couvertures de Figma

`couverture-rapprochement.cjs` lit `_local/p22/opus/couverture-figma.json` (80 entrées) et `_local/p22/codex/couverture-figma.json` (2 038 lignes, 5 statuts : identité 80, éditeur 127, champ et perte si incomplet 796, perte 352, perte si non représenté 683). Opus classe 13 propriétés « non couverte » en 14.0 comme en 15.0 et une quatorzième (variante d'une pièce de pièce) couverte par la 15.0.

| Propriété déclarée non couverte par Opus | Classement chez Codex | Ligne du §2.14 de B |
|---|---|---|
| `scaleFactor` | champ et perte si incomplet, 1 ligne | nommée |
| `explicitVariableModes` | champ et perte si incomplet, 14 lignes | nommée, voir E04 |
| `cornerSmoothing` | perte, 11 lignes | famille « lissage » de la géométrie vectorielle |
| `clipsContent` | perte, 5 lignes | nommée |
| `strokesIncludedInLayout` | perte, 5 lignes | nommée |
| `itemReverseZIndex` | perte, 5 lignes | nommée |
| `reactions` | perte, 13 lignes | nommée |
| `animations`, `animationStyles` | perte, 28 lignes | `animations` nommée, `animationStyles` par la famille |
| `strokeCap`, `strokeJoin`, `strokeMiterLimit` | perte 39, perte si non représenté 2 | familles « pointes, jonctions » |
| `hyperlink` | perte 1, perte si non représenté 2 | famille « liens » |
| variable de texte sur `characters` | champ et perte si incomplet, 1 ligne | ligne « variables liées et styles » |
| `TextPathNode` | aucune ligne | non nommée |
| `TransformGroupNode` | aucune ligne | non nommée |

Le fichier officiel des types de nœud en compte 40, dont 26 n'ont aucune ligne chez Codex. La plupart sont des types de FigJam ou de présentation. `TextPathNode` et `TransformGroupNode` sont des types de dessin : le « 0 propriété non couverte » de B est vrai par construction, et faux pour ces deux types. Les 8 autres entrées d'Opus sans nom de propriété chez Codex décrivent des comportements (matrice clairsemée, conservation des surcharges, `detachInstance`) et pas des propriétés. Le moteur 15.0 n'existe pas : aucune de ces lignes n'est exécutée.

## Les désaccords

### Question 4, la règle des états

Position d'A : la règle se lit par chemin de `figmaLayer` et une perte ne vient que d'un appariement ambigu (deux calques de même nom sous un parent, ou un slot à rôle dont le calque change de nom). Une vérification générale ne peut pas observer Figma.

Position de B : la règle garde une vérification à l'export. Un écart de couleur est transféré quand V et V′ portent la même valeur initiale à l'adresse, sinon une perte vise le renvoi entier et le lecteur laisse ses coordonnées non résolues.

Preuves rejouées, 5 200 tirages, tirages avec écart silencieux.

| Paire | Complet, règle `identite` | Complet, règle `valeurInitiale` | Sans doublon, `identite` | Sans doublon, `valeurInitiale` | Modes forcés, `valeurInitiale` |
|---|---|---|---|---|---|
| F46 | 2 727 | 2 594 | 1 889 | 1 739 | 3 608 |
| `ADR` | 921 | 2 334 | 40 | 1 217 | 3 443 |
| A | 235 | 2 267 | 218 | 1 689 | 2 413 |
| B | 0 | 0 | 5 | 5 | 0 |
| `BID` | 0 | 0 | 5 | 5 | 0 |
| `BX` | 0 | 0 | 0 | 0 | non rejoué |

Opus a raison sur le principe que la règle doit s'écrire et que le renvoi se lit en écarts : `ADR` ramène F46 de 2 727 à 921 tirages faux sur le tirage complet sous sa propre règle. B a raison que cette lecture diverge de la documentation de Figma : sous la règle de valeur initiale, `ADR` et A restent faux sur 2 267 à 2 334 tirages. Le coût de B se mesure en coordonnées non résolues : 36 848 sur 101 202 pour B (36,4 %), 18 333 pour A (18,1 %), 2 649 sur 74 900 pour `ADR`. Codex compte 88,5 % sur ses propres tirages avec une définition de coordonnée plus large (26 051 sur 29 426).

Ce que les deux positions ont en commun. Elles écrivent la règle de lecture, dérivent les écarts en comparant le renvoi à la variante citée, publient une perte quand la sélection n'est pas unique, refusent de choisir une variante arbitraire et reconnaissent qu'un rejeu dans Figma manque. Le laboratoire d'A ignore si Figma garde une surcharge égale à la valeur du maître. B écrit « Une preuve documentaire ne remplace pas un rejeu dans Figma » (§2.12).

La synthèse que les preuves soutiennent prend l'appariement par `figmaLayer` d'A pour la clé de la preuve de B, ce qui donne `BID`, et ajoute la perte quand l'exposition ou les valeurs posées d'une instance diffèrent entre V et V′, ce qui donne `BX`. `BXID` est la seule paire à 0 écart sous les deux règles sur A13b, sur les graines résiduelles et sur 5 200 tirages sans doublon. Son coût est de 38,4 % de coordonnées non résolues sans doublon (29 936 sur 78 024) et de 46,9 % sur le tirage complet.

### Deux instances exposées à la même clé

Position d'A : chaque clé reçoit l'identifiant de son slot (`segment2Selected`), `source` garde la vérité. Position de B : la première instance garde la clé, l'autre se lit comme non exposée, une perte nomme la propriété.

Preuves. A12 : A, A1 et B donnent 0 écart. Sur 5 200 tirages d'Opus, F46 refuse 1 826 exports (`deux-sources`), B publie 35 959 clés perdues dans 2 870 tirages, A publie 27 456 clés préfixées dans 1 942 tirages. Le préfixe plat de ma maquette de A laisse 211 refus (4,1 %) quand deux préfixes se confondent, limite de la règle de nommage telle qu'Opus l'écrit et pas de la forme. A1, où la première instance garde sa clé, donne les mêmes comptes d'écarts qu'A (218 tirages en `identite` sans doublon).

Ce que les deux ont en commun : l'ordre de l'arbre publié décide, et le contrat ne reste pas silencieux. La différence porte sur la fonction : avec B, le code ne peut pas régler la seconde instance depuis l'hôte, alors que Figma montre sa propriété. A1 garde la clé de la première (compatible avec ce que B décrit pour Button et la 14.0) et publie la seconde.

### Le renvoi en écarts contre le renvoi complet (D4)

Position d'A : retenir O1, le renvoi porte ce que l'hôte change, −71,6 % des octets des renvois et −14,2 % du contrat. Position de B : D4, validé par le mainteneur, « un renvoi est toujours complet », parce qu'une absence ne doit avoir qu'un sens.

Preuves (`tailles.cjs`). Sur `Button.15.json`, 108 renvois pèsent 25 735 octets (52,6 % du contrat) et 0 octet se retrouve dans la variante citée, parce que les couleurs de `.sizeWrapperButton` sont d'aperçu. Sur `Groupe.15.json`, 9 renvois pèsent 3 933 octets (2,1 %), dont 2 634 recopiables (67 % des renvois, 1,4 % du contrat). Sur 5 000 tirages de Codex, les renvois pèsent 15 070 942 octets (7,4 %) et la recopie 4 057 834 (2,0 % du contrat). Les −14,2 % d'Opus tiennent à deux faits de son laboratoire : ses renvois pèsent 16,4 % de ses contrats, et sa `view` est un arbre en ligne alors que B partage les vues par un catalogue, si bien qu'une `view` égale à celle de la variante coûte quelques octets. Les deux défauts que O1 corrigeait, E01 et E02, sont corrigés par la lecture de B (étape 5).

Ce que les deux ont en commun : la lecture passe par la notion d'écart. Ce que le renvoi complet ne dit pas : si une surcharge égale à la valeur du maître existe. Le renvoi en écarts le dirait si l'Exporter lit les champs surchargés de l'API.

### Les pertes répétées par variante

B propose de regrouper les 475 pertes de Groupe en 22 entrées. A ne s'y oppose pas : aucun passage d'`CONTRE-EXPERTISE-OPUS-15.md` ne traite le volume des pertes. Preuve (`pertes-regroupees.cjs`, sur `Groupe.anonyme.15.json`) : 475 pertes pèsent 108 424 octets, 22 classes pèsent 5 498 octets avec le nombre de variantes dans le message. Pour les 21 classes qui portent une adresse de la pièce, l'ensemble des variantes touchées égale l'ensemble des variantes dont la vue contient cette adresse : la liste se retrouve depuis le contrat. B écrivait qu'une opacité non publiée n'y laisse aucune trace ; sur ce contrat l'opacité de `focus-ripple` se retrouve par la présence de l'adresse. La condition ne vaut que si la perte ne dépend pas de la valeur.

### Ce qui reste hors désaccord

E05, E07, A04b et l'exposition partielle ne sont tranchés par aucune des deux positions. Leurs preuves sont aux sections précédentes.

## Les tirages d'Opus contre la forme finale

`analyse-b.cjs` rejoue `gen.cjs` d'Opus sur 5 200 graines. Le lecteur d'Opus s'aligne sur le §2.12 final : B est le lecteur `proposition` d'Opus complété par la perte de transfert de l'étape 6 et les coordonnées non résolues. Les compte-rendus sont dans `sorties/tirages-*.json`.

Les cinq graines réduites d'Opus (108, 2, 5, 4, 116, `graines.cjs`, mêmes tailles que ses réductions : 2 272, 1 998, 2 140, 2 484 et 3 991 octets) donnent 0 écart avec B sous les deux règles. Les deux graines que ses résidus de la proposition laissent (4 et 116) donnent 0 écart avec B. Le validateur `valider15.cjs` ne lit pas le contrat interne du laboratoire d'Opus, qui garde ses vues en ligne ; les graines passent donc par le lecteur de B et leurs équivalents au format de Codex sont les cas `M-*` de `cas15.cjs` (13 cas passés par le validateur et par `eprouver`).

Le tirage sans doublon laisse 5 graines fausses à B (365, 1794, 3763, 4364, 5012), identiques sous les deux règles et dans A et `ADR`. Réduites à 2 200 à 6 000 octets, elles montrent deux défauts : une instance exposée dans une partie des variantes seulement (la perte L6 nomme la propriété et ne vise pas le renvoi), et une instance exposée dont la variante posée change avec la variante du propriétaire (365 et 5012, E07 pour les axes). La perte de transfert étendue de `BX` corrige les cinq : 0 écart sur 5 200 tirages sans doublon et sur 5 200 tirages complets.

## Ce qui reste faux ou non prouvé dans la forme finale

| Point | État |
|---|---|
| Transfert vers un autre calque | A13b : B certifie un transfert que Figma ne fait pas quand deux calques de noms différents portent la même valeur initiale à la même adresse |
| Valeur posée par variant | E07 : un booléen, un échange ou un axe exposé a une valeur posée par variant du propriétaire que le contrat ne porte qu'en `samples` ; 2 tirages sur 5 200 faux dans la simulation |
| Aperçu atteint par un état | E05 : la couleur du maître apparaît au survol d'une occurrence qui ne la remplace pas |
| Exposition partielle | 5 tirages sur 5 200 faux avec B sans doublon ; la perte L6 n'est pas rattachée au renvoi |
| Modes forcés | la simulation de Button ne déclare aucun des 94 modes ; la règle de neutralité n'est pas écrite dans la forme ; le validateur ne voit pas l'absence de perte |
| Échange exposé vers une pièce | A04b : 4 écarts, la vue de la pièce échangée n'est décrite nulle part |
| Inventaire de Figma | `TextPathNode`, `TransformGroupNode` sans ligne |
| Surcharge égale au maître | non détectable depuis un renvoi complet, aucun cas |
| Règle de conservation de Figma | `identite` et `valeurInitiale` donnent des tirages faux différents ; aucun rejeu dans Figma ne les départage, et les textes suivent peut-être une règle plus large |
| Validateur | `valider15.cjs` ne voit pas l'absence d'une perte de mode, de SLOT ou de collision, ni un transfert vers un autre calque |
| Maquette d'A | 4,1 % de refus par préfixes en doublon ; la maquette d'A simule O1 par une valeur posée dans `renvoi.values` sans passer par un renvoi en écarts |
| Limites du laboratoire | pas d'auto layout ni de pixels ; la règle de valeur initiale s'applique aussi aux textes ; les surcharges transmises à une instance imbriquée ne vérifient pas la valeur entre les deux variantes du parent |

## Décisions au mainteneur

1. Règle des états. Option 1 : garder B (clé d'adresse de slots, preuve par la valeur initiale, perte sinon). Option 2 : suivre A (appariement par `figmaLayer`, perte quand il est ambigu, sans preuve de valeur). Option 3 : `BXID`, l'appariement par `figmaLayer` pour la preuve de B, avec la perte d'exposition. Recommandation : option 3. Elle est la seule à 0 écart sous les deux règles de Figma sur A13b et sur 10 400 tirages ; l'option 2 laisse 2 267 tirages faux sous la règle que la documentation de Figma écrit, l'option 1 laisse A13b et 5 tirages faux. Elle coûte 38 % à 47 % de coordonnées non résolues. Le rejeu de `StressTest` (constructions 4 et 5 de la passe finale) départage les deux règles de Figma et peut baisser ce coût.

2. Deux instances exposées à la même clé. Option 1 : la première garde la clé, l'autre est perdue avec une perte (B). Option 2 : les deux clés sont préfixées par le slot (A). Option 3 : la première garde sa clé, les suivantes prennent le préfixe de leur slot (A1). Recommandation : option 3. Elle publie la propriété que Figma montre, ne change pas la clé de la première instance et ne perd aucune API, alors que l'option 1 perd 35 959 clés dans 2 870 tirages. Il faut fixer le nom du préfixe pour qu'aucun doublon ne reste.

3. Renvoi complet ou en écarts (D4). Option 1 : garder le renvoi complet. Option 2 : écrire le renvoi en écarts (O1). Recommandation : option 1. O1 retire 0 octet de Button et 1,4 % de Groupe sur la forme de B, et E01 et E02 sont déjà corrigés par la lecture. Rouvrir D4 ne se justifie que si l'Exporter doit publier les champs que l'API de Figma dit surchargés.

4. Valeur posée par variant (E07). Option 1 : la laisser dans `samples`. Option 2 : la porter dans `renvoi.values` pour les booléens, les échanges et les axes exposés. Option 3 : publier une perte quand elle diffère entre variants. Recommandation : option 2, parce que le code d'un hôte à pièces ne peut pas lire une valeur normative dans un champ non normatif et que 2 graines fausses sur 5 200 en viennent. L'option 3 est le minimum.

5. Aperçu atteint par un état (E05). Option 1 : garder le jugement d'aperçu actuel. Option 2 : compter les occurrences qui atteignent la variante par un axe d'état ou une prop exposée (A). Recommandation : option 2. A21 passe avec elle (0 écart) et reste faux avec B.

6. Modes forcés. Option 1 : une perte pour chaque mode forcé. Option 2 : une perte seulement quand une variable liée sous le nœud appartient à la collection forcée. Recommandation : option 2, avec la règle écrite dans le §2.14. L'option 1 ajoute 94 pertes à Button pour 0 effet. Le champ `modes` d'A reste possible pour un mode actif.

7. Exposition partielle. Ajouter à l'étape 6 une perte de transfert quand l'ensemble des instances exposées, leur variante posée ou leurs valeurs posées diffèrent entre V et V′. Recommandation : oui, 5 tirages faux deviennent 0 ; le coût est de 8 points de coordonnées non résolues sans doublon (38,4 % au lieu de 29,6 %).

8. Clé d'une pièce répétée (A09) et clé exposée prise par l'hôte (A11). Option 1 : garder le refus de F29 et le diagnostic de collision. Option 2 : suffixer la seconde pièce (`Item2`) et préfixer la clé exposée. Recommandation : option 1 pour A09, parce que la clé suffixée change le §2.13.8 et le nom du type généré, sans gain mesuré ; option 2 pour A11 avec la décision 2, parce que Figma montre deux propriétés.

9. Inventaire de Figma. Ajouter `TextPathNode` et `TransformGroupNode` à l'inventaire et au §2.14. Recommandation : oui, c'est un ajout de deux lignes ; le moteur reste à écrire.

10. Pertes répétées par variante. Option 1 : une perte par variante. Option 2 : une perte par propriétaire, adresse et propriété de l'API, avec le nombre de variantes. Recommandation : option 2 (108 424 octets contre 5 498 sur Groupe, 21 classes sur 21 retrouvables depuis le contrat), à condition que la perte garde le contrat de retrouver la liste par l'adresse.

11. Échange exposé vers une pièce (A04b). Option 1 : refuser l'export. Option 2 : une perte nommant la pièce. Recommandation : option 2, faute d'un cas réel qui demande la description.

## Fichiers

Tout est dans `_local/p22/confrontation/` : le journal `JOURNAL.txt`, `lab-b.cjs`, `run-b.cjs`, `analyse-b.cjs` (tirages), `adverses-b.cjs` (assemblages), `cas15.cjs` et `cas/` (cas au format de Codex), `graines.cjs`, `reduire-residus-b.cjs`, `collisions.cjs`, `tailles.cjs`, `pertes-regroupees.cjs`, `couverture-rapprochement.cjs` et `sorties/`.

## Réponses du mainteneur

Le mainteneur retient les décisions 4 à 9 et 11, qui corrigent les défauts prouvés, puis les décisions 2, 3 et 10 : la première de deux instances exposées garde sa clé et les suivantes prennent le préfixe de leur slot, le renvoi reste complet (D4), et les pertes répétées se regroupent. Le mainteneur retient aussi la décision 1, option 3 (paire `BXID`), sur ce principe : le contrat ne dit jamais une chose fausse, et il écrit une perte quand il ne peut pas prouver ce que Figma rendrait. Il l'a remplacée ensuite par la convention d'UCM de l'[étude de la règle des états](./ETUDE-REGLE-DES-ETATS.md), écrite dans la forme (sous-section « Convention des états »).

## Intégration

Les décisions 2 à 11 et la correction d'A13b sont intégrées à la [forme](./FORME-CONTRAT-15.md). La décision 1 y était écrite comme la paire `BXID`. L'[étude de la règle des états](./ETUDE-REGLE-DES-ETATS.md) la remplace par la convention d'UCM, que la forme a reçue ensuite (sous-section « Convention des états », en fin de section). Les tables qui suivent donnent les résultats de la paire `F15`, avant la convention. Le laboratoire, reconstruit sur la forme intégrée, ne donne aucun écart silencieux sur toutes les épreuves rejouées.

### Les épreuves rejouées

| Épreuve | Résultat |
|---|---|
| 5 200 tirages complets, règles `identite` et `valeurInitiale` | 0 tirage faux ; 46 690 coordonnées non résolues sur 101 202 (46,1 %) |
| 5 200 tirages sans exposition double, deux règles | 0 tirage faux ; 30 004 non résolues sur 78 024 (38,5 %) |
| 5 200 tirages à modes forcés, chaque mode actif | 0 tirage faux ; 3 562 modes forcés, 3 562 pertes de mode |
| 5 200 tirages à modes forcés, mode actif sur sa seule collection | 0 tirage faux ; 3 562 modes forcés, 2 354 pertes de mode |
| 25 assemblages : A01, A02, A04, A06, A07, A09, A11 à A21, et A01b, A04b, A07b, A13b, A20b, E01b, E01c, E07 | 0 écart sous les deux règles ; A09 refusé (F29) ; A11 publie `size` et `pSize` ; A04b, A13b et A21 par une perte |
| 45 cas de `_local/p22/codex/cas/` et de `cas/`, récrits dans la forme intégrée | 45 conformes, dont A05 et E09 refusés comme attendu |
| 22 mutations des règles nouvelles | 22 refusées |
| 58 mutations de la passe finale, rejouées sur les cas récrits | 58 conformes |
| vérifications de la passe finale, sans l'option `integree` | 5 cas acceptés et 15 mutations refusées ; 9 mutations d'échantillons refusées ; 30 mutations sur 32 refusées, 2 indécidables connues |
| 5 graines réduites d'Opus et 7 résidus de B | 0 écart sous les deux règles |
| clés préfixées sur 5 200 tirages | 0 refus, 0 doublon ; 20 332 clés préfixées dans 2 879 tirages, dont 15 395 sur l'hôte dans 1 953 |
| Button, bascules de taille des 90 renvois de `.sizeWrapperButton` | 180 bascules, 180 décrites, 0 perte de transfert |
| Groupe, bascules d'état des 9 renvois de `.Segment` | 36 bascules, 36 décrites |
| témoin, couleur initiale de la variante `large` changée | 90 bascules perdues, la preuve les voit |
| modes des captures | Button 94 modes forcés, 0 actif ; Groupe 0 |
| `TextPathNode` et `TransformGroupNode` | classés en perte, 0 propriété propre sans classement |

Le validateur `valider15.cjs`, avec l'option `integree` et les constats du dessin, voit l'absence d'une perte obligatoire. Une perte de mode retirée donne `mode-force-sans-perte`, une perte de `SLOT` retirée `slot-rempli-sans-perte`, des clés préfixées retirées `cle-exposee-absente`. Il refuse aussi une perte de mode sur un mode inerte, une perte de transfert retirée (A13b, A13c, exposition partielle, E05), une perte de sélection retirée, une valeur posée retirée (E07), une perte d'échange retirée (A04b) et une perte regroupée incohérente.

### Les décisions dans la forme

| Décision | Section de la forme |
|---|---|
| 1, paire `BXID` | remplacée par la convention d'UCM (« Convention des états ») : définitions du §2 ; étapes 3, 5 et 6 du §2.12 ; ligne 2 du tableau du §2.11 ; §2.13.14 |
| 2, première clé gardée, préfixe de slot ensuite | §2.5, ordre des clés ; §2.11, ni perte ni refus ; §6.1, génération des types ; §6.3, classe 2 |
| 3, renvoi complet | §2.4 ; §5.3 |
| 4, valeur posée par variant | §2.4, table et paragraphe de la valeur posée ; étape 7 du §2.12 ; §2.13.6 ; §5.4 |
| 5, aperçu jugé sur les variantes atteintes | §2.7 |
| 6, mode forcé actif seulement | ligne des modes du §2.11 ; ligne des modes et dernier paragraphe du §2.14 ; §3.1 |
| 7, perte d'exposition | retirée avec la décision 1 (« Convention des états ») ; elle prolongeait la preuve de transfert |
| 8, refus de F29 et préfixe pour A11 | §2.11 ; §2.13.8 ; §2.5 |
| 9, `TextPathNode` et `TransformGroupNode` | deux lignes du §2.14 |
| 10, pertes de maître regroupées | §2.11, classe, champs et liste des variantes ; §2.13.15 ; §5.1 ; §5.2 ; §6.2 ; §6.3, classes 2 et 4 |
| 11, échange exposé vers une pièce | dernier paragraphe du §2.5 ; ligne du §2.11 |
| A13b, aucun transfert entre deux noms | étape 6 du §2.12 |

La décision 4 porte la valeur posée d'un booléen ou d'un échange dans `renvoi.values`. Celle d'un axe exposé vit dans les coordonnées de `renvoi.variant`, et dans celles du renvoi imbriqué pour une pièce de pièce. Une copie de l'axe dans `values` répéterait une valeur que la variante citée donne déjà.

### Mesures et tailles

Les tailles comptent les octets UTF-8 de `JSON.stringify`, sans espaces. Groupe se mesure sur la simulation aux noms de la capture, dont seuls les chiffres sortent de `_local/`.

| Contrat | 14.0 | Passe finale | Forme intégrée |
|---|---|---|---|
| Button | 49 663 | 48 942 | 54 072 |
| Groupe | 13 205 | 186 125 | 83 258 |
| Groupe aux noms inventés | sans objet | 179 564 | 78 189 |

Button gagne 5 130 octets sur la passe finale, le prix des valeurs posées de `label`, `iconLeft` et `iconRight` dans ses 90 renvois. Ses 108 renvois pèsent 30 865 octets, et ses 3 pertes restent sur `.Ring`. Groupe perd 102 867 octets sur la passe finale, parce que ses 475 pertes deviennent 21 classes et une perte de catalogue. Son `meta` passe de 110 215 à 7 348 octets. Ses 9 renvois pèsent 3 933 octets, dont 2 523 de feuilles recopiées par D4 et 591 de valeurs posées. Le détail est au §5.1 de la forme.

### Constructions à ajouter à `StressTest`

Cette liste fusionne celles de la contre-expertise d'Opus, de la passe finale du stress test et de cette confrontation. Elle se construit dans le composant `StressTest` d'UCM-Playground, avec trois pièces préfixées. `StressTest` expose les propriétés de `.Cellule`. Il n'expose pas `.Pastille`, qui a une propriété `État` (Default, Hover). `.Puce` est posée dans `.Cellule`.

| # | Construction dans Figma | Règle vérifiée |
|---|---|---|
| 1 | Donner à `.Cellule` deux propriétés de variante, `Taille` et `Selected`, avec un fond différent pour chaque valeur de `Selected`, puis basculer `Selected` sur l'occurrence. | une bascule sans surcharge prend les couleurs de la variante atteinte (§2.12, étape 5 ; E01, A15) |
| 2 | Retirer une combinaison de `.Cellule` et en dessiner une autre deux fois, avec deux couleurs, puis choisir ces deux combinaisons depuis `StressTest`. | sélection non résolue et perte, jamais un choix arbitraire (§2.12, étape 4 ; A18, A19) |
| 3 | Poser deux instances de `.Cellule` exposées dans le même variant. | la première garde la clé, la seconde reçoit le préfixe de son slot (§2.5 ; A12, décision 2) |
| 4 | Ajouter à `StressTest` sa propre propriété `Size`, et renommer `Size` la propriété `Taille` exposée de `.Cellule`. | la clé de l'hôte reste `size`, la clé exposée reçoit le préfixe (§2.5 ; A11, décision 8) |
| 5 | Dans un variant, montrer une valeur différente du défaut pour un booléen exposé de `.Cellule`, et poser `.Cellule` dans une `Taille` différente selon le variant. | valeur posée dans `renvoi.values` et dans `renvoi.variant` (§2.4 ; E07, décision 4) |
| 6 | Poser `.Puce` dans `.Cellule`, l'exposer dans `.Cellule`, et lui imposer une couleur depuis `StressTest` à travers `.Cellule` ; ajouter un troisième niveau d'exposition. | sources de propriétaire en propriétaire et renvoi imbriqué (§2.5 ; A01, A16, E06) |
| 7 | Exposer `.Puce` dans une partie des variantes de `.Cellule` seulement, et une instance de `.Cellule` dans une partie des variants de `StressTest` seulement. | perte L6 et perte de transfert (§2.12, étape 6 ; décision 7) |
| 8 | Sur une occurrence de `.Pastille`, imposer une couleur sur un calque dont Default et Hover ont des couleurs différentes, et une autre sur un calque dont ils partagent la couleur, puis passer l'occurrence en Hover dans Figma. | écart entre ce que Figma garde et la convention d'UCM (§2.12 ; étude de la règle des états) |
| 9 | Dans la variante Hover de `.Pastille`, ajouter un calque, retirer le texte `Sous-titre`, et imposer une couleur au cadre depuis l'hôte. | perte de transfert quand le calque manque à la variante atteinte (A06, A07, A13) |
| 10 | Dans la variante Hover de `.Pastille`, remplacer le texte `Titre` par un texte `Sous-titre` à la même place et de même couleur, avec une couleur imposée sur `Titre`. | aucun transfert entre deux calques de noms différents (§2.12, étape 6 ; A13b) |
| 11 | Dans `.Pastille`, poser deux calques frères de même nom, dont un reçoit une couleur imposée. | appariement ambigu, perte (§2.12, étape 6 ; A13c) |
| 12 | Dans la variante Hover de `.Pastille`, dessiner un calque gris que la première occurrence, posée en Hover, recolore, et poser une seconde occurrence en Default qui ne le recolore pas. | couleur d'aperçu jugée sur les variantes atteintes (§2.7 ; A21, décision 5) |
| 13 | Sur une occurrence, imposer une couleur égale à celle du maître. | surcharge égale au maître, que le renvoi complet ne montre pas |
| 14 | Donner à l'icône de `.Pastille` un glyphe différent en Hover. | glyphe échangé entre deux états (A14) |
| 15 | Sur une occurrence, masquer un calque sans propriété, saisir un texte et échanger une instance sans propriété. | écarts sans preuve, perte ; texte indicatif sous `samples` (§2.10, §2.12) |
| 16 | Forcer un mode de variable sur une occurrence, une fois sur la collection d'une variable liée sous elle, une fois sur une collection sans variable liée. | perte de mode pour le seul mode actif (§2.14 ; A20, A20b, décision 6) |
| 17 | Remplir depuis `StressTest` le `SLOT` de `.Cellule` avec une pièce, et exposer une propriété `SLOT` d'une instance. | perte de `SLOT` (§2.9 ; A03, D6) |
| 18 | Exposer un échange d'instance dont une valeur préférée est une pièce, et poser un échange non exposé vers une pièce. | perte nommant la pièce (§2.5 ; A04, A04b, décision 11) |
| 19 | Poser deux composants `.Item`, rangés dans deux dossiers. | refus de l'export (F29 ; A09, décision 8) |
| 20 | Poser une instance de `Button` exposée dans `StressTest`. | source vers une dépendance (§2.5 ; A02) |
| 21 | Agrandir une instance de `.Cellule` à l'outil d'échelle, et retourner un calque en miroir dans `.Cellule`. | pertes de `scaleFactor` et de `relativeTransform` (§2.14) |
| 22 | Dessiner une variante de `.Cellule` sans auto layout, à hauteur fixe sans variable, comme `.Ring`. | pertes de la racine (§2.11) |
| 23 | Dans `.Cellule`, appliquer une ombre sans variable de couleur, un effet de bruit et un flou progressif. | pertes d'effet, une fois par style pour l'ombre (§2.14) |
| 24 | Dans `.Cellule`, poser un texte sur un tracé et un groupe de transformation à répétition. | pertes de `TEXT_PATH` et de `TRANSFORM_GROUP` (§2.14 ; décision 9) |
| 25 | Dans toutes les variantes de `.Cellule`, dessiner un contour à épaisseurs par côté sans variable. | une perte regroupée, avec `slotPath` et le nombre de variantes (§2.11 ; décision 10) |

La boucle indirecte (A05) ne se construit pas, car Figma refuse d'imbriquer un composant dans lui-même.

### Passages que touche la décision 1

Le passage à la convention d'UCM a touché ces passages de la forme, réécrits dans « Convention des états » :

- le §2, définitions de l'identité d'un calque et de l'écart ;
- le §2.5, phrase « Une prop `VARIANT` exposée choisit la variante de la pièce (E3, §2.12) » ;
- le §2.7, jugement d'aperçu par l'axe d'états et par un axe exposé, et A21 ;
- le §2.11, ligne 2 du tableau (transfert non prouvé, exposition qui diffère) ;
- le §2.12, phrase d'attente en tête, étapes 3, 5 et 6, et le paragraphe sur la règle de Figma qui suit la liste ;
- le §2.13, refus 14, et le contrôle des constats qui compare une perte de transfert au dessin ;
- le §2.14, ligne des modes forcés (« une variante que l'occurrence peut montrer ») ;
- le §3.1, troisième point de « Ce que l'exemple montre » (180 bascules de taille) ;
- le §3.2, quatrième point (36 bascules d'état) ;
- le §4.2, lignes des décisions 1 et 7 ; le §4.3, contradiction 8 ;
- le §5.1, phrase des bascules et du témoin ;
- le §6.1, lignes Résolution des vues et Validation ; le §6.2, section « Pièces internes » de FORMAT.md, et POUR-LES-DESIGNERS.md si la convention est retenue ;
- le §7, paragraphe qui suit la table et dernier paragraphe des réponses du mainteneur.

Dans le laboratoire, la perte `P-transfert` (47 464 sur le tirage complet) et les coordonnées non résolues (46,1 % et 38,5 %) en dépendaient. Les cas A07, A13, A13b, A13c, E01b, E05, M-E02 et l'exposition partielle ont changé d'attendu.

### Ce qui reste non prouvé

| Point | État |
|---|---|
| Règle des états | aucun rejeu dans Figma ; `identite` et `valeurInitiale` donnent toutes deux 0 faux, sans dire laquelle Figma applique ; la convention d'UCM est rejouée dans « Convention des états » |
| Moteur 15.0 | il n'existe pas ; seuls le laboratoire et des simulations tirées des données 14.0 exécutent les règles |
| Constats du dessin | le contrat seul ne dit ni un mode forcé, ni un `SLOT` rempli, ni une instance exposée ; le validateur voit leur absence par les constats du moteur, et 2 mutations restent indécidables sans eux (identifiant hors instance, clé exposée prise par l'hôte) |
| Regroupement des pertes | les tirages ne produisent aucune perte de maître regroupable ; la règle est éprouvée sur Groupe (21 classes) et sur le cas D10 |
| Surcharge égale au maître | invisible dans un renvoi complet, aucun cas |
| Glyphe échangé entre deux états (A14) | le laboratoire n'apparie pas deux glyphes |
| Composant préfixé à règles (A10) | accepté sans perte, le contrat propre de la pièce est ignoré |
| `TextPathNode`, `TransformGroupNode` | classés sur le papier, aucun moteur ne les lit |
| Coût | 46,1 % des coordonnées non résolues sur le tirage complet, 38,5 % sans exposition double, avant la convention (17,6 % et 15,0 % avec elle) |
| Limites du laboratoire | ni auto layout ni pixels ; la règle de valeur initiale vaut aussi pour les textes |

Les sorties sont dans `_local/p22/confrontation/sorties/`, préfixées `final-`, avec `postes-finales.json` et `cas-integres.json`. Le journal est `JOURNAL-INTEGRATION.txt`.

### Convention des états

La [forme](./FORME-CONTRAT-15.md) écrit la convention d'UCM de l'[étude de la règle des états](./ETUDE-REGLE-DES-ETATS.md) à la place des décisions 1 et 7 (paire `BXID`, perte d'exposition). Une valeur que l'hôte impose à une occurrence vaut dans tous les états et toutes les variantes que l'occurrence peut prendre. Le contrat n'écrit aucune perte de transfert, et aucun plugin ne contrôle l'écart avec Figma. Le laboratoire `F15` est rejoué avec l'option `convention`. Le journal est `JOURNAL-CONVENTION.txt`, les sorties sont préfixées `conv-`.

#### Passages réécrits

| Passage de la forme | Réécriture |
|---|---|
| §2, définitions | un écart se lit contre la variante citée, un renvoi imbriqué contre la variante qu'il cite ; une valeur imposée est un écart, une valeur de `renvoi.values` ou un axe imbriqué qui diffère de celui de V |
| §2.5 | l'axe exposé choisit la variante quand le code le règle ; sans réglage, le renvoi cite la variante posée, qui n'est pas imposée |
| §2.7 | la valeur imposée s'étend aux variantes atteintes ; A21 reste juste |
| §2.11, ligne 2 | seule la perte d'appariement ambigu reste |
| §2.12 | phrase d'attente retirée ; étape 3 (seuls les axes que le code règle remplacent ceux de V) ; étape 5 (chaque écart va au calque de même identité, sans condition) ; étape 6 (aucune perte de transfert, deux pertes restent) ; paragraphe sur la règle de Figma (le contrat ne la lit pas) |
| §2.13, refus 14 | seul l'appariement ambigu sans perte est refusé |
| §2.14, ligne des modes | la perte vise les variantes atteintes par l'état ou par un axe exposé |
| §3.1, §3.2, §5.1 | les bascules sont décrites sans preuve ; le témoin laisse le contrat inchangé |
| §4.2, §4.3 | décision 1 remplacée, décision 7 retirée, contradiction 8 |
| §6.1, §6.2 | lecteurs ; contenu de FORMAT.md et de POUR-LES-DESIGNERS.md, repris de l'étude |
| §7 | paragraphe après la table et dernier paragraphe des réponses du mainteneur |

#### Modèle de vérité et lecteur

Le modèle de vérité du contrat applique la convention. Une surcharge de l'hôte suit l'identité du calque, sans condition sur la valeur initiale (conservation `identite` du laboratoire). Une surcharge égale à la valeur que la variante citée porte déjà n'est pas une valeur imposée. Ce point ne change aucun tirage et change l'assemblage A22d. Le modèle `valeurInitiale`, qui suit la règle documentée de Figma, sert de comparaison.

Les pertes de transfert cachaient trois défauts du lecteur du laboratoire, que la convention a rendus visibles. Avec la seule suppression de la perte, 15 tirages sur 300 étaient faux.

- `values` portait aussi les axes (par `_args`), alors que le §2.4 le limite aux booléens et aux échanges.
- La valeur posée d'un axe exposé se réimposait à la variante atteinte, alors que cette coordonnée est la variante citée.
- Les écarts d'un renvoi imbriqué se lisaient contre le renvoi de V et non contre la variante qu'il cite, donc une différence de variante passait pour un écart.

Les étapes 3 et 5 du §2.12 écrivent les trois corrections.

#### Épreuves rejouées

| Épreuve | Résultat |
|---|---|
| 5 200 tirages complets, trois modèles de Figma (`convention`, `identite`, `valeurInitiale`) | 0 tirage faux contre la convention et contre `identite` ; 17 830 coordonnées non résolues sur 101 202 (17,6 %), toutes par sélection non unique ; 0 perte de transfert (47 464 avant) |
| 5 200 tirages sans exposition double | 0 tirage faux ; 11 698 non résolues sur 78 024 (15,0 %) |
| 5 200 tirages à modes forcés, mode actif sur sa seule collection | 0 tirage faux ; 3 562 modes forcés, 2 354 pertes de mode |
| 5 200 tirages à modes forcés, chaque mode actif | 0 tirage faux ; 3 562 modes forcés, 3 562 pertes de mode |
| 30 assemblages : les 25 de la section précédente, plus A13c, A22, A22b, A22c, A22d | 0 écart contre la convention ; A09 refusé (F29) ; pertes restantes A13c (appariement), A18 et A19 (sélection), A04b (échange), A20 et A20b (mode) |
| 45 cas de `_local/p22/codex/cas/` et de `cas/`, récrits sans perte de transfert | 45 conformes, dont A05 et E09 refusés comme attendu ; A13c garde sa perte d'appariement |
| 15 mutations des règles nouvelles | 15 refusées (22 avant : 7 mutations de transfert retirées, car le contrat sans perte est juste) |
| 58 mutations de la passe finale, rejouées sur les cas récrits | 58 conformes |
| vérifications de la passe finale, sans l'option `convention` | 5 cas acceptés et 15 mutations refusées ; 9 mutations d'échantillons refusées ; 30 mutations sur 32 refusées, 2 indécidables connues ; limites et épreuve des pertes inchangées |
| 5 graines réduites d'Opus et 7 résidus de B | 0 écart sous les trois modèles |
| clés préfixées sur 5 200 tirages | inchangées : 20 332 clés dans 2 879 tirages, 0 refus, 0 doublon |
| Button, bascules de taille des 90 renvois de `.sizeWrapperButton` | 180 bascules décrites, 0 perte, 0 couleur qui diverge de la règle documentée |
| Groupe, bascules d'état des 9 renvois de `.Segment` | 36 bascules décrites, 0 perte, 0 couleur qui diverge |
| témoin, couleur initiale de la variante `large` changée | contrat inchangé, 0 perte ; 90 bascules divergent de la règle documentée |

La validation (`valider15.cjs`, option `convention`) n'exige plus de perte de transfert. Elle exige encore la perte de sélection et la perte d'appariement ambigu.

#### Attendus qui changent

| Cas | Paire `F15` | Convention |
|---|---|---|
| A07, M-E02 à valeurs différentes | perte de transfert, coordonnées non résolues | la couleur de l'hôte reste sur `Cadre` au survol, aucune perte ; la règle documentée de Figma l'abandonne (1 divergence) |
| A13 | perte de transfert | `Titre` n'existe pas au survol, la valeur n'a pas d'objet ; `Sous-titre` garde sa couleur ; aucune perte |
| A13b | perte de transfert | aucun transfert entre deux noms, aucune perte |
| A13c | perte de transfert et d'appariement | perte d'appariement seule |
| E01b | perte de transfert | la surcharge reste, aucune perte ; la règle documentée de Figma l'abandonne (1 divergence) |
| E05, A21 | perte d'adresse ou de transfert | aucune perte ; le `Halo` du maître est publié |
| exposition partielle | perte de transfert | aucune perte ; la pièce exposée n'existe plus au survol (A22) |
| A06 | perte de transfert | aucune perte |
| A22b | perte de transfert | aucune perte ; sans réglage de l'hôte, la variante exposée de l'état d'arrivée reste la sienne |
| A22c | perte de transfert | aucune perte ; l'axe que l'hôte règle sur une valeur autre que la pose vaut dans les deux états |
| A22d | perte de transfert | aucune perte ; un axe réglé sur la valeur de la pose n'est pas une valeur imposée |

#### Écart avec le modèle de Figma

La mesure compte, sur 56 253 bascules (31 729 couples de variant et de pièce), celles où le contrat dit autre chose que le modèle `valeurInitiale`, sans perte déclarée. Le contrat de la convention n'a aucun écart contre son propre modèle.

| Contrat | Bascules divergentes | Couples | Composants |
|---|---|---|---|
| convention, telle qu'écrite | 7 497 (13,3 %) | 4 482 sur 31 729 (14,1 %) | 2 215 sur 5 200 (42,6 %) |
| convention avec la perte d'exposition de l'étude | 2 844 (5,1 %) | 1 695 (5,3 %) | 978 (18,8 %) |
| étude, `R-UCM` (58 364 bascules) | 3 041 (5,2 %) | 1 757 (5,4 %) | 1 054 (20,3 %) |

Le 5,2 % de l'étude tient à la perte d'exposition : elle déclarait 41 890 renvois, dont beaucoup couvraient des bascules que la règle documentée traite autrement. En la retirant, l'écart visible monte à 13,3 %, et le contrat n'en dit pas plus faux, puisque la convention décide du sens. La divergence porte sur la couleur dans 6 981 bascules, sur la boîte dans 486 et sur le style de texte dans 221. Le générateur pose 0 à 3 surcharges au hasard sur chaque occurrence, donc ce taux surestime les fichiers réels. Sur Button et Groupe, aucune couleur ne diverge.

#### Pertes qui restent

| Perte | Pourquoi elle reste | Fréquence |
|---|---|---|
| sélection non unique | aucun variant ou plusieurs aux coordonnées voulues ; ce n'est pas un transfert | 22 529 pertes sur 5 200 tirages ; cause de toutes les coordonnées non résolues |
| appariement ambigu | l'identité d'un calque est son nom et son rang parmi les frères ; deux frères de même nom ne donnent pas le calque qui reçoit la valeur dans V′ | 0 dans les 5 200 tirages, 1 dans A13c ; aucune dans Button, une structure de Groupe sur 13 a deux frères de même nom, sans écart de l'hôte |
| L6, `SLOT` rempli, mode forcé, échange vers une pièce, données de rendu | ne viennent pas de la règle des états | inchangées |

Le contrat a encore besoin d'un appariement par nom pour situer une adresse dans une autre variante, car le seul autre repère est l'adresse de slot, qui change quand un calque est renommé ou retiré (A13, A13b). L'appariement ambigu reste donc une perte du contrat. Il ne vient pas de la règle de Figma. Le départager par le rang serait une seconde convention, que le designer ne voit pas.

#### Interprétation à confirmer

La décision 4 est lue comme dans la passe précédente. La valeur posée d'un booléen ou d'un échange va dans `renvoi.values`. Celle d'un axe exposé reste dans les coordonnées de `renvoi.variant`, sans copie dans `values`. La convention en tire deux conséquences que la lecture n'imposait pas. La coordonnée d'un axe exposé est la variante citée et non une valeur imposée, sauf quand un renvoi imbriqué la règle autrement que le renvoi de V. Le contrat ne dit pas si l'hôte a réglé un axe sur la valeur que V pose déjà, donc ce réglage n'est pas lu comme imposé (A22d). Le mainteneur confirme cette lecture ou demande que le renvoi porte aussi les champs que l'API de Figma dit surchargés.

#### Limites

- Le modèle de Figma du laboratoire ne calcule ni auto layout ni pixels. Les surcharges de dimensions y sont des choix du designer, alors que Button montre des dimensions que l'auto layout calcule (étude, mesures sur Button). La convention les exclut dans son texte, et le contrat ne publie pas ces dimensions comme écarts.
- Aucun rejeu dans Figma. La règle documentée `valeurInitiale` ne sert que de comparaison.
- Une valeur égale à celle de la variante citée est invisible dans un renvoi complet (A22d).

#### Questions au mainteneur

1. Faut-il départager deux frères de même nom par leur rang plutôt que de garder la perte d'appariement ? Recommandation : garder la perte. Elle ne se produit dans aucun tirage ni dans Button, et le rang est une convention que le designer ne voit pas.
2. Faut-il garder une perte quand la variante atteinte pose autrement une instance exposée (perte d'exposition de l'étude) ? Recommandation : non. Elle ne protège pas le contrat, qui est exact contre la convention, et elle cache 4 653 des 7 497 bascules où Figma documenté ferait autre chose.
3. Faut-il que l'Exporter publie les champs que l'API de Figma dit surchargés, pour lire une valeur imposée égale à celle de la variante citée ? Recommandation : non. Le renvoi resterait complet (D4), et le cas n'apparaît ni dans Button ni dans Groupe.

Les outils sont dans `_local/p22/confrontation/` : `lab-b.cjs` (option `convention`), `analyse-f15.cjs` (paire `CONV`), `lancer-conv.sh`, `lancer-conv-mesures.sh`, `mesurer-conv.cjs`, `causes-conv.cjs`, `adverses-b.cjs` (assemblages A13c et A22 à A22d), `graines-conv.cjs`, `cas-conv.cjs` (fabriqué par `fabriquer-cas-conv.cjs`), `mesures-conv.cjs`, `patch-valider15-conv.cjs` et `sorties/conv-*.json`.
