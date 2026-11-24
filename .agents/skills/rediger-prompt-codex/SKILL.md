---
name: rediger-prompt-codex
description: "Écrire le prompt d'une tâche confiée à Codex (lot, chasse aux défauts, relecture) avec la méthode du dépôt, le journal tenu au fil de l'eau et les interdits. Charger dès que le mainteneur demande un prompt pour Codex."
---

# Rédiger un prompt pour Codex

Codex ne voit ni la conversation ni les comptes rendus des agents. Le prompt contient tout, et les hooks de Claude Code ne le protègent pas : chaque interdit s'écrit en clair.

## 1. Où ranger le prompt

- `_local/<sujet>/PROMPT-CODEX.md`, ignoré par Git. Le journal de Codex vit à côté : `_local/<sujet>/JOURNAL-CODEX.txt`.
- Le chemin se donne au mainteneur, qui lance Codex.
- Codex part sur un arbre stable : aucun agent ne commite ni ne publie dans les mêmes paquets pendant son travail. Une publication en cours se finit avant.

## 2. Sections du prompt, dans cet ordre

1. **But.** La tâche en deux phrases, et ce qui la termine.
2. **À lire.** `AGENTS.md` racine en entier. Codex lancé à la racine ne charge pas le guide d'un paquet : il lit `packages/<paquet>/AGENTS.md`, sa `CARTE.md` et ses `invariants/` avant d'y toucher. `CONTRIBUTING.md`, section « Travailler avec des agents ». Le plan, la liste ou la note de la tâche, par leur chemin.
3. **Périmètre.** Commits (`git log <de>..<à>`), fichiers, paquets. Ce qui est hors du périmètre.
4. **Ce qui est déjà fait.** Défauts corrigés ou lots livrés, avec leur hash, pour que Codex ne les refasse ni ne les défasse. État courant : `git log --oneline -5`, `git status`, publication en cours (`gh run list --workflow publish.yml --limit 3`).
5. **Priorité.** Une liste numérotée, dans l'ordre où Codex travaille, avec pour chaque entrée les fichiers et l'hypothèse ou le critère.
6. **Méthode du dépôt** (section 3 ci-dessous), recopiée telle quelle.
7. **Journal** (section 4), recopié tel quel, avec le chemin du journal.
8. **Interdits** (section 5), recopiés tels quels, plus ceux de la tâche.
9. **Fin** (section 6).

## 3. Méthode du dépôt, pour chaque modification

1. Avant de modifier un fichier : `npm run agents:lire -- <chemins>`, puis lire les fichiers listés.
2. Un défaut se reproduit d'abord par un test qui échoue, dans le paquet du code, nommé d'après le cas. Puis la correction, au plus près de la règle, avec une seule source : une règle recopiée devient un appel à son propriétaire. Un défaut non reproduit reste un doute, sans correction.
3. Tests du paquet touché : `npm run test --workspace @ucm-kit/core` (kit), `npm run test:paquet -- <nom>` (`cli`, `adapter`, `socle`, `couleur`, `palettes`, `architect`, `exporter`), `node scripts/run-tests.cjs` (racine). Puis `npm run typecheck`. Le test de durée d'Architect « sans balayage de paires » peut échouer sous charge : relancer le paquet seul une fois.
4. Avant le commit : `npm run agents:diff`. Mettre à jour chaque document qu'il désigne dont une phrase est devenue fausse, et lancer les vérifications qu'il liste. `node scripts/controle-style.mjs <fichier>` sur un document modifié. `npm run vues` quand le test de fraîcheur de l'inventaire le demande.
5. Commit : `git add <chemins explicites>`, `git commit` avec un message en français qui dit le défaut ou le lot et sa correction, `git push origin main`. Un commit par défaut ou par lot. Pas de branche. Fins de ligne LF.
6. Une décision de produit (ce que voit le designer, une règle de blocage, la prise `@ucm-kit/core/modules`) ne se tranche pas : elle devient une question au mainteneur, avec une recommandation.

## 4. Journal, tenu au fil de l'eau

Codex crée `JOURNAL-CODEX.txt` avant son premier geste et le tient à jour après chaque push, pas seulement à la fin : un autre agent reprend depuis ce fichier si Codex s'arrête.

- Section « Avancement » : les numéros de la priorité et leur état (à faire, en cours, fait), mise à jour à chaque changement d'état.
- Une entrée par défaut ou par lot, écrite dès qu'elle est établie, complétée au commit :

```text
C1. <titre court>
  Symptôme : <ce qui se passe, avec l'entrée qui le provoque>.
  Cause : <fichier, fonction, ligne, et pourquoi>.
  Test : <fichier et nom du test qui échoue sans la correction>.
  Correctif : <ce qui change>.
  Hash : <commit>.
  État : corrigé | en cours | question au mainteneur.
```

- Section « Doutes non prouvés » (D1, D2…) : l'hypothèse et ce qui la trancherait.
- Section « Questions au mainteneur » (Q1, Q2…) : chacune avec une recommandation.

## 5. Interdits

- Jamais `npm run test:ui` ni `npm run galerie:captures` : la clé `interdits` de `.agents/domiciles.json` les réserve au mainteneur.
- Rien dans `.claude/`, `CLAUDE.md`, ni dans un dépôt voisin (UCM-Playground) sans demande du mainteneur écrite dans le prompt.
- Aucune donnée d'un fichier client, ni son nom, dans un fichier suivi : le dépôt est public. Les fichiers client vivent dans `_local/` ou sont ignorés par `.gitignore`.
- Aucune montée de version ni publication : Codex nomme les paquets publiables changés, la publication suit `publier-paquets`.
- Jamais `git add -A` ni `git add .` : une autre session peut travailler dans le même arbre.
- Le style du bloc « Écrire » d'`AGENTS.md` s'applique aux messages de commit et au journal.

## 6. Fin

Le journal se termine par : les paquets publiables changés et la nature du changement (interne, ou prise des modules) ; le résultat de `npm run build`, `npm run test --workspaces --if-present`, `node scripts/run-tests.cjs` et `npm run typecheck` ; ce qui reste, dans l'ordre de la priorité.

## 7. Après Codex

La conversation principale lit le journal, coche dans le plan chaque lot que Codex a commité avec son hash, et reprend par des agents Claude les entrées restantes si Codex s'arrête (absence de nouveau commit, fichiers modifiés non commités). Elle relit chaque correction avant une publication.
