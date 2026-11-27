# Stress test du contrat 15.0

La forme ne suffit pas encore à reconstruire tous les cas. Les épreuves ont trouvé des erreurs corrigées dans [FORME-CONTRAT-15.md](./FORME-CONTRAT-15.md) et quatre questions de résolution. L'égalité des vues simulées ne prouve pas la sortie du futur moteur.

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

## Questions au mainteneur

1. Une pièce peut-elle porter `source` pour une propriété exposée par une pièce intérieure ? Le §2.2 l'interdit, alors que E2 et le cas d'exposition à deux niveaux demandent cette provenance. Recommandation, autoriser une source relative dans chaque propriétaire et résoudre les sources successives. Le témoin est `_local/p22/codex/cas/Q-source-deux-niveaux.json`.
2. Que rend une prop exposée quand la combinaison visée n'a aucun variant ou en a plusieurs de rendus différents ? La 14.0 admet les matrices clairsemées et les coordonnées répétées. Le §2.12.4 choisit pourtant une seule V′ sans règle de départage. Recommandation, conserver ces matrices et publier une perte ciblée quand la sélection n'est pas unique. Ne pas choisir le premier variant. Le témoin à deux variantes est `_local/p22/codex/cas/Q-variante-double.json`.
3. Comment une propriété d'une dépendance exposée rejoint-elle l'API de l'hôte ? D1 demande les propriétés que Figma montre, mais `source` ne peut viser qu'un slot `piece`. Recommandation, décrire cette provenance vers le contrat autonome de la dépendance, avec ses clés publiques. Le témoin est `_local/p22/codex/cas/Q-dependance-exposee.json`.
4. Comment les états internes d'une pièce choisissent-ils une autre variante à une occurrence non exposée ? Le §2.12.3 impose le renvoi exact et la procédure d'états de la CLI choisit un autre variant. Recommandation, définir cette transition comme le choix d'une vue de pièce avec transfert vérifié des couleurs et des renvois de l'occurrence. Une vue surchargée qui ne se transfère pas doit garder sa perte explicite.

### Réponses du mainteneur

Le mainteneur retient les recommandations des questions 1, 2 et 3. Une source relative se résout de propriétaire en propriétaire. Une sélection qui ne désigne pas une seule variante publie une perte ciblée, sans choisir. Une propriété d'une dépendance exposée cite le contrat de la dépendance et ses clés publiques. La question 4 attend une explication.

## Ce qui reste

Les quatre questions de résolution restent ouvertes. Les simulations doivent ensuite recalculer les métadonnées de l'hôte et de toutes les pièces, avec les pertes des variantes non posées. Le validateur de production devra reprendre les contrôles 14.0 et le schéma, en plus des preuves de ce lot.

Le temps d'analyse, le traitement complet du détail intérieur aplati et le réexport Figma restent à mesurer avec le moteur 15.0. La reconstruction reste sans comparaison visuelle et sans contrôle `ucm check` compatible. Aucun paquet publiable n'a changé.

Les journaux et les preuves exécutables restent dans `_local/p22/codex/`, hors des fichiers suivis. Les 15 tests documentaires passent. `npm run agents:diff` réussit et ne désigne aucun document lié à relire. Il signale l'inventaire comme vue à régénérer. Ce lot reste limité aux deux documents autorisés.

## Effets sur le plan d'implémentation

`docs/notes/Recherches/Pièces internes/PLAN-P22.md` n'a pas été modifié dans ce lot. Les cases suivantes doivent recevoir les résultats avant l'implémentation.

| Lots | Modification attendue |
|---|---|
| 3.1 et 3.3 | retirer `sizes`, refuser les clés JSON répétées avant décodage, borner l'exception d'échange illisible |
| 3.2 | prêter la version de lecture, garder les rôles partagés, joindre les identifiants avec un seul `I`, résoudre les questions 1 à 4 |
| 3.3 | ajouter les axes transitifs des dépendances de pièces et les adresses récursives d'échantillon |
| 4.1 et 4.2 | retirer le wrapper élu et le traitement d'axe propagé devenu sans objet ; garder les collisions réelles |
| 5.2 et 5.3 | reprendre les 17 attentes manuscrites, les identifiants imbriqués, les refus et le transfert par adresse |
| 5.1, 5.4 et 5.6 | agréger les pertes réelles de chaque pièce et retirer les diagnostics devenus faux |
| 7.1 | compter les dépendances après dépliage, avec le cas Aurore répété |
| 9.1 | réécrire les aides oubliées et les règles d'absence par propriétaire |
| 10.1 et 10.2 | rejouer les attentes avec le moteur, mesurer les octets UTF-8 et les diagnostics complets |

Les tests permanents devront fabriquer leurs contrats depuis les cas inventés. Les fichiers issus des captures restent dans `_local/`. Les lois du moteur devront vérifier les occurrences masquées, les effacements, la boîte prioritaire, la cardinalité, les chaînes d'identifiants et les pertes des variantes de pièce non posées.
