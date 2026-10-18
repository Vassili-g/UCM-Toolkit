# Recette d'UCM Architect

Les retours du mainteneur après son essai du plugin dans Figma.
Chaque point donne la demande, ce que le code fait aujourd'hui, la proposition
et la décision attendue. Les maquettes sont dans
[Maquettes/MAQUETTE-RECETTE-ARCHITECT.html](./Maquettes/MAQUETTE-RECETTE-ARCHITECT.html) :
chaque écran « Aujourd'hui » est un état réel de la galerie, figé en thème
sombre ; chaque écran « Proposé » part du même DOM et de la même feuille de
style.

Les noms de variables cités ici sont inventés. Ils reproduisent les cas relevés
pendant la recette.

## Synthèse

La conclusion du mainteneur porte sur tout le plugin : « trouver un langage
visuel global et un mode d'affichage constant pour comprendre ce qui est ciblé
et le résultat qu'on aura après la validation ». Trois des bugs relevés en
viennent :

- le plugin montre l'ancien nom avec un segment surligné, jamais le nom que
  Figma recevra (R4, R5, R7) ;
- une seule couleur, l'ambre, marque à la fois ce qui disparaît, ce qui reste
  et ce qui est en question (R10) ;
- la question des tailles oppose deux formes que la règle UCM place chacune à
  son endroit (R3).

La proposition tient en une grammaire (R10) appliquée à chaque écran : rouge
pour la forme qui disparaît, vert pour la forme retenue, ambre pour ce qui
attend une décision, bleu pour les actions seulement ; la gauche pour
aujourd'hui, la droite pour après.

| Point | Sujet | Nature | Décision |
|---|---|---|---|
| R1 | Écritures affichées par leur format | Interface | D1 |
| R2 | Ligne d'un terme : état à gauche, origine à droite | Interface et bug | D2 |
| R3 | Question des tailles | Bug du kit | D3 |
| R4 | À appliquer : avant et après | Interface | D4 |
| R5 | `colors → color` ne montre pas l'écriture | Bug d'affichage | D4 |
| R6 | Cartes de À trancher | Interface | D6 |
| R7 | `danger → Danger` illustre des lignes sans rapport | Bug d'affichage | D7 |
| R8 | Sections Écriture et Termes | Interface | D8 |
| R9 | Fiche d'un terme | Interface | D9 |
| R10 | Langage visuel global | Principe | D10 |
| R11 | Galerie : les états de Règles ne se jouent plus | Outil | Aucune |

## R1. Afficher les écritures par leur format

**Demande.** « Afficher les règles avec leur format : PascalCase,
minuscule-tiret, etc. »

**Constat.** Le résumé de l'écriture
([`ui/regles.ts`](../../../../../packages/plugin-architect/src/ui/regles.ts),
`libelleDeConvention`) lit `CONVENTIONS[].libelle.fr` du kit
([`referentiel/conventions.ts`](../../../../../packages/kit/src/referentiel/conventions.ts)).
Deux libellés se lisent comme leur format (`PascalCase`, `camelCase`), les
autres le décrivent : « Minuscules · tirets », « Minuscules · tirets bas »,
« Majuscule initiale · espaces », « Minuscules · soudé ». Le même libellé sert
à la carte d'écriture d'À appliquer (« Groupes · PascalCase ») et aux listes de
la feuille de l'écriture.

**Proposition.**

- Chaque écriture s'écrit dans son propre format, en police de code, dans un
  jeton gris : `PascalCase`, `camelCase`, `minuscules-tirets`,
  `minuscules_tirets_bas`, `Majuscule initiale`, `minusculessoudées`. Le
  libellé descriptif reste pour les lecteurs d'écran.
- Le spécimen vit dans le kit, à côté du libellé : un champ
  `specimen: { fr, en }` dans `CONVENTIONS`. En anglais, les noms d'usage :
  `PascalCase`, `camelCase`, `kebab-case`, `snake_case`, `Sentence case`,
  `flatcase`.
