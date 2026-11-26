# Recreation des composants

Piste P30. Le designer reconçoit dans Figma, en architecture UCM, tous les composants de la bibliothèque React de production du client, puis exporte leurs contrats dans intencial-library, où le code se reconstruit depuis eux. Cette recherche décrit une méthode qui automatise chaque relevé et chaque contrôle, et laisse au designer seulement les décisions de dessin. Le [plan](./PLAN-P30.md) en découle, et la [carte du workflow](./CARTE-DU-WORKFLOW.md) liste chaque point à réfléchir.

## 1. Règle de confidentialité

UCM-Toolkit est public. Aucune donnée du client n'entre dans un fichier suivi par Git : ni nom de composant métier, ni nom de marque, ni valeur de couleur, ni extrait de code, ni capture. Les relevés, planches et cahiers par composant vivent dans `_local/recreation-composants/`. Les scripts du relevé, du banc et du contrôle sont génériques et vivent dans le dépôt. La règle reprend celle du plan de P28.

## 2. Ce que la bibliothèque source impose

Relevé sur la branche par défaut de la bibliothèque source. Les chiffres détaillés et les noms sont dans `_local/recreation-composants/PLAN-ET-QUESTIONS.md`.

| Mesure | Valeur |
|---|---|
| Composants exportés | 34 |
| Dossiers de composants | 59 avec du code, dont 32 avec un fichier de stories |
| Couleurs hexadécimales en dur dans les composants | 539 occurrences, 119 valeurs distinctes |
| Lectures distinctes des couleurs du thème | 65 |
| Fichiers qui importent Ant Design 6 | 69 |
| Interpolations dynamiques de styled-components | 455 |
| Marques | 9 |
| Icônes FontAwesome Pro 7 | 96 noms, en 4 styles |
| Applications consommatrices | 2 |
| Versions sources employées | la v1, figée, sur sa propre branche, importée par l'application principale dans plus de fichiers que la v2 ; la v2, version actuelle, qui n'a mis à jour qu'une partie des composants |

Trois faits fixent la méthode.

