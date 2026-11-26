/**
 * Le registre des briques de la chaîne UCM, déclaré seulement : une entrée par carte, les zones, les légendes, les jauges et les puces
 * du kit. L'état d'une carte, son activité dans « Aujourd'hui », ses dépendances, les paquets qu'elle affiche, les traits de la lecture
 * « Les paquets », les versions et les nombres des textes se calculent dans `calculs.ts`, qui contrôle le registre et le convertit vers
 * la forme que lit `rendu.js`, qui le dessine ; ce fichier ne calcule rien.
 */
import { CIBLES_DES_COLLECTIONS } from '@ucm-kit/core/referentiel';
import type { DonneeDeProduit, Produit } from '@ucm-kit/core/referentiel';

export interface Zone {
  id: string;
  titre: string;
  qui: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kit?: boolean;
}

export interface Legende {
  x: number;
  y: number;
  /** Du HTML : `<br>` coupe la ligne. */
  texte: string;
}

/** L'état d'une carte ou d'une pièce, que `calculs.ts` calcule : le registre ne le déclare pas. */
export type Etat = 'livre' | 'partie' | 'venir';

/**
 * Ce qu'un trait transporte : une donnée de `PRODUITS`, ou l'une des deux relations qui ne sont pas une donnée lue. `aide` est celle du
 * Linter au code du composant, `hebergement` celle d'une page qu'un module héberge (Santé par Storybook) et d'un appel dans le même
 * processus (l'adaptateur par le Contrôle UCM).
 */
export type DonneeDeTrait = DonneeDeProduit | 'aide' | 'hebergement';

/** Un trait transporte une donnée, ou plusieurs quand une pull request en porte plusieurs (l'Exporter envoie les contrats et `tokens.json`). */
export type DonneesDeTrait = DonneeDeTrait | readonly DonneeDeTrait[];

export type GenreDeBrique = 'outil' | 'module' | 'paquet' | 'fichier' | 'geste' | 'note';

/** Un mode d'un outil : sa phrase et ses faits remplacent ceux de la carte tant qu'il est choisi. */
export interface Mode {
  libelle: string;
  /** La carte que ce mode alimente. */
  vers: string;
  phrase: string;
  fait: readonly string[];
}

export interface Couche {
  libelle: string;
  detail: string;
  /** Les collections du référentiel que cette couche regroupe. */
  collections: readonly string[];
}

/** Ce que le code montre d'une pièce livrée : une commande de la CLI, un nom que le kit exporte, une donnée qu'un produit écrit, un fichier qu'`ucm init` écrit. */
export type Preuve =
  | { commande: string }
  | { export: { porte: string; nom: string } }
  | { produit: Produit['id']; ecrit: DonneeDeProduit }
  | { fichierDuConsommateur: string };

/**
 * Un morceau d'une carte. Il porte une `preuve` trouvée dans le code, et il est livré, ou la `piste` qui le livre, et il est à venir.
 * `chemin` marque la pièce qui décrit le chemin d'aujourd'hui et non une partie du module : elle ne compte pas dans l'état de la carte.
 */
export interface Piece {
  texte: string;
  preuve?: Preuve;
  piste?: string;
  chemin?: true;
}

/** Un nombre que le texte d'une carte écrit à la main : `source` est un fichier du dépôt qui doit l'écrire aussi. */
export interface NombreEcrit {
  nombre: string;
  source: string;
}

/**
 * Un trait qui arrive sur la carte. `rang` est l'ordre de tracé : le rendu route les traits dans cet ordre, donc il change le dessin.
 * `requis` dit que la carte ne fonctionne pas sans la source.
 */
export interface TraitDessine {
  de: string;
  rang: number;
  port?: 'haut' | 'bas' | 'dessus' | 'retour';
  /** La donnée que le trait transporte : `calculs.ts` en tire la teinte et contrôle que la source l'écrit et que la cible la lit. */
  donnee: DonneesDeTrait;
  secondaire?: true;
  requis?: true;
}

/** Une source dont la carte dépend sans que la maquette en dessine le trait, comme le contrat que lit l'adaptateur. */
export interface ExigenceSansTrait {
  de: string;
  donnee: DonneesDeTrait;
  requis: true;
  sansTrait: true;
}

