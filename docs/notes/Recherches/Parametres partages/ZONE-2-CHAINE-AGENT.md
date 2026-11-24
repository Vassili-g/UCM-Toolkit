# Zone 2 : la chaîne du contrat vers l'agent

## Étapes

- [x] 1. Relire `CONCEPT.md`, le premier audit P27, `FORMAT.md`, le schéma, le guide, les aides, la procédure, les deux skills et la recette
- [x] 2. Couverture, propriété du schéma par propriété, calculée par script
- [x] 3. Exactitude des champs cités par les aides et la procédure
- [x] 4. Déclenchement, `ucm guide` lancé sur le corpus et sur des contrats fabriqués
- [x] 5. Interdictions de la procédure face au concept
- [x] 6. Questions non tranchées et conventions du repository
- [x] 7. Test froid, `consommer-contrat` face à `RECETTE.md`
- [x] 8. Fiches PP-201 à PP-215, `parametres.json`, contrôle de style

## Synthèse

Les aides traitent 223 des 251 propriétés du schéma qui demandent une aide (88,8 %), dont 185 par leur nom et 38 en prose. 28 propriétés ne sont traitées par aucune aide. 13 changent l'API ou le rendu. Les 15 autres n'en changent rien et devraient figurer dans `SANS_AIDE`.

Le test de couverture actuel vérifie une table, `CHAMPS`, et pas le texte des aides. Il ne voit pas non plus 12 propriétés du schéma.

Le déclenchement est exact. Sur 14 contrats, `ucm guide` imprime les aides des caractéristiques relevées, sans écart. Une seule caractéristique manque, sur un contrat dont la seule disposition est une grille.

Trois aides décrivent un champ autrement que le contrat : l'accroche `center`, le défaut d'une prop `instance-swap` et la source des tokens d'un `ring`. La procédure interdit d'ouvrir le composant à modifier.

Les 15 écarts se répartissent en 10 importants et 5 mineurs, sans écart bloquant. 12 cassent la Confiance et 3 la Robustesse.

## Méthode

Les scripts sont rangés hors du dépôt, dans le dossier `audit-p27-zone2` du brouillon de session. Ils importent `caracteristiques.mjs`, le schéma publié et `contrats-fabriques.mjs` du dépôt, et ne modifient aucun fichier.

| Script | Ce qu'il relève | Résultat |
|---|---|---|
| `couverture.mjs` | chaque couple (définition, propriété) du schéma, sa caractéristique dans `CHAMPS`, les aides qu'elle déclenche et les aides qui citent la propriété entre accents graves, sous son nom, sa forme CSS ou ses valeurs d'énumération | 290 couples, 26 dans `SANS_AIDE`, 13 clés de dictionnaire, 251 à couvrir |
| `champs-presents.mjs` | les couples présents dans un contrat, par un parcours guidé par le schéma | sert à `declenchement.mjs` |
| `declenchement.mjs` | pour chaque contrat, les caractéristiques que ses champs demandent selon `CHAMPS`, celles que `caracteristiquesDuContrat` relève, et les aides que `node packages/cli/src/ucm.mjs guide` imprime en processus | 14 contrats, 0 écart entre la CLI et les caractéristiques |
| `exactitude.mjs` | chaque chemin de champ cité par une aide, `procedure.md` ou `consommer-contrat`, confronté aux propriétés et valeurs du schéma | 0 champ inventé ; 22 citations hors schéma, toutes des rôles, des valeurs CSS ou des fonctions du kit |

Les 14 contrats de `declenchement.mjs` sont les 4 contrats d'UCM-Playground (lancés dans le Playground, avec ses conventions et ses tokens), les 4 fixtures 13.0 du kit, une fixture 11.0 et une 12.0 (refusées en 2, comme attendu), et 4 contrats fabriqués depuis `contrat140()` : le contrat entier, une grille seule, une accroche `center`, un slot réglé.

Aucun contrat 14.0 réel n'existe. Le Playground et les fixtures sont en 13.0. Les aides de la 14.0 (`ombre`, `opacite`) ne passent par `ucm guide` que sur les contrats fabriqués.

## Table de couverture

