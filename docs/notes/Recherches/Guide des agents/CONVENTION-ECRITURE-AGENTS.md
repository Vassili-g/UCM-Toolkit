# Convention d'écriture des fichiers d'agents

Proposition. Au lot 3a du [plan](./PLAN-DECOUPAGE-AGENTS.md), ce texte devient
la skill `.agents/skills/rediger-pour-agents/SKILL.md`. Il est écrit dans la
forme qu'il décrit.

## 1. Portée

Fichiers visés : `AGENTS.md`, `CLAUDE.md`, `packages/*/AGENTS.md`,
`packages/*/invariants/*.md`, `packages/*/CARTE.md`, `.claude/agents/*.md`,
`.agents/skills/*/SKILL.md`.

Hors portée : `FORMAT.md`, les `SPEC.md`, les README, les guides, les notes.
Les règles de `CONTRIBUTING.md` s'y appliquent sans changement.

Lecteur : un agent qui a le code sous la main. Écrire seulement ce que le code
ne dit pas : règle, borne, autorité, test, renvoi. Le pourquoi va dans la
spécification. Ici, une proposition au plus, et seulement si elle change le
geste de l'agent.

## 2. Gabarit d'un invariant

```text
- **<Règle : phrase complète, au présent.>** <Précisions, en fragments.>
  Borne : <limite ou exception>. Autorité : `fichier.ts` `fonction`.
  Tests : `a.test.ts`, `[UI-20]`. → [§ancre]
```

- Titre en gras : phrase complète. Suite : fragments admis.
- Étiquettes fixes, dans cet ordre : `Borne :`, `Autorité :`, `Tests :`. Étiquette vide : omise.
- `Autorité :` vaut « en est l'unique autorité ». `Tests :` vaut « le tient ».
- Une puce = une règle. Deux règles = deux puces.

## 3. Raccourcis admis

Liste fermée. Un raccourci absent de la table s'écrit en toutes lettres.

| Forme longue | Forme courte |
|---|---|
| chemin du paquet courant, `packages/plugin-palettes/src/x.ts` | `src/x.ts` |
| chemin d'un autre paquet, `packages/couleur/src/rampe.ts` | `couleur/src/rampe.ts` |
| la fonction `f` du fichier `x.ts` | `x.ts` `f` |
| lien vers une spécification, répété | lien de référence `→ [§6.3]`, défini une fois en fin de fichier |
| implique, donne, mène à, renvoie à | `→` |
| égal à, différent de, au plus, au moins | `=`, `≠`, `≤`, `≥` |
| UCM Palettes, UCM Nomenclature, UCM Token Explorer | Palettes, Nomenclature, l'explorateur |
| la spécification | la spec |

## 4. À retirer

- Annonces, transitions (donc, ainsi, en effet), reformulations.
- Le sujet du titre de section, répété dans chaque puce.
- Ce que le code dit déjà : signature, type, valeur d'une constante. Exception : un seuil qui fonde la règle.
- L'histoire d'une décision. Le contrôle de style la refuse déjà.

## 5. À garder toujours

- Chaque nom en code : identifiant, chemin, clé, nom de test, identifiant `[UI-xx]`.
- Chaque nombre, seuil et unité.
- Chaque négation et chaque condition : jamais, aucun, sauf, seulement, sans, sous, au-delà, tant que.
- Chaque borne, chaque exception, chaque renvoi à la spec.

Un mot de cette liste ne change que pour un équivalent exact : « ne … que » → « seulement ».

## 6. Ce qui reste interdit

Le contrôle de style s'applique sans exception : tiret cadratin en incise,
capitales d'emphase, opposition « ce n'est pas X, c'est Y », qualificatifs,
dates. Symboles admis : ceux de la section 3.

## 7. Vérifier une compaction

- `scripts/verifier-compaction.mjs <commit>`, bloquant : chaque puce garde ses noms en code, ses nombres et les cibles de ses liens.
- Un agent relit chaque paire avant-après et liste les négations, conditions et bornes disparues. Non bloquant. Le mainteneur relit seulement les paires listées.
- Une compaction = un domaine par commit, sans autre changement.

## 8. Exemple mesuré

Groupe « Grilles » d'`AGENTS.md` : 1 449 → 1 027 octets (−29 %), 219 → 149
mots. Noms en code, nombres et liens identiques, relevés par script.

```text
- **Sous une grille, la cellule fixe la boîte.** Pistes : `columnSizes`, `rowSizes`. Place : `columnStart`, `rowStart`, spans. Menu de dimensionnement ignoré : un enfant publie sa dimension seulement s'il cite une variable ; absence jamais réclamée. Borne : alignement explicite → hors cellule, règle commune.
- **Piste `FIXED` : valeur en pixels, sans un mot au designer.** Ni token, ni couverture dégradée ; rien ne manque, aucun geste, exception écrite dans la spec. Runtime sans pistes : rien publié, rien signalé. Piste illisible : avertit.
- **L'exception s'étend à la cellule, pas au-delà.** Piste `HUG` : `GridTrackSize.value` absent ; mesure de l'enfant en pixels dans `structuralSize`, sans diagnostic. Bornes : variable liée → `size`, strictement tokenisé ; une piste non `HUG` sous l'étendue de l'enfant → axe indécis, rien publié ; alignement explicite → pas d'exception (sinon contredit l'avertissement de `resolveSlotSize` sur le même axe). → [spec](./docs/format/FORMAT.md#grilles)
```

Estimation sur les 97 Ko d'invariants :

| Levier | Gain estimé |
|---|---:|
| chemins relatifs au paquet, liens de référence, étiquettes `Autorité :` et `Tests :` | environ 6 Ko |
| fragments et retrait des transitions, sur le taux de l'exemple | 20 à 25 Ko |
| total | 25 à 30 Ko, soit 26 à 31 % |
