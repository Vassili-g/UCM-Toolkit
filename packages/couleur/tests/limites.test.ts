/**
 * La limite dynamique d'un réglage ([DER-19], [DER-20]), éprouvée sur le
 * Color shift de quatre références de l'étude : chaque valeur permise garde
 * les promesses tenues au départ, un pas au-delà d'une borne à cause en fait
 * manquer une, et les limites se croisent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BORNES_DU_COLOR_SHIFT,
  PAS_DU_COLOR_SHIFT,
  arrondir,
  balayerLaLimite,
  limiteDynamique,
  ordreTenu,
  verifierPromesses,
  type Borne,
  type GrandeurDuColorShift,
  type Limite,
  type Palette,
  type Promesse,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

type Bout = 'clair' | 'sombre';

/** La palette dont les deux profils prennent `valeur` pour `grandeur` au `bout`. */
function avec(palette: Palette, grandeur: GrandeurDuColorShift, bout: Bout, valeur: number): Palette {
  const regler = (derive: Palette['derive']['soft']): Palette['derive']['soft'] => (grandeur === 'teinte'
    ? { ...derive, [bout]: valeur, origine: 'libre' }
    : { ...derive, [grandeur]: { ...(derive[grandeur] ?? { clair: 0, sombre: 0 }), [bout]: valeur } });
  return { ...palette, derive: { ...palette.derive, soft: regler(palette.derive.soft), vivid: regler(palette.derive.vivid) } };
}

const valeurDe = (palette: Palette, grandeur: GrandeurDuColorShift, bout: Bout): number =>
  (grandeur === 'teinte' ? palette.derive.vivid[bout] : palette.derive.vivid[grandeur]?.[bout] ?? 0);

function limite(recette: Recette, palette: Palette, grandeur: GrandeurDuColorShift, bout: Bout): Limite {
  const borne = BORNES_DU_COLOR_SHIFT[grandeur];
  return limiteDynamique({
    recette,
    palette,
    candidate: (valeur) => avec(palette, grandeur, bout, valeur),
    valeur: valeurDe(palette, grandeur, bout),
    bornes: { bas: -borne, haut: borne },
    pas: PAS_DU_COLOR_SHIFT[grandeur],
    ordre: grandeur === 'clarte',
  });
}

const cle = (promesse: Promesse): string => `${promesse.mode}/${promesse.profil}/${promesse.paire.numero}`;
const tenuesDe = (recette: Recette, palette: Palette): Set<string> =>
  new Set(verifierPromesses(recette, palette).filter((promesse) => promesse.verdict === 'tenue').map(cle));

const REFERENCES = { Bleu: '#1E6FD9', Rouge: '#DC2626', Jaune: '#EAB308', Sauge: '#A0B599' } as const;
const GRANDEURS: readonly GrandeurDuColorShift[] = ['teinte', 'saturation', 'clarte'];
const BOUTS: readonly Bout[] = ['clair', 'sombre'];

function neuve(hexa: string): { recette: Recette; palette: Palette } {
  const palette = paletteTailwind('p-000000c1', hexa);
  return { recette: recetteAvec(palette), palette };
}

