/**
 * Les sept garanties sur un balayage de teintes, pour chaque règle de chroma
 * et chaque table de crans candidate, dans les quatre combinaisons du texte
 * des boutons. Ajoute la carte (`elevation/raised`) aux fonds de page et
 * mesure la séparation entre `surface/default` et chaque support.
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
import { enveloppes, rampesDuBanc } from './prototype';
import { alphaMinimal, composer } from './prototype';
import { valider } from './variantes';

type Table = Record<string, number | 'texteDesBoutons'>;
const avec = (base: Table, changements: Table): Table => ({ ...base, ...changements });

/** Les tables candidates, par sens et par thème : le sens choisit les partenaires, le thème les fonds. */
const TABLES: Record<string, (sens: 'normal' | 'inverse', mode: 'light' | 'dark') => Table> = {
  actuelle: (sens) => TABLE_DES_DOSSIERS[sens],
  'surface 50 en Light': (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200 })
    : TABLE_DES_DOSSIERS[sens],
  'surface 200 en Dark': (sens, mode) => mode === 'dark'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 200, 'surface/hover': 300, 'surface/pressed': 400 })
    : TABLE_DES_DOSSIERS[sens],
  'focus un cran plus clair': (sens, mode) => avec(TABLE_DES_DOSSIERS[sens], { 'page/focus': (TABLE_DES_DOSSIERS[sens]['page/focus'] as number) - (mode === 'light' ? 100 : -100) }),
  translucide: (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200 })
    : TABLE_DES_DOSSIERS[sens],
  'translucide, focus Dark plus clair': (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200 })
    : avec(TABLE_DES_DOSSIERS[sens], { 'page/focus': (TABLE_DES_DOSSIERS[sens]['page/focus'] as number) + 100 }),
  'translucide, texte 700 en Light': (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200, 'surface/foreground': (TABLE_DES_DOSSIERS[sens]['surface/foreground'] as number) - 100, 'surface/border': (TABLE_DES_DOSSIERS[sens]['surface/border'] as number) - 100 })
    : avec(TABLE_DES_DOSSIERS[sens], { 'page/focus': (TABLE_DES_DOSSIERS[sens]['page/focus'] as number) + 100 }),
  'translucide, texte un cran plus coloré partout': (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200, 'surface/foreground': (TABLE_DES_DOSSIERS[sens]['surface/foreground'] as number) - 100, 'surface/border': (TABLE_DES_DOSSIERS[sens]['surface/border'] as number) - 100 })
    : avec(TABLE_DES_DOSSIERS[sens], { 'page/focus': (TABLE_DES_DOSSIERS[sens]['page/focus'] as number) + 100, 'surface/foreground': (TABLE_DES_DOSSIERS[sens]['surface/foreground'] as number) - 100, 'surface/border': (TABLE_DES_DOSSIERS[sens]['surface/border'] as number) - 100 }),
  'plein 600 en Light': (sens, mode) => (mode === 'light' && sens === 'normal'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'solid/default': 600, 'solid/hover': 700, 'solid/pressed': 800 })
    : TABLE_DES_DOSSIERS[sens]),
  'les deux': (sens, mode) => mode === 'light'
    ? avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200 })
    : avec(TABLE_DES_DOSSIERS[sens], { 'surface/default': 200, 'surface/hover': 300, 'surface/pressed': 400 }),
};

const CARTE = { light: '#FFFFFF', dark: '#1A1C1F' };
const teintes = Array.from({ length: 72 }, (_, i) => i * 5);
const references = teintes.flatMap((H) => [0.62, 0.75].map((L) => ({ H, L, hexa: ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: 0.9 * plafond(L, H, 'srgb'), H }))) })));

const regles = {
  actuel: null,
  enveloppe: enveloppes({ soft: { p0: 0.85, a: 0.6, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.48 }, unique: { p0: 0.95, a: 1.1, b: 0.48 } }),
} as const;

