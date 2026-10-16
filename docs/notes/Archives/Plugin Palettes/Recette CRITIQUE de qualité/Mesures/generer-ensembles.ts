/**
 * Les données de la maquette Harmonisation (`../Maquettes/donnees-ensembles.js`) : deux jeux de
 * palettes, le fichier du mainteneur et les vingt palettes « à vérifier » de la galerie. Pour
 * chaque palette : ses rampes, son ancrage, ses réglages et leurs valeurs par défaut. Pour chaque
 * jeu : les huit paires les plus proches, et pour la première paire en alerte qu'un réglage de
 * teinte sépare, ses rampes et son verdict à chaque degré de la réglette de teinte.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import { pairesTropProches, proximiteDeNuances, nuancesDeProximite, proximiteDePalettes } from '../../../../../../packages/couleur/src/alertes';
import { candidatDeTeinte, courseDeTeinte, sortieLaPlusProche, zonesTropProches } from '../../../../../../packages/couleur/src/harmonisation';
import { boutsDe } from '../../../../../../packages/couleur/src/nuances';
import { ancrageDe, cleDuPorteur, estGrisPur, partsDe, rampesDe } from '../../../../../../packages/couleur/src/palette';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { PREREGLAGE_CONSTANTE, prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import { TABLE_DES_DOSSIERS } from '../../../../../../packages/kit/src/emplois/dossiers';
import { RECETTE_REELLE, valider } from './variantes';

const fr = (x: number, n = 2) => x.toFixed(n).replace('.', ',').replace('-', '−');
const signe = (x: number) => `${x > 0 ? '+' : ''}${fr(x, 3).replace(/0+$/, '').replace(/,$/, '')}`;
const LIBELLE_DU_ROLE = { plein: 'le plein', texte: 'le texte du fond teinté' } as const;

/**
 * Les vingt palettes « à vérifier » de la galerie, lues dans `galerie/etats.cjs` : ses constantes sont
 * évaluées telles qu'écrites, et la palette se fabrique comme `palette()` et `VINGT_PALETTES_A_VERIFIER`.
 */
function recetteDeLaGalerie(): Recette {
  const source = readFileSync(new URL('../../../../../../packages/plugin-palettes/galerie/etats.cjs', import.meta.url), 'utf8');
  const litteral = <T>(nom: string): T => {
    const trouve = source.match(new RegExp(String.raw`const ${nom} = ([\s\S]*?);\n`));
    if (!trouve) throw new Error(`etats.cjs : la constante ${nom} a disparu`);
    return new Function(`return ${trouve[1]};`)() as T;
  };
  const vingt = litteral<[string, string][]>('VINGT_PALETTES_CONFORMES');
  const remplacees = litteral<Record<string, [string, string]>>('REMPLACEES_PAR_LE_BILAN');
  const clarteFautive = litteral<{ soft: number; vivid: number }>('CLARTE_FAUTIVE');
  const partsPresqueEgales = litteral<{ soft: number; vivid: number; origine: 'designer' }>('PARTS_PRESQUE_EGALES');
  const partSoft = source.match(/soft: \{ \.\.\.defaut\.profils\.soft, part: ([\d.]+) \}/);
  if (!partSoft) throw new Error('etats.cjs : recetteDeLaGalerie a changé');
  const defaut = recetteParDefaut();
  const base = { ...defaut, profils: { ...defaut.profils, soft: { ...defaut.profils.soft, part: Number(partSoft[1]) } } };
  const palettes = vingt.map(([nom, reference], rang) => {
    const [nomFinal, referenceFinale] = remplacees[nom] ?? [nom, reference];
    const couleur = lireHexa(referenceFinale)!;
    const derive = estGrisPur(couleur) ? PREREGLAGE_CONSTANTE : prereglageTailwind(rgb8VersOklch(couleur), boutsDe(base));
    const suivante = {
      id: `p-b11a0${rang.toString(16).padStart(3, '0')}`, nom: nomFinal, reference: referenceFinale,
      derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
    };
    if (nom === 'Indigo' || nom === 'Rose') return { ...suivante, parts: partsPresqueEgales };
    return nomFinal === 'Vert' || nomFinal === 'Feuille' ? { ...suivante, originale: referenceFinale, reglages: { porteur: 'vivid', clarte: clarteFautive } } : suivante;
  });
  return valider({ ...base, palettes });
}
const galerie = recetteDeLaGalerie();

