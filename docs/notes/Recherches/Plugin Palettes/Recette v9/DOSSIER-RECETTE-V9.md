# Recette v9 d'UCM Palettes

Dossier des demandes du mainteneur qui suivent la recette v8. Il consigne
les décisions prises sur maquette, ce qui est en cours et ce qui attend un
choix. Les maquettes citées sont rangées dans
[Recette v8/Maquettes](../Recette%20v8/Maquettes/).

## 1. Les constats

| N° | Onglet | Constat | Demande |
|---|---|---|---|
| S1 | Création | Le pied de vérification se voit à peine, même quand une garantie manque | Le rendre visible ; maquette |
| S2 | Création | « Nouvelle palette » ouvre la carte de création au-dessus de la palette affichée, qui reste dessous | Masquer la palette affichée pendant la création |
| S3 | Création, Vérification | Sans palette ouverte, la première série de propositions (recette v8, lot 8) doublait Gestion | Repartir du rôle de chaque onglet ; pour Création, un écran d'accueil minimaliste |
| S4 | Création | La configuration montre Modèle, Intensités et « Référence exacte dans » à l'ouverture | Proposition de la recette v8, lot 9, retenue |

## 2. Le bandeau de vérification (S1)

Maquette :
[MAQUETTE-BANDEAU-DE-VERIFICATION.html](../Recette%20v8/Maquettes/MAQUETTE-BANDEAU-DE-VERIFICATION.html).

Aujourd'hui, le pied de Création est fixé en bas de la fenêtre, sur 32 px,
au fond de la page, sous un filet ([UI-18]). Seule son icône ✓ ou ✕ prend
la couleur de l'état. Il a la même forme quand tout tient et quand une
garantie manque, et son texte long se coupe.

**Décision : B4.** Elle n'est pas implémentée ; ce qui suit est sa
spécification.

1. **L'onglet Vérification porte l'état en permanence.** Une garantie
   manquée ou plus : un compteur rouge du nombre de garanties manquées. Des
   alertes seules : un compteur ambre du nombre d'alertes. Tout tenu : un ✓
   vert. Le compteur suit la palette ouverte dans Création.
2. **Le pied ne paraît qu'en cas de problème.** Une garantie manquée ou une
   alerte : le pied paraît, sur 40 px, au fond de danger ou d'avertissement,
   sous un filet de 2 px de la couleur pleine de l'état. L'icône est une
   pastille pleine. Le texte donne le compte en gras, puis nomme le premier
   constat (« 1 garantie manquée · Texte des boutons, en Light »).
3. **Le bouton garde le libellé « Vérifier ».** Il mène à Vérification,
   comme aujourd'hui.
4. **Tout tenu : aucun pied.** Le bas de la fenêtre revient au contenu.
5. **Ce qui ne change pas.** Le ✕ ou le ✓ du sélecteur de palette ; l'onglet
   Vérification lui-même.

Points à régler à l'implémentation :

- le pied qui paraît et disparaît ne doit pas faire sauter le contenu : la
  réserve en bas de page (`scroll-padding-bottom`, marge de la carte de
  configuration) reste celle du pied, qu'il soit visible ou non ;
- l'annonce aux lecteurs d'écran (`.pied-annonce`) reste, que le pied soit
  visible ou non ;
- le compteur de l'onglet doit garder la largeur des onglets à 500 px.

## 3. « Nouvelle palette » masque la palette affichée (S2)

Pendant la création, l'onglet ne montre que la carte « Nouvelle palette » :
le titre de la palette, sa configuration, son aperçu, ses cartes de
réglage et le pied sont masqués. « Annuler » réaffiche la palette d'avant ;
« Créer la palette » ouvre la nouvelle. Implémentation à suivre la carte de
configuration repliée (S4), qui touche le même fichier.

## 4. Sans palette ouverte (S3)

Maquette :
[MAQUETTE-AUCUNE-PALETTE-OUVERTE.html](../Recette%20v8/Maquettes/MAQUETTE-AUCUNE-PALETTE-OUVERTE.html).

La maquette part du rôle de chaque onglet : Création règle une palette,
Vérification contrôle les contrastes et les écarts, Gestion relie les
palettes au fichier Figma. L'état des tokens et des planches ne se montre
que dans Gestion.

| Piste | Onglet | Principe |
|---|---|---|
| A1 | Création | Accueil : les couleurs de référence mêlées en illustration, « Que voulez-vous régler ? », « Créer une palette », puis un disque par palette |
| A2 | Création | Accueil : une carte de nuancier de papeterie par palette, et une carte en pointillés pour en créer une |
| A2a | Création | A2 resserrée pour vingt palettes : cartes de 60 × 80 px, sept par rangée, « Nouvelle palette » en bouton principal pleine largeur en tête |
| A2b | Création | A2 couchée : une bande de trois aplats et le nom entier, sur deux colonnes ; même bouton principal |
| A3 | Création | Accueil : une phrase, où chaque nom de palette est un lien coloré |
| A4 | Création | Accueil : la dernière palette réglée en vedette, « Reprendre » |
| V1 | Vérification | Les garanties de chaque palette par thème, puis les constats entre palettes |
| V2 | Vérification | Vérification suit la palette de Création ; sans palette, les constats entre palettes seulement |

Le mainteneur préfère les nuanciers (A2), à condition qu'ils tiennent vingt palettes et que « Nouvelle palette » soit plus en avant : d'où A2a et A2b. Recommandation : A2a et V1. **Attend le choix du mainteneur.**

## 5. La configuration avancée repliée (S4)

Proposition de la recette v8, lot 9, retenue par le mainteneur :
[MAQUETTE-CONFIGURATION-AVANCEE.html](../Recette%20v8/Maquettes/MAQUETTE-CONFIGURATION-AVANCEE.html).
Modèle, Intensités et « Référence exacte dans » passent sous un dépliant
« Réglages avancés », replié à l'ouverture, dont le résumé prend la couleur
d'attention quand un réglage diffère de sa valeur par défaut.
Implémentation en cours.

## 6. Décisions

| N° | Question | Décision |
|---|---|---|
| E1 | Comment rendre visible le bilan de vérification ? | B4 : compteur sur l'onglet Vérification, pied coloré seulement en cas de problème ; bouton « Vérifier » |
| E2 | Où vont Modèle, Intensités et « Référence exacte dans » ? | Sous « Réglages avancés », replié |
| E3 | Que montre la création d'une palette ? | La carte de création seule ; la palette affichée est masquée |
| E4 | Que montrent Création et Vérification sans palette ouverte ? | Ouverte ; piste des nuanciers retenue, recommandation A2a et V1 |
