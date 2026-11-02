# Plan de stress test F3 et F4, liaisons et tailles du mode Composant

Ce plan décrit le harnais qui mesure les contrôles de liaison et de taille du mode Composant sur 1 025 cas fabriqués, depuis le constat du kit jusqu'à la ligne écrite dans Figma. Il ne corrige aucun code : il produit la mesure de l'existant, puis des tests de régression en attente des corrections. Il prolonge les familles F3 (Liaisons) et F4 (Tailles) de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md) (sections 4.2, 4.3, 6.3, 7 et 8). Les deux familles partagent un générateur de composant, donc un seul plan. La forme suit [PLAN-STRESS-F2-STRUCTURE.md](./PLAN-STRESS-F2-STRUCTURE.md).

## 1. Portée

| Contrôle | Source | Genres couverts |
|---|---|---|
| C16, C22 (issu de C15) | `packages/kit/src/controles/mapping.ts`, `corrections.ts` (`corrigerAxe`) | segment d'état, de palette, de style ou de taille différent du variant |
| C24 (issu de C17) | `mapping.ts` (`rolesAdmis`), `corrections.ts` (`corrigerRole`) | rôle du token hors des rôles admis pour le layer |
| C18, C19, C21 | `mapping.ts` | scope incompatible, token d'un autre composant, liaison hors de la majorité de la fratrie |
| C20, C80 | `couche.ts` | alias vers une couche non admise, liaison directe hors de `components` |
| C24 de propagation, C81 | `propagation.ts` | liaisons d'un variant modèle reprises ailleurs, carte du modèle |
| C25 | `corrections.ts` (`constatsManquantsParEtapes`, `corrigerLiaisonManquante`) | peinture unie visible sans token |
| C59 | `theme.ts` (`controlerLeTheme`) | texte lié à `surface/foreground` sans fond de surface |
| C63 `vide` et `theme` | `structure.ts` (`controlerLaStructure`) | token de palette sans valeur dans un mode, token qui vise `brands` à segment de mode |
| C29 (F4) | `corrections.ts` (`corrigerValeurEnDur`), `candidatsDeLongueur.ts` | valeur en dur exacte, proche, sans token, recherche incomplète |
| Assemblage | `packages/plugin-architect/src/sandbox/analyse.ts`, `src/constatsDuMoteur.ts` | ordre des familles, correction, ignorés, doublons C30 avec C25 et C29 |
| Écran | `src/ui/panneau/elements.ts`, `src/ui/corrections/`, `src/ui/questions/`, `src/ui/ignores/modele.ts` | cartes, cases cochées, questions, À faire |
| Écriture | `src/ecriture/liaisons.ts` | sauts `objet-change`, `fait-faux`, `cible-introuvable` |

Hors plan. Les corrections du code (E-25 à E-45 compris), les familles F5 à F9 (C7 à C13, C31 à C33, C43 à C45, C49 à C53, C64 à C67, C30 hors doublon), les contrôles du mode Tokens (C60 et C63 du catalogue), la Nomenclature, la migration d'un fichier Figma et `test:ui`.

## 2. Oracle

### 2.1 Principe

L'oracle est écrit à partir des opérateurs de dégradation et des règles écrites : `rolesAdmis` et `porteeAttendue` de l'inventaire (section 4.2), `CIBLES_DES_COLLECTIONS` et `ciblesAdmises` de `architecture.ts`, `SUPPORT_DES_VARIABLES` de `emplois/dossiers.ts` pour les scopes, la règle de proximité de [SPEC.md](../../../../../packages/plugin-architect/SPEC.md) pour C29 et les réponses Q-03, Q-06, Q-09 et Q-11. Il ne rejoue jamais le code mesuré. Chaque opérateur déclare ce qu'il casse et ce que le plugin doit dire.

Chaque cas porte un verdict.

| Verdict | Sens |
|---|---|
| `attendu` | La règle est écrite (inventaire, référentiel, réponse Q). Un écart est un défaut. |
| `mesure` | La règle dépend d'une réponse du mainteneur (section 9). Le rapport compte l'écart à part et ne le qualifie pas. |

Les noms d'axes hors des listes de `nommage.ts` (`Type`, `Tone`, `Kind`) restent `mesure` tant que la liste de Q-08 n'existe pas. F5 la produit, F3 la consomme.

### 2.2 Correction exacte

