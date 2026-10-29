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
  courbesParDefaut,
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
import { copie, paletteTailwind, recetteAvec } from './fabrique';

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

const cle = (promesse: Promesse): string => {
  const { second } = promesse;
  const fond = second.nature === 'cran' ? second.cran : second.nature === 'fond' ? second.fond : second.nature;
  return `${promesse.mode}/${promesse.profil}/${promesse.garantie.numero}/${fond}`;
};
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
  const causes: string[] = [];
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
          causes.push(`${nom} ${grandeur} ${bout} ${sens < 0 ? 'bas' : 'haut'} : ${borne.cause.nature === 'ordre' ? 'ordre' : cle(borne.cause.promesse)}`);
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
  // La correction des textes rend G3 et G9 aux teintes qui les manquaient : elles ne bornent plus un réglage que là où
  // le cran corrigé bute sur son voisin. Le 700 du Dark, texte de la page, s'éclaircit de 0,06 vers le 800 pour tenir
  // G9 sur le fond teinté 300 ; un peu plus de luminosité sombre en haut, ou de luminosité claire en bas pour Bleu et
  // Rouge, et il atteint le 800 sans tenir le seuil.
  assert.deepEqual(causes, [
    'Bleu clarte clair bas : dark/soft/9/300',
    'Bleu clarte sombre haut : dark/soft/9/300',
    'Rouge clarte clair bas : dark/vivid/9/300',
    'Rouge clarte sombre haut : dark/soft/9/300',
    'Jaune clarte sombre haut : dark/soft/9/300',
    'Sauge clarte sombre haut : dark/vivid/9/300',
  ]);
});

test('[DER-20] les limites se croisent : la luminosité sombre posée en butée haute resserre la teinte du même bout', () => {
  const teintes: Record<string, [number, number]> = {};
  for (const [nom, hexa] of Object.entries(REFERENCES)) {
    const { recette, palette } = neuve(hexa);
    const butee = limite(recette, palette, 'clarte', 'sombre').haut.valeur;
    const { bas, haut } = limite(recette, avec(palette, 'clarte', 'sombre', butee), 'teinte', 'sombre');
    teintes[nom] = [bas.valeur, haut.valeur];
  }
  // Mesure du moteur aux garanties G1 à G9, textes corrigés (`corrigerLesTextes`) : à la butée haute de la luminosité
  // sombre, le 700 du Dark touche déjà le 800 pour tenir G9 sur le fond teinté 300, et la teinte du Dark se resserre
  // jusqu'à ce que G9 manque. Aux parts communes 0,85 et 0,95, à l'enveloppe par défaut ([MOT-35]), à la dérive de
  // [MOT-36] et à la clarté selon la teinte, Bleu se resserre entre −3° et +90°, Rouge entre −90° et +24°, Jaune
  // entre −40° et −20°, et Sauge, portée par Vivid avec sa référence exacte, garde toute la plage.
  assert.deepEqual(teintes, { Bleu: [-3, 90], Rouge: [-90, 24], Jaune: [-40, -20], Sauge: [-90, 90] });
});

test('[DER-19] une promesse manquée au départ ne borne rien : Bleu, texte des boutons noir, la laisse manquer sur toute la plage de teinte', () => {
  // G7 jugée contre la carte, Vert ne manque plus rien par défaut : Bleu manque G1 en Light inversé (texte noir).
  const noir = { light: 'noir', dark: 'noir' } as const;
  const palette = paletteTailwind('p-000000c1', '#1E6FD9');
  const recette: Recette = { ...recetteAvec(palette), texteDesBoutons: noir, courbes: courbesParDefaut(11, noir) };
  const manquees = verifierPromesses(recette, palette).filter((promesse) => promesse.verdict === 'manquee');
  assert.ok(manquees.length > 0, 'Bleu manque des garanties sans réglage');
  const { bas, haut } = limite(recette, palette, 'teinte', 'clair');
  assert.deepEqual([bas, haut], [{ valeur: -90, cause: null }, { valeur: 90, cause: null }]);
});

