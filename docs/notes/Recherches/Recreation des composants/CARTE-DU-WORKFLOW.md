# Carte du workflow de P30

Cette carte liste chaque point du chantier qui demande une réflexion, une décision, un outil ou une vérification, de l'état actuel jusqu'à la maintenance après la migration. Elle complète la [recherche](./RECHERCHE-RECREATION-DES-COMPOSANTS.md) et le [plan](./PLAN-P30.md). Les noms, chiffres détaillés et extraits du client restent dans `_local/recreation-composants/`.

Chaque point porte un état.

- décidé : la recherche ou le mainteneur l'a tranché.
- à trancher : une décision du mainteneur manque.
- à outiller : un script, un plugin ou une page doit le tenir.
- à vérifier : un fait reste à lire dans le code, dans Figma ou auprès des développeurs.

## 1. Méthode de la carte

Une analyse seule oublie des zones. La carte se construit et se critique en cinq passes, et se rejoue à chaque porte du plan.

1. Carte principale. La conversation principale range le chantier en étapes, et chaque étape en ce qu'elle lit, ce qu'elle écrit, qui agit et ce qui peut se perdre.
2. Carte aveugle. Un agent, sans voir la carte principale, dresse sa propre liste depuis les mêmes sources. Chaque point qu'il trouve et que la carte principale n'a pas est une zone oubliée.
3. Critique par grille. Un second agent reçoit la carte fusionnée et la croise avec une grille : chaque étape contre chaque angle transversal (section 16), chaque piste de `pistes.json`, chaque outil et chaque skill d'UCM. Une case vide est soit justifiée, soit un point nouveau. Il relève aussi les points qui mélangent deux sujets.
4. Vérification des faits. Chaque point s'appuie sur un fichier ou une mesure. Un point « à vérifier » devient une tâche, et le fait relevé remplace la supposition.
5. Saturation. Une passe de critique se relance tant qu'elle ajoute un point qui change le plan. La carte se ferme quand une passe n'ajoute que des points mineurs.

La carte se rejoue après le pilote, avant le passage en masse, et à chaque fait nouveau qui contredit une décision. La v1 trouvée au troisième relevé seulement, et le nombre de marques que la passe 3 a contredit, montrent pourquoi.

### Journal des passes

| Passe | Résultat |
|---|---|
| 1 | Carte principale, une centaine de points. |
| 2 | Carte aveugle de 96 points ; une vingtaine manquaient à la carte principale. |
| 3 | 29 cases vides, 17 liaisons manquantes, 12 erreurs ou points mélangés ; tous intégrés ci-dessous. Le mainteneur a ensuite resserré la migration sur ce que le chantier livre aux développeurs, et le registre sur la recréation dans Figma. |
| 4 | 25 points « à vérifier » relus dans les dépôts et les réglages de la bibliothèque UCM : 7 décidés, 7 à trancher, 4 à outiller, 7 qui attendent une personne (S16, M2, M9, M10, B1, F11, A2), avec leur question. Trois faits corrigent la carte : une marque change aussi des rôles de couleur (U6), la liste des marques vit dans le code (M2), et un jeu de règles de branche existe déjà (X3). |
| 5 | À faire : une critique de saturation sur cette version. |

## 2. Versions, périmètre et sources

