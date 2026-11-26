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
3. Critique par grille. Un second agent reçoit la carte fusionnée et la croise avec une grille : chaque étape contre chaque angle transversal (section 15), chaque piste de `pistes.json`, chaque outil d'UCM. Une case vide est soit justifiée, soit un point nouveau.
4. Vérification des faits. Chaque point s'appuie sur un fichier ou une mesure. Un point « à vérifier » devient une tâche, et le fait relevé remplace la supposition.
5. Saturation. Une passe de critique se relance tant qu'elle ajoute un point qui change le plan. La carte se ferme quand une passe n'ajoute que des points mineurs.

La carte se rejoue après le pilote, avant le passage en masse, et à chaque fait nouveau qui contredit une décision. Le fait que la seconde bibliothèque source a été trouvée tard, au troisième relevé, montre pourquoi.

## 2. Périmètre et sources

- S1. Trois versions de la bibliothèque existent. La v1, figée, vit sur sa propre branche. La v2 n'a mis à jour qu'une partie des composants. La v3 est le travail de P30, et tous les composants de la v1 et de la v2 y passent directement. Décidé.
- S2. L'application principale importe la v1 dans plus de fichiers que la v2. Le relevé du code et celui des usages couvrent donc les deux versions. Décidé.
- S3. Un même composant existe en v1 et en v2 sous le même nom, avec des API différentes. La fusion décide quelle version fait foi, ou si la v3 garde l'union de leurs variantes employées. À trancher.
- S4. La v1 publie un dossier compilé et des chemins profonds que les applications importent directement, comme des polices et des sous-modules. Ces chemins sont une API de fait. À outiller.
- S5. Le commit de référence de chaque version source et de chaque application se fixe et s'écrit dans chaque fiche. Sans lui, le contrôle de couverture compare à une cible qui bouge. À outiller.
- S5b. Un nouveau relevé d'une source ou d'une application se compare au précédent. Une prop ajoutée, retirée ou renommée depuis le dernier relevé remonte dans le registre. À outiller.
- S6. La version publiée qu'une application emploie diffère de la branche relevée de la bibliothèque. Le relevé lit la version installée dans l'application, pas seulement la branche. À vérifier.
- S7. La seconde application consommatrice n'a été relevée que pour la v2. Sa dépendance à la v1 reste à lire, et elle a plusieurs branches vivantes. Son back-office React a peut-être son propre thème. À vérifier.
- S8. Une partie de la seconde application est en gabarits serveur sans React. Des classes ou du HTML peuvent y imiter un composant sans aucun import. À vérifier.
- S9. La library Figma actuelle du mainteneur couvre une grande partie des composants. Elle se relève par un plugin que le mainteneur lance, puis se compare au relevé du code. Décidé.
- S10. La référence visuelle de l'existant est le rendu du code. Les captures Chromatic, si l'accès existe, donnent des bases gratuites pour les stories existantes. Décidé pour la référence. À vérifier pour l'accès.
- S11. L'installation des sources demande des jetons privés de paquets. Ils restent dans les fichiers de configuration du client, jamais dans UCM-Toolkit. Décidé.

## 3. Relevé du code source

- C1. Le relevé lit pour chaque composant ses props, leurs types résolus, leurs unions, leurs défauts, `children` et les props de type nœud. À outiller.
- C2. Les styles conditionnels de styled-components se rattachent à la prop ou à l'état qui les déclenche. Aucun outil du marché ne le fait. À outiller.
- C3. Les props transmises par décomposition (`...rest`) font entrer l'API d'Ant Design dans celle du composant. Une application peut passer une prop d'Ant Design que l'interface ne nomme pas. À outiller, avec le relevé des usages.
- C4. Les hooks, utilitaires, fournisseurs de thème et types exportés (par exemple un hook de thème, une fabrique de colonnes, des types de variantes) ne sont pas des composants. La v3 les remplace, les garde ou les retire. À trancher.
- C5. Les dépendances de rendu hors Ant Design (graphiques, tables virtualisées, animations, sélecteurs de date, masques de saisie) se gardent ou se remplacent dans la v3. À trancher.
- C6. Un comportement sans effet visuel va dans un fichier de comportements, à côté du contrat. Ce fichier n'a encore ni format ni lecteur à la reconstruction du code. À outiller.
- C7. Le relevé est déterministe d'abord. Un agent complète ce que le script ne voit pas, et chacune de ses lignes est marquée « à confirmer ». À trancher (Q36, proposé).
- C8. La fiche du relevé a la forme d'un contrat UCM, pour que le contrôle final compare deux contrats. À trancher (Q37, proposé).
- C9. Le relevé prouve sa complétude par recoupement : nombre de props contre le relevé de react-docgen-typescript, noms employés par les applications contre les noms relevés. À outiller.

