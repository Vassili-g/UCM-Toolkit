# Plan d'implémentation de la fiabilisation d'Architect

Ce plan implémente les maquettes validées de [MAQUETTE-FIABILISATION.html](../MAQUETTE-FIABILISATION.html), sections 1 à 8.
Il ajoute une phase de vitesse du mode Tokens. La phase E corrige les failles mesurées, d'après les réponses aux
[questions V2](../QUESTIONS-V2.html).

Un agent lit ce fichier, puis le seul fichier de son lot dans [lots/](./lots/). La table qui rattache chaque décision à ses cases
est dans [COUVERTURE.md](./COUVERTURE.md).

## Règles d'exécution

- Chaque fichier de lot finit par une section « Avancement ». L'agent y écrit, après chaque case finie, ce qui est fait, les fichiers
  touchés, les commandes lancées avec leur résultat et ce qui reste. Une session coupée reprend à partir de cette section.
- L'agent coche ses cases dans le fichier du lot, et la colonne « État » de ce README avec le hash du commit.
- Un agent autonome, comme Codex, qui travaille sans la conversation principale, tient lui-même son rôle pour ses lots : relecture
  du diff, vérifications, cartes et SPEC, montée de version du kit, commit par chemins explicites.
- La conversation principale confie un lot par appel à l'agent nommé. Le prompt contient sa note, les chemins complets,
  la sortie de `npm run agents:lire -- <chemins du lot>` et sa ligne « Fin ». L'agent ne reçoit pas le plan entier.
- Le mainteneur demande des lots en parallèle, quatre au plus. Deux lots tournent ensemble seulement s'ils n'ont aucun fichier
  commun, ni source, ni test, ni galerie. La colonne « Dépend de » donne l'ordre conseillé. Un lot part dès que ses prérequis
  fonctionnels sont commités.
- Un agent ne touche ni `CARTE.md`, ni `SPEC.md`, ni un invariant, ni ce plan. Il rend les lignes à changer, et la conversation
  principale les écrit avant le commit.
- Personne ne monte la version du kit avant la fin. Le mainteneur le demande pour aller vite : la conversation principale la monte
  une seule fois en F2, puis publie. D'ici là, `tests/versionSuitLeContenu.test.mjs` et `tests/corpusUcm.test.ts` échouent après un
  lot du kit, et le `verificateur` les classe à part.
- Un échec dans un fichier d'un autre lot en cours se signale sans se corriger. Le `verificateur` relance l'arbre stable avant
  le commit.
- La conversation principale relit le diff et fait vérifier l'arbre stable par un `verificateur` avant chaque commit.
  Elle lance `npm run agents:diff`, relit les documents listés et commite par chemins explicites. Elle coche les cases avec le hash.
- La montée de version qui suit un lot du kit couvre les dépendants, le verrou, les pins exigés par
  `tests/versionSuitLeContenu.test.mjs` et `docs/references/design-systems/ucm/sources.json` (régénéré par
  `node docs/references/design-systems/_outils/ucm.mjs`). Chargez `publier-paquets` avant cette montée. Lancez les tests du kit et
  `node scripts/run-tests.cjs`. Publiez les seules versions finales en F2, dans l'ordre de la skill.
- Un bug reçoit un test de régression qui échoue sans la correction. Chaque écran changé reçoit un état dans
  `packages/plugin-architect/galerie/etats/`, ou dans la galerie du plugin concerné. Les harnais longs restent hors de `npm test`.
- Relisez la `SPEC.md` existante du paquet, sa `CARTE.md` et les invariants rendus par `agents:diff`.
  Modifiez leur règle dans le lot qui la change. Chargez `rediger-pour-agents` avant toute écriture de carte ou d'invariant.
  Le socle renvoie aux autorités de `packages/plugin-socle/AGENTS.md`, sans `SPEC.md` propre.
- Chargez `rediger-diagnostics-ucm` pour les textes du designer. Gardez les textes français validés de la note.
  Traduisez aussi dans le catalogue anglais si le paquet en possède un. Les textes d'Architect sont dans
  `packages/plugin-architect/src/ui/textes/`. Aucun catalogue anglais nouveau n'est prévu pour Architect.
