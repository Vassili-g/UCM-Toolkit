# Recherche sur l'harmonisation entre palettes

**Statut : base de réflexion.** Ce document rassemble les faits vérifiés dans
le moteur, les mesures reproductibles et les questions qui exigent des
maquettes ou un choix du mainteneur. Il ne décide ni d'une métrique produit,
ni d'un geste d'interface, ni d'une évolution de la recette.

Le [plan de recherche](./PLAN-RECHERCHE-HARMONISATION.md) porte les décisions
attendues et les maquettes à étudier. Cette recherche précise les contraintes
du moteur et les expériences qui peuvent réduire les inconnues.

## 1. Question produit

Le besoin réunit deux tâches qui ne doivent pas être confondues :

1. comparer les couleurs rendues par plusieurs palettes dans les mêmes rôles
   d'interface ;
2. proposer une modification de plusieurs palettes pour rapprocher les
   caractéristiques choisies.

La première tâche observe un résultat. La seconde modifie des entrées et doit
présenter une proposition avant de l'appliquer. Copier des valeurs de réglage
ne garantit pas l'égalité du résultat : chaque palette garde sa teinte, sa
référence, son point d'ancrage et ses contraintes.

Le terme « accord » doit donc être défini avant de choisir son verdict. Deux
palettes peuvent partager une clarté sans partager leur chroma. Elles peuvent
aussi avoir des valeurs saisies différentes et produire des couleurs proches.
La comparaison devrait afficher les grandeurs choisies plutôt que résumer ces
cas sous un score non expliqué.

## 2. Faits établis dans le dépôt

### Les paramètres ne se traduisent pas directement en couleurs égales

