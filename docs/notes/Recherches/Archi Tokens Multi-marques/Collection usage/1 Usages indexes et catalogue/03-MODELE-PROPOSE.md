# Modèle proposé

## Recommandation

Introduire des niveaux de couleur indépendants des états, avec un catalogue
explicite de partenaires. Conserver les états dans les composants. Commencer
par un catalogue de lecture sur les chemins existants avant de renommer les
variables.

Cette direction donne accès à des associations croisées que la diagonale
actuelle ne décrit pas. Les [mesures](./04-EXPERIENCES.md) montrent que plusieurs
de ces associations atteignent 4,5:1. Elles montrent aussi que certaines
échouent : le catalogue doit conserver le résultat par contexte.

## Comparaison des options

| Option | Liberté obtenue | Coût | Risque | Avis |
|---|---|---|---|---|
| Garder les états, documenter les usages secondaires | Réutiliser un token de survol ailleurs | Faible | Le nom continue de suggérer une restriction | Étape immédiate utile |
| Ajouter plusieurs apparences à chaque état | Choisir entre plusieurs traitements prévus | Multiplication des alias | Le composant reste dépendant des traitements anticipés | Pour quelques composants seulement |
| Remplacer les états par quatre couples exclusifs | Choisir une paire par indice | Migration des chemins et des lecteurs | Interdit des combinaisons pourtant mesurées ; le numéro paraît garantir le couple | Insuffisant comme modèle général |
| Indexer les niveaux et déclarer les partenaires | Choisir chaque rôle parmi les associations couvertes | Catalogue, résolveur et contrôle d’états explicites | La liste des partenaires peut devenir longue | Direction recommandée |
| Exposer tous les crans, vérifier après placement | Liberté maximale de couleurs | Moins de tokens, davantage de contrôles | Le designer découvre les échecs tard ; rôles moins lisibles | Mode exploratoire explicite |
| Générer des couleurs par contraintes de contraste | Ajouter des associations sous contrainte | Solveur, arbitrages de marque et stabilisation des résultats | Une nouvelle contrainte peut déplacer plusieurs couleurs | Recherche ultérieure |
| Régler des intervalles de luminance par niveau | Garantir des ensembles indépendamment de la teinte | Refonte des courbes et validation des marques | Réduction de la liberté sur la référence de marque | Alternative à comparer si les mesures deviennent trop coûteuses |

## Les trois sens possibles de `on-1`

| Intention | Représentation proposée | Mesure |
|---|---|---|
| Texte sur le premier fond plein | `on-solid/1` sur `solid/1` | Contraste du texte |
| Premier fond plein sur une surface | `solid/1` contre `surface/1` | Séparation non textuelle, si nécessaire au contrôle |
| Identifiant d’un ensemble coordonné | Association `a1`, qui nomme plusieurs tokens | Une mesure par relation de l’ensemble |

Retenir la deuxième lecture pour étudier la demande `solid` sur `surface`.
Conserver `on-solid` pour le texte du bouton. Un bouton posé sur une carte
implique alors au moins le texte contre son fond plein, puis la séparation
visuelle du contrôle contre la carte. Son anneau exige une relation distincte.

Une conformité du premier couple ne prouve pas celle du deuxième. Si une
bordure identifie déjà le contrôle, le fond plein n’a pas nécessairement à
atteindre lui-même 3:1 contre la carte.

## Nommage à éprouver

Dans la collection `usage`, proposer ces chemins pour la maquette :

```text
primary/surface/1            thème.primary.100
primary/surface/2            thème.primary.200
primary/surface/3            thème.primary.300
primary/surface/4            thème.primary.400
primary/text/1               thème.primary.700
primary/text/2               thème.primary.800
primary/text/3               thème.primary.900
primary/text/4               thème.primary.950
primary/solid/1              thème.primary.700
primary/solid/2              thème.primary.800
primary/solid/3              thème.primary.900
primary/solid/4              thème.primary.950
primary/on-solid             thème.neutral.50
primary/border-control/1     thème.primary.600
primary/border-control/2     thème.primary.700
primary/border-control/3     thème.primary.800
primary/border-control/4     thème.primary.900
```

Les mentions `thème` ci-dessus expliquent les cibles ; les vrais chemins DTCG
conservent le segment `theme`. Pour un statut à deux intensités, le segment
`soft` ou `vivid` reste après le rôle, par exemple `success/soft/text/2`.

