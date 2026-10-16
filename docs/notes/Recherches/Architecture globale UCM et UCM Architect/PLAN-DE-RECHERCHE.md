# Plan de recherche de l'architecture globale UCM

> Pistes pour plus tard. La direction retenue est la [version minimale](./VERSION-MINIMALE.md) ;
> ce document n'y revient qu'en cas de manque constaté à l'usage.

**Statut :** plan. Chaque sujet prépare une ou plusieurs questions de
[ARCHITECTURE-GLOBALE-UCM.md](./ARCHITECTURE-GLOBALE-UCM.md), section 10.

Lecteur : le mainteneur, pour choisir les recherches à lancer et leur ordre ;
l'agent qui en mène une, pour savoir quoi relever et quand s'arrêter.

Chaque sujet suit la même forme :

- **Décision visée** : ce que la recherche permet de trancher.
- **Axes de recherche** : les sources à lire, sur le marché ou dans la
  documentation d'une API. Un agent `chercheur` en mène un par appel.
- **Données à relever** : des mesures sur les fichiers du corpus, par un
  script rangé dans ce dossier.
- **Comportements à observer** : des gestes dans Figma ou chez une équipe,
  qu'aucune documentation ne garantit.
- **Idées à éprouver** : des pistes à prototyper ou à comparer.
- **Fin de la recherche** : le livrable et ce qui permet de conclure.

## Le corpus

| Repère | Fichier | Contenu | Restriction |
|---|---|---|---|
| C1 | `UCM-Playground/src/tokens/tokens.json` | 760 feuilles, huit collections ; identique à celui d'`intencial-library` | Aucune |
| C2 | `Mesures/tokens-slice-exemple.json` | 2 415 feuilles, fichier multimarque d'un client, riche en défauts | Fichier client : ne pas le commiter, ne citer ni ses marques ni ses termes métier |
| C3 | Export du fichier Figma remappé du mainteneur, architecture `color-brands`, `color-utilities`, `theme` | La cible de l'architecture multimarque | À exporter de nouveau : aucune copie n'est dans le dépôt |
| C4 | Les quatre contrats du Playground (`Button`, `Alert`, `TileLink`, `StressTest`) | Contrats 13.0 | Aucune |
| C5 | Le fichier Figma du Playground | Variables, composants, styles de texte | Les gestes s'y font à la main, dans une copie |
| C6 | Un relevé de l'explorateur exporté depuis C5 | Les noms Figma avant normalisation, casse comprise | À produire avec le bouton « Exporter le relevé » |

Un relevé sur C1 seul ne suffit pas : C1 est petit et propre. Chaque mesure
tourne aussi sur C2, et sur C3 dès qu'il existe.

## R1. Le parcours du designer et le découpage en plugins

**Décision visée.** Le nombre de plugins et le rôle de chacun : trois, quatre
avec l'Architecte, ou un plugin unique à plusieurs espaces. Question 1 et 7.

**Axes de recherche.**

- Les suites de plugins d'un même éditeur sur la Figma Community : Tokens
  Studio, Supernova, Specify, Zeroheight, Font Awesome, Material Theme
  Builder. Nombre de plugins, ce que chacun écrit, comment ils partagent leurs
  données.
- Les limites d'un plugin unique : taille du bundle, temps d'ouverture,
  permissions du manifeste (`networkAccess`, `teamlibrary`), revue de la
  Community à chaque publication.
- Les mécanismes de partage entre plugins : `setSharedPluginData`, clés et
  espaces partagés, `clientStorage` propre à chaque plugin.

**Données à relever.**

- Les temps d'ouverture actuels des trois plugins et la taille de leur
  `ui.html` construit.
- Le nombre de lectures du document que chaque plugin fait au démarrage.

**Comportements à observer.**

- Un designer qui découvre UCM installe les plugins : combien en ouvre-t-il
  avant de comprendre lequel sert à quoi ? Noter les hésitations à voix
  haute.
