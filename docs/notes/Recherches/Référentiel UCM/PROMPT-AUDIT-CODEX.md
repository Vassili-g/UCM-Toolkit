# Demande d'audit du référentiel

Prompt à donner à Codex. Le rapport attendu est
`docs/notes/Recherches/Référentiel UCM/AUDIT-REFERENTIEL.md`.

```text
Audit en lecture seule : inventaire des définitions UCM à réunir dans un référentiel unique du kit

Contexte
Le mainteneur veut que chaque définition clé du concept UCM existe une seule fois, comme donnée
TypeScript pure dans `@ucm-kit/core`, et que les plugins, le CLI et les pages générées l'importent
au lieu de la recoder. La documentation peut décrire ces définitions, mais ne les porte pas.
L'architecture des tokens de `docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html`
(données : `donnees-vue-illustree.js`) devient l'architecture de référence UCM.
Décisions déjà prises : les termes UCM sont `pressed` et `disabled`, les variantes `press` et
`disable` restent tolérées à la lecture ; le rôle de chaque plugin devient une donnée du kit.
Le principe et le contenu proposé sont dans `docs/notes/Recherches/Référentiel UCM/README.md`.

Le référentiel proposé, dans `packages/kit/src/referentiel/` (il regroupe l'actuel `emplois`) :
- crans.ts : crans 50 à 950, modes light/dark, profils soft/vivid ;
- theme.ts : l'actuel `dossiers.ts` (table des dossiers solid/surface/page, ring, sens normal/inversé,
  texte des boutons, crans requis, élévation, variables globales disabled) ;
- garanties.ts et contraste.ts : les actuels, avec une seule autorité pour G1 à G7 ;
- collections.ts : les collections (components, theme, color-brands, color-utilities, primitives,
  layouts, typography), leur ordre, les alias permis entre elles, la forme de leurs chemins,
  leurs axes de modes (marques, thèmes) ;
- vocabulaire.ts : états reconnus et variantes tolérées, tailles, statuts (success, warning, info,
  danger, neutral), rôles (foreground, border, divider, ring) ;
- produits.ts : chaque plugin et paquet, ce qu'il écrit, ce qu'il lit, où il écrit.
Chaque entrée porte un identifiant, un libellé en français et en anglais, et une définition d'une phrase.

Ta tâche
Vérifier que cette liste n'oublie rien. Cherche toute donnée qui remplit au moins une condition :
(a) elle définit le concept UCM ou l'architecture de référence ;
(b) au moins deux paquets la lisent ou la recodent (plugins, couleur, kit, cli, adapter) ;
(c) elle est écrite en dur dans un plugin alors qu'elle décrit une convention UCM.

Pistes à vérifier, sans t'y limiter :
- les données partagées entre plugins dans le document Figma : l'espace `ucm_palettes`, les clés de
  `setSharedPluginData`, la recette que l'explorateur relit ;
- la recette de Palettes : format, seuils `texte` et `nonTexte`, réglages qui touchent l'architecture
  (fond de page, carte, texte des boutons) ;
- la destination par défaut de Palettes (`primitives` / `colors`) et la détection des chemins
  (`variables/detection.ts`) ;
- les listes écrites en dur : `['soft','vivid']`, `['light','dark']`, les crans, les noms de collections,
  `STATE_SELECTORS`, `STATE_AXIS_NAMES`, `SIZE_VALUES`, `COUCHES`, `CIBLES_DES_COUCHES` ;
- les familles de palettes de la référence (identity, primary, secondary, statuts, neutral, elevation)
  et la structure de `color-brands`, `color-utilities`, `layouts` et `typography` ;
- les tags des règles d'usage (`.componentRules`), les valeurs par défaut de `ucm.config.json`,
  la grammaire de la collection `components` ;
- les libellés affichés au designer qui nomment un concept UCM (noms des modes, dossiers, états)
  dans les catalogues `i18n` ;
- les extensions de `tokens.json` (`com.ucm.axes`, `com.ucm.modes`) : dis si elles relèvent du
  référentiel ou du format (`docs/format/FORMAT.md`).

Pour chaque donnée trouvée, indique :
1. ce qu'elle définit, en une phrase ;
2. où elle vit aujourd'hui (fichier:ligne) et quels paquets la lisent ou la recodent ;
3. si elle est dupliquée ou contradictoire ailleurs (code, AGENTS.md, spécifications, vue illustrée),
   avec les deux emplacements ;
4. son classement : « déjà dans la liste proposée », « manque au référentiel », « relève de FORMAT.md
   ou d'une SPEC », « propre à un seul plugin, à laisser en place » ;
5. pour « manque au référentiel », le fichier du référentiel qui l'accueillerait.

Sépare aussi :
- les écarts entre la vue illustrée et le code du kit (noms, crans, variables présentes d'un côté seulement) ;
- les points qui demandent une décision du mainteneur, sous forme de question, sans les trancher.

Contraintes
- Lecture seule : ne modifie ni le code, ni les documents existants, ni les tests. Ne commite rien.
- Seul fichier à créer : `docs/notes/Recherches/Référentiel UCM/AUDIT-REFERENTIEL.md`.
- Ignore `node_modules`, `dist` et `docs/notes/Archives/`.
- Lis le code pour établir chaque affirmation et cite le fichier et la ligne. Une donnée vue seulement
  dans un document est signalée comme telle.
- Ne rédige pas le contenu du référentiel (pas de définitions finales) et ne choisis rien à la place
  du mainteneur.
- Rédige en français, selon `.agents/skills/rediger-sans-tics-ia/SKILL.md`.

Format du rapport
1. Résumé : nombre de données trouvées par classement, et les trois manques les plus importants.
2. Tableau principal, groupé par fichier cible du référentiel.
3. Contradictions et doublons.
4. Écarts entre la vue illustrée et le kit.
5. Questions pour le mainteneur.
```
