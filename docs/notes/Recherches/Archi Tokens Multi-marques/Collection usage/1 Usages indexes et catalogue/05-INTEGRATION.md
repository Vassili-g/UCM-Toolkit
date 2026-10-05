# Intégration, migration et critères de décision

## Premier périmètre proposé

Produire un catalogue consultable sur les chemins existants. Mesurer les
associations actuelles et les partenaires candidats sans modifier les variables
du document. Le designer peut ainsi juger le gain avant une migration.

Le prototype accepte les aplats sRGB opaques, deux thèmes et des contextes
explicites. Il conserve les quatre rangs comme comportement historique.
Une association supplémentaire est une proposition tant que le responsable du
design system ne l’a pas ajoutée au catalogue.

Le renommage indexé vient après l’épreuve de recherche dans Figma. Une table
plus large peut apporter la liberté attendue avant que les noms changent.

## Répartition entre outils

| Outil | Travail proposé | Limite |
|---|---|---|
| Kit | Modèle du catalogue, résolution des références, calcul et couverture | Aucun appel à Figma dans les fonctions partagées |
| UCM Palettes | Présenter les associations sur les palettes produites et les effets d’un réglage | Les couleurs de recette ne prouvent pas les alias réellement exportés |
| UCM Token Explorer | Lire les partenaires, inverser les liens par cran, expliquer un échec sur une sélection | Reste en lecture seule dans le document |
| UCM Exporter | Publier les décisions visuelles nécessaires au consommateur | L’analyse et la publication ne créent aucune variable |
| CLI | Recalculer le catalogue contre `tokens.json`, puis contrôler les composants | Distinguer échec mesuré et couverture incomplète |
| Générateur de documentation | Produire la vue par cran, rôle, paire et contexte | Aucune règle maintenue à la main dans les pages générées |

Un plugin peut dessiner la documentation, mais le même calcul doit fonctionner
sans Figma. Palettes paraît adapté à l’édition des palettes et à une éventuelle
génération des alias. L’explorateur paraît adapté à la consultation de ce que
le fichier contient réellement.

La génération des collections `brand`, `theme` et `usage` reste un chantier
distinct. Le catalogue doit d’abord fonctionner avec les variables déjà
présentes, sans supposer cette génération disponible.

## Artefacts de publication à comparer

| Option | Avantage | Limite | Usage proposé |
|---|---|---|---|
| Fichier de catalogue à côté de `tokens.json` | Validation et version propres ; lecture indépendante | Distribution atomique et association au bon fichier à assurer | Prototype recommandé |
| Extension à la racine de `tokens.json` | Valeurs et catalogue transportés ensemble | Poids du fichier, prise en charge explicite par les lecteurs | À comparer avant publication |
| Métadonnées sur chaque token | Proximité d’un rôle et de sa référence | Répétition des paires et des contextes | Identité et rôle seulement |
| Données rangées seulement dans Figma | Faciles à retrouver par le plugin auteur | CI et consommateur dépendent d’un export dédié | Insuffisant sans forme publiée |

Un nom comme `usages.catalogue.json` peut servir au prototype. Il ne constitue
pas un nouveau fichier reconnu par UCM. L’étude ne réserve pas de clé
`$extensions` dans le format publié.

Le résultat des mesures peut être un rapport séparé. Le consommateur doit
recalculer ou vérifier son empreinte avant de s’y fier. Distribuer un fichier
de valeurs avec le catalogue d’une autre révision doit produire une
incompatibilité explicite.

## Points de code concernés

| Zone actuelle | Évolution à éprouver |
|---|---|
| `packages/kit/src/emplois/emplois.ts` | Conserver le vocabulaire de peinture ; extraire la politique des crans fixes |
| `paires.ts` | Distinguer relations déclarées, niveaux et états ; conserver les identifiants historiques |
| `rangs.ts` | Maintenir le profil historique ; ajouter une politique explicite de composant |
| `usages.ts` | Générer les descriptions de variables depuis le profil choisi |
| `packages/couleur/src/promesses.ts` | Mesurer le même catalogue sur les rampes de recette |
| `packages/kit/src/lecteurs/diagnostic-emplois.mjs` | Résoudre la chaîne pertinente, mesurer aussi les paires reconnues, exposer la couverture |
| `packages/kit/src/lecteurs/modes-tokens.mjs` | Réutiliser la résolution par contexte et les dépendances d’axes |
| `packages/plugin-explorateur/src/integrations/` | Ajouter la lecture d’un catalogue et sa provenance |
| `packages/plugin-palettes/src/planche/modele.ts` | Dériver la planche et les partenaires des données communes |
| Export des tokens et format | Définir le transport du catalogue et les données visuelles nécessaires |

Les champs du contrat ne changent que si une information nécessaire manque
dans les tokens, placements et variantes déjà publiés. Une nouvelle
représentation des affectations d’état demanderait une évolution explicite du
format et de sa fenêtre de lecture.

## Algorithme de vérification proposé

1. Valider la version du catalogue, l’unicité des identifiants et les références.
2. Développer la liste des contextes requis, extensions comprises.
3. Résoudre les alias dans chaque contexte ; conserver leur provenance.
4. Vérifier la fonction de peinture et les conditions du calcul.
5. Mesurer chaque association déclarée, même si son nom est connu.
6. Enregistrer séparément les succès, échecs, exemptions et cas non jugeables.
7. Comparer les relations du composant aux relations déclarées.
8. Appliquer la politique d’états du composant.
9. Publier la couverture et les données qui ont produit le verdict.

