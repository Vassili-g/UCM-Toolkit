/**
 * Garde de conservation de la réécriture d'`AGENTS.md`.
 *
 * Le script lit `AGENTS.md` à un commit de référence, relève ses atomes et
 * exige que chacun figure dans les fichiers d'arrivée que décrit le manifeste
 * `.agents/domiciles.json`. Un atome est un fait que la compaction ne doit pas
 * perdre : un nom en code, un nombre, un identifiant de test ou de décision,
 * la cible d'un lien.
 *
 * Découpe de la source : les sections `###` situées sous `## Invariants` sont
 * les groupes. Chacune se rattache au domaine du manifeste dont `titre` lui est
 * égal, et ses atomes doivent figurer dans le `fichier` de ce domaine. Le reste
 * du texte (en-tête, carte, vérification, publication, limites) forme la partie
 * hors groupe : ses atomes doivent figurer dans la réunion des nouveaux
 * fichiers.
 *
 * Atomes, par catégorie :
 * - `code` : contenu des spans en accents graves, et premier mot de chaque
 *   ligne des blocs ```text quand il ressemble à un chemin. Un chemin se
 *   réduit à son dernier segment, puisque la convention raccourcit les
 *   chemins. Les blocs d'une autre langue sont ignorés.
 * - `nombres` : nombres en chiffres et nombres en lettres (de « deux » à
 *   « mille »), hors code et hors cibles de lien. Les deux écritures ne
 *   s'équivalent pas : « seize » remplacé par `16` est un manque. Le numéro
 *   d'une liste ordonnée n'est pas un nombre, et les chiffres d'un
 *   identifiant se comptent avec lui.
 * - `identifiants` : `[UI-20]`, `N01`, `AUD-E2b`, `D14`.
 * - `liens` : cibles des liens en ligne et des définitions de référence,
 *   réduites à `fichier#ancre`. Une URL `http(s)` reste entière.
 *
 * Usage :
 *   node scripts/verifier-conservation.mjs [--ref <commit>] [--domaines <id,id>]
 *     [--strict] [--manifeste <chemin>]
 *
 * `--ref` vaut `HEAD` par défaut. `--domaines` limite le contrôle aux groupes
 * de ces domaines et saute la partie hors groupe. Un fichier d'arrivée absent
 * rend le groupe « non écrit » : un signalement, sauf avec `--strict` ou pour
 * un domaine nommé par `--domaines`, où c'est une erreur. Sortie 1 s'il manque
 * un atome ou si une erreur est levée, 2 pour un usage invalide.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CATEGORIES = ['code', 'nombres', 'identifiants', 'liens'];

const EXTENSIONS_CHEMIN = /\.(?:ts|tsx|mjs|cjs|js|json|md|css|html|toml|yml)$/;

const NOMBRES_EN_LETTRES = [
  'dix-sept', 'dix-huit', 'dix-neuf', 'deux', 'trois', 'quatre', 'cinq', 'six',
  'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze',
  'seize', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'cents',
  'cent', 'mille',
];
const RE_NOMBRE_EN_LETTRES = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${NOMBRES_EN_LETTRES.join('|')})(?![\\p{L}\\p{N}_])`,
  'giu',
);
const RE_NOMBRE_EN_CHIFFRES = /\d+(?:[.,]\d+)?/g;
const RE_IDENTIFIANT_CROCHETS = /\[[A-Z]+-\d+\]/g;
const RE_IDENTIFIANT_MOT = /\b[A-Z]{1,4}(?:-[A-Z]+)?\d+[a-z]?\b/g;

const RE_SPAN = /`([^`]+)`/g;
const RE_LIEN_EN_LIGNE = /\]\((?:<([^>\n]*)>|([^)\s]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\)/g;
const RE_DEFINITION_LIEN = /^[ ]{0,3}\[[^\]\n]+\]:[ \t]*<?(\S+?)>?(?:[ \t]+.*)?$/gm;
const RE_NUMERO_DE_LISTE = /^([ \t]*)\d+[.)][ \t]+/gm;

/** Remplace un span ou un bloc retiré sans coller les mots voisins. */
const MARQUE = '\u0001';

function ressembleAUnChemin(texte) {
  return texte.includes('/') || EXTENSIONS_CHEMIN.test(texte);
}

