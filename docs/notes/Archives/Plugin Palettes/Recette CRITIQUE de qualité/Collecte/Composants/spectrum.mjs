/**
 * Adobe Spectrum 2 : Badge et InlineAlert de @react-spectrum/s2 (révision
 * 740c6c5c, style macro), avec les jetons de couleur de
 * @adobe/spectrum-tokens 14.15.0 (`dist/json/variables.json`).
 * Le composant écrit des noms de la macro de style (`informative-subtle`,
 * `gray-1000`, `lightDark('informative-800', 'informative-900')`) ; la
 * correspondance avec les jetons est lue dans `spectrum-theme.ts`.
 * Support : page = `background-base-color`, carte = `background-layer-2-color`
 * (la couche que le Badge `outline` emploie comme fond).
 */
import { texte, fichier, ligneDe, valeur, lire, versHex, evaluer } from './lib.mjs';

const VERSION = '@react-spectrum/s2@740c6c5c + @adobe/spectrum-tokens@14.15.0';
const variables = JSON.parse(texte('spectrumVariables'));
const theme_ts = texte('spectrumTheme');
const badge = texte('spectrumBadge');
const inline = texte('spectrumInlineAlert');
const THEME = { clair: 'light', sombre: 'dark' };

/** Valeur et référence d'un jeton pour un thème. */
function jetonBrut(nom, theme) {
  const t = variables[nom];
  if (!t) throw new Error(`Spectrum : jeton ${nom} absent`);
  const th = THEME[theme];
  if (t.sets?.[th]?.sets) return { valeur: t.sets[th].sets[th].value, ref: t.sets[th].ref?.slice(1, -1) };
  if (t.sets?.[th]) return { valeur: t.sets[th].value, ref: t.ref?.slice(1, -1) };
  throw new Error(`Spectrum : forme inattendue pour ${nom}`);
}

function jeton(nom, theme, composant, pas) {
  const b = jetonBrut(nom, theme);
  return valeur({
    token: nom,
    publie: b.valeur,
    id: 'spectrumVariables',
    pas: pas ?? pasDe(b.ref ?? nom),
    via: b.ref ? { ref: b.ref } : undefined,
    aussi: composant ? { composant } : undefined,
  });
}
const pasDe = (nom) => nom.match(/-(\d+)$/)?.[1];

/** Couleur de la macro (`white`, `black`, `gray-1000`, `informative-800`) vers un jeton. */
function jetonMacro(nomMacro, theme, composant) {
  if (nomMacro === 'white' || nomMacro === 'black') {
    return valeur({ token: nomMacro, publie: nomMacro, id: 'spectrumBadge', pas: nomMacro, aussi: composant ? { composant } : undefined });
  }
  const echelle = nomMacro.match(/^(informative|positive|notice|negative|accent)-(\d+)$/);
  const nom = echelle ? `${echelle[1]}-color-${echelle[2]}` : nomMacro;
  return jeton(nom, theme, composant);
}

/** Vérifie que `spectrum-theme.ts` associe bien le nom de la macro au jeton attendu. */
function correspondance(nomMacro, jetonAttendu) {
  const motif = new RegExp(`'?${nomMacro}'?:\\s*(?:weirdColorToken|colorToken)\\('${jetonAttendu}'\\)`);
  if (!motif.test(theme_ts)) throw new Error(`Spectrum : ${nomMacro} n'est plus associé à ${jetonAttendu}`);
}

const TONS = { info: 'informative', success: 'positive', warning: 'notice', danger: 'negative' };

