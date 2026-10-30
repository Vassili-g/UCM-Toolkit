/**
 * Les règles de style du dépôt, en un seul endroit, pour les trois moments où
 * elles s'appliquent.
 *
 * Le test `tests/styleDocumentaire.test.ts` les rejoue sur tout le dépôt. Le
 * hook `PostToolUse` de `.claude/settings.json` (`hook-style.mjs`) les rejoue
 * sur le fichier qu'un agent vient d'écrire. Le hook `Stop` et `SubagentStop`
 * (`hook-reponse.mjs`) applique les motifs de refus communs aux fichiers et aux
 * réponses, `MOTIFS_DE_REFUS_PARTOUT`, au dernier message d'un agent. Les trois
 * partagent ce module pour qu'aucun moment ne juge autrement.
 *
 * Deux niveaux. Un refus fait échouer `npm test` et sort le hook d'écriture en
 * code 2. Un signal laisse `npm test` passer : le hook d'écriture rend le
 * passage à l'agent, qui garde la phrase si le fait l'exige. Le niveau d'un
 * motif dépend de la catégorie du fichier (`agent`, `html`, `autre`), dans
 * `NIVEAUX_DES_SIGNAUX`.
 *
 * Le périmètre couvre les documents Markdown, les commentaires des sources
 * `.ts`, `.tsx`, `.mjs` et `.cjs`, le texte des maquettes `.html` suivies par
 * Git, et les chaînes des `packages/<paquet>/src/i18n/fr.ts`.
 *
 * L'autorité rédactionnelle reste le bloc « Écrire » d'`AGENTS.md`,
 * `CONTRIBUTING.md`, section « Rédiger un document », et la skill
 * `.agents/skills/relire-le-style`. Ce module ne contrôle que ce qui se décide
 * sans lire le sens : la question « cette phrase apporte-t-elle un fait »
 * reste à la relecture.
 *
 * Usage : `node scripts/controle-style.mjs [--detail] [fichier...]`. Sans
 * fichier, tous les fichiers suivis par Git hors `EXCLUS_DU_CONTROLE`. Sortie 1
 * s'il reste un refus ; les signaux sont comptés par motif, et listés avec
 * `--detail`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIRET_CADRATIN = '—';

/**
 * Ce qu'un mot tout en capitales a le droit d'être : un sigle, un type de
 * l'API Figma, un nom de fichier ou de document du dépôt.
 *
 * La liste tenue auparavant était celle des mots français vus en capitales, et
 * elle laissait passer tout mot qui n'y était pas encore. Le relevé qui a suivi
 * l'extension du contrôle aux commentaires en a trouvé 218 hors liste, dont
 * 218 qui étaient bien des emphases. La liste est donc inversée : un mot en
 * capitales est une emphase tant qu'il n'est pas nommé ici, et un sigle nouveau
 * s'ajoute avec un message qui le dit. Le contrôle échoue alors du bon côté.
 *
 * Un mot d'une seule lettre et un identifiant à `_` ne sont pas concernés,
 * `CONTRACT_VERSION` et `L'` compris.
 */
export const ACRONYMES = [
  'AA', 'AAA', 'ACM', 'AI', 'ALIN', 'APCA', 'APG', 'API', 'ARIA', 'ASCII', 'BASE', 'BOM', 'BOOLEAN', 'CI', 'CLI', 'COLOR', 'COMA', 'COMPONENT',
  'CPU', 'CRLF', 'CSS', 'CTI', 'DOLAR', 'DOM', 'DS', 'DTCG', 'EAA', 'EACCES', 'EASING', 'EMSE', 'EN', 'ENOTDIR', 'ESM',
  'FIXED',
  'FLOAT', 'FRAME', 'GET', 'GIT', 'GNU', 'GRID', 'GROUP', 'HSL', 'HSV', 'HTML', 'HTTP',
  'HTTPS', 'HUG', 'IA', 'IBM', 'ICDE', 'ID', 'ISO', 'ISWC', 'JND', 'JS', 'JSON', 'JSONL', 'JSPM', 'JSX', 'JWT', 'KER', 'LAPD', 'LF', 'LGPL',
  'LINE', 'LTR', 'MAX', 'MB', 'MCP', 'MD', 'MIN', 'MIT', 'MVP', 'NODE', 'NONE',
  'MSR', 'MUI', 'NPM', 'OAEI', 'OIDC', 'OK', 'OKLAB', 'OKLCH', 'ONNX', 'PAT', 'PATH', 'PDF', 'PNG', 'POLYGON', 'POST', 'PR', 'PUT', 'RAM',
  'RECTANGLE',
  'REST', 'RGAA', 'RGB', 'RTL', 'SDS', 'SET', 'SHA', 'SLDS', 'SLOT', 'SMAT', 'SSH', 'SOLID', 'SPEC', 'STAR', 'STRETCH',
  // `TODO(sujet)` est le marqueur conventionnel d'un point à reprendre, que les
  // éditeurs et `grep` retrouvent. Le sujet entre parenthèses nomme la tâche qui
  // le retirera.
  'STRING', 'SVG', 'TAP', 'TAR', 'TEXT', 'TIMING', 'TODO', 'TS', 'UCM', 'UI', 'URI',
  'TUM', 'URL', 'USD', 'UUID',
  'UTF', 'UX', 'VECTOR', 'VLDB', 'WASM', 'WCAG', 'WCRE', 'WRAP', 'YAML', 'ZIP', 'ELLIPSE', 'AUTO',
  // Les documents du dépôt, cités par leur nom sans extension.
  'AGENTS', 'CONCEPT', 'CONTRIBUTING', 'LICENSE', 'README', 'ROADMAP',
];

