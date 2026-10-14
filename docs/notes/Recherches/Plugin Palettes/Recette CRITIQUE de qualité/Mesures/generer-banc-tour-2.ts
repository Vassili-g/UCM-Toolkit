/**
 * Les données du second tour du banc visuel (`../Maquettes/donnees-banc-tour-2.js`). Le premier
 * tour a retenu l'enveloppe (cohérence 5), un fond plus marqué (Light 100, Dark 300, texte Dark
 * 950) et la dérive de teinte corrigée. Il reste deux réglages à juger : la marge des jaunes
 * clairs en Light, et la borne des fonds Dark en Vivid. Même jeu de palettes que le premier tour.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { boutsDe, courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { deriveAuxBouts, enveloppeAvecJaunes, rampesDuBanc } from './prototype';
import { lire, valider } from './variantes';

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
const palette = (nom: string, reference: string, rang: number): Palette => {
  const couleur = rgb8VersOklch(lireHexa(reference)!);
  const derive = couleur.C < 0.01 ? { clair: 0, sombre: 0 } : deriveAuxBouts(RAMPES_TAILWIND, couleur, boutsDe(defaut));
  return { id: `p-ba0d${rang.toString(16).padStart(4, '0')}`, nom, reference, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
};
const entrees = [
  ...FAMILLES.map(([nom, tw]) => ({ nom, reference: tailwind[tw]['600'], note: `Tailwind ${tw}-600`, temoin: Object.values(tailwind[tw]) as string[] | null })),
  ...CAS_LIMITES.map(([nom, reference, note]) => ({ nom, reference, note, temoin: null as string[] | null })),
  { nom: NEUTRE[0], reference: NEUTRE[1], note: 'Neutre de la page et de la carte', temoin: null },
];
const palettes = entrees.map((e, k) => palette(e.nom, e.reference, k));

const recette = (dark: 'noir' | 'blanc'): Recette => {
  const texteDesBoutons = { light: 'blanc' as const, dark };
  return valider({
    ...defaut, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons),
    fonds: { ...defaut.fonds, dark: '#0A0A0B' }, profils: { soft: { part: 0.85 }, vivid: { part: 0.95 } }, palettes,
  });
};

// Les bornes de S1 ; seules la marge des jaunes (Light) et la borne `b` de Vivid en Dark varient.
const bornes = (bVividDark: number) => ({
  light: { soft: { p0: 0.85, a: 0.6, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.48 }, unique: { p0: 0.95, a: 1.1, b: 0.48 } },
  dark: { soft: { p0: 0.85, a: 1.1, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: bVividDark }, unique: { p0: 0.95, a: 1.1, b: bVividDark } },
});
const JAUNES = [0, 0.5, 1, 1.5];
const B_DARK = [0.48, 0.38, 0.3];

const hexas = (rampe: { hexa: string }[]) => rampe.map((c) => c.hexa);
const rampesDe = (dark: 'noir' | 'blanc', p: Palette, jaunes: number, b: number) => {
  const r = recette(dark);
  return rampesDuBanc(r, r.palettes.find((x) => x.id === p.id)!, enveloppeAvecJaunes(bornes(b), jaunes));
};
const sortie = {
  crans: defaut.crans,
  jaunes: JAUNES,
  bDark: B_DARK,
  palettes: palettes.map((p, k) => {
    const e = entrees[k];
    const light = Object.fromEntries(JAUNES.map((j) => {
      const r = rampesDe('noir', p, j, 0.48);
      return [String(j), { soft: hexas(r.soft!.light), vivid: hexas(r.vivid!.light) }];
    }));
    const dark = Object.fromEntries(B_DARK.map((b) => {
      const normal = rampesDe('noir', p, 0, b);
      const inverse = rampesDe('blanc', p, 0, b);
      return [String(b), {
        soft: { normal: hexas(normal.soft!.dark), inverse: hexas(inverse.soft!.dark) },
        vivid: { normal: hexas(normal.vivid!.dark), inverse: hexas(inverse.vivid!.dark) },
      }];
    }));
    return { nom: e.nom, reference: e.reference, note: e.note, neutre: e.nom === NEUTRE[0], temoin: e.temoin, light, dark };
  }),
};
writeFileSync(new URL('../Maquettes/donnees-banc-tour-2.js', import.meta.url), `// Généré par Mesures/generer-banc-tour-2.ts : ne pas modifier à la main.\nwindow.BANC2 = ${JSON.stringify(sortie)};\n`);
console.log(`${sortie.palettes.length} palettes`);
