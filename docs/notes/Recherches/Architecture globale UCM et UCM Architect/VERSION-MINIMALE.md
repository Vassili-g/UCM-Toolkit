# Version minimale

**Statut :** direction retenue par le mainteneur pour répondre à la demande
initiale sans nouveau plugin. Les autres documents du dossier deviennent des
pistes pour plus tard ; ils ne sont pas supprimés.

Lecteur : le mainteneur et l'agent qui reprend le chantier. Cette page se lit
en premier.

## La demande

Repérer les incohérences de noms dans les variables d'un design system,
s'accorder sur une nomenclature de base, vérifier ensuite les écarts, et
savoir quel outil UCM fait quoi.

## La réponse

| Besoin | Réponse | Où |
|---|---|---|
| Une nomenclature de base | Un fichier de conventions facultatif, dans le dépôt, à côté de `ucm.config.json` : les seuls termes que l'équipe veut unifier (`pressed` plutôt que `press`) et la casse | Dépôt consommateur |
| Vérifier les écarts | `ucm check` lit ce fichier et signale chaque écart en information ; l'exporteur, qui lit déjà le dépôt, montre les mêmes écarts avant l'export des tokens | Kit, CLI, exporteur |
| Les incohérences sans règle déclarée | Les relevés de forme mesurés comme exacts : mots soudés, séparateurs, flexions côte à côte (`hover`, `hovered`). Pas de détection de synonymes : trop bruyante sans jugement humain | Kit, CLI, exporteur |
| La définition des crans pour les agents | Le designer écrit la description d'une variable dans Figma, où elle s'affiche en infobulle ; l'export des tokens la publie en `$description` | Figma, exporteur |
| L'onglet Intégrations de l'explorateur | Retiré (décision prise) | Explorateur |
| Les contradictions relevées | L'exporteur ne recommande plus `press` ni `disable` dans son message d'état inconnu, et reconnaît l'état `selected` | Exporteur |

## Le rôle de chaque produit

| Produit | Rôle |
|---|---|
| UCM Palettes | Créer les palettes de couleurs et les écrire en variables |
| UCM Token Explorer | Expliquer une architecture de tokens, quelle qu'elle soit, en lecture seule |
| UCM Contract Exporter | Analyser un composant, publier contrats et tokens, prévenir des écarts avant publication |
| `@ucm-kit/core` et `@ucm-kit/cli` | Porter les règles et les appliquer dans le dépôt |

Aucun nouveau plugin. Le fichier de conventions est facultatif : sans lui,
les outils fonctionnent comme aujourd'hui, ce qui respecte les deux
périmètres voulus par le mainteneur (agnostique par défaut, conventions UCM
sur demande).

## Ce qui reste pour plus tard

Le plugin d'architecture, le hub d'adoption, la génération de `theme`, les
deux périmètres détaillés par outil, le cycle de publication en quatre états,
le référentiel complet, les icônes et la typographie. Ils sont décrits dans
[ARCHITECTURE-GLOBALE-UCM.md](./ARCHITECTURE-GLOBALE-UCM.md) et
[PISTES-DE-REFLEXION.md](./PISTES-DE-REFLEXION.md). Un manque constaté à
l'usage de la version minimale est la seule raison d'y revenir.

## Ce que la recherche a établi et que cette version emploie

- Les relevés de forme sont exacts ; les synonymes demandent un jugement
  humain ([R3](./Recherches/R3-NOMENCLATURE.md)).
- Cinq contradictions dans le code UCM, dont le message de l'exporteur
  ([R2](./Recherches/R2-REFERENTIEL.md)).
- La description d'une variable s'affiche entière en infobulle dans Figma ;
  l'exporteur ne la publie pas encore
  ([R8](./Recherches/R4-R8-R11-R13-QUESTIONS-COURTES.md#r8-les-descriptions-de-variables)).
- Un mode écrit dans un nom est une observation, pas un défaut : les
  primitives de l'architecture UCM en portent.
