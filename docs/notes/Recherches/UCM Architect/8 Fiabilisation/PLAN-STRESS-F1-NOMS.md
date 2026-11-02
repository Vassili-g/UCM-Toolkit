# Plan de stress test de la famille F1 Noms

Ce plan décrit comment mesurer les failles de détection des questions et des renommages de Nomenclature en mode Tokens. Il couvre le harnais, le corpus, les cas et l'oracle. Il ne corrige rien dans le kit. Les décisions D1 à D5, les réponses Q-01 à Q-11 et les écarts E-01 à E-18 viennent de [INVENTAIRE-VERIFICATIONS.md](./INVENTAIRE-VERIFICATIONS.md).

Le harnais appelle le kit hors de Figma, comme les tests existants (`packages/kit/tests/questionsReferentiel.test.ts`). Il lit le même chemin de calcul que le plugin : `nomsSelonLesReglesSync` (`packages/kit/src/nommage/calcul.ts`) pour les renommages et les collisions, puis `detecterLesQuestions` (`packages/kit/src/referentiel/questions.ts`) avec le lexique et l'index que le premier rend.

Notation pour tout le document. `m` est le nombre de noms qui portent le mot fautif, `k` le nombre de noms qui portent le mot juste, `L` la longueur du mot fautif. Un mot « du vocabulaire » est un mot de la liste de la section 2.1.

## 1. Oracle

### 1.1 Deux niveaux de sortie

| Niveau | Définition | Usage |
|---|---|---|
| N1, présence | La question existe dans `questions` ou dans `autres`, avec `seuil: 0` et un maximum sans borne | Verdict des propriétés ci-dessous |
| N2, visibilité | Mêmes entrées avec les paramètres de la session (`seuil: 2`, `maximum: 10`, `plusTard: []`, `packages/plugin-architect/src/nomenclature/session.ts:288`) | Mesure seulement : la part des questions de N1 qui arrivent dans l'onglet Questions, et celle qui tombent dans « Autres pistes » |

Une question qui existe en N1 et qui n'est dans aucune des deux listes de N2 est un échec, car D1 interdit qu'une faute disparaisse.

### 1.2 Propriétés

Chaque propriété est un prédicat sur la sortie d'un cas. Le harnais l'évalue cas par cas et rend un verdict (attendu, détecté, manqué, faux positif).

| Id | Assertion | Source |
|---|---|---|
| P-01 | Pour tout terme T du vocabulaire de L lettres au moins, et tout mot M obtenu par une lettre ajoutée, retirée, remplacée ou par l'échange de deux lettres voisines, M absent du vocabulaire et du dictionnaire (2.3), si M figure dans m ≥ 1 noms, la sortie N1 contient une question faute dont le mot fautif est M et la référence T. | D1, D2, E-01, E-03 |
| P-02 | P-01 tient pour m de 1 à 10 et pour k de 0 à 20, y compris quand m > k : le vocabulaire départage, pas le nombre d'emplois. | D1, D2, E-01, E-02 |
| P-03 | P-01 tient hors de la place partagée : autre collection, autre rang, autre profondeur, voisin différent, nom d'un seul segment. | Q-05, E-05 |
| P-04 | P-01 tient pour les termes de `REGISTRES_COMPOSANTS` (`padding`, `width`, `height`, `gap`…). | E-04 |
| P-05 | Quand M est à distance 1 de deux termes du vocabulaire ou plus, la question liste tous les candidats et ne présélectionne aucun. Avec un seul candidat, la présélection est permise. | Règle produit, E-06 |
| P-06 | Pour deux mots hors vocabulaire à distance 1, l'un dans 5 noms ou plus, l'autre dans 2 noms au plus, à une place partagée, la sortie N1 contient une question faute du rare vers le fréquent. | D2 (seconde phrase), E-06 |
| P-07 | Pour la longueur L retenue par la mesure (4.3), le rappel de P-01 vaut 100 % à partir de L, et le corpus de noms justes ne produit aucune question faute certaine à partir de L. | D4 |
| P-08 | Le corpus de noms justes (2.2) ne produit aucune question faute classée « faux positif certain » (4.1). | D5 |
| P-09 | Chaque paire de la liste des mots distincts légitimes (2.6) placée dans un fichier ne produit aucune question faute. | D4, D5 |
| P-10 | Une forme tolérée employée seule (sans le terme UCM dans le fichier) produit un renommage vers le terme UCM, pour chacune des 52 formes tolérées des registres. | D3, Q-02 |
| P-11 | Quand le renommage d'une forme tolérée est retiré pour collision, la sortie N1 contient une question qui permet de résoudre la collision. Aucune collision ne reste visible seulement sous « Bloqués ». | D3, Q-01, Q-02, E-08 |
| P-12 | Une forme tolérée composée (`separator-thin`, `thin-separator`) produit un renommage ou une question, jamais le silence. | E-09 |
| P-13 | Le pluriel d'une forme tolérée (`separators`) produit un renommage ou une question. | E-10 |
| P-14 | Deux mots d'un groupe de synonymes validé (2.4), observés à une même place, produisent une question de synonymes. Un mot de ce groupe employé seul produit une question ou un renommage selon le cas (voir Q-F5). | D3, E-11 |
| P-15 | Une paire `x` / `x+s`, `x+es`, `x+ed`, `x+d` ou `x+ing` produit une question si le dictionnaire la classe « formes d'un même mot », et aucune question si elle la classe « mots distincts ». | Q-10, E-12 |
| P-16 | Un segment soudé de deux mots dont un est du vocabulaire produit une question mots collés dès qu'il apparaît dans un nom. | E-13 |
| P-17 | Un mot ne change pas de verdict quand sa casse ou son séparateur change : la faute reste détectée sous toute casse, et un nom correct ne produit qu'un renommage d'écriture, jamais une question de faute. | R4, E-17 |
| P-18 | Deux branches sœurs qui ne diffèrent que d'une faute ou d'un synonyme produisent une question de branches parallèles. Deux frères légitimes (`primary` et `secondary`, `sm` et `md`, `hover` et `pressed`) n'en produisent aucune. | E-45 |
| P-19 | Une collection UCM écrite autrement produit un renommage. Une collection inconnue produit une question avec les 7 collections et aucune présélection. | R3, E-15 |
| P-20 | Pour chaque collision de `resultat.collisions`, une question ou une carte de résolution la désigne. Le harnais en compte les collisions sans question. | Q-02 |
| P-21 | Idempotence : appliquer les renommages au fichier puis relancer le calcul ne donne ni renommage ni question nouvelle. | `calcul.ts` (en-tête) |
| P-22 | Stabilité : permuter l'ordre des noms ne change pas l'ensemble des clés de questions. | Robustesse |
| P-23 | Un squelette de fichier sans mutation produit zéro question et zéro renommage (témoin négatif de chaque cas). | D5 |