export type Reception = TraitDessine | ExigenceSansTrait;

/**
 * Une carte, un fichier du repository, un geste ou une note de la chaîne. Un outil, un module, un paquet ou la note nomme un `produit`
 * de `PRODUITS` ou une `piste` de `pistes.json`. Un fichier et un geste n'en nomment aucun.
 */
export interface Brique {
  id: string;
  genre: GenreDeBrique;
  zone: string;
  x: number;
  y: number;
  produit?: Produit['id'];
  piste?: string;
  logo?: string;
  picto?: string;
  nom: string;
  type?: string;
  /** Le nom court d'un paquet, tel que les autres cartes l'affichent et le citent dans `paquets`. */
  marque?: string;
  /** Pour un module ou un geste : les marques des paquets qu'il emploie. */
  paquets?: readonly string[];
  /** Pour une carte sans `package.json` (outil défini dans le kit, paquet à venir) : les portes du kit qu'elle reçoit. */
  portes?: readonly string[];
  /** Un paquet qui prend la largeur de deux cartes. */
  large?: true;
  phrase?: string;
  fait?: readonly string[];
  /** Le texte d'un fichier ou de la note, qui n'ont ni phrase ni faits. */
  texte?: string;
  sans?: string;
  modes?: Readonly<Record<string, Mode>>;
  couches?: readonly Couche[];
  alternative?: { nom: string; type: string; couches: readonly Pick<Couche, 'libelle' | 'detail'>[]; phrase: string };
  pieces?: readonly Piece[];
  /**
   * La donnée qu'une carte de fichier ou de dessin est : elle la lit et l'écrit. Une carte d'un produit la déclare pour remplacer
   * ce que `PRODUITS` en dit (l'architecture des tokens est définie dans le kit, mais elle est la donnée `variables`).
   */
  donnee?: DonneeDeTrait;
  /** Pour une carte sans produit (module, geste, note) : ce qu'elle lit. Une carte de produit tient ses `lit` de `PRODUITS`. */
  lit?: readonly DonneeDeTrait[];
  /** Pour une carte sans produit : ce qu'elle écrit. Une carte de produit tient ses `ecrit` de `PRODUITS`. */
  ecrit?: readonly DonneeDeTrait[];
  /** La porte de la CI : elle range dans le repository ce qu'elle lit (contrats, tokens.json, code), donc elle l'écrit aussi. */
  rangeCeQuIlLit?: true;
  recoit?: readonly Reception[];
}

/** Une jauge : son nom et les cartes qui la tiennent. */
export interface Jauge {
  nom: string;
  par: readonly string[];
}

/** Une puce de la carte du kit : son identifiant, son libellé et les portes du kit qu'elle regroupe. */
export interface PuceDuKit {
  id: string;
  libelle: string;
  portes: readonly string[];
}

export const ZONES: readonly Zone[] = [
  { id: 'figma', titre: 'Figma', qui: 'le designer', x: 0, y: 0, w: 652, h: 640 },
  { id: 'ci', titre: 'CI', qui: 'la porte', x: 664, y: 0, w: 230, h: 440 },
  { id: 'repository', titre: 'Repository GitHub', qui: '', x: 906, y: 0, w: 200, h: 440 },
  { id: 'rendu-et-suivi', titre: 'Rendu et suivi', qui: 'l\'équipe', x: 1118, y: 0, w: 258, h: 440 },
  { id: 'developpeur', titre: 'Développeur', qui: 'dans son éditeur', x: 664, y: 452, w: 712, h: 188 },
  { id: 'toolkit', titre: 'UCM Toolkit', qui: '{{paquets-livres}} paquets, et {{paquets-a-venir}} à venir. Une règle changée dans un paquet change dans tous les outils.', x: 0, y: 652, w: 1376, h: 200, kit: true },
];
export const LEGENDES: readonly Legende[] = [{ x: 678, y: 32, texte: 'Chaque pull request passe ici.' }, { x: 920, y: 32, texte: 'Les fichiers fusionnés.' }];

