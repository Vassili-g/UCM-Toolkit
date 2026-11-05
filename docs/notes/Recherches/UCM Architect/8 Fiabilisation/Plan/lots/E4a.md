# E4a. Questions et cartes de structure

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3f, C6.

Fichiers : `packages/plugin-architect/src/ui/structure/`, `packages/plugin-architect/src/ui/textes/`,
`packages/plugin-architect/galerie/etats/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.1 La question du sens décrit le rendu (Q-F2-3). « Garder le texte noir sur les boutons » ou « Passer au texte blanc ». Pour une
  palette partagée, un bouton et un encadré dessinés dans chaque couleur, jamais « sens normal » ni « sens inverse ».
- [ ] E4.6 Carte groupée de QV-3, avec la liste des variables qui se déplie. Information de QV-4 en tête du mode Tokens, avec la conséquence sur l'intégrité non contrôlée.
- [ ] E4.7 États de galerie de chaque écran changé.

- [ ] E4.8 Textes des genres sans carte, venus de E3, E5, E6 et E7a (leurs « Avancement » donnent les faits). Posez chaque texte dans
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

Pas commencé.
