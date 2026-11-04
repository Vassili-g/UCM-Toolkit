// Les réponses du mainteneur aux questions V2, et le tour 2 des questions qu'il n'a pas comprises.
// Une question tranchée garde la réponse du mainteneur, et la décision quand elle diffère de la proposition.
// Une question du tour 2 reçoit une explication, une mini-maquette en HTML, une question et une proposition nouvelles, et ses options.

const accord = 'D\'accord';
const ACCORDS = [
  'Q-F1', 'Q-F2', 'Q-F3', 'Q-F4', 'Q-F5', 'Q-F8', 'Q-F10',
  'Q-F2-2', 'Q-F2-5', 'Q-F3-2', 'Q-F3-8', 'Q-F3-10', 'Q-F3-11', 'Q-F3-13',
  'Q-F5-2', 'Q-F5-4', 'Q-F5-7', 'Q-F5-8', 'Q-F6-4', 'Q-F6-5', 'Q-F6-6', 'Q-F6-7',
  'Q-F7-1', 'Q-F7-2', 'Q-F7-3', 'Q-F7-4', 'Q-F7-5', 'Q-F7-6', 'Q-F7-8', 'Q-F7-10', 'Q-F7-11', 'Q-F7-12', 'Q-F7-13',
  ...Array.from({ length: 21 }, (_, i) => `Q-F89-${i + 1}`).filter((id) => id !== 'Q-F89-4'),
  'QV-1', 'QV-2', 'QV-3', 'QV-4',
];