- Un designer corrige un écart relevé dans un plugin : ouvre-t-il le bon
  plugin pour le corriger ?

**Idées à éprouver.**

- Un lanceur commun : le menu `Plugins` de chaque plugin propose d'ouvrir les
  autres, par leur nom.
- Un plugin unique dont chaque espace se charge à la demande.
- Une carte du parcours UCM en une page, de la palette au contrat, que chaque
  plugin affiche dans son aide.

**Fin de la recherche.** Un tableau des découpages possibles avec, pour
chacun, les gestes du designer sur les quatre parcours de la section 5 de la
proposition, et le coût de publication.

## R2. Le référentiel UCM

**Décision visée.** Le contenu du référentiel, sa forme et ses langues.
Question 4.

**Axes de recherche.**

- Les design systems qui publient leur vocabulaire comme des données :
  Adobe Spectrum (`fields/`, `rules.yaml`), Primer (`token-names`), Salesforce (styling hooks), Atlassian (`tokens` et métadonnées). Forme du fichier,
  outil qui le lit, page générée.
- Les métadonnées de DTCG : `$description`, `$extensions`, `$deprecated`, et
  ce que Style Dictionary et Terrazzo en font.
- La documentation générée depuis des données dans les design systems
  publics : qui écrit la définition, qui la relit.

**Données à relever.**

- L'inventaire exhaustif des définitions écrites dans le code des trois
  plugins, du kit et du CLI : chaque table, chaque liste de termes, chaque
  libellé destiné au designer. La section 2.1 de la proposition en donne une
  première liste.
- Les contradictions entre ces sources : un terme accepté ici, refusé
  ailleurs ; un libellé différent pour la même variable.
- Les termes que les textes des trois interfaces emploient pour un même
  concept (`textes.ts` de chaque plugin, catalogues de Palettes).

**Comportements à observer.**

- Un designer extérieur au projet lit la table des dossiers sans aide : quels
  termes comprend-il, lesquels confond-il ?

**Idées à éprouver.**

- Un sous-chemin `@ucm-kit/core/referentiel` et une page générée, sur le
  modèle du schéma JSON dérivé de `types.ts`.
- Une entrée de référentiel par concept : identifiant, libellé français et anglais,
  définition d'une phrase, exemple, termes refusés, lien vers la règle.
- Un glossaire commun aux trois plugins, que chaque interface affiche au
  survol d'un terme.

**Fin de la recherche.** Le schéma d'une entrée, la liste des entrées de la
première version, et le sort de chaque définition existante : reprise,
renommée ou abandonnée.

## R3. La nomenclature : moteur et règles

