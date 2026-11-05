# G1b. Calcul des noms dans un Worker de l'interface

Phase G. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase G
dans [README.md](../README.md), puis [RECHERCHE-ATTENTE-ANALYSE.md](../../RECHERCHE-ATTENTE-ANALYSE.md) en entier.

Agent : `implementeur-exigeant`. Dépend de : G1a.

Fichiers : `src/ui/` (nouveau Worker et son client), `src/ui/index.ts`, `src/nomenclature/session.ts`, `scripts/build-ui.cjs`, galerie.

- [x] G1.3 L'interface lance le calcul de G1a dans un Worker. Le sandbox envoie l'inventaire et garde la génération courante. Chaque
  réponse porte la demande, la génération et la révision de l'acquisition. Une nouvelle analyse invalide les réponses précédentes.
- [x] G1.4 Le sandbox relit les objets avant toute écriture, comme aujourd'hui. Le Worker n'écrit rien.
- [x] G1.5 Si le Worker ne démarre pas ou échoue, le calcul se fait dans le sandbox. Vérifiez le chargement du Worker dans la galerie
  avec la politique de contenu du plugin.
- [x] G1.6 Le journal de G0 mesure transfert de l'inventaire, démarrage du Worker, calcul et retour.

Fin : `npm run test:paquet -- architect` passe. Un test compare le bilan du Worker et celui du sandbox sur le rejeu.

## Avancement

G1.3 à G1.6 sont faits dans l'arbre de travail, sans commit. La politique de contenu de Figma pour l'iframe reste inconnue ici, et la vitesse du Worker dans Figma reste à mesurer (G5).