## 4. Relevé des usages et des candidats

- U1. Le relevé compte chaque composant, prop et valeur employés, par application et par fichier. Il sépare les variantes vivantes des variantes mortes. À outiller (case 3.2).
- U2. Une valeur calculée, une prop passée par variable, `as`, un clonage ou un `...spread` restent opaques au relevé statique. Chacun devient une ligne « à lire » dans la fiche. À outiller.
- U3. Les applications surchargent des composants par `styled(Composant)` ou par des sélecteurs qui visent leur structure. Une structure changée casse ces surcharges en silence. À outiller.
- U4. Les applications lisent les valeurs du thème de la bibliothèque dans leur propre code. Ces lectures passent aux variables UCM, hors des composants. À outiller.
- U5. Les candidats sont les composants d'Ant Design importés directement, les composants locaux employés dans plusieurs fichiers et les structures recopiées. Le mainteneur tranche la liste. Décidé.
- U6. Un candidat refusé laisse Ant Design dans l'application. La v3 et Ant Design y coexistent alors. À trancher par candidat.

## 5. Marques, thèmes et fondations

- M1. Les 9 marques deviennent des modes de l'axe des marques, calculés par UCM Palettes avant tout composant. Décidé.
- M2. Les couleurs calculées par Palettes diffèrent de celles du code, et le rendu change sur les 9 marques. Qui valide cet écart, marque par marque ? À trancher.
- M3. Le relevé distingue une couleur qui change avec la marque d'une couleur fixe, en croisant les valeurs relevées avec les thèmes des 9 marques. À outiller.
- M4. Les espacements, rayons et ombres hors de la grille UCM prennent la valeur la plus proche, avec l'écart affiché. La règle « aucune supposition de mapping » d'UCM vaut pour les corrections automatiques d'Architect, pas pour une proposition que le designer tranche. À trancher.
- M5. Les polices de la source (familles de police, graisses, fichiers servis par la v1) passent aux tokens de typographie UCM, avec leur licence et leur chargement. À vérifier.
- M6. Le thème UCM a un axe clair et sombre. La source n'a, d'après les relevés, que des marques. La v3 livre-t-elle un mode sombre ? À trancher.
- M7. P28 fiabilise les palettes d'un design system existant. Son mode agnostique et son option Full UCM changent le calcul attendu en 2.1. À vérifier.

## 5b. Textes et langues

- L1. Les textes par défaut des composants mêlent des langues. Ils passent au contrat comme valeurs de propriété texte, ou restent au code. À trancher (Q29).
- L2. Les textes que le code produit (messages d'erreur, libellés d'accessibilité écrits en dur, formats de date et de nombre) dépendent de la langue de l'application et ne se voient pas dans un dessin statique. La v3 décide où ils vivent. À trancher.
- L3. Un texte long ou court change la mise en page : le banc rend chaque composant avec le texte le plus long relevé dans les applications. À outiller.

## 6. Banc de rendu

- B1. Le banc installe la v1 et la v2 et lance leurs Storybook. La v1 figée peut ne plus se construire avec les outils actuels. À vérifier.
- B2. Les stories générées croisent chaque valeur d'union, chaque booléen, chaque état forcé et chaque marque. Le nombre de captures se multiplie par 9 marques. À outiller.
- B3. Un composant sans story n'a pas de données d'exemple. Le banc les tire des usages relevés dans les applications. À outiller.
- B4. Les pseudo-états forcés ne reproduisent pas tout le survol réel, et les polices, animations et calques ouverts faussent une capture. Le banc fixe la police, coupe les animations et attend le rendu. À outiller.
- B5. Les calques qu'Ant Design dessine (liste déroulante, infobulle, fenêtre modale, calendrier) s'ouvrent dans le banc pour être capturés. À outiller.
- B6. Le banc devient-il un test de non-régression de la v3 ? Il dépend des sources privées et ne vit pas tel quel dans intencial-library. À trancher (Q47).

