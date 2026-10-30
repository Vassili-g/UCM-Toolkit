---
name: guide-composant
description: "Écrire le guide d'un composant d'après les design systems du marché, avant de le créer dans UCM. Charger quand le mainteneur dit « je veux créer un composant X, génère-moi un guide » ou « génère un guide pour le composant X ». Vaut pour n'importe quel composant."
---

# Guide d'un composant

Rend `docs/references/analyses/<id>.html` : quinze sections qui comparent ce que
les systèmes de `docs/references/systemes.json` publient pour un composant.
Couches, licences, fraîcheur et commandes : [docs/references/README.md](../../../docs/references/README.md).

`guide.ts` désigne `npx tsx docs/references/_outils/guide.ts`, lancé depuis la racine.

## Étapes

| n° | Étape | Qui |
|---|---|---|
| 1 | `guide.ts etat "<nom>"` : cherche le nom dans l'index (`id`, nom français, noms locaux) ; liste les fiches présentes, absentes ou de plus de 12 mois, l'état du relevé et du guide | script |
| 2 | Composant absent de l'index : écrire son entrée dans `composants/index.json` ; voir « Entrée de l'index » | conversation principale |
| 3 | `guide.ts relever <id>` : écrit `composants/<id>/tokens.json` | script |
| 4 | Fiches absentes ou de plus de 12 mois : deux agents `releveur` au plus, chacun avec la moitié des systèmes ; chacun lance `guide.ts verifier <id>` | `releveur` (Sonnet) |
| 5 | Source de composant utile et absente : l'ajouter à `design-systems/_outils/figer.mjs` avec `usage: "composant"`, puis `recuperer.mjs`, `extraire.mjs`, `guide.ts relever <id>` ; jamais un fichier non figé | conversation principale |
| 6 | Lire toutes les fiches, `tokens.json` et `design-systems/ucm/registres.json` ; écrire `analyses/<id>.json` ; voir « Synthèse » | conversation principale |
| 7 | `guide.ts rendre <id>` : schéma, références croisées, tokens existants, style ; écrit le HTML ou liste les erreurs | script |
| 8 | Tests racine par un `verificateur` ; montrer le HTML au mainteneur ; commiter par chemins | `verificateur`, puis conversation principale |

## Entrée de l'index

- `id` : nom anglais en kebab-case, forme des composants d'UCM.
- `definition` : une phrase en français.
- `voisins` : des `id` de l'index. Un voisin absent s'ajoute avec `id`, `nom`, `definition`, `voisins` et `systemes: {}`.
- `systemes` : une clé par système vérifié.
  - Alias `{ nom, url }`, `note` si le système n'a qu'un motif proche (`wai-aria-apg`).
  - `null` : le système n'a pas ce composant, vérifié sur sa documentation.
  - Clé absente : pas encore vérifié. Le guide l'affiche « non vérifié ».
- `motifs` : seulement pour un système au rôle `tokens`. Expressions ancrées sur les noms de `design-systems/<système>/noms.json`, trouvées par `Grep` dans ce fichier. Un motif large prend du bruit : `button` trouve aussi `md.comp.date-picker-docked.menu-button-*`.
- `guide.ts verifier <id>` refuse un motif qui ne trouve aucun nom.

## Systèmes qui reçoivent une fiche

- Rôle `composants` (comptent dans « n sur m ») : `material-3`, `carbon`, `fluent-2`, `spectrum`, `atlassian`, `polaris`, `radix`, `ant-design`.
- Comportement et rédaction (hors compte) : `wai-aria-apg`, `react-aria`, `govuk`.
- Aucun autre système : `primer`, `figma-sds`, `shadcn`, `mui`, `untitled-ui`, `tailwind` n'apportent que noms et valeurs ; `open-ui` seulement un alias.
- Table `tokens` d'une fiche : seulement pour les systèmes marqués `tableDeTokens` (`carbon`, `material-3`, `ant-design`, `spectrum`). `verifier` refuse les autres.

