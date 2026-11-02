# Plan de stress test F8 et F9, règles d'usage, moteur et états de l'analyse

Ce plan décrit le harnais qui mesure les règles d'usage (C43, C45), la traduction des points du moteur de l'exporteur (C30, C34, C35, C41, C42, C44) et les états de l'analyse du mode Composant sur 1 409 cas fabriqués, depuis la lecture de Figma jusqu'à la phrase affichée au designer. Il ne corrige aucun code : il produit la mesure de l'existant, puis des tests de régression en attente des corrections. Il prolonge les familles F8 (Règles d'usage et moteur) et F9 (Lecture et états) de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md) (sections 4.7, 4.8, 5, 6.3, 7 et 8). Les deux familles partagent un injecteur de pannes sur le sandbox, donc un seul plan. La forme suit [PLAN-STRESS-F2-STRUCTURE.md](./PLAN-STRESS-F2-STRUCTURE.md), et le plan réutilise le générateur de composant et la chaîne sandbox et écran de [PLAN-STRESS-F3-F4-COMPOSANT.md](./PLAN-STRESS-F3-F4-COMPOSANT.md).

## 1. Portée

| Contrôle ou état | Source | Ce que le plan mesure |
|---|---|---|
| C43, C45 | `packages/plugin-architect/src/regles.ts` (`constatsDeRegles`, `lireLesRegles`, `retenirLesModeles`) | instance de règles absente, propriété, valeur ou règle en trop |
| Scan des règles | `packages/plugin-socle/src/composant/contract/extractRules.ts` | quelle instance de la page compte pour quel composant |
| Écriture des règles | `src/ecriture/regles.ts`, `src/ecriture/liaisons.ts` (`ecrireLeLot`), `src/sandbox/corrections.ts` (`resumeDuLot`) | `creer`, `ajouter`, `retirer` refusé, sauts `objet-change`, `instance-remplie`, `erreur`, `non-ucm` |
| Points du moteur | `src/constatsDuMoteur.ts` | code, type, famille, identifiant, nœuds, doublons avec le kit |
| Rangement | `src/ui/panneau/elements.ts` | élément du panneau de C30, C41, C34 |
| Assemblage | `src/sandbox/analyse.ts` (statut final, lectures refusées, provisoire, péremption, `occupe`, annulation, prélecture) | ordre, fusion, états |
| Relevé et budget | `src/releveDuComposant.ts`, `packages/plugin-socle/src/composant/contract/budget.ts` | 2 000 layers, variants non lus, lectures manquées |
| Prélecture | `src/sandbox/prelecture.ts` | départ, annulation, promotion, adoption par un clic |
| Ignorés | `src/ecriture/ignores.ts`, `src/sandbox/ignores.ts` | lecture, séparation, restauration |
| Écran | `src/ui/analyse/index.ts`, `src/ui/composant/analyse.ts`, `src/ui/barre.ts`, `src/ui/ignores/modele.ts` | un écran par état, bannière partielle, « Aucun constat » |

Hors plan. Les corrections du code (E-28 à E-39 compris), les contrôles du kit des familles F3 à F7 (ils servent de bruit pour P1), le mode Tokens, la Nomenclature, la migration d'un fichier Figma et `test:ui`. Le plan F3-F4 garde ses cas D4 (4 doublons C25 ou C29 avec C30) et D6 (5 états) ; F8 et F9 reprennent la même question à plus grande échelle et ne les rejouent pas.

## 2. Oracle

### 2.1 Principe

L'oracle est écrit à partir des opérateurs de dégradation, de l'inventaire (4.7, 4.8, 5), de la SPEC d'Architect (« Analyse et corrections » et la ligne « Panneau des constats » de « Vue composant ») et des réponses Q-03, Q-09 et Q-11. Il ne rejoue jamais le code mesuré. Chaque opérateur déclare ce qu'il casse et ce que le plugin doit dire.

Chaque cas porte un verdict.

| Verdict | Sens |
|---|---|
| `attendu` | La règle est écrite (inventaire, SPEC, réponse Q). Un écart est un défaut. |
| `mesure` | La règle dépend d'une réponse du mainteneur (section 9). Le rapport compte l'écart à part et ne le qualifie pas. |

La règle principale de F9 tient en une phrase : une analyse qui n'a pas tout jugé ne dit jamais « aucun constat » et dit ce qui manque. Le harnais déduit ce qui a été jugé des pannes qu'il a injectées, jamais du statut que le plugin rend.

### 2.2 Correction exacte

Une correction de règles est exacte quand les trois conditions tiennent. La règle à poser vient du modèle du socle (`@usage`, `@prop`, `@boolean`, `@icons`, jamais `@default`, `@do`, `@dont` ni `@pairs`). Au moins une règle manque réellement. L'instance cible existe sur la page du composant (`ajouter`) ou n'existe pas (`creer`). Elle arrive décochée (Q-03). Un constat `sans-propriete` n'a jamais de correction, et un constat dont aucune règle ne peut être posée n'en a pas non plus. Les points du moteur n'ont aucune correction.

### 2.3 Propriétés

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P1 | Les 48 profils de règles de la section 3.2 ne produisent ni C43 ni C45. | C43, C45 |
| P2 | Chaque dégradation fait émettre les constats que son opérateur déclare, avec le code, `faits.ecart`, la propriété et les valeurs attendus (colonne « manqués »). | C43, C45 |
| P3 | Aucun C43 ni C45 n'est émis hors de ceux que l'opérateur déclare (colonne « faux constats »). | C43, C45 |
| P4 | Une correction est émise si et seulement si l'oracle la juge exacte. Un `sans-regle` dont toutes les règles sont déjà posées n'existe pas. | règle produit |
| P5 | Le modèle retenu pour chaque correction (`modelesDeLAnalyse`) contient exactement les cibles manquantes de la propriété, dans l'ordre du modèle, et aucune autre. | C43, C45 |
| P6 | Appliquer les corrections au double d'écriture, puis relire, donne zéro C43 et zéro C45 `sans-regle` ou `sans-valeur`. Un second passage ne pose rien. Une règle marquée « [À compléter] » compte comme présente et reste signalée par C44. | SPEC « Analyse et corrections » |
| P7 | Toute ligne que l'écran propose de cocher est écrite par `ecrireLeLot` sur un double de Figma, ou sautée avec un motif que l'écran dit. Les `ajouter` d'un composant s'écrivent en un appel. Le lot pose un point d'annulation. `retirer` est refusé. Hors UCM, tout saute en `non-ucm`. | `ecriture/regles.ts` |
| P8 | Chaque phrase distincte du moteur donne un constat. Le code vient de la famille et du sens du point, jamais d'un mot du nom d'un calque. Seuls C41 et la sévérité `danger` rendent un constat bloquant. | 4.8, E-37 |
| P9 | L'identifiant d'un constat du moteur ne dépend pas de l'ordre des phrases. Il est unique dans l'analyse. Ignorer un identifiant ne masque aucun autre point. | `constatsDuMoteur.ts` |
| P10 | C30 et C41 se rangent dans l'élément de la propriété que le point nomme (marges, espacement et rayon en tailles, style de texte en texte, remplissage et contour en couleurs). Chaque constat visible apparaît une fois. | E-29 |
| P11 | Un écart que le kit et le moteur signalent tous deux donne une seule carte, celle du kit (Q-09). Une clé (layer, champ) différente, ou un point sans équivalent du kit, garde son constat. | E-30, Q-09 |
| P12 | Les cartes de C43, C45, C44 et du moteur ont une phrase, un statut et un lieu lisibles, sans la phrase de repli `T.sansPhrase`. Les corrections arrivent décochées, avec « Tout cocher » et « Tout décocher ». Ignorer, « Ne plus proposer » et « Ne plus ignorer » existent là où une proposition existe. | Q-03, Q-11 |
| P13 | Règle principale. Une analyse dont une part n'a pas été jugée (lecture refusée, relevé incomplet, moteur partiel, catalogue de repli ou inaccessible, déclaration illisible) ne montre jamais « Aucun constat », et son écran nomme ce qui manque. | SPEC, E-31 |
| P14 | Le statut final suit la table de vérité de la section 2.5 : `complete` seulement quand chaque part est jugée, `partielle` sinon. `annulee` et `arretee` ne portent aucun constat de contrôle. | E-31 |
| P15 | La bannière d'une analyse partielle donne les nombres réellement lus et la cause (budget, lectures échouées, moteur, règles). Elle ne dit jamais « N variants lus sur N ». | E-32 |
| P16 | Le relevé garde le variant de référence puis des variants entiers dont la somme est de 2 000 layers au plus. Le moteur coupe au même variant. `layersNonLus` est la somme exacte des layers laissés, ou `inconnu` quand un compte échoue, et la bannière le dit. | budget |
| P17 | Aucun contrôle n'accuse ce qui n'a pas été lu : C31, C32 et C33 se taisent sur un relevé coupé, C29 et C52 sur un champ manqué, C21 sur une fratrie dont des variants manquent. | SPEC, F3-F4 P18 |
| P18 | Une annulation, levée à n'importe quelle frontière de phase, rend un message `annulee` sans constat, ne retient ni correction, ni modèle, ni entrée de session, libère la place, et la demande suivante est servie. | SPEC |
| P19 | Une lecture qui lève rend `arretee` une seule fois, avec un constat bloquant lisible. Une identité ne reçoit jamais deux messages `analyse`. | SPEC |
| P20 | Un seul provisoire par analyse, avant le final, avec les mêmes identifiants. Aucune action d'écriture n'est permise tant que le final manque. | SPEC |
| P21 | Un événement du document dans l'inventaire, une écriture du plugin ou un autre jeu sélectionné périme l'analyse une fois, avec sa cause. Un final tardif est refusé. Hors inventaire, rien ne change. Le panneau garde ses constats, sans case active, avec une note (SPEC). | E-38 |
| P22 | Toute demande refusée pour `occupe` donne un retour visible au designer et ne change rien à l'état de l'opération en cours, écriture comprise. Une analyse périmée est annulée et la demande est servie. Une prélecture discrète est prise ou arrêtée. | E-39 |
| P23 | Une prélecture ne parle jamais à l'interface, ne répond jamais `occupe`, s'arrête à chaque événement et à chaque écriture. Promue, elle donne les mêmes constats qu'une analyse froide. | SPEC |
| P24 | Un message d'une autre identité est ignoré. Les générations croissent. Une annulation qui vise une identité périmée est sans effet. | SPEC |
| P25 | Hors UCM, le sandbox saute les familles thème et structure, le panneau ne montre que l'alerte, l'écriture saute en `non-ucm`. Une déclaration illisible est dite, pas prise pour « libre ». | inventaire, section 5 |
| P26 | « Library à choisir » désactive Analyser et la prélecture. Un repli sur le catalogue du fichier, parce que la library ne se lit pas, est dit. | inventaire, section 5 |
| P27 | Les ignorés se lisent, se séparent et se restaurent. Quand tous les constats sont ignorés, l'écran garde le moyen de les restaurer. Une lecture refusée est dite. | inventaire, section 5 |
| P28 | Aucune exception ne sort de `traiterAvec`. À la fin de chaque cas, la place d'opération est libre et l'état du sandbox, remis à zéro, ne fuit pas vers le cas suivant. | robustesse |

