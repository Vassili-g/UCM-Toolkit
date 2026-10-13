// Calculs partagés par les maquettes : contraste WCAG 2, OKLCH, alpha minimal et couleurs des rôles du thème.
window.UCM = (() => {
  const D = window.DONNEES;
  const rgb = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c);
  const hexa = (c) => `#${c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const lin = (x) => { const v = x / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const luminance = (c) => { const [r, g, b] = rgb(c).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contraste = (a, b) => { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const oklch = (c) => {
    const [r, g, b] = rgb(c).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360, lab: [L, A, B] };
  };
  const deltaE = (a, b) => { const x = oklch(a).lab; const y = oklch(b).lab; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

  /** La couleur d'alpha minimal qui, composée sur `fond`, redonne `cible` (méthode des échelles alpha de Radix). */
  const alphaMinimal = (cible, fond) => {
    const s = rgb(cible).map((x) => x / 255);
    const b = rgb(fond).map((x) => x / 255);
    const a = Math.max(1e-6, ...s.map((sc, i) => (sc < b[i] ? (b[i] - sc) / b[i] : sc > b[i] ? (sc - b[i]) / (1 - b[i]) : 0)));
    return { couleur: s.map((sc, i) => Math.min(255, Math.max(0, 255 * (sc - (1 - a) * b[i]) / a))), alpha: a };
  };
  const composer = (t, fond) => hexa(rgb(fond).map((f, i) => t.couleur[i] * t.alpha + f * (1 - t.alpha)));
  const css = (t) => (typeof t === 'string' ? t : `rgba(${t.couleur.map(Math.round).join(',')},${t.alpha.toFixed(3)})`);

  const fr = (x, n = 2) => x.toFixed(n).replace('.', ',');
  const ct = (x) => `${fr(x)}:1`;
  const sens = (mode) => (D.texteDesBoutons[mode] === ({ light: 'blanc', dark: 'noir' })[mode] ? 'normal' : 'inverse');
  const TEINTES_TEMOIN = { light: { Poppy: 'red', Orange: 'amber', Grass: 'green', Sky: 'sky' }, dark: { Poppy: 'red', Orange: 'amber', Grass: 'grass', Sky: 'blue' } };
  // Les rôles de Radix en sombre : fonds 3 à 5, textes 11, plein 9 et 10, focus 8.
  const RADIX = { 'solid/default': 9, 'solid/hover': 10, 'solid/pressed': 10, 'surface/default': 3, 'surface/hover': 4, 'surface/pressed': 5, 'surface/foreground': 11, 'surface/border': 11, 'page/foreground': 11, 'page/border': 8, 'page/divider': 6, 'page/focus': 8 };

  /** La rampe d'une palette dans une variante ; `temoin` lit Tailwind en Light et Radix en Dark. */
  const rampe = (variante, palette, intensite, mode) => {
    if (variante === 'temoin' && palette !== 'Titanium') {
      if (mode === 'light') return D.temoins.tailwind[TEINTES_TEMOIN.light[palette]];
      return null;
    }
    const v = D.variantes[variante === 'temoin' ? 'actuel' : variante].palettes[palette];
    return (v[intensite] || v.soft)[mode];
  };
  const cran = (variante, palette, intensite, mode, numero) => rampe(variante, palette, intensite, mode)[D.crans.indexOf(numero)];

  /**
   * Les couleurs des rôles d'une palette dans un contexte. `crans` : `table` (la table du thème),
   * `essai` (fond 50, texte 700 en Light), `translucide` (fonds alpha), `dark200` (surfaces Dark 200/300/400, texte 950, focus 800), `dark300` (surfaces Dark 300/400/500, pour une carte au neutre 200), `dark900` (surfaces Dark 200/300/400, texte 900, focus 800), `modele` (dark900, et surfaces Light 50/100/200), `modele950` (le modèle avec un texte Dark 950).
   */
  const jeu = ({ variante, palette, intensite, mode, support = 'raised', crans = 'table' }) => {
    const fond = D.supports[mode][support];
    const blanc = D.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000';
    if (variante === 'temoin' && mode === 'dark' && palette !== 'Titanium') {
      const echelle = D.temoins.radix[`${TEINTES_TEMOIN.dark[palette]}Dark`];
      const echelleA = D.temoins.radix[`${TEINTES_TEMOIN.dark[palette]}DarkA`];
      const r = (v) => echelle[RADIX[v] - 1];
      const fondA = (n) => { const h = echelleA[n - 1]; return { couleur: rgb(h.slice(0, 7)), alpha: parseInt(h.slice(7, 9), 16) / 255 }; };
      const fonds = crans === 'translucide' ? { default: fondA(3), hover: fondA(4), pressed: fondA(5) } : { default: r('surface/default'), hover: r('surface/hover'), pressed: r('surface/pressed') };
      return {
        fond, solid: { default: r('solid/default'), hover: r('solid/hover'), pressed: r('solid/pressed'), foreground: '#FFFFFF' },
        surface: { ...fonds, foreground: r('surface/foreground'), border: r('surface/border') },
        page: { foreground: r('page/foreground'), border: r('page/border'), divider: r('page/divider'), focus: r('page/focus') },
      };
    }
    const table = { ...D.table[sens(mode)] };
    if (crans === 'essai' && mode === 'light') Object.assign(table, { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200, 'surface/foreground': 700, 'surface/border': 700 });
    if (crans === 'dark200' && mode === 'dark') Object.assign(table, { 'surface/default': 200, 'surface/hover': 300, 'surface/pressed': 400, 'surface/foreground': 950, 'surface/border': 950, 'page/focus': 800 });
    // Le modèle des niveaux : le fond teinté un cran au-delà de la carte, 50 sur la carte blanche, 200 sur le neutre 100.
    const modele = crans === 'modele' || crans === 'modele950';
    if (modele && mode === 'light') Object.assign(table, { 'surface/default': 50, 'surface/hover': 100, 'surface/pressed': 200 });
    if ((crans === 'dark900' || modele) && mode === 'dark') Object.assign(table, { 'surface/default': 200, 'surface/hover': 300, 'surface/pressed': 400, 'surface/foreground': 900, 'surface/border': 900, 'page/focus': 800 });
    if (crans === 'modele950' && mode === 'dark') Object.assign(table, { 'surface/foreground': 950, 'surface/border': 950 });
    if (crans === 'dark300' && mode === 'dark') Object.assign(table, { 'surface/default': 300, 'surface/hover': 400, 'surface/pressed': 500, 'surface/foreground': 950, 'surface/border': 950, 'page/focus': 800 });
    const c = (v) => (table[v] === 'texteDesBoutons' ? blanc : cran(variante, palette, intensite, mode, table[v]));
    let fonds = { default: c('surface/default'), hover: c('surface/hover'), pressed: c('surface/pressed') };
    if (crans === 'translucide') {
      // Calculée contre le support le plus éloigné du texte : la carte blanche en Light, la page en Dark.
      const reference = mode === 'light' ? D.supports.light.raised : D.supports.dark.page;
      const numeros = mode === 'light' ? [50, 100, 200] : [100, 200, 300];
      const [d, h, p] = numeros.map((n) => alphaMinimal(cran(variante, palette, intensite, mode, n), reference));
      fonds = { default: d, hover: h, pressed: p };
    }
    return {
      fond,
      solid: { default: c('solid/default'), hover: c('solid/hover'), pressed: c('solid/pressed'), foreground: c('solid/foreground') },
      surface: { ...fonds, foreground: c('surface/foreground'), border: c('surface/border') },
      page: { foreground: c('page/foreground'), border: c('page/border'), divider: c('page/divider'), focus: c('page/focus') },
    };
  };
  /** La couleur opaque qu'un fond, translucide ou non, rend sur son support. */
  const rendu = (t, fond) => (typeof t === 'string' ? t : composer(t, fond));

  return { D, rgb, hexa, contraste, oklch, deltaE, alphaMinimal, composer, css, rendu, fr, ct, sens, rampe, cran, jeu };
})();
