/** Les choix de session suivent les identifiants, y compris quand la recette est remplacée. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { candidatDeTeinte, cleDuPorteur, pairesTropProches, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { reglerClarte, reglerSaturation, remplacerPalette } from '../src/edition';
import { valeursDesProfils } from '../src/reglagesParDefaut';
import { annulerLaPalette, choisirAffichage, choisirPaletteARegler, cocherPalette, constatsDeLaComparaison, comparerLaPaire, entrerEnHarmonisation, memoriserLeDepart, modifieeDepuisLeDepart, paletteARegler, harmonisationInitiale, restaurerLesReglages, synchroniserHarmonisation, toutDecocher } from '../src/harmonisation';
import { paletteTailwind, recetteAvec } from '../../couleur/tests/fabrique';

const defaut = recetteParDefaut();
const palettes: Palette[] = Array.from({ length: 5 }, (_, rang) => ({
  id: `p-0000000${rang}`, nom: 'Même nom', reference: '#0891B2',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'libre' }, vivid: { clair: 0, sombre: 0, origine: 'libre' } },
}));
const recette: Recette = { ...defaut, palettes };
const selectionner = (ids: readonly string[]) => ids.reduce((etat, id) => cocherPalette(etat, recette, id), harmonisationInitiale());

test('[UI-39] deux palettes de même nom se cochent séparément, dans l’ordre de cochage', () => {
  const etat = selectionner([palettes[1].id, palettes[0].id]);
  assert.deepEqual(etat.cochees, [palettes[1].id, palettes[0].id]);
  assert.equal(etat.regler, palettes[1].id);
  assert.equal(etat.mode, 'light');
  assert.equal(etat.intensite, 'vivid');
  assert.equal(etat.affichage, 'couleurs');
  assert.equal(etat.roue, false);
  assert.equal(etat.vision, 'Normale');
});

test('[UI-39] une cinquième palette est refusée ; un changement des cochées efface le refus', () => {
  const quatre = selectionner(palettes.slice(0, 4).map(({ id }) => id));
  const refusee = cocherPalette(quatre, recette, palettes[4].id);
  assert.deepEqual(refusee.cochees, quatre.cochees);
  assert.equal(refusee.trop, true);
  assert.equal(quatre.trop, false);
  const decochee = cocherPalette(refusee, recette, palettes[0].id);
  assert.equal(decochee.trop, false);
  assert.equal(decochee.regler, palettes[1].id);
  assert.equal(cocherPalette(decochee, recette, palettes[4].id).cochees.at(-1), palettes[4].id);
  const vide = toutDecocher(refusee);
  assert.deepEqual(vide.cochees, []);
  assert.equal(vide.regler, null);
  assert.equal(vide.trop, false);
});

test('[UI-39] Régler accepte seulement une cochée et suit le décochage', () => {
  const deux = selectionner(palettes.slice(0, 2).map(({ id }) => id));
  assert.equal(choisirPaletteARegler(deux, palettes[4].id), deux);
  const choisie = choisirPaletteARegler(deux, palettes[1].id);
  assert.equal(choisie.regler, palettes[1].id);
  assert.equal(cocherPalette(choisie, recette, palettes[1].id).regler, palettes[0].id);
  assert.equal(cocherPalette(cocherPalette(choisie, recette, palettes[1].id), recette, palettes[0].id).regler, null);
});

test('[UI-39] renommage, import et synchronisation conservent les identifiants présents', () => {
  const etat = selectionner([palettes[1].id, palettes[0].id]);
  const importee = { ...recette, palettes: [...palettes].reverse().map((palette) => ({ ...palette, nom: 'Renommée', reference: '#FACC15' })) };
  assert.deepEqual(synchroniserHarmonisation(etat, importee).cochees, etat.cochees);
  assert.equal(synchroniserHarmonisation(etat, importee).regler, etat.regler);
  const supprimee = synchroniserHarmonisation({ ...etat, departs: new Map(palettes.map((palette) => [palette.id, palette])) }, { ...recette, palettes: palettes.filter(({ id }) => id !== palettes[1].id) });
  assert.deepEqual(supprimee.cochees, [palettes[0].id]);
  assert.equal(supprimee.regler, palettes[0].id);
  assert.equal(supprimee.departs.has(palettes[1].id), false);
});

test('[UI-39] sous deux palettes, tout l’état se vide ; un identifiant disparu ne se coche pas', () => {
  const plein = { ...selectionner(palettes.slice(0, 4).map(({ id }) => id)), mode: 'dark' as const, intensite: 'soft' as const, affichage: 'gris' as const, roue: true, vision: 'Protanopie' as const, trop: true, departs: new Map([[palettes[0].id, palettes[0]]]) };
  for (const lue of [null, { ...recette, palettes: [] }, { ...recette, palettes: [palettes[0]] }]) {
    assert.deepEqual(synchroniserHarmonisation(plein, lue), harmonisationInitiale());
  }
  assert.deepEqual(cocherPalette(harmonisationInitiale(), { ...recette, palettes: [palettes[0]] }, palettes[0].id), harmonisationInitiale());
  assert.deepEqual(cocherPalette(harmonisationInitiale(), recette, 'absente'), harmonisationInitiale());
});

test('[UI-39] entrer renouvelle les départs sans effacer les choix de session', () => {
  const precedente = { ...selectionner([palettes[0].id]), mode: 'dark' as const, departs: new Map([[palettes[0].id, palettes[0]]]) };
  const entree = entrerEnHarmonisation(precedente);
  assert.equal(entree.departs.size, 0);
  assert.equal(precedente.departs.size, 1);
  assert.deepEqual(entree.cochees, precedente.cochees);
  assert.equal(entree.mode, 'dark');
});

test('[UI-39] les palettes libres, figées et à une intensité restent sélectionnables', () => {
  const lue = { ...recette, palettes: [
    { ...palettes[0], crans: [100, 500, 900] },
    { ...palettes[1], intensites: 1 as const, crans: [100, 500], figees: { light: ['#111111', '#777777'] } },
    { ...palettes[2], intensites: 1 as const },
  ] };
  const etat = lue.palettes.reduce((precedent, palette) => cocherPalette(precedent, lue, palette.id), harmonisationInitiale());
  assert.deepEqual(etat.cochees, lue.palettes.map(({ id }) => id));
});

const BLEU = paletteTailwind('p-000000a1', '#1E6FD9');
const BLEU_DECALE = { ...candidatDeTeinte(recetteAvec(BLEU), paletteTailwind('p-000000a2', '#1E6FD9'), 5) };

test('[UI-40] « Comparer » règle la palette qui sort de la zone par le plus petit écart, A à égalité', () => {
  const egales = recetteAvec(BLEU, { ...BLEU, id: 'p-000000a2' });
  assert.deepEqual(paletteARegler(egales, [BLEU.id, 'p-000000a2']), { id: BLEU.id, sansSortie: false });
  assert.deepEqual(paletteARegler(egales, ['p-000000a2', BLEU.id]), { id: 'p-000000a2', sansSortie: false });
  // B (0°) sort à −6°, A (+5°) à +11° : B se règle même quand A est la première palette de la paire.
  const inegales = recetteAvec(BLEU_DECALE, { ...BLEU, id: 'p-000000a3' });
  assert.deepEqual(paletteARegler(inegales, [BLEU_DECALE.id, 'p-000000a3']), { id: 'p-000000a3', sansSortie: false });
  assert.deepEqual(paletteARegler(inegales, ['p-000000a3', BLEU_DECALE.id]), { id: 'p-000000a3', sansSortie: false });
});

test('[UI-40] une paire qu’aucune teinte de la course ne sépare règle la palette A et le dit', () => {
  const recette = recetteAvec(BLEU, { ...BLEU, id: 'p-000000a2' });
  const large = { ...recette, seuils: { ...recette.seuils, palettesProches: 2 } };
  assert.deepEqual(paletteARegler(large, [BLEU.id, 'p-000000a2']), { id: BLEU.id, sansSortie: true });
  assert.deepEqual(paletteARegler(large, ['p-000000a2', BLEU.id]), { id: 'p-000000a2', sansSortie: true });
  assert.deepEqual(paletteARegler(large, [BLEU.id, 'absente']), { id: BLEU.id, sansSortie: true });
});

test('[UI-40] « Comparer » coche la paire seule, passe au thème du constat et garde l’intensité, l’affichage et les réglages', () => {
  const recette = recetteAvec(BLEU_DECALE, { ...BLEU, id: 'p-000000a3' }, { ...BLEU, id: 'p-000000a4', nom: 'Autre' });
  const [paire] = pairesTropProches(recette);
  const avant = { ...cocherPalette(cocherPalette(harmonisationInitiale(), recette, 'p-000000a4'), recette, 'p-000000a3'), trop: true, intensite: 'soft' as const, affichage: 'gris' as const, mode: 'light' as const, departs: new Map([['p-000000a3', recette.palettes[1]]]) };
  const apres = comparerLaPaire(avant, recette, paire);
  assert.deepEqual(apres.cochees, [...paire.palettes]);
  assert.equal(apres.regler, paletteARegler(recette, paire.palettes).id);
  assert.equal(apres.mode, paire.proximite.mode);
  assert.equal(apres.trop, false);
  assert.equal(apres.intensite, 'soft');
  assert.equal(apres.affichage, 'gris');
  assert.deepEqual(apres.departs, avant.departs);
  assert.equal(comparerLaPaire(avant, recette, { ...paire, palettes: [paire.palettes[0], 'absente'] }).cochees.length, 2);
});

const ROUGE = paletteTailwind('p-000000b1', '#DC2626');
const VERT = paletteTailwind('p-000000b2', '#16A34A');
const cochees = (lue: Recette, ...ids: string[]) => ids.reduce((etat, id) => cocherPalette(etat, lue, id), harmonisationInitiale());

test('[UI-41] « Couleurs | Niveaux de gris » ne change que l’affichage', () => {
  const etat = { ...selectionner([palettes[0].id, palettes[1].id]), mode: 'dark' as const };
  const gris = choisirAffichage(etat, 'gris');
  assert.equal(gris.affichage, 'gris');
  assert.deepEqual({ ...gris, affichage: 'couleurs' }, etat);
  assert.equal(choisirAffichage(gris, 'gris'), gris);
});

test('[UI-41] une paire cochée trop proche donne une ligne d’avertissement, et « se distinguent » quand aucune ne l’est', () => {
  const proches = recetteAvec(BLEU, { ...BLEU, id: 'p-000000a2' }, ROUGE);
  const paires = pairesTropProches(proches);
  assert.equal(paires.length, 1);
  const [constat] = constatsDeLaComparaison(proches, cochees(proches, BLEU.id, 'p-000000a2'), paires);
  assert.deepEqual(constat, { ton: 'avertissement', genre: 'paire', palettes: paires[0].palettes, role: paires[0].proximite.role, mode: paires[0].proximite.mode, sansSortie: false });
  assert.deepEqual(constatsDeLaComparaison(proches, cochees(proches, BLEU.id, ROUGE.id), paires), [{ ton: 'succes', genre: 'distinctes' }]);
  assert.deepEqual(constatsDeLaComparaison(proches, cochees(proches, BLEU.id), paires), []);
  assert.deepEqual(constatsDeLaComparaison(proches, harmonisationInitiale(), paires), []);
});

test('[UI-41] une paire qu’aucune teinte de la course ne sépare le dit, parmi les constats de la carte', () => {
  const recette = recetteAvec(BLEU, { ...BLEU, id: 'p-000000a2' });
  const large = { ...recette, seuils: { ...recette.seuils, palettesProches: 2 } };
  const [constat] = constatsDeLaComparaison(large, cochees(large, BLEU.id, 'p-000000a2'), pairesTropProches(large));
  assert.equal(constat.genre === 'paire' && constat.sansSortie, true);
  assert.equal(constat.genre === 'paire' && constat.sansSortie, paletteARegler(large, [BLEU.id, 'p-000000a2']).sansSortie);
});

test('[UI-41] la saturation de l’intensité vue, étalée de 0,20, nomme la plus terne et la plus vive', () => {
  const terne = { ...ROUGE, parts: { soft: 0.3, vivid: 0.6, origine: 'designer' as const } };
  const vive = { ...VERT, parts: { soft: 0.6, vivid: 0.65, origine: 'designer' as const } };
  const recette = recetteAvec(terne, vive);
  const etat = cochees(recette, terne.id, vive.id);
  const constats = (intensite: 'soft' | 'vivid') => constatsDeLaComparaison(recette, { ...etat, intensite }, []).filter(({ genre }) => genre === 'saturation');
  assert.deepEqual(constats('soft'), [{ ton: 'info', genre: 'saturation', intensite: 'soft', terne: terne.id, vive: vive.id }]);
  // En Vivid, 0,60 et 0,65 s'étalent de 0,05 : rien à dire.
  assert.deepEqual(constats('vivid'), []);
  // L'étalement de 0,20 exactement se dit.
  const exacte = recetteAvec({ ...terne, parts: { soft: 0.4, vivid: 0.6, origine: 'designer' as const } }, { ...vive, parts: { soft: 0.6, vivid: 0.65, origine: 'designer' as const } });
  assert.equal(constatsDeLaComparaison(exacte, { ...cochees(exacte, terne.id, vive.id), intensite: 'soft' }, []).some(({ genre }) => genre === 'saturation'), true);
});

test('[UI-41] la luminosité étalée de 0,01 nomme la palette plus claire si la plus haute est positive, sinon la plus foncée', () => {
  const avec = (clarteDeRouge: number, clarteDeVert: number) => {
    const recette = recetteAvec({ ...ROUGE, reglages: { clarte: { vivid: clarteDeRouge } } }, { ...VERT, reglages: { clarte: { vivid: clarteDeVert } } }, paletteTailwind('p-000000b3', '#2563EB'));
    return constatsDeLaComparaison(recette, cochees(recette, ROUGE.id, VERT.id, 'p-000000b3'), []).filter(({ genre }) => genre === 'luminosite');
  };
  assert.deepEqual(avec(0.03, 0), [{ ton: 'info', genre: 'luminosite', intensite: 'vivid', palette: ROUGE.id, sens: 'claire' }]);
  assert.deepEqual(avec(-0.02, 0), [{ ton: 'info', genre: 'luminosite', intensite: 'vivid', palette: ROUGE.id, sens: 'foncee' }]);
  assert.deepEqual(avec(0.005, 0), []);
  assert.deepEqual(avec(0, 0), []);
});

test('[UI-41] une palette libre, figée ou neutre n’entre pas dans les constats de saturation et de luminosité', () => {
  const libre = { ...ROUGE, id: 'p-000000b4', crans: [100, 500, 900], parts: { soft: 0.1, vivid: 0.2, origine: 'designer' as const }, reglages: { clarte: { vivid: 0.08 } } };
  const neutre = { ...paletteTailwind('p-000000b5', '#808080'), reglages: { clarte: { vivid: -0.08 } } };
  const recette = recetteAvec(libre, neutre, VERT);
  const constats = constatsDeLaComparaison(recette, cochees(recette, libre.id, neutre.id, VERT.id), []);
  assert.deepEqual(constats.map(({ genre }) => genre), ['distinctes']);
});

test('[UI-41] une palette à une intensité se lit sous « unique » pour sa saturation et « vivid » pour sa luminosité, quelle que soit l’intensité vue', () => {
  const une = { ...ROUGE, intensites: 1 as const, reglages: { clarte: { vivid: 0.04 } } };
  const deux = { ...VERT, parts: { soft: 0.2, vivid: 0.2, origine: 'designer' as const } };
  const recette = recetteAvec(une, deux);
  const etat = cochees(recette, une.id, deux.id);
  for (const intensite of ['soft', 'vivid'] as const) {
    const constats = constatsDeLaComparaison(recette, { ...etat, intensite }, []);
    assert.deepEqual(constats.filter(({ genre }) => genre === 'luminosite'), [{ ton: 'info', genre: 'luminosite', intensite, palette: une.id, sens: 'claire' }]);
  }
});

const A_REGLER = paletteTailwind('p-000000c1', '#1E6FD9', { nom: 'A' });
const B_REGLEE = paletteTailwind('p-000000c2', '#DC2626', { nom: 'B' });
const C_DE_CREATION = paletteTailwind('p-000000c3', '#16A34A', { nom: 'C' });

/** Une session : C réglée dans Création, l'entrée dans l'onglet, puis A et B réglées dans l'onglet. */
function session() {
  const initiale = recetteAvec(A_REGLER, B_REGLEE, C_DE_CREATION);
  const apresCreation = remplacerPalette(initiale, reglerClarte(initiale, C_DE_CREATION, 'vivid', 0.03));
  let etat = entrerEnHarmonisation(harmonisationInitiale());
  const regler = (lue: Recette, id: string, vers: (palette: Palette) => Palette): Recette => {
    const avant = lue.palettes.find((palette) => palette.id === id)!;
    etat = memoriserLeDepart(etat, avant);
    return remplacerPalette(lue, vers(avant));
  };
  const apresA = regler(apresCreation, A_REGLER.id, (palette) => candidatDeTeinte(apresCreation, palette, 12));
  const apresB = regler(apresA, B_REGLEE.id, (palette) => reglerSaturation(apresA, palette, 'vivid', 0.5));
  return { initiale, apresCreation, apresB, etat };
}
const de = (lue: Recette, id: string): Palette => lue.palettes.find((palette) => palette.id === id)!;