- Chaque ligne du résumé montre un nom réel du fichier, la partie concernée
  en texte clair, le reste en gris : les groupes de `Button/Color/Primary/padding-y`
  pour Groupes, `padding-y` pour Noms. Le bilan porte déjà cet exemple
  (`LigneDEcriture.exemple`).
- Le spécimen remplace le libellé partout où une écriture est nommée : résumé
  de Règles, feuille de l'écriture, tête des cartes d'écriture d'À appliquer,
  écran de premier lancement.

**Décision D1.** Valider les spécimens français et anglais, et l'exemple réel
à droite de chaque ligne.

## R2. La ligne d'un terme : l'état à gauche, l'origine à droite

**Demande.** Dans Termes, mettre la pastille UCM à droite ; à gauche,
afficher si le terme est remplacé ou s'il remplace d'autres termes, avec une
nomenclature visuelle commune (« pastille rouge contre verte ? »).

**Constat.** `creerLigneDeTerme` (`ui/regles.ts`) pose le mot puis la pastille
d'origine à gauche, puis un résumé gris (`resumeDuTerme`,
[`ui/listeDesTermes.ts`](../../../../../packages/plugin-architect/src/ui/listeDesTermes.ts)).
Un défaut s'y ajoute. Un terme que UCM remplace (`colors`, remplacé par
`color`) reçoit de la projection `origine: 'ucm'`, `statut: 'regle'`,
`remplace: []` et `avec: 'color'`
([`projection.ts`](../../../../../packages/plugin-architect/src/projection.ts),
`entreeDuTerme`). `resumeDuTerme` ne lit pas `avec` pour ce statut : la ligne
affiche `colors`, la pastille UCM et rien d'autre. Le terme qui va disparaître
ressemble à un terme UCM retenu.

**Proposition A (recommandée).**

| Colonne | Contenu |
|---|---|
| 8 px | La puce d'état : verte, le terme est retenu et remplace d'autres termes ; rouge, il sera remplacé ; ambre, il attend une réponse ; cercle vide, aucune règle ; grise, terme UCM non appliqué dans ce fichier |
| Souple | Le mot, puis « remplace » suivi des termes remplacés en jetons rouges, ou « remplacé par » suivi du terme retenu en jeton vert, ou « à trancher avec » suivi d'un jeton ambre |
| Contenu | La pastille d'origine, UCM ou Personnalisé ; vide pour un terme sans règle |
| 40 px | Le nombre de variables |
| 12 px | Le chevron |

**Variante B.** Une étiquette de 72 px au lieu de la puce : « Remplace 2 »,
« Remplacé », « À trancher », « Sans règle ». Elle se lit sans légende, mais
prend 64 px de plus à chaque ligne.

Les deux corrigent le défaut : la ligne de `colors` dit « remplacé par
`color` ».

**Décision D2.** Choisir la puce (A) ou l'étiquette (B).

## R3. La question des tailles oppose dossiers et variables

**Demande.** La question « Quelle écriture garder pour les tailles ? » met
face à face `sm md lg`, employé dans des noms de variables (`Radius/sm`), et
`small medium large`, employé dans des dossiers (`Button/Size/Small/padding-y`). La règle est déjà fixée : `small`, `medium`,
`large` dans les dossiers, `sm`, `md`, `lg` dans les noms de variables.

**Constat.**

- La règle par position est la décision T06 et S02 du
  [plan de la nomenclature](../4%20Nomenclature/PLAN-IMPLEMENTATION.md). Son
  renommage par catégorie est en cours dans la copie de travail, non commité :
  `termePourCategorie` dans `referentiel/termes.ts`,
  `identifiantParCategorie` dans `referentiel/vocabulaire.ts`, et leurs
  lecteurs `normalisation.ts` et `vocabulaire-du-fichier.ts`.
- La question vient d'ailleurs : `questions.ts` du kit (lignes 309 à 324)
  pose une question `echelle` dès que les deux formes d'une taille partagent
  une place, sans regarder si l'une est un dossier et l'autre un nom.
- Une fois le renommage par catégorie commité, la question contredira la
  règle : elle demandera de choisir entre deux formes que le kit renomme déjà
  chacune à sa place.
