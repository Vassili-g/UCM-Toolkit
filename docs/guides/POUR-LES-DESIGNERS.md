# UCM pour les designers

Ce guide s'adresse au designer qui travaille dans Figma. Il n'attend aucune
connaissance du code et ne demande jamais d'ouvrir un terminal.

## 1. À quoi sert UCM

Un composant existe à deux endroits : votre maquette Figma, et le code de
l'application. Aucun contrôle ne compare les deux. Un variant ajouté dans Figma
peut ne jamais arriver dans le code, sans que rien ne le signale.

UCM répond en donnant un propriétaire unique à chaque information.

| Information | Qui décide |
|---|---|
| Variantes, états, dimensions, couleurs, icônes, tokens | Vous, dans Figma |
| Comportement, clics, accessibilité | Le développeur, dans le code |
| L'écart entre les deux | La CI, à chaque pull request ou merge request |

Le plugin exporte ce que Figma possède dans un fichier appelé **contrat**. Ce
fichier est déposé à côté du code du composant. La CI le relit à chaque
modification et vous répond dans la pull request, ou dans la merge request sur GitLab.

Vous n'écrivez pas de code. Le plugin n'en écrit pas non plus. Exporter ne
modifie jamais votre document Figma. Un seul bouton y écrit, « Créer les règles
d'usage », et il ne pose qu'une instance de `.componentRules` à côté de votre
composant.

## 2. Préparer un composant

Le plugin lit votre composant tel qu'il est, sans rien ajouter. Ce qui suit
augmente ce qu'il pourra décrire.

**Liez vos valeurs à des variables.** Une couleur, un gap, un padding, un rayon
ou une taille reliés à une variable Figma entrent dans le contrat sous le nom de
cette variable. Une valeur saisie à la main n'y entre pas, et le plugin vous
prévient. Le geste attendu est toujours de nommer la valeur, jamais de la
retirer de la maquette.

**Nommez vos calques.** Le nom d'un calque est la seule identité que le contrat
et le code partagent. Un calque nommé `Frame 427` sera cité tel quel dans les
messages que vous recevrez.

**Sélectionnez un seul composant.** Le plugin attend exactement un composant ou
un set de variantes. Une autre sélection arrête l'export.

**Documentez votre intention.** Une instance de `.componentRules`, posée sur la
même page, décrit l'usage du composant, les combinaisons recommandées et la
politique de ses icônes. Écrivez le nom du composant dans son calque
`component-name` : c'est ce texte qui relie les règles au composant.