Les réglages globaux sont propres à chaque palette et se rangent dans
`palettes[].reglages`. La clarté et la teinte se règlent par profil. La
saturation est une part de chroma. Le Color shift garde des valeurs propres à
chaque palette, chaque profil et chaque bout de rampe. Les champs existants
sont décrits dans le [plan](./PLAN-RECHERCHE-HARMONISATION.md#2-ce-que-le-plugin-fait-aujourdhui).

Le moteur fabrique les crans à partir de la courbe, du pivot, des dérives, de
la part et du gamut. Il borne ensuite les composantes dans sRGB, arrondit les
couleurs à 8 bits et relit ces octets en OKLCH. Une mesure destinée à
l'interface doit donc porter sur `rampesDe`, qui rend les couleurs finales,
plutôt que sur les seules valeurs avant fabrication
([`palette.ts`](../../../../../packages/couleur/src/palette.ts),
[`rampe.ts`](../../../../../packages/couleur/src/rampe.ts),
[`conversions.ts`](../../../../../packages/couleur/src/conversions.ts)).

Une même part ne produit pas une même chroma. Le moteur calcule la chroma
visée comme la part multipliée par le plafond du gamut à la clarté et à la
teinte du cran. Le plafond varie avec ces deux valeurs
([`rampe.ts`](../../../../../packages/couleur/src/rampe.ts),
[`plafond.ts`](../../../../../packages/couleur/src/plafond.ts)). La part
normalisée décrit la proximité de la limite du gamut ; elle ne décrit pas la
quantité absolue de chroma.

La référence exacte est ancrée sur le profil porteur et sur un rang de chaque
mode. Les autres profils et nuances restent calculés. Les palettes peuvent
donc avoir des numéros d'ancrage différents ; les palettes libres et les
palettes figées ont d'autres règles
([`palette.ts`](../../../../../packages/couleur/src/palette.ts),
[`nuances.ts`](../../../../../packages/couleur/src/nuances.ts),
[`recette.ts`](../../../../../packages/couleur/src/recette.ts)).

Le thème Dark modifie aussi la part de chroma des nuances de fond. Les
nuances 50 à 300 reçoivent un facteur dépendant de leur clarté ; à partir de
la clarté du cran 400, ce facteur vaut 1. Une comparaison Light ne permet pas
de conclure sur Dark
([`rampe.ts`](../../../../../packages/couleur/src/rampe.ts),
[`palette.ts`](../../../../../packages/couleur/src/palette.ts)).

### Les comparateurs et les garde-fous existants ont une autre finalité

`distanceDePalettes` mesure le ΔEok moyen des nuances 500, 600 et 700 du mode
Light. Pour deux palettes à deux intensités, il compare Vivid à Vivid. Si une
palette n'a qu'une intensité, il choisit la paire de profils à distance
minimale. L'alerte `palettes-proches` signale des couleurs trop proches ;
elle ne mesure pas l'accord de danger, warning, success et info
([`alertes.ts`](../../../../../packages/couleur/src/alertes.ts)).

`distanceOk` est la distance euclidienne dans Oklab, notée ΔEok. Le seuil
`palettesProches` de la recette sert à l'alerte de proximité existante. Ni
cette grandeur ni ce seuil ne constituent un seuil validé de cohérence
visuelle entre palettes
([`contraste.ts`](../../../../../packages/couleur/src/contraste.ts),
[`recette.ts`](../../../../../packages/couleur/src/recette.ts)).

Les promesses WCAG sont jugées séparément pour chaque palette, profil et
mode. `balayerLaLimite` garde les promesses tenues au départ et l'ordre des
nuances pendant le balayage d'un seul paramètre à la fois
([`promesses.ts`](../../../../../packages/couleur/src/promesses.ts),
[`limites.ts`](../../../../../packages/couleur/src/limites.ts)). Une proposition
qui touche plusieurs paramètres doit donc être vérifiée sur son résultat
combiné ; juxtaposer les limites calculées séparément ne prouve pas que la
combinaison les respecte.

Les réglages vivent déjà dans les entrées de palette de la recette. Une
comparaison ou un choix de groupe temporaire n'exige pas de nouveau champ
rangé. Un groupe mémorisé, lui, modifierait la recette et appellerait une
étude de version et de migration. Après application, le rangement de la
recette et l'écriture des variables restent deux gestes séparés. La
synchronisation explicite des variables s'appuie sur les rampes recalculées
([`ecriture/recette.ts`](../../../../../packages/plugin-palettes/src/ecriture/recette.ts),
[`ecriture/variables.ts`](../../../../../packages/plugin-palettes/src/ecriture/variables.ts)).

## 3. Résultats reproductibles disponibles

Le script [`mesurer-ecarts.mjs`](./mesurer-ecarts.mjs) fabrique quatre
palettes depuis la recette par défaut, avec les références danger `#DC2626`,
warning `#F59E0B`, success `#16A34A` et info `#2563EB`. Il recalcule les
dérives Tailwind pour chaque référence. Les chiffres ci-dessous sont les
sorties du script dans le dépôt ; ils ne décrivent pas une recette réelle du
mainteneur.

| Expérience | Mesure observée | Ce qu'elle établit |
|---|---:|---|
| Soft, nuance 100, part commune `0,450` | Les clartés sont autour de `0,950` (écart min-max `0,001`). Les chromas vont de `0,011` à `0,038`, soit un rapport de `3,5`. | L'accord de clarté ne suffit pas à établir l'accord de chroma. |
| Vivid, nuance 100, sans réglage propre | Les clartés ont un écart de `0,002`. Les chromas ont un rapport de `3,8`. | Le profil et une part élevée ne suppriment pas l'effet de la teinte et du gamut. |
| Même Color shift de clarté `−0,04 / +0,04`, Light/Vivid | Les écarts de clarté atteignent `0,020` au cran 500 et `0,014` au cran 700. | Copier un même Color shift ne donne pas la même clarté sur toute la rampe. |
| Même Color shift de clarté `+0,02 / −0,06`, Light/Vivid | Les écarts atteignent `0,017` au cran 500 et `0,021` au cran 700. | Le profil de l'écart dépend des valeurs appliquées et du cran observé. |

Les écarts du tableau sont des étendues min-max. Le script écarte de son
calcul la valeur ancrée de chaque palette. Au cran 600, trois palettes sur
quatre sont ancrées dans la première expérience et dans la seconde ; la seule
valeur restante donne mécaniquement une étendue nulle. Une prochaine mesure
doit afficher le nombre de valeurs incluses, signaler chaque ancrage et
refuser de qualifier une étendue calculée sur une seule palette. L'ancrage
doit rester visible dans la comparaison, même si l'analyse fournit aussi une
mesure secondaire hors ancrage.

Le script établit un écart de calcul pour quatre références et des réglages
fabriqués. Il ne détermine pas le seuil perceptible ou acceptable dans un
composant. Il ne couvre pas les couleurs réellement réglées par le mainteneur,
les palettes à une seule intensité, les palettes libres, les palettes figées,
ni les promesses de contraste. Ces cas restent à mesurer.

## 4. Métriques à garder distinctes

Une première comparaison de maquette peut relever, par palette, intensité,
mode et nuance :

| Mesure | Usage dans la recherche | Limite |
|---|---|---|
| OKLCH `L` | Comparer la clarté perceptuelle visée par le moteur. | Ne dit rien de la chroma ni du contraste WCAG. |
| OKLCH `C` | Comparer la chroma absolue des couleurs rendues. | Le même `C` n'a pas le même rapport au plafond du gamut selon `L` et `H`. |
| Part de chroma | Montrer la part du plafond sRGB utilisée. | Une part identique peut produire des chromas absolues très différentes. |
| Teinte `H` | Expliquer les différences de couleurs entre rôles. | La teinte est peu informative près des gris ; le moteur la neutralise sous `CHROMA_SANS_TEINTE`. |
| ΔEok | Résumer une différence colorimétrique globale ou une distance paire à paire. | Un score moyen masque le cran, le canal et les extrêmes qui produisent l'écart. |
| Contraste WCAG et verdict des promesses | Vérifier que le rapprochement ne détériore pas les usages garantis. | Le contraste ne mesure pas l'harmonie des teintes ni l'accord de clarté. |

Chaque tableau de mesure doit garder les valeurs par cran et le nombre de
valeurs comparées. Il peut fournir en complément une étendue, une médiane ou
un maximum. Une moyenne seule peut cacher une nuance qui diverge fortement.
Soft, Vivid, Light et Dark doivent rester des dimensions explicites de la
comparaison ; un score unique les mélangerait sans règle de pondération
validée.

La comparaison de palettes de même type peut d'abord présenter Soft contre
Soft et Vivid contre Vivid. Une palette à une intensité ne possède pas ces
deux profils : l'interface doit la signaler comme intensité unique au lieu de
choisir le profil le plus proche sans montrer cette règle. Une palette libre
n'a pas les emplois ni les promesses habituels. Une palette figée n'a ni
réglage global ni Color shift. Ces catégories demandent des états de
comparaison lisibles ou un refus explicite, pas une valeur fabriquée.

## 5. Ce que les références externes permettent d'affirmer

[CSS Color 4](https://www.w3.org/TR/css-color-4/#oklab) décrit les espaces
Oklab et OKLCH, que le moteur emploie pour ses calculs. Le texte de
[Björn Ottosson sur Oklab](https://bottosson.github.io/posts/oklab/) explique
leur usage pour les changements de clarté, chroma et teinte et les
transitions perceptuellement plus régulières. Ces propriétés justifient de
mesurer séparément `L`, `C` et `H`. Elles ne fournissent pas le seuil produit
qui ferait dire que quatre palettes « vont ensemble » dans une alerte ou un
champ.

[WCAG 2.2, critère 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
porte sur le contraste clair-sombre utile à la lisibilité. La note explicative
précise que la teinte et la saturation n'y déterminent pas l'évaluation du
contraste. Les tests WCAG restent donc nécessaires pour les promesses du
produit, mais ne répondent pas à la question d'harmonisation.

La documentation de [Color.js sur les différences de couleur](https://colorjs.io/docs/color-difference.html)
présente plusieurs formules de ΔE et souligne qu'une valeur dite JND dépend de
la formule. Le nombre `2,3` cité pour la plupart des méthodes ΔE ne doit pas
être transféré à `distanceOk` : cette fonction donne la distance euclidienne
Oklab brute et le dépôt emploie son propre seuil pour l'alerte
`palettes-proches`. Le seuil d'harmonisation doit venir d'une évaluation des
maquettes, non d'une valeur reprise d'un autre modèle colorimétrique.

## 6. Expériences à mener

### A. Comparaison perceptive

Produire une planche HTML autonome avec une alerte, un badge et un champ en
état normal, erreur et succès. Utiliser danger, warning, success et info dans
les mêmes rôles que ceux que le designer veut comparer. Présenter les
variantes Soft/Vivid et Light/Dark dans des vues séparées, puis offrir un
comparatif à bascule pour tester leur lecture conjointe.

Créer des séries contrôlées où une seule propriété change :

1. clarté seule, autour des valeurs observées dans les mesures existantes ;
2. chroma seule, à clarté constante ;
3. clarté et chroma ensemble, pour vérifier si leur effet s'additionne ou
   dépend du rôle ;
4. contrastes calculés identiques avec teintes différentes, pour distinguer
   lisibilité et cohérence visuelle.

Le mainteneur juge séparément deux questions : « vois-je une différence ? »
et « cette différence est-elle acceptable pour ces rôles ? ». Noter les
réponses par composant, nuance, profil et mode. Ne pas déduire un seuil
universel d'une seule planche ou d'un seul rôle.

### B. Faisabilité de l'harmonisation

Lire une recette exportée choisie par le mainteneur et conserver une copie
immuable comme entrée. Relever par palette les profils, modes, nuances
présentes, réglages, références, ancrages et promesses avant toute simulation.

Comparer au moins trois propositions :

| Proposition | Calcul | Questions à mesurer |
|---|---|---|
| Recopier les réglages d'une palette modèle | Appliquer les mêmes valeurs de clarté et, si retenu, de part. Garder les réglages hors périmètre propres à chaque palette. | Écart résiduel par cran ; déplacement ou non de la référence ; palettes dont les limites ou garanties refusent la proposition. |
| Chercher les réglages qui rapprochent les clartés rendues | Pour chaque palette cible, rechercher les valeurs de réglage qui rapprochent les `L` rendues du modèle, en recalculant les rampes finales. | Existence de plusieurs solutions ou d'aucune solution ; écart résiduel après arrondi sRGB ; effet sur la référence et les chromas. |
| Déplacer toutes les palettes du même incrément | Appliquer le même delta aux réglages actuels du groupe, sans imposer des valeurs identiques. | La portée réelle de « groupe » ; profils qui butent plus tôt ; intérêt par rapport au réglage indépendant actuel. |

Le premier prototype du calcul peut traiter la luminosité seule, puis comparer
la luminosité et la part de chroma séparément. Un objectif qui mélange `L` et
`C` exige une pondération que le plan actuel ne justifie pas. Pour chaque
candidate, recalculer le résultat final par `rampesDe`, inclure l'ancrage et
vérifier les promesses, les limites de réglage et l'ordre de chaque rampe.
Afficher les changements de référence explicitement : un réglage de clarté
ou de part sur le profil porteur peut modifier la référence de la palette.

Une proposition impossible pour une palette ne doit pas être corrigée par un
repli silencieux. La maquette doit montrer si le geste refuse tout le groupe,
laisse cette palette inchangée ou limite les autres. Le choix change le sens
de « harmoniser » et revient au mainteneur.

### C. Comparaison des surfaces d'interface

Conserver les quatre options du plan comme variantes de maquette :

- témoin dans Création, visible pendant le réglage ;
- carte de comparaison dans Vérification ;
- vue de cohérence dans Gestion ;
- réglage collectif dans Création, qui vise à prévenir les écarts.

Maquetter la proposition avec deux palettes puis avec quatre. Répéter aux
largeurs de 500 et 600 px indiquées dans le plan. Vérifier le coût de lecture
des écarts sans chiffres, la place nécessaire aux valeurs détaillées et la
compréhension du profil ou du thème actif.

Une comparaison choisie à la volée garde l'état hors recette et évite de
décider comment un groupe nommé survit à la suppression, au renommage ou à
l'ajout de palettes. Un groupe rangé facilite les vérifications répétées,
mais ajoute des règles de propriété et de migration. La maquette doit
permettre d'estimer cette différence d'usage avant de modifier le format.

## 7. Hypothèse de travail pour la première maquette

Commencer par la comparaison sans écriture, avec un choix temporaire de
palettes et une visualisation des résultats rendus. Cette étape teste les
métriques et l'endroit de l'interface avant qu'un algorithme ne masque la
nature des écarts.

Pour l'harmonisation, utiliser ensuite une proposition « avant / après /
Appliquer ». La maquette doit nommer les palettes touchées, les paramètres
modifiés, les écarts restants, les changements de référence et les promesses
qui changent. Appliquer doit ranger la recette par le chemin existant. La
synchronisation des tokens demeure une action distincte.

Cette hypothèse ne tranche pas si l'outil doit copier des valeurs, calculer
des valeurs par palette ou régler un groupe en continu. Elle réduit d'abord
les risques de confusion entre comparaison, simulation et écriture.

## 8. Questions à laisser ouvertes pour le décideur

Les réponses doivent s'appuyer sur les maquettes et les résultats de
l'expérience, pas sur une convention colorimétrique isolée.

1. L'objectif porte-t-il sur la clarté, la chroma, les deux ou un rôle
   d'usage précis ?
2. Quelles nuances et quels contextes déterminent l'accord : emplois de
   surface, rampe complète ou composants choisis ?
3. La comparaison montre-t-elle un verdict ou seulement les écarts ? Si un
   verdict existe, quel seuil et pour quels rôles ?
4. La cible est-elle une palette modèle, un profil choisi, ou un déplacement
   collectif à partir des réglages actuels ?
5. Quels paramètres l'action peut-elle modifier : clarté, part, ou les deux ?
   Les dérives de teinte et le Color shift restent-ils toujours propres à
   chaque palette ?
6. L'opération distingue-t-elle Soft et Vivid, Light et Dark ? Doit-elle
   permettre de régler ces dimensions indépendamment ?
7. Le mainteneur préfère-t-il un geste ponctuel ou une relation persistante
   entre palettes, avec une alerte quand le réglage d'une palette rompt
   l'accord ?
8. Comment traiter une palette à une intensité, libre, figée ou bloquée par
   une promesse ?
9. Si la proposition ne peut pas respecter les contraintes pour chaque
   palette, faut-il refuser l'ensemble ou laisser les palettes faisables
   continuer ?
10. Un groupe doit-il être nommé et rangé dans la recette, ou choisi pour
    chaque comparaison et chaque action ?

## 9. Références dans le dépôt

- [Plan de recherche et décisions attendues](./PLAN-RECHERCHE-HARMONISATION.md)
- [Script des premières mesures](./mesurer-ecarts.mjs)
- [Commandes Light/Dark et Soft/Vivid](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Plugin%20Palettes/Commandes%20Light-Dark%20et%20Soft-Vivid/DOSSIER-COMMANDES-D-AFFICHAGE.md)
- [Modèle et validation de la recette](../../../../../packages/couleur/src/recette.ts)
- [Génération des rampes](../../../../../packages/couleur/src/rampe.ts)
- [Mesure des promesses](../../../../../packages/couleur/src/promesses.ts)
- [Comparaison et alertes existantes](../../../../../packages/couleur/src/alertes.ts)
- [Calcul des limites de réglage](../../../../../packages/couleur/src/limites.ts)
