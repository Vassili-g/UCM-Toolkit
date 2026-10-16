/**
 * Les trois pistes pour `surface/default` : opaque au cran de la table,
 * opaque à un autre cran, translucide. Une surface translucide est la couleur
 * d'alpha minimal qui redonne exactement le cran sur la page (méthode des
 * échelles alpha de Radix) ; posée sur la carte, elle se compose avec elle.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, ecrireHexa, type Rgb8 } from '../../../../../../packages/couleur/src/conversions';
import { contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { RECETTE_REELLE, UTILITAIRES, VARIANTES, paletteNommee } from './variantes';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { alphaMinimal, composer } from './prototype';

const crans = RECETTE_REELLE.crans;
const titanium = rampesDe(RECETTE_REELLE, paletteNommee(RECETTE_REELLE, 'Titanium')).unique!;
const SUPPORTS = {
  light: { page: lireHexa(titanium.light[0].hexa)!, carte: [255, 255, 255] as Rgb8 },
  dark: { page: lireHexa(titanium.dark[0].hexa)!, carte: lireHexa(titanium.dark[1].hexa)! },
};

const r2 = (x: number) => Math.round(x * 1000) / 1000;

const resultats: Record<string, unknown> = {};
for (const variante of VARIANTES.filter((v) => ['actuel', 'enveloppe'].includes(v.id))) {
  const lignes: string[] = [];
  const data: Record<string, unknown> = {};
  for (const nom of UTILITAIRES) for (const i of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as const) {
    const rampe = variante.rampes(paletteNommee(RECETTE_REELLE, nom))[i]![mode];
    const hexa = (cran: number) => lireHexa(rampe[crans.indexOf(cran)].hexa)!;
    const { page, carte } = SUPPORTS[mode];
    const texte = hexa(mode === 'light' ? 800 : 900);
    const pistes = {
      'opaque 100': hexa(100),
      'opaque 50': hexa(50),
      'opaque 200': hexa(200),
    } as Record<string, Rgb8>;
    const mesure: Record<string, unknown> = {};
    for (const [piste, couleur] of Object.entries(pistes)) {
      mesure[piste] = { page: r2(contraste(couleur, page)), carte: r2(contraste(couleur, carte)), texte: r2(contraste(texte, couleur)) };
    }
    // Le support le plus éloigné du texte : la carte blanche en Light, la page en Dark.
    const reference = mode === 'light' ? carte : page;
    const morceaux: string[] = [];
    for (const cran of mode === 'light' ? [50, 100] : [100, 200]) {
      const a = alphaMinimal(hexa(cran), reference);
      const surPage = composer(a, page);
      const surCarte = composer(a, carte);
      const t = {
        alpha: r2(a.alpha), couleur: ecrireHexa(a.couleur.map((x) => Math.round(x * 255)) as Rgb8),
        page: r2(contraste(surPage, page)), carte: r2(contraste(surCarte, carte)),
        texte: r2(Math.min(contraste(texte, surPage), contraste(texte, surCarte))),
      };
      mesure[`translucide ${cran}`] = t;
      morceaux.push(`translucide ${cran} (α ${t.alpha.toFixed(2)}) page ${t.page.toFixed(3)} carte ${t.carte.toFixed(3)} texte ≥ ${t.texte.toFixed(2)}`);
    }
    data[`${nom}-${i}-${mode}`] = mesure;
    const o = mesure['opaque 100'] as { page: number; carte: number };
    lignes.push(`${nom.padEnd(6)} ${i[0]}${mode[0]}  opaque 100 : page ${o.page.toFixed(3)} carte ${o.carte.toFixed(3)} | ${morceaux.join(' | ')}`);
  }
  resultats[variante.id] = data;
  console.log(`\n${variante.nom}\n${lignes.join('\n')}`);
}
writeFileSync(new URL('./MESURES-SURFACES.json', import.meta.url), `${JSON.stringify(resultats, null, 1)}\n`);
