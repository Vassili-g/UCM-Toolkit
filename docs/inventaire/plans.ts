/**
 * Lecture d'un plan Markdown : ses lots (les cases de premier niveau), leurs marques, l'état du plan et le lot suivant.
 * Module pur, sans lecture de fichier ni appel à Git : l'appelant fournit le texte et la date d'un commit.
 *
 * Une case indentée est une sous-étape de son lot, une case dans un bloc de code est un exemple : aucune ne compte.
 */

export interface HashDuLot { depot: string | null; hash: string }

export type MarqueDuLot = 'mainteneur' | { attend: string } | null;

export interface Lot {
  /** Texte du dernier titre `##` avant la case, sans son numéro de tête. */
  groupe: string;
  numero: string;
  fait: boolean;
  hashes: HashDuLot[];
  marque: MarqueDuLot;
  /** Première phrase du lot, sans nom d'agent ni lien, coupée à 90 caractères. */
  texte: string;
}

const HASH = /^[0-9a-f]{7,40}$/i;
const HASH_DE_DEPOT = /^([\w.-]+)@([0-9a-f]{7,40})$/i;
const ATTEND = /^attend (P\d+)$/;
const NOMS_D_AGENT = ['implementeur-exigeant', 'implementeur', 'executant', 'verificateur', 'Conversation principale', 'Décision du mainteneur'];
const AGENT_DE_TETE = new RegExp(`^\`?(?:${NOMS_D_AGENT.join('|')})\`?(?![\\w-])`);
const LONGUEUR_MAX = 90;

function groupeDuTitre(titre: string): string {
  return titre.replace(/^\d+(?:\.\d+)*\.?\s+/, '').trim();
}

function texteDuLot(reste: string): string {
  let texte = reste.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^[\s.,:]+/, '');
  for (let precedent = ''; precedent !== texte;) {
    precedent = texte;
    texte = texte.replace(AGENT_DE_TETE, '').replace(/^[\s.,:]+/, '');
  }
  const phrase = /^(.*?[.!?])(?:\s|$)/.exec(texte)?.[1] ?? texte;
  const propre = phrase.trim();
  return propre.length > LONGUEUR_MAX ? `${propre.slice(0, LONGUEUR_MAX - 1).trimEnd()}…` : propre;
}

function marquesDeLaParenthese(contenu: string): { hashes: HashDuLot[]; marque: MarqueDuLot } {
  const hashes: HashDuLot[] = [];
  let marque: MarqueDuLot = null;
  for (const morceau of contenu.split(',').map((m) => m.trim())) {
    const deDepot = HASH_DE_DEPOT.exec(morceau);
    const attend = ATTEND.exec(morceau);
    if (HASH.test(morceau)) hashes.push({ depot: null, hash: morceau });
    else if (deDepot) hashes.push({ depot: deDepot[1], hash: deDepot[2] });
    else if (morceau === 'mainteneur') marque ??= 'mainteneur';
    else if (attend) marque ??= { attend: attend[1] };
  }
  return { hashes, marque };
}

/** `Commit : \`hash\`` en fin de case : un ou plusieurs hash entre accents graves. `…` ou un autre texte n'en donne aucun. */
function hashesDeLaFin(fin: string): HashDuLot[] {
  const hashes: HashDuLot[] = [];
  for (const [, contenu] of fin.matchAll(/`([^`]*)`/g)) {
    for (const morceau of contenu.split(',').map((m) => m.trim())) {
      const deDepot = HASH_DE_DEPOT.exec(morceau);
      if (HASH.test(morceau)) hashes.push({ depot: null, hash: morceau });
      else if (deDepot) hashes.push({ depot: deDepot[1], hash: deDepot[2] });
    }
  }
  return hashes;
}

export function lireLePlan(texte: string): Lot[] {
  const lots: Lot[] = [];
  let groupe = '';
  let dansUnBloc = false;
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(ligne)) { dansUnBloc = !dansUnBloc; continue; }
    if (dansUnBloc) continue;
    const titre = /^## (.*)$/.exec(ligne);
    if (titre) { groupe = groupeDuTitre(titre[1]); continue; }
    const caseCochee = /^[-*+] \[([ xX])\]\s*(.*)$/.exec(ligne);
    if (!caseCochee) continue;
    const mot = /^(\S+)\s*(.*)$/.exec(caseCochee[2]);
    const numero = (mot?.[1] ?? '').replace(/\.$/, '');
    const parenthese = /^\(([^)]*)\)(.*)$/.exec(mot?.[2] ?? '');
    const { hashes, marque } = marquesDeLaParenthese(parenthese?.[1] ?? '');
    const reste = parenthese ? parenthese[2] : (mot?.[2] ?? '');
    const commit = /Commit :\s*(.*)$/.exec(reste);
    if (commit) hashes.push(...hashesDeLaFin(commit[1]));
    lots.push({
      groupe,
      numero,
      fait: caseCochee[1] !== ' ',
      hashes,
      marque,
      texte: texteDuLot(commit ? reste.slice(0, commit.index) : reste),
    });
  }
  return lots;
}

export function etatDuPlan(lots: Lot[]): { faits: number; total: number; livre: boolean } {
  const faits = lots.filter((lot) => lot.fait).length;
  return { faits, total: lots.length, livre: lots.length > 0 && faits === lots.length };
}

/** Le premier lot à faire que ni le mainteneur ni un autre plan ne retient. */
export function lotSuivant(lots: Lot[]): Lot | null {
  return lots.find((lot) => !lot.fait && lot.marque === null) ?? null;
}

/** La date la plus récente (ISO, comparée comme du texte) des commits locaux des lots faits. */
export function dateDuDernierLot(lots: Lot[], dateDuCommit: (hash: string) => string | null): string | null {
  let derniere: string | null = null;
  for (const lot of lots) {
    if (!lot.fait) continue;
    for (const { depot, hash } of lot.hashes) {
      if (depot !== null) continue;
      const date = dateDuCommit(hash);
      if (date !== null && (derniere === null || date > derniere)) derniere = date;
    }
  }
  return derniere;
}
