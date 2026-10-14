# Review du plan d'implémentation

**Avis : corriger le plan avant exécution.** Les valeurs de chroma, la table
par thème et par sens, le nom `ring` et le périmètre de l'alerte de proximité
reprennent les décisions arrêtées. La migration proposée ne tient toutefois
pas sa promesse de conserver les couleurs. Plusieurs tâches omettent aussi
des adaptations nécessaires au code actuel.

Cette review porte sur [PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md),
confronté à [DECISIONS.md](./DECISIONS.md), à la
[spécification des écrans](./SPEC-ECRANS-HARMONISATION.md), aux scripts de
mesure et aux lecteurs du dépôt. Les observations de code visent notamment
le moteur, la configuration, les garanties, les réglages et l'annulation.

Des contrôles ponctuels ont été exécutés avec `node --import tsx` sur les
fonctions existantes. Ils établissent les contre-exemples des points 1, 3,
5, 6 et 8. La suite complète, les captures et la recette Figma n'ont pas été
exécutées : cette review ne valide pas une implémentation.

## Corrections prioritaires

| Point | Tâches du plan | Correction |
|---|---|---|
| 1 | M1, M2, proposition P4, F4 | Concevoir une migration qui conserve réellement les couleurs existantes |
| 2 | R4 | Donner une identité distincte aux fonds de page et de carte dans les promesses |
| 3 | M2, M3 | Conserver l'enveloppe pendant une saisie et revoir le périmètre des palettes affectées |
| 4 | M3, M4, M6 | Rendre le banc exécutable après le changement de format et fixer son protocole |
| 5 | H1 à H5 | Définir l'identité et les capacités des palettes dans Harmonisation |
| 6 | H0, H2, H4, H5 | Partager les candidats de réglage et définir les coordonnées des zones |
| 7 | H4 | Distinguer l'annulation d'Harmonisation de celle de la session du plugin |
| 8 | P2, P7 | Placer la marque de teinte du Color shift sur son défaut Tailwind |
| 9 | H1, H5 | Prendre en charge les onglets désactivés dans le socle |
| 10 | R3, M2, M4 | Fixer le format 11 et sa migration dans un lot cohérent |

Les points 1 à 4 empêchent de considérer les lots concernés comme prêts à
exécuter. Les points 5 à 10 précisent les comportements et les dépendances
nécessaires aux tâches suivantes.

## 1. L'ajout des crans change des couleurs déjà présentes

**Défaut établi.** La proposition P4 et M2 ajoutent 400, 500 et 950 par
interpolation. Conserver les anciennes clartés et les parts ne suffit pas
à conserver les couleurs de leurs crans.

Dans [palette.ts](../../../../../packages/couleur/src/palette.ts),
`ancrageDe` choisit le cran le plus proche de la clarté du départ.
`rampesDe` y remplace la couleur calculée par les octets de la référence.
Ajouter un cran peut déplacer cet ancrage et changer l'ancien cran porteur.

Contre-exemple exécuté : recette par défaut actuelle, retrait de 400, 500 et
950 avec leurs clartés, puis ajout selon M2. La recette de départ est valide
au format 10. Les palettes ont une dérive constante nulle.

| Référence | Ancrage Light avant | Ancrage Light après | Couleur de l'ancien cran après migration |
|---|---|---|---|
| `#EAB308` | 300 | 400 | `#FEC20A` au 300 |
| `#EF4444` | 600 | 500 | `#D83738` au 600 |

Deux autres mécanismes changent les couleurs :

- `borneDesFonds` prend 0,4 quand le cran 400 manque. L'insertion prescrite
  lui donne ici 0,41333333333333333. Pour la référence `#3B82F6`, le cran
  Vivid Dark 300 passe de `#153366` à `#163464`.
- Une recette valide sans cran 50 prend sa borne basse Dark dans
  `PREREGLAGES[11]`. Le changement de M1 la fait passer de 0,18 à 0,145,
  même si la recette ancienne garde tous ses champs. Dans le contrôle
  exécuté avec `#3B82F6`, Vivid Dark 100 passe de `#111C2D` à `#0F1C30`.