Limiter les recomputations par dépendances d’axes, puis mémoriser les résolutions
et les ratios identiques. Si le budget impose un arrêt, marquer la couverture
partielle. Un échantillonnage silencieux ne doit pas produire un succès global.

Une politique de CI peut refuser un échec mesuré et une couverture incomplète
sur une relation obligatoire. Les couleurs exploratoires restent hors
catalogue. Le caractère bloquant doit être configuré et documenté ; le
diagnostic existant est aujourd’hui non bloquant.

## Migration des noms

La classe 5 de la
[politique de compatibilité](../../../../../format/COMPATIBILITE.md) traite le
changement d’un nom de token ou d’un alias. Conserver l’identifiant d’une
variable Figma ne conserve pas son chemin publié : un renommage peut casser
les contrats et le CSS consommateurs.

Procéder par ajout, puis migration explicite :

1. Inventorier les références actuelles dans Figma, les contrats et le code.
2. Ajouter les tokens indexés avec les mêmes valeurs résolues.
3. Garder les anciens chemins, avec leur signification historique.
4. Mettre à jour le lecteur pour reconnaître le profil historique et le
   catalogue indexé, y compris leurs chaînes d’alias.
5. Migrer un composant pilote dans Figma, réexporter, puis adapter son code.
6. Comparer les rendus et les valeurs dans chaque marque et thème visés.
7. Retirer les anciens chemins seulement après inventaire sans référence
   résiduelle et publication de la rupture aux consommateurs.

Les anciens tokens peuvent viser les nouveaux par alias si le lecteur suit
correctement la chaîne. Leur rang historique doit toutefois rester associé à
leur propre identité. Déduire le rang du dernier nom rencontré pourrait changer
le verdict d’un ancien contrat.

Un retour arrière restaure les affectations de composants et l’export
précédents. Il conserve les nouvelles variables tant que leur usage n’est pas
inventorié. La suppression d’une variable partagée n’est pas une simple annulation
de renommage.

Le catalogue demande son propre numéro de schéma et une révision de contenu.
Le paquet du kit, le format de tokens et le contrat conservent leurs versions
indépendantes. Une extension additive ne doit pas servir à imposer une nouvelle
sémantique aux lecteurs qui l’ignorent.

## Épreuve auprès des designers

Comparer trois présentations sur les mêmes composants : noms d’état actuels,
niveaux indexés, niveaux indexés avec liste de partenaires. Faire choisir les
couleurs d’un bouton plein, d’une carte sélectionnable et d’une alerte.

Mesurer le temps de recherche, les associations hors catalogue et les erreurs
de compréhension de `on-solid`. Demander ensuite un changement de marque et
de thème. Observer si le designer retrouve la portée de la garantie sans
réinterpréter les indices.

La suppression des noms d’état est justifiée si les niveaux avec partenaires
facilitent les choix demandés sans augmenter les associations erronées. Si les
indices seuls détériorent la recherche, conserver les noms actuels et ajouter
le catalogue avant une nouvelle itération de nommage.

## Recette technique avant adoption

| Cas | Résultat attendu |
|---|---|
| Paire connue mais couleurs identiques | Échec numérique à 1:1 |
| Paire hors catalogue mais contraste suffisant | Mesure réussie, relation toujours hors catalogue |
| Indices différents avec relation déclarée | Acceptation selon la mesure et la fonction |
| Même indice avec contraste insuffisant | Échec |
| Marque ajoutée | Nouveau contexte requis ; ancienne preuve périmée |
| Mode manquant ou cycle d’alias | Cas non jugeable avec cause |
| Plus de 32 contextes | Couverture complète ou partielle explicitement déclarée |
| Surcharge de collection | Valeur effective dans l’extension réellement sélectionnée |
| Référence ancrée, courbe ou fond modifié | Recalcul des relations affectées |
| Palette libre ou figée | Aucune promesse héritée par simple numéro de cran |
| Opacité de parent | Composition prise en charge ou cas non jugeable |
| Focus sur contrôle au-dessus d’une carte | Relations pertinentes et géométrie vérifiées séparément |
| Sélection et focus simultanés | Affectations des variantes réellement présentes |
| Migration d’un chemin | Ancien contrat encore lisible pendant la transition |
| Même entrée dans Palettes et CLI | Même résolution, même métrique et même verdict |
| Catalogue absent | Comportement historique explicite, aucune garantie indexée supposée |

Les tests de rendu restent nécessaires pour les couleurs forcées du système,
les images, la géométrie du focus et les interactions. Ils ne doivent pas être
remplacés par le seul catalogue de tokens.

## Décisions à prendre après le prototype

La séparation entre états et niveaux est la direction recommandée par cette
étude. Trois choix restent ouverts :

- adopter les noms indexés ou conserver des noms d’apparence ;
- définir les affectations de composant dans le contrat ou les retrouver par
  les tokens en ajoutant une politique d’états distincte ;
- publier le catalogue à côté des tokens ou dans une extension racine.

La génération de variables multi-marques, le solveur de couleurs et une
garantie continue sur toutes les teintes ne sont pas des prérequis au premier
catalogue. Chacun demande une étude et des validations propres.

## Vérifications du dossier de recherche

Le script de mesures s’exécute après le build du kit. Les résultats conservés
portent les empreintes des sources et du module compilé des emplois.
Le contrôle `scripts/controle-style.mjs` passe sur les documents et le script
de ce dossier.

Le test `tests/docLinks.test.ts` ne signale aucun lien invalide dans ce dossier.
Son résultat global reste en échec sur des liens vers des fichiers absents dans
d’autres recherches, notamment les diagnostics de composant et les recherches
Palettes. Cette étude ne corrige pas ces déplacements externes à son périmètre.