- Y répondre crée des termes personnalisés valables dans toutes les catégories
  (`session.ts`, `case 'echelle'`) : « Garder `sm md lg` » ajoute la règle
  `sm` remplace `small`, qui renommerait aussi les dossiers `Small` en `Sm`.

**Proposition.**

- Retirer la question `echelle` du kit, de la projection et de l'écran :
  `questions.ts`, le type `Question` de `harmonisation.ts`, `QuestionVue`,
  `Reponse` (`echelle`), `carteDEchelle`, les textes `questionDEchelle`,
  `indiceDEchelle`, `garderCelleCi`, et leurs tests. Une clé `echelle:…` déjà
  rangée dans `plusTard` est ignorée à la lecture.
- Les tailles arrivent dans À appliquer comme termes UCM, avec leur place dans
  la ligne de détail : `small → sm`, « Dans les noms · 12 variables » ;
  `sm → small`, « Dans les dossiers · 6 variables ».
- Si le mainteneur a répondu à la question pendant la recette, son fichier
  porte des termes personnalisés `sm`, `md`, `lg` ou `small`, `medium`,
  `large`. Il les retire dans Règles, sur la fiche de chacun : Supprimer la
  règle.

**Question ouverte.** Chaque taille fait sa propre carte : `small → sm`,
`medium → md`, `large → lg`, et leurs inverses dans les dossiers, soit
jusqu'à six cartes. Une carte unique « Tailles » regrouperait les six,
avec une ligne par forme. La projection range aujourd'hui un renommage sous le
terme qu'il écrit ; ce regroupement demanderait une clé par registre.

**Décision D3.** a) Retirer la question des tailles. b) Garder une carte par
taille, ou regrouper les tailles en une carte.

## R4. À appliquer : voir l'avant et l'après

**Demande.** Voir à la fois les chemins en cause et les chemins tels qu'ils
seront renommés, peut-être en deux colonnes, avec la nomenclature visuelle
commune.

**Constat.**

- Chaque renommage porte son nom final complet, `nouveauNom`, calculé avec
  toutes les règles : terme, écriture des groupes, écriture des noms. C'est ce
  nom qu'Appliquer écrit (`session.ts`, `demandesDeRenommage`).
- L'écran ne le montre jamais. `ligneDuRenommage` (`projection.ts`) découpe
  l'**ancien** nom autour d'un seul segment (`LigneVue` : `avant`, `terme`,
  `apres`), et `fabriquerChemin` (`ui/aAppliquer.ts`) surligne ce segment en
  ambre.
- `LigneVue.aussi` liste les autres règles qui touchent le nom. La projection
  le calcule, l'écran ne le lit pas.

**Proposition.**

- Une carte dépliée montre deux colonnes, « Aujourd'hui » et « Après
  l'application ». À droite, le nom que Figma recevra.
- Le découpage se fait par segment, sur `ancienNom` et `nouveauNom` : chaque
  segment différent est rouge à gauche et vert à droite, les autres restent
  gris. Un renommage ne change pas le nombre de segments : les deux colonnes
  s'alignent segment pour segment.
- Sous 520 px de fenêtre, la place manque pour deux chemins. L'après passe
  sous l'avant, précédé d'une flèche, et les intitulés de colonnes
  disparaissent. La fenêtre fait 640 px par défaut et 360 px au minimum.
- La tête d'une carte de terme s'écrit en jetons : `colors` en rouge, une
  flèche, `color` en vert. La ligne de détail dit ce que la carte entraîne
  aussi, d'après `aussi` : « 313 variables · 280 changent aussi
  d'écriture ».
- Les contrats changent : `LigneVue` porte les segments de l'avant et de
  l'après, au lieu de trois morceaux autour d'un seul. La fiche d'un terme
  (R9) et les exemples d'À trancher (R6) emploient la même ligne.

**Décision D4.** Valider les deux colonnes, leur empilement sous 520 px et la
ligne de détail des cartes de terme.

## R5. `colors → color` : l'écriture du projet est-elle prise en compte ?

