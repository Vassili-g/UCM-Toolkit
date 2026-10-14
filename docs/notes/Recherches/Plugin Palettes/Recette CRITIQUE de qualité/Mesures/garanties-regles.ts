/**
 * Les sept garanties pour chaque règle de chroma candidate et chaque table du
 * modèle des niveaux, sur le balayage de 72 teintes à deux clartés de
 * référence, dans les quatre combinaisons du texte des boutons. Les fonds de
 * page sont la page (`#0A0A0B` en Dark, celle du modèle) et la carte.
 *
 * `npx tsx garanties-regles.ts` écrit GARANTIES-REGLES.json.
 */
import { writeFileSync } from 'node:fs';
import { ecrireHexa, lineaireVersRgb8, oklchVersLineaire, lireHexa } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { GARANTIES } from '../../../../../../packages/kit/src/emplois/garanties';
import { TABLE_DES_DOSSIERS, sensDuTheme, type TexteDesBoutons } from '../../../../../../packages/kit/src/emplois/dossiers';
import { REGLE_RETENUE, rampesDuBanc, type RegleDeChroma } from './prototype';
import { REGLE_ENVELOPPE, REGLE_FINALE, valider } from './variantes';

type Table = Record<string, number | 'texteDesBoutons'>;
type Fonds = { defaut: number; survol: number; appui: number; texte: number };

/** Une table du modèle : les fonds teintés et leur texte, par thème ; le focus Dark au 800 ; le reste suit le kit. */
const table = (light: Fonds, dark: Fonds) => (sens: 'normal' | 'inverse', mode: 'light' | 'dark'): Table => {
  const f = mode === 'light' ? light : dark;
  const texte = mode === 'light' && sens === 'inverse' ? Math.max(f.texte, 900) : f.texte;
  return {
    ...TABLE_DES_DOSSIERS[sens],
    'surface/default': f.defaut, 'surface/hover': f.survol, 'surface/pressed': f.appui,
    'surface/foreground': texte, 'surface/border': texte,
    ...(mode === 'dark' ? { 'page/focus': 800 } : {}),
  };
};
export const TABLES_DU_MODELE = {
  'fonds Light 50, Dark 200': table({ defaut: 50, survol: 100, appui: 200, texte: 800 }, { defaut: 200, survol: 300, appui: 400, texte: 900 }),
  'fonds Light 100, Dark 200': table({ defaut: 100, survol: 200, appui: 300, texte: 800 }, { defaut: 200, survol: 300, appui: 400, texte: 900 }),
  'fonds Light 100, Dark 300': table({ defaut: 100, survol: 200, appui: 300, texte: 800 }, { defaut: 300, survol: 400, appui: 500, texte: 900 }),
  'fonds Light 100, Dark 300, texte Dark 950': table({ defaut: 100, survol: 200, appui: 300, texte: 800 }, { defaut: 300, survol: 400, appui: 500, texte: 950 }),
};

export const REGLES: Record<string, { regle: RegleDeChroma | null; parts?: { soft: number; vivid: number } }> = {
  'part constante (actuel)': { regle: null },
  'enveloppe par thème (S1)': { regle: REGLE_ENVELOPPE, parts: { soft: 0.85, vivid: 0.95 } },
  'enveloppe retenue au banc (jaunes, fonds Dark 0,30)': { regle: REGLE_FINALE, parts: { soft: 0.85, vivid: 0.95 } },
  'retenue par teinte (Soft en deux zones)': { regle: REGLE_RETENUE, parts: { soft: 0.85, vivid: 0.95 } },
};

const PAGE_DARK = '#0A0A0B';
const CARTE = { light: '#FFFFFF', dark: '#1A1C1F' };
const teintes = Array.from({ length: 72 }, (_, i) => i * 5);
const references = teintes.flatMap((H) => [0.62, 0.75].map((L) => ({ H, L, hexa: ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: 0.9 * plafond(L, H, 'srgb'), H }))) })));

if (process.argv[1]?.endsWith('garanties-regles.ts')) {
  const resultats: Record<string, unknown> = {};
  const textes: TexteDesBoutons[] = ['blanc', 'noir'];
  for (const [nomRegle, { regle, parts }] of Object.entries(REGLES)) for (const [nomTable, t] of Object.entries(TABLES_DU_MODELE)) {
    let couples = 0;
    const echecs: Record<string, number> = {};
    const exemples: string[] = [];
    const separation: Record<string, number[]> = { light: [], dark: [] };
    for (const tl of textes) for (const td of textes) {
      const base = recetteParDefaut();
      const texteDesBoutons = { light: tl, dark: td };
      const palettes: Palette[] = references.map((r, k) => ({
        id: `p-${(k + 1).toString(16).padStart(8, '0')}`,
        reference: r.hexa,
        derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
      } as Palette));
      const profils = parts ? { soft: { part: parts.soft }, vivid: { part: parts.vivid } } : base.profils;
      const recette: Recette = valider({ ...base, fonds: { ...base.fonds, dark: PAGE_DARK }, profils, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons), palettes });
      for (const palette of recette.palettes) {
        const rampes = regle ? rampesDuBanc(recette, palette, regle) : rampesDe(recette, palette);
        for (const i of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as const) {
          const rampe = rampes[i]![mode].map((c) => c.hexa);
          const sens = sensDuTheme(mode, texteDesBoutons[mode]);
          const tt = t(sens, mode);
          const couleur = (v: string) => (tt[v] === 'texteDesBoutons' ? (texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000') : rampe[recette.crans.indexOf(tt[v] as number)]);
          const supports = { page: recette.fonds[mode], raised: CARTE[mode] };
          for (const g of GARANTIES) for (const fond of g.fonds) {
            const fondsJuges = 'fondDeLaPage' in fond ? Object.entries(supports) : [[fond.variable, couleur(fond.variable)]];
            for (const [nomFond, f] of fondsJuges) {
              couples += 1;
              const v = contraste(lireHexa(couleur(g.premier.variable))!, lireHexa(f)!);
              if (v < (g.seuil === 'texte' ? 4.5 : 3)) {
                const cle = `G${g.numero} ${mode} ${sens} sur ${nomFond}`;
                echecs[cle] = (echecs[cle] ?? 0) + 1;
                if (echecs[cle] <= 3) exemples.push(`${palette.reference} ${i} ${cle} ${v.toFixed(2)}`);
              }
            }
          }
          separation[mode].push(contraste(lireHexa(couleur('surface/default'))!, lireHexa(CARTE[mode])!));
        }
      }
    }
    const mediane = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const total = Object.values(echecs).reduce((s, x) => s + x, 0);
    resultats[`${nomRegle} · ${nomTable}`] = { couples, echecs: total, parGarantie: echecs, exemples, fondContreCarte: { light: +mediane(separation.light).toFixed(3), dark: +mediane(separation.dark).toFixed(3) } };
    console.log(`${nomRegle.padEnd(40)} ${nomTable.padEnd(42)} échecs ${String(total).padStart(5)}  fond/carte L ${mediane(separation.light).toFixed(3)} D ${mediane(separation.dark).toFixed(3)}`);
    if (total) console.log('    ', Object.entries(echecs).map(([k, v]) => `${k}: ${v}`).join(' · '));
  }
  writeFileSync(new URL('./GARANTIES-REGLES.json', import.meta.url), `${JSON.stringify(resultats, null, 1)}\n`);
}
