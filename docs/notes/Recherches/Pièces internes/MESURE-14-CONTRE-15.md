# Mesure du contrat 14.0 contre le contrat 15.0

Le contrat 14.0 est moins sûr que la 15.0, de très peu sur Button et de beaucoup sur Groupe et sur tout assemblage dont une variante change. Sur 5 200 tirages à graine, 4 772 contrats 14.0 (91,8 %) rendent au moins une configuration fausse sans message qui la nomme, contre 0 pour la forme du commit `c756cc5f` en tirage complet et 5 sur 5 200 (0,1 %) en tirage sans doublon. La forme intégrée ensuite dans l'arbre de travail (F15) en rend 0 dans les deux cas. La 14.0 reste exacte sur la variante posée quand aucune dépendance ne reçoit de couleur de son parent et qu'aucune pièce n'est posée deux fois : c'est son seul domaine sûr, et il couvre Button, à 3 pertes de `.Ring` près.

## Verdict chiffré

« Silencieux » désigne une donnée de Figma absente ou fausse dans le contrat, qu'aucun message de `meta.diagnostics` ne nomme. Les chiffres 15.0 viennent de la simulation de `c756cc5f` (B) et de la forme intégrée (F15) ; aucun moteur 15.0 n'existe.

| Épreuve | 14.0, écarts silencieux | 15.0 `c756cc5f` | 15.0 intégrée (F15) |
|---|---|---|---|
| 1. Button, variants posés (90) | 3 (racine de `.Ring` sans auto layout, hauteur fixe sans variable, gap et padding non transmis) | 0, ces 3 pertes sont déclarées | 0 |
| 1. Groupe, variants posés (3) | 24 faits faux ou absents : 6 props absorbées à tort, 9 liaisons de visibilité fausses, 9 couleurs d'icône non publiées | 0 | 0 |
| 1. Groupe, pertes de Figma non nommées par l'hôte | 17 classes, 145 occurrences sur 475 | 0, 22 classes déclarées | 0 |
| 1. Groupe, variantes de `.Segment` non posées | 81 variantes sur 90, 1 734 faits sur 1 908 (90,9 %), 92 triplets jamais publiés | 0, les 90 variantes sont publiées | 0 |
| 2. Tirages complets, 5 200 graines | 4 772 tirages faux (91,8 %) | 0 | 0 |
| 2. Tirages sans doublon, 5 200 graines | 4 395 tirages faux (84,5 %) | 5 (0,1 %) | 0 |
| 2. Tirages avec modes forcés, 2 000 graines | 1 890 tirages faux (94,5 %) | 0 | 0 |
| 2. Configurations lues, tirages complets (118 752) | 64 866 sur 101 202 hors configuration posée sont fausses (64,1 %) | 0 fausse, 36 848 non résolues et déclarées | 0 fausse, 46 690 non résolues et déclarées |
| 3. Assemblages A01 à A21 | 13 faux sans signal, 1 perte déclarée, 1 refusé, 6 justes | 1 faux, 9 pertes déclarées, 3 refusés, 8 justes | 0 faux, 8 pertes déclarées, 2 refusés, 11 justes |
| 4. Propriétés de Figma sur les 80 entrées d'Opus | 14 non couvertes et sans perte | 13 non couvertes dans le code, classées sur le papier | idem |

La 15.0 ne gagne pas partout. Elle déclare non résolues 36,4 % (B) et 46,1 % (F15) des configurations qui changent une variante ou un état, là où la 14.0 rend une valeur, fausse dans 64,1 % des cas. Elle refuse deux assemblages que la 14.0 décrit (A09 deux pièces `.Item`, A05 boucle, que Figma refuse déjà). La section « Ce que la 14.0 fait mieux » chiffre le reste.

## Méthode

Tous les scripts sont dans `_local/p22/mesure-14/`, copiés des dossiers de Codex, d'Opus et de la confrontation. Le journal `JOURNAL.txt` donne les commandes.

