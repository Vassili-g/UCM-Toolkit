# Construction des composants

Piste P31. Le designer dessine une variante d'un composant, et UCM Architect construit le reste : le jeu de variants, les variables du composant dans `components` et toutes les liaisons. Cette recherche part des gestes du designer, dit ce qu'Architect fait déjà et ce qui manque. Le [plan](./PLAN-P31.md) en découle.

## 1. Les gestes du designer aujourd'hui

Pour chaque composant, le designer fait cinq gestes à la main.

1. Il crée le composant dans le fichier des composants.
2. Il définit ses variantes, axe par axe.
3. Il crée le dossier du composant dans la collection `components` du fichier des tokens.
4. Pour chaque valeur de chaque axe, il fait viser à chaque variable le bon token de `theme` ou de `layout`.
5. Il revient au fichier des composants et lie chaque calque de chaque variante à sa variable de composant.

Les gestes 3 à 5 se répètent pour chaque combinaison d'axes : un Button à 6 types, 3 tailles et 5 états compte 90 variantes.

## 2. Ce qu'Architect fait déjà

La Préparation du mode Composant (`packages/plugin-architect/SPEC.md`, section « Préparation ») couvre les gestes 3 à 5 depuis ce que le designer a dessiné.

| Étape | Fichier | Ce qu'elle fait |
|---|---|---|
| Préparer | Composants | Le kit (`preparerLesTokens` de `packages/kit/src/controles/preparation.ts`) parcourt tous les variants, rattache chaque axe à un rôle ou à un état du référentiel, et propose pour chaque couleur et chaque taille une variable de `components` avec sa cible dans `theme` ou `layout`. Ce qu'il ne tranche pas devient une question. |
| Créer | Tokens | Seules les variables manquantes se créent, avec l'alias de chaque mode. |
| Lier | Composants | Les variables publiées reviennent au composant en corrections de liaison, à cocher. |

Un variant qui lie ses calques quand les autres gardent des valeurs en dur sert de modèle (C81) : Architect propose ses liaisons aux autres variants.

Trois bornes tiennent aujourd'hui.

- Une couleur qu'aucun token du thème ne vaut exactement, ou une taille qu'aucun token de `layout` ne vaut, reste en dur et la feuille le dit.
- Entre Créer et Lier, le designer publie la library des tokens à la main : l'API de Figma ne publie pas une library.
- Les gestes 1 et 2 ne sont pas couverts : Architect lit un jeu de variants, il n'en crée pas.

## 3. Ce qui manque

- M1. Créer le jeu de variants : axes, valeurs et nom de chaque variante selon la nomenclature du kit, à partir d'une variante dessinée et d'une liste d'axes.
- M2. Décliner la variante dessinée sur chaque valeur d'axe : recopier son dessin, puis faire viser à chaque variable la cible de sa valeur d'axe. La cible se déduit exactement quand le référentiel relie la valeur d'axe à un rôle ou à un état ; sinon c'est une question.
- M3. Enchaîner Préparer, Créer et Lier sur tout le jeu en un geste, avec la publication comme seule étape manuelle.
- M4. Mesurer ce que la Préparation laisse aujourd'hui sur un vrai composant : questions, valeurs restées en dur, noms qui diffèrent de ceux que le designer écrit à la main.

## 4. Ce qui reste au designer

Le dessin de la variante de référence, les réponses aux questions et la publication de la library. Le mainteneur garde les tokens et les composants dans deux fichiers dès le début : la publication entre Créer et Lier reste donc un geste du designer, et M3 s'arrête sur elle. Une variante qui diffère par sa structure (icône absente, autre mise en page) se retouche après la déclinaison.

## 5. Ce qu'apprend l'outil local de liaison des icônes

Le mainteneur emploie un plugin local, hors de Git, dans `_local/outils/relier-variantes/`. Dans un jeu de variants d'un fichier non UCM, il relie la couleur de chaque icône au token de sa variante. Il a servi sur des jeux réels de plusieurs dizaines de variantes. Trois de ses idées servent M2 et la note de conception (case 1.2 du plan).

- Le token voisin. Le plugin part du token déjà posé sur un autre calque de la variante, son fond par exemple, et remplace seulement le dernier mot : `…/on/default/background` donne `…/on/default/foreground`. Il ne lit aucun axe dans le nom. Il traverse donc le cas où le token écrit une valeur autrement que le variant (`on` pour `Active=True`), qui arrête la propagation d'un variant modèle (C81), et il ne suppose aucune nomenclature.
- Une question par emplacement. Chaque calque d'icône reçoit sa réponse une fois, parmi les derniers mots des tokens existants (`foreground`, `action`), puis elle vaut pour toutes les variantes. Le designer choisit le mot ; le plugin n'écrit que si le token visé existe une seule fois, ce qui garde la règle « aucune supposition de mapping ».
- Le résultat montré sur des variantes contrastées. Le plugin applique chaque règle à deux ou trois variantes aussi différentes que possible : une règle qui ignore un axe se voit d'un coup d'œil. Un nom construit qui laisse un axe hors du nom est signalé et replié.

Deux défauts de l'outil sont à corriger avant tout transfert. Un fond lié à un token commun (une couleur générique) donne le même token à des variantes qui devraient différer, sans le signaler. Deux calques de référence qui mènent à deux dossiers sont départagés par le nombre de variantes couvertes, sans que le designer le voie. L'outil choisit aussi les icônes par leur nom de calque ; Architect les reconnaît déjà mieux.

## Questions au mainteneur

- Q1. Le designer dessine-t-il une seule variante de référence, ou une par valeur d'un axe de structure (taille, présence d'une icône) ?
- Q2. La liste des axes et de leurs valeurs vient-elle du cahier de P30, lu par le plugin, ou se saisit-elle dans le plugin ?
- Q4. Relancer la construction sur un composant déjà construit : le plugin complète les variantes manquantes sans toucher aux autres, ou refuse ?
- Q5. Une variante que le designer a retouchée à la main après la déclinaison se protège-t-elle d'une nouvelle déclinaison ?