**Correction à apporter.** Compléter le schéma et la stratégie de
compatibilité avant M1 et M2. La conservation des couleurs doit couvrir
l'ancrage et les bornes implicites des fonds, en plus des parts et des
clartés. Si cette conservation exige des paramètres de compatibilité, les
définir dans le schéma 11. Si l'ajout de nuances doit au contraire changer
les couleurs, soumettre cette exception à Q3 au mainteneur et retirer la
promesse générale de F4.

Ne pas remplacer le défaut par un simple cran porteur conservé sans revoir
l'invariant : le produit promet actuellement un ancrage au cran de clarté
la plus proche. Le choix de compatibilité doit traiter ces deux exigences.

**Preuve attendue.** Comparer les hexadécimaux de tous les anciens numéros
avant et après lecture, pour les formats 8, 9 et 10. Couvrir les listes sans
50, sans 400, sans 500 et sans 950, les courbes personnalisées, les palettes
libres et les palettes figées. Vérifier aussi l'absence d'écriture pendant
la lecture et l'égalité après rangement puis relecture.

## 2. R4 doit distinguer la carte de la page dans chaque promesse

**Défaut établi dans le découpage.** R4 étend `FondDeGarantie`, mais ne
définit pas la représentation de la carte dans `Designation`. Dans
[promesses.ts](../../../../../packages/couleur/src/promesses.ts), le seul
fond extérieur à une palette est `{ nature: 'fond', couleur }`.

Réutiliser cette forme pour la carte rend les deux promesses indiscernables
pour plusieurs lecteurs :

- `fondDeLaPromesse`, dans
  [presentation.ts](../../../../../packages/plugin-palettes/src/presentation.ts),
  associe tout second membre sans cran au fond de page ;
- `caseDeLaReglette`, dans
  [modeleDesGaranties.ts](../../../../../packages/plugin-palettes/src/ui/modeleDesGaranties.ts),
  envoie toute désignation `fond` sur la case Page ;
- `cleDe`, dans [limites.ts](../../../../../packages/couleur/src/limites.ts),
  produit la même clé pour les deux fonds. Une garantie déjà manquée contre
  la carte pourrait alors borner le réglage parce que celle contre la page
  était tenue au départ.

**Correction à apporter.** Définir une désignation ou un identifiant de fond
distinct et le transmettre jusqu'aux lecteurs. Ajouter explicitement
`limites.ts` et
[ui/garanties.ts](../../../../../packages/plugin-palettes/src/ui/garanties.ts)
au périmètre de R4 : case Carte, positions des cases, arcs, libellés et
spécimens. Une colonne supplémentaire seule ne traite pas la réglette.

**Preuve attendue.** Tester deux promesses G7 dont l'une est tenue contre la
page et l'autre manquée contre la carte. Vérifier leur désignation, leur
case, leur libellé et leur effet distinct sur la limite dynamique. Ajouter
une capture de la réglette avec les deux fonds.

## 3. Une saisie de part supprime l'enveloppe proposée

**Défaut établi.** M2 décrit le retour par défaut, mais omet le chemin de
saisie ordinaire. Dans
[configuration.ts](../../../../../packages/plugin-palettes/src/configuration.ts),
`poserValeur` remplace le profil par `{ part: valeur }`. Le contrôle avec un
profil `{ part: 0.85, enveloppe: ... }` rend seulement `{ part: 0.8 }`.
La première saisie réactiverait donc la part constante.

Le plan attribue aussi le retour par défaut à `poserValeur`, alors que la
carte passe par `retablir(recette, 'parts')`.

**Correction à apporter.** Distinguer les deux opérations dans M2 :

- une saisie conserve les autres champs du profil, notamment `enveloppe` ;
- `retablir` reprend les parts et les enveloppes du défaut ;
- `estParDefaut` compare les enveloppes et les parts.

Revoir `palettesModifiees` dans le même lot. Il exclut actuellement les
palettes à une intensité et celles qui ont leurs parts propres. Avec le
`p0` commun prescrit par M3, ces palettes peuvent pourtant changer de
couleur quand la part commune change. Le commentaire de `retablir` promet
également de les épargner.

**Preuve attendue.** Tester la saisie avec et sans enveloppe, le retour par
défaut, le compte des palettes concernées, une intensité unique et des
parts propres dont l'enveloppe limite effectivement la chroma.

## 4. Le banc prévu en M3 ne passera plus la validation

