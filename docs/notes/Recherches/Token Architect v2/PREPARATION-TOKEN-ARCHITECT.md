# Préparation de UCM Token Architect

Ce document recueille les demandes du mainteneur pour UCM Token Architect,
liste les fonctions possibles et donne un avis sur chacune. Les réponses du
mainteneur et les décisions encore ouvertes sont à la
[section 8](#8-décisions).

UCM Token Architect réunit deux plugins existants : UCM Token Explorer
(`packages/plugin-explorateur`) et UCM Nomenclature
(`packages/plugin-nomenclature`). L'ancien nom « UCM Architect » désignait
Nomenclature et n'est plus employé. Nomenclature garde en interne la clé de
données partagées `ESPACE_ARCHITECT` et la clé de fenêtre
`ucm-architect/tailleFenetre`, qui ne gênent pas le nouveau nom.

## 1. Les demandes

| # | Demande |
|---|---|
| D1 | Fusionner UCM Token Explorer et UCM Nomenclature en un plugin nommé UCM Token Architect |
| D2 | Mode Composant : une grande barre latérale à droite affiche les erreurs détectées sur le composant |
| D3 | Nom des propriétés du composant incohérent avec les tokens, et correction automatique |
| D4 | Erreur de mapping (mauvais token, repéré en comparant la structure du composant à celle des tokens), et correction automatique |
| D5 | Oublis, et correction |
| D6 | Tous les contrôles que le kit sait faire, à lister ; la typographie et les icônes viendront plus tard |
| D7 | Mapping automatique des variables sur un composant quand la structure correspond, et correction des liaisons existantes |
| D8 | Composant de règles (`.componentRules`) : complétude et validité, génération et correction automatique |
| D9 | Contraste de tous les éléments |
| D10 | Bon emploi des crans de palette, peut-être trop complexe |
| D11 | Accessibilité |
| D12 | Autres contrôles à proposer |
| D13 | Mode Tokens : la barre latérale affiche le plugin Nomenclature |
| D14 | Mode Tokens : supprimer ou déplacer les onglets Comparer, Dépendants, Diagnostics, Intégrations et Relevés ; une fonction n'est déplacée que si elle est utile et validée par le mainteneur |
| D15 | S'inspirer de la façon de faire de « Check designs » de Figma, et des plugins semblables publiés sur GitHub |

Le but déclaré : un outil qui valide les composants et qui facilite le mapping
des tokens, tâche longue où les erreurs sont fréquentes.

## 2. Ce qui existe

| Brique | Ce qu'elle fait aujourd'hui | Où |
|---|---|---|
| Vue Composant de l'explorateur | Lit, pour le variant par défaut, les liaisons de chaque calque, les styles de texte, les valeurs sans token, la chaîne d'alias par mode, l'aperçu et la boîte des calques. Ne lit pas les propriétés de composant. Ne juge rien | `plugin-explorateur/src/lectureDuComposant.ts`, `src/composant.ts` |
| Mode Tokens de l'explorateur | Arbre des groupes, table des variables, inspecteur, et les onglets Variables, Comparer, Dépendants, Diagnostics, Intégrations, Relevés | `plugin-explorateur/src/ui/` |
| UCM Nomenclature | Onglets Renommages, Questions et Règles, Configuration avec Historique ; renomme les variables et collections locales avec aperçu et annulation | `plugin-nomenclature/src/` |
| Exporteur | Environ 130 points à corriger, rangés en huit familles (disposition, propriétés, imbriqués, variables, styles, règles, non exportés, fichier), émis pendant l'export d'un composant ; pose une instance de `.componentRules` préremplie depuis le contrat | `plugin-exporter/src/contract/`, `src/template/` |
| `ucm check` | Contrat lisible et complet, graphe de composition, échantillons, types typographiques, tokens absents de la source, parité code et contrat, contraste en information | `kit/src/lecteurs/` |
| Référentiel du kit | Crans, modes, collections et leurs cibles admises, dossiers du thème (`solid`, `surface`, `page`, `ring`) et cran de chaque variable, champs que peint chaque variable (`SUPPORT_DES_VARIABLES`), états (`STATE_SELECTORS`, `REGISTRE_ETATS`), seuils de contraste, recommandation `anneau-de-focus` | `kit/src/referentiel/`, `kit/src/emplois/` |
| Profil UCM de l'explorateur | Quatre règles sur les tokens, en information : `couche`, `valeur-directe`, `portee`, `nuance` | `plugin-explorateur/src/integrations/profilUcm.ts` |

Deux éléments manquent :
- Aucune fonction ne donne « le token attendu d'un calque » à partir de son
  rôle, de son état et des axes du variant. Le kit en porte les trois
  ingrédients séparément.
- Les cas (a) à (g) de la [recherche sur le contrôle de structure](../Plugin%20Architect/6%20Contrôle%20de%20structure/RECHERCHE-CONTROLE-DE-STRUCTURE.md)
  sont décrits mais non construits.

## 3. Les contraintes

### 3.1 Token Architect écrit dans le document

Décidé : Token Architect n'est pas en lecture seule. L'invariant actuel de
l'explorateur, tenu par `tests/loiDeLectureSeule.test.ts`, cède la place à une
loi d'écriture du type de celle de Nomenclature : un seul fichier qui écrit,
une relecture avant chaque écriture, un aperçu avant et après, et un point
d'annulation par lot. Token Architect écrira des liaisons de variables, des
noms de variantes, des règles, et changera la sélection au clic sur un
constat.

### 3.2 Les composants et les tokens vivent dans deux fichiers Figma

Le mode Composant travaille dans le fichier des composants, sur des variables
de bibliothèque. Pour proposer un token qu'aucun calque n'emploie encore, le
plugin doit lister les variables de la bibliothèque (`figma.teamLibrary`, qui
demande la permission `teamlibrary` dans le manifeste) puis importer la
variable choisie (`importVariableByKeyAsync`) avant de la lier. Aucun des deux
manifestes actuels ne déclare cette permission.

Le mode Tokens travaille dans le fichier des tokens. Un plugin n'écrit que dans
le fichier ouvert : une correction qui toucherait les deux fichiers à la fois,
comme renommer un token pour qu'il suive une propriété, ne se fait pas en un
geste.

### 3.3 Les contrôles de l'export passent dans le kit

Les quelque 130 points à corriger sont émis par la lecture du contrat, dans
`plugin-exporter/src/contract/`. Décidé : ces contrôles passent dans le kit,
et l'exporteur comme Token Architect les y lisent. Le partage suivrait celui
de Nomenclature. Le socle relève le composant dans Figma et en fait un relevé
sérialisable. Le kit juge ce relevé, sans appeler `figma`. Les contrats que
l'exporteur produit avant et après le déplacement doivent être identiques
octet pour octet : les tests de l'exporteur en sont la garde.

### 3.4 Les sévérités

`ucm check` et l'exporteur restent agnostiques : ils ne bloquent que sur une
variable manquante, et tout constat d'usage des couleurs est une information.
Le panneau de Token Architect peut classer ses constats pour le designer sans
bloquer l'export. Les contrôles propres à l'architecture UCM ne s'activent
qu'avec la déclaration « Ce fichier suit l'architecture UCM », que la
Configuration de Nomenclature range déjà dans le document.

Chaque fonction des tableaux porte son périmètre :
- **agnostique** : vaut pour toute structure de tokens ;
- **full UCM** : demande l'architecture UCM déclarée ;
- **les deux** : une forme agnostique, et une forme plus stricte en full UCM.

### 3.5 La correction automatique

Nomenclature montre chaque renommage en deux colonnes, avant et après, et
n'écrit qu'au clic sur Appliquer. Les cas ambigus deviennent des questions.
Le mainteneur a validé ce modèle. La même forme convient aux corrections de
Token Architect : un lot de corrections sûres avec aperçu, et une question
pour chaque cas qui a plusieurs candidats.

### 3.6 Le marché

Figma propose « Check designs », réservé aux offres Organization et Enterprise.
Il signale les valeurs en dur, les éléments d'une mauvaise bibliothèque, les
composants détachés et le contraste. Il lie une variable proposée par
proximité de valeur, de nom et de fréquence d'usage. Les plugins de la
communauté (Color Variable Matcher, Variable Binder, FigmaLint) lient aussi par
valeur exacte ou proche. Aucun outil trouvé ne compare la structure d'un
composant (axes, variants, rôles des calques) à la structure de ses tokens.

### 3.7 Le volume

La vue Composant lit le seul variant par défaut et s'arrête à 2 000 calques.
Contrôler un jeu de variants demande de lire tous ses variants. Le coût sur les
plus gros jeux reste à mesurer, avec `findAllWithCriteria` et
`figma.skipInvisibleInstanceChildren`.

### 3.8 Le contraste réel

L'API ne rend pas la couleur composée sous un calque. Le plugin doit remonter
les ancêtres et fusionner leurs fonds unis, opacité comprise. Un dégradé, une
image ou un mode de fusion ne se calcule pas ainsi : le contrôle rend alors une
limite, ou passe par une image exportée dont il lit les pixels.

### 3.9 Ce que Check designs et les plugins libres font

Sources lues : l'[aide de Figma](https://help.figma.com/hc/en-us/articles/39592284074263),
l'[annonce](https://forum.figma.com/product-updates-3/check-designs-catch-what-s-off-ship-what-s-right-54551),
deux fils du forum ([ignorer un constat](https://forum.figma.com/suggest-a-feature-11/check-designs-ignore-or-exclude-suggestions-54643),
[panneau vide](https://forum.figma.com/report-a-problem-6/check-designs-feature-doesn-t-work-for-my-team-57153)),
et le code de [design-lint](https://github.com/destefanis/design-lint),
[figmalint](https://github.com/southleft/figmalint) et
[variables-toolkit](https://github.com/birrrzha/variables-toolkit), sous
licences libres. Le code a été lu par résumé : les numéros de ligne restent à
vérifier sur le code brut.

| Mécanisme | Chez qui | Reprise dans Token Architect |
|---|---|---|
| Quatre onglets (Couleurs, Dimensions, Typographie, Composants), un total en haut, ouverture sur le premier onglet non vide | Check designs | Familles de constats et total (C68) ; ouverture sur la première famille non vide |
| Lignes rangées sous des intitulés ; un clic sur l'intitulé sélectionne le groupe | Check designs | Constats groupés par cause identique : « 12 calques liés à `primary` dans le variant `secondary` » (C75) |
| Étiquette « Match » pour une égalité exacte ; sinon suggestion proche | Check designs | Niveau de confiance affiché sur chaque proposition (C76) |
| Classement des candidats par trois signaux : valeur, nom et hiérarchie de la variable, fréquence d'usage ; sans modèle de langage selon l'aide | Check designs | Les mêmes signaux, et un quatrième : la structure du composant (C76) |
| Candidats filtrés par les portées de la variable | figmalint ; conseillé par l'aide de Figma | Filtre des candidats par `scopes` (C18) |
| Distance de couleur RGB, tolérance de 0,1, premier mode seul | figmalint | À éviter : le kit mesure en OKLab, et chaque mode doit être comparé |
| Menu déroulant par ligne pour choisir un autre candidat | Check designs | Question à plusieurs candidats (C70) |
| Survol d'une ligne : calques surlignés sur le canevas ; survol d'un candidat : effet montré sur le canevas | Check designs | Surlignage dans l'aperçu du plugin (C1) ; montrer l'effet sur le canevas demande d'écrire puis de défaire (C77) |
| Application : une ligne, une sélection multiple, un groupe, ou toute la vue | Check designs | Lot des corrections sûres (C69), et application par groupe (C75) |
| Annulation par Ctrl+Z, puis rechargement manuel du panneau | Check designs | Un point d'annulation par lot, et constats relus après l'écriture |
| Aucun moyen d'ignorer un constat ; demandé sur le forum, avec le cas des états désactivés qui échouent au contraste | Check designs | Ignorer rangé dans les données partagées du document (C71) ; variant désactivé exclu du contraste (C53) |
| Ignorer rangé par utilisateur dans `clientStorage` | design-lint | Rangement par document, visible par l'équipe (C71) |
| Réglages : bibliothèques de référence, niveau AA ou AAA ; conseil de masquer les primitives | Check designs | Réglages du mode Composant (C78) |
| `figma.skipInvisibleInstanceChildren = true`, et main rendue tous les 1 000 nœuds | design-lint | Lecture de tous les variants (C2) ; la vue Composant lit déjà par lots de 400 |
| Calques dont le nom commence par `.` ou `_` sautés | figmalint | Même règle que le kit de règles, dont les maîtres commencent par `.` |
| Composants détachés et composants d'une bibliothèque absente signalés sans correction | Check designs | Constat seulement (C79) |

### 3.10 Lire les tokens depuis un fichier qui ne les contient pas

Les variables d'un fichier Figma appartiennent au fichier, pas à une page. Le
fichier des composants voit les variables des bibliothèques que le designer y
a activées. Aucune page source n'est donc à désigner.

| Ce que le plugin lit | Comment | Coût |
|---|---|---|
| La liste des collections des bibliothèques activées | `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync` | Faible |
| Le nom, la clé et le type de chaque variable d'une collection | `getVariablesInLibraryCollectionAsync` ; rien d'autre : ni valeur, ni alias | Faible |
| La valeur et la cible d'alias d'une variable déjà liée à un calque | `getVariableByIdAsync`, puis `resolveForConsumer`, comme la vue Composant aujourd'hui | Faible |
| La valeur d'une variable qu'aucun calque n'emploie | `importVariableByKeyAsync`, variable par variable | Élevé sur une bibliothèque entière ; à mesurer |

Les contrôles de structure (C7 à C25) comparent des noms : la liste des noms
leur suffit. Seuls le contraste d'un candidat, le mapping par valeur (C26) et
le classement par valeur (C76) demandent des valeurs. Le plugin importe alors
les seuls candidats d'une correction.

Palettes lit déjà les bibliothèques de cette façon
(`plugin-palettes/src/lectureDesVariables.ts`), avec la permission
`teamlibrary`.

Un réglage n'est nécessaire que si plusieurs bibliothèques activées portent des
variables. Proposition : le plugin choisit seul la bibliothèque dont les
variables sont déjà liées au plus grand nombre de calques, et la Configuration
permet d'en choisir une autre. Ce choix se range dans les données partagées du
document, pour toute l'équipe. Check designs a le même réglage (C78).

Limites :
- un plugin ne peut pas activer une bibliothèque ; le designer l'active dans
  Figma ;
- seules les modifications publiées de la bibliothèque sont visibles ;
- un fichier sans bibliothèque activée ni variable locale n'a pas de tokens à
  lire. L'import d'un `tokens.json`, que l'onglet Intégrations proposait,
  reste possible en dernier recours.

Check designs ne compare ni les variants entre eux, ni les axes du composant
aux chemins des tokens. Il ne contrôle pas non plus la règle d'un composant de
règles. Il lie une couleur en dur ; il ne corrige pas une liaison fausse.

## 4. Mode Composant

Le composant sélectionné s'affiche à gauche, comme la vue Composant actuelle.
La barre latérale à droite liste les constats par famille. Chaque constat nomme
le calque, le variant, ce qui est faux et la correction proposée.

Légende des colonnes :
- **Source** : demandé par le mainteneur, ou ajouté par cette étude.
- **Faisable** : oui ; oui, limité (avec une borne nommée) ; partiel ; non.
- **Utilité** : forte, moyenne, faible.

### 4.1 Lecture du composant

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C1 | Vue Composant actuelle : liaisons, chaînes, aperçu, survol des calques | existe | oui | forte | agnostique | Garder comme colonne de gauche |
| C2 | Lire tous les variants d'un jeu, pas seulement le variant par défaut | ajouté | oui, limité par le volume | forte | agnostique | Condition de tout contrôle par variant |
| C3 | Lire les propriétés de composant : axes, booléens, textes, remplacements d'instance | ajouté | oui (`componentPropertyDefinitions`) | forte | agnostique | Condition des contrôles de nommage |
| C4 | Matrice des variants : axes en lignes et colonnes, une case par combinaison, le nombre de constats dans chaque case | ajouté | oui | forte | agnostique | Montre d'un coup d'œil les combinaisons absentes et les variants fautifs |
| C5 | Cliquer un constat sélectionne le calque dans Figma et zoome dessus | ajouté | oui | forte | agnostique | Contredit l'invariant actuel qui interdit de changer la sélection ; décision Q7 |
| C6 | Analyser tous les composants d'une page ou du fichier, avec un rapport | ajouté | oui, limité par le volume | moyenne | agnostique | Utile avant une publication de bibliothèque ; à faire après le contrôle d'un composant |

### 4.2 Nom des propriétés comparé aux tokens

La méthode compare chaque valeur d'axe d'un variant aux segments des chemins
des tokens du composant, après normalisation de la casse et des séparateurs.

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C7 | Valeur de variante absente des tokens : `Variant=Ghost` et aucun segment `ghost` | demandé | oui | forte | agnostique | Contrôle le plus direct de la demande D3 |
| C8 | Forme tolérée contre forme canonique : `press` et `pressed`, `disable` et `disabled` (`REGISTRE_ETATS`) | demandé | oui | forte | les deux | La forme canonique ne s'impose qu'en full UCM ; en agnostique, le constat compare la propriété aux tokens seulement |
| C9 | Casse ou séparateur différents : `IconLeft` et `icon-left` | demandé | oui | moyenne | agnostique | La normalisation du kit le fait déjà pour les noms de variables |
| C10 | Tailles : `Small` et `sm` (registre des tailles) | ajouté | oui | moyenne | les deux | Même mécanisme que C8 |
| C11 | Axe d'état reconnu (`State`, `States`, `Status`, `STATE_AXIS_NAMES`) | ajouté | oui | moyenne | agnostique | Sert aussi aux contrôles d'état de la section 4.3 |
| C12 | Correction : renommer la valeur de variante dans le jeu | demandé | oui | forte | agnostique | Les instances suivent. Le contrat publié change de nom de valeur : le code consommateur casse. Le constat doit l'annoncer |
| C13 | Correction inverse : renommer le token pour qu'il suive la propriété | demandé | partiel | moyenne | agnostique | Impossible depuis le fichier des composants (section 3.2). Le plugin peut préparer une règle de Nomenclature à appliquer dans le fichier des tokens |
| C14 | Même axe nommé différemment d'un composant à l'autre : `Variant`, `Type`, `Appearance` | ajouté | oui | moyenne | agnostique | Demande de lire plusieurs composants ; rejoint la piste du nommage des composants laissée ouverte par la refonte de Nomenclature |

### 4.3 Erreurs de mapping

La méthode lit chaque chemin de token lié et le compare au variant qui le
porte : un segment qui vaut la valeur d'un autre variant du même axe est une
erreur.

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C15 | Segment d'un autre variant : le variant `secondary` lié à `button/…/primary/…` | demandé | oui | forte | agnostique | Haute confiance quand les tokens suivent les axes |
| C16 | Mauvais état : le variant `Hover` lié au token `default` | demandé | oui | forte | agnostique | Erreur fréquente après une duplication de variant |
| C17 | Mauvais rôle : un fond lié à un token `foreground`, un texte lié à `border` | demandé | oui | forte | agnostique | Rôle lu dans le dernier segment du token et dans le champ lié (fond de cadre, fond de texte, contour) |
| C18 | Portée de la variable incompatible avec le champ : variable de texte posée sur un fond | ajouté | oui | moyenne | agnostique | Lu dans `scopes` de la variable |
| C19 | Token d'un autre composant : `Button` lié à `alert/…` | ajouté | oui | forte | agnostique | Valable quand les tokens commencent par le nom du composant |
| C20 | Composant qui contourne une couche : lié à une primitive au lieu du thème, cas (f) de la recherche sur la structure | ajouté | oui | forte | les deux | En full UCM, règle de `CIBLES_DES_COULEURS_DE_COMPOSANT`. En agnostique, constat de régularité : les autres variants passent par une couche que celui-ci saute |
| C21 | Variant qui s'écarte de ses frères : cinq variants lient le texte à `…/foreground`, le sixième à autre chose | ajouté | oui | forte | agnostique | Régularité apprise du composant, sans règle écrite |
| C22 | Correction : remplacer par le token frère, segment substitué, s'il existe | demandé | oui | forte | agnostique | Correction sûre quand un seul candidat existe ; sinon une question |
| C23 | Mode forcé sur un calque (`explicitVariableModes`) qui contredit le variant | ajouté | oui | faible | agnostique | Cas rare ; à garder en information |

### 4.4 Mapping automatique

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C24 | Propagation : le designer lie un variant de référence ; le plugin lie tous les autres en substituant les segments d'axe | ajouté, forme de D7 | oui | forte | agnostique | Le gain de temps le plus grand pour le risque le plus faible. Chaque liaison proposée s'appuie sur un token qui existe |
| C25 | Mapping initial par structure : rôle du calque (texte, fond de cadre, contour, calque nommé `ring` ou `focus`) et valeurs des axes donnent le chemin attendu dans les tokens du composant | demandé | oui, limité | forte | agnostique | Marche quand l'arbre des tokens suit les axes ; sinon des questions |
| C26 | Mapping par valeur : une valeur en dur égale à celle d'un token | ajouté | oui | moyenne | agnostique | Ce que fait le marché. Plusieurs tokens ont souvent la même valeur : à garder en dernier recours, toujours confirmé |
| C27 | Mapping vers le thème quand le composant n'a pas de tokens propres : `solid/default`, `surface/foreground`… selon le rôle et l'état (`TABLE_DES_DOSSIERS`) | ajouté | oui | forte | full UCM | Applique la règle du dossier : un premier plan prend le dossier du fond qui est juste derrière lui |
| C28 | Créer les tokens de composant qui manquent : `button/color/secondary/hover/background`, alias du thème | ajouté | partiel | moyenne | les deux | Écrit dans le fichier des tokens, autre fichier que celui du composant ; décision Q6 |
| C29 | Mêmes mécanismes pour les espacements, rayons, épaisseurs et tailles | ajouté | oui | forte | agnostique | Les liaisons de disposition sont aussi longues à poser que les couleurs |

### 4.5 Oublis et complétude

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C30 | Propriété sans variable : valeur en dur | demandé | existe (vue Composant, exporteur) | forte | agnostique | Devient un constat avec correction par C24 à C26 |
| C31 | Combinaison de variants absente : la matrice est incomplète | ajouté | oui | forte | agnostique | Certaines absences sont voulues (`Disabled` sans `Hover`) : le designer doit pouvoir l'ignorer |
| C32 | Token sans variant : les tokens prévoient `disabled`, le composant n'a pas de variant `Disabled` | demandé | oui | forte | agnostique | Compare l'arbre des tokens du composant à ses axes |
| C33 | Variant sans tokens : `Ghost` existe, aucun token `…/ghost/…` | demandé | oui | forte | agnostique | Symétrique de C32 |
| C34 | Calque présent dans un variant et absent d'un autre | existe (exporteur) | oui | forte | agnostique | À reprendre par le moteur commun (section 3.3) |
| C35 | Propriété booléenne ou texte qui ne pilote aucun calque ; calque masqué sans propriété | existe en partie (exporteur) | oui | moyenne | agnostique | Le second cas existe dans l'exporteur |
| C36 | Pas de variant de focus, ou focus sans anneau visible | ajouté | oui | forte | agnostique | Relève aussi de l'accessibilité |
| C37 | Description du composant vide, lien de documentation absent | ajouté | oui | faible | agnostique | Information seulement |

### 4.6 Contrôles du kit et de l'export

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C38 | Les points à corriger de l'exporteur, huit familles, affichés avant l'export | demandé | oui, après déplacement du moteur | forte | agnostique | Le plus gros chantier technique du projet ; garantit un seul verdict (section 3.3) |
| C39 | Parité entre le code et le contrat, tests, versions (`ucm check`) | demandé | non | faible | agnostique | Ces contrôles lisent le repository, absent de Figma |
| C40 | Écart avec le dernier contrat publié : propriété retirée ou renommée, rupture pour le code | ajouté | partiel | forte | agnostique | Demande de lire le contrat publié sur GitHub ou GitLab ; l'exporteur a déjà ces accès réseau |
| C41 | Variable liée introuvable : supprimée de la bibliothèque ou non publiée | ajouté | oui | forte | agnostique | Forme Figma du constat « tokens absents de la source » d'`ucm check` |
| C42 | Propriété que le contrat ne porte pas : dégradé, image, mode de fusion, masque, pointillés | existe (exporteur) | oui | moyenne | agnostique | Repris par le moteur commun |

### 4.7 Composant de règles

L'exporteur pose déjà une instance de `.componentRules` préremplie depuis le
contrat (`plugin-exporter/src/template/`), et émet onze messages sur les
règles pendant l'export. Le kit ne vérifie que la forme des maîtres du kit
(`validerLeKitDeRegles`).

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C43 | Signaler un composant sans instance de règles | demandé | oui | moyenne | agnostique | `template/sources.ts` sait déjà la trouver |
| C44 | Valider les règles : marqueur « À compléter » resté, doublons, `@prop` vers une propriété absente, aucune règle `@usage`, `@do`, `@dont` ou `@pairs` | demandé | existe (exporteur) | forte | agnostique | À déplacer avec le moteur |
| C45 | Synchroniser propriétés et règles : propriété ajoutée sans règle `@prop`, règle qui vise une propriété disparue | demandé | oui | forte | agnostique | Le cas le plus fréquent après une évolution du composant |
| C46 | Générer les règles depuis le composant | demandé | existe (exporteur) | forte | agnostique | À déplacer dans Token Architect ou à partager. `@default`, `@do`, `@dont` et `@pairs` restent au designer : le modèle refuse de les deviner |
| C47 | Correction : ajouter les règles `@prop` manquantes, retirer les règles orphelines, sans écraser une instance remplie (`estUneInstanceVierge`) | demandé | oui | forte | agnostique | Suit les trois règles d'écriture mesurées dans `template/ecriture.ts` |
| C48 | Rédaction assistée par IA des règles `@usage`, `@do`, `@dont` | ajouté | non | faible | agnostique | Demande un service externe hors du réseau permis |

### 4.8 Contraste et accessibilité

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C49 | Contraste de chaque texte et icône contre son fond effectif, dans chaque variant et chaque combinaison de modes (marque et thème) | demandé | oui, limité aux fonds unis | forte | agnostique | Calcul et seuils du kit (4,5 et 3). Les modes se résolvent par la chaîne de l'explorateur, sans changer le document |
| C50 | Contraste des contours et des anneaux de focus, 3:1 (WCAG 1.4.11) | ajouté | oui | forte | agnostique | Même calcul |
| C51 | Anneau de focus conforme à la recommandation du kit : 2 px d'écart et 2 px de trait (`anneau-de-focus`) | ajouté | oui | moyenne | full UCM | Premier consommateur de `referentiel/recommandations.ts` |
| C52 | Taille de cible d'au moins 24 × 24 px (WCAG 2.5.8) | ajouté | oui | forte | agnostique | Le composant interactif se reconnaît à un axe d'état `hover` ou `pressed` |
| C53 | Variant désactivé exclu du contraste et signalé à part | ajouté | oui | moyenne | agnostique | WCAG exempte les composants inactifs ; évite des constats faux |
| C54 | État signalé par la couleur seule : `selected` ne diffère de `default` que par une couleur | ajouté | partiel | moyenne | agnostique | Heuristique ; en information |
| C55 | Taille de texte minimale et interlignage | ajouté | oui | faible | agnostique | Seuils à décider |
| C56 | Texte qui déborde quand il grandit : hauteur fixe sans « Max lines » | ajouté | partiel | moyenne | agnostique | L'exporteur repère déjà le texte coupé |
| C57 | Vision simulée des daltonismes | ajouté | partiel | faible | agnostique | Demande une image exportée et un filtre ; la piste existe déjà pour Palettes |
| C58 | Contraste APCA en plus de WCAG 2 | ajouté | oui | faible | agnostique | WCAG 2 reste la norme contrôlée |

### 4.9 Crans et architecture UCM

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C59 | Règle du dossier : le premier plan prend le dossier et la palette du fond juste derrière lui ; un texte sur `solid/default` lie `solid/foreground` | demandé (D10) | oui | forte | full UCM | Forme simple de D10 : le composant ne juge pas un cran, il juge un dossier. `variableDuThemeReconnue` lit déjà le dossier dans un nom |
| C60 | État et dossier : `Hover` lie `solid/hover` quand `Default` lie `solid/default` ; un changement de dossier entre deux états est signalé | ajouté | oui | forte | full UCM | Complète C16 avec les états du thème |
| C61 | Cran brut : le composant lie une primitive au lieu d'une variable du thème | ajouté | oui | forte | full UCM | Forme full UCM de C20 |
| C62 | Juger le cran lui-même : 700 au lieu de 800 | demandé (D10) | oui | faible | full UCM | Un composant UCM ne voit pas de cran : la table du thème les fixe. Ce contrôle appartient au mode Tokens (règle `nuance`) |
| C63 | Variable du thème employée hors de ses champs : `surface/default` posé sur un contour (`SUPPORT_DES_VARIABLES`) | ajouté | oui | moyenne | full UCM | Forme full UCM de C18 |

### 4.10 Typographie et icônes

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C64 | Texte sans style ou sans variables de typographie ; style différent d'un variant à l'autre | demandé (plus tard) | existe (exporteur) | forte | agnostique | Repris par le moteur commun |
| C65 | Taille et graisse liées à une variable de la bonne échelle | ajouté | oui | moyenne | les deux | L'API permet de lier taille, graisse, interlignage et espacement des lettres |
| C66 | Icône : instance de la bibliothèque d'icônes, taille liée à une variable, couleur liée au premier plan du dossier | demandé (plus tard) | oui | forte | les deux | La couleur suit la règle C59 |
| C67 | Règles `@icons` : cadre, taille, pilotage par une propriété | existe (exporteur) | oui | moyenne | agnostique | Repris par le moteur commun |

### 4.11 Le panneau

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| C68 | Constats rangés par famille, compte par sévérité, filtre | ajouté | oui | forte | agnostique | Reprend le compte rendu par famille de l'exporteur |
| C69 | « Corriger » : lot des corrections sûres, aperçu avant et après, une annulation | ajouté | oui | forte | agnostique | Reprend l'onglet Renommages de Nomenclature |
| C70 | Questions pour les cas à plusieurs candidats | ajouté | oui | forte | agnostique | Reprend l'onglet Questions de Nomenclature |
| C71 | Ignorer un constat pour ce composant, rangé dans les données partagées du document | ajouté | oui | forte | agnostique | Le choix est vu par toute l'équipe ; l'Historique peut le montrer |
| C72 | État « prêt à exporter » du composant | ajouté | oui | moyenne | agnostique | Un plugin ne peut pas ouvrir l'exporteur : le panneau l'annonce seulement |
| C73 | Rapport des constats d'une page, en JSON ou en Markdown | ajouté | oui | moyenne | agnostique | Sert à une revue de bibliothèque ou à un ticket |
| C74 | Relancer les contrôles quand le composant change (`documentchange`) | ajouté | oui | moyenne | agnostique | Coût à mesurer ; un bouton Actualiser suffit au début |
| C75 | Grouper les constats de même cause et les corriger par groupe | ajouté (Check designs) | oui | forte | agnostique | Une erreur de duplication touche souvent des dizaines de calques |
| C76 | Classer les candidats d'une correction : structure, valeur, nom et hiérarchie, fréquence d'usage ; afficher « Exact » ou « Proche » | ajouté (Check designs) | oui | forte | agnostique | La structure passe en premier : elle porte la valeur propre de Token Architect. La fréquence d'usage ne se lit que dans le fichier ouvert |
| C77 | Montrer sur le canevas l'effet d'un candidat survolé | ajouté (Check designs) | partiel | faible | agnostique | Un plugin doit écrire puis défaire ; l'aperçu du plugin suffit |
| C78 | Réglages : bibliothèques de référence, niveau AA ou AAA, primitives masquées des candidats | ajouté (Check designs) | oui | moyenne | les deux | En full UCM, les primitives sont toujours masquées (C61) |
| C79 | Composant détaché, ou instance d'une bibliothèque absente | ajouté (Check designs) | oui | moyenne | agnostique | Constat sans correction automatique |

## 5. Mode Tokens

### 5.1 Nomenclature dans la barre latérale

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| T1 | La barre latérale affiche Nomenclature : Renommages, Questions, Règles, Configuration et Historique | demandé | oui | forte | les deux | La galerie de Nomenclature a déjà un état à 360 × 420 ; une barre de 420 à 480 px dans la fenêtre de 1200 px le tient |
| T2 | Lien entre l'arbre et Nomenclature : un terme choisi filtre l'arbre ; un groupe choisi dans l'arbre filtre les renommages | ajouté | oui | forte | agnostique | La raison principale de la fusion côté tokens |
| T3 | Effet d'un renommage montré dans l'arbre avant Appliquer | ajouté | oui | moyenne | agnostique | L'arbre affiche les chemins d'après |
| T4 | Une seule lecture des variables pour l'arbre et pour Nomenclature | ajouté | oui | forte | agnostique | Les deux plugins lisent aujourd'hui par deux chemins (`lecture.ts` de l'explorateur, inventaire du socle) ; deux lectures doubleraient le temps d'ouverture |

### 5.2 Le sort des onglets actuels

| Onglet | Ce qu'il fait | Avis | Proposition |
|---|---|---|---|
| Variables | Arbre, table, inspecteur | Vue principale du mode | Garder |
| Comparer | Résout la variable inspectée dans deux contextes de modes et dit où les chaînes divergent | Sert au débogage des modes, rarement | Déplacer dans l'inspecteur : « Comparer avec un autre mode » |
| Dépendants | Liste les variables qui visent la variable inspectée, directement puis par rebond | Sert avant un renommage ou une suppression, et sert à Nomenclature | Déplacer dans l'inspecteur : section « Utilisée par » |
| Diagnostics | Chaînes d'alias qui n'aboutissent pas : cycle, cible inaccessible, mode absent, type incompatible | Contrôle de structure des tokens | Déplacer dans un bloc « Structure » de la barre latérale (T5) |
| Intégrations | Contrats et tokens importés, association variable et cran de Palettes, profil UCM | Le retrait de l'onglet est déjà décidé. Les écarts avec l'export relèvent de l'exporteur. L'association aux crans est redondante : Palettes marque déjà les variables qu'il écrit | Supprimer ; les quatre règles du profil UCM passent au bloc « Structure » en full UCM (T6) |
| Relevés | Exporte un relevé, le réimporte, le compare, simule une substitution | Usage faible ; la comparaison de deux exports de tokens est la piste [diff sémantique](../Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md) | Supprimer |

### 5.3 Fonctions ajoutées

| # | Fonction | Source | Faisable | Utilité | Périmètre | Avis |
|---|---|---|---|---|---|---|
| T5 | Bloc « Structure » : chaînes cassées et cas (a) à (g) de la recherche sur la structure | ajouté | oui pour (a), (b), (c), (f) ; (e) retiré, Palettes s'en charge ; (d) à confirmer ; (g) demande deux exports | forte | agnostique | Voir Q9 |
| T6 | Règles du profil UCM : `couche`, `valeur-directe`, `portee`, `nuance` | existe | oui | forte | full UCM | Code existant à déplacer ; les associations manuelles de couches disparaissent si la déclaration UCM du fichier suffit |
| T7 | Correction des portées selon `SUPPORT_DES_VARIABLES` | ajouté | oui | moyenne | full UCM | Écrit `scopes` ; suit la loi d'écriture |
| T8 | Noms de modes cohérents entre collections | ajouté | oui | moyenne | agnostique | Le marché le contrôle (figma-token-audit) |
| T9 | Variables orphelines : aucun alias ne les vise, hors primitives | ajouté | oui, limité | moyenne | agnostique | L'usage par les composants d'un autre fichier ne se lit pas ; le constat doit le dire |
| T10 | Descriptions des variables manquantes, éditables | ajouté | oui | faible | agnostique | L'exporteur publie les descriptions en `$description` |
| T11 | Deux variables d'une même couche qui visent la même cible dans tous les modes | ajouté | oui | faible | agnostique | Information seulement |
| T12 | Générer les tokens d'un composant depuis sa structure | ajouté | partiel | moyenne | les deux | Le composant vit dans l'autre fichier ; il faudrait lire son contrat exporté. Lié à C28 |
| T13 | Contraste des paires du thème | ajouté | existe (Palettes) | faible | full UCM | Doublon de Palettes |

## 6. Le plugin entier

| # | Fonction | Source | Faisable | Utilité | Avis |
|---|---|---|---|---|---|
| G1 | Nom « UCM Token Architect », un seul identifiant de manifeste | demandé | oui | forte | Les données partagées (`ESPACE_ARCHITECT`) ne dépendent pas de l'identifiant. Les préférences de `clientStorage` en dépendent : celles du plugin abandonné sont perdues |
| G2 | Retrait du plugin Nomenclature séparé | conséquence de D1 | oui | forte | Les deux plugins sont privés ; aucune page Community à retirer |
| G3 | Mode d'ouverture choisi par le fichier : variables locales donnent le mode Tokens, composant sélectionné donne le mode Composant | existe en partie | oui | moyenne | L'explorateur choisit déjà sa disposition à l'ouverture |
| G4 | Loi d'écriture : un fichier qui écrit, un test qui le borne, aperçu et annulation | ajouté | oui | forte | Condition des corrections (section 3.1) |
| G5 | Déclaration « Ce fichier suit l'architecture UCM » partagée par les deux modes | ajouté | oui | forte | Existe dans Nomenclature ; porte le périmètre de chaque contrôle |
| G6 | Permission `teamlibrary` au manifeste | ajouté | oui | forte | Condition de C24 à C27 (section 3.2) |
| G7 | Moteur de contrôles dans le kit, commun à Token Architect, à l'exporteur et à `ucm check` | ajouté | oui | forte | Condition de C38 (section 3.3) |
| G8 | Fusionner aussi l'exporteur | ajouté | oui | faible | Un plugin trop gros ; l'exporteur garde ses accès réseau et son geste de publication. Le panneau annonce seulement « prêt à exporter » |

## 7. Avis

**La fusion.** Les deux plugins lisent les mêmes variables. L'arbre de
l'explorateur montre l'effet d'un renommage de Nomenclature, et Nomenclature
donne à l'arbre ses corrections. Côté tokens, la fusion supprime une lecture et
un changement de plugin. Le mode Composant porte la valeur nouvelle.

**Ce qui distingue Token Architect.** Le marché lie les variables par valeur, et
Check designs de Figma est réservé aux grandes offres. Son panneau sert de
modèle d'interface (section 3.9) : familles, groupes, confiance affichée,
application par groupe. Aucun outil trouvé ne
compare la structure du composant à celle de ses tokens. Les fonctions C15,
C16, C21 et C24 en tirent parti. La propagation depuis un variant de référence
(C24) donne le gain de temps le plus grand : le designer lie un variant, et le
plugin lie les autres en s'appuyant sur des tokens qui existent.

**Le bon emploi des crans (D10).** Juger un cran dans un composant (C62) a peu
d'intérêt en full UCM : le composant vise le thème, et la table du thème fixe
les crans. La règle du dossier (C59, C60) répond à la demande : un texte sur un
fond `solid` lie `solid/foreground` de la même palette. Elle est simple à
contrôler, parce que le kit reconnaît déjà le dossier dans un nom. Le contrôle
des crans eux-mêmes reste dans le mode Tokens (règle `nuance`).

**Les contrôles du kit (D6).** Les reprendre demande de déplacer la lecture du
contrat de l'exporteur dans le kit (G7). Les recopier donnerait deux verdicts
sur le même composant. Ce chantier est le plus lourd du projet, et il vient en
premier (Q5) : les contrôles nouveaux lisent le même relevé du composant
(variants, propriétés, liaisons) que l'exporteur. Les écrire avant le
déplacement créerait un second lecteur du composant, à fusionner ensuite.

**La correction automatique.** La règle retenue pour les interfaces de Palettes
interdit un bouton qui choisit une valeur à la place du designer. Ici, une
correction choisit un token. Le modèle de Nomenclature résout ce conflit : un
lot de corrections sûres montré avant et après, et une question pour chaque
cas qui a plusieurs candidats. La décision Q2 le confirme ou non.

**Les risques.**
- Le volume : lire tous les variants d'un gros jeu peut dépasser la borne
  actuelle de 2 000 calques.
- L'écriture sur des composants publiés : renommer une valeur de variante
  change le contrat et casse le code consommateur.
- Les deux fichiers : une correction qui touche composant et tokens demande
  deux gestes dans deux fichiers.
- Le contraste réel s'arrête aux fonds unis.
- La taille du projet : 79 fonctions pour le mode Composant, 13 pour le mode
  Tokens.

**À ne pas faire.** C39 (parité du code, absente de Figma), C48 (rédaction par
IA), C62 (juger un cran dans un composant), G8 (fusionner l'exporteur),
l'onglet Relevés.

**Ordre proposé.**

| Phase | Contenu | Dépend de |
|---|---|---|
| M | Maquettes : barre latérale des deux modes, interface de Nomenclature intégrée, onglets déplacés, sévérités | Q2, Q4, Q8 |
| P0 | Relevé du composant dans le socle, contrôles de l'export dans le kit ; l'exporteur les y lit, contrats identiques avant et après (G7, C38) | rien ; peut avancer pendant M |
| P1 | Fusion : coquille, identifiant de l'explorateur, Nomenclature dans la barre latérale, onglets supprimés ou déplacés, loi d'écriture, permission `teamlibrary` | M |
| P2 | Lecture de tous les variants et des propriétés (C2 à C4), tokens des bibliothèques (section 3.10), contrôles de nommage, de mapping et d'oublis (C7 à C21, C30 à C33), écrits dans le kit | P0, P1 |
| P3 | Corrections au modèle de Nomenclature : lot sûr, questions, propagation, groupes, classement des candidats (C12, C13, C22, C24, C69 à C71, C75, C76) | P2 |
| P4 | Contraste et accessibilité (C49 à C53) | P2, Q10 |
| P5 | Composant de règles (C43 à C47) | P0 |
| P6 | Full UCM : règle du dossier, mapping vers le thème, bloc Structure (C59 à C61, C27, T5 à T7) | P3 |
| P7 | Typographie et icônes (C64 à C67) | P0 |

## 8. Décisions

### 8.1 Décidé

| # | Question | Réponse du mainteneur |
|---|---|---|
| — | Lecture seule | Token Architect écrit dans le document (section 3.1) |
| — | Contrôles de l'export | Partagés dans le kit, lus par l'exporteur et par Token Architect (section 3.3) |
| Q1 | Identifiant de manifeste | Celui de l'explorateur |
| Q2 | Forme des corrections | Le modèle de Nomenclature, avec si possible la même interface, intégrée à la barre latérale de droite ; à affiner sur maquettes |
| Q3 | Écart entre une propriété et un token | Proposer les deux corrections : renommer la variante, ou préparer une règle qui renomme le token |
| Q4 | Sort des onglets | Proposition de la section 5.2 retenue ; à juger sur maquettes |
| Q5 | Ordre | Déplacer d'abord les contrôles de l'export dans le kit (section 7, phase P0) |
| Q7 | Sélection et vue du designer | Changées au clic sur un constat seulement |
| Q8 | Sévérités | Trois niveaux propres au panneau, sans effet sur l'export ; à vérifier sur maquettes |

Les quatre décisions de la [recherche sur le contrôle de structure](../Plugin%20Architect/6%20Contrôle%20de%20structure/RECHERCHE-CONTROLE-DE-STRUCTURE.md#les-décisions-attendues) :

| Question de la recherche | Réponse |
|---|---|
| Cas (e), cran saturé au blanc | Retiré : Palettes s'en charge |
| Périmètre | Les règles full UCM s'ajoutent aux contrôles agnostiques |
| Lieu | Le bloc « Structure » du mode Tokens de Token Architect ; les contrôles vivent dans le kit, et `ucm check` pourra les appeler |
| Correction | Les deux : chaque écart est signalé, et corrigé en un geste quand la correction est sûre |

### 8.2 Ouvert

| # | Question | Recommandation |
|---|---|---|
| Q6 | Générer les tokens de composant qui manquent (C28, T12) | Idée retenue, à développer dans une étude propre. Le composant vit dans le fichier des composants, et les tokens dans l'autre. Trois voies à comparer : lire le contrat publié par l'exporteur depuis le mode Tokens ; copier un squelette depuis le mode Composant et le coller dans le mode Tokens ; demander au designer d'ouvrir le fichier des tokens avec la liste préparée |
| Q9 | Cas (d) de la recherche, cran recopié d'une autre rampe : Palettes s'en charge-t-il, comme pour (e) ? | Oui : les deux cas portent sur une rampe que Palettes calcule |
| Q9 bis | Cas (g), tokens disparus entre deux exports : où le détecter ? | Dans l'exporteur, au moment d'exporter : il lit déjà la version publiée de `tokens.json` sur GitHub ou GitLab. Le mode Tokens ne voit que l'état actuel du fichier Figma |
| Q10 | Seuils d'accessibilité | Taille de cible : 24 × 24 px en constat (WCAG 2.5.8, niveau AA), 44 × 44 px en recommandation (niveau AAA, iOS). Texte : aucun minimum WCAG ; 12 px proposé en recommandation |
| Q11 | Bibliothèque de tokens quand plusieurs sont activées (section 3.10) | Choix automatique par les liaisons existantes, modifiable dans la Configuration |