/** Un mot entièrement en capitales, hors identifiant et hors mot d'une lettre. */
const CAPITALES = /(?<![A-Za-zÀ-ÿ0-9_/\-.])([A-ZÀ-Þ]{2,})(?![A-Za-zÀ-ÿ0-9_/\-]|\.\w)/g;

/**
 * Les qualificatifs que la skill proscrit tant qu'aucun fait ne les établit.
 *
 * Chaque entrée a été relevée dans le dépôt avant d'entrer ici. La skill en
 * nomme deux que ce contrôle laisse hors de la liste : « complet » dans
 * « l'historique complet », et « de bout en bout » dans « un dessin de bout en
 * bout ». Le dépôt les emploie au sens littéral.
 */
export const INTENSIFICATEURS = [
  'robuste', 'robustes', 'fluide', 'fluides', 'puissant', 'puissante',
  'essentielle', 'essentiels', 'essentielles',
  'précieux', 'précieuse', 'crucial', 'cruciale', 'primordial', 'primordiale',
  'à l’échelle', "à l'échelle", 'dans une logique de',
  'véritable', 'véritablement', 'incontournable', 'élégant', 'élégante',
  'élégance', 'harmonieux', 'sans effort', 'clé en main',
];

/** Ce qui ouvre une opposition décorative en deux temps. */
const OPPOSITION = /n[’']est pas [^.;:!?]{1,90}?,\s*(?:c[’']est|mais bien|mais)\b/gi;

/**
 * Une date posée sur une décision ou sur un constat.
 *
 * `CONTRIBUTING.md` demande qu'un texte décrive l'état actuel : Git date les
 * décisions par construction, et une date recopiée dans un texte ne se met pas
 * à jour quand la décision change. Une date qui appartient à une donnée, comme
 * la version d'API `2022-11-28`, vit dans une chaîne, que le contrôle ne lit
 * pas.
 */
const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre'
  + '|octobre|novembre|décembre';
const DATATION = new RegExp(
  `(\\d{1,2}\\s+(?:${MOIS})\\s+\\d{4})|((?:${MOIS})\\s+20\\d\\d)|(\\d{4}-\\d{2}-\\d{2})`,
  'gi',
);

/**
 * Les motifs refusés dans un fichier comme dans une réponse. Le hook des
 * réponses (`hook-reponse.mjs`) n'applique que cette liste.
 *
 * Chaque entrée porte sa règle, son motif et la phrase qui dit quoi écrire à la
 * place. `parLigne` marque un motif qui n'a de sens qu'en tête de phrase : il se
 * cherche ligne à ligne, parce que le retour à la ligne ouvre une phrase.
 */
const MOT = '(?<![A-Za-zÀ-ÿ0-9_])';
const FIN_DE_MOT = '(?![A-Za-zÀ-ÿ0-9_])';
export const MOTIFS_DE_REFUS_PARTOUT = [
  {
    regle: 'afin-de',
    motif: new RegExp(`${MOT}afin\\s+(?:(?:de|que)${FIN_DE_MOT}|d['’]|qu['’])`, 'gi'),
    message: 'Écrire « pour » ou « pour que » à la place de « afin de » et « afin que ».',
  },
  {
    regle: 'liaison-creuse',
    motif: new RegExp(`${MOT}(?:en effet|en bref|en somme|concrètement|au final)${FIN_DE_MOT}`, 'gi'),
    message: 'Mot de liaison sans fait. Supprimer la phrase si elle ne dit rien d’autre, '
      + 'sinon commencer par son fait.',
  },
  {
    regle: 'formule-de-reponse',
    motif: new RegExp(
      `${MOT}(?:excellente question|bonne question|bonne nouvelle|en résumé|pour résumer`
      + `|n['’]hésit(?:e|ez) pas|le c(?:œ|oe)ur du problème|il est important de|il convient de)${FIN_DE_MOT}`,
      'gi',
    ),
    message: 'Formule d’ouverture, de clôture ou d’emphase. Commencer par la réponse ou le '
      + 'résultat, s’arrêter quand l’information est donnée.',
  },
  {
    regle: 'attaque-enthousiaste',
    motif: /(?:^\s*(?:[-*>]\s+|\d+[.)]\s+)?|[.!?]\s+)(?:parfait|super|génial)\s?[!.,]/gi,
    parLigne: true,
    message: 'Interjection en tête de phrase. Commencer par le fait.',
  },
  {
    regle: 'emoji-de-statut',
    motif: /[✅❌🎉🚀✨👉💡]/gu,
    message: 'Emoji de statut. Écrire le résultat en mots ; un emoji qui est une donnée '
      + 'se cite entre accents graves.',
  },
];

/**
 * Le niveau de chaque motif de signal, selon la catégorie du fichier : `agent`
 * (fichiers lus par les agents), `html` (maquettes), `autre`. `null` écarte le
 * motif de la catégorie. Un motif passe de signal à refus en changeant sa
 * valeur ici, sans toucher à sa détection.
 *
 * La flèche reste un signal partout ; elle deviendra un refus dans les
 * fichiers d'agents une fois leurs flèches converties en verbes.
 */
