# Revue des bugs de l'implémentation d'UCM Architect

Cette revue couvre les contrôles du kit et leur usage par Architect. Un cas est
classé confirmé quand le chemin de code suffit à reproduire l'écart ou qu'un
test le reproduit. Les corrections restent dans le lot et le paquet concernés.

| Rang | Sévérité | Cas | Preuve | Effet | État |
|---|---|---|---|---|---|
| B01 | Majeure | L'analyse d'un composant n'appelle ni `controlerLeTheme` ni `controlerLaStructure`. | `packages/plugin-architect/src/sandbox/analyse.ts`, `controlesDuKit` | C59 et les constats de structure propres au composant n'arrivent jamais dans ses résultats. | À reproduire par test, puis corriger |
| B02 | Majeure | C22 et C24 choisissent la première liaison portant un nom de variable, sans utiliser le champ ni l'indice du constat. | `packages/kit/src/controles/corrections.ts`, `corrigerAxe` et `corrigerRole` | Deux peintures d'un même layer liées au même token produisent deux corrections sur la première peinture. | À reproduire par test, puis corriger |
| B03 | Majeure | C12 peut proposer un renommage vers l'unique style du catalogue même si sa relation avec la valeur du variant n'est pas établie. | `packages/kit/src/controles/nommage.ts`, `candidatUnique` | Un variant `Variant=Outlined` avec un seul token `filled` peut recevoir une correction vers `filled`. | À reproduire par test ; règle de correction à établir |
| B04 | Modérée | C25 propose une liaison pour une peinture visible sans vérifier qu'elle est `SOLID`. | `packages/kit/src/controles/corrections.ts`, `constatsManquants` ; `packages/plugin-architect/src/ecriture/liaisons.ts`, `lireLaCible` | Une correction proposée sur un dégradé est refusée au moment de l'écriture. | À reproduire par test, puis corriger |

Le build et les tests existants ne couvrent pas encore ces cas. La validation
dans Figma reste distincte des tests portables.
