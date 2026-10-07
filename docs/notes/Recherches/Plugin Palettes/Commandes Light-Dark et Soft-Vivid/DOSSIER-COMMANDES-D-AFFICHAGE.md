# Commandes Light/Dark et Soft/Vivid : dossier de recherche

**Statut :** implémenté (phases 1 à 3 et 5). La phase 4 attend la décision du
mainteneur sur la section 4.

## En bref

**Validé par le mainteneur :**

1. Un seul bouton Light/Dark, dans la barre de la palette, visible pendant le
   défilement (modèle A).
2. Les choix Soft / Vivid / Les deux dans toutes les sections de réglage, comme
   dans la maquette.

**À décider :** le sens de « Les deux » dans le Color shift (section 4).

Ce lot ne dépend pas du choix du texte des boutons, étudié dans
[Texte des boutons](../Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md).

## 1. La demande

Soft/Vivid se bascule dans plusieurs sections : Réglage global, Color shift,
Interface de test. Light/Dark ne se bascule qu'en haut de l'aperçu. Pour voir
l'Interface de test dans l'autre thème, le designer doit remonter en haut du
panneau.

Principe voulu par le mainteneur : ce qu'on voit est ce qu'on modifie, sans
rien casser (réglages enregistrés, recettes de format 8, tokens publiés), et
après des essais sur maquettes. Le principe tient mal pour Soft/Vivid : les
deux rampes sont toujours visibles ensemble, et un réglage peut viser les deux.
La demande est citée en [annexe](#annexe--demande-originale).

## 2. Décisions

### Modèle A

Light/Dark rejoint la barre de la palette, que Création et Vérification
partagent, et qui reste fixe en haut du panneau pendant le défilement.
L'aperçu et la carte des garanties perdent leur propre bouton. Le thème est un
contexte d'aperçu : il ne modifie jamais une palette, ne se range pas dans la
recette et n'écrit rien dans Figma.

La barre fixe prend une ligne de 32 px à la taille minimale, 500 × 520
([`fenetre.ts`](../../../../../packages/plugin-palettes/src/fenetre.ts)). Les
modèles B (un bouton par carte, tous liés), C (Light et Dark côte à côte) et D
(un bouton par carte, indépendants) restent dans la
[maquette](../Texte%20des%20boutons/MAQUETTE-MODES-ET-AFFICHAGE.html)
pour mémoire.

### Soft / Vivid / Les deux

Chaque section de réglage offre les trois choix. Chaque choix dit sa portée :
« Régler » quand il désigne ce que les réglages modifient, « Afficher » quand
il choisit seulement la rampe montrée.

## 3. Les commandes aujourd'hui

| Surface | Commande | Ce qu'elle pilote |
|---|---|---|
| Création, en-tête de l'aperçu | Light / Dark | Le thème de l'aperçu, transmis au Color shift et à l'Interface de test |
| Vérification, carte des garanties | Light / Dark | Le même état, par `gestes.mode()` |
| Réglage global | Soft / Vivid / les deux | Les profils que les réglettes modifient |
| Color shift | Soft / Vivid | Le profil que l'éditeur modifie ; le graphe montre les deux |
| Interface de test | Soft / Vivid | La rampe affichée ; ne modifie rien |
| Carte des garanties | Soft / Vivid | Le profil dont les garanties s'affichent ; ne modifie rien |
| Réglages communs | Colonnes Light et Dark | Fonds, courbes et part des fonds sombres, propres à chaque thème |

Le thème s'initialise à Light au chargement
([`nuancier.ts`](../../../../../packages/plugin-palettes/src/ui/nuancier.ts)).

### Régler Light et Dark indépendamment

La question du mainteneur recouvre trois besoins :

1. voir l'autre thème sans remonter : le modèle A y répond ;
2. régler des valeurs propres à chaque thème : fonds, courbes et part des
   fonds sombres existent déjà en deux colonnes ; le texte des boutons s'y
   ajoutera si sa proposition est retenue ;
3. régler chaque palette par thème : non retenu, aucun besoin mesuré.

## 4. Décision ouverte

**Le sens de « Les deux » dans le Color shift** :

- a. un même réglage appliqué aux deux profils, comme le lien que la dérive
  porte déjà (`derive.lien`) ;
- b. un décalage commun, ajouté au réglage propre de chaque profil.

## 5. Lot du plan

Plugin : barre fixe et commande Light/Dark, choix Soft / Vivid / Les deux dans
chaque section, tests Chromium aux deux tailles de fenêtre. Ce lot se livre
avant ou après celui du texte des boutons. Le
[plan d'implémentation](./PLAN-IMPLEMENTATION-COMMANDES-D-AFFICHAGE.md) ordonne
ce lot en phases, dit les fichiers touchés et garde l'état de livraison.

## Annexe : demande originale

Extrait du message du mainteneur ; sa première partie, sur le texte des
boutons, est citée dans
[l'autre dossier](../Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md#annexe-a--demande-originale).

> - après avoir créé de nombreuses palettes, je trouve l'outil très bon
>   cependant il y'a quelque chose qui ne marche pas trop en terme d'UX : dans
>   plusieurs sections (réglage global, color shift, interface de test) il y'a
>   un switch vivid/soft cependant le switch light mode/dark mode ne se trouve
>   que dans la section tout en haut de visualisation des palettes. ça
>   nécessite de remonter tout en haut quand on veut voir ce que ça rend en
>   dark mode/light mode sur la section interface de test. et aussi ça parait
>   pas logique d'avoir une de bascule à un endroit et une autre bascule à
>   plein d'autres endroits. Mais c'est aussi normal car on peut configurer
>   les propriétés des palettes vivid/ soft indépendemment mais pas les
>   propriétés du light mode et dark mode indépendemment.
> - Faut il laisser la possibilité de modifier light mode/dark mode
>   indépendemment ? Probablement oui. Pourquoi ne pas le faire ?
> - Faudrait il réfléchir à une interface de contrôle de l'affichage global ?
>   peut être oui, ça serait plus pratique
> - dans l'idée il faudrait que ce qu'on voit = ce qu'on va modifier. Or ce
>   principe ne fonctionne pas trop pour soft/vivid car on voit tout le temps
>   les deux palettes en même temps (et c'est important) et aussi on a la
>   possibilité de modifier conjointement soft et vivid en même temps
> - Je n'ai pas la réponse mais ça nécessite une recherche et réflexion très
>   approfondie pour uniformiser l'experience utilisateur sans rien casser.
>   Ainsi que de nombreux tests sur maquettes.