| Statut | Couples | Ce qu'il recouvre |
|---|---|---|
| nommé par une aide déclenchée | 172 | la propriété figure entre accents graves dans une aide de sa caractéristique |
| nommé par ses valeurs | 10 | `IconDefinition.policy` (`strict`, `modifiable`), `ShadowEffect.type`, `ChildStructure.layout` |
| nommé par une aide de tout contrat | 3 | aide `composant` |
| traité en prose | 38 | `ChildStructure.position`, `constraints`, `inset`, les six catalogues de vues, `RenderingRole.kind`, et les 12 côtés des `SidedRefs` (« côté par côté ») |
| non traité, change l'API ou le rendu | 13 | `Contract.name`, `SlotProp.settings` et ses 5 clés, `SlotProp.preferredValues`, `InstanceSwapProp.preferredValues`, `PreferredComponentValue.type` et `.key`, `TypographyTokens.paragraphSpacing` et `.paragraphIndent` |
| non traité, sans effet de rendu | 15 | `ContractMeta.contractVersion`, `ContractDiagnostic.code`, `.variantName`, `.property`, `.contractPath`, 4 descriptions de props et d'états, `PropertyBindingDefinition.nodeSuffix`, `Contract.intent` et ses 4 clés |
| couvert à tort | 3 champs | `inset` sous `center`, `InstanceSwapProp.default`, tokens du rôle `ring` |

Les valeurs d'énumération qui changent le rendu sont toutes citées ou recopiées telles quelles. Les valeurs non citées (`flex-start`, `space-between`, `baseline`, `left`, `right`) sont des valeurs CSS que les aides font recopier sans traduction.

## Fiches

### PP-201 · `CHAMPS` déclare une aide que l'aide ne contient pas

| | |
|---|---|
| Champ ou règle | la couverture du schéma par les aides |
| Ce que dit le contrat | 251 couples publiés demandent une aide |
| Ce que dit l'aide ou le guide | l'en-tête de `packages/kit/src/lecteurs/caracteristiques.mjs:10-13` affirme qu'« un champ ajouté sans aide fait échouer la suite ». `CHAMPS` range 28 couples sous une caractéristique dont aucune aide ne les nomme, par exemple `"SlotProp.settings": "toujours"` (`:242`), `"Contract.intent": "toujours"` (`:106`), `"PropertyBindingDefinition.nodeSuffix": "liaison-native"` (`:195`) |
| Preuve | `couverture.mjs`, statut `non-couvert` ; `packages/cli/tests/aides.test.mjs:113-118` compare le schéma à `CHAMPS` et `SANS_AIDE`, jamais au texte des aides |
| Cas | un champ `border.dash` arrive dans le schéma. L'auteur l'inscrit dans `CHAMPS` sous `contour-border` et le test passe. L'aide n'en dit rien, et l'agent invente un pointillé |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un test lit chaque aide et exige, pour chaque couple de `CHAMPS`, que la propriété apparaisse entre accents graves (nom, forme CSS ou toutes ses valeurs) dans une aide de sa caractéristique ; une table `EN_PROSE` nomme les exceptions avec la phrase que le test retrouve dans l'aide. Les 15 couples sans effet de rendu passent dans `SANS_AIDE`, avec une raison (« version du format », « documentation », « identité Figma ») |

### PP-202 · Les réglages et les valeurs préférées d'un slot n'ont aucune aide