const resultats: Record<string, unknown> = {};
const textes: TexteDesBoutons[] = ['blanc', 'noir'];
for (const [nomRegle, regle] of Object.entries(regles)) for (const [nomTable, table] of Object.entries(TABLES)) {
  let couples = 0;
  const echecs: Record<string, number> = {};
  const exemples: string[] = [];
  const separation = { light: { page: [] as number[], raised: [] as number[] }, dark: { page: [] as number[], raised: [] as number[] } };
  for (const tl of textes) for (const td of textes) {
    const base = recetteParDefaut();
    const texteDesBoutons = { light: tl, dark: td };
    const palettes: Palette[] = references.map((r, k) => ({
      id: `p-${(k + 1).toString(16).padStart(8, '0')}`,
      reference: r.hexa,
      derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
    } as Palette));
    const profils = regle ? { soft: { part: 0.85 }, vivid: { part: 0.95 } } : base.profils;
    const recette: Recette = valider({ ...base, profils, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons), palettes });
    for (const palette of recette.palettes) {
      const rampes = regle ? rampesDuBanc(recette, palette, regle) : rampesDe(recette, palette);
      for (const i of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as const) {
        const rampe = rampes[i]![mode].map((c) => c.hexa);
        const sens = sensDuTheme(mode, texteDesBoutons[mode]);
        const t = table(sens, mode);
        const couleur = (v: string) => (t[v] === 'texteDesBoutons' ? (texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000') : rampe[recette.crans.indexOf(t[v] as number)]);
        const supports = { page: recette.fonds[mode], raised: CARTE[mode] };
        // Un fond translucide se juge composé sur chaque support ; il est calculé contre la carte en Light, la page en Dark.
        const translucide = nomTable.startsWith('translucide');
        const reference = lireHexa(mode === 'light' ? CARTE.light : recette.fonds.dark)!;
        const fondsDe = (v: string): [string, string][] => (translucide && v.startsWith('surface/')
          ? Object.entries(supports).map(([s, f]) => [`${v} sur ${s}`, ecrireHexa(composer(alphaMinimal(lireHexa(couleur(v))!, reference), lireHexa(f)!))])
          : [[v, couleur(v)]]);
        for (const g of GARANTIES) for (const fond of g.fonds) {
          const fonds = 'fondDeLaPage' in fond ? Object.entries(supports) : fondsDe(fond.variable);
          for (const [nomFond, f] of fonds) {
            couples += 1;
            const v = contraste(lireHexa(couleur(g.premier.variable))!, lireHexa(f)!);
            if (v < (g.seuil === 'texte' ? 4.5 : 3)) {
              const cle = `G${g.numero} ${mode} ${sens} sur ${nomFond}`;
              echecs[cle] = (echecs[cle] ?? 0) + 1;
              if (echecs[cle] <= 3) exemples.push(`${palette.reference} ${i} ${cle} ${v.toFixed(2)}`);
            }
          }
        }
        for (const s of ['page', 'raised'] as const) {
          const surface = translucide ? fondsDe('surface/default').find(([n]) => n.endsWith(s))![1] : couleur('surface/default');
          separation[mode][s].push(contraste(lireHexa(surface)!, lireHexa(supports[s])!));
        }
      }
    }
  }
  const resume = (xs: number[]) => { const t = [...xs].sort((a, b) => a - b); return { min: +t[0].toFixed(3), mediane: +t[Math.floor(t.length / 2)].toFixed(3) }; };
  const cle = `${nomRegle} · ${nomTable}`;
  resultats[cle] = {
    couples,
    echecs: Object.values(echecs).reduce((s, x) => s + x, 0),
    parGarantie: echecs,
    exemples,
    separationSurface: { light: { page: resume(separation.light.page), raised: resume(separation.light.raised) }, dark: { page: resume(separation.dark.page), raised: resume(separation.dark.raised) } },
  };
  const r = resultats[cle] as { echecs: number; separationSurface: { light: { page: { mediane: number }; raised: { mediane: number } }; dark: { page: { mediane: number }; raised: { mediane: number } } } };
  const s = r.separationSurface;
  console.log(`${cle.padEnd(36)} échecs ${String(r.echecs).padStart(4)} / ${couples}   surface/support médiane : L page ${s.light.page.mediane} carte ${s.light.raised.mediane} · D page ${s.dark.page.mediane} carte ${s.dark.raised.mediane}`);
  if (r.echecs) console.log('   ', Object.entries(echecs).map(([k, v]) => `${k}: ${v}`).join(' · '));
}
writeFileSync(new URL('./GARANTIES-BALAYAGE.json', import.meta.url), `${JSON.stringify(resultats, null, 1)}\n`);
