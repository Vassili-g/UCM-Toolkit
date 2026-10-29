# Pistes de réflexion pour l'architecture globale UCM

> Pistes pour plus tard. La direction retenue est la [version minimale](./VERSION-MINIMALE.md) ;
> ce document n'y revient qu'en cas de manque constaté à l'usage.

**Statut :** pistes. Ce document ne rédige aucun contenu : ni nomenclature,
ni texte du référentiel, ni parcours écrit. Il liste, pour chaque sujet
encore ouvert, les options, les questions et les essais qui prépareraient la
décision. Aucune option n'est retenue.

Lecteur : le mainteneur, pour choisir ce qu'il veut creuser ; l'agent qui
reprend, pour savoir quelles pistes existent déjà.

## 1. Le parcours du designer

**La question.** Dans quel ordre un designer ouvre-t-il les produits UCM, et
le découpage en produits suit-il cet ordre ?

**Deux situations de départ, à distinguer partout.**

| Situation | Exemple | Ce qu'elle demande |
|---|---|---|
| Un design system neuf | Un fichier vide | Créer dans l'ordre : palettes, architecture, composants, publication |
| Un design system existant à assainir | Le fichier client C2 : 2 415 tokens, modes écrits dans les noms, grammaires qui varient | Relever, déclarer, corriger par lots, sans casser les composants publiés |

Palettes connaît déjà la seconde situation : il reprend une palette du
fichier et retrouve ses réglages. L'Architecte devrait-il offrir la même
reprise pour `theme` et la nomenclature ?

**Pistes.**

