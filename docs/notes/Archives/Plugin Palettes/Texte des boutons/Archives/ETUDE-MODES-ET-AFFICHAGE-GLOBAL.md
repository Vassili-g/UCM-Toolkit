# Étude préparatoire : texte des boutons et affichage global

> Archivé : ce document est réuni dans le [dossier de recherche](../DOSSIER-TEXTE-DES-BOUTONS.md),
> qui fait foi. Ses liens relatifs datent de son ancien emplacement.

**Statut :** base de recherche, sans décision de produit ni proposition
d'implémentation retenue.

Cette étude reprend les constats de [NOTES-RECETTE-MODES-ET-AFFICHAGE.md](./NOTES-RECETTE-MODES-ET-AFFICHAGE.md)
et vérifie leur portée dans le code. Elle sépare deux sujets : la couleur du
texte posé sur un fond plein, et l'accès au choix du thème montré dans les
différentes sections. Les deux sujets se croisent dans l'aperçu, mais ils ne
désignent pas le même état ni la même décision.

## Résultats à retenir

- `on-solid` désigne aujourd'hui le fond du thème dans la table des emplois et
  dans les tests de contraste. La recette fournit un fond `light` et un fond
  `dark`. Le texte du bouton de démonstration reprend ce fond, même si le
  contraste serait meilleur avec l'autre polarité.
- Le rôle `on-solid` cible une nuance neutre partagée. Il ne choisit pas une
  encre différente selon la couleur de chaque bouton. Un choix clair/sombre
  par thème toucherait donc une relation de tokens existante, pas seulement
  une décoration du spécimen.
- Le thème de l'aperçu est déjà un état commun transmis au Color shift et à
  l'Interface de test. Son contrôle visible reste dans l'en-tête de l'aperçu.
  Les sélecteurs Soft/Vivid ont des rôles différents selon la section :
  certains sélectionnent une cible de réglage, d'autres choisissent une rampe
  à prévisualiser.
- Le moteur porte déjà des courbes et des fonds distincts pour Light et Dark.
  Les réglages de palette, eux, n'ont pas une copie séparée par thème. Il faut
  préciser ce que signifie « régler Light et Dark indépendamment » avant de
  dessiner une solution.
- WCAG 2.2 demande un contraste d'au moins 4,5:1 pour le texte courant et
  3:1 pour le grand texte. Le calcul doit porter sur le texte et le fond
  effectivement associés dans chaque état de bouton.

Ces constats orientent les essais. Ils ne tranchent pas entre un choix manuel
de couleur, une sélection automatique du contraste ou le maintien du rôle
actuel.

## 1. Texte sur fond plein

### Ce que le code fait

La table fixe les emplois `solid` au cran 700 et `on-solid` au fond du thème
(`emplois.ts`). Le support de
`on-solid` est le texte et l'icône. Dans les tokens, son alias vise la palette
neutre et sa nuance la plus claire, quelle que soit la palette de couleur
concernée (`usages.ts`).
L'identité de cet emploi est donc celle d'une couleur de premier plan commune,
et non d'une couleur calculée pour chaque remplissage `solid`.

Le vérificateur compare `on-solid` au fond `solid` dans chaque mode et chaque
intensité. Il juge aussi les trois états suivants du fond plein. Les paires
utilisent le seuil `texte` de la recette, fixé par défaut à 4,5
([`promesses.ts`](../../../../../../packages/couleur/src/promesses.ts),
`paires.ts`). Le résultat
signale une promesse tenue ou manquée ; il ne change pas la couleur du texte.

L'Interface de test applique `recette.fonds[mode]` au texte des boutons pleins
et fait évoluer le fond sur les états repos, survol et appui
([`interfaceDeTest.ts`](../../../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts)).
La carte des garanties emploie le même couple de rôles
([`specimens.ts`](../../../../../../packages/plugin-palettes/src/ui/specimens.ts)).
En Dark, le fond de texte est donc sombre. Ce comportement suit le modèle
actuel ; il ne résulte pas d'une inversion accidentelle du thème dans
l'Interface de test.

Le nuancier contient déjà un mécanisme voisin, mais de portée différente :
ses étiquettes choisissent le noir ou le blanc qui contraste le plus avec
chaque nuance
([`nuancier.ts`](../../../../../../packages/plugin-palettes/src/ui/nuancier.ts)).
Ce précédent prouve qu'un choix d'encre locale existe dans l'interface. Il ne
prouve pas que le moteur de tokens peut représenter la même décision pour
`on-solid`.

### Ce que la recherche doit comparer

