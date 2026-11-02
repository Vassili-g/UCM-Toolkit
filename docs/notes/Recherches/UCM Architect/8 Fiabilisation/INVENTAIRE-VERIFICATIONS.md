# Inventaire des vérifications d'UCM Architect

Ce document liste chaque vérification qu'UCM Architect fait en mode Tokens et en mode Composant. Pour chacune, il donne la source, les conditions exactes de déclenchement, ce que le plugin affiche, le résultat attendu et l'écart. Il sert de base aux plans de stress test (étape E2). La section 8 porte les réponses du mainteneur (étape V1).

Les chemins sont relatifs à `packages/`. `K` désigne `kit/src/controles/`, `R` `kit/src/referentiel/`, `A` `plugin-architect/src/`, `S` `plugin-socle/src/composant/`. Tout vient de la lecture du code. Deux cas ont été rejoués sur le kit (section 2.4).

Classement des écarts :

| Classe | Sens |
|---|---|
| Bug | Le code contredit sa propre règle, la SPEC ou une décision du mainteneur |
| Trop strict | Une garde fait taire un vrai défaut |
| Assumé | La limite est voulue et documentée ; le stress test la mesure seulement |
| À trancher | Le résultat attendu dépend d'une décision du mainteneur (section 8) |

## 1. Décisions déjà prises

| Id | Décision |
|---|---|
| D1 | Une faute est signalée même si elle n'apparaît que dans un nom, et même si elle se répète dans beaucoup de noms. |
| D2 | Un mot à une lettre d'un terme connu du vocabulaire UCM est une faute, même si ce terme n'apparaît nulle part dans le fichier. Le nombre d'emplois ne départage que deux mots hors vocabulaire. |
| D3 | Une forme tolérée (`separator` pour `divider`) ou un synonyme donne au designer le choix d'harmoniser, même quand le fichier n'emploie que cette forme. |
| D4 | Le seuil de longueur d'un mot fautif se fixe par la mesure, pas à l'estime. |
| D5 | Le corpus de test réunit la nomenclature de référence du kit, les noms des 15 design systems de `docs/references/design-systems/` (environ 14 900 noms) et le fichier Slice, qui reste dans `_local/`. |

## 2. Mode Tokens : Nomenclature

### 2.1 Chaîne

Le socle lit les seules variables et collections locales (`plugin-socle/src/inventaireDeNoms.ts:64-67`). `A/nomenclature/session.ts:341-351` appelle `nomsSelonLesRegles` (`kit/src/nommage/calcul.ts:102`) puis `detecter`, avec un seuil de score de 2 et un maximum de 10 questions plus le nombre de questions mises à plus tard (`session.ts:288`). `A/nomenclature/projection.ts` range le résultat dans les onglets Corrections, Questions, À faire dans Figma et Règles. Un fichier dont la déclaration UCM est absente ou libre ne montre aucun onglet (`A/ui/index.ts:119-123`).

Gardes communes aux questions (`R/questions.ts`) :

- un nom de collection ne porte aucun mot (l.151) ;
- un segment de nature composant ou palette est sauté (l.156) ;
- un mot couvert par un remplacement (forme tolérée ou règle du fichier) n'est pas observé (l.159-192) ;
- une question ne sort que si tous ses mots se retrouvent dans le découpage du renommage (`motsApplicables`, l.201-206, 253) ;
- une question de score inférieur à 2, ou au-delà du rang 10, va dans « Autres pistes », une carte grise sans action (l.321-330, `A/ui/nomenclature/aTrancher.ts:596-606`).

La place d'un mot est le couple formé par sa collection, son rang dans le chemin et son voisin avant ou après (`R/questions.ts:29-61`). Un nom d'un seul segment n'a aucune place.

### 2.2 Questions

| Question | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| Synonymes | `R/questions.ts:229-232`, groupes `R/vocabulaire.ts:40-50` | Deux mots d'un des 9 groupes en dur, tous deux observés, qui partagent une place | Carte Remplacer, Garder, Termes différents, Autre terme ; terme UCM présélectionné | Toute paire de synonymes du vocabulaire réel, y compris `divider`/`separator` et `background`/`surface` | E-11 |
| Abréviation | `R/questions.ts:225-226`, `R/vocabulaire.ts:52-54` | `fg`, `btn`, `txt`, `img` et leur forme longue, tous deux observés ; aucune garde de place | Idem | Conforme | |
| Terminaison | `R/questions.ts:223` | `x` et `x` + `ed`, `d` ou `ing`, de même type (variable ou groupe) | Idem | Conforme, sans faux couple | E-12 |
| Pluriel | `R/questions.ts:224` | `x` et `x` + `s` ou `es`, de même type | Idem | Conforme, sans faux couple | E-12 |
| Branches parallèles | `R/questions.ts:233-247`, `R/branches-paralleles.ts:43-130` | Deux branches sœurs de même structure qui diffèrent d'un mot ; 2 à 12 branches par clé, 2 à 200 entrées, 80 % de sous-chemins communs ; ni négation, ni deux termes connus de sens différent | Idem | Conforme | E-45 |
| Faute | `R/questions.ts:263-299` | Mot fautif dans 2 noms au plus ; référence dans 5 noms au moins ; distance 1 sans échange ; place partagée ; référence connue du vocabulaire | « Corriger X en Y » présélectionné, « C'est voulu » | D1, D2 : toute faute à une lettre ou à un échange d'un terme connu | E-01 à E-07 |
| Mots collés | `R/questions.ts:300-310` | Segment en minuscules qui se coupe en mots observés à la même place, de 3 lettres au moins, dont un connu | « Séparer X en a-b », « C'est un seul mot » | Conforme | E-13 |
| Collection | `R/questions.ts:312-320` | Collection dont le nom n'est ni une collection UCM ni une forme ancienne reconnue | Liste des 7 collections, rien de présélectionné | Conforme | E-15 |