## Prompt d'un `releveur`

Contient l'`id`, la liste de ses systèmes, l'entrée de l'index et la partie de `tokens.json` de ces systèmes. Rien d'autre.

## Synthèse

`analyses/<id>.json` suit `docs/references/_outils/guide.schema.json`. Champs : `gabarit`, `composant`, `date`, `absences` (facultatif), puis une clé par section rédigée.

| n° | Ancre | Contenu | Origine |
|---|---|---|---|
| 1 | `entete` | nom, `id`, date, gabarit, nombre de fiches, plus ancienne lecture | script |
| 2 | `definition` | résumé, quand l'utiliser, voisin et critère de choix | agent ; voisins de l'index |
| 3 | `noms` | nom local et lien par système ; « absent » ou « non vérifié » | script |
| 4 | `anatomie` | parties, obligatoire ou facultative | agent ; « n sur m » par le script |
| 5 | `variantes` | emphase, statut (registre des statuts), tailles ; nom local de chacune | agent ; hauteurs depuis les fiches |
| 6 | `etats` | les six états du registre (`default`, `hover`, `focus`, `pressed`, `disabled`, `selected`) toujours, plus les états propres ; ce qui change | agent ; liste imposée par le schéma |
| 7 | `clavier` | touches et effets, focus, interactions (appui, double envoi, chargement) | agent, depuis `wai-aria-apg`, `react-aria`, `govuk` |
| 8 | `accessibilite` | rôle et attributs ARIA, nom accessible ; seize critères WCAG 2.2, chacun `sApplique`, exigence, pratique relevée | agent ; liste imposée par le schéma |
| 9 | `redaction` | libellé, casse, longueur, texte long, traduction, sens de lecture | agent, depuis `govuk`, `polaris`, `carbon`, `atlassian` |
| 10 | `tokens` | relevé et nuancier comparé ; `proposition` de tokens UCM en segments | relevé et nuancier : script ; proposition : agent |
| 11 | `choix` | question, options, option de chaque système | agent ; « n sur m » par le script |
| 12 | `rappels` | par catégorie : `regle`, `etat`, `comportement`, `accessibilite`, `redaction`, `tokens` ; chaque point cite au moins un système | agent |
| 13 | `exemples` | zéro à trois idées propres à un système, en texte, avec l'URL de leur source ; aucune esquisse de code | agent |
| 14 | `questions` | question, options, ce qui en dépend ; au moins une | agent |
| 15 | `sources` | fiches et dates ; fichiers de tokens, version, SHA-256 ; version du kit | script |

- Section sans objet : `{ "sansObjet": "<raison>" }`. Sauf `exemples` et `questions`.
- Un point, une partie ou une option cite les systèmes par `id`. `m` = systèmes au rôle `composants` qui ont une fiche ; un système de `m` non cité apparaît « non documenté ».
- Une idée tenue par plusieurs systèmes est un choix : section 11, pas 13.
- `proposition` : chaque nom commence par `components/<id>/`. `rendre` signale un segment d'état, de rôle, de statut ou de taille absent de `ucm/registres.json` ; le signalement ne bloque pas.
- Fiche absente ou de plus de 12 mois avant `date` : une entrée `absences` avec sa raison, sinon `rendre` refuse.
- Texte en français, paraphrasé ; noms locaux dans la langue du système.

## Interdits

- Copier la prose d'une page ; joindre une capture.
- Écrire une valeur de couleur, un contraste ou un compte « n sur m » à la main : le script les calcule.
- Éditer `tokens.json` ou un HTML de `analyses/` à la main.
- Trancher une question à la place du mainteneur : section 14.

## Critères de fin

- `guide.ts rendre <id>` sort sans erreur.
- `tests/referencesComposants.test.ts` passe.
- Chaque système d'alias non nul a une fiche de moins de 12 mois, ou une raison dans `absences` (affichée en section 15).
- Chaque section est remplie ou porte `sansObjet`.
- La section 14 a au moins une question.