| Option à examiner | Effet visible | Coût ou question à vérifier |
|---|---|---|
| Garder le fond de thème comme `on-solid` | Le comportement existant reste identique. | Mesurer les cas où le contraste manque, notamment en Dark, puis vérifier si le réglage des courbes suffit à les corriger. |
| Choisir une encre claire ou sombre séparément pour Light et Dark | Un choix stable par thème s'applique aux boutons concernés. | Une même encre peut convenir à un profil et échouer sur l'autre. Mesurer chaque palette, intensité, nuance de bouton et état. Définir la valeur par défaut et le signalement d'un contraste insuffisant. |
| Choisir automatiquement le noir ou le blanc selon le fond de chaque bouton | L'encre suit la couleur réellement peinte et peut être évaluée à chaque état. | Cette décision est propre à une paire de couleurs. Établir si elle reste exprimable par le token partagé `on-solid`, ou si elle impose un modèle de couleur par composant ou par emploi. |
| Combiner un choix par thème avec une vérification qui propose l'autre polarité | Le designer garde une préférence, et l'outil expose les écarts. | Ne pas masquer les promesses manquées. Mesurer si le choix permet de corriger davantage de palettes sans créer une configuration incompréhensible. |

Pour une couleur opaque, choisir la plus contrastée parmi le noir et le blanc
donne théoriquement au moins environ 4,58:1 selon la formule WCAG. Le nuancier
utilise déjà la comparaison des deux contrastes pour ses étiquettes. Il faut
valider cette piste sur les octets réels du moteur, sur tous les états, et
contre les tests de promesses avant d'en faire une règle produit. Cette piste
ne remplace pas automatiquement une intention de marque ni le besoin de
stabilité des tokens.

### Matrice d'essai à produire

Pour chaque palette calculée, relever les ratios du texte sur chaque fond plein
pour :

- Light et Dark ;
- Soft et Vivid, ou l'intensité unique ;
- les états repos, survol, appui et survol avec appui ;
- les nuances que les paires `on-solid`/`solid` couvrent, y compris 950 ;
- au moins une référence claire, une sombre, une jaune, une grise, une terne et
  une saturée ;
- les palettes reprises et figées, qui ne suivent pas nécessairement les
  garanties d'une palette calculée.

Chaque ligne doit identifier les deux couleurs comparées, le ratio non arrondi,
le seuil, le verdict, la source de l'encre et l'état du contrôle. Résumer le
pire ratio et la proportion de combinaisons conformes par option. Une moyenne
seule cacherait les cas les plus défavorables.

Un prototype de sélection manuelle doit montrer le contraste obtenu pour la
palette ouverte et chaque intensité. Un réglage « automatique » doit montrer
quelle encre il choisit dans chaque état. Dans les deux cas, conserver une
indication explicite des promesses manquées et tester le résultat des couleurs
dans les tokens exportés, pas seulement dans le spécimen.

## 2. Thème montré et cible de réglage

### Inventaire du comportement actuel

| Surface | État choisi | Portée de l'action |
|---|---|---|
| En-tête du nuancier | `light` ou `dark` | Change le thème de l'aperçu. L'état est porté par le nuancier et transmis aux sections qui dessinent une vue par thème. |
| Carte Color shift | `soft` ou `vivid` | Choisit le profil que l'éditeur règle. Le graphe continue de montrer les deux profils. |
| Carte Réglage global | `soft`, `vivid` ou les deux | Choisit les profils touchés par les réglettes. |
| Interface de test | `soft` ou `vivid` | Choisit la rampe dessinée dans l'écran simulé. Ce contrôle ne modifie pas la recette. |
| Réglages communs | Light et Dark ont des valeurs séparées pour les fonds et les courbes | Modifie des valeurs communes aux palettes, pas le thème de prévisualisation seul. |

Le nuancier initialise son mode à Light et appelle le rendu des sections après
un changement. L'onglet Création transmet ce mode au Color shift et à
l'Interface de test ([`nuancier.ts`](../../../../../../packages/plugin-palettes/src/ui/nuancier.ts),
[`ongletCreation.ts`](../../../../../../packages/plugin-palettes/src/ui/ongletCreation.ts)).
Le contrôle de thème est éloigné de l'Interface de test dans le document
défilant ; la section ne possède pas de commande locale de thème.

Les sélecteurs de profil ne sont pas interchangeables. Dans le Color shift,
Soft/Vivid désigne le profil réglé. Dans le Réglage global, le choix peut
inclure les deux profils. Dans l'Interface de test, Soft/Vivid désigne seulement
la rampe visible. Une palette à une intensité masque les choix de profil qui
ne s'appliquent pas. Ces distinctions doivent rester explicites dans chaque
maquette.

La recette comporte déjà deux courbes, `courbes.light` et `courbes.dark`, deux
fonds et un facteur spécifique aux nuances de fond Dark. Ces valeurs sont
distinctes dans les Réglages communs. À l'inverse, `derive` et `reglages`
portent des valeurs par profil, pas une valeur séparée par thème
([`recette.ts`](../../../../../../packages/couleur/src/recette.ts),
[`rampe.ts`](../../../../../../packages/couleur/src/rampe.ts)). « Indépendamment »
peut donc signifier au moins trois choses :

