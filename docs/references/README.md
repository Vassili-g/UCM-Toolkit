# Références des design systems et guides de composants

Ce dossier rassemble ce que les design systems du marché publient, pour deux
usages : fixer la nomenclature d'UCM et écrire le guide d'un composant avant de
le créer. La skill [`guide-composant`](../../.agents/skills/guide-composant/SKILL.md)
décrit la marche à suivre pour un guide.

## Les trois couches

| Couche | Emplacement | Contenu | Écrit par |
|---|---|---|---|
| Fichiers publiés | `design-systems/<système>/` | sources figées, `noms.json`, `valeurs.json` | `figer.mjs`, `recuperer.mjs`, `extraire.mjs` ; voir [son README](./design-systems/README.md) |
| Fiches par composant | `composants/` | `index.json`, puis `<id>/<système>.json` et `<id>/tokens.json` | l'agent `releveur` pour les fiches ; `guide.ts relever` pour `tokens.json` |
| Guides | `analyses/` | `<id>.json`, synthèse, et `<id>.html`, son rendu | la conversation principale pour le JSON ; `guide.ts rendre` pour le HTML |

`design-systems/` range les fichiers par système, parce qu'une version se fige
par paquet. `composants/` les regroupe par composant. `composants/index.json`
relie les deux : pour chaque composant, son nom local dans chaque système, la
page de sa documentation et les motifs qui trouvent ses tokens dans `noms.json`.

`systemes.json` liste les dix-huit références. Le champ `roles` dit ce qu'une
référence apporte au guide :

| Rôle | Apport |
|---|---|
| `tokens` | un dossier dans `design-systems/` |
| `composants` | une fiche par composant ; le système compte dans les « n sur m » |
| `comportement` | clavier, ARIA et interactions ; hors du compte « n sur m » |
| `redaction` | règles de libellé et de contenu |
| `nommage` | alias seulement |

Seuls huit systèmes ont le rôle `composants` : Material 3, Carbon, Fluent 2,
Spectrum, Atlassian, Polaris, Radix et Ant Design. `wai-aria-apg`, `react-aria`
et `govuk` reçoivent une fiche pour le comportement et la rédaction. Les autres
systèmes servent à la nomenclature et aux valeurs, sans fiche.

Une fiche relie ses tokens à une variante, un état et un rôle dans sa table
`tokens`. Cette table n'existe que pour les systèmes marqués `tableDeTokens`
dans `systemes.json` : Carbon, Material 3, Ant Design et Spectrum. Ce sont les
quatre qui publient des tokens de composant en fichier. Le nuancier du guide ne
compare que ces systèmes.

Les schémas des trois formes sont dans `_outils/` : `index.schema.json`,
`fiche.schema.json` et `guide.schema.json`. `gabarit.html` porte la coquille et
le CSS du guide.

## Licences

Le dépôt est public. Ces règles valent pour chaque fichier de ce dossier.

- Un fichier de tokens ou de code se copie seulement sous licence libre. Sa
  licence est figée avec lui dans `sources/`.
- La prose d'un site de documentation ne se copie pas. La fiche la paraphrase en
  français et donne l'URL de la page avec sa date de lecture. Une citation tient
  en une phrase, entre guillemets, et seulement quand le mot exact compte.
- Aucune capture ni image. La fiche donne le lien de la page.
- Les noms locaux restent dans la langue du système : `Content switcher`,
  `Segmented button`.
- `systemes.json` note la licence de la documentation, ou « non vérifiée ». La
  règle de paraphrase vaut pour toutes les licences, y compris l'Open Government
  Licence de GOV.UK et la licence du W3C, qui autoriseraient plus.

## Fraîcheur

| Donnée | Repère | Rafraîchir |
|---|---|---|
| Fichier publié | version ou commit exact, SHA-256 dans `sources.json` | sur décision du mainteneur : `figer.mjs`, `extraire.mjs`, puis `guide.ts relever --tous` et `guide.ts rendre --tous` |
| Fiche | date `lu` | `guide.ts etat` signale une fiche de plus de 12 mois ; la relire avant d'écrire le guide |
| Relevé et guide | rendu déterministe | `tests/referencesComposants.test.ts` refuse un `tokens.json` ou un HTML qui ne suit plus ses données |

Le HTML ne calcule aucun âge à partir de la date du jour : il resterait sinon
périmé d'un jour à l'autre. L'âge des fiches se lit avec `guide.ts etat`.

`guide.ts rendre` refuse une fiche lue plus de 12 mois avant la date du guide.
Pour la garder, le guide écrit la raison dans `absences`.

## Commandes

Depuis la racine du dépôt :

```sh
npx tsx docs/references/_outils/guide.ts etat "<nom>"     # ce qui existe pour un composant
npx tsx docs/references/_outils/guide.ts relever <id>     # écrit composants/<id>/tokens.json
npx tsx docs/references/_outils/guide.ts verifier <id>    # schéma et références des fiches
npx tsx docs/references/_outils/guide.ts rendre <id>      # valide analyses/<id>.json, écrit le HTML
```

`relever`, `verifier` et `rendre` acceptent `--tous` à la place d'un `id`.
`etat` cherche le nom dans l'`id`, le nom français et les noms locaux de
l'index.

`verifier` et `rendre` ajoutent aux schémas les contrôles suivants :

- chaque système cité existe dans `systemes.json` ;
- chaque fiche correspond à un alias non nul de l'index ;
- chaque token cité existe dans le `noms.json` du système ;
- chaque voisin existe dans l'index ;
- la prose passe `scripts/controle-style.mjs`.

Les tests de ce dossier tournent avec les tests racine :

```sh
node scripts/run-tests.cjs
```
