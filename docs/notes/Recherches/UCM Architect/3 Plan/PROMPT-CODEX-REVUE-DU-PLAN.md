# Prompt : revue critique du plan de Architect par Codex

Le mainteneur colle le texte ci-dessous dans Codex, lancé à la racine du dépôt.

---

Tu fais la revue critique d'un plan d'implémentation. Tu ne modifies aucun
fichier du dépôt, sauf le fichier de sortie nommé à la fin. Tu ne commites
rien.

## Le plan

`docs/notes/Recherches/UCM Architect/3 Plan/PLAN-IMPLEMENTATION.md`, à la
version du commit `9ab1ee40`. Lis cette version : `git show
9ab1ee40:"docs/notes/Recherches/UCM Architect/3 Plan/PLAN-IMPLEMENTATION.md"`.
Une autre revue tourne en parallèle ; ne lis aucun fichier `REVUE-*` de ce
dossier.

Le plan fusionne UCM Token Explorer (`packages/plugin-architect`) et UCM
Nomenclature (`packages/plugin-nomenclature`) en un plugin, UCM Token
Architect, et lui ajoute un mode Composant qui contrôle et corrige les
liaisons de variables d'un composant.

## À lire avant de juger

1. `AGENTS.md`, puis les guides des paquets touchés : `packages/plugin-exporter/AGENTS.md`,
   `packages/plugin-architect/AGENTS.md`, `packages/plugin-nomenclature/AGENTS.md`,
   `packages/plugin-socle/AGENTS.md`, `packages/kit/AGENTS.md`. Codex lancé à
   la racine ne les charge pas seul.
2. `CONTRIBUTING.md`, sections « Travailler avec des agents », « Interface du
   plugin » et « Tests ».
3. Dans `docs/notes/Recherches/UCM Architect/` :
   `PREPARATION-ARCHITECT.md` (fonctions C1 à C79, T1 à T14, G1 à G8 ;
   contraintes en section 3 ; décisions en section 8),
   `GRAMMAIRE-DES-COMPOSANTS.md`, `APERCU-GENERATION-TOKENS-COMPOSANT.md`.
4. Le code que le plan cite, pour vérifier chaque affirmation :
   `packages/plugin-exporter/src/contract/`, `src/template/`, `src/variables.ts`,
   `tests/aides/figmaFaux.ts`, ses invariants et son `SPEC.md` ;
   `packages/plugin-socle/` (carte, invariants, build, imports par les
   plugins) ; `packages/plugin-architect/` (invariants, `src/code.ts`,
   `src/lectureDuComposant.ts`, onglets, préférences, galerie) ;
   `packages/plugin-nomenclature/` (invariants, `src/code.ts`,
   `src/session.ts`, `src/ecriture.ts`, `src/ui/`, galerie) ;
   `scripts/construire-plugin.mjs` ; `.github/workflows/` ;
   `.agents/domiciles.json` ; `packages/kit/src/referentiel/architecture.ts`
   et `vocabulaire.ts`.

## Décisions prises, à ne pas rediscuter

- Le plugin garde l'identifiant de manifeste de l'explorateur.
- Contrôles et corrections seulement dans un fichier qui déclare
  l'architecture UCM ; ailleurs, la navigation seule.
- Le plugin écrit dans le document.
- Une correction n'est proposée que si une règle écrite la tire d'un fait lu
  dans Figma, avec un seul candidat. Le reste devient une question sans
  réponse cochée.
- Les corrections suivent le modèle et l'interface de Nomenclature, dans une
  barre latérale à droite.
- Les contrôles de l'export sont partagés entre l'exporteur et Token
  Architect, sans copie.
- Les maquettes passent avant l'interface.
- Le mainteneur lance seul les tests d'interface (Chromium) et les recettes
  Figma. Il fait seul les migrations de son fichier Figma.
- Les composants et les tokens vivent dans deux fichiers Figma : côté
  composants, les variables viennent d'une bibliothèque.

Le mainteneur veut un plan sans faille d'exécution, et il refuse l'usine à
gaz. Quand une solution est lourde, la plus simple qui suffit doit être
proposée, et l'option lourde lui revient comme décision.

## Ce que tu cherches

- Une affirmation du plan fausse sur le code.
- Un ordre faux : un lot qui a besoin d'un résultat produit plus tard.
- Un critère de fin qu'un agent ne peut pas vérifier, ou qui laisse passer un
  défaut.
- Un lot trop gros pour un seul agent, ou mal découpé.
- Un risque oublié. Exemples à examiner : sessions concurrentes ; loi du
  document intact de l'exporteur ; loi d'écriture de Nomenclature et
  protection des variables de Palettes ; `ESPACE_ARCHITECT` ; `clientStorage`
  lié à l'identifiant du plugin ; scripts et CI qui listent les plugins par
  nom ; galerie et `test:ui` ; registre des documents ; cartes, guides et
  invariants à créer ou déplacer ; publication du kit et tests racine ;
  taille des bundles, y compris celui de Palettes si le socle grossit ;
  performance d'une lecture de tous les variants ; permission `teamlibrary`
  et bibliothèque non activée ; effet d'un `importVariableByKeyAsync` sur le
  fichier ; `figma.commitUndo` ; renommer une valeur de variante d'un jeu
  publié.
- Un choix trop lourd là où un plus simple suffit.
- Un choix trop léger, qui cassera à l'exécution.
- Une fonction décidée dans le document préparatoire qui manque au plan ou y
  est mal placée.
- La décision A du plan, le moteur de l'exporteur dans le socle plutôt que
  dans le kit : juste ou non, et avec quels effets de bord.

Vérifie chaque fait dans le code avant de l'affirmer. Distingue ce qui est
vérifié de ce qui est déduit.

## Sortie

Écris un seul fichier :
`docs/notes/Recherches/UCM Architect/3 Plan/REVUE-CODEX-DU-PLAN.md`.

Structure :

1. `# Revue du plan de Architect par Codex`, puis une phrase qui
   nomme le commit relu.
2. `## Défauts`, un tableau classé du plus grave au moins grave, colonnes :
   `#` (R1, R2…), `Gravité` (bloquant, majeur, mineur), `Lot`, `Défaut`,
   `Preuve` (chemin et ligne, ou fait vérifié ; « déduit » sinon),
   `Conséquence`, `Correction proposée`.
3. `## Manques`, une liste courte de ce qu'il faut ajouter pour qu'un agent
   exécute chaque lot sans retour en arrière.
4. `## En trop`, ce qui devrait sortir du plan ou être simplifié.
5. `## Verdict`, cinq lignes au plus.

Règles d'écriture : français ; une idée par phrase ; aucun tiret cadratin en
incise ; pas de capitales d'emphase ; pas de qualificatif sans preuve. La
skill `.agents/skills/rediger-sans-tics-ia/SKILL.md` fait autorité. Avant de
finir, lance `node scripts/controle-style.mjs "docs/notes/Recherches/Token
Architect v2/REVUE-CODEX-DU-PLAN.md"` et corrige jusqu'à « Style conforme ».
2 500 mots au plus.