Un indice identifie une entrée ordonnée dans sa famille. Il ne désigne ni un
état, ni un ratio, ni une égalité perceptive entre familles. L’ordre peut être
décrit comme un éloignement du fond de page dans les rampes prévues ; il doit
être revérifié après réglage ou reprise de palette.

`text/2` et `solid/2` peuvent viser le même cran tout en ayant des portées
différentes. Supprimer l’un au motif que sa valeur est identique retirerait
l’information de peinture dont les contrôles ont besoin.

Conserver un seul `on-solid` tant que le même premier plan convient aux fonds
pleins déclarés. Ajouter `on-solid/1` à `on-solid/4` seulement si les cibles ou
les restrictions diffèrent. Un besoin de texte blanc sur un fond et sombre
sur un autre justifierait cette séparation.

Les noms `subtle`, `muted` ou `strong` peuvent servir de descriptions lisibles,
mais leur ordre serait à définir pour chaque rôle et chaque thème. Les indices
évitent de prétendre qu’une couleur est toujours plus discrète dans la page.
Le choix final des noms demande une épreuve dans le sélecteur Figma.

## Une association est une relation déclarée

Un catalogue peut se représenter par un graphe : les tokens sont les sommets,
les associations déclarées sont les relations entre sommets. Chaque relation
porte sa fonction, sa métrique et les contextes à vérifier.

Le ratio WCAG 2 est symétrique, mais l’emploi ne l’est pas : un token de texte
posé sur une surface ne devient pas un fond autorisé pour cette raison.
La compatibilité n’est pas transitive. Deux textes lisibles sur un même fond
peuvent être presque identiques entre eux.

Pour un ensemble de contextes requis `C`, le succès d’une association exige :

```text
pour chaque contexte c de C :
  les deux références résolvent
  les conditions de peinture sont connues
  le ratio calculé atteint le seuil applicable
```

Une seule combinaison manquante interdit le verdict global « vérifié partout ».
Un échec et des mesures absentes peuvent coexister ; les résumer par un seul
statut ferait perdre une information utile.

## Proposition de données

L’exemple suivant décrit un format de recherche, non reconnu par les lecteurs
UCM actuels. Les chemins sont ceux de la proposition indexée.

```json
{
  "schemaVersion": 1,
  "id": "ucm-indexed-study",
  "revision": "prototype-1",
  "tokens": [
    {
      "id": "primary-text-2",
      "reference": "{usage.primary.text.2}",
      "peint": ["foreground", "icon"],
      "niveau": 2
    },
    {
      "id": "primary-surface-3",
      "reference": "{usage.primary.surface.3}",
      "peint": ["background"],
      "niveau": 3
    }
  ],
  "associations": [
    {
      "id": "primary-text-2-on-surface-3",
      "premier": "primary-text-2",
      "second": "primary-surface-3",
      "exigence": {
        "fonction": "texte-courant",
        "metrique": "wcag2-relative-luminance",
        "seuil": 4.5
      },
      "conditions": {
        "gamut": "srgb",
        "alphaEffectif": 1,
        "fond": "uniforme"
      },
      "contextesRequis": [
        { "brand": "marque-a", "theme": "light" },
        { "brand": "marque-a", "theme": "dark" }
      ]
    }
  ]
}
```

La liste explicite des contextes évite un sens variable de `toutes-les-marques`.
Lorsqu’une marque est ajoutée, le catalogue compilé change et les mesures
doivent être recalculées. Une syntaxe source plus courte pourrait développer
ce produit cartésien avant publication.

L’identité d’une association reste stable quand un alias change de valeur.
Sa révision et ses preuves changent. Réutiliser un identifiant retiré pour une
autre fonction empêcherait de comparer les rapports.

### Séparer définition et résultat

| Donnée | Contenu | Propriétaire proposé |
|---|---|---|
| Vocabulaire et profil par défaut | Peintures, métriques, modèles de relations, politique d’états | Kit versionné |
| Catalogue du design system | Tokens concernés, relations choisies, contextes et exceptions | Designer dans une configuration Figma exportable |
| Valeurs et alias | Couleurs par mode, chaînes et surcharges | Variables Figma |
| Affectations de composant | Association choisie pour chaque variante réelle | Source du composant Figma, exportée |
| Résultats | Mesures, couverture, provenance, empreintes | Calcul partagé, reproduit dans la CI |
| Documentation | Vue par cran, rôle, association et contexte | Générateur depuis les éléments précédents |