test('[DER-19] toute valeur de la limite, au pas du réglage, garde les promesses tenues au départ et l’ordre des nuances', () => {
  const fautes: string[] = [];
  for (const [nom, hexa] of Object.entries(REFERENCES)) {
    const { recette, palette } = neuve(hexa);
    const tenues = tenuesDe(recette, palette);
    for (const grandeur of GRANDEURS) {
      for (const bout of BOUTS) {
        const { bas, haut } = limite(recette, palette, grandeur, bout);
        const pas = PAS_DU_COLOR_SHIFT[grandeur];
        for (let valeur = bas.valeur; valeur <= haut.valeur + 1e-9; valeur = arrondir(valeur + pas, 3)) {
          const candidate = avec(palette, grandeur, bout, valeur);
          const manquee = verifierPromesses(recette, candidate).find((promesse) => promesse.verdict === 'manquee' && tenues.has(cle(promesse)));
          if (manquee) fautes.push(`${nom} ${grandeur} ${bout} ${valeur} : ${cle(manquee)} manquée`);
          if (grandeur === 'clarte' && !ordreTenu(recette, candidate)) fautes.push(`${nom} ${grandeur} ${bout} ${valeur} : ordre rompu`);
        }
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});

test('[DER-20] un pas au-delà d’une borne à cause, la cause manque : une promesse tenue au départ, ou l’ordre', () => {
  const fautes: string[] = [];
  let causes = 0;
  for (const [nom, hexa] of Object.entries(REFERENCES)) {
    const { recette, palette } = neuve(hexa);
    const tenues = tenuesDe(recette, palette);
    for (const grandeur of GRANDEURS) {
      for (const bout of BOUTS) {
        const { bas, haut } = limite(recette, palette, grandeur, bout);
        for (const [borne, sens] of [[bas, -1], [haut, 1]] as [Borne, number][]) {
          if (!borne.cause) {
            if (Math.abs(borne.valeur) !== BORNES_DU_COLOR_SHIFT[grandeur]) fautes.push(`${nom} ${grandeur} ${bout} : borne ${borne.valeur} sans cause`);
            continue;
          }
          causes += 1;
          const auDela = avec(palette, grandeur, bout, arrondir(borne.valeur + sens * PAS_DU_COLOR_SHIFT[grandeur], 3));
          if (borne.cause.nature === 'ordre') {
            if (ordreTenu(recette, auDela)) fautes.push(`${nom} ${grandeur} ${bout} : l’ordre tient au-delà de ${borne.valeur}`);
            continue;
          }
          const { promesse } = borne.cause;
          if (!tenues.has(cle(promesse))) fautes.push(`${nom} ${grandeur} ${bout} : ${cle(promesse)} manquait au départ`);
          const jugee = verifierPromesses(recette, auDela).find((autre) => cle(autre) === cle(promesse));
          if (jugee?.verdict !== 'manquee') fautes.push(`${nom} ${grandeur} ${bout} : ${cle(promesse)} tenue au-delà de ${borne.valeur}`);
        }
      }
    }
  }
  assert.deepEqual(fautes, []);
  // Trois bornes à cause par référence au moins : la luminosité claire en bas et en haut, la sombre en haut.
  assert.ok(causes >= 4 * 3, `${causes} bornes à cause`);
});

test('[DER-20] les limites se croisent : la luminosité sombre posée en butée haute resserre la teinte du même bout', () => {
  const teintes: Record<string, [number, number]> = {};
  for (const [nom, hexa] of Object.entries(REFERENCES)) {
    const { recette, palette } = neuve(hexa);
    const butee = limite(recette, palette, 'clarte', 'sombre').haut.valeur;
    const { bas, haut } = limite(recette, avec(palette, 'clarte', 'sombre', butee), 'teinte', 'sombre');
    teintes[nom] = [bas.valeur, haut.valeur];
  }
  // Mesure de l'étude, section 5.2 : Bleu ne descend plus sous 0°, Jaune ne monte plus au-dessus de −7°, Sauge de +8°.
  // Rouge ne dépasse plus sa teinte Tailwind, +0,23° : un pas de plus fait manquer une garantie.
  assert.deepEqual(teintes, { Bleu: [0, 90], Rouge: [-90, 0.23], Jaune: [-90, -7], Sauge: [-90, 8] });
});

test('[DER-19] une promesse manquée au départ ne borne rien : Vert la laisse manquer sur toute la plage de teinte', () => {
  const { recette, palette } = neuve('#16A34A');
  const manquees = verifierPromesses(recette, palette).filter((promesse) => promesse.verdict === 'manquee');
  assert.ok(manquees.length > 0, 'Vert manque des garanties sans réglage');
  const { bas, haut } = limite(recette, palette, 'teinte', 'clair');
  assert.deepEqual([bas, haut], [{ valeur: -90, cause: null }, { valeur: 90, cause: null }]);
});

test('[DER-19] une palette libre n’a pas de promesse : seul l’ordre des nuances borne sa luminosité', () => {
  const palette = paletteTailwind('p-000000c2', '#1E6FD9', { crans: [50, 200, 500, 800, 950] });
  const recette = recetteAvec(palette);
  assert.deepEqual(verifierPromesses(recette, palette), []);
  const { bas, haut } = limite(recette, palette, 'clarte', 'clair');
  assert.equal(haut.cause?.nature, 'ordre');
  assert.equal(bas.cause?.nature ?? 'fixe', bas.valeur === -0.15 ? 'fixe' : 'ordre');
});

test('[DER-20] le balayage rend la main après chaque candidate et rend la même limite que le calcul d’un trait', () => {
  const { recette, palette } = neuve('#1E6FD9');
  const demande = {
    recette,
    palette,
    candidate: (valeur: number) => avec(palette, 'clarte', 'clair', valeur),
    valeur: 0,
    bornes: { bas: -0.15, haut: 0.15 },
    pas: 0.005,
    ordre: true,
  };
  const balayage = balayerLaLimite(demande);
  let rendus = 0;
  let pas = balayage.next();
  while (!pas.done) {
    rendus += 1;
    pas = balayage.next();
  }
  // −0,050 à +0,040 : dix pas vers le bas, huit vers le haut, chacun suivi d'une main rendue.
  assert.equal(rendus, 18);
  assert.deepEqual(pas.value, limiteDynamique(demande));
});
