# Lot 5 : mémoires sûres au sein d'une demande

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **5.1 | gpt-6-luna | medium** | **Claude Sonnet | medium** : garder le parcours brut par racine dans la portée ; prouver une seule traversée de racine répétée.
- [x] **5.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : appliquer après ce parcours les frontières composées et les filtres de visibilité selon chaque contexte ; comparer masqués statiques et dynamiques.
- [ ] **5.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : mémoriser les chemins de texte par contexte complet composé et noms d'icônes ; tester deux contextes sur la même racine.
- [ ] **5.4 | gpt-6-luna | medium** | **Claude Sonnet | medium** : rejouer diagnostics, parties et localisations par destination ; comparer la sortie ordonnée.
- [ ] **5.5 | gpt-6-luna | low** | **Claude Haiku | low** : vérifier fermeture de portée, appel hors portée et portée imbriquée ; garder les attentes du banc inchangées.

Prérequis : 2. Nature : déplacement à sortie identique.
Chemins : `packages/plugin-socle/src/composant/contract/exportableNodes.ts`,
`extractVariantTypography.ts`, `porteeDAnalyse.ts`, `localisation.ts`,
`packages/plugin-exporter/tests/paritePerformance.test.ts`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : garder le parcours brut par racine dans la portée
  du moteur ; appliquer séparément les frontières composées et les filtres de
  visibilité. Mémoriser les chemins de texte avec leur contexte complet
  `composed` et `iconNames`, immuable ou comparé par contenu. Rejouer chaque
  diagnostic, ses parties et ses localisations dans chaque destination.
- **Portée initiale répartie dans les cases ci-dessus** : comparer la même racine sous contextes différents,
  dont racine elle-même composée, masqué lié et ensembles d'icônes différents.
  Vérifier nettoyage à la fermeture, refus des portées imbriquées et appels
  hors portée. Les attentes du banc existant restent inchangées.

Sortie : moins de parcours sur fixtures répétitives sans réutilisation entre
demandes. Contrôles : socle/exporteur et Architect. **Build Architect.**