## 2. Corpus

### 2.1 Vocabulaire de référence

Le harnais le construit en important `packages/kit/src/referentiel/`, jamais depuis une copie. Il réunit les identifiants et les formes tolérées de `REGISTRES` et `REGISTRES_ARCHITECTURE` (25 registres, 121 termes, 52 formes tolérées en comptant les doublons entre registres), les 9 groupes de `SYNONYMES_COURANTS` (24 paires), les 5 `ABREVIATIONS`, les 17 `TERMES_COMPOSES`, `MOTS_COURANTS` et les termes de `REGISTRES_COMPOSANTS`. La mesure sur le kit actuel donne 114 mots alphabétiques sans tiret, dont 105 de 3 lettres ou plus et 79 de 5 lettres ou plus. Avec `padding`, `width` et `height`, le plan compte 108 termes cibles pour les fautes.

`docs/references/design-systems/ucm/registres.json` sert de témoin : un test du harnais compare ses termes à ceux du kit et signale un écart.

### 2.2 Corpus de noms justes

Source : les `noms.json` des 15 design systems et de `ucm/` (14 871 noms, format `{ nom, type, couche }`, voir `docs/references/design-systems/README.md`). Le harnais convertit chaque système en un fichier d'inventaire, au format `Inventaire` du kit (`packages/kit/src/nommage/inventaire.ts`), selon deux choix qui se croisent.

| Choix | Valeurs | Raison |
|---|---|---|
| Chemins | `points` : coupe sur `.` et `/`, garde les tirets dans le segment ; `tirets` : coupe aussi chaque `-` | `points` exerce le découpage des segments composés, `tirets` les places et les voisins |
| Collections | `couche` : `composant` vers `components`, `primitive` vers `primitives`, `semantique` et `null` vers `theme` ; `unique` : une collection hors UCM | `couche` exerce les natures et les règles par collection, `unique` exerce la question de collection |

Quatre variantes par système, soit 64 passes pour les 16 systèmes. Les préfixes `--`, `$`, `md.sys.` et les noms de variables Sass perdent leur préfixe de langage à la conversion. Le harnais écrit le tableau de conversion dans `_local/stress/f1-noms/conversion.json` pour que le mainteneur le relise.

Ces noms sont réputés justes au sens de D5 : le harnais ne les corrige pas. Un système peut pourtant mélanger deux formes (`danger` et `error`, `bg` et `background`). Ces cas ne sont pas des faux positifs de faute. La section 4 les classe.

### 2.3 Dictionnaire des mots (Q-10)

Le harnais découpe les 14 871 noms en mots (coupe sur les non-lettres, sur les passages minuscule vers majuscule, garde les mots de 3 lettres ou plus). Il compte pour chaque mot le nombre de systèmes qui l'emploient (`df`) et le nombre de noms (`tf`). Le dictionnaire garde les mots avec `df ≥ 2` ou `tf ≥ 5`. Sur le corpus actuel, il compte 657 mots (970 mots distincts avant le filtre).

Il en tire trois listes de candidats, écrites dans `_local/stress/f1-noms/dictionnaire/` :

