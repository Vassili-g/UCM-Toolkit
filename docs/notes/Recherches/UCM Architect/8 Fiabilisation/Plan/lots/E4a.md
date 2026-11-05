# E4a. Questions et cartes de structure

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3f, C6.

Fichiers : `packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`,
`packages/plugin-architect/galerie/etats/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E4.1 La question du sens décrit le rendu (Q-F2-3). « Garder le texte noir sur les boutons » ou « Passer au texte blanc ». Pour une
  palette partagée, un bouton et un encadré dessinés dans chaque couleur, jamais « sens normal » ni « sens inverse ».
- [x] E4.6 Carte groupée de QV-3, avec la liste des variables qui se déplie. Information de QV-4 en tête du mode Tokens, avec la conséquence sur l'intégrité non contrôlée.
- [x] E4.7 États de galerie de chaque écran changé.

- [x] E4.8 Textes des genres sans carte, venus de E3, E5, E6 et E7a (leurs « Avancement » donnent les faits). Posez chaque texte dans
  `src/ui/textes/structure.ts` ou `src/ui/textes/composant.ts`, branchez-le à la place du repli `sansPhrase`, et donnez-lui un état de galerie.
  Aucune nouvelle sorte de correction : un geste sans correction exacte reste une phrase d’action.

Fin : `npm run test:paquet -- architect` passe. Les régressions couvrent les cases de ce sous-lot. La galerie expose ses cartes et ses refus.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E4.1, palette d'un seul composant. Titre : `Texte sur les boutons ${palette}`. Choix : `Garder le texte ${actuel} sur les boutons` et `Passer au texte ${autre}`, où `actuel` et `autre` valent « noir » ou « blanc ».
- E4.1, palette partagée. Titre : `Texte sur ${palette}, que les boutons et les encadrés partagent`. Légendes des dessins : « Bouton » et « Encadré ». Choix : `Garder le texte ${actuel}` et `Passer au texte ${autre}`.
- E4.6, carte groupée (QV-3). Phrase : `${n} variables de \`${collection}\` visent \`${coucheVisee}\`, sur ${modes} modes.` au pluriel, `1 variable de … vise …, sur 1 mode.` au singulier. Le dépliage reprend `Voir les ${n} variables`. Le statut garde celui de la carte non groupée.
- E4.6, information (QV-4). Phrase : « Aucune collection n’est reconnue comme `theme`. L’intégrité UCM n’est pas contrôlée. » Statut : « Répondez à la question de collection dans la section Noms ».

### Textes de E4.8

Mode Tokens :

- `variable-inconnue` (E3.1). Phrase : `Le nom ${nom} ressemble au rôle ${role}.` Action : `Renommez-la en ${role} dans la fenêtre Variables si c’est ce rôle`.
- `rampe-autre-palette` (E3.4). Phrase : `Cette variable de ${palette} vise la rampe ${autre}.` Choix, un par candidat : `Viser ${cible}`.
- `branche-de-mode` (E3.3). Phrase : `En ${mode}, cette variable vise la branche ${autreMode} de sa palette.` Choix, un par candidat : `Viser ${cible}`. Sans candidat, action `choisirLaCible` existante.
- `sens-partage` et `solid/foreground` à contre-sens (E3.2) : les textes de E4.1.
- `theme-en-double` (E3.5). Phrase : `Deux collections se lisent comme theme : ${premiere} et ${seconde}.` Action : `Supprimez ou renommez la copie dans la fenêtre Variables`.
- `role-en-double` (E3.5). Phrase : `${n} variables portent le rôle ${role}.` Choix, un par variable : `Garder ${nom}`. Action : `Supprimez les autres dans la fenêtre Variables`.
- `cible-inaccessible` (E3.6). Phrase : `Les cibles rangées dans ${collection} ne sont pas lues, car aucune library n’est choisie.` Action : `Choisissez la library du fichier pour les contrôler`.
- `theme-non-reconnu` (E3.9) : le texte de QV-4 de E4.6.

Mode Composant :