/** Les écarts d'une palette aux valeurs communes, en clair ; la teinte n'en fait pas partie. */
function ecartsDe(recette: Recette, p: Palette): string[] {
  const ecarts: string[] = [];
  const communes = recette.profils;
  if (p.parts) ecarts.push(`Saturation : Soft ${fr(p.parts.soft)}, Vivid ${fr(p.parts.vivid)} (communes ${fr(communes.soft.part)} et ${fr(communes.vivid.part)})`);
  if (p.reglages?.part !== undefined) ecarts.push(`Saturation de la référence : ${fr(p.reglages.part)}`);
  for (const profil of ['soft', 'vivid'] as const) {
    const nom = profil === 'soft' ? 'Soft' : 'Vivid';
    const clarte = p.reglages?.clarte?.[profil];
    if (clarte !== undefined && Math.abs(clarte) >= 0.0005) ecarts.push(`Luminosité ${nom} : ${signe(clarte)}`);
    const d = p.derive[profil];
    if (d.clarte && (d.clarte.clair || d.clarte.sombre)) ecarts.push(`Color shift ${nom}, luminosité : nuances claires ${signe(d.clarte.clair)}, sombres ${signe(d.clarte.sombre)}`);
    if (d.saturation && (Math.abs(d.saturation.clair) >= 0.005 || Math.abs(d.saturation.sombre) >= 0.005)) ecarts.push(`Color shift ${nom}, saturation : nuances claires ${signe(d.saturation.clair)}, sombres ${signe(d.saturation.sombre)}`);
  }
  if (p.derive.lien === false && ecarts.length && p.derive.soft.clarte === undefined) return ecarts;
  return ecarts;
}

/** La palette revenue aux valeurs communes : sans parts propres, sans luminosité ni Color shift de luminosité ou de saturation. */
function retablie(p: Palette): Palette {
  const nettoyer = (d: Palette['derive']['soft']) => ({ clair: d.clair, sombre: d.sombre, origine: d.origine });
  const { parts: _parts, reglages: avant, originale, ...reste } = p;
  const reglages = avant ? JSON.parse(JSON.stringify({ ...avant, clarte: undefined, part: undefined })) : undefined;
  // Sans teinte réglée, le porteur seul est un réglage nul, et `originale` n'a plus d'objet.
  const garde = reglages?.teinte !== undefined;
  return { ...reste, ...(garde && originale ? { originale } : {}), derive: { ...p.derive, soft: nettoyer(p.derive.soft), vivid: nettoyer(p.derive.vivid) }, ...(garde ? { reglages } : {}) } as Palette;
}

