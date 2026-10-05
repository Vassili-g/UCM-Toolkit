# Harmonisation entre palettes : plan de recherche

**Statut : recherche à mener.** Aucune décision d'implémentation, aucune
maquette. La section 3 donne une première mesure du moteur ; les sections 4
à 6 listent ce qui reste à établir et à décider.

## 1. Le besoin

Un designer compose plusieurs palettes qui s'affichent dans les mêmes
composants : danger, warning, success et info dans une alerte, un badge ou un
champ en erreur. Il règle chaque palette à la main : la luminosité et la
saturation du « Réglage global », puis le Color shift à chaque bout de la
rampe.

Chaque réglage se fait sur la palette ouverte, sans vue des autres. Après
plusieurs gestes, le plugin ne dit pas si la surface de danger a encore la
luminosité et la saturation de la surface de success.

Deux gestes sont demandés :

- comparer deux palettes réglées et lire où elles s'écartent ;
- harmoniser un groupe de palettes, en Soft ou en Vivid, sans reporter les
  valeurs d'une carte à l'autre.

Deux inconnues bornent la recherche : l'endroit du plugin qui porte ces
gestes, et la forme d'une harmonisation qui n'ajoute pas un éditeur de plus.

## 2. Ce que le plugin fait aujourd'hui

Les réglages propres à une palette, tous rangés dans la recette de format 8 :

| Réglage | Champ de la recette | Effet |
|---|---|---|
| Luminosité du réglage global | `palettes[].reglages.clarte.{soft,vivid}` | Décale toute la rampe d'un profil |
| Saturation du réglage global | `palettes[].reglages.part`, `palettes[].parts` | Change la part de chroma d'un profil |
| Teinte du réglage global | `palettes[].reglages.teinte.{soft,vivid}` | Tourne le pivot d'un profil |
| Color shift de luminosité | `palettes[].derive.{soft,vivid}.clarte.{clair,sombre}` | Décale chaque bout, avec un poids nul au pivot |
| Color shift de saturation | `palettes[].derive.{soft,vivid}.saturation.{clair,sombre}` | Change la part à chaque bout |
| Color shift de teinte | `palettes[].derive.{soft,vivid}.{clair,sombre}` | Tourne la teinte à chaque bout |

Ce qui existe pour juger plusieurs palettes :

| Sujet | État dans `packages/couleur` et `packages/plugin-palettes` | Écart avec le besoin |
|---|---|---|
| Palettes sans réglage | Les courbes de la recette donnent la même clarté à chaque numéro, pour toutes les palettes | L'accord de luminosité est acquis au départ et se perd au premier réglage propre |
| Comparaison de deux palettes | `distanceDePalettes` (`alertes.ts`) mesure le ΔEok moyen des nuances 500, 600 et 700 en Light, pour l'alerte `palettes-proches` | L'alerte cherche des palettes qui se confondent. Aucune mesure ne compare la luminosité et la saturation de deux teintes différentes |
| Affichage | Création et Vérification montrent la palette ouverte. Gestion montre toutes les palettes, une fiche ou une ligne de tableau chacune | Aucune surface ne pose deux palettes nuance contre nuance, ni leurs réglages côte à côte |
| Résumé des réglages | L'en-tête replié de chaque carte de Création porte un résumé | Il se lit palette par palette |
| Limites | `balayerLaLimite` (`limites.ts`) borne chaque réglage aux valeurs qui tiennent les garanties et l'ordre des nuances | La limite se calcule par palette : une valeur permise pour l'une peut être refusée pour l'autre |
| Interface de test | `interfaceDeTest.ts` peint un écran avec la palette ouverte seule | Aucun composant n'y montre danger, warning et success ensemble |

« Comparer à », piste 13 de la
[proposition finale](../Intégration%20du%20marché/03%20Proposition%20finale/PROPOSITION-FINALE.md),
peignait une seconde palette sous la palette ouverte. Elle n'a pas été
implémentée et visait les variantes d'une même teinte.

## 3. Première mesure

[`mesurer-ecarts.mjs`](./mesurer-ecarts.mjs) fabrique quatre palettes avec la
recette par défaut : danger `#DC2626`, warning `#F59E0B`, success `#16A34A`,
info `#2563EB`.

**Sans réglage propre.** L'écart de clarté entre les quatre palettes reste
sous 0,003 à chaque nuance, hors de celle qui porte la référence.

**Avec le même Color shift de luminosité sur les quatre.** Écart de clarté
entre palettes, Vivid, thème Light :

| Color shift | 50 | 100 | 300 | 500 | 700 | 900 |
|---|---|---|---|---|---|---|
| clair −0,04, sombre +0,04 | 0,001 | 0,004 | 0,013 | 0,020 | 0,014 | 0,005 |
| clair +0,02, sombre −0,06 | 0,002 | 0,002 | 0,007 | 0,017 | 0,021 | 0,005 |