**Défaut établi par les dépendances.** M3 demande d'importer `REGLE_FINALE`
depuis [variantes.ts](./Mesures/variantes.ts). Ce module appelle au
chargement `validerRecette` sur `recette-mainteneur.json`, au format 10.
Après M2, `validerRecette` exige 11 : l'import échoue avant la comparaison.

M4 change aussi la forme de `derives`, que les données historiques
conservent. Les fichiers du banc à adapter ne figurent pas dans ces tâches.

**Correction à apporter.** Isoler la règle de référence dans un module sans
chargement de recette, ou prévoir une adaptation explicite du chargeur du
banc par `classerRecette`. Garder les données historiques dans leur format
d'origine. Spécifier séparément les données migrées et les recettes neuves
aux nouvelles valeurs par défaut.

**Le protocole de M6 doit aussi être précisé.**
[garanties-regles.ts](./Mesures/garanties-regles.ts) balaie 72 teintes à deux
clartés, quatre couples de textes des boutons et deux profils. Son jugement
mesure aussi contre la carte des garanties autres que G7, via
`Object.entries(supports)` pour chaque fond de page. Le moteur final doit
laisser ces autres garanties inchangées, conformément à DECISIONS.md.

Les 48 384 couples et les 144 échecs de
[GARANTIES-RETENUES.json](./Mesures/GARANTIES-RETENUES.json) ne décrivent donc
pas directement le nombre de contrôles de `verifierPromesses`. Une mesure
sur la seule recette par défaut ne couvre en outre pas Dark inversé, où se
trouvent les échecs cités.

Remplacer « de l'ordre des 144 » par un protocole reproductible : mêmes
références, parts, dérives, courbes et sens, avec deux résultats séparés
pour les garanties du produit et les mesures supplémentaires du banc.
Fixer les comptes attendus après cette mise en correspondance.

**Preuve attendue.** Le script s'importe après M2 et M4, conserve ses témoins
historiques et compare des entrées identiques. Les vecteurs figés doivent
inclure une intensité unique et des réglages non nuls, en plus des trois
références nominales de M3.

## 5. Harmonisation doit employer les identifiants et traiter les palettes particulières

**Défaut établi pour l'identité ; comportement à préciser pour les capacités.**
H1 reprend l'état de la section 7.1 de la SPEC, où `cochees` contient des
noms. Le modèle autorise deux palettes de même nom : le contrôle exécuté
avec deux identifiants distincts et le nom `Bleu` passe la validation.
Un renommage rendrait aussi une sélection par nom périmée.

**Correction à apporter.** Ranger des `Palette.id` dans `cochees`, `regler`,
les paires, les instantanés d'annulation et les index de zones. Les noms
servent à l'affichage. Préciser les transitions après suppression, import,
synchronisation et passage sous deux palettes.

H2 à H5 supposent par ailleurs des rampes Soft/Vivid et les crans des rôles.
Or [recette.ts](../../../../../packages/couleur/src/recette.ts) et
[nuances.ts](../../../../../packages/couleur/src/nuances.ts) permettent :

- une intensité unique, sans clé `soft` ni `vivid` dans `Rampes` ;
- une liste libre sans certains crans des rôles ;
- une palette figée, dont les couleurs ne changent pas par réglage global.

M5 accepte même certaines de ces palettes dans les paires dès que les crans
requis sont présents. Le plan doit donc définir ce que « Comparer » ouvre
pour elles. Une palette figée ne doit pas recevoir une réglette de teinte
qui prétend changer ses couleurs.

**Preuve attendue.** Deux noms identiques restent sélectionnables séparément.
Un renommage conserve la sélection. Une suppression retire les références
à la palette. Tester une comparaison mixte unique/deux intensités, une
liste incomplète et une paire comprenant une palette figée.

## 6. Les zones doivent utiliser exactement le candidat appliqué par le geste

**Ambiguïté à lever avant H0.** Les zones sont exprimées en valeurs de
réglette, mais le test de H0 exige qu'une paire en alerte ait une zone
contenant 0. Pour une palette déjà réglée, c'est sa valeur courante qui doit
appartenir à la zone. Zéro peut être une position sans alerte.