**Décision visée.** Les niveaux de règles retenus (forme, termes, grammaire),
la nomenclature par défaut et le traitement des synonymes. Questions 2 à 4 de
[RECHERCHE-NOMENCLATURE.md](./Recherches/Nomenclature%20initiale/RECHERCHE-NOMENCLATURE.md#8-questions-pour-le-mainteneur).

**Axes de recherche.**

- La concordance des termes entre design systems publics : pour chaque
  concept (erreur, avertissement, succès, état pressé, premier plan,
  bordure, tailles), le terme de Material, Carbon, Primer, Spectrum,
  Atlassian, Polaris, Fluent. Cette recherche a échoué une première fois
  faute de quota.
- La grammaire de chemin de chaque système : ordre des segments, segments
  obligatoires, vocabulaire fermé par position.
- La détection de synonymes par ressources embarquables : listes de
  synonymes, plongements de mots légers, et leur poids dans un plugin.

**Données à relever.**

- Sur C1, C2, C3 et C6 : la précision de chaque relevé de
  `rapprocher-termes.mjs`, jugée paire par paire, avec le nombre de vrais et
  de faux positifs.
- Le relevé par alias restreint à deux termes d'une même couche, une fois les
  collections associées à leurs couches.
- La casse réelle des noms Figma sur C6 : `fontSize`, `font-size` ou
  `fontsize`.
- La position de chaque terme dans le chemin, par collection : un terme qui
  change de position est un écart de grammaire.
- Le nombre de termes distincts par position : une position à vocabulaire
  fermé en compte peu.

**Comportements à observer.**

- Le mainteneur juge cinquante paires candidates : temps passé, paires
  hésitantes, paires où « même concept » dépend de la position.
- Deux designers nomment la même variable à partir d'une consigne écrite :
  leurs noms concordent-ils ?

**Idées à éprouver.**

- Une nomenclature à trois niveaux, chacun activable seul.
- Une règle de terme qui vise une position (`{état}`) plutôt qu'un mot,
  puisque `text` est une variante de bouton et, ailleurs, un rôle.
- Une liste `distincts` qui mémorise les refus du designer.
- Un modèle de langage en option, appelé seulement avec l'accord explicite du
  designer, pour proposer des paires ; aucune donnée ne part sans ce geste.

**Fin de la recherche.** Le format de la déclaration, la nomenclature par
défaut, et un tableau de précision par relevé sur trois corpus.

## R4. La déclaration du design system : stockage et publication

**Décision visée.** Où la nomenclature et l'association des collections aux
couches sont rangées, et comment elles atteignent la CI. Question 2.

**Axes de recherche.**

- Ce que Tokens Studio, Specify et Supernova rangent dans le document Figma
  et ce qu'ils rangent dans un dépôt ; le sens de la synchronisation.
- Les limites de `setSharedPluginData` : taille par clé, lecture depuis un
  fichier consommateur de la bibliothèque, comportement à la duplication du
  fichier et à la création d'une branche Figma.

**Données à relever.**

- La taille d'une déclaration réaliste pour C2 : termes, refus, grammaires,
  exceptions.
- La fréquence de modification attendue : comparer les relevés C6 successifs
  du Playground.

**Comportements à observer.**

- Dupliquer le fichier C5, puis créer une branche Figma : la donnée partagée
  suit-elle ? Une fusion de branche la conserve-t-elle ?
- Un développeur modifie la copie du dépôt à la main : le prochain export
  l'écrase. Le rapport de CI doit-il le signaler avant ?

**Idées à éprouver.**

- La déclaration publiée par l'exporteur avec `tokens.json`, dans un fichier
  séparé ou sous `$extensions` à la racine.
- Une empreinte de la déclaration dans `tokens.json`, pour que `ucm check`
  détecte une copie du dépôt qui ne correspond plus au document.
- Le sens inverse : la déclaration écrite dans le dépôt, que l'exporteur lit
  au test de connexion comme il lit `ucm.config.json`.

**Fin de la recherche.** Le lieu de stockage, le chemin publié et la règle de
conflit entre le document et le dépôt.

## R5. Le plugin d'architecture

**Décision visée.** Le périmètre de l'Architecte, ses gestes d'écriture et
son nom. Questions 1, 5 et 7.

**Axes de recherche.**

- Les plugins qui génèrent une architecture de collections à partir d'une
  palette : Material Theme Builder, Tokens Studio (thèmes), plugins de thème
  de Radix et d'Atlassian. Ce qu'ils écrivent, ce qu'ils gardent pour une
  régénération, comment ils traitent une variable modifiée à la main.
- L'API des variables : création d'alias entre collections, portées, `codeSyntax`,
  collections étendues, limites de volume par appel.

**Données à relever.**

- Sur C3 : le nombre de variables de `theme`, `color-brands` et
  `color-utilities` qu'une génération écrirait, et la part posée à la main
  qui diffère de la table du kit.
- Le temps d'écriture de mille alias dans Figma.

**Comportements à observer.**

- Comment le mainteneur a remappé C3 à la main : ordre des gestes, erreurs
  corrigées, temps passé. Ce relevé chiffre ce qu'une génération économise.
- Une variable générée puis modifiée à la main : une régénération doit-elle
  l'écraser, la garder ou la signaler ?

**Idées à éprouver.**

- Le rôle de chaque palette (primaire, secondaire, neutre, statut), déclaré
  dans l'Architecte ; la recette de Palettes reste inchangée.
- Une simulation avant écriture, sur le modèle de « Destination des tokens »
  de Palettes : ce qui serait créé, remplacé, laissé.
- Une marque de suivi sur chaque variable écrite, comme Palettes le fait,
  pour reconnaître une variable générée.

**Fin de la recherche.** La liste des gestes de l'Architecte avec, pour
chacun, ce qu'il lit, ce qu'il écrit et ce qu'il refuse.

## R6. Le bilan global du fichier

**Décision visée.** Le catalogue des contrôles du bilan, leur sévérité et
leur lieu.

**Axes de recherche.**

- Les linters de fichiers Figma : Design Lint, Roller, Figma « Check
  designs », linters de Tokens Studio et de Supernova. Contrôles proposés,
  présentation, exceptions.
- Les règles de Terrazzo (`required-children`, `required-modes`) et de
  Spectrum (`rules.yaml`) applicables aux variables.

**Données à relever.**

- Pour chaque contrôle candidat de SUITE.md (couches, modes dans les noms,
  colonnes de modes identiques, jumelles light et dark, valeurs nulles,
  `codeSyntax.WEB`, collisions de `normalizeName`, complétude de `theme`) :
  le nombre de constats sur C1, C2 et C3, et la part jugée utile.
- Le temps d'un bilan des variables sur C2, et celui d'un parcours de tous
  les composants d'un fichier de cent pages.

**Comportements à observer.**

- Le designer reçoit deux cents constats : lesquels traite-t-il d'abord,
  lesquels ignore-t-il ? Le regroupement par cause change-t-il cet ordre ?

**Idées à éprouver.**

- Un bilan par collection, qui renvoie à l'outil qui entretient chaque
  ensemble de données.
- Une note de santé par couche, sans score global.
- Les exceptions par fichier, reprises du profil actuel.

**Fin de la recherche.** Le catalogue, chaque contrôle avec son lieu (bilan,
exporteur, `ucm check`), sa sévérité et sa précision mesurée.

## R7. Le renommage et la migration des consommateurs

**Décision visée.** Si l'Architecte renomme, et comment le code suit.
Question 5 de RECHERCHE-NOMENCLATURE.md.

**Axes de recherche.**

- Les mécanismes de dépréciation : `removed.json` de Primer,
  `replaced_by` de Spectrum, cycle d'Atlassian et `eslint --fix`,
  `$deprecated` de DTCG.
- La [piste du diff sémantique](../Diff%20S%C3%A9mantique/PLAN-DIFF-SEMANTIQUE.md)
  et ce qu'elle prévoit pour un renommage.

**Données à relever.**

- Pour un renommage type (`press` en `pressed` sur C1) : le nombre de
  variables, de références dans les contrats, de variables CSS dans le
  Playground touchées.

**Comportements à observer.**

- Renommer dans C5 une variable liée à un calque et visée par un alias, puis
  relire `boundVariables` et l'alias, dans le fichier et dans un fichier
  consommateur de la bibliothèque.
- Publier la bibliothèque après le renommage : le fichier consommateur
  garde-t-il ses liaisons ?

**Idées à éprouver.**

- Une table de l'ancien nom vers le nouveau, publiée avec les tokens, que
  `ucm check` lit pour désigner les références à migrer.
- Une feuille CSS qui garde l'ancien nom en alias pendant une version.

**Fin de la recherche.** Le geste de renommage, la forme de la table et ce
que le consommateur reçoit.

## R8. La définition des crans et les descriptions

**Décision visée.** Qui écrit la description d'une variable, et où elle
arrive. Question 5.

**Axes de recherche.**

- L'affichage de `Variable.description` dans Figma : panneau des variables,
  sélecteur de variable, Dev Mode, Code Connect.
- Les design systems qui documentent le rôle d'un token dans sa
  description, et la longueur qu'ils emploient.

**Données à relever.**

- Sur C1, C2 et C3 : la part des variables qui portent déjà une description,
  et leur contenu.

**Comportements à observer.**

- Le designer choisit une couleur dans le sélecteur de variable : lit-il la
  description ? À quelle longueur la tronque-t-on ?
- Un agent implémente un composant avec et sans la définition des tokens
  cités : les erreurs de choix de token changent-elles ?

**Idées à éprouver.**

- Une description générée, marquée pour se distinguer d'une description
  écrite par le designer.
- `$description` publié dans `tokens.json`, puis une section « Sens des
  tokens cités » dans `ucm guide`.

**Fin de la recherche.** Le texte type d'une description de variable de
`theme`, sa source et son chemin jusqu'à l'agent.

## R9. Le retrait de l'onglet Intégrations

**Décision prise :** l'onglet est retiré. Cette recherche prépare le
retrait.

**Données à relever.**

- Les fichiers, tests et préférences rangées que l'onglet emploie :
  `src/integrations/`, `ui/vues/integrations.ts`, clés de `clientStorage`,
  textes, cas de galerie.
- Ce que perd un designer qui l'emploie aujourd'hui, fonction par fonction.

**Comportements à observer.**

- L'aperçu « ce que l'export des tokens va changer » dans l'exporteur :
  combien de temps prend la lecture du `tokens.json` du dépôt sur C2 ?

**Fin de la recherche.** L'ordre du retrait et ce qui le remplace à chaque
étape, pour la question 3.

## R10. Les icônes

**Décision visée.** La source du jeu d'icônes et les contrôles d'UCM.
Question 8.

**Axes de recherche.**

- Les essais listés en section 7.2 de la proposition : appel de
  `api.fontawesome.com` depuis un plugin, noms de calques du plugin officiel,
  sortie de `fa kit show`.
- Les bibliothèques d'icônes en composants Figma générées depuis un jeu :
  Carbon, Material Symbols, Atlassian. Ce qui les régénère.
- Code Connect pour les icônes : ce qu'il relie et ce qu'il contrôle.

**Données à relever.**

- Dans C5 : le nombre d'icônes, leur forme (composant, instance, vecteur,
  cadre), leurs noms, et ceux que C4 cite en `figmaName`.