export const BRIQUES: readonly Brique[] = [
  { id: 'palettes', genre: 'outil', zone: 'figma', produit: 'palettes', x: 18, y: 60, logo: 'ucm-palettes', nom: 'UCM Palettes', type: 'Plugin Figma',
    phrase: 'Crée chaque palette en Light et Dark, nuance par nuance selon son usage dans les composants.',
    fait: ['Chaque nuance sert un usage du thème, fond de bouton, texte, fond teinté, bordure.', 'Les {{garanties}} garanties de contraste tiennent WCAG AA, {{rapport-texte}} pour un texte, {{rapport-graphique}} pour un fond de bouton, une bordure ou un anneau de focus.', 'Light et Dark calculés ensemble depuis une couleur de référence.'],
    sans: 'Nuances choisies à l\'œil, deux fois, sans contrôle du contraste.' },
  { id: 'architect', genre: 'outil', zone: 'figma', produit: 'architect', x: 18, y: 344, logo: 'ucm-token-explorer', nom: 'UCM Architect', type: 'Plugin Figma',
    modes: { variables: { libelle: 'Variables', vers: 'architecture', phrase: 'Vérifie et renomme les tokens selon l\'architecture, et construit le thème.',
        fait: ['Repère noms incohérents, tokens manquants et alias cassés.', 'Corrige en un clic quand la correction est certaine.', 'Crée les alias de la marque et les {{theme}} tokens du thème.'] },
      composant: { libelle: 'Composant', vers: 'composants', phrase: 'Analyse un composant avant export et prépare ses tokens.',
        fait: ['Chaque couleur et chaque taille passe par un token.', 'Contraste WCAG et taille des zones cliquables mesurés.', 'Crée les tokens propres au composant.'] } },
    sans: 'Tokens nommés au cas par cas. Les défauts d\'un composant partent tels quels dans le code.' },
  { id: 'architecture', genre: 'outil', zone: 'figma', produit: 'kit', x: 232, y: 40, picto: 'couches', nom: 'Architecture des tokens', type: 'Définie dans le kit', portes: ['referentiel'],
    couches: [{ libelle: 'Primitives', detail: 'valeurs brutes', collections: ['primitives'] }, { libelle: 'Marque et statuts', detail: 'palettes', collections: [...CIBLES_DES_COLLECTIONS.theme] },
      { libelle: 'Thème', detail: 'Light · Dark', collections: ['theme'] }, { libelle: 'Composant', detail: 'ses propres tokens', collections: ['components'] }],
    alternative: { nom: 'Architecture de l\'équipe', type: 'Sans les règles d\'UCM',
      couches: [{ libelle: 'Primitives', detail: 'valeurs brutes' }, { libelle: 'Quelques alias', detail: 'au cas par cas' }, { libelle: 'Composant', detail: 'vise les primitives' }],
      phrase: 'Light et Dark dupliqués à la main. Changer la marque oblige à reprendre chaque composant.' },
    phrase: 'Les tokens rangés en {{collections}} collections, prêts pour Light et Dark, sans valeur en double.',
    fait: ['Une valeur vit à un seul endroit, les autres niveaux y renvoient.', 'Le thème bascule entre Light et Dark sans toucher aux composants.', 'Chaque composant a ses tokens, on le modifie sans toucher aux autres.', 'Le designer pose à la main les tailles et la typographie, aucun outil n\'écrit <code>layout</code> ni <code>typography</code>.'],
    sans: 'Les composants visent des couleurs brutes. Changer la marque ou ajouter le Dark oblige à reprendre chaque composant.',
    donnee: 'variables',
    recoit: [{ de: 'palettes', rang: 1, donnee: 'variables' }] },
  { id: 'composants', genre: 'geste', zone: 'figma', x: 232, y: 386, picto: 'cadre', nom: 'Composants', type: 'Conçu par le designer', 
    phrase: 'Le designer conçoit chaque composant dans Figma, ses variantes et ses états, liés à ses tokens.',
    fait: ['L\'Exporter pose une règle d\'usage à remplir par propriété, à côté du composant.'],
    donnee: 'composants', lit: ['variables'],
    recoit: [{ de: 'architecture', rang: 2, port: 'bas', donnee: 'variables' }] },
  { id: 'exporter', genre: 'outil', zone: 'figma', produit: 'exporter', x: 446, y: 140, logo: 'ucm-contract-exporter', nom: 'UCM Contract Exporter', type: 'Plugin Figma · Community',
    phrase: 'Envoie le contrat de chaque composant et tokens.json par pull request.',
    fait: ['Une pull request par fichier, jamais fusionnée seule.', 'Signale ce qui manque avant de publier.'],
    pieces: [{ texte: 'Export du composant', preuve: { produit: 'exporter', ecrit: 'contrats' } }, { texte: 'Export des tokens', preuve: { produit: 'exporter', ecrit: 'tokens-dtcg' } }, { texte: 'Choix des collections exportées', piste: 'P23' }],
    sans: 'Le développeur recopie la maquette, et les oublis passent en production.',
    recoit: [{ de: 'architecture', rang: 3, donnee: 'variables' }, { de: 'composants', rang: 4, donnee: 'composants' }] },

  { id: 'cli', genre: 'outil', zone: 'ci', produit: 'cli', x: 684, y: 64, picto: 'terminal', nom: 'Contrôle UCM', type: 'ucm check · @ucm-kit/cli',
    phrase: 'Juge chaque pull request, du designer comme du développeur, et écrit le rapport.',
    fait: ['Bloque un contrat illisible, un token absent, une valeur en dur ou un écart du code.', 'Le rapport dit quoi corriger, et qui doit le faire.'],
    pieces: [{ texte: 'Contrôle des contrats et du code', preuve: { commande: 'check' } }, { texte: '<code>ucm diff</code> ce qu\'un export change', piste: 'P11' }],
    sans: 'Les écarts se découvrent en recette, ou chez l\'utilisateur.',
    rangeCeQuIlLit: true,
    recoit: [{ de: 'exporter', rang: 5, donnee: ['contrats', 'tokens-dtcg'], requis: true }, { de: 'adaptateur', rang: 11, port: 'haut', donnee: 'hebergement' }, { de: 'rendu', rang: 12, port: 'haut', donnee: 'rapports' }] },
  { id: 'adaptateur', genre: 'outil', zone: 'ci', produit: 'adapter-typescript', x: 684, y: 320, picto: 'accolades', nom: 'Adaptateur TypeScript', type: 'Paquet npm',
    phrase: 'Apprend au contrôle à lire le code TypeScript, pour le comparer au contrat.',
    fait: ['Chaque option du contrat existe dans le code.', 'Génère aussi les types du composant pour le développeur.'],
    sans: 'La CI ne lit pas le code TypeScript et refuse la demande du développeur.',
    recoit: [{ de: 'developpement', rang: 9, port: 'haut', donnee: 'implementation' }, { de: 'contrat', donnee: 'contrats', requis: true, sansTrait: true }] },
  { id: 'implementer', genre: 'module', zone: 'developpeur', piste: 'P8', x: 1104, y: 484, picto: 'engrenage', nom: 'UCM Implementer', type: 'Module · compilateur et IA', paquets: ['implementer', 'cli'],
    modes: { initial: { libelle: 'Premier code', vers: 'developpement', phrase: 'Construit la première version, puis pose au développeur les questions que le contrat laisse ouvertes.',
        fait: ['Compile tout ce que le contrat fixe, styles, variantes, états.', 'Demande au développeur l\'élément racine et l\'accessibilité.', 'Retient ses réponses pour les composants suivants.'] },
      maj: { libelle: 'Mise à jour', vers: 'adaptateur', phrase: 'À chaque nouveau contrat, régénère le code et ouvre une pull request.',
        fait: ['Une couleur ou une variante qui change se régénère sans IA.', 'Une prop nouvelle pose une seule question.', 'La pull request montre le code régénéré et son contrôle.'] } },
    pieces: [{ texte: '<code>ucm guide</code> et skill <code>ucm-implementer</code>', preuve: { commande: 'guide' }, chemin: true }, { texte: 'Compilateur', piste: 'P8' }, { texte: 'Mise à jour automatique', piste: 'P8' }, { texte: 'Serveur MCP', piste: 'P13' }],
    sans: 'Le développeur ou son agent code depuis <code>ucm guide</code>, et refait chaque mise à jour à la main.',
    lit: ['contrats'], ecrit: ['implementation'],
    recoit: [{ de: 'contrat', rang: 19, port: 'bas', donnee: 'contrats', requis: true }] },

  { id: 'tokensjson', genre: 'fichier', zone: 'repository', x: 920, y: 60, nom: 'tokens.json', type: 'Tous les tokens · DTCG',
    texte: 'Tous les tokens du design system, en Light et en Dark, au format standard DTCG.',
    donnee: 'tokens-dtcg',
    recoit: [{ de: 'cli', rang: 6, donnee: 'tokens-dtcg' }, { de: 'exporter', donnee: 'tokens-dtcg', requis: true, sansTrait: true }] },
  { id: 'contrat', genre: 'fichier', zone: 'repository', x: 920, y: 130, nom: 'Contrats', type: 'Un par composant',
    texte: 'Un fichier par composant, rangé à côté de son code. Il décrit la partie visuelle du composant, exportée de Figma.',
    donnee: 'contrats',
    recoit: [{ de: 'cli', rang: 7, donnee: 'contrats' }, { de: 'exporter', donnee: 'contrats', requis: true, sansTrait: true }] },
  { id: 'code', genre: 'fichier', zone: 'repository', x: 920, y: 200, nom: 'Code des composants', type: 'À côté de son contrat',
    texte: 'Le comportement appartient au développeur, le visuel suit le contrat.',
    donnee: 'implementation',
    recoit: [{ de: 'cli', rang: 8, donnee: 'implementation' }] },
  { id: 'verrou', genre: 'note', zone: 'repository', piste: 'P17', x: 926, y: 290, nom: 'Verrou de fusion',
    texte: 'Une pull request rouge ne peut plus être fusionnée.',
    sans: 'Une pull request rouge reste fusionnable.',
    lit: ['rapports'],
    recoit: [{ de: 'cli', rang: 22, donnee: 'rapports', secondaire: true, requis: true }] },

  { id: 'developpement', genre: 'geste', zone: 'developpeur', x: 894, y: 484, picto: 'personne', nom: 'Code du composant', type: 'Écrit par le développeur', paquets: ['cli', 'adapter'],
    phrase: 'Écrit contre le contrat. Le comportement et l\'accessibilité n\'appartiennent qu\'au code.',
    fait: ['Lit le contrat, et les variables CSS tirées de tokens.json.', 'Envoie chaque changement par pull request.'],
    pieces: [{ texte: '<code>ucm tokens css</code> variables Light et Dark', preuve: { commande: 'tokens css' } }, { texte: '<code>ucm deroger</code> exception motivée', preuve: { commande: 'deroger' } }, { texte: 'Types générés par l\'adaptateur', preuve: { produit: 'adapter-typescript', ecrit: 'types' } }, { texte: 'Sortie Style Dictionary', piste: 'P23' }],
    lit: ['contrats', 'tokens-dtcg'], ecrit: ['implementation'],
    recoit: [{ de: 'linter', rang: 10, donnee: 'aide' }, { de: 'contrat', rang: 17, port: 'bas', donnee: 'contrats' }, { de: 'tokensjson', rang: 18, port: 'bas', donnee: 'tokens-dtcg' }] },
  { id: 'linter', genre: 'module', zone: 'developpeur', piste: 'P26', x: 684, y: 484, picto: 'loupe', nom: 'Linter', type: 'Module ESLint', paquets: ['core', 'adapter'],
    phrase: 'Souligne dans l\'éditeur une valeur en dur ou un token inconnu, avant la pull request.',
    fait: ['Mêmes règles que la CI, au moment de la saisie.', 'Accepte une exception motivée.'],
    pieces: [{ texte: 'Règles et juge dans le kit', preuve: { export: { porte: 'modules', nom: 'preparerControle' } } }, { texte: 'Module ESLint', piste: 'P26' }],
    sans: 'L\'erreur n\'apparaît qu\'au contrôle de la pull request.',
    lit: ['contrats'],
    recoit: [{ de: 'contrat', donnee: 'contrats', requis: true, sansTrait: true }] },

  { id: 'storybook', genre: 'module', zone: 'rendu-et-suivi', piste: 'P9', x: 1152, y: 64, picto: 'vitrine', nom: 'Storybook généré', type: 'Module', paquets: ['core'],
    phrase: 'Catalogue des composants. Une story par variante du contrat, qui affiche le composant du code.',
    fait: ['Les variantes viennent du contrat, l\'affichage vient du code.', 'Un lien vers Figma pour chaque composant.'],
    sans: 'Catalogue écrit à la main, incomplet et vite périmé.',
    lit: ['contrats', 'implementation'], ecrit: ['composants'],
    recoit: [{ de: 'contrat', rang: 13, donnee: 'contrats', requis: true }, { de: 'code', rang: 14, donnee: 'implementation' }] },
  { id: 'rendu', genre: 'module', zone: 'ci', piste: 'P20', x: 684, y: 192, picto: 'regle', nom: 'Vérificateur de rendu', type: 'Module · dans la CI', paquets: ['core'],
    phrase: 'Affiche chaque story dans un navigateur, mesure le rendu et le compare au contrat.',
    fait: ['Lancé en local par le développeur, puis par la CI à chaque pull request.', 'Ajoute ses écarts au rapport du Contrôle UCM.', 'Envoie l\'état de chaque composant à la page Santé.'],
    pieces: [{ texte: 'Comparateur, dans <code>@ucm-kit/core</code>', piste: 'P10' }, { texte: 'Module navigateur', piste: 'P20' }],
    sans: 'Le designer compare l\'écran à la maquette, à l\'œil.',
    lit: ['composants'], ecrit: ['rapports'],
    recoit: [{ de: 'storybook', rang: 21, port: 'retour', donnee: 'composants', secondaire: true, requis: true }] },
  { id: 'sante', genre: 'module', zone: 'rendu-et-suivi', piste: 'P24', x: 1152, y: 250, picto: 'coeur', nom: 'Santé des composants', type: 'Page d\'accueil du Storybook',
    phrase: 'L\'état de chaque composant, d\'après le Contrôle UCM et le vérificateur de rendu.',
    fait: ['État de chaque composant, conforme, en retard, en écart ou non analysé.', 'Alerte quand le code s\'écarte du contrat.'],
    sans: 'Il faut ouvrir chaque composant pour savoir s\'il suit Figma.',
    lit: ['rapports'],
    recoit: [{ de: 'storybook', rang: 15, port: 'bas', donnee: 'hebergement', requis: true }, { de: 'rendu', rang: 16, donnee: 'rapports' }, { de: 'cli', rang: 20, port: 'dessus', donnee: 'rapports', secondaire: true, requis: true }] },

  { id: 'moteur', genre: 'paquet', zone: 'toolkit', produit: 'couleur', x: 18, y: 692, nom: 'ucm-couleur', marque: 'couleur',
    phrase: 'Calcule les nuances et les contrastes.',
    fait: ['Sans Figma ni navigateur, donc testé seul.', 'Testé sur 360 teintes.'],
    sans: 'Nuances et contrastes calculés à la main, outil par outil.' },
  { id: 'socle', genre: 'paquet', zone: 'toolkit', produit: 'socle', x: 212, y: 692, nom: 'plugin-socle', marque: 'socle',
    phrase: 'Interface et construction des trois plugins.',
    fait: ['Le même langage visuel dans les trois plugins.'],
    sans: 'Chaque plugin refait son interface et sa construction.' },
  { id: 'kit', genre: 'paquet', zone: 'toolkit', produit: 'kit', large: true, x: 406, y: 692, nom: '@ucm-kit/core', marque: 'core',
    phrase: 'Les règles d\'UCM, écrites une fois, importées par tous.',
    fait: ['Une règle changée ici change dans tous les outils.', 'Les modules l\'appellent par une seule porte, stable.'],
    sans: 'Chaque outil recopie les règles, et deux outils finissent par juger différemment.' },
  { id: 'pcli', genre: 'paquet', zone: 'toolkit', produit: 'cli', x: 780, y: 692, nom: '@ucm-kit/cli', marque: 'cli',
    phrase: 'Installé dans le repository, lancé par la CI.',
    fait: ['Une commande installe UCM dans un repository.', 'Ne demande pas de projet Node.'],
    sans: 'Aucun contrôle ne tourne dans la CI.' },
  { id: 'padapt', genre: 'paquet', zone: 'toolkit', produit: 'adapter-typescript', x: 974, y: 692, nom: '@ucm-kit/<wbr>adapter-typescript', marque: 'adapter',
    phrase: 'Apprend aux contrôles à lire le code TypeScript.',
    fait: ['Paquet séparé, parce que TypeScript pèse {{taille-typescript}} Mo.'],
    sans: 'Les contrôles ne lisent pas le code.' },
  { id: 'pimpl', genre: 'paquet', zone: 'toolkit', piste: 'P8', x: 1168, y: 692, nom: '@ucm-kit/<wbr>implementer', type: 'npm · nom à décider', marque: 'implementer', portes: ['format', 'modules'],
    phrase: 'Construit et met à jour le code des composants.',
    fait: ['Compilateur, et IA pour les seules questions ouvertes.'],
    sans: 'Le code des composants s\'écrit à la main.' },
];


