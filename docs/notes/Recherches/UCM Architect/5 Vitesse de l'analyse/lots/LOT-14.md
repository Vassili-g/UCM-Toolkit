# Lot 14 : worker conservé et différences versionnées

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] **14.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : ajouter identité de worker, révisions de base et cible, puis accusé de préparation ; test d'ancienne instance.
- [ ] **14.2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : transmettre ajouts, remplacements et suppressions immuables ; promouvoir ou abandonner atomiquement la révision.
- [ ] **14.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : resynchroniser après éviction, base absente ou redémarrage ; tests de doublon et de perte de base.
- [ ] **14.4 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : comparer calcul local minime et aller-retour worker avec copies comptées ; conserver une seule autorité du graphe.
- [ ] **14.5 | gpt-6.1-sol | high** | **Claude Sonnet | high** : si le rendu le justifie, envoyer des différences de constats avec base explicite, repli entier et application atomique.
- [ ] **14.6 | gpt-6-luna | low** | **Claude Haiku | low** : préparer la collecte du temps à froid, du temps de session et de la mémoire cumulée pour la recette Figma.

Prérequis : 11 et worker retenu du lot 13. Nature : transport incrémental.
La maintenance des agrégats du lot 11 reste utilisable sans ce lot.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : ajouter identité de worker, révisions de base et
  cible, ajouts/remplacements/suppressions, acquittement et promotion/abandon.
  Éviction, base absente ou redémarrage impose resynchronisation. Une ancienne
  instance ne publie rien. Conserver une seule autorité du graphe et compter
  toute copie nécessaire au changement d'exécuteur.
- **Portée initiale répartie dans les cases ci-dessus** : tester perte de base, abandon, doublon, suppression
  et réinitialisation. Comparer calcul local minime et aller-retour du worker.
  N'ajouter des différences de constats vers l'interface que si son transport
  ou rendu domine encore : base explicite, repli entier et application finale
  atomique. Aucun mélange de révisions n'est applicable.

Activation : gain de session mesuré avec coût à froid et mémoire cumulée.
Le résultat final entier reste le premier protocole de restitution.
**Build Architect** pour chaque candidat retenu.