test('[UI-42] le premier réglage d’une palette garde son départ, les suivants le laissent', () => {
  const { apresCreation, etat } = session();
  assert.deepEqual([...etat.departs.keys()], [A_REGLER.id, B_REGLEE.id]);
  assert.deepEqual(etat.departs.get(A_REGLER.id), de(apresCreation, A_REGLER.id));
  const deuxFois = memoriserLeDepart(etat, candidatDeTeinte(apresCreation, A_REGLER, 5));
  assert.equal(deuxFois, etat);
  assert.equal(entrerEnHarmonisation(etat).departs.size, 0);
});

test('[UI-42] une palette est modifiée dès 0,5° de teinte, 0,005 de saturation ou 0,0005 de luminosité, et ne l’est plus de retour au départ', () => {
  const recette = recetteAvec(A_REGLER);
  const modifiee = (palette: Palette): boolean => modifieeDepuisLeDepart(recette, palette, A_REGLER);
  assert.equal(modifiee(A_REGLER), false);
  assert.equal(modifiee({ ...A_REGLER, reglages: { teinte: { vivid: 0.4 } } }), false);
  assert.equal(modifiee({ ...A_REGLER, reglages: { teinte: { soft: 0.5 } } }), true);
  assert.equal(modifiee({ ...A_REGLER, reglages: { clarte: { vivid: 0.0004 } } }), false);
  assert.equal(modifiee({ ...A_REGLER, reglages: { clarte: { soft: 0.0005 } } }), true);
  assert.equal(modifiee(reglerSaturation(recette, A_REGLER, 'soft', 0.5)), true);
  const saturationDeDepart = valeursDesProfils(recette, A_REGLER).soft.saturation;
  assert.equal(modifiee(reglerSaturation(recette, reglerSaturation(recette, A_REGLER, 'soft', 0.5), 'soft', saturationDeDepart)), false);
  const une = { ...A_REGLER, id: 'p-000000c4', intensites: 1 as const };
  assert.equal(modifieeDepuisLeDepart(recetteAvec(une), candidatDeTeinte(recetteAvec(une), une, 3), une), true);
});

