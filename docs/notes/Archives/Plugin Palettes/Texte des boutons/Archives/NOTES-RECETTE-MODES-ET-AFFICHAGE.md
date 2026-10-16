# Modes clair/sombre et affichage global : notes de recette

> Archivé : ce document est réuni dans le [dossier de recherche](../DOSSIER-TEXTE-DES-BOUTONS.md),
> qui fait foi. Ses liens relatifs datent de son ancien emplacement.

**Statut : notes brutes du mainteneur.** Aucune décision, aucune
maquette, aucune implémentation. Ce document garde les constats tels qu'ils
ont été faits après la création de nombreuses palettes, pour une recherche
et une réflexion à mener plus tard.

Le mainteneur juge l'outil très bon. Les deux points ci-dessous portent sur
des décisions de moteur et d'expérience, pas sur des défauts de calcul.

## 1. Couleur du texte des boutons en mode sombre

### Constat

En mode sombre, les boutons s'affichent avec un texte en teintes sombres.
Le mainteneur pensait à du texte en teintes claires, ce qui, à son avis,
change tout le moteur.


### Questions à instruire

- Est-ce modifiable, ou cela va-t-il contre l'architecture et le concept
  du moteur de couleur ?
- Peut-on offrir un interrupteur pour choisir texte clair ou texte sombre,
  séparément en mode clair et en mode sombre ?
- Quel serait l'impact d'un tel choix : moteur, contrastes vérifiés,
  tokens générés, composants, diagnostics, Figma ?
- Pourquoi le moteur choisit-il aujourd'hui du texte sombre en mode sombre ?
  Le comprendre précède toute proposition.

## 2. Bascules incohérentes entre variantes et modes

### Constat

- Soft/Vivid se bascule dans plusieurs sections : Réglage global,
  Color shift, interface de test.
- Clair/Sombre ne se bascule que dans la section de visualisation des
  palettes, tout en haut.
- Pour voir le rendu sombre ou clair dans l'interface de test, il faut
  remonter en haut de la page.
- Une bascule à un seul endroit et une autre à beaucoup d'endroits ne
  paraît pas logique.
- L'asymétrie a pourtant une cause : les propriétés de Soft et de Vivid se
  règlent indépendamment, celles du mode clair et du mode sombre non.

### Questions et pistes

- Faut-il laisser régler le clair et le sombre indépendamment ?
  Probablement oui. Pourquoi ne pas le faire ?
- Faut-il une interface de contrôle de l'affichage global ?
  Probablement oui : ce serait plus pratique.
- Principe voulu : **ce qu'on voit = ce qu'on modifie.** Il tient mal pour
  Soft/Vivid, car :
  - les deux palettes sont toujours visibles en même temps, et c'est
    important ;
  - on peut aussi modifier Soft et Vivid conjointement.

## 3. Cadrage de la recherche

Le mainteneur n'a pas la réponse. Le travail demande :

- une recherche et une réflexion très approfondies ;
- une expérience uniforme, sans rien casser (réglages enregistrés,
  recettes de format 8, tokens publiés) ;
- de nombreux essais sur maquettes avant tout code.

## 4. Pour la suite

- [ ] Inventaire : où se trouve chaque bascule aujourd'hui, ce qu'elle
  pilote, ce qui est enregistré par palette.
- [ ] Moteur : où et pourquoi le texte des boutons est choisi clair ou
  sombre selon le mode.
- [ ] Maquettes comparées de l'affichage global (voir le dossier
  « Color shift » pour la forme des maquettes).
- [ ] Recette sur maquettes avant décision.


## Requête originale brute : 

"- en dark mode, le boutons sont affichés avec un texte en teintes sombres mais je n'avais pas pensé à ça moi, je pensais plutôt utiliser des teintes claires pour le texte mais ça change tout le moteur je pense. Il faudrait avoir une réflexion là dessus : est ce que c'est quelque chose qui est modifiable ou bien ça va à l'encontre même de l'architecture et du concept du moteur de couleur ? est ce qu'on pourrait avoir des toggle pour choisir si les texte sont clairs ou sombres dans le light mode et le dark mode ? ça serait quoi l'impact de faire ça ?

- après avoir créé de nombreuses palettes, je trouve l'outil très bon cependant il y'a quelque chose qui ne marche pas trop en terme d'UX : dans plusieurs sections (réglage global, color shift, interface de test) il y'a un switch vivid/soft cependant le switch light mode/dark mode ne se trouve que dans la section tout en haut de visualisation des palettes. ça nécessite de remonter tout en haut quand on veut voir ce que ça rend en dark mode/light mode sur la section interface de test. et aussi ça parait pas logique d'avoir une de bascule à un endroit et une autre bascule à plein d'autres endroits. Mais c'est aussi normal car on peut configurer les propriétés des palettes vivid/ soft indépendemment mais pas les propriétés du light mode et dark mode indépendemment.
- Faut il laisser la possibilité de modifier light mode/dark mode indépendemment ? Probablement oui. Pourquoi ne pas le faire ? 
- Faudrait il réfléchir à une interface de contrôle de l'affichage global ? peut être oui, ça serait plus pratique 
- dans l'idée il faudrait que ce qu'on voit = ce qu'on va modifier. Or ce principe ne fonctionne pas trop pour soft/vivid car on voit tout le temps les deux palettes en même temps (et c'est important)  et aussi on a la possibilité de modifier conjointement soft et vivid en même temps
- Je n'ai pas la réponse mais ça nécessite une recherche et réflexion très approfondie pour uniformiser l'experience utilisateur sans rien casser. Ainsi que de nombreux tests sur maquettes."