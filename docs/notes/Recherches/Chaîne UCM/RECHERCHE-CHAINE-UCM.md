# Chaîne UCM

Cette recherche prépare l'entrée de la visualisation de la chaîne UCM dans l'inventaire généré, piste P29. La maquette validée vit hors de Git, dans `_local/presentation-po/maquette-v16.html` (766 lignes). Elle porte en dur ses données (`ZONES`, `LEGENDES`, `NOEUDS`, `LIENS`, `KIT`, `MARQUES`, `GARANTIES`, `SCENARIOS`), son rendu, son tracé A* et ses interactions. Les numéros de ligne « L » de ce document renvoient à cette maquette.

Le plan d'implémentation est [PLAN-CHAINE-UCM.md](./PLAN-CHAINE-UCM.md).

## 1. Les écarts entre la maquette et le dépôt

Chaque élément de la maquette a été confronté aux sources. Les écarts sont classés par gravité : un écart grave affirme ce que le dépôt contredit, un écart moyen omet ou déforme un fait, un écart léger touche un mot.

| N | Élément de la maquette | Ce que dit la source | Gravité | Correction proposée |
|---|---|---|---|---|
| E1 | Carte UCM Implementer, type « Module · compilateur et IA », liste « Compile tout ce que le contrat fixe », « Retient ses réponses pour les composants suivants », pièces « Compilateur », « Mise à jour automatique », « Serveur MCP » (L304 à L310) | Le résumé de P8 (`pistes.json`, piste à la ligne 941) fait écrire le composant par un agent qui corrige jusqu'au rapport vide du linter et du vérificateur, « au lieu du compilateur des lots 0 à 6 ». La revue (`docs/notes/Recherches/Optimisation Tokens/review/review-plan-codex-astra.md`, lignes 78 à 82) renvoie le compilateur de coques à une décision ultérieure, et juge la mémoire mutualisée sans volume qui justifie sa construction (ligne 71). Le serveur MCP appartient à P13 (`pistes.json`, ligne 1040) et le plan de l'implémenteur lui donne un rôle facultatif (`PLAN-IMPLEMENTEUR.md`, ligne 754). | grave | La carte décrit la boucle de P8 : l'agent écrit le composant depuis `ucm guide`, lance le linter et le vérificateur, corrige jusqu'au rapport vide. Le serveur MCP sort des pièces, ou devient une pièce liée à P13. Question Q1. |
| E2 | Verdict « Garanti » des jauges « Design et code identiques » et « Aucun écart en production » en chaîne complète (L407 à L413, L710), et le sous-titre « Le design et le code restent identiques » (L212) | `VALIDATIONS-MVP.md` lignes 257 et 258 : les limites non vérifiables sont documentées sans être présentées comme des garanties. Lignes 85 à 87 : une donnée visuelle recopiée dans une règle de code peut échapper à l'analyse statique. Le résumé de P20 : le vérificateur ne voit pas le survol, le focus et l'appui. | grave | Le verdict plein devient « Couvert », et le sous-titre dit ce que la chaîne fait : « Le contrat dit ce que Figma dessine, et la CI compare le code à ce contrat à chaque pull request. » Question Q2. |
| E3 | Légende de la zone CI : « Rien n'entre dans le repository sans passer ici. » (L265) | `VALIDATIONS-MVP.md` ligne 62 : une pull request rouge reste fusionnable. `docs/guides/POUR-LES-DESIGNERS.md` ligne 271 : un envoi direct sur `main` est jugé après coup. | grave | « Chaque pull request passe ici. » La note « Verrou de fusion » porte déjà la suite. |
| E4 | Zone « Repository GitHub » (L260) | `VALIDATIONS-MVP.md` ligne 45 : le plugin publie sur GitHub et sur gitlab.com, et `ucm init` écrit la CI de chaque forge. | moyenne | Titre « Repository », complément « GitHub ou GitLab ». |
| E5 | Palettes : « Les 9 paires texte-fond tiennent le contraste WCAG AA, 4,5:1 pour un texte, 3:1 pour une bordure. » (L270) | `packages/kit/src/emplois/garanties.ts` lignes 25 à 35 : 5 garanties de texte à 4,5:1, et 4 garanties d'élément graphique à 3:1 (fond d'un bouton plein, bordure de surface, bordure de page, anneau de focus ou icône sur surface pressée). | moyenne | « Les 9 garanties de contraste tiennent WCAG AA : 4,5:1 pour un texte, 3:1 pour un fond de bouton, une bordure ou un anneau de focus. » Le 9 vient du kit. |
| E6 | Lecture « Les paquets » : aucun trait du kit vers `ucm-couleur` ni vers `plugin-socle` (L387 à L402) | `packages/couleur/package.json` ligne 18 et `packages/plugin-socle/package.json` ligne 15 déclarent `@ucm-kit/core`. Le moteur importe `emplois`, `protocoles` et `referentiel`, le socle `format`, `referentiel`, `controles`, `nommage` et `protocoles`. | moyenne | Les deux traits se calculent depuis les `package.json`. |
| E7 | Puces du kit reçues par chaque outil (L388 à L397) | Les imports de `@ucm-kit/core/<porte>` dans chaque `packages/*/src/` donnent : l'Exporter importe aussi `controles` et `lecteurs` ; la CLI n'importe pas `emplois` ; Palettes n'importe pas `emplois` (le moteur le fait pour lui) ; l'adaptateur importe `format`, `lecteurs`, `modules` et `referentiel`. `docs/guides/MODULES.md` lignes 20 à 23 : un module consommateur importe `@ucm-kit/core/modules` et aucune autre porte, donc le linter reçoit `modules` seul. | moyenne | Les puces se calculent depuis les imports, par une table qui range chaque porte du kit sous une puce (section 3). |
| E8 | Zone du kit : « 6 paquets que les outils installent » (L263) | Cinq des six cartes existent. `@ucm-kit/implementer` n'est pas créé et son nom attend la décision 10 de `PLAN-IMPLEMENTEUR.md` (section 10.1). `ucm-couleur` et `ucm-plugin-socle` sont privés (`"private": true`) : le build des plugins les embarque, personne ne les installe. | moyenne | « 5 paquets, et 1 à venir. Une règle changée dans un paquet change dans tous les outils. » Les deux nombres se calculent. |
| E9 | Les deux modes d'Architect visent l'architecture et les composants (L273 à L276) | `packages/plugin-architect/README.md` lignes 69, 158, 159 et 175 : Architect crée des variables dans `theme`, `brands` et `utility`, et lie les layers d'un composant. `packages/kit/src/referentiel/produits.ts` lignes 103 à 107 ne déclare pour Architect que l'écriture des noms. | moyenne | La maquette a raison et `produits.ts` est incomplet : Architect écrit aussi `variables` et `composants` dans le document Figma. Lot 4 du plan. |
| E10 | Vérificateur de rendu : « Ajoute ses écarts au rapport du Contrôle UCM, qui bloque la fusion. » (L338) | P20 attend la réponse « blocage ou période d'observation » (`pistes.json`, champ `coutHumain` de la piste à la ligne 835). | moyenne | « Ajoute ses écarts au rapport du Contrôle UCM. » Le blocage suivra la décision de P20. |
| E11 | Carte Composants : « Une règle d'usage par propriété, posée à côté du composant. » (L288), sans trait depuis l'Exporter | `produits.ts` ligne 66 : l'Exporter écrit `regles-usage` dans le document Figma ; `docs/inventaire/gabarit.html` ligne 133 : « Créer les règles d'usage » pose l'instance `.componentRules`, seul geste qui écrit dans Figma. | moyenne | « L'Exporter pose une règle d'usage à remplir par propriété, à côté du composant. » |
| E12 | La section 3 actuelle montre une étape « Variables à la main » (`gabarit.html` lignes 218 à 225) : le designer pose `brands`, `utility`, `layout` et `typography`, et aucun outil n'écrit `layout` ni `typography` | La maquette n'a pas cette étape. Remplacer la section 3 perdrait ce fait. | moyenne | Une ligne de la liste « ce qu'il fait » de la carte Architecture : « Le designer pose à la main les tailles et la typographie : aucun outil n'écrit `layout` ni `typography`. » |
| E13 | Nom « UCM Contract Exporter » (L289) | `produits.ts` ligne 63 nomme le produit « UCM Exporter », comme `SUJETS_DES_PLUGINS` (`docs/inventaire/releves.ts`, ligne 1002). L'inventaire et `CONCEPT.md` ligne 90 écrivent « UCM Contract Exporter ». | légère | Un seul nom par produit. Question Q3. |
| E14 | Palettes : « Light et Dark calculés ensemble depuis une seule teinte. » (L270) | `gabarit.html` ligne 83 : Palettes lit une couleur de référence par palette, pas une teinte seule. | légère | « depuis une couleur de référence ». |
| E15 | Santé des composants : « Conforme, en retard ou en écart » (L343) | Le résumé de P24 nomme quatre états : conforme, en retard, écart, non analysé. | légère | Ajouter « non analysé ». |
| E16 | Architecture « Disponible » (L278) | `VALIDATIONS-MVP.md` ligne 49 : l'architecture cible n'est pas encore déployée dans les exports des deux consommateurs. | légère | L'étiquette reste juste pour le kit. Aucune correction, sauf décision contraire à Q2. |