### 2.4 Colonnes du rapport

| Colonne | Définition |
|---|---|
| Attendus | Constats ou états que l'oracle déclare pour les cas de l'opérateur. |
| Détectés | Attendus que le plugin émet avec le bon code, la bonne propriété, le bon statut. |
| Manqués | Attendus que le plugin n'émet pas (P2, P14). |
| Faux constats | Constats émis que l'oracle ne déclare pas (P3, P8). |
| Corrections inexactes | Corrections émises à tort, ou qui ne convergent pas (P4 à P6). |
| Non affichés | Constats sans trace à l'écran, ou affichés deux fois (P10, P11). |
| Conclusions fausses | Écrans qui disent « Aucun constat », « complet » ou « tenu » sans avoir tout jugé (P13, P15). |
| Messages muets | Refus, pannes ou états sans message pour le designer (P22, P25, P26, P27). |
| Fuites d'état | Place non libérée, retenue d'une analyse inachevée, message en double (P18, P19, P28). |
| Cochées | Corrections cochées à l'affichage, boutons manquants (P12). |
| Non écrites | Lignes cochables que l'écriture saute sans motif lisible (P7). |
| En attente | Écarts sur des cas `mesure`, comptés à part. |

### 2.5 Table de vérité du statut et priorité des écrans

Le statut attendu se déduit de huit parts. Une part non jugée rend `partielle`.

| Part | Non jugée quand | Verdict |
|---|---|---|
| Relevé | `variantsNonLus`, `layersNonLus` non nul ou `manquees` non vide | `attendu` |
| Catalogue | collection ou variable `inaccessible`, ou repli sur le fichier faute de library lisible | `attendu` |
| Moteur | `couverture.etat` `partielle` | `attendu` |
| Règles | lecture des règles refusée | `attendu` |
| Niveau | lecture du niveau refusée (AA appliqué par défaut) | `attendu` |
| Ignorés | lecture des ignorés refusée | `attendu` |
| Déclaration UCM | lecture de la déclaration refusée | `attendu` |
| Dépendances | lecture refusée, ce qui interdit seulement la reprise d'une entrée | `mesure` (Q-F89-3) |

Quand plusieurs états se superposent, l'écran suit l'ordre suivant : arrêtée, annulée, périmée, partielle, complète. L'ordre est un choix du plan (Q-F89-14).

## 3. Générateur

### 3.1 Bases

Le générateur fabrique deux bases. Aucune n'écrit dans Figma.

