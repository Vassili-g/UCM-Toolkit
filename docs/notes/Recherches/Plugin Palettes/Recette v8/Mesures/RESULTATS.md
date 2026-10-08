# Mesure 3a : reconstruire les réglages depuis les rampes

Lot 3a de la [recette v8](../DOSSIER-RECETTE-V8.md). Question : les rampes
d'une palette à deux intensités (Soft et Vivid, Light et Dark) suffisent-elles
à retrouver des réglages qui les reproduisent à l'hexa près ?

Résultat : **30 palettes sur 30 à écart nul**, écart maximal observé **0**.
La décision D3 reste à l'orchestrateur ; les réserves de la dernière section
disent ce que ce chiffre ne couvre pas.

## Lancer

Depuis la racine du dépôt, sans build (`tsx` lit les sources de
`packages/couleur/src`) :

```
node --import tsx "docs/notes/Recherches/Plugin Palettes/Recette v8/Mesures/mesurer-reconstruction.mjs"
```

Options : `--n=10` (moins de palettes), `--graine=N`, `--seul=N` (une palette,
avec la même graine de recherche que dans la série). Trente palettes durent
558 s sur le poste de la mesure ; dix durent 173 s.

## Méthode

1. **Tirage.** Trente palettes à deux intensités, graine 20261008, recette par
   défaut (onze nuances). Chaque tirage choisit une référence, un Color shift
   (préréglage Tailwind, constante, ou libre, lié ou délié, avec saturation et
   luminosité aux bouts dans 40 % des cas), des parts propres (30 %), une
   palette de base (30 %) et des réglages de la carte (45 % : teinte, clarté,
   part). Les réglages du porteur déplacent la référence par
   `referenceReglee` et rangent `originale`. `validerRecette` valide chaque
   tirage.
2. **Rampes d'origine.** `rampesDe`, la fonction que `variables/plan.ts` appelle
   pour écrire les variables. Seuls les hexa de chaque intensité, thème et
   nuance passent à la reconstruction : ce que les quatre groupes de variables
   contiennent.
3. **Reconstruction.** Le script ne connaît ni la référence, ni le porteur, ni
   les réglages.
   - *Ancrage.* Le moteur écrit les octets exacts de la référence dans la
     nuance d'ancrage des deux thèmes de l'intensité porteuse (MOT-17). Un hexa
     égal en Light et en Dark dans la même intensité est donc un candidat de
     référence ; il donne aussi le porteur et les rangs d'ancrage. Les
     candidats se testent jusqu'à un écart nul.
   - *Ajustement.* Moindres carrés (Levenberg-Marquardt) sur un modèle
     flottant de `fabriquerRampe` : pivot, teinte du pivot, décalage de clarté,
     part, et Color shift (teinte, saturation, luminosité aux deux bouts) de
     chaque intensité, 17 inconnues. Les nuances d'ancrage sont exclues de
     l'erreur.
   - *Recherche locale.* Déplacements aléatoires des valeurs continues, jugés
     sur l'erreur en octets de `rampesDe`, qui garde tout essai d'erreur égale
     ou moindre.
   - *Clarté du porteur.* Si la référence n'est pas le départ (réglage de
     clarté du porteur), le script balaie les 40 multiples de 0,005 qui
     fixent la clarté du départ, et ajuste le reste pour chacun.
   - *Calage.* Les valeurs s'arrondissent aux grains que la carte et le Color
     shift permettent d'écrire (1°, 0,005, 0,01, 0,001) ; une descente par
     coordonnées et une recherche autour des octets du départ achèvent.
4. **Écart.** Le script passe les réglages trouvés à `rampesDe` et compare
   chaque hexa à l'original. L'écart d'une palette est la plus grande
   différence de canal (0 à 255) sur ses 44 nuances. La colonne « valide » dit
   si `validerRecette` accepte la palette reconstruite.

## Tableau

Passe 1 : le départ est la référence. Passe 2 : le porteur porte un réglage
de clarté et le départ en diffère.