test('[DER-19] une palette libre n’a pas de promesse : seul l’ordre des nuances borne sa luminosité', () => {
  // Le 150 n'est pas dans la table des crans clairs : il garde la luminosité du réglage, alors que le 100 prend la clarté de la courbe.
  const palette = paletteTailwind('p-000000c2', '#1E6FD9', { crans: [100, 150, 300, 500, 800, 950] });
  const recette = recetteAvec(palette);
  assert.deepEqual(verifierPromesses(recette, palette), []);
  const { bas, haut } = limite(recette, palette, 'clarte', 'clair');
  assert.equal(haut.cause?.nature, 'ordre');
  assert.equal(bas.cause?.nature ?? 'fixe', bas.valeur === -0.15 ? 'fixe' : 'ordre');
  // Une liste dont les crans clairs sont tous dans la table garde l'ordre sous toute luminosité : les deux bornes sont fixes.
  const dansLaTable = paletteTailwind('p-000000c3', '#1E6FD9', { crans: [50, 200, 500, 800, 950] });
  const limiteDeLaTable = limite(recetteAvec(dansLaTable), dansLaTable, 'clarte', 'clair');
  assert.deepEqual([limiteDeLaTable.bas, limiteDeLaTable.haut], [{ valeur: -0.15, cause: null }, { valeur: 0.15, cause: null }]);
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
  // −0,15 à +0,15 : trente pas vers le haut, chacun suivi d'une main rendue. Le 50, le 100 et le 200 de Light
  // ignorent la luminosité, le 300 et le 400 n'en gardent que deux tiers et un tiers : ni l'ordre des nuances ni
  // aucune promesse de Bleu n'arrête le haut. Vers le bas, le 700 du Dark, corrigé jusque sous le 800, ne tient plus
  // G9 à −0,13 : vingt-cinq pas.
  assert.equal(rendus, 55);
  assert.equal(pas.value.bas.valeur, -0.125);
  assert.deepEqual(pas.value, limiteDynamique(demande));
});

test('[DER-20] [VER-21] la limite ne borne pas le réglage par la promesse de la carte, manquée au départ, alors que la page de la même garantie est tenue', () => {
  const { recette: neutre, palette } = neuve('#1E6FD9');
  const rang = neutre.crans.indexOf(600);
  // Une clarté d'anneau Dark qui tient G7 contre la page et la manque contre la carte, plus claire.
  let recette: Recette | null = null;
  for (let L = 0.4; L <= 0.6 && !recette; L += 0.002) {
    const essai = copie(neutre) as Recette;
    (essai.courbes.dark as number[])[rang] = L;
    const g7 = verifierPromesses(essai, palette).filter((p) => p.garantie.numero === 7 && p.mode === 'dark' && p.profil === 'soft');
    if (g7.length === 2 && g7[0].verdict === 'tenue' && g7[1].verdict === 'manquee') recette = essai;
  }
  assert.ok(recette, 'aucune clarté ne sépare la page de la carte');
  const g7 = verifierPromesses(recette, palette).filter((p) => p.garantie.numero === 7 && p.mode === 'dark' && p.profil === 'soft');
  assert.deepEqual(g7.map((p) => p.second.nature === 'fond' && p.second.fond), ['page', 'carte']);
  assert.notEqual(cle(g7[0]), cle(g7[1]), 'la page et la carte ont chacune leur clé');
  const causes: string[] = [];
  for (const grandeur of GRANDEURS) {
    for (const bout of BOUTS) {
      const { bas, haut } = limite(recette, palette, grandeur, bout);
      for (const borne of [bas, haut]) if (borne.cause?.nature === 'promesse') causes.push(cle(borne.cause.promesse));
    }
  }
  assert.ok(causes.length > 0);
  assert.ok(!causes.includes(cle(g7[1])), `la carte, manquée au départ, borne un réglage : ${causes.join(', ')}`);
});