| Base | Contenu |
|---|---|
| Règles (F8) | Un `ReleveDesRegles` et une page de règles fabriquée sur le modèle de `tests/outils/mondeFabrique.ts` (le fichier n'est pas modifié) : le composant, une instance de `.componentRules` dont le calque de nom écrit le composant, une instance par règle `@usage`, `@prop`, `@boolean`, `@icons` avec cible et contenu. La page sert au scan `extractRules` ; le `ReleveDesRegles` sert aux fonctions pures. |
| Analyse (F9) | Un jeu de `Lecteurs` doubles : sujet, relevé et catalogue tirés du `composantDeBase` de F3-F4 (profil P0 réduit), moteur double sans point et à couverture complète, règles conformes, ignorés vides, niveau AA, dépendances fixes, bibliothèques lues. Un `Contexte` capte les messages, comme `tests/analyse.test.ts`. |

Le corpus de points du moteur (F8) est écrit à la main dans `corpusDuMoteur.ts` : 40 gabarits de `PointACorriger` recopiés des sites `pointDe` du socle, rangés par famille. Un contrôle de couverture compte les sites `famille:` de `packages/plugin-socle/src/composant/` et échoue si un site n'a aucun gabarit.

Les noms s'écrivent avec `assembler` et `decouperSegment` du kit. Les identifiants de nœud suivent le motif de Figma (`12:34`).

### 3.2 Profils de base

**F8, profils de règles**

| Dimension | Valeurs | Nombre |
|---|---|---|
| Forme du jeu | `alert-11` (Severity, Variant, booléenne Dismissible), `button-36` (Palette, Style, State, Size, booléennes Has Icon et Loading), `switch-4` (State, booléenne Checked), `divider-1` (aucune propriété), `badge-9` (Type, Tone), `tile-link` (Size et Orientation du wrapper de dimensions, booléenne Show Icon) | 6 |
| Règles | rédigées, ou toutes marquées « [À compléter] » | 2 |
| Écriture des cibles | exacte, ou compactée par le designer (casse et espaces différents) | 2 |
| Composants sur la page | un, ou trois (dont un voisin au nom proche, `Button Group`) | 2 |

Le produit donne 48 profils (r01 à r48). Les opérateurs de la section 3.3 s'appliquent à un profil de référence, R0 : `button-36`, règles rédigées, cibles exactes, un composant. R0 fait partie des 48. Les combinaisons de la section 3.4 tournent sur 3 profils : R0, `tile-link` aux règles marquées (r42) et un profil tiré de la graine.

**F9, profils d'analyse**

| Dimension | Valeurs | Nombre |
|---|---|---|
| Forme du jeu | `alert-11`, `button-36`, `button-216`, `divider-1` | 4 |
| Architecture | `ucm`, `libre`, `absente` | 3 |
| Niveau rangé | AA, AAA | 2 |
| Libraries | aucune, une seule lue, plusieurs candidates sans choix | 3 |

Le produit donne 72 profils (a01 à a72). Les opérateurs s'appliquent à un profil de référence, A0 : `button-36`, architecture `ucm`, niveau AA, une library lue, dépendances présentes. A0 fait partie des 72. Les combinaisons tournent sur A0, `button-216` en AAA (a55) et un profil tiré de la graine.

### 3.3 Opérateurs de dégradation F8

Le verdict est `attendu` sauf mention contraire. « Corr. » dit si l'oracle attend une correction exacte.

**Instance absente ou mal reconnue (C43)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| G1 | Aucune instance de règles sur la page, une fois par forme du jeu. | 6 | C43 avec le nombre de règles du modèle (`divider-1` : `@usage` et `@icons`) | oui, `creer` |
| G2 | Instance présente mais lue autrement. 1 sur une autre page (`mesure`, Q-F89-5). 2 qui écrit le nom d'un autre composant. 3 au calque de nom vide (`mesure`, Q-F89-6). 4 au calque de nom resté « [À compléter] » (`mesure`, Q-F89-6). 5 nom en casse différente. 6 nom aux espaces en trop. 7 nom avec tiret (`mesure`, Q-F89-1). 8 nom avec souligné (`mesure`, Q-F89-1). 9 composant renommé après coup. 10 deux composants au nom compacté égal, un conteneur (`mesure`, Q-F89-7). 11 `Button` et `Button Group`, un conteneur chacun. 12 deux conteneurs pour le même composant (`mesure`, Q-F89-8). 13 conteneur dans un frame ou une section. 14 conteneur dans une instance d'un autre composant (`mesure`, Q-F89-9). 15 sélection d'un composant seul, sans jeu. | 15 | C43 pour 1, 2, 9 ; aucun C43 pour 5, 6, 11, 13, 15 ; C43 sans doublon C44 pour 1 | oui pour les cas C43 |

**Propriété, valeur ou règle en trop (C45)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| H1 | Une propriété sans règle, une à la fois : `alert-11` (3), `button-36` (6), `switch-4` (2), `badge-9` (2), `tile-link` (3). | 16 | C45 `sans-regle`, avec `regles` égal au nombre de cibles de la propriété | oui, `ajouter` |
| H2 | Valeur sans règle sur `button-36`. Palette (première, médiane, dernière), Style (première, dernière), State (première, médiane, dernière), Size (première, dernière) : 10. Toutes sauf une, par axe : 4. Deux manquantes sur Palette et sur State : 2. | 16 | C45 `sans-valeur` avec `valeurs` dans l'ordre du modèle | oui, `ajouter` |
| H3 | Règle sans propriété. 1 cible à une lettre près. 2 cible en casse différente (aucun constat). 3 propriété supprimée du composant. 4 propriété du wrapper (aucun constat). 5 propriété d'un imbriqué rattaché au parent (aucun). 6 propriété de texte publiée (aucun). 7 valeur inexistante, `Size.xxl` (`mesure`, Q-F89-2). 8 axe inexistant avec valeur. 9 cible vide. 10 cible faite d'espaces. 11 cible à deux propriétés. 12 tag croisé : `@boolean` sur un axe. | 12 | C45 `sans-propriete` pour 1, 3, 8, 9, 10, 11, 12 | non |
| H4 | Écriture des noms. 1 à 4 `Show Icon` face à `show icon`, `show-icon`, `show_icon`, `showIcon` (`show-icon` et `show_icon` en `mesure`, Q-F89-1). 5 `Has Icon#1:2` face à `Has Icon` (`mesure`). 6 valeur accentuée. 7 valeur `1.5`. 8 valeurs `v2.0` et `v2.1`. 9 propriété nommée `Size.Mode`. 10 `Extra Large` face à `ExtraLarge`. 11 `Extra-Large` (`mesure`). 12 `Icon / Left`. 13 propriété `1`. 14 deux propriétés au nom compacté égal. | 14 | aucun constat pour 1, 4, 6, 7, 8, 9, 10, 12, 13, 14 ; un seul constat par propriété jamais en double | non |
| J1 | Toutes les règles marquées « [À compléter] », une fois par forme. | 6 | aucun C45, le moteur double ajoute C44 | non |

**Écriture des règles (`creer`, `ajouter`)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| E1 | `creer`. 1 nominal. 2 composant disparu. 3 conteneur apparu depuis l'analyse. 4 modèle absent. 5 sources absentes. 6 `creer` lève. 7 `resoudre` lève. 8 `commitUndo` lève. | 8 | écrite pour 1 et 8 ; sautée `objet-change` pour 2, 3, 4 ; sautée `erreur` pour 5, 6, 7 | selon le cas |
| E2 | `ajouter`. 1 une propriété. 2 trois propriétés du même composant (un appel). 3 deux composants. 4 conteneur absent. 5 second passage. 6 une règle déjà posée et une à poser. 7 sources absentes. 8 `ajouter` lève. 9 composant disparu. 10 cible présente marquée « [À compléter] ». | 10 | écrite pour 1, 2, 3, 6 ; sautée `objet-change` pour 4, 5, 9, 10 ; sautée `erreur` pour 7, 8 | selon le cas |
| E3 | `retirer` sur une instance remplie, puis sur un composant sans instance. | 2 | sautées `instance-remplie`, puis `objet-change` | non |
| E4 | Lot mixte. 1 liaisons, règles et noms, tout passe. 2 les règles sautent. 3 les liaisons sautent. 4 fichier hors UCM. 5 lot vide. | 5 | un `commitUndo` si une ligne est écrite ; `non-ucm` pour 4 ; résumé exact | non |
| E5 | Modèles retenus. 1 après une seconde analyse. 2 après une prélecture annulée. 3 après un moteur partiel. 4 après une annulation en phase `regles`. 5 deux composants analysés l'un après l'autre. | 5 | les modèles de l'analyse affichée, jamais ceux d'une analyse inachevée | non |
| E6 | Phrase du résumé de lot pour `objet-change`, `instance-remplie`, `erreur`, `non-ucm`, un mélange, et le pluriel. | 6 | `N car …` lisible, sans motif brut | non |

**Points du moteur (C30, C34, C35, C41, C42, C44)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| M1 | Un cas par gabarit du corpus : variables 11, disposition 6, proprietes 9, imbriques 4, styles 2, regles 6, non-exportes 2. | 40 | code, type et famille de 4.8 (C41 pour « variable introuvable », C30 pour les autres points `variables`, C35 pour « masqué » et « pilote », C44 pour `regles`, C42 pour le reste) ; `proprietes` hors C35 en `mesure` | non |
| M2 | Pièges de texte. 1 calque nommé « masqué » dans un point `disposition` ordinaire. 2 composant nommé « masqué ». 3 propriété nommée « pilote » dans une combinaison manquante. 4 calque nommé « Variable introuvable » dans un point C30. 5 « variable introuvable » dans `elements` (témoin C41). 6 « Masqué » en majuscule. 7 « masqué » dans `elements` seul. 8 « Valeur introuvable » (témoin C30). | 8 | le code suit le sens du point, pas le mot : C42, C34, C30, C41, C42, C35 | non |
| M3 | Identifiants. 1 deux phrases de même titre et mêmes nœuds. 2 même phrase deux fois. 3 à 5 trois permutations de l'ordre de trois points. 6 deux titres de même empreinte (cherchés par le générateur, jusqu'à 200 000 essais). 7 et 8 même titre, nœuds différents. 9 mêmes nœuds dans un autre ordre. 10 titre vide. 11 et 12 point sans parties. 13 et 14 sévérité `danger`. 15 sévérité absente. 16 cent points distincts. 17 cinq cents phrases identiques au nombre près. | 17 | identifiants uniques et indépendants de l'ordre ; bloquant seulement pour C41 et `danger` | non |
| M4 | Nœuds. Un variant du relevé, un layer, un identifiant inconnu, le jeu lui-même, aucun nœud. | 5 | `variants` et `layers` répartis sans perte | non |
| M6 | Rangement par élément. Marge, espacement, rayon, épaisseur de contour, remplissage, contour, style de texte, opacité, effet, dimensions minimales, côtés à variables différentes, espacement « Auto », variable introuvable sur une marge, variable introuvable sur un remplissage. | 14 | élément de la propriété : tailles, tailles, tailles, tailles, couleurs, couleurs, texte, tokens (`mesure`, Q-F89-11), tokens (`mesure`), tailles, tailles, tailles, tailles, couleurs | non |
| M7 | Doublons kit et moteur. C43 avec C44 « aucune instance » : 2 (page vierge, autre page). C25 avec C30 sur un remplissage, un contour, une plage de texte : 3. C29 avec C30 sur `paddingLeft`, `itemSpacing`, `cornerRadius`, `strokeWeight`, `counterAxisSpacing` : 5. C65 ou C64 avec C30 sur un texte : 2. C81 avec C30 : 1. Témoins : C44 « À compléter » seul, C44 « plusieurs instances » seul : 2. C30 sur `opacity`, sans équivalent du kit : 2 ; C30 sur un autre layer : 1 ; C30 sur un autre champ du même layer : 1. Constat du kit ignoré, point du moteur de même clé conservé ou non (`mesure`, Q-F89-12) : 2. | 21 | une seule carte, celle du kit, pour les 13 premiers ; les 6 témoins gardent leur constat | non |
| M8 | Largeur de C34. Une combinaison manquante, plusieurs, « aucun variant », « aucune propriété définie », collision de noms de propriétés, collision de taille, état non reconnu, état toléré, « pilote aucun calque ». | 9 | C34 pour les deux premiers ; C35 pour le dernier ; les six autres en `mesure` (Q-F89-10) | non |

Le total de la section B de F8 est 21 (G) + 58 (H) + 6 (J) + 36 (E) + 114 (M) = 235.

### 3.4 Opérateurs de dégradation F9

Le générateur de F9 est un injecteur de pannes. `injecteur.ts` enveloppe chaque lecteur de `Lecteurs` (`sujet`, `releve`, `bibliotheques`, `catalogue`, `moteur`, `regles`, `dependances`, `niveau`, `ignores`, `prelecture`) et chaque contrôle du kit par un point de passage nommé. Un cas déclare des actions liées à un passage : lever une erreur, rendre une valeur invalide, lever le jeton, envoyer un événement du document, lancer une seconde demande, écrire. L'horloge, les pauses et la pause discrète sont injectées (`OptionsDeLAnalyse`), donc aucun cas n'attend le temps réel. Le point de passage fixe l'ordre des actions, ce qui rend les cas de concurrence déterministes.