## 7. Correspondance et cahier

- K1. Chaque valeur relevée reçoit la valeur UCM la plus proche, avec l'écart. Les valeurs voisines se groupent pour être tranchées une fois. À outiller.
- K2. Chaque prop et chaque état reçoit sa forme Figma : axe de variant, booléen, texte, échange d'instance, pièce interne, ou code seulement. À outiller.
- K3. La table de l'ancienne API vers la nouvelle est un fichier de données, lu par le contrôle de couverture et par l'outillage de migration. À outiller.
- K4. Le cahier dit, par composant, ce qu'il faut dessiner et décider, avec la planche du banc. La liste de couverture enregistre chaque décision : dessinée, fusionnée avec, ou abandonnée parce que. À outiller.
- K5. Qui décide qu'un écart de dessin est voulu, et qui relit un « abandonné parce que » ? À trancher (Q5).
- K6. Une décision révisée rend à refaire les cahiers qui en dépendent. Le registre marque ces composants. À outiller.

## 8. Dessin dans Figma

- F1. Le designer redessine chaque composant de zéro, dans l'ordre du graphe de composition, des pièces vers les composés. Décidé.
- F2. Un composant posé dans une prop de type nœud ne se lit pas dans un import. Le graphe de composition le tire aussi du rendu. À outiller.
- F3. Les tokens et les composants vivent dans deux fichiers. La publication de la library reste un geste du designer entre la création des variables et leur liaison. Décidé.
- F4. P31 construit les variants, les variables et les liaisons à partir d'une variante dessinée. Sans lui, le designer fait tout à la main. Son essai se fait sur le Button du pilote. Décidé pour l'ordre. Le plan de P30 doit citer P31.
- F5. P32 livre les composants d'icônes avant que les composants n'emploient `Icon`. Le plan de P30 doit citer P32. À outiller.
- F6. Une icône passée en prop par une application peut être n'importe quel nœud, pas seulement une icône du jeu. `Icon` accepte un nœud, et le contrat le dit. À trancher.
- F7. P22 livre les pièces internes avant le passage en masse. Le pilote vérifie que Tag, Button et Alert n'en ont pas besoin. À vérifier.
- F8. Une variante supprimée ou renommée après coup perd sa clé et détache ses instances. Le jeu de variants d'une pièce se fixe avant le dessin des composés. Décidé.
- F9. Le nombre de variants d'un composant croisé sur tous ses axes peut dépasser ce que Figma, Architect ou l'export tiennent. Le pilote le mesure. À vérifier.
- F10. Architect peut refuser un dessin proche de l'existant mais hors de la nomenclature. Le circuit d'un tel écart passe par le cahier. À trancher.

## 9. Export et contrôle de couverture

- E1. UCM Exporter ouvre une demande de fusion par artefact dans intencial-library, et ne fusionne jamais. Des dizaines de composants donnent des dizaines de demandes. Qui les relit et dans quel ordre ? À trancher.
- E2. Le contrôle compare le contrat exporté au relevé et à la liste de couverture. Une prop, une valeur, un état ou une icône employés et absents sans justification bloquent. À outiller (case 5.3).
- E3. Le contrat n'a de champ ni pour l'accessibilité, ni pour les animations, ni pour le responsive. Ce qui manque au format sort du contrôle, sauf si le fichier de comportements le porte. À trancher.
- E4. Une valeur dessinée sans variable avertit à l'export et manque au contrat. Le contrôle de couverture la voit. À outiller.
- E5. Le graphique et la table n'ont pas encore de forme de contrat. Elle se propose quand le premier se dessine. Décidé.
- E5b. Les animations et le responsive : un token de durée et de courbe, des variants de taille, ou une règle de code seulement. À trancher (Q26, Q27).
- E6. Une évolution du format pendant le chantier change le kit, demande un test racine et un nouveau numéro, et peut rendre périmés des contrats déjà exportés. À trancher au cas par cas.

## 10. Reconstruction du code dans intencial-library

