# Comparateur du rendu au contrat

**Statut : recherches rendues (P10), quatre choix attendent le mainteneur au
§7.** Ce dossier reprend le bloc B (comparateur) et le bloc A
(conventions) de [PLAN-CONFORMITE-RENDU.md](../Linter%20Dev/PLAN-CONFORMITE-RENDU.md),
qui reste la note d'ensemble du rendu et sert aussi P20.

## 1. Le problème

`ucm check` compare le contrat, les tokens et le code sans jamais afficher le
composant. Il voit qu'un token existe et que le code le cite. Il ne voit pas
la couleur peinte, le padding obtenu, la police du libellé ni l'ordre des
slots. Un composant peut donc passer le CI et s'afficher faux.

Le mainteneur a décidé que la couleur, les dimensions, la typographie, la
structure et l'ordre rendus bloquent après comparaison au contrat (décision
`rendu-controle-par-le-verificateur` de `decisions.json`). P10 écrit la pièce
qui rend cette décision applicable : la fonction qui compare un rendu observé
au contrat. P20 la branchera dans le CI, et P9 fournira les stories à observer.

## 2. Pourquoi un code conforme peut mal s'afficher

`ucm check` vérifie aujourd'hui trois choses : chaque prop du contrat existe
dans le code, chaque token du contrat existe dans `tokens.json`, et chaque
token cité par le code existe. Il
ne vérifie pas qu'une combinaison donnée affiche la valeur que le contrat lui
donne. Le code est de la logique (conditions, classes, cascade CSS), et seul
son affichage dit quelle valeur gagne.

Quatre exemples passent `ucm check` et s'affichent faux :

1. La classe `.sm` cite `var(--components-button-sizes-medium-padding)`. Le
   token existe, mais le Size=sm reçoit le padding du Size=md.
2. Le libellé écrit `font-weight: 500` en dur à côté de ses tokens. Rien ne
   cite de token inconnu.
3. Une feuille globale de l'application écrase le `gap` du bouton.
4. `flex-direction: row-reverse` place l'icône après le libellé, alors que le
   contrat la place avant.

Le comparateur affiche chaque combinaison et dit, par exemple : « Size=sm,
slot `label` : padding 12px, le contrat attend
`{components.button.sizes.small.padding}`, soit 8px ».

## 3. Pourquoi Chromatic ne suffit pas

Chromatic compare une capture à la dernière capture acceptée par un humain. Il
répond à la question « le rendu a-t-il changé depuis la dernière
validation ? ».

| Situation | Chromatic | Comparateur |
|---|---|---|
| Premier rendu d'un nouveau composant | Aucune référence. Un humain compare à Figma à l'œil | Juge chaque combinaison contre le contrat, sans humain |
| Le designer réexporte le contrat | Toutes les captures changent, un humain revoit chacune | Recalcule l'attendu depuis le nouveau contrat |
| Un agent écrit le composant | Le rendu reste à valider à l'œil | L'agent lit l'écart et le corrige seul |
| Message d'un écart | « 312 pixels diffèrent » | Le slot, la propriété, la valeur et le token attendus |
| Régression après validation | Détectée | Détectée si elle touche une valeur du contrat |

Les deux se complètent. La décision `rendu-valide-devient-reference` prévoit
déjà la capture validée par le designer. Elle appartient à P20, et Chromatic
ou `toHaveScreenshot` de Playwright peut la tenir. Le comparateur tient la
promesse de robustesse du concept : un écart détecté avant la fusion, avec un
diagnostic qui dit quoi corriger.

Si le seul but est d'empêcher qu'un rendu validé régresse, les captures
suffisent et coûtent moins. Le comparateur devient nécessaire dès qu'un
composant neuf, un réexport ou un agent doit être jugé sans qu'un humain
regarde chaque combinaison.

## 4. Ce qui est déjà décidé

- Aucun contrôle ne cite le nom d'un composant.
- Le comparateur n'affirme jamais plus précisément que le contrat. Il exige le
  bon token sur le bon slot, et laisse au code le choix entre `background` et
  `background-color`.
- Un écart constaté sur un affichage réel bloque. Une vérification qui n'a pas
  pu avoir lieu avertit.
- Le comparateur reçoit une observation normalisée (styles calculés,
  géométrie, chemins de slots, état obtenu), pas le HTML.

## 5. Les recherches