Le verdict est `attendu` sauf mention contraire.

**Lectures refusées et pannes de lecteurs**

| Id | Dégradation | Cas | Résultat attendu |
|---|---|---|---|
| N1 | `regles` lève : `Error`, chaîne, `AnalyseAnnulee`, retourne `undefined`, lève après la levée du jeton. | 5 | `partielle` (ou `annulee` pour le dernier), pas de C43 ni C45, écran « règles non jugées » |
| N2 | `niveau` lève avec AAA rangé : `Error`, valeur invalide `ZZ`, lève après le relevé. | 3 | `partielle`, l'écran dit que AA a été appliqué |
| N3 | `ignores` lève : `Error`, `getSharedPluginData` lève, liste qui n'est pas un tableau. | 3 | `partielle`, l'écran dit que les ignorés n'ont pas été lus |
| N4 | `dependances` lève : `Error`, `AnalyseAnnulee`, `imbriqueesNonLues` non nul. | 3 | `complete` avec trace (`mesure`, Q-F89-3) ; annulée pour le deuxième |
| N5 | `catalogue` lève : `Error`, library illisible (repli sur le fichier), collection `inaccessible`. | 3 | `arretee` pour le premier ; `partielle` et repli dit pour les deux autres |
| N6 | `bibliotheques` : rejet, lecture `illisible`, résolution après l'annulation. | 3 | repli dit (Q-F89-4), aucune fuite |
| N7 | `releve` : lève, `sans-sujet`, `annule`, `lu` avec une manquée, avec 100 manquées, avec `variantsNonLus` seul. | 6 | `arretee`, `arretee`, `annulee`, `partielle` ×3 |
| N8 | `moteur` : `ComponentExportError`, `Error`, `annulee`, couverture `partielle` avec `lus` et `nonLus`, couverture `partielle` à `nonLus` `inconnu`, résultat sans `rules`. | 6 | `arretee`, `arretee`, `annulee`, `partielle`, `partielle`, `complete` sans règles lues |
| N9 | `sujet` : lève, rend `null`, rend un sujet sans nœud. | 3 | analyse sans sujet, message « Aucun composant n'est sélectionné », aucune fuite |
| N11 | Déclaration UCM : lecture qui lève, JSON invalide, `ucm: false`, `ucm: true`, absente. | 5 | familles thème et structure sautées seulement pour `false` et absente ; la lecture qui lève et le JSON invalide donnent `partielle` et un message |

**Budget de 2 000 layers**

| Id | Dégradation | Cas | Résultat attendu |
|---|---|---|---|
| Bd1 | Seuils sur un jeu de variants de 10 layers : total de 1 999, 2 000 et 2 001. Premier variant seul à 2 500 layers. 216 variants de 12 layers. `parcourir` qui lève sur le variant 3, 100 puis 216 (3 cas). `compterLesLayers` qui lève avant la coupe, puis après. Un variant de 500 layers au milieu. Un wrapper avec coupe. Instances imbriquées par variant : 0, 5 et 40, où le relevé et le moteur comptent différemment. | 15 | coupe en préfixe de variants entiers, identique pour le relevé et le moteur ; 2 000 gardé, 2 001 coupé ; `layersNonLus` exact ou `inconnu` ; le moteur ne s'arrête pas pour un compte qui lève |
| Bd2 | Contrôles sur un relevé coupé, à trois positions de coupe (1, médiane, avant-dernier) : oublis (C31, C32, C33), fratrie (C21), nommage (C7, C12, C13). | 9 | aucun constat sur ce qui n'a pas été lu |
| Bd3 | Texte de la bannière : `layersNonLus` nombre, `inconnu`, variants non lus sans layers comptés, manquées seules, manquées avec coupe, moteur partiel seul. | 6 | nombres vrais, cause nommée, jamais « N sur N » |

**Lectures manquées et moteur partiel**

| Id | Dégradation | Cas | Résultat attendu |
|---|---|---|---|
| Lm1 | Un champ manqué à la fois : marges, espacement, rayon, épaisseur, `fills`, `strokes`, `characters`, boîte, `layoutMode`, `visible`, `boundVariables`, `children`. | 12 | `partielle`, « N lectures ont échoué », ni C29 ni C52 sur ce champ |
| Lm2 | Manquées avec coupe, avec moteur partiel, avec les deux, avec règles refusées. | 4 | causes cumulées dans la bannière |
| Lm3 | 1, 10, 100 et 1 000 manquées. | 4 | pluriel et nombre exacts, écran lisible |
| Mp1 | Moteur partiel : `nonLus` nombre ou `inconnu`, relevé complet ou incomplet (4). Avec lecteur de règles défini (2). Avec reprise d'une entrée validée dont le budget change (2, `mesure`). | 8 | pas de C43 ni C45, bannière qui nomme le moteur et les règles |

**Cycle de vie**

