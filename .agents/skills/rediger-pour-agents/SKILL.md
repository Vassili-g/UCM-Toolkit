---
name: rediger-pour-agents
description: "Écrire ou réécrire un fichier lu par les agents (AGENTS.md, CLAUDE.md, invariants, cartes, définitions d'agents, skills) dans la forme compacte du dépôt, sans perdre aucune information. Charger avant toute écriture dans ces fichiers, en plus de rediger-sans-tics-ia."
---

# Rédiger pour les agents

Forme compacte des fichiers lus par les agents. Les règles de
`rediger-sans-tics-ia` s'appliquent aussi, sauf celles que ce texte assouplit :
fragments et symboles de la section 3.

## 1. Portée

Fichiers : `AGENTS.md`, `CLAUDE.md`, `CARTE.md`, `packages/*/AGENTS.md`,
`packages/*/CLAUDE.md`, `packages/*/CARTE.md`, `packages/*/invariants/*.md`,
`.claude/agents/*.md`, `.agents/skills/*/SKILL.md`.

Hors portée : `FORMAT.md`, les `SPEC.md`, les README, les guides, les notes.
`CONTRIBUTING.md` les régit.

Lecteur : un agent qui a le code sous la main. Écrire seulement ce que le code
ne dit pas : règle, borne, autorité, test, renvoi. Le pourquoi va dans la spec.
Ici, une proposition au plus, et seulement si elle change le geste de l'agent.

## 2. Gabarits

### Invariant

```text
- **<Règle : phrase complète, au présent.>** <Précisions, en fragments.>
  Borne : <limite ou exception>. Autorité : `fichier.ts` `fonction`.
  Tests : `a.test.ts`, `[UI-20]`. → [§ancre]
```

- Titre en gras : phrase complète. Suite : fragments admis.
- Étiquettes fixes, dans cet ordre : `Borne :`, `Autorité :`, `Tests :`. Étiquette vide : omise.
- `Autorité :` vaut « en est l'unique autorité ». `Tests :` vaut « le tient ».
- Une puce = une règle. Deux règles = deux puces.

### Fichier d'invariants

```text
# <Titre exact du groupe source>

- **…** (une puce par règle)

[§ancre]: ../../../docs/format/FORMAT.md#ancre
```

Les définitions de liens de référence vont en fin de fichier, une par cible.

### Carte

```text
# Carte : <paquet>

## src/contract/
- exportComponent.ts : orchestration et métadonnées
```

- Un titre `##` par dossier, chemin relatif au paquet (à la racine du dépôt pour `CARTE.md` racine).
- Une ligne par fichier : `- <nom> : <rôle>`. Un dossier entier : `- <dossier>/ : <rôle>`.
- `tests/cartes.test.ts` refuse un chemin qui n'existe pas.

### `AGENTS.md` de paquet

```text
# <Nom> (`packages/<paquet>`)

<Rôle, une phrase.>

- Écrit dans Figma : `src/…` seul, ou rien.
- Commandes : `npm run test:paquet -- <nom>`, …
- Carte : [CARTE.md](./CARTE.md).

| Invariants | Chemins |
|---|---|
| [<titre>](./invariants/<fichier>.md) | `src/…/**` |
```

Au plus 6 Kio.

## 3. Raccourcis admis

Liste fermée. Un raccourci absent de la table s'écrit en toutes lettres.

| Forme longue | Forme courte |
|---|---|
| chemin du paquet courant, `packages/plugin-palettes/src/x.ts` | `src/x.ts` |
| chemin d'un autre paquet, `packages/couleur/src/rampe.ts` | `couleur/src/rampe.ts` |
| chemin de la racine du dépôt, dans un fichier de paquet : `tests/x.test.ts` à la racine | `/tests/x.test.ts` |
| la fonction `f` du fichier `x.ts` | `x.ts` `f` |
| lien vers une spec, répété | lien de référence `→ [§6.3]` |
| implique, donne, mène à, renvoie à | `→` |
| égal à, différent de, au plus, au moins | `=`, `≠`, `≤`, `≥` |
| UCM Palettes, UCM Nomenclature, UCM Token Explorer | Palettes, Nomenclature, l'explorateur |
| la spécification | la spec |

## 4. À retirer

- Annonces, transitions (donc, ainsi, en effet), reformulations.
- Le sujet du titre de section, répété dans chaque puce.
- Ce que le code dit déjà : signature, type, valeur d'une constante. Exception : un seuil qui fonde la règle.
- L'histoire d'une décision.

## 5. À garder toujours

- Chaque nom en code : identifiant, chemin, clé, nom de test, identifiant `[UI-xx]`, `N01`, `D14`.
- Chaque nombre, seuil et unité. Un nombre écrit en lettres reste en lettres.
- Chaque négation et chaque condition : jamais, aucun, sauf, seulement, sans, sous, au-delà, tant que.
- Chaque borne, chaque exception, chaque renvoi à la spec.

Un mot de cette liste ne change que pour un équivalent exact : « ne … que » → « seulement ».

Une règle qui paraît fausse ou périmée ne se corrige pas en réécrivant : la
rendre en question. Seuls les écarts déjà relevés par le plan se corrigent.

## 6. Interdits maintenus

Tiret cadratin en incise, capitales d'emphase, opposition « ce n'est pas X,
c'est Y », qualificatifs, dates. `scripts/controle-style.mjs` les refuse.

## 7. Vérifier une réécriture

1. `node scripts/verifier-conservation.mjs --domaines <id>` : aucun manque de nom en code, nombre, identifiant ou cible de lien. Bloquant.
2. `node scripts/controle-style.mjs <fichiers>`.
3. Un relecteur compare chaque groupe source à son fichier et liste les négations, conditions et bornes perdues. Le mainteneur relit seulement ce qu'il liste.