1. afficher rapidement l'autre thème ;
2. régler les paramètres communs Light et Dark séparément ;
3. donner à chaque palette des réglages de teinte, de saturation ou de
   luminosité distincts par thème.

Le code permet déjà le premier par le nuancier et une partie du deuxième par
les Réglages communs. Le troisième ajouterait un nouvel axe au modèle de
palette. La recherche ne doit pas traiter ces trois besoins comme un seul
interrupteur.

### Modèles d'affichage à prototyper

| Modèle | Avantage à éprouver | Risque à éprouver |
|---|---|---|
| Commande globale unique, toujours accessible pendant le défilement | Le thème affiché garde une seule source d'état ; le designer n'a plus à remonter au nuancier. | Hauteur occupée, recouvrement de la fenêtre minimale, interaction avec l'en-tête et le pied fixe. |
| Commandes locales synchronisées avec l'en-tête du nuancier | Le thème se change près de la section observée, tout en gardant un seul état partagé. | Commandes répétées, compréhension de leur portée, annonces accessibles et maintien de leur état visuel après une mise à jour. |
| Comparaison Light/Dark simultanée | L'écart entre thèmes devient visible sans bascule. | Surface disponible, densité, taille minimale de fenêtre et distinction entre comparaison et modification. |
| Commandes locales indépendantes par section | Chaque section garde son propre contexte de prévisualisation. | Deux thèmes différents peuvent être montrés sur la même page sans repère clair ; la personne peut prendre un thème affiché pour une cible d'édition. |

Les trois premiers modèles doivent être dessinés à la taille par défaut et à la
taille minimale du plugin. Le dernier sert de contre-exemple à évaluer, pas de
choix par défaut : il multiplie les états sans répondre à la demande d'un
contrôle global cohérent.

Le libellé doit distinguer le contexte de rendu de la cible modifiée. Par
exemple, le groupe de thème porte « Aperçu », et les sélecteurs de profils
portent « Régler » ou « Afficher ». Une commande globale de thème ne doit pas
remplacer les commandes Soft/Vivid qui déterminent une écriture.

## 3. Compatibilité et portée des données

La recette courante est en format 8. Le validateur refuse les clés inconnues
et ne convertit ni les formats plus anciens ni les formats futurs
([`recette.ts`](../../../../../../packages/couleur/src/recette.ts)). Ajouter un choix
persistant de texte clair/sombre ou des réglages par thème impose donc
d'expliciter :

- si la préférence concerne toute la recette, chaque palette ou seulement
  l'affichage de l'Interface de test ;
- sa valeur par défaut pour les palettes existantes ;
- si elle affecte les tokens de sortie et les planches, ou seulement le
  spécimen ;
- la version de recette à écrire et le comportement de lecture des recettes
  existantes ;
- les écarts à afficher dans l'import, le rapport et le verdict de contraste.

Un contrôle qui ne fait que changer l'aperçu peut rester temporaire et ne pas
entrer dans la recette. Le code actuel initialise le thème à Light au
chargement du nuancier ; il ne range pas ce choix dans la recette. La préférence
de langue et la vue de Gestion, elles, utilisent `clientStorage`. Une maquette
ne doit pas laisser croire que le thème est sauvegardé si ce n'est pas le cas.

Les changements d'affichage ne doivent déclencher aucune écriture dans le
document Figma. Si le modèle ajoute des valeurs à la recette, suivre le chemin
de rangement existant et vérifier l'annulation, le conflit de recette et la
compatibilité de chaque lecteur. Les tokens exportés et les variables déjà
écrites doivent rester cohérents avec la recette rangée.

## 4. Critères de comparaison des maquettes

### Parcours

1. Ouvrir une palette à deux intensités et observer l'Interface de test.
2. Passer de Light à Dark sans revenir en haut de la page.
3. Vérifier que le nuancier, l'éditeur et l'Interface de test affichent le
   thème annoncé.
4. Passer de Soft à Vivid dans l'Interface de test, puis vérifier qu'aucun
   réglage n'a changé.
5. Modifier Soft ou Vivid dans chacune des cartes de réglage et vérifier que
   le contrôle d'affichage ne modifie pas la cible d'édition.
6. Refaire le parcours avec une palette à une intensité, une palette libre,
   une palette grise et une palette figée.
7. Basculer la langue anglaise/française et vérifier les libellés, les noms
   accessibles et les annonces d'état.

### Mesures et contrôles

- Nombre de gestes et distance de défilement pour changer de thème depuis
  l'Interface de test.
- Temps nécessaire pour trouver le contrôle et taux d'erreur de sélection
  entre aperçu et cible de réglage.