| Id | Dégradation | Cas | Résultat attendu |
|---|---|---|---|
| An | Annulation à 14 frontières (sujet, relevé en cours, relevé fini, libraries en cours, catalogue, première famille de contrôles, dernière famille, ignorés, provisoire envoyé, dépendances, moteur, règles, corrections, cession finale), par identité puis par numéro de demande : 28. Annulation après le final, d'une identité périmée (2), sans analyse, deux fois : 5. Annulation suivie d'une demande immédiate (2). Annulation pendant une prélecture (2). | 37 | P18 |
| Pe | Péremption. 9 événements (changement de nœud dans l'inventaire, hors inventaire, de style, sélection d'un autre jeu, sélection d'un variant du même jeu, changement de page, écriture du plugin, Ctrl+Z, suppression du sujet) en 4 phases (avant `analyse-commencee`, relevé, moteur, après le final) : 36. Pendant le provisoire, pendant l'écriture, journal débordé : 3. | 39 | P21 |
| Oc | Demandes concurrentes. Deuxième analyse pendant 5 phases : 5. Analyse pendant une écriture, écriture pendant une analyse, deux écritures, modèle pendant une analyse, analyse pendant un modèle : 5. Demande sur une analyse périmée, avec écriture, Actualiser pendant l'analyse, prélecture pendant l'analyse, analyse pendant une prélecture, Actualiser pendant une prélecture, capture pendant une prélecture : 7. Côté interface, `occupe` pendant une écriture, pendant un calcul, d'une identité inconnue, sans analyse retenue, deux fois : 5. Trois demandes à la suite, sur trois cadences : 3. | 25 | P22 |
| Pr | Prélecture. Clic Analyser pendant 4 phases : 4. Actualiser : 1. Capture : 1. Écriture pendant 3 phases : 3. Événement pendant 5 phases : 5. Seconde prélecture pendant l'annulation de la première : 1. Entrée utilisable : 1. Analyse non périmée affichée : 1. Analyse périmée affichée : 1. Import évité, avant et après le clic : 2. Relance des libraries pendant une prélecture, pendant une écriture, après 2 minutes : 3. Promotion puis clic, complète et partielle : 2. | 25 | P23 |
| Id | Identité. Final, provisoire, `perime` et progression tardifs d'une analyse précédente : 4. `analyse-commencee` de génération inférieure ou égale : 2. Analyse sans `analyse-commencee` : 2. Sujets A, B puis A : 3. | 11 | P24 |
| Pv | Provisoire. Normal, annulé avant, arrêté après, ignorés illisibles, sans constat, final qui garde les identifiants, final tardif après péremption : 7. Verrous de l'interface : 3. Provisoire avec règles refusées, avec moteur partiel, avec moteur arrêté : 3. | 13 | P20 |

**États et filtres**

| Id | Dégradation | Cas | Résultat attendu |
|---|---|---|---|
| Li | Library à choisir. Candidates 0, 1 et 2 ou plus, library choisie ou non, première analyse ou nouvelle : 12. Côté sandbox, choix par liaisons, deux libraries à égalité, library illisible, library inaccessible, library qui change entre deux analyses, repli dit : 6. Prélecture avec library non choisie : 2. | 20 | P26 |
| Hu | Déclaration `ucm`, `libre`, `absente`, JSON illisible, version inconnue, chacune vérifiée sur les familles du sandbox, l'écran et l'écriture : 15. Déclaration qui change pendant une analyse, pendant une écriture : 2. C43 et C45 hors UCM : 2. | 19 | P25 |
| Ig | Ignorés. Clés `constat`, `proposition:`, `role-ucm:`, mélange, inconnues : 5. Tous les constats ignorés (1 sur 1, tous sur N, un seul reste) : 3. Ignorer pendant le provisoire, sur une analyse périmée, un constat `info`, hors UCM, avec une écriture qui lève, deux fois : 6. Identifiant du moteur instable après changement d'ordre : 3. Ignorer, « Ne plus ignorer », péremption : 2. | 19 | P27 |
| St | Table de vérité du statut. Chaque part de la section 2.5 refusée seule (8), les 28 paires, tout jugé, rien de jugé. | 38 | P14 |

Le total de la section B de F9 est 40 (N) + 30 (Bd) + 20 (Lm) + 8 (Mp) + 37 (An) + 39 (Pe) + 25 (Oc) + 25 (Pr) + 11 (Id) + 13 (Pv) + 20 (Li) + 19 (Hu) + 19 (Ig) + 38 (St) = 344.

### 3.5 Combinaisons

**F8.** Un pool d'environ 40 atomes est tiré de G1, G2, H1 à H4, J1, E1, E2, M1, M2, M3, M6, M7 et M8. Chaque atome déclare la zone qu'il touche (composant, propriété, point). La liste est figée dans `combinaisons.ts`.

- 160 paires et 80 triples sont tirés avec la graine, sur les 3 profils de la section 3.2.
- Deux atomes se combinent seulement si leurs zones sont disjointes. L'oracle d'une combinaison est alors l'union des oracles des atomes.
- 16 cas d'interaction déclarée (8 couples, 2 profils) complètent les 240. Chaque couple a un oracle propre.

| Couple | Oracle attendu |
|---|---|
| G1 et le point C44 « aucune instance » du moteur | un seul constat, C43 (Q-09) |
| H2 et une règle marquée « [À compléter] » sur la même propriété | C45 `sans-valeur` seul, C44 « À compléter » conservé |
| H1 et H3 sur un nom proche (`Palette` retirée, `Palete` posée) | deux constats distincts (`mesure`, Q-F89-13) |
| H1 sur deux propriétés | deux corrections, un seul appel d'écriture, un seul point d'annulation |
| M7 (C29 et C30) et l'ignorer du constat C29 | `mesure` (Q-F89-12) |
| N1 et H1 | aucun C45, statut `partielle` |
| Moteur partiel et G1 | aucun C43, statut `partielle`, bannière qui nomme les règles |
| E1 et E2 sur deux composants de la même page | deux écritures, un point d'annulation |

**F9.** Un pool d'environ 50 atomes est tiré de N1 à N9, N11, Bd1, Lm1, Mp1, An, Pe, Oc, Pr, Pv, Li, Hu et Ig.

- 180 paires et 90 triples sont tirés avec la graine, sur A0, a55 et un profil tiré.
- L'oracle d'une combinaison est le statut déduit de la section 2.5 pour l'union des pannes, rangé par l'ordre des écrans de la même section. Deux atomes ne se combinent que si leurs points de passage sont distincts.
- 20 cas d'interaction déclarée (10 couples, 2 profils) complètent les 270.

| Couple | Oracle attendu |
|---|---|
| Règles refusées et moteur partiel | une bannière qui nomme les deux causes |
| Coupe du budget et lectures manquées | nombres cumulés dans la bannière |
| Niveau illisible et AAA rangé | l'écran dit que AA a été appliqué |
| Annulation puis demande immédiate | un seul message `analyse` final, celui de la seconde demande ; la première ne laisse ni provisoire ni retenue |
| Péremption pendant le moteur et final tardif | final refusé, constats gardés sans case |
| Analyse périmée et écriture en cours | l'écriture garde la place, `occupe` visible |
| Prélecture et écriture | l'écriture prend la place sans `occupe`, la prélecture s'arrête en silence |
| Ignorés illisibles et tous les constats ignorés | l'écran ne dit pas « Aucun constat » sans nommer la lecture refusée |
| Library à choisir et prélecture | aucune prélecture |
| Déclaration qui change pendant l'analyse | statut et écran cohérents avec la déclaration finale |

### 3.6 Graine et total

La graine est 7108, avec le générateur pseudo-aléatoire à 32 bits `mulberry32` du cadre commun, dont le tirage suit l'ordre trié des identifiants de cas. Une même graine rend les mêmes cas.

| Section | Contenu | F8 | F9 | Total |
|---|---|---|---|---|
| A | Faux positifs (section 4) | 67 | 88 | 155 |
| B | Opérateurs simples | 235 | 344 | 579 |
| C | Combinaisons | 256 | 290 | 546 |
| D | Chaîne sandbox et écran (section 5.3) | 55 | 74 | 129 |
| | Total | 613 | 796 | 1 409 |

Détail de C pour F8 : 160 paires, 80 triples et 16 interactions. Détail de C pour F9 : 180 paires, 90 triples et 20 interactions.

## 4. Faux positifs

Les 48 profils de règles (P1) doivent donner zéro C43 et zéro C45. Les 72 profils d'analyse doivent donner le statut `complete` et l'écran prévu par leur architecture et leur library (alerte hors UCM, « Library à choisir », ou liste). Des thèmes ciblés s'y ajoutent.

**F8, 19 thèmes**

| Thème ciblé | Cas |
|---|---|
| Cible écrite `Show Icon`, `show icon`, `SHOW ICON` | 3 |
| Propriété du wrapper de dimensions fusionnée | 1 |
| Propriété d'un imbriqué rattaché au parent | 1 |
| Règle sur une propriété de texte publiée | 1 |
| Règles `@icons`, `@usage`, `@default`, `@do`, `@dont`, `@pairs` présentes | 1 |
| Règle rédigée et règle marquée sur deux propriétés | 1 |
| Page à deux composants et deux conteneurs | 1 |
| Composant sans propriété, conteneur réduit à `@usage` | 1 |
| Conteneur dans une section | 1 |
| Calques nommés « masqué », « pilote », « Variable introuvable » avec des points ordinaires | 4 |
| Moteur sans aucun point | 1 |
| Même phrase du moteur répétée | 1 |
| Constat du kit et point du moteur sur des champs différents | 2 |

Le total compte 3 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 4 + 1 + 1 + 2 = 19 thèmes. Chaque thème vérifie aussi la relation de réordonnancement, donc les 67 cas de la section A rejouent un ordre mélangé.

**F9, 16 thèmes**

| Thème ciblé | Cas |
|---|---|
| Lecteur d'ignorés, de règles, de niveau ou de dépendances non défini (absence n'est pas refus) | 4 |
| Relevé de 1 999 layers, puis de 2 000 | 2 |
| Variants désactivés, constat `info` seul | 2 |
| Sélection d'un variant du jeu | 1 |
| Deux analyses successives, non concurrentes | 1 |
| Actualiser après une analyse | 1 |
| Écriture vide (aucune ligne écrite) | 1 |
| Événement hors inventaire pendant l'analyse | 1 |
| Prélecture entière sans événement, puis clic | 1 |
| Library choisie par les liaisons, une seule candidate | 1 |
| Fichier déclaré `libre`, alerte seule | 1 |

Le total compte 4 + 2 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 16 thèmes.

## 5. Harnais

### 5.1 Emplacement

Le code vit hors de `npm test`. Presque tout vit dans le plugin, car les contrôles mesurés sont dans le plugin et le socle.

| Dossier | Contenu |
|---|---|
| `packages/kit/tests/stress/commun/` | Cadre commun livré par le lot 0 de F2 (`prng.ts`, `types.ts`, `comparer.ts`). Ce plan n'y ajoute rien. |
| `packages/plugin-architect/scripts/stress/f8-analyse/` | `profilsRegles.ts`, `pageDeRegles.ts`, `scenarioDeBase.ts`, `corpusDuMoteur.ts`, `injecteur.ts`, un fichier d'opérateurs par groupe (`operateursRegles.ts`, `operateursEcriture.ts`, `operateursMoteur.ts`, `operateursLectures.ts`, `operateursBudget.ts`, `operateursCycle.ts`, `operateursEtats.ts`), `fauxPositifs.ts`, `oracle.ts`, `combinaisons.ts`, `metamorphiques.ts`, `appliquer.ts`, `chaine.ts`, `ecran.ts`, `rejeu.ts`, `executer.ts`, `rapport.ts`, `signatures.ts`, `recette.ts`. |

Le harnais importe le `composantDeBase` de `packages/kit/tests/stress/f3-composant/` et l'`atelierDuComposant` de F3-F4 sans les modifier.

Lancement, après construction du kit comme le font les scripts du plugin.

```sh
npm run stress:analyse --workspace ucm-architect-plugin -- --graine 7108
```

Le script `stress:analyse` de `packages/plugin-architect/package.json` appelle `node ../../scripts/construire-plugin.mjs verifier-kit architect` puis `npx tsx scripts/stress/f8-analyse/executer.ts`. Options prévues : `--famille F8|F9`, `--section A|B|C|D`, `--operateur N1`, `--cas N1-03` (rejoue un cas et imprime le scénario, les messages du sandbox, l'écran et l'oracle), `--rapide` (R0 et A0 seuls pour les sections B et C) et `--strict` (sortie non nulle au premier écart `attendu`).

### 5.2 Appel du sandbox, de l'écran puis de l'écriture