La teinte d'Harmonisation déplace les deux profils du même écart. Leur
écart initial réduit la course réellement possible. Avec Soft à +25° et
Vivid à −20°, l'écart commun autorisé va de −10° à +5°. Demander Vivid à
−10° par `reglerTeinte(..., 'deux', -10)` donne effectivement Soft +30° et
Vivid −15°, car Soft atteint sa borne.

Le prototype `tourner` de
[generer-ensembles.ts](./Mesures/generer-ensembles.ts) ne peut pas être porté
tel quel : il refuse notamment le retour à la couleur originale avec
`return null`. Le geste courant, dans
[edition.ts](../../../../../packages/plugin-palettes/src/edition.ts), nettoie
les réglages et autorise ce retour.

**Correction à apporter.** Définir un constructeur de candidat commun au
calcul et au geste, sans dépendance du moteur vers le plugin. Décrire les
trois coordonnées : écart commun, valeur du porteur, valeur du profil
affiché. Intersecter les bornes des profils et les limites applicables.
Représenter les positions impossibles explicitement.

H2 doit traiter une paire qui ne peut pas être distinguée dans la course
permise. La sélection du plus petit déplacement ne doit pas recommander
une position que la réglette refusera.

**Preuve attendue.** Couvrir des profils déjà décalés différemment, le retour
à zéro, le changement de profil affiché et une paire sans sortie possible.
Vérifier que la couleur simulée à chaque position est celle du geste appliqué.
Définir aussi ce que compte « 61 rampes » : 61 palettes candidates peuvent
produire 244 rampes, deux profils dans deux thèmes. Les rampes de l'autre
palette doivent être calculées une seule fois par balayage.

## 7. L'annulation existante a une portée différente de celle de H4

**Défaut établi dans la dépendance annoncée.** H4 demande le même historique
que Création, mais une annulation limitée aux réglages faits dans
Harmonisation depuis son ouverture.

Dans [annulation.ts](../../../../../packages/plugin-palettes/src/ui/annulation.ts),
`ouverture` conserve la première version de chaque palette lue dans la
session du plugin. `annuler` remplace toute la palette par cette version.
`frontiere.annulerLesModifications` appelle cette fonction.

Brancher ce geste sur H4 annulerait aussi des changements antérieurs dans
Création, voire un nom ou une dérive sans rapport avec Harmonisation.

**Correction à apporter.** Définir un état d'entrée propre à Harmonisation,
par identifiant de palette, et les champs restaurés. Ranger la recette
résultante par la frontière existante pour conserver la file et la gestion
des refus. Préciser si le point de départ se renouvelle à chaque entrée
dans l'onglet et comment traiter une modification faite dans Création entre
deux visites.

**Preuve attendue.** Modifier une palette dans Création, entrer dans
Harmonisation, modifier deux palettes et annuler la première. Le changement
antérieur de Création et la seconde palette restent. Un refus de rangement
restaure aussi l'état visuel et le point de départ d'annulation.

## 8. Le défaut de teinte du Color shift n'est pas zéro

**Contradiction avec le comportement actuel.** P7 reprend la section 3.3
de la SPEC, qui prescrit un défaut 0 pour les réglettes. Dans
[editeur.ts](../../../../../packages/plugin-palettes/src/ui/derive/editeur.ts),
`depart` rend `prereglageDe(...)[bout]` pour la teinte et 0 pour les deux
autres grandeurs. `toutRetablir` applique également Tailwind.

Sur `#3B82F6`, le préréglage actuel vaut −6,01° et +6,03°. Ces valeurs
changeront avec M4, mais leur défaut ne devient pas nécessairement nul.
Une marque « par défaut » à 0 serait distincte de la position atteinte par
le bouton.

**Correction à apporter.** Définir la marque par grandeur : Tailwind pour
chaque bout de teinte, zéro pour saturation et luminosité. Faire utiliser
la même valeur par la marque, le bouton, son état désactivé et le résumé.
Reporter la correction dans la SPEC. Si un défaut constant nul est voulu,
le présenter comme un changement de comportement à valider, avec adaptation
du préréglage et de la création des palettes.

M4 conserve les dérives rangées mais remplace leur relevé. Une dérive ancienne
peut garder `origine: 'tailwind'` sans égaler le nouveau préréglage. Revoir
`colorShiftModifie`, qui utilise aujourd'hui cette origine pour le résumé,
afin de ne pas afficher « Par défaut » avec un bouton de retour actif.

