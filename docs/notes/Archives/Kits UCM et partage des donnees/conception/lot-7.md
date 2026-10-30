# Conception du lot 7

Entrée des tâches T7.1 et T7.2 du
[plan d'implémentation](../PLAN-IMPLEMENTATION-FIABILITE.md). Le pourquoi et
les huit lois sont dans le [plan de fiabilité](../PLAN-FIABILITE-KITS-ET-PLUGINS.md),
lot 7. Le lot vient après les lots 5, 6, 11 et 12 : ses lois appellent les
fonctions qu'ils ont rassemblées. Si un lot n'est pas fini, la loi qui en
dépend importe la fonction là où elle se trouve, sans attendre.

## Le fichier

Un seul fichier racine, `tests/loisEntreProduits.test.ts`, sur le modèle de
`tests/nomsDePalettes.test.ts` (mêmes imports de Palettes, de Nomenclature et
du double `FauxFigma`). Les fabriques vont dans un module voisin,
`tests/fabriquesDeFichiers.ts`, pour garder le fichier des lois lisible.

## La matrice

| Axe | Valeurs |
|---|---|
| Convention des groupes et des variables | chaque entrée de `CONVENTIONS` du kit, appliquée aux deux catégories |
| Intensités | une (`INTENSITE_UNIQUE`), deux (`soft`, `vivid`) |
| Thèmes | dans le chemin, en modes |
| Nuances | 11 (Tailwind), 13 (`PREREGLAGES[13]`) |
| Liaison | destination, reprise |

Le produit complet fait 2 × 2 × 2 × 2 = 16 formes par convention. Décision du
mainteneur : les lois parcourent une diagonale, où chaque valeur
de chaque axe paraît au moins une fois, croisée avec chaque convention ; le
produit complet n'est pas demandé. Chaque loi dit le sous-ensemble qu'elle
parcourt : les lois 1 à 4 et 8 parcourent la diagonale ;
la loi 5 ne prend que la destination de référence
(`DESTINATION_DES_PALETTES`) ; la loi 7 ne prend que les conventions.

Chaque cas porte un nom lisible dans le titre du test :
`PascalCase · deux intensités · thèmes en modes · 13 nuances · reprise`.

## Les fabriques

```ts
interface FormeDePalette {
  readonly convention: Convention;
  readonly intensites: 1 | 2;
  readonly themes: 'chemin' | 'modes';
  readonly nuances: 11 | 13;
  readonly liaison: 'destination' | 'reprise';
}

/** Un fichier où Palettes a écrit une palette de cette forme, en minuscules, sans règles rangées. */
function fichierDePalettes(forme: FormeDePalette, options?: { permissif?: boolean }): Promise<FichierDeTest>;

/** Range les règles de Nomenclature pour la convention (entrée `ecriture`) et la marque de Palettes. */
function rangerLesRegles(fichier: FichierDeTest, convention: Convention, options?: { marque?: boolean }): void;

/** Des variables du thème qui visent la palette, nommées selon la convention. Palettes ne les écrit pas. */
function themeSelonLaConvention(fichier: FichierDeTest, convention: Convention): void;
```

`FichierDeTest` porte le `FauxFigma`, la recette, la palette et le préfixe
attendu. Le double est construit avec l'option qui accepte les doublons de
noms (T5.1) : c'est UCM qui doit refuser, pas le double.

## Les lois

1. **Avant écriture.** Écrire, ranger les règles d'une autre convention, puis
   relire : l'état des tokens n'est pas « à mettre à jour »
   (`tokensDeLaPalette`, et l'état de `variables/etat.ts`). Témoin : changer
   une couleur rend « à mettre à jour ».
2. **Après écriture.** Règles rangées, marque présente, collection non
   exclue : `nomsSelonLesReglesSync` ne propose aucun renommage des
   variables de Palettes. Cas ajouté : la convention change après la première
   écriture ; une destination garde ses noms jusqu'au passage de Nomenclature
   (D2), et l'écriture suivante n'en renomme aucun.
3. **Annonce et écriture.** Pour chaque écran, le nom annoncé est celui que
   l'écriture donne. Les fonctions d'annonce :
   - création, mise à jour, remplacement, noms occupés, reprise :
     `tokensDeLaPalette` (`variables/gestion.ts`), que les onglets Création et
     Gestion appellent déjà ;
   - conversion (« Passer au format du plugin ») : le calcul est aujourd'hui
     écrit dans `ui/ongletCreation.ts` (`nommeurDuFichier(fichier)?.pour(…)`,
     puis `conversionDeLaReprise`). L'extraire dans
     `variables/conversion.ts` sous le nom
     `annonceDeLaConversion(recette, palette, suivie, fichier)`, que l'onglet
     appelle à la place. C'est la seule extraction du lot.
   La loi compare les noms annoncés aux noms du `FauxFigma` après
   `ecrireLesVariables`, `reprendreLaPalette` ou la conversion.
4. **Nom pris.** Une variable non suivie porte le nom final dans une autre
   casse. Destination, reprise, conversion et remplacement rendent `nom-pris`,
   sans doublon et sans mutation de l'occupant (son nom, ses valeurs et ses
   données partagées sont inchangés).
5. **Grammaire, dans le profil.** Chaque nom écrit vers la destination de
   référence est reconnu par `reconnaitreLeChemin` du kit, avec la forme
   attendue (lot 6).
6. **Agnostique.** Une sortie vers un groupe libre (`Brand/Couleurs`) ou une
   collection libre n'est ni bloquée par l'écriture ni déclarée fautive par
   la grammaire ou par l'explorateur.
7. **Explorateur.** Avec `themeSelonLaConvention`, `controlerLeProfil` de
   l'explorateur reconnaît la couche et le rôle, et rend les mêmes constats
   et les mêmes limites qu'en minuscules.
8. **Lot entier.** Deux palettes dont les noms convergent (`Ocean-Blue` et
   `OceanBlue` sous PascalCase), dans les deux ordres : l'annonce de Gestion
   (`refus`), l'issue de l'écriture et les mutations du double concordent.

## La preuve par les mutants (T7.2)

Pour chacune des trois corrections, dans l'arbre de travail :

1. `git show <hash> -- packages/plugin-palettes/src | git apply -R`, en ne
   défaisant que les fichiers `src` de la correction ;
2. lancer `tests/loisEntreProduits.test.ts` ;
3. relever la loi rouge et son message ;
4. `git checkout -- packages/plugin-palettes/src` pour tout remettre, puis
   vérifier `git status` sur ces fichiers.

Si un code a changé depuis et que le retrait ne s'applique plus, reproduire à
la main le défaut que la correction a réparé, en une ligne, et le dire dans le
compte rendu.

| Correction | Loi attendue |
|---|---|
| 170a6d79 (une reprise demandait un renommage que les règles seules créent) | 1 |
| c93bff20 (l'annonce de la conversion ignorait les règles) | 3 |
| 7c673dac (une reprise jugeait un nom pris avec la casse) | 4 |

Le compte rendu est consigné dans la case T7.2 du plan.

## Les tests

Le fichier doit tourner en moins de 30 secondes dans `npm test` racine. Si la
matrice complète dépasse ce temps, garder le produit complet pour les lois 1,
3 et 4 et une diagonale (chaque valeur de chaque axe au moins une fois) pour
les autres, et le dire en tête du fichier.
