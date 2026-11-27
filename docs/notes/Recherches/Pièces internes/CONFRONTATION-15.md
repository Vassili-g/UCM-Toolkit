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

Le mainteneur retient les décisions 4 à 9 et 11, qui corrigent les défauts prouvés, puis les décisions 2, 3 et 10 : la première de deux instances exposées garde sa clé et les suivantes prennent le préfixe de leur slot, le renvoi reste complet (D4), et les pertes répétées se regroupent. Le mainteneur retient aussi la décision 1, option 3 (paire `BXID`), sur ce principe : le contrat ne dit jamais une chose fausse, et il écrit une perte quand il ne peut pas prouver ce que Figma rendrait.