Cette répartition respecte la propriété des décisions visuelles définie dans
[CONCEPT.md](../../../../../../CONCEPT.md). Un catalogue écrit à la main dans le
repository reste un moyen de prototypage. En production, autoriser aussi son
édition dans le repository exigerait une décision explicite de synchronisation
et de propriété.

Le calcul produit, pour chaque relation et chaque contexte, les références
résolues, les valeurs, la métrique, le seuil, le ratio et le résultat. Les
empreintes doivent couvrir les valeurs, les alias, les axes, le catalogue et
la version du moteur. Une preuve copiée depuis un ancien export ne vaut pas
pour les nouvelles couleurs.

### Résultats à distinguer

| Dimension | Valeurs proposées | Conséquence |
|---|---|---|
| Relation | déclarée, hors catalogue | Une paire mesurable peut être hors politique |
| Couverture | complète, partielle | Un minimum porte seulement sur les contextes évalués |
| Calcul | tenu, manqué, non jugeable | Un alias absent ne donne pas un ratio nul |
| Applicabilité | requise, exemptée, décorative | Une exemption n’est pas un succès |
| Fraîcheur | actuelle, périmée | Une modification d’alias invalide le résultat mémorisé |

Conserver la liste des causes : alias absent, cycle, mode absent, gamut non
pris en charge, support ambigu, opacité effective inconnue, budget de calcul
dépassé. Les outils ne doivent pas transformer ces causes en succès silencieux.

## États du composant

Le composant choisit une association par variante visuelle. Un bouton peut
utiliser `solid/2` au repos et `solid/3` au survol. Ce choix ne doit plus produire
un écart uniquement parce que le repos était auparavant associé au premier rang.

L’affectation doit rester contrôlable. Une table exportée peut associer les
coordonnées d’une variante à des identifiants de relations. Une autre solution
consiste à retrouver les relations par les tokens et les placements existants,
puis à déclarer seulement la politique d’états. Ce second chemin limite les
champs nouveaux dans le contrat, mais ne suffit pas à déduire l’intention d’une
variante inhabituelle.

Comparer au prototype ces deux solutions. Ne pas inventer un champ de contrat
dans l’implémentation avant d’avoir tranché cette responsabilité dans le format.

Le focus, la sélection, le survol et la disponibilité peuvent être simultanés.
Les contrôles doivent lire les variantes réellement présentes et les axes
déclarés. Une progression uniforme `1, 2, 3, 4` ne remplace pas ce modèle.
La distinction perceptible d’un état, les attributs accessibles et le
comportement clavier restent à vérifier sur le composant.

## Généralisation par famille

| Famille | Extension envisageable | Condition |
|---|---|---|
| Texte sur surface | Plusieurs niveaux de texte par surface | Mesurer chaque couple et qualifier le texte |
| Texte sur fond plein | Un premier plan commun ou un premier plan par fond | Vérifier tous les fonds pleins réellement proposés |
| Fond plein sur surface | Relations de séparation de contrôle | Établir si le fond ou une bordure assure l’identification |
| Contour de contrôle | Matrice contour/surface | Identifier les couleurs adjacentes nécessaires au contrôle |
| Icône porteuse d’information | Réutiliser les tokens de texte ou créer un rôle dédié | Distinguer son seuil non textuel d’un emploi textuel |
| Anneau | Relations à l’environnement et au rendu sans focus | Vérifier aussi géométrie, visibilité et éventuel masquage |
| Décoration | Choix libres avec statut décoratif | Ne pas présenter une absence de seuil comme une garantie |
| Désactivé | Règle de lisibilité interne facultative | Séparer cette exigence de l’exemption normative |
| Élévation | Niveaux page, raised, overlay | Le niveau n’impose pas automatiquement un seuil entre surfaces |
| Graphiques de données | Relations entre séries adjacentes et fonds | Ajouter formes, motifs ou libellés ; les emplois actuels ne couvrent pas ce cas |
| Statuts et marques | Relations entre familles explicitement autorisées | Mesurer les croisements ; préserver le sens du statut |

Les associations entre familles apportent une liberté réelle : texte neutre
sur surface de marque, ou icône de statut sur carte neutre. Le catalogue peut
les autoriser séparément des associations internes à chaque famille.
Un ratio suffisant ne justifie pas de remplacer une couleur de danger par une
couleur de succès.

