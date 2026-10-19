# Audit d’intégrité des tokens d’UCM Architect

**Les écritures ne satisfont pas l’exigence d’utilisation sans sauvegarde.**
L’audit relève douze défauts, dont huit de gravité élevée pour la conservation
des noms, la restauration ou l’exhaustivité des tokens exportés. Le mainteneur
doit corriger ces huit défauts avant de considérer les renommages comme
acceptables sur un fichier sans copie de secours.

Aucun chemin de suppression de variable, de changement de valeur ou de
réécriture d’alias n’a été trouvé dans Architect. La perte démontrée concerne
des anciens noms, des règles et des tokens écartés du prochain export.
L’annulation native de Figma peut encore aider ; sa disponibilité après
fermeture, incident ou intervention d’un autre utilisateur n’est pas prouvée
par cet audit.

## Périmètre et niveau de preuve

Le périmètre est le code de `packages/plugin-nomenclature/`, ses dépendances de
nommage dans le kit et le socle, puis l’index d’export de l’Exporter. La base
Git est `acfa3a59e0ac4709cbeea0896e0bdfaafb4e32ad`, paquet Architect `0.1.0`,
kit `0.9.3`. Le nom et le dossier futurs d’UCM Nomenclature dans le
[plan d’implémentation](./PLAN-IMPLEMENTATION.md) ne décrivent pas encore le
paquet audité.

La dernière exécution de la suite du plugin porte sur
`c5663a0725f50b6ec78a38697bfde843950260c7`, avec des changements d’interface
en cours dans le répertoire de travail. Les modules d’écriture, de règles,
de session, de lecture et de chemins publiés cités par les défauts restent
identiques à la base auditée. Les numéros de ligne de l’interface renvoient
à cette base.

Les travaux présents dans le répertoire de travail ont été conservés.
L’audit ajoute ce rapport, un lien dans le sommaire, un banc de reproduction
et ses résultats. Il ne corrige pas le code du produit.

La revue porte sur les appels qui écrivent, leurs préconditions, le stockage,
les interruptions, les lectures concurrentes, la sélection et les résultats
affichés. Les lectures déléguées ont recoupé les écritures et le moteur de
nommage. Les preuves retenues ci-dessous ont été relues ou rejouées avec les
fonctions du dépôt.

**Aucun document Figma réel n’a été ouvert ou modifié.** Aucun test Chromium
n’a été lancé. Les pannes et les modifications concurrentes sont injectées
dans des ports en mémoire. Un résultat reproduit sur ce banc prouve le
comportement du code avec ces entrées ; il ne mesure pas la fréquence d’une
panne dans Figma.

Le [banc de reproduction](./Mesures/auditer-integrite.ts) exécute dix-huit
contrôles. Quatorze reproduisent les douze défauts ; quatre contrôlent les
bornes de l’export des règles, les protections connues, les données conservées
et les permutations de noms. Les
[résultats bruts](./Mesures/resultats-audit-integrite.tap) en gardent la sortie.

Ces contrôles passent **parce qu’ils constatent les défauts présents**. Ils
devront être remplacés par des attentes de conservation lors des corrections.
Ils ne font pas partie de `npm test` et ne valent pas certification de sûreté.

## Carte des lectures et des écritures

Les numéros de ligne ci-dessous correspondent aux sources de la base auditée.
Les chemins `src/` de ce rapport partent de `packages/plugin-nomenclature/`.