- Réservez `implementeur-exigeant` à plusieurs lecteurs d'une règle, à une interface comparée à la maquette,
  ou à une réécriture sans perte. Une mesure seule revient au `verificateur`.
- Personne ne lance `test:ui`. Le mainteneur relit les captures et fait la recette dans Figma.
- `packages/plugin-palettes/` et `packages/couleur/` appartiennent à une autre session. Dans cette relecture, vérifiez seulement
  l'existence de leurs chemins. A3c et A8 attendent leur arbre commité et un relevé autorisé de leurs icônes.
- Aucun nom tiré d'un fichier client n'entre dans un fichier suivi. Les captures et les rapports nommés restent dans `_local/`.

### Méthode économe

Le mainteneur la demande pour aller vite et économiser les tokens. Elle remplace les règles ci-dessus quand elles
divergent.

- Deux files tournent, sans fichier commun. La file kit suit la chaîne E3, puis E5 à E9. La file Architect suit C6, D6b, A6, A9, D5a,
  A11, puis E4 et E10 à E11. Le hub (A9) peut rejoindre l'une ou l'autre.
- Un appel confie deux ou trois lots consécutifs de la même file. Le prompt donne les chemins des fichiers de lot et la ligne
  « Fin », pas leur contenu. L'agent lit ses fichiers de lot et lance lui-même `npm run agents:lire`.
- L'agent remplit l'« Avancement » de chaque lot et coche ses cases. Il rend un rapport de quinze lignes au plus : fichiers touchés,
  commandes et résultats, reste, lignes de `CARTE.md`, `SPEC.md` ou d'invariant à écrire.
- L'agent peut écrire ces lignes de documents dans son lot. La conversation principale relit leur diff.
- La conversation principale lit `git diff --stat` et les seules sources de règle, pas les tests en entier.
- Un `verificateur` passe par vague de deux appels. Les commits restent séparés par lot.

### Chemins et commandes

Les chemins commençant par `src/` dans les phases A à E désignent `packages/plugin-architect/src/`.
Dans les listes abrégées, un nom seul reprend le dossier du chemin complet précédent, sauf mention contraire.
Les fichiers annoncés « nouveau » sont à créer. Les références de code emploient le chemin et le symbole, sans numéro de ligne.

`stress:f1` et `stress:rejeu` sont des scripts du `package.json` racine.
`stress:structure`, `stress:composant` et `stress:analyse` sont dans `packages/plugin-architect/package.json`.
Construisez le kit avec `npm run build --workspace @ucm-kit/core` avant ces trois harnais.
Les commandes `npx tsx <chemin>/mesurer.ts` exécutent un fichier suivi avec la dépendance `tsx` du `package.json` racine.
Elles ne désignent pas un script npm supplémentaire.

## Vue d'ensemble

| Phase | Lots | Objet |
|---|---|---|
| A | A1 à A11, A3 en trois appels | Signes d'objet dans le kit, alertes au socle, lecteurs des plugins (section 8) |
| B | B1 à B7 | Mode Composant : cochage, Ignorer, périmée, ignorés, partielle, refus (sections 2 à 7) |
| C | C1 à C6 | Mode Tokens en deux onglets, Constats et Règles (section 1) |
| D | D0 à D7 | Vitesse de l'analyse du mode Tokens |
| E | E1 à E12 | Corrections tirées des réponses V2, famille par famille |
| G | G0 à G5 | Attente avant les constats du mode Tokens |
| F | F1 à F3 | Clôture, publication, recette |

## Phase A. Les icônes dans le kit

