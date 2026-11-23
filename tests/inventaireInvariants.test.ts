
/**
 * Tient l'accord entre les fichiers d'invariants et le dépôt, dans les deux
 * sens, et tient les deux spécifications contre leur propre appauvrissement.
 *
 * Les invariants vivent dans `packages/<paquet>/invariants/*.md`, que
 * `.agents/domiciles.json` liste dans l'ordre. Vers le document : un
 * raccourcissement ne peut pas supprimer un invariant entier. Vers le code :
 * une autorité que les invariants citent existe encore là où ils la situent.
 * Les deux sens sont nécessaires, et l'un sans l'autre laisse passer
 * exactement ce que l'autre attrape : un document appauvri, ou un document qui
 * nomme ce qui a été renommé. La carte du code et la liste de `tests/` sont
 * tenues par `tests/cartes.test.ts`.
 *
 * `docs/format/FORMAT.md` et `packages/plugin-exporter/SPEC.md` portent la règle et son
 * pourquoi, et rien ne les tenait. Deux listes les couvrent : leur vocabulaire,
 * qui voit un nom disparaître, et leur squelette de titres et d'énoncés, qui
 * voit partir une règle entière.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

/** Ordre attendu des domaines d'invariants, tel que le manifeste les range. */
const DOMAINES = [
  'Portée et forme du contrat',
  'Tokens et variables',
  'Couleurs',
  'Composition',
  'Arbre des slots',
  'Layout, dimensions et bornes',
  'Grilles',
  'Diagnostics',
  'Échantillon de maquette',
  'Écriture dans le document',
  'Tests du moteur',
  'Versionnage',
  'Corpus de test',
  'Référentiel',
  'Moteur de couleur',
  "Écriture d'UCM Palettes",
  "Langue d'UCM Palettes",
  "Interface d'UCM Palettes",
  'Explorateur de tokens',
  "Nomenclature d'UCM Architect",
  'Hub UCM',
];

/** Les domaines que le manifeste range, dans son ordre. */
function domainesDuManifeste(): { titre: string; fichier: string }[] {
  const manifeste = JSON.parse(
    fs.readFileSync(path.join(racine, '.agents', 'domiciles.json'), 'utf8'),
  ) as { domaines: { titre: string; fichier: string }[] };
  return manifeste.domaines;
}

/** Le contenu d'un fichier d'invariants, en fins de ligne LF. */
function lireInvariants(fichier: string): string {
  return fs.readFileSync(path.join(racine, fichier), 'utf8').replace(/\r\n/g, '\n');
}

/** La réunion des fichiers d'invariants, que les autorités se cherchent dedans. */
function invariantsReunis(): { fichier: string; contenu: string }[] {
  return domainesDuManifeste().map(({ fichier }) => ({ fichier, contenu: lireInvariants(fichier) }));
}

/**
 * Le même contrôle, porté sur les deux spécifications.
 *
 * Les fichiers d'invariants étaient seuls tenus, alors que la règle et son pourquoi vivent dans
 * `docs/format/FORMAT.md` et `packages/plugin-exporter/SPEC.md` : un raccourcissement pouvait y
 * retirer une règle entière sans qu'un lien ne meure ni qu'un invariant ne
 * bouge. Chaque terme est un nom que la spécification employait quand la liste
 * a été relevée, donc un endroit où elle dit quelque chose.
 */
const AUTORITES_FORMAT = [
  'BOOLEAN_OPERATION', 'COMPONENT_SET', 'CONTRACT_VERSION', 'FIXED', 'GridTrackSize.value',
  'INSTANCE_SWAP', 'InstanceNode.overrides', 'LINE', 'POLYGON', 'SLOT', 'STAR', 'VECTOR',
  'alignItems', 'alignSelf', 'args', 'bounds', 'colorKeys', 'columnSizes', 'columnStart',
  'componentProperties', 'componentPropertyReferences', 'composes', 'constraints',
  'contractVersion', 'divider.background', 'figmaLayer', 'figmaName', 'fileName',
  'flexGrow', 'format/version.ts', 'icons.*.size', 'indexVariables()', 'inset',
  'justifyContent', 'kebabCase', 'mainComponent', 'masterPath', 'mergeIconRules',
  'meta.coverage.portable', 'meta.figma.url', 'nodeId', 'normalizeName()',
  'override.visible', 'packages/kit/schema/ucm-contract.schema.json', 'padding.x',
  'paintPlacements', 'propertyBindingDefinitions', 'propertyBindings.appliedValue',
  'rendering.keyRoles', 'rendering.roles', 'rowGap', 'rowSizes', 'rowStart', 'runtimeProp',
  'samples', 'stateModel', 'structuralSize', 'structure.children', 'structure.sizing',
  'structureTree.ts', 'swaps', 'textStyles', 'tokenCssVariable', 'tokens.json', 'types.ts',
  'userinput.background', 'variantAxes', 'variantViews', 'variants[].bindings',
  'variants[].tokens', 'visibilityProp', 'visibilityTargets',
  'TOKENS_FORMAT_VERSION', 'colorSpace', 'com.ucm.formatVersion', 'com.ucm.modes',
  'poidsDeGraisse',
];