| Zone | Sources et responsabilité vérifiée |
|---|---|
| Entrée du sandbox | [code.ts](../../../../../packages/plugin-nomenclature/src/code.ts), [messages.ts](../../../../../packages/plugin-nomenclature/src/messages.ts) : forme des demandes et routage |
| Lecture Figma | [lecture.ts](../../../../../packages/plugin-nomenclature/src/lecture.ts), [lectureFigma.ts](../../../../../packages/plugin-nomenclature/src/lectureFigma.ts) : identifiants, noms, portée, protection Palettes |
| Calcul et file | [session.ts](../../../../../packages/plugin-nomenclature/src/session.ts), [tranches.ts](../../../../../packages/plugin-nomenclature/src/tranches.ts) : génération, calculs ordonnés, application et relecture |
| Règles | [regles.ts](../../../../../packages/plugin-nomenclature/src/regles.ts), [conventions.ts](../../../../../packages/plugin-nomenclature/src/conventions.ts) : validation, import, export, journal et restauration des réponses |
| Mutation | [ecriture.ts](../../../../../packages/plugin-nomenclature/src/ecriture.ts) : affectation de `name`, données partagées Architect, `commitUndo` |
| Proposition et sélection | [projection.ts](../../../../../packages/plugin-nomenclature/src/projection.ts), [selection.ts](../../../../../packages/plugin-nomenclature/src/ui/selection.ts) : groupes, noms cochés, exclusions et inclusions |
| Résultat présenté | [aAppliquer.ts](../../../../../packages/plugin-nomenclature/src/ui/aAppliquer.ts), [frontiere.ts](../../../../../packages/plugin-nomenclature/src/ui/frontiere.ts), [configuration.ts](../../../../../packages/plugin-nomenclature/src/ui/configuration.ts), [textes.ts](../../../../../packages/plugin-nomenclature/src/ui/textes.ts) |
| Moteur du kit | [lexique.ts](../../../../../packages/kit/src/referentiel/lexique.ts), [normalisation.ts](../../../../../packages/kit/src/referentiel/normalisation.ts), [vocabulaire-du-fichier.ts](../../../../../packages/kit/src/referentiel/vocabulaire-du-fichier.ts), [ecriture-des-mots.ts](../../../../../packages/kit/src/referentiel/ecriture-des-mots.ts) |
| Chemins publiés | [cheminsDeTokens.ts](../../../../../packages/plugin-socle/src/cheminsDeTokens.ts), [variables.ts](../../../../../packages/plugin-exporter/src/variables.ts), [exportTokens.ts](../../../../../packages/plugin-exporter/src/tokens/exportTokens.ts) |
| Distribution | [manifest.json](../../../../../packages/plugin-nomenclature/manifest.json), scripts de build et tests du paquet |

Architect ne contient pas de commande qui ouvre et remplace un fichier
`tokens.json` sur disque. Son export télécharge les règles de nommage. Le
risque sur `tokens.json` intervient ensuite, lorsque l’Exporter publie les
variables dont Architect a changé les noms.

