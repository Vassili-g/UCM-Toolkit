# Usages indexés et contraste

La suite de cette étude, et la place de chaque document dans l'histoire de
la collection `usage`, sont dans [Collection usage](../README.md).

Cette étude examine comment choisir plusieurs associations de couleurs sans
lier chaque choix à un état de composant. Elle reste une proposition de
recherche ; l’architecture et les formats publiés ne sont pas modifiés.

## Conclusion de l’étude

Séparer les niveaux de couleur des états du composant, puis publier leurs
partenaires dans un catalogue partagé. Les indices peuvent servir au nommage,
mais leur égalité ne constitue aucune preuve de contraste.

Les mesures sur six références synthétiques couvrent 36 contextes de palette.
Douze des seize couples texte/surface atteignent 4,5:1 dans tout cet
échantillon. Une règle limitée aux quatre couples de même indice écarterait
donc plusieurs choix mesurés. Les palettes réelles devront être évaluées avant
de publier ces relations.

Deux limites actuelles demandent une attention particulière : un contour et
un focus verts échouent à 2,918:1 sur leur surface ; le diagnostic des emplois
ne recalcule pas systématiquement les paires reconnues. Les preuves et leurs
limites figurent dans les expériences.

Commencer par un catalogue consultable sur les noms actuels. Éprouver ensuite
le nommage indexé et la migration sur quelques composants. La génération des
collections multi-marques reste un chantier distinct.

## Analyse complémentaire

La [présentation](../2%20Escalier/PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html) reprend l'étude avec
l'étude [Modes et affichage global](../../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md).
Elle propose une règle à la place du catalogue : un premier plan de niveau n se
pose sur toute surface de niveau inférieur ou égal à n. Sur vingt palettes et
deux thèmes, le texte tient 4,5:1 dans les 8 000 croisements de cette règle.
Elle recommande de renommer les rangs en niveaux avant qu'UCM Palettes écrive
`usage`, et de corriger d'abord le diagnostic de `ucm check`. Pour le texte des
boutons en sombre, elle reprend la solution S2 de l'étude Modes.

## Les ensembles

Le mainteneur a jugé la règle de l'escalier trop savante pour un designer.
La proposition suivante range chaque fond avec ses partenaires dans un même
dossier, par exemple `primary/surface-2/background`, `…/text` et `…/border` :
tout ce qui se prend dans le dossier d'un fond tient son contraste.
[ENSEMBLES-DANS-FIGMA.html](../3%20Ensembles/ENSEMBLES-DANS-FIGMA.html) reprend le panneau de
la [vue illustrée](../../VUE-ILLUSTREE-MULTIMARQUES.html) et y remplace `usage`
par les ensembles, en regard de l'architecture validée. Il montre ce que
cela change dans `theme` et `components`, au format des décisions D1 à D17.
Il les éprouve ensuite sur six composants et neuf cas limites, et montre
trois options pour le texte du neutre. Ses couleurs viennent de
[generer-ensembles.ts](../3%20Ensembles/generer-ensembles.ts). Il suit la proposition de
l'étude Modes pour le texte des boutons.

## Documents

- [Demande et piste initiale](./PISTE-USAGES-INDEXES-ET-CONTRASTE.md).
- [État du code et contraintes](./01-ETAT-ET-CONTRAINTES.md).
- [Solutions externes et sources](./02-SOLUTIONS-ET-SOURCES.md).
- [Modèle proposé et choix d’architecture](./03-MODELE-PROPOSE.md).
- [Expériences et résultats](./04-EXPERIENCES.md).
- [Script de mesures](./mesurer-associations.ts) et [données calculées](./resultats-mesures.json).
- [Intégration, migration et critères de décision](./05-INTEGRATION.md).
- [Présentation des niveaux, des partenaires et du texte des boutons](../2%20Escalier/PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html),
  à ouvrir dans un navigateur ; [generer-presentation.ts](../2%20Escalier/generer-presentation.ts)
  y écrit les rampes du moteur.
- [La collection usage en ensembles](../3%20Ensembles/ENSEMBLES-DANS-FIGMA.html), à ouvrir dans un navigateur ;
  [generer-ensembles.ts](../3%20Ensembles/generer-ensembles.ts) y écrit les rampes du moteur.
- [Mesures de l'escalier et du texte des boutons](../2%20Escalier/mesurer-polarites.ts) et [données calculées](../2%20Escalier/resultats-polarites.json).

## Périmètre

La recherche porte sur les associations de contraste, leur nommage, la
séparation des états, leur publication et leur lecture dans Figma et la CI.
Les calculs de recherche restent dans ce dossier.

Le document initial conserve la demande originale. Ses liens relatifs sont
adaptés à son nouvel emplacement.
