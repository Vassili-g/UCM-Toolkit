/**
 * Les paires d'octets que les opérateurs de seuil posent : la plus proche d'un seuil au-dessus et au-dessous pour un fond donné
 * (S1, S2, S3, G1, G2), et les compositions que deux ordres d'arrondi jugent différemment (O6). La recherche ne parcourt pas les
 * 16 777 216 couleurs : pour chaque couple (rouge, vert) elle cherche le bleu par dichotomie sur la table de luminance, puis
 * mesure ses voisins avec l'oracle.
 *
 * Une paire à moins de `MARGE` d'un seuil est refusée : les deux règles de comparaison (doubles, dix décimales) pourraient s'y séparer.
 */
import { mulberry32 } from '../commun/prng.js';
import {
  TABLE_SRGB, couleurDeOctets, estFragile, hexDe, luminanceDe, mesurerLaPaire, octetsDeHex, rapportDeContraste, type Couleur, type Octets,
} from './oracleContraste.js';

export const MARGE = 1e-9;

export interface PaireProche {
  readonly couleur: string;
  readonly rapport: number;
}

export interface PairesDuSeuil {
  readonly seuil: number;
  readonly fond: string;
  readonly auDessus: PaireProche;
  readonly auDessous: PaireProche;
}

const memoire = new Map<string, PairesDuSeuil>();

/** Le premier octet dont la luminance linéaire atteint `valeur`, ou 256. */
function premierOctetDepuis(valeur: number): number {
  let [bas, haut] = [0, 256];
  while (bas < haut) {
    const milieu = (bas + haut) >> 1;
    if (TABLE_SRGB[milieu] >= valeur) haut = milieu; else bas = milieu + 1;
  }
  return bas;
}

/** Pour chaque couple (rouge, vert), la dichotomie donne le bleu qui croise le seuil ; ses deux voisins couvrent les ex æquo. */
export function paireLaPlusProche(seuil: number, fond: string): PairesDuSeuil {
  const cle = `${seuil}|${fond}`;
  const connue = memoire.get(cle);
  if (connue) return connue;
  const octetsDuFond = octetsDeHex(fond);
  const yFond = luminanceDe(octetsDuFond);
  const cibles = [(yFond + 0.05) / seuil - 0.05, seuil * (yFond + 0.05) - 0.05].filter((y) => y >= 0 && y <= 1);
  let dessus: PaireProche | undefined;
  let dessous: PaireProche | undefined;
  for (const y of cibles) {
    for (let r = 0; r < 256; r++) {
      for (let g = 0; g < 256; g++) {
        const bleu = premierOctetDepuis((y - 0.2126 * TABLE_SRGB[r] - 0.7152 * TABLE_SRGB[g]) / 0.0722);
        for (let b = Math.max(0, bleu - 1); b <= Math.min(255, bleu + 1); b++) {
          const rapport = rapportDeContraste([r, g, b], octetsDuFond);
          if (rapport - seuil > MARGE && (!dessus || rapport < dessus.rapport)) dessus = { couleur: hexDe({ r: r / 255, g: g / 255, b: b / 255 }), rapport };
          if (seuil - rapport > MARGE && (!dessous || rapport > dessous.rapport)) dessous = { couleur: hexDe({ r: r / 255, g: g / 255, b: b / 255 }), rapport };
        }
      }
    }
  }
  if (!dessus || !dessous) throw new Error(`Aucune paire de part et d'autre de ${seuil} sur ${fond}`);
  const paires = { seuil, fond, auDessus: dessus, auDessous: dessous };
  memoire.set(cle, paires);
  return paires;
}