### 2.3 Renommages (onglet Corrections)

| Renommage | Source | Conditions | Attendu | Écart |
|---|---|---|---|---|
| R1 forme tolérée remplacée par le terme UCM | `R/vocabulaire-du-fichier.ts:77-94` | Forme listée dans `toleres` (`bg`, `separator`, `error`), sur une frontière de mot, terme non écarté | D3 | E-08, E-09, E-10 |
| R2 règle du fichier | `R/vocabulaire-du-fichier.ts:96-118` | Règle créée par une réponse ou la page Règles ; conflits `contredit-ucm`, `deja-remplace`, `cycle` montrés en carte de conflit | Conforme | |
| R3 écriture d'une collection | `R/lexique.ts:126-135` | Collection reconnue écrite autrement que sa forme canonique | Conforme | |
| R4 écriture des variables et des groupes | `R/lexique.ts:112-113`, `R/ecriture-des-mots.ts:148-201` | Casse ou séparateur différents de la convention choisie, ou dominante du fichier sans minimum | Conforme | E-17 |
| R5 collisions et chemins publiés | `R/lexique.ts:227-285`, `kit/src/nommage/calcul.ts:67-78` | Deux destinations identiques, ou un token qui deviendrait groupe : renommage retiré, montré sous « Bloqués » | Conforme, et le designer voit pourquoi | E-08 |
| R6 protection de Palettes | `kit/src/nommage/inventaire.ts:60-96` | Variable écrite par Palettes laissée telle quelle tant que la marque `nommage` n'est pas courante | Conforme | |

### 2.4 Les deux cas du mainteneur, rejoués

Le thème rejoué a 4 palettes de 14 rôles, plus `ring` et les trois `disabled/*`.

- `backgrond` ne sort pas, même sans seuil de score. `background` n'apparaît que dans `disabled/background`, donc il n'atteint pas les 5 noms d'une référence (`R/questions.ts:266`). Le témoin `primary/surface/bordr` sort, car `border` apparaît dans 8 noms à la même place.
- `separator` ne pose pas de question. Il est une forme tolérée de `divider` (`R/vocabulaire.ts:163`) : R1 le renomme en `divider`. Dans le rejeu, `primary/page/separator` deviendrait `primary/page/divider`, qui existe déjà. Le renommage est retiré pour collision et n'apparaît que sous « Bloqués ».

## 3. Mode Tokens : structure

