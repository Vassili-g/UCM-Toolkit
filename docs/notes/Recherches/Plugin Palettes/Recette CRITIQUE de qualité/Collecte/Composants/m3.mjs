/**
 * Material 3 (@material/web 2.5.0, jetons `v0_192`, schéma de base) :
 * FilledTonalButton, FilledButton, Assist chip et la paire de rôles
 * `error-container` / `on-error-container`.
 * Les composants ne portent que des noms de rôles et des opacités de couche
 * d'état ; les rôles sont résolus dans `_md-sys-color.scss` puis dans la
 * palette de référence. Les couches d'état (survol, appui) sont composées sur
 * le conteneur : ces valeurs sont calculées, pas publiées.
 */
import { texte, fichier, ligneDe, valeur, lire, composer, supportDe, evaluer } from './lib.mjs';

const VERSION = '@material/web@2.5.0 (tokens/versions/v0_192)';

const palette = (() => {
  const ref = {};
  for (const m of texte('m3RefPalette').matchAll(/'([\w-]+)':\s*if\(\$exclude-hardcoded-values,\s*null,\s*(#[0-9a-f]+)\)/gi)) ref[m[1]] = m[2];
  return ref;
})();

/** Rôles de couleur par thème : nom du rôle vers nom de palette (`secondary90`). */
const roles = (() => {
  const sys = texte('m3SysColor');
  const blocs = {};
  for (const [theme, fn] of [['sombre', 'values-dark'], ['clair', 'values-light']]) {
    const debut = sys.indexOf(`@function ${fn}(`);
    const fin = sys.indexOf(');\n}', debut);
    const zone = sys.slice(debut, fin);
    const dec = sys.slice(0, debut).split('\n').length - 1;
    const r = {};
    zone.split('\n').forEach((l, i) => {
      const m = l.match(/'([\w-]+)':\s*map\.get\(\$deps,\s*'md-ref-palette',\s*'([\w-]+)'\)/);
      if (m) r[m[1]] = { palette: m[2], ligne: dec + i + 1 };
    });
    blocs[theme] = r;
  }
  return blocs;
})();

function role(theme, nom, composant) {
  const r = roles[theme][nom];
  if (!r) throw new Error(`M3 ${theme} : rôle ${nom} absent`);
  const v = palette[r.palette];
  if (!v) throw new Error(`M3 : palette ${r.palette} absente`);
  const ton = r.palette.match(/(\d+)$/)?.[1];
  return valeur({
    token: `md.sys.color.${nom}`,
    publie: v,
    id: 'm3SysColor',
    ligne: r.ligne,
    pas: ton ? `ton ${ton}` : undefined,
    via: { palette: `md.ref.palette.${r.palette}`, fichierPalette: fichier('m3RefPalette'), lignePalette: ligneDe(texte('m3RefPalette'), `'${r.palette}':`) },
    aussi: composant ? { composant } : undefined,
  });
}

/** Opacité d'une couche d'état, lue dans `_md-sys-state.scss`. */
function opacite(nom) {
  const m = texte('m3SysState').match(new RegExp(`'${nom}':\\s*if\\(\\$exclude-hardcoded-values,\\s*null,\\s*([\\d.]+)\\)`));
  if (!m) throw new Error(`M3 : opacité ${nom} absente`);
  return { valeur: +m[1], ligne: ligneDe(texte('m3SysState'), `'${nom}'`) };
}

/** Rôle lu dans un fichier de jetons de composant (`'cle': map.get($deps, 'md-sys-color', 'role')`). */
function roleDuComposant(id, cle) {
  const t = texte(id);
  const m = t.match(new RegExp(`'${cle}':\\s*map\\.get\\(\\$deps,\\s*'md-sys-color',\\s*'([\\w-]+)'\\)`));
  if (!m) throw new Error(`M3 : '${cle}' absent de ${id}`);
  return { role: m[1], ligne: ligneDe(t, new RegExp(`'${cle}':`)), id };
}

/** Conteneur recouvert d'une couche d'état : valeur calculée, non publiée. */
function couche(conteneur, calque, op, etat, composant) {
  const c = lire(calque.hex);
  const hex = composer({ rgb: c.rgb, a: op.valeur }, conteneur.hex);
  return {
    token: `${etat}-state-layer (${calque.token}) sur le conteneur`,
    valeurPubliee: `${calque.token} ${calque.hex} à ${Math.round(op.valeur * 100)} % sur ${conteneur.hex}`,
    hexCalcule: hex,
    composeSur: conteneur.hex,
    calcule: 'couche d\'état composée sur le conteneur',
    pas: `couche ${Math.round(op.valeur * 100)} %`,
    source: { fichier: fichier('m3SysState'), ligne: op.ligne },
    composant,
  };
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Material 3', version: VERSION };
  const hover = opacite('hover-state-layer-opacity');
  const pressed = opacite('pressed-state-layer-opacity');

  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('material3', theme === 'clair' ? 'light' : 'dark');

    // Paire error-container / on-error-container
    const c0 = { fichier: fichier('m3SysColor'), ligne: roles[theme]['error-container'].ligne };
    out.push(evaluer({
      ...base, type: 'alerte', composant: 'Paire de rôles (aucun composant)', variante: 'error-container / on-error-container', ton: 'danger', theme,
      fond: role(theme, 'error-container', c0),
      texte: role(theme, 'on-error-container', c0),
      contour: null,
      notes: ['@material/web n\'a ni alerte ni bannière, et aucun rôle success, warning ni info. Seule la paire d\'erreur existe.'],
    }, support));

    // Assist chip (plat)
    const lab = roleDuComposant('m3AssistChip', 'label-text-color');
    const out1 = roleDuComposant('m3AssistChip', 'flat-outline-color');
    const hs = roleDuComposant('m3AssistChip', 'hover-state-layer-color');
    const ps = roleDuComposant('m3AssistChip', 'pressed-state-layer-color');
    const cAssist = { fichier: fichier('m3AssistChip'), ligne: lab.ligne };
    const fondPlat = valeur({ token: 'container (plat) : aucun jeton de couleur', publie: 'transparent', id: 'm3AssistChip', ligne: lab.ligne });
    const texteChip = role(theme, lab.role, cAssist);
    const survolCalque = role(theme, hs.role, cAssist);
    const appuiCalque = role(theme, ps.role, cAssist);
    out.push(evaluer({
      ...base, type: 'badge-discret', composant: 'Assist chip', variante: 'plat (flat)', ton: 'neutre', theme,
      fond: fondPlat,
      texte: texteChip,
      contour: role(theme, out1.role, cAssist),
      survol: { fond: couche({ hex: support.carte.hex }, { token: hs.role, hex: survolCalque.hex }, hover, 'hover', cAssist) },
      appui: { fond: couche({ hex: support.carte.hex }, { token: ps.role, hex: appuiCalque.hex }, pressed, 'pressed', cAssist) },
      notes: ['Le chip plat n\'a pas de jeton de fond : il est transparent, contour `outline` de 1 px. Il n\'existe pas de chip teinté par un ton de statut.'],
    }, support));

    // Boutons : conteneur, texte, couches d'état
    const bouton = (id, type, composant, variante, ton, notes) => {
      const ct = roleDuComposant(id, 'container-color');
      const lt = roleDuComposant(id, 'label-text-color');
      const hs2 = roleDuComposant(id, 'hover-state-layer-color');
      const ps2 = roleDuComposant(id, 'pressed-state-layer-color');
      const c = { fichier: fichier(id), ligne: ct.ligne };
      const fond = role(theme, ct.role, c);
      const calqueH = role(theme, hs2.role, c);
      const calqueP = role(theme, ps2.role, c);
      out.push(evaluer({
        ...base, type, composant, variante, ton, theme,
        fond,
        texte: role(theme, lt.role, c),
        contour: null,
        survol: { fond: couche(fond, { token: hs2.role, hex: calqueH.hex }, hover, 'hover', c) },
        appui: { fond: couche(fond, { token: ps2.role, hex: calqueP.hex }, pressed, 'pressed', c) },
        notes,
      }, support));
    };
    bouton('m3TonalButton', 'bouton-teinte', 'FilledTonalButton', 'tonal', 'secondaire', [
      'Conteneur `secondary-container`, texte `on-secondary-container`. Survol et appui : couche d\'état de la couleur du texte, à 8 % puis 12 %, posée sur le conteneur ; le survol ajoute l\'élévation niveau 1.',
    ]);
    bouton('m3FilledButton', 'bouton-plein', 'FilledButton', 'filled', 'primaire', [
      'Survol et appui : couche d\'état de la couleur du texte (`on-primary`), à 8 % puis 12 %, posée sur le conteneur.',
    ]);
  }
  return out;
}