1. Le générateur rend une base (règles ou analyse) à partir d'un profil.
2. L'opérateur copie la base (`structuredClone`), applique la dégradation et rend l'oracle du cas, avec les pannes à injecter.
3. Chaque cas commence par `reinitialiserLAnalyse()` et un `Banc` neuf (`tests/analyse.test.ts`). Aucun état ne passe d'un cas au suivant (P28).
4. Pour F8 au niveau pur, le harnais appelle `constatsDeRegles`, `retenirLesModeles`, `constatsDuMoteur` et le rangement `elementsDuPanneau`. Pour le scan, il appelle `lireLesRegles` sur la page fabriquée.
5. Pour la chaîne, il appelle `traiterAvec(lecteurs, options)` de `sandbox/analyse.ts` avec les `Lecteurs` enveloppés par l'injecteur, et capte les messages. Il rejoue ces messages dans `recevoirUneAnalyse` de `ui/composant/analyse.ts` sur l'état de l'interface, puis appelle `monterLePanneau` sur le faux DOM de `tests/domDeTest.ts` (`poserLeDom`). Il lit les cartes, les cases, la bannière, les sections tenues et le pied.
6. Pour l'écriture, `ecrireLesRegles` tourne sur un `PortDEcritureDesRegles` double qui modifie un `ReleveDesRegles` en mémoire. `ecrireLeLot` tourne avec l'atelier d'écriture de F3-F4. `creerLesRegles` et `ajouterLesRegles` du socle ne tournent pas dans le harnais : leur écriture réelle se prouve en Figma (section 7).
7. `appliquer.ts` applique au `ReleveDesRegles` les corrections `creer` et `ajouter` pour P6.
8. Les relations métamorphiques sont M-1 (ordre des phrases du moteur, des variants et des layers), M-2 (identifiants renommés), M-3 (deux exécutions du même cas), M-4 (analyse froide contre seconde analyse validée) et M-5 (prélecture promue puis clic contre analyse froide, par `verifierLaPariteDeLAnalyse`).

### 5.3 Cas de la chaîne (section D)

**F8, 55 cas**

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Cartes lisibles : C43, C45 `sans-regle`, `sans-valeur`, `sans-propriete`. | 4 | P12 |
| D2 | Cases décochées au premier affichage, à la relecture, après l'ajout d'une correction (3). « Tout cocher » et « Tout décocher » de la section Règles (2). Pied « aucune cochée » et Appliquer inactif (1). | 6 | P12 |
| D3 | Rangement : un constat par élément du panneau (7), puis le compte de la pastille et du sommaire (1). | 8 | P10 |
| D4 | Ignorer, « Ne plus proposer » et « Ne plus ignorer » sur C43, C45 `sans-regle`, C45 `sans-valeur`, C45 `sans-propriete`, C44, C30. | 18 | P12 |
| D5 | Chaîne complète analyse, écran, coche, écriture, relecture, pour C43 et C45 sur 6 formes. | 12 | P6, P7 |
| D6 | Doublons rendus à l'écran : C43/C44, 3 pairs C25, 3 pairs C29. | 7 | P11 |

**F9, 74 cas**

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Un écran par état : aucune sélection, hors UCM, library à choisir, pas encore analysé, en cours, provisoire, arrêtée, annulée, partielle par budget, par manquées, par moteur, par règles refusées, complète sans constat, complète avec constats, périmée par le document, périmée après écriture, provisoire périmé, écriture en cours, tous constats ignorés. | 19 | P13, P15, P21, P27 |
| D2 | Relecture de 20 suites de messages enregistrées sur les cas B : la machine d'états de l'interface (statut, verrous, identité) reste cohérente avec le sandbox. | 20 | P18 à P24 |
| D3 | Rejeu de captures réelles sous 6 pannes (règles qui lèvent, niveau, ignorés, budget de 300 layers, moteur partiel, annulation à mi-parcours). Sources : 3 captures de `_local/vitesse-analyse/` et 2 rapports de `_local/recette-v2/`. Un fichier sans capture compte « absent », pas « réussi ». | 30 | P13, P14, P16, P18 |
| D4 | Parité d'une prélecture promue avec une analyse froide, sur les 5 sources. | 5 | P23 |

### 5.4 Rapport et temps

Le rapport s'écrit dans `_local/stress/f8-analyse/` (dossier ignoré par Git) en deux fichiers, `rapport.json` et `rapport.txt`. Rien de ce qui vient de `_local/vitesse-analyse/` ou de `_local/recette-v2/` n'entre dans un fichier suivi par Git. Le `.txt` porte ce tableau, une ligne par opérateur.

| Opérateur | Cas | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes | Non affichés | Conclusions fausses | Messages muets | Fuites d'état | Cochées | Non écrites | En attente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Il porte aussi le total par section et par famille (F8, F9), puis la liste des écarts. Chaque écart donne l'identifiant du cas, la propriété violée, l'écart connu rattaché (E-28 à E-39) ou la mention « nouveau », et la commande qui rejoue le cas. Le rapport écrit aussi l'empreinte SHA-256 de la liste des cas.

Le temps d'exécution est à mesurer au lot 9. Le seuil visé est 240 secondes pour les 1 409 cas sur le poste du mainteneur. Les cas à 216 variants et les rejeux de captures sont les plus lourds. Si le seuil est dépassé, le lot 9 règle `--rapide` et réduit les rejeux, sans réduire le nombre d'opérateurs.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le `verificateur` lance le harnais sur le code actuel. La conversation principale lit `rapport.txt`, classe chaque écart (défaut, limite assumée, cas à trancher) et rattache les nouveaux à un identifiant. Elle présente au mainteneur le tableau des écarts nouveaux et celui des cas `mesure`, puis écrit le résultat dans `MESURE-DES-FAILLES.md`. Rien n'est corrigé dans cette étape.

Écarts que la lecture du code laisse prévoir. Un essai en lecture seule, qui appelle `constatsDeRegles` et `constatsDuMoteur` sur des entrées fabriquées sans toucher au dépôt, a déjà confirmé ceux de la colonne « Essai ». La mesure confirme les autres.

| Hypothèse | Opérateur | Source | Essai |
|---|---|---|---|
| Une valeur qui contient un point (`1.5`, `v2.0`) fausse l'axe : `axeDeLaCible` coupe au dernier point, l'axe devient `version.1`, et C45 rend deux `sans-regle` sans correction alors que toutes les règles sont posées. | H4-7, H4-8 | `regles.ts:56, 65`, `template/modele.ts:149` | confirmé |
| `nomCompacte` retire les espaces et la casse seulement : une règle écrite `show-icon` ou `show_icon` donne un `sans-regle` et un `sans-propriete` pour la même propriété. | H4-2, H4-3 | `kit-de-regles.ts:70`, `regles.ts:123` | confirmé |
| Une règle `@prop` visant une valeur inexistante (`Size.xxl`) n'est jamais signalée. | H3-7 | `regles.ts:145-148` | confirmé |
| Les identifiants de deux phrases de même titre et de mêmes nœuds se distinguent par le rang. Quand l'ordre des phrases change, les deux identifiants permutent, et un ignorer vise l'autre point. | M3-1, M3-3 à M3-5 | `constatsDuMoteur.ts:75-77` | confirmé |
| Le code du moteur dépend d'un mot du texte : un calque nommé « masqué » rend C35, une propriété nommée « pilote » rend C35, un calque nommé « Variable introuvable » rend C41 bloquant. | M2-1 à M2-4 | `constatsDuMoteur.ts:33-36` | confirmé |
| C34 reçoit « aucun variant », « aucune propriété définie » et « état non reconnu ». | M8 | `constatsDuMoteur.ts:37` | confirmé |
| C30 et C41 vont dans Couleurs même pour une marge. | M6 | `constatsDuMoteur.ts:33-34`, `elements.ts:81` | confirmé |
| C43 et le point C44 « aucune instance » du moteur donnent deux cartes pour la même absence. | G1, M7 | `regles.ts:104-125`, `extractRules.ts:492-506` | lecture |
| Deux composants au nom compacté égal partagent un conteneur : C43 se tait pour le second et C45 lit les mêmes règles pour les deux. | G2-10 | `extractRules.ts:449-463` | lecture |
| Un conteneur posé dans une instance fait compter l'instance parente : `candidatsDeRegles` retient chaque ancêtre `INSTANCE` du calque de nom, d'où un faux « N instances écrivent ». | G2-14 | `extractRules.ts:417-427` | lecture |
| Une instance sur une autre page donne C43, et `creer` pose un second conteneur sur la page du composant. Un conteneur au calque vide ou resté « [À compléter] » donne C43 et `creer` en pose un autre à côté de l'orphelin. | G2-1, G2-3, G2-4, E1 | `ecriture/regles.ts:134-146` | lecture |
| `creer` saute en `objet-change` (« le composant a changé ») quand le modèle manque, alors que la cause est un modèle perdu. | E1-4, E5 | `ecriture/regles.ts:141-142`, `sandbox/corrections.ts:49` | lecture |
| Le statut final ignore `lecturesRefusees` : `complete` et « Aucun constat » sans que C43 et C45 aient été jugés, et l'écran dit « Contrôlés : … règles d'usage ». Le niveau AAA rangé devient AA sans le dire. | N1 à N3, St | `sandbox/analyse.ts:2056, 2082, 2107`, `ui/analyse/index.ts:431-433` | lecture |
| Moteur partiel avec relevé complet : « N variants lus sur N ». Le relevé compte `parcourir`, le moteur compte `1 + descendantsBruts` : les deux coupent à des variants différents dès qu'il y a des imbriqués. | Bd1, Mp1, Bd3 | `ui/analyse/index.ts:428`, `releveDuComposant.ts:644`, `budget.ts:23-24` | lecture |
| Une analyse partielle sans constat montre les 7 sections « tenues », y compris Règles quand le moteur est partiel. | Mp1, D1 | `ui/analyse/index.ts:358`, `panneau/elements.ts:138` | lecture |
| Quand tous les constats sont ignorés, l'écran répond « Aucun constat » avant de monter la liste des ignorés : « Ne plus ignorer » n'est plus atteignable. | Ig | `ui/analyse/index.ts:431-433` | lecture |
| Une déclaration UCM dont la lecture lève donne `architectureUcm = false` en silence : familles thème et structure sautées, statut `complete`. | N11, Hu | `sandbox/analyse.ts:2005-2008` | lecture |
| Une library qui ne se lit pas ramène au catalogue du fichier sans signal : les tokens de library paraissent absents, statut `complete`. Une collection `inaccessible` laisse aussi `complete`, alors que F3-F4 P18 attend `partielle`. | N5, N6, Li | `sandbox/analyse.ts:1058-1061, 2106-2107` | lecture |
| Le panneau périmé remplace la liste par une note, alors que la SPEC dit qu'il garde ses constats. | Pe, D1 | `ui/analyse/index.ts:327-330`, `SPEC.md:188` | lecture |
| `occupe` ne dit rien au designer, et il met `ecriture` à `null` sur l'analyse affichée alors que l'écriture continue : le panneau revient à la liste et Appliquer redevient possible. | Oc | `ui/composant/analyse.ts:172-174`, `ui/barre.ts:139` | lecture |
| Le relevé coupe tous les variants suivants quand `parcourir` lève sur un seul. `compterLesLayers` qui lève avant la coupe n'est pas attrapé et arrête le moteur. Le premier variant se lit toujours, sans borne. | Bd1 | `releveDuComposant.ts:639-657`, `budget.ts:77, 86` | lecture |
| La garde « library à choisir » ne vaut que pour une première analyse, et la prélecture ne la consulte pas : la library est choisie en silence par les liaisons. | Li | `ui/barre.ts:139`, `sandbox/prelecture.ts` | lecture |
| Une erreur après le message final (capture, promotion) envoie un second message `analyse` `arretee` pour la même identité. | An, Pv | `sandbox/analyse.ts:2127-2136` | lecture |
| `lireLesReglesDe`, `niveau` et `ignores` avalent `AnalyseAnnulee` : une annulation compte comme lecture refusée. | N1, N2, N3 | `sandbox/analyse.ts:1956, 2011-2018, 2056` | lecture |