**Demande.** Les lignes de `colors → color` montrent `colors/…/light/700` en
minuscules alors que les dossiers du fichier sont en PascalCase. L'écriture du
projet est-elle prise en compte ?

**Réponse.** Oui. Le renommage de `colors/Neutral/light/700` est
`Color/Neutral/Light/700` : le terme et l'écriture des groupes. Cocher la
carte `colors → color` applique les deux. L'écran le cache, pour deux
raisons :

1. la ligne montre l'ancien nom (R4) ;
2. un renommage n'appartient qu'à un groupe, celui de sa règle la plus
   prioritaire ; les termes passent avant l'écriture (`projection.ts`,
   `classeDeLaCle`). La carte « Groupes · PascalCase » ne compte donc pas les
   280 noms qui changent aussi d'écriture sous `colors → color`.

**Proposition.** Les deux colonnes de R4 montrent `Color` et `Light` en vert à
droite. La ligne de détail de la carte dit « 280 changent aussi d'écriture ».

**Décision.** Comprise dans D4.

## R6. Les cartes de À trancher

**Demande.** Les cartes sont difficiles à lire quand il y en a beaucoup ; on
ne sait pas où regarder ; le bouton bleu attire l'œil plus que le reste ; trop
de contours. Plusieurs propositions en maquette.

**Constat.** Une carte de paire porte trois contours (la carte, puis chaque
colonne), plus le contour bleu de la colonne proposée (`.colonne.propose`). Le
bouton « Garder » de la colonne proposée est plein et bleu (`questions.ts`,
`poids: 'principal'`). Le pied ajoute deux boutons bordés et un bouton texte.
Mesuré sur la maquette à 640 px : une carte de paire mesure 188 px, une carte
de faute 134 px ; cinq questions occupent 1 019 px et montrent cinq boutons
bleus.

**Propositions.**

| | Proposition 1 : face à face sans bruit | Proposition 2 : la proposition en tête | Proposition 3 : choisir, puis valider |
|---|---|---|---|
| Forme | Face à face gardé ; un contour par carte, un filet entre les colonnes | La proposition en jetons, `bg` → `background`, puis un nom réel avant → après | Une liste à cocher, la proposition déjà choisie, chaque option avec son effet |
| Boutons | « Garder » bordé dans chaque colonne ; « proposé » écrit à côté du terme ; Termes différents et Autre terme… en texte | Un bouton bordé qui accepte la proposition ; Garder l'autre, Termes différents, Autre terme…, Plus tard en texte | Un bouton Valider bordé ; Autre terme… et Plus tard en texte |
| Bleu | Aucun | Aucun | Aucun |
| Hauteur | 134 à 188 px | 118 px pour toutes | 169 à 222 px |
| Cinq questions | 1 019 px | 777 px | 1 191 px |
| Clics pour répondre | 1 | 1 | 2 |

La proposition 2 est recommandée. Elle donne aux cartes d'À trancher le dessin
de celles d'À appliquer : on lit l'effet d'un oui avant de répondre. Toutes
ses cartes ont la même hauteur, quelle que soit la question.
La proposition 1 garde le face à face validé lors de la refonte, en retirant
le bruit. La proposition 3 est la plus lente.

Dans les trois, l'indice (Abréviation, Synonymes) devient un texte gris au
lieu d'une pastille, et le terme en question garde l'ambre (R10).

**Décision D6.** Choisir la forme des cartes.

## R7. `danger → Danger` illustre des lignes sans rapport

**Demande.** La carte « `danger → Danger` +565, Groupes · PascalCase » liste
`primary/light/500`, `secondary/light/700`, `success/vivid/light/400` : rien à
voir avec `danger`. Si c'est pour montrer le passage au PascalCase, c'est trop
confus.

**Constat.** Pour une carte d'écriture, `groupeVue` (`projection.ts`) prend
pour tête la paire de segments la plus fréquente parmi les renommages du
groupe : ici `danger` → `Danger`. Les lignes sont les trois premiers
renommages dans l'ordre du fichier, chacune surlignée sur son **premier**
segment de groupe changé (`segmentDEcriture`). Les deux ne se rapportent pas
l'un à l'autre. Les autres segments changés de la ligne, comme `light` →
`Light`, ne sont pas marqués.