/** Les puces de la carte du kit. Chaque porte de `exports` du kit appartient à une seule puce. */
export const PUCES_DU_KIT: readonly PuceDuKit[] = [
  { id: 'format', libelle: 'Format du contrat', portes: ['format', 'lecteurs', 'lecteurs/navigateur', 'schema', 'package.json'] },
  { id: 'architecture', libelle: 'Architecture des tokens', portes: ['referentiel', 'nommage', 'protocoles'] },
  { id: 'theme', libelle: 'Thème et contrastes', portes: ['emplois'] },
  { id: 'controles', libelle: 'Règles de contrôle', portes: ['controles'] },
  { id: 'modules', libelle: 'Porte des modules', portes: ['modules'] },
];

/** Les nombres qu'un texte de carte écrit à la main : aucun calcul ne les garde, donc un test relit leur source. */
export const NOMBRES_ECRITS: readonly NombreEcrit[] = [
  { nombre: '360', source: 'packages/couleur/tests/ancrageDeplace.test.ts' },
  { nombre: '23', source: 'node_modules/typescript' },
];

/**
 * Les pistes non terminées de `pistes.json` que la chaîne ne montre pas, chacune avec sa raison. Une piste que ni une carte, ni une pièce,
 * ni cette liste ne nomme fait refuser le registre. « à montrer » dit une piste qui mérite une carte.
 */