Les signes d'objet ont une seule définition dans `packages/kit/src/referentiel/signes.ts`. Les icônes d'alerte restent dans
`packages/plugin-socle/src/ui/Alerte.ts`, conformément à R-8 et QM-11. Le test A11 distingue ces deux autorités.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [A1](lots/A1.md) Signes du mode Tokens et de la revue | `implementeur` | rien | [x] 8d4111ce |
| [A2](lots/A2.md) Un tracé, une définition | `implementeur-exigeant` | A1 | [x] a0c55f27 |
| [A3a](lots/A3a.md) Interface | `implementeur` | A2 | [x] 4e8adebf |
| [A3b](lots/A3b.md) Types de terme et sorties texte | `implementeur` | A3a | [x] 1378730e |
| [A3c](lots/A3c.md) Signes de Palettes | `implementeur` | A3b, arbre réservé commité et relevé autorisé | [x] bd46a97c, A3.7 en F2 |
| [A4](lots/A4.md) Documentation d'emploi et vue illustrée | `implementeur` | A3b | [x] ebae5136 |
| [A5](lots/A5.md) Le socle lit le kit | `implementeur-exigeant` | A3b | [x] 9830ed71 |
| [A6](lots/A6.md) Architect lit le kit | `implementeur` | A5 | [x] f3f676b7 |
| [A7](lots/A7.md) L'exporteur lit le kit | `implementeur` | A5 | [x] 66177bb5 |
| [A8](lots/A8.md) Palettes lit le kit | `implementeur` | A3c, A5, arbre de Palettes commité | [x] bd46a97c |
| [A9](lots/A9.md) Le hub lit le kit | `implementeur` | A3b, A5 | [x] 3caafb11, cafa043d |
| [A10](lots/A10.md) Glyphes des sorties texte | `executant` | A3b | [x] 8899b0fa, A10.2 reste |
| [A11](lots/A11.md) Test de la loi des icônes | `implementeur` | A6 à A10 | [x] 5168cb9e |

## Phase B. Mode Composant

| Lot | Agent | Dépend de | Section | État |
|---|---|---|---|---|
| [B1](lots/B1.md) Corrections décochées | `implementeur` | rien | 2 | [x] f92b3d9c, B1.4 en partie |
| [B2](lots/B2.md) Ignorer sur les cartes de règles | `implementeur` | B1 | 2 | [x] 71ca79a7, persistance après analyse vérifiée sur le faux DOM dans 7066074e |
| [B3](lots/B3.md) Ignorer une question | `implementeur-exigeant` | B2 | 3 | [x] cf23ed93 |
| [B4](lots/B4.md) Analyse périmée | `implementeur` | B3 | 4 | [x] ebd9613e |
| [B5](lots/B5.md) Tous les constats ignorés | `implementeur` | B4 | 5 | [x] 138490d9 |
| [B6](lots/B6.md) Analyse partielle | `implementeur` | B5 | 6 | [x] 138490d9 |
| [B7](lots/B7.md) Demande refusée pendant une écriture | `implementeur` | B6 | 7 | [x] 138490d9 |

## Phase C. Mode Tokens en deux onglets

QM-1, QM-2, QM-4 et QM-10. Option B de la section 1. Les cartes de Nomenclature gardent la forme validée du tour 3. Les catégories sont, dans l'ordre : Noms,
Variables manquantes, Crans, Alias, Modes, Valeurs, Couches, Types, Rangement, Scopes.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [C1](lots/C1.md) Modèle des catégories | `implementeur` | A1 | [x] 71ca79a7 |
| [C2](lots/C2.md) Coquille à deux onglets, sommaire et sections | `implementeur-exigeant` | C1 | [x] 8a49858d, c950a105 |
| [C3](lots/C3.md) Section Noms | `implementeur` | C2 | [x] edcbd311 |
| [C4](lots/C4.md) Sections de structure | `implementeur` | C3 | [x] edcbd311 |
| [C5](lots/C5.md) Cochage et Appliquer commun | `implementeur-exigeant` | C3, C4 | [x] bdf26ed5 |
| [C6](lots/C6.md) Galerie et SPEC | `implementeur` | C5 | [x] 303d8903 |

## Phase D. Vitesse du mode Tokens