function dernierSegment(chemin) {
  const segments = chemin.split('/').filter((segment) => segment !== '');
  return segments.length > 0 ? segments[segments.length - 1] : chemin;
}

function normaliserSpan(contenu) {
  const propre = contenu.replace(/\s+/g, ' ').trim();
  if (propre === '') return null;
  return ressembleAUnChemin(propre) ? dernierSegment(propre) : propre;
}

function decoder(texte) {
  try {
    return decodeURIComponent(texte);
  } catch {
    return texte;
  }
}

/** `../docs/FORMAT.md#grilles` devient `FORMAT.md#grilles`. */
export function normaliserCible(cible) {
  const propre = cible.trim();
  if (/^https?:\/\//i.test(propre) || /^[a-z][a-z0-9+.-]*:/i.test(propre)) return propre;
  const diese = propre.indexOf('#');
  const chemin = diese === -1 ? propre : propre.slice(0, diese);
  const ancre = diese === -1 ? '' : propre.slice(diese + 1);
  const segment = dernierSegment(decoder(chemin));
  const base = chemin === '' ? '' : segment;
  return ancre === '' ? base : `${base}#${decoder(ancre)}`;
}

/**
 * Sépare la prose des blocs clôturés. Rend la prose (les lignes d'un bloc
 * deviennent des lignes vides, pour garder la numérotation) et les blocs, avec
 * leur type.
 */
function separerBlocs(texte) {
  const prose = [];
  const blocs = [];
  let bloc = null;
  for (const ligne of texte.split('\n')) {
    const cloture = /^\s*(`{3,}|~{3,})\s*(\S*)\s*$/.exec(ligne);
    if (bloc !== null) {
      const ferme =
        cloture !== null
        && cloture[2] === ''
        && cloture[1][0] === bloc.cloture[0]
        && cloture[1].length >= bloc.cloture.length;
      if (ferme) bloc = null;
      else bloc.lignes.push(ligne);
      prose.push('');
      continue;
    }
    const ouverture = /^\s*(`{3,}|~{3,})\s*(\S*)/.exec(ligne);
    if (ouverture !== null) {
      bloc = { cloture: ouverture[1], type: ouverture[2], lignes: [] };
      blocs.push(bloc);
      prose.push('');
      continue;
    }
    prose.push(ligne);
  }
  return { prose: prose.join('\n'), blocs };
}

function premierMotDeChemin(ligne) {
  const mot = ligne.trim().split(/\s+/)[0]?.replace(/[,:;]+$/, '') ?? '';
  return mot !== '' && ressembleAUnChemin(mot) ? dernierSegment(mot) : null;
}

/** Les atomes d'un texte Markdown, par catégorie. */
export function atomesDe(texte) {
  const atomes = Object.fromEntries(CATEGORIES.map((categorie) => [categorie, new Set()]));
  const normalise = texte.replace(/\r\n?/g, '\n');
  const { prose, blocs } = separerBlocs(normalise);

  for (const bloc of blocs) {
    if (bloc.type !== 'text') continue;
    for (const ligne of bloc.lignes) {
      const mot = premierMotDeChemin(ligne);
      if (mot !== null) atomes.code.add(mot);
      // La description d'une ligne de carte cite des noms en code, que la
      // carte réécrite garde en spans.
      for (const [, contenu] of ligne.matchAll(RE_SPAN)) {
        const atome = normaliserSpan(contenu);
        if (atome !== null) atomes.code.add(atome);
      }
    }
  }

  let reste = prose.replace(RE_SPAN, (_, contenu) => {
    const atome = normaliserSpan(contenu);
    if (atome !== null) atomes.code.add(atome);
    return MARQUE;
  });

  // Les définitions d'abord : après le retrait des liens en ligne,
  // `[texte](cible): suite` ressemblerait à une définition.
  reste = reste.replace(RE_DEFINITION_LIEN, (_, cible) => {
    atomes.liens.add(normaliserCible(cible));
    return '';
  });
  reste = reste.replace(RE_LIEN_EN_LIGNE, (_, chevrons, simple) => {
    const cible = (chevrons ?? simple ?? '').trim();
    if (cible !== '') atomes.liens.add(normaliserCible(cible));
    return ']';
  });

  reste = reste.replace(RE_NUMERO_DE_LISTE, '$1');

  const masque = (re) => {
    reste = reste.replace(re, (trouve) => {
      atomes.identifiants.add(trouve);
      return MARQUE;
    });
  };
  masque(RE_IDENTIFIANT_CROCHETS);
  masque(RE_IDENTIFIANT_MOT);

  for (const trouve of reste.matchAll(RE_NOMBRE_EN_CHIFFRES)) atomes.nombres.add(trouve[0]);
  for (const trouve of reste.matchAll(RE_NOMBRE_EN_LETTRES)) {
    atomes.nombres.add(trouve[0].toLowerCase());
  }
  return atomes;
}

function enAtomes(entree) {
  return typeof entree === 'string' ? atomesDe(entree) : entree;
}

/** Réunion de plusieurs objets d'atomes. */
export function reunir(liste) {
  const atomes = Object.fromEntries(CATEGORIES.map((categorie) => [categorie, new Set()]));
  for (const entree of liste) {
    for (const categorie of CATEGORIES) {
      for (const atome of entree[categorie]) atomes[categorie].add(atome);
    }
  }
  return atomes;
}

/**
 * Les atomes de la source absents de l'arrivée, par catégorie, en tableaux
 * triés. Chaque argument est un texte ou un objet rendu par `atomesDe`.
 */
export function manques(source, arrivee) {
  const depart = enAtomes(source);
  const but = enAtomes(arrivee);
  const rendu = {};
  for (const categorie of CATEGORIES) {
    rendu[categorie] = [...depart[categorie]].filter((atome) => !but[categorie].has(atome)).sort();
  }
  return rendu;
}

export function totalDe(parCategorie) {
  return CATEGORIES.reduce((somme, categorie) => somme + parCategorie[categorie].length, 0);
}

function comptesDe(atomes) {
  return Object.fromEntries(CATEGORIES.map((categorie) => [categorie, atomes[categorie].size]));
}

/**
 * Coupe `AGENTS.md` en groupes (sections `###` sous `## Invariants`) et en
 * partie hors groupe. Un titre dans un bloc clôturé n'ouvre aucune section.
 */
export function decouperSource(source) {
  const groupes = [];
  const hors = [];
  let dansInvariants = false;
  let groupe = null;
  let cloture = null;
  for (const ligne of source.replace(/\r\n?/g, '\n').split('\n')) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(ligne);
    if (cloture !== null) {
      if (fence !== null && fence[1][0] === cloture[0] && fence[1].length >= cloture.length
        && ligne.trim() === fence[1]) cloture = null;
      (groupe ?? { lignes: hors }).lignes.push(ligne);
      continue;
    }
    if (fence !== null) {
      cloture = fence[1];
      (groupe ?? { lignes: hors }).lignes.push(ligne);
      continue;
    }
    const niveau2 = /^## (.+)$/.exec(ligne);
    if (niveau2 !== null) {
      dansInvariants = niveau2[1].trim() === 'Invariants';
      groupe = null;
      hors.push(ligne);
      continue;
    }
    const niveau3 = /^### (.+)$/.exec(ligne);
    if (niveau3 !== null && dansInvariants) {
      groupe = { titre: niveau3[1].trim(), lignes: [] };
      groupes.push(groupe);
      continue;
    }
    (groupe ?? { lignes: hors }).lignes.push(ligne);
  }
  return {
    groupes: groupes.map(({ titre, lignes }) => ({ titre, texte: lignes.join('\n') })),
    horsGroupe: hors.join('\n'),
  };
}