- La part des noms de C4 présents dans le Kit du Playground.

**Comportements à observer.**

- Ajouter une icône au Kit, puis compter les gestes pour la rendre
  disponible dans Figma et dans le code.

**Idées à éprouver.**

- Une liste du jeu générée dans le dépôt, lue par `ucm icons` et l'Architecte.
- Une bibliothèque Figma d'icônes en composants, générée depuis le Kit, et
  une règle du bilan qui refuse un vecteur posé hors de cette bibliothèque.

**Fin de la recherche.** La source du jeu, le format de la liste et les
trois contrôles avec leur lieu.

## R11. La typographie

**Décision visée.** La place de la typographie dans le référentiel et le
bilan, et l'intérêt d'un générateur d'échelle.

**Axes de recherche.**

- Les échelles typographiques des design systems publics : Material 3,
  Carbon, Primer, Atlassian. Noms, nombre de niveaux, tailles responsives.
- Les générateurs d'échelle : échelles modulaires, Utopia, plugins Figma de
  typographie. Ce qu'ils écrivent en variables et en styles.
- Le format composite `typography` de DTCG et ce que l'export UCM en fait.

**Données à relever.**

- Dans C5 : les styles de texte, leurs propriétés liées ou non à une
  variable, les calques de texte des composants sans style.