D0 mesure le chemin Tokens avant toute optimisation. Les durées du mode Composant ne donnent aucune cible pour ce chemin.
Lisez `docs/notes/Recherches/UCM Architect/5 Vitesse de l'analyse/CHECKLIST-IMPLEMENTATION.md` et
`docs/notes/Recherches/UCM Architect/5 Vitesse de l'analyse/lots/README.md`.
Les lots 00, 04, 05, 06, 08, 09 et 16 portent les preuves à reprendre, dans le sous-dossier `lots/`.
La technique 16.11 porte sur la coopération. Elle ne prouve ni la fraîcheur ni le gain d'une prélecture.

Une optimisation compare les sorties complètes ordonnées à une référence fixée après C6. Comparez codes, identifiants, faits,
questions, corrections, `aRelire`, ignorés, limites et couverture. Gardez l'ordre et les candidats.
Isolez toute correction de comportement dans son lot E avec un test rouge. Ne modifiez pas les attentes pour faire passer la parité.
Une capture absente se compte absente. Une comparaison locale ne prouve pas la fraîcheur dans Figma.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [D0](lots/D0.md) Mesure de référence | `implementeur` | rien | [x] bd9f418d, 10956167, 6da92e93, durée Figma en D7.2 |
| [D1](lots/D1.md) Acquisition commune dans la demande | `implementeur-exigeant` | D0 | [x] dfd09249, 6da92e93 |
| [D2](lots/D2.md) Lectures groupées | `implementeur` | D1 | [x] 4dedcf96 |
| [D3](lots/D3.md) Coûts algorithmiques du kit | `implementeur` | D0 | [x] 8d4111ce, 6da92e93 |
| [D4a](lots/D4a.md) Ignorer sans acquisition | `implementeur` | D3 | [x] e91eac2e |
| [D4b](lots/D4b.md) Relecture après Appliquer | `implementeur-exigeant` | D4a | [x] 96ce02a6, voie complète |
| [D5a](lots/D5a.md) Candidat de prélecture | `implementeur` | D4b | [x] f3f676b7 |
| [D5b](lots/D5b.md) Mesure de prélecture | mainteneur | D5a, build disponible | [ ] |
| [D6a](lots/D6a.md) Virtualisation des cartes | `implementeur` | D4b | [x] 2756fac9 |
| [D6b](lots/D6b.md) Branchement des sections | `implementeur` | D6a | [x] 303d8903 |
| [D7](lots/D7.md) Mesure finale | `verificateur`, puis le mainteneur | D6b, D5a | [ ] |

## Phase E. Corrections tirées des réponses V2

Chaque décision de [QUESTIONS-V2.html](../QUESTIONS-V2.html) (archive « Questions tranchées ») et chaque écart de
[MESURE-DES-FAILLES.md](../MESURE-DES-FAILLES.md) est rattaché aux cases de A à E et à la table de couverture finale. Chaque case cite sa question ou son écart. L'agent relit la décision avant d'écrire. Les 102 décisions sont acquises. QV-5 est tranchée comme report au prochain passage dans Figma.

Règles propres à la phase E :

- La conversation principale écrit les textes destinés au designer avant de confier un lot, avec la skill `rediger-diagnostics-ucm`, et
  les met dans la note du lot. Aucun texte ne dit « peinture » ni « mélange » (Q-F7-14).
- Toute proposition arrive décochée (Q-F2). Une correction n'est cochable que si elle est exacte, avec une règle écrite et un seul
  candidat. Sinon c'est une question.
- Un exemple, un test ou une fixture écrit un variant en toutes lettres (`Size=Small`) et un token en abréviation (`sm`) (Q-F5-6).
- Q-F2-9. Créez un test de régression pour chaque écart corrigé. Le `todo` connu de N-04 dans
  `packages/kit/tests/stressComposantBase.test.ts` se retire avec E5d. Les autres fichiers de régression ne sont pas supposés exister.
- Chaque sous-lot ci-dessous tient en un appel. Il garde les identifiants de cases E1 à E11 pour la traçabilité.
  La ligne « Fin » locale porte sur ses régressions. Le harnais complet et les cibles de famille se vérifient en E12.
  Une fin locale ne promet pas les résultats des autres sous-lots.