- Layer masqué (E5.1), fait ajouté à la carte. `Le layer ${layer} est masqué.`, ou `Le layer ${layer} est dans ${ancetre}, qui est masqué.`
- Rôle du layer (E5.3). Correction : `Lier à ${token}`. Phrase quand le nom du layer annonce un autre rôle : `Le layer ${layer} porte le nom d’un ${role}.` Action : `Renommez le layer dans Figma s’il n’est pas un ${role}`.
- Homonymes (E5.4). Phrase : `Deux layers s’appellent ${nom} sous ${parent}. Architect ne sait pas lequel lier.` Action : `Renommez l’un des deux dans Figma`.
- Segments fusionnés (E5.7), ajouté à la phrase de la carte : `La correction règle aussi ${segments}.` (liste avec « et »).
- `taille-selon-le-mode` (E6.3). Phrase : `${token} vaut ${light} px en Light et ${dark} px en Dark.` Action : `Donnez-lui la même valeur dans les deux modes, dans la fenêtre Variables`.
- `deux-axes-de-style` (E7.3). Phrase : `Les axes ${premier} et ${second} décrivent tous deux le style.` Action : `Gardez un seul axe de style dans les propriétés du composant`.
- `style-et-dossier` (E7.3). Phrase : `Le style ${valeur} utilise les couleurs de ${dossierLu}.` Action : `Liez-le aux couleurs de ${dossierAttendu}`.
- C8 et C10 d’un variant (E7.4, `faits.cote = "variant"`). Phrase : `La valeur ${valeur} de ${axe} s’écrit ${attendue} dans UCM.` Correction : `Renommer en ${attendue}`.

## Avancement

Le reliquat porte sur `packages/kit/src/controles/propagation.ts`. Le lecteur et les tests voisins sont lus, avec les documents de `agents:lire`. Le constat des homonymes contient leur nombre, mais aucun nom de parent.

Le nouveau test échoue sans correction, car `faits.parent` vaut `undefined` au lieu de `contenu`. Le constat prend maintenant le nom du parent des layers du variant visé. Un parent absent du relevé ne produit aucun nom supposé. Le cas des homonymes du modèle vérifie aussi `racine`.

Les 20 tests de propagation passent. La carte et l'invariant du kit portent le fait `parent`. La carte d'Architect le lisait déjà, sans changement de texte ni d'écran.

Le test échoue après retrait de la correction, puis les 20 tests de propagation passent après sa remise. Le build du kit et le typecheck global rendent 0.

Les tests du kit donnent 1 660 succès et 23 échecs. Le test « 32 000 noms » passe seul (3 273,6 ms de détection). Les trois fichiers d'accessibilité sont relancés chacun seul. `accessibilite.test.ts` et `stressAccessibiliteOperateurs.test.ts` passent après les écritures de l'autre session. `stressAccessibiliteOperateursBis.test.ts` échoue encore. Aucun de ces fichiers n'est modifié par ce reliquat.

Architect donne 2 143 succès et les 7 échecs d'accessibilité déjà reproduits seuls en E8a. `agents:diff` a été lancé. Ses documents liés ont été relus. Le contrôle de style ne rend aucun refus. Les journaux locaux sont dans `_local/codex-r2-*`.

Le reliquat est commité dans `99a44d82`. Le parent des homonymes est disponible pour la carte d'Architect.

E4.1, E4.6, E4.7 et E4.8 sont faites dans `04b9f6c2`. Le parent des homonymes est ajouté dans le kit par le reliquat `99a44d82`.

Fait :