test('[UI-42] annuler rend la palette choisie à son départ, sans défaire Création ni la seconde palette', () => {
  const { initiale, apresCreation, apresB, etat } = session();
  const issue = annulerLaPalette(apresB, etat, A_REGLER.id);
  assert.ok(issue && 'recette' in issue);
  // A reprend son départ : celui d'après Création, qui garde donc le changement de Création.
  assert.deepEqual(de(issue.recette, A_REGLER.id), de(apresCreation, A_REGLER.id));
  assert.notDeepEqual(de(apresB, A_REGLER.id), de(apresCreation, A_REGLER.id));
  // B garde son réglage de l'onglet, C le changement de Création que le départ de l'onglet n'a jamais défait.
  assert.deepEqual(de(issue.recette, B_REGLEE.id), de(apresB, B_REGLEE.id));
  assert.deepEqual(de(issue.recette, C_DE_CREATION.id), de(apresCreation, C_DE_CREATION.id));
  assert.notDeepEqual(de(issue.recette, C_DE_CREATION.id), de(initiale, C_DE_CREATION.id));
  // Les départs restent : la palette n'est plus modifiée, les autres le sont.
  assert.equal(etat.departs.size, 2);
  assert.equal(modifieeDepuisLeDepart(issue.recette, de(issue.recette, A_REGLER.id), etat.departs.get(A_REGLER.id)!), false);
  assert.equal(modifieeDepuisLeDepart(issue.recette, de(issue.recette, B_REGLEE.id), etat.departs.get(B_REGLEE.id)!), true);
  assert.equal(annulerLaPalette(issue.recette, etat, A_REGLER.id), null);
  assert.equal(annulerLaPalette(apresB, etat, C_DE_CREATION.id), null);
  assert.equal(annulerLaPalette(apresB, harmonisationInitiale(), A_REGLER.id), null);
});

