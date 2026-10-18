# Nomenclature d'UCM : corpus des design systems et questions à trancher

Statut : plan relu par un agent externe, en cours d'exécution.

## Pourquoi

La liste Q1 de questions sur C1 et C2 était inutilisable. Trois défauts du moteur l'expliquent :

1. L'indice « même place » rapprochait deux variables différentes dont les alias visent la même cible. Il produisait `badge / scale` ou `foreground / scale`.
2. Le lexique coupait tout segment à la casse. `ScaleWrap` donnait `scale` + `wrap`, et `LineHeight` donnait `line` + `height`.
3. Rien ne distinguait un mot de nomenclature d'un nom propre à un composant, comme `scalewrap`.

Les mesures sur C2 montrent où sont les vraies questions. Le fichier n'a aucun alias cassé ; ses défauts sont des écarts de nom entre branches qui devraient être identiques. Le clair et le sombre ont chacun 624 feuilles, dont 66 n'existent que d'un côté. La collection des modes renomme aussi ce qu'elle référence. On y trouve sept paires de ce genre, qui touchent de 1 à 30 noms : un état écrit de deux façons, un mot français et son équivalent anglais, un mot et sa faute de frappe. Ces paires ne sortent ni d'un dictionnaire ni d'une proximité d'écriture : elles sortent de la structure. Le moteur doit les trouver ; il doit taire `badge / scale`. Le détail reste dans `_local/`, hors du dépôt.

Pour fixer la nomenclature d'UCM, il faut aussi savoir ce que les design systems publiés emploient. Les relevés déjà faits portent surtout sur les couleurs. Ce plan les complète, les analyse avec C2, C1 et l'architecture UCM, puis rend au mainteneur une page de questions.

## Décisions de cadrage

- **Dossier de référence** : `docs/references/design-systems/`, un sous-dossier par système. Le `README.md` porte le tableau des systèmes et `sources.json` porte, pour chaque fichier, l'URL, la version figée, le SHA-256 et la licence. `docs/README.md` et la carte d'`AGENTS.md` y renvoient.
- **Anciennes collectes** : elles restent dans `docs/notes/Archives/Plugin Palettes/Recette CRITIQUE de qualité/Collecte/`, en lecture seule ; les déplacer casserait leurs scripts et une vingtaine de renvois. Le `README.md` de référence pointe vers elles par système.
- **C2** est un fichier client et le dépôt est public. Son historique a été purgé (`ff13b30`). Le fichier et tout ce qui en dérive vivent sous un dossier `_local/` ignoré par git. Les fichiers commités ne contiennent que des comptes et des noms inventés.
- **Couche analysée** : la couche sémantique (couleur, espacement, typographie). La couche composant est justement la dénomination propre que la détection doit ignorer ; elle est conservée dans le corpus mais pas analysée. Les primitives ne servent qu'au vocabulaire des échelles.
- **Analyse par concept** : un mot a un concept (« fond », « survol ») et plusieurs rôles possibles selon sa place (`text` est une propriété ou un élément). On compare les formes concurrentes d'un même concept.

## Systèmes couverts

Première vague, 13 systèmes, ceux qui publient des tokens lisibles et déjà relevés en partie : Atlassian, IBM Carbon, Adobe Spectrum, GitHub Primer, Shopify Polaris, Material 3, Microsoft Fluent 2, Figma SDS, Radix Themes, Tailwind, shadcn/ui, MUI, Untitled UI.

Seconde vague, seulement si l'analyse montre un trou : Ant Design, Bootstrap, Chakra UI, Mantine, Flowbite, GOV.UK Frontend, Tremor, Salesforce SLDS, GitLab Pajamas.

Corpus du projet : UCM (registres du kit et C1, `UCM-Playground/src/tokens/tokens.json`) et C2 (local).

## Règles de détection

**Sources de questions.**

1. **Formes d'un même mot**, observées toutes les deux dans le fichier : faute de frappe, pluriel, terminaison (`-ed`, `-ing`), abréviation, négation (`un-`, `non-`). Aucun des deux mots n'a besoin d'être connu.
2. **Branches parallèles** : deux noms à la même place dans deux branches de même structure (clair et sombre, deux marques, un alias et sa cible) qui ne diffèrent que d'un segment, appariés un à un.
3. **Synonymes** du kit (`SYNONYMES_COURANTS`) : seulement si les deux mots sont observés.

L'ancien « même place » est supprimé.

**Découpage d'un segment.** Coupe aux séparateurs explicites. À la casse ou dans un bloc soudé, coupe seulement si :

- chaque morceau fait au moins 3 lettres ;
- un morceau au moins est exact ;
- un morceau approximatif fait au moins 5 lettres et reste à une lettre ou une transposition d'un terme connu.