- Épreuve 1 : `sonder-captures.cjs`, `faits.cjs`, `ecarts-14-15.cjs`, `faits-capture.cjs`. Les contrats 14.0 rejoués de `_local/p22/scripts/` et les captures de `_local/p22/` donnent la vérité ; la 15.0 simulée est `codex/Button.15.json` et `codex/Groupe.15.json`.
- Épreuve 2 : `lab14.cjs` construit le contrat 14.0 et le lit dans le modèle de vérité de `labo-b/lab-b.cjs` (celui de la confrontation, avec les deux règles de conservation d'une surcharge). `tirages14.cjs` passe les mêmes graines et les mêmes configurations dans le lecteur 14.0, dans la forme B et dans la forme F15. Un tirage compte comme faux quand une de ses configurations porte un écart que rien ne déclare. Les graines et le générateur sont ceux d'Opus (`gen.cjs`).
- Épreuve 3 : `adverses14.cjs` rejoue les assemblages d'Opus ; `labo-b/adverses-b.cjs` donne les colonnes B et F15.
- Épreuve 4 : `couverture-figma.json` d'Opus (80 entrées avec le statut 14.0 et 15.0) et celui de Codex (2 038 lignes d'obligations 15.0).

Règles du contrat 14.0 appliquées dans `lab14.cjs`, tirées de FORMAT.md (§1, §3) et de `packages/plugin-exporter/SPEC.md`.

1. Une pièce se parcourt et s'aplatit dans la vue exacte du variant posé, au contraire d'une dépendance.
2. Le wrapper de dimensions est élu une fois : l'instance qui lie le plus de dimensions, puis l'exposition, puis l'ordre de l'arbre. Ses props sont fusionnées dans l'API de l'hôte, exposées ou non.
3. Une visibilité pilotée par une prop d'une pièce non élue est publiée figée à sa valeur posée.
4. Une couleur qu'un composant donne au dessin d'une dépendance n'est pas publiée.
5. Une couleur sans variable avertit. Un mode de variable forcé n'est lu nulle part.
6. Les dimensions des autres tailles du wrapper vivent dans `structure.sizes`.

## Épreuve 1 : aller-retour sur Button et Groupe

### Ce que les captures et les contrats montrent

| Donnée | Button | Groupe |
|---|---|---|
| variantes de l'hôte | 90 | 3 |
| pièce posée | `.sizeWrapperButton` (3 variantes, 1 posée, 90 occurrences exposées), `.Ring` (1 variante, 18 occurrences) | `.Segment` (90 variantes, 9 posées, 9 occurrences, 0 exposée) |
| props du contrat 14.0 | 9 | 9 dont 6 venues de `.Segment` |
| diagnostics 14.0 | 0, `coverage` complete | 9 dont 7 de projection, `coverage` partial |
| octets 14.0 | 49 663 | 13 205 |

### Écarts par famille