test('[UI-42] annuler rend aussi la référence que le réglage du profil porteur avait déplacée', () => {
  const lue = recetteAvec(A_REGLER);
  const porteur = cleDuPorteur(lue, A_REGLER);
  const reglee = reglerClarte(lue, A_REGLER, porteur === 'soft' ? 'vivid' : 'soft', 0.05);
  const porteurRegle = reglerClarte(lue, reglee, porteur, -0.04);
  const etat = memoriserLeDepart(harmonisationInitiale(), reglee);
  assert.notEqual(porteurRegle.reference, reglee.reference);
  const issue = annulerLaPalette(remplacerPalette(lue, porteurRegle), etat, A_REGLER.id);
  assert.ok(issue && 'recette' in issue);
  assert.deepEqual(de(issue.recette, A_REGLER.id), reglee);
  assert.deepEqual(restaurerLesReglages({ ...porteurRegle, nom: 'Renommée' }, reglee), { ...reglee, nom: 'Renommée' });
});

test('[UI-42] un refus de la recette restaurée laisse la recette, les départs et la palette comme ils étaient', () => {
  const { apresB, etat } = session();
  const depart = { ...de(apresB, A_REGLER.id), reglages: { teinte: { vivid: 45 } } };
  const aDepartInvalide = { ...etat, departs: new Map(etat.departs).set(A_REGLER.id, depart) };
  const avant = structuredClone(apresB);
  const departsAvant = new Map(aDepartInvalide.departs);
  const issue = annulerLaPalette(apresB, aDepartInvalide, A_REGLER.id);
  assert.ok(issue && 'refus' in issue);
  assert.equal(typeof issue.refus.regle, 'string');
  assert.deepEqual(apresB, avant);
  assert.deepEqual(aDepartInvalide.departs, departsAvant);
});
