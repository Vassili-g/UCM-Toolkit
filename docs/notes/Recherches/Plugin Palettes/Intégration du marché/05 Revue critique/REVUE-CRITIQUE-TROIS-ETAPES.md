# Revue critique de la proposition « Palettes, Vérifier, Appliquer »

Ce document juge [la proposition d'expérience](../04%20Parcours%20en%20trois%20%C3%A9tapes/PROPOSITION-TROIS-ETAPES.html),
dernière des quatre propositions de ce dossier, avant qu'un plan
d'implémentation soit écrit. Il s'adresse au mainteneur, qui décide, puis à
l'agent qui écrira le plan. Il confronte la proposition à la demande initiale,
[la comparaison avec les outils du marché](../../1 Recherche initiale/RECHERCHE-CONCURRENCE-PALETTES.md),
et aux trois propositions qui la précèdent :
[la proposition 1](../01%20Proposition%20initiale/PROPOSITION-INITIALE.md),
[la revue de l'atelier](../02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html) et
[la proposition finale](../03%20Proposition%20finale/PROPOSITION-FINALE.md).

Ce document ne décide rien. La [spécification](../../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin.

Les mesures citées sortent du moteur, sur la recette par défaut et avec les
données du générateur de la proposition. Elles se rejouent depuis la racine du
dépôt :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/05 Revue critique/mesurer-revue-critique.mjs"
```

Les coupures des maquettes ont été mesurées dans Chromium, sur la page
`PROPOSITION-TROIS-ETAPES.html` telle qu'elle est générée.

## Verdict

La proposition d'expérience pose un bon cadre de lecture : les trois questions
du designer, ses mots à l'écran, la couleur choisie avant sa destination. Ce
cadre mérite d'être gardé. La proposition ne peut pas encore servir de base à
un plan, pour quatre raisons.

1. **Elle paraît simple parce qu'elle ne dessine pas les cas difficiles.**
   Onze cas que la proposition finale traitait n'ont ni écran ni règle :
   valeur sans provenance, fichier modifié pendant la revue, échec partiel,
   famille manquante dans une marque, cran de la référence retouché, entre
   autres. La proposition dit remplacer les décisions précédentes « pour tout
   ce qui touche au parcours », sans dire lesquelles de leurs règles restent.
2. **Elle retire la vue du système sans reloger ce qu'elle portait.**
   L'onglet Palettes actuel porte l'état de chaque cadre, « Afficher dans
   Figma », les palettes supprimées, l'export, l'import et le rapport. Aucun
   de ces gestes n'a de place dans les trois étapes. Une retouche faite dans
   Figma reste invisible jusqu'à l'étape Appliquer.
3. **Son mécanisme nouveau, la correction proposée, abîme la rampe de son
   propre exemple.** Après correction, les nuances 50 et 100 de Bleu A sont à
   1,01:1 l'une de l'autre, et 300 et 400 à 2,07:1. La correction ne couvre
   pas non plus une palette calculée qui manque une garantie.
4. **La destination remplace le rôle sans porter ses contraintes.** Aucun
   écran ne dit où se choisissent les intensités, ni comment une palette rejoint
   `primitives`, alors que « Dans le système UCM » demande « une marque et une
   famille ».

Le périmètre, lui, n'a pas diminué : la liaison à des variables existantes,
que la proposition finale laissait « à discuter » pour son coût élevé, devient
une des trois destinations.

La section [Ce qu'il faut trancher](#ce-quil-faut-trancher-avant-le-développement)
propose de garder le cadre de la proposition d'expérience et d'y reloger les
mécanismes de la proposition finale, puis d'éprouver le résultat sur un
prototype interactif avant tout développement.

## La demande initiale et ses critères

La recherche retient un apport principal : écrire les variables `primitives`,
`brand` et `theme`, qui coûtent aujourd'hui 710 saisies à la main pour six
marques. Viennent ensuite la couleur de la sélection, le jeu de départ et la
vision simulée. Elle juge chaque proposition sur quatre questions (section 1).

| Critère de la recherche | Proposition d'expérience | Constat |
|---|---|---|
| Retirer une saisie manuelle de la chaîne | Oui : variables et alias écrits depuis Appliquer | Tenu, sous réserve des cas limites de la section 1 ci-dessous |
| Garder « un numéro de cran vaut un contraste » et la table fixe des emplois | La correction proposée garde les nuances reprises hors des courbes | Tenu pour les garanties ; la régularité de la rampe n'est plus garantie (section 3) |
| Une seule source par valeur : la recette rangée fait autorité | Une retouche se décide dans la relecture | Non démontré : sans comparaison à trois valeurs ni provenance, une valeur de Figma peut diverger de la recette sans être vue (section 1) |
| Tenir dans les surfaces d'UCM Palettes, sous la douzaine d'objets | Trois onglets au lieu de deux ; une destination à trois choix et à sous-formulaire | Change la règle des surfaces ; le compte d'objets n'est pas fait |

## Le fil des propositions

| Proposition | Parti pris | Ce que la suivante lui reproche, à raison |
|---|---|---|
| Proposition 1 | Un rôle par palette ; un état et un geste par palette ; « Garder » coché par défaut | État unique qui bloque les variables quand une police manque ; « Garder » modifie la recette sans décision ; compteurs faux |
| Atelier | Trois onglets Palettes, Vérifier, Appliquer ; destination séparée de la palette ; prototype interactif | La destination laisse saisir une palette de marque à deux intensités, puis la refuse ; un troisième onglet change la règle des surfaces |
| Proposition finale | Onglets Système et Palette ; revue détaillée ; cinq temps d'écriture ; quatorze pistes et dix-neuf décisions | Trop d'objets et de décisions ; le designer traduit sa question en collections avant d'agir |
| Proposition d'expérience | Retour aux trois onglets de l'atelier ; cinq règles ; neuf écrans | Voir les sections suivantes |

La proposition d'expérience revient au parcours de l'atelier et répond au
reproche fait à la proposition finale. Elle ne répond pas à l'objection que la
proposition finale faisait à l'atelier, sur la destination (section 4).

## Ce que la proposition d'expérience apporte

- **Les trois questions du designer.** « D'où je pars ? », « Est-ce que ça
  marche ? », « Qu'est-ce que ça change dans Figma ? » donnent un critère pour
  placer chaque fonction. La proposition finale n'en avait pas : chaque
  scénario y ajoutait une piste.
- **Les mots du designer à l'écran, les chemins dans le détail.** « Marque A ·
  primary » se lit mieux que `brand.palette.primary`. Le détail technique
  replié garde les chemins pour le designer qui les cherche dans le panneau des
  variables de Figma.
- **La couleur avant la destination.** Un essai se crée sans décision
  d'architecture. La proposition finale obtenait le même effet avec le rôle
  « Sur mesure » par défaut ; la proposition d'expérience l'obtient avec un
  écran de moins à la création.
- **Un bouton principal en pied, hors du défilement.** Il tient la règle « un
  rang 1 hors de vue n'est pas un rang 1 » de
  [CONTRIBUTING](../../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes).
- **Un avant et un après pour une correction.** Montrer la rampe corrigée
  avant de l'adopter est le bon geste, si la correction est juste (section 3).
- **La relecture sans choix par défaut.** Une valeur non décidée ne s'écrit
  pas et ne bloque pas le reste. La règle vient de la proposition finale et
  reste.
- **La vision simulée avec la marque.** Orange A à 0,026 d'Ambre, montrée
  sur des spécimens de statut, est l'exemple qui justifie la carte.

## Les points faibles

Les sections 1 à 4 bloquent un plan. Les sections 5 à 9 se corrigent dans la
proposition. La section 10 regroupe des points secondaires.

### 1. Les cas limites n'ont plus d'écran

La proposition finale traitait chacun de ces cas par une règle et un écran. La
proposition d'expérience n'en montre aucun, et sa liste « Gardé de l'atelier »
n'en reprend que la relecture au moment d'écrire.

| Cas | Proposition finale | Proposition d'expérience | Ce qui arrive sans règle |
|---|---|---|---|
| La recette et Figma ont changé tous deux | Comparaison à trois valeurs : dernière appliquée, recette, Figma | Deux valeurs, « Plugin » et « Figma » | Une valeur changée dans Figma et dans la recette passe pour une simple écriture, et la retouche est écrasée |
| Valeur sans provenance : variable créée à la main, mode ajouté hors du plugin, première liaison à des variables existantes | « À décider », décision groupée | Absent | Le plugin écrase des valeurs qu'il n'a jamais écrites, ou les ignore en silence |
| Le fichier change pendant la relecture | Revue invalidée, rien n'est écrit, décisions touchées redemandées | Cité dans « Gardé de l'atelier », sans écran | Le comportement au clic reste à inventer pendant le développement |
| Une sortie échoue : police absente, limite de modes de l'offre | Cinq temps, bilan par sortie, « Réessayer » sans doublon | Absent | Un échec au milieu de l'écriture laisse un fichier partiellement écrit, sans bilan |
| Une famille existe dans une marque et manque dans une autre | Case vide dans le groupe de la marque | Retiré avec l'onglet Système | Figma remplit le mode de la marque avec la première colonne : la marque reçoit les couleurs d'une autre, sans message |
| Un mode de `brand` créé hors du plugin | Groupe « Marque C » et « Suivre ce mode… » | Absent | Mêmes valeurs recopiées, sans palette pour les suivre |
| Retouche du cran de la référence, ou de `brand.identity` | « Adopter comme nouvelle couleur de référence » | Absent | Une retouche sur le cran ◆ casse la garantie de la référence exacte (`[MOT-17]`) |
| Plusieurs retouches dans une palette | « Adopter les 3 », « Remettre les 3 », puis une ligne par valeur | Une retouche seulement | Trois décisions séparées, dont les garanties ne se jugent pas ensemble |
| Nombre de nuances changé, palette supprimée, destination changée | Variables créées et variables laissées sans palette, comptées dans la revue | « Aucune couleur n'est créée ni supprimée », écrit en dur | Des variables orphelines que rien ne signale |
| Deux palettes à la même destination, collection homonyme | Refus à la saisie, reprise ou choix d'une autre collection | Absent | Deux palettes écrivent les mêmes variables |
| Annulation d'une écriture | Un `commitUndo`, à tester dans Figma avant de promettre un seul Annuler | Absent | La promesse d'annulation reste implicite |

La phrase d'ouverture de la proposition d'expérience dit qu'elle « remplace
les pistes et les décisions des propositions précédentes pour tout ce qui
touche au parcours ». Les règles de la revue, de la propriété des variables et
de l'écriture touchent au parcours. Le lecteur ne sait donc pas si V2, V4, V5
et V6 tiennent encore. Un plan écrit sur cette base les réinventerait.

### 2. La vue du système a disparu, et l'onglet Palettes actuel n'a pas de place

Les trois étapes ne reprennent pas ce que porte l'onglet Palettes actuel
(`[UI-02]`, `[UI-05]`) :

| Fonction d'aujourd'hui | Autorité | Place dans la proposition d'expérience |
|---|---|---|
| État du cadre de chaque palette : à jour, à actualiser, pas encore sur Figma, introuvable, illisible | `[UI-02]` | Aucune |
| « Afficher dans Figma » | `[UI-05]` | Aucune |
| Garanties de chaque palette, lues côte à côte | `[UI-02]` | Une palette à la fois, dans Vérifier |
| Carte d'une palette supprimée dont le cadre reste, « Supprimer définitivement » | `[PLA-27]` | Aucune |
| Export et import de la recette, export du rapport | `[REC-07]`, `[REC-08]`, `[VER-01]` | Aucune |
| Résultat d'un dessin : calques étrangers, écarts de peinture | `[UI-05]` | Aucune |

La proposition finale avait fait de cet onglet la vue du système. La
proposition d'expérience le retire et ne garde que la liste « Toutes les
palettes modifiées » d'Appliquer. Avec les dix-sept palettes de
l'architecture, le designer n'a plus d'écran qui dise quelles palettes
manquent une garantie, lesquelles attendent une décision, ni quelle famille
manque dans quelle marque.

Le scénario « Une couleur modifiée à la main dans Figma » le montre : aux
étapes 1 et 2, « Rien à faire ». Vérifier juge la recette, alors que les
composants emploient les valeurs de Figma. Une retouche qui fait tomber un
texte sous 4,5:1 ne se voit donc qu'à l'étape Appliquer, si le designer y va.
La question 2 du designer, « Est-ce que ça marche ? », reçoit une réponse sur
la recette et non sur le fichier.

### 3. La correction proposée abîme la rampe qu'elle corrige

La correction rétablit la valeur calculée des nuances reprises, en choisissant
le plus petit nombre de nuances qui rend les garanties. Sur l'exemple de Bleu
A, le moteur confirme le compte : 4 garanties manquées, et le plus petit
ensemble à rétablir est bien 100, 200 et 300 (recherche exhaustive sur les
1 024 ensembles). Le résultat est pourtant une rampe qu'un designer ne
garderait pas.

Contraste entre nuances voisines, Thème Light, de 50/100 à 900/950 :

| Rampe | 50/100 | 100/200 | 200/300 | 300/400 | 400/500 | 500/600 | 600/700 | 700/800 | 800/900 | 900/950 |
|---|---|---|---|---|---|---|---|---|---|---|
| Faite à l'œil | 1,23 | 1,31 | 1,38 | 1,31 | 1,18 | 1,24 | 1,19 | 1,23 | 1,36 | 1,39 |
| Corrigée | **1,01** | 1,15 | 1,21 | **2,07** | 1,18 | 1,24 | 1,19 | 1,23 | 1,36 | 1,39 |
| Calculée | 1,08 | 1,15 | 1,21 | 1,33 | 1,41 | 1,61 | 1,27 | 1,41 | 1,39 | 1,27 |

Le 50 du designer et le 100 calculé se confondent, et un saut apparaît entre
le 300 calculé et le 400 du designer. Le critère de la correction compte des
paires et ignore la forme de la rampe. L'écran « Après » montre cette rampe
sans la juger.

Quatre autres limites :

- **Une palette calculée n'a rien à rétablir.** Vert `#16A34A`, calculée,
  manque 2 garanties en Vivid, Thème Light (`border-control` et `focus` sur
  `surface`, 2,92:1 pour 3:1). La règle « un problème vient avec sa
  correction » n'a alors aucune nuance à proposer. Le plugin a déjà une
  réponse à ce cas : le lien vers le réglage qui agit (`[VER-15]`) et
  « Ajuster la référence » (`[UI-15]`). La proposition ne dit pas comment les
  deux corrections cohabitent dans Vérifier.
- **Le verdict « Après : toutes les paires atteignent leur seuil » est écrit
  en dur** (`generer-proposition-trois-etapes.mjs`, ligne 191). L'algorithme vise le
  nombre de garanties manquées de la rampe calculée. Quand ce nombre n'est pas
  nul, comme pour Vert, l'écran affirmerait un résultat faux.
- **L'algorithme du générateur est glouton.** Il trouve le minimum sur cet
  exemple, sans garantie en général. Onze nuances donnent 2 048 ensembles par
  thème et par intensité : une recherche exhaustive reste possible.
- **L'exemple évite deux cas.** La couleur de la charte tombe au 600 de la
  rampe lue, là où le moteur l'ancre. Une charte qui la place au 500 met le
  cran ◆ du moteur sur une nuance du designer, cas que la proposition finale
  signalait comme risque de la piste 11. La rampe lue ne porte ensuite que le
  Thème Light, et rien ne dit d'où vient le Thème Dark.

### 4. La destination remplace le rôle sans porter ses contraintes

La proposition retire « le rôle en quatre segments à la création » et revient
à la destination de l'atelier, choisie après la couleur. La proposition finale
avait écarté cette destination pour une raison que la proposition
d'expérience ne discute pas : elle laisse saisir une palette de marque à deux
intensités, puis la refuse au moment de l'affectation.

Trois questions n'ont pas de réponse dans les écrans :

- **Où se choisissent les intensités ?** Aucun écran de création ne les
  montre. L'architecture en fixe une pour une rampe de marque et pour le
  neutre, deux pour un utilitaire.
- **Comment une palette rejoint `primitives` ?** « Dans le système UCM »
  demande « une marque et une famille ». Le neutre et les quatre utilitaires
  n'appartiennent à aucune marque. « Référence exacte dans », propre aux
  utilitaires, n'a pas de place non plus.
- **Que devient une palette à deux intensités affectée à une marque ?** Le
  code de l'édition retire l'intensité qui ne porte pas la référence, ou
  récrit la référence (`edition.ts`). La proposition finale montrait ce
  changement dans un aperçu de conversion avant de l'appliquer. La
  proposition d'expérience ne le mentionne pas.

### 5. Le périmètre n'a pas diminué

La proposition annonce moins de fonctions. Les écrans en montrent autant, et
en déplacent une de « à discuter » vers le parcours principal.

| Fonction | Statut dans la proposition finale | Statut dans la proposition d'expérience |
|---|---|---|
| Relier une palette à des variables existantes | Piste 12, coût élevé, à discuter | Une des trois destinations, sur le même plan que le système UCM |
| Reprendre une rampe existante | Piste 11, après les retouches | Une des trois entrées de « D'où partez-vous ? » |
| Correction proposée | Rétablir les nuances fautives, dans l'onglet Palette | Règle 4, sur toute vérification |
| Jeu de départ, couleur de la sélection, statuts avec la marque, comparaison | Pistes 5, 6, 7, 13 | Présents |
| Ordre des lots, décisions numérotées | Présents | Retirés |

Sans ordre des lots ni liste de décisions, l'agent qui écrira le plan ne sait
pas ce que contient le premier lot. « Dans mes variables » pose en plus ses
propres cas : une variable dont la valeur est un alias, une collection de
bibliothèque distante que le plugin ne peut pas écrire, un motif de nom qui
trouve les variables d'une autre palette. La proposition finale les listait ;
la proposition d'expérience montre l'écran sans eux.

### 6. Trois étapes numérotées pour un travail qui boucle

La proposition annonce « trois étapes, toujours les mêmes, toujours dans cet
ordre », puis ajoute que le designer « peut aussi sauter une étape par les
onglets ». L'atelier, dont elle reprend le parcours, écrivait l'inverse :
« Vérifier est une vue facultative, pas une étape imposée à chaque
application. »

- **Le travail boucle entre régler et juger.** Régler une teinte, voir les
  garanties, régler encore : c'est le geste le plus fréquent, et il fait
  alterner les étapes 1 et 2. La numérotation laisse attendre un assistant
  linéaire que le designer quitte à chaque boucle.
- **Les étapes n'ont pas la même portée.** Palettes et Vérifier portent sur
  la palette ouverte. Appliquer porte sur le fichier, « Toutes les palettes
  modifiées (4) » choisi par défaut, et garde pourtant le sélecteur de palette
  en tête. L'effet de ce sélecteur dans Appliquer n'est pas dit.
- **Redessiner une seule planche coûte quatre gestes.** Appliquer, décocher
  les variables, relire, appliquer. Aujourd'hui, un geste de la fiche
  (`[UI-05]`). L'atelier gardait au dessin seul « un accès court ». La
  proposition en fait une tâche de son essai sans en dessiner le chemin.
- **La règle des surfaces change.** [CONTRIBUTING](../../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes)
  fixe deux onglets. La proposition le reconnaît dans ses questions.

### 7. Une unité floue et des chiffres écrits en dur

L'atelier (constat P1·04) et la proposition finale ont fixé trois unités :
variables créées, valeurs par mode écrites, cadres dessinés. La proposition
d'expérience affiche une seule unité, « couleurs », sans la définir. Une
variable de `brand` écrite dans six modes compte-t-elle pour une couleur ou
pour six ? Un alias de `theme` est-il une couleur ?

Plusieurs affirmations des écrans sont écrites dans le générateur au lieu
d'être calculées, et le moteur les contredit :

| Affirmation | Où, dans `generer-proposition-trois-etapes.mjs` | Ce que donne le moteur |
|---|---|---|
| « Toutes les palettes modifiées (4) » : Bleu A, Rouge, Ambre, Vert | Lignes 114 à 127, 204 et 206 | L'intensité Soft à 0,50 change aussi Azur (22 valeurs) et Rouge (21 valeurs) : cinq palettes, dont Rouge pour deux raisons |
| « 47 couleurs changent dans Figma » | Ligne 223 | 3 + 22 + 22 ; il manque les 43 valeurs de Rouge et d'Azur |
| « Aucune couleur n'est créée ni supprimée » | Ligne 223, texte fixe | Bleu A, destination « Marque A · primary » et reprise de pastilles, n'a pas encore de variables : 23 variables à créer dans `brand` et 11 dans `theme` |
| « 4 planches sont redessinées » | Ligne 223, texte fixe | Cinq palettes changent |
| « Après : toutes les paires atteignent leur seuil » | Ligne 191, texte fixe | Vrai pour Bleu A ; faux dès que la rampe calculée manque une garantie |
| « 89 couleurs changent », exemple de la règle 3 | Ligne 481 | Aucun écran ne donne ce nombre |

Le cas de Bleu A cache une incohérence de scénario. Si ses variables n'existent
pas, l'écriture crée 34 variables. Si elles existent avec les couleurs du
designer, le plugin ne les a jamais écrites : ce sont des valeurs sans
provenance, qui demandent une décision que l'écran de relecture ne montre pas.

### 8. Le libellé « Garder » revient

La relecture propose « Garder la couleur de Figma » et « Remettre la couleur
du plugin ». L'atelier (constat P1·02) et la proposition finale avaient écarté
« Garder », parce que ce choix modifie aussi la recette : la couleur de Figma
entre dans la recette comme retouche, la planche la montre, les garanties se
jugent sur elle. Le libellé proposé ne dit que l'effet sur le contraste. « La
couleur du plugin » désigne en outre la recette, que la proposition nomme
ailleurs par son nom.

### 9. Des maquettes plus petites que la fenêtre, qui coupent leur contenu

Les écrans mesurent 420 × 560 px (`generer-proposition-trois-etapes.mjs`, ligne 374).
Le plugin s'ouvre à 600 × 720 et ne descend pas sous 500 × 520
(`packages/plugin-palettes/src/fenetre.ts`). Le corps de chaque écran masque
ce qui dépasse (ligne 383), si bien que trois écrans coupent leur contenu sans
le montrer :

| Écran | Hauteur du contenu | Hauteur visible | Coupé |
|---|---|---|---|
| Vérifier Bleu A | 538 px | 425 px | 113 px |
| Destination dans Figma, ouverte | 587 px | 429 px | 158 px |
| Vérifier Orange A | 495 px | 429 px | 66 px |

L'atelier (constat P2·10) avait relevé le même défaut dans la proposition 1.
Le pied fixe réduit en plus la hauteur utile. À 500 × 520, `[UI-03]` exige
que le sélecteur, le titre et la rangée du nom et de la référence se lisent
sans défiler ; en-tête, onglets, sélecteur et pied occupent déjà une part de
ces 520 px, et aucune maquette ne le vérifie.

### 10. Points secondaires

- **L'alerte des palettes proches suppose une marque connue.** Une palette
  « Dans mes variables » ou « Nulle part » n'a pas de marque : la règle « deux
  marques ne sont jamais signalées » ne dit pas si elle se compare à toutes.
  Le geste « Proches à dessein » de la proposition finale, qui traitait ce
  cas, a disparu. L'hypothèse « jamais affichées ensemble » vaut pour les
  modes de `theme` ; une page qui montre plusieurs marques côte à côte, logos
  et identités compris, la contredit.
- **Plusieurs designers dans le même fichier.** La recette se range dans le
  document à la fin de chaque geste. « Toutes les palettes modifiées »,
  choisi par défaut, applique aussi les réglages en cours d'un autre designer,
  que personne n'a vérifiés. La proposition finale ne traitait pas ce cas non
  plus.
- **L'effet d'un réglage commun ne se lit qu'à l'étape 3.** La proposition
  finale le comptait au moment du geste, dans la carte des Réglages communs
  (« 87 valeurs »).
- **Le problème de la rampe témoin reste entier.** Les réglages de couleur
  sont repliés sous l'aperçu, comme aujourd'hui : ouverts à 720 px de haut,
  ils poussent l'aperçu hors de vue. La proposition retire la rampe témoin
  sans autre réponse.
- **Les fonds lus sur le neutre** (piste 8) ne sont plus mentionnés. La
  proposition ne dit pas s'ils sont écartés ou reportés.
- **Les statuts se vérifient palette par palette.** « Distinguer les
  statuts » vit dans Vérifier, sous la palette ouverte, alors que la
  confusion entre statuts est une question du système.
- **L'essai ne teste aucun cas limite.** Ses six tâches suivent le parcours
  nominal. Le critère « aucune écriture non voulue » de la proposition finale
  n'y figure plus.

## Ce qu'il faut trancher avant le développement

La proposition d'expérience et la proposition finale se complètent : la
première donne l'organisation des écrans et les mots, la seconde les règles
d'écriture et les cas limites. Les recommandations suivantes les assemblent.

1. **Garder les trois questions et les trois onglets, sans numéros.**
   Palettes et Vérifier portent sur la palette ouverte ; Appliquer porte sur
   le fichier. Les numéros promettent un ordre que le travail ne suit pas.
2. **Faire d'Appliquer la vue du système.** Toutes les palettes, et pas
   seulement les modifiées, avec l'état de leurs deux sorties, groupées par
   couleurs communes et par marque. La case d'une famille manquante,
   « Afficher dans Figma », les palettes supprimées, l'export, l'import et le
   rapport y trouvent leur place. Une retouche faite dans Figma se signale
   dès l'ouverture, en tête de Vérifier pour la palette concernée et dans
   Appliquer pour le système.
3. **Déclarer que les règles d'écriture de la proposition finale tiennent.**
   Nommément : la comparaison à trois valeurs, les valeurs sans provenance,
   la relecture au clic final, la propriété par identifiant, les cinq temps
   de l'écriture avec bilan et reprise, le cran ◆ et l'identité de la marque,
   les décisions groupées. Chacune reçoit un écran dans la page de la
   proposition d'expérience.
4. **Donner à la destination les contraintes du rôle.** « Dans le système
   UCM » demande d'abord « couleurs communes » ou « une marque », puis la
   famille. Le choix fixe les intensités et fait paraître « Référence exacte
   dans » pour un utilitaire. Une palette existante passe par l'aperçu de
   conversion de la proposition finale.
5. **Borner la correction proposée.** Ajouter un critère de régularité :
   aucun contraste entre nuances voisines sous celui de la rampe calculée
   moins une marge, aucun saut au-dessus. Chercher l'ensemble exhaustivement.
   Laisser le designer retirer une nuance de la correction. Quand aucune
   correction n'atteint le résultat de la rampe calculée, le dire. Pour une
   palette calculée, renvoyer vers « Ajuster la référence » et les réglages
   (`[VER-15]`, `[UI-15]`).
6. **Sortir « Dans mes variables » des premiers lots.** Le garder à discuter
   jusqu'à ce que l'écriture des trois collections de l'architecture soit
   éprouvée dans Figma.
7. **Définir l'unité affichée.** Une « couleur » est une valeur par mode.
   Chaque compte d'un écran sort du moteur, et le détail technique donne les
   trois unités de la proposition finale.
8. **Garder un accès court au dessin seul,** depuis Appliquer, sans passer
   par la relecture quand aucune variable n'est concernée.

## Avant de lancer le développement

Le mainteneur veut être sûr de la solution avant de la développer. Trois
étapes le permettent sans écrire le plugin.

1. **Compléter la page de la proposition.** Un écran par cas du tableau de la
   section 1, les comptes calculés par le moteur, les écrans à 600 × 720 et à
   500 × 520 avec leur défilement visible.
2. **Construire un prototype interactif.** L'atelier en a construit un : le
   moteur embarqué, les écritures simulées en mémoire, des scénarios
   choisis dans une liste. Le même prototype, sur l'organisation retenue,
   joue le parcours nominal et chaque cas limite : retouche, valeur sans
   provenance, fichier modifié pendant la relecture, échec d'une sortie,
   famille manquante, correction qui n'atteint pas son but.
3. **Jouer l'essai sur ce prototype.** Le protocole de la proposition finale
   reste le bon : prédire avant chaque clic qui écrit, comparer au bilan,
   compter les gestes et les changements d'onglet. Ajouter aux six tâches de
   la proposition d'expérience trois tâches de cas limites, et garder le
   critère « aucune écriture non voulue ».

Les huit essais dans Figma de la proposition finale restent un préalable au
lot qui écrit les variables : annulation, nom déjà pris, valeur des modes
d'une variable créée, donnée de plugin après publication, temps d'écriture de
716 valeurs, couleur d'une peinture liée, message d'`addMode` à la limite,
écriture dans une variable créée hors du plugin.

L'ordre des lots de la proposition finale reste applicable, avec
l'organisation de la proposition d'expérience au premier lot : les trois
onglets et la vue du système, la planche comme seule sortie. Viennent ensuite
le format 7 et la destination, puis une famille utilitaire écrite avec ses
alias et tous ses cas limites, puis les marques. La reprise d'une rampe
existante suit les retouches, et « Dans mes variables » vient en dernier, si
elle est retenue.

## Réponses aux trois questions de la proposition

| Question | Réponse proposée |
|---|---|
| Trois onglets au lieu de deux | Oui, sans numéros, avec Appliquer comme vue du système (recommandations 1 et 2). La règle des surfaces de CONTRIBUTING change en conséquence |
| « Dans mes variables » | Pas dans les premiers lots (recommandation 6) |
| Corriger nuance par nuance dans Vérifier | Oui, et la correction automatique doit passer le critère de régularité avant d'être proposée (recommandation 5) |