| | |
|---|---|
| Champ ou règle | `SlotProp.settings` (`minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `stretchChildOnInsert`, `displayEmptyByDefault`), `preferredValues` d'un slot et d'un `instance-swap` |
| Ce que dit le contrat | `types.ts:90-92` : « Le contrat les rapporte sans les imposer : ce sont les réglages de la maquette, pas une contrainte de rendu » |
| Ce que dit l'aide ou le guide | `composant.md` : « Une prop `slot` reçoit une API explicite, sans sémantique que le contrat ne publie pas. » Le contrat publie ces réglages ; l'aide ne dit pas s'ils lient le code |
| Preuve | `couverture.mjs`, 10 couples ; PP-08 relève les mêmes noms absents de `FORMAT.md` |
| Cas | un agent lit `maxChildren: 3` et refuse un quatrième enfant à l'exécution, ou l'ignore. Les deux lectures se défendent |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | la phrase de `types.ts` passe dans `composant.md` ; PP-201 l'exige ensuite |

### PP-203 · Les tokens de paragraphe n'ont pas d'écriture

| | |
|---|---|
| Champ ou règle | `TypographyTokens.paragraphSpacing` et `.paragraphIndent` |
| Ce que dit le contrat | `FORMAT.md:379-381` les liste parmi les références d'un style de texte |
| Ce que dit l'aide ou le guide | `typographie.md:17-18` donne l'écriture de 5 tokens sur 7 et omet ces deux-là. Le juge du code connaît pourtant la correspondance : `controle-du-code-listes.mjs:89` range `text-indent` sous la typographie, « champ `paragraphIndent` » |
| Preuve | `couverture.mjs` ; `contrat130()` porte les deux tokens |
| Cas | un style porte `paragraphIndent`. L'agent ne l'écrit pas, ou écrit `padding-left` ; le retrait de première ligne manque au rendu |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | l'écriture cite `text-indent` et l'écriture retenue pour l'espacement de paragraphe ; un test exige que chaque clé de `TypographyTokens` apparaisse dans `typographie.md`, ce que PP-201 généralise |

### PP-204 · « Un `default` publié s'applique tel quel » est faux pour un `instance-swap`

| | |
|---|---|
| Champ ou règle | `InstanceSwapProp.default`, `SlotProp.default` |
| Ce que dit le contrat | `types.ts:72` : « Id du composant Figma choisi par défaut. » Un slot publie `string` ou `boolean`, sans sens documenté (`FORMAT.md:118`) |
| Ce que dit l'aide ou le guide | `composant.md:17-18` : « Un `default` publié s'applique tel quel » |
| Preuve | `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts:314-321` écrit `definition.defaultValue`, un identifiant de nœud |
| Cas | une icône remplaçable publie `"default": "12:345"`. L'agent écrit `icon = "12:345"`, une valeur qu'aucun code ne sait rendre |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | l'aide distingue le défaut d'un `instance-swap` (identité Figma, à ne pas recopier) et dit le sens d'un défaut de slot ; un test du guide fabrique un `instance-swap` et vérifie la phrase |

### PP-205 · Le validateur exige des champs que le schéma dit facultatifs

| | |
|---|---|
| Champ ou règle | `default` et `preferredValues` d'un `instance-swap` et d'un `slot` |
| Ce que dit le contrat | le schéma et `types.ts:70-81` les déclarent facultatifs, `FORMAT.md:118` dit l'absence possible, et le schéma refuse `null` |
| Ce que dit l'aide ou le guide | `validation-contrat.mjs:887-899` refuse un `default` absent et un `preferredValues` absent, et accepte `null`. `ucm guide` et `ucm check` sortent en 2 avec « Un designer doit réexporter le composant depuis Figma » |
| Preuve | `champsInvalidesDuContrat` rend `props.x.default` et `props.x.preferredValues` pour `{ type: "slot" }` et pour `{ type: "instance-swap" }` ; `declenchement.mjs`, contrat `fabrique/slot-reglages`, code 2. L'exporteur omet `default` quand Figma n'en donne pas (`proprietesEtEtats.ts:317-319` et `:328-331`) |
| Cas | un slot sans valeur par défaut dans Figma. Le contrat est refusé, et le réexport demandé reproduit le même contrat |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un test passe chaque exemple minimal du schéma (propriétés requises seules) par `champsInvalidesDuContrat` et exige zéro refus |

### PP-206 · L'écriture de l'accroche `center` efface les distances publiées

| | |
|---|---|
| Champ ou règle | `constraints` `center` et `scale`, `inset` |
| Ce que dit le contrat | sous `center`, `stretch` et `scale`, `inset` publie les deux côtés de l'axe (`types.ts:386-389`, `flexLayout.ts:408-409`). Un calque centré avec un décalage publie `left: 10px` et `right: 30px` |
| Ce que dit l'aide ou le guide | `position-absolue.md:16-19` dit d'abord « Chaque clé d'`inset` devient la propriété du même nom », puis pour `center` « `inset-inline: 0` et `margin-inline: auto` ». La seconde phrase annule la première et centre exactement. `scale` ne reçoit aucune écriture propre |
| Preuve | `declenchement.mjs`, contrat `fabrique/centre` ; lecture des deux fichiers |
| Cas | un badge centré avec 10 px de décalage dans Figma. L'agent le rend centré, 10 px trop à droite. Sous `scale`, il le rend comme `stretch` |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | l'écriture de `center` garde le décalage (`translate` de la moitié de l'écart entre les deux côtés) ; un test du guide fabrique une accroche `center` décentrée et vérifie que l'écriture cite les deux côtés |

### PP-207 · La procédure interdit d'ouvrir le composant à modifier

| | |
|---|---|
| Champ ou règle | ce que l'agent ne fait pas |
| Ce que dit le contrat | `CONCEPT.md` §3 donne au code le comportement, les événements et l'accessibilité. §5 réserve l'interdiction d'ouvrir l'implémentation au test froid, sur une branche de recette |
| Ce que dit l'aide ou le guide | `procedure.md:39` : « Ouvrir une ancienne implémentation du composant » fait partie de ce qui ne se fait pas. La skill `ucm-implementer` qu'`ucm init` écrit se charge pour « Implémenter ou modifier un composant » (`init.mjs:293`) |
| Preuve | lecture ; `guide.mjs` imprime `procedure.md` pour tout contrat |
| Cas | le designer ajoute une variante. L'agent doit mettre `Button.tsx` à jour sans l'ouvrir : il le réécrit et perd la gestion du clavier et les attributs ARIA, ou il enfreint la procédure |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | la procédure distingue la modification, qui part du code existant et ne touche que ce que le contrat décrit, de la reconstruction à froid, que `consommer-contrat` règle déjà ; un test de `guide.test.mjs` refuse l'interdiction sans cette distinction |

### PP-208 · Une question déjà répondue par les conventions reste « Non tranché »

| | |
|---|---|
| Champ ou règle | ancrages et `.ucm/conventions.md` |
| Ce que dit le contrat | rien ; la réponse appartient au repository |
| Ce que dit l'aide ou le guide | `guide.mjs:177-180` ne tient un ancrage pour répondu que par une section `## <aide>`. `procedure.md:29` parle d'« un ancrage sans réponse dans les conventions », texte de tête compris |
| Preuve | `ucm guide` sur le Button du Playground : la tête répond à `icone-composant` (« `src/Icone.tsx` »), à `controles` (« Contrôle : `npx tsc --noEmit` ») et à `chargement-feuilles`. Le guide imprime « Contrôles du repository : `npx tsc --noEmit` » sous `composant`, puis range `controles` sous « Non tranché ». Le Button du Playground reçoit 7 questions, dont 3 déjà répondues. La ligne recopie le sens de l'ancrage, pas une question |
| Cas | un agent froid s'arrête pour demander quel contrôle lancer alors que le guide l'a nommé 330 lignes plus haut. Après plusieurs guides, il apprend à ignorer la section |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | chaque ancrage porte une question formulée dans son fichier ; un contrôle en tête compte comme réponse à `controles` ; `ucm aides` signale une tête qui répond à un ancrage sans section. Test : un guide dont les conventions répondent en tête ne liste pas cet ancrage |

### PP-209 · Les aides font lancer `npx ucm` sans version

| | |
|---|---|
| Champ ou règle | la commande que l'agent exécute |
| Ce que dit le contrat | rien |
| Ce que dit l'aide ou le guide | `resolution-token.md:24,32` (`npx ucm tokens references`), `procedure.md:44` (`npx ucm deroger`), `derogations.mjs:163` et `controle-repository.mjs:320`. Le relais épingle `npx --yes @ucm-kit/cli@<version>` (`init.mjs:296`) |
| Preuve | le cas nominal de la recette n'a pas de `package.json`. Sans `@ucm-kit/cli` installé, `npx ucm` résout un paquet du registre nommé `ucm`, sans invite quand l'entrée n'est pas un terminal (comportement documenté de `npm exec`) |
| Cas | un agent sans terminal interactif lance `npx ucm tokens references` dans un repository sans `package.json`. npm installe et exécute un paquet étranger à UCM, ou une autre version que celle du relais |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | complète PP-03 et PP-17. Les aides écrivent `ucm …`, et le guide imprime en tête la commande épinglée du relais ; le test de PP-17 refuse `npx ucm` dans les aides, la procédure et les messages du kit |

### PP-210 · Le test froid a deux protocoles et aucun critère de jugement

| | |
|---|---|
| Champ ou règle | la reconstruction à froid de `CONCEPT.md` §5 |
| Ce que dit le contrat | le test « mesure la qualité du contrat » |
| Ce que dit l'aide ou le guide | `RECETTE.md:303-321` fait charger le relais `ucm-implementer`, puis juge à l'œil après `npm run dev`. `consommer-contrat` ajoute des règles que ce relais ne porte pas : chemin absent avant de commencer, aucune capture Figma, sources supplémentaires limitées aux types générés, compte rendu des manques. Les 7 critères de l'étape 7 ne jugent pas la reconstruction. Les preuves de `ombre`, `opacite`, `rotation` et `contour-ring` demandent une « comparaison visuelle à la maquette », que `consommer-contrat:15` interdit d'ouvrir. `RECETTE.md:275` publie `components/Button/…` et `:310` attend `src/components/Button/Button.tsx` |
| Preuve | lecture des trois fichiers |
| Cas | deux recettes du même contrat suivent deux protocoles. L'une compte une ombre approximative comme un défaut du contrat, l'autre comme un écart de rendu acceptable |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | un protocole unique, celui de `consommer-contrat`, cité par `RECETTE.md` ; une grille de jugement par famille (donnée transcrite, inventée, manquante au contrat) ; un test de `docLinks` ou de `registreDesDocuments` exige que l'étape 6 cite la skill |

### PP-211 · Le test de couverture ne voit pas les quatre définitions `SidedRefs`

| | |
|---|---|
| Champ ou règle | parcours du schéma dans `packages/cli/tests/aides.test.mjs` |
| Ce que dit le contrat | le schéma publie `SidedRefs<…>` sous un `$ref` encodé (`%3C`, `%22`) |
| Ce que dit l'aide ou le guide | `aides.test.mjs:83,90` découpe le `$ref` sans `decodeURIComponent`. La définition n'est pas trouvée, et ses propriétés ne sont jamais parcourues |
| Preuve | `couverture.mjs`, 12 couples hors de `CHAMPS` et de `SANS_AIDE` (`left`, `right`, `top`, `bottom`, `topLeft`…) ; le test officiel compte 278 couples, le schéma en porte 290 |
| Cas | un champ ajouté à un côté de `padding` ou de largeur de contour échappe au test |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | décoder le `$ref`, inscrire les 12 couples dans `CHAMPS`, et exiger que chaque définition du schéma soit visitée |

### PP-212 · L'aide `contour-ring` se trompe de source et omet la cible

| | |
|---|---|
| Champ ou règle | rôle `ring` |
| Ce que dit le contrat | couleur et largeur dans `variants[].strokes[clé]`, cibles dans `view.paintPlacements.strokes[clé]` ; `rendering.roles.ring` porte `kind`, `cssProperties` et `fallback` |
| Ce que dit l'aide ou le guide | `contour-ring.md:8-9` : « Sa nature et ses tokens viennent de `rendering.roles.ring` ». L'aide ne cite pas `paintPlacements` |
| Preuve | Button du Playground : `rendering.roles.ring` sans token, `viewPaintPlacements.*.strokes.ring` vaut `[[]]` |
| Cas | un contrat qui porte un `ring` sans `border` ne déclenche pas `contour-border`, la seule aide qui nomme les cibles d'un contour |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | la phrase cite `variants[].strokes[clé]` et `paintPlacements.strokes[clé]` ; PP-201 l'exige |

### PP-213 · Une grille seule perd l'aide de `alignSelf`

| | |
|---|---|
| Champ ou règle | `ChildStructure.alignSelf` et `rowGap` sous une grille |
| Ce que dit le contrat | `FORMAT.md:744-746` : un enfant de grille publie `justifySelf` et `alignSelf` |
| Ce que dit l'aide ou le guide | `CHAMPS` range `alignSelf` et `rowGap` sous `disposition` (`caracteristiques.mjs:61,83`), relevée seulement par un conteneur flex. `grille.md:11` cite `justifySelf`, pas `alignSelf` |
| Preuve | `declenchement.mjs`, contrat `fabrique/grille-seule` : `disposition` demandée par `CHAMPS`, non relevée, aide absente du guide |
| Cas | un composant dont la racine est une grille. L'agent ignore l'alignement vertical d'une cellule |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `grille.md` cite `alignSelf` et `rowGap` ; le test de déclenchement de `declenchement.mjs` entre dans `caracteristiques.test.mjs` |

### PP-214 · Le guide réduit un diagnostic d'export à son message

| | |
|---|---|
| Champ ou règle | `meta.diagnostics[]` |
| Ce que dit le contrat | chaque entrée porte `code`, `message`, et selon le cas `variantName`, `property`, `contractPath` |
| Ce que dit l'aide ou le guide | `guide.mjs:130` imprime `messagesDExport`, qui ne garde que `message` (`variant-views.mjs:118-123`). `procedure.md` demande de rapporter un manque « avec le champ et la combinaison concernés » |
| Preuve | lecture |
| Cas | deux variants portent le même avertissement. Le compte rendu de l'agent ne dit pas lequel |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | le guide imprime la combinaison et le champ quand le diagnostic les porte ; test sur un contrat fabriqué |

### PP-215 · Aucune aide ne dit d'où vient l'identifiant de code

| | |
|---|---|
| Champ ou règle | `Contract.name` |
| Ce que dit le contrat | `FORMAT.md:1265-1270` : `name` garde le nom Figma exact (« Icon / Button »), l'identifiant de code vient de `codeIdentifier` (`names.ts:16`) et nomme le fichier |
| Ce que dit l'aide ou le guide | `identifiants.md` renvoie aux conventions ou à l'erreur du contrôle de parité |
| Preuve | `couverture.mjs` |
| Cas | l'agent exporte `Icon / Button` sous un nom qu'il invente, puis attend l'erreur de parité pour corriger |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | le guide imprime l'identifiant que `codeIdentifier` rend, dans « Contexte du contrat » ; test du guide |

## Ce qui tient

- Les noms de champs que les aides citent existent tous dans le schéma (`exactitude.mjs`).
- Les aides imprimées sont exactement celles des caractéristiques relevées, sur les 12 contrats acceptés.
- Les contrats 11.0 et 12.0 sont refusés avec le bon destinataire (« Un designer doit réexporter »).
- `composant.md` interdit de charger le contrat à l'exécution, `echantillon.md` interdit d'en faire une donnée de rendu, et `procedure.md` interdit le produit cartésien et la clé comblée.
- `ecritures-par-defaut: non` range seulement `resolution-token` sous « Non tranché » ; les autres aides gardent leur sens sans écriture, comme `guide.test.mjs:131` le fixe.

## Questions au mainteneur

- PP-201, garde de couverture. Options : (a) un test exige que l'aide nomme chaque couple de `CHAMPS`, exceptions en prose citées ; (b) `CHAMPS` porte, pour chaque couple, la phrase de l'aide qui le traite. Recommandation : (a), la table actuelle reste et le texte devient la preuve.
- PP-202, réglages de slot. Options : (a) l'aide dit qu'ils ne lient pas le code ; (b) l'aide demande de les appliquer ; (c) ils passent dans `SANS_AIDE`. Recommandation : (a), conforme à `types.ts`.
- PP-204, défaut d'un `instance-swap`. Options : (a) l'aide dit de ne pas recopier l'identifiant Figma ; (b) l'exporteur publie le nom du composant, comme `args` le fait déjà (`FORMAT.md:1194-1199`). Recommandation : (b), puis (a) pour les contrats déjà publiés.
- PP-205, champs exigés par le validateur. Options : (a) le validateur suit le schéma ; (b) l'exporteur écrit toujours `default` et `preferredValues`, et le schéma admet `null`. Recommandation : (a), le schéma est généré de `types.ts`.
- PP-206, accroche `center`. Options : (a) l'écriture garde le décalage publié ; (b) l'exporteur ne publie qu'un écart au centre. Recommandation : (a), sans changement de format.
- PP-207, procédure. Options : (a) deux procédures, modification et reconstruction ; (b) une procédure, l'interdiction réservée à `consommer-contrat`. Recommandation : (b), une seule procédure imprimée.
- PP-208, réponses en tête. Options : (a) seule une section répond, et `ucm aides` signale la tête qui répond ; (b) le guide lit aussi la tête. Recommandation : (a), la règle reste lisible par une machine.
- PP-210, test froid. Options : (a) `RECETTE.md` adopte `consommer-contrat` et une grille de jugement ; (b) la recette garde son relais et `consommer-contrat` disparaît. Recommandation : (a).
