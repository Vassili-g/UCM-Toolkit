# Guide agent

Monorepo UCM : trois plugins Figma (exporteur de contrats et de tokens DTCG, Palettes, UCM Architect), le kit `@ucm-kit/core`, la CLI `@ucm-kit/cli`, l'adaptateur `@ucm-kit/adapter-typescript`, le moteur de couleur `ucm-couleur`, le Hub UCM et le socle des plugins.

Ce guide dit **ce que le produit garantit** et où le lire. [CONTRIBUTING.md](./CONTRIBUTING.md) dit **comment travailler**. Règle du produit → un fichier d'invariants ; règle de travail → `CONTRIBUTING.md`.

## Avant de modifier

1. `npm run agents:lire -- <chemins touchés>` : les fichiers à lire, et seulement eux. Lire le groupe que la tâche touche, pas les autres.
2. [CONCEPT.md](./CONCEPT.md) : responsabilités du modèle.
3. Forme publiée → [FORMAT.md](./docs/format/FORMAT.md) ; lecture de Figma par l'exporteur → [SPEC.md](./packages/plugin-exporter/SPEC.md) ; ce que les versions précédentes publiaient → [CHANGELOG-FORMAT.md](./docs/format/CHANGELOG-FORMAT.md), dès qu'une tâche touche à la compatibilité.
4. [CONTRIBUTING.md](./CONTRIBUTING.md) : règles de code et de test ; [Travailler avec des agents](./CONTRIBUTING.md#travailler-avec-des-agents) : `git status`, lots, vérifications.
5. `packages/kit/src/format/types.ts` et les tests voisins : forme concrète.

Skills, dans `.agents/skills/`, à charger :

| Avant de… | Skill |
|---|---|
| écrire une phrase, document ou commentaire | [`rediger-sans-tics-ia`](./.agents/skills/rediger-sans-tics-ia/SKILL.md) |
| écrire dans un fichier d'agent (ce guide, invariants, cartes, `CLAUDE.md`, définitions d'agents, skills) | [`rediger-pour-agents`](./.agents/skills/rediger-pour-agents/SKILL.md) |
| créer ou modifier un message destiné au designer | [`rediger-diagnostics-ucm`](./.agents/skills/rediger-diagnostics-ucm/SKILL.md) |
| reconstruire à froid un composant depuis son contrat (geste de recette du repository consommateur) | [`consommer-contrat`](./.agents/skills/consommer-contrat/SKILL.md) ; rangée ici, savoir du format : le repository de recette ne doit rien apprendre du produit |
| publier `@ucm-kit/core`, `@ucm-kit/cli` ou `@ucm-kit/adapter-typescript` | [`publier-paquets`](./.agents/skills/publier-paquets/SKILL.md) |
| écrire le guide d'un composant à créer, d'après les design systems du marché (« je veux créer un composant X, génère-moi un guide ») | [`guide-composant`](./.agents/skills/guide-composant/SKILL.md) |