export const REPONSES = {
  ...Object.fromEntries(ACCORDS.map((id) => [id, { reponse: accord }])),
  'Q-F6': {
    reponse: 'Je ne veux pas relire des fichiers JSON, je veux décider dans le plugin.',
    decision: 'La conversation principale classe le dictionnaire, et le mainteneur ne relit aucun fichier JSON. Un couple de mots que la conversation ne sait pas classer n\'entre pas dans le dictionnaire. Nomenclature le pose en question dans le plugin, et le designer décide.',
  },
  'Q-F7': {
    reponse: 'Je me débrouille pour ça, laisse tomber ce point.',
    decision: 'Retirée. Le mainteneur prépare lui-même le fichier de recette.',
  },
  'Q-F9': {
    reponse: 'Il faut détecter et proposer une correction pour ça.',
    decision: 'Les fautes à deux lettres sont détectées et proposées en question, sans case cochée, comme celles à une lettre. Pour ne pas accuser un nom juste, la détection vise seulement les mots assez longs, avec un seuil mesuré comme celui de Q-F4.',
  },
  'Q-F2-1': {
    reponse: 'Ok pour la première. Pour la seconde, quelle information est donnée ? Le plugin va-t-il être inondé de constats pour tous les termes qu\'il ne connaît pas ?',
    decision: 'Une question quand le dernier segment est proche d\'un rôle du même dossier. Une variable loin de tout rôle (`theme/custom/accent/glow`) ne produit rien, ni information ni terme à ajouter à la main.',
  },
  'Q-F2-4': {
    reponse: 'Je n\'ai pas compris le problème et la solution.',
    decision: 'Oui. Un rôle du thème en Light doit viser la rampe claire, et C60 signale un alias vers la rampe sombre. C60 trouve la branche de mode à ses deux places possibles, dans le chemin de la rampe (`primary/dark/300`, l\'écriture d\'UCM Palettes) et dans les modes de la collection cible (Light et Dark).',
  },
  'Q-F2-8': {
    reponse: 'Je n\'ai pas compris. Pourquoi ne résout-on pas les alias pour tout ?',
    decision: 'Un doublon d\'échelle, ce sont deux crans d\'une même échelle à la même valeur, comme `layout/radius/md` et `layout/radius/lg` à 8. Architect résout les alias avant de comparer, pour toutes les échelles (`sizing`, `radius`, `spacing` et les autres). Sans library choisie, une cible inaccessible donne une information.',
  },
  'Q-F3-1': {
    reponse: 'Il faut le détecter et le signaler comme le reste. Un layer masqué est exporté dans le contrat du composant, donc le contrat aurait des valeurs non tokenisées.',
    decision: 'Oui, contraire de la proposition. Un layer masqué entre dans le contrat, donc sa couleur ou sa taille en dur est signalée comme celle d\'un layer visible (C25 et C29). La carte dit que le layer est masqué.',
  },
  'Q-F3-4': {
    reponse: 'C\'est quoi Silicone et Lexicon ?',
    decision: 'Fusionnée avec Q-F6-3. `Silicone` et `Lexicon` contiennent les lettres « icon » sans désigner une icône, et la définition ne doit pas les prendre. La définition retenue est celle de Q-F6-3.',
  },
  'Q-F3-5': {
    reponse: 'D\'accord, du moment que ça respecte la configuration d\'UCM Palettes du design system.',
    decision: 'Oui. L\'alias écrit vise le cran que la configuration d\'UCM Palettes attend pour ce rôle et ce mode.',
  },
  'Q-F3-6': {
    reponse: 'Tous les éléments d\'un composant doivent être tokénisés depuis Components/NomDuComposant/…',
    decision: 'La proposition suit ce principe. La propagation recopie seulement les tokens du composant (`button/…` dans `components`). Une liaison directe à `theme` ou à `layout` n\'est pas recopiée et garde son constat d\'erreur.',
  },
  'Q-F3-14': {
    reponse: 'Pourquoi un padding serait-il différent en Dark et en Light ? C\'est plutôt une erreur à signaler et corriger.',
    decision: 'Un token de taille garde la même valeur en Light et en Dark. Une valeur qui change entre ces modes est une erreur signalée en À faire. La carte demande quelle valeur garder, sans case cochée, puisque deux réponses sont possibles.',
  },
  'Q-F3-15': {
    reponse: 'Oui. Dans l\'architecture cible, les icônes sont des composants à part entière, donc un composant n\'a plus besoin de variables d\'icône.',
    decision: 'Oui, en défaut. L\'icône est un composant `Icon` avec sa propre collection, et un composant ne déclare plus de token d\'icône. Les 3 fixtures qui emploient ce motif se mettent à jour. La couleur de l\'icône se décide en Q-F6-1.',
  },
  'Q-F3-16': {
    reponse: 'Pas compris, mais il faut corriger ce genre de cas.',
    decision: 'Quand deux constats visent la même liaison, seul celui qui propose le bon token reste. Un fond d\'Alert lié à `theme/danger/surface/default` reçoit aujourd\'hui deux cartes, « Liez à un token du composant » et « Liaison directe au thème ». Il ne garde que « Lier à `alert/color/danger/background` ».',
  },
  'Q-F3-17': {
    reponse: 'Pas compris.',
    decision: 'Mécanique interne, sans effet visible sauf une carte en moins. Un même fond en dur était signalé deux fois, par le contrôle des liaisons et par celui du moteur de Palettes. Une seule carte reste par layer et par champ.',
  },
  'Q-F5-6': {
    reponse: 'Les variantes d\'un bouton s\'écrivent en toutes lettres, pour que le designer comprenne l\'usage. Les tokens peuvent s\'écrire en abréviations, comme Tailwind.',
    decision: 'Inverse de la proposition. Une valeur de variant s\'écrit en toutes lettres (`Small`, `Medium`, `Large`, `Extra Large`), et le token en abréviation (`sm`, `md`, `lg`, `xl`). `S`, `M`, `L`, `sm` ou `Middle` dans un variant reçoivent une correction vers le mot entier, sans case cochée.',
  },
  'Q-F5-9': {
    reponse: 'D\'accord. On harmonise tous les noms vers la référence anglaise.',
    decision: 'Oui. Un nom d\'axe français est reconnu avec le rôle de son équivalent anglais, et Architect propose de le renommer en anglais.',
  },
  'Q-F6-2': {
    reponse: 'Button ne peut pas avoir un axe Size avec « sm » et « lg », c\'est « Small » et « Large ».',
    decision: 'Oui, avec l\'exemple corrigé. Button a un axe `Size` avec `Small` et `Large` (Q-F5-6), et C64 compare les styles de texte à l\'intérieur de chaque taille.',
  },
  'Q-F6-3': {
    reponse: 'D\'accord. Les composants auront des composants Icon dédiés.',
    decision: 'Oui. L\'instance d\'un composant `Icon` dédié est le cas principal de la définition.',
  },
  'Q-F7-14': {
    reponse: 'D\'accord, mais interdiction d\'utiliser « peinture », incompréhensible. Pareil pour « mélange », il faut le vrai terme « mode de fusion ».',
    decision: 'Oui. Les textes destinés au designer n\'emploient ni « peinture » ni « mélange ». Ils disent « mode de fusion », « remplissage » ou « contour », les termes de Figma.',
  },
  'Q-F89-4': {
    reponse: 'D\'accord. Ne pourrait-on pas rendre la library UCM Tokens lisible depuis le fichier des composants ? Ça simplifierait la tâche du designer.',
    decision: 'Oui. Figma laisse un plugin lire les variables d\'une library seulement si elle est activée dans le fichier, et Architect ne peut pas l\'activer. La bannière dit donc d\'activer `UCM Tokens` dans les libraries du fichier (Assets, Libraries), puis d\'actualiser.',
  },
  'QV-5': {
    reponse: 'D\'accord. On verra.',
    decision: 'Reportée au prochain passage dans Figma.',
  },
  // Tour 2 : la décision est la proposition réécrite, sauf mention.
  ...Object.fromEntries(['Q-F2-6', 'Q-F3-3', 'Q-F3-7', 'Q-F3-9', 'Q-F3-12', 'Q-F5-1', 'Q-F5-5', 'Q-F5-10', 'Q-F6-1', 'Q-F7-7', 'Q-F7-9'].map((id) => [id, { reponse: accord }])),
  'Q-F2-3': {
    reponse: 'D\'accord, mais « sens normal » ou « sens inverse » doit être expliqué de façon concrète. Texte noir ou texte blanc sur les boutons ?',
    decision: 'Une question à deux réponses, sans case cochée, qui décrit le rendu et jamais le sens. Pour le texte du bouton, « Garder le texte noir sur les boutons » ou « Passer au texte blanc ». Pour une palette partagée, « Boutons foncés à texte blanc, encadrés clairs à texte foncé » ou « Boutons clairs à texte foncé, encadrés foncés à texte clair », avec un bouton et un encadré dessinés dans chaque couleur. Architect vérifie ensuite chaque rôle contre la table choisie et ne corrige jamais seul.',
  },
};

