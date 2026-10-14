/**
 * Les données du banc visuel (`../Maquettes/donnees-banc-visuel.js`) : un jeu de palettes neuf
 * qui couvre toutes les familles de teinte et les cas limites, calculé avec trois règles de
 * chroma, en Soft et en Vivid, en Light et dans les deux sens du Dark. Les familles prennent le
 * cran 600 de Tailwind pour référence, et la rampe de Tailwind sert de témoin.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { boutsDe, courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import { REGLE_RETENUE, deriveAuxBouts, rampesDuBanc, type RegleDeChroma } from './prototype';
import { REGLE_ENVELOPPE, REGLE_FINALE, lire, valider } from './variantes';

const tailwind = lire('./references/tailwind-3.4.17.json') as Record<string, Record<string, string>>;
const FAMILLES: [string, string][] = [
  ['Rouge', 'red'], ['Orange', 'orange'], ['Ambre', 'amber'], ['Jaune', 'yellow'], ['Lime', 'lime'], ['Vert', 'green'],
  ['Émeraude', 'emerald'], ['Turquoise', 'teal'], ['Cyan', 'cyan'], ['Ciel', 'sky'], ['Bleu', 'blue'], ['Indigo', 'indigo'],
  ['Violet', 'violet'], ['Pourpre', 'purple'], ['Fuchsia', 'fuchsia'], ['Rose', 'pink'], ['Framboise', 'rose'],
];
const CAS_LIMITES: [string, string, string][] = [
  ['Jaune de marque', '#FFD43B', 'Une référence très claire'],
  ['Marine', '#1E3A8A', 'Une référence très foncée'],
  ['Sauge', '#7D8F69', 'Une référence terne'],
  ['Vert néon', '#00E676', 'Le vert le plus saturé'],
  ['Bleu primaire', '#0000FF', 'Le bleu de l\'écran'],
  ['Taupe', '#8C7B70', 'Presque neutre'],
  ['Corail', '#FF6F61', 'Une couleur de marque claire et vive'],
];
const NEUTRE: [string, string] = ['Gris', '#71717A'];

const defaut = recetteParDefaut();
const RAMPES_TAILWIND = FAMILLES.map(([, tw]) => ({ pts: Object.values(tailwind[tw]).map((h) => rgb8VersOklch(lireHexa(h)!)) }));
type Derive = 'actuelle' | 'corrigee';
/** Une palette avec le préréglage de teinte actuel, ou la dérive lue aux deux bouts des rampes voisines. */
const palette = (nom: string, reference: string, rang: number, mode: Derive): Palette => {
  const couleur = rgb8VersOklch(lireHexa(reference)!);
  const derive = couleur.C < 0.01 ? { clair: 0, sombre: 0 }
    : mode === 'actuelle' ? prereglageTailwind(couleur, boutsDe(defaut)) : deriveAuxBouts(RAMPES_TAILWIND, couleur, boutsDe(defaut));
  return { id: `p-ba0c${rang.toString(16).padStart(4, '0')}`, nom, reference, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
};
const entrees = [
  ...FAMILLES.map(([nom, tw]) => ({ nom, reference: tailwind[tw]['600'], note: `Tailwind ${tw}-600`, temoin: Object.values(tailwind[tw]) })),
  ...CAS_LIMITES.map(([nom, reference, note]) => ({ nom, reference, note, temoin: null as string[] | null })),
];
const palettesDe = (mode: Derive) => [...entrees.map((e, k) => palette(e.nom, e.reference, k, mode)), palette(NEUTRE[0], NEUTRE[1], 99, mode)];
const PALETTES = { actuelle: palettesDe('actuelle'), corrigee: palettesDe('corrigee') };
const palettes = PALETTES.actuelle;
let deriveCourante: Derive = 'actuelle';

const recette = (dark: 'noir' | 'blanc', parts?: { soft: number; vivid: number }): Recette => {
  const texteDesBoutons = { light: 'blanc' as const, dark };
  return valider({
    ...defaut,
    texteDesBoutons,
    courbes: courbesParDefaut(11, texteDesBoutons),
    fonds: { ...defaut.fonds, dark: '#0A0A0B' },
    ...(parts ? { profils: { soft: { part: parts.soft }, vivid: { part: parts.vivid } } } : {}),
    palettes: PALETTES[deriveCourante],
  });
};

const PARTS = { soft: 0.85, vivid: 0.95 };
const REGLES: Record<string, { nom: string; resume: string; rampes: (dark: 'noir' | 'blanc', p: Palette) => ReturnType<typeof rampesDe> }> = {
  actuel: {
    nom: 'Moteur actuel, valeurs par défaut',
    resume: 'Une part fixe du maximum que l\'écran affiche : Soft 0,45, Vivid 0,95.',
    rampes: (dark, p) => { const r = recette(dark); return rampesDe(r, r.palettes.find((x) => x.id === p.id)!); },
  },
  enveloppe: {
    nom: 'Enveloppe par thème',
    resume: 'Une borne qui ne dépend que de la clarté plafonne la chroma, pour toutes les teintes.',
    rampes: (dark, p) => banc(dark, p, REGLE_ENVELOPPE),
  },
  retenue: {
    nom: 'Retenue par teinte',
    resume: 'Une part fixe, retenue seulement là où Tailwind et Radix retiennent : verts clairs et bleus foncés. Soft : fonds 0,6, textes 0,85.',
    rampes: (dark, p) => banc(dark, p, REGLE_RETENUE),
  },
  finale: {
    nom: 'Règle retenue',
    resume: 'L\'enveloppe par thème, élargie autour du jaune (+100 % en Soft, +50 % en Vivid), fonds Dark de Vivid bornés à 0,30 : la règle arrêtée après le second tour.',
    rampes: (dark, p) => banc(dark, p, REGLE_FINALE),
  },
};
function banc(dark: 'noir' | 'blanc', p: Palette, regle: RegleDeChroma) {
  const r = recette(dark, PARTS);
  // Sans parts imposées : le moteur calcule la part de chaque palette, et une référence terne ou grise garde la sienne.
  return rampesDuBanc(r, r.palettes.find((x) => x.id === p.id)!, regle) as ReturnType<typeof rampesDe>;
}

const hexas = (rampe: { hexa: string }[]) => rampe.map((c) => c.hexa);
const sortie = {
  crans: defaut.crans,
  regles: Object.fromEntries(Object.entries(REGLES).map(([id, r]) => [id, { nom: r.nom, resume: r.resume }])),
  palettes: palettes.map((p, k) => {
    const e = entrees[k] ?? { nom: NEUTRE[0], reference: NEUTRE[1], note: 'Neutre de la page et de la carte', temoin: null };
    // rampes[dérive][règle][profil][thème]
    const rampes: Record<string, Record<string, Record<string, Record<string, string[]>>>> = {};
    for (const derive of ['actuelle', 'corrigee'] as const) {
      deriveCourante = derive;
      rampes[derive] = {};
      for (const [id, regle] of Object.entries(REGLES)) {
        const normal = regle.rampes('noir', p);
        const inverse = regle.rampes('blanc', p);
        rampes[derive][id] = Object.fromEntries((['soft', 'vivid'] as const).map((i) => [i, {
          light: hexas(normal[i]!.light), dark: hexas(normal[i]!.dark), darkInverse: hexas(inverse[i]!.dark),
        }]));
      }
    }
    return { nom: e.nom, reference: e.reference, note: e.note, neutre: k === palettes.length - 1, temoin: e.temoin, rampes };
  }),
};
const chemin = new URL('../Maquettes/donnees-banc-visuel.js', import.meta.url);
writeFileSync(chemin, `// Généré par Mesures/generer-banc-visuel.ts : ne pas modifier à la main.\nwindow.BANC = ${JSON.stringify(sortie)};\n`);
console.log(`${sortie.palettes.length} palettes, ${Object.keys(REGLES).length} règles`);
