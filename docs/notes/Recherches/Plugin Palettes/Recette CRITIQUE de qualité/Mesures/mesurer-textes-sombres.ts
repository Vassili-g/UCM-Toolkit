/**
 * Les textes des fonds teintés en Dark : clarté et chroma des crans 800, 900
 * et 950 des quatre utilitaires, avec l'enveloppe et avec sa borne Dark
 * ouverte, à côté des textes sombres de Radix et de Primer relevés dans
 * `Collecte/RELEVE-STATUTS-ET-FOCUS.md`.
 */
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { enveloppes, enveloppesParTheme, rampesDuBanc } from './prototype';
import { RECETTE_ENVELOPPE, UTILITAIRES } from './variantes';

const LIGHT = { soft: { p0: 0.85, a: 0.6, b: 0.38 }, vivid: { p0: 0.95, a: 1.1, b: 0.48 }, unique: { p0: 0.95, a: 1.1, b: 0.48 } };
const regles = {
  enveloppe: enveloppes(LIGHT),
  'enveloppe, Dark a 1,1': enveloppesParTheme({ light: LIGHT, dark: { ...LIGHT, soft: { p0: 0.85, a: 1.1, b: 0.38 } } }),
};
const lire = (h: string) => rgb8VersOklch(lireHexa(h)!);
const f = (x: number) => x.toFixed(3).replace('.', ',');

console.log('Témoins, textes sombres des statuts :');
for (const [nom, h] of [['Radix vert a11', '#46fea5'], ['Radix rouge a11', '#ff9592'], ['Radix bleu a11', '#70b8ff'], ['Primer succès', '#3fb950'], ['Primer danger', '#f85149'], ['Primer accent', '#4493f8']]) {
  const c = lire(h);
  console.log(`  ${nom.padEnd(18)} L ${f(c.L)}  C ${f(c.C)}`);
}
for (const [nomRegle, regle] of Object.entries(regles)) for (const intensite of ['soft', 'vivid'] as const) {
  const lignes = [800, 900, 950].map((cran) => {
    const valeurs = UTILITAIRES.map((nom) => {
      const palette = RECETTE_ENVELOPPE.palettes.find((p) => p.nom === nom)!;
      const rampe = rampesDuBanc(RECETTE_ENVELOPPE, palette, regle)[intensite]!.dark;
      return lire(rampe[RECETTE_ENVELOPPE.crans.indexOf(cran)].hexa);
    });
    const C = valeurs.map((v) => v.C);
    return `${cran} : L ${f(valeurs.reduce((s, v) => s + v.L, 0) / valeurs.length)}  C ${f(Math.min(...C))} à ${f(Math.max(...C))}`;
  });
  console.log(`${nomRegle} · ${intensite} · ${lignes.join(' | ')}`);
}
