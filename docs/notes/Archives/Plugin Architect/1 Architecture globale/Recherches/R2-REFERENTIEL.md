# R2. Le référentiel UCM : inventaire et marché

**Statut :** résultats de recherche du sujet R2 de
[PLAN-DE-RECHERCHE.md](../PLAN-DE-RECHERCHE.md#r2-le-référentiel-ucm).
Aucune décision n'est prise ; la section 4 liste ce que ces résultats
permettent de trancher.

Lecteur : le mainteneur, pour décider du contenu, de la forme et des langues
du référentiel.

## 1. Les définitions que le code porte aujourd'hui

| Définition | Source | Langue | Lecteurs |
|---|---|---|---|
| Dossiers, états, variables de `theme`, cran de chaque variable dans les deux sens | `DOSSIERS`, `ETATS`, `VARIABLES_DE_PALETTE`, `TABLE_DES_DOSSIERS`, [dossiers.ts](../../../../../../packages/kit/src/emplois/dossiers.ts) | Identifiants anglais, sans libellé | Palettes, explorateur, `ucm check` |
| Ce que chaque variable de `theme` peint, et ses portées Figma | `SUPPORT_DES_VARIABLES`, même fichier | Sans libellé | Palettes, explorateur |
| L'état du fond selon l'interaction (repos, survol, appui, focus, désactivé) | `ETAT_DU_FOND`, même fichier | Clés françaises, valeurs anglaises | Palettes |
| Les neuf garanties | `GARANTIES`, [garanties.ts](../../../../../../packages/kit/src/emplois/garanties.ts) | Sans libellé | Palettes, `ucm check` |
| Libellé de chaque variable de `theme` (`solid/default` : « bouton ») | `LIBELLE_DE_LA_VARIABLE`, catalogues `fr.ts` et `en.ts` de Palettes | Français et anglais | Palettes seul |
| États reconnus dans un composant et leur sélecteur CSS | `STATE_SELECTORS`, [semantics.ts](../../../../../../packages/plugin-socle/src/composant/contract/semantics.ts) | Identifiants anglais | Exporteur seul |
| Noms d'axe d'état (`state`, `states`, `status`) | `STATE_AXIS_NAMES`, même fichier | Anglais | Exporteur seul |
| Tailles reconnues | `SIZE_VALUES`, même fichier | Anglais | Exporteur seul |
| Tags des règles d'usage | `TAGS_D_INTENTION`, [rulesModel.ts](../../../../../../packages/plugin-socle/src/composant/contract/rulesModel.ts) | Anglais | Exporteur seul |
| Les cinq couches et leurs cibles | `COUCHES`, `CIBLES_DES_COUCHES`, [profilUcm.ts](https://github.com/Vassili-g/UCM-Toolkit/blob/edc56f63c6ac43b49a2938b590a202ca56a61526/packages/plugin-architect/src/integrations/profilUcm.ts) | Anglais | Explorateur seul, dans l'onglet Intégrations retiré |
| Les caractéristiques d'un contrat et leur aide | `CARACTERISTIQUES`, [caracteristiques.mjs](../../../../../../packages/kit/src/lecteurs/caracteristiques.mjs), et [packages/cli/aides/](../../../../../../packages/cli/aides/) | Français | `ucm guide`, un agent |

### 1.1 Les contradictions relevées

| Écart | Sources | Effet |
|---|---|---|
| L'exporteur demande de renommer un état inconnu « en default, hover, focus, press ou disable » | `semantics.ts` contre `dossiers.ts`, qui écrit `pressed` et `disabled/*` | Le produit recommande au designer deux termes que la table du kit n'emploie pas |
| Les libellés des variables de `theme` n'existent que dans Palettes | `fr.ts`, `en.ts` de Palettes | L'explorateur affiche `solid/default` sans libellé ; `ucm check` aussi |
| `solid/default` se libelle « bouton », alors que `SUPPORT_DES_VARIABLES` lui fait peindre un fond et un contour | `fr.ts` contre `dossiers.ts` | Le libellé nomme un emploi, la table en décrit deux : le contour d'un bouton `outlined` |
| Aucun état de sélection n'est reconnu | `STATE_SELECTORS` | Le fichier C2 en porte quatre formes (`selected`, `selected-true`, `selected-false`, `unselected`) |
| Deux échelles de tailles reconnues sans recommandation | `SIZE_VALUES` | `small` et `sm` passent tous les deux |

## 2. Le marché

Sources consultées : les dépôts et paquets publiés des systèmes cités. Les
pages de Salesforce, zeroheight et npm d'Atlassian ont refusé l'accès ; ce
qu'elles portent reste à vérifier.

### 2.1 Adobe Spectrum, le seul vocabulaire publié comme une donnée

Le dépôt [`adobe/spectrum-design-data`](https://github.com/adobe/spectrum-design-data)
sépare trois choses :

| Partie | Forme | Contenu |
|---|---|---|
| [`fields/`](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data/fields) | 33 fichiers JSON | Le champ d'un nom de token : `name`, `description`, `kind`, `registry`, `required`, position dans le nom sérialisé |
| `registry/` | 33 fichiers JSON, par exemple [`states.json`](https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data/registry/states.json) | Les valeurs permises d'un champ : `values[]`, `allowCustom` |
| [`rules.yaml`](https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/rules/rules.yaml) | 59 règles `SPEC-NNN` | `id`, `severity`, `category`, obligation ou recommandation, `message`, lien vers la spécification |

Le [schéma d'une valeur](https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/design-data-spec/schemas/registry-value.json)
n'exige que `id` et `label`. Il accepte aussi une définition structurée
(catégorie, description, caractéristiques), des sources, une gouvernance
(propriétaire, date de revue, statut, remplaçant), des alias, des termes
liés, les endroits où le terme sert et un lien de documentation. Un
validateur refuse les identifiants et alias en double, plus d'une valeur par
défaut par registre, et un remplaçant ou un terme lié qui n'existe pas.

Deux limites. Les règles de `rules.yaml` sont réécrites en code Rust :
catalogue et contrôle sont deux sources. La plupart des valeurs publiées ne
remplissent que `id`, `label` et `description`.

### 2.2 Les autres systèmes

| Système | Ce qu'il publie en données | Ce qu'il en génère | Limite |
|---|---|---|---|
| [GitHub Primer](https://github.com/primer/primitives) | Tokens DTCG avec `$description` et `$deprecated` ; [`removed.json`](https://raw.githubusercontent.com/primer/primitives/main/src/tokens/removed.json), environ 435 entrées de l'ancien nom vers le nouveau ou `null` ; une extension destinée aux modèles de langage, `usage` et `rules` par token ([schéma](https://raw.githubusercontent.com/primer/primitives/main/src/schemas/llmExtension.ts)) | CSS, JSON, Figma, et un document markdown pour les modèles de langage | Les règles de composition sont de la prose dans `DESIGN_TOKENS_GUIDE.md` ; le contrôle des noms ne vérifie que leur forme |
| Salesforce Lightning | [`@salesforce-ux/sds-metadata`](https://unpkg.com/@salesforce-ux/sds-metadata@latest/README.md) : hooks dépréciés, remplaçants, catégories, portées, alias | Les règles de son linter | Aucune description par hook |
| Atlassian | `@atlaskit/tokens` : métadonnées par token (`group`, `state`, `introduced`, `description`), table de renommage | La page [all-tokens](https://atlassian.design/components/tokens/all-tokens) ; une règle ESLint qui refuse un token déprécié | Le code de la règle n'a pas été lu |
| Material 3, Fluent 2 | Valeurs seulement | Rien | La proposition de métadonnées de Fluent ([#33115](https://github.com/microsoft/fluentui/issues/33115)) est fermée sans mise en œuvre |

DTCG prévoit `$description`, `$deprecated` (booléen ou texte, hérité d'un
groupe) et `$extensions` sous un nom de domaine inversé
([brouillon](https://www.designtokens.org/tr/drafts/format/)). Terrazzo a une
règle `core/descriptions` qui exige une description par token. Supernova et
Specify affichent `$description` ; Supernova ajoute des propriétés
personnalisées.

**Aucun système ne traduit ses définitions.** Spectrum localise ses
composants, pas son vocabulaire.

### 2.3 Les champs d'une définition sur le marché

| Champ | Spectrum | Primer | Atlassian | Salesforce |
|---|---|---|---|---|
| Identifiant | `id` | Chemin du token | `name` | Nom du hook |
| Libellé | `label` | Absent | Absent | Absent |
| Description | `description` | `$description` | `description` | Absente |
| Exemple ou usage | Caractéristiques de la définition | `usage`, pour les modèles de langage | Absent | Absent |
| Termes refusés | `aliases` | Absents | Absents | `aliases` |
| Statut | `governance.status`, `deprecated` | `$deprecated` | `state` | `deprecated` |
| Remplaçant | `governance.replacedBy` | Valeur de `removed.json` | `replacement` | `replacement` |
| Lien | `documentationUrl`, `spec_ref` | Absent | Page générée | Absent |

## 3. Ce que l'inventaire et le marché établissent

1. Le référentiel d'UCM existe déjà en partie, comme code : la table du kit
   est un vocabulaire publié dans `@ucm-kit/core`. Il manque les libellés,
   les définitions et les termes refusés, et quatre tables vivent hors du kit.
2. Le modèle de Spectrum couvre la nomenclature d'UCM : des positions
   (`fields/`), un vocabulaire fermé par position (`registry/`), des règles
   (`rules.yaml`). Son défaut, catalogue et contrôle séparés, se corrige par
   le précédent d'UCM : le schéma JSON dérive de `types.ts`, et une donnée
   unique sert au contrôle et à la page.
3. L'extension de Primer pour les modèles de langage montre un chemin vers
   les agents : la définition voyage avec le token, dans le fichier de
   tokens. Ce point nourrit R8 et R13.
4. Un référentiel bilingue n'a pas de précédent. Palettes a déjà les
   catalogues anglais et français de ses libellés ; la traduction des
   définitions double le volume à relire.
5. Le statut et le remplaçant d'un terme sont la même donnée que la table de
   renommage de R7 : Primer, Atlassian et Spectrum les rangent à côté du
   vocabulaire.

## 4. Ce que ces résultats permettent de trancher

| Question | Ce que la recherche apporte |
|---|---|
| Le contenu de la première version | Les onze sources de la section 1, à réunir ; les cinq contradictions de la section 1.1, à résoudre avant |
| La forme d'une entrée | Une forme possible, reprise de Spectrum : `id`, `libelle`, `definition`, `exemple`, `refuses` (alias), `statut`, `remplacant`, `regle` (lien), `lecteurs` |
| Positions et vocabulaires | Le découpage `fields/` et `registry/` de Spectrum correspond à la grammaire par collection que R3 recommande |
| Les langues | Question 4 de la proposition ; aucun précédent sur le marché |
| Le premier geste | Corriger le message de l'exporteur qui recommande `press` et `disable` : une contradiction visible du designer aujourd'hui |