Les éléments suivants concordent avec les sources : les versions publiées (kit 0.18.1, CLI 0.4.2, adaptateur 0.3.2), les 7 collections, les 24 variables du thème, les 360 teintes (`packages/couleur/tests/ancrageDeplace.test.ts`, ligne 125), les 23 Mo de TypeScript, les commandes `ucm deroger`, `ucm tokens css` et `ucm guide`, l'absence d'`ucm diff` (P11), la skill `ucm-implementer` qu'écrit `ucm init` (`packages/cli/src/init.mjs`), la sortie Style Dictionary et le choix des collections (P23), la story par variante (P9), le verrou de fusion (P17), le juge du linter livré par P6 et son module ESLint attendu de P26, le refus d'un code TypeScript sans adaptateur (`POUR-LES-DESIGNERS.md` lignes 243 à 246), et les blocages de la CLI (même document, lignes 196 à 203).

Trois écarts sortent de la maquette et se signalent sans correction ici. `packages/kit/README.md` ligne 172 annonce « seven contrast guarantees » alors que `GARANTIES` en compte 9. La section 3 actuelle de l'inventaire écrit « Un token absent ou un écart du code avertit » (`gabarit.html` ligne 254), alors que `POUR-LES-DESIGNERS.md` lignes 202 et 203 les fait bloquer : la section disparaît avec P29. Les noms et les logos des produits vivent dans trois listes, `PRODUITS` de `docs/inventaire/page.js` (ligne 625), `logosDesOutils` de `releves.ts` (ligne 649) et `PRODUITS` de `docs/marque/generer-marque.mjs` (ligne 122).

