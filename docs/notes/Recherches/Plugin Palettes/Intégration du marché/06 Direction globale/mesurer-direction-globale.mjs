#!/usr/bin/env node
/**
 * Imprime chaque mesure du moteur que DIRECTION-GLOBALE.md cite, depuis la
 * racine du dépôt :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/mesurer-direction-globale.mjs"
 *
 * Chaque bloc porte un repère entre crochets, `[C1]` par exemple, que le
 * document cite. Les fonctions de la direction viennent du générateur de la
 * maquette : la mesure et la page calculent avec le même code. Le bloc `[H]`
 * ouvre la maquette générée dans Chromium pour mesurer la hauteur utile sous
 * un pied fixe ; il se tait quand la page n'existe pas encore.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as moteur from '../../../../../../packages/couleur/src/index.ts';
import * as edition from '../../../../../../packages/plugin-palettes/src/edition.ts';
import * as ajustement from '../../../../../../packages/plugin-palettes/src/ajustementDeLaReference.ts';
import {
  RAMPES_LUES,
  REGULARITE,
  SYSTEME_DE_DEMONSTRATION,
  comparerTroisValeurs,
  comptesDeLArchitecture,
  corrigerRampe,
  distanceEnVision,
  garantiesEffectives,
  lireUneRampe,
  planDesVariables,
  regularite,
  secomparent,
} from './generer-maquette-direction-globale.mjs';

const M = { ...moteur, ...edition, ...ajustement };
const ICI = path.dirname(fileURLToPath(import.meta.url));
const R = M.recetteParDefaut();
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',');
const liste = (crans) => (crans.length ? crans.join(', ') : 'aucune');
const titre = (repere, texte) => console.log(`\n[${repere}] ${texte}`);

/** Une palette seule dans la recette par défaut. */
function seule(hexa, intensites, id = 'p-00000001') {
  const palette = M.nouvellePalette(R, id, hexa, intensites);
  return { palette, recette: { ...R, palettes: [palette] } };
}
const manquees = (recette, palette, retouches = {}) => garantiesEffectives(M, recette, palette, retouches).filter((g) => g.verdict === 'manquee');
const voisines = (rampe, mesure) => rampe.slice(1).map((h, i) => virgule(mesure(M.lireHexa(rampe[i]), M.lireHexa(h)), mesure === M.contraste ? 2 : 3)).join(' ');

// ------------------------------------------------------------------ correction
titre('C1', 'Bleu A fait à l’œil, Thème Light : la correction qui compte seulement les garanties');
{
  const { palette, recette } = seule(RAMPES_LUES['Bleu A'].reference, 1);
  const lecture = lireUneRampe(M, recette, palette, { light: RAMPES_LUES['Bleu A'].lue });
  const c = corrigerRampe(M, recette, palette, lecture.retouches, 'unique', 'light', [], REGULARITE);
  const minimale = c.lue.map((h, rang) => (c.minimaleSansRegularite.includes(recette.crans[rang]) ? c.calculee[rang] : h));
  console.log(`nuances reprises : ${c.reprises.length} (${liste(c.reprises)}) ; nuance ◆ : ${lecture.ancrage.light}`);
  console.log(`garanties manquées : lue ${c.avant}, calculée ${c.cible}`);
  console.log(`plus petit ensemble sans critère de forme : ${liste(c.minimaleSansRegularite)}`);
  console.log('contraste entre voisines, 50/100 à 900/950 :');
  console.log(`  lue        ${voisines(c.lue, M.contraste)}`);
  console.log(`  sans forme ${voisines(minimale, M.contraste)}`);
  console.log(`  calculée   ${voisines(c.calculee, M.contraste)}`);
  console.log('écart ΔEok entre voisines :');
  console.log(`  lue        ${voisines(c.lue, M.distanceOk)}`);
  console.log(`  sans forme ${voisines(minimale, M.distanceOk)}`);
  console.log(`  calculée   ${voisines(c.calculee, M.distanceOk)}`);
  const defauts = regularite(M, minimale, c.lue, c.calculee, 'light', REGULARITE).defauts;
  for (const d of defauts) console.log(`  défaut ${recette.crans[d.rang - 1]}/${recette.crans[d.rang]} : ${d.raison}${d.pas !== undefined ? `, pas ${virgule(d.pas, 3)} pour une borne de ${virgule(d.borne, 3)}` : ''}`);

  titre('C2', 'Bleu A : la correction régulière');
  console.log(`bornes du critère : ${virgule(REGULARITE.court, 1)} fois le plus court, ${virgule(REGULARITE.long, 1)} fois le plus long des deux pas d'origine`);
  console.log(`nuances rétablies : ${liste(c.retablies)} (${c.retablies.length} sur ${c.reprises.length}) ; garanties manquées après : ${c.apres} ; cible atteinte : ${c.atteinte ? 'oui' : 'non'}`);
  console.log(`nuances du designer gardées : ${liste(c.reprises.filter((n) => !c.retablies.includes(n)))}`);
  console.log(`  corrigée   ${voisines(c.rampe, M.contraste)}`);
  console.log(`  corrigée   ΔEok ${voisines(c.rampe, M.distanceOk)}`);
}