| # | Question | État |
|---|---|---|
| R4 | Quels outils comparent déjà un rendu à une spécification ou à des tokens, et comment prouvent-ils l'identité d'un token ? | rendue, complétée par un essai |
| R5 | Comment mesurer de façon fiable un composant dans un navigateur : styles calculés, états forcés, repérage des slots, ordre ? | rendue, complétée par un essai |

## 6. Résultats

### R4. Ce que font les outils existants

Aucun outil trouvé ne retrouve le token d'une valeur calculée. Les outils se
rangent en cinq approches.

| Approche | Ce qu'elle prouve | Ce qu'elle ne prouve pas |
|---|---|---|
| Capture d'image (Chromatic, `toHaveScreenshot`) | Le rendu est identique à une capture qu'un humain a acceptée | La conformité au contrat, le token employé |
| Styles calculés (`toHaveCSS`, designfit) | La valeur affichée et la géométrie | Le token qui l'a produite. Une valeur en dur égale passe |
| Cascade du navigateur (protocole CDP) | La déclaration retenue, avec son `var(--token)` | Rien hors Chromium sans un autre protocole |
| Valeurs sentinelles | Le token, reconnu à une valeur unique | La géométrie, que les valeurs uniques déforment |
| Lecture statique (stylelint) | Aucune valeur en dur dans le source | Le rendu réel, les états, les thèmes |

