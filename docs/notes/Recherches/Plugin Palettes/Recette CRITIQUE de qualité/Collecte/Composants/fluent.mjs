/**
 * Microsoft Fluent 2 : Badge `tint` et `filled` (react-badge 9.5.6),
 * MessageBar (react-message-bar 9.7.7), Button `subtle` et `primary`
 * (react-button 9.11.1), avec les tokens de @fluentui/tokens 1.0.0-alpha.24
 * (thèmes web, rampe de marque `brandWeb`).
 * Les tokens sont des expressions (`grey[96]`, `brand[80]`, `red.tint60`) que
 * le script résout dans les fichiers de couleurs ; aucun code n'est exécuté.
 * Fluent ne déclare pas de rôle « page » : le support est la carte
 * (`colorNeutralBackground1`).
 */
import { texte, fichier, ligneDe, valeur, supportDe, evaluer } from './lib.mjs';

const VERSION = '@fluentui/tokens@1.0.0-alpha.24 + react-badge@9.5.6 / react-message-bar@9.7.7 / react-button@9.11.1';

/** Objets de couleurs `export const nom = { pas: 'valeur' }` et scalaires. */
function tables(texteSource) {
  const objets = {};
  for (const m of texteSource.matchAll(/export const (\w+) = \{([^}]*)\};/g)) {
    const o = {};
    for (const p of m[2].matchAll(/'?(\w+)'?:\s*['`]([^'`]+)['`]/g)) o[p[1]] = p[2];
    objets[m[1]] = o;
  }
  const scalaires = {};
  for (const m of texteSource.matchAll(/export const (\w+) = ['`](#[0-9a-f]+)['`];/g)) scalaires[m[1]] = m[2];
  return { objets, scalaires };
}
const gris = tables(texte('fluentColors'));
const marque = tables(texte('fluentBrandColors'));
const objets = { ...gris.objets, brand: marque.objets.brandWeb };
const scalaires = gris.scalaires;

function valeurDe(expr) {
  let m;
  if ((m = expr.match(/^(\w+)\[(\d+)\]$/))) {
    const v = objets[m[1]]?.[m[2]];
    if (!v) throw new Error(`Fluent : ${expr} introuvable`);
    return v;
  }
  if (/^'transparent'$/.test(expr)) return 'transparent';
  if (scalaires[expr]) return scalaires[expr];
  throw new Error(`Fluent : expression non gérée ${expr}`);
}

const THEMES = {
  clair: { alias: 'fluentLightColor', palette: 'fluentLightPalette', R: { Background1: 'tint60', Foreground1: 'shade10', Border1: 'tint40', Background3: 'primary' }, web: 'fluentWebLightTheme' },
  sombre: { alias: 'fluentDarkColor', palette: 'fluentDarkPalette', R: { Background1: 'shade40', Foreground1: 'tint30', Border1: 'primary', Background3: 'primary' }, web: 'fluentWebDarkTheme' },
};

function fabrique(theme) {
  const { alias: idAlias, palette: idPal, R } = THEMES[theme];
  const alias = texte(idAlias);
  const pal = texte(idPal);
  const mapping = texte('fluentStatusMapping');

  const neutre = (token, composant) => {
    const m = alias.match(new RegExp(`^\\s*${token}:\\s*('transparent'|\\w+(?:\\[\\d+\\])?),`, 'm'));
    if (!m) throw new Error(`Fluent ${theme} : ${token} absent`);
    const pas = m[1].match(/\[(\d+)\]/)?.[1];
    return valeur({
      token,
      publie: valeurDe(m[1]),
      id: idAlias,
      ligne: ligneDe(alias, new RegExp(`^\\s*${token}:`, 'm')),
      pas,
      via: { expression: m[1] },
      aussi: composant ? { composant } : undefined,
    });
  };

  // Règle générale de la boucle de palette, vérifiée dans le fichier
  const verifier = (suffixe, mot) => {
    const motif = mot === 'palette'
      ? new RegExp(`colorPalette\\$\\{color\\}${suffixe}\`\\]: statusSharedColors\\[sharedColor\\]\\.${R[suffixe]}`)
      : new RegExp(`colorStatus\\$\\{color\\}${suffixe}\`\\]: mappedStatusColors\\[sharedColor\\]\\.${R[suffixe]}`);
    if (!motif.test(pal)) throw new Error(`Fluent ${theme} : règle ${mot} ${suffixe} non retrouvée`);
  };

  const palette = (nomCouleur, suffixe, composant) => {
    verifier(suffixe, 'palette');
    const cap = nomCouleur[0].toUpperCase() + nomCouleur.slice(1);
    let pas = R[suffixe];
    const re = new RegExp(`statusColorPaletteTokens\\.colorPalette${cap}${suffixe} = statusSharedColors\\.${nomCouleur}\\.(\\w+);`);
    const m = pal.match(re);
    let patch = null;
    if (m) {
      pas = m[1];
      patch = ligneDe(pal, re);
    }
    const v = objets[nomCouleur]?.[pas];
    if (!v) throw new Error(`Fluent : ${nomCouleur}.${pas} introuvable`);
    return valeur({
      token: `colorPalette${cap}${suffixe}`,
      publie: v,
      id: idPal,
      pas: `${nomCouleur}.${pas}`,
      via: { expression: `${nomCouleur}.${pas}`, regle: patch ? `correction unitaire ligne ${patch}` : 'règle générale de la boucle' },
      aussi: composant ? { composant } : undefined,
    });
  };

  const statut = (ton, suffixe, composant) => {
    verifier(suffixe, 'statut');
    const cm = mapping.match(new RegExp(`${ton}:\\s*'(\\w+)'`));
    if (!cm) throw new Error(`Fluent : statusColorMapping.${ton} absent`);
    const couleur = cm[1];
    const cap = ton[0].toUpperCase() + ton.slice(1);
    let pas = R[suffixe];
    const re = new RegExp(`colorStatusTokens\\.colorStatus${cap}${suffixe} = mappedStatusColors\\[statusColorMapping\\.${ton}\\]\\.(\\w+);`);
    const m = pal.match(re);
    if (m) pas = m[1];
    const v = objets[couleur]?.[pas];
    if (!v) throw new Error(`Fluent : ${couleur}.${pas} introuvable`);
    return valeur({
      token: `colorStatus${cap}${suffixe}`,
      publie: v,
      id: idPal,
      pas: `${couleur}.${pas}`,
      via: { expression: `${couleur}.${pas}`, correspondance: `statusColorMapping.${ton} = ${couleur}` },
      aussi: composant ? { composant } : undefined,
    });
  };
  return { neutre, palette, statut };
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Microsoft Fluent 2', version: VERSION };
  const badge = texte('fluentBadgeStyles');
  const barre = texte('fluentMessageBarStyles');
  const bouton = texte('fluentButtonStyles');

  // Contrôle des couples lus dans les composants (les noms servent plus bas)
  const attendu = (t, motif, nom) => {
    if (!motif.test(t)) throw new Error(`Fluent : ${nom} n'est plus dans le composant`);
  };
  attendu(badge, /'tint-danger':\s*\{\s*backgroundColor: tokens\.colorPaletteRedBackground1,\s*color: tokens\.colorPaletteRedForeground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorPaletteRedBorder1\)/, 'Badge tint-danger');
  attendu(badge, /'tint-success':\s*\{\s*backgroundColor: tokens\.colorPaletteGreenBackground1,\s*color: tokens\.colorPaletteGreenForeground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorPaletteGreenBorder1\)/, 'Badge tint-success');
  attendu(badge, /'tint-warning':\s*\{\s*backgroundColor: tokens\.colorPaletteYellowBackground1,\s*color: tokens\.colorPaletteYellowForeground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorPaletteYellowBorder1\)/, 'Badge tint-warning');
  attendu(badge, /'tint-brand':\s*\{\s*backgroundColor: tokens\.colorBrandBackground2,\s*color: tokens\.colorBrandForeground2,\s*\.\.\.shorthands\.borderColor\(tokens\.colorBrandStroke2\)/, 'Badge tint-brand');
  attendu(badge, /'filled-danger':\s*\{\s*backgroundColor: tokens\.colorPaletteRedBackground3,\s*color: tokens\.colorNeutralForegroundOnBrand/, 'Badge filled-danger');
  attendu(badge, /'filled-success':\s*\{\s*backgroundColor: tokens\.colorPaletteGreenBackground3,\s*color: tokens\.colorNeutralForegroundOnBrand/, 'Badge filled-success');
  attendu(badge, /'filled-warning':\s*\{\s*backgroundColor: tokens\.colorPaletteYellowBackground3,\s*color: tokens\.colorNeutralForeground1Static/, 'Badge filled-warning');
  attendu(badge, /'filled-brand':\s*\{\s*backgroundColor: tokens\.colorBrandBackground,\s*color: tokens\.colorNeutralForegroundOnBrand/, 'Badge filled-brand');
  attendu(barre, /error:\s*\{\s*backgroundColor: tokens\.colorStatusDangerBackground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorStatusDangerBorder1\)/, 'MessageBar error');
  attendu(barre, /warning:\s*\{\s*backgroundColor: tokens\.colorStatusWarningBackground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorStatusWarningBorder1\)/, 'MessageBar warning');
  attendu(barre, /success:\s*\{\s*backgroundColor: tokens\.colorStatusSuccessBackground1,\s*\.\.\.shorthands\.borderColor\(tokens\.colorStatusSuccessBorder1\)/, 'MessageBar success');
  attendu(barre, /backgroundColor: tokens\.colorNeutralBackground3/, 'MessageBar base');
  attendu(bouton, /subtle: \{\s*backgroundColor: tokens\.colorSubtleBackground,[\s\S]*?color: tokens\.colorNeutralForeground2,\s*':hover': \{\s*backgroundColor: tokens\.colorSubtleBackgroundHover,[\s\S]*?color: tokens\.colorNeutralForeground2Hover,[\s\S]*?':hover:active,:active:focus-visible': \{\s*backgroundColor: tokens\.colorSubtleBackgroundPressed,[\s\S]*?color: tokens\.colorNeutralForeground2Pressed/, 'Button subtle');
  attendu(bouton, /primary: \{\s*backgroundColor: tokens\.colorBrandBackground,[\s\S]*?':hover': \{\s*backgroundColor: tokens\.colorBrandBackgroundHover,[\s\S]*?':hover:active,:active:focus-visible': \{\s*backgroundColor: tokens\.colorBrandBackgroundPressed/, 'Button primary');

  const lieu = (id, motif) => ({ fichier: fichier(id), ligne: ligneDe(texte(id), motif) });

  for (const theme of ['clair', 'sombre']) {
    const F = fabrique(theme);
    const support = supportDe('fluent2', theme === 'clair' ? 'light' : 'dark');
    const tons = { danger: ['red', 'Danger', 'Red'], success: ['green', 'Success', 'Green'], warning: ['yellow', 'Warning', 'Yellow'] };

    for (const [ton, [couleur]] of Object.entries(tons)) {
      const cBadge = lieu('fluentBadgeStyles', `'tint-${ton}':`);
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: `tint ${ton}`, ton, theme,
        fond: F.palette(couleur, 'Background1', cBadge),
        texte: F.palette(couleur, 'Foreground1', cBadge),
        contour: F.palette(couleur, 'Border1', cBadge),
        notes: ['Contour 1 px.'],
      }, support));
      const cFill = lieu('fluentBadgeStyles', `'filled-${ton}':`);
      out.push(evaluer({
        ...base, type: 'badge-plein', composant: 'Badge', variante: `filled ${ton}`, ton, theme,
        fond: F.palette(couleur, 'Background3', cFill),
        texte: ton === 'warning' ? F.neutre('colorNeutralForeground1Static', cFill) : F.neutre('colorNeutralForegroundOnBrand', cFill),
        contour: null,
      }, support));
    }
    // Ton « info » : la couleur de marque
    const cBrandTint = lieu('fluentBadgeStyles', "'tint-brand':");
    out.push(evaluer({
      ...base, type: 'badge-discret', composant: 'Badge', variante: 'tint brand', ton: 'info', theme,
      fond: F.neutre('colorBrandBackground2', cBrandTint),
      texte: F.neutre('colorBrandForeground2', cBrandTint),
      contour: F.neutre('colorBrandStroke2', cBrandTint),
      notes: ['Le ton « info » est la couleur de marque du thème web (`brandWeb`).'],
    }, support));
    const cBrandFill = lieu('fluentBadgeStyles', "'filled-brand':");
    out.push(evaluer({
      ...base, type: 'badge-plein', composant: 'Badge', variante: 'filled brand', ton: 'info', theme,
      fond: F.neutre('colorBrandBackground', cBrandFill),
      texte: F.neutre('colorNeutralForegroundOnBrand', cBrandFill),
      contour: null,
    }, support));

    // MessageBar
    const intentions = { danger: 'Danger', success: 'Success', warning: 'Warning' };
    for (const ton of Object.keys(intentions)) {
      const c = lieu('fluentMessageBarStyles', ton === 'danger' ? 'error: {\n        backgroundColor' : `${ton}: {\n        backgroundColor`);
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'MessageBar', variante: ton === 'danger' ? 'error' : ton, ton, theme,
        fond: F.statut(ton, 'Background1', c),
        texte: F.neutre('colorNeutralForeground1', c),
        contour: F.statut(ton, 'Border1', c),
        notes: ['Contour 1 px. Le texte du corps est `colorNeutralForeground1` (texte courant du thème, non fixé dans `useMessageBarStyles`). L\'icône porte la couleur du ton.'],
      }, support));
    }
    const cInfo = lieu('fluentMessageBarStyles', 'backgroundColor: tokens.colorNeutralBackground3');
    out.push(evaluer({
      ...base, type: 'alerte', composant: 'MessageBar', variante: 'info', ton: 'info', theme,
      fond: F.neutre('colorNeutralBackground3', cInfo),
      texte: F.neutre('colorNeutralForeground1', cInfo),
      contour: F.neutre('colorNeutralStroke1', cInfo),
      notes: ['L\'intention `info` n\'a pas de couleur propre : fond neutre 3 et contour neutre.'],
    }, support));

    // Button
    const cBouton = lieu('fluentButtonStyles', 'subtle: {');
    out.push(evaluer({
      ...base, type: 'bouton-teinte', composant: 'Button', variante: 'subtle', ton: 'neutre', theme,
      fond: F.neutre('colorSubtleBackground', cBouton),
      texte: F.neutre('colorNeutralForeground2', cBouton),
      contour: null,
      survol: { fond: F.neutre('colorSubtleBackgroundHover', cBouton), texte: F.neutre('colorNeutralForeground2Hover', cBouton) },
      appui: { fond: F.neutre('colorSubtleBackgroundPressed', cBouton), texte: F.neutre('colorNeutralForeground2Pressed', cBouton) },
      notes: ['Fond transparent au repos. Aucun bouton de la bibliothèque n\'est teinté par un ton.'],
    }, support));
    const cPrimary = lieu('fluentButtonStyles', 'primary: {');
    out.push(evaluer({
      ...base, type: 'bouton-plein', composant: 'Button', variante: 'primary', ton: 'marque', theme,
      fond: F.neutre('colorBrandBackground', cPrimary),
      texte: F.neutre('colorNeutralForegroundOnBrand', cPrimary),
      contour: null,
      survol: { fond: F.neutre('colorBrandBackgroundHover', cPrimary) },
      appui: { fond: F.neutre('colorBrandBackgroundPressed', cPrimary) },
    }, support));
  }
  return out;
}