titre('C5', 'Un critère borné sur la seule rampe calculée, appliqué à la rampe lue de Bleu A sans correction');
{
  const { palette, recette } = seule(RAMPES_LUES['Bleu A'].reference, 1);
  const lue = RAMPES_LUES['Bleu A'].lue;
  const calculee = M.rampesDe(recette, palette).unique.light.map((c) => M.ecrireHexa(c.couleur));
  const pas = (r, i) => M.distanceOk(M.lireHexa(r[i - 1]), M.lireHexa(r[i]));
  const hors = [];
  for (let i = 1; i < lue.length; i += 1) {
    const ici = pas(lue, i);
    const ref = pas(calculee, i);
    if (ici < REGULARITE.court * ref || ici > REGULARITE.long * ref) hors.push(`${recette.crans[i - 1]}/${recette.crans[i]}`);
  }
  console.log(`pas de la rampe du designer hors des bornes ${virgule(REGULARITE.court, 1)} et ${virgule(REGULARITE.long, 1)} fois le pas calculé : ${hors.length} sur ${lue.length - 1} (${hors.join(', ')})`);
  const regleDirection = regularite(M, lue, lue, calculee, 'light', REGULARITE);
  console.log(`avec le critère de la direction, bornes lues sur les deux rampes : ${regleDirection.defauts.length} défaut`);
}

titre('C3','Les rampes faites à l’œil de la mesure, Thème Light, intensité porteuse');
for (const [nom, donnees] of Object.entries(RAMPES_LUES)) {
  const { palette, recette } = seule(donnees.reference, donnees.intensites);
  const lecture = lireUneRampe(M, recette, palette, { light: donnees.lue });
  const libre = corrigerRampe(M, recette, palette, lecture.retouches, lecture.intensite, 'light', [], REGULARITE);
  const regLue = regularite(M, libre.lue, libre.lue, libre.calculee, 'light', REGULARITE);
  console.log(`${nom} : ◆ au ${lecture.ancrage.light}, charte lue au ${lecture.referenceLue} ; doublons ${lecture.doublons.map((d) => d.cran).join(', ') || 'aucun'} ; reprises ${libre.reprises.length} ; manquées lue ${libre.avant}, calculée ${libre.cible} ; sans forme ${liste(libre.minimaleSansRegularite)} ; régulière ${liste(libre.retablies)}${libre.toutes ? ' (toutes)' : ''} ; atteinte ${libre.atteinte ? 'oui' : 'non'} ; lue monotone ${regLue.defauts.some((d) => d.raison === 'monotonie') ? 'non' : 'oui'}`);
  if (donnees.verrous) {
    const verrouillee = corrigerRampe(M, recette, palette, lecture.retouches, lecture.intensite, 'light', donnees.verrous, REGULARITE);
    console.log(`  avec ${donnees.verrous.join(', ')} verrouillé : cible ${verrouillee.cible}, atteinte ${verrouillee.atteinte ? 'oui' : 'non'}, meilleure correction ${liste(verrouillee.retablies)} laisse ${verrouillee.apres} garanties manquées`);
    const causes = manquees(recette, palette, lecture.retouches).filter((g) => g.mode === 'light');
    console.log(`  garanties manquées de la rampe lue : ${causes.map((g) => `${g.paire.numero} (${virgule(g.contraste)})`).join(', ')}`);
  }
}

