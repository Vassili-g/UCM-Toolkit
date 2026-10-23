# Revue des bugs de l'implémentation d'UCM Architect

Cette revue couvre les contrôles du kit et leur usage par Architect. Un cas est
classé confirmé quand le chemin de code suffit à reproduire l'écart ou qu'un
test le reproduit. Les corrections restent dans le lot et le paquet concernés.

| Rang | Sévérité | Cas | Preuve | Effet | État |
|---|---|---|---|---|---|
| B03 | Critique | C12 considère tous les autres segments de style comme des candidats, même quand la valeur du variant possède déjà son token. | `packages/kit/src/controles/nommage.ts`, boucle `anciennes` et `candidatsParFamille` | Deux styles `filled` et `outlined` correctement couverts peuvent produire deux propositions réciproques de renommage. Un style `Outlined` peut aussi être renommé vers l'unique token `filled` sans relation établie. | Corrigé dans `fa76117b` ; kit 917/917 |
| B01 | Majeure | L'analyse d'un composant n'appelle ni `controlerLeTheme` ni `controlerLaStructure`. | `packages/plugin-architect/src/sandbox/analyse.ts`, `controlesDuKit` | C59 et les constats de structure propres au composant n'arrivent jamais dans ses résultats. | Corrigé dans `41ea4116` ; test ciblé Architect 16/16 |
| B02 | Majeure | C22 et C24 choisissent la première liaison portant un nom de variable, sans utiliser le champ ni l'indice du constat. | `packages/kit/src/controles/corrections.ts`, `corrigerAxe` et `corrigerRole` | Deux peintures d'un même layer liées au même token produisent deux corrections sur la première peinture. | Corrigé dans `22d4f13a` ; tests ciblés kit 10/10 et Architect 7/7 |
| B05 | Majeure | L'écriture exige tous les axes du variant, mais certaines corrections ne lui transmettent que les axes reconnus. | `packages/kit/src/controles/corrections.ts`, `axesDuVariant` ; `packages/plugin-architect/src/ecriture/liaisons.ts`, `axesEgaux` | C24 et C29 sont systématiquement sautées avec `objet-change` si le variant possède aussi une propriété inconnue du kit. | Corrigé dans `afc044dd` ; kit 920/920 |
| B07 | Majeure | La réponse à C12 ou C13 est rejetée par le domaine `questions`, qui exige un layer pour construire toute correction. | `packages/plugin-architect/src/sandbox/questions.ts`, `correctionDeLaReponse` ; C12/C13 dans `packages/kit/src/controles/nommage.ts` | Le designer choisit un nom de valeur proposé, mais `question-repondue` contient `correction: null` et aucun renommage ne peut être appliqué. | Corrigé dans `a3124ae6` ; Architect 939/939 |
| B08 | Majeure | C59 porte la clé de sa variable dans `avant` et `aRelire.avant`, alors que l'écrivain compare le nom. Une réponse à sa question ne retrouve pas non plus la liaison source. | `packages/kit/src/controles/theme.ts`, `correctionDeLiaison` ; `packages/plugin-architect/src/ecriture/liaisons.ts`, `relire` ; `packages/plugin-architect/src/sandbox/questions.ts` | La correction C59 est sautée avec `fait-faux` ; son choix manuel ne produit pas une correction applicable. | Corrigé dans `c933ccff` ; kit 921/921, Architect 940/940 |
| B09 | Majeure | K6 identifie les questions de nom d'élément par le seul nom du layer. | `packages/kit/src/controles/preparation.ts`, `elementDe` et `aNommer` | Deux layers homonymes du même rôle produisent une seule question `nom:…` ; le designer ne peut pas leur donner des noms d'élément distincts et leurs préparations peuvent fusionner. | Corrigé dans `1c2cacde` ; tests ciblés 11/11 |
| B04 | Modérée | C25 propose une liaison pour une peinture visible sans vérifier qu'elle est `SOLID`. | `packages/kit/src/controles/corrections.ts`, `constatsManquants` ; `packages/plugin-architect/src/ecriture/liaisons.ts`, `lireLaCible` | Une correction proposée sur un dégradé est refusée au moment de l'écriture. | Corrigé dans `c7b1709a` ; tests ciblés 11/11 |
| B06 | Modérée | Le double de catalogue du test B6 laisse un mode sans valeur depuis l'ajout du contrôle correspondant par K5. | `packages/plugin-architect/tests/structure.test.ts`, `catalogueAvecUnScopeFaux` | `npm run test:paquet -- architect` échoue : le test attend un seul C63 de scope et reçoit aussi le C63 légitime de mode sans valeur. | Corrigé dans `47c9ee40` ; test ciblé Architect 30/30 |

