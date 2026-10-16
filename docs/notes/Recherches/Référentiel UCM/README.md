# Référentiel UCM

Chaque définition du concept UCM existe une seule fois, comme donnée
TypeScript pure de `@ucm-kit/core`. Les plugins, le CLI et les pages générées
l'importent. Les documents décrivent ces données et y renvoient, sans les
recopier.

**État :** principe et contenu proposés ; audit de complétude confié à Codex
([PROMPT-AUDIT-CODEX.md](./PROMPT-AUDIT-CODEX.md)) ; plan par lots à écrire
après l'audit.

## La demande

Le rôle des crans, les collections, le vocabulaire des états et le rôle de
chaque plugin sont aujourd'hui écrits à plusieurs endroits du code et des
documents, et deux d'entre eux se contredisent : le kit écrit `pressed`,
l'exporteur recommande `press`. Le mainteneur veut une source unique par
définition, lisible par les plugins.

L'architecture des tokens de la
[vue illustrée](../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html)
est l'architecture de référence UCM. Le référentiel en porte les règles.

## Décisions du mainteneur

| Sujet | Décision |
|---|---|
| Forme des sources | Données TypeScript dans le kit, pas de fichier Markdown |
| Architecture de référence | La vue illustrée multi-marques |
| États | `pressed` et `disabled` sont les termes UCM ; `press` et `disable` restent tolérés à la lecture |
| Rôle des plugins | Une donnée du référentiel |

## Le contenu proposé

Le référentiel regroupe l'actuel `packages/kit/src/emplois/` dans
`packages/kit/src/referentiel/`. `@ucm-kit/core/emplois` reste exporté.

| Fichier | Contenu | Emplacement actuel |
|---|---|---|
| `crans.ts` | Crans 50 à 950, modes `light` et `dark`, profils `soft` et `vivid` | Listes écrites en dur dans Palettes et `couleur` |
| `theme.ts` | Table des dossiers `solid`, `surface`, `page` et de `ring`, sens du thème, texte des boutons, crans requis, élévation, variables `disabled` | `dossiers.ts` |
| `garanties.ts`, `contraste.ts` | G1 à G7 et contraste WCAG 2, une seule autorité | Kit et `couleur/src/promesses.ts` |
| `collections.ts` | Les sept collections de la référence, leur ordre, les alias permis, la forme des chemins, les axes de modes | `COUCHES` de l'explorateur, vue illustrée |
| `vocabulaire.ts` | États reconnus et variantes tolérées, tailles, statuts, rôles `foreground`, `border`, `divider`, `ring` | `STATE_SELECTORS` et `SIZE_VALUES` de l'exporteur |
| `produits.ts` | Chaque plugin et paquet : ce qu'il écrit, ce qu'il lit, où il écrit | Six documents |

Chaque entrée porte un identifiant, un libellé en français et en anglais, et
une définition d'une phrase.

## Les garde-fous

| Garde-fou | Effet |
|---|---|
| Règle dans `AGENTS.md`, section « Avant de modifier » | Une définition UCM se modifie dans le référentiel, puis les tests, la vue illustrée et la version du kit suivent |
| Commentaire en tête de chaque fichier du référentiel | Le fichier dit ce qu'il porte et la procédure après modification |
| Test de non-copie, sur le modèle de `tests/pluginsSepares.test.ts` | `npm test` échoue sur une liste de crans, de profils, d'états ou de collections déclarée hors du référentiel, et nomme le module à importer |
| Fichiers générés marqués et testés | La vue illustrée échoue à son test si elle ne suit plus le référentiel |

## Les étapes

1. Créer le référentiel dans le kit, avec un test qui confronte l'export de la
   vue illustrée aux chemins déclarés.
2. Brancher chaque outil, un lot par outil : explorateur, exporteur, Palettes,
   `couleur`.
3. Générer la vue illustrée depuis le référentiel et l'export Figma.
4. Remplacer par des liens les passages d'`AGENTS.md`, de la spécification de
   Palettes, de `CONCEPT.md` et des README qui recopient une définition.

Hors de ce chantier : le contrôle « full UCM » d'un `tokens.json` par
`ucm check` et la publication des descriptions de variables en
`$description`.

## Documents

| Document | Contenu |
|---|---|
| [PROMPT-AUDIT-CODEX.md](./PROMPT-AUDIT-CODEX.md) | La demande d'audit : toute donnée du concept partagée entre plugins et absente de la liste proposée |
| `AUDIT-REFERENTIEL.md` | Le rapport de Codex, à venir |