**Preuve attendue.** Après « Tout par défaut », chaque pouce rejoint sa
marque et chaque bouton individuel se désactive. Couvrir aussi une recette
migrée dont l'ancienne dérive Tailwind diffère de la nouvelle.

## 9. Le socle peut activer Harmonisation au clavier malgré sa désactivation

**Dépendance manquante.** H1 demande de désactiver l'onglet sous deux
palettes. [Onglets.ts](../../../../../packages/plugin-socle/src/ui/Onglets.ts)
ne propose aucune gestion de disponibilité. Les flèches appellent
`selectionner` sur l'onglet suivant sans vérifier `disabled`.

Ajouter seulement l'attribut au bouton laisserait donc le panneau activable
par une flèche, même si son bouton ne reçoit plus le focus.

**Correction à apporter.** Ajouter au socle une gestion des onglets
disponibles, propagée par le socle localisé. La navigation et la sélection
programmée doivent la respecter. Définir le panneau de repli lorsqu'une
suppression désactive l'onglet actif.

**Preuve attendue.** Avec une seule palette, clic, flèches et sélection
programmée ne donnent pas accès à Harmonisation. Avec deux palettes,
l'onglet devient accessible. La suppression de l'une d'elles rétablit un
onglet disponible. Vérifier les trois plugins après cette modification du socle.

## 10. La validation et la migration doivent évoluer ensemble

**Correction de découpage.** R3 exige les nouveaux crans dans la validation
du format 10, puis M2 apporte seulement la migration. Un état intermédiaire
rejette donc des recettes actuellement valides. M2 écrit ensuite une forme
11 provisoire dont M4 remplace `derives` sans changer le numéro.

L'interdiction d'essai Figma avant la fin de vague 2 limite l'exposition,
mais les commits sur `main` restent des états exécutables. Ils rendent aussi
les tests de compatibilité difficiles à conserver : R3 demande précisément
d'ajouter les crans aux anciennes recettes de test.

**Correction à apporter.** Regrouper la définition complète du format 11,
sa validation, la lecture des anciens formats et l'extension des crans
requis dans un même lot d'intégration. Les fonctions et les vecteurs peuvent
être préparés séparément avant de raccorder le lot.

Conserver des témoins valides des formats 8, 9 et 10 dans leur forme
d'origine. Ne pas les réécrire pour satisfaire le validateur courant.
Valider la forme ancienne avant les interpolations : une entrée avec
`crans` ou `courbes` absent doit se classer `illisible`, sans exception.
Définir aussi le traitement des champs nouveaux présents illicitement dans
une ancienne version.

## Ajustements du plan

| Emplacement | Correction à apporter |
|---|---|
| M3, `ParametresRampe` | `fabriquerRampe` ne reçoit pas de `mode`. Passer une seule `enveloppe?: Enveloppe`, choisie par `parametresDesRampes(recette, palette)(intensite, mode)`, ou ajouter explicitement le thème à l'API. La lecture `enveloppes?.[mode]` n'est pas définie avec la signature prescrite. |
| H0 et SPEC, section 10 | Aligner le paragraphe « Paires » sur la section 7.3 et sur M5 : exclure `surface/foreground` Dark. La section 10 le mentionne encore dans les deux thèmes. |
| H7 | Préciser comment les données de maquette sont actualisées après le changement du moteur. Une galerie calculée avec l'enveloppe et une maquette figée avec l'ancien moteur ne donnent pas des témoins visuels comparables. |
| Parallélisme P1/P2 | Les deux tâches modifient `tests/interface/interface.test.mjs`. Les séquencer, ou confier leur intégration à un seul agent. |
| Parallélisme M1/R2 | Le décrire comme une exception à l'ordre des vagues, ou le retirer : la vague 2 est actuellement déclarée dépendante de la vague 1 terminée. |
| Propositions P1 à P5 et tâches P1 à P8 | Renommer les propositions pour que « P4 » ne désigne pas à la fois une migration et un bouton. |
| R2, critère de fin | Nommer un moyen de contrôler le dessin réel de la planche. La galerie actuelle expose des états de l'interface et des métadonnées de cadres, pas le rendu Figma du modèle de planche. |
| P2, recherche finale | Inclure les commentaires concernés si `git grep "Tout rétablir" -- packages` doit être vide : `edition.ts` contient encore cette formule dans le contrat de `toutRetablir`. |
| D4, F2 à F4 | Garder le statut « recette Figma à faire » tant que F4 reste ouvert. Prévoir la recette du mainteneur avant publication si elle doit conditionner celle-ci. La seule suite verte ne valide pas F4. |