- Reclassez les cas `mesure` selon les décisions acquises avant de calculer les dénominateurs.
  Conservez les cibles de `MESURE-DES-FAILLES.md` comme objectifs de recette, sans les déclarer atteintes à l'avance.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [E0](lots/E0.md) Décisions et oracles | `implementeur` | C6 | [x] 71ca79a7 et suivi, Codex |
| [E0b](lots/E0b.md) Mesure des opérateurs F3-F4 | `implementeur` | E0 | [x] 7b1cc3e3 |
| [E1a](lots/E1a.md) Valeurs de variant et axes | `implementeur-exigeant` | E0 | [x] 1273a15a |
| [E1b](lots/E1b.md) Icône, anneau et rôle de layer | `implementeur-exigeant` | E1a | [x] 65e01b5e, E1.7 en F2 |
| [E2a](lots/E2a.md) Dictionnaire et vocabulaire du fichier | `implementeur-exigeant` | E1b | [x] 9bd451ad |
| [E2b](lots/E2b.md) Fautes et seuils | `implementeur` | E2a | [x] fb3a84e1 |
| [E2c](lots/E2c.md) Formes tolérées, synonymes et collections | `implementeur` | E2b | [x] fb3a84e1, `gray`/`grey` traité par E2d et régression complétée dans db488483 |
| [E2d](lots/E2d.md) Idempotence et branches parallèles | `implementeur` | E2c | [x] fdca6a38, E2.10 en F2 |
| [E3a](lots/E3a.md) Rôles proches et palette voisine | `implementeur` | E2d | [x] eae07fc6 |
| [E3b](lots/E3b.md) Sens et modes | `implementeur-exigeant` | E3a | [x] eae07fc6 |
| [E3c](lots/E3c.md) Doublons de rôle et d’échelle | `implementeur` | E3b | [x] 60f567cf |
| [E3d](lots/E3d.md) Cible des alias du thème | `implementeur` | E3c | [x] 60f567cf, recette de Palettes non lue |
| [E3e](lots/E3e.md) Variables indisponibles, voisins et scopes | `implementeur` | E3c | [x] 62ace337, N-08 en E10b |
| [E3f](lots/E3f.md) Cartes de couches et thème absent | `implementeur` | E3e | [x] 62ace337 |
| [E4a](lots/E4a.md) Questions et cartes de structure | `implementeur` | E3f, C6 | [x] 04b9f6c2, reliquat du parent des homonymes fait dans 99a44d82 |
| [E4b](lots/E4b.md) Échecs, ignorés et alias à écrire | `implementeur` | E4a, E3d | [x] ccf4ff24, cinq motifs sans texte (E4.2) |
| [E4c](lots/E4c.md) Fusion de variables | `implementeur-exigeant` | E4b, E3c | [x] ccf4ff24, second constat de retrait reste |
| [E5a](lots/E5a.md) Layers masqués et rôles | `implementeur` | E1b | [x] 28d4fc6d, interface E5.1 et E5.3 en E4a |
| [E5b](lots/E5b.md) Propagation et héritage | `implementeur` | E5a | [x] 28d4fc6d, texte des homonymes reste |
| [E5c](lots/E5c.md) Texte et fond de page | `implementeur` | E5b | [x] 62ace337 |
| [E5d](lots/E5d.md) Liaisons, alias de composant et scopes | `implementeur` | E5c | [x] 62ace337, texte de E5.7 reste |
| [E6](lots/E6.md) Tailles du composant | `implementeur` | E5d | [x] 388f8059, carte de E6.3 reste |
| [E7a](lots/E7a.md) Axes et valeurs | `implementeur-exigeant` | E6, E1a | [x] 388f8059, textes de E7.3 et E7.4 restent |
| [E7b](lots/E7b.md) Matrice et tokens sans emploi | `implementeur` | E7a | [x] b0558daf |
| [E8a](lots/E8a.md) Icônes du composant | `implementeur-exigeant` | E7b, E1b | [x] b0558daf, reliquat des valeurs d'instance fait dans 7f363fc7 |
| [E8b](lots/E8b.md) Styles de texte | `implementeur` | E8a | [x] 2e80ec58 |
| [E9a](lots/E9a.md) Composition et valeurs de couleur | `implementeur` | E8b | [x] 2e80ec58, phrase de couleur-hors-gamut reste |
| [E9b](lots/E9b.md) Visibilité et fond du texte | `implementeur` | E9a | [ ] |
| [E9c](lots/E9c.md) Modes, garanties et identifiants | `implementeur` | E9b | [ ] |
| [E9d](lots/E9d.md) Contours et anneaux | `implementeur` | E9c, E1b | [ ] |
| [E9e](lots/E9e.md) Désactivés et limites de lecture | `implementeur` | E9d | [ ] |
| [E10a](lots/E10a.md) Règles d’usage | `implementeur` | E9e, B2 | [ ] |
| [E10b](lots/E10b.md) Points du moteur et dédoublonnage | `implementeur-exigeant` | E10a, E5d, E6 | [ ] |
| [E11a](lots/E11a.md) Lectures refusées | `implementeur` | E10b, B6 | [ ] |
| [E11b](lots/E11b.md) Ordre, budget et library à choisir | `implementeur-exigeant` | E11a, B7 | [ ] |
| [E11c](lots/E11c.md) Sujet, cycle et résultat provisoire | `implementeur` | E11b | [ ] |
| [E12](lots/E12.md) Rejeu complet et cibles | `verificateur`, puis la conversation principale | E11c, E0b, E3d, E4c, D7.1, D5a | [ ] |