Chaque cas a reçu un test de régression ciblé. La validation dans Figma reste
distincte des tests portables.

Vérification finale : build du kit et d'Architect verts ; tests du kit 924/924 ;
tests Architect 940/940. Les tests racine passent 466/467 : le seul échec est
`versionSuitLeContenu`, qui attend la montée de version du lot V. `agents:diff`
ne signale aucun document lié à modifier.

## Nouvelle repasse depuis `7528c42e`

Base : branche `main`, avec travaux locaux préexistants conservés. Ils touchent
notamment les messages, le sandbox et l'interface Architect. Les tests racine
passent 467/467. La suite Architect passe 936/940 : les quatre échecs portent
sur la souche `preparation`, le nom de collection réservé dans cette préparation,
le texte « calque » des corrections et cinq classes CSS de l'interface. Le build
Architect s'arrête sur sept erreurs de type dans les modules d'interface locaux
`ui/analyse` et `ui/corrections`. Ces échecs précèdent la nouvelle revue ; ils ne
constituent pas des régressions attribuées aux lots terminés. La suite du kit,
lancée en même temps que trois autres commandes lourdes, passe 923/924 : seul le
seuil de temps du test de 32 000 noms échoue. Ce fichier relancé seul passe
22/22, dont le cas de charge en 3,4 s ; le dépassement initial vient de la
concurrence des processus.

Les cas nouveaux seront consignés ici avec règle, reproduction, cause,
correction, tests avant et après, commit et état. Les pistes sans preuve restent
distinctes des bugs confirmés.

### R01 · Critique · Annulation d'une création après lecture de texte refusée

- Règle : `packages/plugin-architect/invariants/explorateur.md` garde une variable créée qui a gagné un usage ; `src/ecriture/structure.ts` prévoit `usage-illisible` quand ce contrôle échoue.
- Chemin observé : `unLayerLieA` intercepte l'exception de `getStyledTextSegments` et rend `false`. `defaireLaLigne` supprime alors la variable et retire sa ligne du journal, même si un segment pouvait la lier.
- Effet : l'annulation peut retirer une variable encore utilisée dans le fichier, avec perte de son identité et de sa valeur. Criticité **critique** pour cette suppression irréversible par le plugin.
- Correction retenue : faire remonter le refus de lecture à `defaireLaLigne`, qui conserve la variable et le journal sous `usage-illisible`. Le contrôle des autres nœuds et les usages effectivement trouvés restent inchangés. Aucun nouveau message ni type public ; le motif existe déjà. Risque à vérifier : un texte illisible sans liaison empêche aussi l'annulation jusqu'à ce que Figma le rende lisible.
- Reproduction : un nœud `TEXT` du fichier dont `getStyledTextSegments` lève,
  puis l'annulation d'une création journalisée. Avant correction, le test échoue
  (30 réussis, 1 échec) : la variable est supprimée. Après correction, 31/31
  passent ; la variable et la ligne du journal restent, avec `usage-illisible`.
- Cause : le `catch` local de `unLayerLieA` transformait l'échec de lecture en
  absence d'usage. Solution : laisser remonter l'exception au traitement de
  l'annulation, qui possède déjà le motif et garde la ligne.
- Commit : `14d17ce7`. État : corrigé, test ciblé relancé 31/31.