titre('C4', 'Vert #16A34A calculé, deux intensités : garanties manquées et réglages qui les rendent');
{
  const { palette, recette } = seule('#16A34A', 2, 'p-0000000d');
  const ancre = M.ancrageDe(recette, palette);
  console.log(`porteur ${ancre.profil}, ◆ au ${ancre.crans.light} en Light, au ${ancre.crans.dark} en Dark`);
  for (const g of manquees(recette, palette)) console.log(`  manquée : paire ${g.paire.numero}, ${g.profil} ${g.mode}, ${virgule(g.contraste)}:1 pour ${virgule(g.seuil, 1)}`);
  for (let pas = 0; pas >= -3; pas -= 1) {
    const q = M.paletteAuPas(recette, palette, pas);
    console.log(`  Ajuster la référence, ${pas} pas : ${q.reference}, ${manquees({ ...R, palettes: [q] }, q).length} garanties manquées`);
  }
  for (const s of [0.9, 0.8, 0.7]) {
    const q = M.reglerSaturation(recette, palette, 'vivid', s);
    console.log(`  saturation Vivid à ${virgule(s, 1)} : ${manquees({ ...R, palettes: [q] }, q).length} garanties manquées`);
  }
  const retouches = {};
  const c = corrigerRampe(M, recette, palette, retouches, 'vivid', 'light', [], REGULARITE);
  console.log(`  nuances reprises : ${c.reprises.length} ; la correction n'a rien à rétablir`);
}

// ------------------------------------------------------------------ comptes
titre('N1', 'Comptes de l’architecture : 6 marques, 2 familles de marque, 4 utilitaires, une identité par famille');
for (const n of [9, 11, 13]) {
  const c = comptesDeLArchitecture(n, 6, 2, 4);
  console.log(`${n} nuances : primitives ${c.primitives.variables} variables ; brand ${c.brand.variables} variables, ${c.brand.valeurs} valeurs ; theme ${c.theme.variables} variables, ${c.theme.valeurs} valeurs ; en tout ${c.variables} variables, ${c.valeurs} valeurs, ${c.cadres} cadres`);
}

/** Le système de démonstration, dans la recette donnée. */
function systeme(recette = R, sans = []) {
  const meta = {};
  const palettes = [];
  for (const p of SYSTEME_DE_DEMONSTRATION.palettes.filter((x) => !sans.includes(x.id))) {
    const palette = { ...M.nouvellePalette(recette, p.id, p.reference, p.intensites), nom: p.nom };
    palettes.push(palette);
    meta[p.id] = { destination: p.destination, retouches: {} };
  }
  return { recette: { ...recette, palettes }, meta, marques: SYSTEME_DE_DEMONSTRATION.marques };
}
const parCollection = (cibles) => {
  const sortie = {};
  for (const c of cibles) {
    sortie[c.collection] = sortie[c.collection] || { variables: new Set(), valeurs: 0 };
    sortie[c.collection].variables.add(c.nom);
    sortie[c.collection].valeurs += 1;
  }
  return Object.entries(sortie).map(([k, v]) => `${k} ${v.variables.size} variables, ${v.valeurs} valeurs`).join(' ; ');
};