- E4.1. `src/ui/structure/lecture.ts` : la question de `solid/foreground` à contre-sens s'intitule `Texte sur les boutons ${palette}` et propose `Garder le texte ${actuel} sur les boutons` et `Passer au texte ${autre}` (l'actuel vient de `faits.avant`, `white` ou `black`). Le genre `sens-partage` s'intitule `Texte sur ${palette}, que les boutons et les encadrés partagent` ; chaque réponse dessine un bouton et un encadré légendés « Bouton » et « Encadré » (`aFaire.ts` `creerLeDessin`). Aucune réponse n'est cochée.
- E4.6. Les constats `couche` forment une carte par collection et par couche visée (`grouperLesCouches` du kit) : `${n} variables de collection visent couche, sur ${modes} modes.`, statut de la carte non groupée, « Voir les ${n} variables » qui déplie la liste. `theme-non-reconnu` quitte les cartes : `lireLInformationDuTheme` et une alerte d'information dans `tokens.haut` (`structure/index.ts`), avant la ligne verte.
- E4.8, mode Tokens : `variable-inconnue`, `rampe-autre-palette`, `branche-de-mode`, `theme-en-double`, `role-en-double` et `cible-inaccessible` ont leur phrase, leur action et leurs choix (`Viser …`, `Garder …`). Leurs catégories : Variables manquantes, Crans, Modes, Rangement, Valeurs, Alias. Textes dans `textes/structure.ts`.
- E4.8, mode Composant : textes dans `textes/composant.ts` (`carteDuComposant`), branchés dans `ignores/modele.ts` (layer masqué avant la phrase, rôle annoncé par le nom du layer, homonymes, `taille-selon-le-mode`, `deux-axes-de-style`, `style-et-dossier`, C8 et C10 d'un variant), `questions/modele.ts` et `corrections/modele.ts` (layer masqué et « La correction règle aussi … » sur la ligne grise des cartes de question et de correction).
- E4.7. Galerie : `t-sens-partage`, `t-couches-groupees`, `t-theme-non-reconnu`, `t-questions-de-structure` (`etats/structure.cjs`, constats dans `structure/questions.cjs`), `c-afaire-sans-phrase` et `q-fusionnee` (`etats/ignores.cjs`). `t-sens-inconnu` et `t-integrite-a-faire` montrent déjà les cartes changées du kit réel.

Décisions prises :

- Les réponses d'une question de structure sont des lignes sans case et sans bouton. Aucune sorte de correction n'existe pour elles (règle de la note), le designer les applique dans la fenêtre Variables.
- Quand le kit ne dit pas la couleur actuelle du texte (palette partagée, cran numérique), aucune réponse ne dit « Garder » : les deux disent « Passer au texte blanc » et « Passer au texte noir ».
- Le kit écrit le nom du parent des homonymes dans `faits.parent` quand il est lu. La phrase garde `sous ${parent}` si ce fait existe, sinon elle s'arrête à `Deux layers s’appellent ${nom}.`
- `Lier à ${token}` et `Renommer en ${attendue}` : les cartes existantes les disent déjà (`lier`, `lierA`, `renommer … en` du catalogue des corrections). Aucun texte nouveau.
- Les gestes sans écriture (renommer un layer, viser une cible) restent des phrases d'action ; aucune sorte de correction n'est ajoutée.
- Fichiers hors de la liste du lot, touchés parce que le repli `sansPhrase` et les cartes de question y vivent : `src/ui/ignores/modele.ts` (autour des modifications d'une autre session, qui restent intactes), `src/ui/questions/modele.ts`, `src/ui/corrections/modele.ts`, `src/ui/styles/structure.css` et `src/ui/roles.css` (dessins des réponses).

Tests : `tests/questionsEtCartesDeStructure.test.ts` (18 tests, un par case ou genre) ; `tests/structureLecture.test.ts`, `tests/tokensStructure.test.ts` et `tests/tokensCategories.test.ts` suivent la carte groupée des couches (5 cartes de Couches deviennent 4 dans `t-integrite-a-faire`).

Commandes : `npm run typecheck` rend 0. `npm run test:paquet -- architect` : 2071 tests, 10 échecs, tous dans les gabarits de projection (`projectionsDesControles`, `controle-typographie`, banc de mutations, `annuler pendant les couleurs C25`), venus des modifications en cours de `packages/kit/src/controles/oublis.ts` et de `src/sandbox/projectionsDesControles.ts` par une autre session. `npm run galerie:plugin -- architect` construit les états (129 états, 0 situation sans écran).

Documents : `CARTE.md` (galerie, structure, ignores, textes), `SPEC.md` (catégories du mode Tokens), `invariants/explorateur.md` (une règle sur les questions de structure) de `packages/plugin-architect`.

Reste : relecture dans la galerie par le mainteneur.