**Proposition.**

- La tête d'une carte d'écriture dit la règle : « Groupes → `PascalCase` »,
  le spécimen de R1 en jeton vert, et le nombre de variables.
- Les lignes suivent R4 : `primary/light/500` à gauche, `Primary/Light/500` à
  droite, chaque segment changé coloré.

**Décision D7.** Valider la tête des cartes d'écriture.

## R8. Les sections Écriture et Termes

**Demande.** On ne voit pas assez que ce sont deux sections qui font deux
choses différentes ; une phrase courte explicative pour chacune.

**Constat.** `monterRegles` (`ui/regles.ts`) pose deux intertitres de 12 px,
de même dessin que ceux d'À appliquer. Rien ne dit ce que règle chacun.

**Proposition A (recommandée).** Deux sections, chacune titrée en 15 px avec
sa phrase en dessous, séparées par un filet pleine largeur :

- **Écriture** : « Comment chaque nom s'écrit : majuscules et séparateurs. »
  Le bouton Modifier à droite du titre ; les trois lignes avec leur spécimen
  et leur exemple (R1).
- **Termes** : « Quels mots employer : un terme retenu remplace ses
  variantes. » Les filtres, puis la recherche à leur droite, puis la liste.

**Variante B.** Deux sous-onglets, Écriture et Termes, sous les onglets du
plugin. Ils séparent mieux les deux fonctions, mais ajoutent un niveau de
navigation dans un onglet ; ils ne se justifient que si la liste des termes
devient très longue.

**Décision D8.** Choisir les sections (A) ou les sous-onglets (B).

## R9. La fiche d'un terme

**Demande.** Les éléments flottent et l'on ne comprend pas le lien entre eux ;
il faut savoir quelles informations comptent, quelles actions, quelles données
et pourquoi. Animation de glissement à l'ouverture ; supprimer la poignée
factice ; supprimer le bouton Fermer redondant ; un fond au ✕.

**Constat.**

- La feuille vient du socle
  ([`plugin-socle/src/ui/Feuille.ts`](../../../../../packages/plugin-socle/src/ui/Feuille.ts)),
  qu'UCM Architect est seul à employer. Elle pose une poignée décorative
  (`.feuille-poignee`, `aria-hidden`) qui n'attrape rien, et un ✕ sans fond.
  Elle entre en montant de 12 px en 160 ms (`@keyframes feuille-entree`) et
  disparaît d'un coup à la fermeture (`element.remove()`).
- La fiche (`ui/feuilles.ts`) empile une pastille, la définition, une section
  « Remplace » et une section « Employé dans », au même niveau. Rien ne dit
  que la première produit des renommages, ni que la seconde montre les noms
  déjà justes. Les fiches UCM et « remplacé » ajoutent un bouton Fermer en
  pied, qui double le ✕.

**Ce que la fiche doit dire, dans l'ordre.**

| Rang | Information | Pourquoi | Donnée |
|---|---|---|---|
| 1 | Le terme et son origine | Savoir de quoi on parle et qui décide | `FicheVue.mot`, `origine`, `categorieUcm`, `definition` |
| 2 | La règle | Ce qu'elle cible et ce qu'elle produit, en une ligne : termes remplacés en rouge → terme retenu en vert | `FicheVue.remplace` |
| 3 | L'effet dans ce fichier | Combien de noms vont changer, et comment, avant d'agir | À ajouter : les renommages dus à ce terme, avant → après |
| 4 | Ce que l'on modifie | Ajouter ou retirer un terme remplacé ; une forme fixée par UCM ne se retire pas | `FicheVue.remplace[].ucm` |
| 5 | La preuve | Les noms qui emploient déjà le terme | `FicheVue.emploi` |

**Proposition.**

- En-tête : le terme en police de code, son origine juste à côté (« UCM ·
  rôle », « Personnalisé »), le ✕ à droite sur un fond `--fond-bloc` de
  24 × 24 px, `--fond-note` au survol. Plus de poignée.