titre('N2', 'Le système de démonstration, première écriture : 2 marques, 2 familles, le neutre, 4 utilitaires');
const demo = systeme();
const planDemo = planDesVariables(M, demo.recette, demo.meta, demo.marques);
{
  const variables = new Set(planDemo.map((c) => `${c.collection}:${c.nom}`)).size;
  console.log(`${parCollection(planDemo)} ; en tout ${variables} variables créées, ${planDemo.length} valeurs par mode écrites, ${demo.recette.palettes.length} cadres`);
  const bleu = planDemo.filter((c) => c.palette === 'p-00000001');
  console.log(`Bleu A seule : ${bleu.length} valeurs dans brand, mode Marque A, dont l'identité ; ${planDemo.filter((c) => c.collection === 'theme' && c.famille === 'primary').length} valeurs d'alias de theme partagées par les marques`);
}

titre('N3', 'Une marque ajoutée à un système écrit');
{
  const marques = [...demo.marques, { id: 'm-c', nom: 'Marque C' }];
  const recette = { ...demo.recette, palettes: [...demo.recette.palettes, { ...M.nouvellePalette(R, 'p-00000005', '#7A1FA2', 1), nom: 'Violet C' }, { ...M.nouvellePalette(R, 'p-00000006', '#C2185B', 1), nom: 'Framboise C' }] };
  const meta = { ...demo.meta, 'p-00000005': { destination: { type: 'marque', marque: 'm-c', famille: 'primary' } }, 'p-00000006': { destination: { type: 'marque', marque: 'm-c', famille: 'secondary' } } };
  const plan = planDesVariables(M, recette, meta, marques);
  const avant = new Set(planDemo.map((c) => `${c.collection}:${c.nom}|${c.mode}`));
  const nouvelles = plan.filter((c) => !avant.has(`${c.collection}:${c.nom}|${c.mode}`));
  const variablesAvant = new Set(planDemo.map((c) => `${c.collection}:${c.nom}`));
  const creees = new Set(nouvelles.filter((c) => !variablesAvant.has(`${c.collection}:${c.nom}`)).map((c) => c.nom));
  console.log(`Marque C : 1 mode créé, ${creees.size} variables créées, ${nouvelles.length} valeurs écrites, 2 cadres`);
}

titre('N4', 'Intensité Soft passée de 0,45 à 0,50 : valeurs écrites qui changent');
{
  const soft = { ...R, profils: { ...R.profils, soft: { part: 0.5 } } };
  const apres = systeme(soft);
  const planApres = planDesVariables(M, apres.recette, apres.meta, apres.marques);
  const cle = (c) => `${c.collection}:${c.nom}|${c.mode}`;
  const valeursAvant = new Map(planDemo.map((c) => [cle(c), JSON.stringify(c.valeur)]));
  const changees = planApres.filter((c) => valeursAvant.get(cle(c)) !== JSON.stringify(c.valeur));
  const parPalette = {};
  for (const c of changees) parPalette[c.palette ?? c.collection] = (parPalette[c.palette ?? c.collection] || 0) + 1;
  const nom = (id) => SYSTEME_DE_DEMONSTRATION.palettes.find((p) => p.id === id)?.nom ?? id;
  console.log(`${changees.length} valeurs changent, en ${Object.keys(parPalette).length} palettes : ${Object.entries(parPalette).map(([id, n]) => `${nom(id)} ${n}`).join(', ')}`);
  console.log(`collections touchées : ${[...new Set(changees.map((c) => c.collection))].join(', ')}`);
  const pertes = apres.recette.palettes.map((p) => [p.nom, manquees(demo.recette, demo.recette.palettes.find((x) => x.id === p.id)).length, manquees(apres.recette, p).length]).filter(([, a, b]) => a !== b);
  console.log(`garanties manquées qui changent : ${pertes.length ? pertes.map(([n, a, b]) => `${n} ${a} → ${b}`).join(', ') : 'aucune'}`);
}