`A/sandbox/structure.ts:97-121` lance `controlerLeCatalogue` et `controlerLIntegriteUcm`, dédoublonne par identifiant et retire les ignorés. Hors UCM, ou si la lecture échoue, les listes sont vides.

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C63 `alias-supprime` | `K/structure.ts:43-69` | Alias d'une variable présente vers une cible absente du catalogue, par mode ; voisine de même dernier segment citée | À faire, rubrique Alias | Conforme | |
| C63 `library-inactive` | `K/structure.ts:71-88` | Cible ou collection cible inaccessible quand une library est choisie | À faire | Conforme | |
| C63 `sans-valeur-en-mode` | `K/structure.ts:90-101` | Une variable sans valeur dans un mode de sa collection | À faire | Conforme | |
| C63 `couleur-sans-alias` | `K/structure.ts:103-117` | Couleur de `components` dont un segment est la famille couleur, valeur directe dans un mode | À faire | Conforme | |
| C63 scopes | `K/structure.ts:123-145` | Variable de `theme` reconnue dont les scopes diffèrent de `SUPPORT_DES_VARIABLES` | Carte Scopes, cochée | Conforme | E-19 |
| C63 doublons d'échelle | `K/structure.ts:209-238` | Deux variables `layout/sizing/<n>` de même valeur dans un mode | À faire avec candidats | Conforme | |
| C60 | `K/theme.ts:103-139` | Variable du thème dont la cible porte un segment de mode différent du mode UCM de la colonne | Carte Modes, cochée si un candidat | Correction décochée, car elle change une couleur affichée ; question visible sinon | E-20, E-22 |
| C82 `variable-absente` | `K/integrite.ts:115-150` | Rôle prévu par le thème absent d'une palette ou des variables globales ; correction seulement si chaque mode donne une cible unique et si l'écriture est choisie, sinon `raison` | Carte Variables manquantes, cochée ; sinon À faire ; menu Ignorer | Conforme | E-19 |
| C82 `cran-absent` | `K/integrite.ts:168-173` | Le cran attendu manque à la rampe | À faire | Conforme | |
| C82 `cran` | `K/integrite.ts:186-223` | La variable vise un autre cran que la table ; correction si le sens est établi, question si deux candidats | Carte Crans, décochée | Conforme | |
| C82 `mode-du-theme` | `K/integrite.ts:415-420` | `theme` sans mode light ou dark reconnu | À faire | Conforme | |
| C82 `couche` | `K/integrite.ts:429-434` | Alias de couleur vers une couche non admise | À faire | Conforme | |
| C82 `valeur-directe` | `K/integrite.ts:435-437` | Couleur directe hors de `primitives` et de `components` | À faire | Conforme | |
| C82 scopes de couche | `K/integrite.ts:439-447` | Couleur à scope dans une collection sans portée | Carte Scopes, cochée | Conforme | E-21 |
| C82 `type` | `K/integrite.ts:450-451` | Variable de `theme` reconnue qui n'est pas une couleur | À faire | Conforme | |
| C82 `mal-rangee` | `K/integrite.ts:453-457` | Variable de palette rangée hors de `theme` | À faire | Conforme | |

Une variable de `theme` dont le nom n'est aucun rôle UCM (`page/backgrond`) n'entre dans aucun de ces contrôles (`K/integrite.ts:257`, `K/structure.ts:127`). C'est l'écart E-19.

## 4. Mode Composant : contrôles du kit

`A/sandbox/analyse.ts:1590-1615` lance les familles. `controle-theme` et `controle-structure` ne tournent que dans un fichier déclaré UCM (l.1607). `proposerLesCorrections` remplace C15 par C22 et C17 par C24 (`K/corrections.ts:26-30`). Dans le panneau, une correction arrive cochée (`A/ui/corrections/index.ts:161,172`), une question n'est pas cochée, un constat sans correction va dans À faire, un constat `info` va dans Informations.

### 4.1 Axes et noms des tokens

Un axe se reconnaît par le nom de la propriété (`K/nommage.ts:21-28`) : `size`, `sizes`, `taille` pour la taille ; `palette`, `severity`, `intent`, `color` pour la palette ; `style`, `variant`, `appearance` pour le style ; l'axe d'états par `estLAxeDEtats`. Un token appartient au composant si son premier segment a la forme du nom du jeu (`K/nommage.ts:213-216`).

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C7 | `K/nommage.ts:238-252` | Valeur d'un axe qu'aucun token ne nomme, alors que d'autres tokens nomment cet axe | Variants, À faire | Conforme | E-27 |
| C8 | `K/nommage.ts:270-284` | Segment de famille couleur ou d'état écrit sous une forme tolérée (`Colors`, `Hovered`) | Tokens, À faire | Conforme | |
| C9 | `K/nommage.ts:286-291` | Segment d'axe dont la casse diffère de la valeur du variant, sans terme connu | Tokens, À faire | Conforme | |
| C10 | `K/nommage.ts:282-283` | Segment de taille écrit sous une forme tolérée | Tailles, À faire | Conforme | |
| C12, C13 | `K/nommage.ts:295-377` | Valeur de variant qu'aucun token ne couvre alors que les autres axes concordent ; C12 avec un seul candidat, C13 avec plusieurs | Question ; la réponse donne une correction `nom-de-valeur` | Conforme | E-35 |