- Sous l'en-tête, la définition en texte gris.
- Un bloc gris « la règle » : `bg` `back` → `background`, puis « 15 variables
  à renommer · 40 déjà écrites ainsi ».
- « À renommer · 15 » : trois noms avant → après, dessinés comme dans
  À appliquer, et un lien « Voir dans À appliquer » qui ouvre l'onglet sur la
  carte du terme, dépliée.
- « Termes remplacés » : chaque terme en jeton rouge avec son nombre de
  variables, puis Retirer, ou « Fixé par UCM » pour une forme du référentiel ;
  + Ajouter dans l'en-tête du bloc.
- « Déjà employé · 40 » : trois noms, le terme retenu en vert.
- Le pied ne porte que les gestes sur la règle : « Ne pas appliquer ce terme
  dans ce fichier » pour un terme UCM ; « Supprimer la règle », bouton texte
  rouge, et « Proposer à UCM », bouton bordé, pour un terme personnalisé. Plus
  de Fermer. La feuille de l'écriture garde Annuler à côté d'Enregistrer, et
  la confirmation garde Retour à côté de Renommer : chacun y est l'autre
  réponse à une décision.
- Le mouvement : à l'ouverture, le voile passe de transparent à
  `--fond-voile` en 200 ms et la feuille glisse depuis le bas de toute sa
  hauteur en 280 ms (`cubic-bezier(0.2, 0.8, 0.2, 1)`). À la fermeture, le
  mouvement inverse en 200 ms (`ease-in`), puis l'élément est retiré et le
  focus revient à la ligne du terme. Avec `prefers-reduced-motion`, un fondu
  de 120 ms.
- Mesuré dans la maquette : la fiche proposée tient entière dans la fenêtre de
  720 px, sans défilement.

La fiche d'un terme sans règle et celle d'un terme remplacé suivent le même
ordre. La première n'a ni règle ni effet : elle montre la preuve, puis
Remplacer par… et Remplace d'autres termes… en pied. La seconde montre la
règle du terme qui la remplace, en lien vers sa fiche.

**Décision D9.** Valider l'ordre de la fiche, le pied sans Fermer et le
mouvement.

## R10. Le langage visuel global

**Demande.** Trouver un langage visuel global et un mode d'affichage constant,
pour comprendre ce qui est ciblé et le résultat qu'on aura après validation.

**Constat.** `styles.css` réserve l'ambre (`mark`, rôles d'avertissement) au
« terme en cause ». En pratique il marque le terme qui sera remplacé dans
À appliquer, le terme retenu dans « Employé dans » d'une fiche, et le terme en
question dans À trancher. Le bleu marque à la fois des actions (Appliquer, le
« Garder » proposé) et un état (le contour de la colonne proposée).

**Proposition.** Une grammaire, posée dans
[`Maquettes/propose.css`](./Maquettes/propose.css), qui lit seulement des
rôles du socle :

| Marque | Sens | Rôle du socle |
|---|---|---|
| Rouge | La forme qui disparaîtra : un terme remplacé, un segment du nom actuel | `--fond-danger`, `--texte-danger` |
| Vert | La forme retenue : le terme gardé, un segment du nouveau nom, l'écriture choisie | `--fond-succes`, `--texte-succes` |
| Ambre | Une décision attendue, dans À trancher seulement | `--fond-avertissement`, `--texte-avertissement` |
| Bleu | Une action, le bouton principal d'un écran | `--fond-marque` |
| Gris | Ce qui ne change pas | `--texte-second` |

Deux repères de position accompagnent les couleurs, pour qu'elles ne portent
jamais seules le sens (WCAG 1.4.1) : la gauche est aujourd'hui, la droite
après ; une flèche sépare toujours ce qui disparaît de ce qui reste.

Trois formes portent ces couleurs : le **jeton** (un terme ou une écriture,
en police de code, sur fond teinté), le **segment** coloré dans un chemin, et
la **puce** d'état d'un terme (R2).