/**
 * Contrôle une source contre un manifeste. `lecteur` fournit `lire(chemin)`,
 * qui rend le texte ou `null` si le fichier n'existe pas, et `lister(motif)`,
 * qui développe un motif dont un segment est `*`.
 *
 * Rend `{ entrees, erreurs, manquesTotal }`. Chaque entrée décrit un fichier :
 * `{ nature, titre, fichier, statut, comptes, manques }`, avec le statut
 * `ok`, `manques`, `non-ecrit` ou `sans-domaine`.
 */
export function controler({ source, manifeste, lecteur, domaines = null, strict = false }) {
  const ids = new Set(manifeste.domaines.map((domaine) => domaine.id));
  if (domaines !== null) {
    const inconnus = domaines.filter((id) => !ids.has(id));
    if (inconnus.length > 0) {
      throw new Error(`Domaine inconnu du manifeste : ${inconnus.join(', ')}.`);
    }
  }
  const filtre = domaines === null ? null : new Set(domaines);
  const { groupes, horsGroupe } = decouperSource(source);
  const parTitre = new Map();
  for (const domaine of manifeste.domaines) {
    if (!parTitre.has(domaine.titre.trim())) parTitre.set(domaine.titre.trim(), domaine);
  }

  const entrees = [];
  const erreurs = [];
  const arrivees = new Map();
  const lireAtomes = (chemin) => {
    if (!arrivees.has(chemin)) {
      const texte = lecteur.lire(chemin);
      arrivees.set(chemin, texte === null || texte === undefined ? null : atomesDe(texte));
    }
    return arrivees.get(chemin);
  };

  for (const { titre, texte } of groupes) {
    const domaine = parTitre.get(titre);
    if (domaine === undefined) {
      if (filtre !== null) continue;
      const entree = {
        nature: 'groupe', titre, fichier: null, statut: 'sans-domaine',
        comptes: comptesDe(atomesDe(texte)), manques: null,
      };
      entrees.push(entree);
      erreurs.push(`Le groupe « ${titre} » n'a aucun domaine de même titre dans le manifeste.`);
      continue;
    }
    if (filtre !== null && !filtre.has(domaine.id)) continue;

    const atomesSource = atomesDe(texte);
    const entree = {
      nature: 'groupe', titre, fichier: domaine.fichier, id: domaine.id,
      comptes: comptesDe(atomesSource),
    };
    entrees.push(entree);
    const arrivee = lireAtomes(domaine.fichier);
    if (arrivee === null) {
      entree.statut = 'non-ecrit';
      entree.manques = null;
      if (strict || (filtre !== null && filtre.has(domaine.id))) {
        erreurs.push(`Le fichier « ${domaine.fichier} » du groupe « ${titre} » n'existe pas.`);
      }
      continue;
    }
    entree.manques = manques(atomesSource, arrivee);
    entree.statut = totalDe(entree.manques) > 0 ? 'manques' : 'ok';
  }

  if (filtre === null) {
    const atomesSource = atomesDe(horsGroupe);
    const fichiers = fichiersDeLaReunion(manifeste, lecteur);
    const lus = fichiers.filter((chemin) => lireAtomes(chemin) !== null);
    const reunion = reunir(lus.map((chemin) => lireAtomes(chemin)));
    const entree = {
      nature: 'hors-groupe',
      titre: 'partie hors groupe (en-tête, carte, vérification, publication, limites)',
      fichier: `${lus.length} fichiers lus`,
      comptes: comptesDe(atomesSource),
      manques: manques(atomesSource, reunion),
    };
    entree.statut = totalDe(entree.manques) > 0 ? 'manques' : 'ok';
    entrees.push(entree);
  }

  const manquesTotal = entrees.reduce(
    (somme, entree) => somme + (entree.manques === null ? 0 : totalDe(entree.manques)),
    0,
  );
  return { entrees, erreurs, manquesTotal };
}