export const NIVEAUX_DES_SIGNAUX = {
  'permet-de': { agent: 'signal', html: 'signal', autre: 'signal' },
  'opposition-deux-points': { agent: 'signal', html: 'signal', autre: 'signal' },
  'deux-points-multiples': { agent: null, html: null, autre: 'signal' },
  fleche: { agent: 'signal', html: 'signal', autre: 'signal' },
};

const PERMET_DE = new RegExp(`${MOT}permet(?:tent)?\\s+(?:de${FIN_DE_MOT}|d['’])`, 'gi');
const OPPOSITION_A_DEUX_POINTS = /\b(?:ne|n['’])\s?[^.:;!?]{0,80}?\b(?:pas|plus|jamais|rien)\b[^.:;!?]{0,80}?\s:\s+(?:il|elle|ils|elles|on|c['’]est|ce|celui|celle|cela)\b/gi;

/** Les fichiers lus par les agents. */
export function estFichierAgent(chemin) {
  return /^(?:AGENTS|CLAUDE|CARTE)\.md$/.test(chemin)
    || /^packages\/[^/]+\/(?:AGENTS|CLAUDE|CARTE)\.md$/.test(chemin)
    || /^packages\/[^/]+\/invariants\/[^/]+\.md$/.test(chemin)
    || chemin.startsWith('.agents/')
    || chemin.startsWith('.claude/');
}

/** `agent`, `html` ou `autre` : la catégorie qui fixe le niveau des signaux. */
export function categorieDuFichier(chemin) {
  if (chemin.endsWith('.html')) return 'html';
  return estFichierAgent(chemin) ? 'agent' : 'autre';
}

/** Les chaînes de `packages/<paquet>/src/i18n/fr.ts` se contrôlent comme du texte. */
const TEXTES_FRANCAIS = /^packages\/[^/]+\/src\/i18n\/fr\.ts$/;

/** Les extensions que le contrôle juge. */
export const EXTENSIONS_CONTROLEES = /\.(md|ts|tsx|mjs|cjs|html)$/;

/**
 * Fichiers suivis par Git, en chemins relatifs à séparateur `/`. Git liste
 * encore un fichier supprimé tant que sa suppression n'est pas commitée. Le
 * fichier sort alors de la liste.
 */
export function fichiersSuivis() {
  const sortie = execFileSync('git', ['ls-files'], { cwd: racine, encoding: 'utf8' });
  return sortie.split(/\r?\n/).filter(Boolean).filter((fichier) => fs.existsSync(path.join(racine, fichier)));
}

/**
 * Les lignes d'un document soumises aux règles, code et tableaux écartés.
 *
 * Un titre est la cible d'un lien et une cellule de tableau n'a pas la place
 * d'une ponctuation courante : les deux gardent le droit au tiret cadratin. Les
 * fragments entre accents graves sortent, sinon un nom de champ passerait pour
 * une emphase.
 */