- Dans C1 et C2 : les collections typographiques, leur grammaire et leurs
  modes.

**Comportements à observer.**

- Un designer change la taille d'un niveau : combien de styles et de
  variables touche-t-il ?

**Idées à éprouver.**

- Les trois constats de la section 9 de la proposition.
- Un générateur d'échelle sur le modèle de Palettes, avec ses garanties :
  hauteur de ligne minimale, écart entre deux niveaux.

**Fin de la recherche.** Les entrées typographiques du référentiel, les
constats du bilan, et une recommandation sur le générateur.

## R12. Les règles de construction des composants

**Décision visée.** Les règles UCM d'un composant, celles que l'exporteur
contrôle et celles que le bilan contrôle.

**Axes de recherche.**

- Les conventions de tokens de composant des design systems publics :
  présence d'une couche composant, grammaire, part des propriétés liées.

**Données à relever.**

- Dans C5 : pour chaque composant, la part des propriétés liées à une
  variable, et la part de ces variables prises dans `components` plutôt
  qu'ailleurs.
- Dans C1 : les grammaires de `components` par composant (section 3.2 de
  RECHERCHE-NOMENCLATURE.md, quatre formes pour quatre composants).

**Comportements à observer.**

- Un designer crée un composant neuf en suivant la règle « une variable par
  propriété, dans `components` » : nombre de variables créées, temps passé,
  propriétés oubliées.