## 2. L'idée de calculer les traits depuis ce que lit et écrit chaque brique

`produits.ts` déclare pour chacun des 8 produits ce qu'il lit (`lit`) et ce qu'il écrit (`ecrit`, avec la destination). L'idée : un trait relie l'écrivain d'une donnée à ses lecteurs.

Le calcul a été appliqué aux 26 traits du flux (22 entrées de `LIENS` et 4 traits d'outil tirés des modes). Il suppose trois choses : chaque carte de fichier ou de dessin porte sa donnée (`tokens.json` porte `tokens-dtcg`, Contrats `contrats`, Code `implementation`, Architecture `variables`, Composants `composants`), une donnée écrite vers `repository` passe par la carte de la porte (la CLI), et un module déclare ses propres `lit` et `ecrit`.

| Résultat | Traits |
|---|---|
| Retrouvés (17) | palettes, architecture ; architecture, composants ; architecture, exporter ; composants, exporter ; exporter, cli ; cli vers tokens.json, Contrats et Code ; contrat vers storybook, developpement, implementer ; code, storybook ; tokens.json, developpement ; cli, sante ; rendu, sante ; cli, verrou ; storybook, rendu |
| Absents du calcul (9) | developpement, adaptateur (la règle de la porte donne developpement, cli) ; linter, developpement (aide dans l'éditeur) ; adaptateur, cli (appel dans le même processus) ; rendu, cli (la CLI ne déclare pas lire de rapport) ; storybook, sante (la page est hébergée par le Storybook) ; les 4 traits d'outil, tant que `produits.ts` ne déclare pas qu'Architect écrit variables et composants, et parce qu'Implementer « vers » adaptateur décrit un passage par la CI |
| Ajoutés par le calcul, absents du dessin (au moins 12) | contrat, adaptateur ; code, adaptateur ; contrat, linter ; tokens.json, linter ; code, linter ; architecture, palettes ; architecture, architect ; composants, architect ; adaptateur vers sante et vers verrou (rapports) ; rendu, verrou ; exporter, composants (règles d'usage) |

**Conclusion.** Le calcul est juste pour les données qui transitent par le repository. Il est faux comme source unique des traits, pour deux raisons. Le dessin montre le chemin d'un changement (Figma, pull request, porte, repository, lecteurs), et `lit` décrit chaque lecture : la maquette omet volontairement des lectures réelles, comme celle du contrat par l'adaptateur. Trois traits décrivent une autre relation qu'une donnée lue (hébergement, appel dans le processus, aide dans l'éditeur). Distinguer ces relations demanderait d'ajouter la source de chaque lecture, ce qui revient à déclarer le trait.

La décision retenue : un trait se déclare dans l'entrée de la brique qui le reçoit (`recoit`), avec la donnée qu'il porte. La teinte se calcule depuis cette donnée, et un test refuse un trait dont la source n'écrit pas la donnée ou dont la cible ne la lit pas, d'après `PRODUITS` pour un produit et d'après l'entrée du registre pour un module. Les traits de la lecture « Les paquets » se calculent, eux, depuis les `package.json` et les imports (section 3).

## 3. L'inventaire des données de la maquette

Chaque donnée est calculée depuis une source exacte, ou déclarée à un seul endroit et gardée par un test. Le registre désigne `docs/inventaire/chaine/briques.ts` (section 4). Les tests vivent dans `tests/chaine.test.ts`, à créer.

| Donnée | Classe | Source ou domicile | Test qui la garde |
|---|---|---|---|
| Version d'un paquet publié (« npm · 0.18.1 ») | calculée | `version` de `packages/<dossier>/package.json`, par `versions()` de `releves.ts` | fraîcheur de la page ; aucune version écrite dans le registre |
| « Paquet privé » | calculée | `private` de `packages/<dossier>/package.json` | idem |
| « Plugin Figma » | calculée | `execution: 'figma'` de `PRODUITS` | idem |
| « · Community » de l'Exporter | déclarée | registre, champ `type` | contrôle du style |
| État d'une carte (Disponible, En partie, À venir) | calculée | produit présent dans les workspaces ; piste terminée selon `roadmap()` ; pour une carte à pièces, l'état de ses pièces | une carte sans produit ni piste est refusée ; une piste inconnue est refusée ; une piste terminée sans preuve est refusée |
| État d'une pièce | calculée | sa preuve dans le code (commande de `commandes()`, nom exporté par une porte du kit, fichier que `ucm init` écrit), ou sa piste | une preuve absente du code est refusée |
| Scénario « Aujourd'hui » (`auj`) | calculée | une carte est active quand son état est « Disponible » | le champ `auj` est refusé dans le registre |
| Scénarios « Sans UCM » et « Chaîne complète » | calculée | aucune carte, toutes les cartes | aucun |
| Dépendances d'une carte (`deps`) | calculée | `dependencies` des `package.json`, et les traits `recoit` marqués `requis` | le champ `deps` est refusé dans le registre |
| Paquets affichés sur une carte du flux (`MARQUES`) | calculée pour un produit, déclarée pour un module ou un geste | `dependencies` du `package.json` du produit ; champ `paquets` de l'entrée | un paquet cité doit être une carte de paquet |
| Traits de la lecture « Les paquets » (`KIT`) | calculée | `dependencies`, couple outil et paquet d'un même produit, règle « un module reçoit la porte `modules` », champ `paquets` | identité avec le calcul |
| Puces d'un trait du kit | calculée | imports de `@ucm-kit/core/<porte>` dans `packages/<dossier>/src/`, rangés par `PUCES_DU_KIT` | chaque porte de `exports` du kit appartient à une seule puce |
| Libellés des 5 puces et leur table de portes | déclarée | registre, `PUCES_DU_KIT` | idem |
| Nombre de paquets de la zone du kit | calculée | nombre de cartes de paquet, livrées et à venir | aucun nombre dans le registre hors des trous |
| « 7 collections », « 24 tokens du thème », « 9 garanties », seuils 4,5:1 et 3:1, « trois plugins » | calculée | trous `{{collections:nombre}}`, `{{theme:variables}}`, `{{garanties:nombre}}` déjà remplis par `generer-inventaire.ts`, et trous nouveaux pour les seuils (`SEUILS_PAR_USAGE`) et le nombre de produits Figma | un nombre écrit à la main dans un texte du registre est refusé, sauf ceux de `NOMBRES_ECRITS` |
| « 360 teintes » | déclarée | `NOMBRES_ECRITS`, avec sa source `packages/couleur/tests/ancrageDeplace.test.ts` | le test vérifie que la source contient le nombre |
| « 23 Mo » de TypeScript | déclarée | `NOMBRES_ECRITS` ; la carte de l'adaptateur de la section 2 lit le même trou | idem ; la taille de `node_modules` dépend de l'installation, donc elle ne se mesure pas à la génération |
| Logo d'une carte de produit | calculée | une seule table produit et fichier de logo, sortie de `logosDesOutils`, SVG mis en ligne par `svgDeMarque` | la page ne contient aucun `src=` |
| Pictogramme d'une carte | déclarée | registre, champ `picto`, parmi les noms du code de rendu | un nom inconnu est refusé |
| Nom, type, phrase, liste « ce qu'il fait », phrase « Sans », modes, couches, alternative, textes des fichiers et de la note | déclarée | registre | contrôle du style ; aucun nombre hors des trous |
| Collections d'une couche de l'architecture | déclarée | registre, champ `collections` de chaque couche | chaque identifiant existe dans `COLLECTIONS` du référentiel |
| Zones, légendes, positions des cartes, formes des traits | déclarée | registre, `ZONES`, `LEGENDES`, champs `x`, `y`, `forme` | chaque carte tient dans sa zone, largeur comprise |
| Traits du flux (`LIENS`) et leur rang secondaire | déclarée | registre, champ `recoit` de la carte cible | la source écrit la donnée et la cible la lit ; chaque `de` existe |
| Teinte d'un trait | calculée | donnée portée par le trait, par une table unique (`contrats`, `tokens-dtcg`, `implementation`, `rapports`, sinon neutre) | le champ `teinte` est refusé dans le registre |
| Cible d'un mode d'outil (`vers`) | déclarée | registre | la carte d'outil écrit la donnée de la cible |
| Jauges (`GARANTIES`) : nom et cartes qui la tiennent | déclarée | registre, `JAUGES` | chaque carte citée existe |
| Verdict d'une jauge | calculée | code de rendu actuel | aucun |
| Libellés des étiquettes (Disponible, En partie, À venir) | déclarée | code de rendu, constante `TAGS` | aucun |
| Titre et sous-titre | déclarée | gabarit de la page plein écran et intro de la section 3 | contrôle du style |

## 4. Le registre des briques

### Où il vit

Le registre vit dans l'inventaire, `docs/inventaire/chaine/briques.ts`, et pas dans `@ucm-kit/core`. Quatre raisons. Six cartes sur vingt-trois décrivent un module ou un paquet qui n'existe pas encore : les publier dans un paquet npm mettrait une promesse dans une API, et chaque changement de la Roadmap demanderait une version du kit. `docs/guides/MODULES.md` ligne 15 pose que le kit ne connaît ni Storybook, ni ESLint, ni un framework de rendu. Sept cartes ne sont pas des produits : le designer qui dessine, le développeur, trois fichiers du repository, le verrou, l'architecture. `packages/kit/tests/referentiel-definitions.test.ts` ligne 85 fixe les produits à 8.

`PRODUITS` reste l'autorité de ce qu'un produit lit et écrit. Une carte de produit nomme son produit (`produit: 'exporter'`) et ne recopie ni `lit`, ni `ecrit`, ni sa version. Quand un module devient un paquet du workspace, il entre dans `PRODUITS` et son entrée du registre remplace `piste`, `lit` et `ecrit` par `produit`.

### Sa forme

```ts
export interface Brique {
  id: string;
  genre: 'outil' | 'module' | 'paquet' | 'fichier' | 'geste' | 'note';
  zone: string;
  x: number;
  y: number;
  /** Un produit de PRODUITS, ou une piste de pistes.json : l'un des deux pour outil, module, paquet et note. */
  produit?: Produit['id'];
  piste?: string;
  /** Le rôle d'une carte de produit : l'outil dans la chaîne, ou le paquet dans la zone du kit. */
  role?: 'outil' | 'paquet';
  nom: string;
  type?: string;
  picto?: string;
  phrase: string;
  fait: string[];
  sans?: string;
  modes?: Record<string, { libelle: string; vers: string; phrase: string; fait: string[] }>;
  couches?: { libelle: string; detail: string; collections: string[] }[];
  alternative?: { nom: string; type: string; phrase: string; couches: { libelle: string; detail: string }[] };
  pieces?: { texte: string; piste?: string; preuve?: Preuve }[];
  /** Pour un module, un geste ou un fichier : ce qu'il lit et écrit. Un produit les tient de PRODUITS. */
  lit?: DonneeDeProduit[];
  ecrit?: DonneeDeProduit[];
  /** Pour une carte de fichier ou de dessin : la donnée qu'elle montre. */
  donnee?: DonneeDeProduit;
  recoit?: { de: string; donnee: DonneeDeProduit | 'aide' | 'hebergement'; forme?: Forme; secondaire?: true; requis?: true }[];
  /** Pour un module ou un geste : les paquets qu'il emploie. */
  paquets?: string[];
}
type Preuve = { commande: string } | { export: { porte: string; nom: string } } | { fichierDuConsommateur: string };
```

Le registre exporte aussi `ZONES`, `LEGENDES`, `JAUGES`, `PUCES_DU_KIT` et `NOMBRES_ECRITS`. Les données nouvelles `aide` et `hebergement` nomment les trois traits qui ne portent pas une donnée lue, et leur teinte est neutre.

### Ajouter un module

Une seule entrée du registre suffit. Exemple pour le diff sémantique de P11, s'il devenait une carte :

```ts
{
  id: 'diff', genre: 'module', piste: 'P11', zone: 'ci', x: 684, y: 400,
  nom: 'Diff sémantique', type: 'Commande de la CLI', picto: 'loupe',
  phrase: 'Dit ce qu’un export change, contrat par contrat.',
  fait: ['Compare deux révisions des contrats et des tokens.'],
  sans: 'Le relecteur compare deux fichiers JSON à l’œil.',
  lit: ['contrats', 'tokens-dtcg'], ecrit: ['rapports'],
  recoit: [{ de: 'contrat', donnee: 'contrats' }],
  paquets: ['cli'],
}
```

Le générateur calcule ensuite son état (« À venir » tant que P11 n'est pas terminée), sa place dans le scénario « Aujourd'hui », la teinte de son trait, ses dépendances et le trait du paquet `cli` dans la lecture « Les paquets ». Les tests refusent l'entrée si P11 n'existe pas, si la carte sort de sa zone, si le contrat n'écrit pas `contrats`, ou si un texte porte un nombre écrit à la main. Quand P11 sera terminée, le test demandera de remplacer la piste par une preuve, ici `{ commande: 'diff' }`.

## 5. L'intégration dans le générateur

### Les fichiers

| Fichier | Rôle |
|---|---|
| `docs/inventaire/chaine/briques.ts` | Le registre, données déclarées seulement |
| `docs/inventaire/chaine/calculs.ts` | Fonctions pures : états, scénarios, dépendances, marques, puces, teintes, nombres. Elles reçoivent les pistes, les produits, les `package.json` et les imports, donc les tests les éprouvent sur des registres fabriqués |
| `docs/inventaire/chaine/rendu.js` | Le script de la maquette sans ses données : tracé A*, écartement des traits, chevrons, survol, lectures, scénarios, jauges. Il expose `monterLaChaine(racine, donnees, reglage)` |
| `docs/inventaire/chaine/chaine.css` | Le style de la maquette, chaque règle sous la classe `.chaine` |
| `docs/inventaire/chaine/plein-ecran.html` | Le gabarit de la page plein écran |
| `CHAINE-UCM.html` | La page plein écran générée, à la racine à côté d'`INVENTAIRE-UCM.html`, publiée par GitHub Pages |

`generer-inventaire.ts` ajoute aux trous `js:CHAINE` (les données calculées), `chaine:js` et `chaine:css`, et exporte `genererChaine()`. Les deux pages reçoivent les mêmes données et le même code : la section 3 et la page plein écran ne peuvent pas diverger.

### Ce que la page de l'inventaire impose

`tests/inventaire.test.ts` exige une page autonome : aucun `src=`, aucun `<link>`, aucun `@import`. La maquette charge Inter depuis Google Fonts et ses logos par `<img src>`. Les logos passent en SVG en ligne, comme ceux de la section 2. La police tombe sur `system-ui`, déjà nommée en repli par la maquette ; c'est le seul changement visible du lot 1. La page plein écran suit la même règle, ce qui la rend lisible hors ligne pendant une présentation.

`page.css` emploie déjà les classes `bascule`, `tete`, `nom`, `logo`, `large`, `ouvert` et `verdict`. Le style de la chaîne se range donc sous `.chaine`, et ses identifiants (`page`, `scene`, `bilan`, `lectures`, `scenarios`, `liens`) prennent le préfixe `chaine-`. La maquette écoute les clics sur `document.body`, la touche Échap sur `document` et le redimensionnement de la fenêtre : `monterLaChaine` écoute sur sa racine, et le redimensionnement passe par un `ResizeObserver` de la racine.

`page.js` étiquette les noms de produits trouvés dans le texte (`HORS_ETIQUETTE`, ligne 633). `.chaine` entre dans la liste des exclusions, sans quoi les phrases des cartes recevraient des étiquettes.

La scène est dessinée pour 1 376 px. La colonne de l'inventaire mesure environ 980 px, donc la section l'affiche réduite à environ 68 %, sans étirement, avec un lien « Plein écran » vers `CHAINE-UCM.html`. Question Q4.

### Les sources, les vues et les tests

`sources.json` reçoit la clé `CHAINE-UCM.html` avec ses sources, et la clé de l'inventaire reçoit `docs/inventaire/chaine/**` et les `src/**` des quatre paquets de plugin (les imports y sont lus). `scripts/vues.mjs` ajoute la vue. `tests/inventaire.test.ts` change à trois endroits : la liste des clés de `sources.json`, la fraîcheur de la seconde page, et le refus des liens, qui admet `href="CHAINE-UCM.html"`. `scripts/ouvrir-inventaire.mjs` écrit les deux pages dans le dossier temporaire, sans quoi le lien du dossier temporaire mène à un fichier absent. `couverture.ts` ajoute l'univers « produits du kit » : chaque identifiant de `PRODUITS` est montré par une carte ou exclu avec sa raison.

## 6. Ce que deviennent les sections 2 et 3

La section 3, « Le parcours d'un composant », est remplacée par la chaîne. Son titre devient « La chaîne UCM » et son ancre `#chaine`. Le code des étapes (`page.js` lignes 301 à 321, `page.css` lignes 327 à 349 et 452 à 453, `gabarit.html` lignes 185 à 275) est supprimé. L'information de l'étape « Variables à la main » passe dans la carte Architecture (E12), et celle de l'étape « Rendu » est portée par la carte du vérificateur.

La section 2, « Les outils », garde le détail par outil. Trois changements la rattachent à la chaîne : l'étiquette « livré » de chaque fiche lit l'état calculé de la carte du même produit, chaque carte de produit de la chaîne mène à sa fiche, et les 23 Mo de TypeScript viennent du trou partagé.

La section 1 garde son flux en quatre étapes et sa liste « Ce qu'UCM ne fait pas encore » : la première définit le concept, la seconde nomme les pistes, et la chaîne les montre.

## Questions au mainteneur

1. Q1. La carte UCM Implementer suit-elle le résumé de P8 (un agent qui corrige jusqu'au rapport vide du linter et du vérificateur), ou le plan de l'implémenteur (compilateur, questions et mémoire) ? Le dépôt contient les deux, et la revue recommande la première voie.
2. Q2. Le verdict plein d'une jauge s'écrit-il « Garanti » ou « Couvert » ? Le sous-titre de la page dit-il « Le design et le code restent identiques » ? `VALIDATIONS-MVP.md` refuse de présenter une limite non vérifiable comme une garantie.
3. Q3. Le nom du produit d'export est-il « UCM Contract Exporter » ou « UCM Exporter » ? Le nom retenu s'écrit dans `produits.ts`, et la carte le lit.
4. Q4. Dans l'inventaire, la chaîne s'affiche-t-elle réduite dans la colonne du texte, avec le lien « Plein écran », ou sort-elle de la colonne pour prendre la largeur de la fenêtre ?
5. Q5. La porte `protocoles` du kit se range-t-elle sous la puce « Architecture des tokens », ou une sixième puce « Données partagées des plugins » la montre-t-elle ?