### 4.2 Liaisons

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C16 | `K/mapping.ts:175-194` | Segment d'état du token différent de l'état du variant, et valeur de l'axe | Correction si un candidat ; question pour `default` vers `hover` ; sinon À faire | Correction décochée si elle change la couleur | E-34 |
| C22 (C15) | `K/mapping.ts:186`, `K/corrections.ts:26` | Idem pour palette, style ou taille | Idem | Idem | E-34 |
| C17, puis C24 | `K/mapping.ts:195-205` | Rôle du token (dernier segment) hors des rôles admis : `ring` pour un contour nommé ring ou focus, `border` ou `foreground` pour un contour, `foreground` ou `text` pour un texte, `icon` ou `foreground` pour une icône, `background` sinon | Correction si un candidat, sinon question | Idem | E-26, E-34 |
| C18 | `K/mapping.ts:212-217` | Scopes de la variable incompatibles avec le champ | À faire | Conforme | |
| C19 | `K/mapping.ts:206-211` | Token de `components` d'un autre composant | À faire | Conforme | |
| C20 | `K/couche.ts:69-81` | Cible des alias d'un token de `components` dans une couche non admise | À faire | Conforme | |
| C21 | `K/mapping.ts:102-152` | Même layer et même champ entre variants : une signature de cible majoritaire (au moins 2, plus de la moitié) et une liaison différente qui ne porte pas les valeurs de son variant | À faire | Conforme | E-41 |
| C24 propagation | `K/propagation.ts:152-189` | Liaison du variant modèle reprise dans un autre variant, segments d'axe remplacés ; layer homologue par chemin et rang | Correction ou question | Conforme | E-34 |
| C25 | `K/corrections.ts:124-139` | Peinture unie visible sans liaison, sur un layer TEXT nommé `title` seulement | Correction si un candidat, sinon question | Toute peinture unie visible en dur | E-25 |
| C59 | `K/theme.ts:19-68` | Texte lié à `surface/foreground` sans fond de surface parmi ses ancêtres | Correction si un candidat `page/foreground`, sinon question | Conforme, décochée | E-34, E-43 |
| C63 `vide` | `K/structure.ts:147-207` | Token de palette sans valeur dans un mode alors que 2 sœurs au moins en ont une | Question | Carte lisible | E-28 |
| C63 `theme` | `K/structure.ts:240-318` | Token de palette qui vise `brands` à segment de mode au lieu du thème | Correction `alias-de-mode` ou question | Carte lisible et écrite | E-28 |
| C80 | `K/couche.ts:66-70` | Couleur ou taille liée directement à une variable hors de `components`, hors pièce interne et wrapper | Couleurs ou Tailles, À faire | Conforme | |
| C81 | `K/propagation.ts:144-150` | Un variant lie des layers que d'autres variants gardent en dur | Carte modèle ; le bouton la remplace par des C24 | Conforme | |

### 4.3 Tailles

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C29 | `K/corrections.ts:153-179, 345-388` | Padding, gap, rayon ou épaisseur de contour non nuls et en dur, sur un layer visible hors instance imbriquée ; largeur et hauteur jamais | Correction si un token exact du composant ; question proche (écart au plus `min(2, 0,1 × max(|v|, 1))` px, non cochée) ; `recherche: incomplete` si `components` illisible ; sinon À faire | Conforme | E-30 |

### 4.4 Variants et couverture

`controlerOublis` ne juge que si tous les variants et layers sont lus (`K/oublis.ts:81-82`).

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C31 | `K/oublis.ts:93-119` | Combinaison des axes absente du jeu ; aucun constat au-delà de 4 096 combinaisons | Variants, À faire | Conforme, avec une information au-delà de la borne | E-44 |
| C32 | `K/oublis.ts:121-188` | Token du composant lié nulle part, ou sans variant qui porte ses segments ; `components` lue | Tokens, À faire | Conforme, sans faux positif sur liaison illisible | E-33 |
| C33 | `K/oublis.ts:190-222` | Variant qu'aucun token d'une famille ne couvre | Variants, À faire | Conforme | |

### 4.5 Typographie et icônes

Une icône est ici un layer nommé `icon` ou une instance pilotée (`K/typographie.ts:73-75`). Le régulier « attendu » demande au moins 2 autres variants unanimes.

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C64 | `K/typographie.ts:130-154` | Texte sans style ni variable de `typography`, ou style différent de celui des autres variants | Texte, À faire | Conforme | E-36 |
| C65 | `K/typographie.ts:158-182` | Taille ou graisse liée hors de `typography`, ou non liée alors que les autres variants la lient | Texte, À faire | Conforme | |
| C66 | `K/typographie.ts:199-230` | Icône qui n'est pas une instance de library, taille ou couleur sans variable, taille hors `layout/…/icon`, couleur hors `icon`/`foreground` du thème | Texte, À faire | Conforme | E-26 |
| C67 | `K/typographie.ts:236-256` | Instance pilotée par une propriété absente du jeu ; sinon limite d'information | Règles, À faire ou Informations | Conforme | |

### 4.6 Accessibilité