const AUTORITES_SPEC = [
  'COMPONENT_SET', 'Constat', 'ELLIPSE', 'FIXED', 'LINE', 'RECTANGLE', 'codeIdentifier',
  'composes', 'enablePrivatePluginApi', 'figma.fileKey', 'figmaName', 'fileName',
  'meta.diagnostics', 'meta.figma.url', 'nodeId', 'normalizeName()', 'stateModel',
  'textStyles', 'tokens.json', 'variantViews', 'variants[].tokens',
  'LEGACY', 'TOKENS_FORMAT_VERSION', 'documentColorProfile', 'etatDuFormatDeTokens()',
  'poidsDeGraisse()',
];

/**
 * Le squelette de chaque spécification : ses titres et ses énoncés en gras.
 *
 * La liste de vocabulaire ci-dessus ne voit disparaître un nom qu'à sa
 * dernière mention. Le paragraphe « La règle d'adressage » a été retiré de
 * `FORMAT.md` pour l'éprouver : le contrôle est resté vert, parce que ses noms
 * vivaient ailleurs dans le document. Ce second contrôle porte donc sur ce qui
 * disparaît avec une règle entière, son titre ou son énoncé en gras.
 */
const ENONCES_FORMAT = [
  "La règle commune",
  "1. Props",
  "D'où vient une valeur par défaut",
  "2. Tokens de variantes",
  "3. Layout",
  "4. Modèle d'interaction",
  "5. Typographie",
  "6. Structure",
  "Flux et alignement",
  "Dimensions et bornes",
  "Position absolue",
  "Rotation",
  "Grilles",
  "Propriétés non portables",
  "Passage à la ligne",
  "7. Intention et documentation des props",
  "Ce que le contrat ne dit pas d'une icône",
  "8. Rendu sémantique et garde-fous",
  "9. Échantillon de maquette",
  "Sortie",
  "Fichier et exemple",
  "Composition et dépendances",
  "Cadre de dépendance",
  "Métadonnées",
  "Ce que le schéma décrit, et ce qu'il documente",
  "Projeter un token en propriété personnalisée CSS.",
  "Ce que le contrat ne garantit pas.",
  "Une clé que deux couleurs partagent s'allonge.",
  "séparent",
  "Les côtés peuvent différer.",
  "Un tracé n'est pas une boîte.",
  "La descente ne connaît ni profondeur, ni nature de composant.",
  "Une absence de dimensionnement vaut `Hug`.",
  "Dimensions figées des slots.",
  "Dimensionnement du composant.",
  "Bornes de taille.",
  "Sous une grille, c'est la cellule qui décide de la boîte.",
  "Cette exception s'étend de la piste à la cellule, et là seulement.",
  "Ce que Figma porte et qu'aucun champ du schéma n'écrit",
  "traduire un nom d'icône vers quelque chose qui se dessine.",
  "Ce que le contrat garantit.",
  "Ce qu'il ne garantit pas, et ne garantira pas.",
  "La contrepartie de cette responsabilité est `ucm icons`.",
  "Une clé de couleur n'est pas un rôle",
  "Aucun rôle de contour ne cite une propriété qui consomme la boîte.",
  "Ce que l'échantillon porte.",
  "La règle d'adressage.",
  "La frontière avec la composition.",
  "Ce que `overrides` ne peut pas voir : `swaps`.",
  "Quand la dépendance expose son remplacement.",
  "Ce qu'il ne demande jamais.",
  "Le contenu d'une dépendance se lit en deux temps",
  "La reconstruction est un zipper récursif, pas une recherche globale.",
  "Ce qu'il ne publie pas, faute d'apporter quoi que ce soit.",
  "Une dimension géométrique ne se lit qu'à un endroit, et lequel dépend du\ncomposant.",
  "Un cadre qui enveloppe une ou plusieurs dépendances.",
  "`meta.figma.url` est optionnel, et son absence est un état normal.",
  "2. Résolution des alias (tous types)",
  "référence DTCG",
  "3. Modes et axes.",
  "La racine déclare les axes.",
  "4. DTCG",
  "La racine porte la version du format de tokens.",
  "1. Forme des valeurs.",
];

