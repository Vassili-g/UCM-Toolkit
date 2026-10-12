/**
 * Proximité des palettes de la recette réelle, rôle par rôle : distance Oklab,
 * écart de teinte et écart de clarté sur les variables qu'un composant peint.
 * Puis, pour chaque paire trop proche, la plus petite rotation de teinte d'une
 * palette qui écarte la paire au seuil, dans chaque sens.
 */
import { writeFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch, oklchVersOklab } from '../../../../../../packages/couleur/src/conversions';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/recette';
import { RECETTE_REELLE, valider } from './variantes';

const ROLES = { light: { 'solid/default': 700, 'surface/default': 100, 'surface/foreground': 800 }, dark: { 'solid/default': 700, 'surface/default': 100, 'surface/foreground': 900 } } as const;
/** Seuils d'expérimentation par famille de rôle : un fond teinté porte peu de chroma, un plein beaucoup. */
const SEUILS: Record<string, number> = { 'solid/default': 0.1, 'surface/default': 0.025, 'surface/foreground': 0.06 };
const seuilDe = (role: string) => SEUILS[role.split(' ')[1]];
const crans = RECETTE_REELLE.crans;

const lab = (hexa: string) => oklchVersOklab(rgb8VersOklch(lireHexa(hexa)!));
const deltaE = (a: string, b: string) => { const x = lab(a); const y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const ecartH = (a: string, b: string) => { const d = Math.abs(rgb8VersOklch(lireHexa(a)!).H - rgb8VersOklch(lireHexa(b)!).H) % 360; return d > 180 ? 360 - d : d; };

const intensite = (recette: Recette, p: Palette) => (p.intensites === 1 ? 'unique' : 'vivid') as 'unique' | 'vivid';
const couleurs = (recette: Recette, p: Palette) => {
  const r = rampesDe(recette, p)[intensite(recette, p)]!;
  return Object.fromEntries((['light', 'dark'] as const).flatMap((mode) => Object.entries(ROLES[mode]).map(([role, cran]) => [`${mode} ${role}`, r[mode][crans.indexOf(cran)].hexa])));
};

/** La plus petite distance d'une paire sur les rôles suivis, et le rôle où elle tombe. */
function proximite(recette: Recette, a: Palette, b: Palette) {
  const ca = couleurs(recette, a); const cb = couleurs(recette, b);
  // Le rôle le plus proche relativement à son seuil.
  return Object.keys(ca).map((role) => ({ role, dE: deltaE(ca[role], cb[role]), dH: ecartH(ca[role], cb[role]), rapport: deltaE(ca[role], cb[role]) / seuilDe(role) }))
    .sort((x, y) => x.rapport - y.rapport)[0];
}

const palettes = RECETTE_REELLE.palettes.filter((p) => p.nom !== 'Titanium');
const paires: Record<string, unknown>[] = [];
for (let i = 0; i < palettes.length; i += 1) for (let j = i + 1; j < palettes.length; j += 1) {
  const m = proximite(RECETTE_REELLE, palettes[i], palettes[j]);
  paires.push({ paire: `${palettes[i].nom} · ${palettes[j].nom}`, role: m.role, dE: +m.dE.toFixed(3), dH: +m.dH.toFixed(1), rapport: +m.rapport.toFixed(2) });
}
paires.sort((x, y) => (x.rapport as number) - (y.rapport as number));
console.log('Paires, de la plus proche à la plus éloignée (Vivid ou intensité unique) :');
for (const p of paires) console.log(`  ${String(p.paire).padEnd(22)} ${p.rapport}× le seuil  ΔE ${p.dE}  ΔH ${p.dH}°  sur ${p.role}`);

/** Tourne la teinte des deux profils d'une palette de `degres`, comme le réglage de teinte de la carte. */
function tourner(recette: Recette, p: Palette, degres: number): Recette {
  const teinte: Record<string, number> = {};
  for (const profil of ['soft', 'vivid'] as const) {
    const valeur = Math.round(((p.reglages?.teinte?.[profil] ?? 0) + degres) * 100) / 100;
    if (valeur !== 0) teinte[profil] = valeur;
  }
  const autre = { ...p, originale: p.originale ?? p.reference, reglages: { ...(p.reglages ?? {}), teinte } } as Palette;
  return valider({ ...recette, palettes: recette.palettes.map((q) => (q.id === p.id ? autre : q)) });
}

const propositions: Record<string, unknown>[] = [];
for (const p of paires.filter((x) => (x.rapport as number) < 1)) {
  const [nomA, nomB] = String(p.paire).split(' · ');
  for (const nom of [nomA, nomB]) {
    const fixe = nom === nomA ? nomB : nomA;
    for (const sens of [1, -1]) {
      let trouve: number | null = null;
      for (let d = 1; d <= 40 && trouve === null; d += 1) {
        let recette: Recette;
        // La borne du réglage de teinte arrête la recherche.
        try { recette = tourner(RECETTE_REELLE, RECETTE_REELLE.palettes.find((q) => q.nom === nom)!, sens * d); } catch { break; }
        const m = proximite(recette, recette.palettes.find((q) => q.nom === nom)!, recette.palettes.find((q) => q.nom === fixe)!);
        if (m.rapport >= 1) trouve = sens * d;
      }
      propositions.push({ paire: p.paire, tourner: nom, rotation: trouve });
    }
  }
}
console.log('\nRotations minimales pour atteindre le seuil de chaque rôle suivi :');
for (const x of propositions) console.log(`  ${String(x.paire).padEnd(22)} tourner ${String(x.tourner).padEnd(10)} ${x.rotation === null ? 'aucune avant la borne du réglage' : `${x.rotation}°`}`);
writeFileSync(new URL('./MESURES-TEINTES.json', import.meta.url), `${JSON.stringify({ seuils: SEUILS, roles: ROLES, paires, propositions }, null, 1)}\n`);