## Ordre de reprise proposé

1. Résoudre la conservation des couleurs et fixer le schéma 11 complet.
2. Compléter R4 avec l'identité des fonds et leurs lecteurs.
3. Ajouter la conservation de l'enveloppe et les effets de ses réglages à M2/M3.
4. Adapter les chargeurs du banc et fixer les entrées des comparaisons.
5. Corriger la SPEC sur l'identité des palettes, les défauts de Color shift,
   les coordonnées des zones et l'annulation.
6. Ajouter les tâches de socle et les cas de palettes particulières à la
   vague Harmonisation.
7. Réécrire les critères de fin des lots concernés avec les preuves décrites
   ci-dessus, puis soumettre les propositions de schéma au mainteneur.

## Réponse et corrections apportées

Le plan, la [spécification des écrans](./SPEC-ECRANS-HARMONISATION.md) et
DECISIONS.md ont été corrigés. Les propositions du plan s'appellent
désormais PR1 à PR7, pour ne plus se confondre avec les tâches P1 à P8.

| Point | Suite donnée |
|---|---|
| 1 | Le mainteneur renonce à conserver les couleurs : ses recettes servent au réglage et ses primitives peuvent être réécrites. Q3 change dans DECISIONS.md ; PR4 décrit la lecture des formats 8 à 10, qui prend les profils par défaut et ajoute les crans manquants sans paramètre de compatibilité |
| 2 | R4 donne à la carte une désignation distincte (`fond: 'page' \| 'carte'`) et ajoute `limites.ts` (`cleDe`) et `ui/garanties.ts` à son périmètre, avec le test d'une G7 tenue contre la page et manquée contre la carte |
| 3 | L'enveloppe porte son propre `p0` (PR1), qui ne suit pas la part commune : `palettesModifiees` reste juste. M2 précise `poserValeur`, `retablir` et `estParDefaut` |
| 4 | Nouvelle tâche M0 : le banc lit les recettes par `classerRecette` et garde ses données historiques. M6 suit un protocole écrit : un mode « produit » de `garanties-regles.ts` et le moteur jugés sur les mêmes entrées, comptes égaux exigés. M3 fige des vecteurs avec une intensité unique, des réglages et des parts propres |
| 5 | PR6 : l'état d'Harmonisation range des identifiants ; les palettes à une intensité, libres et figées ont un comportement défini ; SPEC, section 7.1, corrigée |
| 6 | H0 : `candidatDeTeinte` partagé par le geste et le calcul, trois coordonnées nommées, course par intersection des bornes, `sortieLaPlusProche` ; SPEC, section 10, corrigée |
| 7 | PR6 et H4 : un point de départ propre à l'onglet, par palette, renouvelé à chaque entrée ; `frontiere.annulerLesModifications` n'est pas employé ; SPEC, section 7.7, corrigée |
| 8 | PR7 et P7 : le défaut de teinte est le préréglage Tailwind de chaque bout ; `colorShiftModifie` compare les valeurs ; SPEC, section 3.3, corrigée |
| 9 | Nouvelle tâche S1 dans le socle : onglets indisponibles, au clic, au clavier et par programme, avec repli |
| 10 | R3 garde la liste des crans requis d'aujourd'hui ; M2 définit tout le format 11 en un lot (schéma, relevé, validation, crans requis, lecture des anciens formats), avec des témoins des formats 8, 9 et 10 jamais réécrits |
| Ajustements | `ParametresRampe` reçoit une seule `enveloppe`, choisie par `parametresDesRampes` ; SPEC, section 10, exclut `surface/foreground` Dark ; H7 régénère les données de la maquette avant les captures ; vague 3 entièrement séquencée ; parallélisme M1 et R2 retiré ; critère de R2 sur le modèle, rendu à la recette F4 ; P2 inclut les commentaires ; D4 garde « recette Figma à faire » jusqu'à F4, et la publication du kit n'attend pas F4 |