const ENONCES_SPEC = [
  "Algorithme",
  "La règle commune",
  "1. Props",
  "2. Tokens de variantes",
  "3. Layout",
  "4. Modèle d'interaction",
  "5. Typographie",
  "6. Structure",
  "Un dessin que rien ne déclare",
  "Position absolue : pourquoi des pixels",
  "Rotation : le seuil de neutralité",
  "Propriétés non portables : la portée du relevé",
  "Passage à la ligne : les mots du message",
  "9. Échantillon de maquette",
  "7. Intention et documentation des props",
  "8. Rendu sémantique et garde-fous",
  "Ce que l'export écrit",
  "Le nom du fichier, et ce qu'il unifie",
  "Composition et dépendances",
  "Métadonnées",
  "Les variables d'environnement, et pourquoi elles ne sont pas une interface",
  "Sélectionner et cadrer ne sont pas modifier",
  "Entrée",
  "Applicabilité avant liaison.",
  "Un dessin qu'aucune règle ne désigne avertit.",
  "Pourquoi un nombre, ici.",
  "Une notice, jamais un avertissement.",
  "Ce que l'export unifie avant d'écrire.",
  "Ce qui entre dans ce catalogue est borné :",
  "1. Lister",
  "Le corps de la demande a deux zones, et la frontière compte.",
  "Le schéma annoncé est lu dans le fichier déposé, jamais dans la constante du\nplugin.",
  "Les trois parties voyagent séparées jusqu'à l'interface.",
  "Un avertissement arrive inerte dans la page de la forge.",
  "Un jeton ne part que vers le dépôt qui l'a reçu.",
  "Un secret est une interface publique, et il ne s'écrit jamais en argument.",
  "Aucune de ces trois interfaces n'est figée, délibérément.",
  "Tranché, et la question se reposera.",
  "Ce qui reste à vérifier, et qui n'est pas vérifiable depuis ce dépôt :",
  "La frontière que cette décision ne déplace pas.",
  "Le profil colorimétrique se lit sur le document, une fois par export.",
  "Le type d'une graisse `STRING` se décide sur tout le graphe, avant d'écrire.",
  "La marque de version vient de la constante du kit.",
];

test("les vingt et un domaines d'invariants sont là, dans l'ordre du manifeste, sous leur titre", () => {
  const domaines = domainesDuManifeste();
  assert.deepEqual(domaines.map((d) => d.titre), DOMAINES);

  const faux: string[] = [];
  for (const { titre, fichier } of domaines) {
    const premiere = lireInvariants(fichier).split('\n', 1)[0].trim();
    if (premiere !== `# ${titre}`) faux.push(`${fichier} : « ${premiere} » au lieu de « # ${titre} »`);
  }
  assert.deepEqual(faux, [], `Ces fichiers ne commencent plus par le titre du manifeste :\n${faux.join('\n')}`);
});

test('chaque domaine porte au moins un invariant', () => {
  const vides = invariantsReunis()
    .filter(({ contenu }) => !/^- /m.test(contenu))
    .map(({ fichier }) => fichier);
  assert.deepEqual(vides, [], `Ces fichiers n'ont plus aucune regle : ${vides.join(', ')}`);
});

/** Les fichiers du dépôt, en chemins relatifs à séparateur `/`. */
function fichiersDuDepot(dossier: string = racine): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDuDepot(complet));
    else trouves.push(path.relative(racine, complet).split(path.sep).join('/'));
  }
  return trouves;
}

/**
 * Les phrases « Autorité : » d'un fichier d'invariants. Une phrase court
 * jusqu'au premier point hors accents graves, ou jusqu'à « Tests : », « Spec : »,
 * « Manque : », « Borne : » ou une flèche.
 */
function phrasesAutorite(contenu: string): string[] {
  const phrases: string[] = [];
  for (const debut of contenu.matchAll(/Autorités? :/g)) {
    let texte = '';
    let accents = false;
    for (let i = debut.index! + debut[0].length; i < contenu.length; i++) {
      const c = contenu[i];
      if (c === '\n') break;
      if (c === '`') accents = !accents;
      if (!accents && c === '.' && /\s|$/.test(contenu[i + 1] ?? ' ')) break;
      if (!accents && /^ (Tests? :|Spec :|Manque :|Borne :|→)/.test(contenu.slice(i, i + 9))) break;
      texte += c;
    }
    phrases.push(texte);
  }
  return phrases;
}

