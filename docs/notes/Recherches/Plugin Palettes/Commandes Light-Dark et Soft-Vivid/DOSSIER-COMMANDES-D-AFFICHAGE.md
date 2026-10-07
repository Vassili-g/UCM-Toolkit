# Commandes Light/Dark et Soft/Vivid : dossier de recherche

**Statut :** implémenté, en attente de la recette du mainteneur dans Figma. La
recette est décrite dans le
[plan d'implémentation](./PLAN-IMPLEMENTATION-COMMANDES-D-AFFICHAGE.md#recette-du-mainteneur).

## En bref

**Décisions du mainteneur, toutes implémentées :**

1. Le thème Light/Dark se choisit dans la ligne du titre « Palette [nom] »,
   par un choix « Aperçu » calé à droite. La ligne reste en haut du panneau
   pendant le défilement, dans Création comme dans Vérification. La barre de la
   palette est un bloc ordinaire.
2. Tous les choix d'affichage ont une seule forme : un libellé, puis des
   segments, sans cerne de marque. Ils se placent dans l'en-tête de leur carte
   ouverte, calés à droite, ou, pour la carte fixe des garanties, en tête de
   son corps. Carte repliée, l'en-tête montre son résumé et cache ses choix.
3. « Les deux » ne reste que dans le Réglage global. Le Color shift et
   l'Interface de test n'ont que Soft et Vivid, et l'Interface de test peint un
   seul écran.
4. La carte des garanties ne nomme plus le thème dans son en-tête.
5. La carte de l'aperçu a un glyphe, un titre et un sous-titre, comme les
   autres cartes.
6. La carte de configuration se replie après la création d'une palette.

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

### Light/Dark dans le titre de la palette

La [maquette](../Texte%20des%20boutons/Archives/MAQUETTE-MODES-ET-AFFICHAGE.html)
propose quatre modèles, A à D, et le modèle A est validé : un seul bouton
Light/Dark, toujours visible. Le mainteneur l'a placé dans la ligne du titre
« Palette [nom] » plutôt que dans la barre de la palette, avec le libellé
« Aperçu » et les segments « Light » et « Dark », sans le cerne de marque de la
maquette. La ligne a un fond opaque et se colle en haut du panneau : choisir
Dark depuis l'Interface de test ne défile pas la page. Le thème est un contexte
d'aperçu : il ne modifie jamais une palette, ne se range pas dans la recette et
n'écrit rien dans Figma.

La ligne tient sur une ligne à la taille minimale, 500 × 520
([`fenetre.ts`](../../../../../packages/plugin-palettes/src/fenetre.ts)). Les
modèles B (un bouton par carte, tous liés), C (Light et Dark côte à côte) et D
(un bouton par carte, indépendants) restent dans la maquette pour mémoire.

### Une forme et une place pour les choix

Chaque choix dit sa portée par son libellé : « Régler » quand il désigne ce
que les réglages modifient, « Afficher » quand il choisit seulement la rampe
ou le thème montrés, « Vue » pour l'écran ou les états de l'Interface de test,
« Aperçu » pour le thème. Les segments de formulaire de la configuration et de
Gestion ne sont pas des choix d'affichage.

### Soft, Vivid et Les deux

« Les deux » ne désigne un profil que dans le Réglage global, où un réglage peut
viser Soft, Vivid ou les deux. Le Color shift règle un profil à la fois et
garde sa case « Synchroniser Soft et Vivid » : cochée, elle cache le choix.
L'Interface de test et les garanties affichent un profil, sans rien modifier.

## 3. Les commandes

| Surface | Commande | Ce qu'elle pilote |
|---|---|---|
| Ligne du titre, Création et Vérification | « Aperçu » : Light, Dark | Le thème montré par l'aperçu, la carte des garanties, le Color shift et l'Interface de test |
| Réglage global, en-tête | « Régler » : Soft, Vivid, Les deux | Les profils que les réglettes modifient |
| Color shift, en-tête | « Régler » : Soft, Vivid | Le profil que l'éditeur modifie ; le graphe montre les deux |
| Interface de test, en-tête | « Vue » : Écran, États ; « Afficher » : Soft, Vivid | La vue et la rampe peintes ; ne modifie rien |
| Carte des garanties, tête du corps | « Afficher » : Soft, Vivid | Le profil dont les garanties s'affichent ; ne modifie rien |
| Réglages communs | Colonnes Light et Dark | Fonds, courbes et part des fonds sombres, propres à chaque thème |

Le thème s'initialise à Light à l'ouverture du plugin
([`paletteOuverte.ts`](../../../../../packages/plugin-palettes/src/ui/paletteOuverte.ts)).

### Régler Light et Dark indépendamment

La question du mainteneur recouvre trois besoins :

1. voir l'autre thème sans remonter : la ligne du titre collée y répond ;
2. régler des valeurs propres à chaque thème : fonds, courbes et part des
   fonds sombres existent déjà en deux colonnes ; le texte des boutons s'y
   ajoutera si sa proposition est retenue ;
3. régler chaque palette par thème : non retenu, aucun besoin mesuré.

## 4. Question close

« Les deux » dans le Color shift : le mainteneur l'a écarté. Le Color shift
garde Soft et Vivid, sans « Les deux ».

## 5. Lot du plan

Plugin : la bascule « Aperçu » dans la ligne du titre, le composant de choix
commun, leur place dans l'en-tête des cartes ouvertes et en tête du corps des
garanties, l'aperçu titré, la configuration repliée après une création, et les
tests Chromium aux deux tailles de fenêtre. Ce lot se livre avant ou après
celui du texte des boutons. Le
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
