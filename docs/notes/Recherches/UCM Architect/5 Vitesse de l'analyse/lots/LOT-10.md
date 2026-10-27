# Lot 10 : graphe de requêtes et recalcul ciblé

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **10.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : définir clé de requête, session du document, version d'algorithme et révisions ; exclure la génération d'interface. Résultat : `requetes.ts` du socle (clé canonique, `creerLaSessionDuDocument`, `VERSION_DE_L_ALGORITHME`, registre de révisions), sans dépendances ni validation ; mesure du calcul local des trois requêtes consignée, section « Clés et révisions (10.1) ».
- [ ] ~~**10.2 | gpt-6.1-sol | high** | **Claude Opus | high** : enregistrer les dépendances réellement lues et remplacer les arêtes conditionnelles au recalcul ; test de branche changée.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : suivre ensembles ordonnés, recherches vides et priorités ; tester le premier candidat apparu après absence.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : ajouter les arêtes inverses et valider à la demande ; égalité exacte arrête la propagation sans perdre diagnostics ni limites.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : séparer rapport numérique, verdict AA/AAA et présentation des noms ; tester un changement de seuil seul.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.6 | gpt-6.1-sol | high** | **Claude Sonnet | high** : invalider par propriété, fonds, descendants et groupe typographique ; compter requêtes et arêtes visitées.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.7 | gpt-6.1-sol | high** | **Claude Sonnet | high** : traiter frontières, ordre, budget et couverture de modes ; repli large si portée inconnue ou coût fin supérieur à la reconstruction.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : comparer après chaque ajout, suppression, déplacement, renommage, alias et mode à la reconstruction complète.~~ Écartée, voir « Décision du mainteneur ».
- [ ] ~~**10.9 | gpt-6-luna | low** | **Claude Haiku | low** : ajouter les compteurs de propagation arrêtée, requêtes rejouées et arêtes visitées au banc de mutations.~~ Écartée, voir « Décision du mainteneur ».
- [x] **L1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : remplacer la requête `controles` par une requête par famille du kit, chacune avec la projection des entrées qu'elle lit ; prouver la projection par l'enregistrement des accès et par des perturbations hors projection. Résultat : huit requêtes `controle-*` (six, plus `controle-theme` et `controle-structure` pour une architecture UCM) remplacent `controles` ; chacune se reprend quand sa projection (`GABARITS`, `sandbox/projectionsDesControles.ts`) égale celle de l'entrée ; `corrections` lit le rassemblement des familles ; compteurs par famille ; section « Contrôles par famille (L1) ».
- [ ] **L2 | gpt-6.1-sol | high** | **Claude Sonnet | high** : reprendre une famille dont la projection fraîche égale la projection retenue, même quand la validation refuse la reprise du moteur ; ordre des constats inchangé.
- [ ] **L3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : banc de mutations locales (peinture, texte, nom, ajout de calque) comparé à Actualiser, avec les familles reprises et rejouées comptées dans la trace.