| N° | Écart max | Nuances en écart | Passe | Valide | Tirage |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 1 | oui | Color shift libre lié |
| 2 | 0 | 0 | 1 | oui | libre délié |
| 3 | 0 | 0 | 1 | oui | constante |
| 4 | 0 | 0 | 1 | oui | Tailwind ; teinte de l'autre profil |
| 5 | 0 | 0 | 1 | oui | Tailwind ; clarté de l'autre profil |
| 6 | 0 | 0 | 1 | oui | Tailwind ; base Soft |
| 7 | 0 | 0 | 1 | oui | Tailwind |
| 8 | 0 | 0 | 1 | oui | Tailwind ; parts propres ; base Soft ; teinte et part du porteur |
| 9 | 0 | 0 | 1 | oui | libre délié |
| 10 | 0 | 0 | 1 | oui | libre lié |
| 11 | 0 | 0 | 1 | oui | Tailwind |
| 12 | 0 | 0 | 1 | oui | libre lié ; parts propres ; base Vivid |
| 13 | 0 | 0 | 1 | oui | libre délié ; parts propres ; base Vivid |
| 14 | 0 | 0 | 2 | oui | libre lié ; parts propres ; teinte et clarté du porteur |
| 15 | 0 | 0 | 1 | oui | libre délié ; teinte du porteur |
| 16 | 0 | 0 | 1 | oui | libre lié |
| 17 | 0 | 0 | 1 | oui | Tailwind ; base Vivid |
| 18 | 0 | 0 | 1 | oui | Tailwind ; clarté de l'autre profil |
| 19 | 0 | 0 | 1 | oui | constante |
| 20 | 0 | 0 | 1 | oui | Tailwind ; porteur lu Soft, vrai Vivid |
| 21 | 0 | 0 | 1 | oui | libre lié |
| 22 | 0 | 0 | 1 | oui | libre lié ; base Soft ; teinte de l'autre profil |
| 23 | 0 | 0 | 1 | oui | libre lié |
| 24 | 0 | 0 | 1 | oui | Tailwind |
| 25 | 0 | 0 | 1 | oui | libre lié |
| 26 | 0 | 0 | 1 | oui | libre lié |
| 27 | 0 | 0 | 1 | oui | libre délié ; parts propres |
| 28 | 0 | 0 | 2 | oui | Tailwind ; teinte et clarté du porteur |
| 29 | 0 | 0 | 1 | oui | Tailwind ; parts propres ; clarté du porteur |
| 30 | 0 | 0 | 1 | oui | Tailwind ; parts propres ; base Vivid |

- Palettes à écart nul : **30 sur 30**.
- Écart maximal observé : **0**.
- Reconstructions que `validerRecette` accepte : 30 sur 30.

## Causes d'écart observées

La série finale n'a aucun écart. Les causes ci-dessous viennent des étapes
intermédiaires du script, sur les mêmes trente palettes.

- **Ancrage faux : écart de 10.** La palette 28 (clarté du porteur) a donné un
  écart de 10 sur une nuance d'ancrage tant que le départ valait la référence.
  La clarté du départ fixe le rang d'ancrage ; avec une clarté de départ
  fausse, la référence s'écrit sur une autre nuance. Le balayage des multiples
  de 0,005 lève cet écart.
- **Arrondi à 8 bits : écart de 1.** Le modèle flottant ne reproduit pas
  l'arrondi du moteur. Dans une version intermédiaire du script, quatre
  palettes sur 30 (2, 4, 5, 9) gardaient une à sept nuances décalées d'une
  unité. La recherche sur l'erreur en octets de `rampesDe` les ramène à zéro.
- **Réglages différents, rampes identiques.** Le script retrouve des réglages
  qui reproduisent les rampes, pas forcément ceux du tirage. Pour la
  palette 20, le script lit un porteur Soft alors que le tirage a un porteur
  Vivid, avec un écart nul. Le script ne compare pas les réglages trouvés aux
  réglages tirés, et la cause de cette lecture n'a pas été examinée.
- **Départ et réglage de teinte confondus (déduit du moteur, non mesuré).**
  `pivotDe` additionne la teinte du départ et le réglage de teinte : seule la
  somme agit sur les rampes. Le script ne peut donc pas distinguer un départ
  d'un degré plus loin compensé par un réglage opposé.
- **Temps de calcul.** Une palette dont le porteur porte un réglage de clarté
  demande le balayage de la passe 2. Une palette met de 2 à 40 s
  environ ; la série de trente dure 558 s.

## Réserves

- Les 30 tirages sont synthétiques. Leurs réglages tombent sur les grains que
  la carte et le Color shift écrivent (degré, 0,005, 0,01, 0,001). Un
  Color shift libre importé d'ailleurs, avec des angles à plusieurs décimales,
  n'est pas couvert par le calage ; la recherche continue le couvre en
  partie, sans mesure.
- La recette globale (courbes, parts communes, facteur des fonds Dark, relevé
  Tailwind) est celle par défaut, et le script la connaît. La reprise de Poppy
  la lit dans la recette rangée ; si celle-ci diffère de la valeur par défaut,
  la mesure n'a pas été faite pour cette différence.
- Les palettes à treize nuances, à une seule intensité, et les palettes libres
  (liste de numéros propre) ne sont pas tirées.
- La mesure compte les hexa des rampes recalculées par le moteur. Une variable
  que le designer a éditée à la main dans Figma ne figure pas dans ce modèle.
- Le temps de calcul (jusqu'à 40 s par palette) est celui d'un script. Un module
  du moteur qui reconstruirait les réglages devrait le raccourcir ou le borner.