| Famille | Button 14.0 | Button 15.0 | Groupe 14.0 | Groupe 15.0 |
|---|---|---|---|---|
| variantes de pièce non posées | 2 variantes absentes, 6 triplets de faits qui diffèrent (gap, padding, radius), tous portés par `structure.sizes` : 0 silencieux | 0 | 81 variantes absentes, 1 734 faits dont 1 389 de structure, 327 de couleur et 18 d'effet, 92 triplets distincts jamais publiés : silencieux | publiées |
| API de l'hôte, props absorbées à tort | 0 sur 9, les 4 props du wrapper sont exposées sur 90 occurrences sur 90 | 0 | 6 : `disabled`, `selected`, `position`, `bordGauche`, `bordDroit`, `iconLeft`, que Figma ne montre pas sur Groupe, toutes silencieuses ; seule la collision de `theme` est déclarée | 0 |
| couleurs posées dans une dépendance | 0, aucune dépendance `Icon` | 0 | 9 placements sur 39 (23 %) non publiés, silencieux | 9 publiés |
| style de texte et taille d'icône selon la taille | 0 : les trois tailles ne diffèrent que par gap, padding et radius | 0 | sans objet, pas d'axe de taille | sans objet |
| visibilité empruntée au slot de la pièce | 0 | 0 | 9 liaisons de `iconLeft` posées sur le slot de la pièce ou sur `Cadre`, qui masqueraient le segment entier : fausses, silencieuses | 0 |
| largeur des contours | sans objet | sans objet | 3 classes déclarées (`Cadre`, `BordGauche`, `BordDroit`) | mêmes 3 classes, 150 occurrences déclarées |
| ombres | 0 | 0 | 1 style d'effet sans couleur, dans une variante non posée : silencieux | déclaré |
| autres propriétés de Figma | 3 pertes de `.Ring` : silencieuses | 3 déclarées | 17 classes, 145 occurrences (opacité, auto layout, masque, rayon, largeur et hauteur du calque d'anneau de focus, proportions `scale`) : non nommées par l'hôte | 22 classes déclarées au total |
| modes de variable forcés | 94 nœuds (91 dans l'hôte, 3 dans le wrapper), aucune variable liée : sans effet | silencieux aussi, sans effet | 0 | 0 |

Sur les 17 classes de Groupe que l'hôte 14.0 ne nomme pas, 13 (109 occurrences) sont nommées dans le contrat 14.0 autonome de `.Segment`, que l'hôte n'embarque pas, et 4 (36 occurrences, les contraintes `scale`) ne sont nommées nulle part en 14.0.

Le contrat 14.0 de Button annonce `coverage.portable` à `complete` avec 0 diagnostic alors que la racine de `.Ring` n'a pas d'auto layout et que sa hauteur est fixe sans variable.

## Épreuve 2 : tirages à graine

Le générateur tire un hôte, de une à trois pièces imbriquées, une dépendance `Icon`, des expositions partielles ou sur plusieurs niveaux, des surcharges de couleur, de visibilité, de boîte, de style, de variante imbriquée et de glyphe. Chaque variant de l'hôte reçoit sa configuration posée, jusqu'à quatre réglages d'une prop exposée et chaque état d'une pièce non exposée. Le modèle de vérité rend l'instance réglée comme Figma, et le contrat se lit à son tour.

### Tirages avec au moins un écart silencieux

| Lecteur | Jeu | Graines | Faux, toutes configurations | Faux hors état | Faux sur la configuration posée | Faux sur un réglage de prop (variante ou booléen) | Faux sur un état |
|---|---|---|---|---|---|---|---|
| 14.0 | complet | 5 200 | 4 772 (91,8 %) | 3 876 | 2 517 | 2 792 et 2 143 | 3 610 |
| `c756cc5f` | complet | 5 200 | 0 | 0 | 0 | 0 | 0 |
| F15 | complet | 5 200 | 0 | 0 | 0 | 0 | 0 |
| 14.0 | sans doublon | 5 200 | 4 395 (84,5 %) | 2 721 | 962 | 2 173 et 965 | 3 512 |
| `c756cc5f` | sans doublon | 5 200 | 5 (0,1 %) | 5 | 0 | 5 | 0 |
| F15 | sans doublon | 5 200 | 0 | 0 | 0 | 0 | 0 |
| 14.0 | modes forcés sur 10 % des occurrences | 2 000 | 1 890 (94,5 %) | 1 670 | 1 361 | 1 082 et 1 010 | 1 393 |
| `c756cc5f` | modes forcés | 2 000 | 0 | 0 | 0 | 0 | 0 |
| F15 | modes forcés | 2 000 | 0 | 0 | 0 | 0 | 0 |

Les deux règles de conservation d'une surcharge du modèle de vérité (`identite` et `valeurInitiale`) donnent les mêmes comptes à 4 configurations près. Le jeu « sans doublon » retire les pièces posées deux fois et les clés partagées. Les 5 tirages de `c756cc5f` viennent de l'exposition partielle d'une pièce de pièce, que F15 traite.

### Configurations lues, tirages complets

| Lecteur | Configurations hors posée | Rendues exactes | Fausses sans signal | Non résolues et déclarées |
|---|---|---|---|---|
| 14.0 | 101 202 | 36 336 (35,9 %) | 64 866 (64,1 %) | 0 |
| `c756cc5f` | 101 202 | 64 354 (63,6 %) | 0 | 36 848 (36,4 %) |
| F15 | 101 202 | 54 512 (53,9 %) | 0 | 46 690 (46,1 %) |

Par genre, la 14.0 est fausse sur 12 711 variantes exposées changées sur 24 798 (51,3 %), 6 955 booléens sur 30 198 (23,0 %), 45 200 états sur 46 206 (97,8 %) et 3 402 configurations posées sur 17 550 (19,4 %).

### Causes côté 14.0

| Cause | Mesure |
|---|---|
| une propriété que Figma expose sur l'hôte manque à l'API 14.0 (pièce non élue, pièce de pièce, prop de dépendance) | 18 988 réglages sur 54 996, soit 34,5 % ; 2 411 tirages sur 5 200 |
| props du wrapper fusionnées alors que l'instance n'est pas exposée dans tous les variants | 3 047 tirages sur 5 200 (58,6 %), 9 757 clés sur 16 711 fusionnées |
| couleur posée sur une dépendance | seule cause des 962 tirages faux sur la configuration posée du jeu sans doublon |
| deux instances du même set, une seule clé et une seule valeur posée, clés partagées | 1 555 tirages faux de plus sur la configuration posée entre le jeu complet (2 517) et le jeu sans doublon (962) |
| état d'une pièce non exposée | aucune donnée : la 14.0 ne publie que la variante posée |
| mode forcé | 8 642 écarts de mode sur la configuration posée dans le jeu avec modes |
| couleur sans variable | déclarée par la 14.0 comme par la 15.0 |

Le lecteur « sizes » ajoute la boîte de la racine du wrapper selon son axe, comme `structure.sizes` le fait. Il ne corrige aucune configuration : dans ce modèle, une variante de pièce diffère aussi par ses couleurs et sa structure. Sur Button, où les tailles ne diffèrent que par gap, padding et radius, `structure.sizes` suffit (épreuve 1).

Un contrat 14.0 de tirage porte au moins un avertissement dans 1 774 tirages complets sur 5 200 (couleur sans variable). Même si chacun de ces avertissements valait signal pour tout le contrat, 2 998 tirages faux au moins resteraient sans signal.

## Épreuve 3 : assemblages A01 à A21

« Faux » signifie un écart de rendu ou d'API sans signal. A03, A05 et A10 ne s'écrivent pas dans le laboratoire ; leur verdict vient du texte des formats. A08 suit A06.

| Assemblage | 14.0 | Cause 14.0 | 15.0 `c756cc5f` | 15.0 F15 |
|---|---|---|---|---|
| A01 exposition à trois niveaux, booléen réglé sur l'hôte | faux | la prop `voir` n'est pas dans l'API | juste | juste |
| A02 dépendance exposée par une pièce | faux | la prop de la dépendance n'est pas dans l'API | juste | juste |
| A03 pièce dans le `SLOT` d'une pièce | juste, lu sur le texte : l'occurrence posée est décrite à plat | texte | perte déclarée | perte déclarée |
| A04 échange vers une pièce, non exposé | juste | | juste | juste |
| A05 boucle indirecte | refusé par Figma | | refusé | refusé |
| A06 surcharge sur un calque absent de l'autre variante | faux | une seule variante publiée | perte déclarée | perte déclarée |
| A07 état qui change la structure | faux | aucune variante d'état | perte déclarée | perte déclarée |
| A08 même cas que A06 | faux | idem | perte déclarée | perte déclarée |
| A09 deux pièces `.Item` | juste | pas de clé de pièce | refusé | refusé |
| A10 composant préfixé à règles | juste | devient une dépendance | juste | juste |
| A11 axe `Size` de l'hôte et axe exposé | perte déclarée | collision signalée | refusé | juste |
| A12 deux instances exposées du même set | faux | une valeur posée pour deux instances | perte déclarée | juste |
| A13 deux textes, un seul au survol | faux | aucune variante d'état | perte déclarée | perte déclarée |
| A14 glyphe différent entre deux états | faux | couleur de dépendance et variante d'état absentes | juste | juste |
| A15 variante exposée aux couleurs réelles différentes | faux | une seule variante publiée | juste | juste |
| A16 pièce de pièce, booléen réglé sur l'occurrence | juste | la vue posée est exacte | juste | juste |
| A17 booléen posé à vrai dans un variant, à faux dans l'autre | juste | idem | juste | juste |
| A18 combinaison absente atteinte par l'hôte | faux | la 14.0 rend la vue posée | perte déclarée | perte déclarée |
| A19 coordonnées répétées, rendus différents | faux | idem | perte déclarée | perte déclarée |
| A20 mode forcé sur une occurrence | faux | aucun champ de mode | perte déclarée | perte déclarée |
| A21 aperçu atteint par un état | faux | aucune variante d'état | faux | juste |
| Total | 13 faux, 1 perte déclarée, 1 refusé, 6 justes | | 1 faux, 9 pertes déclarées, 3 refusés, 8 justes | 0 faux, 8 pertes déclarées, 2 refusés, 11 justes |

Les assemblages ajoutés par la confrontation donnent, pour `c756cc5f` : A21, A13b (même valeur initiale sous deux noms), E07 (valeur posée par variant lue sans échantillon) et A04b (échange exposé vers une pièce, 4 écarts) faux ; F15 rend 0 écart silencieux sur les quatre. La 14.0 rend faux A04b, A13b, A07b, A01b et, sous la seconde règle de conservation, E01b ; E07 et E01c sont justes.

## Épreuve 4 : couverture de Figma

Les 80 entrées d'Opus (`_local/p22/opus/couverture-figma.json`) classent chaque propriété pour la 14.0 et la 15.0.

| Statut | 14.0 | 15.0 |
|---|---|---|
| portée par un champ | 43 | 45 |
| sans effet sur le rendu | 8 | 8 |
| perte déclarée | 14 | 14 |
| non couverte, sans perte | 14 | 13 |
| sans objet | 1 | 0 |

La 15.0 couvre deux faits de plus : la variante d'une pièce dans une pièce (`renvoi.pieces[].variant`) et le choix d'une autre variante par une occurrence, ce second fait par une règle de lecture dont les 36,4 % et 46,1 % de configurations non résolues plus haut mesurent le coût.

Les 13 propriétés restées non couvertes sont les mêmes en 14.0 et en 15.0 : `scaleFactor`, les modes de variable forcés par calque, `cornerSmoothing`, `clipsContent`, `strokesIncludedInLayout`, `itemReverseZIndex`, les interactions de prototype, les animations, `strokeCap`, `strokeJoin` et `strokeMiterLimit`, `hyperlink`, la variable de texte sur `characters`, `TextPathNode` et `TransformGroupNode`. Le §2.14 de la 15.0 exige un champ ou une perte pour chacune, et la table de Codex le déclare pour 1 831 lignes sur 2 038 (796 champ et perte, 352 perte, 683 perte si non représenté ; 80 identités et 127 propriétés d'éditeur sortent du compte). Cette exigence est écrite et aucun moteur ne l'exécute. La 14.0 n'a pas de table équivalente : son code déclare 14 pertes (peintures multiples, dégradés, mode de fusion, masque, pointillé, plages de texte, liste, groupe, variable de visibilité, effets sans style) et se tait sur le reste.

## Ce que la 14.0 fait mieux

| Point | Mesure |
|---|---|
| exactitude de la variante posée | sur le jeu sans doublon, les 962 tirages faux sur la configuration posée ne portent que la couleur d'une dépendance ; aucun autre champ ne diffère. Une lecture sans règle de transfert ni d'appariement suffit. |
| taille de Groupe seul | 13 205 octets contre 186 125 pour la 15.0 simulée (×14,1). Les 475 pertes en pèsent 109 966, et la 15.0 décrit les 90 variantes de `.Segment`. Sans métadonnées, hôte et pièce valent 80 927 octets en 14.0 et 75 902 en 15.0. |
| taille de Button | la 15.0 est plus petite, 48 942 octets contre 49 663 (−1,5 %). |
| nombre de lecteurs à changer | l'inventaire de Codex cite 74 fichiers de lecteurs : 10 entrées sont à adapter, 3 à préciser, 4 inchangées. La 14.0 passe par `vueExacteDuVariant` seul. |
| comportements déjà éprouvés | d'après la note du projet, le plan Button et Alert a livré avec la 14.0 (kit 0.18.7 publié). Aucun lecteur 15.0 n'existe ni n'a tourné dans Figma. |
| dimensions par taille | `structure.sizes` donne gap, padding et radius de chaque taille sans lire les vues des variantes du wrapper. La 15.0 retire ce champ et les retrouve dans les vues des variantes de la pièce. |
| refus | la 14.0 n'a pas de clé de pièce, de cycle ni de borne de profondeur à refuser. Elle décrit A09, que la 15.0 refuse par F29. |
| règles de lecture | la 14.0 n'en a aucune pour l'état ni pour la bascule. La 15.0 en écrit quatre (appariement par chemin de calques, transfert prouvé des écarts, sélection unique, source de propriétaire en propriétaire), dont la preuve dépend du modèle de vérité du laboratoire. |

## Limites de la mesure

- Aucune épreuve ne tourne dans Figma ni sur un moteur 15.0. Les captures de Button et de Groupe servent aux comptes de l'épreuve 1 ; les tirages jouent un modèle de Figma écrit par Opus.
- Le modèle de vérité conserve une surcharge selon le nom et le rang du calque, avec deux règles d'une surcharge qui change de variante (`identite` et `valeurInitiale`). Figma garde son heuristique pour lui. Le modèle réduit la boîte et le placement à des étiquettes et ne compare ni les textes ni les valeurs de dépendance.
- Le lecteur 14.0 lit ce que le contrat publie, et ne reprend aucun consommateur existant. Il applique les six règles de la section Méthode. L'élection du wrapper, par nombre de boîtes liées, est un substitut de la règle de FORMAT.md, qui compte gap, padding et radius liés. Deux hypothèses favorisent la 14.0 : la valeur posée d'une prop fusionnée est lue sur la première occurrence du wrapper, et un état d'interaction est compté faux alors que la 14.0 ne prétend pas le décrire. Une visibilité pilotée par une prop d'une pièce non élue est supposée publiée figée, sans avertissement ; le code du moteur n'a pas été lu pour le confirmer.
- La déclaration d'un écart a deux règles. Pour la 14.0, seuls une couleur sans variable et une collision de clé comptent comme déclarées. Pour la 15.0, le laboratoire déclare un écart quand une perte vise le renvoi traversé. Cette asymétrie peut surestimer les pertes déclarées de la 15.0.
- Le laboratoire ne contient pas la preuve de transfert d'une couleur de `c756cc5f` (même valeur initiale à l'adresse), ni les pertes de structure et de typographie du §2.12. La colonne `c756cc5f` suit l'implémentation de `lab-b.cjs` de la confrontation, pas le texte.
- L'épreuve 1 compte les faits des variantes de pièce dans les contrats autonomes 14.0 des pièces, supposés complets sur chaque variante. Elle suppose exactes les vues des variants posés de l'hôte, ce que les 0 écart du rapprochement 14.0 contre 15.0 simulée sur Button (90 variants) et Groupe (3) confirment sans le prouver contre Figma.
- Les classes de pertes de Groupe sont celles de `Groupe.15.json`, dont les compteurs viennent du moteur simulé de Codex. Les assemblages A03, A05 et A10 ne sont pas rejoués.
- Les chiffres des octets pour la 15.0 viennent du §5.1 de `c756cc5f`. La simulation F15 pèse 54 072 octets pour Button.