Sélectionnez votre composant, puis cliquez sur « Créer les règles d'usage » :
le plugin pose ce conteneur et y range une règle par propriété, chacune
marquée « [À compléter] ». Remplacez chaque « [À compléter] » par votre texte :
une règle qui le contient encore n'entre pas dans le contrat. Le bouton
disparaît une fois le conteneur posé ; le supprimer le fait revenir. Le geste
complet est dans [Documenter les règles
d'usage](../../packages/plugin-exporter/README.md#documenter-les-règles-dusage), et ce que
chaque règle devient dans [7. Intention et documentation des
props](../format/FORMAT.md#7-intention-et-documentation-des-props).

Si votre fichier ne porte aucun `.componentRules`, dupliquez le [kit de
règles](https://www.figma.com/community/file/1684536749543631522) depuis la
Community, puis copiez ses trois maîtres sur la page de vos composants. Le
[guide du kit](./KIT-DE-REGLES.md) détaille ce geste.

## 3. Exporter

Ajoutez-le depuis la Figma Community :
<https://www.figma.com/community/plugin/1678431364325816914>

Il apparaît ensuite dans votre menu `Plugins`, et propose deux commandes.

| Commande | Ce qu'elle produit |
|---|---|
| Exporter le composant | Un fichier `<Nom>.contract.json` : variantes, structure, tokens, icônes, règles d'usage |
| Exporter les tokens | Un fichier `tokens.json` : vos variables locales, avec leurs alias et leurs modes |

Le fichier est toujours téléchargeable. Si un dépôt a été configuré dans le
plugin, l'export crée en plus une branche et une demande de fusion contenant ce
seul fichier : une pull request sur GitHub, une merge request sur GitLab. Le
jeton d'accès reste dans le stockage local du plugin ; il n'apparaît ni dans
l'interface, ni dans les journaux, ni dans le fichier.

Un export identique à ce qui est déjà déposé n'ouvre pas de seconde demande. Le
plugin vous dit où il a trouvé le même contenu.

Si votre équipe ne publie pas de tokens, désactivez « Gérer les tokens » dans
l'onglet Général de la configuration : seule la commande du composant reste.

**Quand la gestion des tokens est activée, dans un repository neuf, exportez
les tokens en premier**, et faites fusionner
leur demande avant de publier un composant. Le contrôle du repository refuse la
demande d'un composant tant que `tokens.json` n'est pas sur la branche de base.
L'analyse d'un composant vous le rappelle, sans vous empêcher de publier. Si
la demande d'un composant est déjà refusée pour cette raison, faites fusionner
les tokens, puis relancez son contrôle : aucun nouvel export n'est nécessaire.

### Configurer le dépôt

Ouvrez `Configuration` depuis l'en-tête du plugin, puis l'onglet `Dépôts`. Un
développeur doit avoir branché le repository au préalable. Le plugin garde
plusieurs dépôts ; les exports vont dans le dépôt actif, marqué « Connecté ».

1. Cliquez « Ajouter un dépôt », puis collez dans le champ « URL du dépôt »
   l'adresse du repository, ou celle de n'importe quelle
   page du repository : un dossier, une demande de fusion. Le plugin affiche
   sous le champ le repository qu'il retient, par exemple « Projet GitLab :
   mon-groupe/design-system ». Si l'adresse désignait un dossier, il le dit :
   c'est le fichier `ucm.config.json` du repository qui décide où vont les
   exports, pas l'adresse.
2. Renseignez la branche de base, celle que la demande de fusion vise :
   `main` le plus souvent.
3. Créez un jeton.
   - Sur GitHub, un fine-grained Personal Access Token, dans `Settings >
     Developer settings > Personal access tokens` : limitez-le à ce repository,
     avec `Contents: Read and write` et `Pull requests: Read and write`.
   - Sur GitLab, un jeton personnel fine-grained, dans vos préférences :
     limitez-le à ce projet, avec `Project: Read`, `Repository: Read`,
     `Branch: Read, Delete`, `Commit: Create` et
     `Merge Request: Read, Create`. Un jeton de seul scope **api** convient
     aussi : un jeton d'accès projet de rôle Developer quand votre offre le
     propose, un jeton personnel sinon, qui ouvre alors tous vos projets.
4. Collez le jeton, puis enregistrez. Le plugin teste le dépôt : la carte se
   replie quand il répond, et reste dépliée avec le geste à faire sinon. Le
   premier dépôt enregistré devient actif, sauf quand l'export local est
   activé.

Pour publier dans un autre dépôt, cliquez « Se connecter » sur sa carte : il
devient actif, la pastille de l'en-tête le nomme, et le verdict de l'analyse
suivante aussi. Une analyse faite
pour l'ancien dépôt ne se publie pas dans le nouveau ; relancez-la.

Pour télécharger vos exports sans ouvrir de demande de fusion, activez
« Activer l'export local » dans l'onglet Général. La pastille de l'en-tête dit
alors « Export en local », et aucune carte n'est « Connecté ». Vos dépôts restent
enregistrés. Pour publier de nouveau, désactivez l'interrupteur, ou cliquez
« Se connecter » sur un dépôt. Une analyse faite avant ce changement ne se
publie pas ; relancez-la.

Un jeton ne part que vers le dépôt pour lequel vous l'avez collé. L'adresse
d'un dépôt enregistré ne se modifie plus : pour un autre projet, ajoutez un
dépôt, puis supprimez l'ancien. « Supprimer » retire le dépôt et son jeton du
poste.

## 4. Lire ce que le plugin vous répond

Un message du plugin répond toujours à trois questions, dans cet ordre.

| | Ce que vous lisez |
|---|---|
| **Où et quoi** | Le nom exact de l'élément Figma, tel qu'il s'affiche dans le panneau des calques, puis ce qui manque |
| **Et alors** | Ce que le développeur n'aura pas |
| **Comment** | Le geste à faire dans Figma |

Les termes employés sont ceux que Figma affiche à l'écran. Un message parle de
`padding`, de `corner radius` ou de `stroke weight`, jamais de leur nom dans le
code. Vous devez pouvoir chercher dans votre écran le mot que le message
emploie.

**Un message n'apparaît que s'il vous demande quelque chose.** Une
transformation que le plugin prend entièrement en charge reste silencieuse. Si
vous lisez un message, il y a un geste à faire.

Trois cas seulement produisent un message :

1. le point empêche l'export ;
2. le point rend le contrat incomplet ;
3. le point demande une vérification ou une correction dans Figma.

## 5. Relire une demande de fusion d'export

La pull request, ou la merge request sur GitLab, contient un seul fichier, celui que vous venez d'exporter. Son
corps porte deux zones.

**L'en-tête** dit ce qui est déposé : le chemin du fichier, et la version de
schéma du contrat. Le nom de fichier et l'identifiant de nœud qu'il porte
permettent de retrouver le composant Figma d'où il vient.

**La liste** ne porte que des gestes. Ce que le plugin a compté, ce que la
demande liste et ce que le contrat publie sont la même liste.

Quelques minutes après, la CI ajoute un commentaire sur GitHub, une note sur
GitLab. C'est le seul message que vous ayez besoin de lire. Les journaux de la
CI ne vous concernent pas. À chaque nouvel export sur la même branche, la note
GitLab est remplacée, jamais empilée.

## 6. Ce qui bloque la fusion et ce qui avertit

Presque tous les blocages se lèvent par un réexport, et le rapport vous dit
lequel. Un seul fait exception : un contrat produit par une version du plugin
que le repository ne lit pas encore. Le message s'adresse alors à un
développeur, qui doit mettre l'outillage à jour ; réexporter n'y changerait
rien.

| Contrôle | Ce qu'il vérifie | Verdict |
|---|---|---|
| Validité | Le contrat est lisible et complet | Bloque |
| Version | La version du contrat entre dans la fenêtre de lecture du repository | Bloque |
| Composition | Chaque composant imbriqué a son propre contrat, les listes concordent, aucun cycle | Bloque |
| Typographie | Les tokens typographiques ont le type attendu | Bloque |
| Tokens | Les tokens cités existent dans `tokens.json` | Bloque, sauf pour un contrat en retard sur les tokens |
| Parité code | Le code expose bien les props du contrat | Bloque, sauf pour un composant en retard sur son contrat |

Le rapport relaie en plus deux choses qu'il ne mesure pas lui-même : les
avertissements que l'export a écrits dans le contrat, et le verdict des tests du
repository quand celui-ci le transmet.

### La règle appliquée

Le contrôle juge qui a changé en dernier, le contrat ou le code. Si le contrat
d'un composant a changé après son code, le composant est « en retard sur son
contrat » : l'écart n'est pas une faute du développeur, et rien ne bloque. Si le
code a changé en même temps ou après, l'écart bloque. Un envoi direct sur
`main` suit la même règle, donc la fusion d'une variante par vos soins ne rend
jamais `main` rouge.

Un écart du code bloque sur quatre familles : les couleurs et les tokens, les
dimensions et les espacements, la typographie, la structure et l'ordre. Tout ce
que le contrat ne décrit pas reste libre dans le code : les enveloppes, les
props non visuelles, le placement par le parent et les animations.

La mesure automatique du rendu bloque. Votre validation visuelle ne bloque
jamais : un rendu que vous validez devient la capture de référence, et un
changement du code seul qui modifie cette capture bloque. Le linter, en
préparation, refusera dans le code d'un composant un token absent de
`tokens.json` et une valeur écrite en dur. Il ne bloque que la demande d'un
développeur qui modifie ce code. Une demande de contrats ou de `tokens.json`
seuls reste verte.

Une demande qui ne contient que des contrats et `tokens.json` n'est refusée que
pour ses propres fichiers, jamais pour le code. Vous exportez `tokens.json` et
vous la fusionnez seul, à condition que le repository vous désigne
propriétaire de ce fichier dans un `CODEOWNERS`.

**Un contrat peut arriver avant le code.** L'absence d'implémentation est un
état d'avancement autorisé, pas une erreur. Un composant en retard n'arrête
personne tant que personne ne modifie son code. Le développeur qui le modifie
le rattrape, ou pose une dérogation motivée. Le rapport affiche depuis combien
de jours chaque composant est en retard ; aucun délai ne le fait expirer.

Un code TypeScript sans adaptateur bloque. L'adaptateur apprend au contrôle à
lire le code. Sans lui, rien n'est prouvé, et le contrôle refuse la demande
d'un développeur. Pour une technologie qu'aucun adaptateur ne lit, le rapport
dit seulement « code présent, non vérifié ».

### Les cas, un par un

| Votre demande, ou celle du développeur | Verdict | Ce que le rapport dit |
|---|---|---|
| Vous changez la valeur d'un token (tokens seuls) | Passe | Rien de plus |
| Vous retirez un token qu'un contrat cite (tokens seuls) | Passe | Les contrats à réexporter, « en retard sur les tokens » |
| Votre `tokens.json` est illisible ou d'une version non lue | Bloque | Le geste à faire |
| Vos tokens seuls arrivent alors qu'un écart du code existe déjà | Passe | L'écart, adressé à un développeur |
| Vous ajoutez au contrat une variante que le code n'a pas | Passe | Le composant est « en retard sur son contrat » |
| Votre contrat n'a pas encore de code | Passe | « Pas d'implémentation » |
| Votre contrat cite un token absent de `tokens.json` | Bloque | Fusionner d'abord la demande des tokens, puis relancer |
| Votre contrat est illisible, incomplet ou d'une version non lue | Bloque | Le geste à faire |
| Votre contrat est celui d'un composant qui porte une dérogation | Passe | La dérogation tombe, avec son motif et son auteur |
| Le développeur modifie le code et laisse un écart, même si la demande change aussi le contrat | Bloque | L'écart et le geste du développeur |
| Le développeur corrige un bug dans un composant en retard sans rattraper le contrat | Bloque | L'écart à rattraper, ou la dérogation à poser |
| Le développeur change du code partagé qui crée un écart ailleurs | Bloque | L'écart et le composant touché |
| Le développeur change du code sans lien avec un composant en retard | Passe | Le retard, avec son âge |
| Le développeur change du code avec une dérogation valide | Passe | La dérogation, « à valider par le designer » |
| La dérogation n'a pas de motif ni d'auteur, est mal formée ou couvre un écart non dérogeable | Bloque | L'entrée fautive |
| Du code TypeScript arrive sans adaptateur chargé, ou avec un fichier que l'adaptateur ne lit pas | Bloque | Le geste d'installation |
| Le code d'une technologie qu'aucun adaptateur ne lit | Passe | « Code présent, non vérifié » |
| Envoi direct sur `main`, sans demande de fusion | Juge l'état de `main` | Bloque sur un écart ni en retard ni dérogé, un contrat invalide, ou un contrat qui cite un token absent |
| Contrôle lancé sur une copie sans historique complet | Erreur d'invocation (code 2) | Récupérer l'historique complet |
| Contrôle lancé en local par un développeur ou son agent | Comme `main` | Les fichiers non enregistrés comptent comme les plus récents |

Un changement du code seul qui modifie une capture de référence bloque. Une
demande qui change le contrat et ses captures passe : les captures attendent
votre validation.

### Relire une dérogation

Une dérogation est une exception que le développeur écrit dans
`.ucm/derogations.json`, pour un écart précis, avec son motif et son nom. Elle
vaut pour l'export du contrat qu'elle nomme. Votre prochain export de ce
composant la fait tomber, et elle n'a pas de date d'expiration.

Vous la relisez dans trois rapports :

- celui de la demande qui la pose l'affiche en tête ;
- celui de chaque demande de contrat ou de tokens finit par la liste des
  dérogations à valider, avec le composant, l'écart, le motif et l'auteur ;
- celui de l'export qui la fait tomber la cite avec son motif, et dit que le
  prochain développeur qui modifie ce composant devra rattraper l'écart.

Pour l'accepter, vous changez Figma pour que le contrat dise ce que fait le
code, puis vous exportez. Pour la refuser, vous demandez à un développeur, ou à
son agent, de retirer la ligne du composant dans `.ucm/derogations.json` ; le
rapport donne cette demande en une phrase à recopier. Une entrée qui ne
correspond plus à aucun écart est signalée « sans objet » et ne retient rien.

Un point reste ouvert : ce que le linter refuse en plus d'une valeur écrite en
dur. La [décision sur le verdict](../notes/Recherches/Linter%20Dev/DECISION-VERDICT-UCM-CHECK.md)
détaille la règle, et le [plan de conformité du rendu](../notes/Recherches/Linter%20Dev/PLAN-CONFORMITE-RENDU.md#7-règle-de-sévérité)
garde le point du linter.

### Rendre le blocage effectif

Sur GitHub, une pull request rouge n'est bloquée que si la protection de la
branche de base exige le check `contrats`. GitHub n'offre cette protection
qu'aux repositories publics et aux offres payantes. Sans elle, le rapport
annonce une fusion bloquée qui ne l'est pas : demandez à un mainteneur du
repository de l'activer.

Sur GitLab, une merge request rouge n'est bloquée que si l'option « Pipelines
must succeed » est cochée dans `Settings > Merge requests` du projet. Sans elle,
le rapport annonce une fusion bloquée qui ne l'est pas : demandez à un
mainteneur du projet de la cocher.

## 7. Voir l'interface du plugin sans ouvrir Figma

Chaque écran du plugin, y compris ses cas d'erreur, est reproductible hors de
Figma. C'est utile pour juger une hiérarchie, une densité ou une place, et pour
relire un message avec le pire contenu réel.

```sh
npm run galerie --workspace ucm-exporter-plugin           # ouvre dist/galerie/index.html
npm run galerie:captures --workspace ucm-exporter-plugin  # produit les planches en PNG
```

Les couleurs de la galerie sont un décalque de celles de Figma. Elles servent à
juger une mise en page, jamais à conclure sur un contraste : pour cela, regardez
dans Figma, dans les deux thèmes.

## 8. Vocabulaire

Chaque terme renvoie au document qui en fait autorité, seul endroit où la
définition complète est écrite.

| Terme | En une phrase |
|---|---|
| **Contrat** | Le fichier `<Nom>.contract.json` exporté depuis Figma, posé à côté du code du composant. [Forme complète](../format/FORMAT.md#sortie) |
| **Token** | Une variable du design system, citée par son nom et jamais par sa valeur, pour qu'un changement de thème n'oblige pas à réexporter. [Nommer et citer un token](../format/FORMAT.md#nommer-et-citer-un-token) |
| **Variante** | Une combinaison de valeurs d'axes qui existe réellement dans votre set. Le contrat liste celles qui existent, jamais toutes celles qui seraient possibles. [1. Props](../format/FORMAT.md#1-props) |
| **État** | Un axe `State`, `States`, `État` ou `Etat` : hover, focus, disabled. Un axe `Status` (succès, erreur) reste une prop. Il est publié à part des props, parce qu'il vient de l'exécution et non d'un choix d'API. [4. Modèle d'interaction](../format/FORMAT.md#4-modèle-dinteraction) |
| **Slot** | Un emplacement de l'arbre du composant, où se range un texte, une icône ou un composant imbriqué. [6. Structure](../format/FORMAT.md#6-structure) |
| **Structure** | L'arbre des calques que le contrat publie, avec leur flux et leurs alignements. [6. Structure](../format/FORMAT.md#6-structure) |
| **Vue** | La description exacte d'une variante, obtenue en suivant six renvois vers des catalogues partagés. Deux variantes identiques citent la même vue. [Sortie](../format/FORMAT.md#sortie) |
| **Composition** | Le fait qu'un composant en réutilise un autre. Le contrat cite la dépendance sans recopier son contenu. [Composition et dépendances](../format/FORMAT.md#composition-et-dépendances) |
| **Parité** | La comparaison entre les props du contrat et l'API réelle du composant dans le code. [ROADMAP](../../ROADMAP.md) |
| **Couverture portable** | Le champ qui dit si l'export a tout su décrire. `complete` : rien n'est perdu. `partial` : un message nomme le calque et la propriété concernés. [Métadonnées](../format/FORMAT.md#métadonnées) |
| **Diagnostic** | Un message adressé à vous, avec son constat, son impact et son geste. [8. Rendu sémantique et garde-fous](../format/FORMAT.md#8-rendu-sémantique-et-garde-fous) |
| **Échantillon de maquette** | Ce que Figma affichait au moment de l'export : textes, valeurs. Il aide à retrouver l'esthétique voulue. Aucun contrôle ne le compare au code. [9. Échantillon de maquette](../format/FORMAT.md#9-échantillon-de-maquette) |
| **Adaptateur** | Un paquet optionnel qui apprend à la CI à lire le code d'une technologie donnée. Sans lui, les contrôles indépendants du langage fonctionnent quand même. [README du CLI](../../packages/cli/README.md) |
| **Composant jetable** | Un composant reconstruit depuis son seul contrat, pour vérifier que ce contrat suffit. Il se jette et se refait. Il ne forme jamais une bibliothèque |

## 9. Où aller ensuite

- [../../packages/plugin-exporter/README.md](../../packages/plugin-exporter/README.md) : où obtenir le
  plugin, et ce qu'il ne fait pas.
- [../README.md](../README.md) : la vue d'ensemble du projet.
- [FORMAT.md](../format/FORMAT.md) : la forme exacte de chaque champ, si vous voulez
  lire un contrat en détail.
- [../../ROADMAP.md](../../ROADMAP.md) : ce que le projet sait faire aujourd'hui, et
  ce qu'il ne prouve pas encore.