### 6.2 Tests de régression

Une fois la mesure lue, des cas représentatifs deviennent des tests dans `npm test`.

| Fichier | Contenu | Cas |
|---|---|---|
| `packages/plugin-architect/tests/reglesEtMoteurStress.test.ts` | Un test par opérateur de F8 qui a révélé un écart, avec 1 à 3 cas de la graine 7108, plus les propriétés P1 à P12 rejouées sur R0 et r42. | 40 à 55 |
| `packages/plugin-architect/tests/etatsDeLAnalyseStress.test.ts` | Un test par opérateur de F9 qui a révélé un écart, plus les cas D1 qui ont révélé une conclusion fausse ou un message muet, plus P13 à P28 rejouées sur A0. | 50 à 70 |

Un test dont le défaut n'est pas corrigé porte `{ todo: '<écart>' }` de `node:test`. Il s'exécute, et son échec ne fait pas échouer `npm test`. La correction du code retire le `todo`. Les deux fichiers durent moins de 15 secondes ensemble. Le harnais complet reste hors de `npm test`.

## 7. Recette Figma

Ce qui ne se prouve qu'en Figma : l'écriture réelle des règles, le scan d'une vraie page, le budget sur un vrai composant, le nombre de layers. Le mainteneur dégrade une copie d'un fichier de recette qu'il a déjà (Alert, Button, Input). Le plan ne crée et ne migre aucun fichier. Le harnais imprime dans `_local/stress/f8-analyse/recette-figma.txt` les cartes attendues pour chaque geste.

| N° | Geste du mainteneur | Ce qu'il vérifie |
|---|---|---|
| R1 | Analyser Button sur la copie intacte. | Constats propres au fichier, comptés avant tout geste. Temps noté. |
| R2 | Supprimer l'instance de règles de Button, puis Analyser. | Une carte C43, ou deux (C43 et C44) : noter le nombre. Appliquer pose l'instance. L'Historique la défait. |
| R3 | Déplacer l'instance de règles sur une autre page. | C43 et C44 ensemble ; ce que `creer` écrit sur la page du composant. |
| R4 | Vider le calque de nom de l'instance, puis le remplir de « [À compléter] ». | Carte C43 ou C44 ; Appliquer remplit l'orphelin ou en pose un second. |
| R5 | Retirer la règle d'une propriété, puis celle d'une valeur. | Cartes `sans-regle` et `sans-valeur` décochées. Appliquer, puis relire, ne montre plus rien. |
| R6 | Renommer une propriété en `show-icon`, puis une valeur en `1.5`. | Noter les constats C45 (deux constats pour une propriété, deux `sans-regle` sans correction). |
| R7 | Poser deux instances de règles pour le même composant. | C44 « plusieurs instances » ; noter laquelle C45 lit. |
| R8 | Poser l'instance de règles dans une instance d'un autre composant. | Noter si C44 compte l'instance parente. |
| R9 | Nommer un calque « masqué », puis un autre « Variable introuvable ». | Codes des points du moteur ; noter les écarts avec M2. |
| R10 | Poser un padding en dur, un rayon en dur et un style de texte absent. | Élément du panneau de chaque constat C30. |
| R11 | Analyser Input (720 variants). | Bannière partielle : nombres, cause, absence de « N sur N ». Temps noté. |
| R12 | Retirer la library choisie, puis lancer Analyser. | Écran « Library à choisir » ou repli dit. Aucun « Aucun constat ». |
| R13 | Cliquer Annuler à trois moments de l'analyse de Button. | Écran « annulée », aucun constat, nouvelle analyse servie. |
| R14 | Cliquer Analyser deux fois de suite, puis Analyser pendant un Appliquer. | Retour visible pour la demande refusée ; l'écriture continue. |
| R15 | Modifier un calque pendant l'analyse, puis Ctrl+Z après un Appliquer. | Péremption une fois, constats gardés sans case, note en tête. |
| R16 | Sélectionner un autre jeu pendant l'analyse. | Analyse périmée, aucune fuite, nouvelle analyse possible. |
| R17 | Ignorer tous les constats, puis chercher « Ne plus ignorer ». | Le geste reste atteignable. |
| R18 | Sélectionner Button, attendre 3 secondes, cliquer Analyser, puis recommencer en écrivant pendant l'attente. | Temps du clic après prélecture ; aucune erreur après l'écriture. |
| R19 | Passer le fichier en « libre » pendant que le panneau est ouvert. | Écran hors UCM, Analyser caché. |

Le niveau AAA rangé dont la lecture échoue n'a aucun geste connu : la preuve reste aux cas N2.

## 8. Lots d'exécution