**Décision D10.** Valider la grammaire, en particulier le rouge pour la forme
remplacée. Le rouge du socle est aussi celui des erreurs ; l'autre choix est
un gris barré, plus discret, mais il se lit mal dans un chemin en police de
code.

## R11. La galerie ne joue plus les états de Règles

**Constat.** Hors de Figma, `parent` est la fenêtre elle-même : chaque
demande de l'écran (`termes`, `fiche`, `lignes`) revient vers lui comme un
message. La frontière
([`ui/frontiere.ts`](../../../../../packages/plugin-architect/src/ui/frontiere.ts),
`recevoirUneLecture`) l'accepte, car son numéro de demande est attendu ;
`monterRegles` lit alors `message.termes`, absent, et lève une erreur. Les
états `regles` et les feuilles de terme n'atteignent jamais
`data-galerie="pret"`. Le script
[`Mesures/extraire-galerie.mjs`](./Mesures/extraire-galerie.mjs) arrête ces
échos pour figer les écrans. Le plugin dans Figma n'est pas touché.

**Correction proposée.** Faire refuser par la frontière un message qui n'a pas
la forme d'une réponse (`termes` sans liste, `fiche` sans fiche, `lignes` sans
lignes), avec un test. Cela vaut mieux qu'un bouchon dans le banc de la
galerie : la garde protège aussi le plugin.

## Lots qui suivent les décisions

Les lots attendent les décisions D1 à D10. Le lot L0 attend aussi que le
renommage des tailles par catégorie, en cours dans la copie de travail, soit
commité.

| Lot | Contenu | Fichiers | Agent |
|---|---|---|---|
| L0 | Retirer la question des tailles (D3) | kit `questions.ts`, `harmonisation.ts`, `questionsReferentiel.test.ts` ; Architect `messages.ts`, `projection.ts`, `session.ts`, `ui/questions.ts`, `ui/textes.ts`, tests, galerie | `implementeur` |
| L1 | Spécimens des écritures (D1) | kit `conventions.ts`, ses tests, vues générées, version du kit | `implementeur` |
| L2 | Lignes avant → après, tête des cartes d'écriture, comptes « aussi », effet d'un terme dans la fiche (D4, D7, D9) | `messages.ts`, `projection.ts`, `projection.test.ts`, `protocole.test.ts` | `implementeur-exigeant` |
| L3 | Langage visuel : jetons, segments, puces ; l'ambre réservé à À trancher (D10) | `ui/styles.css`, `ui/aAppliquer.ts`, `ui/aTrancher.ts`, `ui/feuilles.ts`, `ui/regles.ts` | `implementeur` |
| L4 | À appliquer en deux colonnes, empilées sous 520 px (D4) | `ui/aAppliquer.ts`, `ui/styles.css`, tests d'interface | `implementeur-exigeant` |
| L5 | Cartes de À trancher dans la forme choisie (D6) | `ui/questions.ts`, `ui/aTrancher.ts`, `ui/styles.css`, `ui/textes.ts`, tests | `implementeur` |
| L6 | Règles : deux sections ou sous-onglets, ligne d'un terme (D2, D8) | `ui/regles.ts`, `ui/listeDesTermes.ts`, `ui/styles.css`, `ui/textes.ts`, tests | `implementeur` |
| L7 | Feuille du socle : sans poignée, ✕ sur fond, entrée et sortie animées ; fiche d'un terme réordonnée, sans Fermer (D9) | `plugin-socle/src/ui/Feuille.ts`, `socle.css`, `plugin-socle/tests/feuille.test.ts`, `ui/feuilles.ts` | `implementeur-exigeant` |
| L8 | Frontière : refuser un message qui n'a pas la forme d'une réponse (R11) ; nouveaux états de galerie (deux colonnes, 360 px, fiche) | `ui/frontiere.ts`, `tests/frontiereUi.test.ts`, `galerie/etats.cjs`, `galerie/donnees.cjs` | `implementeur` |
| L9 | Vérifications : typecheck, tests, build du plugin, puis recette Figma par le mainteneur | — | `verificateur`, puis le mainteneur |
