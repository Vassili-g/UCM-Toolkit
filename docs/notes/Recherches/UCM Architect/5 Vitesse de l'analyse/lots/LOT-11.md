# Lot 11 : contributions et agrégats maintenus

[Sommaire des lots](./README.md).

## Tâches à committer

- [ ] ~~**11.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : conserver la provenance des contributions typographiques et remplacer les fréquences des anciens et nouveaux groupes.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.2 | gpt-6-luna | medium** | **Claude Sonnet | medium** : reconstruire les membres affectés au franchissement d'un seuil ; comparer au calcul complet.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.3 | gpt-6.1-sol | high** | **Claude Sonnet | high** : remplacer rapports et limites de contraste affectés ; après suppression du pire cas, retrouver le suivant avec le même départage.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : recalculer la couverture globale après ajout, retrait ou déplacement de variant et mode ; réaffecter le préfixe des 5 000.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.5 | gpt-6-luna | medium** | **Claude Sonnet | medium** : réaffecter le préfixe du budget de calques et préserver un constat encore porté par une autre occurrence.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : reconstruire localisations, questions et corrections exactes à partir des contributions retenues ; test de retrait.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.7 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : assembler dans l'ordre final, relire les ignorés et rattacher les corrections à la nouvelle identité.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**11.8 | gpt-6-luna | low** | **Claude Sonnet | low** : compter groupes reconstruits et durée d'assemblage dans la trace ; tester les compteurs sur une mutation.~~ Écartée, voir « Décision du mainteneur ».

Prérequis : 10. Nature : incrémentalité des groupes et de la restitution.
Chemins : modules de requêtes, contrôles typographie/accessibilité du kit si
nécessaire, projection d'Architect et tests de mutations.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : conserver la provenance des contributions.
  Remplacer les fréquences d'une source dans ses ancien et nouveau groupes,
  reconstruire les membres concernés après franchissement d'un seuil.
  Remplacer rapports et limites affectés ; supprimer le pire contraste doit
  retrouver le suivant avec le départage de référence. Reconstruire un groupe
  lorsqu'une maintenance fine ne réduit pas son coût.
- **Portée initiale répartie dans les cases ci-dessus** : recalculer le plan global de couverture après ajout,
  retrait ou ordre de variant/mode. Réaffecter le préfixe des 5 000 combinaisons
  et celui du budget de calques avant de réutiliser des contributions.
  Un constat encore produit par une occurrence reste présent après retrait
  d'une autre. Reconstruire localisations, questions et corrections exactes.
- **Portée initiale répartie dans les cases ci-dessus** : assembler le résultat final dans l'ordre de
  référence et rattacher toutes les corrections à la nouvelle identité.
  Relire les ignorés avant projection. Ne restaurer implicitement ni réponses
  ni cases cochées d'une ancienne analyse. Réutiliser les mêmes fonctions pour
  la reconstruction complète et la maintenance.

Sortie : parité après retrait du pire cas, changement de groupe et déplacement
des deux bornes. La trace compte groupes reconstruits et assemblage final.
Chaque commit touchant le kit porte sa montée de version. Contrôles des paquets
touchés. **Build Architect.**

## Décision du mainteneur

Les cases 11.1 à 11.8 sont écartées avec le graphe fin du lot 10, pour le même motif (section « Décision du mainteneur » de [LOT-10](./LOT-10.md)) : les agrégats maintenus n'épargneraient qu'une partie des contrôles du kit, au plus 1,7 s dans Figma, tant que le moteur et les relectures se rejouent entiers. La voie légère du lot 10 (L1 à L3) reprend les familles de contrôles entières.