/** Support : page et carte lues dans les jetons du thème. */
function support(theme) {
  const page = jetonBrut('background-base-color', theme);
  const carte = jetonBrut('background-layer-2-color', theme);
  const hex = (v) => versHex(lire(v).rgb);
  return {
    page: { token: 'background-base-color', hex: hex(page.valeur) },
    carte: { token: 'background-layer-2-color', hex: hex(carte.valeur) },
    source: fichier('spectrumVariables'),
  };
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Adobe Spectrum 2', version: VERSION };
  const cBadge = { fichier: fichier('spectrumBadge'), ligne: ligneDe(badge, 'const badge = style') };
  const cAlerte = { fichier: fichier('spectrumInlineAlert'), ligne: ligneDe(inline, 'const inlineAlert = style') };

  // Contrôles : les noms de la macro lus dans les composants
  if (!/subtle:\s*\{\s*variant:\s*\{\s*accent: 'accent-subtle'/.test(badge)) throw new Error('Spectrum : Badge subtle a changé');
  if (!/subtle: 'gray-1000'/.test(badge)) throw new Error('Spectrum : texte du Badge subtle a changé');
  if (!/borderColor: \{\s*default: 'transparent'/.test(badge)) throw new Error('Spectrum : contour du Badge a changé');
  for (const ton of Object.values(TONS)) {
    correspondance(`${ton}-subtle`, `${ton}-subtle-background-color-default`);
    correspondance(ton, `${ton}-background-color-default`);
  }
  const sortieLightDark = {};
  for (const m of badge.matchAll(/(informative|positive|notice|negative): lightDark\('([\w-]+)', '([\w-]+)'\)/g)) sortieLightDark[m[1]] = [m[2], m[3]];
  const bordureAlerte = {};
  const zoneBordure = inline.slice(inline.indexOf('borderColor: {'), inline.indexOf('backgroundColor: {'));
  for (const m of zoneBordure.matchAll(/(informative|positive|notice|negative): '([\w-]+)'/g)) bordureAlerte[m[1]] = m[2];
  const texteNoir = (t) => /notice: 'black'/.test(t);
  if (!texteNoir(badge)) throw new Error('Spectrum : le Badge bold du ton notice n\'a plus de texte noir');
  if (!/default: 'title'/.test(inline) || !/default: 'body'/.test(inline)) throw new Error('Spectrum : texte de InlineAlert a changé');

  for (const theme of ['clair', 'sombre']) {
    const sup = support(theme);
    for (const [ton, nom] of Object.entries(TONS)) {
      // Badge subtle
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: 'subtle', ton, theme,
        fond: jeton(`${nom}-subtle-background-color-default`, theme, cBadge),
        texte: jeton('gray-1000', theme, cBadge),
        contour: null,
        notes: ['Contour de 2 px transparent. Texte neutre, quel que soit le ton.'],
      }, sup));
      // Badge outline
      const ld = sortieLightDark[nom];
      if (!ld) throw new Error(`Spectrum : lightDark absent pour ${nom}`);
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: 'outline', ton, theme,
        fond: jeton('background-layer-2-color', theme, cBadge, 'layer-2'),
        texte: jeton('gray-1000', theme, cBadge),
        contour: jetonMacro(ld[theme === 'clair' ? 0 : 1], theme, cBadge),
        notes: ['Contour de 2 px : le pas change selon le thème (`lightDark`).'],
      }, sup));
      // Badge bold
      out.push(evaluer({
        ...base, type: 'badge-plein', composant: 'Badge', variante: 'bold', ton, theme,
        fond: jeton(`${nom}-background-color-default`, theme, cBadge),
        texte: jetonMacro(nom === 'notice' ? 'black' : 'white', theme, cBadge),
        contour: null,
      }, sup));

      // InlineAlert
      const tCorps = jeton('body-color', theme, cAlerte);
      const bord = bordureAlerte[nom];
      if (!bord) throw new Error(`Spectrum : bordure de InlineAlert absente pour ${nom}`);
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'InlineAlert', variante: 'border', ton, theme,
        fond: jeton('gray-25', theme, cAlerte),
        texte: tCorps,
        contour: jetonMacro(bord, theme, cAlerte),
        notes: ['Fond neutre `gray-25`, contour de 2 px de la couleur du ton. Le titre est `title-color`, le corps `body-color`.'],
      }, sup));
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'InlineAlert', variante: 'subtleFill', ton, theme,
        fond: jeton(`${nom}-subtle-background-color-default`, theme, cAlerte),
        texte: tCorps,
        contour: null,
        notes: ['Contour de 2 px transparent.'],
      }, sup));
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'InlineAlert', variante: 'boldFill', ton, theme,
        fond: jeton(`${nom}-background-color-default`, theme, cAlerte),
        texte: jetonMacro(nom === 'notice' ? 'black' : 'white', theme, cAlerte),
        contour: null,
        notes: ['Aplat plein ; texte blanc, noir pour `notice`.'],
      }, sup));
    }
  }
  return out;
}