Chiffres et sigles sont coupés à part. Un terme composé de la liste des propriétés CSS (`line-height`, `font-size`, `border-radius`…) reste un seul terme.

| Segment | Résultat |
|---|---|
| `LineHeight` | `line-height` |
| `bordrewidth` (inventé) | `bordre` + `width`, faute de `border` |
| `ScaleWrap` | entier |
| `Gray100` | `gray` + `100` |

**Tranché sans question** : faute ou pluriel d'un terme connu ; forme employée par au moins 70 % des systèmes qui ont le concept (cinq au moins), qui est aussi la forme d'UCM.

**Question au mainteneur** : deux formes employées chacune par au moins trois systèmes ; ou UCM qui s'écarte de la forme majoritaire ; ou une paire de C2 trouvée par les branches parallèles sur un concept qu'UCM n'a pas encore nommé.

## Lots

### N0 · Corriger la détection (moteur du kit)

- [ ] N0.1 Supprimer « même place » (boucle des alias) et ajouter l'indice `branches-paralleles` avec appariement un à un.
- [ ] N0.2 Ajouter la négation aux formes ; les formes ne demandent pas de mot connu, les synonymes si.
- [ ] N0.3 Découpage gardé par le vocabulaire, selon les règles ci-dessus.
- [ ] N0.4 Jeu d'essai synthétique commité : les erreurs types de C2 sous des noms inventés, et des négatifs (`ScaleWrap`, `LineHeight`, `Gray100`, `onSurface`, `URLBase`, `H1`, `2xl`, `badge / scale`).
- [ ] N0.5 Remesurer C1 et C2. Juger les 40 premières questions de C2 : moins de 10 % hors sujet, sinon le lot n'est pas fini. Comptes dans `MESURES.md`, questions de C2 dans `_local/`.

Fichiers : `packages/kit/src/referentiel/questions.ts`, `lexique.ts`, `ecriture-des-mots.ts`, `harmonisation.ts`, `packages/kit/tests/`, lecteurs éventuels dans `packages/plugin-architect`.

### N1 · Dossier de référence et données de la première vague

- [ ] N1.1 `docs/references/design-systems/README.md` : rôle, tableau des systèmes (dossier, version, date, licence, nombre de noms, collectes d'archive), règles d'ajout.
- [ ] N1.2 `_outils/recuperer.mjs` lit `sources.json`, télécharge les fichiers figés dans `<système>/sources/` et vérifie leur SHA-256. Il réutilise `lib.mjs` des anciennes collectes s'il convient.
- [ ] N1.3 `_outils/extraire.mjs` écrit `<système>/noms.json` : nom d'origine, type, couche si la source la donne.
- [ ] N1.4 UCM au même format : registres du kit et C1.
- [ ] N1.5 Garde-fou : un script, lancé en local seulement, échoue si un fichier suivi par git contient un segment distinctif de C2. Il saute si C2 est absent.
- [ ] N1.6 Renvois dans `docs/README.md` et `AGENTS.md`.

### N2 · Normaliser et analyser

- [ ] N2.1 `_outils/normaliser.mjs` : segments et mots selon le découpage du kit, concept et rôle selon `concepts.json`.
- [ ] N2.2 `concepts.json` : les mots présents dans au moins trois systèmes ou sur vingt noms, rangés par concept, environ 300 mots. Le reste est listé (cent premiers), sans objectif de zéro.
- [ ] N2.3 `ANALYSE.md` et `donnees-questions.json` :
  - formes concurrentes par concept, avec le nombre de systèmes et deux exemples ;
  - termes composés et leur écriture ;
  - ordre des segments par système ;
  - écarts d'UCM à la majorité ;
  - diagnostic de C1 ; celui de C2 reste dans `_local/` ;
  - tableau concept → terme UCM proposé → formes remplacées sans question → cas à trancher.

### N3 · Page de questions pour le mainteneur

- [ ] N3.1 Page HTML publiée, en français simple : au plus vingt-cinq questions, classées par nombre de variables touchées dans UCM et C2. Chacune donne la réponse recommandée, les choix (A, B, autre), les formes du marché avec leurs comptes et des exemples. La page est privée ; elle peut citer C2 au mainteneur.
- [ ] N3.2 Une section courte reprend les décisions de méthode à valider : périmètre, couche sémantique seule, règles de « tranché sans question ».
- [ ] N3.3 Les réponses sont enregistrées dans la base de la page, avec l'identifiant de chaque question, pour être relues sans recopie.

### Après les réponses (hors de cette passe)

- N4 Entrer les décisions dans les registres du kit, avec leurs sources.
- N5 Nourrir les mots connus du découpage avec le corpus, remesurer, refaire Q1.
- N6 Seconde vague de systèmes si l'analyse a montré un trou.
- F4 Recette dans Figma par le mainteneur.
