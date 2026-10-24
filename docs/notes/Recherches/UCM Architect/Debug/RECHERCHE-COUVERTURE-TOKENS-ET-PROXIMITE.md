# Détecter les valeurs sans token et proposer un token proche

## Objet et statut

Cette note propose une évolution de l'analyse d'un composant dans UCM Architect. Elle sert à trancher le périmètre et les règles avant une implémentation. Elle ne modifie ni le comportement du plugin ni le référentiel UCM. Les défauts déjà établis restent dans [le relevé des bugs](BUGS-ANALYSE-COMPOSANTS-TOKENS.md) ; la contrainte de temps sur 90 variants est détaillée dans [la note de performance](OPTIMISATION-ANALYSE-90-VARIANTS.md).

La demande contient deux attentes distinctes : signaler une propriété de conception sans liaison à un token, et suggérer, pour une longueur telle qu'un rayon de 13 px, le token sémantique le plus proche, par exemple un rayon de `layout` qui vaut 14 px. La seconde action change le rendu si la liaison est appliquée. Elle requiert donc un choix explicite du designer et une comparaison des modes.

## Comportement constaté dans le dépôt

| Étape | Comportement actuel | Conséquence pour la demande |
|---|---|---|
| Relevé | `releveDuComposant.ts` relève les liaisons de nombreux champs, mais `valeursEnDur` ne contient que padding, espacement d'auto layout, rayons, épaisseur de contour, largeur et hauteur. Les dernières viennent des dimensions du calque, sans preuve qu'une largeur ou hauteur ait été fixée explicitement. | Lire une liaison et détecter son absence sont deux opérations différentes. Une dimension calculée peut produire un constat inutile. |
| Constat | `corrections.ts` émet C29 pour les champs de `valeursEnDur` reconnus comme `sizing`, `radius` ou `stroke`, y compris la valeur `0`. C25 ne vise qu'une peinture SOLID visible d'un texte reconnu comme titre. | Les couleurs ordinaires, la plupart des propriétés de texte et plusieurs champs Figma sans liaison ne reçoivent pas ce diagnostic. |
| Candidat C29 | `corrigerValeurEnDur` ne retient qu'un `FLOAT` de `layout`, de la bonne famille, présent, et dont **toutes les valeurs brutes par mode** égalent exactement la valeur du calque. | Un rayon de 13 px ne reçoit pas la suggestion 14 px. Un alias de même valeur peut être écarté. Les modes du calque ne déterminent pas la comparaison. |
| Préparation | `preparation.ts` prépare des variables `components` pour les couleurs SOLID et certaines tailles non nulles. La cible doit être un token `theme` ou `layout` existant. Le rayon par coin n'entre pas dans sa liste normale de tailles ; la largeur ordinaire n'y entre pas non plus. | La couverture de préparation diffère de celle de C29. La préparation ne sait pas créer la cible `layout/radius` de 13 px. |
| Interface et écriture | Une question de préparation sans candidat bloque le bouton de préparation (bug 12 du relevé). L'écriture d'une liaison vérifie son emplacement et sa cible, mais ne relit pas la valeur numérique initiale ni l'écart par mode. | Une proposition proche demande une action et des gardes supplémentaires ; elle ne peut pas emprunter telle quelle la correction exacte. |

Dans `analyse.ts`, `sansTokens` signifie qu'aucune variable nommée pour ce composant n'est trouvée dans la collection `components`. Ce booléen ne signifie pas « aucune propriété liée ». Il ne peut donc pas servir de compteur des valeurs sans token.

Fichiers à relire pour juger la proposition : `packages/plugin-architect/src/releveDuComposant.ts`, `src/consommateurs.ts`, `src/sandbox/analyse.ts`, `src/sandbox/preparation.ts`, `src/ecriture/liaisons.ts`, `src/ecriture/variables.ts` et `src/ui/preparation/index.ts` dans le même paquet ; `packages/kit/src/controles/releve.ts`, `corrections.ts`, `preparation.ts`, `nommage.ts` et `constat.ts` ; `packages/kit/src/referentiel/architecture.ts` ; `packages/plugin-architect/SPEC.md`. Les chemins abrégés `src/` de cette phrase désignent `packages/plugin-architect/src/`.

## Vocabulaire à fixer dans le produit