// La réponse du premier tour aux questions reprises au tour 2.
export const PREMIERES_REPONSES = {
  'Q-F2-3': 'Je n\'ai pas compris le problème.',
  'Q-F2-6': 'D\'accord, mais pourquoi juste « À faire » ? On ne peut pas proposer de fusionner, ou c\'est trop risqué ?',
  'Q-F3-3': 'Un calque avec une couleur « divider » devrait être nommé de la même façon, pareil pour les autres termes et vice versa, donc il faut le signaler.',
  'Q-F3-7': 'Pas compris.',
  'Q-F3-9': 'Pas compris pourquoi un texte d\'Alert devrait suivre le texte de la page.',
  'Q-F3-12': 'On n\'utilise pas la nomenclature « bg-hover » dans le kit, donc je ne comprends pas la question.',
  'Q-F5-1': 'Pas compris.',
  'Q-F5-3': 'Tour 2, je n\'ai toujours pas compris, fais plus clair et avec des couleurs. Tour 3, le « subtle » reste un solid, donc c\'est aussi `button/color/primary/solid/background` et `button/color/primary/outline/background`, pourquoi se prendre la tête ?',
  'Q-F5-5': 'Pas bien compris.',
  'Q-F5-10': 'Pas compris.',
  'Q-F6-1': 'Icon va devenir son propre composant avec ses propres propriétés.',
  'Q-F7-7': 'Je n\'ai pas compris le problème et la solution.',
  'Q-F7-9': 'Pas compris. Il faut que le layer soit nommé « Focus Ring » pour être considéré comme un ring ?',
};

