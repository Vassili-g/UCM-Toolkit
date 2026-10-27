# Spécification d'UCM Architect

UCM Architect lit les variables d'un fichier Figma et explique leurs
valeurs : collections, groupes, alias, modes, tokens d'un composant. Dans un
fichier déclaré UCM, il propose des corrections et les écrit après
confirmation. Ce document décrit ce que le plugin lit, comment il résout une
chaîne, ce qu'il écrit et ce qu'il refuse de conclure. Le
[plan d'implémentation](../../docs/notes/Recherches/UCM%20Architect/3%20Plan/PLAN-IMPLEMENTATION.md)
porte l'historique des décisions. Les invariants vérifiés sont dans
[invariants/explorateur.md](./invariants/explorateur.md) et
[invariants/nomenclature.md](./invariants/nomenclature.md).

## Lecture et écriture

La navigation lit seulement. L'arbre, la table, la fiche d'une variable et la
vue composant ne changent rien au document.

Le plugin écrit dans un fichier qui se déclare UCM, et seulement par un geste
du designer : Appliquer, Créer, une réponse, Ignorer, un choix de la
Configuration, une annulation de l'Historique. Chaque écriture relit d'abord
ce qu'elle va changer et saute ce qui a changé depuis l'analyse. Un fichier
qui ne déclare plus UCM au moment d'écrire ne reçoit rien.

| Écriture | Geste | Annulation |
|---|---|---|
| Nom d'une variable ou d'une collection locale | Appliquer, onglet Corrections du mode Tokens | Historique de la Configuration |
| Scopes d'une variable, cible d'alias dans un mode | Appliquer, sous Modes et Scopes | Historique de la Configuration |
| Variables créées dans `components` | Créer, depuis une préparation | Historique de la Configuration |
| Liaison d'une variable à un layer du composant analysé | Appliquer, panneau des constats | Ctrl+Z dans Figma |
| Nom d'une valeur de variante, instance de règles du composant | Appliquer, panneau des constats | Ctrl+Z dans Figma |
| Constats ignorés, library choisie, déclaration UCM, clé du fichier des tokens | Ignorer, Configuration, ouverture du mode Tokens | Le geste inverse |

Les écritures sur les variables entrent dans un journal rangé à la racine du
document avant l'écriture. L'Historique n'annule que le dernier lot de chaque
journal. Les écritures sur le composant posent un seul point d'annulation par
lot, pour qu'un Ctrl+Z défasse le lot entier. Les données rangées dans le
document vivent sous `ESPACE_ARCHITECT`, dans les données partagées de la
racine.

Le plugin importe deux sortes de variables de library : la cible d'un alias
que Figma ne rend pas par son identifiant, et la cible d'une liaison qu'il
écrit. L'import abonne le fichier à cette variable, sans créer de variable
locale. Aucun composant ni aucun style n'est importé.

Le plugin ne change ni la page courante ni la vue du designer. Il change la
sélection à un seul moment : au clic sur un constat, il sélectionne ses layers
de la page courante. L'aperçu d'un composant s'exporte en mémoire par
`exportAsync`. `figma.clientStorage` reçoit la taille de la fenêtre, une par
disposition, les préférences de l'interface, le niveau d'accessibilité (AA ou
AAA) et les préparations de tokens.

## Architecture libre

La navigation ne réserve aucun nom de collection, de groupe ou de mode. Une
collection unique, des alias internes, plusieurs axes de modes et des
valeurs directes sont des cas ordinaires.

Les corrections, l'analyse d'un composant et la préparation suivent
l'architecture UCM complète, et seulement dans un fichier qui la déclare. La
déclaration se règle dans la Configuration (« Ce fichier suit l’architecture
UCM »). Un fichier dont la déclaration est absente ou libre montre une alerte
à la place des onglets de la barre latérale ; ses noms restent ceux
d'aujourd'hui.

L'arbre suit la distinction Figma entre collections et groupes. Un groupe
vient des segments `/` du nom Figma, et de rien d'autre :

| Nom Figma | Groupes |
|---|---|
| `card/header/fill` | `card`, puis `card/header` |
| `spacing.card` | aucun : le point ne crée pas de groupe |
| `a//b` | `a`, puis un segment vide affiché « (sans nom) » |

Un groupe s'identifie par sa collection et la liste de ses segments. Deux
collections homonymes, ou deux groupes homonymes dans deux collections,
restent distincts. Choisir une collection montre toutes ses variables ;
choisir un groupe montre ses variables et celles de ses descendants. Le
chevron replie l'arbre sans changer la table.

## Lecture

| Donnée | Lecture | Limite |
|---|---|---|
| Collections et variables locales | `getLocalVariableCollectionsAsync`, `getLocalVariablesAsync` | Un type de variable inconnu des typings est écarté |
| Cible d'un alias absente du lot local | `getVariableByIdAsync`, puis sa collection par `getVariableCollectionByIdAsync` | Au plus huit lectures en vol, une par identifiant |
| Cible de bibliothèque que cette lecture ne rend pas | `importVariableByKeyAsync`, avec la clé que porte l'identifiant `VariableID:<clé>/<node>` | Échoue quand la bibliothèque ne publie plus la clé, ou sans accès à la bibliothèque |
| Collection étendue | `isExtension`, `parentVariableCollectionId`, `variableOverrides`, `parentModeId` | Résolution à confirmer dans Figma, plan Enterprise |
| Calques du composant lu et styles de texte | `boundVariables`, peintures, effets, grilles, segments de texte | Réactions, valeurs par défaut des propriétés et calques masqués des instances non lus |
| Modes d'un calque | `resolvedVariableModes`, `explicitVariableModes` | Les modes par défaut d'équipe ne sont pas exposés |
| Valeur selon Figma | `resolveForConsumer` sur un calque existant | Aucune chaîne, la valeur seule |
| Library d'un fichier sans variable locale | Noms par `figma.teamLibrary`, valeurs d'un groupe par `importVariableByKeyAsync` à son ouverture, par lots de huit | Modes sans nom avant l'import ; `LIMITE_PAR_GROUPE` variables importées par groupe |
| Catalogue de référence d'une analyse | `theme`, `layout` et `components` de la library choisie : noms d'abord, valeurs importées à la demande des contrôles | Une entrée est présente, absente, non chargée ou inaccessible |

Une cible que ni la lecture ni l'import ne rendent reste « introuvable » ;
elle reste « refusée », avec son message, quand la lecture a levé. Ni l'une
ni l'autre ne prouve une suppression. Les listes de `figma.teamLibrary` ne
donnent ni valeur ni chaîne : le relevé d'un fichier qui a des variables
locales ne s'en sert pas.

Figma numérote les modes par fichier : le mode d'une bibliothèque peut porter
l'identifiant d'un mode local. Quand plusieurs collections déclarent le même
identifiant, la collection locale le garde, et chaque collection distante le
reçoit préfixé du sien. Un calque porte ses modes sous les identifiants de
Figma : la [vue composant](#vue-composant) leur applique ce renommage avant de
résoudre.

Figma ne signale pas les changements de variables sans charger toutes les
pages (`documentchange`). Le relevé se relit au geste « Actualiser » ; le pied
de la fenêtre affiche l'heure et le numéro du relevé. Après un échec, la
donnée précédente reste affichée et l'échec s'annonce.

Chaque demande de l'interface porte un numéro. Une réponse d'une demande
remplacée est ignorée ; une annulation ne publie aucun résultat partiel.

## Résolution

Un contexte choisit au plus un mode par famille, c'est-à-dire une collection
et ses extensions. Pour chaque étape de la chaîne :

1. un calque réel impose son mode explicite ou hérité, quand la résolution
   part d'un calque ;
2. sinon, le contexte donne le mode de la famille ;
3. sinon, la collection prend son `defaultModeId`, jamais sa première
   colonne.

Un mode d'une collection n'est jamais rapproché par son nom d'un mode d'une
autre collection. Un mode d'extension lit la surcharge de l'extension, puis
remonte au mode parent de la base.

Le contexte actif donne à chaque famille son mode par défaut. Une colonne de
la table impose son mode à sa famille ; les autres familles suivent le
contexte actif.

Le résultat est l'un des états suivants, chacun avec les étapes connues :

| État | Sens |
|---|---|
| `resolu` | La chaîne aboutit à une valeur du type de la variable de départ |
| `inaccessible` | Un alias vise une variable que le relevé n'a pu ni lire ni importer |
| `mode-absent` | Une variable n'a aucune valeur pour le mode retenu |
| `cycle` | Le chemin revient sur un couple variable–mode déjà parcouru |
| `type-incompatible` | Un alias vise un autre type, ou une valeur n'a pas le type déclaré |
| `non-pris-en-charge` | Une valeur que le plugin ne sait pas évaluer ; sa donnée source reste lisible |
| `interrompu` | La chaîne dépasse 10 000 étapes ; elle n'est pas déclarée cyclique |

Deux branches qui atteignent la même cible ne forment pas un cycle. Zéro,
`false`, la chaîne vide et l'alpha sont des valeurs comme les autres.

Un alias de couleur peut porter une opacité, que Figma range sous la forme
`{ color: <alias>, opacity }`, de 0 à 1. L'opacité multiplie l'alpha de la
couleur terminale ; plusieurs opacités sur une chaîne se multiplient. La
cellule et la chaîne affichent l'opacité à côté de la cible. Borne : la règle
de multiplication n'a pas été comparée à Figma sur une cible déjà
transparente ; la marque d'écart de la [vue composant](#vue-composant) donne
la valeur que Figma rend. Une forme voisine, clé en plus ou opacité hors de 0 à 1, reste
« non prise en charge ».

### Copier

Dans la vue composant, un clic sur la valeur d'une chaîne dépliée copie la
valeur affichée. Un refus du presse-papiers laisse le texte dans une zone
sélectionnable. Le succès ne s'annonce qu'après une copie réussie.

## Vue composant

Le designer sélectionne un composant dans Figma. La vue affiche ce composant
et ses tokens, un composant à la fois, et suit la sélection. Elle indexe le
relevé des seules variables atteintes depuis ce composant : elle ne dépend pas
du relevé du fichier, et fonctionne dans un fichier sans variable locale.

| Sujet | Règle |
|---|---|
| Sujet lu | Le calque sélectionné s'il est `COMPONENT`, `INSTANCE` ou `COMPONENT_SET`, sinon son plus proche ancêtre de l'un de ces types. Hors de tout composant, la vue invite à en sélectionner un |
| Sélection multiple | Le premier calque décide du sujet ; le pied compte les autres |
| Jeu de variants | La lecture porte sur `defaultVariant`. Un variant prend le nom de son jeu. Après une analyse, la section Variants relit un autre variant : une puce choisit celui qui garde le plus de valeurs du variant affiché. Le variant affiché peut servir de modèle : ses liaisons se proposent aux autres variants, sans rien écrire avant Appliquer |
| Frontière | Toute `INSTANCE` strictement sous le sujet, une icône comprise. Ses calques ne sont pas parcourus : la vue nomme le composant, compte ses instances et l'ouvre au clic |
| Surcharge du parent | Une liaison que le parent pose dans une instance frontière se lit sur le calque que `InstanceNode.overrides` désigne, pour les seuls champs surchargés. Elle se rattache au calque de l'instance ; le relevé de l'analyse garde aussi le calque intérieur qu'elle peint (`surcharge`), qui donne le rôle attendu et reçoit la correction |
| Ligne | Une par couple variable et chaîne de modes. Deux calques qui portent la même variable sous deux modes donnent deux lignes ; `×N` compte les calques |
| Style de texte | Un calque de texte qui porte un style donne une ligne par style. Les variables du style ne font pas de liaison du calque |
| Nature | Couleur, forme, espacement, taille, texte, d'après la propriété liée ; toute autre propriété va dans « Autre » |
| Portée | Un calque sélectionné sous le sujet déjà lu restreint la vue à ce calque et à ses descendants, sans relecture |
| Valeur sans token | Peinture unie visible, rayon, épaisseur d'un contour visible, écart et marges d'un auto-layout, taille d'un texte sans style, quand aucune variable ne lie la propriété |
| Panneau des constats | Une analyse porte son identité (jeu, génération) ; l'interface ignore un message d'une autre identité. Après une écriture, un changement du jeu analysé (un Ctrl+Z en est un) ou la sélection d'un autre jeu, l'analyse est périmée : le panneau garde ses constats et attend Actualiser ou Analyser. Une analyse partielle, annulée ou arrêtée ne conclut jamais « aucun constat ». Un clic sur une carte sélectionne ses layers dans Figma, seul geste du plugin qui change la sélection |

Au-delà de 12 lignes dans la portée, chaque section s'ouvre repliée sur un
résumé : une pastille par couleur, les valeurs distinctes des nombres, les
noms des styles.

**Variables.** Une variable liée à un calque se lit par
`getVariableByIdAsync` et ne s'importe jamais. Les cibles de ses alias suivent
la règle de la section [Lecture](#lecture). Une variable que Figma ne rend pas
donne une ligne dont la chaîne s'arrête sur sa cause, sans valeur.

**Modes.** Chaque ligne se résout avec les modes du calque qui la porte,
explicites ou hérités. Un style de texte se résout avec ceux du premier calque
qui le porte.

**Écart avec Figma.** Le sandbox joint à chaque liaison la valeur de
`resolveForConsumer` sur son calque. Quand elle diffère de celle de la chaîne,
la ligne garde la valeur de la chaîne et porte une marque ; dépliée, elle
donne les deux. Une chaîne qui n'aboutit pas ne produit aucun écart.

**Volume.** Les calques se lisent par lots de 400, avec une pause entre deux
lots, et une nouvelle sélection annule la lecture en cours. Au-delà de 2 000
calques, la lecture s'arrête et le pied compte les calques non lus.

**Aperçu.** L'image du sujet s'exporte par `exportAsync`, large de 720 px au
plus, et arrive après la liste. Le survol d'une ligne entoure ses calques :
leur boîte vient d'`absoluteBoundingBox`, rapportée à `absoluteRenderBounds`
du sujet. Sans image, la zone disparaît ; sans boîte, le calque n'a pas de
cadre.

Aucune de ces lectures n'a été essayée dans Figma. La
[recette](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md)
les reprend une à une.

## Analyse et corrections

Analyser lit le relevé du jeu de variants et le catalogue de référence : la
library choisie dans la Configuration, sinon les variables du fichier. Le
moteur de l'exporteur (`analyserLeComposant` du socle) et les contrôles de
`@ucm-kit/core/controles` jugent ce relevé. Leurs constats prennent un type
de l'échelle commune (`TypeDAlerte` du kit). Une seule opération court à la
fois, analyse ou écriture : une seconde demande reçoit `occupe`, sauf quand l'opération
en cours est une analyse déjà périmée : son calcul est annulé et la nouvelle demande est servie.

Une analyse crée un seul contexte coopératif (`creerContexteCooperatif` du
socle) : horloge, pause, budget de 25 ms et jeton d'annulation. Le relevé, le
moteur, les contrôles du kit et le calcul des corrections le reçoivent et
cèdent la main entre deux étapes. Le parcours des enfants d'un variant, le
décompte des layers du budget, les lectures de layers, de peintures et de leurs
liaisons, de surcharges, de plages de texte, de modes, de propriétés et de
valeurs de variant cèdent aussi. Les contrôles et les corrections du kit sont
des générateurs ; `calculerParEtapes` enchaîne leurs étapes jusqu'à ce que le
budget soit écoulé, puis cède. L'annulation se relit juste après la pause. Le
seuil se vérifie entre unités de travail : les appels Figma, l'énumération des
clés d'un objet et une étape du kit peuvent le dépasser. Le moteur seul ouvre
la portée de mémoire.

Chaque demande crée aussi ses inventaires (`creerInventairesDeLaDemande` du
socle) et les passe au catalogue, au moteur et à la lecture des règles. Le local
est la liste des collections et des variables du fichier : le catalogue du
fichier et le moteur la lisent une fois pour eux deux. Les règles sont le scan
de la page par `extractRules` : le moteur le lit, la lecture des règles le
reprend. Les libraries sont le résultat de `lireLesLibraries`, lancé avec le
relevé puis repris par le catalogue. Un refus se partage comme un succès. Les
inventaires portent aussi la mémoire de ressources de la demande
(`MemoireDeRessources`) : le relevé, les dépendances et le moteur y lisent
chaque variable, collection, style et maître par identifiant une seule fois, le
premier lecteur faisant l'appel, et `decrireLeMaitre` y lit les noms d'une page
une fois par page. Les imports du catalogue peuvent rendre lisible une variable que le relevé a vue refusée : le catalogue fini, la mémoire efface ces refus et le moteur relit chaque identifiant une fois. Le relevé précède les dépendances, qui précèdent le moteur :
la copie que le moteur reprend date du relevé de la même demande. Les
inventaires s'oublient avec la demande : « Analyser », « Actualiser » et une
analyse après une correction relisent le fichier. Le compteur
`inventairesReutilises` compte les lectures reprises. Les requêtes
indépendantes que l'analyse lance depuis une liste connue (collections de
library, identifiants d'une vague d'alias, modes des collections importées) ne
dépassent pas `REQUETES_EN_VOL`, soit huit en vol. Les lectures que le parcours
du moteur lance nœud par nœud ne passent pas par cette borne.

L'analyse annonce le relevé, puis le catalogue, puis les contrôles du kit. Elle
lance la lecture des libraries avec le relevé, car elle n'en dépend pas : le
catalogue attend ce qui reste de cette lecture, puis choisit la library d'après
les liaisons du relevé. Le jeton et le budget de l'analyse s'appliquent aux
deux lectures ; une annulation ou un arrêt avant le catalogue arrête celle des
libraries, et une erreur de sa part garde le repli sur les variables du
fichier. Dans la trace de mesure, la phase `libraries` donne la durée totale de
la lecture, et l'étape `catalogue-attente-libraries` ce qui en restait après le
relevé : leur différence est la part de la lecture qui a couru pendant le
relevé.

La lecture des libraries commence plus tôt encore : la vue Composant la lance
quand elle lit un composant d'un fichier qui n'est pas hors UCM. Une seule
lecture court à la fois ; elle a son jeton et sa coopération, hors de toute
portée d'analyse, et une sélection qui la suit de moins de 60 s ne la relance
pas. Au clic sur Analyser, une lecture encore en cours s'attend. Une lecture
finie se vérifie : l'analyse relit les collections, leurs variables, leurs clés,
leurs noms et leurs types, et reprend la lecture anticipée si cette liste est
identique, sinon la nouvelle liste, qui remplace l'ancienne. Cette vérification
court dans la lecture que l'analyse lance avec le relevé : elle ne le précède
pas, et le catalogue n'en reçoit la liste qu'une fois la vérification finie. Les
valeurs des variables se chargent toujours au clic. Le changement de page, une erreur de
l'anticipation ou une lecture illisible l'abandonnent sans message : le clic
lit alors seul. Les compteurs `librariesAnticipeesReprises` et
`librariesAnticipeesRelues` disent ce que le clic a fait, et
`msVerificationDesLibraries` la durée de la relecture de vérification. Le bouton
du mode Composant envoie `intention: 'analyser'`, y compris quand il se lit
Actualiser une fois le composant analysé : la reprise validée reste ainsi le
geste ordinaire. Seul Maj+clic sur Actualiser envoie `intention: 'actualiser'`,
que l'infobulle annonce. Une demande sans intention vaut Analyser.
Actualiser abandonne la lecture anticipée et lit seul ; Analyser la reprend.
`reutilisationPermise` (`sandbox/analyse.ts`) est le seul point où une mémoire
entre demandes se branche. Figma ne publie ni version, ni date, ni événement de
library ; la vérification de la liste est le seul contrôle de fraîcheur, et une
valeur republiée sans changement de nom, de clé ni de type n'y paraît pas.
Viennent ensuite la lecture des
ignorés, puis `analyse-provisoire` : les constats des contrôles du
kit, sans correction ni question, et les identifiants ignorés. Elle lit
ensuite les dépendances du moteur, lance le moteur, lit les règles, propose les
corrections et envoie `analyse`. Une demande Analyser reprend à la place le
résultat du moteur de l'analyse complète précédente du même jeu quand
`validerLEntree` l'accepte : relevé, catalogue, dépendances et règles relus
égaux à ceux retenus, chaque instance ayant un maître local suivi du journal et sans instance propre, et chaque style se lisant par identifiant. Le message final range les constats comme avant : contrôles du kit,
règles, moteur. Une annulation pendant le catalogue ou les contrôles du kit
n'envoie aucun provisoire et ne lit pas le moteur. `analyse-provisoire` n'est
pas un statut de `analyse` : seul `analyse` termine la demande. Seul un final
`complete` ou `partielle` retient les corrections : avant lui, le sandbox
refuse les réponses, Ignorer, la propagation, la préparation et les
corrections. L'interface tient le même verrou : elle n'envoie aucune de ces
demandes et désactive leurs cases et boutons ; replier et déplier restent
permis. Au passage au final, les identifiants des constats, le défilement et les
sections ouvertes ou fermées par le designer se conservent.

Une correction ne se propose que si elle est exacte : une règle écrite donne
un seul candidat. Sinon le constat devient une question, sans candidat choisi
d'avance ; la réponse du designer produit la correction. Un constat sans
correction, ou dont la question n'a aucun candidat, va dans À faire dans
Figma, avec sa phrase et son geste. Le plugin ne calcule aucune correction
dans l'interface.

Le catalogue d'une library ne lit que `components`, `theme` et `layout`. Les
valeurs s'importent à la demande, puis les cibles de leurs alias, jusqu'aux
primitives. Les variables liées au composant s'importent toujours. Les tokens de taille de
`components` s'importent en plus, pour les seules propriétés qu'une valeur en dur
met en jeu, afin que C29 trouve un token exact. Les valeurs de `layout` ne
s'importent pas pour C29, qui ne les propose jamais.
Une cible hors de ces collections se lit par son identifiant, sinon par sa clé,
et entre au catalogue avec sa collection et ses modes. Si `components` reste
illisible, ou si un token du composant dont la propriété sert le champ n'est pas
chargé, C29 le dit (`faits.recherche = 'incomplete'`) au lieu de conclure.

Sans token exact, C29 pose une question proche (`faits.proche = 1`) quand un
token de `components` du composant, pour la propriété du champ, a une valeur, la même dans tous les modes, qui diffère de
la valeur lue d'au plus `min(2, 0,1 × max(|v|, 1))` px. Elle propose au plus la
plus proche en dessous et la plus proche au-dessus, jamais pour une valeur 0.
Un token proche change le rendu : ce n'est pas une correction, rien n'est coché,
et la question montre l'écart de chaque candidat. Les questions identiques de
plusieurs variants se montrent en une carte, qui envoie une réponse par
question.

Avant d'écrire une liaison, le sandbox relit le layer, les valeurs du variant,
la liaison du champ et la peinture que l'analyse a lus. Une correction de C29
porte aussi la valeur lue (`aRelire.valeur`) : si le champ en a une autre, elle
saute en `fait-faux`. Un écart saute la
correction avec un motif (`objet-change`, `fait-faux`, `cible-introuvable`,
`erreur`), et les autres s'écrivent. L'écriture périme l'analyse.

Le contraste se mesure sur la paire que le kit tire du relevé, dans chaque
mode, contre le seuil du niveau AA ou AAA de la Configuration. Le rapport
s'affiche sans arrondi. Un fond ou une peinture que le plugin ne sait pas
lire donne une limite, jamais un verdict.

## Préparation

Une préparation propose les variables `components` qu'un composant devrait
porter, avec leur cible dans `theme` ou `layout`. Elle part du relevé, du
catalogue et des réponses du designer. Le fichier des composants et celui des
tokens sont deux fichiers : la préparation passe de l'un à l'autre par
`figma.clientStorage` du poste, ou par un texte copié.

| Étape | Fichier | Ce qui se passe |
|---|---|---|
| Préparer | Composants | Les questions (dossier d'une valeur de style, intensité, nom d'un élément, icône, choix entre plusieurs tokens de même valeur) se tranchent ; Préparer reste inactif tant qu'une question reste. Une taille sans token de `layout` qui la vaille exactement, ou une couleur dont aucun token du thème n'est la cible, ne pose pas de question : elle reste en dur (`sansCible`, `couleursSansCible`) et la feuille le dit. Une question de nom sans candidat (layer au nom par défaut) se répond par une saisie |
| Ranger | Composants | La préparation se range sous `CLE_DES_PREPARATIONS`, ou se copie en texte |
| Créer | Tokens | Seules les variables manquantes de `components` se créent, par le journal de structure |
| Lier | Composants | Les variables publiées reviennent au composant en corrections de liaison |

La destination est la collection `components` locale que la déclaration UCM
reconnaît. Sans `theme` local, la création est refusée (`sans-cibles`). Deux
collections candidates posent une question.

Chaque variable préparée a un état : `a-creer`, `existe-identique`,
`existe-divergente`, `creee` ou `echec`. L'état se lit dans le fichier au
moment de créer, jamais dans un essai précédent. Une création interrompue se
reprend sans doublon. Une variable existante qui vise une autre cible reste
telle quelle, sauf réponse du designer.

Le texte échangé est un JSON de `format` `ucm-preparation`. Il se juge dans
l'ordre : format, puis version (une version supérieure est refusée
`future`), puis chaque champ. Les règles de nommage que le mode Composant
prépare passent par le même texte et arrivent dans Questions du mode Tokens.

Le retour au composant n'a lieu que pour le jeu de variants qui a préparé :
`source.jeu.cle` doit égaler la clé du sujet analysé (`autre-composant`
sinon), et seulement après une tentative de création dans le fichier des
tokens : une préparation dont aucune variable n'a quitté `a-creer` ne propose
rien. Une variable créée mais pas encore publiée laisse sa ligne sans case.

Bornes : un fichier qui ne garde pas le journal ne peut pas annuler ses
créations. Le plugin ne voit pas les usages d'une variable créée dans
d'autres fichiers : l'annulation peut supprimer une variable qu'un autre
fichier emploie.

## Modules sans écran

Le profil d'architecture UCM (`src/integrations/profilUcm.ts`) et la lecture
de la recette d'UCM Palettes (`src/integrations/palettes.ts`) restent dans le
code, avec leurs tests, sans écran ni préférence pour les activer. Ce qui suit
décrit leurs règles.

**Recette UCM Palettes.** Le texte rangé sous `ucm_palettes/recette` se
classe par `classerRecette` d'`ucm-couleur`, sans migration. La recette ne
dit pas quelle variable porte quel cran : le designer associe une variable
de couleur à une palette, une intensité, un thème et un cran. Aucune
association ne se déduit d'une teinte ou d'une égalité de couleurs.
`variablesDeLAssociation` rend alors les variables de `theme` que la table en dossiers
confie à ce cran (`variablesDuCran`, `@ucm-kit/core/emplois`), dans le sens du
thème associé, normal ou inversé selon `texteDesBoutons` de la recette. Le
neutre ajoute `page/foreground-main`, `page/foreground-subtle`, `scale/0`,
`scale/1000` et `disabled/*`. Un cran qu'aucune variable ne vise, comme 50,
400 ou 950, ne liste rien.

**Profil UCM.** Les sept couches et leurs cibles suivent l'architecture
multimarque. Pour les couleurs contrôlées ici, `components` vise `theme` ; `theme`
vise `brands` ou `utility` ; `brands`, `utility`,
`layout` et `typography` visent `primitives` ; `primitives` ne vise rien. Le
profil ne juge que les variables de couleur : les variables de `layout` et de
`typography` qui ne sont pas des couleurs ne sont pas contrôlées. Une association rangée sous
`brand`, `color-brands`, `color-utilities` ou `layouts` se lit sous le nouveau
nom (`brands`, `utility`, `layout`) ; une couche `usage`, disparue, se lit sans
couche. Le profil contrôle quatre règles, en information :

| Règle | Écart relevé |
|---|---|
| `couche` | Un alias vise une couche que sa couche ne peut pas viser |
| `valeur-directe` | Une couleur hors de `primitives` n'est pas un alias |
| `portee` | Une variable de `primitives`, `brands` ou `utility` porte une portée ; une variable de dossier de `theme` n'a pas les portées de sa ligne de la table |
| `nuance` | Une variable de dossier de `theme` ne vise pas, dans un mode `light` ou `dark`, le cran que la table donne dans le sens de ce mode |

Les variables de dossier (`solid/default`, `surface/border`, `ring`),
leurs crans et leurs portées viennent de `@ucm-kit/core/emplois` ; le sens du
mode vient de `texteDesBoutons` dans la recette associée. `scale/0`,
`scale/1000`, `elevation/*` ne visent aucun cran et ne se jugent pas par
nuance ; les deux premières ne portent aucune portée. Une collection sans
couche n'est pas contrôlée, et le designer peut ignorer un écart pour ce
fichier.

Le profil annonce aussi les contrôles impossibles, avec une cause et la
variable concernée : rôle de `theme` inconnu, mode non reconnu, valeur absente
dans un mode ou cible dont la collection n'a pas de couche. Une limite n'est
pas un écart et ne disparaît pas avec une exception du designer.

## Interface

L'interface est en français et toujours sombre. Les modes Light, Dark ou
Jour des données ne changent que les valeurs et les pastilles. Le relevé
conserve l'espace colorimétrique du document (`srgb` ou `display-p3`) ; un
relevé ancien sans espace se lit en sRGB. Hexadécimal affiché, pastilles et
couleurs de la vue composant ramènent Display P3 en sRGB.

La fenêtre a deux dispositions, une par mode. La barre du haut porte le
produit et la bascule « Tokens » / « Composant », présente dans les deux. Le
sandbox choisit la disposition d'ouverture avant d'afficher la fenêtre : étroite
quand la sélection a un composant pour sujet, large sinon. La bascule demande l'autre
disposition ; le sandbox donne alors à la fenêtre la taille rangée pour elle.
Chacune range sa taille sous sa propre clé.

| Disposition | Mode | Ouverture | Minimum | Contenu sous la barre |
|---|---|---|---|---|
| Large | Tokens | 1360 × 800 | 560 × 480 | Arbre, table et barre latérale de 640 px : onglets Corrections, Questions, À faire dans Figma et Règles ; la fiche d'une variable s'ouvre en feuille sur la barre ; Actualiser dans la barre du haut |
| Étroite | Composant | 520 × 760, 1040 × 760 panneau ouvert | 320 × 420 | La vue composant, sous une barre de 44 px ; le panneau des constats à droite, sommaire d'éléments et sections |

La recherche est dans l'arbre, sous son titre, et porte sur toutes les
collections. Le centre ne montre que la table.

Dans la disposition large, sous 1100 px de large, le panneau latéral passe sous
l'arbre et la table, sur toute la largeur. Le dessin suit la
[maquette d'UCM Architect](../../docs/notes/Recherches/UCM%20Architect/2%20Maquettes/MAQUETTE-ARCHITECT.html) ;
`npm run fidelite --workspace ucm-architect-plugin` mesure l'écart, cadre par
cadre (`galerie/cadres.json`).

Une cellule de la table tient sur une ligne. Une valeur directe s'affiche
seule. Un alias s'affiche en bouton, avec la pastille de la couleur qu'il
rend, suivi de la valeur rendue ou du statut de la chaîne.

Une poignée règle la largeur de l'arbre et celle de chaque colonne de la
table : à la souris, ou par les flèches Gauche et Droite, 16 px par appui. Un
double clic rend la largeur par défaut.

| Largeur | Défaut | Bornes | Durée |
|---|---|---|---|
| Arbre | 220 px | 140 à 480 px, et 40 % de la fenêtre au plus | Préférences |
| Colonne du nom | 240 px | 120 à 640 px | Préférences |
| Colonne du type | 84 px | 60 à 200 px | Préférences |
| Colonne de valeur | 220 px, plus la place libre | 120 à 800 px | Jusqu'à la fermeture du plugin |

La largeur d'une colonne de valeur ne se range pas : un identifiant de mode
se répète d'un fichier à l'autre.