titre('N5', 'Nombre de nuances : de 11 à 13, puis de 13 à 11');
{
  const treize = { ...R, ...M.grilleAuPrereglage({ crans: R.crans, courbes: R.courbes }, 13) };
  const apres = systeme(treize);
  const planTreize = planDesVariables(M, apres.recette, apres.meta, apres.marques);
  const noms = (plan) => new Set(plan.map((c) => `${c.collection}:${c.nom}`));
  const onze = noms(planDemo);
  const ajoutees = [...noms(planTreize)].filter((n) => !onze.has(n));
  const parC = (liste) => ['primitives', 'brand', 'theme'].map((k) => `${k} ${liste.filter((n) => n.startsWith(`${k}:`)).length}`).join(', ');
  const valeursAjoutees = planTreize.filter((c) => !onze.has(`${c.collection}:${c.nom}`)).length;
  console.log(`11 → 13 : ${ajoutees.length} variables créées (${parC(ajoutees)}), ${valeursAjoutees} valeurs écrites pour elles`);
  const cle = (c) => `${c.collection}:${c.nom}|${c.mode}`;
  const avant = new Map(planDemo.map((c) => [cle(c), JSON.stringify(c.valeur)]));
  const changees = planTreize.filter((c) => avant.has(cle(c)) && avant.get(cle(c)) !== JSON.stringify(c.valeur)).length;
  console.log(`11 → 13 : ${changees} valeurs de nuances gardées qui changent`);
  const retour = noms(planDemo);
  const laissees = [...noms(planTreize)].filter((n) => !retour.has(n));
  console.log(`13 → 11 : ${laissees.length} variables laissées sans palette (${parC(laissees)}), aucune supprimée`);
}

titre('N6', 'Une référence changée : Bleu A de #1E6FD9 à #2F6FE0');
{
  const bleu = demo.recette.palettes.find((p) => p.id === 'p-00000001');
  const neuve = { ...M.changerReference(demo.recette, bleu, '#2F6FE0'), nom: 'Bleu A' };
  const recette = { ...demo.recette, palettes: demo.recette.palettes.map((p) => (p.id === bleu.id ? neuve : p)) };
  const plan = planDesVariables(M, recette, demo.meta, demo.marques).filter((c) => c.palette === bleu.id);
  const avant = new Map(planDemo.filter((c) => c.palette === bleu.id).map((c) => [c.nom, c.valeur]));
  const changees = plan.filter((c) => avant.get(c.nom) !== c.valeur);
  console.log(`${changees.length} valeurs de brand changent dans le mode Marque A, identité comprise ; aucun alias de theme`);
  console.log(`garanties manquées : avant ${manquees(demo.recette, bleu).length}, après ${manquees(recette, neuve).length}`);
}