// Briques des mini-maquettes, mises en forme par `.mini` dans le gabarit.
const ok = '<span class="ok">✓</span>';
const ko = '<span class="ko">✗</span>';
const pastille = (couleur) => `<span class="pastille" style="background:${couleur}"></span>`;
const colonne = (titre, corps) => `<div class="col"><div class="titre">${titre}</div>${corps}</div>`;
const mini = (...colonnes) => `<div class="mini">${colonnes.join('').replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`;
const ligne = (niveau, texte) => `<div class="n${niveau}">${texte}</div>`;

export const TOUR_2 = {
  'Q-F2-3': {
    question: 'Quand Architect ne sait pas dans quel sens va une palette, ou quand le texte d\'un bouton plein va à contre-sens, que fait-il ?',
    explication: 'Dans `theme`, chaque rôle d\'une palette vise un cran de sa rampe. En sens normal, le fond teinté vise un cran clair et le texte un cran foncé. En sens inverse, c\'est le contraire. Architect devine le sens d\'une palette par la majorité de ses rôles, puis vérifie chaque rôle contre la table de ce sens.\nDeux cas l\'empêchent de trancher. Dans le premier, la moitié des rôles suit le sens normal et l\'autre moitié le sens inverse. Dans le second, `solid/foreground`, le texte posé sur un bouton plein, vise du noir alors que la table attend du blanc. Un bouton jaune à texte noir est un choix légitime du designer.',
    maquette: mini(
      colonne('Bouton plein de la palette `warning`',
        `<span class="bouton-demo" style="background:#f2c230;color:#111">Valider</span> texte noir, choix du designer<br><br><span class="bouton-demo" style="background:#f2c230;color:#fff">Valider</span> texte blanc, cran de la table`),
      colonne('Palette `secondary`, sens partagé',
        `${ligne(0, `surface/default → cran 100 ${pastille('#e8eefc')} sens normal`)}${ligne(0, `surface/foreground → cran 900 ${pastille('#1b2a55')} sens normal`)}${ligne(0, `solid/default → cran 200 ${pastille('#c9d6f7')} sens inverse`)}${ligne(0, `solid/foreground → cran 800 ${pastille('#22356b')} sens inverse`)}`),
    ),
    proposition: 'Une question à deux réponses, sans case cochée. Pour le sens partagé, « Sens normal » ou « Sens inverse », et Architect vérifie ensuite chaque rôle contre la table choisie. Pour le texte du bouton, « Garder le noir » ou « Passer au blanc ». Architect ne corrige jamais seul.',
  },
  'Q-F2-6': {
    question: 'Deux variables jouent le même rôle dans une palette. Architect propose-t-il de les fusionner ?',
    explication: 'La palette `primary` contient `theme/primary/surface/background` et `theme/primary/surface/bg`. Architect lit les deux comme le même rôle, le fond teinté.\nFusionner demande deux écritures dans Figma. Il faut relier à la variable gardée chaque token et chaque layer qui visent l\'autre, puis retirer l\'autre. Le risque vient des autres fichiers. Si `theme` est publiée en library, un fichier de composants qui emploie `bg` perd sa liaison à la mise à jour de la library, et Architect ne voit pas ces fichiers.',
    maquette: mini(
      colonne('Avant', `${ligne(0, 'theme/primary/surface/background')}${ligne(0, 'theme/primary/surface/bg')}${ligne(1, '← `alert/color/primary/background`')}${ligne(1, '← layer `Root` de Card')}`),
      colonne('Après, option C', `${ligne(0, 'theme/primary/surface/background')}${ligne(1, '← `alert/color/primary/background`')}${ligne(1, '← layer `Root` de Card')}${ligne(0, 'theme/primary/surface/bg = alias de `background`, marquée à retirer')}`),
    ),
    options: [
      'A. Un constat À faire, sans action. Le designer fusionne à la main.',
      'B. Une question « Garder `background` » ou « Garder `bg` ». Architect relie dans ce fichier puis supprime l\'autre variable. Un fichier qui emploie la library perd la variable supprimée.',
      'C. Comme B, mais l\'autre variable devient un alias de la variable gardée au lieu d\'être supprimée. Les autres fichiers gardent leur liaison et la même couleur. Un second constat propose de la retirer quand plus rien ne l\'emploie.',
    ],
    proposition: 'Option C, sans case cochée.',
  },
  'Q-F3-3': {
    question: 'Pour quels rôles le nom du layer et le rôle de son token doivent-ils se correspondre ?',
    explication: 'Un token de couleur d\'un composant finit par un rôle, comme `background`, `foreground`, `text`, `icon`, `border`, `divider` ou `ring`. Certains rôles désignent un layer précis. Un `divider` est un trait de séparation, donc un layer à lui. D\'autres rôles colorent n\'importe quel layer. Un `background` peut colorer `Root`, `Container` ou `Badge`, donc le nom du layer ne dit rien de son rôle.\nTa réponse demande que le nom suive le rôle dans les deux sens. Le contrôler pour `background` ou `text` accuserait presque chaque layer.',
    maquette: mini(
      colonne('Alert', `${ligne(0, 'Root')}${ligne(1, `Divider → \`alert/color/divider\` ${ok}`)}${ligne(1, `Divider → \`alert/color/border\` ${ko} proposer \`alert/color/divider\``)}${ligne(1, `Line → \`alert/color/divider\` ${ko} proposer de renommer en \`Divider\``)}${ligne(1, `Container → \`alert/color/background\` ${ok} nom libre`)}`),
    ),
    proposition: 'Pour les rôles qui désignent un layer, `divider` (nom `Divider` ou `Separator`), `ring` (nom `Ring` ou `Focus ring`) et `icon` (une instance du composant Icon). Un layer qui porte ce nom et un autre rôle reçoit un constat, et un token de ce rôle posé sur un layer d\'un autre nom aussi. La correction propose le token ou le nom, s\'il est unique, sans case cochée. `background`, `foreground`, `text` et `border` ne regardent pas le nom.',
  },
  'Q-F3-7': {
    question: 'Un layer qui n\'existe que dans un seul variant donne-t-il un constat de propagation ?',
    explication: 'Quand le designer lie un layer à un token dans un variant, Architect propose de lier le même layer dans les autres variants. C\'est la propagation. Il retrouve « le même layer » par son nom et sa place dans l\'arbre.\nDeux cas l\'empêchent. Un layer `Badge` n\'existe que dans `Size=Large`, donc il n\'a pas d\'équivalent ailleurs et il n\'y a rien à propager. Dans un autre variant, deux layers s\'appellent `Label` sous le même parent, et Architect ne sait pas lequel correspond au `Label` des autres variants.',
    maquette: mini(
      colonne('Size=Small', `${ligne(0, 'Root')}${ligne(1, 'Label → `button/color/primary/foreground`')}`),
      colonne('Size=Large', `${ligne(0, 'Root')}${ligne(1, 'Label ← proposé')}${ligne(1, `Badge ${ok} rien à propager`)}`),
      colonne('Size=Medium', `${ligne(0, 'Root')}${ligne(1, 'Label ?')}${ligne(1, 'Label ?')}${ligne(0, `${ko} question, lequel suit l\'autre ?`)}`),
    ),
    proposition: 'Le `Badge` seul ne donne aucun constat. Les deux `Label` donnent une question, qui demande de renommer l\'un des deux.',
  },
  'Q-F3-9': {
    question: 'Un texte posé sur le fond de la page est lié, par un token du composant, au texte prévu pour un fond teinté. Architect le signale-t-il ?',
    explication: 'Le thème a deux couleurs de texte par palette. `surface/foreground` sert au texte posé sur un fond teinté, comme l\'encadré coloré d\'une Alert. `page/foreground` sert au texte posé directement sur le fond de la page. Le contraste de `surface/foreground` n\'est garanti que sur le fond teinté. C59 signale ce texte quand aucun fond teinté n\'est dessous.\nAujourd\'hui, C59 ne voit que la liaison directe à `theme`, que C80 signale déjà. Un composant conforme lie son texte à son propre token, `link/color/primary/foreground`, alias de `theme/primary/surface/foreground`. C59 ne voit pas cette liaison.',
    maquette: mini(
      colonne('Alert, fond teinté dessous', `<div class="carte-demo" style="background:#fde8e8;color:#7a1414">Le paiement a échoué.</div>${ok} texte → \`alert/color/danger/foreground\` → \`surface/foreground\``),
      colonne('Link, sur le fond de la page', `<div class="carte-demo" style="background:#fff;color:#b33">En savoir plus</div>${ko} texte → \`link/color/primary/foreground\` → \`surface/foreground\`<br>attendu → \`page/foreground\``),
    ),
    proposition: 'C59 suit l\'alias du token du composant jusqu\'au thème. Sa correction propose le token du composant qui vise `page/foreground`, s\'il est unique, sinon une question. Une liaison directe à `theme` garde le seul constat de C80.',
  },
  'Q-F3-12': {
    question: 'Une liaison qui se trompe à la fois de palette et d\'état donne-t-elle une ou deux cartes ?',
    explication: 'Un token de couleur d\'un composant se lit segment par segment, `alert/color/<palette>/<état>/<rôle>`. Dans le variant `Intent=Danger, State=Hover` d\'Alert, le fond est lié à `alert/color/primary/background`. La palette est fausse (`primary` au lieu de `danger`), et l\'état manque (`hover`).',
    maquette: mini(
      colonne('Variant `Intent=Danger, State=Hover`', `${ligne(0, `Root → \`alert/color/primary/background\` ${ko}`)}`),
      colonne('Carte proposée', '<div class="carte-demo">Lier le fond à `alert/color/danger/hover/background`<br><span class="second">palette et état corrigés ensemble</span></div>'),
    ),
    proposition: 'Une seule carte, avec un seul token d\'arrivée qui corrige les deux segments, s\'il existe et s\'il est le seul candidat. Sinon une question.',
  },
  'Q-F5-1': {
    question: 'Quel segment des tokens pilotent les axes nommés `Type`, `Kind`, `Shape`, `Density` ou `Spacing` ?',
    explication: 'Le nom d\'un axe dit à Architect quel segment des tokens il pilote. `Size` pilote la taille (`sm`, `md`), `State` l\'état (`hover`), `Variant` le style (`solid`, `outline`). Architect vérifie ensuite que chaque valeur de l\'axe a ses tokens. Certains noms d\'axe ne disent pas clairement ce qu\'ils pilotent. Un interrupteur oui ou non, comme `Destructive` ou `Loading`, n\'a pas de valeur à retrouver dans un token.',
    maquette: mini(
      colonne('Axe de Button', `${ligne(0, '`Type=Solid, Outline`')}${ligne(0, '`Kind=Primary, Secondary`')}${ligne(0, '`Shape=Rounded, Pill`')}${ligne(0, '`Density=Compact, Comfortable`')}${ligne(0, '`Destructive=true, false`')}`),
      colonne('Segment proposé', `${ligne(0, 'style')}${ligne(0, 'style')}${ligne(0, 'style')}${ligne(0, 'taille')}${ligne(0, 'aucun, Architect ne cherche pas de token')}`),
    ),
    proposition: '`Type`, `Kind` et `Shape` pilotent le style. `Density` et `Spacing` pilotent la taille. Un interrupteur oui ou non (`Destructive`, `Danger`, `High contrast`, `Loading`, `Selected`) ne pilote aucun segment.',
  },
  'Q-F5-3': {
    tour: 5,
    question: 'Un Button a deux axes de style, `Variant=Solid, Outline` et `Appearance=Default, Subtle`. Que dit Architect ?',
    explication: 'Un bouton léger prend les tokens de `surface` du thème, pas ceux de `solid`. `Subtle` n\'est donc pas une nuance du bouton plein. C\'est un style à part, comme `Solid` et `Outline`, avec ses propres rôles du thème.\nChaque style a ses tokens de composant, qui visent sa famille de rôles du thème : `solid` vise `solid/*`, `subtle` vise `surface/*`. Un seul axe suffit donc à porter le style, `Variant=Solid, Subtle, Outline`. Avec deux axes, le designer peut dessiner `Outline, Subtle`, une combinaison qui ne correspond à aucune famille de rôles.',
    maquette: mini(
      colonne('Les quatre variants de Button', `<div class="grille-demo">
        <span class="second">Variant ↓ · Appearance →</span><span class="second">Default</span><span class="second">Subtle</span>
        <span class="second">Solid</span><span class="bouton-demo" style="background:#2f5bd3;color:#fff">Valider</span><span class="bouton-demo" style="background:#c9d6f7;color:#1b2a55">Valider</span>
        <span class="second">Outline</span><span class="bouton-demo" style="background:transparent;color:#6f93f0;border:1.5px solid #6f93f0">Valider</span><span class="bouton-demo" style="background:transparent;color:#9fb5ee;border:1.5px dashed #9fb5ee">Valider</span>
      </div>`),
      colonne('Un seul axe, `Variant=Solid, Subtle, Outline`', `<span class="bouton-demo" style="background:#2f5bd3;color:#fff">Valider</span> <span class="bouton-demo" style="background:#c9d6f7;color:#1b2a55">Valider</span> <span class="bouton-demo" style="background:transparent;color:#6f93f0;border:1.5px solid #6f93f0">Valider</span><br><br>${ligne(0, `<span class="jeton-bleu">Solid</span> button/color/primary/solid/background → \`solid/default\` ${ok}`)}${ligne(0, `<span class="jeton-bleu">Subtle</span> button/color/primary/subtle/background → \`surface/default\` ${ok}`)}${ligne(0, `<span class="jeton-bleu">Outline</span> button/color/primary/outline/border → \`page/border\` ${ok}`)}${ligne(0, `<span class="jeton-bleu">Outline, Subtle</span> ${ko} aucune famille de rôles`)}`),
    ),
    proposition: 'Un constat À faire dit que deux axes portent le style et demande de les réunir en un seul axe (`Variant=Solid, Subtle, Outline`). Architect ne fait pas la fusion, puisque le designer choisit quelles combinaisons gardent un style. Les tokens du style `subtle` visent les rôles `surface/*` du thème, et ceux du style `solid` les rôles `solid/*`.',
  },
  'Q-F5-5': {
    question: 'Une valeur de variant s\'écrit-elle avec une majuscule initiale (`Danger`, `Small`) ?',
    explication: 'Aujourd\'hui, C9 signale une casse inattendue et C8 un synonyme à renommer. C9 signale `Intent=Danger` parce que le token s\'écrit `danger`. Avec Q-F5-6, le variant s\'écrit en toutes lettres et le token en abréviation. Il reste à fixer la casse du variant.',
    maquette: mini(
      colonne('Variant', `${ligne(0, '`Intent=Danger`')}${ligne(0, '`Size=Extra Large`')}${ligne(0, '`Intent=Error`')}`),
      colonne('Token', `${ligne(0, `\`danger\` ${ok}`)}${ligne(0, `\`xl\` ${ok}`)}${ligne(0, `${ko} renommer le variant en \`Danger\``)}`),
    ),
    proposition: 'Le variant s\'écrit avec une majuscule initiale à chaque mot (`Danger`, `Small`, `Extra Large`), et le token en minuscules. Architect passe de l\'un à l\'autre sans constat de casse. `Error` reçoit un C8 « Renommer en `Danger` », la référence anglaise (Q-F5-9). C9 reste pour une valeur inconnue.',
  },
  'Q-F5-10': {
    question: 'Une valeur de variant avec un point ou une barre (`1.5`, `16/9`) s\'écrit comment dans un token ?',
    explication: 'Un segment de token ne peut contenir ni point ni barre, car Figma lit la barre comme un dossier. Un axe `Ratio=16/9` ou `Scale=1.5` n\'a donc pas de segment identique dans les tokens, et Architect dit aujourd\'hui que le token manque.',
    maquette: mini(
      colonne('Variant', `${ligne(0, '`Ratio=16/9`')}${ligne(0, '`Scale=1.5`')}`),
      colonne('Segment du token', `${ligne(0, '`image/size/16-9/width`')}${ligne(0, '`avatar/size/1-5/width`')}`),
    ),
    proposition: 'Le segment du token remplace le point et la barre par un tiret (`16-9`, `1-5`). Architect compare le variant au segment ainsi écrit, et ne dit plus qu\'un token manque.',
  },
  'Q-F6-1': {
    question: 'Comment l\'icône d\'un composant prend-elle sa couleur et sa taille ?',
    explication: 'Dans l\'architecture cible, l\'icône est un composant `Icon`, avec sa collection et ses propriétés. Button pose une instance d\'`Icon` et ne déclare plus de token d\'icône. Il reste à fixer comment l\'icône prend la couleur du bouton, blanche sur un bouton plein `primary` et rouge sur un bouton `danger` en contour.',
    maquette: mini(
      colonne('Button `Variant=Solid, Size=Small`', `${ligne(0, 'Root → `button/color/primary/solid/background`')}${ligne(1, 'Icon (instance de `Icon`, `Size=Small`)')}${ligne(1, 'Label → `button/color/primary/solid/foreground`')}`),
      colonne('Rendu', '<span class="bouton-demo" style="background:#2f5bd3;color:#fff">＋ Ajouter</span>'),
    ),
    options: [
      'A. Le remplissage de l\'instance `Icon` est lié au même token que le libellé, `button/color/primary/solid/foreground`. Architect contrôle cette liaison comme celle d\'un texte. La taille vient de la propriété `Size` de l\'instance.',
      'B. L\'instance `Icon` a une propriété de couleur (`Color=Inherit, Primary, Danger`), et Button la règle. Architect vérifie la valeur de la propriété.',
      'C. La collection d\'`Icon` a des modes de couleur, et Button règle le mode de l\'instance.',
    ],
    proposition: 'Option A. C66 contrôle alors que l\'icône est une instance d\'`Icon`, que son remplissage suit le token de premier plan du composant, et que sa propriété `Size` suit la taille du variant.',
  },
  'Q-F7-7': {
    question: 'Le designer règle Architect sur AAA (7:1). Une garantie AA (4,5:1) du thème permet-elle de proposer une correction ?',
    explication: 'UCM Palettes garantit un contraste pour chaque couple de rôles du thème, par exemple 4,5:1 pour `surface/foreground` sur `surface/default`. Quand un texte échoue au contrôle de contraste, Architect regarde si une garantie couvre ce couple. Si oui, l\'échec vient d\'une mauvaise liaison, et Architect propose de lier le texte au bon rôle. Si non, il demande de vérifier à la main.',
    maquette: mini(
      colonne('Texte de l\'Alert', '<div class="carte-demo" style="background:#fde8e8;color:#a33">Le paiement a échoué.</div>contraste mesuré 5,2:1'),
      colonne('Contrôle', `${ligne(0, `AA demandé, 4,5:1 ${ok}`)}${ligne(0, `AAA demandé, 7:1 ${ko}`)}${ligne(0, 'garantie du thème, 4,5:1 seulement')}`),
    ),
    proposition: 'Non. Une garantie de 4,5:1 ne promet rien à 7:1. La carte dit « À vérifier », sans correction.',
  },
  'Q-F7-9': {
    question: 'Comment Architect reconnaît-il un anneau de focus ?',
    explication: 'Architect contrôle le contraste de l\'anneau de focus, au moins 3:1 sur le fond. Aujourd\'hui, il le reconnaît à son nom seul, `Ring`, `Focus ring` ou `focus-ring`. Un layer `Outline` lié à `input/color/ring` n\'est donc pas contrôlé.',
    maquette: mini(
      colonne('Input `State=Focus`', `${ligne(0, `Focus ring → \`input/color/ring\` ${ok} contrôlé`)}${ligne(0, `Outline → \`input/color/ring\` ${ko} pas contrôlé aujourd\'hui`)}${ligne(0, `Ring → \`input/color/border\` ${ko} nom et rôle différents`)}`),
    ),
    proposition: 'Un anneau est un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. Les deux cas sont contrôlés. Un layer qui n\'a que l\'un des deux reçoit le constat de Q-F3-3.',
  },
};