const enHexa = (r: ReturnType<typeof rampesDe>) => Object.fromEntries(Object.entries(r).map(([i, m]) => [i, { light: m!.light.map((c) => c.hexa), dark: m!.dark.map((c) => c.hexa) }]));
const lab = (h: string) => oklchVersOklab(rgb8VersOklch(lireHexa(h)!));
const dE = (a: string, b: string) => { const x = lab(a); const y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

function jeu(id: string, titre: string, recette: Recette) {
  const palettes = recette.palettes.map((p) => {
    const ecarts = ecartsDe(recette, p);
    const communes = ecarts.length ? enHexa(rampesDe(valider({ ...recette, palettes: recette.palettes.map((q) => (q.id === p.id ? retablie(q) : q)) }), retablie(p))) : null;
    // Les valeurs des réglettes de la carte Réglage global, et celles que « Rétablir » leur rend.
    const reglages = { teinte: p.reglages?.teinte ?? {}, luminosite: p.reglages?.clarte ?? {}, saturation: partsDe(recette, p), saturationParDefaut: partsDe(recette, retablie(p)) };
    return { id: p.id, nom: p.nom ?? p.id, reference: p.reference, intensites: p.intensites ?? 2, porteur: cleDuPorteur(recette, p), ancrage: ancrageDe(recette, p), rampes: enHexa(rampesDe(recette, p)), ecarts, communes, reglages };
  });
  // Les paires sous le seuil sont celles de l'alerte du plugin ; avec les huit plus proches, elles nourrissent la roue et les constats.
  const alertes = new Set(pairesTropProches(recette).map(({ palettes }) => palettes.join('|')));
  const paires = [];
  for (const [rang, a] of recette.palettes.entries()) for (const b of recette.palettes.slice(rang + 1)) {
    const proximite = proximiteDePalettes(recette, a, b);
    if (proximite) paires.push({ a, b, proximite, alerte: alertes.has(`${a.id}|${b.id}`) });
  }
  paires.sort((x, y) => x.proximite.distance - y.proximite.distance);
  const proches: Record<string, unknown>[] & { a: string; b: string; alerte: boolean }[] = [];
  for (const [rang, { a, b, proximite, alerte }] of paires.entries()) {
    if (alerte || rang < 8) proches.push({ a: a.nom, b: b.nom, distance: +proximite.distance.toFixed(3), rapport: +(proximite.distance / recette.seuils.palettesProches).toFixed(2), alerte, mode: proximite.mode, role: LIBELLE_DU_ROLE[proximite.role] });
  }
  // Pour chaque paire en alerte et chaque palette, le verdict à chaque degré entier de la réglette de teinte du porteur :
  // 1 trop proche, 0 séparée, null hors de la course permise. La paire de démonstration est celle qu'un plus petit réglage sépare.
  let demonstration: { a: string; b: string; membres: Record<string, unknown> } | null = null;
  let plusPetit = Infinity;
  for (const paire of proches.filter((x) => x.alerte)) {
    const membres: Record<string, { actuelle: number; valeurs: ({ v: number; proche: boolean; rampes: unknown } | null)[] }> = {};
    let deplacement = Infinity;
    for (const nom of [paire.a, paire.b]) {
      const p = recette.palettes.find((q) => q.nom === nom)!;
      const autre = recette.palettes.find((q) => q.nom === (nom === paire.a ? paire.b : paire.a))!;
      const actuelle = p.reglages?.teinte?.[cleDuPorteur(recette, p)] ?? 0;
      const course = courseDeTeinte(recette, p);
      const zones = zonesTropProches(recette, p, autre);
      const immobiles = nuancesDeProximite(recette, autre)!;
      const valeurs = [];
      for (let v = -30; v <= 30; v += 1) {
        const ecart = v - actuelle;
        if (ecart < course.bas - 1e-9 || ecart > course.haut + 1e-9) { valeurs.push(null); continue; }
        const proche = zones.some((z) => v >= z.debut - 1e-9 && v <= z.fin + 1e-9);
        const tournee = Math.abs(ecart) < 0.5 ? p : candidatDeTeinte(recette, p, ecart);
        // Le verdict des zones doit être celui des nuances du candidat, hors des degrés non entiers de l'écart.
        const mesure = nuancesDeProximite(recette, tournee);
        if (Number.isInteger(ecart) && mesure && proximiteDeNuances(mesure, immobiles).distance < recette.seuils.palettesProches !== proche) throw new Error(`${nom} à ${v}° : zones et nuances divergent`);
        valeurs.push({ v, proche, rampes: enHexa(rampesDe(recette, tournee)) });
      }
      const sortie = sortieLaPlusProche(recette, p, autre);
      if (sortie !== null) deplacement = Math.min(deplacement, Math.abs(sortie));
      membres[nom] = { actuelle, valeurs };
    }
    Object.assign(paire, { deplacement: Number.isFinite(deplacement) ? deplacement : null, zones: Object.fromEntries(Object.entries(membres).map(([nom, m]) => [nom, m.valeurs.map((x) => (x ? (x.proche ? 1 : 0) : null))])) });
    if (deplacement < plusPetit) { plusPetit = deplacement; demonstration = { a: paire.a, b: paire.b, membres }; }
  }
  return { id, titre, crans: recette.crans, fonds: recette.fonds, texteDesBoutons: recette.texteDesBoutons, communes: { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part }, palettes, paires: proches, demonstration, seuilAlerte: recette.seuils.palettesProches };
}

const donnees = {
  table: TABLE_DES_DOSSIERS,
  jeux: [jeu('mainteneur', 'Fichier du mainteneur', RECETTE_REELLE), jeu('galerie', 'Vingt palettes de la galerie', galerie)],
};
writeFileSync(new URL('../Maquettes/donnees-ensembles.js', import.meta.url), `// Généré par Mesures/generer-ensembles.ts ; ne pas modifier à la main.\nwindow.ENSEMBLES = ${JSON.stringify(donnees)};\n`);
for (const j of donnees.jeux) {
  console.log(`${j.titre} : ${j.palettes.length} palettes, ${j.palettes.filter((p) => p.ecarts.length).length} réglées, ${j.paires.filter((p) => p.alerte).length} alertes`);
  for (const p of j.paires.slice(0, 8)) console.log(`  ${p.alerte ? '!' : ' '} ${p.a} · ${p.b} ${p.role} ${p.mode} ${p.distance}`);
  for (const p of j.paires.filter((x) => x.alerte)) console.log(`  ${p.a} · ${p.b} : ${(p as { deplacement?: number | null }).deplacement == null ? 'aucun réglage ne les sépare' : `séparées en ${(p as { deplacement: number }).deplacement}°`}`);
  console.log(`  démonstration : ${j.demonstration ? `${j.demonstration.a} · ${j.demonstration.b}` : 'aucune'}`);
}