**Idées à éprouver.**

- Un geste de l'Architecte qui crée la branche `components/{composant}` d'un
  composant sélectionné, à partir des propriétés que l'exporteur relève.

**Fin de la recherche.** Les règles du référentiel pour un composant, et le
lieu de chacune.

## R13. Ce que les agents lisent

**Décision visée.** Le chemin de chaque définition jusqu'à un agent qui
implémente ou modifie un composant.

**Axes de recherche.**

- Les serveurs MCP de design systems et de Figma : ce qu'ils exposent des
  tokens et des définitions.
- La [piste 4.2 des évolutions globales](../Evolutions%20globales/PISTES-EVOLUTION.md#42-fournir-une-méthode-de-lecture-ou-une-interface-mcp).

**Données à relever.**

- Sur les reconstructions à froid déjà menées : les erreurs de choix de
  token et la définition qui les aurait évitées.

**Idées à éprouver.**

- `ucm guide` enrichi du sens des tokens cités et des termes du référentiel.
- Une commande `ucm referentiel <terme>`.

**Fin de la recherche.** La liste de ce que `ucm guide` imprime en plus, et
la mesure sur une reconstruction à froid.

## Ordre proposé

L'ordre suit la [revue](./REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md), section 11.2 : il éprouve d'abord le
travail d'une équipe, puis formalise les données que ce travail justifie.

| Ordre | Recherche | Preuve recherchée | Sujets du plan |
|---|---|---|---|
| 1 | Un changement réel de composant, de Figma jusqu'à son adoption dans le code | Les désaccords, les informations perdues, les reprises manuelles | Pistes, section 15 ; R7, R13 |
| 2 | La reprise limitée d'un existant (C2) et la création selon le profil (bibliothèque Intencial) | Le temps de déclaration et le premier résultat utile | R1, R3, R5 |
| 3 | Le bilan sur quelques causes connues, avec des différences voulues | La compréhension des constats et les actions utiles | R6 |
| 4 | La génération puis l'entretien de `theme` | Le travail évité, les choix restants, le sort des modifications manuelles | R5 |
| 5 | Un renommage à publication différée ou refusée | La continuité des usages et la reprise d'une proposition | R7 |
| 6 | La comparaison des découpages en produits sur ces parcours | Les changements d'outil sans valeur | R1 |

La clarification des définitions déjà employées (R2) avance pendant ces
essais. Un catalogue exhaustif, une nomenclature complète et un générateur
universel attendent les résultats qui justifient leur contenu.

Chaque essai relève aussi le travail demandé : temps jusqu'au premier
changement accepté, temps de déclaration et d'entretien, part des constats
suivis d'une action utile, erreurs connues non retrouvées, changements d'outil
et ressaisies, choix correct d'un token par un nouvel arrivant.

Les axes de recherche documentaire se confient chacun à un agent `chercheur`,
deux à la fois au plus. Les données se relèvent par des scripts rangés dans
ce dossier. Les comportements à observer demandent le mainteneur ou un
designer dans Figma.
