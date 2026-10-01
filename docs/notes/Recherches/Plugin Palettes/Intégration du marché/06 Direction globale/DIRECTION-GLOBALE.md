# UCM Palettes : la direction globale de l'intégration du marché

## 1. En-tête

**Objet.** Ce document assemble les cinq propositions de ce dossier en une
direction unique pour UCM Palettes : écrire les variables `primitives`,
`brand` et `theme`, lire la couleur de la sélection, proposer un jeu de
départ, montrer les statuts en vision simulée, et reloger tout ce que fait
l'onglet Palettes actuel. Il tranche les questions que [la revue
critique](../05%20Revue%20critique/REVUE-CRITIQUE-TROIS-ETAPES.md) laisse
ouvertes, décrit chaque cas limite, et inventorie toutes les modifications que
la direction entraîne.

**Lecteur.** Le mainteneur, designer et seul testeur, qui valide ou écarte
chaque décision ; puis l'agent qui écrira le plan d'implémentation à partir
des décisions validées.

**Statut.** Ce document ne décide rien. La
[spécification](../../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md) reste l'autorité sur le
comportement du plugin, et [l'architecture
multi-marques](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
sur la forme des variables. Une décision validée les modifie d'abord, selon
l'inventaire de la [section 8](#8-linventaire-des-modifications).

**La maquette.**
[MAQUETTE-DIRECTION-GLOBALE.html](./MAQUETTE-DIRECTION-GLOBALE.html) s'ouvre
d'un double clic. Elle simule le plugin à 600 × 720 et à 500 × 520, dans les
deux thèmes de Figma, avec un document Figma en mémoire, un journal des
écritures et vingt-six scénarios rejouables. Le moteur du dépôt y calcule
chaque couleur, garantie, distance et compte.

**Régénérer et vérifier**, depuis la racine du dépôt :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/generer-maquette-direction-globale.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/mesurer-direction-globale.mjs"
node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/verifier-maquette-direction-globale.mjs"
node scripts/controle-style.mjs "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/DIRECTION-GLOBALE.md"
npx tsx --test tests/docLinks.test.ts
```

Chaque nombre de ce document sort du générateur ou de la mesure. La mesure
imprime des blocs repérés entre crochets, `[C1]` par exemple, que le texte
cite. Le générateur et la mesure partagent les fonctions de la direction :
régularité d'une rampe, correction proposée, lecture d'une rampe, plan des
variables, comparaison à trois valeurs, vision simulée.

## 2. Synthèse

**Le parcours.** Le designer part d'une couleur, de couleurs déjà posées
dans le fichier, ou d'un jeu de départ. Il règle la palette dans l'onglet
Palette, juge ses garanties dans l'onglet Vérifier, qui propose une
correction quand une garantie manque, puis applique. L'onglet Système montre
tout le fichier : chaque palette, l'état de ses deux sorties, les familles qui
manquent dans une marque, les valeurs de Figma qui diffèrent de la recette. Un
seul geste écrit dans les variables, « Appliquer à Figma… », et il passe
toujours par une revue qui compte ce qui change et ne choisit rien à la place
du designer.

**Les écrans.**

- Trois onglets, sans numéro : **Palette** et **Vérifier** portent sur la
  palette ouverte ; **Système** porte sur le fichier. Le plugin s'ouvre sur
  Système dans un fichier qui a des palettes, sur Palette (« D'où partez-vous
  ? ») dans un fichier vide.
- Un pied fixe, hors du défilement, porte le bouton principal de chaque
  onglet : « Vérifier », « Appliquer cette palette… », « Appliquer à
  Figma… ».
- Une revue en modale, une destination à contraintes dans la configuration
  de la palette, une correction proposée dans Vérifier, une carte
  « Distinguer les statuts » dans Système.

**Les cinq décisions qui fixent la forme du plan** (section 7) :

1. **DG-01, les onglets.** Palette, Vérifier, Système, sans numéro ; un pied
   fixe ; Système est la vue du fichier et l'écran d'ouverture.
2. **DG-03, la destination.** « Aucune · Couleurs communes · Une marque »,
   puis la famille : le choix fixe les intensités que l'architecture demande.
   Une palette existante change de destination par un aperçu de conversion.
3. **DG-04, les règles d'écriture.** Celles de la proposition finale
   tiennent, nommément : comparaison à trois valeurs, valeurs sans
   provenance, propriété par identifiant, relecture au clic, cinq temps avec
   bilan et reprise, cran ◆ et identité, décisions groupées. Deux s'ajoutent :
   le nom d'une variable joint ses segments par `/`, et un Ctrl+Z défait une
   écriture sans défaire le rangement de la recette qui l'a précédée.
4. **DG-05, la correction proposée.** Elle rétablit le plus petit ensemble de
   nuances qui rend le résultat de la rampe calculée **et** garde une rampe
   régulière, cherché sur tous les ensembles. Le designer peut verrouiller une
   nuance ; l'écran dit quand aucune correction n'atteint le but.
5. **DG-18, l'ordre des lots.** L'organisation des onglets d'abord, la
   planche encore seule sortie ; puis le format 7 de la recette et la
   destination ; puis une famille commune écrite avec ses alias et tous ses
   cas limites ; puis les marques. « Mes variables » sort des premiers lots.

**Ce que le designer y gagne, par rapport au plugin actuel.**

- Les 716 valeurs d'un système à six marques (`[N1]`) ne se saisissent plus
  à la main ; le système de démonstration, à deux marques, en écrit 532 d'un
  geste et crée 365 variables (`[N2]`).
- Une valeur de Figma retouchée à la main se voit dès l'ouverture, dans
  Système et dans Vérifier, avec ce qu'elle fait aux garanties ; elle ne
  s'écrase jamais sans décision.
- Un réglage commun dit au moment du geste combien de couleurs déjà écrites
  il change : 87 pour l'intensité Soft passée à 0,50 (`[N4]`).
- Une rampe faite à l'œil se reprend, se mesure et se corrige en gardant les
  nuances du designer qui ne posent pas de problème : 4 sur 10 pour Bleu A
  (`[C2]`).

## 3. Le parcours

Les douze scénarios de la proposition finale et les dix situations de la
proposition en trois étapes se recoupent sur neuf points ; fusionnés, ils
donnent dix-huit parcours, P01 à P18. Les onze cas limites, C01 à C11,
suivent. Chaque tableau donne les gestes du designer, dans l'ordre, les
écrans traversés, les changements d'onglet qu'il fait lui-même, et le
scénario de la maquette qui le joue. Un geste est un clic ou une saisie
validée ; un changement d'onglet automatique, comme l'arrivée sur Système
après une écriture pour lire le bilan, n'en est pas un.

### Les parcours

**P01, un design system neuf.** Origine : proposition finale 1, trois étapes 1.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « D'un jeu de départ », « + Ajouter une marque », « Créer 9 palettes », « Appliquer à Figma… », « Appliquer à Figma » : 5 gestes | Départ, Jeu de départ, Système, Revue, Bilan | 0 | S01 |

**P02, un système multi-marques à créer.** Origine : proposition finale 2, trois étapes 2.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Le jeu de départ avec une ligne par marque (P01) ; plus tard « + Ajouter une marque », nom, « Ajouter », « Créer la palette » dans chaque case vide, une couleur par case, « Appliquer à Figma… » | Système, Palette (création remplie), Revue, Bilan | 1 par case vide, retour à Système compris | S01, S02 |

**P03, un système multi-marques à mettre à jour.** Origine : proposition finale 3, trois étapes 3.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Nouvelle référence, « Vérifier », « Appliquer cette palette… », « Appliquer à Figma » : 4 gestes. Variante sans passer par Vérifier : le lien « Appliquer cette palette… » de la ligne d'état, 3 gestes | Palette, Vérifier, Revue, Bilan | 1, ou 0 par le lien | S03 |

**P04, Light et Dark à créer.** Origine : proposition finale 4, trois étapes 4.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Aucun geste propre : chaque palette porte ses deux thèmes, et l'écriture pose les deux dans le chemin de `primitives` et de `brand`, et deux modes dans `theme` | Palette (bascule de l'aperçu), Vérifier (verdict par thème) | 0 | S01, S03 |

**P05, Light et Dark à mettre à jour dans un système qui a déjà ses variables.** Origine : proposition finale 5, trois étapes 4.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Destination « Mes variables », collection, motif, « Relier », « Vérifier », « Appliquer cette palette… », « Remplacer par la recette » en groupe, « Appliquer à Figma ». Lot 7, à discuter (DG-07) | Palette (liaison), Vérifier, Revue | 1 | S21 |

**P06, une structure de tokens non conventionnelle.** Origine : proposition finale 6, trois étapes 5.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Comme P05, avec un motif propre au fichier, `color/blue/{nuance}` | Palette (liaison), Revue | 1 | S21 |

**P07, des palettes faites à l'œil.** Origine : proposition finale 7, trois étapes 6.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « + Nouvelle », « De couleurs existantes », nom, destination, « Créer et vérifier », « Corriger ces 6 nuances » ; au besoin, une nuance retirée de la correction | De couleurs existantes, Vérifier (correction) | 0 : la création mène à Vérifier | S16, S17, S26 |

**P08, une palette pour un nouveau composant.** Origine : proposition finale 8, trois étapes 7.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « + Nouvelle », « D'une couleur », destination « Aucune » tant que c'est un essai ; plus tard « Une marque » ou « Couleurs communes », famille « Autre famille… », confirmation de l'aperçu de conversion | Palette, aperçu de conversion | 0 | S22, S23 |

**P09, plusieurs palettes proches, légèrement différentes.** Origine : proposition finale 9, trois étapes 8.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Dupliquer, régler, « Comparer à une autre palette » dans Vérifier, puis « Proches à dessein » sur l'alerte | Palette, Vérifier | 1 | S20 |

**P10, des palettes « jolies ».** Origine : proposition finale 10, trois étapes 9.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Régler teinte, saturation et dérive dans leurs cartes, rampe témoin sous les yeux ; « En contexte » dans Vérifier | Palette, Vérifier | 1 | S03 (cartes de réglage) |

**P11, changer le nombre de nuances d'un système écrit.** Origine : proposition finale 11.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Engrenage, « 13 nuances », lecture de l'aperçu, « Passer à 13 nuances », « ← Retour », « Appliquer à Figma… », « Appliquer à Figma » | Réglages communs, Système, Revue, Bilan | 0 | S14 |

**P12, refondre la charte d'une marque.** Origine : proposition finale 12.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Nouvelle référence de chaque palette de la marque, puis « Appliquer à Figma… » depuis Système : la revue groupe par palette, identité comprise | Palette, Système, Revue | 1 par palette | S03, S07 |

**P13, une couleur modifiée à la main dans Figma.** Origine : trois étapes 10.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Le bandeau de Système signale la valeur à l'ouverture ; « Relire… », un choix, « Appliquer à Figma » : 3 gestes | Système, Vérifier (garanties dans Figma), Revue | 0 | S05 |

**P14, la planche seule, sans toucher aux variables.** Origine : revue critique, section 6.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Redessiner le cadre » sur la fiche : 1 geste, sans revue | Système, Bilan | 0 | S19 |

**P15, une palette calculée qui manque une garantie.** Origine : revue critique, section 3.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Ajuster la référence… » dans Vérifier, deux fois « − », « Appliquer » | Vérifier, modale d'ajustement | 0 | S18 |

**P16, un réglage commun changé.** Origine : proposition finale 4, revue critique, section 10.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Engrenage, intensité Soft à 0,50, « ← Retour », « Appliquer à Figma… », « Appliquer à Figma » | Réglages communs (compte au moment du geste), Système, Revue | 0 | S04 |

**P17, plusieurs designers dans le même fichier.** Origine : revue critique, section 10.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Appliquer à Figma… » : la revue laisse décochée la palette réglée sur un autre poste | Système, Revue | 0 | S25 |

**P18, la charte qui tombe sur un autre cran.** Origine : revue critique, section 3.

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « + Nouvelle », « De couleurs existantes », lecture du message sur la charte, « Créer et vérifier » | De couleurs existantes, Vérifier | 0 | S26 |

### Les cas limites

**C01, la recette et Figma ont changé tous deux.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| La revue montre les trois valeurs : dernière écrite, recette, Figma ; un choix | Revue | 0 | S11 (valeur qui bouge pendant la revue), S05 |

**C02, une valeur sans provenance.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Variable créée à la main : « Remplacer par la recette » ou « Reprendre la valeur de Figma ». Mode ajouté hors du plugin : « Suivre ce mode… ». Première liaison : décision groupée | Revue, Système | 0 | S08, S09, S21 |

**C03, le fichier change pendant la relecture.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Appliquer à Figma » n'écrit rien et nomme la valeur ; nouveau choix ; « Appliquer à Figma » | Revue invalidée | 0 | S11 |

**C04, une sortie échoue.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Police absente : la revue décoche la planche, les variables s'écrivent. Limite de modes : bilan partiel, puis « Réessayer » | Revue, Bilan | 0 | S12, S13 |

**C05, une famille existe dans une marque et manque dans une autre.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Créer la palette » dans la case vide, couleur, « Créer la palette », « Appliquer à Figma… », « Remplacer par la recette » en groupe | Système, Palette, Revue | 1 | S10 |

**C06, un mode de `brand` créé hors du plugin.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Suivre ce mode… » : la marque entre dans la recette, ses cases vides paraissent | Système | 0 | S09 |

**C07, une retouche sur le cran de la référence, ou sur `brand.identity`.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Adopter comme nouvelle référence » ou « Remettre » ; pour l'identité, « Adopter comme couleur de charte » ou « Remettre » | Revue | 0 | S07 |

**C08, plusieurs retouches dans une palette.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| « Adopter les 3 dans la recette », puis un choix contraire sur une ligne | Revue | 0 | S06 |

**C09, nuances changées, palette supprimée, destination changée.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Aperçu du nombre de nuances ; carte de la palette supprimée et « Supprimer les variables… » ; aperçu de conversion | Réglages communs, Système, Palette | 0 à 1 | S14, S15, S22 |

**C10, deux palettes à la même destination, ou une collection homonyme.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| La destination refuse et nomme la palette qui l'occupe ; la revue demande « Reprendre cette collection » ou « Choisir un autre nom… » | Palette, Revue | 1 | S23 |

**C11, l'annulation d'une écriture.**

| Gestes | Écrans | Onglets changés | Maquette |
|---|---|---|---|
| Ctrl+Z dans Figma : l'écriture est défaite ; le plugin relit le fichier au retour | Système | 0 | S24 |

## 4. Les écrans

### 4.1 Le cadre

La fenêtre s'ouvre à 600 × 720 et descend à 500 × 520
(`packages/plugin-palettes/src/fenetre.ts:8`, `:22`). Dans la maquette, qui
reprend la facture de la galerie, l'en-tête prend 44 px, la rangée d'onglets
33 px et le pied fixe 45 px (`[H]`). Le corps garde 596 px à 600 × 720, soit
83 % de la hauteur, et 396 px à 500 × 520, soit 76 %. Le corps défile avec sa
barre ; le pied reste hors du défilement, si bien que le bouton principal se
lit sans défiler à toute taille. La vérification le contrôle sur les 108
passages de la maquette.

**Ce que font les autres plugins étroits.** Tokens Studio range son travail
en onglets, Tokens, Inspect et Settings, et porte ses gestes d'application et
de synchronisation dans un pied, avec une portée choisie : sélection, page
ou document. Material Theme Builder met le thème courant dans une liste en
tête et l'export dans un bouton. La proposition en trois étapes et l'atelier
avaient déjà ce pied. Aucun des outils relevés ne numérote ses onglets comme
des étapes : le travail y boucle entre réglage et contrôle, comme ici.

### 4.2 L'onglet Palette

Portée : la palette ouverte. Les objets, de haut en bas, avec leur rang
selon la table de [CONTRIBUTING](../../../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation) :

| Objet | Rang | Contenu |
|---|---|---|
| Barre du sélecteur | 1 | Liste des palettes groupée par destination, « + Nouvelle » (secondaire), « … » (dupliquer, supprimer) |
| Titre « Palette [nom] » | 1 | Seul sur sa ligne, coupé s'il est long |
| Ligne d'état dans Figma | 3 | Pastille de l'état le plus urgent, « Cadre à jour · 23 couleurs à écrire », lien « Appliquer cette palette… » ou « Dessiner le cadre » |
| Configuration de la palette | 2 | Nom et référence ; rangée « Destination dans Figma » : Aucune, Couleurs communes, Une marque, Mes variables (lot 7) ; famille et marque ; chemin des variables en code ; Intensités quand la destination est Aucune ; « Référence exacte dans » à deux intensités |
| Aperçu de conversion | 2 | Seulement pendant un changement de destination : rampes avant et après, garanties avant et après, variables à créer et variables laissées, cadre à actualiser |
| Alerte des palettes proches | 2 | « Bleu A ressemble à Azur », l'écart et le seuil, « Proches à dessein » |
| Aperçu | 2 | Bascule Light et Dark, fond, rampes ; ◆ sur la référence, ✎ sur une nuance reprise ou retouchée |
| Teinte, saturation, luminosité | 3, repliée | Rampe témoin de 10 px en tête, puis la carte actuelle |
| Dérive de teinte | 3, repliée | Rampe témoin, puis l'éditeur actuel |
| Pied | 2 | « 32 garanties · 4 manquées » et « Vérifier », bouton principal ; pendant une conversion, « Changer la destination » |

Dans un fichier vide, l'onglet montre « D'où partez-vous ? » : trois choix,
« D'une couleur », « De couleurs existantes » (actif quand la sélection porte
des pastilles), « D'un jeu de départ », sans pied. La création d'une palette
garde la carte de création actuelle et y ajoute la rangée Destination et la
rangée « Dans la sélection », huit pastilles au plus puis « +3 ».

### 4.3 L'onglet Vérifier

Portée : la palette ouverte, la même que dans Palette.

| Objet | Rang | Contenu |
|---|---|---|
| Barre du sélecteur, titre « Vérifier [nom] » | 1 | La même barre que Palette |
| Verdict | 1 | « 4 garanties manquées, Thème Light », ou « Toutes les garanties tenues · 32 contrôles », dans la couleur de sévérité |
| Valeurs de Figma | 2 | Seulement quand Figma porte des valeurs différentes de la recette : leur nombre, les garanties manquées avec elles, « Décider dans la revue… » |
| Correction proposée | 2 | Section 4.4 |
| Alerte des palettes proches | 2 | Comme dans Palette |
| Garanties de contraste | 3, ouverte quand une garantie manque | Les garanties manquées ; « Voir les 32 » |
| En contexte | 3, repliée | L'écran peint de la palette, l'Interface de test actuelle |
| Comparer à une autre palette | 3, repliée | Deux rampes nuance par nuance, l'écart de chaque nuance, la phrase « Deux marques : elles ne s'affichent jamais ensemble » |
| Pied | 2 | L'état des sorties et « Appliquer cette palette… » ; sans destination, « Dessiner le cadre » |

### 4.4 La correction proposée et son critère

**Le défaut à corriger.** La correction de la proposition en trois étapes
rétablit le plus petit ensemble de nuances qui rend les garanties. Sur Bleu A
fait à l'œil, dont 10 nuances diffèrent de la rampe calculée, la rampe lue
manque 4 garanties en Thème Light, la rampe calculée aucune, et le plus petit
ensemble est 100, 200 et 300 (`[C1]`). Le contraste entre voisines passe
alors à 1,01:1 entre 50 et 100, et à 2,07:1 entre 300 et 400, là où la rampe
lue donnait 1,23 et 1,31.

**Ce que font les outils du marché.** Tous tiennent la forme d'une rampe par
sa clarté. Stripe et Matt Ström-Awn fixent un écart de contraste régulier
entre niveaux : deux niveaux séparés de 500 tiennent 4,5:1. Harmonizer règle
un niveau de contraste par pas, identique d'une teinte à l'autre. Leonardo
distribue ses pas par ratio ou par clarté ; la demande de ses utilisateurs,
garder des couleurs fixes et interpoler entre elles sans détruire leur
dessin, est ouverte dans son dépôt (issue 77). Huetone règle clarté et chroma
point par point. Aucun ne corrige une rampe déjà dessinée en gardant une
partie de ses nuances : c'est la demande propre à UCM.

**Le critère retenu.** Une rampe corrigée mêle des nuances lues et des
nuances calculées. Elle est régulière quand :

1. **la clarté est monotone** : la clarté OKLCH baisse à chaque nuance en
   Thème Light et monte en Thème Dark ;
2. **le pas est borné** : l'écart ΔEok entre deux voisines reste entre 0,5
   fois le plus court et 1,5 fois le plus long des deux écarts que la rampe
   lue et la rampe calculée donnent à la même paire de voisines.

Les bornes se lisent sur les deux rampes d'origine, et non sur la seule rampe
calculée. La revue critique proposait de borner par la rampe calculée ; sur
Bleu A, ce critère refuserait 5 des 10 pas de la rampe du designer avant toute
correction, alors que le critère retenu n'en refuse aucun (`[C5]`). La
correction serait alors forcée de reprendre des nuances qui ne posent aucun
problème. ΔEok est la distance que le moteur emploie déjà pour « Profils
confondus » et « Palettes proches » ; il compte la chroma et la teinte, que
le contraste ignore.

Sur Bleu A, le critère refuse les deux défauts : le pas 50/100 vaut 0,006
pour une borne de 0,014, le pas 300/400 vaut 0,216 pour une borne de 0,140
(`[C1]`).

**La recherche.** La correction essaie tous les ensembles de nuances
reprises, 2^n pour n nuances, soit 1 024 pour les 10 nuances reprises de Bleu A,
par intensité et par thème. Elle retient le plus petit ensemble qui atteint le
résultat de la rampe calculée et reste régulier ; à taille égale, le plus
petit écart ΔEok cumulé. Sur Bleu A, elle rétablit 50 à 500, 6 nuances sur
10, et garde 700, 800, 900 et 950 du designer ; après, aucune garantie ne
manque (`[C2]`).

**Mesure sur six rampes** (`[C3]`, Thème Light, intensité porteuse) :

| Rampe | ◆ du moteur | Charte lue au | Garanties manquées, lue | Calculée | Sans critère de forme | Correction régulière |
|---|---|---|---|---|---|---|
| Bleu A, faite à l'œil | 600 | 600 | 4 | 0 | 100, 200, 300 | 50 à 500 |
| Rouge, Tailwind red | 600 | 600 | 0 | 0 | aucune | aucune |
| Vert, Tailwind green | 600 | 600 | 0 | 2 | aucune | aucune |
| Ambre, Tailwind amber | 500 | 600 | 0 | 0 | aucune | aucune |
| Azur, Tailwind blue | 600 | 600 | 0 | 0 | aucune | aucune |
| Orange A, 700 trop clair | 500 | 500 | 4 | 0 | 700 | 600, 700, 800, 900 |

Les rampes de Tailwind tiennent leurs garanties : la correction n'a rien à
proposer. La rampe verte de Tailwind en tient même deux de plus que la rampe
calculée du même vert.

**Le designer garde la main.** Chaque nuance de la correction est une puce :
la retirer la verrouille, et la correction se recalcule sans elle. Quand aucun
ensemble régulier n'atteint le but, l'écran le dit. Sur Orange A, dont le
designer garde le 700, bouton de sa marque, aucune correction ne rend les 4
garanties : elles portent toutes sur ce 700 (paires 1, 2, 5 et 15, de 3,64:1 à
3,93:1). La meilleure correction régulière laisse 4 garanties manquées
(`[C3]`). L'écran écrit : « Aucune correction ne rend ces garanties tant que
vous gardez votre 700 », propose « Remettre 700 dans la correction », et
rappelle qu'une garantie manquée n'empêche pas d'écrire (`[VER-07]`). Quand
seul le rétablissement de toutes les nuances est régulier, l'écran dit
« Aucune correction régulière ne garde vos nuances » et propose « Reprendre la
rampe calculée ».

**La palette calculée qui manque une garantie.** Vert `#16A34A`, deux
intensités, manque deux garanties en Vivid, Thème Light : `border-control` et
`focus` sur `surface`, 2,92:1 pour 3:1 (`[C4]`). Aucune nuance n'est reprise :
la correction n'a rien à rétablir. L'écran dit « Aucune nuance à rétablir »
et offre les deux réglages que `[VER-15]` désigne, dans cet ordre :
« Ajuster la référence… » (`[UI-15]`), puis « Teinte, saturation,
luminosité ». Le moteur départage : à −2 pas, la référence devient `#029D44`
et les deux garanties sont rendues ; à −1 pas elles manquent encore ; la
saturation Vivid, de 0,9 à 0,7, n'y change rien (`[C4]`).

**La charte qui tombe sur un autre cran.** La rampe ambre de Tailwind place
sa charte `#D97706` au 600 ; sa clarté la range au 500, où le moteur l'ancre
(`[MOT-17]`). La lecture garde la règle de l'ancrage : la charte est au 500 ;
le 500 lu cède sa place ; le 600 lu, qui répète la charte, prend la valeur
calculée, sans quoi deux nuances seraient identiques. Le message de la carte
de lecture dit les trois points avant la création (`[C3]`, scénario S26).

**La rampe lue sur un seul thème.** Onze pastilles donnent le Thème Light.
Le Thème Dark garde la rampe calculée, et la carte le dit : « Thème Dark :
rampe calculée, aucune nuance lue ». Des variables à deux modes, lues par
« Mes variables », donnent les deux thèmes.

### 4.5 L'onglet Système

Portée : le fichier. Pas de sélecteur de palette.

| Objet | Rang | Contenu |
|---|---|---|
| Titre « 9 palettes · 2 marques », bascule Light et Dark des fiches | 1 | Le compte du système |
| Bilan de la dernière écriture | 1 | Section 4.6 ; il remplace le précédent |
| Bandeau des valeurs de Figma | 2 | « 1 valeur de Figma diffère de la recette, dans Rouge », « Relire… » |
| Groupe « Couleurs communes » `primitives` | 2 | Une fiche par palette, puis la carte « Distinguer les statuts », repliée |
| Un groupe par marque, `brand · mode Marque A` | 2 | Ses fiches ; une case en tirets par famille qui manque, « Créer la palette » ; menu « ⋯ » pour renommer ou retirer |
| Mode créé hors du plugin | 2 | « Mode « Marque C », créé hors du plugin », « Suivre ce mode… » |
| « + Ajouter une marque » | 3 | Un champ de nom et « Ajouter » |
| Groupe « Sans destination » | 2 | Les palettes qui n'écrivent que leur planche |
| Palette supprimée | 2 | « Vert, supprimée : son cadre et ses 66 variables restent », « Supprimer le cadre », « Supprimer les variables… » (danger) |
| Variables sans palette | 2 | Les variables laissées par des nuances retirées ou une destination changée, « Supprimer ces variables… » (danger) |
| Recette et rapport | 3, repliée | Exporter la recette, importer, exporter le rapport, redessiner tous les cadres, chercher dans tout le fichier |
| Pied | 2 | « 4 palettes à appliquer · 1 décision », « Appliquer à Figma… (4) » |

Une fiche garde la disposition actuelle, nom et pastille, rampe, puis une
ligne : référence, résultat des garanties, état des deux sorties. Ses gestes
sont compacts, sans bouton principal : « Afficher » quand le cadre existe,
« Modifier », et « Redessiner le cadre » quand le cadre attend et qu'aucune
valeur n'est à décider. La pastille montre l'état le plus urgent, dans cet
ordre : à décider, à appliquer, cadre à actualiser, pas encore sur Figma, à
jour.

### 4.6 La revue et le bilan

La revue est une modale sur le modèle d'« Ajuster la référence » : 520 px de
large au plus, voile, Tab retenu, Échap et « Annuler » qui ferment sans rien
écrire. Son corps défile ; son titre et son pied restent visibles.

| Objet | Rang | Contenu |
|---|---|---|
| Titre et portée | 1 | « Appliquer à Figma », « Bleu A seulement » ou « Toutes les palettes à appliquer » |
| Message de relecture | 1 | Seulement quand le fichier a changé depuis l'ouverture : rien n'est écrit, la valeur qui a bougé est nommée |
| Phrase de la revue | 1 | « 23 couleurs changent dans Figma et 1 cadre est redessiné. » ; quand rien d'autre n'attend, « Rien ne change encore : 1 valeur attend votre décision. » |
| Pertes de garanties | 2 | « Rouge passe de 0 à 2 garanties manquées avec ces choix. » |
| Les deux sorties | 2 | « Variables et alias » et « Planche », cochables, chacune avec son compte ou sa raison d'être impossible |
| Collection homonyme | 2 | « Reprendre cette collection » ou « Choisir un autre nom… » |
| Décisions | 2 | Un bloc par palette : gestes groupés, puis une ligne par valeur : chemin, emplois du cran, trois pastilles (dernière écrite, recette, Figma), deux choix, garanties avec le choix |
| Palettes | 3, repliée | Une case par palette de la portée, avec sa raison ; « Réglée sur un autre poste » décochée |
| Détail technique | 3, replié | Variables créées et valeurs par mode écrites, par collection ; modes créés ; variables laissées sans palette |
| Pied | 2 | « 1 valeur non décidée : elle ne s'écrit pas. », « Annuler », « Appliquer à Figma » |

Le bilan se lit en tête de Système, où l'écriture ramène le designer. Il
compte les trois unités, dit ce qui reste et pourquoi, en mots, et replie le
message de Figma sous « Détail technique ». Un bilan partiel porte
« Réessayer », qui relit le fichier et rouvre la revue de ce qui reste.

### 4.7 Les Réglages communs

Les cartes actuelles restent. Deux changements : la carte Intensités, comme
chaque carte, compte au moment du geste les couleurs déjà écrites qui
changent (« 87 couleurs déjà écrites dans Figma changent, en 4 palettes »),
et l'aperçu du nombre de nuances compte les variables créées et celles qui
resteront sans palette. Une carte repliée, « Collections des variables », la
dernière, porte les noms des trois collections et la phrase sur les portées.

### 4.8 Compter les objets et lire sans défiler

Le relevé `[E]` ouvre chaque écran de la maquette aux deux tailles. Un bloc
est un enfant direct du corps ; « entier » veut dire lisible sans défiler.

| Écran | Blocs | Entiers à 600 × 720 | Entiers à 500 × 520 | Lisible sans défiler à 500 × 520 |
|---|---|---|---|---|
| Départ, fichier vide | 5 | 5 | 5 | Titre et les trois choix |
| Jeu de départ | 4 | 4 | 2 | Titre, couleurs communes, pied |
| De couleurs existantes | 3 | 3 | 2 | Titre, rampe lue, pied |
| Palette ouverte | 8 | 8 | 5 | Sélecteur, titre, ligne d'état, configuration, alerte, pied |
| Aperçu de conversion | 9 | 4 | 3 | Sélecteur, titre, ligne d'état, pied |
| Vérifier, correction | 8 | 5 | 3 | Sélecteur, titre, verdict, correction en partie, pied |
| Vérifier, palette calculée | 7 | 7 | 5 | Sélecteur, titre, verdict, « Aucune nuance à rétablir », garanties, pied |
| Vérifier, correction impossible | 8 | 6 | 3 | Sélecteur, titre, verdict, message d'impossibilité, pied |
| Système | 7 | 2 | 2 | Titre, bandeau des valeurs de Figma, pied |
| Revue (modale) | titre, phrase, sorties, décisions, détail, pied | tous commencés | phrase, sorties, première décision | Titre et pied de la modale toujours |
| Réglages communs | 4 | 4 | 4 | Tout, sans pied |
| Mes variables | 10 | 7 | 3 | Sélecteur, titre, ligne d'état, pied |

Le protocole de relecture fixe une douzaine d'objets au plus
([CONTRIBUTING](../../../../../../CONTRIBUTING.md#le-protocole-de-relecture)).
Avec l'en-tête, la rangée d'onglets et le pied, chaque onglet tient sous ce
compte (`[E]`) : Palette 11 objets, Vérifier 11 avec une correction, Système
10 pour le système de démonstration. Les fiches d'un groupe comptent comme
un objet répété, comme celles de l'onglet Palettes actuel. À 500 × 520,
`[UI-03]` demande le sélecteur, le titre et la rangée du nom et de la
référence : le relevé les montre lisibles dans Palette.

## 5. L'écriture des variables

Chaque règle porte son origine : **Reprise** pour une règle de [la
proposition finale](../03%20Proposition%20finale/PROPOSITION-FINALE.md)
gardée telle quelle, **Reprise modifiée** quand la direction la change,
**Nouvelle** sinon.

### 5.1 Ce que Figma documente, et ce qui reste à essayer

Les faits viennent des typings de l'API installés dans le dépôt,
`@figma/plugin-typings` 1.138 (`node_modules/@figma/plugin-typings/plugin-api.d.ts`,
cité `api:ligne`), et de la documentation de Figma.

| Question | Documenté | Source | À essayer dans Figma |
|---|---|---|---|
| Créer une variable | `createVariable(nom, collection, type)` ; le passage d'un identifiant de collection est déprécié et lève sous `dynamic-page` | api:2176 à 2192 | Essai 2 : un nom déjà pris dans la collection, refus ou doublon |
| Écrire une valeur | `setValueForMode(modeId, valeur)` ; sur une collection étendue, la valeur devient une surcharge | api:11891 | Essai 8 : une variable créée hors du plugin |
| Ajouter un mode | `addMode(nom)` lève `in addMode: Limited to N modes only` au-delà de la limite de l'offre | api:12017, 12022 | Essai 7 : le message exact |
| Limites de modes | Starter : un mode (api:11791). Professional : 10 ; Organization : 20 (Figma, annonces de Schema 2025) | api, Schema 2025 | Enterprise : non documenté ici |
| Valeurs d'un mode ajouté | « Figma duplique les valeurs de la première colonne dans la nouvelle » | Figma Learn, Modes for variables | Essai 3 : la valeur des autres modes d'une variable neuve, créée par l'API |
| Alias | `createVariableAlias(variable)` | api:2217 | Essai 8 : lire une valeur d'alias pour la refuser (« Mes variables ») |
| Portées | `scopes` ne règle que les sélecteurs de l'interface ; l'API peut toujours lier | api:11905, 11907 | Essai 16 : un alias de `theme` vers une variable de `primitives` aux portées vides |
| Syntaxe de code | `setVariableCodeSyntax('WEB', valeur)` | api:11941 | Essai 10 : ce que Dev Mode montre pour `--x` et pour `var(--x)` |
| Données de plugin | Une variable et une collection portent des données de plugin, privées ou partagées, 100 ko par entrée au plus ; les données privées se perdent si l'identifiant du plugin change | api:6386 à 6428, 11743 | Essai 4 : survie à la publication et à une copie du fichier. Un fil du forum de Figma rapporte que les données d'un style publié ne se lisent pas dans un fichier consommateur |
| Déplacer une variable | `variableCollectionId` est en lecture seule | api:11768 | Aucun : la règle de la section 5.3 en découle |
| Collections distantes | `remote` est en lecture seule ; la documentation ne décrit l'écriture que pour les variables locales | api:11766, Working with variables | Essai 14 : `setValueForMode` sur une variable de bibliothèque |
| Collections étendues | `extend` et `extendLibraryCollectionByKeyAsync` lèvent hors de l'offre Enterprise | api:2205, 12002 | Aucun : la direction ne les emploie pas |
| Noms | Le point, `$`, `{` et `}` sont refusés dans un nom de variable ; `/` crée des groupes | Documentation tierce (Slint), forum de Figma | Essai 9 : les caractères refusés, et le nom rendu |
| Annulation | `commitUndo()` range les actions faites depuis le précédent dans un pas d'annulation ; il ne défait rien | api:276 à 294 | Essais 1 et 12 : un seul pas pour recette, variables et cadre ; les données de plugin dans ce pas |
| Suivre les changements | `documentchange` exige `loadAllPagesAsync` sous `dynamic-page`, et ses six types ne comptent aucun changement de variable | api:562 à 599 | Essai 13 : aucun événement ne signale une variable changée ; le plugin relit à l'ouverture, au retour du focus et au clic |
| Coût de lecture | Grouper les lectures `getVariableByIdAsync` dans un seul `Promise.all` évite un aller-retour par variable | Figma, guide des variables du serveur MCP | Essai 5 : le temps de 198 variables, puis de 716 valeurs |
| Auteur d'une modification | `currentUser` exige la permission `currentuser` du manifest ; il donne le nom et l'identifiant de l'utilisateur courant, rien sur l'auteur d'une valeur | api:125 à 129, 12714 | Aucun |

Les huit essais de la proposition finale restent, et huit s'ajoutent (essais
9 à 16) ; la [section 10](#10-les-lots) les place avant le lot 3.

### 5.2 Chemins et noms

**Nouvelle.** Figma refuse le point dans un nom de variable. Le nom d'une
variable joint donc ses segments par `/`, et la collection porte le premier
segment du chemin de l'architecture : la variable `danger/vivid/light/700` de
la collection `primitives`. UCM Exporter en fait le chemin à points de
`tokens.json`, `primitives.danger.vivid.light.700`, par `normalizeName` et
`joinTokenPath` (`packages/kit/src/format/names.ts:3`,
`packages/plugin-exporter/src/variables.ts:78`). Les propositions
précédentes écrivaient le chemin à points comme s'il était le nom Figma.

| Destination | Collection | Nom de la variable | Mode |
|---|---|---|---|
| Couleurs communes, deux intensités | `primitives` | `{famille}/{soft, vivid}/{light, dark}/{nuance}` | le seul mode |
| Couleurs communes, une intensité (neutre) | `primitives` | `{famille}/{light, dark}/{nuance}` | le seul mode |
| Une marque | `brand` | `palette/{famille}/{light, dark}/{nuance}` et `identity/{famille}` | celui de la marque |
| Alias | `theme` | `{famille}/{soft, vivid}/{nuance}` ou `{famille}/{nuance}` | `light` et `dark` |

**Reprise.** Le plugin assemble les noms que le designer donne : famille, marque,
noms des collections. Il n'en invente aucun (D3). `theme` se déduit de la
table « Ce que theme expose » sans choix du designer. `primitives` et `brand`
prennent des portées vides ; `theme` garde les portées de remplissage et de
contour. La syntaxe de code Web vient de `tokenCssVariable`.

### 5.3 Propriété par identifiant et provenance

**Reprise.** Le plugin reconnaît ses ressources par identifiant, jamais par leur
nom. Un suivi rangé sous la clé partagée `ucm_palettes/variables`, versionné
comme celui de la planche, garde l'identifiant de chaque collection, le mode
de chaque marque et l'identifiant de chaque variable par chemin. Chaque
variable écrite porte une donnée de plugin partagée : sa palette et la
dernière valeur appliquée dans chaque mode.

**Reprise modifiée.** La donnée est partagée (`setSharedPluginData`), comme celle
des cadres : les données privées se perdent quand l'identifiant du plugin
change (api:6397), ce qui arrive entre la version de développement et la
version publiée (`[REC-01]`).

| Cas | Traitement | Origine |
|---|---|---|
| Une variable existe au chemin visé, sans donnée du plugin | Sans provenance : « Reprendre la valeur de Figma » ou « Remplacer par la recette ». L'identifiant se garde ; aucun second nom identique | reprise |
| Un mode de `brand` existe sans marque de la recette | Groupe « Mode créé hors du plugin », « Suivre ce mode… » : la marque entre dans la recette ; ses valeurs recopiées restent sans provenance | reprise |
| Une collection du nom visé existe, créée hors du plugin | La revue demande « Reprendre cette collection » ou « Choisir un autre nom… » ; sans choix, rien ne s'écrit dans cette collection | reprise modifiée : le choix est dans la revue, le nom dans la carte Collections |
| Une famille existe dans une marque et manque dans une autre | Case vide dans le groupe de la marque ; ses valeurs de ce mode, recopiées par Figma, sont comptées sans palette | reprise |
| Une palette est supprimée, quitte sa destination, ou des nuances sont retirées | Ses variables restent, calques liés compris ; « Supprimer les variables… » est un geste `danger` séparé, confirmé | reprise |
| Une famille est renommée dans la même collection | Les variables se renomment ; identifiants et liaisons restent | reprise |
| Une palette change de collection | De nouvelles variables se créent ; les anciennes restent, sans palette | reprise |
| Une variable suivie a disparu de Figma | Elle se recrée, comptée dans « variables créées » ; les calques qui la liaient ont perdu leur lien, et la revue le dit | nouvelle |

Une actualisation ne supprime jamais une variable.

### 5.4 La comparaison à trois valeurs

**Reprise**, table rejouée par `comparerTroisValeurs` (`[T3]`) :

| Figma | Recette | La revue montre |
|---|---|---|
| = dernière appliquée | = dernière appliquée | Rien |
| = dernière appliquée | a changé | Une valeur à écrire |
| a changé | = dernière appliquée | Une retouche à décider |
| a changé | a changé, égale à Figma | Rien à écrire ; la dernière appliquée se met à jour |
| a changé | a changé, différente de Figma | Une retouche à décider, avec les trois valeurs |
| sans provenance | toute valeur | Une valeur sans provenance à décider, égale ou non à la recette |

Une valeur non décidée ne s'écrit pas : Figma garde la sienne, la recette la
sienne, et la palette reste « À décider ». Elle ne bloque pas les autres.

**Les libellés.** « Garder la couleur de Figma » disait l'effet sur Figma et
taisait l'effet sur la recette. Les choix disent l'effet et la valeur :

| Cas | Premier choix | Second choix |
|---|---|---|
| Nuance ordinaire | « Adopter #DC2626 dans la recette » | « Remettre #B61D1D dans Figma » |
| Cran ◆ | « Adopter #D42020 comme nouvelle référence de Rouge » | « Remettre #DC2626 dans Figma » |
| Identité de la marque | « Adopter #1A6BD6 comme couleur de charte » | « Remettre #1E6FD9 dans Figma » |
| Sans provenance | « Reprendre #15803D de Figma dans la recette » | « Remplacer par la recette, #185EC1 » |

Sous le choix fait, le moteur recalcule les garanties. Adopter `#DC2626` au
700 Vivid Light de Rouge fait manquer 2 garanties, `text` sur `surface` à
4,14:1 et `text` sur `surface-card` à 4,47:1 ; les trois retouches 700, 800 et
900 adoptées ensemble en font manquer 2 aussi ; remettre la 700 et adopter les
deux autres n'en fait manquer aucune (`[T1]`).

**Le cran ◆ et l'identité.** **Reprise.** Une retouche du cran porteur n'entre
jamais dans la recette comme retouche : adoptée, elle devient la nouvelle
référence, et la palette se recalcule autour d'elle. Pour Rouge, `#D42020`
adopté reste ancré au 600 et change 9 nuances Vivid Light, sans garantie
manquée (`[T2]`). L'identité `identity/{famille}` vaut la couleur saisie avant
tout ajustement ; une retouche de l'identité se décide comme celle du cran ◆.

### 5.5 La relecture au clic

**Reprise.** La revue affiche un plan calculé à son ouverture. Au clic sur
« Appliquer à Figma », le sandbox relit la recette et les variables
concernées et recalcule le plan. S'il diffère, rien ne s'écrit ; la revue
reste ouverte, dit « Le fichier a changé depuis l'ouverture de cette revue.
Rien n'a été écrit. », nomme chaque valeur qui a bougé et redemande les
décisions qu'elle touche ; les autres restent prises (scénario S11).

### 5.6 Écrire en cinq temps, reprendre, annuler

**Reprise.** Préparer le plan depuis la recette rangée et les variables lues,
jamais depuis des couleurs envoyées par l'interface ; contrôler les polices et
retirer avant toute écriture une sortie qui ne passe pas ; écrire sortie par
sortie, la recette quand une retouche est adoptée, puis les variables par
collection, puis les alias, puis la planche ; faire le bilan, par sortie et
par palette, la cause en mots et le message de Figma replié ; reprendre par
« Réessayer », qui relit le document : une valeur déjà écrite porte sa
dernière valeur appliquée et se classe à jour, rien ne se crée deux fois.

Une erreur arrête la sortie ou le mode qui échoue ; le reste continue. À la
limite de modes, les 46 valeurs de la marque refusée restent, les cadres se
dessinent, et la reprise après le passage à Organization crée 1 mode et écrit
46 valeurs sans doublon (scénario S13).

**Reprise modifiée : l'annulation.** Un seul `commitUndo` clôt une écriture,
recette des retouches adoptées comprise. Le rangement de la recette qui
précède, à la fin d'un geste de l'onglet Palette, garde son propre
`commitUndo` (`[REC-06]`). Un Ctrl+Z défait donc l'écriture, et un second le
rangement : après une nouvelle référence de Bleu A écrite puis défaite, la
palette garde `#2F6FE0` dans la recette et redevient « À appliquer »
(scénario S24). Les essais 1 et 12 le confirment avant de le promettre.

### 5.7 L'unité et les comptes

**Nouvelle.** L'écran dit « couleur » pour une valeur par mode écrite, alias
compris : une cellule du panneau des variables de Figma. Le détail technique
garde les trois unités de la proposition finale : variables créées, valeurs
par mode écrites, cadres dessinés, plus les modes créés et les variables
laissées sans palette.

| Compte | Calcul | Exemple (`[N1]` à `[N6]`) |
|---|---|---|
| Variables créées | Variables du plan absentes du suivi | 365 pour le système de démonstration ; 0 pour une marque ajoutée |
| Couleurs écrites | Valeurs par mode du plan à écrire, plus les valeurs décidées « Remettre » ou « Remplacer » | 532 pour la première écriture ; 23 pour une référence changée ; 87 pour Soft à 0,50 |
| Modes créés | Marques sans mode suivi dans `brand` | 1 pour Marque C |
| Cadres dessinés | Palettes de la portée dont le cadre n'a pas l'empreinte du modèle | 9, puis 1 |
| Variables laissées | Variables suivies absentes du plan | 66 après le retour de 13 à 11 nuances |

Un système à six marques et deux familles de marque compte 365 variables et
716 valeurs à onze nuances ; 299 et 588 à neuf ; 431 et 844 à treize
(`[N1]`). Passer de 11 à 13 nuances crée 66 variables (36 dans `primitives`,
8 dans `brand`, 22 dans `theme`) et écrit 96 valeurs ; aucune couleur d'une
nuance gardée ne change. Revenir à 11 laisse ces 66 variables sans palette
(`[N5]`).

### 5.8 La revue et les conflits : ce que font les autres

- **Le dialogue des mises à jour de bibliothèque de Figma** groupe les
  changements par type de ressource, montre un avant et un après côte à côte
  ou en superposition, et offre « Update » par ressource et « Update all ».
  La revue reprend le geste groupé et le geste unitaire.
- **Tokens Studio** montre à la synchronisation un onglet de différences,
  ajouts en vert et retraits en rouge, avant de pousser. Un tirage remplace
  les tokens locaux sans fusion : le seul choix est d'accepter ou d'annuler,
  et sa documentation avertit que les tokens locaux sont perdus. Sa demande
  de fusion entre branches reste ouverte. La revue n'écrase rien sans choix.
- **L'éditeur de fusion de Visual Studio Code** montre trois panneaux, entrant, courant
  et résultat, un compte des conflits non résolus, et rappelle de relire le
  résultat même à zéro conflit. La revue reprend le compte, « 1 valeur non
  décidée », et laisse une valeur non décidée hors de l'écriture au lieu de
  bloquer le reste.

Ce qui tient dans 500 px : une ligne par valeur, les trois valeurs en
pastilles sur une rangée, deux choix en boutons, et les gestes groupés en
tête du bloc de la palette. Au-delà de six valeurs, le bloc ne montre que les
gestes groupés et le début de la liste.

### 5.9 Plusieurs designers dans un fichier

Le plugin ne sait pas qui a modifié une valeur : aucun événement ne signale
un changement de variable (api:562 à 599), et `currentUser`, qui demande la
permission `currentuser`, ne donne que l'utilisateur courant. Ranger son nom
dans le document le rendrait lisible par tout plugin (données partagées).

La direction garde une trace locale : `figma.clientStorage`, propre au poste,
retient les palettes que ce poste a réglées depuis la dernière écriture, sous
un identifiant du document rangé avec la recette. La revue laisse décochée,
avec « Réglée sur un autre poste », une palette modifiée dans la recette sans
l'être sur ce poste (scénario S25). La relecture au clic garde le reste :
une valeur qui bouge pendant la revue ne s'écrase pas.

## 6. Les cas limites

| Cas | Règle | Écran | Texte affiché au designer | Maquette |
|---|---|---|---|---|
| 1. La recette et Figma ont changé tous deux | Comparaison à trois valeurs ; une valeur rejointe ne s'écrit pas, une retouche double se décide | Revue | « Dernière écrite #B61D1D · Recette #1A5FC4 · Figma #1B63C4 » et les deux choix | S11, S05 |
| 2. Valeur sans provenance : variable à la main, mode hors du plugin, première liaison | Jamais écrasée ni ignorée en silence ; décision unitaire ou groupée | Revue, Système | « 23 valeurs sans provenance », « Reprendre les 23 de Figma », « Remplacer les 23 par la recette » | S08, S09, S21 |
| 3. Le fichier change pendant la relecture | Relecture au clic ; rien ne s'écrit ; les décisions touchées se redemandent | Revue | « Le fichier a changé depuis l'ouverture de cette revue. Rien n'a été écrit. 1 valeur a bougé : palette/primary/light/700. » | S11 |
| 4. Une sortie échoue : police absente, limite de modes | Une sortie impossible est retirée avant l'écriture ; une erreur arrête son mode, pas l'autre sortie ; bilan ; reprise sans doublon | Revue, Bilan | « Police Inter Semi Bold indisponible sur ce poste : la planche ne se dessine pas, les variables restent possibles. » ; « Figma refuse de créer le mode Marque K : brand a atteint 10 modes, le nombre que l'offre du fichier admet. » | S12, S13 |
| 5. Une famille existe dans une marque et manque dans une autre | Case vide dans le groupe ; les valeurs recopiées comptent sans palette ; la famille vaut pour toutes les marques | Système | « secondary manque dans Marque B » ; « 23 valeurs de ce mode sont sans palette : Figma y a recopié la première marque. » | S10 |
| 6. Un mode de `brand` créé hors du plugin | Le plugin ne le suit qu'au geste « Suivre ce mode… » | Système | « Mode « Marque C », créé hors du plugin. Aucune palette ne suit ces valeurs. » | S09 |
| 7. Retouche du cran ◆ ou de `brand.identity` | Jamais une retouche : une nouvelle référence, ou la valeur de la recette | Revue | « Adopter #D42020 comme nouvelle référence de Rouge » ; « Adopter #1A6BD6 comme couleur de charte » | S07 |
| 8. Plusieurs retouches dans une palette | Gestes groupés, puis une ligne par valeur ; garanties jugées sur l'ensemble choisi | Revue | « Adopter les 3 dans la recette », « Remettre les 3 dans Figma » ; « Avec ce choix : 2 garanties manquées pour Rouge. » | S06 |
| 9. Nuances changées, palette supprimée, destination changée | Variables créées comptées ; variables laissées sans palette, jamais supprimées à l'actualisation ; suppression par un geste `danger` confirmé | Réglages communs, Système, Palette | « Variables : 66 à créer ; 0 resteront… » ; « Vert, supprimée : son cadre et ses 66 variables restent dans Figma. » ; « Les calques liés à ces variables perdront leur lien. » | S14, S15, S22 |
| 10. Même destination, collection homonyme | Refus à la saisie, avec le nom de la palette qui occupe ; collection reprise ou renommée par choix | Palette, Revue | « primary est déjà la famille de Bleu A dans Marque A. » ; « Une collection « primitives » existe, créée hors du plugin. » | S23 |
| 11. L'annulation d'une écriture | Un `commitUndo` par écriture ; le rangement précédent garde le sien ; hypothèse à prouver | Système, Journal | Le plugin relit au retour du focus ; la fiche reprend son état | S24 |

## 7. Les décisions

Répondre par numéro : oui, non, ou une variante. DG-01, DG-03, DG-04, DG-05
et DG-18 fixent la forme du plan.

| # | Question | Option recommandée | Options écartées | Origine | Ce qu'un refus entraîne |
|---|---|---|---|---|---|
| DG-01 | Onglets : nombre, noms, ordre, numérotation, ouverture | Trois onglets sans numéro : Palette, Vérifier, Système. Palette et Vérifier portent sur la palette ouverte, Système sur le fichier. Ouverture sur Système quand le fichier a des palettes, sur Palette (« D'où partez-vous ? ») sinon. Un pied fixe porte le bouton principal | Deux onglets Système et Palette (la proposition finale V0) : la carte des garanties, la correction et « En contexte » chargent l'onglet Palette au-delà de la douzaine d'objets. Trois onglets numérotés (trois étapes) : le travail boucle entre régler et juger. Nommer le troisième « Appliquer » (revue critique) : l'onglet d'ouverture porterait un ordre, et il montre d'abord un état | Trois étapes, revue critique, recommandation 1 ; le nom Système vient de la proposition finale | Deux onglets : la correction et la vérification rejoignent l'onglet Palette, qui passe de 11 à 15 objets (`[E]`, plus la correction, les garanties, En contexte et Comparer à). Numéros : la maquette et CONTRIBUTING changent de vocabulaire |
| DG-02 | La vue du système et les fonctions de l'onglet Palettes actuel | L'onglet Système : groupes par destination, deux sorties par fiche, cases vides, modes hors du plugin, palettes supprimées et variables sans palette, bandeau des valeurs de Figma, « Afficher », « Redessiner le cadre », bilan, « Recette et rapport » replié, « Distinguer les statuts » | Garder les fonctions dans « Appliquer » seulement pour les palettes modifiées (trois étapes) | Revue critique, recommandation 2 | Sans vue du fichier, l'état des cadres, les familles manquantes et les retouches ne se voient qu'à l'écriture |
| DG-03 | Le modèle de destination | « Aucune · Couleurs communes · Une marque » ; la famille ensuite ; les intensités en découlent (une pour le neutre et une marque, deux pour un utilitaire) ; « Référence exacte dans » pour un utilitaire ; les intensités restent libres sans destination ; aperçu de conversion pour une palette existante ; refus d'une destination occupée | Le rôle en quatre segments (la proposition finale V1) ; la destination sans contraintes (trois étapes, atelier) | la proposition finale piste 1 pour les contraintes et la conversion ; trois étapes pour le nom et l'ordre couleur puis destination | Rôle : un segment de plus à la création. Sans contraintes : une palette de marque à deux intensités se saisit puis se refuse |
| DG-04 | Les règles d'écriture | Celles de la proposition finale, nommément (section 5), plus les noms à `/`, la donnée partagée, l'annulation en deux pas | Garder « Garder » coché ; bloquer l'écriture tant qu'une décision attend ; cocher « Appliquer malgré les paires » | la proposition finale, atelier, revue critique, recommandation 3 | Un plan écrit sans ces règles les réinvente pendant le développement |
| DG-05 | La correction proposée et son critère | Ensemble le plus petit qui atteint le résultat de la rampe calculée et reste régulier (clarté monotone, pas ΔEok borné par les deux rampes d'origine, 0,5 et 1,5), recherche exhaustive, verrous du designer, message quand rien n'atteint le but ; palette calculée : « Ajuster la référence… » puis le réglage de `[VER-15]` | Le plus petit ensemble sans critère de forme (trois étapes) ; des bornes lues sur la seule rampe calculée (revue critique) ; l'algorithme glouton | Revue critique, recommandation 5, mesurée | Sans critère, la correction de Bleu A rend une rampe à 1,01:1 et 2,07:1 entre voisines |
| DG-06 | La reprise d'une rampe existante | Oui, lot 5 : « De couleurs existantes » dans la création ; les nuances lues deviennent des retouches ✎ ; la charte suit l'ancrage du moteur ; un thème non lu garde la rampe calculée | Une entrée de même rang que « D'une couleur » dès le premier lot | la proposition finale piste 11 ; trois étapes pour l'entrée | Une rampe faite à l'œil ne se mesure pas ; le designer perd son dessin |
| DG-07 | La liaison à des variables existantes | À discuter, lot 7, après l'écriture des trois collections éprouvée dans Figma | Une des trois destinations dès le premier lot (trois étapes) | la proposition finale piste 12 ; revue critique, recommandation 6 | Oui dès le début : les cas d'alias, de bibliothèque distante et de motif ambigu entrent dans le premier lot des variables |
| DG-08 | L'unité et les comptes | « Couleur » = valeur par mode, alias compris ; détail en trois unités, modes créés, variables laissées | Une « couleur » sans définition (trois étapes) ; les trois unités à l'écran principal | Revue critique, recommandation 7 ; atelier, P1·04 | Deux lectures d'un même nombre |
| DG-09 | Le dessin de la planche seule | « Redessiner le cadre » sur la fiche et « Dessiner le cadre » sous le titre de la palette, sans revue ; « Redessiner tous les cadres » dans « Recette et rapport » | Passer par la revue en décochant les variables : quatre gestes | Revue critique, recommandation 8 | Redessiner un cadre coûte quatre gestes |
| DG-10 | Les marques | Ajout par « + Ajouter une marque » dans Système ; renommage par le menu du groupe, le mode se renomme à la prochaine écriture ; retrait : les palettes passent sans destination par l'aperçu de conversion, le mode reste ; limite de modes dite à l'ajout au-delà de 10 modes, erreur dite au bilan | Une carte des marques dans les Réglages communs (proposition initiale) | la proposition finale pistes 2 et 9 | Ajouter une marque demande l'engrenage et une carte repliée |
| DG-11 | Le jeu de départ et la famille commune | Dans « D'où partez-vous ? » ; couleurs communes, puis une ligne par marque ; une famille vaut pour toutes les marques ; ensuite les cases vides de Système | « Compléter le jeu de départ » dans le menu « … » | la proposition finale piste 5 | Une marque peut rester sans famille, remplie par les valeurs d'une autre |
| DG-12 | L'alerte des palettes proches | Elle compare deux palettes qui peuvent s'afficher ensemble : deux marques différentes ne se comparent pas, une palette sans marque se compare à toutes ; « Proches à dessein » ; « Comparer à » dans Vérifier | Comparer toutes les paires (actuel) ; taire toute palette sans marque | la proposition finale piste 13 ; revue critique, section 10 | Bleu A et Bleu B, 0,040, sonnent sans jamais s'afficher ensemble |
| DG-13 | La vision simulée | Dans Système, carte « Distinguer les statuts » du groupe des couleurs communes, avec une marque choisie ; spécimens ; aucune alerte ; distances par vision dans le rapport | Dans Vérifier, palette par palette (trois étapes) ; une liste en tête de l'onglet (proposition initiale) | la proposition finale piste 7 ; revue critique, section 10 | La confusion entre statuts, question du système, se juge palette par palette |
| DG-14 | Les réglages communs et leur effet | Chaque carte compte au moment du geste les palettes et les couleurs écrites qui changent ; rampe témoin dans les cartes de réglage d'une palette | Découvrir l'effet à la revue (trois étapes) ; une barre flottante | la proposition finale pistes 3 et 14 | Un réglage commun récrit 87 valeurs sans le dire avant la revue |
| DG-15 | Les fonds lus sur le neutre | Reportés, lot 8, à discuter ; fonds saisis ; lien explicite, bilan avant lien, repli dit | Lier par défaut | la proposition finale piste 8 ; atelier, P2·13 | Aucun : la direction ne les demande pas |
| DG-16 | Plusieurs designers | Trace locale par `clientStorage` ; « Réglée sur un autre poste », décochée ; relecture au clic | La permission `currentuser` et un nom rangé dans le document | Revue critique, section 10 ; mesure de l'API | « Toutes les palettes » applique les réglages d'un autre designer sans que la revue le dise |
| DG-17 | Les aides et la langue des planches | Aides au clic et au clavier pour Soft, Vivid, « Référence exacte dans », « Dérive de teinte », « Destination dans Figma » ; langue des planches dans `contenuDesPlanches` | Aides au survol | la proposition finale piste 10 | Les planches restent en français |
| DG-18 | L'ordre des lots | Section 10 : organisation, format 7 et destination, une famille commune écrite, marques, reprise et correction, statuts, puis à discuter | `primitives` et `brand` sans `theme` d'abord (proposition initiale) | la proposition finale, revue critique | Un premier lot qui n'écrit rien de liable, ou un premier lot sans l'organisation |
| DG-19 | Les noms, les portées et la syntaxe de code | Noms à `/` ; portées vides pour `primitives` et `brand` ; syntaxe Web de `tokenCssVariable` | Des noms à points | Recherche de cette direction | Figma refuse le nom |
| DG-20 | La couleur de la sélection | Rangée « Dans la sélection » du sélecteur de couleur ; création préremplie d'un seul calque ; première peinture unie, visible et opaque, P3 converti ; lot 1 | Lire un dégradé ou une image | la proposition finale piste 6 | La couleur de la charte se recopie à la main |
| DG-21 | Les libellés des retouches | Section 5.4 : l'effet et la valeur dans chaque choix | « Garder la couleur de Figma » | Revue critique, section 8 | Le designer adopte une retouche dans la recette sans le lire |

### 7.1 Les quatorze pistes de la proposition finale

| Piste | Verdict | Raison |
|---|---|---|
| 1. Le rôle de la palette | Modifiée | Devient la destination (DG-03) : mêmes contraintes et même aperçu de conversion, choisis après la couleur, avec le vocabulaire des trois étapes |
| 2. Deux sorties, un geste, l'onglet Système | Gardée, modifiée | Deux sorties et une pastille ; l'onglet Système devient le troisième onglet, avec le pied fixe ; la fiche garde « Redessiner le cadre » en geste compact (DG-02, DG-09) |
| 3. La revue avant écriture | Gardée, modifiée | Règles de la proposition finale ; noms à `/`, donnée partagée, annulation en deux pas (DG-04) |
| 4. Les retouches | Gardée, modifiée | Libellés qui disent l'effet (DG-21) |
| 5. Le jeu de départ | Gardée | Dans « D'où partez-vous ? » (DG-11) |
| 6. La couleur de la sélection | Gardée | Lot 1 (DG-20) |
| 7. Les statuts en vision simulée, avec la marque | Gardée | Dans Système (DG-13) |
| 8. Les fonds lus sur le neutre | Gardée à discuter | Lot 8 (DG-15) |
| 9. Les collections et les marques | Gardée | Carte Collections repliée, marques dans Système (DG-10) |
| 10. Les aides et la langue des planches | Gardée | DG-17 |
| 11. Reprendre une rampe existante | Gardée, modifiée | Correction bornée par la régularité, verrous, charte et thème non lu (DG-05, DG-06) |
| 12. Relier à des variables existantes | Gardée à discuter | Lot 7 (DG-07) |
| 13. Les palettes proches | Gardée | Portée par marque, « Proches à dessein », « Comparer à » dans Vérifier (DG-12) |
| 14. La rampe témoin | Gardée | DG-14 |

### 7.2 Les dix-neuf décisions de la proposition finale

| Décision | Verdict | Raison |
|---|---|---|
| V0, le flux global | Modifiée | Trois onglets au lieu de deux ; ouverture sur Système gardée ; bouton unique en pied au lieu de l'en-tête (DG-01) |
| V1, le rôle | Modifiée | Devient la destination (DG-03) |
| V2, l'état des sorties | Gardée | Trois états des variables, pastille unique, ordre d'urgence fixé (section 4.5) |
| V3, le rangement de Système | Gardée, modifiée | Groupes « Couleurs communes », une marque par groupe, « Sans destination » |
| V4, la revue | Gardée | DG-04 |
| V5, l'identité de la marque | Gardée | 46 variables par marque ; l'architecture change (M-121) |
| V6, les retouches dans la recette | Gardée | Aucune retouche sur le cran ◆ ; gestes groupés |
| V7, le jeu de départ | Gardée | DG-11 |
| V8, la couleur de la sélection | Gardée | DG-20 |
| V9, la vision simulée | Gardée | DG-13 |
| V10, les fonds lus sur le neutre | Gardée à discuter | DG-15 |
| V11, les collections et les marques | Gardée | DG-10 |
| V12, les aides et la langue des planches | Gardée | DG-17 |
| V13, l'ordre des lots | Modifiée | L'organisation des trois onglets au premier lot (DG-18) |
| V14, reprendre une rampe | Modifiée | Critère de régularité (DG-05) |
| V15, relier à des variables existantes | Gardée à discuter | DG-07 |
| V16, les palettes proches | Gardée | « Comparer à » dans Vérifier (DG-12) |
| V17, la rampe témoin | Gardée | DG-14 |
| V18, les familles ajoutées | Gardée | « Autre famille… » ; l'architecture admet d'autres familles (M-121) |

## 8. L'inventaire des modifications

Une ligne par modification. « Spec » désigne
[la spécification](../../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md), citée par ligne ;
un chemin de code part de `packages/`. La colonne Écran nomme l'écran ou le
scénario de la maquette qui montre la modification.

| Identifiant | Domaine | Endroit | Aujourd'hui | Après | Raison | Écran | Lot | Coût |
|---|---|---|---|---|---|---|---|---|
| M-001 | Spécification | D2 | « Le plugin ne crée ni ne modifie aucune variable » (spec:76) | Le plugin écrit les variables de ses trois collections, toujours après la revue | DG-04 | S01 | 3 | Faible : une ligne, dont dépend tout le reste |
| M-002 | Spécification | D3 | L'unité est la palette, sans marque ni famille (spec:77) | Le plugin connaît la marque et la famille que le designer saisit, et n'invente aucun nom | DG-03 | S22 | 2 | Faible : une ligne |
| M-003 | Spécification | D10 | La recette fait autorité ; le JSON en est une copie (spec:84) | La recette porte aussi les retouches adoptées, les destinations, les marques ; toute valeur écrite s'y rattache | DG-04 | S05 | 2 | Faible |
| M-004 | Spécification | Section 4, questions ouvertes | Q1 à Q7 (spec:96-104) | Q8 : langue des planches, français par défaut ; Q9 : fonds lus sur le neutre, non par défaut | DG-15, DG-17 | aucun | 2 | Faible |
| M-005 | Spécification | Section 5, périmètre | « Le plugin ne fait pas : créer, lire ou modifier une variable » (spec:124-131) | Fait : écrire ses trois collections, lire les variables locales et la sélection. Ne fait pas : supprimer une variable à l'actualisation, écrire dans une collection distante ou étendue | DG-04, DG-20 | S01 | 3 | Faible |
| M-006 | Spécification | `[MOT-17]` | La référence entre telle quelle dans son intensité porteuse (spec:257) | Borne : aucune retouche sur le cran porteur ni sur l'identité ; une valeur différente y devient une nouvelle référence ou disparaît | DG-04 | S07 | 2 | Faible |
| M-007 | Spécification | Nouvelle `[MOT-30]` | Aucune retouche dans les rampes | Les rampes effectives : `rampesDe` applique les retouches adoptées après l'ancrage ; `rampesCalculeesDe` rend le calcul seul | DG-04 | S05 | 2 | Moyen : toutes les vues lisent les rampes effectives |
| M-008 | Spécification | Nouvelle `[MOT-31]` | Aucun critère de forme d'une rampe | Critère de régularité : clarté monotone, pas ΔEok borné à 0,5 et 1,5 fois les pas des deux rampes d'origine | DG-05 | S16 | 5 | Faible |
| M-009 | Spécification | Nouvelle `[MOT-32]` | Aucune correction | Correction proposée : recherche exhaustive, verrous, cible de la rampe calculée, `atteinte` | DG-05 | S16, S17 | 5 | Moyen |
| M-010 | Spécification | Nouvelle `[MOT-33]` | Une palette part d'une couleur (spec:631) | Lecture d'une rampe : retouches de l'intensité porteuse, rien sur le cran ◆, doublon de la charte, thème non lu calculé | DG-06 | S16, S26 | 5 | Moyen |
| M-011 | Spécification | Nouvelle `[MOT-34]` | Aucune simulation de vision | Vision simulée : Viénot 1999 et Brettel 1997, matrices de libDaltonLens | DG-13 | S20 | 6 | Faible |
| M-012 | Spécification | Section 7.1, contenu de la recette | Onze clés, une palette sans destination (spec:448-484) | Clés `marques`, `collections`, `prochesADessein` ; par palette `destination` et `retouches` ; `contenuDesPlanches.langue` | DG-03, DG-04, DG-10, DG-12, DG-17 | S22 | 2 | Moyen |
| M-013 | Spécification | `[REC-03]` | Versions 1 à 6 migrées (spec:545) | Version 7 ; la 6 migre sans destination ni retouche, sans changer une couleur | DG-03 | aucun | 2 | Faible |
| M-014 | Spécification | `[REC-05]` | Validation des champs du format 6 (spec:551) | Destination connue et unique, marque existante, famille au motif `[a-z][a-z0-9-]*`, intensités compatibles, retouche hors du cran ◆, clé de nuance dans la liste | DG-03 | S23 | 2 | Moyen |
| M-015 | Spécification | `[REC-07]`, `[REC-08]` | L'écart d'un import compare palettes et réglages (spec:1037) | L'écart compte aussi destinations, marques, retouches, et les couleurs écrites qui passeraient « À appliquer » | DG-08 | aucun | 4 | Moyen |
| M-016 | Spécification | `[REC-10]` | Un rangement se refuse sur une recette changée ailleurs (spec:596) | La même règle vaut au clic de la revue, variables comprises | DG-04 | S11 | 3 | Faible |
| M-017 | Spécification | `[ENT-03]` | Supprimer une palette laisse son cadre (spec:627) | Ses variables restent aussi ; « Supprimer les variables… » est un geste `danger` séparé et confirmé | DG-04 | S15 | 3 | Faible |
| M-018 | Spécification | `[ENT-04]` | Le plugin ne lit pas la sélection (spec:631) | Il la lit pour la rangée « Dans la sélection », la création préremplie et la rampe lue | DG-20, DG-06 | S16, S02 | 1 | Faible |
| M-019 | Spécification | `[ENT-07]` | Chaque champ affiche le nombre de palettes qu'il modifie (spec:726) | Et le nombre de couleurs déjà écrites qu'il change | DG-14 | S04 | 4 | Faible |
| M-020 | Spécification | `[ENT-12]` | Six cartes des Réglages communs (spec:735) | Une septième, repliée, « Collections des variables » | DG-19 | S04 | 4 | Faible |
| M-021 | Spécification | `[ENT-13]` | L'aperçu du nombre de nuances compte les cadres « À actualiser » (spec:728) | Et les variables créées et celles laissées sans palette | DG-08 | S14 | 3 | Faible |
| M-022 | Spécification | `[ENT-14]` | Le nombre d'intensités est libre (spec:669) | Libre seulement sans destination ; la destination le fixe | DG-03 | S22 | 2 | Faible |
| M-023 | Spécification | Nouvelle `[ENT-16]` | Aucune destination | « Destination dans Figma » : Aucune, Couleurs communes, Une marque ; famille ; aperçu de conversion ; refus d'une destination occupée | DG-03 | S22, S23 | 2 | Moyen |
| M-024 | Spécification | Nouvelle `[ENT-17]` | Aucun jeu de départ | « D'un jeu de départ » : couleurs communes, une ligne par marque, familles communes | DG-11 | S01 | 5 | Moyen |
| M-025 | Spécification | Nouvelle `[ENT-18]` | Aucune reprise d'une rampe | « De couleurs existantes » | DG-06 | S16 | 5 | Moyen |
| M-026 | Spécification | Nouvelle `[ENT-19]` | Aucune marque | Ajouter, renommer, retirer une marque dans Système ; limite de modes dite | DG-10 | S02, S13 | 4 | Moyen |
| M-027 | Spécification | `[PLA-06]` | « Générer sur Figma » porte sur une palette ; premier geste d'une fiche (spec:828) | « Dessiner le cadre » et « Redessiner le cadre », compacts, sans revue ; le résultat se lit dans Système | DG-09 | S19 | 1 | Faible |
| M-028 | Spécification | `[PLA-10]`, `[PLA-11]` | ◆ et ≈ sur les pastilles (spec:900) | ✎ sur une nuance retouchée, expliqué dans la note | DG-04 | S05 | 2 | Faible |
| M-029 | Spécification | `[PLA-14]` | Le nom de calque sert de clé à l'option des variables (spec:916) | Le nom de calque reste ; la variable suit sa destination, pas le calque | DG-19 | aucun | 3 | Faible |
| M-030 | Spécification | `[PLA-19]` | Empreinte du modèle du cadre (spec:988) | Elle couvre les retouches et la langue des planches | DG-04, DG-17 | S05 | 2 | Faible |
| M-031 | Spécification | `[PLA-24]` | Bilan d'une génération interrompue (spec:1022) | Un bilan commun aux deux sorties, par palette, cause en mots, message de Figma replié | DG-04 | S12, S13 | 3 | Moyen |
| M-032 | Spécification | `[PLA-27]` | Carte d'une palette supprimée, cadre seul (spec:838) | La carte compte aussi ses variables laissées | DG-04 | S15 | 3 | Faible |
| M-033 | Spécification | `[PLA-28]` | Cinq parties d'un cadre (spec:965) | `langue` s'ajoute, rangée dans la recette | DG-17 | aucun | 2 | Moyen : un catalogue anglais des planches |
| M-034 | Spécification | `[VER-01]`, `[VER-16]` | Rapport au format 3 (spec:1051, 1056 ; `plugin-palettes/src/rapport.ts:54`) | Format 4 : valeurs calculée et retouchée, distances par vision, paires proches à dessein, destinations | DG-04, DG-12, DG-13 | aucun | 2, 6 | Faible |
| M-035 | Spécification | `[VER-06]`, `[VER-07]` | Les garanties se jugent sur les rampes calculées (spec:1152, 1159) | Sur les rampes effectives | DG-04 | S05 | 2 | Faible |
| M-036 | Spécification | Section 11.3, « Palettes proches » | Toute paire se compare (spec:1197) | Deux marques différentes ne se comparent pas ; « Proches à dessein » | DG-12 | S20 | 2 | Faible |
| M-037 | Spécification | `[VER-15]` | Cibles du lien d'un message (spec:1257) | Ajouter la correction proposée ; ordre pour une palette calculée : « Ajuster la référence », puis la carte des réglages | DG-05 | S18 | 1 | Faible |
| M-038 | Spécification | Nouvelle `[VER-18]` | Rien ne compare la recette et Figma | Vérifier montre les valeurs de Figma différentes de la recette et les garanties avec elles | DG-02 | S05 | 3 | Moyen |
| M-039 | Spécification | `[UI-01]` | 770 × 720 (spec:1392) | 600 × 720, comme `plugin-palettes/src/fenetre.ts:8` | Écart relevé par la recherche | tous | 1 | Faible |
| M-040 | Spécification | `[UI-02]` | Deux onglets, Création et Palettes (spec:1404) | Trois onglets, Palette, Vérifier, Système ; ouverture | DG-01 | tous | 1 | Moyen |
| M-041 | Spécification | `[UI-03]` | Ce qui se lit sans défiler, sans barre qui recouvre (spec:1423) | Pied fixe hors du défilement, avec le bouton principal ; même règle de lecture | DG-01 | tous | 1 | Faible |
| M-042 | Spécification | `[UI-05]` | Premier geste de la fiche en bouton principal (spec:1533) | Aucun bouton principal dans une fiche ; « Appliquer à Figma… » dans le pied de Système | DG-01, DG-09 | S05 | 1 | Moyen |
| M-043 | Spécification | `[UI-06]` | Ouverture sans palette choisie, invitation sans geste (spec:1749) | Ouverture sur Système ; fichier vide : « D'où partez-vous ? » | DG-01, DG-11 | S01 | 1 | Moyen |
| M-044 | Spécification | `[UI-09]` | Carte des garanties dans l'onglet Création, repliée (spec:1548) | Dans Vérifier, ouverte quand une garantie manque | DG-01 | S16 | 1 | Faible |
| M-045 | Spécification | `[UI-10]` | Détail d'une nuance (spec:1592) | Valeur calculée et valeur retouchée, « Rétablir la valeur calculée » | DG-04 | aucun | 2 | Faible |
| M-046 | Spécification | `[UI-11]` | Configuration : Modèle, Intensités, « Référence exacte dans » (spec:1610) | Rangée Destination ; ligne d'état dans Figma sous le titre | DG-03, DG-02 | S03 | 2 | Moyen |
| M-047 | Spécification | `[UI-12]` | Cartes de réglage repliées sous l'aperçu (spec:1643) | Rampe témoin de 10 px en tête | DG-14 | S03 | 1 | Faible |
| M-048 | Spécification | `[UI-13]` | Sélecteur de couleur embarqué (spec:1719) | Rangée « Dans la sélection » | DG-20 | S02 | 1 | Faible |
| M-049 | Spécification | `[UI-14]` | Interface de test, dernière carte de Création (spec:1675) | « En contexte », dans Vérifier | DG-01 | S16 | 1 | Faible |
| M-050 | Spécification | `[UI-15]` | Ajuster la référence, depuis le code ou une garantie (spec:1693) | Aussi depuis la carte de correction d'une palette calculée | DG-05 | S18 | 1 | Faible |
| M-051 | Spécification | `[UI-16]` | Les planches restent en français (spec:1431) | Leur langue suit la recette | DG-17 | aucun | 2 | Faible |
| M-052 | Spécification | Nouvelle `[UI-17]` | Aucune revue | La revue : sorties, comptes, décisions, garanties, relecture au clic, Tab retenu | DG-04, DG-08 | S03, S05, S06 | 3 | Élevé |
| M-053 | Spécification | Nouvelle `[UI-18]` | Bilan d'un dessin seul | Le bilan des deux sorties et « Réessayer » | DG-04 | S13 | 3 | Moyen |
| M-054 | Spécification | Nouvelle `[UI-19]` | Onglet Palettes : fiches, cartes des palettes supprimées (spec:1410) | Vue du système : groupes, cases vides, modes hors du plugin, bandeau des valeurs de Figma, variables sans palette | DG-02 | S05, S09, S10 | 1, 4 | Moyen |
| M-055 | Spécification | Nouvelle `[UI-20]` | Aucun spécimen de statut | « Distinguer les statuts » | DG-13 | S20 | 6 | Faible |
| M-056 | Spécification | Nouvelle `[UI-21]` | Aucune correction | La carte de correction dans Vérifier : avant et après, puces, verrous, messages | DG-05 | S16, S17 | 5 | Moyen |
| M-057 | Spécification | `[UI-04]` | L'aperçu, onglets de thème et fond (spec:1497) | Inchangé ; « Comparer à » vit dans Vérifier | DG-12 | S20 | 2 | Faible |
| M-058 | Spécification | `[UI-07]`, `[UI-08]` | Demandes et messages (spec:1890) | Les messages de M-106 ; chaque résultat garde son numéro de demande | DG-04 | aucun | 1, 3 | Faible |
| M-059 | Spécification | `[ARC-11]` | Le sandbox calcule la planche depuis la recette rangée (spec:1997) | Il calcule aussi le plan des variables, depuis la recette rangée et les variables lues | DG-04 | aucun | 3 | Faible |
| M-060 | Spécification | `[ARC-12]` | Liste de motifs de la loi d'écriture (spec:2001) | Ajout de `createVariable`, `createVariableCollection`, `setValueForMode`, `addMode`, `renameMode`, `setVariableCodeSyntax`, `.scopes =`, `setSharedPluginData` sur une variable | DG-04 | aucun | 3 | Faible |
| M-061 | Spécification | `[ARC-13]` | Aucun fichier n'appelle `figma.variables` (spec:2008) | Deux fichiers seulement : `src/lectureDesVariables.ts` et `src/ecriture/variables.ts` | DG-04 | aucun | 3 | Faible |
| M-062 | Spécification | `[ARC-14]` | Trois portes d'écriture (spec:2013) | Une quatrième, « appliquer » | DG-04 | aucun | 3 | Faible |
| M-063 | Spécification | Section 14.1, carte des paquets | Fichiers actuels (spec:1904) | Les fichiers de M-076 à M-104 | DG-04 | aucun | 3 | Faible |
| M-064 | Spécification | Section 14.4, invariants | « Le plugin ne touche aucune variable » (spec:2026) | Les invariants de M-119 | DG-04 | aucun | 3 | Faible |
| M-065 | Spécification | Section 13.3, états de la galerie | 72 états (spec:1814) | Les états de M-110 | DG-01 à DG-21 | tous | 1 à 6 | Moyen |
| M-066 | Spécification | Section 15, les lots | Lots 0 à 9 (spec:2032) | Les lots de la section 10 de ce document | DG-18 | aucun | 1 | Faible |
| M-067 | Spécification | Section 16, recette dans Figma | Huit essais de la planche (spec:2057) | Seize essais des variables, section 5.1 | DG-04 | S24 | 3 | Faible |
| M-068 | Spécification | Section 17 | « Option ultérieure : créer les variables » (spec:2077) | « Sortie 3 : les variables », avec les règles de la section 5 | DG-04 | S01 | 3 | Moyen : une section entière |
| M-069 | Spécification | Section 18, risques | Six risques (spec:2096) | Le temps d'écriture, l'annulation, les données de plugin après publication, la limite de modes | DG-04 | aucun | 3 | Faible |
| M-070 | Spécification | `[ENT-11]` | « Référence exacte dans » avec deux intensités (spec:644) | Sous « Couleurs communes » avec une famille à deux intensités, et sans destination à deux intensités | DG-03 | S03 | 2 | Faible |
| M-071 | Recette | `couleur/src/recette.ts:24`, types `:68`, `:115` | `FORMAT_RECETTE = 6` | 7, et les types de M-012 | DG-03 | aucun | 2 | Moyen |
| M-072 | Recette | `couleur/src/recette.ts:509`, `RegleRecette` | Règles du format 6 | Règles de M-014 | DG-03 | S23 | 2 | Moyen |
| M-073 | Recette | `couleur/src/recette.ts:583`, `MIGRATIONS` | Migrations 1 à 5 | Migration 6 vers 7 : destination `aucune`, retouches vides, marques vides | DG-03 | aucun | 2 | Faible |
| M-074 | Recette | `recetteParDefaut` | Sans marque ni collection | `marques: []`, collections `primitives`, `brand`, `theme` | DG-19 | S01 | 2 | Faible |
| M-075 | Recette | Empreinte, `couleur/src/empreinte.ts` | JSON canonique et FNV-1a | Inchangée ; un test tient que la migration 6 vers 7 garde l'empreinte de chaque modèle de cadre | DG-04 | aucun | 2 | Faible |
| M-076 | Moteur | `couleur/src/palette.ts:297`, `rampesDe` | Rampes calculées ancrées | Retouches appliquées après l'ancrage ; `rampesCalculeesDe` nouvelle ; tests | DG-04 | S05 | 2 | Moyen |
| M-077 | Moteur | Nouveau `couleur/src/correction.ts` | Absent | `regularite`, `corrigerRampe` ; tests sur les six rampes de `[C3]` | DG-05 | S16 | 5 | Moyen |
| M-078 | Moteur | Nouveau `couleur/src/rampeLue.ts` | Absent | `lireUneRampe` ; tests du doublon et du thème non lu | DG-06 | S26 | 5 | Faible |
| M-079 | Moteur | Nouveau `couleur/src/vision.ts` | Absent (matrices dans `mesurer-vision-simulee.mjs`) | `simulerVision`, `distanceEnVision` ; tests contre les vecteurs de libDaltonLens ; loi de pureté | DG-13 | S20 | 6 | Faible |
| M-080 | Moteur | `couleur/src/alertes.ts:173`, `alertesDeRecette` | Toutes les paires | Paramètre des paires comparables et des paires voulues | DG-12 | S20 | 2 | Faible |
| M-081 | Moteur | `couleur/src/index.ts` | Porte du paquet | Exporte les modules de M-077 à M-079 | DG-05 | aucun | 2 | Faible |
| M-082 | Sandbox | Nouveau `plugin-palettes/src/variables/plan.ts` | Absent | Plan pur : cibles, noms à `/`, comparaison à trois valeurs, comptes ; tests | DG-04, DG-08 | S01 | 3 | Moyen |
| M-083 | Sandbox | Nouveau `plugin-palettes/src/lectureDesVariables.ts` | Absent | Lit collections locales, modes, variables et données du plugin, en un `Promise.all` | DG-04 | aucun | 3 | Moyen |
| M-084 | Sandbox | Nouveau `plugin-palettes/src/ecriture/variables.ts` | Absent | Crée collections, modes, variables, valeurs, alias, portées, syntaxe de code, données | DG-04 | S01 | 3 | Élevé |
| M-085 | Sandbox | Nouveau `plugin-palettes/src/ecriture/appliquer.ts` | Absent | Les cinq temps, la relecture au clic, un `commitUndo`, le bilan | DG-04 | S11, S13 | 3 | Élevé |
| M-086 | Sandbox | Suivi `ucm_palettes/variables` | Absent (suivi de la planche : `plugin-palettes/src/lecture.ts:18`) | Suivi versionné des collections, modes et variables | DG-04 | aucun | 3 | Moyen |
| M-087 | Sandbox | `plugin-palettes/src/lecture.ts:327`, `couleurDeLaSelection` | Relit une pastille dessinée | Suit `selectionchange`, rend une couleur par calque, huit au plus, et les calques ignorés | DG-20 | S02 | 1 | Faible |
| M-088 | Sandbox | `plugin-palettes/src/code.ts:54-66` | Trois portes d'écriture | Porte « appliquer » ; demande de lecture « preparer-revue », sans écriture | DG-04 | aucun | 3 | Faible |
| M-089 | Sandbox | `plugin-palettes/manifest.json` | Aucune permission | Inchangé : `currentuser` écartée | DG-16 | aucun | aucun | Aucun |
| M-090 | Sandbox | `plugin-palettes/src/preferences.ts` | Langue dans `clientStorage` | Palettes réglées sur ce poste, par document | DG-16 | S25 | 4 | Faible |
| M-091 | Interface | `plugin-palettes/src/ui/` onglets et pied | Deux onglets, pas de pied | Trois onglets, pied fixe, ouverture | DG-01 | tous | 1 | Moyen |
| M-092 | Interface | `ui/ongletPalettes.ts` | Onglet Création | Onglet Palette : destination, ligne d'état, pied « Vérifier » ; garanties et Interface de test déplacées | DG-01, DG-03 | S03 | 1, 2 | Moyen |
| M-093 | Interface | Nouveau `ui/ongletVerifier.ts` | Absent | Verdict, valeurs de Figma, correction, garanties, En contexte, Comparer à, pied | DG-01, DG-05 | S16, S18 | 1, 5 | Moyen |
| M-094 | Interface | `ui/ongletPlanche.ts` | Onglet Palettes | Onglet Système (M-054) | DG-02 | S05 | 1, 4 | Moyen |
| M-095 | Interface | Nouveau `ui/revue.ts` | Absent | La modale de revue | DG-04 | S05 | 3 | Élevé |
| M-096 | Interface | Nouveaux `ui/destination.ts`, `ui/conversion.ts` | Absents ; `ui/champs.ts` porte Modèle et Intensités | Rangée Destination et aperçu de conversion | DG-03 | S22 | 2 | Moyen |
| M-097 | Interface | Nouveaux `ui/depart.ts`, `ui/jeuDeDepart.ts`, `ui/rampeLue.ts` | `ui/creation.ts` seul | « D'où partez-vous ? », jeu de départ, couleurs existantes | DG-06, DG-11 | S01, S16 | 5 | Moyen |
| M-098 | Interface | Nouveau `ui/correction.ts` | Absent | Carte de correction | DG-05 | S16 | 5 | Moyen |
| M-099 | Interface | Nouveau `ui/statuts.ts` | Absent | Carte « Distinguer les statuts » | DG-13 | S20 | 6 | Faible |
| M-100 | Interface | `ui/couleur/` | Sélecteur embarqué | Rangée « Dans la sélection » | DG-20 | S02 | 1 | Faible |
| M-101 | Interface | `ui/configuration.ts` | Réglages communs | Comptes des couleurs écrites, carte Collections, aperçu des variables du nombre de nuances | DG-14, DG-19 | S04, S14 | 3, 4 | Moyen |
| M-102 | Interface | `ui/nuancier.ts` | ◆, détail d'une nuance | ✎, valeur calculée, « Rétablir la valeur calculée » | DG-04 | S05 | 2 | Faible |
| M-103 | Interface | `ui/reglagesDeLaPalette.ts`, `ui/derive/` | Sans rampe témoin | Rampe témoin | DG-14 | S03 | 1 | Faible |
| M-104 | Interface | `ui/gestesDeLaRecette.ts` | Dans la carte « Palettes et réglages » de l'onglet Palettes | Dans « Recette et rapport » de Système | DG-02 | S05 | 1 | Faible |
| M-105 | Interface | `ui/frontiere.ts` | Un rangement en vol, dessin après lui | L'écriture attend aussi le rangement ; un refus l'abandonne | DG-04 | S11 | 3 | Faible |
| M-106 | Frontière | `plugin-palettes/src/messages.ts:21`, `:50` | Demandes et messages actuels | Demandes `preparer-revue`, `appliquer` (identifiants, décisions, empreinte du plan) ; messages `etat` avec variables, `selection`, `plan`, `progression-application`, `bilan` | DG-04, DG-20 | aucun | 1, 3 | Moyen |
| M-107 | Planche et rapport | `plugin-palettes/src/planche/modele.ts`, `planche/textes.ts` | Planche en français, sans ✎ | ✎, catalogue anglais, langue de la recette | DG-04, DG-17 | aucun | 2 | Moyen |
| M-108 | Planche et rapport | `plugin-palettes/src/rapport.ts:54` | `FORMAT_DU_RAPPORT = 3` | 4 (M-034) | DG-04 | aucun | 2 | Faible |
| M-109 | Textes | `src/i18n/` français et anglais, `TEXTES-A-VALIDER.md` | Catalogues actuels | Les textes de la section 9 ; circuit de validation | DG-17, DG-21 | tous | 1 à 6 | Moyen |
| M-110 | Galerie | `plugin-palettes/galerie/etats.cjs` | 72 états | États : trois onglets, pied, départ, jeu, couleurs existantes, destination, conversion, correction (proposée, impossible, calculée), Système (groupes, case vide, mode hors plugin, bandeau, variables sans palette), revue (simple, retouches groupées, invalidée, homonyme), bilans, statuts, sélection, liaison | DG-01 à DG-21 | tous | 1 à 6 | Moyen |
| M-111 | Tests et lois | `plugin-palettes/tests/loiDEcriture.test.ts` | Motifs et `figma.variables` refusé partout | Motifs de M-060 ; `figma.variables` admis dans les deux fichiers de M-061 | DG-04 | aucun | 3 | Faible |
| M-112 | Tests et lois | Nouveaux tests `variablesPlan`, `appliquer`, `lectureDesVariables` | Absents | Plan, trois valeurs, relecture, bilan, reprise sans doublon | DG-04 | aucun | 3 | Moyen |
| M-113 | Tests et lois | `plugin-palettes/tests/figmaDeTest.ts` | Double du document pour la planche | Double des variables, modes et limite de modes | DG-04 | aucun | 3 | Moyen |
| M-114 | Tests et lois | `plugin-palettes/tests/interface/` | Tests Chromium des deux onglets | Trois onglets, pied, Tab retenu dans la revue, Échap sans écriture | DG-01, DG-04 | tous | 1, 3 | Moyen |
| M-115 | Tests et lois | `couleur/tests/` | Vecteurs et propriétés | Rampes effectives, correction, lecture, vision | DG-05, DG-13 | aucun | 2, 5, 6 | Moyen |
| M-116 | Contribution | `CONTRIBUTING.md` « Les surfaces d'UCM Palettes » (`CONTRIBUTING.md:250-330`) | Deux onglets ; « Nouvelle palette » bouton principal ; fiche à bouton principal | Trois onglets, pied, fiches sans bouton principal, revue, carte de correction, statuts | DG-01, DG-02 | tous | 1 | Moyen |
| M-117 | Contribution | `CONTRIBUTING.md` « La hiérarchie de l'information » | La règle des cartes décrit UCM Exporter | Inchangée ; une phrase pour le pied fixe d'UCM Palettes | DG-01 | aucun | 1 | Faible |
| M-118 | Agents | `AGENTS.md`, carte du code (`AGENTS.md:219-270`) | Fichiers actuels | Les fichiers nouveaux | DG-04 | aucun | 1 à 6 | Faible |
| M-119 | Agents | `AGENTS.md`, « Écriture d'UCM Palettes » (`AGENTS.md:998-1013`) | « Aucun fichier de src/ n'appelle figma.variables » ; trois portes | Deux fichiers admis ; quatre portes ; propriété par identifiant ; aucune suppression à l'actualisation ; relecture au clic | DG-04 | aucun | 3 | Moyen |
| M-120 | Agents | `AGENTS.md`, « Moteur de couleur » (`AGENTS.md:925-996`) | `rampesDe` et `ancrageDe` autorités | Les rampes effectives, la correction et la vision, sous la loi de pureté | DG-04, DG-05 | aucun | 2 | Faible |
| M-121 | Architecture | Section 2 (`ARCHITECTURE-FINALE-MULTIMARQUES.md:99-129`) | Chemins à points ; 45 variables par marque ; quatre utilitaires et deux familles | Noms Figma à `/` ; 46 variables par marque, une identité par famille ; familles ajoutées admises | DG-19, V5, V18 | S01, S22 | 2 | Faible |
| M-122 | Architecture | Section 3.4 (`:267-271`) | La couleur exacte hors de la rampe | L'identité vaut la couleur saisie avant ajustement ; elle est aussi au cran porteur quand rien n'est ajusté | DG-04 | S07 | 2 | Faible |
| M-123 | Architecture | Section 3.5 (`:290-301`) | La liste des crans retouchés est prévue | Elle existe : `retouches` du format 7 | DG-04 | S05 | 2 | Faible |
| M-124 | Architecture | Section 7 (`:389-391`) | Une colonne ajoutée recopie la première ; relire à la main | Le plugin écrit le mode d'une marque ; un mode ajouté hors du plugin se signale | DG-10 | S09 | 4 | Faible |
| M-125 | Documentation | `plugin-palettes/README.md:56` | « format 4 » ; deux onglets | Format 7 ; trois onglets ; les variables | DG-01, DG-04 | aucun | 2, 3 | Faible |
| M-126 | Documentation | `docs/README.md:96` | Ligne du dossier de l'intégration du marché | Inchangée ; la ligne de la spécification cite la sortie des variables quand M-068 est fait | DG-04 | aucun | 3 | Faible |
| M-127 | Documentation | `RECHERCHE-CONCURRENCE-PALETTES.md`, section 11 | Six écarts relevés | Écarts fermés par M-039, M-121, M-122, M-123, M-125 | DG-04 | aucun | 1 à 3 | Faible |
| M-128 | Documentation | [README.md](../README.md) de ce dossier | Ligne 06 « En cours » | Lien vers ce document, statut « À valider » | Mission | aucun | fait | Faible |

**Contrôle 1 : chaque décision renvoie à au moins une modification.**
DG-01 : M-040 à M-044, M-091. DG-02 : M-038, M-054, M-094. DG-03 : M-002,
M-022, M-023, M-096. DG-04 : M-001, M-052, M-085. DG-05 : M-008, M-009,
M-077. DG-06 : M-010, M-025. DG-07 : aucune modification dans les lots 1 à 6 ;
la liaison attend sa décision, et le lot 7 ajoutera les siennes. DG-08 :
M-021, M-052, M-082. DG-09 : M-027. DG-10 : M-026, M-124. DG-11 : M-024.
DG-12 : M-036, M-080. DG-13 : M-011, M-055, M-079. DG-14 : M-019, M-047.
DG-15 : M-004. DG-16 : M-089, M-090. DG-17 : M-033, M-051. DG-18 : M-066.
DG-19 : M-020, M-121. DG-20 : M-018, M-048, M-087. DG-21 : M-109.

**Contrôle 2 : chaque constat de la revue critique renvoie à une modification
ou à un refus motivé.** La [section 13](#13-les-retours-de-la-revue-critique)
donne, pour chacun, la modification ou la raison du refus.

## 9. Les textes

Chaque texte nouveau ou changé de l'interface. Tous passent par
[TEXTES-A-VALIDER.md](../../Textes et langues/TEXTES-A-VALIDER.md) ; l'anglais est la langue
d'ouverture (`[UI-16]`).

| Écran | Français | Anglais |
|---|---|---|
| Onglets | Palette · Vérifier · Système | Palette · Check · System |
| Palette, fichier vide | D'où partez-vous ? | Where do you start from? |
| Palette, fichier vide | D'une couleur · De couleurs existantes · D'un jeu de départ | From a colour · From existing colours · From a starter set |
| Palette, configuration | Destination dans Figma | Destination in Figma |
| Palette, configuration | Aucune · Couleurs communes · Une marque · Mes variables | None · Shared colours · A brand · My variables |
| Palette, configuration | Autre famille… | Other family… |
| Palette, ligne d'état | Cadre à jour · 23 couleurs à écrire | Frame up to date · 23 colours to write |
| Palette, ligne d'état | Appliquer cette palette… · Dessiner le cadre | Apply this palette… · Draw the frame |
| Palette, conversion | Changer la destination | Change the destination |
| Palette, conversion | Soft disparaît : l'architecture donne une intensité à une rampe de marque. | Soft goes away: the architecture gives a brand ramp one intensity. |
| Palette, refus | primary est déjà la famille de Bleu A dans Marque A. | primary is already Bleu A's family in Marque A. |
| Palette, pied | Vérifier | Check |
| Création, sélection | Dans la sélection | In the selection |
| Couleurs existantes | Votre charte #D97706 est votre 600. Sa clarté la range au 500 : la palette la porte au 500. | Your brand colour #D97706 is your 600. Its lightness places it at 500: the palette carries it at 500. |
| Couleurs existantes | Thème Dark : rampe calculée, aucune nuance lue. | Dark theme: computed ramp, no shade read. |
| Jeu de départ | Crée 9 palettes dans la recette du fichier. Rien ne s'écrit dans les variables ni sur la planche avant « Appliquer à Figma… ». | Creates 9 palettes in the file's recipe. Nothing is written to variables or to the board before "Apply to Figma…". |
| Vérifier, verdict | 4 garanties manquées, Thème Light | 4 guarantees missed, Light theme |
| Vérifier, Figma | Figma porte 1 valeur différente de la recette. Les composants la voient. | Figma holds 1 value that differs from the recipe. Components see it. |
| Vérifier, correction | Correction proposée : rétablir 6 nuances sur 10 | Suggested fix: restore 6 shades out of 10 |
| Vérifier, correction | La plus petite correction rendrait les garanties mais casserait la forme de la rampe : elle est écartée. | The smallest fix would restore the guarantees but break the ramp's shape: it is set aside. |
| Vérifier, correction | Aucune correction ne rend ces garanties tant que vous gardez votre 700. | No fix restores these guarantees while you keep your 700. |
| Vérifier, correction | Aucune correction régulière ne garde vos nuances. · Reprendre la rampe calculée | No regular fix keeps your shades. · Use the computed ramp |
| Vérifier, calculée | Aucune nuance à rétablir | No shade to restore |
| Vérifier, pied | Appliquer cette palette… | Apply this palette… |
| Système, titre | 9 palettes · 2 marques | 9 palettes · 2 brands |
| Système, bandeau | 1 valeur de Figma diffère de la recette, dans Rouge. Rien ne s'écrit sans votre décision. · Relire… | 1 Figma value differs from the recipe, in Rouge. Nothing is written without your decision. · Review… |
| Système, case vide | secondary manque dans Marque B | secondary is missing in Marque B |
| Système, mode | Mode « Marque C », créé hors du plugin · Suivre ce mode… | Mode "Marque C", created outside the plugin · Track this mode… |
| Système, supprimée | Vert, supprimée : son cadre et ses 66 variables restent dans Figma. · Supprimer les variables… | Vert, deleted: its frame and its 66 variables remain in Figma. · Delete the variables… |
| Système, pied | Appliquer à Figma… (4) | Apply to Figma… (4) |
| Système, fiche | Redessiner le cadre | Redraw the frame |
| Système, section | Recette et rapport | Recipe and report |
| Revue | Appliquer à Figma | Apply to Figma |
| Revue | 23 couleurs changent dans Figma et 1 cadre est redessiné. | 23 colours change in Figma and 1 frame is redrawn. |
| Revue | Adopter #DC2626 dans la recette · Remettre #B61D1D dans Figma | Adopt #DC2626 into the recipe · Put #B61D1D back in Figma |
| Revue | Adopter #D42020 comme nouvelle référence de Rouge | Adopt #D42020 as Rouge's new reference |
| Revue | Adopter #1A6BD6 comme couleur de charte | Adopt #1A6BD6 as the brand colour |
| Revue | Reprendre #15803D de Figma dans la recette · Remplacer par la recette | Take #15803D from Figma into the recipe · Replace with the recipe |
| Revue | Sans choix, cette valeur ne s'écrit pas : Figma et la recette gardent chacun la leur. | Without a choice, this value is not written: Figma and the recipe each keep their own. |
| Revue | 1 valeur non décidée : elle ne s'écrit pas. | 1 undecided value: it is not written. |
| Revue | Le fichier a changé depuis l'ouverture de cette revue. Rien n'a été écrit. | The file changed since this review opened. Nothing was written. |
| Revue | Une collection « primitives » existe, créée hors du plugin. · Reprendre cette collection · Choisir un autre nom… | A "primitives" collection exists, created outside the plugin. · Take over this collection · Choose another name… |
| Revue | Réglée sur un autre poste depuis la dernière écriture | Changed on another machine since the last write |
| Revue | Police Inter Semi Bold indisponible sur ce poste : la planche ne se dessine pas, les variables restent possibles. | Inter Semi Bold is not available on this machine: the board cannot be drawn, variables can still be written. |
| Bilan | Écriture terminée · Écriture incomplète · Réessayer | Write complete · Write incomplete · Retry |
| Bilan | Figma refuse de créer le mode Marque K : brand a atteint 10 modes, le nombre que l'offre du fichier admet. | Figma refuses to create the Marque K mode: brand has reached 10 modes, the number the file's plan allows. |
| Réglages communs | 87 couleurs déjà écrites dans Figma changent, en 4 palettes. | 87 colours already written in Figma change, in 4 palettes. |
| Réglages communs | Collections des variables | Variable collections |
| Statuts | Distinguer les statuts | Tell statuses apart |
| Statuts | Simulation d'une dichromacie complète. Elle ne prouve pas la lisibilité d'un composant. Un statut ne se porte pas par la couleur seule. | Simulation of complete dichromacy. It does not prove a component is legible. A status is never carried by colour alone. |
| Suppression | Les calques liés à ces variables perdront leur lien. | Layers bound to these variables will lose their binding. |
| Aide | Destination dans Figma : où la palette écrit ses variables. Le choix fixe ses intensités. | Destination in Figma: where the palette writes its variables. The choice sets its intensities. |

## 10. Les lots

| Lot | Contenu | Prérequis | Essais dans Figma avant le lot |
|---|---|---|---|
| 1. L'organisation | Trois onglets et pied (M-040 à M-044, M-091 à M-094), vue du système sans variables, dessin court (M-027), Vérifier avec les liens des palettes calculées (M-037, M-050), « Comparer à », rampe témoin, couleur de la sélection (M-018, M-048, M-087), correction de `[UI-01]`, aides. La planche reste la seule sortie ; la recette ne change pas | Aucun | Essai 6 : la couleur d'une peinture liée à une variable |
| 2. Le format 7 et la destination | Recette 7 et migration, destination et conversion, marques dans la recette sans écriture, rampes effectives et ✎, portée des palettes proches et « Proches à dessein », langue des planches, rapport 4 | Lot 1 | Aucun |
| 3. Une famille commune écrite | `primitives` et `theme` pour un utilitaire et le neutre : plan, revue, trois valeurs, provenance, relecture, cinq temps, bilan, reprise, annulation, collection homonyme, variables sans palette, loi d'écriture | Lot 2 ; décision DG-04 | Essais 1 à 5, 8, 9, 10, 12, 13, 14, 16 |
| 4. Les marques | `brand`, modes, identité, cases vides, mode hors du plugin, ajouter, renommer, retirer une marque, limite de modes, revue du système, comptes des Réglages communs, trace des postes | Lot 3 | Essais 7 et 11 |
| 5. Reprendre et corriger | « D'où partez-vous ? », jeu de départ, couleurs existantes, correction proposée et verrous | Lot 4 pour le jeu à marques ; lot 2 pour les retouches | Aucun |
| 6. Les statuts | Vision simulée, carte des statuts, distances du rapport | Lot 4, qui désigne les marques | Aucun |
| 7. Mes variables | Liaison à des variables existantes, si DG-07 est validée | Lot 3 éprouvé dans Figma | Essais 8 et 14 sur des variables du fichier |
| 8. Les fonds lus sur le neutre | Si DG-15 est validée | Lot 3 | Aucun |

## 11. L'essai du mainteneur

Le mainteneur, seul testeur, essaie d'abord la maquette, puis le plugin à la
fin des lots 1, 3 et 4, et de chaque lot suivant pour ses tâches. Fenêtre à
600 × 720, puis à 500 × 520 ; thème clair, puis sombre.

**Le geste de prédiction.** Avant chaque clic qui écrit, le mainteneur note
ce qui va changer : dans la recette, dans les variables, sur la planche, dans
les trois unités. Après le clic, il compare au bilan, au journal de la
maquette, puis au panneau des variables de Figma. Un écart est un défaut de
l'interface, même quand l'écriture est juste.

**Les tâches du parcours nominal.**

1. Créer un design system à deux marques depuis un fichier vide (S01).
2. Ajouter une troisième marque (S02).
3. Changer la couleur d'une marque et l'appliquer (S03).
4. Changer un réglage commun, puis écrire tout le système (S04).
5. Redessiner une planche sans toucher aux variables (S19).
6. Reprendre une palette faite à l'œil et la corriger (S16).

**Les tâches des cas limites**, une par cas : C01 (S11, la valeur qui bouge),
C02 (S08), C03 (S11), C04 (S12, puis S13), C05 (S10), C06 (S09), C07 (S07),
C08 (S06, décider trois retouches dont une qui fait manquer une garantie et
dire avant le clic la valeur qui restera dans Figma), C09 (S14, S15 et S22),
C10 (S23), C11 (S24).

**Ce qui se note.** Le nombre de gestes, les changements d'onglet, chaque
écran où le geste suivant a été cherché, chaque écart de prédiction, chaque
écriture non voulue.

**Les critères.**

- aucune écriture non voulue, dans aucune tâche ;
- aucun écart de prédiction aux tâches C01, C03, C07 et C08 ;
- écrire tout le système se fait depuis l'écran d'ouverture, sans défiler ;
- régler une palette puis l'écrire tient en trois gestes, par le lien de la
  ligne d'état ;
- ajouter une marque ou une famille manquante se fait depuis Système, sans
  ouvrir les Réglages communs ni le menu « … » ;
- chaque texte d'un écran nouveau se relit une semaine après son écriture,
  selon le circuit de TEXTES-A-VALIDER, et chaque mot à s'expliquer se note.

Un critère manqué rouvre la décision qu'il touche : les deux premiers DG-04
et DG-21, les deux suivants DG-01, le cinquième DG-02 et DG-10.

**La limite de l'essai.** Le mainteneur connaît le vocabulaire du plugin : un
libellé obscur pour un autre designer ne le gênera pas.

## 12. Ce qui reste écarté, et ce qui reste à prouver

**Écarté.**

| Idée | Origine | Raison |
|---|---|---|
| Deux onglets Système et Palette | Proposition finale, V0 | L'onglet Palette passerait de 11 à 15 objets avec la vérification et la correction |
| Des onglets numérotés comme des étapes | Trois étapes | Le travail boucle entre régler et juger |
| Nommer le troisième onglet « Appliquer » | Revue critique | L'onglet d'ouverture montre un état avant de demander un geste ; le verbe reste sur le bouton |
| « Distinguer les statuts » dans Vérifier | Trois étapes | La confusion entre statuts est une question du système |
| La destination sans contraintes | Atelier, trois étapes | Elle laisse saisir une palette de marque à deux intensités |
| Le rôle en quatre segments | Proposition finale, V1 | La destination porte les mêmes contraintes, choisie après la couleur |
| La correction la plus petite sans critère de forme | Trois étapes | Elle rend 1,01:1 et 2,07:1 entre voisines |
| Des bornes lues sur la seule rampe calculée | Revue critique | Elles refusent 5 pas sur 10 de la rampe du designer avant correction |
| « Garder la couleur de Figma » | Trois étapes | Le libellé tait l'effet sur la recette |
| La permission `currentuser` | Revue critique, section 10 | Elle ne dit pas l'auteur d'une valeur, et un nom rangé dans le document se lit par tout plugin |
| Un premier lot sans `theme` | Proposition initiale | Rien de liable |
| « Mes variables » dans les premiers lots | Trois étapes | Hors de l'architecture, coût élevé, avant l'écriture des trois collections éprouvée |
| Supprimer une variable à l'actualisation | Proposition initiale | Les calques liés perdraient leur lien |
| Exporter du code, APCA, Display P3, table des emplois réglable | Recherche, sections 4 à 6 et 9 | Les raisons de la recherche tiennent |

**À prouver dans Figma.** Les seize essais de la section 5.1, dont ceux qui
changent une règle s'ils échouent :

- **essai 1 et 12** : si un seul `commitUndo` ne défait pas recette, variables
  et cadre ensemble, l'écriture garde un `commitUndo` par sortie et le bilan le
  dit ;
- **essai 2** : si `createVariable` accepte un nom déjà pris, le plugin cherche
  d'abord le nom dans la collection avant de créer ;
- **essai 3** : la maquette suppose que Figma recopie la première valeur dans
  les autres modes d'une variable neuve ; une autre valeur change seulement le
  texte de la case vide ;
- **essai 4** : si la donnée de plugin ne survit pas à une copie du fichier,
  toutes les valeurs de la copie sont sans provenance, et la revue les groupe
  en une décision ;
- **essai 5** : au-delà de dix secondes pour 716 valeurs, l'écriture annonce sa
  progression par collection, comme le dessin ;
- **essai 9** : la règle des noms à `/` ;
- **essai 10** : la forme de la syntaxe de code Web ;
- **essai 13** : la relecture au retour du focus suffit à voir une retouche
  faite pendant que le plugin est ouvert.

**À prouver sur la maquette.** Que le parcours se comprend sans aide : c'est
l'objet de l'essai du mainteneur, section 11.

## 13. Les retours de la revue critique

| Constat ou recommandation | Réponse | Où |
|---|---|---|
| Verdict 1 : les cas difficiles n'ont pas d'écran | Adopté : onze cas, chacun avec sa règle, son écran et son scénario | Section 6, S05 à S15, S22 à S24 |
| Verdict 2 : la vue du système a disparu | Adopté : l'onglet Système | DG-02, M-054 |
| Verdict 3 : la correction abîme la rampe | Adopté, avec un autre critère que celui proposé | DG-05, section 4.4, M-008, M-009 |
| Verdict 4 : la destination sans contraintes | Adopté | DG-03, M-023 |
| Section 1, les onze cas limites | Adoptés | Section 6 |
| Section 1, « remplace les décisions précédentes » ambigu | Adopté : chaque règle d'écriture dit si elle est reprise ou modifiée | Section 5 |
| Section 2, état des cadres, « Afficher dans Figma », garanties côte à côte, palette supprimée, export et import, rapport, résultat d'un dessin | Adopté : chaque fonction a sa place dans Système | Section 4.5, M-054, M-104 |
| Section 2, une retouche invisible avant Appliquer | Adopté : bandeau de Système, pastille, valeurs de Figma dans Vérifier | M-038, S05 |
| Section 3, rampe à 1,01:1 et 2,07:1 | Adopté | `[C1]`, `[C2]` |
| Section 3, une palette calculée n'a rien à rétablir | Adopté : liens ordonnés, mesure du moteur | Section 4.4, S18, M-037 |
| Section 3, verdict « Après » écrit en dur | Adopté : chaque résultat se calcule dans la maquette | Maquette, S16 |
| Section 3, algorithme glouton | Adopté : recherche exhaustive | M-009 |
| Section 3, la charte sur un autre cran | Adopté | S26, M-010 |
| Section 3, la rampe lue sur un seul thème | Adopté | Section 4.4, M-010 |
| Section 4, où se choisissent les intensités | Adopté : la destination les fixe, libres sans destination | DG-03, M-022 |
| Section 4, comment rejoindre `primitives` | Adopté : « Couleurs communes » | DG-03 |
| Section 4, palette à deux intensités vers une marque | Adopté : aperçu de conversion | S22 |
| Section 5, « Dans mes variables » promu | Adopté : lot 7, à discuter | DG-07 |
| Section 5, ordre des lots et décisions retirés | Adopté : décisions numérotées et lots | Sections 7 et 10 |
| Section 5, cas propres à « Mes variables » | Adopté : alias jamais remplacé, bibliothèque distante non écrite, motif qui trouve une autre palette refusé | S21, section 5.1 |
| Section 6, le travail boucle | Adopté : pas de numéros | DG-01 |
| Section 6, portée des étapes | Adopté : Palette et Vérifier sur la palette ouverte, Système sur le fichier, sans sélecteur | DG-01 |
| Section 6, dessin seul en quatre gestes | Adopté : un geste | DG-09, S19 |
| Section 6, la règle des surfaces change | Adopté | M-116 |
| Section 7, unité floue | Adopté | DG-08 |
| Section 7, six chiffres en dur | Adopté : aucun nombre de la maquette n'est écrit en dur ; les comptes sortent du plan | Maquette, `[N2]` à `[N6]` |
| Section 7, Bleu A sans provenance ou à créer | Adopté : S16 part d'un fichier où la famille primary de Marque A n'a pas de palette, et ses 23 valeurs recopiées se décident | S16 |
| Section 8, le libellé « Garder » | Adopté | DG-21 |
| Section 9, maquettes coupées, 520 px | Adopté : cadre réel, défilement, contrôle Playwright | Section 4.1, vérification |
| Section 10, palettes proches et marque inconnue | Adopté : une palette sans marque se compare à toutes ; « Proches à dessein » ; une page qui montre plusieurs marques côte à côte se traite par ce geste | DG-12 |
| Section 10, plusieurs designers | Adopté | DG-16 |
| Section 10, effet d'un réglage commun | Adopté | DG-14, S04 |
| Section 10, rampe témoin | Adopté | M-047 |
| Section 10, fonds lus sur le neutre | Reportés, à discuter | DG-15 |
| Section 10, statuts palette par palette | Adopté : dans Système | DG-13 |
| Section 10, essai sans cas limite | Adopté : une tâche par cas | Section 11 |
| Recommandation 1, trois onglets sans numéros | Adopté, avec le nom Système | DG-01 |
| Recommandation 2, Appliquer comme vue du système | Modifié : la vue s'appelle Système ; « Appliquer à Figma… » est son bouton | DG-01, DG-02 |
| Recommandation 3, les règles d'écriture tiennent | Adopté | DG-04 |
| Recommandation 4, les contraintes du rôle | Adopté | DG-03 |
| Recommandation 5, borner la correction | Adopté, critère modifié | DG-05 |
| Recommandation 6, sortir « Dans mes variables » | Adopté | DG-07 |
| Recommandation 7, l'unité | Adopté | DG-08 |
| Recommandation 8, le dessin seul | Adopté | DG-09 |
| « Avant de lancer » 1 et 2 : compléter la page, prototype interactif | Adopté | La maquette, 26 scénarios |
| « Avant de lancer » 3 : jouer l'essai, trois tâches de cas limites | Adopté, étendu à onze | Section 11 |
| Réponses aux trois questions | Trois onglets : oui ; « Dans mes variables » : lot 7 ; corriger nuance par nuance : oui, par les verrous | DG-01, DG-07, DG-05 |

## 14. Sources

**Figma.**
[Typings de l'API des plugins](https://github.com/figma/plugin-typings),
version 1.138 installée dans le dépôt ;
[commitUndo](https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/) ;
[Working with variables](https://developers.figma.com/docs/plugins/working-with-variables/) ;
[Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) ;
[What's new from Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025) ;
[Create and manage variables and collections](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables-and-collections) ;
[Review and accept library updates](https://help.figma.com/hc/en-us/articles/360039234193-Review-and-accept-library-updates) ;
[guide des variables du serveur MCP de Figma](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-use/references/variable-patterns.md) ;
[forum, données de plugin sur un style publié](https://forum.figma.com/t/custom-data-on-effectstyle-using-setplugindata-not-working-when-published/14915) ;
[forum, caractères d'un nom de variable](https://forum.figma.com/archive-21/allow-special-characters-in-variable-names-34964) ;
[Slint, export des variables Figma](https://docs.slint.dev/latest/docs/slint/guide/tooling/figma-inspector/).

**Revue et conflits.**
[Tokens Studio, push et pull](https://docs.tokens.studio/token-storage/remote-push-pull-changes) ;
[Tokens Studio, demande de fusion entre branches](https://feedback.tokens.studio/p/git-sync-enhancements) ;
[Tokens Studio, remap et « Apply to »](https://docs.tokens.studio/debug/remap-tokens) ;
[Visual Studio Code, conflits de fusion](https://code.visualstudio.com/docs/sourcecontrol/merge-conflicts) ;
[Material Theme Builder](https://github.com/material-foundation/material-theme-builder).

**Rampes.**
[Leonardo, contrast-colors](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md) et
[issue 77](https://github.com/adobe/leonardo/issues/77) ;
[Harmonizer](https://github.com/evilmartians/harmonizer) ;
[Huetone](https://github.com/ardov/huetone) ;
[Stripe, accessible color systems](https://stripe.com/blog/accessible-color-systems) ;
[Matt Ström-Awn, generating color palettes](https://mattstromawn.com/writing/generating-color-palettes/) ;
[Radix, understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).

**Vision.** [DaltonLens](https://daltonlens.org/opensource-cvd-simulation/) ;
[WCAG 2.2, critère 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

**Dépôt.** [La comparaison avec le marché](../../1 Recherche initiale/RECHERCHE-CONCURRENCE-PALETTES.md),
[la proposition initiale](../01%20Proposition%20initiale/PROPOSITION-INITIALE.md),
[la revue de l'atelier](../02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html),
[la proposition finale](../03%20Proposition%20finale/PROPOSITION-FINALE.md),
[la proposition en trois étapes](../04%20Parcours%20en%20trois%20%C3%A9tapes/PROPOSITION-TROIS-ETAPES.html),
[la revue critique](../05%20Revue%20critique/REVUE-CRITIQUE-TROIS-ETAPES.md).

## 15. Annexe : vérifications

| Affirmation | Preuve |
|---|---|
| La fenêtre s'ouvre à 600 × 720, minimum 500 × 520 | `packages/plugin-palettes/src/fenetre.ts:8`, `:22` |
| La spécification dit encore 770 × 720 | spec:1392 |
| Le plugin n'appelle aucune API de variables | `AGENTS.md:1009-1011` ; spec:2008 |
| Le corps garde 596 px et 396 px sous en-tête, onglets et pied | `[H]` |
| Chaque écran, ses blocs et ce qui se lit sans défiler | `[E]` |
| 108 contrôles Chromium réussis : 26 scénarios et la modale, 4 combinaisons | `verifier-maquette-direction-globale.mjs` |
| Bleu A : 10 nuances reprises, 4 garanties manquées, 0 pour la rampe calculée ; 100, 200, 300 sans critère | `[C1]` |
| 1,01:1 et 2,07:1 entre voisines après la correction sans critère | `[C1]` |
| Pas 0,006 pour 0,014 ; 0,216 pour 0,140 | `[C1]` |
| La correction régulière rétablit 50 à 500 et garde 700 à 950 | `[C2]` |
| Un critère borné sur la seule rampe calculée refuse 5 pas sur 10 de la rampe lue | `[C5]` |
| Les six rampes de la mesure | `[C3]` |
| Orange A, 700 verrouillé : 4 garanties manquées, paires 1, 2, 5, 15 | `[C3]` |
| Vert : paires 9 et 13 à 2,92:1 ; −2 pas donnent `#029D44` et 0 garantie manquée ; la saturation n'y change rien | `[C4]` |
| 365 variables et 716 valeurs à 11 nuances et six marques ; 299 et 588 ; 431 et 844 | `[N1]` |
| Le système de démonstration : 365 variables, 532 valeurs, 9 cadres | `[N2]` |
| Une marque ajoutée : 1 mode, 0 variable, 46 valeurs, 2 cadres | `[N3]` |
| Soft à 0,50 : 87 valeurs, 4 palettes, `primitives` seule, aucune garantie changée | `[N4]` |
| 11 vers 13 nuances : 66 variables, 96 valeurs ; retour : 66 laissées | `[N5]` |
| Une référence changée : 23 valeurs de `brand` | `[N6]` |
| Rouge : 700 retouché, 2 garanties manquées à 4,14:1 et 4,47:1 ; trois retouches, 2 ; 700 remis, 0 | `[T1]` |
| Rouge, ◆ adopté `#D42020` : 9 nuances changent, 0 garantie manquée | `[T2]` |
| La table des trois valeurs | `[T3]` |
| Palettes proches : Ambre et Orange A 0,026 ; Azur et Bleu A 0,041 ; Azur et Bleu B 0,032 ; Bleu A et Bleu B 0,040, deux marques | `[P1]` |
| Vision : Orange A et Ambre 0,014 en deutéranopie ; Rouge et Ambre 0,015 | `[P2]` |
| `variableCollectionId` en lecture seule | api:11768 |
| `addMode` et son message de limite | api:12017, 12022 |
| Les portées ne règlent que les sélecteurs | api:11905 |
| `documentchange` ne signale aucune variable, et demande `loadAllPagesAsync` | api:562 à 599 |
| `currentUser` demande la permission `currentuser` | api:125 |
| Données de plugin : 100 ko, perdues si l'identifiant change | api:6386, 6397 |
| Collections étendues réservées à Enterprise | api:2205, 12002 |
| Starter limité à un mode | api:11791 |
| Professional 10 modes, Organization 20 | Schema 2025 |
| Un mode ajouté recopie la première colonne | Figma Learn, Modes for variables |
| Figma refuse le point dans un nom de variable | Forum de Figma, documentation Slint ; essai 9 |
| UCM Exporter joint les segments par des points | `packages/kit/src/format/names.ts:3`, `packages/plugin-exporter/src/variables.ts:78` |
| La recette est au format 6, le rapport au format 3 | `packages/couleur/src/recette.ts:24`, `packages/plugin-palettes/src/rapport.ts:54` |
| Une police absente arrête le dessin avant tout calque | `packages/plugin-palettes/src/ecriture/planche.ts:287-293` |
| Le rangement de la recette a son propre `commitUndo` | `packages/plugin-palettes/src/ecriture/recette.ts:37` ; `[REC-06]` |
