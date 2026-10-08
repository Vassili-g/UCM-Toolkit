/**
 * La reconstruction des réglages d'une palette figée : les palettes les plus
 * rapides de la mesure 3a se retrouvent à l'hexa près, une couleur retouchée à
 * la main donne un écart, et la recherche s'arrête sur demande.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rampesDe,
  reconstruireLesReglages,
  validerRecette,
  type Palette,
  type PaletteFigee,
} from '../src/index';
import { RECETTE, figerLaPalette, graineDeRecherche, tirerLesPalettes } from './tirageReconstruction';

const TIRAGES = tirerLesPalettes(30);
const tirage = (numero: number) => TIRAGES[numero - 1];

/** La palette figée posée sur les réglages trouvés : `figees` part, le reste de l'identité demeure. */
function poser(figee: PaletteFigee, reglages: Partial<Palette>, intensites?: 1): Palette {
  return { id: 'p-0000000a', nom: 'Poppy', crans: figee.crans, ...reglages, ...(intensites ? { intensites } : {}) } as Palette;
}

function assertValide(palette: Palette): void {
  const verdict = validerRecette({ ...RECETTE, palettes: [palette] });
  assert.ok('recette' in verdict, `la palette réglée est refusée : ${JSON.stringify('refus' in verdict ? verdict.refus : null)}`);
}

function assertMemesRampes(figee: PaletteFigee, palette: Palette): void {
  const rampes = rampesDe(RECETTE, palette);
  const figees = figee.figees as { soft: { light: string[]; dark: string[] }; vivid: { light: string[]; dark: string[] } };
  for (const profil of ['soft', 'vivid'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      assert.deepEqual(rampes[profil]![mode].map((cran) => cran.hexa), figees[profil][mode], `${profil} ${mode}`);
    }
  }
}

const RAPIDES_SANS_REFERENCE = [6, 11, 17, 20, 21];
const RAPIDES_AVEC_REFERENCE = [12, 28];

for (const numero of [...RAPIDES_SANS_REFERENCE, ...RAPIDES_AVEC_REFERENCE]) {
  const avecReference = RAPIDES_AVEC_REFERENCE.includes(numero);
  test(`reconstruction : la palette ${numero} de la mesure se retrouve à l'hexa près${avecReference ? ', référence connue' : ''}`, async () => {
    const complete = figerLaPalette(RECETTE, tirage(numero).palette);
    const figee: PaletteFigee = avecReference ? complete : { crans: complete.crans, figees: complete.figees };
    const resultat = await reconstruireLesReglages(RECETTE, figee, { graine: graineDeRecherche(numero) });
    assert.ok(resultat, 'aucune piste');
    assert.equal(resultat.ecart, 0);
    assert.equal(resultat.differentes, 0);
    assert.ok(!('figees' in resultat.reglages));
    assert.ok(!('id' in resultat.reglages) && !('crans' in resultat.reglages));
    const palette = poser(figee, resultat.reglages);
    assertValide(palette);
    assertMemesRampes(complete, palette);
  });
}

/** Une couleur d'une rampe figée, changée de 40 sur le canal rouge. */
function retoucher(figee: PaletteFigee): PaletteFigee {
  const soft = figee.figees as { soft: { light: string[]; dark: string[] }; vivid: { light: string[]; dark: string[] } };
  const dark = soft.soft.dark.slice();
  const rouge = parseInt(dark[3].slice(1, 3), 16);
  dark[3] = `#${((rouge + 40) % 256).toString(16).padStart(2, '0').toUpperCase()}${dark[3].slice(3)}`;
  return { ...figee, figees: { ...soft, soft: { ...soft.soft, dark } } };
}

test('reconstruction : une couleur retouchée à la main donne un écart non nul, sans exception', async () => {
  const figee = retoucher(figerLaPalette(RECETTE, tirage(3).palette));
  const resultat = await reconstruireLesReglages(RECETTE, figee, { budgetMs: 2000, graine: graineDeRecherche(3) });
  assert.ok(resultat);
  assert.ok(resultat.ecart > 0);
  assert.ok(resultat.differentes >= 1);
  assertValide(poser(figee, resultat.reglages));
});

