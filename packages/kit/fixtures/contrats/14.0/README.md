# Corpus 14.0 figé, le jeu N-1 du passage en 15.0

Ces deux contrats sont un **instantané assumé**, et c'est la seule chose qui
les rend utiles.

## Pourquoi ils existent

Quand le moteur passera en 15.0, la fenêtre de lecture portera la 15.0 et la
14.0 ([COMPATIBILITE.md](../../../../../docs/format/COMPATIBILITE.md)). Le moteur
ne fabriquera plus que la 15.0 : la 14.0 ne sera observable qu'à partir de
contrats que plus rien ne sait produire. Ce corpus les fige avant le passage,
pour que les lecteurs puissent les relire en N-1.

## Ce qu'ils ne sont pas

Ils ne testent pas le moteur. Les [invariants des tests du moteur](../../../../plugin-exporter/invariants/tests-du-moteur.md)
interdisent qu'un contrat commité serve à ça : un instantané ne bouge qu'au réexport, si bien qu'une régression du moteur
ne s'y verrait jamais. Seuls les **lecteurs** les lisent.

Ils ne sont pas non plus une source à rafraîchir. **Un réexport les rendrait
inutiles** : ils cesseraient d'être N-1. Aucun test ne les lit encore ; le lot 5.9
de [PLAN-P22.md](../../../../../docs/notes/Recherches/Pièces%20internes/PLAN-P22.md) les branchera.

## Provenance

Le Playground est encore en 13.0 : ces contrats n'en viennent pas. Le moteur
14.0 de ce dépôt les a produits, le 2026-11-28, en rejouant l'export sur deux
captures du plugin Architect prises le 2026-11-25 dans le fichier de test
« UCM Tests - Composants ». Les captures restent hors du dépôt (`_local/recettes/`).

- Moteur : commit `cf9dc9a5` de `main`, kit `@ucm-kit/core` 0.18.8, `contractVersion` 14.0.
- Rejeu : le chargeur de capture d'Architect (`doubleDepuisCapture`) et `analyserLeComposant`, qui appelle l'export du contrat.
- Lecteurs : chaque contrat passe `champsInvalidesDuContrat`, `vueExacteDuVariant`, `validerGrapheDesContrats` et `validerAdressesDEchantillons` sans refus, comme `tests/fenetre-de-lecture.test.mjs` le demande pour la 13.0. `tests/refus-enregistres.test.mjs` les mesure déjà avec les autres jeux figés ; `tests/fenetre-de-lecture.test.mjs` les lira quand la 15.0 deviendra la version courante (lot 5.9 du plan de P22).
- `Button` pose `.Ring` et `Icon` : le graphe se lit sans le contrat d'`Icon`, qui n'est donc pas dans le corpus.
- `Alert` sort avec un avertissement d'export : la règle `@prop « severity »` ne trouve pas de propriété de variante de ce nom dans la capture. Le contrat est valide.

| Contrat | Capture | Date de capture |
|---|---|---|
| `Alert.contract.json` | `alert-2026-11-25.json` | 2026-11-25 |
| `Button.contract.json` | `button-2026-11-25.json` | 2026-11-25 |

Les fichiers sont écrits en LF, comme le moteur les sérialise
(`packages/plugin-socle/src/composant/contract/serializeJson.ts`).

Empreintes SHA-256, pour constater qu'ils n'ont pas été retouchés (`sha256sum
*.contract.json`) :

```text
51951ba4c4a6ce939a888a0d773ca52bd6f24146ec42e2eedfa0971b658c61bc  Alert.contract.json
b438dfbe451e94fd4226b416388d8d79f7f1cca6dda3022612bd24a1b07ca96a  Button.contract.json
```

## Cycle de vie

Ce dossier vit tant que la fenêtre de lecture inclut la 14.0. Il disparaît quand
elle se referme au-dessus, au même moment que le code de compatibilité qu'il
couvre, jamais avant.
