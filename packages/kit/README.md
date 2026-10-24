# @ucm-kit/core

The UCM contract format, and the readers that judge a contract.

A **UCM contract** is a JSON file describing a UI component exactly as it exists
in Figma: its variants, its structure, its design tokens, its usage rules. It is
written by the [UCM Contract
Exporter](https://github.com/Vassili-g/UCM-Toolkit) Figma plugin, and read by
the repository that implements the component. The plugin and the readers both
import the format from this package.

```sh
npm install @ucm-kit/core@0.12.13
```

Most repositories never call this package directly. They run
[`@ucm-kit/cli`](https://www.npmjs.com/package/@ucm-kit/cli), which calls it for
them. Install it to run the checks from your own code. Requires Node 20 or
later for `@ucm-kit/core/lecteurs`.

## Validate a contract

```js
import { readFileSync } from "node:fs";
import {
  trouverContrats,
  verdictDeVersion,
  champsInvalidesDuContrat,
} from "@ucm-kit/core/lecteurs";

for (const path of trouverContrats("./src/components")) {
  const contract = JSON.parse(readFileSync(path, "utf8"));

  const verdict = verdictDeVersion(contract.meta.contractVersion);
  if (verdict !== "ok") {
    console.error(`${path}: version ${contract.meta.contractVersion} is ${verdict}`);
    continue;
  }

  const invalid = champsInvalidesDuContrat(contract);
  if (invalid.length > 0) console.error(`${path}: ${invalid.join(", ")}`);
}
```

`trouverContrats` walks a directory for `*.contract.json`.
`champsInvalidesDuContrat` returns the paths of the fields that are missing or
malformed; an empty array means the contract is valid. Neither throws.

## A version gap has a direction

`verdictDeVersion` returns `"ok"`, `"ancien"` (too old) or `"recent"` (too new).
The direction names who fixes the gap:

- **too old.** The contract predates fields the code now depends on. The
  designer re-exports it from Figma.
- **too new.** The contract comes from a plugin ahead of this repository. A
  developer upgrades this package; no re-export helps.

**This release reads two contract versions, `13.0` and `14.0`**, the previous
one and the current one, so a consumer stays green until its contracts are
re-exported. The lower bound moves up by one version with each contract
version. `VERSION_CONTRAT_MINIMALE` and `VERSION_CONTRAT_MAXIMALE` expose the
range in code.

## A repository with no contract at all

Right after `ucm init` nothing has been exported: there is no token file, and
usually no contract folder. `controlerRepository`, the whole-repository entry
point that `@ucm-kit/cli` calls, returns a green verdict there and reports the
next step.

With one contract or more, a missing token file blocks the merge, because the
contracts cite tokens that cannot be resolved. A token file that exists but
does not parse blocks whatever the number of contracts.

## The token file has its own format version

`tokens.json` carries its format version at the root of the document, under
`$extensions["com.ucm.formatVersion"]`. It is not the contract version.
`etatDuFormatDeTokens`, from `@ucm-kit/core/format`, reads it and returns one
of five states:

| Mark at the root | State | `controlerRepository` |
|---|---|---|
| absent | `origine` | reads the file |
| `2` | `courante` | reads the file |
| `1` | `ancienne` | reads the file; the next export raises the version |
| an integer above `2` | `future` | blocks before reading a token; a developer upgrades the UCM packages |
| any other value, or a document or `$extensions` that is not an object | `invalide` | blocks before reading a token; the designer runs the token export again |

`VERSIONS_DE_TOKENS_LUES` lists the marks this package reads. An integer below
the current version that is absent from the list is `invalide`. The mark is
read even in a repository with no contract yet.

The typography check resolves a text style reference in every mode of each
token on its alias chain. It refuses the reference when one mode aliases a
token of another `$type`, and names the token and the mode. The designer links
a variable of the same type in that mode, then exports the tokens again.

The mark does not protect another token reader. Style Dictionary 4 ignores it
and writes `[object Object]` for every color and dimension, and the build
succeeds. Style Dictionary 5 writes the same for every `duration` unless the
reader registers a transform for that type. Check the generated output before
merging the first export in a new format version.

## New names for the UCM layers

From 0.10.0, three reference layers have new names: `color-brands` becomes
`brands`, `color-utilities` becomes `utility`, and `layouts` becomes
`layout`. `primitives`, `theme`, `typography` and `components` keep theirs.
`COLLECTIONS` holds the new names. `FORMES_ANCIENNES_DES_COLLECTIONS` maps
each old name to the new one, and `collectionUcmReconnue` reads both, so a
Figma file that keeps the old names keeps its UCM checks.

A token path starts with the name of its Figma collection, not with the
reference name. Nothing changes in a repository until the designer renames the
collections in Figma and exports again. That export then changes:

| Before | After |
|---|---|
| `color-brands.primary.light.500` | `brands.primary.light.500` |
| `--color-utilities-neutral-light-500` | `--utility-neutral-light-500` |
| `layouts.radius.md` | `layout.radius.md` |
| `data-color-brands` (mode attribute of a brand collection with several modes) | `data-brands` |

Aliases inside `tokens.json` are rewritten in the same export and stay
consistent. Code that cites these CSS variables or this attribute directly
must follow them. In `ucm.config.json`, a `modes.color-brands` key is still
read as `modes.brands` once the token file has a `brands` axis, and the CLI
prints a note that asks to rename the key.

## The nine entry points

```js
import { CONTRACT_VERSION, codeIdentifier, normalizeName } from "@ucm-kit/core/format";
import { GARANTIES, TABLE_DES_DOSSIERS, atteintLeSeuil, contraste } from "@ucm-kit/core/emplois";
import { champsInvalidesDuContrat, verdictDeVersion } from "@ucm-kit/core/lecteurs";
import { lireLeSchema, CHEMIN_DU_SCHEMA } from "@ucm-kit/core/lecteurs";
import { champsInvalidesDuContrat, indexerTokensDtcg } from "@ucm-kit/core/lecteurs/navigateur";
import { COLLECTIONS, PRODUITS } from "@ucm-kit/core/referentiel";
import { variableDuCatalogue } from "@ucm-kit/core/controles";
import { classerLaDonnee, lireLeSuiviComplet } from "@ucm-kit/core/protocoles";
import { nomsSelonLesReglesSync } from "@ucm-kit/core/nommage";
```

**`@ucm-kit/core/format`** gives the shape of a contract, its version, the
naming rules, and the shape of a token reference. **This subpath depends on
nothing**: not Node, not Figma, not a third-party package. It runs inside a
Figma plugin bundle and inside a browser.

**`@ucm-kit/core/emplois`** holds the color vocabulary that the UCM Palettes
plugin and `ucm check` share: the table of theme variables in three folders
(`solid`, `surface`, `page`) with its normal and inverted senses, the shade
each variable targets, the seven contrast guarantees, and the WCAG 2 contrast
compared on its value written to ten decimals. Like `format`, it depends on
nothing.

**`@ucm-kit/core/referentiel`** is the shared reference data: the UCM
collections and their targets, the naming registers and lexicon, the products
and their responsibilities, the implementation advice, and the grammar of the
Figma rules kit (`.componentRules`, `.rulesSection`, `.ruleItem`, their layers
and the `[À compléter]` marker) with a validator of a portable survey of its
masters. Like `format`, it depends on nothing.

**`@ucm-kit/core/controles`** defines the portable component survey, reference
catalogue and findings used by UCM Architect. It also looks up catalogue
variables by key or name. The subpath does not read Figma objects.

**`@ucm-kit/core/protocoles`** holds the data that UCM plugins share inside a
Figma file: for each one, its address, its versions and the way a stored text
is classified as absent, unreadable, refused, old, current or future. The
`palettes` module covers the recipe, the variable tracking, the `nommage` mark
and the `palette` and `cle` markers of a variable. The `nommage` module covers
the rules that UCM Architect stores to change a name (`ecriture`, `terme:`,
`ecart:`, `ordinaire:`, `exclues`): the key constructors, the reader, and the
entries of a newer version, which it lists as `futures`. A reader never
migrates or rewrites the data. Like `format`, it depends on nothing: not Node,
not Figma, not a third-party package.

**`@ucm-kit/core/nommage`** computes the renaming that UCM Architect and
UCM Palettes share. It takes an inventory of the names of a file and the rules
read through `protocoles`, and returns the names the lexicon gives, after the
check of the published paths: no rename may make a token of `tokens.json` or a
mode axis disappear. It also holds the portable inventory and the protection of
the variables that UCM Palettes writes. It reads no Figma object.

**`@ucm-kit/core/lecteurs`** holds everything that judges a contract already
written: its shape, its composition graph, its token references, the meaning of
a version gap. Some of these modules use `ajv` and `node:fs`, so this subpath
stays out of a plugin bundle.

**`@ucm-kit/core/lecteurs/navigateur`** republishes, under the same names, every
reader of `lecteurs` that touches neither Node nor Ajv: version verdict, field
by field validation, composition graph, token references, the DTCG index, token
modes and the diagnostic sections. A Figma plugin or a web page bundles it.
Finding contracts on disk, reading `ucm.config.json` and validating against the
JSON Schema stay in `lecteurs`.

**`@ucm-kit/core/schema`** is the JSON Schema as a file, for binding
`*.contract.json` to validation in an editor. From code, `lireLeSchema()`
returns it parsed and `CHEMIN_DU_SCHEMA` gives its resolved path, whatever JSON
import syntax your Node version supports.

The schema describes the shape of a contract. It does not check internal
cross-references or tokenized value formats, as its own `description` says, so
it replaces none of the readers.

## What this package does not do

It does not read Figma, does not generate component code, and does not render
anything. It never rewrites a contract; every reader takes a contract and
returns a verdict.

## Status

**0.x, the public surface is not frozen.** Pin an exact version, without `^`.

The exported symbols are French: `champsInvalidesDuContrat` reads as "invalid
fields of the contract", `verdictDeVersion` as "version verdict".

- [Repository and issues](https://github.com/Vassili-g/UCM-Toolkit)
- [MIT licensed](https://github.com/Vassili-g/UCM-Toolkit/blob/main/LICENSE)