- **Propriété sans liaison** : le champ Figma est lisible, pertinent pour ce composant et n'a pas de `boundVariables` à cet emplacement. Elle peut avoir une valeur en dur, un style, une valeur héritée ou une valeur calculée ; ces cas doivent rester distinguables.
- **Token absent** : aucune variable éligible n'existe dans le catalogue retenu. Ce verdict exige un catalogue complet. Une library inaccessible ou une liaison illisible produit « indéterminé », pas « absent ».
- **Correspondance exacte** : la variable éligible rend la même valeur dans les modes applicables, avec l'unité et le type attendus. Une valeur identique ne prouve pas à elle seule la justesse du rôle.
- **Correspondance proche** : la variable éligible appartient à la bonne famille et au bon rôle, mais sa valeur diffère. La proposition expose cet écart ; la liaison modifie le rendu.
- **Valeur hors périmètre** : champ calculé, non pertinent, déjà couvert par un style selon la politique retenue, ou impossible à lire avec certitude. Elle ne devient pas un « token manquant ».

L'exception « `0 px` » ne concerne que les **longueurs** pour lesquelles zéro est une valeur neutre : padding, gap, rayon ou contour nul. Un zéro d'opacité, un booléen `false` ou un texte vide n'ont pas cette signification. Même pour une longueur, zéro peut être un choix sémantique de variant ; l'exception doit être locale à une famille, pas un filtre global.

## Contrat proposé pour le diagnostic

Pour chaque propriété candidate, relever `{variant, layer, champ, indice ou plage, valeur, unité, provenance, liaison brute, lecture, visibilité, mode}`. Séparer les propriétés explicitement réglées, celles calculées par Figma, celles héritées d'une instance et celles déjà gouvernées par un style. Garder l'identifiant de la liaison brute quand la variable ne peut pas être résolue : une erreur de lecture ne crée pas une absence de token (bug 1 du relevé).

Produire au plus **un constat par propriété et emplacement**, puis lui donner un état : `exact unique`, `exact multiple`, `proche`, `aucun candidat`, `lecture incomplète`, ou `hors périmètre`. La liste par variant reste disponible pour agir ; l'interface peut regrouper les constats homonymes de 90 variants sans confondre leurs identifiants ni leurs corrections. Une absence de variable cible ne doit pas rester dans une question sans choix : montrer une action Figma ou une création de cible si ce flux est ajouté.

### Matrice de couverture à instruire

| Famille | Champs et provenance | Diagnostic envisagé | Liaison automatisable avec l'écriture actuelle ? |
|---|---|---|---|
| Couleur | Peintures SOLID visibles, contours, segments de texte ; distinguer couleur, alpha de peinture et opacité du calque. | Oui pour la couleur sans liaison, avec rôle `background`, `foreground`, `border` ou `icon` déterminable. Comparer par type et rôle, jamais par simple distance RVB. | SOLID sur calque et remplissage de plage de texte : chemins existants à vérifier. |
| Longueurs de layout | Padding, gap, espacement entre axes, rayons communs et par coin, épaisseurs communes et par côté. | Oui pour les valeurs explicites et non nulles. Zéro suit la politique par famille. Valeur négative et fractionnaire restent des nombres valides à traiter selon le champ. | `setBoundVariable` existe pour un champ de calque ; chaque champ et chaque cas par coin demande une recette. |
| Dimensions | Largeur, hauteur, minimum, maximum, grille. | Oui si la valeur est réglée ou contrainte ; classer séparément dimensions issues d'une boîte calculée. Un composant responsive peut avoir une largeur calculée différente par variant. | Partielle ; le relevé actuel n'établit pas la provenance des dimensions. |
| Typographie | Famille, taille, graisse, style, interligne, espacement des lettres, retraits et espacements de paragraphe ; valeurs mixtes par plage. | Candidats seulement dans la famille et l'unité appropriées. Distinguer style de texte et variable liée. | Non en général : l'écriture actuelle ne couvre pas les liaisons typographiques par plage. |
| Visibilité et opacité | `visible`, opacité du calque, opacité de peinture. | Oui si une politique UCM définit les rôles attendus. `0` et `false` sont de vraies valeurs ; aucune exception « 0 px ». | Non dans le flux actuel pour l'ensemble de ces cas. |
| Chaînes, effets, grilles, dégradés et autres types | Propriétés bindables selon l'API Figma, styles et valeurs composites. | Inventorier les cas. Une valeur composite ou un style n'est pas réductible à un nombre proche. | Lecture des liaisons plus large que l'écriture ; étude et tests nécessaires par champ. |