Les variants à l'état `disabled` sont exclus (C53, information). Les mesures s'arrêtent à 5 000 combinaisons de variants et de modes (`K/accessibilite.ts:23`).

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C49 contraste | `K/accessibilite.ts:588-705` | Plage de texte, ou VECTOR et BOOLEAN_OPERATION remplis, sous le seuil WCAG (4,5 ou 7 ; 3 ou 4,5 en grand texte ; 3 pour une icône) dans une combinaison ; fond composé des ancêtres, sinon page et carte du thème, sinon page Figma | Accessibilité, À faire ; « corriger » si la garantie du thème couvre ce fond, sinon « vérifier » | Conforme | E-26 |
| C49 texte sous 12 px | `K/accessibilite.ts:833-858` | Plage de texte visible sous 12 px | À faire | Conforme | |
| C49, C50 limites | `K/accessibilite.ts:656-681` | Dégradé, image, peinture superposée, mode illisible, couleur absente, fond de repli | Informations | Conforme | |
| C50 contour | `K/accessibilite.ts:612-617` | Contour visible d'épaisseur non nulle sous 3:1 | À faire | Conforme | |
| C50 sans anneau | `K/accessibilite.ts:751-780` | Variant en `focus` sans layer nommé `ring` ou `focus-ring` visible | À faire | Conforme | |
| C51 | `K/accessibilite.ts:781-801` | Anneau d'épaisseur différente de la recommandation (2 px) | À faire | Conforme | |
| C52 | `K/accessibilite.ts:807-831` | Composant interactif (axe d'états avec un état autre que default et disabled) dont la racine mesure moins de 24 px (corriger) ou moins de 44 px (vérifier) | À faire | Conforme | E-40 |

### 4.7 Règles d'usage (Architect)

Les règles ne se lisent que si le moteur a couvert tout le composant (`A/sandbox/analyse.ts:2080`).

| Constat | Source | Conditions | Affichage | Attendu | Écart |
|---|---|---|---|---|---|
| C43 | `A/regles.ts:104-125` | Composant sans instance de règles | Correction `regles/creer` | Conforme | E-30 |
| C45 | `A/regles.ts:126-148` | Propriété ou valeur sans règle `@prop`/`@boolean` (correction `ajouter`) ; règle sans propriété (À faire) | Règles | Conforme | |

### 4.8 Constats du moteur de l'exporteur

`A/constatsDuMoteur.ts:32-47` traduit chaque point du moteur par la première règle qui lui correspond. Aucun n'a de correction ; tous vont dans À faire et sont ignorables.

| Constat | Règle de traduction | Élément | Écart |
|---|---|---|---|
| C41 | Famille `variables`, « variable introuvable » ; bloquant | Couleurs | E-29 |
| C30 | Autre point de la famille `variables` | Couleurs | E-29, E-30 |
| C35 | `disposition` « masqué », ou `proprietes` « pilote » | Variants | |
| C34 | Autre point `proprietes` | Variants | E-37 |
| C42 | `non-exportes`, et tout point sans règle ; bloquant si `danger` | Tokens | |
| C44 | Famille `regles` | Règles | E-30 |

## 5. Filtres et états de l'analyse

| Filtre ou état | Source | Effet |
|---|---|---|
| Ignorés | `A/sandbox/analyse.ts:2056-2063, 2099` | Retirés de la liste visible ; une proposition ignorée laisse le constat sans correction |
| Budget de 2 000 layers | `A/releveDuComposant.ts:599-640` | Variants non lus, analyse partielle |
| Lecture manquée d'un champ | `K/corrections.ts:161`, `K/accessibilite.ts:817` | Aucun constat C29 ni C52 sur ce champ |
| Moteur partiel | `A/sandbox/analyse.ts:2080, 2107` | Statut partiel, pas de C43 ni C45 |
| Périmée | `A/ui/analyse/index.ts:327-330` | Liste remplacée par une note |
| Hors UCM | `A/sandbox/analyse.ts:1607`, `A/ui/analyse/index.ts:375` | Familles thème et structure sautées |
| Library à choisir | `A/ui/composant/analyse.ts:236` | Analyser désactivé tant qu'une library n'est pas choisie |
| Provisoire | `A/sandbox/analyse.ts:2061` | Constats du kit sans correction tant que le moteur n'a pas fini |
| Occupé | `A/sandbox/analyse.ts:1722-1725` | Seconde demande refusée |

## 6. Écarts relevés

### 6.1 Nomenclature

| Id | Classe | Écart | Source |
|---|---|---|---|
| E-01 | Trop strict | Une faute ne sort que si la référence apparaît dans 5 noms au moins : `backgrond` passe | `R/questions.ts:266` |
| E-02 | Trop strict | Une faute présente dans 3 noms ou plus n'est plus vue comme une faute | `R/questions.ts:278` |
| E-03 | Trop strict | L'échange de deux lettres voisines (`bordre`) n'est pas une faute pour la question ; il ne sert qu'au découpage | `R/questions.ts:288`, `R/termes-connus.ts:42` |
| E-04 | Trop strict | Les termes de `REGISTRES_COMPOSANTS` (`padding`, `width`, `height`) ne sont pas des termes connus : `paddng` passe | `R/termes-connus.ts:18-24` |
| E-05 | À trancher | Une faute exige une place partagée (même collection, même rang, même voisin) : une faute isolée dans une autre collection, à un autre rang, ou dans un nom d'un seul segment passe | `R/questions.ts:29-61, 288` |
| E-06 | Bug | Quand la meilleure référence n'est pas un terme connu, aucune autre référence n'est essayée | `R/questions.ts:289-294` |
| E-07 | Bug | Le test du seuil de faute passe dans tous les cas : `cat` n'est pas un terme connu, donc aucune faute n'existe ; aucun test ne borne 4/5 noms ni 2/3 noms | `kit/tests/questionsReferentiel.test.ts:215-223` |
| E-08 | À trancher | Une forme tolérée se renomme sans question ; quand son parent porte déjà le terme UCM, le renommage est retiré pour collision et ne se voit que sous « Bloqués » | `R/vocabulaire-du-fichier.ts:77-94`, `R/lexique.ts:227-285` |
| E-09 | Bug | `separator-thin` ne donne ni renommage (bloc gardé entier) ni question (mot couvert) | `R/ecriture-des-mots.ts:80-91`, `R/questions.ts:163` |
| E-10 | Trop strict | Le pluriel d'une forme tolérée (`separators`) ne donne rien | `R/questions.ts:212` |
| E-11 | Trop strict | Les synonymes se limitent à 9 groupes en dur ; `divider`/`separator`, `background`/`surface`/`canvas` n'y sont pas | `R/vocabulaire.ts:40-50` |
| E-12 | À trancher | Toute paire `x` / `x+s` (`succes`/`success`) sort, sans dictionnaire ; une paire réelle de mots distincts aussi | `R/questions.ts:223-224` |
| E-13 | À trancher | Un mot collé présent dans un seul nom a le score 1 et finit dans « Autres pistes » | `R/questions.ts:300-310, 321` |
| E-14 | À trancher | Au-delà de 10 questions, le reste tombe dans « Autres pistes », sans action | `A/nomenclature/session.ts:288`, `R/questions.ts:321-330` |
| E-15 | Bug | `proposee` d'une question de collection et `cibleAlias` d'une paire ne sont jamais produits : leurs textes à l'écran sont morts | `R/questions.ts:258, 319`, `A/ui/nomenclature/questions.ts:87, 131` |
| E-16 | Assumé | `normaliserLesNoms` et `detecterLesConventions` ne servent plus qu'aux tests | `R/normalisation.ts:90, 134` |
| E-17 | À trancher | La convention d'écriture du fichier est la pluralité, sans minimum ; une égalité se tranche par l'ordre des clés | `R/ecriture-des-mots.ts:140-146` |
| E-18 | Bug | Le code nomme les onglets « À appliquer » et « À trancher », l'écran « Corrections » et « Questions » | `A/ui/textes/nomenclature.ts:47-48` |

### 6.2 Structure du mode Tokens

| Id | Classe | Écart | Source |
|---|---|---|---|
| E-19 | Trop strict | Une variable de `theme` qui n'est aucun rôle UCM (`page/backgrond`) n'entre dans aucun contrôle de structure | `K/integrite.ts:257`, `K/structure.ts:127` |
| E-20 | Bug | Un C60 sans correction n'a pas de genre déclaré : `lireLesConstats` le saute, il n'apparaît nulle part | `A/ui/structure/lecture.ts:80-86, 279` |
| E-21 | Bug | C82 `scopes` n'est pas dans `GENRES_DECLARES` : une proposition ignorée le fait disparaître | `A/ui/structure/lecture.ts:52-55` |
| E-22 | Bug | La correction C60 arrive cochée alors qu'elle change une couleur affichée ; seuls les crans C82 arrivent décochés | `A/ui/structure/corrections.ts:337` |
| E-23 | Bug | Une lecture qui échoue envoie des listes vides, et l'onglet dit qu'il n'y a rien à faire ; un échec des réglages fait réapparaître les ignorés et retire l'écriture de C82 | `A/sandbox/structure.ts:98-101`, `A/ui/structure/aFaire.ts:204` |
| E-24 | Trop strict | Après une écriture, seuls `deja-la` et `existe-divergente` ont un texte ; les autres motifs ne disent que « N sautée(s) » | `A/ui/textes/structure.ts:130-133` |

### 6.3 Mode Composant

| Id | Classe | Écart | Source |
|---|---|---|---|
| E-25 | À trancher | C25 ne juge qu'un TEXT nommé `title` : une couleur en dur sur un autre layer n'a aucun constat du kit | `K/corrections.ts:129` |
| E-26 | Bug | Trois définitions d'icône : nom contenant `icon` ou instance pilotée (C66), VECTOR et BOOLEAN_OPERATION (C49), les deux plus le nom (C17) ; `/icon/i` reconnaît aussi `Silicone` ou `Lexicon` | `K/typographie.ts:73`, `K/accessibilite.ts:192`, `K/mapping.ts:33` |
| E-27 | Trop strict | Les noms d'axes se limitent à des listes en dur : `type`, `kind`, `tone`, `emphasis`, `hierarchy` ne sont pas reconnus, et C7 à C16 se taisent | `K/nommage.ts:21-28` |
| E-28 | Bug | C63 `vide` et `theme` en mode Composant n'ont pas de genre : la carte dit « Constat C63. », la question parle d'un layer absent, la correction `alias-de-mode` est comptée mais jamais écrite | `A/ui/ignores/modele.ts:467-499`, `A/ui/corrections/index.ts:156` |
| E-29 | Bug | C30 et C41 vont toujours dans Couleurs, même pour un padding | `A/constatsDuMoteur.ts:32-40` |
| E-30 | Bug | Doublons kit et moteur sans dédoublonnage : C43 et C44 pour la même instance absente, C25 ou C29 et C30 pour la même valeur en dur | `S/contract/extractRules.ts:496`, `A/tests/analyse.test.ts:169` |
| E-31 | Bug | Le statut final ignore les lectures refusées (règles, niveau, ignorés, dépendances) : « Aucun constat » peut s'afficher sans que C43 et C45 aient été jugés ; le niveau AA s'applique sans le dire | `A/sandbox/analyse.ts:2107` |
| E-32 | Bug | Moteur partiel avec relevé complet : la bannière dit « N variants lus sur N » | `A/ui/analyse/index.ts:424-428` |
| E-33 | Bug | C32 ne tient pas compte des liaisons illisibles et peut accuser un token lié | `K/oublis.ts:81-84` |
| E-34 | À trancher | C16, C22, C24, C25 et C59 changent la couleur d'un layer et arrivent cochés | `A/ui/corrections/index.ts:161, 172` |
| E-35 | À trancher | Les cartes de question n'ont ni Ignorer ni « Ne plus proposer », que le sandbox accepte | `A/ui/questions/` |
| E-36 | Bug | Le texte de C64 `sans-style-ni-variables` parle du style des autres variants, que ce motif ne compare pas | `A/ui/textes/ignores.ts:199` |
| E-37 | Bug | C34 reçoit tout point `proprietes` du moteur, « aucun variant » compris | `A/constatsDuMoteur.ts:37` |
| E-38 | Bug | SPEC.md dit que le panneau périmé garde ses constats ; l'écran les remplace par une note | `plugin-architect/SPEC.md:188`, `A/ui/analyse/index.ts:327-330` |
| E-39 | Bug | Une demande refusée pour `occupe` ne dit rien au designer | `A/ui/composant/analyse.ts:172-174` |
| E-40 | Assumé | C52 mesure la racine seule et suppose interactif tout composant à axe d'états ; C29 ne juge jamais largeur ni hauteur | `K/accessibilite.ts:807-831`, `K/corrections.ts:141-145` |
| E-41 | Assumé | C21 demande une majorité stricte d'au moins 2 liaisons | `K/mapping.ts:133` |
| E-42 | Assumé | Une liaison directe à `theme` ou `layout` donne C80 seul, sans C20 | `K/couche.ts:66-70` |
| E-43 | À trancher | C59 ne juge que `surface/foreground` ; aucun contrôle d'un premier plan de page posé sur une surface, ni d'un premier plan de bouton | `K/theme.ts:34` |
| E-44 | Trop strict | Au-delà de 4 096 combinaisons d'axes, C31 rend une liste vide sans information | `K/oublis.ts:52` |
| E-45 | Assumé | Les branches parallèles ignorent les clés de plus de 12 branches sœurs, donc une palette de plus de 12 nuances | `R/branches-paralleles.ts:74` |

## 7. Familles pour les plans de stress test

| Famille | Contrôles | Générateur | Oracle |
|---|---|---|---|
| F1 Noms | Questions et renommages de 2.2 et 2.3 | Mutations des noms de la nomenclature du kit et des design systems : lettre ajoutée, retirée, remplacée, échangée ; synonyme ; forme tolérée ; pluriel ; casse ; séparateur ; mot collé ; position, fréquence, collection | Décisions D1 à D3 ; aucun constat sur les noms justes des design systems |
| F2 Structure Tokens | Section 3 | Thèmes UCM complets puis dégradés : rôle retiré, cran déplacé, mode renommé, scope changé, alias supprimé, couche croisée | Table du thème du kit |
| F3 Liaisons | C16 à C25, C59, C80, C81 | Composants fabriqués : axes, rôles et couches permutés | Règles de 4.2 |
| F4 Tailles | C29 | Valeurs en dur autour des tokens : exactes, à 0,1 près, à la borne de l'écart | Règle de proximité de SPEC.md |
| F5 Variants | C7 à C13, C31 à C33 | Matrices d'axes trouées, valeurs renommées, tokens orphelins | Règles de 4.1 et 4.4 |
| F6 Typographie et icônes | C64 à C67 | Variants unanimes ou non, icônes de chaque définition | Règles de 4.5 |
| F7 Accessibilité | C49 à C53 | Paires de couleurs autour des seuils, fonds translucides, modes multiples | WCAG 2 sans arrondi |
| F8 Règles d'usage et moteur | C43, C45, C30 à C44 | Instances de règles absentes, partielles, en trop | Règles de 4.7 et 4.8 |
| F9 Lecture et états | Section 5 | Lectures refusées, budget dépassé, péremption, hors UCM | Une analyse incomplète ne conclut jamais « aucun constat » |

Ce qui touche Figma (lecture des nœuds, écriture, sélection) reste hors des générateurs. Chaque plan en rend une liste de recette.

Cadre commun aux plans :

- le code des harnais vit sous `packages/kit/tests/stress/` (hors de `npm test`, qui ne lit que le premier niveau de `tests/`, et hors du contenu publiable que garde `tests/versionSuitLeContenu.test.mjs`), lancé par un script de la racine, un dossier par famille (`f1-noms/`, `f2-structure/`…) et `commun/` pour le tirage, les types et la comparaison ; la partie qui appelle le sandbox ou l'interface vit sous `packages/plugin-architect/scripts/stress/<famille>/` ;
- les rapports et toute sortie tirée du fichier Slice vont sous `_local/stress/<famille>/`, ignoré par Git ;
- les résultats de toutes les familles se résument dans `MESURE-DES-FAILLES.md`, dans ce dossier ;
- les tests de régression entrent dans `npm test` avec `{ todo: '<écart>' }` tant que la correction manque.

Version allégée, retenue par le mainteneur après la mesure de F1 et de F3-F4. Les familles F2, F5-F6, F7 et F8-F9 se construisent en un ou deux lots chacune, et non avec tous les lots de leur plan :

- chaque famille garde ses opérateurs simples, ses faux positifs, les interactions déclarées de son plan et deux relations métamorphiques (ordre mélangé, casse changée), puis rend sa mesure ;
- la chaîne jusqu'à l'écran se mesure pour F2 et F8-F9, et pour F3-F4 au lot 6 ;
- les combinaisons tirées au hasard sont retirées ;
- les tests de régression s'écrivent avec les corrections ;
- le rejeu des fichiers réels (Slice, captures des composants, Intencial Tokens) remplace les combinaisons comme test de défauts mêlés.

| Plan | Famille |
|---|---|
| [PLAN-STRESS-F1-NOMS.md](./PLAN-STRESS-F1-NOMS.md) | F1 |
| [PLAN-STRESS-F2-STRUCTURE.md](./PLAN-STRESS-F2-STRUCTURE.md) | F2 |
| [PLAN-STRESS-F3-F4-COMPOSANT.md](./PLAN-STRESS-F3-F4-COMPOSANT.md) | F3, F4 |
| [PLAN-STRESS-F5-F6-VARIANTS-TYPO.md](./PLAN-STRESS-F5-F6-VARIANTS-TYPO.md) | F5, F6 |
| [PLAN-STRESS-F7-ACCESSIBILITE.md](./PLAN-STRESS-F7-ACCESSIBILITE.md) | F7 |
| [PLAN-STRESS-F8-F9-ANALYSE.md](./PLAN-STRESS-F8-F9-ANALYSE.md) | F8, F9 |

## 8. Réponses du mainteneur (V1)

| Id | Question | Réponse | Écarts tranchés |
|---|---|---|---|
| Q-01 | `separator` avait-il pour voisin un `divider` du même parent ? | Oui. La collision explique le silence du cas rejoué | E-08 |
| Q-02 | Forme tolérée : renommage ou question ? | Renommage dans Corrections ; une question quand le renommage est bloqué | E-08, E-09, E-10 |
| Q-03 | Une correction qui change une couleur arrive-t-elle décochée ? | Toute correction arrive décochée, dans les deux modes. Chaque section reçoit « Tout cocher » et « Tout décocher », et le panneau les mêmes boutons pour toutes les sections | E-22, E-34 |
| Q-04 | Au-delà de 10 questions ? | 10 questions, et « Autres pistes » devient dépliable | E-14 |
| Q-05 | Une faute hors de la place partagée ? | Partout, dès qu'un mot est à une lettre d'un terme UCM connu | E-05 |
| Q-06 | C25 au-delà du texte `title` ? | Toute peinture unie visible sans token | E-25 |
| Q-07 | Variable de `theme` qui n'est aucun rôle UCM ? | Une question vers le rôle le plus proche | E-19 |
| Q-08 | D'autres noms d'axes ? | Oui, liste tirée des design systems relevés | E-27 |
| Q-09 | Doublon du kit et du moteur ? | Garder le constat du kit, qui porte la correction | E-30 |
| Q-10 | Dictionnaire pour les pluriels et terminaisons ? | Oui, tiré des design systems | E-12 |
| Q-11 | Ignorer et « Ne plus proposer » sur les cartes de question ? | Oui, les deux | E-35 |

Display P3 est hors périmètre de la fiabilisation : les harnais ne testent que des documents sRGB.

Piste ouverte par Q-03, hors de ce plan : refondre le mode Tokens sur le modèle du mode Composant, avec des sections repliables titrées et signées d'une icône, et des filtres au lieu des onglets. Elle demande une étude et une maquette avant toute décision.