- Chromatic garde comme référence le dernier rendu accepté d'une branche
  ([Chromatic](https://www.chromatic.com/docs/branching-and-baselines/)).
  Une référence prouve « identique à ce qu'un humain a validé », ce que la
  décision `rendu-valide-devient-reference` demande déjà, et rien de plus.
- designfit est le seul outil trouvé qui compare un rendu à Figma sans image.
  Il pose un attribut `data-designfit-id` sur chaque élément et lit les styles
  calculés par Playwright. Il compare des valeurs résolues, sans lire `var()`
  ([article](https://dev.to/as9978/why-screenshot-diffing-ai-built-uis-thrashes-and-how-geometry-fixes-it-5967)).
- stylelint exige une variable CSS pour les couleurs et les longueurs avec
  `value-type-custom-property-required-list`
  ([stylelint](https://stylelint.io/user-guide/customize/)).
- `CSS.getMatchedStylesForNode` du protocole CDP rend les règles qui
  s'appliquent à un nœud, avec le texte de chaque déclaration
  ([CSS.pdl](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/CSS.pdl)).
  Playwright ouvre une session CDP sur Chromium seulement
  ([BrowserContext](https://playwright.dev/docs/api/class-browsercontext)).
- Aucune pratique documentée de valeurs sentinelles n'a été trouvée.
- Moran et al. détectent les écarts entre une maquette et une application
  Android par la position et la taille des éléments, sans notion de token
  ([article](https://ar5iv.labs.arxiv.org/html/1802.04732)).

### Essais dans les trois moteurs

L'essai pose `gap: var(--gap)`, `--gap: var(--base)` et
`padding: var(--p) 16px`, puis lit le résultat dans Chromium, Firefox et WebKit
par Playwright.

| Lecture | Chromium | Firefox | WebKit |
|---|---|---|---|
| `getComputedStyle(el).gap` | `8px` | `8px` | `8px` |
| CDP `CSS.getMatchedStylesForNode` | `gap: var(--gap)` | sans objet | sans objet |
| Règle de la feuille, `rule.style.getPropertyValue('gap')` | `var(--gap)` | `var(--gap)` | `var(--gap)` |
| Typed OM, `rule.styleMap.get('gap')` | inexploitable | absent | `CSSVariableReferenceValue --gap` |
| Longhand d'un raccourci, `padding-top` dans la règle | vide | vide | vide |

Trois faits en sortent :

1. Dans Chromium, le navigateur dit lui-même quelle déclaration s'applique et
   quel token elle cite. Une variable qui en vise une autre garde le nom écrit
   dans la déclaration (`--gap`, pas `--base`). Le comparateur peut donc lire
   le token sans valeurs sentinelles.
2. Hors de Chromium, la feuille de style donne le texte `var(--gap)`, mais il
   faudrait refaire la cascade pour savoir quelle règle l'emporte.
3. Un raccourci écrit avec une variable laisse ses longhands vides. Le
   comparateur doit remonter de `padding-top` à la déclaration `padding`.

### R5. Mesurer un composant de façon reproductible

- `getComputedStyle` rend la valeur « resolved ». Pour les couleurs, les
  marges, le padding, la largeur et la hauteur, c'est la valeur réellement
  utilisée ([spécification](https://drafts.csswg.org/cssom/#resolved-values)).
- Une couleur sRGB sort en `rgb()`, une autre garde sa fonction, comme
  `oklch()` ([getComputedStyle](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)).
  Le comparateur doit donc ramener les couleurs dans un même espace avant de
  les comparer.
- `document.fonts.ready` attend seulement les polices déjà demandées, et
  `document.fonts.load()` force une police précise
  ([FontFaceSet](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready)).
- Playwright fixe le viewport, la densité de pixels, les animations réduites,
  le thème et la langue dans le contexte du navigateur
  ([emulation](https://playwright.dev/docs/emulation)).
- `hover()` et `mouse.down()` envoient de vrais événements souris
  ([actionability](https://playwright.dev/docs/actionability)).
  `CSS.forcePseudoState` force un état par le protocole CDP, dans un domaine
  marqué expérimental. L'addon Storybook « pseudo-states » réécrit les
  feuilles de style, et perd donc les styles par défaut du navigateur
  ([addon](https://github.com/chromaui/storybook-addon-pseudo-states)).
- Ark et Zag posent `data-scope` et `data-part` sur chaque partie, en
  production ([Ark](https://ark-ui.com/docs/guides/styling)). Kent C. Dodds
  juge sans gravité de garder ces attributs en production
  ([article](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)),
  et `babel-plugin-react-remove-properties` les retire au besoin.
- La propriété `order` change l'ordre affiché sans changer l'ordre du DOM
  ([order](https://developer.mozilla.org/en-US/docs/Web/CSS/order)).
- Les paquets `@playwright/experimental-ct-*` sont retirés. Playwright monte
  désormais des stories depuis une page de galerie
  ([test-components](https://playwright.dev/docs/test-components)). Une équipe
  publie plus de 1 000 stories testées en 3 minutes sur 6 jobs
  ([Defined Networking](https://www.defined.net/blog/modern-frontend-testing/)).

### Essais des états et de l'ordre

| Lecture | Chromium | Firefox | WebKit |
|---|---|---|---|
| Fond `oklch(0.55 0.2 260)` dans `getComputedStyle` | `oklch(…)` | `oklch(…)` | `oklch(…)` |
| `hover()` | `:hover` obtenu | `:hover` obtenu | `:hover` obtenu |
| `mouse.down()` | `:active` obtenu | `:active` obtenu | `:active` obtenu |
| `focus()` | `:focus-visible` obtenu | `:focus-visible` obtenu | `:focus-visible` obtenu |
| Touche Tab | focus perdu | focus perdu | `:focus-visible` obtenu |
| Clic | `:focus` sans `:focus-visible` | `:focus` sans `:focus-visible` | aucun focus |
| `flex-direction: row-reverse`, slots triés par position | icon puis label | icon puis label | icon puis label |

Les états s'obtiennent donc par `hover()`, `mouse.down()` et `focus()` dans
les trois moteurs. L'ordre affiché diffère de l'ordre du DOM dès qu'une règle
CSS le renverse, et la géométrie le retrouve.

## 7. Les quatre choix, expliqués

Chaque choix dit ce qui se décide, les options, ce que chacune coûte, et la
recommandation tirée des recherches. Le mainteneur tranche.

### Choix 1. Comment le contrôle retrouve-t-il un slot dans la page ?

Le contrat parle du slot `label` ou `icon`. Dans la page, ce sont des `<span>`
sans nom. Le contrôle doit retrouver le libellé sans code propre au composant.

| Option | Ce qu'elle demande | Conséquence |
|---|---|---|
| A. `data-ucm-slot="label"` écrit par le développeur, gardé en production | Une ligne par slot, une fois | Le contrôle mesure ce qui est livré. L'attribut pèse quelques octets |
| B. Le même attribut, retiré à la construction | A, plus un plugin de build | Le contrôle mesure une autre construction que celle qui est livrée |
| C. Aucun attribut | Du code de repérage propre à chaque composant | Contraire à la règle « aucun contrôle ne cite un composant » |

**Recommandation : A.** Ark et Zag livrent déjà `data-part` en production, et
le retrait ferait vérifier autre chose que le produit.

### Choix 2. L'ordre des slots se mesure-t-il dans le DOM ou à l'écran ?

Le contrat dit « l'icône avant le libellé », comme Figma l'affiche. L'essai
montre qu'un `flex-direction: row-reverse` inverse l'affichage sans toucher au
DOM.

| Option | Conséquence |
|---|---|
| A. Ordre affiché, retrouvé par la position des slots | Le contrôle juge ce que l'utilisateur voit, comme le contrat le décrit |
| B. Ordre du DOM | Un composant affiché à l'envers passe, et un composant juste mais écrit autrement échoue |

**Recommandation : A.** L'ordre de lecture par un lecteur d'écran relève de
l'accessibilité, que le contrat ne décrit pas.

### Choix 3. Survol, focus et appui entrent-ils dans la première version ?

Le contrat donne une couleur pour l'état `hover`, `focus` ou `press`. Ces
états ne se passent pas comme une option du composant, ils se provoquent.

| Option | Conséquence |
|---|---|
| A. Oui. L'observation dit quel état elle a obtenu, et le comparateur juge celui-là | Le format porte un champ de plus. P20 provoque les états par `hover()`, `mouse.down()` et `focus()` |
| B. Non. Seuls les états passés en option (`disabled`) sont jugés | Les couleurs de survol, de focus et d'appui ne bloquent jamais, et le rapport le dit en avertissement |

**Recommandation : A.** L'essai obtient les trois états dans les trois moteurs
par de vrais événements. Le coût de P10 se limite au champ de l'état obtenu.

### Choix 4. Comment le contrôle retrouve-t-il le token qui a peint une valeur ?

Le navigateur rend `8px`, pas `var(--gap)`. Si deux tokens valent `8px`, le
contrôle ne peut pas désigner celui qui a servi, et une valeur écrite en dur
passe pour juste. La piste prévoyait une feuille où chaque token prend une valeur unique,
puis deux passages, car ces valeurs déforment la mise en page.

| Option | Ce qu'elle demande | Conséquence |
|---|---|---|
| A. Lire la cascade par le protocole CDP, en un passage | Chromium | Le navigateur nomme la déclaration retenue et son token. Firefox et WebKit ne mesurent que les valeurs et la géométrie |
| B. Feuille à valeur unique, deux passages | Une seconde feuille de tokens, un temps doublé | Marche dans les trois moteurs. Le token se déduit d'une valeur, sans que le navigateur le dise |
| C. Lecture statique du code en complément | Un linter | Ne voit ni le rendu réel, ni les états, ni les thèmes |

**Recommandation : A.** L'essai lit `gap: var(--gap)` dans Chromium sans
feuille spéciale, dans une feuille de style comme dans un `style={…}` de React
(champ `inlineStyle` du protocole). Le protocole rend toutes les règles qui
s'appliquent, et le comparateur retient la dernière dans l'ordre de la
cascade. Pour un raccourci comme `padding`, il remonte de `padding-top` à la
déclaration `padding`. Le domaine CSS du protocole est marqué expérimental, et
la version de Chromium épinglée par Playwright le garde stable d'une exécution
à l'autre.

Adopter A retire de P10 deux points de la piste : l'option de
`packages/cli/src/tokens-css.mjs` qui écrit la feuille à valeur unique, et le
critère « deux tokens de même valeur sont distingués sous la feuille à valeur
unique ». Le critère deviendrait « deux tokens de même valeur sont distingués
par la lecture de la cascade ».

## 8. Ce que P10 ne fera pas

- Comparer des images. La capture validée par le designer appartient à P20.
- Dire si le composant ressemble à la maquette Figma. Le comparateur prouve
  que le code emploie les valeurs du contrat.
- Juger le comportement, le clavier ou l'accessibilité, que le contrat ne
  décrit pas.

## Questions au mainteneur

- [Choix 1. Comment le contrôle retrouve-t-il un slot dans la page ?](#choix-1-comment-le-contrôle-retrouve-t-il-un-slot-dans-la-page)
- [Choix 2. L'ordre des slots se mesure-t-il dans le DOM ou à l'écran ?](#choix-2-lordre-des-slots-se-mesure-t-il-dans-le-dom-ou-à-lécran)
- [Choix 3. Survol, focus et appui entrent-ils dans la première version ?](#choix-3-survol-focus-et-appui-entrent-ils-dans-la-première-version)
- [Choix 4. Comment le contrôle retrouve-t-il le token qui a peint une valeur ?](#choix-4-comment-le-contrôle-retrouve-t-il-le-token-qui-a-peint-une-valeur)