/**
 * Fichiers qu'une autorité désigne, ou aucun. Un chemin se résout dans le
 * paquet de l'invariant, puis dans `packages/`, puis à la racine, puis par son
 * dernier segment dans le paquet, puis dans tout le dépôt.
 */
function fichiersDe(chemin: string, paquet: string, depot: string[]): string[] {
  const nu = chemin.replace(/^\//, '');
  const [premier, ...reste] = nu.split('/');
  const directs = [
    `packages/${paquet}/${nu}`,
    `packages/${nu}`,
    `packages/plugin-${premier}/${reste.join('/')}`,
    nu,
  ];
  const direct = directs.find((candidat) => depot.includes(candidat));
  if (direct) return [direct];
  const suffixe = depot.filter((fichier) => fichier.endsWith(`/${nu}`));
  const dansLePaquet = suffixe.filter((fichier) => fichier.startsWith(`packages/${paquet}/`));
  return dansLePaquet.length > 0 ? dansLePaquet : suffixe;
}

/** Un nom de fichier ou de chemin, par opposition à un symbole. */
const EST_UN_CHEMIN = /\/|\.(ts|mjs|mts|json)$/;
const EST_UN_SYMBOLE = /^[A-Za-z_][\w.]*(\(\))?$/;

/**
 * Autorités que le contrôle ne tranche pas, avec la raison. La clé est la
 * citation entre accents graves, telle que l'invariant l'écrit.
 */
const AUTORITES_HORS_CONTROLE: Record<string, string> = {};

/** Chaque autorité qu'une phrase « Autorité : » cite après un chemin existe dans ce fichier. */
test('chaque phrase « Autorité : » des invariants nomme des symboles qui existent dans son fichier', () => {
  const depot = fichiersDuDepot();
  const introuvables: string[] = [];

  for (const dossier of fs.readdirSync(path.join(racine, 'packages'))) {
    const invariants = path.join(racine, 'packages', dossier, 'invariants');
    if (!fs.existsSync(invariants)) continue;
    for (const nom of fs.readdirSync(invariants).filter((n) => n.endsWith('.md'))) {
      const contenu = fs.readFileSync(path.join(invariants, nom), 'utf8').replace(/\r\n/g, '\n');
      for (const phrase of phrasesAutorite(contenu)) {
        const citations = [...phrase.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
        const chemins = citations.filter((c) => EST_UN_CHEMIN.test(c) && !c.includes('['));
        const symboles = citations.filter((c) => !EST_UN_CHEMIN.test(c) && EST_UN_SYMBOLE.test(c));
        const lieu = `packages/${dossier}/invariants/${nom}`;
        const fichiers = new Set<string>();
        for (const chemin of chemins) {
          const trouves = fichiersDe(chemin, dossier, depot);
          if (trouves.length === 0 && !(chemin in AUTORITES_HORS_CONTROLE)) {
            introuvables.push(`${lieu} : aucun fichier ne porte « ${chemin} »`);
          }
          trouves.forEach((fichier) => fichiers.add(fichier));
        }
        if (fichiers.size === 0) continue;
        const texte = [...fichiers].map((f) => fs.readFileSync(path.join(racine, f), 'utf8')).join('\n');
        for (const symbole of symboles) {
          if (symbole in AUTORITES_HORS_CONTROLE) continue;
          const segments = symbole.replace(/\(\)/g, '').split('.').filter(Boolean);
          const absent = segments.filter(
            (s) => !new RegExp(`(?<![A-Za-z0-9_])${s}(?![A-Za-z0-9_])`).test(texte),
          );
          if (absent.length > 0) {
            introuvables.push(`${lieu} : « ${symbole} » absent de ${chemins.join(', ')}`);
          }
        }
      }
    }
  }

  assert.deepEqual(
    introuvables,
    [],
    "Ces autorités ne sont plus dans le fichier que leur invariant cite :\n"
      + `${introuvables.join('\n')}\n`
      + "Corriger la phrase « Autorité : » dans le même commit que le renommage. Une aide "
      + 'de test qui sert d\'autorité se range dans AUTORITES_HORS_CONTROLE avec sa raison.',
  );
});

/** Les deux spécifications, avec la liste que chacune doit encore nommer. */
const SPECIFICATIONS: [string, string[]][] = [
  ['docs/format/FORMAT.md', AUTORITES_FORMAT],
  ['packages/plugin-exporter/SPEC.md', AUTORITES_SPEC],
];

for (const [chemin, attendues] of SPECIFICATIONS) {
  test(`aucune autorite citee par ${chemin} n'a disparu du document`, () => {
    const contenu = fs.readFileSync(path.join(racine, chemin), 'utf8');
    const perdues = attendues.filter((autorite) => !contenu.includes(autorite));

    assert.deepEqual(
      perdues,
      [],
      `Ces autorites ne sont plus nommees par ${chemin} :\n`
        + `${perdues.join('\n')}\n`
        + "Une regle a probablement ete perdue en raccourcissant. Si le retrait est "
        + "voulu, retirer l'entree de la liste dans le meme commit, et dire dans le "
        + 'message ou la regle vit desormais.',
    );
  });
}

/** Propriétés du schéma que `FORMAT.md` ne cite pas entre accents graves, avec la raison. */
const PROPRIETES_SANS_SECTION: Record<string, string> = {};

/** Chaque nom de `properties` du schéma publié figure entre accents graves dans `FORMAT.md`. */
test('chaque propriété du schéma figure dans docs/format/FORMAT.md ou porte une exception nommée', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(racine, 'packages/kit/schema/ucm-contract.schema.json'), 'utf8'),
  ) as { definitions: Record<string, unknown> };
  const noms = new Set<string>();
  const vus = new Set<string>();
  const parcourir = (noeud: unknown): void => {
    if (!noeud || typeof noeud !== 'object') return;
    const objet = noeud as Record<string, unknown>;
    if (typeof objet.$ref === 'string') {
      const cible = decodeURIComponent(objet.$ref.replace('#/definitions/', ''));
      assert.ok(cible in schema.definitions, `$ref sans définition : ${objet.$ref}`);
      if (!vus.has(cible)) {
        vus.add(cible);
        parcourir(schema.definitions[cible]);
      }
    }
    if (objet.properties && typeof objet.properties === 'object') {
      Object.keys(objet.properties).forEach((nom) => noms.add(nom));
    }
    Object.values(objet).forEach(parcourir);
  };
  parcourir(schema);
  Object.values(schema.definitions).forEach(parcourir);

  const format = fs.readFileSync(path.join(racine, 'docs/format/FORMAT.md'), 'utf8');
  const citees = [...format.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).join('\n');
  const sansCitation = [...noms].filter(
    (nom) => !new RegExp(`(?<![A-Za-z0-9_])${nom}(?![A-Za-z0-9_])`).test(citees),
  );

  const inconnues = sansCitation.filter((nom) => !(nom in PROPRIETES_SANS_SECTION));
  assert.deepEqual(
    inconnues,
    [],
    'Ces propriétés du schéma ne figurent pas entre accents graves dans docs/format/FORMAT.md :\n'
      + `${inconnues.join('\n')}\n`
      + 'Les décrire dans la section de leur objet parent, ou les ranger dans PROPRIETES_SANS_SECTION avec leur raison.',
  );
  const perimees = Object.keys(PROPRIETES_SANS_SECTION).filter((nom) => !sansCitation.includes(nom));
  assert.deepEqual(
    perimees,
    [],
    "Ces exceptions sont citées par FORMAT.md ou absentes du schéma, retirer l'entrée de PROPRIETES_SANS_SECTION :\n"
      + perimees.join('\n'),
  );
});

/** Les deux specifications, avec le squelette que chacune doit encore porter. */
const SQUELETTES: [string, string[]][] = [
  ['docs/format/FORMAT.md', ENONCES_FORMAT],
  ['packages/plugin-exporter/SPEC.md', ENONCES_SPEC],
];

for (const [chemin, attendus] of SQUELETTES) {
  test(`aucune regle entiere n'a disparu de ${chemin}`, () => {
    const contenu = fs.readFileSync(path.join(racine, chemin), 'utf8');
    const perdus = attendus.filter((enonce) => !contenu.includes(enonce));

    assert.deepEqual(
      perdus,
      [],
      `Ces titres ou enonces ne sont plus dans ${chemin} :\n`
        + `${perdus.join('\n')}\n`
        + 'Une regle entiere part avec son titre ou son enonce. Si le retrait est '
        + "voulu, retirer l'entree de la liste dans le meme commit, et dire dans le "
        + 'message ou la regle vit desormais.',
    );
  });
}