- R1. intencial-library n'a encore ni composant ni contrat, et son CLI est en retard de plusieurs versions. Son socle React et TypeScript (P18) précède la reconstruction. À vérifier.
- R2. intencial-library déclare React 19, et les applications sont en React 18. Soit la v3 accepte React 18, soit les applications montent de version avant de migrer. À trancher.
- R3. La parité de l'adaptateur contrôle les props d'une interface, pas le rendu ni les comportements. Le rendu se prouve par le banc ou par le comparateur (P10, P20). À trancher.
- R4. Retirer Ant Design retire aussi le piège du focus d'une fenêtre modale, la navigation au clavier d'une liste, la fermeture par Échap, le positionnement des calques et leur portail. La v3 les réécrit ou adopte une bibliothèque de primitives accessibles. À trancher.
- R5. La skill `ucm-implementer` reconstruit un composant depuis son contrat. Le fichier de comportements doit lui parvenir avec le contrat. À outiller.
- R6. Les contrastes de chaque état sur chaque marque se vérifient sur le code reconstruit. À outiller.

## 11. Migration des applications

- A1. Les développeurs feront probablement la migration. Le chantier leur prépare toute l'infrastructure, de façon méthodique et complète. Décidé.
- A2. Les développeurs n'ont pas encore été consultés sur ce qu'ils attendent. À vérifier.
- A3. L'infrastructure suit ce que font MUI, Chakra, Carbon et Polaris : un codemod par règle de la table de correspondance, testé sur des fichiers avant et après ; un commentaire `TODO` et un rapport pour chaque appel qu'il ne sait pas réécrire, jamais une supposition ; un commit automatique puis un commit manuel ; un guide par composant. Aucune équipe trouvée ne génère ses codemods depuis la table : c'est à construire. À outiller.
- A3b. Un codemod qui suit les imports d'un fichier à l'autre (ts-morph, comme Chakra) voit un composant de l'application qui enveloppe un composant de la bibliothèque et relaie ses props. Il le signale sans le réécrire. À outiller.
- A4. La v1, la v2, la v3 et Ant Design coexistent dans une application pendant la migration : deux fournisseurs de thème, deux versions de styled-components, des collisions de styles et un poids de bundle accru. À trancher.
- A4b. Les sélecteurs CSS qui visent les classes d'Ant Design dans les applications empêchent de retirer Ant Design même quand plus aucun fichier ne l'importe. OpenMetadata en a compté 2 025. Le relevé les compte. À outiller.
- A4c. Pendant la transition, l'ancien composant peut se renommer (`LegacyCard` chez Polaris) avant que le nouveau ne prenne son nom. À trancher.
- A5. Une règle de lint interdit les anciens imports dans les fichiers déjà migrés, pour qu'un fichier migré ne régresse pas. À outiller.
- A5b. Les captures bloquantes à chaque demande de fusion ont été abandonnées par OpenMetadata, parce qu'un composant ne se juge qu'une fois ses voisins migrés. La vérification se fait par des contrôles légers à chaque demande (typage, tests) et par une planche avant et après en revue finale. À trancher.
- A6. Le typage des applications contre la v3 détecte une prop perdue après la migration. À outiller.
- A7. Aucun push sur les dépôts du client : les codemods tournent sur une copie locale, et les développeurs relisent puis poussent. Décidé.
- A8. La migration se fait par composant, par écran ou en bloc, selon que la v3 se publie sous un nouveau nom ou sous l'ancien. À trancher.

## 12. Registre local

- G1. Une page servie par `npm run registre` montre chaque composant et chaque candidat, avec toutes ses informations et son avancement. Le mainteneur y coche et y choisit, et la page écrit dans `_local/`. Décidé.
- G2. La plupart des états se calculent depuis les fichiers produits par chaque étape. Seuls les choix du mainteneur et l'avancement dans Figma s'enregistrent à la main. À outiller.
- G3. Le registre montre, par composant, la version source qui fait foi, les usages, les questions ouvertes, ce qui le bloque (pièce interne, icône, décision révisée) et les appels à réécrire dans chaque application. À outiller.
- G4. Le registre suit aussi la migration de chaque fichier d'application, en trois états comme chez Backstage : migré, mixte, pas commencé. Un composant est fini quand plus aucun fichier ne l'appelle par son ancienne API. À trancher.
- G5. Le script du registre vit dans UCM-Toolkit sans aucune donnée du client, et la page générée vit dans `_local/`. Décidé.

## 13. Confidentialité