export const EXCLUSIONS_DE_PISTES: Readonly<Record<string, string>> = {
  P1: 'Branche des contrats réels dans le repository de l\'application, un geste d\'intégration, pas une brique de la chaîne.',
  P18: 'Prépare le socle React et TypeScript du repository de l\'application, hors des briques de la chaîne.',
  P22: 'à montrer : les pièces internes d\'un composant, décrites dans le contrat de l\'hôte, étendent la carte Contrats.',
  P16: 'Index des décisions citées dans le code, un outil de documentation du dépôt qui n\'est pas une brique de la chaîne.',
  P28: 'Fiabilise les palettes d\'un design system existant, une recette sur un client, sans brique propre dans la chaîne.',
  P29: 'Construit la chaîne elle-même dans l\'inventaire, donc ne figure pas parmi ses briques.',
  P30: 'Recrée les composants de la bibliothèque d\'un client, un chantier sur la carte Composants ; devient une pièce de cette carte si son outillage devient un produit.',
  P31: 'à montrer : la construction d\'un composant (variants, collection et liaisons) étend le mode Composant de la carte UCM Architect.',
};

export const JAUGES: readonly Jauge[] = [
  { nom: 'Contrastes WCAG AA garantis', par: ['palettes', 'architect'] },
  { nom: 'Light et Dark sans double travail', par: ['palettes', 'architecture', 'architect'] },
  { nom: 'Design et code identiques', par: ['exporter', 'cli', 'adaptateur', 'linter', 'rendu'] },
  { nom: 'Aucun écart en production', par: ['cli', 'verrou', 'rendu'] },
  { nom: 'Code écrit sans recopie', par: ['exporter', 'pcli', 'implementer', 'adaptateur'] },
];