export function lignesDeProse(contenu) {
  const gardees = [];
  let dansUnBloc = false;
  contenu.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc) return;
    if (ligne.startsWith('#') || ligne.startsWith('|')) return;

    gardees.push({ numero: index + 1, texte: ligne.replace(/`[^`\n]*`/g, '') });
  });
  return gardees;
}

/**
 * Les commentaires d'une source, groupés en blocs et rendus ligne par ligne.
 *
 * Le scanner avance caractère par caractère pour ne pas prendre un `//` écrit
 * dans une chaîne pour un commentaire. Il ne reconnaît pas les littéraux
 * d'expression régulière ; le dépôt n'en écrit aucun qui contienne `//` ou
 * `/*`, et un tel littéral ouvrirait un commentaire fantôme.
 *
 * Chaque bloc porte sa ligne de départ, sa taille en caractères et son texte
 * débarrassé des marqueurs, des accents graves et des adresses. Sans ce
 * nettoyage, un `http://` ou un nom de champ deviendrait une faute.
 */
export function blocsDeCommentaire(contenu) {
  const lignes = contenu.split(/\r?\n/);
  const decalages = [];
  let position = 0;
  for (const ligne of lignes) {
    decalages.push(position);
    position += ligne.length + 1;
  }
  const ligneDe = (index) => {
    let numero = 1;
    while (numero < decalages.length && decalages[numero] <= index) numero += 1;
    return numero;
  };

  const blocs = [];
  let courant = null;
  let i = 0;

  const fermer = () => {
    if (courant !== null) {
      blocs.push(courant);
      courant = null;
    }
  };

  while (i < contenu.length) {
    const c = contenu[i];
    const suivant = contenu[i + 1];

    if (c === '"' || c === "'" || c === '`') {
      fermer();
      const ouvrant = c;
      i += 1;
      while (i < contenu.length) {
        if (contenu[i] === '\\') i += 2;
        else if (contenu[i] === ouvrant) { i += 1; break; }
        else i += 1;
      }
      continue;
    }

    if (c === '/' && suivant === '*') {
      fermer();
      const fin = contenu.indexOf('*/', i + 2);
      const arret = fin === -1 ? contenu.length : fin + 2;
      blocs.push({
        numero: ligneDe(i), debut: i, fin: arret, taille: arret - i, brut: contenu.slice(i, arret),
      });
      i = arret;
      continue;
    }

    if (c === '/' && suivant === '/') {
      let fin = contenu.indexOf('\n', i);
      if (fin === -1) fin = contenu.length;
      const brut = contenu.slice(i, fin);
      if (courant === null) courant = { numero: ligneDe(i), debut: i, fin, taille: brut.length, brut };
      else {
        courant.taille += brut.length;
        courant.fin = fin;
        courant.brut += `\n${brut}`;
      }
      i = fin;
      continue;
    }

    if (c === '\n') {
      let j = i + 1;
      while (j < contenu.length && (contenu[j] === ' ' || contenu[j] === '\t')) j += 1;
      if (!(contenu[j] === '/' && contenu[j + 1] === '/')) fermer();
      i = j;
      continue;
    }

    if (c !== ' ' && c !== '\t' && c !== '\r') fermer();
    i += 1;
  }

  fermer();
  return blocs.map((bloc) => ({ ...bloc, lignes: lignesDuBloc(bloc) }));
}

/** Découpe un bloc en lignes de prose, marqueurs et code cités retirés. */
function lignesDuBloc(bloc) {
  const depart = bloc.numero;
  return bloc.brut.split('\n').map((ligne, index) => ({
    numero: depart + index,
    texte: ligne
      .replace(/^\s*\/\*+/, '')
      .replace(/\*+\/\s*$/, '')
      .replace(/^\s*\*(?!\/)/, '')
      .replace(/^\s*\/\//, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/`[^`\n]*`/g, ''),
  }));
}

/**
 * Retire ce qui est cité entre guillemets, en suivant les citations sur
 * plusieurs lignes.
 *
 * `CONTRIBUTING.md` et la skill nomment les tournures qu'elles proscrivent, et
 * les nomment entre guillemets. Sans cette coupe, le contrôle refuserait le
 * texte qui écrit la règle, ce qui est le plus court chemin vers un contrôle
 * désarmé. La coupe ne vaut que pour les trois règles qui portent sur un mot
 * employé : citer « MÊME » en capitales reste une emphase.
 */
function sansCitations(lignes) {
  let dedans = false;
  return lignes.map(({ numero, texte }) => {
    let sortie = '';
    for (const caractere of texte) {
      if (caractere === '«') { dedans = true; continue; }
      if (caractere === '»') { dedans = false; continue; }
      if (!dedans) sortie += caractere;
    }
    return { numero, texte: sortie };
  });
}

/**
 * Le texte des lignes mises bout à bout, avec de quoi retrouver la ligne
 * d'origine d'une position.
 */
function jointe(lignes) {
  const debuts = [];
  let position = 0;
  for (const { texte, numero } of lignes) {
    debuts.push({ debut: position, numero });
    position += texte.length + 1;
  }
  const ligneDe = (index) => {
    let trouve = debuts[0] ? debuts[0].numero : 1;
    for (const entree of debuts) {
      if (entree.debut > index) break;
      trouve = entree.numero;
    }
    return trouve;
  };
  return { joint: lignes.map(({ texte }) => texte).join(' '), ligneDe };
}

const autourDe = (joint, index) => joint.slice(Math.max(0, index - 40), index + 90).trim();

/**
 * Les fautes des motifs refusés partout, sur des lignes dont code et citations
 * sont déjà retirés. Le hook des réponses les appelle seules.
 */
export function fautesDeRefusPartout(chemin, lignes) {
  const fautes = [];
  const { joint, ligneDe } = jointe(lignes);
  for (const { regle, motif, parLigne } of MOTIFS_DE_REFUS_PARTOUT) {
    if (parLigne) {
      for (const { numero, texte } of lignes) {
        for (const trouve of texte.matchAll(motif)) {
          fautes.push({
            regle, niveau: 'refus', ou: `${chemin}:${numero}`,
            extrait: `« ${trouve[0].trim()} » dans : ${texte.trim().slice(0, 130)}`,
          });
        }
      }
      continue;
    }
    for (const trouve of joint.matchAll(motif)) {
      fautes.push({
        regle, niveau: 'refus', ou: `${chemin}:${ligneDe(trouve.index)}`,
        extrait: `« ${trouve[0]} » dans : ${autourDe(joint, trouve.index)}`,
      });
    }
  }
  return fautes;
}

/**
 * Découpe des lignes de prose en paragraphes : une ligne vide, une puce ou un
 * saut de numérotation (code, titre ou tableau écartés) en ouvre un nouveau.
 */
function paragraphesDe(lignes) {
  const paragraphes = [];
  let courant = null;
  for (const { numero, texte } of lignes) {
    const net = texte.trim();
    if (net === '') { courant = null; continue; }
    const puce = /^(?:[-*+]|\d+[.)])\s/.test(net);
    if (courant === null || puce || numero !== courant.dernier + 1) {
      courant = { texte: '', debuts: [], dernier: numero };
      paragraphes.push(courant);
    }
    courant.debuts.push({ debut: courant.texte === '' ? 0 : courant.texte.length + 1, numero });
    courant.texte += (courant.texte === '' ? '' : ' ') + net;
    courant.dernier = numero;
  }
  return paragraphes;
}

/** Les signaux d'une suite de lignes, selon la catégorie du fichier. */
function signauxDesLignes(chemin, categorie, lignes) {
  const fautes = [];
  const niveauDe = (regle) => NIVEAUX_DES_SIGNAUX[regle][categorie] ?? null;
  const signaler = (regle, paragraphe, index, phrase) => {
    const niveau = niveauDe(regle);
    if (niveau === null) return;
    let numero = paragraphe.debuts[0].numero;
    for (const entree of paragraphe.debuts) {
      if (entree.debut > index) break;
      numero = entree.numero;
    }
    fautes.push({ regle, niveau, ou: `${chemin}:${numero}`, extrait: phrase.trim().slice(0, 160) });
  };

  for (const paragraphe of paragraphesDe(lignes)) {
    for (const phrase of paragraphe.texte.matchAll(/\S[^]*?(?:[.!?](?=\s|$)|$)/g)) {
      const texte = phrase[0];
      const index = phrase.index;
      if (new RegExp(PERMET_DE).test(texte)) signaler('permet-de', paragraphe, index, texte);
      if (new RegExp(OPPOSITION_A_DEUX_POINTS).test(texte)) signaler('opposition-deux-points', paragraphe, index, texte);
      if ((texte.match(/\s:(?=\s)/g) ?? []).length >= 2) signaler('deux-points-multiples', paragraphe, index, texte);
      if (texte.includes('→')) signaler('fleche', paragraphe, index, texte);
    }
  }
  return fautes;
}

/**
 * Les fautes d'une suite de lignes, la même quelle que soit leur provenance.
 *
 * Deux passes, parce que deux formes ne se lisent pas à la même échelle. Le
 * tiret cadratin et la capitale tiennent dans un mot, donc dans une ligne. La
 * date, le qualificatif de plusieurs mots et l'opposition en deux temps
 * traversent le retour à la ligne : un contrôle ligne à ligne les laissait
 * passer dès qu'un paragraphe se coupait au milieu, ce que l'épreuve a montré.
 * Les motifs refusés partout et les signaux se jugent ensuite sur le texte
 * sans citations.
 */
function fautesDesLignes(chemin, lignes) {
  const fautes = [];
  const intensificateur = new RegExp(
    `(?<![A-Za-zÀ-ÿ0-9_])(${INTENSIFICATEURS.join('|')})(?![A-Za-zÀ-ÿ0-9_])`,
    'gi',
  );

  for (const { numero, texte } of lignes) {
    const ou = `${chemin}:${numero}`;
    const extrait = texte.trim();

    if (texte.includes(TIRET_CADRATIN)) {
      fautes.push({ regle: 'tiret-cadratin', niveau: 'refus', ou, extrait });
    }
    for (const trouve of texte.matchAll(CAPITALES)) {
      if (ACRONYMES.includes(trouve[1])) continue;
      fautes.push({ regle: 'emphase', niveau: 'refus', ou, extrait: `« ${trouve[1]} » dans : ${extrait}` });
    }
  }

  const citees = sansCitations(lignes);
  const { joint, ligneDe } = jointe(citees);

  for (const [regle, motif] of [
    ['intensificateur', intensificateur],
    ['opposition', OPPOSITION],
    ['datation', DATATION],
  ]) {
    for (const trouve of joint.matchAll(motif)) {
      fautes.push({
        regle,
        niveau: 'refus',
        ou: `${chemin}:${ligneDe(trouve.index)}`,
        extrait: `« ${trouve[1] ?? trouve[0]} » dans : ${autourDe(joint, trouve.index)}`,
      });
    }
  }

  fautes.push(...fautesDeRefusPartout(chemin, citees));
  fautes.push(...signauxDesLignes(chemin, categorieDuFichier(chemin), citees));
  return fautes;
}

/** Les fautes d'un document Markdown. */
export function fautesDuDocument(chemin, contenu) {
  return fautesDesLignes(chemin, lignesDeProse(contenu));
}

const ENTITES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", laquo: '«', raquo: '»',
  mdash: '—', ndash: '–', rarr: '→', larr: '←', hellip: '…', middot: '·', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', times: '×', check: '✓',
};

/**
 * Le texte lu d'une maquette : sans `<script>`, `<style>`, `<svg>`, `<code>`,
 * `<pre>` ni commentaires, sans balises, entités courantes décodées. Chaque
 * suppression garde ses retours à la ligne, pour que les numéros de ligne
 * restent ceux du fichier.
 */
export function lignesDuHtml(contenu) {
  const gardeLesLignes = (morceau) => morceau.replace(/[^\n]/g, '');
  const texte = contenu
    .replace(/<!--[\s\S]*?-->/g, gardeLesLignes)
    .replace(/<(script|style|svg|code|pre|textarea)\b[\s\S]*?<\/\1\s*>/gi, gardeLesLignes)
    .replace(/<\/?(?:b|i|em|strong|span|a|small|sup|sub|mark|u|abbr|kbd|s|cite)\b[^>]*>/gi, gardeLesLignes)
    .replace(/<\/?[A-Za-z][^>]*>/g, (balise) => ` ${gardeLesLignes(balise)}`)
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entite, nom) => {
      if (nom.startsWith('#x') || nom.startsWith('#X')) return String.fromCodePoint(parseInt(nom.slice(2), 16));
      if (nom.startsWith('#')) return String.fromCodePoint(Number(nom.slice(1)));
      return ENTITES[nom.toLowerCase()] ?? entite;
    });
  return texte.split(/\r?\n/).map((ligne, index) => ({
    numero: index + 1,
    texte: ligne.replace(/\s+/g, ' ').replace(/`[^`\n]*`/g, '').trim(),
  }));
}

/**
 * Le texte des chaînes d'une source, une chaîne par suite de lignes, séparée
 * de la suivante par une ligne vide. Les commentaires sont sautés, les
 * expressions `${…}` d'un gabarit retirées.
 */
export function lignesDesChaines(contenu) {
  const sortie = [];
  let ligne = 1;
  let i = 0;
  while (i < contenu.length) {
    const c = contenu[i];
    const suivant = contenu[i + 1];
    if (c === '\n') { ligne += 1; i += 1; continue; }
    if (c === '/' && suivant === '/') {
      const fin = contenu.indexOf('\n', i);
      i = fin === -1 ? contenu.length : fin;
      continue;
    }
    if (c === '/' && suivant === '*') {
      const fin = contenu.indexOf('*/', i + 2);
      const arret = fin === -1 ? contenu.length : fin + 2;
      ligne += (contenu.slice(i, arret).match(/\n/g) ?? []).length;
      i = arret;
      continue;
    }
    if (c !== '"' && c !== "'" && c !== '`') { i += 1; continue; }

    const ouvrant = c;
    const depart = ligne;
    let texte = '';
    i += 1;
    while (i < contenu.length) {
      const ch = contenu[i];
      if (ch === '\\') {
        const echappe = contenu[i + 1] ?? '';
        if (echappe === 'u') { texte += ' '; i += 6; continue; }
        if (echappe === 'n') texte += '\n';
        else if (echappe !== '\n') texte += echappe;
        else ligne += 1;
        i += 2;
        continue;
      }
      if (ch === ouvrant) { i += 1; break; }
      if (ch === '\n') ligne += 1;
      texte += ch;
      i += 1;
    }
    if (ouvrant === '`') texte = texte.replace(/\$\{[^}]*\}/g, '');
    texte.split('\n').forEach((morceau, rang) => {
      sortie.push({ numero: depart + rang, texte: morceau.replace(/`[^`\n]*`/g, '') });
    });
    sortie.push({ numero: ligne, texte: '' });
  }
  return sortie;
}

/** Les fautes des commentaires d'une source, et des chaînes d'un `fr.ts`. */
export function fautesDeLaSource(chemin, contenu) {
  const lignes = blocsDeCommentaire(contenu).flatMap((bloc) => bloc.lignes);
  if (TEXTES_FRANCAIS.test(chemin)) {
    const tout = [...lignes, ...lignesDesChaines(contenu)];
    tout.sort((a, b) => a.numero - b.numero);
    return fautesDesLignes(chemin, tout);
  }
  return fautesDesLignes(chemin, lignes);
}

/** Les fautes d'une maquette HTML. */
export function fautesDuHtml(chemin, contenu) {
  return fautesDesLignes(chemin, lignesDuHtml(contenu));
}

/** Les fichiers que le contrôle sait juger, et le juge qui leur convient. */
export function fautesDuFichier(chemin, contenu) {
  if (chemin.endsWith('.md')) return fautesDuDocument(chemin, contenu);
  if (chemin.endsWith('.html')) return fautesDuHtml(chemin, contenu);
  if (/\.(ts|tsx|mjs|cjs|js)$/.test(chemin)) return fautesDeLaSource(chemin, contenu);
  return [];
}

/** Ce que le contrôle ignore : dépendances, fixtures figées, notes de travail. */
export function horsPerimetre(chemin) {
  return chemin.includes('node_modules/')
    || chemin.includes('/dist/')
    || /(^|\/)fixtures\//.test(chemin);
}

/**
 * Les fichiers que le contrôle de tout le dépôt laisse de côté, chacun avec sa
 * raison. Un contrôle sur un fichier nommé les juge quand même, et le hook
 * d'écriture aussi. `chemin` nomme un fichier ; `prefixe` et `extension`
 * ensemble nomment les fichiers d'une extension sous un dossier.
 *
 * Chaque entrée est une dette à rendre : le fichier doit y entrer de nouveau
 * dès que sa raison tombe.
 */
export const EXCLUS_DU_CONTROLE = [
  {
    prefixe: 'docs/notes/Archives/',
    extension: '.html',
    raison: 'Archives figées : les maquettes HTML y gardent leurs tournures d’origine '
      + '(« en bref », « FORMAT », dates de gel).',
  },
  {
    chemin: 'docs/notes/Archives/Guide des agents/CONVENTION-ECRITURE-AGENTS.md',
    raison: 'Archive figée : « en effet » y est cité dans la liste des transitions à retirer.',
  },
  {
    prefixe: 'docs/references/analyses/',
    extension: '.html',
    raison: 'Pages générées depuis le JSON du guide par la skill guide-composant : les dates '
      + '« Lue le » et le tiret des cellules vides sont des données, qu’une retouche à la main '
      + 'perdrait à la régénération.',
  },
  {
    chemin: 'packages/plugin-palettes/CARTE.md',
    raison: 'Fichier en cours de modification par une autre session ; ligne 95, « en résumé » '
      + 'décrit un affichage résumé de l’interface, au sens littéral.',
  },
  {
    chemin: 'packages/plugin-palettes/src/i18n/fr.ts',
    raison: 'Fichier en cours de modification par une autre session ; lignes 186 et 1138, '
      + '« NFD » est un nom de normalisation Unicode en capitales ; ligne 1663, '
      + '« — » est la valeur d’un état vide, une donnée.',
  },
];

/** Vrai si le contrôle de tout le dépôt saute ce fichier. */
export function estExclu(chemin) {
  return EXCLUS_DU_CONTROLE.some(({ chemin: exclu, prefixe, extension }) => chemin === exclu
    || (prefixe !== undefined && chemin.startsWith(prefixe)
      && (extension === undefined || chemin.endsWith(extension))));
}

/** Les fichiers que le contrôle de tout le dépôt juge, en chemins relatifs. */
export function fichiersAControler() {
  return fichiersSuivis()
    .filter((chemin) => !horsPerimetre(chemin) && !estExclu(chemin))
    .filter((chemin) => EXTENSIONS_CONTROLEES.test(chemin));
}

/**
 * Les fichiers de `packages/<paquet>/<sousDossier>` que `accepte` retient,
 * relevés sur le disque, en chemins relatifs à séparateur `/`.
 */
function fichiersDesPaquets(sousDossier, accepte) {
  const dossier = path.join(racine, 'packages');
  if (!fs.existsSync(dossier)) return [];
  const trouves = [];
  for (const paquet of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (!paquet.isDirectory()) continue;
    const dedans = path.join(dossier, paquet.name, sousDossier);
    if (!fs.existsSync(dedans)) continue;
    for (const fichier of fs.readdirSync(dedans, { withFileTypes: true })) {
      if (fichier.isFile() && accepte(fichier.name)) {
        trouves.push(['packages', paquet.name, sousDossier, fichier.name].filter(Boolean).join('/'));
      }
    }
  }
  return trouves.sort();
}

/**
 * Les documents d'autorité, au sens de la table « Où vit quelle règle ».
 *
 * Le contrôle de re-narration ne porte que sur eux. Un `README` de paquet en
 * est écarté parce qu'il est publié seul sur npm et doit se suffire, et une
 * note de travail parce qu'elle ne fait autorité sur rien. Les fichiers
 * d'invariants, les `AGENTS.md` de paquet et `CARTE.md` à la racine en sont :
 * ils se relèvent sur le disque, pour qu'un paquet ou un groupe ajouté entre
 * sans qu'on édite cette liste.
 */
export const AUTORITES = [
  'CONCEPT.md',
  'README.md',
  'AGENTS.md',
  'CARTE.md',
  'CONTRIBUTING.md',
  'ROADMAP.md',
  'docs/README.md',
  'docs/format/FORMAT.md',
  'docs/format/COMPATIBILITE.md',
  'docs/format/CHANGELOG-FORMAT.md',
  'docs/guides/POUR-LES-DESIGNERS.md',
  'docs/guides/RECETTE.md',
  'packages/plugin-exporter/SPEC.md',
  ...fichiersDesPaquets('', (nom) => nom === 'AGENTS.md'),
  ...fichiersDesPaquets('invariants', (nom) => nom.endsWith('.md')),
];

/**
 * Longueur, en mots, d'un passage recopié qui n'est plus une mention.
 *
 * `CONTRIBUTING.md` autorise une mention d'une phrase à une autre altitude, et
 * refuse la seconde narration. Vingt-cinq mots consécutifs identiques passent
 * la phrase : à ce point, le texte n'est plus mentionné, il est recopié.
 */
export const MOTS_RECOPIES = 25;

/** Réduit un texte à sa suite de mots, avec la ligne d'où chacun vient. */
function motsAvecLigne(contenu) {
  const suite = [];
  let dansUnBloc = false;
  contenu.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc || ligne.startsWith('#') || ligne.trimStart().startsWith('|')) return;
    const mots = ligne
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (mots === '') return;
    for (const mot of mots.split(' ')) suite.push({ mot, numero: index + 1 });
  });
  return suite;
}

/**
 * Les passages qu'un document d'autorité recopie d'un autre.
 *
 * Le repérage est une empreinte de n-grammes : chaque fenêtre de
 * `MOTS_RECOPIES` mots normalisés sert de clé, et une clé présente dans deux
 * documents est un passage recopié. Le contrôle est déterministe, il ne juge
 * aucun contenu neuf, et du remplissage ne le fait pas passer.
 *
 * `documents` associe un chemin à son contenu.
 */
export function passagesRecopies(documents) {
  const empreintes = new Map();
  for (const [chemin, contenu] of Object.entries(documents)) {
    const suite = motsAvecLigne(contenu);
    for (let i = 0; i + MOTS_RECOPIES <= suite.length; i += 1) {
      const fenetre = suite.slice(i, i + MOTS_RECOPIES);
      const cle = fenetre.map((entree) => entree.mot).join(' ');
      if (!empreintes.has(cle)) empreintes.set(cle, []);
      empreintes.get(cle).push({ chemin, numero: fenetre[0].numero });
    }
  }

  // Un passage plus long que la fenêtre se retrouve dans chaque fenêtre qui le
  // recouvre. Seule la première est gardée : sans cette fusion, un paragraphe
  // recopié se lirait comme quarante fautes.
  const trouves = [];
  for (const [cle, places] of empreintes) {
    const documentsDistincts = new Set(places.map((place) => place.chemin));
    if (documentsDistincts.size < 2) continue;

    const memePassage = trouves.some((garde) => garde.places.length === places.length
      && garde.places.every((precedent, rang) => precedent.chemin === places[rang].chemin
        && places[rang].numero - precedent.numero <= 4));
    if (memePassage) continue;
    trouves.push({ places, passage: cle });
  }
  return trouves;
}

const MESSAGES = {
  ...Object.fromEntries(MOTIFS_DE_REFUS_PARTOUT.map(({ regle, message }) => [regle, message])),
  'permet-de': 'Verbe vide. Nommer ce que fait le sujet : « le hook relit le fichier » '
    + 'plutôt que « le hook permet de relire le fichier ».',
  'opposition-deux-points': 'Opposition annoncée par ce qui n’est pas, puis deux-points. '
    + 'Écrire la règle seule.',
  'deux-points-multiples': 'Deux deux-points dans une phrase. Réserver les deux-points '
    + 'à l’annonce d’une liste ou d’une citation.',
  fleche: 'Flèche dans une phrase. Écrire le verbe : « devient », « produit », « renvoie à ».',
  'tiret-cadratin': 'Tiret cadratin employé comme incise. Employer un point, un '
    + 'point-virgule, une virgule, deux points ou une parenthèse. Il reste admis '
    + 'dans un titre et dans une cellule de tableau.',
  emphase: 'Mot mis en capitales pour insister. Le gras fait le même travail '
    + 'dans un document, et rien n’est nécessaire dans un commentaire. Si le mot '
    + 'est un sigle, un type de l’API Figma ou un nom de document, l’ajouter à '
    + 'ACRONYMES dans le même commit.',
  intensificateur: 'Qualificatif que rien n’établit. Écrire le mécanisme observé '
    + 'ou la mesure, ou retirer le mot.',
  opposition: 'Opposition décorative en deux temps. Écrire la règle seule, sans '
    + 'la faire précéder de ce qu’elle n’est pas.',
  datation: 'Date posée sur une décision ou sur un constat. Écrire l’état '
    + 'actuel ; Git date les décisions par construction, et une date recopiée '
    + 'ne se met pas à jour quand la décision change.',
  renarration: 'Passage recopié d’un autre document d’autorité. Une mention '
    + 'd’une phrase à une autre altitude est admise ; une seconde narration ne '
    + 'l’est pas. Garder la narration à l’altitude que la table « Où vit quelle '
    + 'règle » désigne, et renvoyer depuis l’autre.',
};

export function messageDeLaRegle(regle) {
  return MESSAGES[regle] ?? regle;
}

/** Rend les fautes groupées par règle, prêtes à imprimer. */
export function rapport(fautes) {
  const parRegle = new Map();
  for (const faute of fautes) {
    if (!parRegle.has(faute.regle)) parRegle.set(faute.regle, []);
    parRegle.get(faute.regle).push(faute);
  }
  const lignes = [];
  for (const [regle, liste] of parRegle) {
    lignes.push(`${regle} (${liste.length}) : ${messageDeLaRegle(regle)}`);
    for (const faute of liste) lignes.push(`  ${faute.ou} ${faute.extrait}`);
    lignes.push('');
  }
  return lignes.join('\n');
}

/**
 * Les passages d'un texte de réponse que les motifs refusés partout rejettent.
 * Les blocs de code, le code entre accents graves et les citations entre « »
 * sont retirés d'abord ; aucune autre règle ne s'applique.
 */
export function fautesDeReponse(texte) {
  const lignes = [];
  let dansUnBloc = false;
  texte.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc) return;
    lignes.push({ numero: index + 1, texte: ligne.replace(/`[^`\n]*`/g, '') });
  });
  return fautesDeRefusPartout('réponse', sansCitations(lignes));
}

/** Compte les fautes par règle, pour l'impression des signaux. */
function comptes(fautes) {
  const parRegle = new Map();
  for (const { regle } of fautes) parRegle.set(regle, (parRegle.get(regle) ?? 0) + 1);
  return [...parRegle].map(([regle, nombre]) => `  ${regle} : ${nombre}`).join('\n');
}

const lanceDirectement = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (lanceDirectement) {
  const arguments_ = process.argv.slice(2);
  const detail = arguments_.includes('--detail');
  const demandes = arguments_.filter((argument) => argument !== '--detail');
  const chemins = (demandes.length > 0
    ? demandes.map((brut) => path.relative(racine, path.resolve(brut)).split(path.sep).join('/'))
    : fichiersAControler()).filter((chemin) => !horsPerimetre(chemin));

  const toutes = [];
  for (const chemin of chemins) {
    const complet = path.join(racine, chemin);
    if (!fs.existsSync(complet) || fs.statSync(complet).isDirectory()) continue;
    toutes.push(...fautesDuFichier(chemin, fs.readFileSync(complet, 'utf8')));
  }
  const fautes = toutes.filter((faute) => faute.niveau === 'refus');
  const signaux = toutes.filter((faute) => faute.niveau === 'signal');

  // La re-narration se juge entre documents, donc seulement quand le contrôle
  // les tient tous. Sur un fichier isolé, comme lors d'une écriture, la
  // comparaison n'aurait rien à comparer.
  if (chemins.filter((chemin) => AUTORITES.includes(chemin)).length === AUTORITES.length) {
    const documents = Object.fromEntries(
      AUTORITES.map((chemin) => [chemin, fs.readFileSync(path.join(racine, chemin), 'utf8')]),
    );
    for (const trouve of passagesRecopies(documents)) {
      fautes.push({
        regle: 'renarration',
        niveau: 'refus',
        ou: trouve.places.map((place) => `${place.chemin}:${place.numero}`).join(' et '),
        extrait: `« ${trouve.passage} »`,
      });
    }
  }

  if (signaux.length > 0) {
    process.stdout.write(`${signaux.length} signal(aux) à revoir, sans refus :\n${comptes(signaux)}\n`);
    if (detail) process.stdout.write(`\n${rapport(signaux)}\n`);
  }
  if (fautes.length > 0) {
    process.stderr.write(`${rapport(fautes)}\n${fautes.length} faute(s) de style.\n`);
    process.exit(1);
  }
  process.stdout.write('Style conforme.\n');
}
