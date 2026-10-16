/** Mesure les propositions sans exécuter les écritures du banc ni modifier le moteur. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildSync } from 'esbuild';
import * as moteur from '../../../../../../packages/couleur/src/index';
import * as emplois from '../../../../../../packages/kit/src/emplois/index';
import { recetteAuxReglagesCommuns } from '../../Recette CRITIQUE de qualité/Mesures/prototype';

const dossier = dirname(fileURLToPath(import.meta.url));
const racine = resolve(dossier, '../../../../../..');
const require = createRequire(import.meta.url);
const source = readFileSync(resolve(dossier, 'mesurer-regles.ts'), 'utf8');
const prefixe = source.slice(0, source.indexOf('// ------------------------------------------------- contrôle de la chaîne'));
const programme = prefixe + '\nexport { construire, regleMoteur, REGLES_SOFT, JEUX, manquees, alerteActuelle, alerteProposee, saillie, loinDeLaPage, paletteTailwind };';
const compile = buildSync({ stdin: { contents: programme, resolveDir: dossier, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('./mesurer-regles.ts', import.meta.url).href) } });
const moduleBanc = { exports: {} as any };
new Function('require', 'module', 'exports', compile.outputFiles[0].text)(require, moduleBanc, moduleBanc.exports);
const banc = moduleBanc.exports;
const { recetteParDefaut, rampesDe, intensitesDe, ancrageDe, partsDe, partDeLaReference, lireHexa, rgb8VersOklch, ecrireHexa, lineaireVersRgb8, oklchVersLineaire, plafond, courbesParDefaut, classerRecette, couleurDeLaCarte, verifierPromesses, nuancesDeProximite, proximiteDeNuances, appliquerLesReglages, grilleDe, limiteDynamique, ordreTenu } = moteur;
const { GARANTIES, TABLE_DES_DOSSIERS, sensDuTheme, contraste, atteintLeSeuil } = emplois;
const base = recetteParDefaut();
const k65 = banc.REGLES_SOFT.find((r: any) => r.id === 'K65');
const modes = ['light', 'dark'] as const;
const variantes = ['A', 'K65', 'B10', 'K65B10'] as const;
const recetteDe = (r: any, variante: string) => variante.includes('K65') ? { ...r, profils: k65.profils } : r;
const rampes = (r: any, p: any, variante: string) => banc.construire(recetteDe(r, variante), p, banc.regleMoteur, variante.includes('B10') ? 0.1 : null);
const arr = (n: number) => +n.toFixed(6);
const resume = (xs: number[]) => {
  const t = [...xs].sort((a, b) => a - b);
  return { n: xs.length, min: arr(t[0] ?? 0), mediane: arr(t.length ? (t[Math.floor((t.length - 1) / 2)] + t[Math.floor(t.length / 2)]) / 2 : 0), max: arr(t.at(-1) ?? 0) };
};
const charger = (nom: string) => {
  const c = classerRecette(readFileSync(resolve(dossier, '../../Recette CRITIQUE de qualité/Mesures/references', nom), 'utf8'));
  if (!('recette' in c)) throw Error(JSON.stringify(c));
  return c.recette;
};
const mainteneur = charger('recette-mainteneur.json');
const galerieSource = readFileSync(resolve(racine, 'packages/plugin-palettes/galerie/etats.cjs'), 'utf8');
const debutGalerie = galerieSource.indexOf('const VINGT_PALETTES_CONFORMES =');
const finGalerie = galerieSource.indexOf('\nETATS.push(', debutGalerie);
const galerieRecette = { ...base, profils: { ...base.profils, soft: { ...base.profils.soft, part: 0.45 } } };
const galeriePalettes = new Function('palette', galerieSource.slice(debutGalerie, finGalerie) + '\nreturn VINGT_PALETTES_A_VERIFIER;')((id: string, nom: string, reference: string) => ({ ...banc.paletteTailwind(0, reference, nom), id }));
const jeux = [...banc.JEUX.map((j: any) => ({ nom: j.nom, recette: { ...base, palettes: j.palettes } })), { nom: 'Mainteneur', recette: mainteneur }, { nom: 'Galerie réelle (Soft 0,45)', recette: { ...galerieRecette, palettes: galeriePalettes } }, { nom: 'Galerie avec défauts format 11', recette: { ...base, palettes: galeriePalettes } }];

function juger(r: any, p: any, rr: any, supports?: { page: string; carte: string }, carteAussi = false) {
  if (p.crans) return [];
  const resultats: any[] = [];
  for (const mode of modes) for (const intensite of intensitesDe(p)) {
    const sens = sensDuTheme(mode, r.texteDesBoutons[mode]);
    const table = TABLE_DES_DOSSIERS[mode][sens];
    const couleur = (v: string) => table[v] === 'texteDesBoutons' ? lireHexa(r.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000')! : rr[intensite][mode][r.crans.indexOf(table[v])].couleur;
    for (const g of GARANTIES) for (const f of g.fonds) {
      const second = 'fondDeLaPage' in f ? lireHexa(mode === 'dark' && supports ? supports.page : r.fonds[mode])! : 'fondDeLaCarte' in f ? (mode === 'dark' && supports ? lireHexa(supports.carte)! : couleurDeLaCarte(r, mode)) : couleur(f.variable);
      const fond = 'fondDeLaPage' in f ? 'page' : 'fondDeLaCarte' in f ? 'carte' : f.variable;
      const rapport = contraste(couleur(g.premier.variable), second);
      resultats.push({ cle: `${mode}/${sens}/${intensite}/G${g.numero}/${fond}`, garantie: `G${g.numero}`, contraste: rapport, manquee: !atteintLeSeuil(rapport, r.seuils[g.seuil]) });
      if (carteAussi && 'fondDeLaPage' in f && g.numero !== 7) {
        const carte = mode === 'dark' && supports ? lireHexa(supports.carte)! : couleurDeLaCarte(r, mode);
        const valeur = contraste(couleur(g.premier.variable), carte);
        resultats.push({ cle: `${mode}/${sens}/${intensite}/G${g.numero}/carte`, garantie: `G${g.numero}`, contraste: valeur, manquee: !atteintLeSeuil(valeur, r.seuils[g.seuil]) });
      }
    }
  }
  return resultats;
}
const rapport: any = { empreintes: {}, equivalence: [], jeux: {}, balayage: {}, interactions: [], limites: [], exemples: {} };
const { createHash } = require('node:crypto');
for (const fichier of ['mesurer-regles.ts', '../../../../../../packages/couleur/src/recette.ts', '../../../../../../packages/couleur/src/palette.ts', '../../../../../../packages/plugin-palettes/galerie/etats.cjs']) rapport.empreintes[fichier] = createHash('sha256').update(readFileSync(resolve(dossier, fichier))).digest('hex');

function comparer(r: any, p: any, nom: string) {
  try {
    const reel = rampesDe(r, p), copie = rampes(r, p, 'A');
    let couleurs = 0;
    for (const i of intensitesDe(p)) for (const m of modes) reel[i]![m].forEach((c, k) => { if (c.hexa !== copie[i][m][k]?.hexa) couleurs++; });
    const promesses = verifierPromesses(r, p);
    const jugees = juger(r, p, copie);
    const ecartsPromesses = promesses.filter((v, k) => (v.verdict === 'manquee') !== jugees[k]?.manquee || v.contraste !== jugees[k]?.contraste).length;
    rapport.equivalence.push({ nom, couleurs, promesses: ecartsPromesses });
  } catch (erreur) { rapport.equivalence.push({ nom, erreur: String(erreur) }); }
}
for (const j of jeux) for (const p of j.recette.palettes) comparer(j.recette, p, `${j.nom}/${p.nom}`);
const reference = banc.paletteTailwind(0, '#0013FF', 'Bleu électrique');
for (const cas of [
  { nom: 'parts propres', p: { ...reference, parts: { soft: 0.4, vivid: 0.9, origine: 'designer' } } },
  { nom: 'dérive non liée', p: { ...reference, derive: { lien: false, soft: { clair: -40, sombre: 30, origine: 'libre', saturation: { clair: -0.4, sombre: 0.5 }, clarte: { clair: -0.05, sombre: 0.04 } }, vivid: { clair: 20, sombre: -10, origine: 'libre' } } } },
  { nom: 'référence réglée', p: appliquerLesReglages(base, reference, { teinte: { vivid: 15, soft: -10 }, clarte: { vivid: 0.03, soft: -0.02 }, part: 0.8 }) },
  { nom: 'libre', p: { ...reference, crans: [100, 200, 400, 600, 800, 900] } },
  { nom: 'figée', p: { ...reference, intensites: 1, crans: [100, 300, 500, 900], figees: { light: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'] } } },
  { nom: '13 nuances', p: reference, r: { ...base, ...moteur.PREREGLAGES[13] } },
]) comparer(cas.r ?? base, cas.p, cas.nom);

for (const jeu of jeux) {
  const r = jeu.recette;
  const sortie: any = { palettes: r.palettes.length, variantes: {}, porteurs: [] };
  for (const p of r.palettes) {
    const avant = ancrageDe(r, p), apres = ancrageDe(recetteDe(r, 'K65'), p);
    if (avant.profil !== apres.profil) sortie.porteurs.push({ nom: p.nom, reference: p.reference, part: partDeLaReference(r, p), avant, apres, partsAvant: partsDe(r, p), partsApres: partsDe(recetteDe(r, 'K65'), p) });
  }
  for (const variante of variantes) {
    const rv = recetteDe(r, variante);
    const stats: any = {}, proches: any[] = [], garanties: any = {}, nouvelles: any[] = [], resolues: any[] = [], alertes: any[] = [];
    const nuances = r.palettes.map((p: any) => nuancesDeProximite(rv, p, rampes(r, p, variante)));
    r.palettes.forEach((p: any, a: number) => {
      for (let b = a + 1; b < r.palettes.length; b++) if (nuances[a] && nuances[b]) {
        const proximite = proximiteDeNuances(nuances[a]!, nuances[b]!);
        if (proximite.distance < rv.seuils.palettesProches) proches.push({ a: p.nom, b: r.palettes[b].nom, ...proximite });
      }
      const avant = rampes(r, p, 'A'), apres = rampes(r, p, variante);
      const j0 = juger(r, p, avant), j1 = juger(rv, p, apres);
      j1.forEach((v, k) => {
        if (v.manquee) garanties[v.cle] = (garanties[v.cle] ?? 0) + 1;
        if (v.manquee && !j0[k].manquee) nouvelles.push({ nom: p.nom, ...v, avant: j0[k].contraste });
        if (!v.manquee && j0[k].manquee) resolues.push({ nom: p.nom, ...v, avant: j0[k].contraste });
      });
      alertes.push({ nom: p.nom, actuelle: banc.alerteActuelle(rv, p, apres), proposee: banc.alerteProposee(rv, p, apres), reperes: moteur.confusionsDe(rv, p).length });
      for (const i of intensitesDe(p)) for (const m of modes) {
        const cle = `${i}/${m}`;
        const s = stats[cle] ??= { changees: 0, total: 0, deltas: [], parCran: {}, softSuperieur: [] };
        apres[i][m].forEach((c: any, k: number) => {
          const delta = c.C - avant[i][m][k].C;
          s.total++; if (c.hexa !== avant[i][m][k].hexa) s.changees++;
          s.deltas.push(delta);
          (s.parCran[r.crans[k]] ??= []).push(delta);
          if (i === 'soft' && c.C > apres.vivid[m][k].C + 0.002) s.softSuperieur.push({ nom: p.nom, cran: r.crans[k], rapport: arr(c.C / apres.vivid[m][k].C) });
        });
      }
    });
    for (const s of Object.values(stats) as any[]) { s.deltas = resume(s.deltas); s.parCran = Object.fromEntries(Object.entries(s.parCran).map(([k, v]) => [k, resume(v as number[])])); }
    sortie.variantes[variante] = { stats, proches, garanties, nouvelles, resolues, alertes };
  }
  rapport.jeux[jeu.nom] = sortie;
}

for (const support of ['produit', 'Titanium', 'banc défaut', 'banc Titanium']) for (const variante of variantes) {
  const total: any = { echecs: {}, nouvelles: [], resolues: [], ecartsCopie: 0 };
  for (const light of ['blanc', 'noir']) for (const dark of ['blanc', 'noir']) for (let H = 0; H < 360; H += 5) for (const L of [0.62, 0.75]) {
    const texteDesBoutons = { light, dark };
    const r = { ...base, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons) };
    const ref = ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, H, C: 0.9 * plafond(L, H, 'srgb') })));
    const p = { ...banc.paletteTailwind(0, ref), derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } } };
    const supports = support.includes('Titanium') ? { page: '#0A0A0B', carte: '#1A1C1F' } : undefined;
    const a = juger(r, p, rampes(r, p, 'A'), supports, support.startsWith('banc'));
    const b = juger(recetteDe(r, variante), p, rampes(r, p, variante), supports, support.startsWith('banc'));
    if (support === 'produit') {
      const reel = verifierPromesses(r, p);
      total.ecartsCopie += reel.filter((v, k) => (v.verdict === 'manquee') !== a[k].manquee || v.contraste !== a[k].contraste).length;
    }
    b.forEach((v, k) => {
      if (v.manquee) total.echecs[v.cle] = (total.echecs[v.cle] ?? 0) + 1;
      if (v.manquee && !a[k].manquee) total.nouvelles.push({ H, L, light, dark, reference: ref, ...v, avant: a[k].contraste });
      if (!v.manquee && a[k].manquee) total.resolues.push({ H, L, light, dark, reference: ref, ...v, avant: a[k].contraste });
    });
  }
  rapport.balayage[`${support}/${variante}`] = total;
}

for (const p of [reference, banc.paletteTailwind(0, '#EF4444', 'Rouge'), ...mainteneur.palettes]) {
  const r = mainteneur.palettes.includes(p) ? mainteneur : base;
  const ex: any = {};
  for (const v of variantes) {
    const rr = rampes(r, p, v), rv = recetteDe(r, v);
    ex[v] = { parts: partsDe(rv, p), ancrage: ancrageDe(rv, p), ordre: ordreTenu(rv, p), rampes: {} };
    for (const i of intensitesDe(p)) for (const m of modes) ex[v].rampes[`${i}/${m}`] = rr[i][m].map((c: any, k: number) => ({ cran: r.crans[k], hexa: c.hexa, C: arr(c.C), L: arr(c.L), carte: arr(contraste(c.couleur, couleurDeLaCarte(rv, m))) }));
  }
  rapport.exemples[p.nom] = ex;
}

for (const jeu of [jeux[0], jeux.find((j: any) => j.nom === 'Mainteneur')]) for (const p of jeu.recette.palettes) for (const i of ['soft', 'vivid']) for (const bout of ['clair', 'sombre']) {
  const resultat: any = { jeu: jeu.nom, nom: p.nom, i, bout };
  if (!intensitesDe(p).includes(i as any)) continue;
  for (const v of ['A', 'K65']) {
    const r = recetteDe(jeu.recette, v);
    const valeur = p.derive[i].saturation?.[bout] ?? 0;
    const candidate = (n: number) => ({ ...p, derive: { ...p.derive, [i]: { ...p.derive[i], saturation: { clair: 0, sombre: 0, ...p.derive[i].saturation, [bout]: n } } } });
    const limite = limiteDynamique({ recette: r, palette: p, candidate, valeur, bornes: { bas: -1, haut: 1 }, pas: 0.01, ordre: false });
    resultat[v] = { bas: limite.bas.valeur, haut: limite.haut.valeur };
  }
  if (JSON.stringify(resultat.A) !== JSON.stringify(resultat.K65)) rapport.limites.push(resultat);
}

const utilitaires = mainteneur.palettes.filter(p => ['Sky', 'Orange', 'Grass', 'Poppy'].includes(p.nom!));
rapport.uniformite = {};
for (const v of variantes) rapport.uniformite[v] = [50, 100, 200, 300].map(cran => {
  const chromas = utilitaires.map(p => ({ nom: p.nom, C: rampes(mainteneur, p, v).soft.light[mainteneur.crans.indexOf(cran)].C }));
  return { cran, chromas, rapport: Math.max(...chromas.map(c => c.C)) / Math.min(...chromas.map(c => c.C)) };
});
rapport.zones = Object.fromEntries(modes.map(m => [m, base.crans.map((cran, k) => ({ cran, zone: banc.loinDeLaPage(base, base.courbes[m][k], m) < 0.35 ? 'fonds' : 'textes' }))]));
rapport.interactions = [];
for (const p0 of [reference, ...mainteneur.palettes, ...jeux[0].recette.palettes]) {
  const r = mainteneur.palettes.includes(p0) ? mainteneur : base;
  for (const part of [undefined, 0.3, 0.6, 0.9, 1]) for (const clarte of [-0.05, 0, 0.05]) for (const dec of [-0.5, 0, 0.5]) {
    const porteur = moteur.cleDuPorteur(r, p0);
    let p = appliquerLesReglages(r, p0, { teinte: {}, clarte: { [porteur]: clarte }, ...(part === undefined ? {} : { part }) });
    p = { ...p, derive: { ...p.derive, lien: false, [porteur]: { ...p.derive[porteur], saturation: { clair: dec, sombre: dec } } } };
    for (const v of ['A', 'K65']) {
      const rv = recetteDe(r, v), avant = juger(rv, p, rampes(r, p, v)), apres = juger(rv, p, rampes(r, p, v + 'B10'));
      apres.forEach((a, k) => {
        if (a.manquee && !avant[k].manquee) rapport.interactions.push({ nom: p0.nom, reference: p.reference, part, clarte, saturation: dec, variante: v, cle: a.cle, avant: avant[k].contraste, apres: a.contraste, ordre: ordreTenu(rv, p) });
      });
    }
  }
}
rapport.regleZ = [];
for (const parts of [{ soft: 0, vivid: 0.95 }, { soft: 0.9, vivid: 0.95 }, { soft: 0.2, vivid: 0.95 }]) {
  const p = { ...reference, parts: { ...parts, origine: 'designer' } };
  const z = banc.REGLES_SOFT.find((x: any) => x.id === 'Z');
  const r = { ...base, profils: z.profils };
  const rr = banc.construire(r, p, z.fabrique, null);
  rapport.regleZ.push({ parts, soft: rr.soft.light.map((c: any) => c.hexa), vivid: rr.vivid.light.map((c: any) => c.hexa) });
}
rapport.bosseNonPorteur = {};
for (const v of ['A', 'K65']) {
  const rv = recetteDe(base, v), a = ancrageDe(rv, reference), rr = rampes(base, reference, v + 'B10');
  rapport.bosseNonPorteur[v] = Object.fromEntries(modes.map(m => [m, rr.soft[m].map((c: any, k: number) => ({ cran: rv.crans[k], C: c.C, saute: k === a.rangs[m] }))]));
}
rapport.jaunes = ['yellow', 'amber', 'green', 'cyan'].map(nom => {
  const p = jeux[0].recette.palettes.find((p: any) => p.nom === nom);
  return { nom, crans: [50, 100, 200, 300].map(cran => ({ cran, A: rampes(base, p, 'A').soft.light[base.crans.indexOf(cran)].C, K65: rampes(base, p, 'K65').soft.light[base.crans.indexOf(cran)].C })) };
});
rapport.uniformiteReglagesCommuns = {};
const commune = recetteAuxReglagesCommuns(mainteneur);
for (const v of variantes) rapport.uniformiteReglagesCommuns[v] = [50, 100, 200, 300].map(cran => {
  const chromas = commune.palettes.filter(p => utilitaires.some(u => u.id === p.id)).map(p => ({ nom: p.nom, C: rampes(commune, p, v).soft.light[commune.crans.indexOf(cran)].C }));
  return { cran, chromas, rapport: Math.max(...chromas.map(c => c.C)) / Math.min(...chromas.map(c => c.C)) };
});
const purple = jeux[0].recette.palettes.find((p: any) => p.nom === 'purple');
const candidatePurple = (clarte: number) => appliquerLesReglages(base, purple, { teinte: {}, clarte: { vivid: clarte } });
const purpleReglee = candidatePurple(-0.05);
rapport.contreExempleBosse = {
  palette: purpleReglee,
  validation: moteur.validerRecette({ ...base, palettes: [purpleReglee] }),
  limite: limiteDynamique({ recette: base, palette: purple, candidate: candidatePurple, valeur: 0, bornes: { bas: -0.1, haut: 0.1 }, pas: 0.005, ordre: true }),
  avant: juger(base, purpleReglee, rampes(base, purpleReglee, 'A')).filter(p => p.manquee || p.cle.includes('G7')),
  apres: juger(base, purpleReglee, rampes(base, purpleReglee, 'B10')).filter(p => p.manquee || p.cle.includes('G7')),
};
const tw4 = readFileSync(resolve(dossier, '../../Recette CRITIQUE de qualité/Collecte/Composants/sources/tailwind-theme.css.txt'), 'utf8');
const couleurs4 = new Map([...tw4.matchAll(/--color-([a-z]+)-(\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g)].map(m => [`${m[1]}/${m[2]}`, { L: +m[3] / 100, C: +m[4], H: +m[5] }]));
const comparaisons4: any[] = [];
for (const v of ['A', 'K65']) for (const mode of modes) {
  const valeurs: number[] = [];
  for (const p of jeux[0].recette.palettes) {
    const cran = emplois.cranDeLaVariable('surface/foreground', mode, sensDuTheme(mode, base.texteDesBoutons[mode]));
    const cible = couleurs4.get(`${p.nom}/${cran}`);
    if (cible) valeurs.push(rampes(base, p, v).soft[mode][base.crans.indexOf(cran)].C / cible.C);
  }
  comparaisons4.push({ variante: v, mode, rapport: resume(valeurs) });
}
rapport.textesTailwind4 = comparaisons4;
rapport.bosseAuxBornesPermises = [];
for (const p of jeux[0].recette.palettes) for (const v of ['A', 'K65']) for (const i of ['soft', 'vivid']) {
  const r = recetteDe(base, v);
  const candidate = (clarte: number) => appliquerLesReglages(r, p, { teinte: {}, clarte: { [i]: clarte } });
  const limite = limiteDynamique({ recette: r, palette: p, candidate, valeur: 0, bornes: { bas: -0.1, haut: 0.1 }, pas: 0.005, ordre: true });
  for (const borne of [limite.bas.valeur, limite.haut.valeur]) {
    const q = candidate(borne), a = juger(r, q, rampes(r, q, 'A')), b = juger(r, q, rampes(r, q, 'B10'));
    b.forEach((vv, k) => {
      if (vv.manquee && !a[k].manquee) rapport.bosseAuxBornesPermises.push({ nom: p.nom, variante: v, profilRegle: i, borne, reference: q.reference, cle: vv.cle, avant: a[k].contraste, apres: vv.contraste, manquaientAvant: a.filter(x => x.manquee).length, palette: q });
    });
  }
}
rapport.separationDark = {};
for (const jeu of jeux) for (const v of variantes) {
  const r = recetteDe(jeu.recette, v);
  const valeurs: any = {};
  for (const p of r.palettes) for (const i of intensitesDe(p)) for (const cran of [300, 400, 500]) {
    const c = rampes(jeu.recette, p, v)[i].dark[r.crans.indexOf(cran)];
    (valeurs[`${i}/${cran}`] ??= []).push(contraste(c.couleur, couleurDeLaCarte(r, 'dark')));
  }
  rapport.separationDark[`${jeu.nom}/${v}`] = Object.fromEntries(Object.entries(valeurs).map(([k, xs]) => [k, resume(xs as number[])]));
}
rapport.messageSaturation = [];
for (const p of jeux.find((j: any) => j.nom === 'Références saturées').recette.palettes) for (const part of [1, 0.8, 0.5]) {
  const reglee = appliquerLesReglages(base, p, { teinte: {}, clarte: {}, part });
  const a = ancrageDe(base, reglee), rr = rampes(base, reglee, 'A');
  rapport.messageSaturation.push({ nom: p.nom, part, reference: reglee.reference, saillie: Object.fromEntries(modes.map(m => [m, banc.saillie(rr[a.profil][m], a.rangs[m])])) });
}
rapport.maquetteVertTerne = (() => {
  const p = banc.paletteTailwind(0, '#7DB05F');
  return { actuelle: banc.alerteActuelle(base, p, rampes(base, p, 'A')), proposee: banc.alerteProposee(base, p, rampes(base, p, 'A')), part: partDeLaReference(base, p) };
})();
writeFileSync(resolve(dossier, 'REVIEW-CODEX-MESURES.json'), JSON.stringify(rapport, null, 2) + '\n');
console.log(JSON.stringify({ equivalence: rapport.equivalence.filter((x: any) => x.erreur || x.couleurs || x.promesses), balayage: Object.fromEntries(Object.entries(rapport.balayage).map(([k, v]: any) => [k, { echecs: Object.values(v.echecs).reduce((s: number, n: any) => s + n, 0), nouvelles: v.nouvelles.length, resolues: v.resolues.length, ecartsCopie: v.ecartsCopie }])), limites: rapport.limites.length }, null, 2));