Une correction est exacte quand les cinq conditions tiennent. Une règle écrite la produit (rôle de la table, valeur d'axe du variant, propriété du registre, valeur de longueur égale). Un seul candidat répond. La cible est une variable présente de `components` dont le premier segment est le jeu : un layer ne se lie jamais directement à `theme` ni à `layout`. Le layer est visible et n'est pas une instance imbriquée. La correction arrive décochée (Q-03). Hors de ces conditions, l'oracle attend un constat sans correction. S'il attend une question, elle ne présélectionne aucune réponse : rien n'est coché ni envoyé avant le clic.

### 2.3 Propriétés

| Id | Assertion vérifiable | Constats, écarts, décisions |
|---|---|---|
| P1 | Les 96 profils valides de la section 3.2 ne produisent aucun constat des codes de la portée. Les constats d'autres familles du kit sont comptés à part, sans verdict. | tous |
| P2 | Chaque dégradation fait émettre les constats que son opérateur déclare, avec le code, le variant, le layer et le champ attendus (colonne « manqués »). | tous |
| P3 | Aucun constat de la portée n'est émis hors de ceux que l'opérateur déclare (colonne « faux constats »). | tous |
| P4 | Une correction est émise si et seulement si l'oracle la juge exacte. Sinon le constat n'a pas de correction, et sa question ne présélectionne rien (colonne « corrections inexactes »). | règle produit |
| P5 | `cible` (layer, champ, indice, plage, variable de départ), `avant` et `apres` d'une correction égalent ceux de l'oracle. | C16, C22, C24, C25, C29 |
| P6 | Toute correction de liaison a pour arrivée un token de `components` du jeu. Aucune ne vise `theme`, `layout`, `brands`, `utility` ni `primitives`. | règle « layer vers ses tokens » |
| P7 | Appliquer les corrections exactes au relevé, puis relire, donne zéro constat de leurs codes et aucun constat nouveau. | C16, C22, C24, C25, C29 |
| P8 | Mélanger l'ordre des variants, des layers, des variables du catalogue ou renommer les identifiants laisse les mêmes constats, aux identifiants près. L'entrée n'est pas modifiée. Les identifiants de constat sont uniques et stables d'un appel à l'autre. | tous |
| P9 | Toute peinture unie visible, sur un layer visible hors instance imbriquée, sans liaison de cette peinture, donne un C25, quel que soit le type du layer. Une peinture masquée, d'opacité nulle, en dégradé, en image ou liée ne donne rien. | Q-06, E-25 |
| P10 | C29 classe la valeur lue : exact (même valeur dans tous les modes), proche (écart d'au plus `min(2, 0,1 × max(\|v\|, 1))` px, au plus le plus proche de chaque côté, jamais pour 0 ; deux proches à égalité restent `mesure`, Q-F3-11), sinon aucun candidat ; `recherche: incomplete` dès que `components` ne se lit pas ou qu'un candidat n'est pas chargé. Un proche n'est jamais une correction. | F4, SPEC |
| P11 | Toute correction arrive décochée au premier affichage, à la relecture et après l'ajout d'une correction. Le pied dit qu'aucune n'est cochée et Appliquer est inactif. Chaque section porte « Tout cocher » et « Tout décocher », et le panneau les mêmes boutons pour toutes. | Q-03, E-34 |
| P12 | Un écart que le kit et le moteur de l'exporteur signalent tous deux (C25 ou C29 avec C30, C43 avec C44) donne une seule carte, celle du constat du kit. | Q-09, E-30 |
| P13 | Chaque carte de question offre Ignorer et « Ne plus proposer ». Ignorer range le constat sous Ignorés, et « Ne plus ignorer » le rend. « Ne plus proposer » retire la proposition et laisse le constat en À faire. | Q-11, E-35 |
| P14 | Tout constat visible (ni ignoré, ni `info`) apparaît une fois : en carte de corrections s'il porte une correction, en carte de question s'il porte une question à candidats, sinon en À faire. Un constat `info` va dans Informations. | E-28 |
| P15 | La carte d'un constat a un genre, une phrase et un statut lisibles : elle nomme le layer, le champ et les tokens d'avant et d'après, et n'emploie ni la phrase de repli de `T.sansPhrase` ni « Constat C63. ». | E-28, E-36 |
| P16 | Toute ligne que l'écran propose de cocher est écrite par `ecrireLeLot` sur un double de Figma, ou sautée avec un motif que l'écran dit. Une sorte de correction que l'écriture ne sait pas faire (`alias-de-mode`) s'affiche sans case. La variable liée est celle de `apres.cle`. | E-28 |
| P17 | Aucun contrôle ne lève sur une entrée dégradée (cycle de `parent`, identifiant dupliqué, variable sans valeurs, alias en cycle, nom vide). | robustesse |
| P18 | Une liaison illisible, une peinture mixte, une variable non chargée ou une collection inaccessible ne produit aucune accusation. L'analyse est partielle et l'écran ne dit pas « Aucun constat ». | E-31, E-33 |
| P19 | Hors UCM, ni C59 ni C63 ne sortent. Une collection sans rôle ne produit ni C20 ni C80. | inventaire, section 4 |
| P20 | Une liaison que l'instance tient sans changement de son composant principal n'est jugée par aucun contrôle de liaison de l'hôte. | `couche.ts`, E-42 |
| P21 | Deux corrections qui visent la même liaison se composent : une seule carte, un seul token d'arrivée, ou une question. Appliquer les deux ne produit pas de saut `fait-faux`. | règle produit |

### 2.4 Colonnes du rapport

| Colonne | Définition |
|---|---|
| Attendus | Constats que l'oracle déclare pour les cas de l'opérateur. |
| Détectés | Attendus que le plugin émet avec le bon code, variant, layer et champ. |
| Manqués | Attendus que le plugin n'émet pas (P2, P9). |
| Faux constats | Constats de la portée que l'oracle ne déclare pas (P3). |
| Corrections inexactes | Corrections émises à tort, vers une mauvaise cible, qui visent hors du composant ou qui ne convergent pas (P4 à P7, P10, P21). |
| Non affichés | Constats sans trace à l'écran, ou affichés deux fois (P12, P14). |
| Illisibles | Cartes sans phrase propre (P15). |
| Cochées | Corrections cochées à l'affichage, boutons manquants (P11, P13). |
| Non écrites | Lignes cochables que l'écriture ne fait pas ou saute sans motif lisible (P16). |
| En attente | Écarts sur des cas `mesure`, comptés à part. |

## 3. Générateur

### 3.1 Composant de base

Le générateur fabrique un `ReleveDeComposant` et un `CatalogueDeReference` cohérents, sans constat, ainsi qu'une carte (`CarteDuComposant`) qui donne, pour chaque layer, chaque champ et chaque variant, la clé du token attendu. Les opérateurs et l'oracle lisent cette carte. Les fixtures existantes (`packages/plugin-architect/tests/fixturesDeComposant.ts`) décrivent un composant par ses calques de maquette et n'ont pas de relevé, donc elles ne conviennent pas.

| Couche | Contenu du composant de base |
|---|---|
| Relevé | Un variant par combinaison des axes, chacun avec les mêmes layers : `Root` (FRAME, fond lié, trait lié, quatre marges, espacement, rayon, épaisseur liés), `Label` (TEXT, une ou deux plages liées), `Icon` (VECTOR, fond lié), `Ring` (RECTANGLE, trait lié). Avec le drapeau « imbriqués » s'ajoutent une instance `Glyph` (dépendance pilotée par INSTANCE_SWAP), une instance `.Bar` (pièce interne) et une instance `SizeWrapper` (wrapper de dimensions), dont les liaisons portent la provenance `composant-principal`. |
| `components` | Un token de couleur par rôle et par combinaison d'axes, `<Jeu>/color/<palette>/<style>/<taille>/<état>/<rôle>` dans l'ordre de la grammaire, en alias vers `theme`. Un token de taille par propriété et par taille, `<Jeu>/size/<taille>/<propriété>`, en alias vers `layout`. Scopes larges (`ALL_FILLS`, `STROKE_COLOR` pour `border` et `ring`) ou précis (`FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`). |
| `theme` | Les rôles de trois palettes (`primary`, `neutral`, `danger`) lus dans `VARIABLES_DE_PALETTE`, deux modes `Light` et `Dark`, scopes de `SUPPORT_DES_VARIABLES`. Une version réduite écrite pour F3 : le plan ne dépend pas du lot 1 de F2. |
| `layout`, `typography`, `brands`, `primitives` | `layout/sizing/<n>` en FLOAT, une rampe de `brands` à segment de mode et un style de texte pour que chaque opérateur ait une cible à viser. |

Les valeurs de longueur des tokens de taille viennent d'une échelle fixe (4, 8, 12, 16, 24 px) tirée de la graine, de sorte que la valeur lue d'un layer soit toujours celle de son token. Le générateur écrit les noms avec `assembler`, `decouperSegment` et `motsAvecCasse` du kit. Une écriture ne dépend donc que de la convention choisie. Les identifiants de variant et de layer suivent le motif de Figma (`12:34`, `12:34;56:78`).

### 3.2 Profils de base

| Dimension | Valeurs | Nombre |
|---|---|---|
| Forme du jeu | `alert-11` (Severity de 4 valeurs et Variant de 3 valeurs, moins une combinaison, comme la galerie), `button-36` (Palette de 3, Style de 2, State de 3, Size de 2), `button-216` (Style, Palette, State, Size dans l'ordre de la galerie, 3 × 6 × 4 × 3), `switch-4` (State seul), `divider-1` (aucun axe de variant), `badge-9` (Type et Tone, noms d'axe hors liste) | 6 |
| Scopes des tokens | larges, ou précis (`FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`) | 2 |
| Imbriqués | sans, ou avec `Glyph`, `.Bar` et `SizeWrapper` | 2 |
| Texte | une plage, ou deux plages de couleurs différentes | 2 |
| Modes des tokens de taille | un mode, ou deux modes de même valeur | 2 |

Le produit donne 96 profils (p001 à p096). Les opérateurs de la section 3.3 s'appliquent à un seul profil de référence, P0 : `button-36`, scopes larges, avec imbriqués, deux plages, un mode. P0 fait partie des 96. Les nombres de la section 3.3 sont des cas sur P0, et chaque cas se nomme `<opérateur>-<n>`. Les opérateurs qui demandent deux modes, un autre ordre de propriétés ou une autre forme changent eux-mêmes la base du cas et le disent. Les combinaisons de la section 3.4 tournent sur 3 profils : P0, un profil `alert-11` aux scopes précis, avec imbriqués, deux plages et deux modes (Pα), et un profil tiré de la graine.

### 3.3 Opérateurs de dégradation

Le verdict est `attendu` sauf mention contraire. « Corr. » dit si l'oracle attend une correction exacte. Toute correction attendue arrive décochée.

**Liaisons d'axe (C16, C22)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| L1 | Token d'un autre état. Quatre transitions (variant hover lié au token default, variant default lié au token hover, variant default lié au token disabled, variant disabled lié au token default) sur 4 liaisons (fond et trait de `Root`, texte `Label`, icône `Icon`) : 16. Deux sur une plage de texte et deux sur une surcharge d'instance de `Glyph` : 4. | 20 | C16 sur le variant, le layer et le champ | oui, vers le token de l'état du variant ; pour hover lié à default, une question avec l'indice des autres variants |
| L2 | Token d'une autre palette. Trois permutations (primary lu sur danger, danger sur neutral, neutral sur primary) sur 4 liaisons : 12. Token de la bonne palette absent : 2. Token de la bonne palette en double : 2. | 16 | C22 | oui pour les 12 premiers ; question sans candidat pour l'absent ; question à deux candidats pour le double |
| L3 | Token d'un autre style (solid lu sur outline, outline lu sur solid) sur 4 liaisons. | 8 | C22 | oui |
| L4 | Token d'une autre taille (sm lu sur md, md lu sur sm) sur les 5 propriétés `padding-x`, `padding-y`, `gap`, `radius`, `border-width`. | 10 | C22 sur le champ numérique | oui |
| L5 | Palette et état faux ensemble, sur le fond et le texte : 2 (`mesure`, Q-F3-12). Segment de valeur hors des valeurs de l'axe (`Ghost`) : 2. Token sans segment d'état alors que le variant en a un : 2. | 6 | aucun constat pour les 4 derniers (C7 relève de F5) | non |

**Rôles (C24, issu de C17)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| R1 | Rôle hors table. Fond de `Root` lié à `foreground`, `text`, `icon`, `border` ou `ring` : 5. Trait lié à `background`, `text`, `icon` ou `ring` : 4. Texte lié à `background`, `icon`, `border` ou `ring` : 4. Icône liée à `background`, `text`, `border` ou `ring` : 4. `Ring` lié à `background`, `border`, `foreground`, `text` ou `icon` : 5. | 22 | C24 avec le rôle attendu (`background`, `border`, `foreground`, `icon`, `ring`) | oui, vers le token de même chemin au rôle attendu |
| R2 | Rôle attendu absent du catalogue : 3. Rôle attendu en double (deux variables de même nom) : 2. | 5 | C24 sans correction ; question à deux candidats pour le double | non |

**Cibles (C19, C80, C20, C18)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| K1 | Token d'un autre composant (`Alert`, `ButtonGroup`) sur 4 liaisons : 8. Même token sur une surcharge d'instance de `Glyph` : 2 (`mesure`, Q-F3-8). | 10 | C19, sans C16 ni C24 | non |
| K2 | Liaison directe hors de `components`. Couleur liée à `theme` (fond, trait, texte, icône) : 4. Taille liée à `layout` (marge, espacement, rayon, épaisseur) : 4. Couleur liée à `primitives`, `brands` ou `utility` : 3. Témoins sans constat : `fontSize` lié à `typography`, et un fond hérité d'une pièce interne : 2. | 13 | C80 seul pour les 11 premiers (E-42), sans C20 | non |
| K3 | Alias d'un token de `components`. Couleur vers `brands`, `utility`, `primitives` ou un autre token de `components` : 4. Couleur vers `theme` : 1 témoin. Taille vers `primitives`, `brands` ou un token de `components` : 3. Taille vers `theme`, `layout` ou `typography` : 3 témoins. Chaîne à deux étages vers `theme` : 1. Alias de deux modes dont un seul vers une couche interdite : 2. Cible absente du catalogue : 1. Cible dans une collection sans rôle : 1. Les 3 cas qui visent un token de `components` (couleur, taille, chaîne) relèvent de Q-F3-15 (`mesure`). | 16 | C20 pour les 4 + 3 + 1 + 2 cas interdits ; aucun pour les autres | non |
| K4 | Scope incompatible. Six cibles (fond de `Root`, fond d'un RECTANGLE, fond de `Icon` VECTOR, texte plein, plage de texte, trait) × quatre jeux de scopes : précis compatible, large (`ALL_FILLS` ou `ALL_SCOPES`), incompatible (`TEXT_FILL` sur un frame, `FRAME_FILL` sur une forme, `SHAPE_FILL` sur un texte, `ALL_FILLS` sur un trait), vide. | 24 | C18 pour les 6 jeux incompatibles ; aucun pour les 18 autres | non |

**Fratrie, modèle et propagation (C21, C24 de propagation, C81)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| M1 | Intrus dans la fratrie de `button-36`. 1 un intrus. 2 deux intrus. 3 un intrus qui porte les valeurs de son variant. 4 jeu de 3 variants, majorité de 2. 5 jeu de 2 variants. 6 égalité de 18 contre 18. 7 intrus sur une surcharge. 8 intrus sur un champ numérique. 9 intrus sur une plage de texte. 10 intrus dans un seul des deux modes. | 10 | C21 pour les cas 1, 2, 4, 7, 8, 9 et 10 ; aucun pour 3, 5 et 6 (E-41) | non |
| M2 | Variant modèle et variants nus. 1 modèle complet, tous les autres nus. 2 un seul variant nu. 3 couleurs seules. 4 tailles seules. 5 deux modèles à égalité. 6 layer propre à un variant. 7 deux layers homonymes sous un parent. 8 homologue déjà lié au bon token. 9 homologue lié à un autre token. 10 token du modèle à nom illisible pour la grammaire. 11 liaison directe à `theme` dans le modèle. 12 deux candidats pour le nom visé. 13 source non chargée. 14 peinture absente chez le visé. 15 plages de texte différentes. 16 liaison de surcharge dans le modèle. | 16 | C81 et un C24 par layer et par variant visé ; aucun pour 8, 16 ; question sans candidat pour 7 ; 6 et 14 `mesure` (Q-F3-7), 9, 10 et 11 `mesure` (Q-F3-6) | oui pour 1 à 5, 12 si un seul candidat, 15 ; non ailleurs |

**Peinture sans token (C25, Q-06)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| U1 | Peinture unie en dur, par type de layer : fond FRAME, trait FRAME, RECTANGLE, ELLIPSE, VECTOR nommé `icon`, VECTOR nommé autrement (`mesure`, Q-F3-4), BOOLEAN_OPERATION, TEXT nommé `title`, TEXT nommé `Label`, plage de texte, fond d'INSTANCE (`mesure`, Q-F3-2). Chacun avec un candidat unique, puis sans candidat. | 22 | C25 sur le layer, le champ et l'indice | oui avec un seul candidat, au rôle de la table (`background`, `border`, `icon`, `foreground`) ; non sans candidat |
| U2 | Témoins sans constat. Peinture masquée, d'opacité 0, dégradé, image, peinture liée, peinture de surcharge, lecture mixte : 7. Layer masqué et ancêtre masqué : 2 (`mesure`, Q-F3-1). | 9 | aucun C25 | non |
| U3 | Ordre des propriétés du jeu. Cinq ordres (grammaire, inverse, State en tête, Size en tête, ordre de la galerie Button) × trois rôles (fond, texte, trait). | 15 | C25 | oui, le même token quel que soit l'ordre |
| U4 | Choix du candidat. 1 token de l'élément `Icon` seul candidat pour le fond de `Label`. 2 même cas pour le fond de `Root`. 3 texte avec le seul rôle `text`. 4 texte avec `foreground` et `text` présents. 5 variant `Hover` et token `hover`. 6 variant `Default` et token `rest`. | 6 | C25 ; les cas 1 et 2 sans correction, le 4 en question à deux candidats ; 3, 5 et 6 avec correction | selon le cas |

**Thème dans un composant (C59)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| T1 | Texte lié à `surface/foreground`, selon le fond posé dessous : aucun fond, fond en dur, `surface/default`, `surface/hover`, `surface/pressed`, `surface/subtle` (`mesure`, Q-F3-10), `solid/default`, `page/foreground`, fond porté par un ancêtre à trois niveaux, fond porté par un frère. Chacun par liaison directe à `theme` puis par un token de `components` aliasé à `surface/foreground` (`mesure`, Q-F3-9) : 20. Plage de texte sans fond, direct et via token : 2. `page/foreground` absent du catalogue, ou en double : 2. | 24 | C59 pour aucun fond, fond en dur, `solid/default`, `page/foreground` et frère ; aucun pour `surface/default`, `hover`, `pressed` et l'ancêtre à trois niveaux | oui avec un seul token de `components` dont l'alias vise `page/foreground` ; sinon question |
| T2 | Liaison héritée d'une pièce interne à `surface/foreground` : 1. Liaison héritée d'une dépendance : 1. Liaison directe de `Root` à `surface/foreground` (C80 et C59, `mesure`, Q-F3-9) : 1. Trait lié à `surface/foreground` : 1. | 4 | `mesure` pour les quatre | non |

**Structure d'un composant (C63 `vide`, `theme`)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| S1 | Valeur vide, `components` à deux modes. 1 une seule sœur a une valeur. 2 deux sœurs, mode 1 vide. 3 deux sœurs, mode 2 vide. 4 trois sœurs, mode 1 vide. 5 valeur absente au lieu de `null` (`mesure`). 6 deux tokens vides dans le même mode, une seule sœur reste. 7 sœurs d'un autre rôle. 8 token vide dans les deux modes. | 8 | C63 `vide` avec les sœurs en candidats pour les cas 2, 3, 4 et 8 (deux constats) ; aucun pour 1, 6 et 7 | non, question sans présélection |
| S2 | Token qui vise `brands` à segment de mode. 1 mode 1. 2 mode 2. 3 les deux modes. 4 cible de thème en double. 5 aucune sœur. 6 sœur dont la cible de thème n'a pas de segment de palette. 7 palette absente du thème. 8 sœur qui vise elle-même `brands`. | 8 | C63 `theme` | oui pour 1, 2 et 3 (`alias-de-mode`, écrite selon Q-F3-5) ; question à deux candidats pour 4 ; question sans candidat pour 5, 7 et 8 ; aucune correction pour 6, dont la cible resterait celle de la sœur |
| S3 | Témoins. Alias vers `brands` sans segment de mode, alias vers `theme`, valeur directe, alias vers `primitives`. | 4 | aucun C63 ; C20 pour le dernier | non |

**Tailles (F4, C29)**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| Z1 | Valeur en dur exacte, un champ par cas : `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `itemSpacing`, `counterAxisSpacing`, `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`, `strokeWeight`. | 12 | C29 | oui avec un token exact unique, sauf `counterAxisSpacing` (aucune propriété du registre pour le dire) |
| Z2 | Valeur proche. Six valeurs (0,5, 4, 10, 16, 30, 100), bornes 0,1 / 0,4 / 1 / 1,6 / 2 / 2. Pour chacune, un token à la borne, juste en deçà de la borne, juste au-delà, côté inférieur puis côté supérieur : 6 cas. Les deux côtés présents : 1 cas. | 42 | C29 avec une question « proche » au plus une fois par côté, pour les écarts ≤ borne ; C29 sans candidat au-delà | non, jamais |
| Z3 | Flottants. Valeur 12 + δ face à un token de 12, et token de 12 + δ face à une valeur de 12, pour δ de 1e-12, 1e-9, 1e-6 et 0,01 : 8. `0,1 + 0,2` face à `0,3` : 1. | 9 | `mesure` pour les δ ≤ 1e-6 et `0,1 + 0,2` (Q-F3-11) ; proche pour δ = 0,01 | `mesure` pour δ ≤ 1e-6 |
| Z4 | Plusieurs candidats. 1 deux exacts (`padding-left` et `padding-x`). 2 un exact et un proche. 3 deux proches du même côté à égalité (`mesure`, Q-F3-11). 4 un proche de chaque côté. 5 trois proches du même côté. 6 deux exacts dont un d'élément qui nomme le layer. | 6 | C29 avec les candidats attendus | non |
| Z5 | Portée du token. Token d'une autre taille, d'un autre état, d'un autre composant : 3. Élément qui nomme le layer, élément qui ne le nomme pas : 2. Token sans segment de taille : 1. Token d'un axe hors liste (`Type`, `mesure`) : 1. Token alias de `layout`, résolu : 1. Alias en cycle, alias sur plus de 5 niveaux : 2. Token STRING : 1. Token à deux modes de valeurs divergentes (`mesure`, Q-F3-14), à deux modes égaux : 2. | 13 | C29 ; correction pour l'élément qui nomme le layer, l'alias résolu et les modes égaux | oui pour ces trois |
| Z6 | Recherche incomplète. `components` absente du catalogue, `components` inaccessible, candidat `non-chargee`, candidat `inaccessible` : 4. Variable non chargée qui n'est pas candidate : 1. | 5 | C29 avec `recherche: incomplete` pour les 4 premiers ; C29 ordinaire pour le dernier | non |
| Z7 | Périmètre du layer. Layer masqué, ancêtre masqué, instance imbriquée, instance sans parent, valeur 0, lecture manquée sur le champ, lecture manquée sur un autre champ du même layer, largeur fixe, hauteur fixe, valeur −4, valeur 4096, même identifiant de layer dans deux variants. | 12 | aucun C29 pour les 7 premiers et la largeur et la hauteur ; C29 pour −4, 4096, l'instance sans parent, l'autre champ, et deux C29 distincts pour le dernier | selon le cas |
| Z8 | Écriture du token. Dix propriétés (`padding-x`, `padding-left`, `padding`, `gap`, `border-width`, `border-radius`, `radius`, `border-width-top`, `icon-size`, `spacing`) × deux familles (`size`, `sizes`). | 20 | correction pour les propriétés du registre en famille `size` ; `mesure` pour `sizes` et `border-radius` (Q-F3-13) ; aucun candidat pour `padding`, `border-width-top`, `icon-size` et `spacing` | selon le cas |

**Entrées et lecture**

| Id | Dégradation | Cas | Constat attendu | Corr. |
|---|---|---|---|---|
| X1 | Lecture partielle. Variant non lu, `layersNonLus` inconnu, peinture mixte sur un texte, liaison `illisible` sur un fond de texte (C59), dans une fratrie (C21) et sur une peinture (C25), variable liée absente du catalogue, variable `non-chargee`, variable `inaccessible`, catalogue sans `components`, `components` inaccessible, catalogue vide. | 12 | aucune accusation sur ce qui n'a pas été lu (P18) | non |
| X2 | Entrées dégradées. Cycle de `parent`, deux layers de même identifiant dans un variant, deux variants de même identifiant, nom de jeu vide, propriétés vides, variant sans layer, variable sans valeurs, alias en cycle, collection orpheline, clé de variable en double, nom de variable vide, nom d'un seul segment. | 12 | aucune exception (P17) | non |

Le total de la section B est 60 (L) + 27 (R) + 63 (K) + 26 (M) + 52 (U) + 28 (T) + 20 (S) + 119 (Z) + 24 (X) = 419.

### 3.4 Combinaisons

Un pool d'environ 45 atomes est tiré des opérateurs L1 à L4, R1, K1 à K4, M1, U1, T1, S1, S2, Z1, Z2 et Z4. Chaque atome déclare la zone qu'il touche (variant, layer, champ). La liste est figée dans `combinaisons.ts`.

- 220 paires et 150 triples sont tirés avec la graine, sur les 3 profils de la section 3.2.
- Deux atomes se combinent seulement si leurs zones sont disjointes. L'oracle d'une combinaison est alors l'union des oracles des atomes, ce qui teste l'indépendance des contrôles.
- 30 cas d'interaction déclarée (10 couples, 3 profils) complètent les 370. Chaque couple a un oracle propre.

| Couple | Oracle attendu |
|---|---|
| L1 et K2 sur la même liaison (token d'un autre état, puis lien direct à `theme`) | C80 seul, aucune correction de liaison d'axe |
| L2 et R1 sur la même liaison (mauvaise palette et mauvais rôle) | une seule carte, un token d'arrivée qui change les deux segments, ou une question (P21) |
| L1 et M1 sur la même liaison (intrus de fratrie qui porte aussi l'état d'un autre variant) | un seul constat par liaison (`mesure`, Q-F3-16) |
| L2 et K1 sur la même liaison (token d'un autre composant à la mauvaise palette) | C19 seul |
| K4 et L1 sur la même liaison (état faux, scope incompatible de la cible) | C16 et C18, la correction ne cible qu'un token au scope compatible |
| M2 et U1 sur un même layer (peinture nue dans un variant que le modèle propage) | un seul token proposé par C25 et par C24, identiques, sinon une question |
| M2 et K2 sur le même modèle (liaison directe à `theme` propagée) | aucune propagation de la liaison directe (Q-F3-6) |
| Z1 et U1 sur un même layer (marge en dur et fond en dur) | C29 et C25 indépendants, deux cartes |
| Z2 et Z1 sur deux champs du même layer | une correction pour l'exact, une question pour le proche |
| S2 et K3 sur le même token (token qui vise `brands` à segment de mode) | C63 `theme` et C20 de la couche interdite, une seule proposition de cible |

### 3.5 Graine et total

La graine est 7103, avec le générateur pseudo-aléatoire à 32 bits `mulberry32` du cadre commun, dont le tirage suit l'ordre trié des identifiants de cas. Une même graine rend les mêmes cas.

| Section | Contenu | Cas |
|---|---|---|
| A | Faux positifs (section 4) | 139 |
| B | Opérateurs simples | 419 |
| C | Combinaisons | 400 |
| D | Chaîne sandbox, écran et écriture (section 5.3) | 67 |
| | Total | 1 025 |

Détail de B : L 60, R 27, K 63, M 26, U 52, T 28, S 20, Z 119, X 24. Détail de C : 220 paires, 150 triples et 30 interactions. Le rapport sépare F3 et F4 par le code du constat attendu (C29 pour F4).

## 4. Faux positifs

Les 96 profils de la section 3.2 doivent donner zéro constat (P1). Quarante-trois thèmes ciblés s'y ajoutent : chacun est écrit juste et ne doit rien produire, sauf mention contraire.

| Thème ciblé | Cas |
|---|---|
| Écritures d'une valeur d'axe : `Hovered` pour Hover, `rest` pour default, `Primary` et `primary`, `error` pour `danger`, `md` pour Medium, `selected-true`, `focused`, `Disabled` et `disable` | 8 |
| Rôles légitimes : `divider` sur un RECTANGLE nommé `Divider`, `divider` sur un trait, `inverse` sur un texte, `ring` en fond d'un layer nommé `ring` (ces quatre en `mesure`, Q-F3-3), `border` sur un trait, `foreground` sur un trait, `text` sur une plage, `foreground` sur une icône | 8 |
| Scopes précis : `FRAME_FILL` sur FRAME, `SHAPE_FILL` sur RECTANGLE, `SHAPE_FILL` sur VECTOR, `TEXT_FILL` sur TEXT, `STROKE_COLOR` sur un trait, `ALL_SCOPES` partout | 6 |
| Nom du jeu et préfixe du token : `Icon Button` et `IconButton`, `icon-button` et `IconButton`, `Alert` et `alert`, `Tile Link` et `TileLink` | 4 |
| Instances : pièce interne qui hérite de `theme`, wrapper de dimensions qui hérite de `layout`, dépendance avec une surcharge sur un token du composant, instance pilotée par INSTANCE_SWAP | 4 |
| Tailles : layer masqué, instance imbriquée, valeur 0, largeur et hauteur fixes, champ déjà lié, champ à lecture manquée | 6 |
| Fratrie : cinq états dont quatre partagent la même cible et un porte son propre token, fratrie à tokens distincts par palette, fratrie à un variant | 3 |
| Hors UCM : composant d'un fichier libre, collections sans rôle | 2 |
| Variables de library : token distant lié, token distant en candidat de taille | 2 |

Le total compte 8 + 8 + 6 + 4 + 4 + 6 + 3 + 2 + 2 = 43 thèmes. Chaque thème vérifie aussi P8, donc les 139 cas de la section A rejouent un ordre mélangé et des identifiants renommés.

## 5. Harnais

### 5.1 Emplacement

Le code vit hors de `npm test`, dans deux dossiers, selon le cadre commun de la section 7 de l'inventaire.

| Dossier | Contenu |
|---|---|
| `packages/kit/tests/stress/f3-composant/` | Hors de `tests/`, donc non découvert par `run-tests.cjs`. Le cadre commun (`prng.ts`, `types.ts`, `comparer.ts`) est dans `packages/kit/tests/stress/commun/`, livré par le lot 0 de F2. Ici : `composantDeBase.ts`, `profils.ts`, `carte.ts`, un fichier d'opérateurs par groupe (`operateursAxes.ts`, `operateursRoles.ts`, `operateursCibles.ts`, `operateursModele.ts`, `operateursPeinture.ts`, `operateursTheme.ts`, `operateursStructure.ts`, `operateursTailles.ts`, `operateursEntrees.ts`), `fauxPositifs.ts`, `oracle.ts`, `combinaisons.ts`, `metamorphiques.ts`, `appliquer.ts`. |
| `packages/plugin-architect/scripts/stress/f3-composant/` | `chaine.ts` (sandbox, écran, écriture), `atelierDuComposant.ts` (relevé converti en layers et variables du double de Figma), `executer.ts`, `rapport.ts`, `signatures.ts` (rattachement d'un écart à un E connu), `recette.ts`. |

Lancement, après construction du kit comme le font les scripts du plugin.

```sh
npm run stress:composant --workspace ucm-architect-plugin -- --graine 7103
```

Le script `stress:composant` de `packages/plugin-architect/package.json` appelle `node ../../scripts/construire-plugin.mjs verifier-kit architect` puis `npx tsx scripts/stress/f3-composant/executer.ts`. Options prévues : `--section A|B|C|D`, `--famille F3|F4`, `--operateur Z2`, `--cas Z2-14` (rejoue un cas et imprime le relevé, le catalogue, les constats et l'oracle), `--rapide` (P0 seul pour les sections B et C, pour une boucle courte) et `--strict` (sortie non nulle au premier écart `attendu`).

### 5.2 Appel du kit, de l'écran puis de l'écriture

1. Le générateur rend un `ComposantDeBase` (relevé, catalogue, carte) à partir d'un profil.
2. L'opérateur copie le composant (`structuredClone`), applique la dégradation et rend l'oracle du cas.
3. Le harnais appelle, dans l'ordre de `controlesDuKit` de `sandbox/analyse.ts`, `controlerMapping`, `controlerCouches`, `controlerLeTheme` et `controlerLaStructure`, puis `proposerLesCorrections` sur la somme des constats, comme le fait l'analyse. Pour les cas M, il appelle aussi `proposerLaPropagation` depuis le modèle et `candidatsDeModele`. Les autres familles du kit (nommage, oublis, typographie, accessibilité) tournent pour compter le bruit hors portée de P1.
4. Pour la chaîne, il appelle `traiterAvec(lecteurs)` de `sandbox/analyse.ts` avec des `Lecteurs` doubles (sujet, relevé, catalogue, moteur, ignorés) et un `Contexte` qui capte les messages, comme `tests/analyse.test.ts`. Le moteur double rend des points de la famille `variables` pour les cas du doublon C30.
5. Le harnais appelle `elementsDuPanneau` (rangement par élément), puis `monterLesCorrections` et `monterLesQuestions` sur le faux DOM de `tests/domDeTest.ts` (`poserLeDom`). Il lit les cartes, les cases, le pied, les boutons Ignorer et « Ne plus proposer ». `carteDAFaire` donne la phrase et le statut des constats sans proposition.
6. `atelierDuComposant.ts` bâtit un `atelierDEcriture` (`tests/figmaDeTest.ts`) depuis le relevé : un layer par layer lu, ses peintures, ses `boundVariables` et ses variables. Le harnais coche chaque ligne que `ecritLaLigne` accepte, appelle `ecrireLeLot` et lit le journal : liaisons écrites, sauts et motifs.
7. `appliquer.ts` applique au relevé et au catalogue les corrections du kit (liaison de peinture, de plage, de champ numérique ; propagation) pour P7, sans passer par Figma.

### 5.3 Cas de la chaîne (section D)

| Id | Cas | Nombre | Propriétés |
|---|---|---|---|
| D1 | Cases décochées. Six sortes de carte (jetons C16 et C22, rôle C24, lier C25, tailles C29, texte C59, modèle C24) au premier affichage puis à la relecture après une coche manuelle : 12. Boutons « Tout cocher » et « Tout décocher » d'une section, du panneau, pied « aucune cochée » avec Appliquer inactif : 5. | 17 | P11 |
| D2 | Cartes de question. Huit sortes (C16 hover, candidats multiples de C22 ou C24, C25, C29 proche, C29 à plusieurs exacts, C24 de propagation, C63 `vide`, C63 `theme`) × carte lisible, Ignorer, « Ne plus proposer ». | 24 | P13, P15 |
| D3 | Affichage de tous les codes. Un composant qui porte tous les codes de la portée, puis avec un constat ignoré, avec une question répondue, avec une analyse périmée, avec le provisoire, avec un constat `info`. | 6 | P14, P15 |
| D4 | Doublon du moteur (clé de Q-F3-17). C25 sur un fond, C25 sur une plage, C29 sur une marge, C29 sur un rayon, chacun avec le point C30 du moteur sur le même layer et le même champ. | 4 | P12 |
| D5 | Écriture. Fond, trait, plage de texte, champ numérique marge, champ numérique rayon, `alias-de-mode` de C63, layer changé (`objet-change`), `avant` changé (`fait-faux`), clé absente (`cible-introuvable`), deux corrections sur la même liaison, variant renommé entre l'analyse et l'écriture. | 11 | P16, P21 |
| D6 | États. Lecture partielle (manquées), moteur partiel, fichier déclaré libre, library à choisir, échec d'une lecture annexe (ignorés). | 5 | P18, P19 |

### 5.4 Rapport et temps

Le rapport s'écrit dans `_local/stress/f3-composant/` (dossier ignoré par Git) en deux fichiers, `rapport.json` et `rapport.txt`. Le `.txt` porte ce tableau, une ligne par opérateur.

| Opérateur | Cas | Attendus | Détectés | Manqués | Faux constats | Corrections inexactes | Non affichés | Illisibles | Cochées | Non écrites | En attente |
|---|---|---|---|---|---|---|---|---|---|---|---|

Il porte aussi le total par section et par famille (F3, F4), puis la liste des écarts. Chaque écart donne l'identifiant du cas, la propriété violée, l'écart connu rattaché (E-25 à E-45) ou la mention « nouveau », et la commande qui rejoue le cas.

Le temps d'exécution est à mesurer au lot 7. Le seuil visé est 180 secondes pour les 1 025 cas sur le poste du mainteneur. Les profils `button-216` comptent environ 1 300 layers, et la propagation (`layerHomologue`) relit tous les layers de chaque variant visé : si le seuil est dépassé, le lot 7 règle `--rapide` et réduit la propagation à P0, sans réduire le nombre d'opérateurs.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le `verificateur` lance le harnais sur le code actuel. La conversation principale lit `rapport.txt`, classe chaque écart (défaut, limite assumée, cas à trancher) et rattache les nouveaux à un identifiant. Elle présente au mainteneur le tableau des écarts nouveaux et celui des cas `mesure`. Rien n'est corrigé dans cette étape.

Écarts que la lecture du code laisse prévoir. Un essai en lecture seule, qui appelle les contrôles du kit sur des relevés fabriqués sans toucher au dépôt, a déjà confirmé ceux de la colonne « Essai ». La mesure confirme les autres.

| Hypothèse | Opérateur | Source | Essai |
|---|---|---|---|
| C25 bâtit son suffixe de token dans l'ordre des propriétés du jeu, pas dans celui de la grammaire. Avec State avant Palette, ou l'ordre Style, Palette, State, Size de Button, il ne trouve aucun candidat et pose une question sans candidat. | U3 | `corrections.ts` `corrigerLiaisonManquante` | confirmé |
| Dès que Q-06 étend C25, le rôle proposé pour un trait ou un VECTOR non nommé `icon` est `background` : `roleAttendu` ne connaît que TEXT et `/icon/i`. | U1 | `corrections.ts` | lecture |
| C25 ne tient pas compte de l'élément du layer : le seul token d'un autre élément est proposé comme correction exacte. | U4 | `corrections.ts` | lecture |
| C25 ne lit que `layer.peintures` : une plage de texte en dur, ou un texte aux couleurs mixtes, passe. | U1, X1 | `corrections.ts` | lecture |
| C17 refuse les rôles `divider`, `inverse` et `ring` posés sur un fond, et demande `background` : un `Divider` lié à son token `divider` reçoit une correction C24. | R1, faux positifs | `mapping.ts` `rolesAdmis` | confirmé |
| C18 attend `FRAME_FILL` pour tout fond non texte : une icône VECTOR au scope `SHAPE_FILL` est accusée, alors que `SUPPORT_DES_VARIABLES` connaît `SHAPE_FILL`. | K4, faux positifs | `mapping.ts` `porteeAttendue` | confirmé |
| La propagation d'une liaison directe à `theme`, ou d'un token dont la grammaire ne lit pas le nom, garde le nom de la source : elle propose une correction exacte vers la même variable dans chaque variant, donc vers la mauvaise palette. | M2 | `propagation.ts` `nomVise` | confirmé |
| Un layer propre à un variant donne, à chaque propagation, un constat à question vide (« sans modèle ») dans les autres variants. | M2 | `propagation.ts` `layerHomologue` | lecture |
| C29 ne lit pas les tokens de famille `sizes` ni de propriété `border-radius` : leur lecture est vide, aucun n'est candidat, et aucun constat C8 ne le dit pour les tailles. | Z8 | `nommage.ts` (`pourLaGrammaire`), `architecture.ts` | confirmé |
| C29 compare les valeurs exactes par égalité stricte : `0,1 + 0,2` face à `0,3`, ou `3,9999999` face à 4, devient une question « proche ». | Z3 | `candidatsDeLongueur.ts` `classerLesCandidatsParEtapes` | confirmé |
| C29 ne garde qu'un proche par côté et départage les égalités par le nom : de deux tokens à 15 px, un seul est montré. | Z4 | `candidatsDeLongueur.ts` `procheLe` | confirmé |
| C29 ne dit rien d'un token dont les modes divergent : ni exact, ni proche, aucune raison à l'écran. | Z5 | `candidatsDeLongueur.ts` `valeurCommune` | confirmé |
| C59 ne juge qu'une liaison directe à `theme`, que C80 accuse déjà : sur un composant conforme (token de `components` aliasé à `surface/foreground`), il se tait. Il juge aussi une liaison héritée d'une pièce interne et un trait, et sa correction vise `theme`. | T1, T2 | `theme.ts` l.34, `controlerLeTheme` | confirmé |
| C80 juge une liaison héritée d'une dépendance (provenance `composant-principal`), que `couche.ts` exempte seulement pour une pièce interne et un wrapper. | K2, K1 | `couche.ts` l.62-64 | confirmé |
| C20 accuse un alias de `components` vers un autre token de `components`, motif que les fixtures du dépôt emploient (`tilelink/sizes/icon`). | K3 | `couche.ts` `ciblesAdmises` | confirmé |
| C63 `theme` : pour une sœur dont la cible de thème n'a pas de segment de palette, `remplacerSegment` laisse le nom, et la cible de la sœur devient candidate unique, donc une correction exacte vers la palette d'une autre. | S2 | `structure.ts` `controlerLesContournements` | lecture |
| Deux corrections sur la même liaison (C22 puis C24) ont des identifiants distincts. La seconde saute en `fait-faux` après la première, car son `avant` a changé. | L2 et R1 | `ecriture/liaisons.ts` `relire` | lecture |
| La correction `alias-de-mode` de C63 est comptée mais jamais écrite, et sa carte prend le genre « lier ». | S2, D5 | `ui/corrections/index.ts` `ecritLaLigne`, `modele.ts` `genreDe` | lecture |
| Les corrections arrivent cochées, aucun bouton « Tout cocher » ne les groupe et les cartes de question n'ont ni Ignorer ni « Ne plus proposer ». | D1, D2 | `ui/corrections/index.ts` l.161, `ui/questions/` | lecture |
| C25 ou C29 et C30 donnent deux cartes pour la même valeur en dur. | D4 | `sandbox/analyse.ts`, `constatsDuMoteur.ts` | lecture |

Constats du lot 1, livré en `453c5db0`. Les 48 profils aux scopes précis donnent C18 sur une icône au scope `SHAPE_FILL`, car `porteeAttendue` (`mapping.ts`) n'attend que `FRAME_FILL` ; le test de base le garde en `todo`. `proposerLaPropagation` depuis le premier variant de P0 rend 70 questions sans candidat, une par plage de `Label` et par variant visé, car la liaison d'une plage n'a pas d'`indice` (`propagation.ts`). Ces 70 questions sont un écart attendu, pas une base de M2.

### 6.2 Tests de régression

Une fois la mesure lue, des cas représentatifs deviennent des tests dans `npm test`.

| Fichier | Contenu | Cas |
|---|---|---|
| `packages/kit/tests/stressComposant.test.ts` | Un test par opérateur de la section B qui a révélé un écart, avec 1 à 3 cas de la graine 7103, plus les 21 propriétés rejouées sur P0 et Pα. | 55 à 75 |
| `packages/plugin-architect/tests/composantStress.test.ts` | Les cas D1 à D6 qui ont révélé un écart, plus les cas d'écriture de P16 et de doublon de P12. | 25 à 35 |

Un test dont le défaut n'est pas corrigé porte `{ todo: '<écart>' }` de `node:test`. Il s'exécute, et son échec ne fait pas échouer `npm test`. La correction du code retire le `todo`. Les deux fichiers durent moins de 12 secondes ensemble. Le contrôle du kit et du plugin reste dans `npm test`, le harnais complet reste hors de `npm test`.

## 7. Recette Figma

Ce qui ne se prouve qu'en Figma. Le mainteneur dégrade une copie d'un fichier de recette qu'il a déjà (Alert à 11 variants, Button à 216). Le plan ne crée et ne migre aucun fichier. Le harnais imprime dans `_local/stress/f3-composant/recette-figma.txt` les cartes attendues pour chaque geste.

| N° | Geste du mainteneur | Ce qu'il vérifie |
|---|---|---|
| G1 | Ouvrir Architect, mode Composant, sur la copie intacte de Button. | Les constats propres au fichier, comptés avant tout geste. Temps de l'analyse noté. |
| G2 | Lier le fond d'un variant hover au token default. | Question C16 avec l'indice des autres variants hover, rien de coché. |
| G3 | Lier un trait au token d'un autre composant, puis un fond directement à `theme`. | C19 sans correction, puis C80 sans correction ni C20. |
| G4 | Poser sur le token d'une icône le scope `SHAPE_FILL` seul, puis lier une icône VECTOR à ce token. | Noter si Architect accuse l'icône (C18). |
| G5 | Lier un `Divider` à son token `divider`. | Noter si une correction C24 propose `background`. |
| G6 | Poser un rayon de 7,99 face à un token de 8, puis relire la valeur lue par Architect. | La valeur lue exacte, et si C29 dit « exact » ou « proche ». |
| G7 | Poser une peinture unie sur un rectangle décoratif, sur un trait et sur une plage de texte. | Un C25 par peinture une fois Q-06 appliquée ; avant, noter les silences. |
| G8 | Lier un variant, cliquer sur la copie du modèle, puis lier un layer propre à ce variant. | Cartes C24, question vide pour le layer absent des autres. |
| G9 | Cocher à la main la correction d'une palette fausse et celle du rôle de la même liaison, puis Appliquer. | Une ligne écrite et une sautée, avec son motif. |
| G10 | Renommer la famille d'un token de taille `size` en `sizes`. | Noter si C29 propose encore ce token. |
| G11 | Ignorer une question, puis « Ne plus proposer » une autre. | Les deux gestes existent ; la proposition retirée laisse le constat en À faire. |
| G12 | Cocher une carte à la main, relancer l'analyse. | Rien n'arrive coché ; « Tout cocher » et « Tout décocher » existent. |
| G13 | Masquer un layer qui porte une peinture en dur, puis masquer son parent. | Aucun C25 ni C29 (selon Q-F3-1). |
| G14 | Donner à un texte deux couleurs et lier une seule des deux. | Le statut dit que la lecture est partielle, ou un C25 sur la plage en dur. |
| G15 | Appliquer une correction C24 de propagation, puis Historique ou Ctrl+Z. | Valeurs restaurées, un seul point d'annulation. |

## 8. Lots d'exécution

Le plan d'ensemble reste dans la conversation principale. Un lot par appel d'agent, au plus deux lots en parallèle. Après chaque lot, la conversation relit le diff, un `verificateur` relance les vérifications, puis `npm run agents:diff`. Le prompt de chaque implémenteur contient la note du lot, la nature de la tâche et la sortie de `npm run agents:lire -- <chemins du lot>`. L'ordre est 0, 1, puis 2 avec 3, puis 4 avec 6, puis 5, 7, 8, et enfin 9 avec 10.

| Lot | Fichiers | Agent | Critères de fin |
|---|---|---|---|
| 0 Cadre commun | `packages/kit/tests/stress/commun/prng.ts`, `types.ts`, `comparer.ts`, `packages/kit/tests/stressCadre.test.ts` | `implementeur` | Le lot 0 de F2 est livré. Si son `comparer` a une clé fixe, ce lot le rend paramétrable (la famille fournit la clé : code, variant, layer, champ). `stressCadre.test.ts` prouve que deux tirages de la graine 7103 sont identiques et que `comparer` rend « manqué », « faux constat » et « correction inexacte » sur trois paires fabriquées. `npm run typecheck` passe. |
| 1 Générateur | `packages/kit/tests/stress/f3-composant/composantDeBase.ts`, `profils.ts`, `carte.ts` | `implementeur-exigeant` | Les 96 profils donnent zéro constat des codes de la portée. `button-216` se construit en moins de 2 s. Chaque profil a une carte complète : un token attendu par layer, champ et variant. Un profil non vide en constats est lui-même un résultat à remonter. |
| 2 Opérateurs L, R, K | `operateursAxes.ts`, `operateursRoles.ts`, `operateursCibles.ts` | `implementeur-exigeant` | Les opérateurs rendent 60 + 27 + 63 = 150 cas. Chaque cas a un oracle rédigé, et un contrôle de cohérence interne prouve que dégrader puis annuler la dégradation redonne le composant de base. |
| 3 Opérateurs M, U, T, S | `operateursModele.ts`, `operateursPeinture.ts`, `operateursTheme.ts`, `operateursStructure.ts` | `implementeur` | Les opérateurs rendent 26 + 52 + 28 + 20 = 126 cas. Les verdicts `mesure` sont marqués. Les lots 2 et 3 touchent des fichiers distincts et peuvent tourner ensemble. |
| 4 Opérateurs Z, X et faux positifs | `operateursTailles.ts`, `operateursEntrees.ts`, `fauxPositifs.ts` | `implementeur` | Les opérateurs rendent 119 + 24 = 143 cas, et le lot rend les 43 thèmes ciblés de la section 4. Chaque cas Z2 déclare la borne qu'il vise. |
| 5 Combinaisons et relations | `oracle.ts`, `combinaisons.ts`, `metamorphiques.ts`, `appliquer.ts` | `implementeur-exigeant` | 220 paires, 150 triples et 30 interactions rendent des oracles sans zone partagée. Les relations M-1 (ordre des variants et des layers), M-2 (ordre du catalogue), M-3 (identifiants renommés) et M-4 (valeurs de couleur et de longueur) s'appliquent sans changer le composant de base. `appliquer.ts` applique liaison, plage, champ numérique et propagation. |
| 6 Chaîne, écran et écriture | `packages/plugin-architect/scripts/stress/f3-composant/chaine.ts`, `atelierDuComposant.ts`, `signatures.ts` | `implementeur-exigeant` | Les 67 cas D1 à D6 s'exécutent. Le faux DOM rend les cartes, les cases, le pied et les boutons. L'atelier d'écriture journalise chaque ligne écrite ou sautée. Chaque propriété P11 à P16, P18 et P19 rend un verdict sur un composant qui porte tous les codes. Le lot 6 ne dépend que des lots 0 et 1 et peut tourner avec le lot 4. |
| 7 Exécuteur et rapport | `executer.ts`, `rapport.ts`, `packages/plugin-architect/package.json` (script `stress:composant`) | `implementeur` | `npm run stress:composant --workspace ucm-architect-plugin -- --graine 7103` finit sur 1 025 cas, imprime le tableau de la section 5.4, écrit `rapport.json` et `rapport.txt`, et rejoue un cas par `--cas`. Deux exécutions donnent le même rapport. Le temps mesuré est noté. `npm run typecheck` passe. |
| 8 Mesure de l'existant | aucun fichier de code | `verificateur`, puis la conversation principale | `rapport.txt` du code actuel est lu en entier. Chaque écart est classé et rattaché. Le tableau des écarts nouveaux et celui des cas `mesure` sont remis au mainteneur. Les 20 hypothèses de la section 6.1 sont confirmées ou infirmées, et le résultat entre dans `MESURE-DES-FAILLES.md`. |
| 9 Régression | `packages/kit/tests/stressComposant.test.ts`, `packages/plugin-architect/tests/composantStress.test.ts` | `implementeur` | Les deux fichiers couvrent chaque écart classé au lot 8. `npm test` passe, les écarts non corrigés portent `todo`, et les deux fichiers durent moins de 12 secondes. |
| 10 Scénario de recette | `packages/plugin-architect/scripts/stress/f3-composant/recette.ts`, sortie `recette-figma.txt` | `implementeur` | Le fichier donne, pour G1 à G15, les cartes attendues d'après l'oracle. Le mainteneur le lit avant la recette. |

## 9. Questions au mainteneur

Les décisions Q-F2-7 (un seul document, `MESURE-DES-FAILLES.md`) et Q-F2-9 (tests `todo` dans `npm test`) s'appliquent ici. La conversation principale retient chaque proposition comme décision provisoire, que le mainteneur peut revoir. Les cas liés restent `mesure` dans le rapport, comptés à part, jusqu'à sa confirmation.

| Id | Question | Proposition |
|---|---|---|
| Q-F3-1 | Une peinture visible sur un layer masqué, ou sous un ancêtre masqué, donne-t-elle un C25 ? | Non, comme C29 : un layer qu'on ne voit pas n'a pas de peinture à lier. |
| Q-F3-2 | Le fond de l'instance d'un composant imbriqué, vu depuis l'hôte, donne-t-il un C25 ? | Non : l'instance est une frontière, sa peinture vient de son composant principal, comme pour C29. |
| Q-F3-3 | Quels rôles C24 admet-il pour un layer ? | La table actuelle, plus `divider` sur un trait ou un fond de layer nommé `divider` ou `separator`, `ring` sur un fond de layer nommé `ring` ou `focus`, et le silence sur `inverse`. |
| Q-F3-4 | Une seule définition d'icône pour C17, C25, C49 et C66 ? | Oui : VECTOR, BOOLEAN_OPERATION, instance pilotée par INSTANCE_SWAP, ou nom dont un mot entier est `icon` (ni `Silicone` ni `Lexicon`). |
| Q-F3-5 | La correction `alias-de-mode` de C63 `theme` s'écrit-elle dans Figma ? | Oui : l'écriture change l'alias du token pour le mode, avec le point d'annulation du lot. Sans écriture, la carte s'affiche sans case. |
| Q-F3-6 | La propagation reprend-elle une liaison directe à `theme` ou à `layout`, un token dont le nom ne se lit pas, ou écrase-t-elle une liaison déjà posée sur un autre token ? | Non aux trois : elle ne propage que les tokens de `components` du jeu dont la grammaire lit le nom, et seulement sur des peintures ou des champs nus. Les autres restent un C80, un C19 ou un C21. |
| Q-F3-7 | Un layer propre à un variant, absent des autres, fait-il sortir un constat de propagation ? | Non : seul un homologue ambigu (deux layers homonymes sous le même parent) donne une question. |
| Q-F3-8 | C80 et C19 jugent-ils une liaison héritée sans changement d'une dépendance ou d'un détail, ou posée par une surcharge ? | Une liaison héritée sans changement n'est jamais jugée, quelle que soit la sorte. Une surcharge posée par l'hôte l'est. |
| Q-F3-9 | C59 résout-il l'alias d'un token de `components` jusqu'au thème, et que fait-il d'une liaison que C80 accuse déjà ? | Oui, il résout l'alias. Sa correction est le token de `components` de même chemin dont l'alias vise `page/foreground`, si unique. Une liaison directe à `theme` donne C80 seul. |
| Q-F3-10 | Un texte de `surface/foreground` posé sur `surface/subtle` est-il juste ? | Oui, `subtle` est un fond de surface comme les autres : un texte de surface s'y pose. |
| Q-F3-11 | Deux longueurs égales à 1e-6 px près sont-elles exactes ? Que montre C29 pour deux proches à égalité ? | Oui à 1e-6 px près (Figma stocke des flottants 32 bits). À égalité, les deux candidats sont montrés. |
| Q-F3-12 | Une liaison à la fois d'une autre palette et d'un autre état donne-t-elle deux constats ? | Non : un seul constat, une seule carte, un seul token d'arrivée qui change les deux segments, si unique. |
| Q-F3-13 | C29 lit-il les familles tolérées `sizes` et la propriété `border-radius` ? | Oui, comme `colors` : le token est candidat, et un constat C8 étendu aux tailles demande l'harmonisation. |
| Q-F3-14 | Un token de taille à valeurs différentes selon le mode peut-il être proposé ? | Non, ce n'est pas une correction exacte, mais l'À faire dit « ce token change de valeur selon le mode ». |
| Q-F3-15 | Un composant dont l'alias vise un autre token de `components` (`tilelink/sizes/icon` vers `icons/sizes/xl`) est-il en défaut ? | Réservée au mainteneur. `CIBLES_DES_COLLECTIONS` dit oui, mais les fixtures du dépôt emploient ce motif. Les 3 cas restent `mesure` jusqu'à sa réponse. |
| Q-F3-16 | Quand C16, C22 ou C24 et C21 visent la même liaison, lequel reste ? | Celui qui porte la correction : C21 se tait sur une liaison que C16, C22 ou C24 accuse déjà. |
| Q-F3-17 | La clé du doublon entre le kit et le moteur est-elle le couple (layer, champ) ? | Oui : un point C30 du moteur disparaît quand un C25 ou un C29 du kit porte le même layer et le même champ. |