## Phase G. Attente avant les constats du mode Tokens

[RECHERCHE-ATTENTE-ANALYSE.md](../RECHERCHE-ATTENTE-ANALYSE.md) établit la cause probable des 30 secondes d’attente. Le calcul des noms
(lexique, renommages, questions) prend 0,8 s sous Node et 30 s dans QuickJS sur le même fichier de 2 415 variables, avec des lectures
immédiates. Le sandbox de Figma exécute QuickJS. L’interface du plugin exécute un moteur de navigateur. La phase déplace ce calcul pur
dans un Worker de l’interface, garde le sandbox en repli, et affiche la structure sans attendre les noms. Les écritures restent
dans le sandbox, qui relit les objets avant d’écrire.

G0 mesure d’abord chaque phase dans Figma : l’écart entre QuickJS sous WebAssembly et le moteur de Figma reste à prouver. La variante
qui mémorise le découpage n’est pas retenue, car elle ne donne aucun gain global stable. G2 et G3 ne dépendent pas du Worker.
G1a et G2 peuvent tourner ensemble, sans fichier commun.

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [G0](lots/G0.md) Mesure par phase | `implementeur`, puis le mainteneur | rien | [x] e95a7d51, a1e00731 |
| [G1a](lots/G1a.md) Calcul des noms sans le sandbox | `implementeur-exigeant` | G0 | [ ] |
| [G1b](lots/G1b.md) Calcul des noms dans un Worker de l’interface | `implementeur-exigeant` | G1a | [ ] |
| [G1c](lots/G1c.md) Recalculs, simulations et projections dans le Worker | `implementeur-exigeant` | G1b | [ ] |
| [G2](lots/G2.md) Structure affichée avant les noms | `implementeur-exigeant` | G0 | [ ] |
| [G3](lots/G3.md) Messages fidèles aux étapes | `implementeur` | G2 | [ ] |
| [G4](lots/G4.md) Pas synchrones bornés | `implementeur` | G1b | [ ] |
| [G5](lots/G5.md) Mesure de l’attente | `verificateur`, puis le mainteneur | G1c, G2, G3, G4 | [ ] |

## Phase F. Clôture

| Lot | Agent | Dépend de | État |
|---|---|---|---|
| [F1](lots/F1.md) Vérification du dépôt | `verificateur` | A11, E12.1, E12.2, E12.4, G5.1 | [ ] |
| [F2](lots/F2.md) Publication finale | conversation principale | F1 | [ ] |
| [F3](lots/F3.md) Recette Figma | mainteneur | F1, build disponible | [ ] |
