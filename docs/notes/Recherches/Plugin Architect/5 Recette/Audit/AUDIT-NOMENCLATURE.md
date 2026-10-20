# Audit du plugin UCM Nomenclature

**Trois défauts de priorité haute sont reproduits.** Une annulation peut
introduire une perte de token au prochain export. Un renommage de collection
peut rendre deux axes de modes inexportables. Des règles personnalisées
acceptées peuvent produire une succession de renommages sans fin.

Sept autres constats concernent les règles périmées, les exclusions, la
sélection, les définitions, la détection par alias et la galerie. Le comportement
de l’annulation dans une collection exclue demande aussi une clarification de
la garantie produit.

Le rapport décrit le code et les preuves. Les scripts voisins rejouent les
scénarios ; depuis les corrections, leurs assertions constatent le
comportement corrigé. La section [Suivi des corrections](#suivi-des-corrections)
relie chaque constat à ses tests de régression.

## Périmètre et état du code

Le périmètre comprend `packages/plugin-nomenclature/`, le moteur de nommage
de `packages/kit/src/referentiel/`, les modules partagés du socle et les effets
des noms sur UCM Palettes et l’export DTCG. La revue couvre les lectures,
les calculs, les écritures, le stockage, le protocole, l’interface et la distribution.

Le paquet Nomenclature est en version `0.1.0`, le kit en `0.9.8`. Le contrôle
utilise Node `24.19.0` et npm `12.0.2`, sous Windows.

Le dépôt a évolué pendant l’examen : la base initiale est
`135629f0a4346258a2b662956c6c25a17bbdfc38`, la base de clôture relevée est
`7caea7b473a33583700219820dc64e2aee33e51d`. Les changements concurrents
concernent les exemples de conventions dans la projection, la galerie et son
étape de sélection. Les fonctions à l’origine des défauts restent inchangées.
Les reproductions sont rejouées sur l’état de clôture.

[etat-audite.json](./etat-audite.json) conserve les empreintes des sources,
les versions et le relevé Git. La modification du plan de recette Palettes,
présente avant l’audit, est conservée.

Les preuves utilisent les fonctions du dépôt, des objets Figma simulés et,
pour l’interface, un DOM minimal ou Chromium local. Aucun document Figma
connecté n’est ouvert ou modifié. La revue ne mesure donc ni la fréquence des
courses dans Figma ni le comportement de son annulation native.

La gravité retenue distingue :

- **P0, critique** : destruction de données ou corruption générale sans
  récupération démontrée. Aucun cas de cette gravité n’est établi.
- **P1, haute** : perte à l’export ou renommages persistants qui compromettent
  l’usage des noms. Ces défauts doivent être corrigés avant validation des
  parcours concernés.
- **P2, moyenne** : résultat erroné, perte de règle, périmètre différent du choix
  ou contrôle de recette inutilisable avec des préconditions identifiées.

La recherche de bugs critiques couvre les chemins recensés ci-dessous. Elle
ne prouve pas l’absence de défaut dans toutes les données Figma possibles.

## Résultats

| Repère | Priorité | Constat reproduit | Preuve |
|---|---|---|---|
| N01 | P1 | Annuler peut créer un nouveau conflit entre un token et un groupe | `reproduction-ecriture.ts`, AUD-E1 |
| N02 | P1 | Renommer une collection peut supprimer deux axes de modes de l’export | `reproduction-ecriture.ts`, AUD-E2 et AUD-E2b |
| N03 | P1 | Des règles personnalisées acceptées ne se stabilisent pas | `reproduction-moteur.ts`, chaîne, cycle et alternance avec Palettes |
| N04 | P2 | L’application ne détecte pas un changement des termes ordinaires | `reproduction-session.ts`, S1 |
| N05 | P2 | Un bilan intermédiaire efface une exclusion encore en attente | `reproduction-ui.mjs`, UI-02 |
| N06 | P2 | Une ligne disparue fausse le compte et peut bloquer Appliquer | `reproduction-ui.mjs`, UI-01 |
| N07 | P2 | Retirer la dernière forme remplacée efface aussi sa définition | `reproduction-ui.mjs`, UI-03 |
| N08 | P2 | Les cibles d’alias locaux ne sont pas retrouvées dans le lexique | `reproduction-moteur.ts`, paire ledger/registre |
| N09 | P2 | Annuler modifie une collection exclue après le lot | `reproduction-ecriture.ts`, AUD-E3 ; portée à préciser |
| N10 | P2 | Trois scénarios de galerie échouent dans toutes leurs déclinaisons | `verification-galerie.mjs`, 18 échecs sur 258 pages |

### N01. Annuler peut créer un conflit de chemins absent à l’origine

**Sources :** [ecriture.ts](../../../../../../packages/plugin-nomenclature/src/ecriture.ts),
lignes 210, 230 et 386 ; [exportTokens.ts](../../../../../../packages/plugin-exporter/src/tokens/exportTokens.ts),
fonction `insert`, ligne 417.

Reproduction :

1. Dans la collection `Brand`, renommer la variable `a` en `b` avec le plugin.
2. Hors du plugin, renommer une autre variable `c` en `a/x`.
3. Demander l’annulation du dernier lot.

L’annulation remet `a`, répond `applique` et efface le journal. Le nouveau
chemin `brand.a` est aussi le groupe de `brand.a.x`. La fonction d’insertion
réelle de l’exporteur conserve un seul des deux tokens et émet un avertissement.
Les deux variables Figma existent toujours.

`annulerLeDernierRenommage` appelle `controler` avec `nomFinal: false`.
Cette branche contrôle les doublons exacts, mais désactive les conflits de
chemins publiés. Le contrôle courant à l’application n’est donc pas reproduit
à l’annulation.

Le test existant qui autorise la restauration d’un conflit d’origine reste
justifié. Ici, le conflit est introduit par une modification postérieure au
lot. Activer tous les refus de chemins sans distinguer ces cas empêcherait
de restituer certains états d’origine.

**Correction attendue :** distinguer les conflits déjà présents avant le lot
des conflits nouveaux sur l’inventaire relu. Conserver au journal les lignes
dont la restitution est refusée. Le critère de validation est une annulation
qui conserve les deux tokens exportables dans ce scénario, tout en autorisant
la restitution des conflits d’origine prévus par les tests.

### N02. Un nom de collection accepté peut faire disparaître deux axes

**Sources :** [session.ts](../../../../../../packages/plugin-nomenclature/src/session.ts),
lignes 289 à 307 ; [chemins-publies.ts](../../../../../../packages/kit/src/nommage/chemins-publies.ts) (anciennement dans le socle),
inventaire publié ; [exportTokens.ts](../../../../../../packages/plugin-exporter/src/tokens/exportTokens.ts),
lignes 678 à 716.

Le scénario passant par la session reproduit le parcours suivant :

1. Deux collections `Zorglub` et `Primitives` portent chacune les modes Light
   et Dark. Leurs variables ont des chemins distincts.
2. Exclure `Primitives` de l’analyse.
3. Répondre à la question sur `Zorglub` en choisissant la cible UCM `primitives`.
4. Appliquer le renommage proposé.

Le bilan ne signale aucun blocage. L’écriture répond `applique`. Les noms
`primitives` et `Primitives` donnent pourtant le même préfixe d’axe.
`axesDesCollections` passe de deux axes à zéro et produit le diagnostic
qui indique que les modes de ces collections ne pourront pas être générés.

Le contrôle exact des noms Figma autorise les deux casses. Le contrôle des
chemins de feuilles ne trouve aucun doublon, puisque les noms des variables
diffèrent. L’inventaire de nommage ne décrit pas les modes nécessaires au
contrôle des axes.

L’exclusion d’une collection ne retire pas son influence sur l’export du
fichier. Le scénario direct AUD-E2 montre aussi le défaut à la porte d’écriture.

**Correction attendue :** comparer les préfixes d’axes avant la proposition
et juste avant l’écriture, sur toutes les collections concernées, exclusions
comprises. Porter les informations de modes et d’extensions nécessaires dans
l’inventaire. Le test doit conserver les deux axes ou refuser le renommage.

### N03. Des remplacements acceptés provoquent des renommages répétés

**Sources :** [vocabulaire-du-fichier.ts](../../../../../../packages/kit/src/referentiel/vocabulaire-du-fichier.ts),
lignes 31 à 48 et indexation des règles ;
[lexique.ts](../../../../../../packages/kit/src/referentiel/lexique.ts),
lignes 100 à 120 ; [calcul.ts](../../../../../../packages/kit/src/nommage/calcul.ts) (anciennement `nomsSelonLesRegles.ts` du socle),
calcul partagé ; [nommeur.ts](../../../../../../packages/plugin-palettes/src/variables/nommeur.ts),
nommage du plan de Palettes.

L’import accepte sans conflit les règles `foo` remplacé par `bar`, puis
`bar` remplacé par `baz`. Un calcul donne `bar`, le suivant donne `baz`.
Le résultat du calcul n’est donc pas idempotent.

Un cycle partiel accepté produit une suite sans stabilisation :

```text
Règles : foo devient bar-quux ; bar devient foo
Noms : foo, bar-quux, foo-quux, bar-quux-quux, foo-quux-quux, …
```

Chaque calcul termine ; le défaut est la répétition des renommages lors des
applications successives. Le nom grandit à chaque deuxième application.

L’alternance avec le vrai nommeur de Palettes est aussi reproduite :

```text
Plan brut : colors/foo/vivid/light/50
Palettes : color/bar/vivid/light/50
Nomenclature : color/baz/vivid/light/50
Écriture suivante de Palettes : color/bar/vivid/light/50
```

La détection des cycles relie une cible à une source entière de même texte.
Elle ne suit pas les remplacements possibles à l’intérieur d’une cible de
plusieurs mots. La normalisation effectue ensuite une seule passe.

**Correction attendue :** résoudre vers une forme terminale avec détection
des cycles partiels, ou refuser les cibles encore remplaçables. Les tests
doivent couvrir les règles personnalisées, le recalcul sur leur résultat et
l’aller-retour avec Palettes. Une chaîne simple doit soit être refusée, soit
produire sa destination définitive au premier calcul.

### N04. La signature omet les termes ordinaires

**Source :** [session.ts](../../../../../../packages/plugin-nomenclature/src/session.ts),
lignes 83 à 84, 334, 362 et 540 à 547.

Le bilan propose `primaryBg` en `primary-background`. Pendant l’ouverture
asynchrone du port d’écriture, une autre écriture ajoute la règle
`ordinaire:primary-bg`. L’application accepte le bilan antérieur et écrit
`primary-background`. Une analyse fraîche du nom initial avec les mêmes
règles propose pourtant `primary-bg`.

La signature est comparée après la dernière attente, ce qui ferme la course
déjà couverte par les tests. Elle n’inclut cependant pas `regles.ordinaires`,
alors que ces règles changent les frontières des termes du lexique.
Le recalcul les traite déjà comme une cause de reconstruction complète.

La précondition est une modification des règles hors de la file locale,
par exemple par une autre session. Les gestes ordinaires de la même
interface passent dans sa file et ne constituent pas cette course.

**Correction attendue :** inclure les termes ordinaires et l’état de migration
pertinent dans la signature des entrées du calcul. Le test doit obtenir
`regles-modifiees` avant toute affectation de nom dans ce scénario.

### N05. Une réponse de configuration écrase une intention plus récente

**Sources :** [configuration.ts](../../../../../../packages/plugin-nomenclature/src/ui/configuration.ts),
lignes 46 à 47, 91 à 106 et 237 ;
[frontiere.ts](../../../../../../packages/plugin-nomenclature/src/ui/frontiere.ts),
file des calculs et remplacement de la dernière configuration en attente.

Reproduction avec trois collections A, B et C :

1. Décocher A, puis B avant la réponse de la première demande.
2. Recevoir le bilan qui exclut seulement A. L’interface recoche B.
3. Décocher C pendant que la demande excluant A et B est en cours.
4. Laisser les demandes se terminer.

La configuration finale exclut A et C. Le choix d’exclure B est perdu.
Un prochain renommage peut donc porter sur cette collection si le designer
ne remarque pas qu’elle a été réincluse.

Chaque bilan réapplique `collection.analysee` à toutes les cases. La demande
suivante reconstruit la liste d’exclusions depuis ces cases réécrites.
Le script monte les vrais modules de configuration et de frontière sur un
DOM minimal ; il vérifie les listes effectivement envoyées.

**Correction attendue :** garder le dernier choix local jusqu’à sa réponse,
ou rendre les cases indisponibles pendant leur enregistrement. Le scénario
doit finir avec A, B et C exclues, sans clic correctif.

### N06. Une exclusion de ligne disparue bloque une sélection valide

**Sources :** [selection.ts](../../../../../../packages/plugin-nomenclature/src/ui/selection.ts),
lignes 62 à 67 et calcul des comptes ;
[aAppliquer.ts](../../../../../../packages/plugin-nomenclature/src/ui/aAppliquer.ts),
lignes 341 à 350 et 649 à 650.

Un groupe contient les lignes A et B. Décocher A, corriger cette variable
hors du plugin, puis réanalyser. Le groupe reste présent pour B. Le modèle
conserve l’exclusion de A, bien que cette ligne ne soit plus à renommer.

B est cochée selon `ligneCochee`, mais `compterLesNomsCoches` rend zéro.
L’interface désactive alors Appliquer. Le même mécanisme peut gonfler un
compte à partir d’une inclusion devenue sans objet.

`reconcilier` ne vérifie que la présence du groupe propriétaire. Le bilan
paginé ne fournit pas à ce modèle l’ensemble des identifiants encore valides.
Les tests existants prévoient de conserver une exclusion quand son groupe
reste ; ils ne vérifient pas la disparition de sa ligne.

**Correction attendue :** réconcilier les identifiants avec le résultat complet
dans le sandbox, ou faire retourner une sélection normalisée et son compte.
Se limiter aux aperçus de groupes ignorerait les lignes des pages suivantes.
Le cas reproduit doit compter B et laisser Appliquer disponible.

### N07. Retirer la dernière forme efface une définition importée

**Source :** [session.ts](../../../../../../packages/plugin-nomenclature/src/session.ts),
branche `retirer-remplace`, lignes 175 à 180.

Le fichier contient une règle de terme valide : `quux` remplace `quuxed`,
avec une définition. Retirer `quuxed` depuis cette règle supprime toute la
clé `terme:quux`. La définition disparaît du stockage et des exports suivants.

La branche `remplace-termes` préserve une règle sans forme remplacée lorsqu’elle
porte une définition. La branche `retirer-remplace` ne vérifie pas cette
condition. La présence d’une définition est permise par l’import.

**Correction attendue :** conserver la règle avec `remplace: []` si elle porte
une définition. Le test doit contrôler la définition après retrait, relecture
et export, puis vérifier que le terme sans définition peut encore être retiré.

### N08. Les alias et le lexique n’utilisent pas les mêmes identifiants

**Sources :** [lectureFigma.ts](../../../../../../packages/plugin-nomenclature/src/lectureFigma.ts),
lignes 27 à 29 ; [inventaireDeNoms.ts](../../../../../../packages/plugin-socle/src/inventaireDeNoms.ts),
lignes 80 à 85 ; [branches-paralleles.ts](../../../../../../packages/kit/src/referentiel/branches-paralleles.ts),
ligne 98.

L’adaptateur conserve une cible d’alias sous son identifiant Figma, par
exemple `t1`. Le lexique indexe le nom correspondant sous
`["variable","t1"]`. Le détecteur cherche la cible brute dans cet index,
donc ne retrouve pas les cibles locales.

Le script construit deux alias locaux dans des branches `ledger` et
`registre`. Aucune question correspondante n’est produite. La conversion
des seules cibles en identifiants logiques fait apparaître
`paire:ledger|registre`, sans autre changement des noms ou du vocabulaire.

Ce défaut concerne l’indice tiré des alias. Les autres indices de questions
continuent à fonctionner. Les alias Figma et leurs valeurs restent inchangés.
Le test du kit utilise des identifiants simples pour les deux côtés et ne
traverse pas l’adaptateur.

**Correction attendue :** convertir les cibles locales dans le même espace
d’identités que les noms, en laissant une cible absente ou distante non
résolue. Le test doit partir de l’inventaire de lecture jusqu’aux questions.

### N09. L’annulation ignore l’exclusion actuelle d’une collection

**Sources :** [ecriture.ts](../../../../../../packages/plugin-nomenclature/src/ecriture.ts),
lignes 362 à 386 ; [session.ts](../../../../../../packages/plugin-nomenclature/src/session.ts),
lignes 551 à 554 ; garantie des exclusions dans
[invariants de Nomenclature](../../../../../../packages/plugin-nomenclature/invariants/nomenclature.md).

Appliquer les renommages de deux variables de `components`, exclure cette
collection dans Configuration, puis annuler le dernier lot. Les deux noms
sont restaurés et l’annulation répond `applique`, alors que le bilan indique
que la collection n’est plus analysée.

L’annulation relit le journal et la protection Palettes, mais n’utilise pas
`collectionsExclues`. La garantie actuelle indique qu’une collection exclue
n’est pas touchée, sans exception pour la restauration.

Le comportement est reproduit. Son caractère indésirable dépend du sens
attendu de l’exclusion lors d’une annulation explicite. Une restauration du
lot entier peut être un choix produit, mais cette exception doit alors être
formulée et présentée au designer.

**Correction attendue si l’exclusion vaut pour toute écriture :** sauter les
lignes concernées et les conserver au journal pour une reprise après
réinclusion. Le test doit vérifier le périmètre courant à l’annulation.

### N10. La galerie ne rejoue plus trois scénarios déclarés atteignables

**Sources :** [etats.cjs](../../../../../../packages/plugin-nomenclature/galerie/etats.cjs),
lignes 35, 87 à 93 et 130 à 132 ;
[aTrancher.ts](../../../../../../packages/plugin-nomenclature/src/ui/aTrancher.ts),
création des boutons ; [textes.ts](../../../../../../packages/plugin-nomenclature/src/ui/textes.ts),
ligne 195.

Le build annonce 43 états atteignables. Le contrôle Chromium ouvre leurs
258 déclinaisons : 43 états, trois thèmes, deux tailles. Trois scénarios
échouent dans chacune des six déclinaisons :

- `a-trancher-reponse` et `a-trancher-conflit` cherchent un bouton
  `.btn-primary` alors que la carte propose maintenant un bouton secondaire ;
- `feuille-ecriture` cherche le libellé accessible « Modifier l’écriture des
  noms », tandis que le bouton porte « Modifier l’écriture ».

Le pilote lève une erreur avant l’état attendu. Les pages ne prennent pas
la marque `data-galerie="pret"`. Les tests de compilation et de couverture
des types de messages restent verts, car ils ne rejouent pas ces clics.

Les 240 autres pages terminent leur scénario. Le contrôle ne détecte aucun
débordement horizontal de la racine sur les 258 pages. Ce relevé ne juge
pas le contraste Figma, la lisibilité ou les chevauchements internes.

**Correction attendue :** adapter les sélecteurs aux commandes actuelles et
ajouter le rejeu Chromium à la vérification du plugin. Le critère est
258 scénarios terminés avec zéro erreur de pilote inattendue.

## Carte de la revue

| Domaine | Modules examinés | Contrôles et résultat |
|---|---|---|
| Entrée sandbox | `code.ts`, `messages.ts`, `fenetre.ts` | Routage, demandes validées, identifiants et générations ; tests verts |
| Lecture | `lectureFigma.ts`, `lecture.ts`, inventaire du socle | Objets locaux, portées, protection, alias ; N08 |
| Calcul | `session.ts`, `tranches.ts`, `projection.ts` | File, abandon, recalcul partiel, bilan paginé ; N04 |
| Vocabulaire | Lexique, découpage, natures, indexation, branches parallèles et questions du kit | Composants, palettes, termes, collisions ; N03 et N08 |
| Écriture | `ecriture.ts` | Noms relus, doublons, ordonnancement, cycles, écritures interrompues, annulation ; N01, N02 et N09 |
| Règles et journal | `regles.ts`, `conventions.ts`, analyseur du socle | Versions, import, export, budget UTF-8, référence de lot, restauration ; N07 |
| Frontière et sélection | `ui/frontiere.ts`, `etat.ts`, `selection.ts`, `aAppliquer.ts` | Réponses périmées, file, comptes, confirmations ; N06 |
| Configuration | `ui/configuration.ts` | Exclusions, réponses successives, import et dernier lot ; N05 |
| Autres écrans | Coquille, premier lancement, règles, termes, questions, feuilles, lignes et pagination | Revue des interactions et des tests ; pas de défaut grave supplémentaire établi |
| Interopérabilité | Nommage du socle, nommeur Palettes, chemins et axes de l’exporteur | N01, N02 et N03 |
| Distribution et galerie | Manifest, build, HTML autonome, lois du socle, scénarios | Build et QuickJS verts ; N10 au rejeu Chromium |

Trois agents ont recoupé les domaines écriture, moteur et interface. Les
constats retenus disposent d’un script exécutable conservé dans ce dossier.
La revue principale a aussi vérifié les signatures de calcul, les effets
d’export et l’exécution de la galerie.

## Garanties vérifiées et pistes écartées

Les tests et la lecture des portes d’écriture confirment les points suivants :

- le plugin ne supprime aucune variable et ne change aucune valeur, aucun
  alias ou mode ; la loi d’écriture limite les mutations aux noms, aux données
  partagées de Nomenclature et aux points d’annulation ;
- un lot prépare son journal avant le premier nom ; l’impossibilité de le
  ranger refuse le lot ; le budget se mesure en octets UTF-8 ;
- les lots portent des identifiants distincts ; un morceau manquant ou d’un
  autre lot rend le journal illisible ;
- les chaînes de renommages d’objets et les permutations passent par un
  ordonnancement et, si nécessaire, un nom provisoire ; les tests couvrent
  les interruptions à ces étapes ;
- les doublons exacts et les nouveaux conflits de chemins de feuilles sont
  contrôlés à l’application, sur le document relu ;
- la protection des variables créées ou reprises par Palettes est relue avant
  l’écriture ; sa levée requiert la marque et les règles attendues ;
- une demande d’application sur une ancienne génération est refusée ; les
  lectures périmées ne remplacent pas l’écran courant ;
- les imports invalides sont refusés avant rangement ; une panne simple de
  rangement tente de remettre les clés touchées ;
- le manifest n’ouvre aucun domaine réseau ni droit privé ; l’interface
  présente les noms par des nœuds texte, sans insertion de HTML à partir des noms.

Les audits précédents
[Audit complet d’Architect](../AUDIT-COMPLET-ARCHITECT.md) et
[Audit d’intégrité des tokens](../AUDIT-INTEGRITE-TOKENS.md)
décrivent des états antérieurs. Plusieurs de leurs scénarios sont désormais
des tests de régression verts. N01 étend le contrôle aux conflits nouveaux
à l’annulation. N04 concerne une entrée oubliée dans la signature, malgré
le contrôle placé après la dernière attente.

Les pistes suivantes ne sont pas comptées comme nouveaux bugs critiques :

- la lecture par lots n’est pas abandonnée immédiatement lorsqu’une nouvelle
  analyse arrive ; cela peut retarder la réponse, mais aucune écriture incorrecte
  liée à ce retard n’est établie ;
- appliquer pendant un recalcul garde la génération capturée au clic ;
  le refus de génération protège l’écriture si le recalcul a terminé ;
- plusieurs erreurs consécutives de stockage peuvent empêcher une restitution
  au mieux ; le code documente cette limite ;
- un compteur de morceaux démesuré dans un journal incomplet s’arrête au
  premier morceau absent ; aucune boucle longue autonome n’est reproduite ;
- l’absence de suppression physique des données Figma ne garantit pas
  l’exhaustivité du prochain export, comme N01 et N02 le démontrent.

## Vérifications exécutées

Le tableau donne les résultats sur la base auditée.

| Commande ou contrôle | Résultat |
|---|---|
| `npm test` | 3 451 tests, zéro échec, dans les dix exécutions du dépôt et des workspaces |
| Suite Nomenclature incluse dans `npm test` | 422 tests, zéro échec |
| `npm run typecheck` | Réussite sur le dépôt et les workspaces concernés |
| `npm run build` | Réussite du kit et des quatre plugins |
| `npm run build --workspace ucm-nomenclature-plugin` | Réussite indépendante du paquet |
| `npm run galerie --workspace ucm-nomenclature-plugin` | 43 états par taille, trois thèmes, deux tailles |
| Reproductions d’écriture | Quatre scénarios constatent N01, N02 et N09 |
| Reproductions moteur | Chaîne, cycle partiel, alias et alternance Palettes constatés |
| Reproduction session | N04 constaté, avec comparaison au calcul frais |
| Reproductions interface | N05, N06 et N07 constatés |
| Rejeu Chromium de la galerie | 240 pages terminées, 18 en échec ; zéro débordement horizontal de racine |

Sur la base auditée, chaque script passait en retrouvant le défaut, et le
contrôle de galerie sortait en `1`. Ses assertions sont maintenant inversées :
chaque script passe en constatant la correction, et le contrôle de galerie
termine ses 264 pages, 44 états dans trois thèmes et deux tailles, sans échec
ni débordement.

Les commandes se lancent depuis la racine du dépôt :

```powershell
npx tsx --test "docs/notes/Recherches/Plugin Architect/5 Recette/Audit/reproduction-ecriture.ts"
npx tsx "docs/notes/Recherches/Plugin Architect/5 Recette/Audit/reproduction-moteur.ts"
npx tsx "docs/notes/Recherches/Plugin Architect/5 Recette/Audit/reproduction-session.ts"
node "docs/notes/Recherches/Plugin Architect/5 Recette/Audit/reproduction-ui.mjs"
npm run galerie --workspace ucm-nomenclature-plugin
node "docs/notes/Recherches/Plugin Architect/5 Recette/Audit/verification-galerie.mjs"
```

La galerie utilise le Chromium Playwright disponible ou Chrome/Edge local.
`UCM_CHROME` permet de désigner un exécutable. Le navigateur intégré a refusé
la connexion avant toute navigation, avec une erreur de transport indiquant
un champ `sandboxPolicy` absent. Le contrôle utilise donc Chromium local.

[galerie-resultats.json](./galerie-resultats.json) donne le résultat par
état, taille et thème, relevé après les corrections. Les empreintes de
[etat-audite.json](./etat-audite.json) restent celles de la base auditée.

## Ordre de correction

1. Corriger N01 et N02. Ajouter les scénarios d’annulation après modification
   extérieure et de collision d’axes aux contrôles avant mutation.
2. Corriger N03 dans le moteur partagé. Vérifier la stabilisation et
   l’aller-retour avec Palettes avant de modifier sa règle d’acceptation.
3. Corriger N04 et N05 pour que les écritures suivent les règles et le
   périmètre choisis au moment de l’application.
4. Corriger N06 à N08. Préciser le comportement produit de N09 puis le tester.
5. Réparer N10 et intégrer le rejeu des scénarios au contrôle courant.

Chaque correction doit ajouter un test de régression dont l’attente porte
sur le comportement souhaité. Les scripts de ce dossier rejouent les
scénarios de l’audit ; ils ne remplacent pas ces tests.

La validation Figma qui reste à mener porte sur les setters réels, les quotas
de données partagées, l’annulation native et les changements par un autre
éditeur. La relecture des deux thèmes à la taille minimale doit utiliser les
couleurs servies par Figma. Les mesures de galerie n’établissent pas ce rendu.

## Suivi des corrections

Le noyau est corrigé en `fd886db7`, le plugin et le socle en `d9cb4f22`,
publiés avec le kit 0.9.9, la cli 0.1.68 et l'adaptateur 0.1.61 (`44b29da6`).
Chaque test cité porte le repère du constat dans son titre.

| Repère | Correction | Tests |
|---|---|---|
| N01 | L'annulation contrôle les chemins ; le journal range les paires déjà en conflit avant le lot (`dejaEnConflit`), seules restituées | `ecriture.test.ts`, `cheminsPublies.test.ts`, `regles.test.ts` |
| N02 | Les collections lues portent leurs modes et leurs extensions ; `cheminsEnConflit` refuse une collision d'axes nouvelle (`meme-axe`, `axe-et-extensions`) | `cheminsPublies.test.ts`, `ecriture.test.ts`, `protocole.test.ts`, `tests/axesDeModes.test.ts` |
| N03 | La cible d'un terme personnalisé est résolue vers sa forme terminale ; un cycle partiel est un conflit `cycle` | `vocabulaireDuFichier.test.ts`, `nomsSelonLesRegles.test.ts`, `tests/nomsDePalettes.test.ts` |
| N04 | La signature d'`appliquer` inclut les termes ordinaires et la reprise de l'écriture de la v1 | `protocole.test.ts` |
| N05 | Configuration garde le dernier choix d'exclusion jusqu'à sa réponse | `configuration.test.ts` |
| N06 | La lecture `selection` retire les exclus et les inclus qui ne sont plus à renommer ; Appliquer attend sa réponse | `selection.test.ts`, `protocole.test.ts`, `frontiereUi.test.ts`, `messages.test.ts` |
| N07 | Retirer la dernière forme garde la règle qui porte une définition | `session.test.ts` |
| N08 | La cible d'un alias local porte l'identifiant de son nom lu ; une cible distante reste sans cible | `lecture.test.ts`, `aliasQuestions.test.ts` |
| N09 | L'exclusion vaut pour l'annulation : les noms d'une collection exclue sont sautés en `exclue` et restent au journal | `ecriture.test.ts`, `protocole.test.ts`, `annonce.test.ts`, `textesDeLAnnulation.test.ts` |
| N10 | Sélecteurs de la galerie à jour ; `test:ui` rejoue chaque état dans Chromium, en CI aussi | `tests/interface/galerie.test.mjs` |

Limites connues :

- un journal rangé avant `d9cb4f22` n'a pas de paires d'origine : son
  annulation refuse aussi la restitution d'un conflit qui existait avant le lot ;
- une annulation qui rétablirait une collision d'axes antérieure au lot est
  sautée, car le journal ne range que les paires de chemins ;
- un renommage de collection vers un nom sans préfixe (`$`) écarte son axe à
  l'export sans être bloqué ;
- les règles de cycle partiel déjà rangées dans un fichier font refuser les
  gestes suivants sur ses règles, jusqu'à leur retrait.
