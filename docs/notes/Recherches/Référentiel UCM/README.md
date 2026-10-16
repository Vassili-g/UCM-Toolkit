# Référentiel UCM

Chaque définition du concept UCM existe une seule fois, comme donnée
TypeScript pure de `@ucm-kit/core`. Les plugins, le CLI et les pages générées
l'importent. Les documents décrivent ces données et y renvoient, sans les
recopier.

**État :** audit fait ([AUDIT-REFERENTIEL.md](./AUDIT-REFERENTIEL.md)),
décisions prises, [plan par lots](./PLAN-IMPLEMENTATION.md) prêt à démarrer
au lot 1. Le fichier Figma se met à jour avec la v1 d'UCM Architect
(phase 2 du plan).

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
| Export d'un état toléré | L'exporteur publie le nom écrit dans Figma et avertit le designer du terme retenu |
| Crans | Onze, de 50 à 950 ; 1000 et 1050 restent une option du moteur de Palettes |
| Familles des collections | Une liste par défaut dans le kit, qu'un design system peut étendre |
| `scale/{cran}` | Exposé pour toutes les palettes |
| Textes du neutre | `page/foreground-main` et `page/foreground-subtle` restent dans le référentiel |
| Icônes | Même seuil que le texte, 4,5 : elles prennent la couleur du texte |
| Élévation | Le référentiel nomme les niveaux ; le moteur calcule leurs couleurs |
| `layouts` et `typography` | Catalogués ; leur contrôle viendra avec l'Architect |
| Grammaire de `components` | Reportée jusqu'à la correction des composants dans Figma |
| Échange entre plugins | L'adresse `ucm_palettes`/`recette` entre dans le référentiel |
| Tags et libellés | Les tags des règles d'usage et les libellés des variables de `theme` entrent dans le référentiel |
| Recommandations de design | Anneau de focus à 2 px de fond puis 2 px de trait ; bouton basculable en `surface` au repos, en `solid` activé |
| Planche du moteur | Une page générée compare les palettes du moteur à celles de Tailwind 3.4, Soft et Vivid, Light et Dark ; elle vit dans `packages/couleur/planche/` et un test la tient à jour |
| Renommages dans Figma | Trop nombreux pour être faits à la main : la v1 d'UCM Architect les propose et les applique (phase 2 du plan) |
| Texte des boutons en Dark | Blanc, dans le fichier Figma comme dans Palettes |
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
| [AUDIT-REFERENTIEL.md](./AUDIT-REFERENTIEL.md) | Le rapport de Codex : 60 données classées, contradictions, écarts entre la vue et le kit |
| [PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md) | Les lots, leurs agents et leurs critères de fin |