- les paires `x` / `x+s`, `x+es` (23 paires `x` / `x+s` dans le dictionnaire actuel) et `x` / `x+ed`, `x+d`, `x+ing` ;
- les paires à distance 1 entre deux mots du dictionnaire (119 paires, dont 18 de 3 lettres et 53 de 4) ;
- les mots du dictionnaire à distance 1 de deux termes du vocabulaire ou plus (cas d'ambiguïté de P-05).

Le harnais ne classe rien seul. Le mainteneur ou la conversation principale classe chaque candidat en « formes d'un même mot » ou « mots distincts », et le classement s'écrit dans `packages/kit/tests/stress/f1-noms/donnees/formes.json` (suivi par git). Le harnais ne déduit pas qu'un mot en `s` est un pluriel (`status`, `access`, `focus`, `class`, `process`, `alias`, `canvas`, `progress`), ni qu'un mot en `ed`, `d` ou `ing` est une terminaison (`bed`, `red`, `ring`, `string`, `spring`, `padding`, `shed`, `solid`). Un candidat non classé ne compte dans aucun oracle.

### 2.4 Groupes de synonymes (E-11)

Le harnais cherche les paires de mots (A, B) du dictionnaire qui remplissent trois conditions. Elles occupent la même place (même mot parent, même rang) dans deux systèmes ou plus. Elles ne coexistent sous le même parent dans aucun système. Aucune n'est déjà dans un groupe de `SYNONYMES_COURANTS` ou une forme tolérée. La liste est plafonnée à 40 paires, triée par nombre de systèmes.

Il n'en déduit pas de synonymie. Deux frères d'un même parent (`top` et `bottom`, `primary` et `secondary`, `hover` et `pressed`, `success` et `warning`) sont des termes distincts : la deuxième condition les écarte, et le classement du mainteneur écarte le reste (antonymes, termes de deux sens voisins). Le résultat écrit `donnees/synonymes.json`. Le registre du kit (`packages/kit/src/referentiel/vocabulaire.ts`) reste la seule source de vérité : le harnais teste ces paires validées comme s'il s'agissait d'une table future, sans la modifier.

### 2.5 Fichier Slice

`docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json` est un export de tokens avec des collections racines. Il est confidentiel. Le harnais le lit seulement avec `--slice <chemin>`, ignore le fichier sans cette option, lit les alias de `$value` pour renseigner `cibleAlias`, et écrit tous ses résultats sous `_local/stress/f1-noms/slice/` (ignoré par git).

Le harnais ne cite aucun nom du fichier dans un rapport suivi par git. Le rapport de Slice donne des comptes et des identifiants de cas (`slice/faute-ajout/0042`), pas de noms. Un contrôle `--verifier-fuite` extrait les segments de Slice de 4 lettres ou plus qui ne sont ni du vocabulaire ni du dictionnaire, les cherche dans les fichiers de `git ls-files`, et sort en erreur s'il en trouve un. Il affiche le nombre de fichiers touchés, jamais le segment.

### 2.6 Mots distincts légitimes

La liste vient de deux sources. La première est la liste des 119 paires à distance 1 du dictionnaire, classées par le mainteneur. La seconde est une liste écrite à la main de 30 paires : `fill`/`full`, `top`/`tip`, `gap`/`cap`, `xs`/`xl`, `light`/`right`, `title`/`tile`, `radius`/`radio`, `color`/`colon`, `border`/`bolder`, `label`/`lable` (témoin de vraie faute), `solid`/`solis`, `focus`/`locus`, et les tailles voisines. Elle s'écrit dans `donnees/distincts.json`. Cela fait 149 paires.

## 3. Générateur

### 3.1 Graine et identifiants

Un générateur pseudo-aléatoire `mulberry32` avec la graine `7001` choisit les lettres, les positions et les échantillons. Pour un cas donné, la valeur tirée dépend de la graine, du terme et de l'opérateur, pas de l'ordre d'exécution. Chaque cas reçoit un identifiant stable `strate/opérateur/terme/axes`. Deux exécutions avec la même graine rendent la même liste de cas, et le harnais écrit son empreinte SHA-256 dans l'en-tête du rapport.

### 3.2 Squelette du fichier

Chaque cas synthétique part d'un squelette de 12 noms construits avec des mots inventés, absents du vocabulaire et du dictionnaire, répartis dans les collections `theme`, `components`, `layout` et `primitives`. Le squelette seul produit zéro question et zéro renommage (P-23). Le cas ajoute à ce squelette les noms du mot juste (`k`), les noms du mot fautif (`m`) et, selon la strate, le voisin et la collection. Un cas compte 12 à 45 noms.

### 3.3 Opérateurs

Un opérateur écarte la mutation qui produit un mot du vocabulaire, du dictionnaire ou un terme déjà tiré. Le nombre de cas indiqué est donc un maximum.

| Id | Opérateur | Définition | Nombre par terme |
|---|---|---|---|
| M-01 | Lettre ajoutée | Doublement d'une lettre, insertion après la première lettre, insertion en fin | 3 |
| M-02 | Lettre retirée | Retrait en deuxième position, au milieu, en dernière position | 3 |
| M-03 | Lettre remplacée | Remplacement en deuxième position, au milieu, en dernière position, par une lettre voisine sur un clavier AZERTY ou QWERTY | 3 |
| M-04 | Échange | Échange de deux lettres voisines distinctes, après la première lettre et au milieu | 2 |
| M-05 | Première lettre | Retrait de la première lettre, remplacement de la première lettre | 2 |
| M-06 | Deux lettres | Deux mutations parmi M-01 à M-03 (hors oracle, mesure informative) | 2 |
| M-07 | Synonyme | Substitution par l'autre mot d'une paire de synonymes, d'abréviation ou de forme tolérée | par paire |
| M-08 | Forme tolérée | Emploi d'une forme tolérée à la place du terme UCM | par forme |
| M-09 | Forme tolérée composée | Forme tolérée jointe à un suffixe (`-thin`, `-strong`, `-2`) ou à un préfixe | 6 par forme |
| M-10 | Pluriel | Ajout de `s` ou `es` à un terme ou à une forme tolérée | 2 |
| M-11 | Terminaison | Ajout de `ed`, `d` ou `ing` | 3 |
| M-12 | Casse | `PascalCase`, `MAJUSCULES`, majuscule interne, majuscule initiale | 4 |
| M-13 | Séparateur | `-`, `_`, espace, `camelCase`, `PascalCase`, soudé | 6 |
| M-14 | Mots collés | Soudure de deux mots du vocabulaire, avec ou sans faute dans l'un | par paire |
| M-15 | Branches parallèles | Deux branches sœurs identiques qui diffèrent d'un mot | par scénario |
| M-16 | Collection | Casse, pluriel, faute, séparateur, forme ancienne, nom inconnu | par collection |
| M-17 | Collision | Renommage dont la destination est occupée | par scénario |

### 3.4 Axes de placement

| Id | Axe | Valeurs | Pourquoi |
|---|---|---|---|
| A-01 | Collection du mot fautif | même collection que le mot juste ; autre collection UCM ; collection hors UCM | `contexte` clé la place par collection (`questions.ts:29-61`) |
| A-02 | Position dans le chemin | seul segment ; rang 0 de 3 ; rang 1 de 3 ; dernier de 3 ; rang 3 de 5 ; dernier de 5 | Rang, profondeur et nom d'un seul segment sans place |
| A-03 | Fréquence du mot fautif `m` | 1, 2, 3, 5, 10 | Encadre la garde `noms.size > 2` (E-02) |
| A-04 | Fréquence du mot juste `k` | 0, 1, 2, 4, 5, 8, 20 | Encadre la garde `noms.size < 5` (E-01) et le cas D2 |
| A-05 | Voisin | identique à celui du mot juste ; différent (seulement si `k ≥ 1`) | Place partagée |
| A-06 | Parent | frères (même parent) ; cousins (parents différents, même rang et même voisin) ; isolés (un seul des deux mots dans le fichier) | Branches, synonymes, collisions |
| A-07 | Fréquence des deux formes | `(1,1)`, `(1,5)`, `(5,1)`, `(5,5)` | Score et choix du terme proposé |
| A-08 | Type du segment | variable (dernier segment), groupe | Pluriel et terminaison ne comparent que des mots du même type |
| A-09 | Part de la convention dominante | 1 nom sur 20, 10 sur 20 (égalité), 19 sur 20 | E-17, convention sans minimum |
| A-10 | Terme correct dans le même dossier | présent ; absent ; présent ailleurs | Collisions (P-11, P-20) |

Les 3 valeurs de A-01, les 6 de A-02, les 5 de A-03 et les 13 combinaisons de A-04 et A-05 (`k = 0`, puis 6 valeurs de `k` avec 2 voisins) donnent 3 × 6 × 5 × 13 = 1 170 placements par mutation.

### 3.5 Strates et nombre de cas

| Strate | Contenu | Calcul | Cas |
|---|---|---|---|
| S1 | Fautes au placement de référence (même collection, rang 1 de 3, `m = 1`, `k = 8`, voisin identique) | 108 termes × 13 mutations (M-01 à M-05) | 1 404 |
| S2 | Grille de placement des fautes | 3 termes pivots (`background`, `border`, `ring`, soit 10, 6 et 4 lettres) × 2 mutations (M-03 en deuxième position, M-04 après la première lettre) × 1 170 placements | 7 020 |
| S3 | Fautes à deux lettres, hors oracle | 108 termes × 2 | 216 |
| S4 | Mots hors vocabulaire | 40 mots du dictionnaire (`df ≥ 3`, 5 lettres ou plus) × 3 mutations × 3 valeurs de `k` (2, 5, 8) × 3 valeurs de `m` (1, 2, 3) | 1 080 |
| S5 | Forme tolérée composée | 52 formes × 3 suffixes × 2 attaches (suffixe, préfixe) × 2 parents (avec ou sans le terme UCM) | 624 |
| S6 | Synonymes, abréviations, formes tolérées | 121 paires (24 de la table, 52 formes tolérées, 5 abréviations, 40 du dictionnaire) × 12 scénarios (frères × 4 fréquences, cousins × 4, isolés × 4) ; plus les 24 paires de la table × 4 scénarios avec une collection différente | 1 548 |
| S7 | Pluriels et terminaisons | Pluriels : 105 termes × 2 formes × 3 types, 52 formes tolérées × 3 types, 23 paires du dictionnaire × 3 types (855). Terminaisons : 105 termes × 3 formes × 3 types, 30 paires du dictionnaire × 3 types (1 035) | 1 890 |
| S8 | Casse | 30 termes de 4 lettres ou plus × 4 casses × 2 (mot juste ou fautif) × 3 parts de convention × 2 types | 1 440 |
| S9 | Séparateurs | 25 termes de plusieurs mots (17 composés, 8 formes tolérées composées) × 6 séparateurs × 3 parts de convention × 2 types (900) ; plus 25 termes soudés avec une faute × 2 types (50) | 950 |
| S10 | Mots collés | 150 couples de mots du vocabulaire tirés par la graine × 3 fréquences du segment soudé (1, 2, 5) × 3 états des parties (les deux attestées à la même place, une seule, aucune) | 1 350 |
| S11 | Branches parallèles | 6 nombres de branches sœurs (2, 3, 6, 12, 13, 20) × 5 nombres d'entrées (2, 10, 50, 200, 201) × 3 parts de sous-chemins communs (60, 80, 100 %) × 5 natures de différence (faute, synonyme, mots distincts, négation, deux termes connus) = 450 ; plus 10 paires de frères légitimes × 6 nombres de branches = 60 | 510 |
| S12 | Collections | 7 collections × 11 écritures (3 casses, 1 pluriel, 4 fautes M-01 à M-04, 3 séparateurs) = 77 ; 3 formes anciennes × 3 casses = 9 ; 6 noms inconnus = 6 ; le tout × 2 nombres de variables (1 et 10) | 184 |
| S13 | Collisions | 52 formes tolérées × 3 positions du terme UCM (même dossier, absent, autre dossier) × 2 types × 2 fréquences = 624 ; 6 natures de collision (casse, séparateur, terme du fichier, groupe devenu token, nom non renommable, destination commune de plusieurs sources) × 12 variantes (2 types × 2 fréquences × 3 nombres de sources) = 72 | 696 |
| S14 | Cas combinés | 20 formes tolérées de 5 lettres ou plus × 3 mutations (60) ; 20 termes × 3 mutations avec pluriel (60) | 120 |
| S15 | Mots distincts légitimes | 149 paires × 4 fréquences `(1,1)`, `(1,5)`, `(5,1)`, `(2,8)` | 596 |
| S16 | Mutations sur fichiers réels | 16 systèmes × 6 opérateurs (M-01, M-02, M-03, M-04, M-08, M-07) × 40 sites tirés, par lots de 20 sites indépendants par passe | 3 840 |
| S17 | Ambiguïté | 60 mots à distance 1 de deux termes du vocabulaire × 2 états (les deux candidats attestés, un seul) | 120 |
| Total | | | **23 588** |

Avec `--slice`, la strate S16 ajoute 6 opérateurs × 40 sites sur le fichier Slice, soit 240 cas. Les 64 passes de faux positifs (section 4) s'ajoutent à ces cas et passent à 65 avec Slice.

Dans S16, un site est un couple (nom, segment, mot) dont le mot est un terme cible. Le tirage répartit les sites sur les collections et les rangs du fichier. Un lot ne contient pas deux sites qui partagent un mot, ni deux mots mutés à distance 1 l'un de l'autre.

## 4. Faux positifs

### 4.1 Mesure et classement

Le harnais exécute le calcul sur les 64 passes du corpus de noms justes (2.2) et collecte toute question et tout renommage. Il classe chaque sortie.

| Classe | Définition | Comptée comme |
|---|---|---|
| FP-A, mots distincts | Le mot signalé et sa référence sont tous deux attestés dans le dictionnaire calculé sur les autres systèmes | Faux positif certain |
| FP-B, forme réelle du système | Le mot est une forme tolérée ou un synonyme du vocabulaire (`bg`, `error`) | Attendu : renommage ou question de D3, pas un faux positif |
| FP-C, nom propre | Le mot est un nom de composant, de marque ou de palette que la nature du segment devrait écarter | Faux positif certain |
| FP-D, à juger | Aucune des classes précédentes : le mot n'est attesté que dans le système testé | Liste soumise au mainteneur |

Pour ne pas biaiser la classe FP-A, le dictionnaire de chaque passe exclut le système testé (validation par exclusion d'un système).

Le harnais écrit `faux-positifs.csv` avec la passe, la question, la classe, le score et deux noms d'exemple, et `a-juger.csv` avec les 200 premières lignes de la classe FP-D triées par score. Il distingue les types de question : faute, synonymes, abréviation, terminaison, pluriel, branches parallèles, mots collés, collection. Il rend le taux de chaque type pour 1 000 noms.

### 4.2 Détecteur de mesure

Le kit actuel garde des seuils (`m ≤ 2`, `k ≥ 5`) qui cachent une partie des faux positifs de la règle voulue par D1 et D2. Le harnais contient donc un détecteur de mesure de 60 lignes, indépendant du kit : pour chaque mot du fichier absent du vocabulaire et du dictionnaire, il liste les termes du vocabulaire à distance 1 (échange compris). Ses candidats donnent la règle voulue sans seuil de fréquence, et mesurent ce que la règle produirait sur le corpus de noms justes. Le harnais compare ensuite la sortie du kit à ce détecteur : tout candidat que le détecteur trouve et que le kit tait est un « manqué » de P-01.

### 4.3 Seuil de longueur (D4)

La règle voulue ne filtre pas sur la fréquence. Le seuil de longueur est donc le seul garde-fou contre `top`/`tip` et `gap`/`cap`. Le harnais calcule, pour L de 3 à 8, quatre valeurs sur S1, S15 et les passes du corpus : le nombre de fautes attendues dont le mot fautif a au moins L lettres, le nombre détecté par le détecteur de mesure, le nombre de faux positifs certains, et ce nombre pour 1 000 noms. Il écrit `courbe-seuil.csv`.

La règle de choix, à confirmer par le mainteneur (Q-F4) : le seuil retenu est la plus petite longueur pour laquelle les faux positifs certains valent zéro sur les 64 passes et sur S15. Le tableau donne aussi la perte de rappel : combien de termes du vocabulaire de moins de L lettres (`ring`, `text`, `icon`, `size`) la règle ne couvre plus.

Le seuil du découpage des mots collés (`LONGUEUR_MINIMALE_D_UNE_FAUTE = 5`, `termes-connus.ts:15`) se mesure à part, car aucune option du kit ne le règle. Un chargeur Node (`--import packages/kit/tests/stress/f1-noms/seuil.mjs`) réécrit la constante en mémoire pour chaque valeur de L, sans modifier le fichier. Si la ligne change dans le kit, le chargeur sort en erreur et le dit.

## 5. Harnais

### 5.1 Emplacement

Le code vit sous `packages/kit/tests/stress/f1-noms/`, hors de `npm test` (le lanceur `scripts/run-tests.cjs` ne lit que `tests/`).

| Fichier | Rôle |
|---|---|
| `index.ts` | Options : `--strate S1,S2`, `--rapide` (un cas sur dix), `--graine`, `--slice <chemin>`, `--verifier-fuite`, `--attendre-zero`, `--sortie` |
| `corpus.ts` | Lecture des `noms.json`, conversion en inventaire, lecture de Slice |
| `dictionnaire.ts` | Dictionnaire, candidats de formes et de synonymes (2.3, 2.4) |
| `mutations.ts` | Opérateurs M-01 à M-14, claviers, graine |
| `scenarios.ts` | Squelette, axes, strates S1 à S17 |
| `oracle.ts` | Propriétés P-01 à P-23 |
| `detecteur.ts` | Détecteur de mesure (4.2) |
| `execution.ts` | Appel du kit sur un cas, N1 et N2 |
| `rapport.ts` | Tableaux, JSON, CSV |
| `faux-positifs.ts` | Classement des sorties du corpus de noms justes (4.1), courbe du seuil (4.3) |
| `seuil.mjs` | Chargeur de la mesure du seuil de découpage |
| `donnees/` | `formes.json`, `synonymes.json`, `distincts.json`, suivis par git |

Le harnais importe `packages/kit/src/` directement avec `tsx`, comme les tests du kit : aucune construction préalable. Un script `stress:f1` s'ajoute à `packages/kit/package.json`, et un script racine du même nom l'appelle, sur le modèle de `test:paquet`. Un test `packages/kit/tests/stressF1Harnais.test.ts` (moins de 2 secondes) vérifie la reproductibilité de la graine, les distances des mutations et le nombre de cas par strate. Il tourne dans `npm test`.

### 5.2 Temps visé

| Mode | Cible |
|---|---|
| Complet (23 588 cas, 64 passes) | 10 minutes au plus sur le poste de référence |
| `--rapide` | 1 minute au plus |
| Test du harnais dans `npm test` | 2 secondes au plus |

Un cas synthétique de 45 noms coûte quelques millisecondes (le test de 32 000 noms de `questionsReferentiel.test.ts` borne la détection à 5 secondes). Les passes de S16 et du corpus sont les plus longues : le plus grand système compte 3 446 noms. Le lot 3 mesure le temps réel et ajuste la taille des lots de S16 si la cible n'est pas tenue.

### 5.3 Rapport

Le harnais écrit sous `_local/stress/f1-noms/` (ignoré par git, `**/_local/`) :

| Fichier | Contenu |
|---|---|
| `rapport.md` | En-tête (graine, empreinte des cas, version du kit, durée), tableau opérateur × axe, synthèse par propriété |
| `rapport.json` | Un objet par cas : identifiant, noms, verdict par propriété, questions rendues |
| `manques.csv` | Les cas dont le verdict est « manqué », avec la propriété et l'écart d'`INVENTAIRE-VERIFICATIONS.md` qu'il illustre |
| `faux-positifs.csv`, `a-juger.csv`, `courbe-seuil.csv` | Section 4 |
| `collisions-sans-question.csv` | P-20 |
| `slice/` | Les mêmes fichiers pour Slice, avec des identifiants seulement |

Le tableau principal croise chaque opérateur (lignes) avec chaque axe (colonnes). Chaque cellule porte quatre nombres, `attendus / détectés / manqués / FP`.

| Opérateur | A-01 même collection | A-01 autre collection | A-02 seul segment | A-03 m = 1 | A-03 m ≥ 3 | A-04 k = 0 | A-04 k ≥ 5 |
|---|---|---|---|---|---|---|---|
| M-03 lettre remplacée | a / d / x / f | … | … | … | … | … | … |

Le harnais calcule les marges de chaque ligne et de chaque colonne. Une cellule vide s'écrit `.`. Sans `--attendre-zero`, le code de sortie est 0, car la première exécution mesure. Avec `--attendre-zero`, il vaut 1 s'il reste un manqué ou un faux positif certain, ce qui sert après les corrections.

Le lot 2, livré, génère 22 591 cas en 4 secondes. La strate S16 donne 2 794 cas au lieu de 3 840 : les contraintes de lot (20 sites par passe, aucun mot partagé, aucun couple de mutants à distance 1) laissent moins de sites sur les petits systèmes. La conversation principale garde ce nombre.

## 6. Deux temps

### 6.1 Mesure de l'existant

Le premier passage s'exécute sur le kit tel qu'il est. Il doit retrouver les deux cas du mainteneur et les écarts de la section 6.1 d'`INVENTAIRE-VERIFICATIONS.md`.

| Cas | Attendu de la mesure |
|---|---|
| `backgrond` dans `theme` (S2, `k = 4`) | Manqué en P-01 (E-01) |
| `separator` près de `divider` dans le même dossier (S13, terme UCM dans le même dossier) | P-11 manqué : collision sans question (E-08) |
| `bordre` (S1, M-04) | Manqué en P-01 (E-03) |
| `paddng` (S1, M-01 sur un terme de composant) | Manqué en P-04 (E-04) |
| `separator-thin` (S5) | Manqué en P-12 (E-09) |
| `separators` (S7) | Manqué en P-13 (E-10) |

Le harnais en tire `manques.csv`. La conversation principale lit les tableaux, rattache chaque ligne à un écart connu ou à un écart nouveau, et écrit le résumé dans `MESURE-DES-FAILLES.md` du même dossier. Cette mesure borne le travail de correction. Un manqué qui ne relève d'aucun écart connu devient un écart E-46 et suivants.

### 6.2 Tests de régression

Après les corrections, 60 cas représentatifs deviennent des tests dans `packages/kit/tests/stressF1Regressions.test.ts`, avec leurs données dans `packages/kit/tests/fixtures/stress-f1/cas-representatifs.json`. Un `test()` couvre chaque famille. Les noms sont inventés ou issus du vocabulaire, jamais de Slice. Le fichier de test tourne en moins de 2 secondes.

| Famille | Cas | Choix |
|---|---|---|
| Fautes | 14 | `background` avec chaque mutation M-01 à M-04 ; `bordre` ; `paddng` ; `m = 3` ; `m = 10` ; `k = 0` ; `k = 1` ; autre collection ; nom d'un seul segment ; rang profond ; première lettre ; un cas ambigu sans présélection |
| Mots distincts | 8 | `fill`/`full`, `top`/`tip`, `gap`/`cap`, `xs`/`xl`, `light`/`right`, `title`/`tile`, `radius`/`radio`, `color`/`colon` |
| Synonymes et formes tolérées | 10 | `separator` à côté de `divider` (collision), `separator` seul, `surface` et `background`, `separator-thin`, `thin-separator`, `separators`, `error` et `danger`, `bg` et `background`, `positive` et `success`, un synonyme du dictionnaire validé |
| Pluriels et terminaisons | 6 | `colors`/`color`, `succes`/`success`, un couple de mots distincts en `s` (aucune question), `disabled`/`disable`, `painted`/`paint`, un couple de mots distincts en `ing` |
| Écriture | 6 | Trois casses et trois séparateurs, avec la faute conservée sous chaque écriture |
| Mots collés | 4 | `textdefault`, un segment soudé dans un seul nom, un segment soudé dans cinq noms, `bordrefilter` |
| Branches parallèles | 4 | 12 branches, 13 branches, une négation, des frères légitimes |
| Collections | 3 | `Theme` mal écrite, `thme`, un nom inconnu |
| Collisions | 5 | Cinq des six natures de S13 (la destination commune de plusieurs sources est couverte par le cas `separator` près de `divider`) |
| Total | **60** | |

Chaque cas porte l'identifiant de la propriété P-xx et de l'écart E-xx qu'il verrouille. Un test supplémentaire rejoue S15 en entier (596 cas) et vérifie P-09 : c'est le seul test de volume, et il reste sous 2 secondes parce que chaque cas est petit.

## 7. Recette Figma

Le harnais ne prouve pas ce que Figma affiche ni ce que le plugin écrit. Le mainteneur rejoue ces gestes sur un fichier de recette (voir Q-F7). Les noms de variables viennent de la section 3, sans aucun nom de Slice. Le plan ne prévoit aucune migration de fichier.

| Geste | Action du mainteneur | Attendu |
|---|---|---|
| G1 | Créer dans `theme` quatre variables `primary/page/background`, `primary/surface/background`, `primary/page/foreground`, `primary/page/backgrond`, puis lancer l'analyse de Nomenclature | L'onglet Questions montre une carte « Corriger backgrond en background » avec « C'est voulu » |
| G2 | Ajouter `primary/page/divider` et `primary/page/separator` | `separator` ne reste pas sous « Bloqués » seul : une question propose de choisir entre les deux termes |
| G3 | Ajouter `separator-thin` à côté d'un `divider-thin` | Une question ou un renommage apparaît (E-09) |
| G4 | Ouvrir l'onglet Corrections | Toutes les cases sont décochées (Q-03), chaque section a « Tout cocher » et « Tout décocher » |
| G5 | Provoquer plus de 10 questions (ajouter 12 fautes à des mots différents) | L'onglet Questions en montre 10, « Autres pistes » est repliée et se déplie (Q-04) |
| G6 | Déplier « Autres pistes » | Les questions restantes s'affichent en cartes grises, sans bouton d'action |
| G7 | Répondre « Corriger » sur une carte de faute, puis appliquer | Le nom de la variable change dans Figma, et la question disparaît à la relance |
| G8 | Répondre « C'est voulu » | La question ne revient pas après une nouvelle analyse |
| G9 | Mettre une question de côté (« plus tard ») puis relancer | La question quitte la liste et n'occupe pas l'une des 10 places |
| G10 | Appliquer un renommage de casse (une variable en `PascalCase` dans un fichier en `kebab-case`) | Le nom est réécrit, sans question de faute |
| G11 | Créer une collection nommée `Core` | Une carte de collection liste les 7 collections et aucune n'est présélectionnée |
| G12 | Créer une variable `Textdefault` dans un seul nom | Une question mots collés apparaît dans Questions ou dans « Autres pistes », selon la réponse à Q-F3 |
| G13 | Annuler les renommages (retour arrière de Figma) | Les noms reviennent, et l'analyse suivante les propose de nouveau |
| G14 | Ouvrir la galerie des états du plugin Architect (`npm run galerie:plugin -- palettes`) | Chaque écran atteint ci-dessus existe dans la galerie, en thème sombre |

## 8. Lots d'exécution

Chaque lot est un appel `implementeur` (Sonnet) ; le lot 3 est un appel `implementeur-exigeant`, parce qu'il touche plusieurs lecteurs d'une même règle (questions, renommages, collisions). La conversation principale relit chaque diff, puis un `verificateur` relance `npm test` et `npm run typecheck`. Elle commite par chemins explicites, après `npm run agents:diff`.

| Lot | Contenu | Fichiers | Agent | Critères de fin |
|---|---|---|---|---|
| 1 | Corpus, dictionnaire, listes de candidats | `packages/kit/tests/stress/f1-noms/{index,corpus,dictionnaire}.ts`, `packages/kit/package.json`, `package.json`, `packages/kit/CARTE.md` (section `scripts/`) | `implementeur` | `npm run stress:f1 -- --corpus` lit 16 systèmes et 14 871 noms ; les deux variantes de chemins rendent le même nombre de noms ; le dictionnaire s'écrit avec 657 mots ± 5 ; les trois listes de candidats s'écrivent dans `_local/stress/f1-noms/dictionnaire/` ; sans `--slice`, aucune lecture du fichier Slice ; `npm run typecheck` passe |
| 2 | Mutations et générateurs | `packages/kit/tests/stress/f1-noms/{mutations,scenarios}.ts`, `packages/kit/tests/stressF1Harnais.test.ts` | `implementeur` | Chaque mutation de M-01 à M-05 est à distance 1 de sa source (`distanceUnOuEchange`) et hors du vocabulaire ; deux exécutions avec la graine 7001 donnent la même empreinte ; le nombre de cas par strate vaut celui de 3.5 (marge de 5 % pour les mutations écartées, écart écrit dans le rapport) ; le squelette seul donne zéro question (P-23) ; le test passe en moins de 2 secondes |
| 3 | Oracle, exécution, rapport | `packages/kit/tests/stress/f1-noms/{oracle,detecteur,execution,rapport}.ts` | `implementeur-exigeant` | Le cas `backgrond` avec `k = 4` sort manqué ; le cas `separator` près de `divider` sort « P-11 manqué » ; P-21 et P-22 passent sur 100 fichiers du corpus ; `rapport.md` contient le tableau opérateur × axe avec marges ; `--rapide` finit en moins d'une minute ; le temps du mode complet est mesuré et écrit dans l'en-tête |
| 4 | Faux positifs et seuil | `packages/kit/tests/stress/f1-noms/faux-positifs.ts`, `packages/kit/tests/stress/f1-noms/seuil.mjs`, `packages/kit/tests/stress/f1-noms/donnees/distincts.json` (liste écrite à la main, 30 paires) | `implementeur` | Les 64 passes s'exécutent ; `faux-positifs.csv` classe toute sortie en FP-A à FP-D ; `a-juger.csv` compte 200 lignes au plus ; `courbe-seuil.csv` contient les lignes L = 3 à 8 ; le chargeur de seuil échoue si la constante change de forme ; aucune écriture hors de `_local/` |
| 5 | Slice | `packages/kit/tests/stress/f1-noms/{corpus,index}.ts` (option `--slice`, `--verifier-fuite`) | `implementeur` | Avec `--slice`, toutes les sorties vont sous `_local/stress/f1-noms/slice/` ; `git check-ignore` confirme ce dossier ; `--verifier-fuite` sort 0 après les lots 1 à 4 et sort 1 sur un fichier suivi où l'on a écrit un segment de test ; `git status` ne montre aucun fichier nouveau issu de Slice |
| 6 | Mesure de l'existant | Aucun fichier de code ; sorties sous `_local/stress/f1-noms/` ; résumé dans `docs/notes/Recherches/UCM Architect/8 Fiabilisation/MESURE-DES-FAILLES.md` | `verificateur` lance les commandes ; la conversation principale écrit le résumé | `npm run stress:f1` complet termine en moins de 10 minutes ; `manques.csv` rattache chaque manqué à un écart ; les classements `formes.json` et `synonymes.json` sont faits avant ce lot (Q-F6) ; `npm run agents:diff` passe |
| 7 | Tests de régression (après les corrections du kit) | `packages/kit/tests/stressF1Regressions.test.ts`, `packages/kit/tests/fixtures/stress-f1/cas-representatifs.json` | `implementeur` | 60 cas répartis en 9 tests ; chacun porte son P-xx et son E-xx ; aucun nom de Slice ; `npm test` passe en moins de 2 secondes de plus ; `npm run stress:f1 -- --attendre-zero` sort 0 |

Les lots 1 à 5 se suivent. Le lot 6 attend le classement du mainteneur (Q-F6). Le lot 7 attend les corrections du kit, qui font l'objet d'un plan séparé.

## 9. Questions au mainteneur

Le mainteneur a laissé la suite en autonomie. La conversation principale tranche chaque question à titre provisoire (tableau ci-dessous) ; le mainteneur peut revoir ces choix. Les cas qui en dépendent sont comptés à part dans le rapport.

| Id | Décision provisoire |
|---|---|
| Q-F1 | Oui : deux mots hors vocabulaire à distance 1 donnent une question, sans présélection, le plus fréquent proposé en premier (D2). |
| Q-F2 | Aucune présélection, même avec un seul candidat : toute proposition arrive décochée (Q-03). |
| Q-F3 | Dans l'onglet Questions : une faute ou un mot collé d'un seul nom n'est pas rangé dans « Autres pistes » (D1). |
| Q-F4 | Le seuil L est la plus petite longueur qui garde moins de 1 faux positif pour 1 000 noms justes du corpus. |
| Q-F5 | Oui pour un synonyme listé dont le terme UCM est unique ; sinon une information sans action. |
| Q-F6 | La conversation principale classe les listes du lot 1 avant le lot 6 ; le mainteneur relit `formes.json` et `synonymes.json` ensuite. |
| Q-F7 | Le mainteneur choisit le fichier au moment de la recette. La question ne bloque aucun lot. |
| Q-F8 | Oui, la collection UCM proche est proposée en question, sans présélection. |
| Q-F9 | Hors oracle : les fautes à deux lettres sont mesurées et comptées à part. |
| Q-F10 | La conversion par `couche` est retenue. |

| Id | Question | Pourquoi elle compte |
|---|---|---|
| Q-F1 | Deux mots hors vocabulaire à distance 1, l'un fréquent et l'autre rare, doivent-ils produire une question faute ? Le code ne le fait pas aujourd'hui : il exige que la référence soit du vocabulaire. | Fixe P-06 et la strate S4 |
| Q-F2 | La question faute présélectionne aujourd'hui « Corriger X en Y ». Garde-t-on la présélection quand un seul terme du vocabulaire est à distance 1, et la retire-t-on quand il y en a plusieurs ? | La règle produit demande une correction exacte ou une question sans présélection (P-05) |
| Q-F3 | Une faute ou un mot collé présent dans un seul nom (score 1) va-t-il dans l'onglet Questions ou dans « Autres pistes » ? | D1 dit que la faute est signalée ; le seuil de score 2 la range dans « Autres pistes » (E-13) |
| Q-F4 | Quel budget de faux positifs pour D4 : zéro faux positif certain sur le corpus, ou un taux pour 1 000 noms ? | Fixe la règle de choix de L (4.3) |
| Q-F5 | Un synonyme non toléré employé seul (`surface` sans `background`) donne-t-il une question ? | D3 parle des formes tolérées et des synonymes ; le terme cible d'un synonyme isolé n'est pas unique |
| Q-F6 | Qui classe les candidats du dictionnaire (formes d'un même mot, mots distincts, synonymes) et à quel moment ? Le plan propose : le mainteneur relit les listes du lot 1 avant le lot 6. | Sans classement, ces candidats ne comptent dans aucun oracle |
| Q-F7 | Quel fichier Figma sert aux gestes G1 à G14 ? Le plan suppose un fichier de recette existant, auquel le mainteneur ajoute une douzaine de variables à la main. | La recette ne prévoit aucune migration |
| Q-F8 | Une collection écrite à une lettre d'une collection UCM (`thme`) doit-elle proposer cette collection en question, sans présélection ? `proposee` n'est jamais produit aujourd'hui (E-15). | Fixe P-19 |
| Q-F9 | Les fautes à deux lettres (S3) restent-elles hors oracle, ou D1 les couvre-t-il ? | Le plan les mesure sans les juger |
| Q-F10 | La conversion des noms de design system en collections par `couche` (2.2) convient-elle ? | Elle détermine les natures de segment et les mots que le détecteur saute |
