# UCM Palettes : intégrer les apports du marché, proposition finale

Ce document s'adresse au mainteneur d'UCM Palettes. Il propose une place dans
le plugin pour chaque apport que [la comparaison avec les outils du
marché](../../RECHERCHE-CONCURRENCE-PALETTES.md) retient. Il fusionne deux
propositions : [la proposition 1](../01%20Proposition%20initiale/PROPOSITION-INITIALE.md), qui
couvre les dix pistes, et [la revue de l'atelier](../02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html),
qui la critique en quinze constats. Chaque point repris ou écarté a été vérifié
dans le code, la spécification ou l'architecture ; l'[annexe](#annexe--vérifications)
donne chaque preuve.

Cette version ajoute une revue par scénario : douze situations de travail d'un
designer, jouées sur les écrans proposés. Elle change le flux global du plugin
(section [Le flux global](#le-flux-global)), corrige les pistes 1 à 9 et ajoute
les pistes 11 à 14. Le mainteneur valide ou écarte chacune des
[décisions](#les-décisions), puis essaie seul le plugin selon le protocole de
[l'essai par le mainteneur](#lessai-par-le-mainteneur). L'agent qui écrira le
plan d'implémentation part des décisions validées.

Ce document ne décide rien. La [spécification](../../RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin, et une piste retenue la modifie
d'abord. L'[architecture multi-marques](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
reste l'autorité sur la forme des variables.

Les écrans sont dans [MAQUETTES-PROPOSITION-FINALE.html](./MAQUETTES-PROPOSITION-FINALE.html),
à ouvrir dans un navigateur. Chaque couleur, chaque résultat de garantie et
chaque emploi y sort du moteur. La page se régénère depuis la racine du dépôt :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/03 Proposition finale/generer-maquettes-proposition-finale.mjs"
```

## Lexique

| Mot | Sens dans ce document |
|---|---|
| Recette | Tous les nombres qui fabriquent les palettes du fichier. Le plugin la range dans le document Figma à la fin de chaque geste, sans bouton. Elle s'exporte en JSON |
| Planche | Les cadres que le plugin dessine sur la page « Palettes » |
| Cadre | Le dessin d'une palette sur la planche : rampes, usages, contrastes. Un cadre par palette |
| Onglet Système | L'onglet que le code appelle `ongletPlanche.ts`, et que l'interface nomme aujourd'hui « Palettes ». Il liste toutes les palettes, groupées par collection et par marque |
| Onglet Palette | L'onglet que le code appelle `ongletPalettes.ts`, et que l'interface nomme aujourd'hui « Création ». Il règle la palette ouverte |
| Variable | Une valeur nommée de Figma qu'un calque peut lier, par exemple `primitives.danger.vivid.light.700`. Elle a une valeur par mode de sa collection |
| Alias | Une valeur de variable qui renvoie à une autre variable. En mode `light`, `theme.danger.vivid.700` renvoie à `primitives.danger.vivid.light.700` |
| Collection | Un groupe de variables qui partagent les mêmes modes. L'architecture en emploie trois pour les couleurs : `primitives`, `brand` et `theme` |
| Mode | Une colonne d'une collection. `brand` a un mode par marque, `theme` a `light` et `dark`, `primitives` n'en a qu'un |
| Cran | Une couleur d'une rampe, désignée par son numéro, de 50 à 950. L'interface dit « nuance » |
| Intensité | Une rampe par thème. Une palette porte Soft et Vivid, ou une seule rampe. Le code dit « profil » |
| Rôle | Ce qu'une palette est dans le système : Marque, Utilitaire, Neutre ou Sur mesure. Les trois premiers fixent les intensités et le chemin des variables de l'architecture. Sur mesure laisse les intensités libres, et n'écrit aucune variable ou remplit des variables existantes. Le rôle n'existe pas encore |
| Retouche | Une valeur de variable changée dans Figma hors du plugin, différente de la dernière valeur que le plugin y a écrite. Adoptée, elle entre dans la recette et se marque ✎ |
| Rampe lue | Une rampe existante que le plugin lit dans la sélection ou dans des variables, et reprend comme une palette dont les nuances différentes sont des retouches (piste 11) |
| Garantie | Une paire de la table des emplois dont le contraste atteint son minimum, par exemple `text` 700 sur `surface` 100 à 4,5:1. La spécification dit « promesse ». Une palette en juge seize par thème et par intensité |
| Sortie | Ce que le plugin écrit dans Figma à partir de la recette : la planche, ou les variables et leurs alias |
| Revue | La fenêtre qui liste ce qu'une écriture de variables va changer, avant l'écriture |

Trois gestes écrivent dans le document, et le reste de ce texte les sépare.
**Ranger la recette** se fait seul, à la fin de chaque geste de l'onglet
Palette. **Dessiner la planche** et **écrire les variables** partent de
« Actualiser sur Figma… », en tête de l'onglet Système, ou d'« Actualiser cette
palette… », sous le titre de l'onglet Palette.

## Le flux global

Le designer travaille sur un système : des marques, leurs familles, le neutre
et les utilitaires. La version précédente de cette proposition gardait le flux
actuel du plugin et y ajoutait des objets. Joué sur les scénarios de la section
suivante, ce flux a trois défauts.

1. **Le système n'a pas d'écran.** Le plugin s'ouvre sur l'onglet Création,
   sans palette choisie, avec une invitation sans geste (`[UI-06]`). La
   structure du système se répartit entre le jeu de départ, les groupes de
   l'onglet Palettes, une carte repliée des Réglages communs et le rôle de
   chaque palette. Une famille manquante n'apparaît que dans un avertissement.
2. **L'écriture part de chaque fiche.** Chaque fiche porte son bouton
   principal (`[UI-05]`). Avec les dix-sept palettes de l'architecture, la
   liste aligne jusqu'à dix-sept boutons principaux, et « Actualiser tout »
   la suit, hors de vue. La règle « un rang 1 hors de vue n'est pas un
   rang 1 » ([CONTRIBUTING](../../../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation))
   n'est pas tenue. Les variables forment pourtant un système : une valeur
   écrite pour une palette sans les alias des autres ne sert à rien.
3. **Régler et écrire sont dans deux onglets.** La boucle la plus fréquente,
   régler une palette puis voir le résultat dans Figma, demande de changer
   d'onglet et de retrouver la fiche. De plus, trois gestes portent le mot
   « Actualiser » avec trois sens : relire le fichier (en-tête de l'onglet
   Palettes), écrire une palette, écrire toutes celles qui ont changé.

**La proposition.** Les deux onglets changent de nom et d'ordre ; leur nombre
ne change pas.

- **L'onglet Système** vient en premier, et le plugin s'ouvre sur lui. C'est
  l'onglet Palettes actuel, rangé en groupes (piste 2) : `primitives`, puis
  une marque par groupe, puis Sur mesure. Une famille qui manque dans une
  marque y a sa case, qui ouvre la création déjà remplie (piste 5).
  « + Ajouter une marque » suit le dernier groupe de marque. Un fichier sans
  palette ouvre la création, comme aujourd'hui.
- **Un seul bouton principal**, « Actualiser sur Figma… (N) », en tête de
  l'onglet Système. N compte les palettes dont une sortie au moins n'est pas à
  jour. Il ouvre la revue du système, une ligne par palette, chacune
  décochable (piste 3). Les fiches perdent leur bouton principal et gardent
  « Afficher » et « Modifier ». Le bouton « Actualiser » de l'en-tête
  disparaît : le plugin relit le fichier à l'ouverture, au retour sur l'onglet
  et au clic final de la revue.
- **L'onglet Palette** est l'onglet Création actuel. Sous le titre « Palette
  [nom] », une ligne donne l'état de la palette dans Figma, en pastille, et le
  lien « Actualiser cette palette… », qui ouvre la même revue limitée à cette
  palette. Le lien n'est pas un bouton principal : « Nouvelle palette » reste
  le seul de l'onglet.

Trois exigences changent : `[UI-02]` (noms, ordre, onglet ouvert au
lancement), `[UI-05]` (le geste de la fiche passe dans l'en-tête et sous le
titre de la palette) et `[UI-06]` (l'écran d'ouverture). La règle des surfaces
de [CONTRIBUTING](../../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes)
change sur deux points : la fiche n'a plus de bouton principal, et sous le
titre de l'onglet Palette se lit aussi l'état dans Figma. Le code garde ses
noms de fichiers, comme il les garde déjà.

**Ce que le designer y gagne.** À l'ouverture, il voit son système et ce qui
attend. Il règle une palette et l'écrit sans quitter l'onglet. Il écrit tout
le système d'un geste, qu'il trouve en haut de l'écran.

## Les scénarios du designer

Chaque scénario se joue sur les écrans de la page de maquettes. La colonne
« Friction » dit ce qui accrochait dans la version précédente de cette
proposition, la dernière colonne donne la correction.

| Scénario | Parcours proposé | Friction | Correction |
|---|---|---|---|
| Un design system neuf | Fichier vide : « Le jeu de départ », une ligne par marque, « Créer 9 palettes », puis « Actualiser sur Figma… » en tête de l'onglet Système | Le plugin s'ouvrait sur une palette à choisir ; après la création, rien ne disait que les variables restaient à écrire | Flux global, pistes 2 et 5 |
| Un système multi-marques à créer | Le jeu de départ, puis « + Ajouter une marque » sous les groupes | Une marque se gérait en trois endroits : le jeu de départ, « Compléter le jeu de départ » dans le menu « … », et la liste des marques dans une carte repliée des Réglages communs | Pistes 2, 5 et 9 |
| Un système multi-marques à mettre à jour | Palette ouverte : nouvelle référence, puis « Actualiser cette palette… » sous le titre | Changer d'onglet et retrouver la fiche parmi dix-sept. Bleu A et Bleu K déclenchaient « palettes proches » sans jamais s'afficher ensemble | Flux global, piste 13 |
| Light et Dark à créer | Chaque palette porte ses deux thèmes. Un réglage commun, comme « Fonds du thème Dark », dit combien de valeurs écrites il change | Un réglage commun récrivait des centaines de valeurs sans le dire avant la revue | Piste 3 |
| Light et Dark à mettre à jour, dans un système qui a déjà ses variables | Palette Sur mesure reliée aux variables du fichier, un mode par thème, puis une décision pour toutes les valeurs présentes | Le plugin n'écrivait que ses trois collections : un système existant aurait reçu un second jeu de variables | Piste 12 |
| Une structure de tokens non conventionnelle | La même liaison, avec un motif de nom, par exemple `color/blue/{nuance}` | Aucun chemin d'écriture hors de l'architecture | Piste 12 |
| Des palettes faites à l'œil, sans test de contraste | Sélectionner les pastilles existantes, « Une rampe existante », comparer, créer avec la rampe lue, puis rétablir les nuances fautives | Une palette ne partait que d'une couleur : la rampe existante ne se mesurait pas, et le designer perdait son dessin | Piste 11 |
| Une palette pour un nouveau composant | Rôle Utilitaire ou Marque avec « Autre famille… », ou Sur mesure | Les familles étaient des listes fermées : une palette de composant finissait sans variables | Piste 1 |
| Plusieurs palettes proches, légèrement différentes | « Dupliquer la palette », régler, « Comparer à » dans l'aperçu, puis « Proches à dessein » | L'alerte sonnait sur chaque variante voulue, et comparer demandait d'alterner entre deux palettes | Piste 13 |
| Des palettes « jolies » | Régler avec la rampe témoin sous les yeux, juger avec les spécimens de la marque et des statuts | L'aperçu sort de la vue pendant le réglage, et la marque n'était jamais montrée à côté des statuts | Pistes 7 et 14 |
| Changer le nombre de nuances d'un système écrit | La revue du système compte les variables créées, et celles des nuances retirées, qui restent sans palette | Rien ne disait ce que devenaient les variables des nuances retirées | Piste 3 |
| Refondre la charte d'une marque | Nouvelles références, puis la revue du système, groupée par palette, identité comprise | Couvert par les pistes 3 et 4 | Aucune |

Deux situations restent hors du plugin. Une palette de données, faite de
teintes distinctes à clarté égale, ne suit pas la table des emplois ; la
[recherche](../../RECHERCHE-CONCURRENCE-PALETTES.md) l'écarte déjà. Un thème à
contraste renforcé demande un troisième mode de `theme`, que l'architecture ne
prévoit pas.

## Le principe commun

Six règles tiennent les pistes ensemble.

1. **Le plugin s'ouvre sur le système.** L'onglet Système montre les marques,
   leurs familles, les couleurs communes et ce qui manque. L'onglet Palette
   règle la palette ouverte.
2. **Un geste écrit dans Figma.** « Actualiser sur Figma… », en tête de
   l'onglet Système, ouvre la revue de tout ce qui a changé. La palette ouverte
   a le même geste, limité à elle. La planche et les variables gardent chacune
   leur état, et la pastille montre le plus urgent.
3. **Une palette a un rôle.** Marque, Utilitaire, Neutre ou Sur mesure. Les
   trois premiers fixent les intensités que l'architecture demande et le
   chemin des variables. Une palette neuve est Sur mesure, sans variables : le
   designer essaie une couleur sans décider de son rôle. Changer de rôle
   montre d'abord ce qui change.
4. **Aucune variable ne s'écrit sans revue.** La revue compte ce qui change
   en trois unités : variables créées, valeurs par mode écrites, cadres
   dessinés. Elle compare trois valeurs : la dernière appliquée, celle de la
   recette et celle de Figma. Elle ne choisit rien à la place du designer, et
   une valeur non décidée ne s'écrit pas. Le plugin relit le document au clic
   final.
5. **Une retouche adoptée entre dans la recette.** Les garanties se jugent
   alors sur elle. Une rampe existante se reprend de la même façon, nuance par
   nuance. Le cran qui porte la couleur de référence n'admet pas de retouche :
   une valeur différente y devient une nouvelle référence, ou disparaît.
6. **Une alerte ne compare que ce qui s'affiche ensemble.** Deux palettes de
   deux marques ne partagent jamais un mode de `brand`.

| # | Piste | Où | Coût | Proposition |
|---|---|---|---|---|
| 1 | Le rôle de la palette | Onglet Palette, Configuration de la palette, sélecteur | Moyen | Faire |
| 2 | Deux sorties, un geste, l'onglet Système | Onglet Système, ligne d'état de l'onglet Palette | Moyen | Faire |
| 3 | La revue avant écriture | Modale, depuis les deux onglets | Élevé | Faire |
| 4 | Les retouches | Revue, aperçu, détail d'une nuance, planche, rapport | Moyen | Faire |
| 5 | Le jeu de départ | Création dans un fichier vide, cases vides de l'onglet Système | Moyen | Faire après 1 |
| 6 | La couleur de la sélection | Sélecteur de couleur, création | Faible | Faire |
| 7 | Les statuts en vision simulée, avec la marque | Onglet Système, rapport | Faible | Faire après 1 |
| 8 | Les fonds lus sur le neutre | Réglages communs | Moyen | À discuter |
| 9 | Les collections et les marques | Réglages communs, groupes de l'onglet Système | Faible | Faire avec 3 |
| 10 | Les aides et la langue des planches | Onglet Palette, Contenu des planches | Faible | Faire |
| 11 | Reprendre une rampe existante | Création, aperçu, alertes | Moyen | Faire après 4 |
| 12 | Relier une palette à des variables existantes | Configuration d'une palette Sur mesure, revue | Élevé | À discuter |
| 13 | Les palettes proches | Alertes, aperçu, rapport | Faible | Faire |
| 14 | La rampe témoin des réglages | Cartes Teinte, saturation, luminosité et Dérive de teinte | Faible | Faire |

## Les pistes

Chaque piste suit le même ordre : le problème aujourd'hui, ce que fait le
marché, la proposition, pourquoi ce choix, ce que le designer y gagne, ce qui
change dans la spécification et la recette, le coût et les risques.

### Piste 1 : le rôle de la palette

**Aujourd'hui.** La carte « Configuration de la palette » demande un Modèle,
Standard ou Libre, et un nombre d'intensités, une ou deux (`[ENT-14]`). La
spécification dit qu'une palette ne sait pas à quoi elle sert (D3).
L'architecture fixe pourtant les intensités par usage : une pour une rampe de
marque et pour le neutre, deux pour un utilitaire. Le designer peut créer une
palette de marque à deux intensités, et rien ne le lui signale.

**Le marché.** Material Theme Builder fixe des rôles. Radix part de trois
entrées : accent, gris et fond. Aucun outil relevé n'écrit la forme de
l'architecture, où le thème fait partie du chemin et où les marques sont des
modes.

**La proposition.** La carte commence par la rangée « Rôle dans le
système », en quatre segments. Chaque rôle ne montre que les champs qui lui
manquent.

| Rôle | Intensités | Champs demandés | Chemin des variables |
|---|---|---|---|
| Marque | Une | Marque, que la liste termine par « Nouvelle marque… » ; famille (`primary`, `secondary`, « Autre famille… ») | `brand.palette.{famille}.{thème}.{cran}` et `brand.identity.{famille}`, dans le mode de la marque |
| Utilitaire | Deux | Famille (`danger`, `warning`, `success`, `info`, « Autre famille… »), « Référence exacte dans » | `primitives.{famille}.{soft, vivid}.{thème}.{cran}` |
| Neutre | Une | Aucun : la famille est `neutral` | `primitives.neutral.{thème}.{cran}` |
| Sur mesure | Au choix | Modèle, Intensités, comme aujourd'hui ; Variables : « Aucune » ou « Variables existantes… » (piste 12) | Aucun, ou les variables reliées |

Une palette neuve est Sur mesure, sans variables. Une ligne secondaire sous la
rangée donne le chemin des variables, que le plugin assemble sans choisir de
nom. La ligne du neutre dit aussi que son cran 50 vaut les fonds par défaut de
la recette, `#F7F7F7` et `#121212`. Elle ne dit pas que ce cran est le fond de
page : c'est la piste 8, encore à discuter.

« Nouvelle marque… » change la liste en champ : le nom tapé devient une
marque de la recette, et un mode de `brand` à la prochaine actualisation.
« Autre famille… » fait de même pour une famille. Elle sert la palette d'un
composant, par exemple `purple` pour des étiquettes : sans elle, cette palette
n'aurait que le rôle Sur mesure et aucune variable. L'architecture fixe
aujourd'hui quatre utilitaires et deux familles de marque (section 2) : elle
doit admettre ces familles ajoutées avant que la piste les propose.

Deux palettes ne peuvent pas avoir la même destination : la même famille dans
`primitives`, ou la même famille dans la même marque. La rangée refuse ce choix
et nomme la palette qui l'occupe.

Changer le rôle d'une palette existante ouvre un aperçu sous la rangée, sur le
modèle du changement de nombre de nuances (`[ENT-13]`). L'aperçu montre :

- les rampes avant et après. Passer à une intensité garde la rampe qui porte
  la référence et retire l'autre. Passer à deux récrit la référence si une
  saturation propre était réglée ;
- le résultat des garanties avant et après, calculé par le moteur ;
- les variables : celles qui seront à écrire, et celles qui resteront dans
  Figma sans palette. Figma ne déplace pas une variable d'une collection à une
  autre, et les calques liés restent liés aux anciennes ;
- l'état du cadre, qui passera « À actualiser ».

Rien ne change avant « Passer en Marque », et « Annuler » ne range rien. Une
palette Libre qui prend un rôle reprend la liste commune des nuances, et
l'aperçu le dit.

Le sélecteur de palette range ses entrées sous les groupes de l'onglet
Système : Neutre et utilitaires, une marque par groupe, Sur mesure.

**Pourquoi ce choix.** La proposition 1 remplace Modèle, Intensités et
destination par ce seul choix. L'atelier (constat P2·08) sépare l'identité de
la palette et sa destination dans Figma, avec des intensités proposées en
préréglage. Cette séparation laisse saisir une palette de marque à deux
intensités, puis la refuse au moment de l'affectation. Le rôle unique rend
cette combinaison impossible à saisir, et la carte perd une rangée.

L'atelier a raison sur deux points, que cette version reprend. D'abord,
« Autre » mêlait trois sens : un essai pas encore rangé, une palette Libre et
une palette sans variables. La version précédente l'appelait « Hors
variables ». La piste 12 relie une palette hors de l'architecture à des
variables existantes : ce nom deviendrait faux. Le rôle s'appelle donc « Sur
mesure », et la rangée « Variables », juste dessous, dit la conséquence :
« Aucune », ou les variables reliées. Comme il est le rôle par défaut, un essai
ne demande aucune décision. Une palette Libre y reste, puisque l'architecture
dit qu'elle n'alimente pas `theme`. Ensuite, un changement de rôle peut changer des
couleurs : le code de l'édition retire l'intensité qui ne porte pas la
référence, ou récrit la référence. L'aperçu de conversion le montre avant.

**Pour le designer.** Un choix au lieu de trois rangées. La carte lui apprend
l'architecture au moment où il crée. Un essai se crée comme aujourd'hui, et
prend un rôle plus tard sans surprise.

**Spécification et recette.** D3 : le plugin connaît la marque et la famille
que le designer saisit, et ne nomme toujours rien seul. `[ENT-14]` : le choix
des intensités ne reste libre que pour Sur mesure. `[UI-06]` et `[UI-11]` :
la rangée Rôle, le sélecteur groupé. La recette passe au format 7 : `role`,
`famille` et `marque` par palette, et la liste `marques`. Une recette au
format 6 migre en Sur mesure, sans variables, pour toutes ses palettes : aucune
variable ne s'écrit sans un geste du designer. Architecture, section 2 : les
familles ajoutées dans `primitives` et dans `brand`.

**Coût.** Moyen : une rangée, un aperçu, une migration et ses états de galerie.

**Risques.** Le mot « Sur mesure » passe par la relecture des textes. Une
famille ajoutée agrandit `theme` de onze ou vingt-deux alias. La
palette `primary` d'une marque porte ses actions, pas forcément la première
couleur de sa charte (architecture, section 4) : l'aide du rôle Marque le dit.

### Piste 2 : deux sorties, un geste, l'onglet Système

**Aujourd'hui.** L'onglet Palettes montre une fiche par palette : nom et état
du cadre en pastille, aperçu, référence et garanties, puis trois gestes. Le
premier dessine ou actualise le cadre (`[UI-05]`). La seule sortie est la
planche.

**Le marché.** Harmonizer met à jour les variables qu'il a écrites quand il
retrouve son cadre d'aperçu par son nom. OKLCH Color Scale écrit une collection
à modes Light et Dark. Aucun outil relevé ne documente un état par sortie.

**La proposition.** L'onglet Palettes devient l'onglet Système (section
[Le flux global](#le-flux-global)). Une palette qui a des variables a deux
sorties.

| Sortie | États |
|---|---|
| Planche | Les cinq d'aujourd'hui : « À jour », « À actualiser », « Pas encore sur Figma », « Cadre introuvable », « Lecture impossible » |
| Variables et alias | « À jour », « À écrire », « À décider » |

« À décider » couvre une retouche faite dans Figma et une valeur sans
provenance : le designer fait le même geste pour les deux, ouvrir la revue et
choisir. La ligne sous la référence dit laquelle : « 1 retouche faite dans
Figma », « 22 valeurs présentes sans provenance ».

La fiche garde une pastille. Elle montre l'état le plus urgent des deux
sorties, dans cet ordre : un état de danger du cadre, puis « À décider », puis
un travail à faire (à écrire, à actualiser, pas encore sur Figma), puis « À
jour ». Quand les deux sorties ont des états différents, la ligne de la
référence les nomme : « Planche à jour · Variables : 23 valeurs à écrire ».
Une palette Sur mesure sans variables n'a que la planche.

La fiche n'a plus de bouton principal : « Afficher » quand le cadre est
localisé, puis « Modifier », qui ouvre la palette dans l'onglet Palette.
L'écriture part d'un seul bouton principal, en tête de l'onglet :
« Actualiser sur Figma… (4) ». Son compte est celui des palettes dont une
sortie au moins n'est pas à jour. Il dessine directement si aucune variable
n'est concernée, et ouvre la revue sinon. « Générer tout », qui redessine les
cadres à jour, rejoint la section repliée « Palettes et réglages » : c'est un
geste de réparation.

Sous le titre de l'onglet Palette, une ligne reprend la pastille et la ligne
de la fiche, suivies du lien « Actualiser cette palette… », ou « Décider… »
quand une décision attend. Une palette à jour n'a pas de lien. Une palette
Sur mesure sans variables a « Générer sur Figma », qui dessine sans revue.

Les fiches se rangent en groupes repliables. Le titre du groupe est en mots
du designer, la collection en code à côté :

- « Neutre et utilitaires » `primitives` ;
- « Marque A » `brand` : une marque par groupe, avec un menu « ⋯ » qui
  renomme la marque ou la retire ;
- « Sur mesure » : les autres palettes.

`theme` n'a pas de groupe : ses alias suivent la sortie Variables de chaque
palette. Dans le groupe d'une marque, une famille qu'une autre marque possède
et que celle-ci n'a pas prend une case en tirets, à la place de sa fiche :
« `secondary` manque dans Marque B », avec « Créer la palette » et la liste
des palettes Sur mesure à reprendre (piste 5). Un mode de `brand` que le
plugin n'a pas créé a son groupe, avec « Suivre ce mode… ».
« + Ajouter une marque » suit le dernier groupe de marque.

**Pourquoi ce choix.** La proposition 1 donnait à chaque palette un seul état,
le plus grave des deux, et un seul geste qui écrivait tout. L'atelier (constat
P1·01) montre deux défauts, vérifiés dans le code. Une police absente arrête
le dessin avant tout calque ; si les deux sorties sont indissociables, elle
bloque aussi les variables, qui n'ont besoin d'aucune police. Et la ligne
« Cadre à jour · 23 variables à écrire » de la proposition 1 montrait déjà
deux états. Cette version adopte la solution de l'atelier : deux sorties
cochables dans la revue, et une pastille unique.

La version précédente gardait un bouton principal par fiche. Avec les
dix-sept palettes de l'architecture, la liste en alignait autant, et le geste
qui écrit tout le système restait sous la liste. Le bouton unique en tête
suit la règle du rang 1 visible sans défiler. La boucle d'une seule palette
passe par la ligne de l'onglet Palette, là où le designer vient de régler.

Deux états « Retouche à décider » et « Valeurs à attribuer » demandaient au
designer de distinguer deux causes pour un même geste. « Attribuer » ne disait
pas non plus à qui.

Pour les groupes, l'atelier (constat P2·09) jugeait `primitives`, `brand` et
`theme` trop techniques. Le groupe des palettes communes prend le nom des deux
rôles qu'il range, « Neutre et utilitaires » : le designer retrouve dans
l'onglet Système les mots qu'il a choisis dans l'onglet Palette. La collection
reste écrite en code, parce que c'est le mot que le designer retrouve dans le
panneau des variables de Figma.

**Pour le designer.** À l'ouverture, le système et ce qui attend. Un bouton
pour tout écrire, en haut. Un lien pour écrire la palette qu'il règle. Une
police manquante n'empêche plus d'écrire les variables.

**Spécification et recette.** D2 et la section 5 : le plugin écrit des
variables. `[UI-02]`, `[UI-05]` et `[UI-06]` : les noms et l'ordre des onglets,
les états, le bouton de l'en-tête, la ligne de l'onglet Palette, l'onglet
ouvert au lancement. [CONTRIBUTING, surfaces d'UCM Palettes](../../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes) :
la fiche sans bouton principal, les groupes, la case vide, la ligne sous le
titre de l'onglet Palette. La recette ne change pas pour cette piste.

**Coût.** Moyen.

**Risques.** Le compte d'objets du protocole de relecture (point e) : la
seconde ligne ne paraît que lorsque les sorties diffèrent, et la fiche perd un
bouton. Les libellés de la pastille passent par la relecture des textes.

### Piste 3 : la revue avant écriture

**Aujourd'hui.** Le plugin n'écrit aucune variable. Deux gestes demandent déjà
une confirmation : l'import d'une recette montre son écart (`[REC-08]`), et le
dessin nomme les calques ajoutés par le designer (`[PLA-03]`).

**Le marché.** Aucun outil relevé ne documente la détection d'une valeur
retouchée à la main, ni une revue avant écriture.

**La proposition.** Une modale, sur le modèle de « Ajuster la référence »
(`[UI-15]`) : 520 px de large au plus, voile, Tab retenu. Le titre et les
gestes restent visibles, et le corps défile quand la hauteur manque. Elle
contient, de haut en bas :

1. **Les deux sorties**, chacune avec une case, cochée par défaut, et son
   état. « Planche : 1 cadre à dessiner ». « Variables et alias : 66
   variables à créer, 88 valeurs à écrire ». Une sortie impossible est
   décochée et dit pourquoi : « Police Inter Semi Bold indisponible ». L'autre
   reste possible.
2. **Le détail par collection**, en trois unités nommées partout : variables
   créées, valeurs par mode écrites, cadres dessinés. Les renommages et les
   modes créés ont leur ligne.
3. **Les décisions**, une par valeur en conflit, sans choix coché (piste 4).
4. **Les garanties après écriture**, calculées par le moteur sur les valeurs
   finales : recette et retouches adoptées.
5. **Les gestes** : « Annuler » et « Actualiser sur Figma ». Le second reste
   actif quand une décision attend. Une valeur non décidée ne s'écrit pas :
   Figma garde sa valeur, la recette garde la sienne, et la palette reste
   « À décider ». Le pied de la modale le dit : « 1 valeur non décidée : elle
   ne s'écrira pas. »

*La revue du système.* « Actualiser sur Figma… », en tête de l'onglet Système,
ouvre la même modale pour toutes les palettes à actualiser. Les sorties et le
détail par collection font le total. Suit une ligne par palette, repliée : son
nom, ses valeurs à écrire, ses garanties manquées avant et après. Une case
retire la palette de l'écriture. Quand une palette perd des garanties, une
ligne en tête de la modale les nomme, avant tout détail. Le lien
« Actualiser cette palette… » de l'onglet Palette ouvre la revue limitée à la
palette ouverte.

*Les réglages communs.* Un réglage commun change les valeurs de toutes les
palettes qu'il touche. Chaque carte des Réglages communs, qui affiche déjà son
nombre de palettes (`[ENT-07]`), y ajoute le nombre de valeurs déjà écrites
qu'elle change. Exemple calculé par le moteur : l'intensité Soft passée de
0,45 à 0,50 change 5 palettes, dont les 4 utilitaires, soit 87 valeurs de
`primitives`. Aucune palette n'y perd de garantie. Les alias de `theme` ne
changent pas.

*Le nombre de nuances.* Passer de 11 à 13 nuances (`[ENT-13]`) crée les
variables des crans 1000 et 1050 dans chaque collection. Passer de 13 à 11
laisse celles des crans retirés sans palette. L'aperçu du changement de
préréglage les compte déjà en cadres « À actualiser » ; il les compte aussi en
variables créées et en variables laissées. La revue les nomme. Une
actualisation ne supprime jamais une variable.

*Les compteurs.* La revue ne dit plus « 22 alias créés » pour onze variables à
deux modes. Voici les comptes de l'architecture, avec leur calcul. Onze crans
par rampe, deux thèmes dans le chemin de `primitives` et de `brand`.

| Palette | Collection | Variables | Valeurs par mode |
|---|---|---|---|
| Neutre | `primitives` | 1 intensité × 2 thèmes × 11 crans = 22 | 22 |
| Un utilitaire | `primitives` | 2 × 2 × 11 = 44 | 44 |
| Une palette de marque | `brand` | 1 × 2 × 11 + 1 identité = 23 | 23 dans le mode de sa marque |
| Alias du neutre | `theme` | 11 | 11 × 2 modes = 22 |
| Alias d'un utilitaire | `theme` | 2 × 11 = 22 | 44 |
| Alias d'une famille de marque | `theme` | 11 | 22, une fois pour toutes les marques |

Pour le système complet à six marques et deux familles de marque :

- `primitives` : 22 + 4 × 44 = **198 variables**, 198 valeurs ;
- `brand` : 2 × 23 = **46 variables**, 46 × 6 = 276 valeurs ;
- `theme` : 11 + 4 × 22 + 2 × 11 = 121 variables, 242 valeurs ;
- en tout 365 variables, 716 valeurs, et 5 + 12 = 17 cadres.

Le 23 de la proposition 1 est juste : c'est le nombre de variables d'une
palette de marque. Une seconde marque ne crée aucune variable : elle écrit 23
valeurs dans son mode, puisque les variables d'une collection sont communes à
ses modes. Le 46 compte une identité par famille (décision V5), là où
l'architecture en compte une seule et arrive à 45. La recherche comptait 710
saisies ; avec V5, il y en a 716.

*La comparaison à trois états.* Le plugin garde, pour chaque valeur qu'il
écrit, la dernière valeur appliquée. Il la compare à la recette et à Figma.

| Figma | Recette | Ce que la revue montre |
|---|---|---|
| = dernière appliquée | = dernière appliquée | Rien |
| = dernière appliquée | a changé | Une valeur à écrire |
| a changé | = dernière appliquée | Une retouche à décider |
| a changé | a changé, égale à Figma | Rien à écrire ; la dernière appliquée se met à jour |
| a changé | a changé, différente de Figma | Une retouche à décider, avec les trois valeurs |
| valeur sans provenance | toute valeur | Une valeur à attribuer |

Une valeur sans provenance est une valeur que le plugin n'a jamais écrite :
une variable créée à la main au bon chemin, ou un mode ajouté hors du plugin.
Elle se décide comme une retouche, et jamais en silence. Une valeur égale à
celle du premier mode ne prouve pas que Figma l'a recopiée : un designer a pu
la choisir.

*La relecture au clic final.* La revue affiche un plan calculé à son
ouverture. Au clic sur « Actualiser sur Figma », le sandbox relit la recette
et les variables concernées, puis recalcule le plan. S'il diffère, rien ne
s'écrit. La revue reste ouverte, dit « Le fichier a changé depuis l'ouverture
de cette revue. Rien n'a été écrit. », nomme chaque valeur qui a bougé, et
redemande les décisions qu'elle touche. Les autres décisions restent prises.
Le rangement de la recette refuse déjà une écriture sur une recette qui a
changé ; la revue applique le même principe aux variables.

*La propriété des ressources.* Le plugin reconnaît ses ressources par leurs
identifiants, jamais par leur nom. Un suivi rangé sous une clé partagée,
comme celui de la planche, garde l'identifiant de chaque collection, le mode
de chaque marque et l'identifiant de chaque variable par chemin. Chaque
variable écrite porte aussi une donnée de plugin : la palette, et la dernière
valeur appliquée dans chaque mode.

| Cas | Traitement |
|---|---|
| Une variable existe au chemin visé, sans donnée du plugin | « À décider » : le designer adopte ses valeurs ou les remplace. Le plugin ne crée jamais un second nom identique |
| Une collection du même nom existe, créée hors du plugin | La revue la nomme et demande de la reprendre ou d'en choisir une autre dans la carte Collections des variables (piste 9) |
| Une famille existe dans une marque et manque dans une autre | Case vide dans le groupe de la marque, et ligne dans la revue ; les valeurs de ce mode restent sans palette |
| Une palette est supprimée, ou quitte son rôle | Ses variables restent dans Figma, comme un cadre de palette supprimée (`[PLA-27]`), et les calques liés restent liés. « Supprimer les variables » est un geste `danger` séparé |
| Une famille est renommée dans la même collection | Le plugin renomme ses variables : les identifiants et les liaisons restent |
| Une palette change de collection | Le plugin crée les nouvelles variables. Les anciennes restent, sans palette. Figma ne permet pas de déplacer une variable |

Une actualisation ne supprime jamais une variable.

*Écrire, échouer, reprendre.* `commitUndo` ferme une étape de l'historique
d'annulation de Figma. Il n'annule rien en cas d'erreur. L'écriture suit donc
cinq temps.

1. **Préparer.** Le sandbox calcule le plan depuis la recette rangée et les
   variables lues, jamais depuis des couleurs envoyées par l'interface.
2. **Contrôler.** Les polices se chargent avant tout calque. Le plugin vérifie
   que le fichier accepte l'écriture. Une sortie qui ne passe pas un contrôle
   est retirée avant toute écriture, et la revue le dit.
3. **Écrire, sortie par sortie.** D'abord la recette, quand une retouche est
   adoptée, puis les variables par collection, puis les alias, puis la
   planche. Une erreur arrête la sortie qui échoue ; l'autre sortie continue.
4. **Faire le bilan.** Le résultat nomme ce qui est écrit et ce qui reste,
   par sortie et par palette, avec la cause en mots : « Figma refuse de créer
   le mode Marque K : `brand` a atteint le nombre de modes que l'offre du
   fichier admet ». Le message de Figma, `in addMode: Limited to 10 modes
   only`, reste dans le détail technique replié, comme pour une génération
   interrompue.
5. **Reprendre.** « Réessayer » relit le document et recalcule le plan. Une
   valeur déjà écrite porte sa dernière valeur appliquée, et la comparaison la
   classe à jour : rien ne se crée deux fois.

Un seul `commitUndo` clôt l'actualisation. Le but est qu'un Ctrl+Z la défasse
entière. Ce point reste à tester dans Figma (voir [ce qui reste à
prouver](#ce-qui-reste-à-prouver)) : la proposition ne promet pas « un seul
Annuler » avant ce test.

**Pourquoi ce choix.** La proposition 1 posait la revue, « Garder » par défaut
et un seul `commitUndo`. L'atelier (constats P1·02, P1·03, P1·04, P1·06 et
P1·07) montre ce qui manquait : un choix par défaut qui modifie la recette,
une comparaison à deux états qui ne voit pas une recette qui a aussi changé,
des compteurs faux, une propriété par le nom et une annulation présentée comme
une transaction. Chaque constat a été vérifié ; l'annexe donne les preuves.

Une proposition de l'atelier est écartée : cocher « Appliquer malgré les
paires sous leur seuil » avant d'écrire. La spécification veut qu'une
promesse manquée n'empêche pas la génération (`[VER-07]`). Le résultat des
garanties s'affiche dans la revue, avant le clic, et cela suffit.

La version précédente éteignait « Actualiser sur Figma » tant qu'une décision
attendait, sauf à décocher toute la sortie Variables. Dans la revue du
système, une seule retouche d'une palette aurait bloqué l'écriture des seize
autres. Ne pas écrire une valeur non décidée tient la même règle : rien ne
change dans Figma ni dans la recette sans choix du designer.

**Pour le designer.** Il voit ce qui va changer, dans des unités qu'il
retrouve dans Figma. Il ne perd jamais une retouche sans l'avoir décidé, et
une décision qu'il remet à plus tard ne bloque pas le reste. Un réglage commun
lui dit, au moment du geste, combien de valeurs écrites il change. Un échec
lui dit quoi reprendre.

**Spécification et recette.** La section 17 devient une section « Sortie 3 :
les variables », avec ses exigences. `[ARC-12]` à `[ARC-14]` : une porte de
plus, « écrire les variables », et `figma.variables` admis dans un seul
fichier d'écriture et un seul fichier de lecture. La loi d'écriture ajoute
`createVariable`, `setValueForMode`, `addMode`, `renameMode` et
`setVariableCodeSyntax` à ses motifs. La section 16 gagne ses essais manuels. `[ENT-07]` et `[ENT-13]` : les cartes des Réglages communs et l'aperçu du nombre de nuances comptent les valeurs écrites qu'ils changent.
Le suivi des variables prend sa clé et sa version, comme celui de la planche.

**Coût.** Élevé. Un domaine d'écriture nouveau, que la spécification et ses
tests bornent comme ils bornent la planche.

**Risques.** Le comportement de l'annulation et le temps d'écriture de 716
valeurs, à mesurer dans Figma.

### Piste 4 : les retouches

**Aujourd'hui.** La recette ne porte aucune retouche. L'architecture prévoit
pourtant « la liste des crans retouchés à la main, que la régénération
n'écrase pas » (section 3.5). Une couleur changée à la main sur la planche
disparaît au dessin suivant (spécification, section 18).

**Le marché.** uicolors.app permet de retoucher chaque nuance, dans son offre
payante. Aucun outil relevé ne détecte une retouche faite hors de l'outil.

**La proposition.** Dans la revue, une retouche se présente ainsi :

- le chemin de la variable, et les emplois de ce cran tirés de la table des
  emplois. Pour un cran 700 : `solid` au repos, `text` au repos, et
  `border-control` au survol ;
- trois pastilles : dernière valeur appliquée, recette, Figma ;
- deux choix, aucun coché : « Adopter la valeur de Figma », qui ajoute une
  retouche à la recette, et « Remettre la valeur de la recette », qui réécrit
  Figma ;
- sous le choix fait, le résultat des garanties recalculé par le moteur, et
  les garanties qui passent sous leur seuil.

Exemple calculé par le moteur. Dans Rouge, Vivid, Thème Light, le cran 700
vaut `#B61D1D`. Un designer y a collé `#DC2626`, la couleur de référence de
Rouge, que porte son cran 600.
Adopter cette valeur fait manquer deux garanties : `text` sur `surface`,
4,14:1, et `text` sur `surface-card`, 4,47:1, pour un minimum de 4,5:1.
Remettre la valeur de la recette les garde toutes.

Le designer peut aussi laisser la retouche sans choix : elle ne s'écrit pas,
reste « À décider », et le reste de la revue s'écrit.

*Plusieurs retouches.* Un designer qui retouche une rampe dans Figma en
change souvent plusieurs nuances. Le bloc des décisions d'une palette s'ouvre
alors sur deux gestes, « Adopter les 3 » et « Remettre les 3 », puis une
ligne compacte par valeur : le chemin, la valeur de la recette et celle de
Figma, et un choix « Adopter · Remettre ». Les garanties se recalculent sur
l'ensemble choisi. Exemple calculé par le moteur : dans Rouge, Vivid, Thème
Light, les crans 700, 800 et 900 remplacés par `#DC2626`, `#991B1B` et
`#7F1D1D` font manquer 2 garanties une fois adoptés ensemble.

**Le cran de la référence.** La référence est le seul cran que le designer a
choisi. Le moteur garantit que chaque mode de la rampe porteuse contient ses
octets exacts. Une retouche sur ce cran, signalé ◆, n'est donc jamais une
exception. Les deux choix y deviennent « Adopter comme nouvelle couleur de
référence », qui recalcule la palette autour d'elle, et « Remettre la valeur
de la recette ». Le premier montre la nouvelle rampe et ses garanties avant
l'écriture.

**L'identité de la marque.** `brand.identity.{famille}` reçoit la couleur que
le designer a saisie avant tout ajustement : la couleur de la charte. Sans
ajustement, c'est la référence, et donc la valeur du cran ◆. Après un
ajustement de la référence, c'est l'originale, et l'identité se sépare de la
rampe comme l'architecture le prévoit. Une retouche de l'identité dans Figma
se décide comme une retouche du cran ◆.

**Après l'adoption.** La recette garde la retouche : palette, intensité,
thème, cran et valeur. L'aperçu la peint et la marque d'un ✎, repère fixe
comme ◆, sans couleur de sévérité. La planche la montre, marquée. Garanties,
alertes et rapport se calculent sur elle. Le détail de la nuance donne la
valeur calculée et « Rétablir la valeur calculée », qui range la recette ;
la sortie Variables passe alors « À écrire ». Une retouche survit à un
changement de référence ou de courbe, et une notice sous « Configuration de
la palette » dit qu'elle ne suit pas ce changement.

**Pourquoi ce choix.** La proposition 1 cochait « Garder » par défaut, au
motif qu'il ne détruit rien dans Figma. L'atelier (constat P1·02) note que
« Garder » modifie la recette et peut faire manquer une garantie sans que le
designer l'ait vu. L'exemple de Rouge le confirme. Aucun choix n'est donc coché.
Les deux libellés disent l'effet de chacun sur la recette et sur Figma. Le
traitement du cran ◆ et de l'identité répond à la question que l'atelier
laissait ouverte : une exception sur ce cran casserait la garantie de la
référence exacte.

**Pour le designer.** Une retouche devient une décision visible, et son effet
sur les contrastes se lit avant qu'elle entre dans la recette.

**Spécification et recette.** Recette au format 7 : la liste `retouches`.
`[MOT-17]` gagne sa borne : aucune retouche sur le cran porteur. `[PLA-10]`
et `[UI-10]` : le repère ✎ et la valeur calculée. `[VER-01]` : le rapport
donne les deux valeurs de chaque cran retouché. L'empreinte du modèle de
planche couvre les retouches. L'architecture, section 3.4 : l'identité vaut
la couleur saisie avant ajustement.

**Coût.** Moyen.

**Risques.** Des retouches qui s'accumulent font diverger une rampe des
courbes communes. Le rapport les liste pour qu'une relecture les voie.

### Piste 5 : le jeu de départ

**Aujourd'hui.** L'architecture demande dix-sept palettes pour six marques. Le
designer les crée une à une et choisit chaque fois les intensités.

**Le marché.** Supa Palette part de quatorze systèmes intégrés. Foundation
propose les palettes de Material, d'Atlassian et d'Ant Design.

**La proposition.** Un fichier sans palette montre déjà la carte de création.
Elle gagne un segment « Une palette · Le jeu de départ ». Le jeu contient deux
blocs.

- **Neutre et utilitaires.** Le neutre et les quatre utilitaires, chacun avec
  sa référence : `#808080`, puis les 600 de Tailwind. Chaque référence se
  change dans la ligne.
- **Marques.** Un tableau : une ligne par marque, une colonne par famille,
  Primaire et Secondaire. Le tableau part d'une seule ligne : un design system
  à une marque n'a rien à ajouter. Une colonne vaut pour toutes les marques :
  une famille est renseignée dans chaque marque, ou retirée de toutes. Les
  variables de `brand` sont communes à tous ses modes, et une case vide
  laisserait les valeurs d'une marque sans palette.

Une ligne de bilan dit ce que le geste fait, avec les trois gestes séparés :
« Crée 9 palettes dans la recette du fichier. Aucune variable ni aucun cadre
avant « Actualiser sur Figma… », en tête de l'onglet Système. »

Après le jeu de départ, le système se complète dans l'onglet Système, sans
retour à cette carte. La case vide d'une famille (piste 2) propose « Créer la
palette », qui ouvre la création dans l'onglet Palette avec le rôle, la marque
et la famille remplis : il reste la couleur. Elle propose aussi de reprendre
une palette Sur mesure existante, ce qui ouvre l'aperçu de conversion de la
piste 1. « + Ajouter une marque » demande un nom, puis crée une case vide par
famille des autres marques. Une palette existante n'est jamais figée : son
rôle se change dans sa configuration.

**Pourquoi ce choix.** La proposition 1 laissait une marque sans secondaire
quand une autre en avait une, et figeait les palettes présentes. L'atelier
(constat P2·11) relève les deux défauts et le texte « Rien n'est écrit dans
Figma », faux puisque la recette y est rangée. La colonne commune, le
raccordement et le bilan en trois gestes répondent aux trois.

La version précédente complétait le système par « Compléter le jeu de
départ », dans le menu « … » d'une palette. Ce menu porte des gestes sur la
palette ouverte (dupliquer, déplacer, supprimer) ; un geste sur le système n'y
est pas cherché. La case vide se trouve là où le manque se voit.

**Pour le designer.** Un système de départ en une carte, cohérent d'une
marque à l'autre. Une marque ou une famille s'ajoute ensuite là où il voit le
système.

**Spécification et recette.** `[UI-06]` : la carte de création d'un fichier
vide, et la création remplie depuis une case vide. La règle des surfaces
tient : aucune invitation ne reçoit de geste propre, et le jeu est un choix de
la carte de création.

**Coût.** Moyen.

**Risques.** Les références par défaut de danger et de warning restent
proches pour un deutéranope (piste 7). Le jeu ne cherche pas à le corriger :
la réponse est dans les composants.

### Piste 6 : la couleur de la sélection

**Aujourd'hui.** Le plugin ne lit pas la couleur de la sélection (`[ENT-04]`).
Le designer recopie l'hexa depuis la charte ou depuis un calque. La fonction
qui relit une pastille de la planche existe déjà : elle prend la première
peinture unie, visible et opaque, et convertit une couleur Display P3 en sRGB.

**Le marché.** Color Scales I/O importe la couleur d'une sélection, d'un JSON
ou d'une image.

**La proposition.** Le sélecteur de couleur embarqué gagne une rangée « Dans
la sélection ».

- Une pastille par calque sélectionné qui porte une peinture unie, visible et
  d'opacité 1 : la première qu'il porte. L'ordre est celui de la sélection.
- Huit pastilles au plus, puis « +3 » quand il en reste. Le nom du calque est
  dans l'étiquette accessible de chaque pastille.
- Une ligne compte les calques ignorés : dégradé, image, opacité réduite.
- La rangée sert à la référence, aux fonds et aux lignes du jeu de départ.
  Elle se cache quand la sélection ne porte aucune couleur utilisable.

La création se préremplit d'un seul calque à peinture unie, avec une ligne qui
dit d'où vient la couleur. Le préremplissage ne remplace jamais un champ que
le designer a déjà touché.

**Pourquoi ce choix.** C'est la piste de la proposition 1, bornée par le
constat P2·14 de l'atelier : opacité, ordre, compte des couleurs ignorées,
saisie en cours.

**Pour le designer.** Plus de copie d'hexa depuis la charte posée dans le
document.

**Spécification et recette.** `[ENT-04]` : le plugin lit la sélection.
`[UI-13]` : la rangée. `messages.ts` : un message de plus, envoyé à chaque
changement de sélection, et son état de galerie. Aucune écriture.

**Coût.** Faible.

**Risques.** Une peinture liée à une variable donne-t-elle sa couleur
résolue ? À vérifier dans Figma.

### Piste 7 : les statuts en vision simulée, avec la marque

**Aujourd'hui.** Rien. La mesure de la recherche montre que danger et warning
passent sous le seuil des palettes proches en deutéranopie, à 0,015, dans les
trois jeux de teintes essayés. Toutes les rampes partagent la courbe de
clarté, et une vision dichromate perd un axe de couleur.

**Le marché.** Leonardo compose des palettes de données sûres ; Atmos simule
le daltonisme ; dans Figma, Accessibility Checker calcule le contraste par
type de vision.

**La proposition.** Le groupe « Neutre et utilitaires » de l'onglet Système
s'ouvre sur une carte repliable, « Distinguer les statuts », repliée par
défaut. Elle ne paraît qu'avec deux utilitaires au moins. Elle contient :

- deux listes : « Vision » (normale, protanopie, deutéranopie, tritanopie) et
  « Avec la marque », qui choisit une marque du système ;
- un spécimen par utilitaire : une alerte courte avec son icône et son texte,
  peinte des couleurs Vivid du thème choisi, fond `surface`, texte `text`,
  bordure `border-control` ;
- un spécimen par palette de la marque choisie, de même forme ;
- les paires qui passent sous le seuil des palettes proches dans cette
  vision : entre utilitaires, et entre une palette de la marque et un
  utilitaire ;
- le modèle nommé et sa limite : Viénot 1999 pour la protanopie et la
  deutéranopie, Brettel 1997 pour la tritanopie, une dichromacie complète
  simulée, qui ne prouve pas la lisibilité d'un composant ;
- le rappel du critère 1.4.1 de WCAG : un statut ne se porte pas par la
  couleur seule.

La vision choisie repeint les spécimens et les rampes des fiches du groupe.
Elle ne dure que la session. Les garanties restent jugées en vision normale.
Aucune alerte ne sonne : aucun réglage ne sépare danger et warning sans
rompre la règle « un numéro de cran vaut un contraste ». Le rapport gagne les
distances de chaque paire de palettes, par vision.

Exemple calculé par le moteur, en vision normale : Orange A, la secondaire de
Marque A, et Ambre, `warning`, sont à 0,026 pour un seuil de 0,05. Une marque
dont la couleur d'accent ressemble à un statut est un cas courant ; le
designer le voit ici à côté des spécimens, avant qu'un composant le montre.

**Pourquoi ce choix.** La proposition 1 plaçait une liste « Vision » en tête
de l'onglet, qui repeignait toutes les fiches. L'atelier (constats P2·09 et
P2·12) voulait la vision dans un onglet « Vérifier », près de spécimens de
statuts. La règle des surfaces fixe deux onglets, et l'atelier reconnaît
qu'une vue de plus est à apprendre. Cette version garde l'onglet Système, le
seul où les palettes se voient côte à côte, et y apporte les spécimens de
l'atelier. L'en-tête de l'onglet ne gagne aucun objet. La vérification des
emplois, l'autre contenu de « Vérifier », existe déjà dans l'onglet Palette :
la carte « Garanties de contraste » et l'« Interface de test ».

La version précédente ne montrait que les utilitaires. Or une interface pose
toujours les couleurs d'une marque à côté des statuts : c'est la paire qu'un
designer doit juger.

**Pour le designer.** Il voit la confusion sur un objet qui ressemble à son
composant, sa marque comprise, et la réponse : une icône et un texte.

**Spécification et recette.** Un module pur, `vision.ts`, dans le moteur, ses
tests contre les vecteurs de libDaltonLens. `[VER-01]` : les distances par
vision. `[UI-02]` et les surfaces d'UCM Palettes : la carte du groupe.

**Coût.** Faible.

**Risques.** Une distance sous le seuil lue comme un refus. La carte dit
qu'elle appelle une vérification du composant.

### Piste 8 : les fonds lus sur le neutre

**Aujourd'hui.** Les contrastes se mesurent contre deux fonds saisis (D8),
`#F7F7F7` et `#121212` par défaut. Le moteur donne ces mêmes valeurs au cran
50 d'un neutre gris `#808080`. L'architecture fait du cran 50 le fond de page,
et du `neutral.50` la couleur du texte sur un fond plein. Le plugin prend le
fond saisi pour les deux.

**Le marché.** Radix prend le fond comme troisième entrée de son générateur.

**La proposition.** Les fonds restent saisis par défaut. La carte « Couleurs
de fond » gagne un choix « Lire sur le neutre », actif quand une palette porte
le rôle Neutre. Avant de lier, un bilan compte, palette par palette, les
garanties avant et après. Lié, le fond de l'aperçu ouvre la palette Neutre au
lieu du sélecteur de couleur. Si le Neutre disparaît ou change de rôle, les
fonds gardent les dernières valeurs lues, le lien se coupe, et une notice le
dit.

**Pourquoi ce choix.** La proposition 1 laissait la piste à discuter.
L'atelier (constat P2·13) demande un lien explicite, un bilan global et une
règle quand la source disparaît. Cette version reprend les trois.

**Pour le designer.** Un seul endroit règle le fond : la palette Neutre.

**Spécification et recette.** D8, Q5, `[ENT-05]`, `[UI-04]`. La recette range
la source des fonds.

**Coût.** Moyen.

**Risques.** Un réglage du neutre déplace toutes les garanties d'un coup. Le
moteur mesure lequel. Une teinte changée ne déplace presque pas le cran 50,
qui garde la clarté de la courbe. Une luminosité réglée le déplace : à −0,02
sur le neutre `#808080`, les fonds deviennent `#F0F0F0` et `#0D0D0D`, et Vert
passe de deux à quatre garanties manquées. Le bilan avant le lien sert à voir
ce cas.

**Proposition : à discuter après la première tranche des variables.**

### Piste 9 : les collections et les marques

**Aujourd'hui.** Rien : le plugin ne connaît ni collection ni marque.

**Le marché.** Material Theme Builder écrit trois groupes fixes. Color Scales
I/O réserve les modes multiples à son offre payante.

**La proposition.** Les collections se règlent une fois ; les marques se
gèrent tout le temps. Elles se séparent.

Une carte repliée, en dernier dans les Réglages communs : « Collections des
variables ».

- Les noms des trois collections, `primitives`, `brand` et `theme` par
  défaut. Le plugin les suit par identifiant : un renommage passe par la revue
  suivante.
- Une ligne sur les portées : les variables de `primitives` et de `brand`
  n'apparaissent dans aucun sélecteur de Figma. Leur liste de portées
  (`scopes`) est vide. `theme` garde les portées de remplissage et de contour.
  La syntaxe de code Web vient de `tokenCssVariable` du kit, et Dev Mode
  montre la propriété que `ucm tokens css` écrit.

Les marques vivent dans l'onglet Système, un groupe par marque (piste 2). Le
menu « ⋯ » du groupe renomme la marque ; le mode de `brand` se renomme à la
prochaine actualisation. Il la retire aussi : ses palettes passent Sur mesure,
avec l'aperçu de conversion, et le mode reste dans Figma. « + Ajouter une
marque » suit le dernier groupe. Un mode que le plugin n'a pas créé a son
groupe, avec « Suivre ce mode… », qui ouvre la revue de ses valeurs sans
provenance.

**Pourquoi ce choix.** La proposition 1 plaçait cette carte dans les Réglages
communs, avec un interrupteur « Écrire les alias de `theme` ». L'atelier
voulait séparer la configuration du système des réglages de couleur. Une
surface de plus n'est pas justifiée : les Réglages communs rangent déjà leurs
cartes par sujet, et la carte y reste repliée. L'interrupteur est retiré : sans
alias, les variables écrites n'apparaissent dans aucun sélecteur (piste 3,
décision V13).

La version précédente rangeait aussi la liste des marques dans cette carte.
Ajouter une marque demandait alors d'ouvrir l'engrenage, de défiler jusqu'à la
dernière carte et de la déplier, loin des palettes de la marque.

**Pour le designer.** Il nomme ses collections une fois. Il ajoute, renomme et
retire une marque là où il voit ses palettes.

**Spécification et recette.** `[ENT-12]` : une carte de plus. `[UI-02]` : le
menu du groupe et « + Ajouter une marque ». La recette range les noms des
collections et la liste des marques.

**Coût.** Faible.

**Risques.** Six marques tiennent dans l'offre Professional, qui admet dix
modes par collection, et dans l'offre Organization, qui en admet vingt. Une
onzième marque en Professional échoue à l'écriture (piste 3, bilan).
« + Ajouter une marque » peut le dire avant, quand le plugin connaît le nombre
de modes de `brand`.

### Piste 10 : les aides et la langue des planches

**Aujourd'hui.** Soft, Vivid, « Référence exacte dans » et « Dérive de teinte »
sont des mots propres au plugin, sans aide. Les planches restent en français
quelle que soit la langue de l'interface (`[UI-16]`).

**Le marché.** Rien de comparable : les outils relevés n'ont pas ces notions.

**La proposition.** Une aide d'une phrase à côté de chacun de ces libellés, et
de « Rôle dans le système ». Elle s'ouvre au clic et au clavier, jamais au
survol seul. L'aide de « Référence exacte dans » suit l'élection réelle :
« Auto choisit l'intensité dont la saturation est la plus proche de celle de
votre couleur, Vivid à égalité. Un réglage de Teinte, saturation, luminosité
fige ce choix. » La langue des planches devient un réglage de « Contenu des
planches », rangé dans la recette : deux designers qui génèrent la même
palette obtiennent la même planche. La langue de l'interface reste une
préférence personnelle.

**Pourquoi ce choix.** C'est la piste de la proposition 1, avec deux bornes de
l'atelier (constat P2·14) : l'ouverture au clavier, et une aide vérifiée
contre le code.

**Pour le designer.** Un mot inconnu s'explique là où il est lu.

**Spécification et recette.** `[UI-16]` : la langue des planches suit la
recette. `contenuDesPlanches` gagne `langue`. Les textes suivent le circuit de
[TEXTES-A-VALIDER.md](../../TEXTES-A-VALIDER.md).

**Coût.** Faible pour les aides. La langue des planches demande le catalogue
anglais de `planche/textes.ts`.

**Risques.** Aucun connu.

### Piste 11 : reprendre une rampe existante

**Aujourd'hui.** Une palette se crée depuis une couleur (`[ENT-04]`). Un
design system dont les rampes ont été faites à l'œil n'a pas d'entrée : le
designer saisit la couleur de la charte, obtient une rampe calculée, et perd le
dessin de ses nuances. Il ne peut pas non plus mesurer ses rampes actuelles
contre la table des emplois.

**Le marché.** Color Scales I/O importe une couleur d'une sélection, d'un JSON
ou d'une image. Aucun outil relevé ne mesure une rampe existante contre des
emplois.

**La proposition.** La carte de création gagne une rangée « Depuis : Une
couleur · Une rampe existante ». La rampe se lit :

- dans la sélection : un calque par nuance, lu comme à la piste 6, rangé du
  plus clair au plus foncé. Le nombre de calques doit égaler le nombre de
  nuances de la recette ; sinon la carte dit l'écart et n'offre pas la
  création ;
- dans un groupe de variables, choisi comme à la piste 12, un mode par thème.

La carte montre la rampe lue et, dessous, la rampe calculée autour de la même
référence, alignées nuance par nuance, avec l'écart de chacune en distance
OKLab. La référence est une nuance de la rampe lue, que le designer choisit :
la couleur de la charte. Deux blocs résument les deux rampes : leurs garanties
manquées, et le nombre de nuances reprises. Deux gestes créent la palette :
« Créer avec la rampe lue » et « Créer avec la rampe calculée ».

Créée avec la rampe lue, la palette est une palette ordinaire, dont chaque
nuance qui diffère de la rampe calculée est une retouche ✎ (piste 4). Les
garanties se jugent sur les nuances reprises. Un thème absent de la lecture
prend la rampe calculée. Quand les nuances reprises font manquer des
garanties que la rampe calculée tient, un message sous l'aperçu nomme les
nuances en cause et propose de les rétablir d'un geste. Le moteur les choisit
une à une, chaque fois celle qui rend le plus de garanties, jusqu'à retrouver
le résultat de la rampe calculée.

Exemple calculé par le moteur. Une rampe de Bleu A faite à l'œil garde
`#1E6FD9` à sa nuance 600, comme le moteur. Ses dix autres nuances diffèrent :
le 700 et le 800, trop proches du 600, et des surfaces 100 à 300 trop
saturées. En Thème Light, elle manque 4 garanties, là où la rampe calculée
n'en manque aucune. Rétablir les nuances 100, 200 et 300 rend les 4 garanties
et garde les 7 autres nuances du designer, ses foncés compris.

**Pourquoi ce choix.** Le scénario « palettes faites à l'œil » demande deux
choses : mesurer l'existant, et l'améliorer sans le perdre. Les retouches de
la piste 4 font déjà les deux : une valeur hors du calcul, rangée dans la
recette, jugée par le moteur, et « Rétablir la valeur calculée » nuance par
nuance. Une rampe lue est une palette dont presque toutes les nuances sont
retouchées. La piste n'ajoute ni modèle ni format : une entrée de création et
un geste groupé.

**Pour le designer.** Il part de ses rampes, voit ce qu'elles valent, et
décide nuance par nuance ce qu'il garde.

**Spécification et recette.** `[ENT-04]` : une palette se crée aussi depuis
une rampe lue. `[UI-06]` : la rangée « Depuis ». `[VER-15]` : le message des
nuances reprises qui font manquer une garantie, et son geste. La recette
range les retouches de la piste 4, sans champ nouveau.

**Coût.** Moyen, après la piste 4.

**Risques.** La référence placée par le moteur peut ne pas tomber sur la
nuance où le designer l'avait mise : une couleur de charte à son 500 peut
avoir la clarté du 600 de la courbe commune. La carte le dit, et le 600 lu
disparaît derrière la référence. Des retouches nombreuses font diverger la
rampe des courbes communes ; le rapport les liste (piste 4).

### Piste 12 : relier une palette à des variables existantes

**Aujourd'hui.** Le plugin n'écrit aucune variable. Avec la piste 3, il
écrirait les trois collections de l'architecture, et seulement elles.

**Le marché.** OKLCH Color Scale écrit une collection à modes Light et Dark,
sous ses propres noms. Aucun outil relevé n'écrit dans des variables qu'il n'a
pas créées.

**La proposition.** Une palette Sur mesure a une rangée « Variables : Aucune ·
Variables existantes… ». Le second choix ouvre une liaison sous la rangée :

- la collection, choisie parmi celles du fichier ;
- un motif de nom, par exemple `color/blue/{nuance}`, où `{nuance}` prend
  chaque numéro de la liste et `{intensité}` vaut `soft` ou `vivid` ;
- le mode de la collection qui reçoit le Thème Light, et celui qui reçoit le
  Thème Dark. Une collection à un seul mode ne reçoit qu'un thème ;
- une table de ce que le motif trouve : les variables trouvées, celles qui
  manquent, avec « La créer », et celles du groupe hors de la liste des
  nuances, que le plugin laisse.

« Relier » range la liaison dans la recette. La sortie Variables de la palette
suit alors les règles des pistes 3 et 4 : trois valeurs comparées, revue,
retouches. Deux règles s'ajoutent. Une variable dont la valeur est un alias
n'est jamais remplacée : la revue la nomme. Et à la première actualisation,
toutes les valeurs présentes sont sans provenance ; elles se décident en une
fois, avec les deux rampes et leurs garanties sous les yeux : « Remplacer par
la recette », ou « Reprendre les valeurs de Figma », qui en fait des nuances
reprises (piste 11). « Choisir par nuance » ouvre une ligne par valeur.

**Pourquoi ce choix.** Trois scénarios en dépendent : un système Light et Dark
qui a déjà ses variables, une structure de tokens propre au fichier, et
l'amélioration de palettes faites à l'œil dans un système en place. Sans
liaison, le plugin crée un second jeu de variables à côté du premier, et le
designer recopie les valeurs à la main, comme aujourd'hui. La liaison réutilise
la revue, la comparaison à trois valeurs, la propriété par identifiant et les
retouches : seules la configuration et la décision groupée sont nouvelles.

La piste reste à discuter : elle fait sortir l'écriture de l'architecture, que
la proposition sert d'abord.

**Pour le designer.** Il garde sa structure de tokens et en confie les valeurs
au plugin, palette par palette.

**Spécification et recette.** D2 et la section 5 : le plugin écrit dans des
variables qu'il n'a pas créées, sur liaison. La section « Sortie 3 : les
variables » (piste 3) gagne la liaison. La recette range, par palette
Sur mesure, la collection, le motif et les deux modes, suivis par identifiant.

**Coût.** Élevé : la configuration, sa table, la décision groupée et leurs
états de galerie, sur le domaine d'écriture de la piste 3.

**Risques.** Un motif qui trouve des variables d'une autre palette. La table le
montre avant « Relier », et deux palettes ne peuvent pas relier la même
variable. Une collection de bibliothèque distante ne s'écrit pas : le plugin
n'écrit que dans les collections locales du fichier.

### Piste 13 : les palettes proches

**Aujourd'hui.** L'alerte « palettes proches » compare chaque paire de palettes
de la recette sur les crans 500, 600 et 700, et sonne sous 0,05. Pour
comparer deux palettes, le designer ouvre l'une puis l'autre, ou lit deux
fiches de l'onglet Palettes. « Dupliquer la palette » existe dans le menu
« … ».

**Le marché.** Rien de comparable relevé.

**La proposition.** Trois changements.

1. **L'alerte ne compare que des palettes qui s'affichent ensemble.** Deux
   palettes de deux marques différentes ne partagent jamais un mode de
   `brand` : elles ne se comparent plus. Toute autre paire se compare,
   palettes Sur mesure comprises.
2. **« Proches à dessein ».** Une alerte de palettes proches porte ce geste.
   La paire se range dans la recette, l'alerte se tait, et le rapport liste la
   paire avec son écart. Le geste se défait depuis le détail de l'alerte, dans
   le rapport ou sous l'aperçu.
3. **« Comparer à ».** L'en-tête de l'aperçu gagne une liste, vide par
   défaut. Une palette choisie se peint sous la palette ouverte, nuance par
   nuance, avec une ligne Δ qui donne l'écart de chaque nuance. La comparaison
   dure la session.

Mesure du moteur, sur les palettes des maquettes : quatre paires passent sous
le seuil. Ambre et Orange A (0,026), Azur et Bleu A (0,041), Azur et Bleu K
(0,032) s'affichent ensemble, et l'alerte reste. Bleu A et Bleu K (0,040)
appartiennent à deux marques, et l'alerte se tait.

**Pourquoi ce choix.** Deux scénarios se heurtaient à l'alerte : les marques
d'un même secteur, dont les bleus se ressemblent, et les variantes voulues
d'une palette. L'alerte sonnait dans les deux cas sans rien apprendre au
designer. La portée par marque vient du rôle (piste 1) ; le geste « Proches à
dessein » couvre ce que la portée ne sait pas. La comparaison sert les
variantes, que le designer juge à l'œil nuance par nuance.

**Pour le designer.** Moins d'alertes, et chacune compare deux couleurs qu'un
écran peut montrer côte à côte.

**Spécification et recette.** Section 11.3 : la portée de l'alerte et « Proches
à dessein ». `[UI-04]` : « Comparer à ». `[VER-01]` : les paires voulues dans
le rapport. La recette range la liste des paires voulues.

**Coût.** Faible.

**Risques.** Une palette Sur mesure employée dans une seule marque se compare
à toutes. Le geste « Proches à dessein » la traite.

### Piste 14 : la rampe témoin des réglages

**Aujourd'hui.** Les cartes « Teinte, saturation, luminosité » et « Dérive de
teinte » suivent l'aperçu (`[UI-12]`). À 720 px de haut, une fois l'une
d'elles ouverte, l'aperçu sort de la vue : le designer règle une teinte sans
voir la rampe, ou défile à chaque geste. La spécification refuse une barre
flottante qui recouvre le contenu (`[UI-03]`).

**La proposition.** Chacune des deux cartes porte en tête une rampe témoin de
10 px de haut, dans le thème de l'aperçu, pour le profil réglé. Elle se
repeint comme l'aperçu, une fois par image pendant un glisser. Elle ne se
focalise pas et n'ouvre aucun détail.

**Pourquoi ce choix.** Rendre une palette belle se fait à l'œil, en réglant
teinte, saturation et dérive, rampe sous les yeux. La rampe témoin garde ce
retour sans recouvrir de contenu.

**Pour le designer.** Il règle et voit l'effet au même endroit.

**Spécification et recette.** `[UI-12]` : la rampe témoin des deux cartes.

**Coût.** Faible.

**Risques.** Un objet de plus par carte ouverte, pour le compte du protocole
de relecture.

## Les endroits touchés

| Endroit | Changement | Pistes |
|---|---|---|
| Spécification, `[UI-01]` | La taille par défaut est 600 × 720 dans le code. La spécification dit encore 770 × 720 : à corriger, quelle que soit la décision | aucune |
| Spécification, D2, D3, D8 et section 5 | Le plugin écrit des variables, les siennes et, sur liaison, des variables existantes ; il connaît rôle, marque et famille ; il peut lire les fonds sur le neutre | 1, 2, 3, 8, 12 |
| Spécification, section 17 | Remplacée par « Sortie 3 : les variables » : chemins, trois états, propriété, écriture, valeurs non décidées, revue du système, bilan, reprise, liaison | 3, 4, 12 |
| Spécification, `[ENT-04]`, `[ENT-07]`, `[ENT-12]`, `[ENT-13]`, `[ENT-14]` | Sélection lue, rampe lue ; valeurs écrites comptées par les réglages communs ; carte Collections des variables ; intensités libres pour Sur mesure seulement | 1, 3, 6, 9, 11 |
| Spécification, `[UI-02]`, `[UI-03]`, `[UI-05]`, `[UI-06]` | Onglets Système et Palette, ouverture sur Système, bouton unique en tête, ligne d'état sous le titre de la palette, groupes, cases vides, « + Ajouter une marque » | Flux global, 2, 5, 9 |
| Spécification, `[UI-04]`, `[UI-11]`, `[UI-12]`, `[UI-13]`, `[UI-16]` | « Comparer à » ; rangée Rôle, aperçu de conversion, rangée « Depuis » ; rampe témoin ; rangée de la sélection ; langue des planches | 1, 6, 10, 11, 13, 14 |
| Spécification, `[MOT-17]`, `[PLA-10]`, `[UI-10]`, `[VER-01]`, `[VER-15]`, section 11.3 | Borne des retouches sur le cran porteur ; repère ✎ ; valeurs calculée et retouchée ; distances par vision ; nuances reprises à rétablir ; portée de l'alerte des palettes proches | 4, 7, 11, 13 |
| Spécification, `[ARC-12]` à `[ARC-14]`, sections 14.4 et 16 | Une porte d'écriture de plus ; `figma.variables` admis dans deux fichiers ; essais manuels | 3 |
| Recette, format 7 | `role`, `famille`, `marque` ; `marques` ; `retouches` ; noms des collections ; liaisons des palettes Sur mesure ; paires proches à dessein ; `contenuDesPlanches.langue` ; source des fonds | 1, 4, 8, 9, 10, 12, 13 |
| `AGENTS.md`, « Écriture d'UCM Palettes » | L'invariant « aucun fichier n'appelle `figma.variables` » devient une borne à deux fichiers | 3 |
| `CONTRIBUTING.md`, surfaces d'UCM Palettes | Les noms et l'ordre des onglets ; la fiche sans bouton principal ; la ligne sous le titre de l'onglet Palette ; les groupes et la case vide ; la carte « Distinguer les statuts » ; la revue | Flux global, 2, 3, 7 |
| Architecture, sections 2, 3.4 et 3.5 | 46 variables par marque ; les familles ajoutées ; l'identité vaut la couleur saisie avant ajustement ; la liste des retouches existe | 1, 3, 4 |
| Galerie | Un état par écran nouveau : onglet Système à l'ouverture, ligne d'état, rôles, conversion, groupes, case vide, deux sorties, conflit, retouches groupées, revue du système, revue invalidée, bilan partiel, statuts, sélection, jeu de départ, création remplie, rampe lue, liaison, comparaison, rampe témoin | toutes |

## L'ordre des lots

1. **Le flux global et les aides** : les onglets Système et Palette, leur
   ordre, l'ouverture sur Système, la ligne d'état sous le titre de la
   palette, le bouton unique en tête, et la section « Palettes et réglages »
   qui reçoit « Générer tout ». La planche est encore la seule sortie : ce lot
   ne touche pas à la recette. S'y joignent la piste 10 (aides), la piste 6,
   la piste 14 et la correction de `[UI-01]`.
2. **Le format 7 et le rôle** : piste 1 avec l'aperçu de conversion, les
   groupes de l'onglet Système et du sélecteur (piste 2, affichage seul), la
   liste `retouches`, la portée de l'alerte et « Proches à dessein »
   (piste 13), la langue des planches. Rien ne s'écrit encore dans les
   variables.
3. **La première tranche des variables** : une palette Utilitaire ou le
   Neutre, de bout en bout. Ses variables dans `primitives` et ses alias
   Light et Dark dans `theme`, les deux sorties, la revue, les valeurs non
   décidées, la comparaison à trois états, les retouches et leurs décisions
   groupées, la relecture au clic, le bilan partiel et la reprise. Les essais
   manuels dans Figma se font à la fin de ce lot.
4. **Les marques et le système** : `brand`, ses modes et l'identité, les cases
   vides, « + Ajouter une marque », les modes hors du plugin, la carte
   Collections des variables (piste 9), la revue du système et les comptes des
   réglages communs.
5. **Le jeu de départ et la rampe lue** : pistes 5 et 11.
6. **Les statuts en vision simulée, avec la marque** : piste 7. Elle attend le
   lot 4, qui désigne les marques.
7. **La liaison à des variables existantes** : piste 12, si elle est retenue.
8. **Les fonds lus sur le neutre** : piste 8, si elle est retenue.

Le flux global passe en premier : il ne dépend d'aucune écriture de variables,
et chaque lot suivant ajoute ses états dans les onglets déjà rangés.

La proposition 1 écrivait `primitives` et `brand` dans un premier lot, et
`theme` dans un second. Or une variable dont la liste de portées est vide
n'apparaît dans aucun sélecteur de Figma, et un composant ne cite jamais
`primitives` ni `brand`. Un premier lot sans `theme` ne donnait donc rien que
le designer puisse lier. La première tranche commence par une famille sans
marque : elle éprouve la revue, les conflits et la reprise sans l'axe des
modes de `brand`.

## Les décisions

Répondre par numéro : « oui », « non », ou une variante. V0 à V4 fixent la
forme du plan ; les autres se prennent séparément.

| # | Décision | Proposition finale | Origine |
|---|---|---|---|
| V0 | Le flux global | Onglets Système puis Palette, ouverture sur Système. Un bouton principal en tête de Système, « Actualiser sur Figma… (N) ». Une ligne d'état et « Actualiser cette palette… » sous le titre de la palette. Plus de bouton principal dans les fiches | Revue par scénario |
| V1 | Le rôle de la palette | Un rôle unique : Marque, Utilitaire, Neutre, Sur mesure. Sur mesure par défaut, sans variables. Un aperçu avant tout changement de rôle. « Nouvelle marque… » et « Autre famille… » dans les listes | Proposition 1 ; l'aperçu vient de l'atelier ; le nom, le défaut et les listes ouvertes viennent de la revue par scénario |
| V2 | État des sorties | Deux sorties avec leur état, cochables dans la revue. Trois états des variables : « À jour », « À écrire », « À décider ». Une pastille, qui montre l'état le plus urgent | Atelier ; la pastille unique vient de la proposition 1 ; les trois états, de la revue par scénario |
| V3 | Le rangement de l'onglet Système | Neutre et utilitaires, une marque par groupe avec son menu, Sur mesure. La collection en code à côté du titre. Une case vide par famille manquante, « + Ajouter une marque » | Arbitrage entre les deux ; cases et ajout de la revue par scénario |
| V4 | La revue | Toute écriture de variables passe par elle. Aucun choix par défaut. Une valeur non décidée ne s'écrit pas et ne bloque pas les autres. Trois états comparés. Relecture au clic final. Une revue du système, une ligne par palette | Proposition 1 pour la revue ; atelier pour le reste ; valeurs non décidées et revue du système de la revue par scénario |
| V5 | L'identité de la marque | `brand.identity.{famille}` reçoit la couleur saisie avant ajustement, une par palette de marque : 46 variables par marque | Proposition 1 ; la valeur retenue tranche la question de l'atelier |
| V6 | Les retouches dans la recette | Une retouche adoptée entre dans la recette, et les garanties se jugent sur elle. Aucune retouche sur le cran porteur. Plusieurs retouches se décident d'un geste | Proposition 1 ; la borne est un arbitrage ; le geste groupé vient de la revue par scénario |
| V7 | Le jeu de départ | Dans la création d'un fichier vide, une ligne de marque au départ. Familles communes à toutes les marques. Ensuite, les cases vides de l'onglet Système remplacent « Compléter le jeu de départ » | Proposition 1, corrigée par l'atelier puis par la revue par scénario |
| V8 | La couleur de la sélection | Une rangée du sélecteur de couleur, et la création préremplie, avec les bornes de l'atelier | Proposition 1, bornée par l'atelier |
| V9 | La vision simulée | Dans la carte « Distinguer les statuts » du groupe Neutre et utilitaires, avec des spécimens et les palettes d'une marque choisie | Arbitrage ; la marque vient de la revue par scénario |
| V10 | Les fonds lus sur le neutre | À discuter. Fonds saisis par défaut, lien explicite avec bilan, repli dit | Proposition 1 et atelier |
| V11 | Les collections et les marques | Carte « Collections des variables » repliée dans les Réglages communs, sans interrupteur des alias. Les marques se gèrent sur leur groupe | Proposition 1, modifiée |
| V12 | Les aides et la langue des planches | Aides au clic et au clavier, langue des planches rangée dans la recette | Proposition 1, bornée par l'atelier |
| V13 | L'ordre des lots | Le flux global d'abord ; la première tranche des variables livre une famille avec ses alias `theme` | Atelier ; le premier lot vient de la revue par scénario |
| V14 | Reprendre une rampe existante | Une rampe lue dans la sélection ou des variables devient une palette à nuances reprises ✎ ; un geste rétablit les nuances qui font manquer une garantie | Revue par scénario |
| V15 | Relier à des variables existantes | À discuter. Une palette Sur mesure remplit des variables du fichier, par collection, motif de nom et mode par thème | Revue par scénario |
| V16 | Les palettes proches | L'alerte ne compare que des palettes qui s'affichent ensemble ; « Proches à dessein » ; « Comparer à » dans l'aperçu | Revue par scénario |
| V17 | La rampe témoin | Une rampe de 10 px en tête des cartes de réglage | Revue par scénario |
| V18 | Les familles ajoutées | L'architecture admet d'autres familles que les quatre utilitaires et les deux familles de marque | Revue par scénario, à décider dans l'architecture |

Un refus de V0 garde les onglets actuels et un bouton principal par fiche :
les pistes suivantes restent valables, mais la liste des fiches aligne autant
de boutons que de palettes à actualiser. Un refus de V1 ramène la destination
séparée : une rangée « Variables » qui refuse après coup une combinaison
interdite. Un refus de V2 ramène l'état unique de la proposition 1, où une
police absente bloque aussi les variables.

## Ce qui reste écarté

| Idée | Origine | Raison |
|---|---|---|
| Un troisième onglet « Vérifier » | Atelier, P2·09 | La règle des surfaces fixe deux onglets. La vérification des emplois existe dans l'onglet Palette ; la vision simulée rejoint l'onglet Système |
| L'identité de la palette séparée de sa destination | Atelier, P2·08 | Elle laisse saisir une palette de marque à deux intensités, puis la refuse |
| « Garder » coché par défaut | Proposition 1 | Il modifie la recette et peut faire manquer une garantie sans décision |
| Cocher « Appliquer malgré les paires sous leur seuil » | Atelier, prototype | Une promesse manquée n'empêche pas la génération (`[VER-07]`) ; la revue montre le résultat avant le clic |
| Éteindre l'écriture tant qu'une décision attend | Version précédente de cette proposition | Dans la revue du système, une retouche bloquerait les autres palettes ; une valeur non décidée ne s'écrit simplement pas |
| L'interrupteur « Écrire les alias de `theme` » | Proposition 1, piste 9 | Sans alias, rien n'est utilisable dans les sélecteurs de Figma |
| Deux pastilles et deux gestes par fiche | Recherche, section 3.5 | Deux boutons principaux par fiche ; la revue sépare déjà les sorties |
| Un bouton principal par fiche | Version précédente de cette proposition | Jusqu'à dix-sept boutons principaux dans une liste ; le geste qui écrit tout restait hors de vue |
| Une liste des palettes à gauche à grande largeur | Atelier, prototype | La fenêtre s'ouvre à 600 px, où la liste ne tient pas avec l'aperçu. Deux dispositions à maintenir pour un clic gagné au-delà de 800 px |
| Renommer l'onglet Palettes en « Figma » | Proposition 1 | L'onglet montre le système, pas la destination ; il devient « Système » |
| Une barre flottante qui garde l'aperçu en vue | Revue par scénario | `[UI-03]` la refuse ; la rampe témoin garde le retour sans recouvrir de contenu |
| « Compléter le jeu de départ » dans le menu « … » | Version précédente de cette proposition | Ce menu porte des gestes sur la palette ouverte ; les cases vides de l'onglet Système se trouvent là où le manque se voit |
| Une palette de données, aux teintes distinctes à clarté égale | Revue par scénario | Elle ne suit pas la table des emplois ; la recherche l'écarte |
| Un thème à contraste renforcé | Revue par scénario | Il demande un troisième mode de `theme`, que l'architecture ne prévoit pas |
| Supprimer une variable sans palette lors d'une actualisation | Proposition 1, recherche | Les calques liés perdraient leur lien. La suppression reste un geste `danger` séparé |
| Exporter du code, APCA, Display P3, table des emplois réglable, association par modèle de langage | Recherche, sections 4 à 6, 9 et 10 | Les raisons de la recherche tiennent |

## Ce qui reste à prouver

Deux choses ne se prouvent pas sur le papier : que le parcours se comprend et
se joue sans détour, et que Figma se comporte comme la proposition le suppose.

### L'essai par le mainteneur

Le mainteneur, designer UX/UI, essaie seul le plugin. Aucun test avec d'autres
designers n'est prévu. La version précédente comparait deux variantes auprès
de cinq designers ; avec un seul testeur, qui connaît déjà les deux, une
comparaison ne mesurerait que l'ordre de passage. L'essai vérifie donc chaque
parcours contre ce qu'il doit coûter.

*Matériel.* Une copie d'un fichier réel du design system, et un fichier vide.
Le plugin à la fin des lots 1, 3 et 4, puis de chaque lot suivant pour ses
scénarios. La fenêtre à 600 × 720, puis à 500 × 520.

*Le geste de prédiction.* Avant chaque clic qui écrit, le mainteneur note ce
qui va changer : dans la recette, dans les variables, sur la planche. Après le
clic, il compare au bilan et au panneau des variables de Figma. Un écart entre
la prédiction et le résultat est un défaut d'interface, même quand l'écriture
est juste : l'écran n'a pas dit ce qu'il allait faire.

*Les scénarios.* Les douze de la section [Les scénarios du
designer](#les-scénarios-du-designer), chacun avec son parcours proposé comme
référence. Quatre sont joués à chaque lot qui touche aux variables :

1. créer la palette primaire d'une nouvelle marque depuis une couleur de
   charte sélectionnée, et la rendre liable dans un composant ;
2. redessiner la planche d'une palette retouchée dans Figma, sans toucher aux
   variables ;
3. décider trois retouches d'une palette, dont une qui fait manquer une
   garantie, et dire avant le clic la valeur qui restera dans Figma ;
4. changer un réglage commun, puis écrire tout le système.

*Ce qui se note.* Pour chaque scénario : le nombre de gestes, le nombre de
changements d'onglet, chaque écran où le mainteneur a cherché le geste suivant,
chaque écart de prédiction, chaque écriture non voulue.

*Les critères.*

- aucune écriture non voulue, dans aucun scénario ;
- aucun écart de prédiction aux scénarios 2 et 3 ;
- régler une palette puis l'écrire se fait sans changer d'onglet ;
- écrire tout le système se fait depuis l'écran d'ouverture, sans défiler ;
- ajouter une marque, ou une famille qui manque, se fait depuis l'onglet
  Système, sans ouvrir les Réglages communs ni le menu « … ».

Un critère manqué rouvre la décision qu'il touche : les deux premiers V2 et
V4, les trois suivants V0.

*La limite de l'essai.* Le mainteneur connaît le vocabulaire du plugin : un
libellé obscur pour un autre designer ne le gênera pas. Pour la réduire, il
relit les textes de chaque écran nouveau une semaine après les avoir écrits,
selon le circuit de [TEXTES-A-VALIDER.md](../../TEXTES-A-VALIDER.md), et note
chaque mot qu'il doit s'expliquer.

### Les essais dans Figma

Ces points s'essaient à la main à la fin du lot 3, comme la section 16 de la
spécification le fait pour la planche.

1. Un seul `commitUndo` après la recette, les variables et le cadre : un
   Ctrl+Z défait-il les trois, et eux seuls ?
2. `createVariable` avec un nom déjà pris dans la collection : refus, ou
   doublon ?
3. La valeur que Figma donne aux autres modes d'une variable créée par
   l'API.
4. Une donnée de plugin posée sur une variable survit-elle à la publication de
   la bibliothèque et à une copie du fichier ?
5. Le temps d'écriture de 198 variables, puis des 716 valeurs du système
   complet.
6. La couleur lue sur un calque dont la peinture est liée à une variable.
7. Le message d'erreur exact d'`addMode` à la limite de l'offre.
8. `setValueForMode` sur une variable créée hors du plugin, dans une
   collection locale ; et la lecture d'une valeur d'alias, pour la refuser
   (piste 12).

## Annexe : vérifications

Chaque point de la mission, son verdict, sa preuve et ce que cette version en
fait. Les chemins partent de la racine du dépôt ; `Intégration du marché/`
désigne le dossier qui range les propositions, et un fichier cité sans chemin
est dans le dossier de la proposition qui l'a produit. La recherche a été mise à jour après ces
vérifications : un passage qu'elle a corrigé est cité mot pour mot. « Mesure du moteur » renvoie au calcul que
`generer-maquettes-proposition-finale.mjs` refait et imprime à chaque génération.

### A. Les arbitrages entre les deux propositions

| Point | Verdict | Preuve | Dans cette version |
|---|---|---|---|
| V1 : le rôle unique rend impossible une combinaison interdite | Confirmé | L'architecture fixe une intensité aux rampes de marque et au neutre, deux aux utilitaires : `ARCHITECTURE-FINALE-MULTIMARQUES.md:105-108`. Le plugin laisse le choix libre : `RECHERCHE-PLUGIN-PALETTES.md:669-671`. L'atelier applique les contraintes « à cette affectation », donc après la saisie : `Intégration du marché/02 Revue atelier/REVUE-ET-PROTOTYPE-ATELIER.html:39` | Rôle unique, piste 1 |
| V1 : un aperçu de conversion quand une palette change de rôle | Confirmé | Passer à une intensité retire l'autre profil, ses parts et sa base : `packages/plugin-palettes/src/edition.ts:311-318`. Passer à deux récrit la référence sans `part` : `edition.ts:292-304`. Aujourd'hui, aucune confirmation : `RECHERCHE-PLUGIN-PALETTES.md:676-677`. Modèle d'aperçu existant : `[ENT-13]`, `RECHERCHE-PLUGIN-PALETTES.md:728-733` | Aperçu sous la rangée Rôle |
| V1 : « Autre » mélange essai, palette libre et absence de variables | Confirmé | La suite du rôle « Autre » porte le Modèle Libre, les intensités et « essai, illustration, données » : `Intégration du marché/01 Proposition initiale/generer-maquettes-proposition-initiale.mjs:182-187`. Une palette libre n'alimente pas `theme` : `ARCHITECTURE-FINALE-MULTIMARQUES.md:72-74` | Rôle renommé « Hors variables », puis « Sur mesure » quand la piste 12 lui donne des variables possibles ; rôle par défaut |
| P2·09 : ne pas ajouter d'onglet « Vérifier » | Confirmé | « UCM Palettes a deux onglets, Création et Palettes » : `CONTRIBUTING.md:254`. L'atelier : « Une vue de plus à apprendre » : `REVUE-ET-PROTOTYPE-ATELIER.html:65`. La proposition 1 écartait un renommage d'onglet : `PROPOSITION-INITIALE.md:206-207` | Vérification des emplois inchangée dans l'onglet Création (`[UI-09]`, `RECHERCHE-PLUGIN-PALETTES.md:1548` ; `[UI-14]`, `:1675`). Vision et statuts dans l'onglet Palettes, seul écran où les palettes se voient côte à côte : `RECHERCHE-CONCURRENCE-PALETTES.md:503-505` |
| V2 : deux sorties, une police absente ne bloque pas les variables | Confirmé | Un chargement de police qui échoue arrête le dessin avant tout calque : `packages/plugin-palettes/src/ecriture/planche.ts:287-293`. La proposition 1 montrait déjà deux états dans une ligne : `generer-maquettes-proposition-initiale.mjs:259` et `:276` | Deux sorties, piste 2 |
| V2 : la pastille reste lisible | À nuancer | La règle des fiches ne prévoit qu'un état, celui du cadre : `CONTRIBUTING.md:322-324`. Il faut un ordre entre deux états | Pastille à l'état le plus urgent, ordre fixé ; seconde ligne quand les sorties diffèrent |
| V2 : « Actualiser tout » reste cohérent | Confirmé, avec une règle | Aujourd'hui, il génère les palettes à actualiser et celles pas encore sur Figma : `RECHERCHE-PLUGIN-PALETTES.md:1417-1419` | Même compte sur les deux sorties ; revue si des variables sont concernées ; « Générer tout » reste la planche seule |
| Le gain n'est pas démontré | Confirmé | « La supériorité sur ces critères reste une hypothèse » : `REVUE-ET-PROTOTYPE-ATELIER.html:76` | Essai par le mainteneur |

### B. Les erreurs de la proposition 1

| Point | Verdict | Preuve | Dans cette version |
|---|---|---|---|
| Garanties écrites en dur | Confirmé | `fiche()` écrit « Garanties ✓ » ou « Soft ✓ · Vivid ✓ » par défaut : `generer-maquettes-proposition-initiale.mjs:233`. L'écran de la vision appelle `fiche()` sans résultat : `:400`. Mesure du moteur : Vert `#16A34A`, Vivid, Thème Light, manque deux garanties, `border-control` sur `surface` et `focus` sur `surface`, à 2,92:1 pour 3:1. La maquette l'affichait « Vivid ✓ » | Chaque résultat sort de `verifierPromesses` (`packages/couleur/src/promesses.ts:206-213`) |
| Le cran 700 présenté en « `solid` · hover » | Confirmé | `generer-maquettes-proposition-initiale.mjs:323`. `solid` vaut 700 au repos : `packages/couleur/src/emplois.ts:31`. Son survol est le cran suivant : paire 14, `promesses.ts:42`. Mesure du moteur, `emploisDuCran` (`promesses.ts:105-117`) : le 700 sert `solid` et `text` au repos, `border-control` au survol | Chaque emploi sort d'`emploisDuCran` |
| Largeur de 770 px | À nuancer | Le code ouvre à 600 × 720, minimum 500 × 520, et range 770 parmi les anciens défauts : `packages/plugin-palettes/src/fenetre.ts:8`, `:18`, `:22`. La spécification dit encore 770 : `RECHERCHE-PLUGIN-PALETTES.md:1392`. La proposition 1 suivait la spécification : `generer-maquettes-proposition-initiale.mjs:146`, `:760` | Panneaux à 600 px, écrans chargés vérifiés à 500 px ; correction de `[UI-01]` proposée |
| Les compteurs mélangent les unités | Confirmé | « 22 » alias pour `theme.primary.50` à `950` : `generer-maquettes-proposition-initiale.mjs:297`, soit 11 variables et 22 valeurs. Comptes de l'architecture : `ARCHITECTURE-FINALE-MULTIMARQUES.md:127-129` | Trois unités, comptes recalculés (piste 3) : 198, 46 et 23 sont des variables ; 45 devient 46 avec V5 |
| « Rien n'est écrit dans Figma » | Confirmé | `generer-maquettes-proposition-initiale.mjs:356` et `:849`. La recette se range dans le document : `packages/plugin-palettes/src/ecriture/recette.ts:36`, à la fin de chaque geste, création comprise : `RECHERCHE-PLUGIN-PALETTES.md:591-595` | Les trois gestes sont nommés séparément (lexique, piste 5) |
| « Son cran 50 est le fond de page » | À nuancer | Vrai dans l'architecture : `ARCHITECTURE-FINALE-MULTIMARQUES.md:45-47`. Le plugin mesure contre des fonds saisis : D8, `RECHERCHE-PLUGIN-PALETTES.md:82`. Mesure du moteur : le 50 d'un neutre `#808080` vaut `#F7F7F7` et `#121212`, les fonds par défaut (Q5, `:102`). La phrase anticipait la piste 8 : `generer-maquettes-proposition-initiale.mjs:180` | La ligne du neutre dit que son 50 vaut les fonds par défaut ; la piste 8 reste à discuter |

### C. Les constats P1 de l'atelier

| Point | Verdict | Preuve | Dans cette version |
|---|---|---|---|
| P1·02 : « Garder » modifie la recette | Confirmé | « Garder » coché par défaut : `generer-maquettes-proposition-initiale.mjs:284`, `PROPOSITION-INITIALE.md:86-88` et `:183`. Mesure du moteur : `#DC2626` au 700 de Rouge, Vivid, Light, fait manquer `text` sur `surface` (4,14:1) et `text` sur `surface-card` (4,47:1) | Aucun choix coché, deux effets nommés, garanties recalculées sous le choix (piste 4) |
| P1·02 : retouche sur le cran de référence et `brand.identity` | Confirmé | Chaque mode de la rampe porteuse contient les octets exacts de la référence : `AGENTS.md:945-947`. L'identité sert le logo et les aplats de la charte : `ARCHITECTURE-FINALE-MULTIMARQUES.md:269-271`. La couleur d'avant ajustement : `originaleDe`, `edition.ts:79-81` | Pas de retouche sur le cran ◆ ; l'identité vaut la couleur saisie avant ajustement |
| P1·03 : une modification pendant la revue | Confirmé | La recherche, avant sa mise à jour, écrivait : « Avant d'écrire, le plugin compare la valeur présente à l'hexa de sa marque. » Deux valeurs seulement : une recette qui change aussi ne se voit pas. Les écritures actuelles relisent déjà une empreinte avant d'écrire : `ecriture/recette.ts:33-34`, `ecriture/planche.ts:253-254` | Comparaison à trois états, relecture au clic final |
| P1·06 : `variableCollectionId` est en lecture seule | Confirmé | `readonly variableCollectionId: string` : `node_modules/@figma/plugin-typings/plugin-api.d.ts:11768` (typings 1.138). Le nom, lui, s'écrit : `:11749`. Une variable porte des données de plugin : `:11743`. La recherche, avant sa mise à jour, promettait un renommage sans borne : « Changer la destination d'une palette renomme ses variables au lieu d'en créer d'autres » | Renommage dans une collection ; changement de collection par création, anciennes variables laissées |
| P1·06 : collisions, familles absentes, orphelines, valeurs sans provenance | Confirmé | La recherche, avant sa mise à jour, écrivait : « Une valeur sans marque dans ce mode, égale à celle de la première colonne, est une copie ». Une collection porte les mêmes variables dans chaque mode : `ARCHITECTURE-FINALE-MULTIMARQUES.md:70-72` | Tableau de propriété (piste 3) ; valeur sans provenance « à attribuer » |
| P1·07 : `commitUndo` n'est pas une transaction | Confirmé | `commitUndo` range les actions dans l'historique, sans rien défaire : `plugin-api.d.ts:273-294`. Le dessin actuel retire le cadre fautif et garde les précédents : `ecriture/planche.ts:361-365`. La proposition 1 promettait « Un seul Annuler » : `generer-maquettes-proposition-initiale.mjs:289` | Cinq temps, bilan partiel, reprise ; l'annulation est un essai à faire dans Figma |
| V13 : `primitives` et `brand` seules ne donnent rien d'utilisable | Confirmé | Les portées ne règlent que les sélecteurs de Figma : `plugin-api.d.ts:11903-11907`. La recherche leur donne des portées vides : `RECHERCHE-CONCURRENCE-PALETTES.md:240-242`. Un composant ne cite ni `primitives` ni `brand` : `ARCHITECTURE-FINALE-MULTIMARQUES.md:115-116`. Le lot sans `theme` : `PROPOSITION-INITIALE.md:168-169` | Première tranche : une famille avec ses alias |

### D. Les constats P2·10 à P2·15

| Constat | Verdict | Preuve | Intégré ? |
|---|---|---|---|
| P2·10 : la taille de la fenêtre | Confirmé | Voir la largeur, section B. Une modale existante défile quand la hauteur manque : `RECHERCHE-PLUGIN-PALETTES.md:1693-1697` | Oui : panneaux à 600 × 720, revue à hauteur bornée et corps défilant, écrans chargés à 500 px. Les maquettes restent statiques : le clavier se vérifie à l'essai du mainteneur |
| P2·11 : le jeu de départ incomplet | Confirmé | Marque B sans secondaire : `generer-maquettes-proposition-initiale.mjs:340` et `:353`. Palettes « cochées et figées » : `PROPOSITION-INITIALE.md:105-106` | Oui : familles communes à toutes les marques, raccordement, bilan en trois gestes |
| P2·12 : la vision simulée | À nuancer | Le constat demande des spécimens et le nom du modèle, que la proposition 1 n'avait pas : `REVUE-ET-PROTOTYPE-ATELIER.html:43`. Son placement dans « Vérifier » contredit `CONTRIBUTING.md:254` | Oui pour les spécimens et le modèle ; non pour l'onglet |
| P2·13 : les fonds liés au neutre | Confirmé | `REVUE-ET-PROTOTYPE-ATELIER.html:44` ; fonds saisis, D8 : `RECHERCHE-PLUGIN-PALETTES.md:82` | Oui : fonds saisis par défaut, bilan avant lien, repli dit |
| P2·14 : la sélection et les aides | Confirmé | La lecture actuelle prend la première peinture unie, visible et opaque, et convertit le P3 : `packages/plugin-palettes/src/lecture.ts:327-346`. Auto élit la part la plus proche, Vivid à égalité : `packages/couleur/src/palette.ts:163-168` ; un réglage fige le porteur : `:176-178`. La langue de l'interface est une préférence personnelle : `AGENTS.md:1083-1088` | Oui : bornes de la sélection, aide corrigée, langue des planches dans la recette |
| P2·15 : les primitives seules | Confirmé | Voir V13, section C | Oui : ordre des lots corrigé |


### E. La revue par scénario

| Point | Verdict | Preuve | Dans cette version |
|---|---|---|---|
| Le plugin s'ouvre sans palette choisie, sur une invitation sans geste | Confirmé | `[UI-06]`, `RECHERCHE-PLUGIN-PALETTES.md:1749-1757` ; `CONTRIBUTING.md:259-261` | Ouverture sur l'onglet Système (flux global) |
| Chaque fiche porte son bouton principal | Confirmé | `CONTRIBUTING.md:325-326` ; `[UI-05]`, `RECHERCHE-PLUGIN-PALETTES.md:1533-1537` | Un bouton principal en tête de l'onglet Système ; aucun dans les fiches |
| Un rang 1 se lit sans défiler | Règle | `CONTRIBUTING.md:230-232` | « Actualiser sur Figma… (N) » en tête ; « Actualiser tout » quittait le bas de la liste |
| Trois « Actualiser » de sens différents | Confirmé | En-tête de l'onglet Palettes : `RECHERCHE-PLUGIN-PALETTES.md:1776` ; « Actualiser sur Figma » d'une fiche et « Actualiser tout » : `:1417-1419`, `:1533-1537` | Le bouton de l'en-tête disparaît ; la relecture se fait à l'ouverture, au retour sur l'onglet et au clic final |
| L'onglet Création ne montre sous son titre que le refus et le conflit | Règle | `CONTRIBUTING.md:302-303` | Règle modifiée : la ligne d'état dans Figma s'y ajoute, sans bouton principal |
| L'alerte « palettes proches » compare toutes les paires | Confirmé | `packages/couleur/src/alertes.ts:173-184` ; `packages/plugin-palettes/src/analyse.ts:64-72` | Portée par marque et « Proches à dessein » (piste 13) |
| Deux palettes de deux marques ne s'affichent jamais ensemble | Confirmé | Un mode par marque dans `brand`, un composant ne cite que `theme` : `ARCHITECTURE-FINALE-MULTIMARQUES.md:80-83` et `:115-116` | Elles ne se comparent plus |
| La duplication existe | Confirmé | `packages/plugin-palettes/src/edition.ts:326` ; menu « … » : `packages/plugin-palettes/src/ui/menuPalette.ts:23` | Parcours des variantes (piste 13) |
| Les familles sont fermées | Confirmé | « Les quatre utilitaires » : `ARCHITECTURE-FINALE-MULTIMARQUES.md:106-107` | « Autre famille… », sous réserve de V18 |
| Pas de barre flottante sur le contenu | Règle | `[UI-03]`, `RECHERCHE-PLUGIN-PALETTES.md:1429-1430` | Rampe témoin dans la carte (piste 14) |
| Rampe à l'œil de Bleu A | Mesure du moteur | 10 nuances reprises : 4 garanties manquées en Thème Light, 0 pour la rampe calculée ; rétablir 100, 200 et 300 revient à 0 | Piste 11 |
| Intensité Soft à 0,50 | Mesure du moteur | 5 palettes changent ; 87 valeurs de `primitives` pour les 4 utilitaires ; aucune garantie perdue | Piste 3, comptes des réglages communs |
| Trois retouches de Rouge | Mesure du moteur | 700, 800 et 900 Vivid Light adoptés ensemble : 2 garanties manquées | Piste 4, décisions groupées |
| Palettes proches des maquettes | Mesure du moteur | Ambre et Orange A 0,026 ; Azur et Bleu A 0,041 ; Azur et Bleu K 0,032 ; Bleu A et Bleu K 0,040, deux marques | Pistes 7 et 13 |

Deux écarts de la documentation ressortent de ces vérifications, hors des
deux propositions. La spécification donne encore 770 × 720 pour la fenêtre,
que le code a ramenée à 600 × 720. Et l'identité de la marque doit valoir la
couleur d'avant ajustement, ce que ni l'architecture ni la recherche ne
précisaient.
