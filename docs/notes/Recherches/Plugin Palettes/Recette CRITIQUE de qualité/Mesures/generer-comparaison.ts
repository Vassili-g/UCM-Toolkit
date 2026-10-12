/**
 * Les données de la maquette de l'onglet Comparer (`../Maquettes/donnees-comparaison.js`) :
 * les six palettes colorées de la recette du mainteneur avant tout geste, après
 * l'alignement de la clarté, après l'alignement de la couleur, et après les
 * rotations de teinte proposées pour la paire la plus proche.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa } from '../../../../../../packages/couleur/src/conversions';
import { ancrageDe, rampesDe } from '../../../../../../packages/couleur/src/palette';
import { contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { GARANTIES } from '../../../../../../packages/kit/src/emplois/garanties';
import { TABLE_DES_DOSSIERS, sensDuTheme } from '../../../../../../packages/kit/src/emplois/dossiers';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/recette';
import { enveloppes, rampesDuBanc } from './prototype';
import { RECETTE_REELLE, valider } from './variantes';

/** La recette dont chaque palette perd ses réglages de luminosité : Color shift de luminosité et luminosité des profils non porteurs. */
function sansReglagesDeClarte(recette: Recette): Recette {
  return valider({
    ...recette,
    palettes: recette.palettes.map((p) => {
      const derive = { ...p.derive };
      for (const profil of ['soft', 'vivid'] as const) {
        const { clarte: _clarte, ...reste } = derive[profil];
        derive[profil] = reste as typeof derive.soft;
      }
      const porteur = p.reglages?.porteur ?? p.base ?? 'vivid';
      const clarte = p.reglages?.clarte ? Object.fromEntries(Object.entries(p.reglages.clarte).filter(([profil]) => profil === porteur)) : undefined;
      const reglages = p.reglages ? { ...p.reglages, ...(clarte && Object.keys(clarte).length ? { clarte } : { clarte: undefined }) } : undefined;
      return JSON.parse(JSON.stringify({ ...p, derive, ...(reglages ? { reglages } : {}) })) as Palette;
    }),
  });
}

/** La teinte des deux profils d'une palette tournée de `degres`, comme le réglage de teinte de la carte. */
function tourner(recette: Recette, nom: string, degres: number): Recette {
  return valider({
    ...recette,
    palettes: recette.palettes.map((p) => {
      if (p.nom !== nom) return p;
      const teinte: Record<string, number> = {};
      for (const profil of ['soft', 'vivid'] as const) {
        const valeur = Math.round(((p.reglages?.teinte?.[profil] ?? 0) + degres) * 100) / 100;
        if (valeur !== 0) teinte[profil] = valeur;
      }
      return { ...p, originale: p.originale ?? p.reference, reglages: { ...(p.reglages ?? {}), teinte } } as Palette;
    }),
  });
}

const COLOREES = RECETTE_REELLE.palettes.filter((p) => p.nom !== 'Titanium');
const enHexa = (rampes: ReturnType<typeof rampesDe>) => Object.fromEntries(Object.entries(rampes).map(([i, r]) => [i, { light: r!.light.map((c) => c.hexa), dark: r!.dark.map((c) => c.hexa) }]));
const etat = (recette: Recette, rampes = (p: Palette) => rampesDe(recette, p)) =>
  Object.fromEntries(recette.palettes.filter((p) => p.nom !== 'Titanium').map((p) => [p.nom, enHexa(rampes(p))]));

const clarte = sansReglagesDeClarte(RECETTE_REELLE);
const regle = enveloppes({ soft: { a: 0.6, b: 0.38 }, vivid: { a: 1.1, b: 0.48 }, unique: { a: 0.8, b: 0.42 } });
const sansParts = valider({ ...clarte, palettes: clarte.palettes.map((p) => { const { parts: _parts, ...reste } = p; return reste as Palette; }) });
const couleur = etat(sansParts, (p) => rampesDuBanc(sansParts, p, regle, { parts: { soft: 0.85, vivid: 0.95 } }));

const titanium = rampesDe(RECETTE_REELLE, RECETTE_REELLE.palettes.find((p) => p.nom === 'Titanium')!).unique!;
const SUPPORTS = { light: [titanium.light[0].hexa, '#FFFFFF'], dark: [titanium.dark[0].hexa, titanium.dark[1].hexa] };

/** Les couples des sept garanties sous leur seuil, sur les quatre utilitaires, la page et la carte comme fonds. */
function echecs(etats: Record<string, Record<string, { light: string[]; dark: string[] }>>): string[] {
  const manques: string[] = [];
  for (const nom of ['Poppy', 'Orange', 'Grass', 'Sky']) for (const i of ['soft', 'vivid']) for (const mode of ['light', 'dark'] as const) {
    const r = etats[nom][i][mode];
    const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, RECETTE_REELLE.texteDesBoutons[mode])] as Record<string, number | string>;
    const c = (v: string) => (table[v] === 'texteDesBoutons' ? (RECETTE_REELLE.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000') : r[RECETTE_REELLE.crans.indexOf(table[v] as number)]);
    for (const g of GARANTIES) for (const f of g.fonds) for (const fond of 'fondDeLaPage' in f ? SUPPORTS[mode] : [c(f.variable)]) {
      const v = contraste(lireHexa(c(g.premier.variable))!, lireHexa(fond)!);
      if (v < (g.seuil === 'texte' ? 4.5 : 3)) manques.push(`${nom} ${i} ${mode} G${g.numero} ${v.toFixed(2)}`);
    }
  }
  return manques;
}

const donnees = {
  crans: RECETTE_REELLE.crans,
  texteDesBoutons: RECETTE_REELLE.texteDesBoutons,
  titanium: enHexa(rampesDe(RECETTE_REELLE, RECETTE_REELLE.palettes.find((p) => p.nom === 'Titanium')!)),
  palettes: COLOREES.map((p) => ({ nom: p.nom, reference: p.reference, intensites: p.intensites ?? 2, ancrage: ancrageDe(RECETTE_REELLE, p) })),
  etats: {
    avant: etat(RECETTE_REELLE),
    clarte: etat(clarte),
    couleur,
    'Orange +9°': etat(tourner(RECETTE_REELLE, 'Orange', 9)),
    'Poppy −16°': etat(tourner(RECETTE_REELLE, 'Poppy', -16)),
  },
};
(donnees as Record<string, unknown>).echecs = Object.fromEntries(Object.entries(donnees.etats).map(([nom, e]) => [nom, echecs(e as never)]));
writeFileSync(new URL('../Maquettes/donnees-comparaison.js', import.meta.url), `// Généré par Mesures/generer-comparaison.ts ; ne pas modifier à la main.\nwindow.COMPARAISON = ${JSON.stringify(donnees)};\n`);
console.log('donnees-comparaison.js :', Object.entries((donnees as unknown as { echecs: Record<string, string[]> }).echecs).map(([k, v]) => `${k} ${v.length} échec(s)`).join(' · '));
