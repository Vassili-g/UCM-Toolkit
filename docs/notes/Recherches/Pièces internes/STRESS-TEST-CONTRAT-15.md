# Stress test du contrat 15.0

La première passe a trouvé des erreurs corrigées dans [FORME-CONTRAT-15.md](./FORME-CONTRAT-15.md) et quatre questions de résolution, tranchées depuis. Le tableau qui suit donne ses verdicts. La [passe finale](#passe-finale) relance les huit épreuves sur la version finale de la forme. L'égalité des vues simulées ne prouve pas la sortie du futur moteur.

| Épreuve | Verdict |
|---|---|
| 1. Dérivation aveugle | terminée ; le corps gardait `sizes` malgré son retrait validé ; la façade de lecture perdait la version et les rôles |
| 2. Aller-retour | 0 écart sur les vues des 90 variants de Button et des 3 de Groupe, après les corrections voulues ; métadonnées 15.0 incomplètes dans les simulations |
| 3. Absences | 28 paires écrites ; les feuilles normatives absentes ne reprennent pas le maître ; les écarts d'échantillon gardent leur héritage explicite |
| 4. Mutations | refus éprouvés sur les renvois, sources, peintures, cycles, profondeurs et échantillons ; certaines vérifications exigent le texte JSON ou les faits Figma |
| 5. Cas limites | 17 contrats attendus passent le prototype ; 4 témoins exposent des trous ou contradictions |
| 6. Reconstruction | 5 composants compilent et 363 rendus HTML passent ; le rendu complet reste impossible avec les seules données fournies |
| 7. Taille | chiffres corrigés en octets UTF-8 ; Button simulé pèse 48 275 octets, Groupe 78 799 |
| 8. Lecteurs | 74 fichiers classés ; un lecteur de modes et plusieurs aides manquaient au §6.1 |

## 1. Dérivation aveugle

L'agent 1 a écrit `_local/p22/codex/derivation-aveugle.md` avant d'ouvrir la forme proposée, le script de mesure ou les résultats de l'agent 2. `_local/p22/codex/JOURNAL-CODEX-1.txt` conserve l'heure de fin. La comparaison est dans `_local/p22/codex/comparaison-aveugle.md`.

La dérivation gardait des catalogues par pièce et des liaisons exposées dans l'hôte. Ces choix n'étaient pas imposés par les décisions. Les catalogues partagés et les liaisons portées par les variantes de pièce conservent les données si leur résolution est définie.

Le retrait de `structure.sizes` était absent du corps de la proposition. La réponse 1 du mainteneur, au §7, le validait déjà. La correction C2 l'applique au §1, au §2.6, à l'exemple, aux lecteurs et au type de projection. Elle reporte aussi les réponses validées sur Icon et les couleurs du cas 3.

La façade du §2.12 présentait deux défauts. Sans `meta.contractVersion`, `packages/kit/src/lecteurs/variant-views.mjs` traite la façade comme une ancienne version et retourne le variant brut. L'étalement final des champs de la pièce écrasait aussi `rendering.roles`. `_local/p22/codex/preuves-forme.mjs` reproduit les deux défauts. La correction C3 prête la version de lecture et assemble `rendering` en dernier.

## 2. Aller-retour

`_local/p22/codex/constructeur15.cjs` construit la simulation depuis les contrats 14.0 rejoués. L'agent 2 l'a écrit avant de lire le script de mesure précédent. `_local/p22/codex/deplier15.cjs` développe chaque occurrence. `_local/p22/codex/aller-retour15.cjs` compare les arbres, typographies, effets, icônes, dépendances, peintures, liaisons et échantillons.

La comparaison emploie les chemins Figma pour rapprocher les slots renommés. Elle compare le contenu résolu des catalogues, car leur numérotation peut changer. Elle n'invente aucune combinaison.

| Composant | Variants comparés | Écarts après corrections voulues |
|---|---|---|
| Button | 90 | 0 |
| Groupe | 3 | 0 |

Les corrections admises sont fondées sur les décisions suivantes.

| Correction | Fondement |
|---|---|
| Les props de pièce exposée gardent leurs clés et reçoivent `source` | D1, E2 |
| Les props internes et leurs valeurs indicatives quittent l'API de Groupe | D1, F39 |
| Les couleurs d'aperçu quittent les variantes des pièces | D2 |
| Les dimensions restent dans chaque vue et `sizes` disparaît | réponse 1 du mainteneur |
| La visibilité de l'icône ne masque plus toute la pièce ni son cadre | F22 |
| La couleur de l'icône reçoit son adresse dans la pièce | D3, F19 |

Le constructeur garde les 7 liaisons directes de chaque variant de Groupe. Le déplacement des liaisons exposées de Button conserve leurs identifiants exacts. La comparaison avec la simulation précédente retrouve aussi 0 écart de vues sur les 90 variants de Button.

Les simulations ne recalculent pas toutes les métadonnées. Groupe garde 2 notices de la 14.0 et des diagnostics de collision ou de visibilité que D1 et F22 rendent faux. Le contrat source de sa pièce porte 16 pertes, dont 11 messages manquent à la simulation. Une ombre de pièce sans couleur en donne un témoin dans `_local/p22/codex/meta-limites-resultats.json`. Le prototype ne prouve donc pas la conformité globale du contrat simulé au §2.11. Ce défaut des simulations reste distinct des erreurs de forme.

## 3. Absences

`_local/p22/codex/absences.cjs` écrit 28 paires de contrats. Chaque paire diffère d'un seul champ. `_local/p22/codex/resultats-absences.json` donne les deux sens attendus et les refus du prototype.

Les paires couvrent `pieces`, `piece`, `source`, les champs facultatifs des entrées, les feuilles et les renvois intérieurs, les écarts d'échantillon, les champs de boîte de l'occurrence et le retrait de `sizes`. Elles couvrent aussi la nouvelle portée directe de `composes`, `icons` et `rendering.keyRoles` à la racine.

Une feuille absente vaut vide. Le cas `_local/p22/codex/cas/F6-effacement.json` conserve un maître peint mais retire le dernier fill et le dernier contour de l'occurrence. Le dépliage ne reprend aucune peinture du maître. Une absence de `size`, d'opacité, de rotation ou de borne sur le slot ne reprend pas la boîte du maître.

Un `PieceSample` absent conserve le contenu indicatif de la variante citée. Un texte remplacé par une chaîne vide efface ce texte. Ce sens diffère de celui des feuilles normatives, mais la frontière `samples` l'écrit.

Certaines paires ne peuvent pas être deux contrats valides. Ajouter seulement un token sans son placement viole le miroir des peintures. Retirer seulement un renvoi laisse son slot sans occurrence. Ces paires vérifient le refus de l'incohérence. Elles ne prouvent pas deux rendus valides.

Un `INSTANCE_SWAP` illisible révélait une contradiction. Le §2.11 admettait son omission avec perte, mais le §2.13.6 exigeait sa valeur. Le cas `_local/p22/codex/cas/Q-swap-illisible.json` reproduit ce refus. La correction C5 admet l'omission avec une perte ciblée et une couverture partielle. Elle maintient le refus d'un booléen manquant.

## 4. Mutations

`_local/p22/codex/valider15.cjs` applique les invariants des entrées et des occurrences. Il accepte les deux simulations et les 17 cas attendus. Il reste un prototype de cohérence, sans remplacer le schéma ni tous les contrôles 14.0.

`_local/p22/codex/mutations15.cjs` exerce 32 mutations. Trente sont refusées. Deux restent indécidables depuis l'objet publié, l'appartenance d'un identifiant direct à l'hôte et la collision de deux propriétés Figma déjà réduites à une seule clé JSON.

`_local/p22/codex/mutations-echantillons.cjs` ajoute 9 mutations refusées sur les adresses et le contenu des `PieceSample`. `_local/p22/codex/mutations-limites.cjs` éprouve une chaîne d'instance intérieure étrangère et une clé répétée dans le texte JSON. Les 43 mutations donnent donc 41 refus après correction et 2 altérations indécidables depuis l'objet publié.

| Famille | Mutations exercées |
|---|---|
| Renvois | retrait, doublon, variante absente, vue absente, occurrence sans slot, entrée orpheline |
| Slots | pièce absente, pièce avec sous-arbre recopié, dépendance simultanée, flux intérieur interdit |
| Sources | slot absent, prop absente, type différent, valeurs d'enum différentes |
| Valeurs | prop exposée recopiée, prop inconnue, prop requise manquante, type faux |
| Peintures | token sans placement, placement sans token, adresse absente |
| Graphe | cycle, profondeur de 13, identifiant de variante répété |
| Catalogues | entrée orpheline, clé de pièce fausse, collision avec l'hôte |
| Échantillons | occurrence absente ou répétée, entrée sans écart, texte mal adressé, propriété incompatible |

La correction C6 ajoute le refus des chaînes imbriquées étrangères et des clés JSON répétées au §2.13. Un objet obtenu après `JSON.parse` ne conserve pas les membres écrasés. Le contrôle des doublons doit lire le texte avant son décodage.

La correction C7 précise la jointure des identifiants. `_local/p22/codex/chaine-identifiants.cjs` reproduit deux jointures fausses avec le même identifiant réel. Préfixer sans retirer le `I` existant produisait `II` en tête ou un `I` au milieu. La jointure corrigée garde un seul `I` initial et rétablit le suffixe de liaison avant l'assemblage.

## 5. Cas limites

Les attentes sont écrites dans `_local/p22/codex/cas/attendus.cjs`, avant la lecture du validateur par l'agent 1. `_local/p22/codex/cas/ecrire.cjs` ajoute seulement l'enveloppe commune d'identité et de rôles. Les composants portent des noms inventés.

| Cas | Composant inventé | Attente |
|---|---|---|
| L1 | Lanterne | deux pièces à tailles, sans élection |
| L2 et L4 | Balise | pièce non exposée, toutes ses tailles conservées |
| L3 et F23 | Signal | axe propre de l'hôte et axe de pièce distincts |
| L5 | Fanion et Flambeau | préfixe reconnu avec valeurs inconnues ; détail sans préfixe aplati avec perte |
| L6 | Phare | API exposée partiellement, perte nommant le variant |
| F5 | Girouette | pièce partagée, couleur portable d'un autre hôte conservée |
| F6 | Torche | dernière peinture et dernier contour effacés |
| F7 | Borne | variante intérieure remplacée dans une occurrence |
| F8 | Rivet | liaison de l'hôte traversant la pièce conservée |
| F9 | Flamme | boîte du slot prioritaire sur celle du maître |
| F10 | Eclat | booléen faux et échange d'instance normatifs |
| F11 et D6 | Veilleuse | renvoi dans le contenu par défaut d'un SLOT masqué par prop |
| D6 inverse | Etincelle | contenu d'un SLOT de pièce manquant avec perte |
| F16, F19, F21 et F27 | Aurore | glyphes repeints et deux dépendances comptées |
| F33 | Lueur | axe à valeur unique publié sans obligation de règles |
| F44 | Couronne | même couleur de contour avec largeurs distinctes par occurrence |

Les 17 contrats passent le validateur. Les cinq assertions de `_local/p22/codex/cas/semantique.cjs` vérifient aussi l'effacement sans héritage, le renvoi imbriqué, la priorité de boîte, la cardinalité et les contours distincts. Les refus de F25 et F29 sont éprouvés par les mutations. F28 est exercé par les catalogues partagés entre propriétaires. F38 et F39 restent des obligations de migration, sans moteur 15.0 dans ce lot.

Quatre témoins supplémentaires sont dans `_local/p22/codex/cas/questions.json`. Ils portent sur la source à deux niveaux, le choix entre variantes de mêmes coordonnées, l'exposition d'une dépendance et l'échange illisible. Le dernier a reçu la correction C5. La reconstruction ajoute la question des états internes.

## 6. Reconstruction à froid

L'agent 1 a suivi `.agents/skills/consommer-contrat/SKILL.md`. Le dossier `_local/p22/codex/reconstruction/` était absent au départ. La reconstruction lit les deux contrats simulés et le §2 de la forme. Elle n'ouvre aucune ancienne implémentation ni capture Figma.

Les cinq fichiers produits sont `_local/p22/codex/reconstruction/Button.tsx`, `_local/p22/codex/reconstruction/SizeWrapperButton.tsx`, `_local/p22/codex/reconstruction/Ring.tsx`, `_local/p22/codex/reconstruction/Groupe.tsx` et `_local/p22/codex/reconstruction/Segment.tsx`. Leurs JSX et styles sont statiques. Ils ne chargent aucun contrat au runtime.

Le contrôle TypeScript strict passe. `_local/p22/codex/verifier-reconstruction.tsx` rend les 90 variants de Button dans ses 3 tailles, les 90 variantes de Segment et les 3 de Groupe. Les 363 rendus passent. Cinq contrôles supplémentaires éprouvent les visibilités, le SLOT, l'anneau et l'absence de lecture du contrat au runtime.

Le rendu HTML ne prouve pas le rendu visuel. Aucun fichier de tokens ni contrat autonome d'Icon n'est fourni par l'épreuve 2. Les glyphes passent donc par une fonction d'intégration fournie par l'appelant. Les enums sans défaut restent requis. Le texte `Label` vient de l'échantillon et reçoit un point de remplacement dans le code. Le choix d'un élément HTML natif pour Button relève du code applicatif.

`_local/p22/codex/reconstruction/releve.json` relève 119 manques ou limites de rendu. Il compte 99 contours sans largeur, soit les 90 variantes de Segment et leurs 9 occurrences. Il compte 18 usages d'une ombre sans couleur. Il relève aussi 2 formes de contraintes `scale` dont les proportions ne se déduisent pas des seuls offsets en pixels. La reconstruction laisse ces données absentes. Les largeurs et la couleur d'ombre manquaient déjà dans les contrats 14.0 des pièces.

Le §2.12.3 fige la vue d'un renvoi sans prop exposée. La pièce Segment publie pourtant son `stateModel`. Le code peut transcrire ses 90 variantes, mais la règle ne dit pas comment un état interne remplace la vue de l'occurrence. Le rendu des occurrences de Groupe conserve donc la vue citée. La question 4 doit être tranchée avant d'annoncer une reconstruction interactive complète.

La CLI actuelle refuse la version 15.0 lorsqu'elle reçoit la commande de guide. La procédure de `packages/cli/procedure.md` et le §2 ont servi de référence locale. Le contrôle `ucm check` et la comparaison visuelle restent impossibles pour ce prototype de format.

## 7. Taille

`_local/p22/codex/mesurer15.cjs` et `_local/p22/codex/delta-mesures-resultats.json` portent les calculs. Les chiffres du §5.1 de la forme utilisent désormais les octets UTF-8 du JSON sans espaces.

| Contrat | 14.0 | Simulation indépendante 15.0 |
|---|---|---|
| Button | 49 663 | 48 275 |
| Groupe | 13 205 | 78 799 |
| Groupe et pièce 14.0 sans ses métadonnées | 83 824 | 78 799 |

Le chiffre précédent de Button 15.0 valait 49 250 caractères, soit 49 305 octets. L'écart avec 48 275 dépasse 2 %. Le retrait validé de `sizes` explique 1 125 octets. À décision identique, les deux simulations diffèrent de 95 octets, soit 0,2 %, et leurs vues dépliées sont identiques.

Groupe contient les 90 variantes de Segment. Son entrée pèse 51 405 octets. Les 9 renvois pèsent 3 945 octets. Leurs objets de feuilles isolés pèsent 2 532 octets. Supprimer ces champs des renvois retire 2 523 octets, avec leurs séparateurs. `_local/p22/codex/couts-champs.cjs` vérifie les deux conventions. L'écart de −434 octets avec la simulation précédente vient des structures, des valeurs de renvoi et de l'entrée de pièce. La correction C4 reporte les unités, chiffres et bornes de cette mesure dans la forme.

Ces tailles gardent les limites de métadonnées décrites à l'épreuve 2. Elles ne fixent ni seuil d'acceptation ni temps d'analyse du futur moteur.

## 8. Lecteurs

`_local/p22/codex/lecteurs-inventaire.json` classe 74 fichiers dans 24 groupes. La recherche couvre le kit, le socle, les trois produits concernés, la CLI et ses aides, l'adaptateur et `.agents/skills/`.

`packages/kit/src/lecteurs/modes-tokens.mjs` manquait au §6.1. Sa fonction `axesDuContrat` ne parcourt que les dépendances directes du contrat. `_local/p22/codex/lecteurs-preuve.mjs` donne 0 axe pour une dépendance posée dans une pièce, puis l'axe `theme` quand la même dépendance est présentée à la racine. La correction C8 ajoute ce lecteur à la forme et au travail du lot 3.3.

La correction C8 ajoute aussi `packages/cli/aides/composant.md`, `packages/cli/aides/contour-ring.md`, `packages/cli/aides/contour-border.md` et `packages/cli/aides/icone.md`. Elle précise la priorité de boîte dans `packages/cli/aides/dimensions.md`, `packages/cli/aides/opacite.md` et `packages/cli/aides/rotation.md`. `packages/cli/aides/etats.md` et `packages/cli/aides/focus-clavier.md` dépendent de la question 4.

`packages/kit/src/lecteurs/caracteristiques.mjs` doit relever les peintures, contours, icônes, états, focus et dépendances dans les entrées et les renvois. Les lecteurs récursifs de références de tokens couvrent déjà ces branches, en excluant `meta` et le catalogue global `samples`. La prise des modules ne reçoit aucun nouveau nom dans ce lot.

## Passe finale

Codex a fait les points 0, 1, 3 et 5 de sa consigne, puis s'est arrêté sur sa limite d'usage. Un relais d'Opus a fini les points 2, 4, 6, 7 et 8, sans ouvrir la contre-expertise indépendante. Les journaux sont `_local/p22/codex/JOURNAL-CODEX-FINAL-1.txt`, `_local/p22/codex/JOURNAL-CODEX-FINAL-2.txt` et `_local/p22/codex/JOURNAL-RELAIS-OPUS.txt`.

| Épreuve | Verdict sur la version finale |
|---|---|
| 1. Dérivation | 14 règles de `derivation-aveugle.md` et de la première passe comparées à la forme finale, 0 écart non justifié |
| 2. Aller-retour | 0 écart de vue sur les 90 variants de Button et les 3 de Groupe ; les métadonnées recalculées portent 3 pertes pour Button et 475 pour Groupe, et chaque perte des contrats 14.0 autonomes des pièces s'y retrouve ou reçoit sa justification |
| 3. Absences | 28 paires, avec les sens de la première passe |
| 4. Mutations | 41 refus sur les 43 mutations de la première passe, et 2 altérations que seul le producteur peut refuser avant publication ; 15 mutations des réponses 1 à 3 refusées |
| 5. Cas limites | 17 cas de la première passe et 5 cas des réponses 1 à 3 acceptés ; 5 assertions de sens passent |
| 6. Reconstruction | 5 composants compilent en mode strict ; 363 rendus et 45 états d'occurrence passent avec la règle de lecture des états |
| 7. Taille | Button 48 942 octets, Groupe 186 125, dont 109 966 de pertes répétées par variante ; 0 entrée de catalogue dupliquée sur 5 000 contrats générés |
| 8. Lecteurs | 74 fichiers dans 24 groupes ; les règles nouvelles de la passe touchent le moteur et `variant-views.mjs`, déjà au §6.1 |

### Règle des états

Le point 0 a éprouvé la proposition de la question 4 avant de l'intégrer. `_local/p22/codex/etats-final.cjs` confronte 7 cas à la [règle de Figma](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances). Deux cas divergent. Dans le premier, l'hôte impose une couleur à une pièce dont les états ont des couleurs initiales différentes. Dans le second, les états posent des instances initiales différentes. Figma abandonne alors la surcharge, et la règle par adresse seule la garde. La génération en masse compte 12 594 bascules où la règle par adresse seule rend une autre couleur que Figma.

La forme garde donc la vérification à l'export et la perte ciblée (§2.12, étape 6). Le mainteneur avait confié ce choix à Codex. Pour un renvoi sans perte, la lecture reste celle de la proposition : ce que l'hôte change vaut, à la même adresse, pour la variante que l'état choisit. Une preuve documentaire ne remplace pas un rejeu dans Figma, que la liste pour `StressTest` prépare.

### Corrections et preuves

| Auteur | Correction | Preuve |
|---|---|---|
| Codex | sources relatives successives, `source.component` pour une dépendance, sélection nulle ou double avec perte (réponses 1 à 3) | `_local/p22/codex/cas/verifier-final.cjs`, 5 cas acceptés et 15 mutations refusées |
| Codex | vérification du transfert et perte ciblée gardées pour les états | `_local/p22/codex/etats-final.cjs`, 2 divergences sur 7 cas |
| Codex | largeur de contour et couleur d'ombre portées par les champs existants, perte ciblée sinon (§2.14) | `_local/p22/codex/reconstruction/releve.json` |
| relais | le recalcul des pertes omettait les 3 pertes de `.Ring` et ajoutait 72 pertes de dimension que deux insets couvrent ; le §2.11 décrit maintenant la règle simulée | `_local/p22/codex/meta-relais.cjs`, 0 perte 14.0 manquante |
| relais | miroir, cisaillement, instance agrandie ou réduite (`scaleFactor`), effets de bruit, de texture et de flou progressif, et `layoutGrids` reçoivent leur ligne au §2.14 | `_local/p22/codex/couverture-relais.cjs`, 3 trous sur 100 sous-champs sans ligne |
| relais | deux instances exposées qui présentent la même clé : la première garde la clé, l'autre se lit comme non exposée, avec une perte (§2.5) | `_local/p22/codex/fuzz/generer-relais.cjs`, 593 hôtes à deux instances exposées |
| relais | définitions en tête du §2, `visibilityProp` relatif au propriétaire, preuve de transfert définie, lecteur sans seconde preuve, exemple de Button à couverture partielle | relecture de la forme entière |
| relais | le contrôle local des états exigeait la couleur d'un calque masqué | `_local/p22/codex/verifier-reconstruction-finale.tsx`, 45 états passent |

### Génération en masse

Le générateur de Codex, `_local/p22/codex/fuzz/generer.cjs`, rend 5 000 tirages sans échec, avec une seule pièce par niveau. Les 5 fichiers `_local/p22/codex/cas/fuzz-echec-*.json` viennent d'un tirage antérieur à la correction de ce générateur. Aucun ne montre un défaut de la forme.

Le relais a écrit `_local/p22/codex/fuzz/generer-relais.cjs`, qui sépare trois rôles. Un modèle tiré d'une graine dit ce que Figma rend, sans lire de contrat. Un constructeur projette ce modèle selon la forme, pertes comprises. Un lecteur applique le §2.12 au seul contrat. Les tirages couvrent 1 à 11 pièces imbriquées, une dépendance dans chaque pièce, des expositions chaînées jusqu'à la dépendance et deux instances exposées du même set. Ils couvrent aussi des matrices pleines, clairsemées et à coordonnées répétées, des `SLOT` d'hôte et de pièce, des surcharges de couleur, de texte, de visibilité et d'échange, et des surcharges dans une pièce de pièce. S'y ajoutent les états d'une pièce non exposée, une prop d'axe exposée qui bascule, des modes forcés, des styles et des variables mêlés, et des ombres avec ou sans couleur.

| Mesure sur 5 000 tirages | Valeur |
|---|---|
| tirages sans échec | 5 000 |
| bascules résolues par le lecteur, toutes égales à Figma | 3 375 |
| coordonnées non résolues sous une perte | 26 051, dont 3 129 prouvables |
| bascules où la règle par adresse seule diverge de Figma | 12 594 |
| octets des contrats | 202 976 535, dont 25,9 % de `meta` |
| recopie admise par D4, feuilles et vues de renvoi égales à la variante citée | 2,0 % |
| type et valeurs recopiés dans les props à `source` (§5.3) | 0,25 % |
| entrées de catalogue dupliquées | 0 |

Aucun tirage n'a échoué, donc aucune graine n'a été réduite. `_local/p22/codex/fuzz/temoins-relais.cjs` prouve que le harnais voit un défaut. Une perte de transfert, de sélection ou de calque masqué retirée est refusée, et une couleur de renvoi altérée change le dépliage. Les 3 129 coordonnées prouvables restent non résolues parce qu'une perte vise le renvoi entier (§2.12, étape 6). La recopie la plus lourde est la répétition des pertes par variante, objet de la question 1.

### Couverture de Figma

Les deux agents de Codex ont classé l'API Plugin chacun de son côté. L'agent 1 a lu 1 313 propriétés de nœud dans les types publiés, l'agent 2 en a lu 1 284 dans la version 1.138.0 installée. Le consolidé `_local/p22/codex/couverture-figma.json` porte 2 038 propriétés et sous-champs. Son compte de propriétés non couvertes valait 0 par construction, sans calcul.

`_local/p22/codex/couverture-relais.cjs` compare les deux classements. 32 propriétés diffèrent, et le consolidé les couvre toutes par un champ, avec une perte si le champ est incomplet. 100 sous-champs classés en perte n'avaient aucune ligne du §2.14 qui nomme leur famille de propriétés. Trois trous étaient réels et ont reçu leur ligne. Les 97 autres tombent dans une ligne existante (peintures, effets, vecteurs, typographie, grilles, prototype), sauf 20 métadonnées de styles et de variables, qui relèvent de la traçabilité.

### Limites qui ne se lèvent qu'avec le moteur

- Le temps d'analyse et le réexport des captures restent à mesurer dans le moteur 15.0 (case 1.5).
- Les simulations recalculent les pertes, pas les notes d'export.
- Les preuves de transfert s'appuient sur la règle documentée de Figma, sans rejeu.
- Le prototype de validation ne remplace ni le schéma ni les contrôles 14.0.
- La reconstruction rend du HTML sans CSS des tokens, sans contrat autonome d'`Icon` et sans comparaison visuelle.
- Deux faits de Figma restent à établir : si l'hôte présente la prop `SLOT` d'une instance exposée, et si une instance dont `scaleFactor` diffère de 1 garde ses liaisons de variables.

### Constructions à ajouter à `StressTest`

Le composant `StressTest` d'UCM-Playground ne pose aucune pièce préfixée. Ces constructions ancreraient dans une capture réelle ce que la passe a prouvé sur des cas inventés :

1. Une pièce `.Cellule` à deux axes, taille et état, dont la matrice manque une combinaison et en répète une autre avec deux couleurs.
2. Deux instances de `.Cellule` exposées dans le même variant, pour la collision de clés et l'ordre de l'arbre.
3. Une pièce `.Puce` posée dans `.Cellule`, que `.Cellule` expose, avec une couleur que `StressTest` impose sur `.Puce` à travers `.Cellule`.
4. Sur une occurrence de `.Cellule`, une couleur imposée sur un calque dont les états ont des couleurs initiales différentes, et une autre sur un calque dont les états partagent la couleur, puis un changement d'état rejoué dans Figma.
5. Sur une occurrence, un calque masqué sans propriété, un texte saisi et une instance échangée sans propriété.
6. Un mode de variable forcé sur une occurrence (`explicitVariableModes`).
7. Le `SLOT` de `.Cellule` rempli par `StressTest`, et une prop `SLOT` d'une instance exposée.
8. Une instance de `.Cellule` agrandie par l'outil d'échelle de Figma (`scaleFactor` différent de 1), et un calque en miroir dans `.Cellule`.
9. Un variant de `.Cellule` à racine sans auto layout et à hauteur fixe sans variable, comme `.Ring`.
10. Une ombre sans variable de couleur, un effet de bruit et un flou progressif dans `.Cellule`.
11. Une instance de `Button` exposée dans `StressTest`, pour une source vers une dépendance.
12. Une instance exposée dans une partie des variants seulement.

## Questions tranchées

1. Une pièce peut-elle porter `source` pour une propriété exposée par une pièce intérieure ? Le §2.2 l'interdit, alors que E2 et le cas d'exposition à deux niveaux demandent cette provenance. Recommandation, autoriser une source relative dans chaque propriétaire et résoudre les sources successives. Le témoin est `_local/p22/codex/cas/Q-source-deux-niveaux.json`.
2. Que rend une prop exposée quand la combinaison visée n'a aucun variant ou en a plusieurs de rendus différents ? La 14.0 admet les matrices clairsemées et les coordonnées répétées. Le §2.12.4 choisit pourtant une seule V′ sans règle de départage. Recommandation, conserver ces matrices et publier une perte ciblée quand la sélection n'est pas unique. Ne pas choisir le premier variant. Le témoin à deux variantes est `_local/p22/codex/cas/Q-variante-double.json`.
3. Comment une propriété d'une dépendance exposée rejoint-elle l'API de l'hôte ? D1 demande les propriétés que Figma montre, mais `source` ne peut viser qu'un slot `piece`. Recommandation, décrire cette provenance vers le contrat autonome de la dépendance, avec ses clés publiques. Le témoin est `_local/p22/codex/cas/Q-dependance-exposee.json`.
4. Comment les états internes d'une pièce choisissent-ils une autre variante à une occurrence non exposée ? Le §2.12.3 impose le renvoi exact et la procédure d'états de la CLI choisit un autre variant. Recommandation, définir cette transition comme le choix d'une vue de pièce avec transfert vérifié des couleurs et des renvois de l'occurrence. Une vue surchargée qui ne se transfère pas doit garder sa perte explicite.

### Réponses du mainteneur

Le mainteneur retient les recommandations des questions 1, 2 et 3. Une source relative se résout de propriétaire en propriétaire. Une sélection qui ne désigne pas une seule variante publie une perte ciblée, sans choisir. Une propriété d'une dépendance exposée cite le contrat de la dépendance et ses clés publiques. La question 4 n'est pas tranchée. Le mainteneur remarque que le contrat doit décrire les parties, et que le changement d'état relève du code. Une proposition en découle, à éprouver par la passe finale avant toute décision : le contrat décrit la pièce avec toutes ses variantes et chaque renvoi par adresse, et il écrit une règle de lecture, selon laquelle ce que l'hôte change sur une occurrence vaut à la même adresse pour la variante que l'état choisit. La proposition retire la vérification du transfert par l'Exporter et la perte de la recommandation initiale. La passe finale dit si ce retrait perd une information sur un cas réel ou inventé.

La passe finale tranche la question 4 sur délégation du mainteneur. La forme garde la vérification du transfert à l'export et la perte ciblée, sur le contre-exemple de `_local/p22/codex/etats-final-resultats.json` (voir [Règle des états](#règle-des-états)).

## Ce qui reste

Les quatre questions de la première passe sont tranchées. Les trois questions de la fin de ce document attendent le mainteneur. Le validateur de production devra reprendre les contrôles 14.0 et le schéma, en plus des preuves de ce lot.

Le temps d'analyse, le traitement complet du détail intérieur aplati et le réexport Figma restent à mesurer avec le moteur 15.0. La reconstruction reste sans comparaison visuelle et sans contrôle `ucm check` compatible. Aucun paquet publiable n'a changé.

Les journaux et les preuves exécutables restent dans `_local/p22/codex/`, hors des fichiers suivis.

## Effets sur le plan d'implémentation

`docs/notes/Recherches/Pièces internes/PLAN-P22.md` n'a pas été modifié dans ce lot. Les cases suivantes doivent recevoir les résultats avant l'implémentation.

| Lots | Modification attendue |
|---|---|
| 2.3 | regrouper ou non les pertes répétées par variante, selon la question 1 et P33 |
| 3.1 et 3.3 | retirer `sizes`, refuser les clés JSON répétées avant décodage, borner l'exception d'échange illisible |
| 3.2 | prêter la version de lecture, garder les rôles partagés, joindre les identifiants avec un seul `I`, résoudre les sources de propriétaire en propriétaire, refuser de choisir une sélection nulle ou double, transférer les écarts d'un renvoi sans perte sans seconde preuve |
| 3.3 | ajouter les axes transitifs des dépendances de pièces et les adresses récursives d'échantillon ; juger `values` sur l'exposition au slot |
| 4.1 et 4.2 | retirer le wrapper élu et le traitement d'axe propagé devenu sans objet ; garder les collisions réelles, entre l'hôte et une instance exposée comme entre deux instances exposées |
| 5.2 et 5.3 | reprendre les 22 attentes manuscrites, les identifiants imbriqués, les refus, et la preuve de transfert vers chaque variante atteignable (§2.12, étape 6) |
| 5.1, 5.4 et 5.6 | agréger les pertes de chaque pièce selon le §2.11 : occurrence jugée contre sa variante, racine d'occurrence jugée sur la boîte du slot, dimension couverte par deux insets, constats 14.0 que D2 ou la règle `@icons` de l'hôte rendent faux retirés |
| moteur, lots 5 | publier ou déclarer les lignes nouvelles du §2.14 : `relativeTransform` en miroir, `scaleFactor`, effets de bruit, de texture et de flou progressif, `layoutGrids`, `numberOfFixedChildren` |
| 7.1 | compter les dépendances après dépliage, avec le cas Aurore répété |
| 9.1 | réécrire les aides oubliées et les règles d'absence par propriétaire |
| 10.1 et 10.2 | rejouer les attentes et `_local/p22/codex/fuzz/generer-relais.cjs` avec le moteur, mesurer les octets UTF-8 et les diagnostics complets, capturer `StressTest` avec les constructions de la passe finale |

Les tests permanents devront fabriquer leurs contrats depuis les cas inventés. Les fichiers issus des captures restent dans `_local/`. Les lois du moteur devront vérifier les occurrences masquées, les effacements, la boîte prioritaire, la cardinalité, les chaînes d'identifiants et les pertes des variantes de pièce non posées.

## Questions au mainteneur

1. Faut-il regrouper les pertes répétées sur les variantes d'une pièce ? Le §2.11 publie une perte par variante. Sur Groupe, les 475 pertes pèsent 109 966 octets, soit 59 % du contrat, et tiennent en 22 messages distincts. Le contrat 14.0 autonome de `.Segment` dit ses manques en 16 constats, sans les contraintes `scale` que la 15.0 ajoute. Recommandation, publier une perte par propriétaire, adresse et propriété de l'API, avec `contractPath` sur `pieces.<P>.variants` et le nombre de variantes dans le message, comme le moteur 14.0 regroupe déjà des variants dans un constat. La liste des variantes reste dans le rapport de l'Exporter, selon P33. Le regroupement ramène ces pertes à 5 055 octets.
2. Deux instances exposées présentent la même clé : laquelle la garde ? Le §2.5 donne la clé à la première dans l'ordre de l'arbre publié, et l'autre se lit comme non exposée, avec une perte. Recommandation, garder cette règle, qui prolonge la collision de la 14.0, où le set exporté garde sa clé. Ne publier aucune des deux retirerait au code une propriété que Figma montre.
3. Faut-il étendre la preuve de transfert aux visibilités et aux échanges après un rejeu dans Figma ? Le §2.12 ne prouve en 15.0 que les couleurs. Sur 5 000 tirages, 3 129 coordonnées restent non résolues alors que la règle de Figma les prouverait. Recommandation, garder la perte jusqu'à la capture de `StressTest` (constructions 4 et 5), puis étendre la preuve par égalité des valeurs initiales si le rejeu confirme la règle documentée.