- Architecture : le bilan passe par quatre messages. Le sandbox lit l'inventaire, puis envoie `calcul-des-noms` (`src/messages/calculDesNoms.ts` : demande, génération suivante, révision, heure d'envoi, `EntreeDuCalcul`). L'écran (`src/ui/index.ts`) le passe à `creerCalculateurDeNoms` (`src/ui/nomenclature/calculDesNoms.ts`), qui le poste au Worker. Le Worker (`calculDesNomsWorker.ts`) exécute `calculerLeBilanDirect` et répond. Le client rend `noms-calcules` (bilan et heures) ou `noms-non-calcules` (cause) au sandbox par `versSandbox`. Les deux réponses sont déclarées dans `DemandeDeNomenclature` ; `src/sandbox/nomenclature.ts` les range auprès du port avant la file de la session, qui attend justement cette réponse.
- Port du sandbox : `src/nomenclature/distant.ts` `creerPortDistant`. Une réponse dont la demande, la génération ou la révision diffère de la requête en attente est ignorée. La révision est `reperDesLectures()` au moment de l'envoi. Sans réponse en 120 s (`DELAI_DU_CALCUL_DISTANT`) la requête se replie. Une analyse plus récente appelle `annuler` (`passage.interrompre`) et la session abandonne le passage.
- Session : `calculerAilleurs` essaie le port. Un bilan reçu devient la génération courante (`validerLeCalculDistant`) ; la session ne garde alors que l'entrée du calcul (`distant`). Décision prise ici : le lot G1c n'a pas encore déplacé les lectures et les gestes, donc la première lecture (`lignes`, `termes`, `fiche`, `noms-selection`, `diagnostic`, `simuler`) ou le premier geste (`regle`, `noms-repondre`, `configurer`, `importer`, `appliquer`) refait `calculerTout` dans le sandbox par tranches (`completerLEtat`), une seule fois pour toutes les demandes en attente, sous la même génération. Une lecture ou un geste produit donc la réponse qu'une session sans Worker aurait rendue. G1c retire ce calcul.
- G1.4 : aucune écriture ne change. `appliquer` compare toujours la signature des règles après `ouvrir`, et `appliquerLesRenommages` relit chaque nom avant d'écrire. Le Worker ne lit ni n'écrit rien dans Figma.
- G1.5 : le client jette le Worker, puis répond `indisponible` à chaque requête suivante, dans quatre cas : la source est absente (`__SOURCE_DU_WORKER_DE_NOMS__`, définie par le build), `new Worker` lève, le script ne dit pas `demarre` en 5 s ou charge mal (`demarrage`), le calcul échoue ou le message est illisible (`echec`). Le sandbox calcule alors lui-même, par tranches, comme avant. Dans Chromium, une page dont une balise `meta` pose `worker-src 'none'` donne `noms-non-calcules` puis `indisponible`, et le bilan vient du sandbox.
- G1.6 : le journal du mode Tokens (`src/lecture.ts`) note les phases `worker-transfert` (de l'envoi par le sandbox à la réception par l'écran si l'écran crée le Worker, sinon jusqu'à la réception par le Worker), `worker-demarrage` (de la réception par l'écran à celle par le Worker, seulement quand cette requête a créé le Worker), `worker-calcul` et `worker-retour` (du Worker au sandbox). Le passage englobant `calcul-des-noms` porte `voie` (`worker` ou `sandbox`) et `repli` (cause du repli, ou `relecture` pour le calcul que le sandbox refait après un bilan du Worker). Les heures partagent l'horloge de la machine.
- Build : `scripts/build-ui-js.cjs` compile le Worker en mémoire (iife, chrome80, minifié), puis l'embarque dans `dist/ui.js` par `define` ; `build:ui:js` l'appelle. Le README du paquet reprend la commande du build de capture (`--banner:js=`). Le Worker naît d'un `Blob` à la première requête.
- Tailles et durées :
  - Bundle du sandbox (`src/code.ts`, sans minification) : 1 350 795 puis 1 362 399 octets, soit +0,9 %. Minifié : 662 742 puis 667 982.
  - Bundle de l'écran minifié, hors Worker : 512 799 puis 514 761 octets. Source du Worker : 140 732 octets. `ui.html` passe de 647 917 à 791 706 octets.
  - Entrée du calcul en JSON : 1 084 910 octets pour 2 415 variables avec règle d'écriture, 325 871 pour 755. Un seul message la porte. Le bilan fait 21 822 et 7 724 octets.
  - Dans Chromium, 2 415 variables : 535 ms de calcul dans le Worker à la première requête, 510 ms à la seconde ; 51 ms du message de l'écran à la réception par le Worker au démarrage, 20 ms ensuite ; 1 ms de retour. Sous Node, `calculerLeBilanDirect` prend 642 ms.
- Tests : `tests/nomenclatureCalculDistant.test.ts` (17 tests : parité du bilan Worker et sandbox sur 7 fixtures et sur les 2 fichiers du rejeu avec et sans règle, entrée passée par une copie JSON, aucun lexique calculé par le sandbox avec le Worker, journal, quatre causes de repli, port qui lève, bilan d'une autre génération, lectures et geste après le bilan, réponse périmée, analyse remplacée) ; `tests/calculDesNomsClient.test.ts` (10 tests) ; `tests/interface/calculDesNoms.test.mjs` (4 tests dans Chromium sur `dist/ui.html`, hors `test:ui`). Sans le branchement de `calculerAilleurs`, 11 tests de `nomenclatureCalculDistant.test.ts` échouent.
- Commandes : `npm run typecheck --workspace ucm-architect-plugin` rend 0 erreur. `npm run test:paquet -- architect` : 2 207 passent, 2 échouent (`paritesDeSession` et les projections des lecteurs), hors de ce lot ; selon les modifications des autres agents, cinq autres échouaient dans l'accessibilité et `motsDuTermeUcm`. `node --test tests/interface/calculDesNoms.test.mjs` passe.
- Reste pour G1c : placer l'état complet (lexique, résultat, questions) dans le Worker et lui confier les lectures, les gestes et les simulations avec la même voie de repli ; retirer le calcul de `completerLEtat`. Le Worker ne conserve rien entre deux requêtes.