- Un parcours par étapes fixes, que chaque plugin rappelle (« étape 2 sur 5 :
  l'architecture »).
- Un parcours par chantiers indépendants : le designer ouvre le plugin du
  sujet qu'il traite, sans ordre imposé.
- Un état du fichier lu par chaque plugin : palettes écrites, `theme` posé,
  nomenclature déclarée, tokens publiés. Chaque plugin dit ce qui manque en
  amont de son propre travail.

**Questions.**

1. Le designer revient-il en arrière souvent (une palette modifiée après la
   pose de `theme`) ? Le parcours doit alors dire ce que ce retour invalide.
2. Le développeur entre-t-il dans le parcours avant la première demande de
   fusion, par exemple pour relire la nomenclature ?

**Essai.** Rejouer le remappage que le mainteneur a fait à la main (fichier
C3) en notant chaque geste et chaque plugin ouvert.

## 2. La nomenclature de base

**La question.** D'où vient la nomenclature qu'un design system adopte, et
qu'est-ce qu'UCM y met par défaut ?

**Pistes, de la plus agnostique à la plus prescriptive.**

| Piste | Ce qu'UCM fournit | Ce que le designer fait |
|---|---|---|
| Aucune nomenclature par défaut | Le moteur seul | Il déclare tout depuis le relevé de son fichier |
| Le minimum que les outils lisent déjà | Les termes dont dépend un comportement : rôles du dernier segment, états reconnus, segment `fontweight`, dossiers de `theme` | Il déclare le reste |
| Des profils importables | Plusieurs nomenclatures prêtes, alignées sur des systèmes publics | Il en choisit une, puis l'ajuste |
| Une nomenclature UCM complète | Positions, vocabulaires et termes pour toutes les collections | Il l'adopte ou déclare ses écarts |

Une action distincte pourrait transformer en lot le nom de chaque variable
selon une casse choisie, par exemple Capitalisée, minuscules ou `camelCase`.
Elle montrerait les nouveaux noms et les collisions avant toute écriture.
Cette transformation ne remplace pas une table de renommage de termes.

La contrainte du format s'applique à toutes : aucune nomenclature ne devient
obligatoire.

**Deux précautions de la revue.** Deux termes qui visent la même couleur ne
nomment pas forcément le même concept : une erreur de saisie et une action
destructrice peuvent partager une couleur et demander des usages différents.
Une décision de synonymie porte donc sur un contexte défini et reste
révisable. Une collection peut aussi porter plusieurs formes de chemin
légitimes (un bouton a des états, une alerte n'en a pas) : une grammaire à
segments facultatifs plutôt qu'une forme unique. Le contrôle des conventions
adoptées passe avant la découverte de synonymes, qui reste une aide.

**Questions.**

1. Une nomenclature se déclare-t-elle par collection, par couche, ou pour
   tout le fichier ?
2. Comment une nomenclature évolue-t-elle sans renommer des centaines de
   variables d'un coup : par version, par collection, par terme ?
3. Le développeur valide-t-il une modification de la nomenclature ? La
   déclaration publiée dans `tokens.json` passe par une demande de fusion :
   cette revue serait le lieu de l'accord designer–développeur que CONCEPT.md
   décrit.
4. Quels formats de casse proposer, et comment traiter les collisions avant
   d'écrire les nouveaux noms ?

**Essai.** Faire juger cinquante paires candidates de C2 au mainteneur, et
mesurer la part de jugements qui dépendent de la position du terme.

## 3. Le référentiel pour un designer qui arrive

**La question.** Par quel canal un designer apprend-il les définitions
d'UCM ?

**Pistes de canal.**

| Canal | Où le designer le lit | Précédent |
|---|---|---|
| Une page générée depuis les données du kit | Navigateur | Le schéma JSON dérivé de `types.ts` |
| Une planche dessinée dans le fichier Figma | Figma, sur une page dédiée | Les planches de Palettes |
| Un glossaire au survol d'un terme dans chaque plugin | Le plugin ouvert | Les libellés français de l'aperçu de Palettes |
| La description des variables de `theme` | Le panneau des variables, si Figma l'affiche (R8) | Aucun dans UCM |
| Le rapport de `ucm check` | La demande de fusion | Les messages destinés au designer |

**Questions.**

1. Le référentiel s'adresse-t-il au designer, au développeur et à l'agent par
   le même texte, ou par trois formes tirées de la même donnée ?
2. Une définition propre à un design system (un terme qu'il ajoute) rejoint-
   elle le référentiel, ou reste-t-elle dans sa déclaration ?
3. Le référentiel est-il bilingue (question 4 de la proposition) ?

## 4. Le rôle d'UCM Toolkit

**La question.** Comment définir en une phrase ce que le Toolkit apporte, à
côté des plugins ?

**Pistes de définition.**

- Le Toolkit porte les règles que les plugins appliquent dans Figma et que la
  CI applique dans le dépôt. Les plugins en sont des lecteurs.
- Le Toolkit est le côté dépôt d'UCM : contrôles, feuille CSS, guide des
  agents. Le référentiel en sort pour devenir un paquet à part.
- Le Toolkit est le nom de l'ensemble, et chaque paquet porte un rôle :
  `@ucm-kit/core` les règles, `@ucm-kit/cli` le dépôt, les adaptateurs le
  code.

**Questions.**

1. Le référentiel reste-t-il un sous-chemin de `@ucm-kit/core` ou devient-il
   un paquet ?
2. Le mot « Toolkit » désigne-t-il le monorepo, les paquets publiés, ou les
   deux ?

## 5. L'exporteur et l'analyse des tokens

**La question.** La demande initiale décrit l'exporteur comme le plugin qui
analyse les composants **et** les tokens. La proposition confie le bilan des
tokens à l'Architecte. Que garde l'exporteur ?

**Pistes.**

- L'exporteur garde un résumé du bilan avant l'export des tokens : les
  constats que la CI relèvera sur ce qui part. Le bilan détaillé reste dans
  l'Architecte.
- L'exporteur ne lit aucune règle d'architecture : il publie, la CI juge.
- L'exporteur absorbe l'Architecte, et devient le plugin d'architecture et
  de publication (alternative D de la proposition).

**Question.** Le designer exporte-t-il les tokens au même moment qu'il les
corrige, ou à un moment distinct ? La réponse décide si le résumé suffit.

## 6. Les règles des composants

**La question.** Quelles règles UCM s'appliquent à la construction d'un
composant, et où se contrôlent-elles ?

**Règles déjà écrites, à situer** : une variable de `components` par
propriété ; jamais de primitive dans le code (architecture multimarque,
sections 2 et 8). Règle de l'exporteur : une propriété sans variable produit
un avertissement.

**Pistes.**

- Un contrôle « propriété liée à une variable hors de `components` », dans
  l'exporteur ou le bilan, sur option.
- Un geste de l'Architecte qui crée la branche `components/{composant}` à
  partir des propriétés que l'exporteur relève.
- Une règle de lint dans le dépôt qui refuse `--primitives-*` dans le code
  d'un composant.

**Questions.**

1. La grammaire de `components` est-elle la même pour tous les composants,
   ou propre à chacun ?
2. Un composant composé déclare-t-il des tokens pour ses dépendances, ou les
   laisse-t-il à leurs propres contrats ?

**Essai.** Mesurer sur le fichier Figma du Playground la part des propriétés
liées à une variable de `components` (R12).

## 7. La typographie

**Pistes.**

- Des constats dans le bilan : style de texte non lié, calque de texte sans
  style, nom hors de l'échelle déclarée.
- Une grammaire typographique dans le référentiel, avec l'ordre des segments
  à choisir (question 12).
- Un générateur d'échelle sur le modèle de Palettes, avec des garanties
  (interligne minimal, écart entre deux niveaux).
- Aucune règle typographique propre à UCM : la typographie suit la
  nomenclature générale.

**Question.** Les réglages typographiques par marque (`color-brands.params.font.*`
dans l'architecture multimarque) appartiennent-ils à l'Architecte ou à un
générateur ?

## 8. Les icônes

**Pistes.**

- Une liste du jeu générée dans le dépôt depuis le Kit Font Awesome, lue par
  `ucm icons` et l'Architecte.
- Une bibliothèque Figma d'icônes en composants, régénérée depuis le Kit, et
  une règle du bilan qui refuse un vecteur posé hors de cette bibliothèque.
- Une règle de lint dans le dépôt qui refuse une classe `fa-*` absente de la
  liste.

**Question.** Le jeu d'icônes est-il une donnée du design system (déclarée
dans Figma) ou une donnée du dépôt (tirée du Kit) ?

## 9. La diffusion des plugins

**Pistes.**

- Quatre plugins sur la Figma Community, chacun utile seul : l'explorateur
  touche aussi des équipes qui n'emploient pas UCM.
- Une suite présentée comme telle : un fichier Community qui explique le
  parcours et renvoie aux quatre plugins.
- Un plugin unique à espaces : plus lourd (plus de 1,5 Mo), une seule
  installation.

**Question.** L'explorateur reste-t-il un produit UCM, ou devient-il un outil
autonome qui ne mentionne pas UCM ?

## 10. La gouvernance des définitions

**Pistes.**

- Les contributeurs d'UCM décident du référentiel ; le designer décide de sa
  déclaration ; la demande de fusion est le lieu où le développeur l'accepte.
- Chaque terme du référentiel porte un statut et un remplaçant (modèle de
  Spectrum), pour qu'un terme retiré guide la migration.
- Un terme ajouté par plusieurs design systems remonte dans le référentiel.

**Question.** Qui tranche quand la déclaration d'un design system contredit
le référentiel : le designer, toujours, puisque la nomenclature reste
facultative ?

## 11. La recette et la définition des crans dans le dépôt

**La question.** La demande initiale demande si la définition des crans doit
rejoindre le dépôt, pour les agents. La planche de Palettes la montre déjà
dans Figma ; rien ne la porte jusqu'au code.

**Pistes.**

| Piste | Ce qui arrive dans le dépôt | Ce qu'elle suppose |
|---|---|---|
| Rien de plus | Les noms des variables de `theme` seuls | Le référentiel du kit suffit à un agent pour lire `solid/hover` |
| Les descriptions des variables de `theme` | `$description` dans `tokens.json` | L'export publie les descriptions ; l'Architecte les écrit (R8) |
| Le rôle de chaque palette et le sens de chaque thème | Une extension de `tokens.json` : `primary`, statut, texte des boutons | L'Architecte déclare les rôles ; la recette reste dans Figma |
| La recette entière | Une extension de `tokens.json` ou un fichier séparé | L'exporteur lit l'espace partagé `ucm_palettes` ; le dépôt reçoit des nombres que seul Palettes emploie |

**Questions.**

1. Un agent a-t-il besoin des nombres de la recette, ou seulement du rôle de
   chaque variable ?
2. La table du kit dépend du sens de chaque thème : le dépôt doit-il savoir
   qu'un thème est inversé pour lire correctement `solid/hover` ?

## 12. Un standard UCM, ou des outils agnostiques

**La question.** Le mainteneur la pose ainsi : si un plugin écrit la
structure des tokens, UCM devient un standard de structure, à la manière de
Material, et le plugin ne sert plus sur une autre structure. Est-ce trop
restrictif, ou UCM se présente-t-il comme un écosystème qui fournit toute
l'architecture et l'automatise ?

**Ce que le dépôt fait déjà.** Il tient les deux à la fois. L'architecture
multimarque est un standard de fait ; les outils restent agnostiques :
`ucm check` n'exige aucun nom de collection, l'explorateur n'en réserve
aucun, le profil UCM ne s'applique qu'à la demande, et Palettes écrit dans la
destination que le designer choisit.

**Pistes.**

| Piste | Vérifier | Déclarer les noms | Construire | Sur une autre structure |
|---|---|---|---|---|
| Outil agnostique | Les règles que le designer déclare | Oui | Rien | Tout fonctionne |
| Socle agnostique et profil UCM | Socle : forme des noms, modes, valeurs manquantes. Profil : couches, table du kit | Oui | Seulement avec le profil UCM | Le socle fonctionne ; la construction non |
| Construction paramétrée | Les règles déclarées | Oui | Selon la structure déclarée : quelle collection joue quel rôle, quel gabarit de chemin | Tout fonctionne, si la structure est déclarée ; promesse large, que la destination de Palettes ne démontre pas |
| Écosystème UCM | L'architecture UCM | Dans le cadre UCM | L'architecture UCM complète | Hors du périmètre |

La destination de Palettes est un précédent limité de construction
paramétrée : le designer choisit la collection, le groupe et la forme des
thèmes, et le plugin écrit dedans. Choisir une destination ne démontre pas la
capacité à générer des règles de thème différentes.

**Questions.**

1. UCM se présente-t-il comme une méthode, avec une architecture
   recommandée, ou comme une boîte à outils qui s'adapte à toute structure ?
2. Les équipes visées partent-elles d'un fichier neuf, où un standard aide,
   ou d'un fichier existant, où un standard imposé oblige à tout renommer ?
3. Le format interdit déjà d'exiger un renommage. Un plugin qui construit
   une structure UCM respecte-t-il cette règle s'il ne touche jamais aux
   variables existantes ?

**Une précision sur la fréquence des questions au designer.** Le plugin ne
demanderait pas les normes à chaque ouverture : une fois au relevé initial,
puis seulement quand un terme inconnu apparaît.

## 13. Les deux périmètres : agnostique et full UCM

**L'orientation.** Le mainteneur répond à la question 12 par les deux à la
fois : chaque outil sert toute équipe sur sa propre structure, et propose un
mode full UCM à l'équipe qui suit toute l'architecture. Chaque outil rend ce
choix visible. Les pistes ci-dessous en tirent les conséquences ; aucune
n'est retenue.

**Le dépôt suit déjà ce schéma en partie.** `ucm check` est agnostique et
garde le diagnostic des contrastes en information ; le profil d'architecture
s'active à la demande ; Palettes écrit dans la destination choisie ; la SPEC
de l'explorateur interdit toute alerte d'absence d'UCM.

**Ce que chaque produit ferait dans chaque périmètre.**

| Produit | Agnostique | Full UCM |
|---|---|---|
| UCM Palettes | Rampes, contrastes, palettes libres, destination libre | Table en dossiers, neuf garanties, destination `primitives`, courbes de l'architecture |
| UCM Architecte | Vérifier les règles que le designer déclare ; construire dans la structure qu'il déclare | Vérifier contre l'architecture UCM ; poser `color-brands`, `color-utilities`, `theme`, `components` |
| UCM Token Explorer | Seul périmètre : la lecture, sans opinion | Aucun mode propre, ou les libellés du référentiel à côté des noms |
| UCM Contract Exporter | Export et constats actuels | Constats en plus : propriété liée hors de `components`, rôle employé sur le mauvais support ; publication de la déclaration |
| `ucm check` | Contrôles actuels | Table du kit, nomenclature UCM, aucune primitive citée dans le code |

**Où se règle le périmètre.**

| Piste | Effet | Limite |
|---|---|---|
| Un réglage par outil | Chaque plugin a son interrupteur | Le designer peut activer full UCM dans Palettes et l'oublier dans l'exporteur |
| Une déclaration par fichier | La déclaration du fichier dit « ce fichier suit UCM » ; chaque plugin la lit, l'exporteur la publie dans `tokens.json`, `ucm check` la lit | La donnée ne voyage pas avec la bibliothèque : un fichier qui l'emploie ne la voit pas (R4) |
| Une déclaration par domaine | Couleurs en full UCM, nomenclature libre, par exemple | Plus de combinaisons à expliquer et à tester |

**L'adoption progressive.** Une équipe qui part d'un fichier existant (C2) ne
bascule pas d'un coup. Pistes : le full UCM comme un ensemble de profils
activables un à un, « full » voulant dire tous activés ; un relevé de la
distance entre le fichier et l'architecture UCM, sans score, puisque
l'exporteur exclut le scoring.

**La sévérité des constats.** En agnostique, tout écart à une règle d'UCM
reste une information. En full UCM, le designer a choisi la règle : un écart
pourrait-il devenir un avertissement, voire bloquer une demande de fusion sur
option du dépôt ?

**Les risques.**

- Deux périmètres doublent les cas à tester et à documenter dans chaque
  outil.
- Le mode agnostique doit rester simple : aucune mention d'UCM qui
  ressemble à un manque.
- Un périmètre mal affiché laisse croire au designer qu'un contrôle tourne
  alors qu'il est coupé.

**Réponses du mainteneur.**

- Le périmètre se règle **par outil**.
- Les contrôles deviennent **plus stricts en full UCM**.
- Palettes doit permettre de **désactiver ses fonctions propres à UCM**, pour
  générer des palettes sans les contrôles, peut-être sans contraste.
- L'adoption progressive passe par **un hub** qui montre le niveau
  d'adoption et les étapes suivantes : piste 14.

**Le périmètre agnostique de Palettes, pistes.**

| Fonction | Propre à UCM ? | En agnostique |
|---|---|---|
| Rampes, Color shift, réglage global | Non | Gardés |
| Contraste WCAG d'une nuance contre un fond | Non : règle universelle | Gardé, ou désactivable à la demande du mainteneur |
| Table en dossiers, bandes `solid`, `surface`, `page` de l'aperçu | Oui | Retirés |
| Les neuf garanties et leurs alertes | Oui : elles dépendent de la table | Retirées |
| Texte des boutons et sens du thème | Oui | Retirés |
| Planche « Quelle nuance pour quelle variable » | Oui | Planche réduite aux rampes |
| Destination `primitives` / `colors` | Défaut UCM | Destination libre, déjà possible |

Question : le contraste reste-t-il affiché en agnostique, comme une
information universelle, ou disparaît-il avec les garanties ?

**La sévérité en full UCM, pistes.**

- Un écart à une règle UCM passe d'information à avertissement.
- Le dépôt peut rendre bloquants certains écarts, sur option écrite dans
  `ucm.config.json`, puisque le périmètre de `ucm check` se règle là.
- Une règle que le designer a déclarée lui-même (nomenclature) reste-t-elle
  en avertissement, même en full UCM ?

**Questions restantes.**

1. Le nom des deux périmètres : « libre » et « UCM », « standard » et
   « full UCM », autre ?
2. Où chaque plugin range-t-il son périmètre ? `clientStorage` est propre à
   un plugin et à un poste : le hub ne pourrait pas le lire. Une donnée
   rangée sur le fichier serait lisible par tous les plugins et suivrait le
   fichier.
3. Le référentiel s'adresse-t-il seulement au full UCM, ou aussi aux règles
   déclarées en agnostique ?
4. Le passage de l'agnostique au full UCM est-il un geste réversible ?

## 14. Le hub UCM : niveau d'adoption et étapes suivantes

**L'idée du mainteneur.** L'Architecte montre le niveau d'adoption d'UCM
d'un fichier, les étapes suivantes et les outils à employer : il devient le
hub qui guide une équipe vers un design system fiable.

### 14.1 Ce que le hub peut lire depuis un fichier Figma

| Signal | Source | Lisible par un autre plugin ? |
|---|---|---|
| Une recette de palettes existe | Espace partagé `ucm_palettes`, clé `recette` | Oui, dans le fichier de la bibliothèque |
| Les palettes sont écrites en variables, à jour ou modifiées à la main | Suivi `ucm_palettes/variables`, marques sur chaque variable | Oui |
| Les collections suivent les couches | Association des collections aux couches | Oui, si l'Architecte la range sur le fichier |
| `theme` est complet et vise les bonnes nuances | Variables, table du kit, recette | Oui |
| Une nomenclature est déclarée, et ses écarts | Déclaration de l'Architecte | Oui |
| Les propriétés des composants sont liées à des variables | Parcours des composants, page par page | Oui, au prix du chargement des pages |
| Chaque composant a ses règles d'usage | Instances de `.componentRules` | Oui, même coût |
| Le dépôt est configuré, les tokens et contrats publiés | Réglages de l'exporteur, dans son `clientStorage` | Non : propres à l'exporteur |
| La CI passe, le code suit les contrats | Le dépôt | Non, sans accès réseau |

Deux limites découlent du tableau. L'exporteur ne range rien dans le
document : c'est une loi de son code. Le hub ne voit donc pas l'état de la
publication, sauf si cette loi change ou si le hub lit le dépôt lui-même,
avec un jeton comme l'exporteur. L'API Plugin ne permet pas, à notre
connaissance, d'ouvrir un autre plugin : le hub nomme l'outil, il ne le lance
pas. Ce point est à vérifier.

### 14.2 La forme du niveau d'adoption

| Piste | Ce que le designer voit | Ce qu'elle suppose |
|---|---|---|
| Une échelle de niveaux | « Niveau 2 sur 5 » | Un ordre unique des étapes ; un fichier existant peut avoir des étapes avancées et des manques anciens. La revue recommande que les degrés d'adoption ne deviennent pas des étapes obligatoires |
| Une liste par domaine | Couleurs, architecture, noms, composants, publication, code : pour chacun, fait, en cours, à faire | Des domaines indépendants, cohérents avec un périmètre par outil |
| Une carte du parcours | Les produits UCM en schéma, chacun avec son état | Le parcours du designer (piste 1) |
| Aucun score | Des constats et des gestes, sans chiffre global | La règle de l'exporteur, qui exclut le scoring |

### 14.3 Ce que chaque étape montrerait

Pour une étape : l'état lu dans le fichier, la raison de l'étape pour la
fiabilité, l'outil à ouvrir, le geste suivant, et ce que l'étape débloque. La
rédaction de ces étapes est un contenu : elle attend les décisions.

### 14.4 Le hub et les deux périmètres

- En agnostique, le hub montre les étapes génériques (variables liées,
  noms cohérents, publication) sans jamais présenter l'absence d'UCM comme un
  manque.
- En full UCM, il montre aussi la distance à l'architecture UCM.
- Le périmètre se règle par outil : le hub pourrait montrer le périmètre de
  chaque outil, s'il est rangé sur le fichier (piste 13, question 2).

### 14.5 Où vit le hub

| Piste | Ce qu'elle apporte | Ce qu'elle coûte |
|---|---|---|
| L'écran d'accueil de l'Architecte | Un plugin de moins ; le bilan et le guide au même endroit | L'Architecte porte trois rôles : guider, vérifier, construire |
| Un petit plugin hub séparé | Le premier plugin à installer, léger, qui renvoie aux autres | Un cinquième plugin |
| Un fichier Community et une page de documentation | Rien à installer | Rien de lu dans le fichier : aucun état réel |
| Le rapport de `ucm check` | L'état du dépôt, que Figma ne voit pas | Rien de lu dans Figma |

Une combinaison possible : le hub dans Figma pour ce que le fichier montre, et
le rapport de `ucm check` pour ce que le dépôt montre, chacun renvoyant à
l'autre.

### 14.6 Axes de recherche

- Les modèles de maturité des design systems publiés (Nathan Curtis,
  Sparkbox) : leurs étapes, leurs critères, ce qu'ils mesurent.
- Les outils qui affichent la santé d'un design system : Supernova,
  zeroheight, les tableaux de bord d'adoption (Omlet, analytics de
  bibliothèque Figma).
- L'API Plugin : ouvrir un autre plugin, lire l'analytics de bibliothèque.

### 14.7 Questions

1. Le hub mesure-t-il un fichier, ou l'ensemble d'un design system
   (bibliothèque et fichiers qui l'emploient) ?
2. Le hub montre-t-il l'état du dépôt, ce qui lui demande un accès réseau et
   un jeton ?
3. L'exporteur peut-il ranger dans le document une trace de son dernier export
   pour le hub, malgré sa loi actuelle ?

## 15. Le cycle d'un changement entre Figma et le code

**La question.** La revue relève le manque principal du dossier : la demande
de fusion est désignée comme le lieu d'accord, sans dire ce qui se passe en
cas de désaccord. Exemple : le designer remplace `press` par `pressed` dans
Figma ; le développeur refuse la publication tant que le code n'a pas migré.
Les deux noms ont alors une fonction légitime.

**Les quatre situations à distinguer**, quelle que soit leur représentation :

| Situation | Où elle vit | Qui la fait avancer |
|---|---|---|
| Le travail en cours | Le fichier Figma | Le designer |
| Le changement proposé | Une demande de fusion ouverte | Le designer, qui la relit avec le développeur |
| La version acceptée | La branche principale d'un dépôt | Le développeur du dépôt |
| La version adoptée | Le code d'une application qui l'emploie | L'équipe de cette application |

**Pistes.**

- Le refus d'une proposition laisse trois suites au designer : la corriger,
  différer la migration, ou garder le changement en préparation sans perdre
  l'état accepté.
- Un changement cohérent pour le consommateur peut demander plusieurs
  publications : tokens, contrats, puis code. L'unité de travail ne se règle
  pas sur la contrainte d'un fichier par export.
- Une table de renommage explique la correspondance ; elle ne décide pas quand
  l'ancien nom peut disparaître.
- Avec plusieurs dépôts, une publication s'adopte à des moments différents.
  Le premier périmètre peut se limiter à un dépôt, en l'annonçant.

**Questions.**

1. Quelle version un plugin montre-t-il : le travail en cours, ou la dernière
   version acceptée ?
2. Le hub (piste 14) affiche-t-il ces quatre situations ?
3. Qui décide qu'un ancien nom peut disparaître ?

**Essai.** Un changement réel sur un composant de la bibliothèque Intencial,
suivi de Figma jusqu'au code, en notant les désaccords, les informations
perdues et les reprises manuelles.
