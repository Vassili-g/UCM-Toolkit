# Lots de la vitesse d'analyse

Cette checklist applique la [revue critique](../REVUE-CRITIQUE-VITESSE-ANALYSE.md).
Elle couvre la première analyse et les analyses suivantes dans la même session.
Les sorties d'Architect et de l'exporteur servent de référence fonctionnelle.
Aucun gain de durée n'est acquis avant la recette dans Figma.

## État des lots

Un lot est fini quand toutes ses cases sont cochées dans des commits. Mettre son état à jour dans le commit de la dernière case. Une branche écartée porte sa décision et son motif dans son fichier.

| Lot | État |
|---|---|
| [0 : référence et banc de comparaison](./LOT-00.md) | Fini |
| [1 : mesures du clic au rendu et progression](./LOT-01.md) | Fini |
| [2 : coopération et annulation dans les boucles](./LOT-02.md) | Fini |
| [3 : premiers constats et protocole de fin](./LOT-03.md) | Fini |
| [4 : supprimer les coûts algorithmiques du kit](./LOT-04.md) | Non fini |
| [5 : mémoires sûres au sein d'une demande](./LOT-05.md) | Non fini |
| [6 : faits ordinaires et acquisition commune](./LOT-06.md) | Non fini |
| [7 : diagnostics finalisés et publication séparée](./LOT-07.md) | Non fini |
| [8 : couverture des dépendances et Actualiser](./LOT-08.md) | Non fini |
| [9 : réutilisation avec invalidation large et rétention bornée](./LOT-09.md) | Non fini |
| [10 : graphe de requêtes et recalcul ciblé](./LOT-10.md) | Non fini |
| [11 : contributions et agrégats maintenus](./LOT-11.md) | Non fini |
| [12 : signatures par contrôle et factorisation des modes](./LOT-12.md) | Non fini (conditionnel) |
| [13 : worker unique, transport par lots et repli](./LOT-13.md) | Non fini (conditionnel) |
| [14 : worker conservé et différences versionnées](./LOT-14.md) | Non fini (conditionnel) |
| [15 : clôture locale et recette du mainteneur](./LOT-15.md) | Non fini |

## Exécution et attribution

- [x] **P0 | gpt-6.1-sol | medium** : découper chaque lot en tâches committables,
  attribuer le modèle et l'effort de départ, fixer la publication finale,
  puis contrôler le document.
- [x] **P1 | gpt-6.1-sol | medium** : répartir les lots en fichiers, ajouter leur état au sommaire et vérifier les liens.

Chaque case numérotée est une tâche et donne lieu à un commit distinct. L'agent
ne coche sa case que dans ce commit, après les contrôles ciblés et la relecture
de son diff. Un seul agent travaille à la fois et ne prend qu'une case.
L'orchestrateur confie la
suivante après le commit précédent et vérifie les dépendances indiquées.
Un changement indivisible qui dépasse une case impose de redécouper la case
avant de coder, sans regrouper plusieurs cases dans un commit.
Chaque case qui modifie le kit inclut dans son commit la montée de version,
le changelog et les pins exigés par `versionSuitLeContenu`. Charger
`publier-paquets` avant cette modification. Ne pousser aucun commit et ne
publier aucune version intermédiaire sur npm. À la clôture, pousser tous les
commits une fois, puis publier seulement les versions finales des paquets
modifiés, dans l'ordre prescrit par cette skill.

Aucun changelog de paquet n'existe. Dans une case, « changelog » désigne ce
manque : ne créer aucun fichier, le domicile attend la décision du mainteneur.

Chaque case indique le modèle et l'effort de départ. `gpt-6-luna low` convient
aux ajouts bornés et aux tests dont les attentes sont fixées ;
`gpt-6-luna medium` aux changements locaux avec oracle ;
`gpt-6.1-sol medium` aux transformations qui demandent un arbitrage ;
`gpt-6.1-sol high` aux frontières entre paquets, à la fraîcheur et aux
dépendances. Réattribuer seulement après un
blocage nommé et documenté. Ces profils suivent la documentation officielle
d'[OpenAI sur le choix des modèles](https://developers.openai.com/api/docs/guides/model-selection).

Chaque case ouverte porte en plus un profil Claude, après le profil OpenAI :
`**2.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium**`. Sous Claude
Code, ce second profil fait foi. L'orchestrateur choisit l'agent de
[`.claude/agents/`](../../../../../../.claude/agents/) d'après ce couple et passe
l'effort au lancement :

| Profil | Agent | Tâches |
|---|---|---|
| Haiku, low | `executant`, ou `verificateur` pour une commande seule | contrôle de version sans arbitrage, commande à sortie longue, état de galerie ou mesure déjà présents en local, compteur ajouté à un banc existant, build et commandes de collecte, liste remise au mainteneur |
| Sonnet, low | `implementeur` | ajout borné, état de galerie, test dont les attentes sont fixées, build préparé |
| Sonnet, medium | `implementeur` | changement local avec oracle de parité, isolement d'un travail local déjà prouvé |
| Sonnet, high | `implementeur-exigeant` | frontière entre paquets, plusieurs lecteurs d'une règle, fraîcheur, ordre ou départage |
| Opus, high | conversation principale, ou `implementeur` lancé avec `model: opus` | types dont dépendent les lots suivants, couverture des événements Figma, dépendances lues, audits, décision d'activation |

Opus est réservé aux sept cases où une erreur passe la parité sur les doubles :
6.2, 8.1, 9.4, 10.2, 15.4, 15.5 et R12. Un oubli de couverture ou de dépendance
y rend un résultat périmé sans faire échouer un test existant. Réattribuer
seulement après un blocage nommé et documenté dans le fichier du lot.
Sous Claude Code, l'agent ne commite pas : la conversation principale relit
son diff, fait relancer les contrôles par un `verificateur`, puis commite.

L'orchestrateur transmet le sommaire, le fichier du lot, ses chemins, les
lectures rendues par `npm run agents:lire -- <chemins>`, ses prédécesseurs et sa
preuve de sortie. L'agent commence par `git status --short`, charge les skills
requises, puis rend son diff, ses contrôles et les limites restantes. La case
et son code sont committés ensemble, par chemins explicites. Une mesure Figma
indisponible reste non cochée et n'arrête pas les travaux locaux indépendants.

Les preuves consignées dans les lots décrivent l'arbre de travail actuel : les
lots 1 et 2 contiennent des changements non committés. Aucune nouvelle case
n'est cochée sur la seule base de ces preuves. Leur découpage en commits doit
préserver les modifications du mainteneur et laisser chaque commit vérifiable.
Pour ces cases, isoler et contrôler le travail présent avant de coder ce qui
manque.

`git add -p` est interactif et indisponible aux agents. Isoler une case ainsi :

1. Avant la première case, l'orchestrateur enregistre l'état complet sans
   toucher l'arbre : `git stash store -m "lots 1-2 avant isolement" $(git stash create)`.
2. L'agent de la case écrit dans le scratchpad un patch qui garde, parmi
   `git diff -- <chemins de la case>`, les seuls hunks de sa case. Plusieurs
   cases partagent un fichier : `corrections.ts` pour 2.6, 2.15 et 2.16,
   `accessibilite.ts` pour 2.5, 2.7, 2.8 et 2.18, `analyse.test.ts` pour
   presque toutes.
3. L'orchestrateur lance `git apply --cached --check <patch>`, puis
   `git apply --cached <patch>`.
4. Il éprouve l'index seul : `git stash push --keep-index`, contrôles ciblés,
   relecture de `git diff --cached --stat`, commit de l'index, puis
   `git stash pop`. Ce stash déplace aussi les fichiers du mainteneur :
   l'employer seulement quand aucune autre session ne travaille dans l'arbre.

Chaque case qui touche `packages/kit/src/` monte le kit d'un patch, avec la
CLI et l'adaptateur, comme `b0e847e7`. La première porte le kit 0.13.3, la
suivante 0.13.4. La montée locale actuelle, 0.13.3 pour l'ensemble, ne fixe
que le point de départ de cette suite.

État à préserver : la revue critique contient une modification du mainteneur ;
`PLAN-IMPLEMENTATION.md` a été supprimé par le mainteneur. Ne restaurer ni ne
réécrire ces fichiers pour exécuter cette checklist. Le motif
`docs/notes/Recherches/UCM Architect/**` du registre `.agents/domiciles.json`
couvre déjà ce document. Aucun ajout de registre n'est nécessaire.

## Choix et limites

- Construire une acquisition commune dans le socle, puis des calculs purs
  partagés par Architect et l'exporteur. La publication suit ces calculs.
- Commencer la mémoire entre demandes par une validation conservatrice et une
  invalidation large. Ajouter ensuite les dépendances fines et les contributions.
- Garder les requêtes pures exécutables localement. Worker et incrémentalité
  restent indépendants. Le worker, les signatures et les échanges différentiels
  demandent chacun une preuve de gain net avant activation par défaut.
- Analyser autorise la réutilisation après validation. Actualiser contourne les
  résultats des demandes précédentes et réacquiert les entrées. Les
  mutualisations internes à la demande restent actives.
- Un événement absent ne valide pas une entrée Figma. Relire par défaut toute
  donnée sans couverture démontrée, dont les variables et ressources distantes.
- Une annulation, un arrêt ou une péremption ne promeut aucune référence.
  Une analyse partielle reste affichable ; ses échecs et sa couverture doivent
  être réévalués avant toute réutilisation.
- Conserver budgets, frontières, ordre, identifiants, règles d'agrégation et
  relectures avant écriture. Le format publié ne change pas.
- Garder V9 (`skipInvisibleInstanceChildren`), WebAssembly, plusieurs workers,
  diagrammes de décision et prélecture hors des lots obligatoires. Aucun
  échantillonnage de variants ne remplace l'analyse complète.
- La mesure mainteneur du Button dans Figma porte sur 90 variants et 142 s au
  total. Les 80 s affichées sous « Vérification des règles » couvrent aussi
  `controles`, `corrections` et `projection` (`src/ui/textes/analyse.ts`). Elles
  ne mesurent donc pas `extractRules` seul : `sandbox/analyse.ts` chronomètre
  `lecteurs.regles` comme une attente et `src/regles.ts` appelle `extractRules`.
- Priorité avant toute optimisation : exploiter les traces déjà instrumentées
  sur ce Button pour séparer `controles`, `regles`, `corrections` et `projection`.
  Si `regles` domine, mesurer finement `extractRules` : scan de page, candidats,
  appels `getMainComponentAsync` et assemblage. Compter les opérations et les
  attentes de chaque étape.
- Reporter la prélecture automatique à la sélection, hors lots obligatoires.
  Le travail Figma peut bloquer le thread et la fraîcheur entre sélection et
  clic n'est pas prouvée. Réévaluer après réduction du coût dominant et
  réalisation des lots de fraîcheur et de mémoire. Exiger alors une simulation
  idle, l'annulation sur changement de sélection, des ressources bornées, la
  parité et une mesure A/B dans Figma qui établit l'absence de ralentissement
  des interactions et un gain réel sur le temps total.

## Contrat de parité

Les comparaisons portent sur les objets complets ordonnés : constats, codes,
identifiants, faits, parties, localisations, questions, corrections,
`aRelire`, modèles de règles, ignorés et couverture. Ne retirer que la date
d'export dans la comparaison des contrats publiés. Ne trier ni les constats ni
les listes de modes pour faire passer la comparaison.

| Corpus | Cas obligatoires |
|---|---|
| Parcours | Beaucoup de petits variants, gros premier variant, instance frontière, masqués statiques et dynamiques, racine composée puis non composée, noms d'icône différents |
| Lecture | Texte mixte, plages adjacentes, surcharge d'instance, Display P3, champ illisible, variable ou style refusé puis disponible, `lecture.manquees` localisé |
| Budget | Premier variant dépassant le budget, coupure avant le dernier variant, nombre non lu inconnu, ajout ou retrait qui déplace le préfixe admis |
| Catalogue | Clés et noms en collision, doublons ordonnés, absence puis premier candidat, valeur non chargée, alias cyclique, profondeur restante, mode ou collection sans mode |
| Diagnostics | Tous les sites du moteur, traduction par défaut C42, émission après `structure`, imbrication bloquante, règles C43/C44/C45, modèle exact de correction |
| Modes | Produit très supérieur à 5 000, ordre des collections et modes, modes effectifs, cardinalité dépassant les entiers exacts, pire cas à égalité |
| Sessions | Mutations successives, plusieurs changements après péremption, événement retardé ou inconnu, page quittée puis retrouvée, correction puis Ctrl+Z/rétablissement, changement pendant calcul annulé |
| Configuration | AA/AAA, library choisie et contenu de library séparés, configuration refusée, déclaration UCM, ignorés, réponses et cases de la nouvelle génération |

Les fixtures sont fabriquées par les tests. Aucun `.contract.json` n'est
commité. Les lois de forme restent dans `packages/plugin-exporter/tests/lois.ts`.
Les preuves de croissance comptent les opérations ; les tests unitaires
n'imposent aucun seuil de durée réelle.

## Ordre des lots obligatoires

Les cases 4.0a et suivantes passent avant la suite du lot 2 (2.11), sur décision du mainteneur, d'après la trace Figma que [LOT-04](./LOT-04.md) résume.
La chaîne principale est 0 à 11, puis 15. Les lots 12 à 14 sont des branches
conditionnelles après leurs prérequis. Ils ne bloquent pas la validation sûre
ni le recalcul ciblé. La recette Figma accompagne chaque build disponible ;
l'absence de mesure interdit une conclusion de performance, pas les preuves
locales de parité.

## Branches conditionnelles

Leur implémentation locale peut aller jusqu'au candidat désactivé par défaut.
La décision d'activation exige la recette indiquée. Une branche rejetée ou
non mesurée ne supprime aucune preuve des lots obligatoires.