Le comportement de l’Exporter en présence de collisions est prévu par le
[format des tokens](../../../../format/FORMAT.md#partie-2--export-tokens) :
il conserve la première variable, écarte l’autre et émet un avertissement.
Le défaut A10 est l’absence de contrôle de cette conséquence avant le
renommage dans Architect.

## Classement des défauts

La gravité élevée correspond à un renommage hors des protections attendues,
à une restauration perdue ou incorrecte, ou à un token absent de l’export.
La gravité moyenne correspond à une perte de règle ou à un résultat trompeur
qui exige une autre action avant d’endommager la nomenclature.

| Repère | Gravité | Défaut | Preuve |
|---|---|---|---|
| A1 | Élevée | Les noms changent avant l’enregistrement de leur restauration | Panne de stockage injectée |
| A2 | Élevée | Le journal est borné en caractères au lieu de sa taille de stockage | Mesure et quota simulé |
| A3 | Élevée | Des morceaux de deux journaux forment un journal accepté | Deux lots et panne de stockage |
| A4 | Élevée | Une annulation refusée efface le journal encore utile | Collision injectée |
| A5 | Élevée | Une annulation de cycle interrompue perd le nom courant à restaurer | Panne de setter injectée |
| A6 | Élevée | La protection et les occupants peuvent changer après leur contrôle | Deux courses injectées |
| A7 | Élevée | Les règles peuvent changer après la comparaison de leur signature | Course injectée |
| A8 | Moyenne | Une panne de relecture fait annoncer un refus après une mutation réussie | Protocole exécuté et rendu relu |
| A9 | Moyenne | Une paire de termes avec `\|` perd sa décision à la relecture | Sérialisation exécutée |
| A10 | Élevée | Un renommage accepté introduit une collision de tokens publiés | Session et index d’export exécutés |
| A11 | Moyenne | Une panne de stockage conserve une partie des règles importées | Import par la session exécuté |
| A12 | Moyenne | Annuler une réponse efface des modifications ultérieures de la même règle | Stockage et restauration exécutés |

Aucun défaut de suppression physique des valeurs Figma n’est établi. Le
classement ne suppose pas que les douze défauts ont la même cause ni qu’ils
produisent tous une perte définitive.

## Défauts de conservation et de restauration

### A1. Les noms changent avant l’enregistrement du journal

**Source :** `src/ecriture.ts:210-220` ; `src/regles.ts:430-435`.

`appliquerLesRenommages` appelle `executer` avant de préparer et d’écrire le
journal. Une exception de stockage laisse donc les nouveaux noms en place.
Le résultat indique `partiel` et `annulable: false`, mais aucun retour aux
noms d’origine n’est tenté.

Reproduction : renommer `Original` en `original`, puis faire échouer
l’écriture de `journal:0`. Le nom reste `original` et le journal est absent.
Le problème est plus coûteux sur un lot de plusieurs milliers de variables.

Une interruption entre le dernier setter et le journal présente la même
fenêtre de risque. La fermeture brutale du moteur Figma n’a pas été simulée.

**Correction attendue :** préparer et enregistrer une restauration complète
avant la première mutation. Refuser toute mutation si cette préparation
échoue. La reprise doit reconnaître un lot préparé, partiellement exécuté ou
terminé. Une tentative de retour aux anciens noms doit elle-même conserver
ses échecs.

### A2. Le découpage du journal ne mesure pas la taille de stockage

**Source :** `src/regles.ts:20`, `src/regles.ts:294-316`.

`preparerJournal` additionne `JSON.stringify(...).length` et borne le morceau
à 90 000 unités de chaîne JavaScript. Figma documente une limite de 100 kB
pour l’entrée complète, espace et clé compris.
[Référence Figma](https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/).

Le cas de 700 noms contenant des caractères chinois produit un premier morceau
de **82 327 unités de chaîne et 150 927 octets UTF-8**. Un port appliquant un
quota de 102 400 octets refuse le journal après le renommage des 700 variables.
Le calcul ne rejette pas non plus une entrée individuelle plus grande que la
limite : il la place seule dans un morceau.

Le dépassement en octets et le comportement du code sont reproduits. Le
comptage exact du stockage Figma, avec ces noms, reste à vérifier sur une copie
jetable. La marge actuelle n’établit aucune borne de taille en octets.

**Correction attendue :** mesurer la représentation stockée avec une marge
pour l’espace et la clé. Contrôler chaque entrée et tous les morceaux avant
de modifier un nom. Le banc de quota doit couvrir les accents, les caractères
chinois, les emoji et les échappements JSON.

### A3. Un journal incomplet peut mélanger deux lots

**Source :** `src/regles.ts:138-151`, `src/regles.ts:304-315`,
`src/regles.ts:430-435`.

Les morceaux s’appellent toujours `journal:0`, `journal:1`, etc. La tête ne
porte aucun identifiant de lot partagé avec les autres morceaux.
`lireJournal` vérifie leur présence et leur forme, sans vérifier leur origine.

Reproduction : appliquer un lot de 850 variables `a`, puis un lot distinct
de 850 variables `z`. Lors du second lot, remplacer `journal:0` et faire
échouer `journal:1`. La lecture accepte la tête du lot `z` et la queue du lot
`a` comme un journal complet.

L’annulation suivante change des variables du lot `a` et laisse une partie
du lot `z` renommée. Elle renvoie pourtant `statut: 'applique'`. La preuve
exécute ces deux applications et cette annulation.

**Correction attendue :** donner un identifiant de lot aux morceaux et
contrôler leur nombre, leur ordre et leur intégrité. Écrire les morceaux sous
des clés nouvelles, les relire, puis publier leur référence en dernier.
Conserver l’ancien journal tant que le nouveau n’est pas publié en entier.
Une lecture incohérente doit suspendre la restauration et conserver les
morceaux disponibles.

### A4. Un refus d’annulation efface les entrées encore utiles

**Source :** `src/ecriture.ts:247-255`.

Le journal restant n’est conservé que si `execution.erreur` vaut vrai. Une
collision, une protection ou un nom changé produit un saut sans exception.
La fonction efface alors le journal, même si elle n’a restauré aucun objet.

Reproduction : renommer `a` en `b`, puis attribuer `a` à un autre objet.
L’annulation refuse de remplacer l’occupant et laisse `b` en place. Elle
efface cependant le journal. Libérer ensuite `a` ne suffit plus à reprendre
la restauration depuis le plugin.

Le contrôle de collision protège l’occupant. Le défaut est la destruction
de la correspondance entre l’ancien et le nouveau nom.

**Correction attendue :** conserver chaque entrée non restaurée, avec son
motif. Effacer uniquement les entrées dont le retour à l’ancien nom a été
constaté. Proposer une reprise après résolution de la collision.

### A5. Une annulation de cycle interrompue conserve un état périmé

**Source :** `src/ecriture.ts:113-149`, `src/ecriture.ts:239-255`.

Le plan de renommage utilise un nom provisoire pour permuter deux noms.
Lors d’une application interrompue, le journal enregistre correctement ce nom
courant. Lors d’une annulation interrompue, `restants` recopie les anciennes
entrées sans actualiser leur `nouveauNom`.

Reproduction : appliquer la permutation `a` vers `b` et `b` vers `a`.
Interrompre l’annulation au deuxième setter, après l’écriture de `b~ucm` sur
le premier objet. Son entrée attend toujours `b`. Une nouvelle annulation
saute cet objet comme modifié, restaure l’autre puis efface le journal.
Le premier objet garde son nom provisoire.

**Correction attendue :** reconstruire chaque entrée restante depuis le nom
effectivement relu après l’échec, en conservant sa destination d’origine.
Tester une interruption avant et après chaque setter, pour l’application,
l’annulation et leurs reprises.

## Défauts entre les contrôles et la mutation

### A6. La protection Palettes et les occupants peuvent devenir périmés

**Source :** `src/session.ts:519-521`, `src/ecriture.ts:156-180`,
`src/ecriture.ts:264-273`.

La session relit l’inventaire, puis attend l’ouverture du port d’écriture.
Ce port effectue encore deux appels asynchrones. `executer` compare les noms
vivants des objets sélectionnés, mais reprend la protection et les noms des
occupants dans l’inventaire antérieur.

Deux reproductions injectent une modification pendant `ouvrir` :

- une variable reçoit la protection Palettes après la relecture ; elle est
  quand même renommée ;
- une autre variable prend le nom cible après la relecture ; le contrôle
  d’Architect accepte deux noms identiques dans la portée simulée.

Le second banc autorise les doublons dans son setter pour isoler le contrôle
manquant. Si Figma refuse ce doublon, le résultat sera une interruption du
lot plutôt que deux noms identiques. La réaction exacte de Figma et la
fréquence de ces intercalages collaboratifs restent à vérifier.

**Correction attendue :** constituer l’inventaire et les objets modifiables
depuis une même lecture finale. Contrôler les protections sur ces objets et
tous les occupants avant le premier setter. Aucun `await` ne doit séparer
ces contrôles de l’exécution synchrone du lot.

### A7. La signature des règles est comparée trop tôt

**Source :** `src/session.ts:514-521`.

La comparaison des règles précède les lectures asynchrones. Une modification
du stockage intercalée après cette comparaison ne provoque aucun refus.
Les demandes restent celles de l’ancien calcul.

Reproduction : préparer des noms en minuscules, puis ranger une convention
`PascalCase` pendant `ouvrir`. L’application écrit encore `brand-color`,
alors que la règle du fichier demande désormais une autre écriture.
Une exclusion de collection changée dans cette fenêtre suit le même chemin
sans nouvelle comparaison ; ce second cas est déduit du code.

**Correction attendue :** relire et comparer la signature après la dernière
attente asynchrone, immédiatement avant l’écriture. Refuser le lot si les
règles ou le périmètre ont changé. Un refus doit conserver le journal et
demander un nouveau calcul.

## Défauts de publication et de résultat

### A10. Les collisions de chemins publiés ne sont pas contrôlées

**Source :** `src/ecriture.ts:85-106` ;
`packages/plugin-socle/src/cheminsDeTokens.ts:45-54` ;
`packages/plugin-exporter/src/variables.ts:148-203` ;
`packages/plugin-exporter/src/tokens/exportTokens.ts:1176-1180`.

Architect compare les noms Figma exacts, par collection pour les variables et
par document pour les collections. La projection en chemins de tokens ajoute
la collection, normalise la casse et retire certains préfixes répétés.
L’index d’export refuse aussi qu’une feuille soit le groupe d’une autre.

Deux parcours ordinaires sont reproduits avec la session réelle :

| Avant | Action acceptée | Conséquence dans l’index d’export |
|---|---|---|
| Collection `Colors`, variables `foo` et `theme/foo` | Répondre à la question de collection pour retenir `theme`, puis appliquer | Les deux chemins deviennent `theme.foo` ; une variable quitte l’index |
| Collection `components`, variables `ink` et `paint/detail` | Poser la règle `ink` remplacé par `paint`, puis appliquer | `components.paint` devient la feuille parente de `components.paint.detail` ; une variable quitte l’index |

Une lecture indépendante reproduit aussi le cas de deux collections
`Theme` et `Colors` contenant chacune `foo`, puis `Colors` renommée `theme`.
Les noms exacts de collections diffèrent, mais les chemins publiés convergent.

Les identifiants et valeurs restent dans Figma. L’Exporter signale les
collisions ; la disparition du token exporté n’est donc pas silencieuse dans
ce produit. Architect n’en avertit pas avant l’application.

Le banc exécute l’index de production, qui passe de deux variables retenues
à une. Le parcours de sérialisation de l’Exporter est vérifié dans le code :
il itère cet index filtré. Aucun `tokens.json` réel n’a été remplacé.

**Correction attendue :** construire une projection des chemins avant et
après le lot, incluant les objets non cochés et les collections exclues.
Refuser toute nouvelle collision exacte ou entre feuille et groupe. La règle
doit provenir d’un module commun au lieu d’une copie dans Architect. Mesurer
aussi les effets sur les noms CSS, sans confondre leur contrôle avec celui
des chemins DTCG.

### A8. Une erreur de relecture efface le résultat d’une écriture réussie

**Source :** `src/session.ts:509-511` ; `src/ui/aAppliquer.ts:657-700` ;
`src/ui/textes.ts:173-174`.

La session envoie `application`, puis relit Figma pour produire le bilan.
Si cette relecture échoue, elle envoie `erreur` pour la même demande.
L’écran garde l’attente jusqu’au bilan et remplace alors l’annonce de
renommage par une annonce de refus : « Rien n’a été renommé. »

Le banc reproduit l’ordre `application`, puis `erreur`, alors que le nom et
le journal ont changé. L’affichage final est établi par lecture du gestionnaire
de messages ; il n’a pas été exécuté dans un navigateur.

Une autre limite du rendu concerne A1 : un résultat `partiel` avec des noms
changés, aucun saut et `annulable: false` conserve une présentation de réussite.
L’écran ne précise pas que l’enregistrement de la restauration a échoué.

**Correction attendue :** conserver le résultat d’écriture dès sa réception.
Distinguer une mutation refusée d’un bilan impossible à relire. Présenter
explicitement un journal absent ou incomplet et garder l’accès aux moyens
de récupération encore disponibles.

## Défauts de conservation des règles

### A11. Une exception laisse un import partiel

**Source :** `src/session.ts:480-487`, `src/regles.ts:430-435`.

L’import contrôle l’ensemble des règles et leurs conflits avant de rendre
les écritures. Leur rangement reste une boucle sans restauration de l’état
antérieur. Une exception à la deuxième clé laisse la première écrite, puis
la session renvoie une erreur générale.

La preuve importe deux règles valides `alpha` et `beta`, puis fait échouer
l’écriture de `terme:beta`. `terme:alpha` reste rangée. Les futurs calculs
peuvent employer ce sous-ensemble au lieu de l’import attendu.

**Correction attendue :** enregistrer les valeurs précédentes des clés et
suivre leur écriture. En cas d’échec, restaurer ou conserver un état de reprise
identifiable. Ne pas présenter une absence d’import si une partie subsiste.

### A12. Annuler une réponse écrase une modification ultérieure

**Source :** `src/regles.ts:271-286`.

`preparerReponse` garde l’état initial de chaque clé touchée. `defaireReponse`
le restaure sans comparer la valeur courante à celle écrite par la réponse.

Reproduction : la règle `ink` remplace `paint`. Une réponse ajoute `dye`.
Un autre geste ajoute ensuite `pigment` à la même règle. Annuler la réponse
rend la liste initiale contenant seulement `paint` et perd aussi `pigment`.

**Correction attendue :** mémoriser également la valeur écrite par la réponse.
Refuser une restauration qui écraserait un changement ultérieur, ou retirer
uniquement les éléments dont la réponse est propriétaire. Signaler le conflit
au lieu de supprimer cet ajout.

### A9. Le séparateur de clé d’une paire n’est pas échappé

**Source :** `src/regles.ts:66-76`, `src/regles.ts:177-183`,
`src/regles.ts:367-373`.

Les mots acceptés peuvent contenir `|`. La clé d’une paire joint cependant
les deux termes avec ce caractère. Les paires `a|b` avec `c` et `a` avec `b|c`
produisent la même clé. Leur relecture obtient trois morceaux et ignore
l’entrée.

La décision « termes différents » peut donc disparaître dès la relecture.
L’import refuse explicitement ce caractère dans les paires, contrairement au
chemin d’écriture de la décision. Ce défaut touche des noms inhabituels ; il
ne modifie pas directement les valeurs d’une variable.

**Correction attendue :** encoder une paire sans ambiguïté ou refuser ces
termes avant le rangement. Prévoir la lecture des anciennes clés exploitables
et employer la même validation pour une réponse et pour un import.

## Garanties observées et limites restantes

### Ce que les contrôles existants protègent

- Les identifiants Figma restent les cibles de l’écriture. Le plugin ne
  recrée pas les variables pour les renommer.
- Le code d’écriture relit le nom vivant, la collection et le caractère
  local de chaque objet sélectionné. Un objet disparu ou déjà renommé est
  sauté.
- Les collisions exactes connues sont retirées jusqu’à stabilisation. Un
  occupant non coché ou protégé garde son nom.
- Une protection Palettes présente lors de la relecture empêche le
  renommage de la variable. La collection peut être renommée, conformément
  à l’invariant du projet.
- Les générations du protocole empêchent une application fondée sur un
  bilan remplacé. Les calculs d’une session passent dans une même file.
- Les chaînes et permutations ordinaires aboutissent. Le banc supplémentaire
  vérifie l’application puis l’annulation des 120 permutations de cinq noms.
- Les champs autres que `name` restent identiques dans le banc enrichi :
  valeurs par mode, alias, clé, portées, description et syntaxe de code.
  La revue des appels ne trouve aucun setter de valeur ou d’alias.
- Le manifeste n’ouvre aucun domaine réseau. Les noms sont rendus par
  `textContent` dans les chemins relus de l’interface.

La [loi d’écriture](../../../../../packages/plugin-nomenclature/tests/loiDEcriture.test.ts)
est un contrôle textuel utile. Elle ne prouve ni la transaction du lot ni la
durabilité du journal. Les tests existants d’interruption d’annulation
n’épuisent pas les étapes d’un cycle.

### Ce qui ne constitue pas une sauvegarde

`commitUndo` crée un point dans l’historique d’annulation ; il ne déclenche
pas de restauration et ne produit aucun fichier de sauvegarde.
[Référence Figma](https://developers.figma.com/docs/plugins/api/figma/#commitundo).

L’export des règles omet volontairement le journal. Le banc le vérifie.
Il ne contient ni les anciennes correspondances de noms ni une copie des
valeurs, modes et alias. Un nouveau lot remplace le journal du précédent :
le plugin n’offre qu’un niveau de restauration nominative.

La lecture ignore les règles illisibles ou d’une version inconnue, sans les
réécrire. Cette tolérance est documentée et testée ; elle ne distingue pas
une absence de règle d’une règle inutilisable pour le designer. Une commande
de renommage devrait pouvoir suspendre son application dans ce second état.

Le journal réside dans le même fichier que les données modifiées. Une copie
externe de l’état initial reste nécessaire pour se protéger aussi d’une perte
du fichier lui-même. Aucune propriété du renommage ne remplace cette copie.

### Vérifications qui exigent une copie Figma jetable

Les points suivants restent ouverts, sans essais sur le fichier d’origine :

1. Rejouer la limite réelle de stockage avec le corpus Unicode du banc.
2. Vérifier l’unicité imposée aux noms et le comportement des setters en
   cas de collision arrivée pendant une lecture asynchrone.
3. Rejouer un changement collaboratif de protection et de règles pendant
   l’application.
4. Contrôler l’annulation native, la fermeture du plugin et la réouverture
   après chaque phase d’un lot interrompu.
5. Comparer par identifiant les valeurs de tous les modes, alias, clés,
   portées, descriptions et syntaxes de code avant et après le renommage.
6. Faire un export complet après les deux scénarios A10 et contrôler les
   références des contrats vers les variables écartées.
7. Relire l’annonce A8 et l’accès à la restauration dans la galerie ou dans
   Figma, après une erreur de relecture et après une panne du journal.

## Ordre de correction et critères de validation

| Priorité | Travail | Preuve de fin attendue |
|---|---|---|
| 1 | Préparer une restauration durable avant le premier nom ; corriger A1, A2 et A3 ensemble | Une panne de préparation ne change aucun nom ; aucun mélange de lots n’est accepté |
| 2 | Conserver toutes les entrées non restaurées et actualiser les noms provisoires ; A4 et A5 | Une reprise après chaque setter retrouve tous les noms initiaux, ou garde chaque conflit récupérable |
| 3 | Regrouper les dernières lectures et comparer règles, protection et occupants sans nouvelle attente ; A6 et A7 | Les courses du banc refusent le lot ou respectent l’état final lu |
| 4 | Contrôler les chemins publiés sur l’état projeté ; A10 | Le lot ne crée aucune ambiguïté supplémentaire et ne réduit pas le nombre de variables exportables |
| 5 | Séparer le résultat de mutation du résultat de relecture ; A8 | Une erreur de bilan n’annonce jamais qu’aucun nom n’a changé après une application réussie |
| 6 | Préserver les règles après une panne ou une annulation concurrente ; A9, A11 et A12 | Sérialisation sans collision, import récupérable et conservation des ajouts ultérieurs |

La restauration doit conserver les noms d’origine exacts. Recalculer une
convention inverse ne suffit pas : la normalisation peut faire converger
plusieurs écritures.

Une correction qui appelle automatiquement l’annulation globale doit établir
qu’elle ne retire aucun travail étranger au lot. La correction préférable
pour cet audit suit les identifiants et les écritures dont Architect est
propriétaire.

La validation finale doit inclure les pannes de setters, de chaque morceau du
journal, de nettoyage, de `commitUndo` et de relecture. Elle doit vérifier la
réouverture et la reprise d’un lot préparé, ainsi que la conservation de tout
journal antérieur encore nécessaire.

## Commandes et résultats

À lancer depuis la racine du dépôt :

```powershell
npm test --workspace ucm-nomenclature-plugin
npm run typecheck --workspace ucm-nomenclature-plugin
npm run build --workspace ucm-nomenclature-plugin
npx tsx --test 'docs/notes/Recherches/Plugin Architect/5 Recette/Mesures/auditer-integrite.ts'
```

| Contrôle | Résultat |
|---|---|
| Suite existante d’Architect | 249 tests au premier contrôle, 252 à la dernière exécution ; tous réussis |
| TypeScript d’Architect | Réussi sur la base auditée |
| Build d’Architect, sandbox et interface | Réussi sur la base auditée |
| Build du kit | Réussi avant la dernière exécution des preuves |
| Banc supplémentaire | 18 contrôles réussis, dont 14 reproductions de défauts |
| TypeScript du banc supplémentaire | Réussi en mode strict |
| Liens et style documentaire du dépôt | 8 tests réussis |
| Style du rapport, du banc et du sommaire | Conforme |

Le build met à jour les artefacts ignorés de `dist/`. L’audit ne modifie aucune
source de production. La réussite de la suite existante n’écarte aucun des
défauts reproduits par le banc supplémentaire. Les suites complètes des autres
produits et leur recette visuelle ne sont pas rejouées par cet audit.