## Ensembles compatibles et coût

Pour quatre niveaux de premier plan et quatre surfaces, la diagonale déclare
quatre relations ; la matrice en contient seize. Les relations qui réussissent
dans tous les contextes peuvent se présenter sous forme de listes de
partenaires. Un regroupement d’ensembles doit vérifier chaque combinaison,
pas seulement les paires de même indice.

Avec six marques, deux thèmes et seize couples, une famille représente
192 évaluations avant les autres rôles et intensités. Les intensités fixes
des statuts ne demandent pas de répétition par marque si aucune dépendance ne
les relie à `brand`. Le calcul doit suivre les dépendances réelles des alias.

La documentation peut publier un minimum sur tous les contextes avec le
contexte qui l’atteint. Elle doit aussi permettre de lire le détail. Un minimum
global n’autorise pas la combinaison d’une couleur d’une marque avec celle
d’une autre : ces deux valeurs ne constituent pas forcément un contexte réel.

## Transparence, gamut et apparence effective

Pour un premier prototype, retenir les aplats sRGB opaques et un support
uniforme connu. Refuser une conclusion sur les autres peintures tout en
expliquant la donnée manquante.

Un deuxième périmètre pourra composer les transparences dans un espace
explicitement défini. L’opacité du calque et des parents, le fond sous-jacent
et les modes de fusion font partie de l’entrée. Un simple champ `alpha` dans
le token ne couvre pas l’opacité d’un groupe.

Pour un dégradé, mesurer seulement les extrémités ne prouve pas le contraste
sur toute la zone de texte. Les images, filtres et superpositions demandent un
contrôle de rendu avec une stratégie de couverture distincte.

Une conversion Display P3 vers sRGB peut modifier le résultat. Conserver
l’espace source et la méthode de conversion ; ne pas annoncer une garantie
sur le rendu P3 à partir de sa seule approximation sRGB.

## Où montrer la règle

Prévoir quatre entrées dans un même catalogue généré :

1. **Par cran** : emplois entrants, chaînes d’alias, partenaires et résultats.
2. **Par rôle** : niveaux disponibles, usages de peinture et états choisis par
   les composants.
3. **Par association** : deux tokens, fonction, seuil, contextes et pire cas.
4. **Par composant** : relations effectivement utilisées et contexte manquant.

Dans Figma, une description courte accompagne chaque variable. Un panneau de
lecture montre ses partenaires quand le designer sélectionne un token ou un
calque. Les portées limitent la liste par type de peinture, mais le catalogue
porte la relation entre couleurs.

Une commande explicite peut dessiner une planche de référence. Cette planche
reste un artefact dérivé avec empreinte et contexte. Son contenu ne doit pas
devenir une seconde table éditée à la main.

### Exemple de lecture depuis un cran

Sur la palette primaire, le cran 700 alimente actuellement `text/default`,
`solid/default` et `border-control/hover`. Dans la proposition, ces emplois
deviennent respectivement `text/1`, `solid/1` et `border-control/2`.

Une fiche de ce cran montre trois lignes, car les usages de peinture diffèrent.
La ligne de texte ouvre les surfaces partenaires et le seuil du texte. La
ligne du fond plein ouvre son premier plan ainsi que ses relations de
séparation. La ligne du contour ouvre les supports de contrôle évalués.
Le détail d’une relation donne le contexte le moins favorable et les contextes
non couverts. Une seule pastille « cran accessible » masquerait ces différences.

### Exemple de composition libre

Une carte peut employer `surface/3` au repos et `text/2` pour son libellé si
ce couple appartient au catalogue mesuré de ses marques. Le bouton placé
dans la carte peut utiliser `solid/2` avec `on-solid`. Son fond plein et le
texte de la carte peuvent avoir la même couleur sans partager le même rôle.

Au survol, le bouton peut passer à `solid/3`. La carte conserve sa surface.
L’affectation d’état appartient au bouton. Le catalogue vérifie séparément le
texte du bouton, sa séparation éventuelle de la carte et son anneau.

Le catalogue peut proposer cette combinaison comme candidate à partir des
ratios calculés. Le designer choisit de la déclarer, puis la CI mesure ses
valeurs résolues. Ce parcours distingue une suggestion numérique d’une
association retenue par le design system.