- S1. Trois versions de la bibliothèque existent. La v1, figée, vit sur sa propre branche. La v2 n'a mis à jour qu'une partie des composants. La v3 est le travail de P30, et tous les composants employés de la v1 et de la v2 y passent directement. Décidé.
- S2. L'application principale importe la v1 dans plus de fichiers que la v2. Le relevé du code et celui des usages couvrent donc les deux versions. Décidé.
- S3. Le dictionnaire des versions se fixe : quelle branche, quel paquet, quel numéro publié et quelle version d'Ant Design chaque nom désigne. La branche par défaut, une branche plus ancienne de la v2 et la branche de la v1 portent trois paquets différents. À outiller.
- S4. Les tags publiés de la v2 ont déjà dépassé le numéro 3 : « v3 » est un nom de travail. Le nom et le numéro publiés de la nouvelle bibliothèque se tranchent. À trancher.
- S5. Un même composant existe en v1 et en v2 avec des API différentes. La v3 part de la version la plus récente de chaque composant, et y ajoute les variantes de l'autre version que les applications emploient encore. Décidé.
- S6. La branche de la v2 contient un dossier de composants hérités de la v1 que son point d'entrée n'exporte pas. Ces composants relèvent de la v1 seule, ou de la v2 aussi ? À trancher.
- S7. La v1 publie un dossier compilé et des chemins profonds (sous-modules, polices) que l'application importe directement. La v2 a aussi des imports profonds alors que son paquet n'expose que son point d'entrée. Ces chemins sont une API de fait. À outiller.
- S8. Le commit de référence de chaque version source et de chaque application se fixe et s'écrit dans chaque fiche. Sans lui, le contrôle de couverture compare à une cible qui bouge. À outiller.
- S9. Un nouveau relevé d'une source ou d'une application se compare au précédent. Une prop ajoutée, retirée ou renommée remonte dans le registre. Aucun outil d'UCM ne le fait : P11 compare deux révisions d'un contrat, pas deux relevés de code. À outiller.
- S10. Les versions installées dans l'application principale correspondent aux branches relevées. Vérifié.
- S11. La seconde application ne dépend pas de la v1 : son code React importe seulement la v2, sur ses quatre branches vivantes. Décidé.
- S12. La seconde application a plusieurs branches vivantes, et aucune n'est désignée comme référence. À trancher.
- S13. Le back-office React de la seconde application a son propre thème (celui de son framework d'administration, des couleurs en dur et Tailwind), et le fournisseur de thème de la v2 n'en enveloppe que l'ensemble. Ce thème reste à l'application (A7) ; seules ses lectures du thème de la bibliothèque comptent (U4). Décidé.
- S14. Une partie de la seconde application est en gabarits serveur sans React, avec ses propres feuilles de style : 539 gabarits, dont 80 pour des boutons seuls, et 123 fichiers qui portent une classe de bouton. Aucun n'importe la bibliothèque, donc le relevé des usages, les guides et les codemods ne les voient pas. Ces gabarits entrent-ils dans les candidats (U7), ou restent-ils hors du chantier ? À trancher.
- S15. La library Figma actuelle couvre une grande partie des composants, sous d'autres noms que le code, et ses props, variantes et tokens ne correspondent pas non plus. Elle ne sert que d'aide visuelle : le registre relie un composant du code à son dessin actuel, une fois, et rien d'autre ne se met en correspondance. Ses tokens ne se relèvent pas. Décidé.
- S16. La référence visuelle de l'existant est le rendu du code. Décidé. L'accès aux captures Chromatic des stories existantes reste à demander : la CI en lance une sur chaque demande de fusion vers les deux branches principales de la v2, et le Storybook publié sur les pages du dépôt vient d'une branche arrêtée en 2024. Question aux développeurs : une invitation au projet Chromatic, ou l'adresse des dernières constructions. À vérifier.
- S17. L'installation des sources demande des jetons privés de paquets. Ils restent dans les fichiers de configuration du client, jamais dans UCM-Toolkit. Décidé.
- S18. Un fichier suivi de la bibliothèque source contient ces jetons en clair. C'est un risque de sécurité du client, à lui signaler. À trancher par le mainteneur.
- S19. Une installation locale écrit dans le clone de la source. Aucun push n'en part. Décidé.

## 3. Relevé du code source

- C1. Le relevé lit pour chaque composant ses props, leurs types résolus, leurs unions, leurs défauts, `children` et les props de type nœud. À outiller.
- C2. Les styles conditionnels de styled-components se rattachent à la prop ou à l'état qui les déclenche. Aucun outil du marché ne le fait. À outiller.
- C3. Les props transmises par décomposition (`...rest`) font entrer l'API d'Ant Design dans celle du composant. Une vingtaine de composants de la v2 le font. Une application peut passer une prop d'Ant Design que l'interface ne nomme pas. À outiller, avec le relevé des usages.
- C4. Les hooks et utilitaires exportés (un hook de thème, une fabrique de colonnes) se remplacent, se gardent ou se retirent dans la v3. À trancher.
- C5. Le fournisseur de thème de la source se remplace par les variables UCM. À trancher, avec U4.
- C6. La v2 exporte 38 types et aucune énumération TypeScript, seulement des unions de chaînes et des interfaces. L'adaptateur régénère les unions depuis les enums du contrat et un type des combinaisons de variants, mais aucune interface d'objet (ligne de tableau, zone de risque, colonne). Ces interfaces s'écrivent à la main, et l'application en importe une par un chemin profond (S7). Où vivent-elles dans la v3 ? À trancher.
- C7. Les dépendances de rendu hors Ant Design (graphiques, tables virtualisées, animations, sélecteurs de date, masques de saisie) se gardent ou se remplacent dans la v3. La v1 et la v2 en emploient des jeux différents. À trancher.
- C8. Un comportement sans effet visuel va dans un fichier de comportements, à côté du contrat. Ce fichier n'a encore ni format, ni lecteur, ni test. À outiller.
- C9. L'accessibilité se relève : rôles, attributs ARIA, focus, clavier. La v2 n'a aucune règle de mouvement réduit. À outiller, relié à R4 et R7.
- C10. Le responsive se relève : une vingtaine de fichiers de la v2 ont une requête média, un hook ou un point de rupture. À outiller, relié à B7.
- C11. Les images et les logos par marque, servis par la source, entrent dans le périmètre, ou restent aux applications. À trancher.
- C12. Le relevé est déterministe d'abord. Un agent complète ce que le script ne voit pas, et chacune de ses lignes est marquée « à confirmer ». Décidé.
- C13. La fiche du relevé a la forme d'un contrat UCM, pour que le contrôle final compare deux contrats. Décidé.
- C14. Le relevé prouve sa complétude par recoupement : nombre de props contre le relevé de react-docgen-typescript, noms employés par les applications contre les noms relevés. À outiller.

## 4. Relevé des usages et des candidats

- U1. Le relevé compte chaque composant, prop et valeur employés, par application et par fichier. Il sépare les variantes vivantes des variantes mortes. À outiller (case 3.2).
- U2. Une valeur calculée, une prop passée par variable, `as`, un clonage ou un `...spread` restent opaques au relevé statique. Chacun devient une ligne « à lire » dans la fiche. À outiller.
- U3. Les applications surchargent des composants par `styled(Composant)` ou par des sélecteurs qui visent leur structure. Une structure changée casse ces surcharges en silence. À outiller.
- U4. Les applications lisent les valeurs du thème de la bibliothèque dans leur propre code, par le hook de thème. Ces lectures passent aux variables UCM, hors des composants. À outiller.
- U5. Les tests de bout en bout des applications visent peut-être des classes ou une structure. Ils sont une source d'usages et une casse silencieuse possible. À outiller.
- U6. Les applications ne choisissent aucune variante selon la marque : elles passent seulement le nom du thème au fournisseur. Mais trois composants de la v2, dont le Button, portent des styles propres à une marque, qui échangent les rôles de couleur (la couleur secondaire sert de principale). Une marque ne change donc pas seulement des valeurs : le relevé note ces conditions par marque (M4). À outiller.
- U7. Les candidats sont les composants d'Ant Design importés directement, les composants locaux employés dans plusieurs fichiers et les structures recopiées. Le mainteneur tranche la liste. Décidé.
- U8. Un candidat refusé laisse Ant Design dans l'application. La v3 et Ant Design y coexistent alors. À trancher par candidat.

## 5. Marques, fondations et actifs

- M1. Les marques deviennent des modes de l'axe des marques, calculés par UCM Palettes avant tout composant. Décidé.
- M2. Le nombre de marques n'est pas fixé, et leur liste vit dans le code, pas dans les données : une table de domaines vers un nom de thème, écrite dans l'application principale (2 noms sur ses branches vivantes, 7 sur sa branche arrêtée) et dans le back-office (3 noms). L'API ne renvoie aucun nom de thème. La v1 a 14 thèmes, la v2 en exporte 8 plus un thème global, la recherche disait 9, et intencial-library a 2 modes. Le mainteneur en attend quatre au plus. Questions aux développeurs : quelles marques sont actives en production, avec leur nom de thème, et la liste reste-t-elle dans le code après la migration ? À vérifier.
- M3. Les couleurs calculées par Palettes diffèrent de celles du code, et le rendu change sur chaque marque. Qui valide cet écart, marque par marque ? À trancher.
- M4. Le relevé distingue une couleur qui change avec la marque d'une couleur fixe, en croisant les valeurs relevées avec les thèmes. À outiller.
- M5. Les espacements, rayons et ombres hors de la grille UCM prennent la valeur la plus proche, avec l'écart affiché, et le designer tranche. À outiller.
- M6. La règle « aucune supposition de mapping » vaut pour les corrections automatiques d'Architect. Une proposition que le designer tranche ne la viole pas. À confirmer par le mainteneur.
- M7. Depuis P21, le kit définit les variables attendues de `brands`, `utility` et `theme`, et des échelles de départ pour `layout` et `typography`. Architect crée les variables et les liens manquants de `theme`, `brands` et `utility`, et Palettes écrit les couleurs primitives. Aucun outil n'écrit `layout` ni `typography` : qui crée les espacements et les polices du chantier ? À trancher.
- M8. P28 garde les noms et les alias d'un design system existant. P30 recrée l'architecture UCM. Le calcul des marques en 2.1 suit P30, pas le mode agnostique de P28. À trancher.
- M9. Les polices diffèrent entre la v1 et la v2, et passent aux tokens de typographie UCM. La v2 embarque deux familles, dont une dans une seule story ; la v1 en ajoute trois, dont deux commerciales employées par une dizaine de thèmes. La v3 n'emploie que des polices libres, et le mainteneur choisit celle de chaque marque plus tard. Les thèmes de la v1 aux polices commerciales changent donc de famille. Décidé.
- M10. La licence FontAwesome Pro couvre intencial-library, son Storybook et des composants d'icônes dans Figma, d'après le mainteneur. La v2 déclare la version 7 et la v1 la version 6, et l'installation demande un jeton de l'organisation. Relié à P32. Décidé.
- M11. Ni la source ni l'application n'ont de bascule entre clair et sombre. La v3 livre-t-elle un mode sombre ? À trancher.

## 5b. Textes et langues

- L1. Les textes par défaut des composants mêlent des langues. Ils passent au contrat comme valeurs de propriété texte, ou restent au code. À trancher (Q29).
- L2. Des formats de date et de nombre sont écrits en dur en français dans plusieurs composants, et l'application n'a aucune bibliothèque d'internationalisation. La v3 décide où vivent la langue et les formats. À trancher.
- L3. Un texte long ou court change la mise en page : le banc rend chaque composant avec le texte le plus long relevé dans les applications. À outiller.

## 6. Banc de rendu

- B1. Le banc installe la v1 et la v2 et lance leurs Storybook. La v1 est sur Storybook 6.5 avec webpack 5, le préréglage de Create React App et Yarn 1 ; ses paquets FontAwesome Pro demandent le jeton privé, donc aucun build ne s'essaie sans lui. L'essai se fait dans une copie hors du clone. Question au mainteneur : autoriser la copie du fichier d'installation du clone dans cette copie, où les jetons sont en clair. À vérifier.
- B2. Les stories générées croisent chaque valeur d'union, chaque booléen, chaque état forcé et chaque marque. Le nombre de captures se multiplie par le nombre de marques. À outiller.
- B3. Le banc est jetable et distinct de P9 : P9 génère une story par variant du contrat, sans produit cartésien. Décidé.
- B4. Un composant sans story n'a pas de données d'exemple. Le banc les tire des usages relevés dans les applications. À outiller.
- B5. Les pseudo-états forcés ne reproduisent pas tout le survol réel, et les polices, animations et calques ouverts faussent une capture. Le banc fixe la police, coupe les animations et attend le rendu. À outiller.
- B6. Les calques qu'Ant Design dessine (liste déroulante, infobulle, fenêtre modale, calendrier) s'ouvrent dans le banc pour être capturés. À outiller.
- B7. Le banc capture chaque composant à plusieurs largeurs d'écran, d'après les points de rupture relevés (C10). À outiller.
- B8. Le banc devient-il un test de non-régression de la v3 ? Il dépend des sources privées et ne vit pas tel quel dans intencial-library. À trancher (Q47).

## 7. Correspondance et cahier

- K1. Chaque valeur relevée reçoit la valeur UCM la plus proche, avec l'écart. Les valeurs voisines se groupent pour être tranchées une fois. À outiller.
- K2. Chaque prop et chaque état reçoit sa forme Figma : axe de variant, booléen, texte, échange d'instance, pièce interne, ou code seulement. À outiller.
- K3. La table de l'ancienne API vers la nouvelle est un fichier de données, lu par le contrôle de couverture et par l'outillage de migration. Elle dit aussi quelles props d'Ant Design la v3 accepte encore (C3). À outiller.
- K4. Les tokens de composant se nomment par un script depuis le relevé, ou le designer les crée. À trancher (Q17), relié à P31.
- K5. Le cahier dit, par composant, ce qu'il faut dessiner et décider, avec la planche du banc. Il ne reprend pas le guide en 15 sections de la skill `guide-composant`, rejeté. Ses messages au designer suivent la skill `rediger-diagnostics-ucm`. À outiller.
- K6. La liste de couverture enregistre chaque décision : dessinée, fusionnée avec, ou abandonnée parce que. À outiller.
- K7. Qui décide qu'un écart de dessin est voulu, et qui relit un « abandonné parce que » ? À trancher (Q5).
- K8. Une décision révisée rend à refaire les cahiers qui en dépendent. Le registre marque ces composants. À outiller.

## 8. Dessin dans Figma

- F1. Le designer redessine chaque composant de zéro, dans l'ordre du graphe de composition, des pièces vers les composés. Décidé.
- F2. Un composant posé dans une prop de type nœud ne se lit pas dans un import. Le graphe de composition le tire aussi du rendu. À outiller.
- F3. Les tokens et les composants vivent dans deux fichiers Figma. Décidé.
- F4. La publication de la library reste un geste du designer entre la création des variables et leur liaison. Décidé.
- F5. Le fichier de travail est la library UCM existante, ou un fichier fusionné ensuite. À trancher (Q33).
- F6. P31 construit les variants, les variables et les liaisons à partir d'une variante dessinée, et s'essaie sur le Button du pilote. Décidé, et cité par la case 6.2 du plan.
- F7. P32 livre les composants d'icônes que `Icon` échange. Décidé, et cité par la case 6.2 du plan.
- F8. Une icône passée en prop par une application peut être n'importe quel nœud. `Icon` accepte un nœud, et le contrat le dit. Aucun contrat réel ne publie encore `SLOT` ni un échange d'instance natif (VALIDATIONS-MVP.md). À trancher.
- F9. Dans la v2, Alert pose une barre de progression pour son état de chargement, Button un menu déroulant (conteneur, ligne, séparateur, avec leurs états) et Tag une infobulle. Dans la library Figma actuelle, aucun des trois jeux ne pose de pièce interne. Le menu du Button est le seul candidat : pièce interne, composé ou composant séparé, le designer tranche au pilote. À trancher.
- F10. Une variante supprimée ou renommée après coup perd sa clé et détache ses instances. Le jeu de variants d'une pièce se fixe avant le dessin des composés. Décidé.
- F11. Le nombre de variants d'un composant croisé sur tous ses axes peut dépasser ce que Figma, Architect ou l'export tiennent. Le code n'a aucun plafond : l'Exporter tronque le texte d'une demande de fusion au lieu d'échouer, et Architect a analysé un jeu de 90 variants. Le Button actuel de la library Figma en compte 150, et le produit de ses axes dans la v2 dépasse 300 avec les états. Seul l'export du Button du pilote le mesure. À vérifier.
- F12. Architect peut refuser un dessin proche de l'existant mais hors de la nomenclature. Le circuit d'un tel écart passe par le cahier. À trancher.
- F13. Le temps du designer par composant se mesure sur le pilote, et fixe la décision de déclinaison par script. À outiller (Q50, Q30).

## 9. Export et contrôle de couverture

- E1. UCM Exporter ouvre une demande de fusion par artefact dans intencial-library, et ne fusionne jamais. Des dizaines de composants donnent des dizaines de demandes. Les protections de branche manquent aujourd'hui, donc une demande rouge reste fusionnable (VALIDATIONS-MVP.md). P17 (verrou de fusion) y répond. Qui relit, dans quel ordre ? À trancher.
- E2. intencial-library n'a aucun contrat : P1 en demande trois au moins, et le pilote les fournit. Le verdict de P19, épinglé dans son CI, n'a jamais tourné sur une demande de composant. Le contrat est en version 14.0 ; P22 vise la 15.0 et garde la 14.0 en borne basse de lecture, donc les contrats du pilote restent lisibles. Décidé.
- E3. Le contrôle compare le contrat exporté au relevé et à la liste de couverture. Une prop, une valeur, un état ou une icône employés et absents sans justification bloquent. À outiller (case 5.3).
- E4. `ucm deroger` couvre une liste fermée de genres d'écart de parité et de règles du linter. Aucun ne désigne une prop ou un état du code source absent du contrat : un écart de couverture se justifie dans la liste de couverture (K6), pas par ce fichier. À outiller.
- E5. Le contrat n'a de champ ni pour l'accessibilité, ni pour les animations, ni pour le responsive. Ce qui manque au format sort du contrôle, sauf si le fichier de comportements le porte. À trancher.
- E6. Les animations : un token de durée et de courbe, ou une règle de code seulement. À trancher (Q26).
- E7. Le responsive : des variants de taille, ou une règle de code seulement. À trancher (Q27).
- E8. Une valeur dessinée sans variable avertit à l'export et manque au contrat. Le contrôle de couverture la voit. À outiller.
- E9. Le graphique et la table n'ont pas encore de forme de contrat. Elle se propose quand le premier se dessine. Décidé.
- E10. Une évolution du format pendant le chantier change le kit, demande un test racine, une publication par la skill `publier-paquets`, et peut rendre périmés des contrats déjà exportés. À trancher au cas par cas.

## 10. Reconstruction du code dans intencial-library

- R1. intencial-library a un socle (TypeScript, React 19 en peer, CLI 0.2.0 et adaptateur 0.2.11 épinglés), mais ni composant, ni Storybook, ni linter, et son CI ne lance pas `tsc`. Les versions publiées sont la CLI 0.4.8 et l'adaptateur 0.3.8. P18 a deux cases sur quatre faites : la 2 attend le premier contrat, la 3 (`tsc` dans le CI) se fait maintenant. À outiller.
- R2. intencial-library déclare React 19, et les applications et les sources sont en React 18. Soit la v3 accepte React 18, soit les applications montent de version avant de migrer. À trancher.
- R3. La v3 se publie avec un point d'entrée unique, ou garde des chemins profonds comme la v1 (S7). Le paquet est aujourd'hui privé et sans build. À trancher.
- R4. Retirer Ant Design retire aussi le piège du focus d'une fenêtre modale, la navigation au clavier d'une liste, la fermeture par Échap, le positionnement des calques et leur portail. La v3 les réécrit ou adopte une bibliothèque de primitives accessibles. À trancher.
- R5. La skill `ucm-implementer` reconstruit un composant depuis son contrat. Le fichier de comportements doit lui parvenir avec le contrat. Aucune fonction de reconstruction ne s'écrit chez le consommateur (VALIDATIONS-MVP.md, skill `consommer-contrat`). À outiller.
- R6. intencial-library charge les polices et les icônes. Son `package.json` n'en déclare aucune. À outiller.
- R7. Les contrastes de chaque état sur chaque marque se vérifient sur le code reconstruit, avec `ucm tokens references` et la feuille de `ucm tokens css`. À outiller.
- R8. Le rendu comparé au contrat (P10, P20) bloque. Le rendu comparé à l'ancien code sert de référence et ne bloque pas. P20 ne voit ni le survol, ni le focus, ni l'appui. Décidé pour la distinction. À outiller.
- R9. Les tests du code reconstruit couvrent les comportements du fichier de comportements. À outiller.

## 11. Préparer la migration des applications

Le chantier ne fait pas la migration. Il livre aux développeurs de quoi la rendre facile.

- A1. Les développeurs font la migration, avec ce que le chantier leur livre. Décidé.
- A2. Les développeurs n'attendent rien de précis. Le chantier leur fournit ce qu'il faut pour que la migration soit simple, sans complexifier : guide, codemods et liste des appels à réécrire. Les gabarits serveur relèvent de S14. Décidé.
- A3. Un guide par composant, tiré de la table de correspondance (K3) : ancienne prop et ancienne valeur, nouvelle forme, exemple avant et après. À outiller.
- A4. Un codemod par règle de la table, testé sur des fichiers avant et après, comme chez MUI, Chakra, Carbon et Polaris. Un appel qu'il ne sait pas réécrire reçoit un commentaire `TODO` et une ligne de rapport, jamais une supposition. Aucune équipe trouvée ne génère ses codemods depuis une table : c'est à construire. À outiller.
- A5. La liste, par application et par fichier, des appels à réécrire, tirée du relevé des usages, avec les composants enveloppés par l'application que le codemod signale sans les réécrire. À outiller.
- A6. Le guide signale aux développeurs les décisions qui leur reviennent, avec les pratiques relevées : coexistence des versions pendant la transition, renommage transitoire de l'ancien composant, règle de lint contre les anciens imports, commit automatique puis manuel, vérification légère à chaque demande et planche avant et après en fin. Décidé, hors du chantier.
- A7. Le chantier ne lance rien sur les dépôts des applications. Les demandes de fusion de l'Exporter vont seulement dans intencial-library. Décidé.

## 12. Registre local

- G1. Le registre sert la recréation dans Figma. Une page servie par `npm run registre` montre chaque composant et chaque candidat, avec tout ce qu'il faut pour le dessiner et son avancement. Le mainteneur y coche et y choisit, et la page écrit dans `_local/`. Décidé.
- G2. La plupart des états se calculent depuis les fichiers produits par chaque étape. Seuls les choix du mainteneur et l'avancement dans Figma s'enregistrent à la main. À outiller.
- G3. Le registre montre, par composant, la version source qui fait foi, les variantes, états et props employés, les icônes, la planche du banc, les valeurs UCM proposées avec leur écart, les questions ouvertes et ce qui le bloque (pièce interne, icône, décision révisée). À outiller.
- G4. Le script du registre vit dans UCM-Toolkit sans aucune donnée du client, et la page générée vit dans `_local/`. Décidé.

## 13. Confidentialité

- P1. UCM-Toolkit est public, et son historique a déjà été purgé une fois. Un contrôle automatique refuse un fichier suivi qui contient un nom de la liste locale des noms du client. À outiller.
- P2. Les messages de commit et les noms de pistes ne citent ni le client, ni ses composants métier. Décidé.
- P3. Les captures du banc contiennent des textes réels du produit. Elles ne quittent pas `_local/` et n'entrent pas dans l'échantillon d'un contrat. Décidé.
- P4. `_local/` n'est sauvegardé nulle part. Une perte du disque perd les relevés et les choix du registre. À trancher.

## 14. Pilote et cadence

- T1. Le pilote peut révéler des limites du format ou de la méthode. La case 6.4 du plan rejoue la carte et révise le plan avant le passage en masse. Décidé.
- T2. Une échéance ou un écran à livrer d'abord changerait l'ordre des composants. À trancher (Q41).
- T3. Un composant à la fois de bout en bout pendant le pilote, puis chaque étape en lot sur tous les composants. Proposé, à trancher (Q38).
- T4. Un composant est fini quand le contrôle de couverture passe et que le mainteneur a coché sa liste. Proposé, à trancher (Q39).
- T5. Au plus deux agents tournent à la fois, et leurs lignes restent « à confirmer » jusqu'à la relecture. Décidé.
- T6. Codex participe-t-il, et sur quelles étapes ? Son prompt suit la skill `rediger-prompt-codex`. À trancher (Q42).
- T7. Les questions encore ouvertes de la recherche qui touchent cette carte sont Q10, Q30, Q50 et Q53. À trancher.

## 15. Après le chantier

- N1. Les scripts du chantier se suppriment à l'archivage de la piste (skill `archiver-un-sujet`). Ils vivent donc jusqu'à la fin de la migration des applications, pour qu'un composant ou une marque ajoutés pendant la migration aient encore leur outil. Décidé.
- N2. Une correction faite dans la v1 ou la v2 pendant le chantier se reporte dans la v3. Qui le voit et le reporte ? À trancher.
- N3. Un nouvel export d'un contrat change le code. P8, la garantie à long terme, n'est pas commencée et dépend de P20, P26 et P9, dont aucune n'est livrée. Jusqu'à P8, le réexport se réécrit par la skill `ucm-implementer`, avec un humain. Accepte-t-on cette boucle manuelle, et qui mesure son temps humain ? À trancher.
- N4. P9 génère le Storybook de la v3, et P24 y ajoute une page de santé. La vitrine des sources et ses liens Chromatic et Zeplin disparaissent. À trancher.
- N5. La politique de versions de la v3, la dépréciation de la v1 et de la v2, et qui corrige l'ancienne bibliothèque jusqu'à la fin de la migration. À trancher.

## 15b. Pistes et outils d'UCM touchés

- X1. P22 (pièces internes) précède le passage en masse. P31 (construction) et P32 (icônes) s'essaient avec le pilote. Décidé.
- X2. P1 se ferme avec le pilote : ses critères demandent trois contrats arrivés par des demandes du plugin, et le CI n'épingle plus l'ancienne CLI. Tag, Button et Alert en font trois. La recette de `RECETTE.md` reste au mainteneur. Décidé.
- X3. P17 (verrou de fusion) répond à E1. La bibliothèque a déjà un jeu de règles de branche actif sur trois branches (demande de fusion obligatoire sans approbation, ni suppression ni réécriture), sur l'offre Team de l'organisation, alors que VALIDATIONS-MVP.md dit les protections indisponibles. Il manque la règle de contrôle obligatoire et le fichier des propriétaires de code, donc une demande rouge reste fusionnable. L'administrateur de l'organisation les ajoute ; le mainteneur n'a pas ce droit. À trancher.
- X4. P18 (socle d'intencial-library) est à moitié fait : voir R1. La case 3 se fait maintenant, la case 2 avec le pilote. À outiller.
- X5. P19 (verdict de `ucm check` selon la demande) bloque une demande qui change le code, et marque en retard une demande qui ne change que le contrat. Il est livré et sa CLI est épinglée dans le CI ; le pilote le fait tourner pour la première fois (E1, E2). Décidé.
- X6. P10 et P20 comparent le rendu au contrat (R8). P9 et P24 font la vitrine et la santé (N4).
- X7. P11 compare deux révisions d'un contrat, ce qui sert à N3 et à E10, pas à S9.
- X8. P6 est livré. P26, le plugin ESLint d'intencial-library, n'a qu'une recherche et dépend de P18 ; il bloquera une valeur hors tokens dans le code reconstruit. Le plan ne dit pas s'il précède 8.1 : sans lui, le code reconstruit n'a aucune règle contre les valeurs en dur. À trancher.
- X9. P21 (architecture de référence complète du kit) est livré : voir M7 pour ce qui reste. Décidé.
- X10. P28 et la case 2.1 diffèrent (M8).
- X11. P23 (remplacement de Supernova) dépend de P19. Aucune source ni application ne lit Supernova ni Style Dictionary : leurs noms n'apparaissent sur aucune branche relevée, et les thèmes sont des fichiers écrits à la main. Décidé.
- X12. P13 (Code Connect et MCP) pourrait relier la v3 à Figma pour les développeurs. Mineur.
- X13. Un contrôle d'Architect lit-il la liste de couverture et signale-t-il dans Figma une variante manquante avant l'export ? À trancher (Q46).

## 16. Angles transversaux de la grille

La critique de la passe 3 croise chaque étape des sections 2 à 15b avec ces angles. Une case sans point se justifie.

- Ce que l'étape lit, ce qu'elle écrit, et le format de ce qu'elle écrit.
- Qui agit : mainteneur, designer, lead UX, développeurs, agents.
- Ce qui peut se perdre, et ce qui prouve que rien ne s'est perdu.
- Le temps : source ou application qui change, composant à moitié fait, décision révisée.
- Les marques, le clair et le sombre.
- L'accessibilité : rôles, focus, clavier, contrastes, mouvement réduit.
- Les textes et les langues, les formats de date et de nombre.
- Le responsive et les animations.
- Les icônes, les polices, les images et leurs licences.
- La confidentialité et les jetons.
- Les pistes de `pistes.json`, les outils et les skills d'UCM touchés.
- Le coût : temps du designer, temps d'agent, nombre d'allers-retours dans Figma.