Le plan d'ensemble reste dans la conversation principale. Un lot par appel d'agent, au plus deux lots en parallèle. Après chaque lot, la conversation relit le diff, un `verificateur` relance les vérifications, puis `npm run agents:diff`. Le prompt de chaque implémenteur contient la note du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`. L'ordre est 0, 1, puis 2 avec 3, puis 4 avec 5, puis 6 avec 7, puis 8, 9, 10, 11, 12.

| Lot | Fichiers | Agent | Critères de fin |
|---|---|---|---|
| 0 Cadre commun | `packages/kit/tests/stress/commun/` | `implementeur` | Le lot 0 de F2 est livré, `comparer` accepte une clé fournie par la famille (code, propriété ou point, statut). `npm run typecheck` passe. |
| 1 Bases et injecteur | `packages/plugin-architect/scripts/stress/f8-analyse/profilsRegles.ts`, `pageDeRegles.ts`, `scenarioDeBase.ts`, `corpusDuMoteur.ts`, `injecteur.ts` | `implementeur-exigeant` | Les 48 profils de règles ne donnent ni C43 ni C45. Les 72 profils d'analyse donnent `complete`. Le corpus compte 40 gabarits et le contrôle de couverture des sites du socle passe. Un cas qui ne lève aucune panne rend un résultat identique à une analyse sans injecteur. Deux cas de suite ne partagent aucun état. Le lot 1 dépend du lot 1 de F3-F4 (`composantDeBase`). |
| 2 Opérateurs de règles et d'écriture | `operateursRegles.ts`, `operateursEcriture.ts` | `implementeur` | Les opérateurs rendent 21 + 58 + 6 + 36 = 121 cas. Chaque cas a un oracle rédigé. Les verdicts `mesure` sont marqués. |
| 3 Opérateurs du moteur | `operateursMoteur.ts` | `implementeur` | Les opérateurs rendent 114 cas. La recherche d'une collision d'empreinte est bornée à 200 000 essais et reproductible. Les lots 2 et 3 touchent des fichiers distincts et peuvent tourner ensemble. |
| 4 Opérateurs de lectures et de budget | `operateursLectures.ts`, `operateursBudget.ts` | `implementeur-exigeant` | Les opérateurs rendent 40 + 20 + 8 + 30 = 98 cas. Le monde du budget se bâtit sans modifier `tests/outils/`. Chaque cas Bd1 déclare le total de layers et le point de coupe attendu. |
| 5 Opérateurs de cycle | `operateursCycle.ts` | `implementeur-exigeant` | Les opérateurs rendent 37 + 39 + 25 + 25 + 11 + 13 = 150 cas. Chaque frontière de phase est un point de passage nommé. Les lots 4 et 5 touchent des fichiers distincts et peuvent tourner ensemble. |
| 6 Opérateurs d'états et faux positifs | `operateursEtats.ts`, `fauxPositifs.ts` | `implementeur` | Les opérateurs rendent 20 + 19 + 19 + 38 = 96 cas, et le lot rend les 19 et 16 thèmes ciblés de la section 4. |
| 7 Combinaisons et relations | `oracle.ts`, `combinaisons.ts`, `metamorphiques.ts`, `appliquer.ts` | `implementeur-exigeant` | 340 paires et 170 triples, plus 36 interactions, rendent des oracles sans zone ni point de passage partagé. Les relations M-1 à M-5 s'appliquent sans changer la base. Les lots 6 et 7 peuvent tourner ensemble. |
| 8 Chaîne et écran | `chaine.ts`, `ecran.ts`, `rejeu.ts`, `signatures.ts` | `implementeur-exigeant` | Les 129 cas D s'exécutent. Le faux DOM rend les écrans, les bannières, les sections tenues et les cases. Le rejeu saute sans erreur une capture absente. |
| 9 Exécuteur et rapport | `executer.ts`, `rapport.ts`, `packages/plugin-architect/package.json` (script `stress:analyse`) | `implementeur` | `npm run stress:analyse --workspace ucm-architect-plugin -- --graine 7108` finit sur 1 409 cas, imprime le tableau de la section 5.4, écrit `rapport.json` et `rapport.txt`, et rejoue un cas par `--cas`. Deux exécutions donnent le même rapport. Le temps mesuré est noté. `npm run typecheck` passe. |
| 10 Mesure de l'existant | aucun fichier de code | `verificateur`, puis la conversation principale | `rapport.txt` du code actuel est lu en entier. Chaque écart est classé et rattaché. Les 24 hypothèses de la section 6.1 sont confirmées ou infirmées, et le résultat entre dans `MESURE-DES-FAILLES.md`. Les tableaux des écarts nouveaux et des cas `mesure` sont remis au mainteneur. |
| 11 Régression | `packages/plugin-architect/tests/reglesEtMoteurStress.test.ts`, `etatsDeLAnalyseStress.test.ts` | `implementeur` | Les deux fichiers couvrent chaque écart classé au lot 10. `npm test` passe, les écarts non corrigés portent `todo`, et les deux fichiers durent moins de 15 secondes. |
| 12 Scénario de recette | `recette.ts`, sortie `recette-figma.txt` | `implementeur` | Le fichier donne, pour R1 à R19, les cartes attendues d'après l'oracle. Le mainteneur le lit avant la recette. |

## 9. Questions au mainteneur

Les décisions Q-F2-7 (un seul document, `MESURE-DES-FAILLES.md`) et Q-F2-9 (tests `todo` dans `npm test`) s'appliquent ici. La conversation principale retient chaque proposition comme décision provisoire, que le mainteneur peut revoir. Les cas liés restent `mesure` dans le rapport, comptés à part, jusqu'à sa confirmation.

| Id | Question | Proposition |
|---|---|---|
| Q-F89-1 | Une règle écrite `show-icon` ou `show_icon` vise-t-elle la propriété `Show Icon` ? | Oui. La comparaison retire espaces, tirets, soulignés et casse. Le suffixe d'identifiant Figma (`#1:2`) est retiré aussi. |
| Q-F89-2 | Une règle `@prop` qui vise une valeur inexistante (`Size.xxl`) est-elle un constat ? | Oui, C45 `valeur-inconnue`, sans correction, dans À faire, avec la règle et l'axe cités. |
| Q-F89-3 | Une lecture refusée des dépendances rend-elle l'analyse partielle ? | Non. Elle interdit seulement la reprise d'une entrée. Elle reste une trace dans la mesure, pas à l'écran. Règles, niveau, ignorés et déclaration refusés rendent `partielle`. |
| Q-F89-4 | Un repli sur le catalogue du fichier, parce que la library ne se lit pas ou que ses collections sont inaccessibles, rend-il l'analyse partielle ? | Oui. La bannière nomme la library et dit que les tokens sont lus dans le fichier. |
| Q-F89-5 | Une instance de règles sur une autre page compte-t-elle ? | Non : le scan reste borné à la page du composant. C43 reste, le point C44 « aucune instance » du moteur tombe (Q-09), et le statut de C43 dit que l'instance de l'autre page n'est pas lue. |
| Q-F89-6 | Un conteneur au calque de nom vide ou resté « [À compléter] » reçoit-il une nouvelle instance ou est-il rempli ? | Il est rempli : C43 propose d'écrire le nom dans l'orphelin, jamais d'en poser un second. |
| Q-F89-7 | Deux composants dont les noms compactés sont égaux (`Icon Button`, `IconButton`) partagent-ils un conteneur ? | Non : un constat dans À faire dit que deux composants portent le même nom compacté. |
| Q-F89-8 | Quand deux conteneurs écrivent le même composant, quelles règles C45 lit-il ? | Celles du premier dans l'ordre de la page, comme l'export. C44 dit déjà que l'autre est ignoré. |
| Q-F89-9 | Un conteneur posé dans une instance d'un autre composant fait-il compter l'instance parente ? | Non : seule l'instance la plus proche du calque de nom compte. |
| Q-F89-10 | Quels points `proprietes` du moteur deviennent C34 ? | Les combinaisons manquantes, les états non reconnus et les états tolérés. « Aucun variant » devient un constat bloquant C42. « Aucune propriété définie » et les collisions de noms deviennent C42 à vérifier. |
| Q-F89-11 | Dans quel élément du panneau vont les points de l'opacité et des effets ? | Tokens. Marges, espacement, rayon et contour vont en Tailles ; remplissage et contour de couleur en Couleurs ; style de texte en Texte. |
| Q-F89-12 | Ignorer un constat du kit fait-il taire le point du moteur de même clé (layer, champ) ? | Oui : la clé suffit, le doublon ne revient pas. |
| Q-F89-13 | Une propriété sans règle et une règle sans propriété au nom voisin (`Palette`, `Palete`) forment-elles un seul constat ? | Oui : un constat « règle probablement renommée », sans correction, qui cite les deux noms. |
| Q-F89-14 | Quel écran l'emporte quand plusieurs états se superposent ? | Arrêtée, annulée, périmée, partielle, complète, dans cet ordre. |
| Q-F89-15 | Que montre l'écran d'un constat périmé : la liste gardée, ou une note seule ? (E-38) | La SPEC : la liste reste, sans case active, sous une note « Actualisez ». La SPEC est la règle écrite. |
| Q-F89-16 | Que montre une analyse partielle des éléments sans constat ? | Aucune section « tenue » : une coche dirait que l'élément a été contrôlé. |
| Q-F89-17 | Que dit une demande refusée pour `occupe` ? | La ligne existante « Une opération est déjà en cours. » (`textes/preparation.ts`), sans toucher à l'écriture affichée. |
| Q-F89-18 | Quand tous les constats sont ignorés, que montre l'écran ? | « Aucun constat visible, N ignorés », avec la liste des ignorés et « Ne plus ignorer ». |
| Q-F89-19 | Le relevé et le moteur peuvent-ils compter les layers de la même façon, et le premier variant est-il borné ? | Une seule fonction de décompte. Un variant dont le décompte lève est une lecture manquée de ce variant, sans couper les suivants. Le premier variant reste lu sans borne, avec une information quand il dépasse 2 000 layers. |
| Q-F89-20 | La prélecture et un Analyser sans library choisie sont-ils permis quand plusieurs libraries sont candidates ? | Non, pour la prélecture et pour toute nouvelle analyse : la garde « library à choisir » passe dans le sandbox. |
| Q-F89-21 | L'identifiant d'un point du moteur peut-il inclure les éléments du point ? | Oui : l'empreinte porte le titre, les nœuds et les éléments, ce qui rend le suffixe de rang inutile pour les points distincts. |