Le poids du Color shift est nul à la clarté de la référence et vaut 1 au bout
(`poidsA`, `rampe.ts`). La référence de warning se place à la nuance 400,
les trois autres à la 600 : les mêmes valeurs donnent donc des clartés
différentes entre le pivot et le bout. L'écart atteint 0,02 au milieu de la
rampe, soit un quart de la marche entre deux nuances voisines, et reste sous
0,005 aux nuances 50 et 100.

**À part égale.** En Soft, les quatre parts valent 0,450 et la chroma de la
nuance 100 varie d'un facteur 3,5, parce que la part est une fraction du
plafond sRGB de chaque teinte. Cet écart existe avant tout réglage.

Deux conséquences pour la recherche :

1. Recopier les valeurs d'une palette sur une autre approche l'accord sans le
   garantir. La comparaison porte sur les nuances obtenues, pas sur les
   valeurs saisies.
2. Sur les surfaces, la recopie des valeurs de luminosité suffit à 0,005
   près. Sur les nuances 300 à 800, elle laisse un écart mesurable.

## 4. Questions à lever

### La mesure de l'accord

| # | Question | Ce qui en dépend |
|---|---|---|
| M1 | Que compare-t-on : les nuances obtenues (clarté, chroma), les valeurs des réglages, ou les deux ? | Les colonnes de la comparaison |
| M2 | Sur quelles nuances juger : celles des emplois de surface (50, 100), toutes celles de la table des emplois, ou la rampe entière ? | Le nombre de lignes, et le verdict |
| M3 | À partir de quel écart de clarté deux surfaces se distinguent-elles à l'œil dans un composant ? À établir sur une planche d'essai | Le seuil, et son rangement dans `seuils` de la recette |
| M4 | La saturation se compare-t-elle en chroma OKLCH ou en part du plafond ? À part égale, la chroma diffère d'un facteur 3,5 | La grandeur affichée, et la cible d'une harmonisation de saturation |
| M5 | Le verdict est-il binaire, gradué, ou absent au profit des seuls écarts ? | La forme de la réponse à « vont-elles ensemble » |
| M6 | La comparaison porte-t-elle sur deux palettes ou sur un groupe ? Le cas d'usage en cite trois | Le sélecteur, et la lecture à N colonnes |
| M7 | Les contrastes des paires d'emploi, texte 700 sur surface 100 par exemple, s'écartent-ils après réglage ? `verifierPromesses` les calcule déjà | Un second axe de comparaison |
| M8 | Que comparer entre une palette à deux intensités, une palette à une intensité et une palette figée ? `rampesComparees` porte une règle pour l'alerte existante | Les paires refusées, et le texte du refus |

### Le calcul d'une harmonisation

| # | Question | Ce qui en dépend |
|---|---|---|
| H1 | Quelle est la cible : une palette choisie comme modèle, ou un jeu de valeurs communes ? | Le geste : « aligner sur danger » ou « régler le groupe » |
| H2 | L'harmonisation recopie-t-elle les valeurs des réglages, ou cherche-t-elle pour chaque palette les valeurs qui donnent les clartés du modèle ? La section 3 chiffre l'écart de la recopie | Un geste lisible et approché, ou un calcul exact dont les valeurs diffèrent par palette |
| H3 | Quels réglages entrent dans l'harmonisation ? La luminosité et la saturation sont demandées. La teinte et son Color shift appartiennent à chaque palette | La liste des champs touchés |
| H4 | L'harmonisation tient-elle les garanties de chaque palette ? `balayerLaLimite` donne une limite par palette | Ce que le geste réduit ou refuse, et le message de la butée |
| H5 | Un réglage de luminosité du profil porteur déplace la référence (`referenceReglee`). L'harmonisation peut-elle déplacer la référence d'une palette cible ? | Une exception affichée, ou un refus sur le porteur |
| H6 | L'accord est-il un état suivi ou un geste ponctuel ? Suivi, la recette range le groupe, et une alerte signale l'écart après un nouveau réglage | La forme de la recette, et une alerte de plus dans Vérification |
| H7 | Un réglage peut-il se faire sur le groupe, au lieu d'être fait sur une palette puis propagé ? | Une cible « groupe » dans les cartes de réglage, et aucun outil d'harmonisation |
| H8 | Soft et Vivid s'harmonisent-ils ensemble ou séparément, et le thème Dark suit-il le Light ? | Le nombre de cibles par geste |

### La place dans l'interface