test('reconstruction : un AbortSignal interrompt la recherche', async () => {
  const figee = retoucher(figerLaPalette(RECETTE, tirage(3).palette));
  const arret = new AbortController();
  setTimeout(() => arret.abort(), 150);
  const debut = Date.now();
  await assert.rejects(
    reconstruireLesReglages(RECETTE, figee, { signal: arret.signal, graine: graineDeRecherche(3) }),
    (erreur: Error) => erreur.name === 'AbortError',
  );
  assert.ok(Date.now() - debut < 5000, 'la recherche a continué après le signal');
});

test('reconstruction : la progression est appelée, ne recule pas et finit à 1', async () => {
  const figee = figerLaPalette(RECETTE, tirage(1).palette);
  const appels: number[] = [];
  await reconstruireLesReglages(RECETTE, figee, { progression: (fraction) => appels.push(fraction), graine: graineDeRecherche(1) });
  assert.ok(appels.length >= 2);
  assert.equal(appels[appels.length - 1], 1);
  assert.ok(appels.every((valeur, rang) => valeur >= 0 && valeur <= 1 && (rang === 0 || valeur >= appels[rang - 1])));
});

test('reconstruction : le budget épuisé rend la meilleure palette trouvée', async () => {
  const figee = retoucher(figerLaPalette(RECETTE, tirage(3).palette));
  const debut = Date.now();
  const resultat = await reconstruireLesReglages(RECETTE, figee, { budgetMs: 300, graine: graineDeRecherche(3) });
  assert.ok(Date.now() - debut < 3000);
  assert.ok(resultat === null || resultat.ecart > 0);
});

test('reconstruction : une palette à une intensité se retrouve à l\'hexa près', async () => {
  for (const numero of [3, 21]) {
    const { palette: tiree } = tirage(numero);
    const palette: Palette = {
      id: tiree.id,
      reference: tiree.reference,
      derive: { lien: true, soft: tiree.derive.vivid, vivid: tiree.derive.vivid },
      intensites: 1,
    };
    assertValide(palette);
    const rampe = rampesDe(RECETTE, palette).unique!;
    const figee: PaletteFigee = {
      crans: RECETTE.crans,
      reference: palette.reference,
      figees: { light: rampe.light.map((cran) => cran.hexa), dark: rampe.dark.map((cran) => cran.hexa) },
    };
    const resultat = await reconstruireLesReglages(RECETTE, figee, { graine: graineDeRecherche(numero) });
    assert.ok(resultat, `palette ${numero}`);
    assert.equal(resultat.ecart, 0);
    assert.equal(resultat.differentes, 0);
    assert.ok(!('intensites' in resultat.reglages));
    const reglee = poser(figee, resultat.reglages, 1);
    assertValide(reglee);
    const rendu = rampesDe(RECETTE, reglee).unique!;
    assert.deepEqual(rendu.light.map((cran) => cran.hexa), rampe.light.map((cran) => cran.hexa));
    assert.deepEqual(rendu.dark.map((cran) => cran.hexa), rampe.dark.map((cran) => cran.hexa));
  }
});

test('reconstruction : sans Dark, le thème Light se retrouve et le Dark recopié diffère', async () => {
  const palette: Palette = {
    id: 'p-0000000a',
    reference: tirage(3).palette.reference,
    derive: { lien: true, soft: tirage(3).palette.derive.vivid, vivid: tirage(3).palette.derive.vivid },
    intensites: 1,
  };
  const rampe = rampesDe(RECETTE, palette).unique!;
  const figee: PaletteFigee = {
    crans: RECETTE.crans,
    reference: palette.reference,
    figees: { light: rampe.light.map((cran) => cran.hexa) },
  };
  const resultat = await reconstruireLesReglages(RECETTE, figee, { budgetMs: 5000, graine: graineDeRecherche(3) });
  assert.ok(resultat);
  const rendu = rampesDe(RECETTE, poser(figee, resultat.reglages, 1)).unique!;
  assert.deepEqual(rendu.light.map((cran) => cran.hexa), (figee.figees as { light: string[] }).light);
  assert.ok(resultat.differentes >= 1, 'le Dark recopié du Light ne peut pas être celui d\'une palette calculée');
});

test('reconstruction : une liste de nuances qui ne correspond pas aux couleurs rend null', async () => {
  const figee = figerLaPalette(RECETTE, tirage(1).palette);
  assert.equal(await reconstruireLesReglages(RECETTE, { ...figee, crans: figee.crans.slice(1) }), null);
});