// ------------------------------------------------------------------ retouches
titre('T1', 'Retouches de Rouge, Vivid, Thème Light');
{
  const { palette, recette } = seule('#DC2626', 2, 'p-0000000b');
  const calc = M.rampesDe(recette, palette).vivid.light.map((c) => M.ecrireHexa(c.couleur));
  const rang = (n) => recette.crans.indexOf(n);
  console.log(`700 calculé ${calc[rang(700)]} ; 800 ${calc[rang(800)]} ; 900 ${calc[rang(900)]} ; ◆ au ${M.ancrageDe(recette, palette).crans.light}`);
  const une = manquees(recette, palette, { 'vivid/light/700': '#DC2626' });
  console.log(`700 → #DC2626 adopté : ${une.length} garanties manquées : ${une.map((g) => `paire ${g.paire.numero} ${virgule(g.contraste)}:1`).join(', ')}`);
  const trois = manquees(recette, palette, { 'vivid/light/700': '#DC2626', 'vivid/light/800': '#991B1B', 'vivid/light/900': '#7F1D1D' });
  console.log(`700, 800, 900 → #DC2626, #991B1B, #7F1D1D adoptés ensemble : ${trois.length} garanties manquées : ${trois.map((g) => `paire ${g.paire.numero} ${virgule(g.contraste)}:1`).join(', ')}`);
  const sans700 = manquees(recette, palette, { 'vivid/light/800': '#991B1B', 'vivid/light/900': '#7F1D1D' });
  console.log(`800 et 900 adoptés, 700 remis : ${sans700.length} garanties manquées`);

  titre('T2', 'Retouche sur le cran ◆ de Rouge, Vivid, Thème Light : #D42020 adopté comme nouvelle référence');
  const neuve = M.changerReference(recette, palette, '#D42020');
  const r2 = { ...R, palettes: [neuve] };
  const a2 = M.ancrageDe(r2, neuve);
  const calc2 = M.rampesDe(r2, neuve).vivid.light.map((c) => M.ecrireHexa(c.couleur));
  const differentes = calc2.filter((h, i) => h !== calc[i]).length;
  console.log(`◆ au ${a2.crans.light} ; ${differentes} nuances Vivid Light changent ; garanties manquées ${manquees(r2, neuve).length}`);
}
titre('T3', 'Une variable créée à la main au bon chemin, et la comparaison à trois valeurs');
{
  const cible = { valeur: '#185EC1' };
  console.log(`sans donnée du plugin, valeur égale : ${comparerTroisValeurs(cible, '#185EC1', undefined, true)} ; valeur différente : ${comparerTroisValeurs(cible, '#1B63C4', undefined, true)}`);
  console.log(`dernière = Figma, recette changée : ${comparerTroisValeurs({ valeur: '#1A5FC4' }, '#185EC1', '#185EC1', true)} ; Figma changé seul : ${comparerTroisValeurs(cible, '#1B63C4', '#185EC1', true)} ; les deux, égales : ${comparerTroisValeurs({ valeur: '#1B63C4' }, '#1B63C4', '#185EC1', true)} ; les deux, différentes : ${comparerTroisValeurs({ valeur: '#1A5FC4' }, '#1B63C4', '#185EC1', true)}`);
}

// ------------------------------------------------------------------ palettes proches et vision
titre('P1', 'Palettes proches du système de démonstration, seuil 0,05');
{
  const { recette, meta } = demo;
  const paires = [];
  recette.palettes.forEach((a, i) => recette.palettes.slice(i + 1).forEach((b) => {
    const d = M.distanceDePalettes(recette, a, b);
    if (d !== null && d < recette.seuils.palettesProches) paires.push(`${a.nom} et ${b.nom} ${virgule(d, 3)}${secomparent(meta, a, b) ? '' : ' (deux marques : se tait)'}`);
  }));
  console.log(paires.join(' ; '));
}
titre('P2', 'Distances en vision simulée : Orange A et Ambre, et les statuts');
{
  const { recette } = demo;
  const p = (nom) => recette.palettes.find((x) => x.nom === nom);
  for (const [a, b] of [['Orange A', 'Ambre'], ['Rouge', 'Ambre'], ['Rouge', 'Vert'], ['Vert', 'Azur'], ['Bleu A', 'Azur']]) {
    const valeurs = ['normale', 'protanopie', 'deuteranopie', 'tritanopie'].map((v) => `${v} ${virgule(distanceEnVision(M, recette, p(a), p(b), v), 3)}`);
    console.log(`${a} et ${b} : ${valeurs.join(', ')}`);
  }
}