| # | Question | Ce qui en dépend |
|---|---|---|
| I1 | Quel onglet porte la comparaison ? Le réglage se fait dans Création, le jugement dans Vérification, le fichier entier se lit dans Gestion | L'emplacement, section 5 |
| I2 | Le designer veut-il voir l'écart pendant le réglage, ou après ? | Un témoin dans la carte de réglage, ou une vue à part |
| I3 | Comment le designer désigne-t-il le groupe : un choix à chaque comparaison, ou un groupe nommé et rangé ? La recette ne porte aucun rôle de palette | La forme de la recette, et le lien avec les couches `brand` et `usage` |
| I4 | Quelle vue montre l'écart sans chiffre à lire : rampes alignées, composants côte à côte, courbes de clarté superposées ? | La maquette, et la réutilisation de `interfaceDeTest.ts` ou de `traceDesCourbes.ts` |
| I5 | L'harmonisation se propose-t-elle comme la modale « Ajuster la référence » (`ajustement.ts`) : avant, après, Appliquer ? | Zéro réglette nouvelle |
| I6 | Un geste qui modifie plusieurs palettes s'enregistre-t-il en un rangement, et se défait-il en une fois ? | `ecriture/recette.ts`, et les tokens de Gestion qui passent à « À mettre à jour » |

## 5. Hypothèses d'interface

Quatre hypothèses se maquettent hors de Figma, sur les quatre palettes de la
section 3 réglées différemment.

| | A. Témoin dans Création | B. Carte dans Vérification | C. Vue d'ensemble dans Gestion | D. Réglage de groupe |
|---|---|---|---|---|
| Comparaison | Une liste « Comparer à » dans l'aperçu : la rampe d'une autre palette sous la palette ouverte, et son repère sur chaque réglette | Carte « Comparer à » : deux palettes nuance contre nuance, écarts de clarté et de chroma, réglages côte à côte | Section « Cohérence » : les palettes cochées en colonnes, sur les mêmes composants | Aucune : le groupe se règle ensemble |
| Harmonisation | « Reprendre les réglages de [palette] » dans le menu de la carte | « Aligner sur [palette] » ouvre une proposition, avant et après, puis Appliquer | « Harmoniser la sélection » ouvre la même proposition pour N palettes | La cible des cartes de réglage devient « cette palette » ou « le groupe » |
| Moment | Pendant le réglage | Après le réglage | Après le réglage, sur le fichier | Pendant le réglage |
| Portée | Deux palettes | Deux palettes | Un groupe | Un groupe |
| Limite connue | Charge l'aperçu, la surface la plus dense de l'onglet | Trois palettes demandent deux passes | La vue condensée de Gestion ne porte aucun geste d'écriture | Demande un groupe rangé dans la recette (I3) |

Proposition de départ : maquetter A pour la comparaison, avec le repère de
l'autre palette sur les réglettes, et la proposition « avant, après,
Appliquer » pour l'harmonisation. L'écart naît pendant le réglage, dans
Création ; le repère de l'autre profil existe déjà sur ces réglettes. D
reste à étudier : il évite l'écart au lieu de le corriger.

## 6. Décisions attendues du mainteneur

| # | Décision | Éclairée par |
|---|---|---|
| D1 | Pendant le réglage ou après : A et D, ou B et C | I2, maquette de l'étape 4 |
| D2 | Deux palettes ou un groupe, choisi à la volée ou rangé | M6, I3 |
| D3 | Recopie des valeurs ou calcul des clartés du modèle | H2, mesure de l'étape 3 |
| D4 | Les réglages harmonisés : luminosité seule, ou luminosité et saturation | H3, M4 |
| D5 | Geste ponctuel ou accord suivi par une alerte | H6 |
| D6 | Le seuil de l'écart, et son rangement | M3, planche de l'étape 2 |

## 7. Étapes

1. Étendre `mesurer-ecarts.mjs` aux palettes réglées du mainteneur, lues dans
   une recette exportée du plugin : écart de clarté et de chroma par nuance,
   et contrastes des paires d'emploi (M7).
2. Produire une planche HTML d'essai : une alerte, un badge et un champ, peints
   des palettes de cette recette, avec des écarts de clarté croissants. Le
   mainteneur fixe le seuil à l'œil (M3).
3. Écrire les deux calculs dans un script : la recopie des valeurs, et la
   recherche des valeurs qui donnent les clartés du modèle. Relever l'écart
   résiduel, les garanties et le déplacement de la référence (H2, H4, H5).
4. Maquetter A à D dans une page HTML, à 500 et à 600 px de large, avec les
   chiffres des étapes 1 et 3.
5. Décisions D1 à D6, puis plan d'implémentation par lots : moteur, messages,
   interface, galerie, textes en deux langues.

## Hors périmètre

- Le choix des teintes : harmonies de roue chromatique, couleurs
  complémentaires. Les références viennent des chartes de marque.
- L'alerte `palettes-proches` et le geste « Proches à dessein ».
- L'écriture des couches `brand`, `theme` et `usage`.
- Un mode de recette où la part se rapporte à un plafond commun à toutes les
  teintes. Il traite l'écart de chroma des palettes sans réglage, qui est un
  sujet distinct.