- La vérité visuelle est dans le rendu, pas dans le thème : la plupart des valeurs dessinées sont écrites en dur. Le relevé lit donc les styles calculés dans un navigateur, en plus du code.
- Le nouveau code n'emploie plus Ant Design. Tout ce qu'antd dessine (menu déroulant, infobulle, liste d'un champ de sélection, fenêtre modale, calendrier) devient du dessin à faire, et le banc doit ouvrir ces calques pour les capturer.
- Les stories couvrent un dossier sur deux. Le banc génère les combinaisons et les états lui-même.

## 3. Décisions du mainteneur

| Question | Décision |
|---|---|
| Identique ou reconçu | Chaque composant est reconçu, le plus près possible de l'existant en tout point, avec les valeurs UCM. Le contrôle bloquant porte sur la couverture fonctionnelle ; la comparaison des rendus sert de référence au designer et ne bloque pas. |
| Ant Design | Le nouveau code ne l'emploie plus. L'API des composants change donc, et une table relie l'ancienne API à la nouvelle. |
| Marques | Les 9 marques deviennent des modes de l'axe des marques, calculés d'abord par UCM Palettes, avant tout composant. |
| Installation de la bibliothèque source | Possible : le banc de rendu tourne en local. |
| Pièces internes | P22 est livrée avant le passage en masse : sans elle, un composant à pièce interne perd des variantes dans son contrat. |
| Pilote | Tag, Button et Alert. |
| Données du client | Elles restent toutes en local, dans `_local/recreation-composants/`. |
| Ce qui ne doit pas se perdre | Aucune variante, aucun axe, aucun comportement, générique ou spécifique, que l'application emploie réellement. Le relevé des usages dans les applications consommatrices fixe donc le périmètre de chaque composant, et il est possible. |
| Versions sources | Tous les composants employés de la v1 et de la v2 passent directement en v3, le travail de P30. |
| Périmètre | Les composants métier deviennent des composants UCM. Les graphiques et les tables entrent dans UCM ; la forme de leur contrat se propose quand le premier se dessine. |
| Référence de l'existant | Le rendu du code. La library Figma actuelle du mainteneur couvre une grande partie des composants : elle se relève comme seconde source, mais chaque composant se redessine de zéro. |
| Fichiers Figma | Les tokens et les composants vivent dans deux fichiers dès le début : la publication de la library reste un geste du designer. |
| Icônes | FontAwesome Pro reste. Les icônes deviennent des composants qu'`Icon` échange, créés et tenus à jour par la piste P32. |
| Outillage | De simples scripts dans UCM-Toolkit, une commande par étape, testés sur des composants inventés, supprimés quand la piste s'archive ; ni paquet publié ni documentation de produit. |
| Migration des applications | Les développeurs feront probablement la migration des applications. Le chantier leur prépare toute l'infrastructure qui la rend facile, de façon méthodique et complète. |
| Candidats et suivi | Le mainteneur tranche la liste des candidats. Une page de registre, mise à jour au fil du chantier, montre chaque composant et chaque candidat avec toutes ses informations et son avancement. |
| Relevé de la library Figma actuelle | Par un petit plugin de relevé que le mainteneur lance, comme pour P28. |
| Comportements | Seul un comportement qui change le rendu entre dans le dessin et dans le contrat. Un comportement sans effet visuel n'est pas recréé dans Figma ; le relevé du code l'écrit dans un fichier de comportements, à côté du contrat dans intencial-library. |

## 4. Méthode

Chaque étape écrit un fichier que la suivante lit.

1. Un script relève le code de chaque composant : props, types résolus, unions de littéraux, valeurs par défaut, `children` et props de type `ReactNode`, styles conditionnels rattachés à la prop ou à l'état qui les déclenche, valeurs dessinées avec fichier et ligne, icônes et leur style, composants posés, gestionnaires d'événements, état interne, attributs ARIA, animations, textes par défaut. Une valeur que le script ne sait pas lire devient une question dans la fiche.
2. Un relevé des applications consommatrices compte chaque composant, prop et valeur employés. Il sépare les variantes vivantes des variantes mortes. Il cherche aussi les composants écrits en dur dans les applications, candidats à entrer dans la bibliothèque : chaque composant d'Ant Design importé directement, chaque composant local ou `styled` employé dans plusieurs fichiers, et chaque structure JSX recopiée d'un fichier à l'autre ([jscpd](https://github.com/kucherenko/jscpd) détecte les clones).
3. Un relevé de la library Figma actuelle donne ses jeux de variants, axes, valeurs et propriétés. L'écart avec le relevé du code signale ce que le code a et que le dessin n'a pas, et l'inverse.
4. Un banc génère des stories qui croisent chaque valeur d'union, chaque booléen, chaque état forcé et chaque marque, ouvre les calques qu'antd dessinait, capture chaque combinaison et relève les styles calculés de chaque calque visible.
5. Chaque valeur relevée reçoit la valeur UCM la plus proche, avec l'écart affiché. Les valeurs voisines sont groupées pour que le designer tranche chaque groupe une fois. Chaque prop et chaque état reçoit sa forme Figma : axe de variant, propriété booléenne, texte, échange d'instance, pièce interne, ou comportement de code seulement.
6. Un cahier court par composant dit ce qu'il faut dessiner et décider, une ligne par point, avec la planche du banc. Une liste de couverture l'accompagne : chaque ligne du relevé y devient « dessinée », « fusionnée avec » ou « abandonnée, parce que ». Le guide de composant à 15 sections a été rejeté comme trop long : le cahier n'en reprend pas la forme.
7. Le designer reconçoit le composant dans Figma, dans l'ordre du graphe de composition, des pièces vers les composés.
8. Un script compare le contrat exporté au relevé et à la liste de couverture. Une prop, une valeur, un état ou une icône du code source absent du contrat sans justification bloque.
9. Le code se reconstruit dans intencial-library depuis le contrat, avec la parité de l'adaptateur.

Le format de la fiche du relevé peut reprendre la forme du contrat UCM (props, variants, vues) : le contrôle de l'étape 8 devient alors une comparaison entre deux contrats. La lecture TypeScript de `packages/adapter-typescript/src/parite.mjs` relève déjà les props d'une interface et peut servir à l'étape 1.

## 5. Ce que disent les outils du marché

Aucun outil ne fait l'inventaire complet, et aucun ne convertit du React en component sets propres de bout en bout. Le pipeline publié le plus proche ([Pegasus](https://www.pegasusdesignsystem.com/blog/design-system-audit)) combine un inventaire manuel, un relevé d'usages et un balayage des valeurs en dur.

### Relever le code

| Outil | Ce qu'il donne | Limite |
|---|---|---|
| [react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript) | props, unions de littéraux en valeurs, défauts ; `propFilter` sépare les props héritées par leur fichier de déclaration | exports nommés seulement ; `children` omis s'il n'est pas documenté |
| [ts-morph](https://ts-morph.com/details/types) | tout type résolu par le compilateur | API de bas niveau, aucun format de sortie |
| [Manifest de Storybook 10](https://storybook.js.org/docs/ai/manifests) et [addon MCP](https://storybook.js.org/docs/ai/mcp/overview) | props, types, défauts, stories, par composant | seulement les composants qui ont une story ; schéma en preview ; lisible sur un Storybook construit |
| [storybook-addon-pseudo-states](https://github.com/storybookjs/storybook/tree/next/code/addons/pseudo-states) | force `:hover`, `:focus`, `:active` par réécriture des feuilles de style | ignore les styles par défaut du navigateur |
| Playwright et `getComputedStyle` | rendu et styles calculés de chaque calque | à écrire ; storycap ne gère pas Storybook 10 |
| [react-scanner](https://github.com/moroshko/react-scanner), [Omlet](https://github.com/zeplin/omlet) | chaque instance d'un composant dans une application, ses props et leurs valeurs littérales | une valeur calculée reste `(Identifier)` ; un `...spread` reste opaque |

Aucun outil ne relève les styles conditionnels de styled-components. Les matrices de combinaisons du marché sont abandonnées depuis l'API `storiesOf` de Storybook.

### Passer dans Figma

| Piste | Ce qu'elle produit | Limite |
|---|---|---|
| [Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/) | capture d'une page qui tourne, en calques plats | ni composant ni variable |
| [story.to.design](https://divriots.com/story.to.design/docs/import-defaults/) | une story devient une variant ; variables depuis les propriétés CSS | propriétés booléennes, texte et instance swap non documentées ; Storybook 10 non confirmé ; payant |
| [`use_figma`](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas), serveur MCP de Figma | un agent exécute l'API Plugin : composants, variants, propriétés, variables liées | beta ; siège Full ; résultat à relire |
| [Figma Console MCP](https://github.com/southleft/figma-console-mcp) | component set depuis une matrice d'axes, variables par lots | Figma Desktop et plugin pont |
| API Plugin directe | `addComponentProperty`, `setBoundVariable` | à écrire ; le générateur de composants d'UCM Architect le fait déjà pour ses tests |
| [Annotations Figma](https://developers.figma.com/docs/plugins/api/Annotation/) | spécification attachée au composant | aucun lien avec le code |

Comme le composant est reconçu, une capture du rendu actuel ne sert que de référence visuelle. [Bitovi](https://www.bitovi.com/blog/figma-just-opened-the-canvas-to-agents.-heres-what-actually-happens) obtient par agent des variants justes, mais des valeurs en dur tant que la consigne ne nomme pas les variables. [Vallaure](https://christinevallaure.substack.com/p/building-an-ai-ready-design-system) rappelle qu'une variant supprimée perd sa clé et détache ses instances. [Southleft](https://southleft.com/insights/design-systems/code-to-design-isnt-the-point-system-parity-is/) conclut que seule une comparaison de parité garde l'alignement, ce que fait l'étape 8.

Le [plugin Font Awesome](https://docs.fontawesome.com/desktop/add-icons/figma-plugin) insère des SVG sans composant. Des composants d'icônes se génèrent par script depuis les SVG du paquet npm Pro.

## Questions au mainteneur

Les numéros suivent ceux de la première série. Les questions tranchées sont dans la section 3.

### Périmètre

- Q5. Qui décide qu'un écart de dessin avec l'existant est voulu : le designer, le lead UX, le mainteneur ?
- Q10. Les 27 dossiers sans story sont-ils vivants ? Le relevé d'usages peut répondre.

### Tokens

- Q17. Les tokens de composant se nomment-ils par un script depuis le relevé, ou le designer les crée-t-il ?

### Sources

- Q53. Peut-on modifier la bibliothèque source pour l'outillage (manifest de Storybook, pseudo-états, stories générées), ou le relevé tourne-t-il sur une copie ?

### Exhaustivité

- Q26. Les animations se décrivent-elles dans Figma ou seulement par un token de durée et de courbe ?
- Q27. Le responsive se dessine-t-il en variants de taille, ou reste-t-il une règle de code ?
- Q29. Les textes par défaut et leur langue passent-ils dans le contrat comme valeurs de propriété texte ?

### Figma

- Q30. Le designer accepte-t-il qu'un script décline ses composants dans Figma ? Le designer dessine une variante de référence, puis le script la duplique sur chaque axe, nomme chaque variante selon la nomenclature, et lie chaque remplissage, contour et espacement au token de l'état. L'essai sur le Button du pilote mesure d'abord la part répétitive du travail (Q50).
- Q33. Dans quel fichier Figma : la bibliothèque UCM existante, ou un fichier de travail fusionné ensuite ?

### Méthode

- Q36. Le relevé est-il uniquement déterministe, ou un agent lit-il aussi chaque composant pour décrire les comportements que le script ne voit pas, chaque ligne marquée à confirmer ?
- Q37. La fiche du relevé prend-elle la forme du contrat UCM, pour que l'étape 8 compare deux contrats ?
- Q38. Cadence : un composant de bout en bout avant le suivant, ou chaque étape en lot sur tous les composants ?
- Q39. Un composant est terminé quand le contrôle de l'étape 8 passe et que le designer a coché la liste de couverture : critère accepté ?
- Q41. Y a-t-il une échéance, ou un ordre imposé par un écran à livrer ?
- Q42. Codex participe-t-il, et sur quelles étapes ?
- Q43. Où suit-on l'avancement par composant ? Un tableau dans UCM-Toolkit nommerait les composants du client : il vit dans `_local/` ou dans intencial-library.
- Q46. Ajoute-t-on à UCM Architect un contrôle qui lit la fiche du relevé et signale dans Figma, avant l'export, une variante manquante ?
- Q47. Le banc de rendu devient-il ensuite un test de non-régression dans intencial-library ?
- Q50. Lance-t-on, sur le Button du pilote, un essai qui chronomètre la part répétitive du travail dans Figma (dupliquer, nommer, lier les tokens) avant de décider Q30 ?