// ------------------------------------------------------------------ hauteur utile
titre('H', 'Hauteur utile du corps sous l’en-tête, les onglets et un pied fixe, dans la maquette');
{
  const page = path.join(ICI, 'MAQUETTE-DIRECTION-GLOBALE.html');
  if (!existsSync(page)) {
    console.log('maquette absente : lancer le générateur d’abord');
  } else {
    const { chromium } = await import('playwright');
    const navigateur = await chromium.launch();
    const onglet = await navigateur.newPage({ viewport: { width: 1400, height: 1000 } });
    await onglet.goto(pathToFileURL(page).href);
    for (const [largeur, hauteur] of [[600, 720], [500, 520]]) {
      await onglet.evaluate(([l, h]) => window.__maquette.taille(l, h), [largeur, hauteur]);
      await onglet.evaluate(() => window.__maquette.charger('S03'));
      const mesure = await onglet.evaluate(() => window.__maquette.mesurerLaHauteur());
      console.log(`${largeur} × ${hauteur} : en-tête ${mesure.entete} px, onglets ${mesure.onglets} px, pied ${mesure.pied} px, corps ${mesure.corps} px (${Math.round((100 * mesure.corps) / hauteur)} %)`);
    }

    titre('E', 'Chaque écran de la maquette : blocs du corps, objets visibles sans défiler, à 600 × 720 puis à 500 × 520');
    const ECRANS = [
      ['Départ, fichier vide', 'S01', 0], ['Jeu de départ', 'S01', 1], ['De couleurs existantes', 'S16', 2], ['Palette ouverte', 'S03', 0],
      ['Aperçu de conversion', 'S22', 4], ['Vérifier, correction', 'S16', 7], ['Vérifier, palette calculée', 'S18', 0], ['Vérifier, correction impossible', 'S17', 1],
      ['Système', 'S05', 0], ['Revue', 'S06', 1], ['Revue invalidée', 'S11', 2], ['Bilan partiel', 'S13', 2], ['Distinguer les statuts', 'S20', 2],
      ['Réglages communs', 'S04', 2], ['Aperçu du nombre de nuances', 'S14', 2], ['Mes variables', 'S21', 1],
    ];
    const scenarios = await onglet.evaluate(() => window.__maquette.scenarios);
    for (const [nom, id, n] of ECRANS) {
      const lignes = [];
      for (const [largeur, hauteur] of [[600, 720], [500, 520]]) {
        await onglet.evaluate(([l, h]) => window.__maquette.taille(l, h), [largeur, hauteur]);
        await onglet.evaluate((x) => window.__maquette.charger(x), id);
        for (const pas of scenarios.find((s) => s.id === id).pas.slice(0, n)) {
          if (pas.clic) await onglet.click(pas.clic);
          else if (pas.saisir) { await onglet.fill(pas.saisir[0], pas.saisir[1]); await onglet.dispatchEvent(pas.saisir[0], 'change'); } else await onglet.selectOption(pas.choisir[0], pas.choisir[1]);
        }
        const releve = await onglet.evaluate(() => {
          const corps = document.querySelector('.dialogue-corps') || document.querySelector('.p-corps');
          corps.scrollTop = 0;
          const c = corps.getBoundingClientRect();
          const blocs = [...corps.children].filter((el) => el.getBoundingClientRect().height > 0);
          const visibles = blocs.filter((el) => el.getBoundingClientRect().top < c.bottom - 8);
          const entiers = blocs.filter((el) => el.getBoundingClientRect().bottom <= c.bottom + 1);
          const objets = window.__maquette.objetsVisibles().filter((o) => o.visible).map((o) => o.objet);
          return { blocs: blocs.length, visibles: visibles.length, entiers: entiers.length, pied: Boolean(document.querySelector('.p-pied')), objets: [...new Set(objets)].join(', ') };
        });
        lignes.push(`${largeur} × ${hauteur} : ${releve.blocs} blocs, ${releve.entiers} entiers et ${releve.visibles} commencés sans défiler${releve.pied ? ', pied fixe' : ''} ; objets lisibles : ${releve.objets}`);
      }
      console.log(`${nom} (${id}, ${n} pas) :\n  ${lignes.join('\n  ')}`);
    }
    await navigateur.close();
  }
}