/** Les fichiers où chercher les atomes de la partie hors groupe. */
export function fichiersDeLaReunion(manifeste, lecteur) {
  const liste = [
    'AGENTS.md', 'CLAUDE.md', 'CARTE.md', 'CONTRIBUTING.md',
    ...manifeste.domaines.map((domaine) => domaine.fichier),
    ...Object.values(manifeste.cartes ?? {}),
    ...lecteur.lister('packages/*/AGENTS.md'),
    ...lecteur.lister('.agents/skills/*/SKILL.md'),
  ];
  return [...new Set(liste)];
}

function ligneDeComptes(comptes) {
  return CATEGORIES.map((categorie) => `${categorie} ${comptes[categorie]}`).join(', ');
}

export function formaterRapport({ entrees, erreurs, manquesTotal }) {
  const lignes = [];
  for (const entree of entrees) {
    const objet = entree.nature === 'groupe' ? `groupe « ${entree.titre} »` : entree.titre;
    const ou = entree.fichier === null ? '' : ` -> ${entree.fichier}`;
    const atomes = `atomes : ${ligneDeComptes(entree.comptes)}`;
    if (entree.statut === 'non-ecrit') {
      lignes.push(`NON ÉCRIT  ${objet}${ou} (${atomes})`);
    } else if (entree.statut === 'sans-domaine') {
      lignes.push(`SANS DOMAINE  ${objet} (${atomes})`);
    } else if (entree.statut === 'ok') {
      lignes.push(`OK  ${objet}${ou} (${atomes})`);
    } else {
      lignes.push(`MANQUES (${totalDe(entree.manques)})  ${objet}${ou} (${atomes})`);
      for (const categorie of CATEGORIES) {
        const absents = entree.manques[categorie];
        if (absents.length > 0) lignes.push(`  ${categorie} (${absents.length}) : ${absents.join(' ; ')}`);
      }
    }
  }
  for (const erreur of erreurs) lignes.push(`ERREUR  ${erreur}`);
  const nonEcrits = entrees.filter((entree) => entree.statut === 'non-ecrit').length;
  const verdict = manquesTotal > 0 || erreurs.length > 0 ? 'ÉCHEC' : 'OK';
  lignes.push(
    `${verdict} : ${entrees.length} entrées, ${nonEcrits} non écrites, `
      + `${manquesTotal} atomes manquants, ${erreurs.length} erreurs.`,
  );
  return lignes.join('\n');
}