Un commentaire se justifie seulement par un fait absent du code : décision, précondition, conséquence, limite. Six contrôles refusent le reste ; [CONTRIBUTING.md](./CONTRIBUTING.md#rédiger-un-document) les énumère.

Interface d'un plugin : lire d'abord [CONTRIBUTING.md](./CONTRIBUTING.md#interface-du-plugin) ; hiérarchie de l'information et protocole de relecture y font autorité ; la galerie des états rend chaque écran atteignable hors de Figma.

Maturité et priorités : [ROADMAP.md](./ROADMAP.md). Idées non décidées : [PISTES-EVOLUTION.md](./docs/notes/Recherches/Evolutions%20globales/PISTES-EVOLUTION.md).

## Routage

`.agents/domiciles.json` donne à chaque fichier de `packages/*/src/` un seul domicile : le motif le plus long l'emporte, à égalité le dernier. `npm run agents:domicile -- <chemin>` le rend. Chaque paquet a un guide, qui liste ses invariants, et une carte :

| Paquet | Guide | Carte |
|---|---|---|
| `plugin-exporter` | [AGENTS.md](./packages/plugin-exporter/AGENTS.md) | [CARTE.md](./packages/plugin-exporter/CARTE.md) |
| `kit` | [AGENTS.md](./packages/kit/AGENTS.md) | [CARTE.md](./packages/kit/CARTE.md) |
| `cli` | [AGENTS.md](./packages/cli/AGENTS.md) | [CARTE.md](./packages/cli/CARTE.md) |
| `adapter-typescript` | [AGENTS.md](./packages/adapter-typescript/AGENTS.md) | [CARTE.md](./packages/adapter-typescript/CARTE.md) |
| `couleur` | [AGENTS.md](./packages/couleur/AGENTS.md) | [CARTE.md](./packages/couleur/CARTE.md) |
| `hub` | [AGENTS.md](./packages/hub/AGENTS.md) | [CARTE.md](./packages/hub/CARTE.md) |
| `plugin-socle` | [AGENTS.md](./packages/plugin-socle/AGENTS.md) | [CARTE.md](./packages/plugin-socle/CARTE.md) |
| `plugin-palettes` | [AGENTS.md](./packages/plugin-palettes/AGENTS.md) | [CARTE.md](./packages/plugin-palettes/CARTE.md) |
| `plugin-architect` | [AGENTS.md](./packages/plugin-architect/AGENTS.md) | [CARTE.md](./packages/plugin-architect/CARTE.md) |
| reste du dépôt | ce guide | [CARTE.md](./CARTE.md) |

Codex lancé à la racine ne charge pas le guide d'un paquet : lire celui que la table désigne.

## Où écrire

Parcourir dans l'ordre ; s'arrêter à la première ligne qui convient.

| Information | Domicile |
|---|---|
| Forme d'un champ publié, sens de son absence | `docs/format/FORMAT.md` |
| Ce que l'exporteur lit dans Figma | `packages/plugin-exporter/SPEC.md` |
| Pourquoi d'un calcul ou d'un comportement de Palettes | [spec de Palettes](./docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) |
| Pourquoi d'une lecture d'Architect | `packages/plugin-architect/SPEC.md` |
| Règle tenue par le code : règle, borne, autorité, test | le fichier que rend `npm run agents:domicile -- <fichier autorité>` |
| Rôle d'un fichier source | son commentaire d'en-tête, et la ligne de la carte du paquet |
| Définition UCM : crans, modes, rôles, conventions | `packages/kit/src/referentiel/`, en code ([règle](./packages/kit/invariants/referentiel.md)) |
| Règle de travail : code, test, message, rédaction | `CONTRIBUTING.md` |
| Procédure qu'un agent exécute | une skill existante de `.agents/skills/` |
| Maturité, priorité, validation restante | `ROADMAP.md` |
| Recherche, plan, décision à prendre | le dossier existant de `docs/notes/Recherches/` qui traite le sujet |
| Aucune ligne ne convient | ne rien écrire ; rendre la question |

Un nouveau document, une nouvelle skill ou un nouveau dossier de recherche demande l'accord du mainteneur, qui l'ajoute au registre de `.agents/domiciles.json`. `tests/registreDesDocuments.test.ts` refuse un Markdown hors registre.

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

- Un plugin résout `@ucm-kit/core/*` vers `packages/kit/dist`. Construit seul, il embarquerait un kit périmé : son `build` compare une empreinte des sources du kit à `packages/kit/dist/.empreinte` et s'arrête en donnant la commande à lancer. Trois commandes racine construisent le kit d'abord, puis le paquet nommé ; un nom inconnu sort en erreur et liste les noms admis :

```sh
npm run build:plugin -- palettes      # palettes, architect, exporter
npm run galerie:plugin -- palettes    # les mêmes trois plugins
npm run test:paquet -- socle          # les trois plugins, socle, couleur, hub, cli, adapter
```

- Chaque paquet a son `scripts/run-tests.cjs` (`build/run-tests.cjs` dans le socle), qui découvre `tests/*.test.ts` et `tests/*.test.mjs` de son dossier. Tout bug corrigé reçoit un test de régression.
- `npm run cascade` charge la feuille des tokens dans Chromium, Firefox et WebKit, hors de `npm test`. Moteurs : `npx playwright install chromium firefox webkit` ; le job `cascade` de `ci.yml` le lance.
- `packages/kit/src/format/types.ts` changé → `npm run schema` : le schéma commité en est dérivé, et `packages/kit/tests/schema.test.ts` refuse une version périmée en la régénérant.
- `npm run vues` : reconstruit le kit si son empreinte a changé, puis régénère le hub, la planche du moteur et les données de la vue illustrée ; écrit seulement ce qui change. Le test de fraîcheur de chaque page échoue avec « La vue n'est plus à jour » tant qu'elle est périmée.
- `npm run agents:diff` : domiciles et documents liés à relire, vérifications à lancer, documents qui citent un chemin supprimé ou renommé.

### La frontière de recette

- **Tout ce qui précède se prouve ici, hors de Figma et hors des forges.** `npm test` couvre le moteur sur ses propres sorties, les lecteurs sur des contrats fabriqués, le CLI et l'adaptateur sur des fixtures, et `packages/cli/tests/` `recette.test.mjs` sur des repositories temporaires, dont le cas nominal n'a même pas de `package.json`. Aucun de ces tests n'ouvre un clone voisin.
- **Ce qui ne se prouve pas ici : Figma, une forge et une vraie demande de fusion.** Ils se rejouent dans [UCM-Playground](https://github.com/Vassili-g/UCM-Playground) pour GitHub, et dans le projet GitLab de recette pour GitLab. UCM-Playground est une application React sans script UCM à elle ; son empreinte du produit se limite aux huit fichiers qu'`ucm init` écrit et aux lignes qu'il demande d'ajouter, dont `@ucm-kit/cli` en `devDependencies`. La recette est donc probante : un contrôle qui manque là-bas se referme ici, jamais par un script rendu au consommateur. [docs/guides/RECETTE.md](./docs/guides/RECETTE.md) porte la marche à suivre, ses critères de fin et le geste de publication qui la suit.
- **Aucun contrôle ne réclame la recette, et `publish.yml` ne la mentionne pas.** Le numéro publié est gardé par `npm test`, l'épreuve du registre et le contrôle des pins servis. La rejouer est une décision du mainteneur.

## Limites d'environnement

- L'agent ne peut pas exécuter l'export dans Figma. Une validation runtime nécessite un réexport utilisateur.
- Le réseau du plugin est limité à `https://api.github.com` et `https://gitlab.com`.
- La configuration du dépôt est facultative ; toute erreur conserve un téléchargement local.
- Le plugin ouvre une demande de fusion par artefact et ne fusionne jamais automatiquement.

Avant de terminer une modification : `npm run agents:diff`, relire les documents listés, retirer toute description devenue fausse ou dupliquée.
