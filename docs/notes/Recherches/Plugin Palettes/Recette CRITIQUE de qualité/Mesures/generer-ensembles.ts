/**
 * Les données de la maquette Comparer (`../Maquettes/donnees-ensembles.js`) : deux jeux de
 * palettes, le fichier du mainteneur et les vingt palettes « à vérifier » de la galerie. Pour
 * chaque palette : ses rampes, son ancrage, ses écarts aux valeurs communes et ses rampes une
 * fois ces valeurs rétablies. Pour chaque jeu : les paires qui se confondent et la plus petite
 * rotation de teinte qui sépare chacune.
 */
import { writeFileSync } from 'node:fs';
import { ecrireHexa, lireHexa, rgb8VersOklch, oklchVersOklab } from '../../../../../../packages/couleur/src/conversions';
import { referenceReglee } from '../../../../../../packages/couleur/src/reglages';
import { boutsDe } from '../../../../../../packages/couleur/src/nuances';
import { ancrageDe, cleDuPorteur, departDe, profilPorteur, rampesDe } from '../../../../../../packages/couleur/src/palette';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import { TABLE_DES_DOSSIERS, sensDuTheme } from '../../../../../../packages/kit/src/emplois/dossiers';
import { RECETTE_REELLE, valider } from './variantes';

const fr = (x: number, n = 2) => x.toFixed(n).replace('.', ',').replace('-', '−');
const signe = (x: number) => `${x > 0 ? '+' : ''}${fr(x, 3).replace(/0+$/, '').replace(/,$/, '')}`;
// La distance visée par « Écarter » ; l'alerte garde le seuil `palettesProches` de la recette.
const SEUILS: Record<string, number> = { solid: 0.1, foreground: 0.06 };
// Les fonds teintés clairs sont peu saturés par construction : à vingt palettes, les compter donnait 46 paires.
// Une confusion se juge sur ce qui porte le statut, le plein et le texte.
const ROLES = [['solid/default', 'solid', 'le plein'], ['surface/foreground', 'foreground', 'le texte du fond teinté']] as const;

// Les vingt palettes « à vérifier » de la galerie (`galerie/etats.cjs`), reconstruites à l'identique.
const VINGT = [
  ['Bleu', '#1E6FD9'], ['Jaune', '#FACC15'], ['Rouge', '#D94635'], ['Violet', '#7C3AED'], ['Cyan', '#0891B2'],
  ['Ardoise', '#6B7280'], ['Rose', '#DB2777'], ['Indigo', '#4F46E5'], ['Lime', '#65A30D'], ['Teal', '#0D9488'],
  ['Fuchsia', '#C026D3'], ['Pourpre', '#9333EA'], ['Sable', '#A8A29E'], ['Marine', '#1E3A8A'], ['Cuivre', '#B25E34'],
  ['Moutarde', '#B2B234'], ['Vert', '#16A34A'], ['Grenat', '#B23488'], ['Azur', '#2272DD'], ['Feuille', '#15A34B'],
];
const defaut = recetteParDefaut();
const galerie = valider({
  ...defaut,
  palettes: VINGT.map(([nom, reference], rang) => {
    const couleur = lireHexa(reference)!;
    const gris = Math.max(...couleur) - Math.min(...couleur) <= 1;
    const derive = gris ? { clair: 0, sombre: 0 } : prereglageTailwind(rgb8VersOklch(couleur), boutsDe(defaut));
    const palette = { id: `p-b11a0${rang.toString(16).padStart(3, '0')}`, nom, reference, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
    return nom === 'Indigo' || nom === 'Rose' ? { ...palette, parts: { soft: 0.5, vivid: 0.55, origine: 'designer' } } : palette;
  }),
});

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
  const { parts: _parts, ...reste } = p;
  const reglages = p.reglages ? JSON.parse(JSON.stringify({ ...p.reglages, clarte: undefined, part: undefined })) : undefined;
  return { ...reste, derive: { ...p.derive, soft: nettoyer(p.derive.soft), vivid: nettoyer(p.derive.vivid) }, ...(reglages && Object.keys(reglages).length ? { reglages } : {}) } as Palette;
}

const enHexa = (r: ReturnType<typeof rampesDe>) => Object.fromEntries(Object.entries(r).map(([i, m]) => [i, { light: m!.light.map((c) => c.hexa), dark: m!.dark.map((c) => c.hexa) }]));
const lab = (h: string) => oklchVersOklab(rgb8VersOklch(lireHexa(h)!));
const dE = (a: string, b: string) => { const x = lab(a); const y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

/** La plus petite distance d'une paire, relative au seuil de son rôle, dans les deux thèmes. */
function proximite(recette: Recette, a: Palette, b: Palette) {
  const couleur = (p: Palette, mode: 'light' | 'dark', v: string) => {
    const r = rampesDe(recette, p);
    const rampe = (r.vivid ?? r.unique)![mode];
    const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, recette.texteDesBoutons[mode])] as Record<string, number>;
    return rampe[recette.crans.indexOf(table[v])].hexa;
  };
  let pire: { r: number; e: number; mode: string; role: string } | null = null;
  for (const mode of ['light', 'dark'] as const) for (const [v, famille, role] of ROLES) {
    const e = dE(couleur(a, mode, v), couleur(b, mode, v));
    if (!pire || e / SEUILS[famille] < pire.r) pire = { r: e / SEUILS[famille], e, mode, role };
  }
  return pire!;
}