function normaliserTexte(texte) {
  return texte.replace(/\r\n?/g, '\n');
}

/** Développe un motif dont certains segments valent `*`, sous la racine du dépôt. */
function listerMotif(motif) {
  let courants = [''];
  for (const segment of motif.split('/')) {
    const suivants = [];
    for (const dossier of courants) {
      if (segment !== '*') {
        suivants.push(dossier === '' ? segment : `${dossier}/${segment}`);
        continue;
      }
      const absolu = path.join(racine, dossier);
      if (!fs.existsSync(absolu)) continue;
      for (const element of fs.readdirSync(absolu, { withFileTypes: true })) {
        if (element.isDirectory()) suivants.push(dossier === '' ? element.name : `${dossier}/${element.name}`);
      }
    }
    courants = suivants;
  }
  return courants.filter((chemin) => fs.existsSync(path.join(racine, chemin)));
}

function lecteurDuDisque() {
  return {
    lire(chemin) {
      const absolu = path.join(racine, chemin);
      if (!fs.existsSync(absolu) || !fs.statSync(absolu).isFile()) return null;
      return normaliserTexte(fs.readFileSync(absolu, 'utf8'));
    },
    lister: listerMotif,
  };
}

function lireOptions(argv) {
  const options = { ref: 'HEAD', domaines: null, strict: false, manifeste: '.agents/domiciles.json' };
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    const valeur = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`L'option ${option} attend une valeur.`);
      return argv[i];
    };
    if (option === '--ref') options.ref = valeur();
    else if (option === '--domaines') {
      options.domaines = valeur().split(',').map((id) => id.trim()).filter((id) => id !== '');
    } else if (option === '--manifeste') options.manifeste = valeur();
    else if (option === '--strict') options.strict = true;
    else throw new Error(`Option inconnue : ${option}.`);
  }
  return options;
}

function main() {
  let options;
  let source;
  let manifeste;
  try {
    options = lireOptions(process.argv.slice(2));
    const chemin = path.resolve(racine, options.manifeste);
    if (!fs.existsSync(chemin)) throw new Error(`Manifeste introuvable : ${options.manifeste}.`);
    manifeste = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    source = execFileSync('git', ['show', `${options.ref}:AGENTS.md`], {
      cwd: racine, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (erreur) {
    console.error(`verifier-conservation : ${erreur.message}`);
    process.exit(2);
  }
  let resultat;
  try {
    resultat = controler({
      source: normaliserTexte(source), manifeste, lecteur: lecteurDuDisque(),
      domaines: options.domaines, strict: options.strict,
    });
  } catch (erreur) {
    console.error(`verifier-conservation : ${erreur.message}`);
    process.exit(2);
  }
  console.log(formaterRapport(resultat));
  process.exit(resultat.manquesTotal > 0 || resultat.erreurs.length > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