- P1. UCM-Toolkit est public, et son historique a déjà été purgé une fois. Un contrôle automatique refuse un fichier suivi qui contient un nom de la liste locale des noms du client. À outiller.
- P2. Les messages de commit et les noms de pistes ne citent ni le client, ni ses composants métier. Décidé.
- P3. Les captures du banc contiennent des textes réels du produit. Elles ne quittent pas `_local/` et n'entrent pas dans l'échantillon d'un contrat. Décidé.
- P4. `_local/` n'est sauvegardé nulle part. Une perte du disque perd les relevés et les choix du registre. À trancher.

## 13b. Pilote et cadence

- T1. Le pilote peut révéler des limites du format ou de la méthode. Une révision de la carte et du plan se place entre le pilote et le passage en masse. À outiller dans le plan.
- T2. Une échéance ou un écran à livrer d'abord changerait l'ordre des composants. À trancher (Q41).
- T3. Un composant à la fois de bout en bout pendant le pilote, puis chaque étape en lot sur tous les composants. À trancher (Q38, proposé).
- T4. Au plus deux agents tournent à la fois, et leurs lignes restent « à confirmer » jusqu'à la relecture. Décidé.

## 14. Après le chantier

- N1. Les scripts du chantier se suppriment à l'archivage de la piste. Un composant ajouté plus tard, ou une correction de la source pendant la migration, n'a alors plus d'outil. À trancher.
- N2. Une correction faite dans la v1 ou la v2 pendant le chantier se reporte dans la v3. Qui le voit et le reporte ? À trancher.
- N3. Un nouvel export d'un contrat change le code. La parité à chaque demande de fusion devient la garantie à long terme (P8). À vérifier.
- N4. La vitrine Storybook de la v3 remplace celle des sources, et les liens Chromatic et Zeplin disparaissent (P9). À trancher.
- N5. La politique de versions de la v3, la dépréciation de la v1 et de la v2, et qui corrige l'ancienne bibliothèque jusqu'à la fin de la migration. À trancher.

## 14b. Pistes et outils d'UCM touchés

- X1. P22 (pièces internes) précède le passage en masse. P31 (construction des composants) et P32 (icônes) précèdent le pilote ou s'essaient avec lui. Le plan de P30 cite les trois. À outiller dans le plan.
- X2. P18 (socle d'intencial-library), P1 (contrats réels) et P17 (verrou de fusion) touchent la reconstruction et les demandes de fusion. À vérifier.
- X3. P10 et P20 (comparateur et vérificateur du rendu) prouvent le rendu du code reconstruit. À vérifier.
- X4. P9 et P24 (Storybook généré, santé des composants) remplacent la vitrine des sources. À vérifier.
- X5. P11 (diff sémantique) détecte la dérive entre deux relevés. À vérifier.
- X6. P6 et P26 (linter du kit et linter d'intencial-library) bloquent une valeur hors tokens dans le code reconstruit. L'ordre entre eux et P30 compte. À vérifier.
- X7. P23 (remplacement de Supernova) change la chaîne qui publie aujourd'hui les tokens du client. Les sources lisent peut-être ces tokens. À vérifier.
- X8. P28 (palettes d'un design system existant) et la case 2.1 calculent les mêmes marques. À vérifier.
- X9. Un contrôle d'Architect lit-il la liste de couverture et signale-t-il dans Figma une variante manquante avant l'export ? À trancher (Q46).

## 15. Angles transversaux de la grille

La critique de la passe 3 croise chaque étape des sections 2 à 14 avec ces angles. Une case sans point se justifie.

- Ce que l'étape lit, ce qu'elle écrit, et le format de ce qu'elle écrit.
- Qui agit : mainteneur, designer, lead UX, développeurs, agents.
- Ce qui peut se perdre, et ce qui prouve que rien ne s'est perdu.
- Le temps : source ou application qui change, composant à moitié fait, décision révisée.
- Les 9 marques, le clair et le sombre.
- L'accessibilité : rôles, focus, clavier, contrastes, mouvement réduit.
- Les textes et les langues, les formats de date et de nombre.
- Le responsive et les animations.
- Les icônes, les polices et les images.
- La confidentialité.
- Les pistes de `pistes.json` et les outils d'UCM touchés.
- Le coût : temps du designer, temps d'agent, nombre d'allers-retours dans Figma.
