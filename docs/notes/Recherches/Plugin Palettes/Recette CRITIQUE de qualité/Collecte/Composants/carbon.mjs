/**
 * Carbon : notification en ligne, style `low-contrast`
 * (@carbon/themes 11.83.0, @carbon/styles 1.117.0). Les valeurs sont celles
 * déjà extraites par ../Surfaces/extract.mjs (processed/statuts.json) ; ce
 * module les remet au format commun et recalcule les contrastes sur les
 * supports de ../Surfaces/processed/surfaces.json. Le contour et le trait coloré
 * à gauche (`support-*`) sont rangés dans « contour ». La largeur du trait
 * n'a pas été relue.
 */
import { readFileSync } from 'node:fs';
import { dossier, supportDe, evaluer } from './lib.mjs';

const statuts = JSON.parse(readFileSync(new URL('../Surfaces/processed/statuts.json', dossier), 'utf8'));
const carbon = statuts.systemes.find((s) => s.id === 'carbon');
if (!carbon) throw new Error('Carbon absent de statuts.json');

const TONS = { error: 'danger', success: 'success', warning: 'warning', info: 'info' };
const source = 'Surfaces/processed/statuts.json';

/** Copie d'une valeur de statuts.json en gardant son origine. */
const reprendre = (e) => (e ? { ...e, repriseDe: source } : null);

export function lignes() {
  const out = [];
  for (const th of carbon.themes) {
    const support = supportDe('carbon', th.id);
    for (const t of th.tons) {
      const ton = TONS[t.ton];
      if (!ton) continue;
      out.push(evaluer({
        systeme: 'IBM Carbon',
        version: '@carbon/themes@11.83.0 + @carbon/styles@1.117.0',
        type: 'alerte',
        composant: 'Inline notification',
        variante: 'low-contrast',
        ton,
        theme: th.id,
        fond: reprendre(t.fond),
        texte: reprendre(t.texte),
        contour: { ...reprendre(t.bordure), epaisseur: 'contour de 1 px à 40 % sur trois côtés, plus un trait à gauche' },
        notes: th.id === 'g90' || th.id === 'g100'
          ? ['Dans les thèmes sombres, les quatre fonds de notification valent le même gris que la couche 01 ; seul le trait porte le ton.']
          : [],
      }, support));
    }
  }
  return out;
}