- État `aria-pressed` ou équivalent, ordre clavier et annonce du thème actif.
- Hauteur prise par le contrôle, chevauchement à la taille minimale et
  déplacement des réglettes pendant un glisser.
- Égalité de la recette, de son empreinte et des valeurs de couleur après un
  changement d'affichage seul.
- Ratios de contraste sur tous les boutons et états, avec verdict basé sur la
  valeur non arrondie.

Utiliser des captures comparables de l'interface réelle. La galerie du plugin
permet de juger les deux thèmes et les deux tailles hors de Figma. Elle ne
prouve pas un contraste WCAG sur ses décalques ; mesurer ce dernier à partir
des valeurs calculées par le moteur.

## 5. Questions à résoudre avant toute décision

1. Le texte sombre en Dark apparaît-il seulement dans l'Interface de test, ou
   aussi dans la planche et dans des tokens utilisés par des composants
   réels ?
2. Le besoin est-il de fixer une polarité par thème, d'obtenir le meilleur
   contraste pour chaque fond de bouton, ou de conserver un rôle neutre commun
   même quand le contraste baisse ?
3. Le choix d'encre doit-il être global, propre à chaque palette, propre à
   chaque profil ou calculé par chaque composant ?
4. Le réglage Light/Dark demandé concerne-t-il seulement la prévisualisation,
   les paramètres communs déjà distincts, ou aussi les réglages individuels
   des palettes ?
5. Une commande globale doit-elle couvrir uniquement la prévisualisation, ou
   également les contrôles qui écrivent ? Le modèle doit nommer clairement les
   deux portées.
6. Quelle fenêtre et quelle hauteur de contenu forment le cas d'usage courant
   pour les changements répétés de thème ?

## 6. Consigne pour le modèle chargé de poursuivre la recherche

Traite cette étude comme un relevé préparatoire, pas comme une spécification.
Relis la note de recette, les sources citées et les documents d'autorité avant
de conclure. Vérifie chaque fait de code. Sépare explicitement les faits
observés, les hypothèses, les avis et les décisions proposées.

Produis une comparaison de modèles avec, pour chacun, le comportement attendu,
les changements de données, les conséquences sur les tokens et les lecteurs,
les risques WCAG, les états d'interface, la compatibilité et les tests requis.
Calcule une matrice de contraste sur les palettes du moteur plutôt que
d'extrapoler depuis quelques couleurs. Dessine les modèles d'affichage à deux
tailles avec la galerie du plugin. Distingue toujours le thème d'aperçu de la
cible Soft/Vivid.

La sortie doit répondre aux six questions ci-dessus, donner les preuves qui
permettent de vérifier chaque conclusion, puis formuler une recommandation
conditionnelle et les critères qui la feraient changer. Ne modifie pas le code,
la recette, les formats publiés ni les maquettes existantes pendant cette
phase. Les essais sur maquettes doivent précéder toute implémentation.

## Sources

### Dépôt

- [Note de recette](./NOTES-RECETTE-MODES-ET-AFFICHAGE.md)
- `emplois.ts` et
  `usages.ts` : sémantique
  de `solid` et `on-solid`, cible tokenisée.
- `paires.ts` et
  [`promesses.ts`](../../../../../../packages/couleur/src/promesses.ts) : paires et
  seuils jugés.
- [`interfaceDeTest.ts`](../../../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts),
  [`specimens.ts`](../../../../../../packages/plugin-palettes/src/ui/specimens.ts)
  et [`nuancier.ts`](../../../../../../packages/plugin-palettes/src/ui/nuancier.ts) :
  encre affichée et choix de thème.
- [`ongletCreation.ts`](../../../../../../packages/plugin-palettes/src/ui/ongletCreation.ts),
  [`reglagesDeLaPalette.ts`](../../../../../../packages/plugin-palettes/src/ui/reglagesDeLaPalette.ts)
  et [`editeur.ts`](../../../../../../packages/plugin-palettes/src/ui/derive/editeur.ts) :
  état transmis et portée des sélecteurs Soft/Vivid.
- [`recette.ts`](../../../../../../packages/couleur/src/recette.ts) : champs,
  version et validation de la recette.
- [Spécification initiale d'UCM Palettes](../../1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) :
  contrat de la recette et des paires de contraste.
- [Contribution, interface du plugin](../../../../../../CONTRIBUTING.md#interface-du-plugin)
  et [invariants d'interface](../../../../../../AGENTS.md#interface-ducm-palettes) :
  relecture des écrans et contraintes de taille.

### Références externes

- [W3C, Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) :
  seuils de contraste du texte, importance de la luminance et comparaison aux
  valeurs non arrondies.
- [W3C, Understanding Success Criterion 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) :
  contraste des limites et informations d'état des composants d'interface.