L'[API Figma des champs de nœud](https://developers.figma.com/docs/plugins/api/VariableBindableNodeField/) et celle des [champs de texte](https://developers.figma.com/docs/plugins/api/VariableBindableTextField/) sont les références pour l'inventaire bindable. Le catalogue des [types de variables](https://developers.figma.com/docs/plugins/api/VariableResolvedDataType/) ne garantit pas que chaque type convienne à chaque propriété ni qu'UCM définisse un rôle pour lui. La promesse « absolument tous les types de token » demanderait donc d'étendre le référentiel et l'écriture, en plus du diagnostic. Proposition : afficher d'abord les absences sur les champs dont la valeur et le rôle sont établis, et publier une matrice explicite des champs encore non évalués.

### Valeurs à ne pas convertir en faux positifs

- Calque caché et descendants d'un parent caché ; peinture masquée ; absence de peinture ; composant imbriqué dont les propriétés appartiennent à son maître. La portée exacte des surcharges d'instance doit être choisie.
- Largeur et hauteur produites par auto layout, hug ou fill ; borne illisible ramenée à `0 × 0` ; champ indisponible pour le type de nœud. Une largeur calculée ne prouve pas une dimension en dur.
- Liaison existante mais variable inaccessible ; catalogue partiel ; import de library indisponible ; alias circulaire ou mode absent. Garder un état `indéterminé` jusqu'à lecture fiable.
- Rayon unique contre quatre rayons indépendants ; un coin à zéro et trois à 13 px ; épaisseur globale contre côtés indépendants. Un token commun n'est correct que si les valeurs et la géométrie visée concordent.
- Texte à valeurs mixtes, plages qui se chevauchent, style de texte appliqué et segments sans style ; unités `PIXELS`, `PERCENT` et `AUTO` d'interligne. Ne pas comparer `13 px` à `13 %` ; [l'API LineHeight](https://developers.figma.com/docs/plugins/api/LineHeight/) définit ces unités.
- Couleur d'un arrêt de dégradé, transparence dans une peinture, alpha de couleur et opacité du calque. Ces emplacements ont des liaisons et effets visuels différents.

## Recherche d'un token proche

La proximité **numérique** départage uniquement des candidats déjà qualifiés sur le plan sémantique. Pour un `cornerRadius` de 13 px, filtrer d'abord les variables `FLOAT` accessibles de `layout/radius`, de portée compatible et utilisables dans le contexte du composant. Comparer ensuite leur valeur résolue par mode. Un `layout/sizing` de 13 px, un `layout/stroke` de 14 px ou un token d'une autre bibliothèque ne sont pas des suggestions de rayon.

Algorithme proposé :

1. Indexer le catalogue une fois par `(collection, type, famille, rôle, unité)` et par valeur résolue. Identifier la collection de référence de la configuration ; séparer variables locales, distantes importables et indisponibles.
2. Retenir les candidats de même type, famille et rôle, avec une portée compatible. Les [scopes Figma](https://developers.figma.com/docs/plugins/api/properties/Variable-scopes/) filtrent le sélecteur de l'interface, sans interdire à l'API de lier une variable ; Architect peut néanmoins les utiliser comme règle de qualité.
3. Résoudre les alias et les modes applicables au nœud. Figma expose [`resolveForConsumer`](https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/) pour le contexte consommateur courant. Une comparaison de tous les modes réclame aussi un résolveur sans mutation du document, ou un verdict limité au mode effectivement vérifié. Les `valuesByMode` bruts ne suffisent pas.
4. Classer : égalité exacte d'abord, puis écart absolu et relatif, puis convention de nom et de rôle. En cas d'égalité de rang, garder une question à plusieurs choix. Ne jamais fabriquer un « meilleur » token à partir de sa seule valeur.
5. Afficher la valeur avant, la valeur de la cible, l'écart signé et les modes concernés. Une liaison proche reste une décision explicite, jamais une correction automatique.

Seuil **de départ à valider**, pour les longueurs en pixels seulement : `0 < |candidat − valeur| ≤ min(2 px, 10 % × max(|valeur|, 1 px))`. Ainsi `13 → 14 px` entre dans la fenêtre (écart de 1 px, soit 7,7 %) ; `13 → 16 px` et `1 → 2 px` en sortent. Ce seuil est une hypothèse de conception, pas une règle UCM existante. La précision de comparaison des flottants et les cas `-1 px`, `0,5 px` ou changement de signe demandent des tests. Si plusieurs modes diffèrent, exposer chaque écart et refuser l'application groupée tant qu'un mode n'a pas été évalué. Les couleurs, chaînes et booléens n'utilisent pas cette distance.

[`inferredVariables`](https://developers.figma.com/docs/plugins/api/properties/nodes-inferredvariables/) peut fournir un indice de correspondance exacte sur certains champs non liés. Son absence ne prouve pas qu'aucune cible n'existe dans le catalogue choisi ; la recherche d'Architect doit conserver son propre contrôle des familles, des modes et de l'accessibilité.

## Choix et écriture

| Situation | Action proposée | Garde avant écriture |
|---|---|---|
| Exact unique, rôle certain, tous modes vérifiés | Proposer la liaison à la variable existante. | Relire nœud, champ, liaison et valeur ; vérifier type, famille, clé de variable et modes. |
| Exact multiple ou rôle incertain | Montrer les candidats et demander le choix. | Aucune sélection implicite par ordre du catalogue. |
| Proche, par exemple rayon 13 px et token 14 px | Montrer l'écart et demander « adopter la valeur du token ». Offrir la conservation de 13 px ; si le flux le prévoit, préparer une cible exacte à 13 px. | Confirmer le changement visuel et les écarts de tous les modes. Relire 13 px et la cible au moment d'appliquer. |
| Aucun candidat éligible | Signaler la valeur sans token et le geste Figma à faire. | Une création de token `layout` ou `theme` exige un nouveau flux ; l'écriture actuelle ne crée que `components`. |
| Lecture incomplète ou analyse périmée | Présenter le champ comme non vérifié. | Aucune correction ni préparation sur ce champ. |

La liaison à 14 px fait adopter au calque la valeur résolue du token. Elle peut aussi changer son rendu dans un autre mode ou après une modification ultérieure du token. Ne pas promettre « lien sans changement visuel » pour cette action. `aRelire` et la structure de `Correction` ne portent aujourd'hui ni valeur attendue du champ, ni comparaison multimode, ni consentement au changement ; leur évolution et le contrôle à l'écriture sont nécessaires. Les libellés destinés au designer relèveront de la règle de rédaction des diagnostics au moment de l'implémentation.

## Impacts à traiter avant codage

| Zone | Travail requis | Risque ou dépendance |
|---|---|---|
| Référentiel du kit | Décider si `components` garde seulement `color` et `size` ou accueille d'autres familles ; définir les rôles de typographie, visibilité, opacité et autres types avant de les déclarer obligatoires. | Une extension des noms ou du modèle du kit peut toucher compatibilité, version et publication. Le diagnostic peut précéder cette extension sans promettre une préparation universelle. |
| Relevé Architect et modèle `LayerLu` | Conserver valeur, unité, provenance, emplacement, liaison brute et état de lecture pour chaque champ retenu. Étendre les plages de texte, rayons par coin, min/max, opacité et couleurs selon la matrice. | Surface Figma variable selon le type de nœud ; ne pas assimiler zéro de secours à une vraie valeur. Budget de 2 000 calques et frontière des instances à préserver. |
| Catalogue et modes | Indexer les variables accessibles, résoudre les alias sans cycle, tenir compte du mode du consommateur et des modes des collections. | Variables distantes non importées ou library non choisie ; une valeur brute par mode peut masquer une cible différente. |
| Contrôles, préparation et corrections du kit | Faire partager un classement des candidats entre C29, préparation et écriture. Dédupliquer les constats, distinguer exact/proche/indéterminé. | C25, C29, C32/C33 et les contrôles de typographie peuvent se recouvrir ; garder un fait unique par champ. Réparer le cas sans candidat de la préparation. |
| Sandbox et protocole UI | Transporter provenance, écarts par mode, groupe de variants et raison d'inéligibilité. Garder les identifiants stables pour l'ignorance et la péréemption. | 90 variants multiplient les constats ; une liste exhaustive non groupée ralentit la vue et rend les choix peu lisibles. |
| Interface | Montrer famille, emplacement, valeur, statut du candidat, écart et action. Séparer liaison exacte, adoption d'une valeur proche et geste Figma. | Une question sans candidat ne doit pas bloquer tout un plan. Les lots doivent garder les choix par champ et par variant. |
| Écriture Figma | Ajouter la relecture de la valeur, des modes et de la cible, puis les liaisons des champs nouveaux seulement après tests par propriété. | Changement entre analyse et clic, autre mode actif, style ou liaison ajouté entretemps ; pas de correction sur un relevé périmé. |
| Tests, documentation et recette | Fixtures par champ, unité, mode et cas limite ; tests de régression pour chaque défaut corrigé ; recette Figma sur une copie du Button. Mettre à jour `SPEC.md`, invariants et version si le contrat du kit change. | Les tests locaux ne prouvent pas le rendu Figma. Un réexport et une inspection visuelle restent nécessaires pour les liaisons proches. |

Le contrôle doit rester rapide. La fixture actuelle de 90 variants, 1 080 calques et 36 variables produit déjà 3 152 constats après propositions, dont 2 160 valeurs de dimensions en dur, pour environ 111 ms dans `proposerLesCorrections` hors Figma. Ajouter une recherche complète du catalogue pour chaque champ amplifierait ce coût. Viser une indexation du catalogue en `O(variables × modes)` et un classement par champ parmi sa seule famille, avec mesure séparée du relevé Figma, de l'index et du rendu UI. Garder la cible proposée dans [la note de performance](OPTIMISATION-ANALYSE-90-VARIANTS.md) : moins de 2 s médianes et de 4 s au 95e percentile sur le Button réel, à confirmer par mesure Figma. Aucun gain n'est encore mesuré pour cette évolution.

Ordre d'implémentation proposé : (1) corriger la provenance et l'état de lecture des champs déjà relevés, puis aligner C29 et la préparation sur les longueurs explicites ; (2) ajouter le classement exact/proche par famille et la relecture à l'écriture, avec l'interface de choix ; (3) étendre la matrice aux couleurs ordinaires, à la typographie et aux autres champs après définition de leurs rôles et de leur méthode d'écriture. Mesurer chaque tranche sur la même fixture et le même Button Figma. Si le référentiel UCM ou le modèle partagé du kit change, relire également les consommateurs du kit et les règles de version avant de publier ; le diagnostic seul ne justifie pas de modifier le contrat exporté par l'exporteur.

## Recette minimale

1. Rayon explicite 13 px, `layout/radius` à 14 px : un constat, écart de +1 px, choix explicite ; le champ vaut 14 px après liaison. Token de `sizing` à 13 px exclu.
2. Rayon 13 px avec deux cibles de rayon à 14 px : choix ambigu. Rayon à 16 px : hors seuil proposé. Rayon 0 px : politique d'exception appliquée ; opacité 0 : encore analysée si cette famille est couverte.
3. Rayon par coin `[13, 13, 0, 13]`, contour par côté et dimension auto layout calculée : aucune liaison globale déduite du seul chiffre. Tester aussi 13,25 px et une valeur négative valide pour son champ.
4. Même token valant 14 px dans un mode et 18 px dans un autre, alias vers une autre collection, mode absent, alias circulaire : écarts affichés ou verdict indéterminé ; aucune adoption silencieuse.
5. Variable déjà liée mais illisible, style de texte, plage mixte, peinture masquée, calque dans un parent masqué, instance imbriquée, library indisponible : pas de faux « token absent ».
6. Modifier la valeur, le mode, la liaison ou la variable après l'analyse puis appliquer : refus et nouvelle analyse. Vérifier un lot comprenant une liaison exacte et une proposition proche.
7. Sur 90 variants : compter les propriétés candidates et les constats par famille, comparer les constats et le temps avant/après, vérifier regroupement et identifiants individuels. Mesurer dans Figma ; la fixture Node seule ne valide ni l'API ni le rendu.

## Décisions attendues de la revue

1. Définir le périmètre de « n'importe quel token » : diagnostic de tous les champs bindables par Figma, ou seulement champs dotés d'un rôle UCM ; préciser la place des styles et des types nouveaux.
2. Fixer la politique du zéro par famille, et celle des dimensions calculées, des calques masqués et des surcharges d'instance.
3. Valider ou remplacer le seuil de proximité proposé, la précision des flottants, le nombre maximal de suggestions et la règle de comparaison multimode.
4. Choisir si Architect peut créer une cible `layout` ou `theme` exacte lorsqu'elle manque. À défaut, conserver un geste Figma explicite et débloquer la préparation sans candidat.
5. Décider la première tranche d'implémentation : longueurs explicites et couleurs SOLID, puis typographie et autres champs après définition des rôles et de l'écriture.
