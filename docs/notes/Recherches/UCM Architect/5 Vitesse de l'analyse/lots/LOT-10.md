# Lot 10 : graphe de requêtes et recalcul ciblé

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **10.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : définir clé de requête, session du document, version d'algorithme et révisions ; exclure la génération d'interface. Résultat : `requetes.ts` du socle (clé canonique, `creerLaSessionDuDocument`, `VERSION_DE_L_ALGORITHME`, registre de révisions), sans dépendances ni validation ; mesure du calcul local des trois requêtes consignée, section « Clés et révisions (10.1) ».
- [ ] **10.2 | gpt-6.1-sol | high** | **Claude Opus | high** : enregistrer les dépendances réellement lues et remplacer les arêtes conditionnelles au recalcul ; test de branche changée.
- [ ] **10.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : suivre ensembles ordonnés, recherches vides et priorités ; tester le premier candidat apparu après absence.
- [ ] **10.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : ajouter les arêtes inverses et valider à la demande ; égalité exacte arrête la propagation sans perdre diagnostics ni limites.
- [ ] **10.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : séparer rapport numérique, verdict AA/AAA et présentation des noms ; tester un changement de seuil seul.
- [ ] **10.6 | gpt-6.1-sol | high** | **Claude Sonnet | high** : invalider par propriété, fonds, descendants et groupe typographique ; compter requêtes et arêtes visitées.
- [ ] **10.7 | gpt-6.1-sol | high** | **Claude Sonnet | high** : traiter frontières, ordre, budget et couverture de modes ; repli large si portée inconnue ou coût fin supérieur à la reconstruction.
- [ ] **10.8 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : comparer après chaque ajout, suppression, déplacement, renommage, alias et mode à la reconstruction complète.
- [ ] **10.9 | gpt-6-luna | low** | **Claude Haiku | low** : ajouter les compteurs de propagation arrêtée, requêtes rejouées et arêtes visitées au banc de mutations.

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