Prérequis : 9. Nature : incrémentalité du calcul pur.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/requetes.ts`,
`dependances.ts`, et requêtes extraites au lot 7.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : donner aux requêtes une clé complète, une révision
  de dernière vérification et de dernier changement, et des dépendances lues
  pendant le calcul. Exclure la génération de la clé ; inclure session du
  document et version de l'algorithme. Remplacer les arêtes conditionnelles au
  recalcul. Suivre aussi ensembles ordonnés, recherches vides et priorités.
- **Portée initiale répartie dans les cases ci-dessus** : ajouter les dépendances inverses et la validation à
  la demande. Une sortie exactement égale conserve sa révision de changement et
  arrête la propagation. L'égalité inclut diagnostics et limites. Séparer
  rapport numérique, verdict AA/AAA et présentation des noms.
- **Portée initiale répartie dans les cases ci-dessus** : invalider par propriété et groupe depuis les faits
  modifiés. Inclure fonds et descendants, groupes typographiques, frontières,
  ordre, budget et couverture de modes. Revenir à l'invalidation large si la
  portée manque ou si le coût fin dépasse la reconstruction mesurée.
- **Portée initiale répartie dans les cases ci-dessus** : jouer des séquences de mutations déterministes
  et comparer après chaque mutation à la reconstruction complète sur les mêmes
  faits. Affirmer aussi le nombre de requêtes rejouées, d'arêtes visitées et de
  propagations arrêtées. L'insertion du premier candidat après absence doit
  invalider la réponse négative.

Sortie : mêmes sorties après ajout, suppression, déplacement, renommage,
changement d'alias ou de mode. Une modification locale épargne les requêtes
indépendantes ; une modification globale peut tout recalculer.
Contrôle : socle/Architect et exporteur si requêtes partagées. **Build Architect.**

## Clés et révisions (10.1)

**Mesure d'abord.** Capture réelle du Button (`capture-architect-2026-10-26-17-44-54.json`), rejouée sur le double de la capture (`tests/outils/capture`), analyse complète sans réutilisation, trois rejeux dans le même processus. Les durées sont celles des étapes de la trace, sans latence de Figma : le rejeu ne chiffre que le calcul local.

| Rejeu | Total | Contrôles du kit | Corrections | Projection | Trois requêtes | Moteur (hors relevé, catalogue, requêtes) | Relevé |
|---|---|---|---|---|---|---|---|
| 1 (JIT froid) | 569 ms | 195 ms | 25 ms | 1 ms | 221 ms | 191 ms | 128 ms |
| 2 | 409 ms | 147 ms | 8 ms | 1 ms | 156 ms | 158 ms | 83 ms |
| 3 | 341 ms | 146 ms | 11 ms | 1 ms | 158 ms | 112 ms | 64 ms |

- Les contrôles du kit sont la somme des étapes `controles` et `controle-*` (hors `controle-fusion`). Les trois requêtes pures pèsent 156 à 221 ms, 38 à 46 % du calcul local du rejeu ; les contrôles du kit en sont presque tout.
- Le même rejeu par `rejouer-la-capture.ts`, qui note la pile de chacune des 169 071 lectures, dure 45 s (48,6 s de mur avec le chargement) et fausse les étapes. Il donne les mêmes ordres de grandeur pour les requêtes (contrôles 217 et 244 ms, corrections 32 et 27 ms, projection 1 ms) et 2 503 ms de lectures estimées dans Figma d'après le banc de coût de la capture.
- Borne du gain. Une mutation locale qui n'invalide pas le moteur ne peut épargner que ces 156 à 221 ms au plus ; le moteur (`regles` à `structure.tailles`) et le relevé se rejouent entiers quand la validation (9.4) refuse la reprise, et ce sont eux qui lisent Figma (2,5 s estimées). Le lot rend les trois requêtes incrémentales, pas le moteur.
- Repli de 10.7. La reconstruction complète des trois requêtes coûte 156 à 221 ms ici. La maintenance fine d'un changement qui touche beaucoup de faits (un seuil, un mode, un catalogue entier) ne doit pas dépasser ce coût ; sinon la session reconstruit tout, comme en 9.6.
- Mesure faite avec un script jetable hors du dépôt (`performance.now` autour de `traiter`, étapes de la trace), non commité.

**Clé** (`cleDeRequete(nom, arguments, session, version)`). Une chaîne JSON de `[version, session, nom, arguments canoniques]`, relue par `elementsDeCle`. Elle ne reçoit ni génération d'interface ni identité d'analyse : aucun paramètre ne les porte, et `formeCanonique` lève sur une clé d'objet `generation` ou `identite`, à tous les niveaux.

**Forme canonique** (`formeCanonique`).
- Chaînes entre guillemets échappés, nombres préfixés (`n:`), `NaN` et `-0` distincts de `0`, `1` distinct de `'1'`, `null` distinct de `undefined`, clé à `undefined` distincte d'une clé absente, case vide d'une liste distincte de `undefined`.
- Les clés d'un objet simple sont triées : l'ordre d'écriture n'identifie pas la requête. Listes, `Map` et `Set` gardent leur ordre, comme `egalesExactement`, parce qu'une requête qui les parcourt le voit.
- Un objet qui n'est pas simple, une fonction, un symbole ou un cycle lèvent : mieux vaut refuser que rendre une clé instable.

**Session du document et version.** `creerLaSessionDuDocument()` rend un identifiant neuf à chaque appel (compteur du module et part aléatoire), à créer à l'ouverture du plugin ; rien ne l'écrit. `VERSION_DE_L_ALGORITHME` vaut 1 : à monter quand une requête, un argument ou un fait lu change de sens, ce qui rend inaccessible toute valeur calculée avant.

**Révisions** (`creerLeRegistreDeRevisions`). Une révision globale et, par clé, une valeur avec `revisionVerifiee` et `revisionChangee`.
- `poserLEntree(cle, valeur)` pose un fait : clé nouvelle ou valeur qui diffère (`egalesExactement`) monte la révision globale et date la valeur ; une valeur égale ne touche à rien et rend faux.
- `poserLaRequete(cle, valeur)` range un résultat à la révision courante, qui le vérifie ; `revisionChangee` ne bouge que si le résultat diffère, et la révision globale ne monte pas.
- `verifier(cle)` reconnaît une valeur à jour sans la recalculer. Une clé ne sert pas à la fois de fait et de requête.

Limites : aucun appelant n'utilise encore ce module. Les dépendances lues pendant un calcul sont celles de 10.2, les arêtes inverses et la validation à la demande celles de 10.4. Les clés d'objet `generation` et `identite` sont refusées par leur nom : un argument qui les nommerait autrement ne serait pas détecté. La session du document n'est créée nulle part avant 10.2.

Preuves : `requetes.test.ts` du socle (13 tests : ordre des clés d'objet, `Map` et `Set`, `-0` et `NaN`, chaînes à séparateurs, arguments refusés, deux sessions, deux versions, forme de la clé et génération refusée, fait égal ou différent, résultat égal, `verifier`, genres de clé). Altérations vérifiées : clés non triées fait échouer le test de l'ordre ; `poserLEntree` qui monte toujours en fait échouer deux ; une clé sans version en fait échouer deux, sans session trois ; sans la garde `generation` et `identite`, le test de forme échoue.

## Décision du mainteneur

Les cases 10.2 à 10.9 sont écartées. Motif, d'après la mesure du Button dans Figma (build 6.12, LOT-06) et celle de 10.1 :

- le graphe ne porte que les requêtes pures qui suivent le moteur : contrôles du kit (1,7 s dans Figma, dont `controle-nommage` 972 ms et `controle-oublis` 516 ms), corrections et projection (moins de 0,3 s) ;
- après une modification locale, la relecture du relevé et du catalogue (5,3 s) et le moteur (6,0 s) se rejouent entiers. Le graphe fin gagnerait au mieux 1,5 à 1,8 s sur environ 13 s, et la cible de 0,5 s reste hors de portée ;
- seize cases, des montées du kit et un mécanisme où un oubli de dépendance rend un résultat périmé, pour ce gain.

La voie légère L1 à L3 garde l'essentiel de ce gain : un contrôle du kit par famille, repris quand la part des entrées qu'il lit est égale. Le module de 10.1 reste en place. Un moteur incrémental, hors de ce plan, rendrait le graphe fin utile à nouveau.

## Contrôles par famille (L1)

**Mécanisme.** `creerLesRequetes` rend `famille` et `requete`. Une famille se reprend d'une entrée `valide` quand `egalesExactement(projection fraîche, projection retenue)` ; elle se calcule toujours sur le relevé et le catalogue entiers. La projection retenue se recalcule sur `entree.sorties.releve` et `.catalogue` : la session ne la double pas. Quand le relevé, le catalogue et le niveau sont égaux en entier, les projections le sont aussi et aucune ne se calcule. Une famille absente de l'entrée (UCM déclarée depuis) se calcule. `requete` garde `corrections` et `projection` ; `controles` y est le rassemblement des familles dans l'ordre du produit, que `corrections` compare. Ordre des constats et étapes de la trace inchangés. `requetesNonRejouees` et `requetesRejouees` comptent par famille : huit requêtes par analyse hors UCM, dix en UCM.

**Projections** (`GABARITS`). Un gabarit liste des chemins ; `*` désigne tout indice ou toute clé ; un chemin qui s'arrête garde tout ce qu'il porte. La projection garde la forme de ce qu'elle traverse (longueur des listes, clés énumérées, présence d'un champ). Établie sur le code de `packages/kit/src/controles/`. `jeu`, `proprietes`, `variants` et `lecture` viennent du relevé, `collections` et `variables` du catalogue ; `L` désigne `variants.*.layers.*`.

| Famille | Projection |
|---|---|
| `controle-nommage` | `jeu` : nom, cle ; `proprietes.*` : nom, type, valeurs ; `variants.*` : id, valeurs ; collections : cle, nom, role ; variables : nom, collection |
| `controle-mapping` | `jeu.nom`, `proprietes.*` ; `variants.*` : id, valeurs ; `L` : id, nom, type, `instanceDe.pilotee` ; liaisons de `L` : champ, indice, plage, surcharge, `variable` (cle, nom) ; collections ; variables : cle, nom, collection, scopes, `valeurs.*.alias` |
| `controle-couches` | `variants.*.id` ; `L` : id, nom ; liaisons de `L` : champ, indice, `surcharge` (id, nom), `variable.cle` ; collections ; variables : cle, nom, collection, type, `valeurs.*.alias` |
| `controle-oublis` | `jeu.nom`, `lecture` (variantsNonLus, layersNonLus), `proprietes.*` ; `variants.*` : id, nom, valeurs ; `variable.cle` des liaisons de `L` ; collections et leur etat ; variables : cle, nom, collection |
| `controle-accessibilite` | le niveau ; `lecture.manquees.*` : layer, champ ; `proprietes.*` ; `variants.*` : nom, valeurs, modesEffectifs ; `L` : id, nom, type, parent, visible, opacite, strokeWeight, `dimensions` (largeur, hauteur), peintures ; liaisons de `L` : champ, indice, `surcharge.id`, illisible, `variable.cle` ; plages de texte : debut, fin, fontSize, fontWeight, peintures et liaisons (champ, indice, illisible, `variable.cle`) ; collections : cle, nom, etat, modes ; variables : cle, nom, collection, etat, valeurs |
| `controle-typographie` | `proprietes.*` : nom, type ; `variants.*.nom` ; `L` : id, nom, type, parent, visible, `instanceDe` (distante, pilotee), `texte.style` ; liaisons de `L` et de ses plages : champ, illisible, `variable` (cle, nom, collection) ; collections ; variables : cle, nom, collection |
| `controle-theme` | `variants.*.id` ; `L` : id, nom, parent, peintures (champ, visible, indice) ; liaisons de `L` : champ, indice, plage, surcharge, illisible, `variable.cle` ; liaisons des plages : les mêmes sauf illisible ; collections ; variables : cle, nom, collection, etat |
| `controle-structure` | `jeu.nom`, `proprietes.*` ; collections : cle, nom, role, etat, modes ; variables : cle, nom, collection, etat, valeurs. Aucun variant ni layer |

Collections : cle, nom, role. Une famille qui retrouve une variable par `variableDuCatalogue` lit le `nom` de toutes les variables (index du catalogue) : l'accessibilité le porte pour cette raison.

**Lues en entier.** L'accessibilité garde `peintures`, `valeurs` et `modes` sans les découper : elle lit les couleurs de toute variable liée, sans lire son type. Une valeur de variable change donc la projection de l'accessibilité et de la structure, et seulement de ces deux-là. Une peinture ou une taille de texte ne change que celle de l'accessibilité ; un style de texte, que celle de la typographie. La structure ne lit ni variant ni layer. L'accessibilité garde 999 des 1 520 feuilles du relevé riche : sa projection est une grande part de l'entrée, et sa reprise n'épargne que ce qu'elle ne lit pas (noms de variants, `valeursEnDur`, `instanceDe`, `jeu`).

**Preuves** (`tests/projectionsDesControles.test.ts`, 74 tests). Deux jeux : un relevé riche (`tests/aides/donneesRiches.ts` : six variants, 1 520 feuilles ; axes reconnus, calque masqué, anneau, texte à deux plages, instance pilotée, surcharge, liaisons illisibles, alias vers le thème et les marques) et la fixture du banc de session (100 feuilles, `tests/aides/fichierDeSession.ts`, extraite de `paritesDeSession.test.ts`).
- Accès. Chaque famille tourne sur un relevé et un catalogue enveloppés par un `Proxy` (`tests/aides/accesEnregistres.ts`) qui note le chemin de chaque lecture, `in` et énumération de clés compris. Tout chemin lu est couvert par le gabarit, ou mène à un chemin du gabarit (un conteneur dont la projection garde la forme). Le premier essai a trouvé un champ oublié : l'accessibilité lit `variables.*.nom` par l'index du catalogue.
- Perturbations. Chaque feuille hors gabarit est altérée seule sur des données neuves et les constats restent identiques (de 521 à 1 408 feuilles par famille sur le relevé riche, de 45 à 92 sur le banc). Chaque feuille du gabarit altérée change la projection. Douze scénarios (peinture, taille de texte, style de texte, nom de calque, ajout de calque, valeur de variable, alias, portée, nom de variable, niveau, lecture incomplète, espace de couleur) fixent les projections qui changent, vérifient qu'une famille ne change de constats que si sa projection change, et qu'elle les change quand la modification la concerne.
- Reprise. `creerLesRequetes` sur une entrée fabriquée : une peinture ne rejoue que l'accessibilité (et la structure, que l'entrée n'a pas jugée), un nom de calque en rejoue cinq, sans entrée tout se calcule.
- Banc de session. Parité avec Actualiser inchangée. Niveau AA vers AAA : 7 reprises, 1 rejouée (l'accessibilité) au lieu de 2 et 1. Library autre : 7 reprises, 1 rejouée (les corrections, qui lisent le catalogue entier) au lieu d'au moins 2 rejouées, parce qu'aucune famille ne lit la library.
- Altérations. Sans `opacite` dans le gabarit de l'accessibilité et sans `jeu.cle` dans celui du nommage, 5 tests échouent (accès et perturbations). Deux tests refont l'altération à chaque exécution. Retirer chaque chemin des gabarits, un à un, est détecté sur tous sauf `surcharge.nom` des couches (C80), `manquees.*.champ` et le niveau de l'accessibilité, que la fixture ne lit pas ; le niveau l'est par son scénario.

**Limites.**
- Une entrée `valide` a un relevé et un catalogue égaux à ceux de la demande : dans L1, la projection n'arbitre que le niveau et la présence des familles UCM. Le gain des projections vient de L2, qui reprend une famille quand la validation refuse le moteur.
- Un gabarit est une liste écrite une fois : un champ nouveau lu par une famille du kit doit y entrer, sinon la famille serait reprise à tort. Les tests ne l'attrapent que sur les branches que les deux jeux atteignent.
- Coût d'une projection sur 180 variants, 630 calques et 6 000 variables (2 Mo de JSON) : 2 à 8 ms par famille, 32 ms pour les huit, doublés quand le relevé a changé (fraîche et retenue). Les contrôles locaux coûtent environ 150 ms sur le Button.
