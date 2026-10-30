# État des recherches UCM

Ce sommaire décrit l'utilité des sujets et leur état de réalisation. Le statut
« implémenté » concerne le périmètre de code retenu ; les tests et la recette
Figma ne maintiennent pas ce statut ouvert. Une proposition ou une branche
conditionnelle ne constitue pas un engagement de réalisation.

Les plans d'exécution liés précisent le travail restant. Pour modifier le
produit, partir des références de [docs/README.md](../../README.md) et du code.

## Sujets

| Sujet | Utilité | Statut |
|---|---|---|
| [Hub UCM][hub] | Rassembler l'exploration des palettes, variables, contrastes et règles dans une page locale. | Partiellement implémenté. Le banc existe ; l'inspecteur, les fiches de règles et les outils de tokens du plan restent à réaliser. |
| [Palettes : recette v10][palettes-v10] | Corriger les décalages du nuancier et les interactions de l'onglet Comparaison. | Modifications retenues implémentées. L'accueil partagé du nuancier est abandonné ; les tests d'interface de I1 restent à réécrire. La proximité des palettes suit désormais le plan des crans clairs. |
| [UCM Architect : vitesse d'analyse][vitesse] | Réduire les lectures répétées et le délai d'affichage des constats, avec annulation et reprise. | Partiellement implémenté. Retrait de l'ancien chemin de production encore ouvert ; signatures, worker et échanges différentiels abandonnés. |
| [UCM Architect : fusion et préparation][architect] | Réunir l'exploration des variables, leur nommage et la préparation des tokens d'un composant. | Implémenté pour le périmètre retenu. L'adaptation des noms de préparation à la convention Figma reste conditionnelle. |
| [Diff sémantique][diff] | Comparer deux ensembles de contrats et de tokens pour identifier les changements et les composants touchés. | Proposé, non implémenté ; périmètre de l'expérimentation à valider. |
| [Conformité du rendu][rendu] | Comparer le rendu d'une implémentation aux obligations visuelles de son contrat. | Recherche proposée, non implémentée ; choix de réalisation ouverts. |
| [Implémenteur de contrats][implementeur] | Produire et mettre à jour le code d'un composant à partir du contrat, avec moins de travail génératif. | Non réalisé. Le plan propose un compilateur ; sa revue recommande d'abord une preuve limitée et un contrôle de rendu autonome. Orientation à trancher. |
| [Réduction du coût du chemin agent][reduction] | Réduire les lectures et les générations répétées lorsqu'un agent reconstruit un composant. | Plan partiellement remplacé par l'implémenteur. Les propositions de harnais et de guide restent distinctes du compilateur. |
| [Évolutions globales][evolutions] | Choisir les prochains usages des contrats et des tokens à partir des besoins des équipes. | Catalogue de propositions, dont certaines fonctions sont déjà livrées. Les autres essais ne sont pas des lots approuvés. |

La [spécification de Palettes][spec-palettes] demeure la référence de son
comportement, même si elle est encore rangée dans le dossier de recherche.

## Questions ouvertes

Ce tableau rassemble les décisions encore attendues et les propositions à
arbitrer. Les recettes à exécuter et les tâches de code déjà décidées restent
dans les plans. Les questions anciennes tranchées par un plan plus récent ne
sont pas reprises comme des choix ouverts. Les questions d'un sujet implémenté
passent en premier ; celles d'un sujet en attente attendront sa reprise.

| Sujet | Sujet implémenté | Questions ouvertes et décisions attendues |
|---|---|---|
| [Préparation dans Architect][architect] | Non | Les noms Figma doivent-ils commencer par la collection ? Si non, adapter les noms créés et la recherche des cibles pour éviter un dossier de collection supplémentaire. |
| [Catalogue d'Architect][architect] | Non | Autoriser plusieurs collections reconnues comme `theme` ou `layout` ? Si oui, les parcourir toutes ; sinon, signaler cette entrée. |
| [Diff sémantique][diff] | Non | Valider le périmètre local proposé et lancer l'expérimentation ? Le rapport obtenu aide-t-il à décider des changements à traiter ? |
| [Adressage du rendu][rendu] | Non | Adopter `data-ucm-slot` pour retrouver les éléments observés ? Garder cet attribut en production ? |
| [Preuves du rendu][rendu] | Non | Comment prouver l'identité des tokens, et quelles clauses minimales peuvent produire un verdict de conformité ? |
| [Périmètre du rendu][rendu] | Non | Couvrir les états d'interaction ? Comment traiter un composant qui ne peut pas être affiché seul ? |
| [Contrôles dans le workflow][rendu] | Non | Quels contrôles dans l'éditeur et au push ? Qui répond d'un blocage de fusion, dans quel délai, et faut-il commencer par une période d'observation ? |
| [Orientation de l'implémenteur][revue-implementeur] | Non | Suspendre le programme complet au profit d'une preuve limitée ? Fixer sa dépense maximale et son horizon de rentabilité. |
| [Contrôle autonome avant génération][revue-implementeur] | Non | Livrer d'abord un contrôle de rendu sur le code maintenu par l'équipe ? Quel sous-ensemble d'obligations couvrir ? |
| [Sortie du générateur][revue-implementeur] | Non | Produire des données, une feuille CSS ou une coque de composant après comparaison sur un réexport réel ? |
| [Politiques locales du générateur][revue-implementeur] | Non | Quels choix deviennent des politiques typées ? Où se trouve leur seule valeur exécutable ? |
| [Props des dépendances][revue-implementeur] | Non | Qui choisit les props fixes, dérivées ou exposées ? Comment confirmer une suggestion issue des échantillons ? |
| [Comportement et états visuels][revue-implementeur] | Non | Quel raccord relie les signaux applicatifs, les états visuels et les changements de structure ? |
| [Validité des décisions de génération][revue-implementeur] | Non | Quels événements invalident une décision même lorsqu'elle reste valide pour son type ? |
| [Propriété du code généré][revue-implementeur] | Non | Choisir des fichiers générés séparés ou des régions identifiées dans les fichiers ? Quel refus appliquer en cas de conflit hors ligne ? |
| [Acceptation du code généré][revue-implementeur] | Non | Quel protocole d'observation et quelles mutations permettent de distinguer un résultat conforme d'un résultat incorrect ? |
| [Fournisseur et mémoire partagée][revue-implementeur] | Non | Retirer le port fournisseur et la mémoire mutualisée jusqu'à quel constat de charge humaine ? |
| [Intégration du générateur][revue-implementeur] | Non | Quel parcours de fusion retenir ? Qui prend en charge les prérequis de tokens et de CI chez le consommateur ? |
| [Guide du chemin agent][reduction] | Non | Quel gabarit neutre en technologie peut guider une reconstruction sans imposer une stack ? |
| [Choix des évolutions globales][evolutions] | Non | Quel besoin observé justifie le prochain essai : contrats et export, usages applicatifs, contrôle des écarts, aide à l'implémentation ou partage ? Désigner son responsable, son corpus et son budget. |

Les autres sujets du tableau n'ont pas de décision de conception ouverte
identifiée dans leur plan d'exécution. Les avis des revues restent des
propositions tant que le mainteneur ne les adopte pas.

## Références et validations

Les recettes Figma reportées d'Architect et de Palettes restent dans les plans
liés ci-dessus. Les recettes antérieures demeurent accessibles :

- [Qualité des palettes et Comparaison][recette-qualite-archive] ;
- [Moteur, profils Soft et Vivid][recette-moteur-archive] ;
- [Thème en dossiers et texte des boutons][recette-texte-archive] ;
- [Création, Vérification et Gestion][recette-direction-archive] ;
- [Ancienne vue composant de l'explorateur][recette-composant-archive] et [écarts relevés dans son suivi][suivi-composant-archive] ;
- [Parcours proposés pour les apports du marché][parcours-marche-archive].

Les documents archivés décrivent leur périmètre d'origine. Les règles
courantes viennent des spécifications et du référentiel. Les comparatifs
externes demandent une nouvelle vérification avant un choix de produit ou de
modèle.

## Archive

Sujets implémentés pour le périmètre retenu. Leurs dossiers sont rangés
dans `docs/notes/Archives/` ; leurs recettes Figma reportées restent dans
leurs plans.

| Sujet | Utilité | Statut |
|---|---|---|
| [Kits UCM et partage des données][kits] | Faire appliquer les mêmes conventions et protocoles par le kit et les plugins. | Implémenté. Le plan d'exécution termine les lots que l'ancien plan de conception laisse encore décochés. |
| [Référentiel UCM][referentiel] | Définir une seule fois les collections, modes, crans et termes partagés par les produits. | Implémenté. Les opérations Figma restantes relèvent de la recette. |
| [Guide des agents][agents] | Orienter les agents vers les fichiers utiles et réduire le volume de contexte à charger. | Implémenté. Le plan d'exécution remplace le découpage initial. |
| [Architecture des tokens multi-marques][multimarques] | Expliquer les collections et les alias pour composer les marques et les thèmes. | Référence et générateurs réalisés ; données à actualiser après un nouvel export. |
| [Règles dupliquées][regles-dupliquees] | Attribuer chaque règle à une seule fonction et empêcher ses copies divergentes. | Implémenté dans le plan Intégrité de la structure. |
| [Crans clairs, textes, variables et scopes][crans] | Harmoniser les fonds clairs et préserver la lisibilité des textes dans les thèmes. | Implémenté, comparaison pondérée des palettes comprise. Recette Figma reportée. |
| [UCM Architect : recette v1][architect-v1] | Corriger les constats de liaison et organiser le panneau du composant par élément. | Implémenté. Les comparaisons de galerie et la recette restent des validations. |
| [UCM Architect : recette v2][architect-v2] | Corriger les analyses et les parcours de préparation, de sélection et d'affichage des constats. | Implémenté. Les sous-lots du plan sont cochés. |
| [UCM Architect : règles manquantes][regles-manquantes] | Compléter une instance de règles en conservant les textes déjà rédigés. | Implémenté, reconstruction des sections comprise. Recette Figma reportée. |
| [UCM Architect : intégrité de la structure][integrite] | Repérer les variables absentes du thème et les cibles incorrectes, puis proposer les corrections certaines. | Implémenté. Recette Figma reportée ; quelques choix de présentation restent à arbitrer. |
| [Ancien Architect : architecture globale][ancien-architect] | Cadrer le rôle des outils avant leur réalisation. | Version minimale réalisée dans le référentiel, puis reprise par UCM Architect. Les propositions d'élargissement sont abandonnées. |
| [Ancien Architect : refonte][ancienne-refonte] | Revoir l'interface de normalisation et ses questions de vocabulaire. | Implémenté, puis intégré à UCM Architect. |
| [Ancien Architect : nomenclature][ancienne-nomenclature] | Rendre les questions de vocabulaire applicables aux renommages et les justifier par un corpus. | Code décidé implémenté. Audit des extractions et analyse de corpus abandonnés. |
| [Ancien Architect : corrections de recette][ancienne-recette] | Corriger les parcours et les constats de la refonte. | Implémenté. |
| [Ancien Architect : fiabilité][ancienne-fiabilite] | Préserver les noms et les protections lors des écritures et des changements de configuration. | Implémenté. |
| [Ancien Architect : groupes et variables][anciens-groupes] | Distinguer le nommage des dossiers de celui des variables. | Implémenté. |
| [Ancien Architect : historique][ancien-historique] | Retrouver et annuler le dernier lot de renommages depuis la Configuration. | Implémenté. |
| [Ancien Architect : vocabulaire][ancien-vocabulaire] | Appliquer les décisions de termes au moteur et aux produits qui le consomment. | Implémenté. |
| [Ancien Architect : noms de palettes][anciens-noms-palettes] | Préserver les noms de palettes à travers les lectures et les écritures des plugins. | Implémenté. |
| [Comparaison des outils de palettes][concurrence] | Choisir les améliorations utiles au parcours de création et de vérification des palettes. | Écriture des variables réalisée. Les autres apports sont abandonnés ; APCA attend WCAG 3. |

[kits]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Kits%20UCM%20et%20partage%20des%20donnees/PLAN-IMPLEMENTATION-FIABILITE.md
[referentiel]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/R%C3%A9f%C3%A9rentiel%20UCM/PLAN-IMPLEMENTATION.md
[agents]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Guide%20des%20agents/PLAN-IMPLEMENTATION.md
[multimarques]: ./Archi%20Tokens%20Multi-marques/README.md
[regles-dupliquees]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/R%C3%A8gles%20dupliqu%C3%A9es/README.md
[crans]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/SUJETS%20IMPORTANTS%20%C3%A0%20trancher/PLAN-IMPLEMENTATION.md
[hub]: ./Hub%20UCM/PLAN-HUB-UCM.md
[palettes-v10]: ./Plugin%20Palettes/Recette%20v10/PLAN-IMPLEMENTATION-RECETTE-V10.md
[architect]: ./UCM%20Architect/3%20Plan/PLAN-IMPLEMENTATION.md
[architect-v1]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/4%20Recette%20v1/PLAN-IMPLEMENTATION-RECETTE-V1.md
[vitesse]: ./UCM%20Architect/5%20Vitesse%20de%20l'analyse/lots/README.md
[architect-v2]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/6%20Recette%20v2/PLAN-IMPLEMENTATION-RECETTE-V2.md
[regles-manquantes]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/7%20R%C3%A8gles%20manquantes/PLAN-IMPLEMENTATION-REGLES-MANQUANTES.md
[integrite]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/8%20Int%C3%A9grit%C3%A9%20de%20la%20structure/PLAN-IMPLEMENTATION.md
[ancien-architect]: ./Plugin%20Architect/README.md
[ancienne-refonte]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/3%20Refonte/PLAN-IMPLEMENTATION.md
[ancienne-nomenclature]: https://github.com/Vassili-g/UCM-Toolkit/blob/e4817610/docs/notes/Recherches/Plugin%20Architect/4%20Nomenclature/PLAN-IMPLEMENTATION.md
[ancienne-recette]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-IMPLEMENTATION.md
[ancienne-fiabilite]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-FIABILITE.md
[anciens-groupes]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-GROUPES-VARIABLES.md
[ancien-historique]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-HISTORIQUE.md
[ancien-vocabulaire]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-VOCABULAIRE.md
[anciens-noms-palettes]: https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/Plugin%20Architect/5%20Recette/PLAN-NOMS-DE-PALETTES.md
[diff]: ./Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md
[rendu]: ./Linter%20Dev/PLAN-CONFORMITE-RENDU.md
[implementeur]: ./Optimisation%20Tokens/README.md
[revue-implementeur]: ./Optimisation%20Tokens/review/review-plan-codex-astra.md#8-décisions-ouvertes-par-cette-revue
[reduction]: ./Optimisation%20Tokens/Recherches/PLAN-REDUCTION-TOKENS.md
[concurrence]: ./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-CONCURRENCE-PALETTES.md
[evolutions]: ./Evolutions%20globales/PISTES-EVOLUTION.md
[spec-palettes]: ./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md
[recette-qualite-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/PLAN-IMPLEMENTATION.md
[recette-moteur-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Recette%20moteur%20palettes/README.md
[recette-texte-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Texte%20des%20boutons/README.md
[recette-direction-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9/07%20Direction%20simple/RECETTE-DIRECTION-SIMPLE.md
[recette-composant-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md

[suivi-composant-archive]: https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/SUIVI-VUE-COMPOSANT.md#écarts-avec-le-plan-ou-la-maquette-à-relire
[parcours-marche-archive]: https://github.com/Vassili-g/UCM-Toolkit/tree/202f46e/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9