/** La palette tournée de `degres` par le réglage de teinte de la carte ; `null` hors de la borne de ±30°. */
function tourner(recette: Recette, p: Palette, degres: number): Recette | null {
  const teinte: Record<string, number> = {};
  // Une palette à une intensité range sa teinte sous `vivid`, comme sa dérive.
  for (const profil of p.intensites === 1 ? (['vivid'] as const) : (['soft', 'vivid'] as const)) {
    const v = Math.round(((p.reglages?.teinte?.[profil] ?? 0) + degres) * 100) / 100;
    if (Math.abs(v) > 30) return null;
    if (v !== 0) teinte[profil] = v;
  }
  // Comme le geste du plugin : la référence se refait depuis le départ, le porteur se fige.
  const cle = cleDuPorteur(recette, p);
  const porteur = p.intensites === 1 || p.base ? {} : { porteur: p.reglages?.porteur ?? profilPorteur(recette, p) };
  const reference = ecrireHexa(referenceReglee(departDe(recette, p), teinte[cle] ?? 0, p.reglages?.clarte?.[cle] ?? 0, p.reglages?.part, recette.gamut));
  const originale = p.originale ?? p.reference;
  if (reference.toUpperCase() === originale.toUpperCase()) return null;
  return valider({ ...recette, palettes: recette.palettes.map((q) => (q.id === p.id ? { ...q, reference, originale, reglages: { ...(q.reglages ?? {}), ...porteur, teinte } } : q)) });
}

function jeu(id: string, titre: string, recette: Recette) {
  const palettes = recette.palettes.map((p) => {
    const ecarts = ecartsDe(recette, p);
    const communes = ecarts.length ? enHexa(rampesDe(valider({ ...recette, palettes: recette.palettes.map((q) => (q.id === p.id ? retablie(q) : q)) }), retablie(p))) : null;
    return { id: p.id, nom: p.nom ?? p.id, reference: p.reference, intensites: p.intensites ?? 2, ancrage: ancrageDe(recette, p), rampes: enHexa(rampesDe(recette, p)), ecarts, communes };
  });
  const paires = [];
  // Un neutre n'a pas de teinte à confondre.
  const colorees = recette.palettes.filter((p) => rgb8VersOklch(lireHexa(p.reference)!).C > 0.05);
  for (let i = 0; i < colorees.length; i += 1) for (let k = i + 1; k < colorees.length; k += 1) {
    const m = proximite(recette, colorees[i], colorees[k]);
    paires.push({ a: colorees[i], b: colorees[k], m });
  }
  paires.sort((x, y) => x.m.r - y.m.r);
  const proches = [];
  // Les huit paires les plus proches, relativement à la distance visée ; l'alerte ne vise que celles sous le seuil de la recette.
  for (const { a, b, m } of paires.slice(0, 8)) {
    const rotations = [];
    // Une paire déjà à la distance visée n'appelle aucune rotation.
    for (const p of m.r >= 1 ? [] : [a, b]) for (const sens of [1, -1]) {
      for (let d = 1; d <= 30; d += 1) {
        const r = tourner(recette, p, sens * d);
        if (!r) { if (Math.abs(d) >= 30) break; continue; }
        const autre = r.palettes.find((q) => q.id === (p.id === a.id ? b.id : a.id))!;
        if (proximite(r, r.palettes.find((q) => q.id === p.id)!, autre).r >= 1) {
          rotations.push({ palette: p.nom, degres: sens * d, rampes: enHexa(rampesDe(r, r.palettes.find((q) => q.id === p.id)!)) });
          break;
        }
      }
    }
    proches.push({ a: a.nom, b: b.nom, distance: +m.e.toFixed(3), rapport: +m.r.toFixed(2), alerte: m.e < recette.seuils.palettesProches, mode: m.mode, role: m.role, rotations });
  }
  return { id, titre, crans: recette.crans, fonds: recette.fonds, texteDesBoutons: recette.texteDesBoutons, communes: { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part }, palettes, paires: proches, seuilAlerte: recette.seuils.palettesProches };
}

const donnees = {
  table: TABLE_DES_DOSSIERS,
  jeux: [jeu('mainteneur', 'Fichier du mainteneur', RECETTE_REELLE), jeu('galerie', 'Vingt palettes de la galerie', galerie)],
};
writeFileSync(new URL('../Maquettes/donnees-ensembles.js', import.meta.url), `// Généré par Mesures/generer-ensembles.ts ; ne pas modifier à la main.\nwindow.ENSEMBLES = ${JSON.stringify(donnees)};\n`);
for (const j of donnees.jeux) {
  console.log(`${j.titre} : ${j.palettes.length} palettes, ${j.palettes.filter((p) => p.ecarts.length).length} écartées, ${j.paires.filter((p) => p.alerte).length} alertes`);
  for (const p of j.paires.slice(0, 8)) console.log(`  ${p.alerte ? '!' : ' '} ${p.a} · ${p.b} ${p.role} ${p.mode} ${p.distance} → ${p.rotations.map((r) => `${r.palette} ${r.degres}°`).join(', ') || 'aucune rotation'}`);
}