/** Les deux gris (r = v = b) de part et d'autre du seuil sur ce fond. */
export function grisLesPlusProches(seuil: number, fond: string): PairesDuSeuil {
  const octetsDuFond = octetsDeHex(fond);
  let dessus: PaireProche | undefined;
  let dessous: PaireProche | undefined;
  for (let v = 0; v < 256; v++) {
    const rapport = rapportDeContraste([v, v, v], octetsDuFond);
    const gris = { couleur: hexDe({ r: v / 255, g: v / 255, b: v / 255 }), rapport };
    if (rapport - seuil > MARGE && (!dessus || rapport < dessus.rapport)) dessus = gris;
    if (seuil - rapport > MARGE && (!dessous || rapport > dessous.rapport)) dessous = gris;
  }
  if (!dessus || !dessous) throw new Error(`Aucun gris de part et d'autre de ${seuil} sur ${fond}`);
  return { seuil, fond, auDessus: dessus, auDessous: dessous };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Compositions fragiles (O6)

export interface CompositionFragile {
  /** Le fond opaque de la racine. */
  readonly fond: string;
  /** La couche translucide sous le texte. */
  readonly zone: { readonly couleur: string; readonly alpha: number };
  /** Le texte translucide. */
  readonly texte: { readonly couleur: string; readonly alpha: number };
  readonly seuil: number;
}

const ALPHAS = [0.25, 0.4, 0.5, 0.6, 0.75] as const;

/**
 * `n` compositions (fond opaque, couche translucide, texte translucide) dont le verdict au seuil change selon qu'on arrondit à 8 bits
 * après chaque couche ou une seule fois à la fin (Q-F7-1). Le tirage suit la graine ; un rapport à moins de `MARGE` du seuil est écarté.
 */
export function compositionsFragiles(graine: number, n: number, seuil = 4.5): CompositionFragile[] {
  const tirer = mulberry32(graine);
  const octet = (): number => Math.floor(tirer() * 256);
  const alpha = (): number => ALPHAS[Math.floor(tirer() * ALPHAS.length)];
  const trouvees: CompositionFragile[] = [];
  for (let essai = 0; essai < 20_000_000 && trouvees.length < n; essai++) {
    const [fond, zone, texte]: Octets[] = [[octet(), octet(), octet()], [octet(), octet(), octet()], [octet(), octet(), octet()]];
    const [az, at] = [alpha(), alpha()];
    const couches: Couleur[] = [couleurDeOctets(texte, at), couleurDeOctets(zone, az)];
    const [premier, fondRendu] = [couches.slice(0, 1), couches.slice(1)];
    const base = couleurDeOctets(fond);
    if (!estFragile(premier, fondRendu, base, seuil)) continue;
    const [un, deux] = [mesurerLaPaire(premier, fondRendu, base, false), mesurerLaPaire(premier, fondRendu, base, true)];
    if (!un || !deux || Math.abs(un.rapport - seuil) <= MARGE || Math.abs(deux.rapport - seuil) <= MARGE) continue;
    trouvees.push({
      fond: hexDe(base), zone: { couleur: hexDe(couleurDeOctets(zone)), alpha: az }, texte: { couleur: hexDe(couleurDeOctets(texte)), alpha: at }, seuil,
    });
  }
  if (trouvees.length < n) throw new Error(`Seulement ${trouvees.length} compositions fragiles sur ${n} demandées`);
  return trouvees;
}

/**
 * Les six compositions de O6, rendues par `compositionsFragiles(7107, 6)` : la recherche coûte 1,6 s, le test la rejoue une fois
 * et vérifie que cette table en est le résultat.
 */
export const COMPOSITIONS_FRAGILES: readonly CompositionFragile[] = [
  { fond: '#EBE9DA', zone: { couleur: '#06FA0F', alpha: 0.6 }, texte: { couleur: '#68294F', alpha: 0.75 }, seuil: 4.5 },
  { fond: '#E2FEE5', zone: { couleur: '#42F75C', alpha: 0.25 }, texte: { couleur: '#3F1AFD', alpha: 0.75 }, seuil: 4.5 },
  { fond: '#286289', zone: { couleur: '#1A153D', alpha: 0.75 }, texte: { couleur: '#ACB2CD', alpha: 0.75 }, seuil: 4.5 },
  { fond: '#2CF6F0', zone: { couleur: '#E74C1F', alpha: 0.25 }, texte: { couleur: '#1009BB', alpha: 0.75 }, seuil: 4.5 },
  { fond: '#0FC8CA', zone: { couleur: '#29FEFE', alpha: 0.75 }, texte: { couleur: '#39336F', alpha: 0.75 }, seuil: 4.5 },
  { fond: '#317ABE', zone: { couleur: '#2DF747', alpha: 0.75 }, texte: { couleur: '#092E20', alpha: 0.75 }, seuil: 4.5 },
];
