/**
 * Material UI 9.5.0 : Chip, Alert (standard, filled) et Button (text,
 * contained), avec la palette par défaut de `createPalette` et les rampes de
 * `colors/*`. Les composants calculent leurs couleurs (`lighten`, `darken`,
 * `alpha` de `@mui/system`) à partir de `light`, `main` et `dark` : ces
 * valeurs sont calculées ici par les mêmes formules, relues dans
 * `colorManipulator.mjs`, et marquées comme calculées.
 * Le thème par défaut n'a pas de mode « sombre » automatique : les lignes
 * sombres sont celles de `createPalette({ mode: 'dark' })`.
 */
import { texte, fichier, ligneDe, valeur, lire, versHex, supportDe, evaluer } from './lib.mjs';

const VERSION = '@mui/material@9.5.0 + @mui/system@9.5.0';
const PALETTE = texte('muiPalette');
const MANIP = texte('muiColorManipulator');

// Contrôle des formules reprises de colorManipulator
if (!/color\.values\[i\] \*= 1 - coefficient;/.test(MANIP)) throw new Error('MUI : darken a changé');
if (!/color\.values\[i\] \+= \(255 - color\.values\[i\]\) \* coefficient;/.test(MANIP)) throw new Error('MUI : lighten a changé');
if (!/i < 3 \? parseInt\(n, 10\) : n/.test(MANIP)) throw new Error('MUI : recomposeColor a changé');
if (!/Number\(\(0\.2126 \* rgb\[0\] \+ 0\.7152 \* rgb\[1\] \+ 0\.0722 \* rgb\[2\]\)\.toFixed\(3\)\)/.test(MANIP)) throw new Error('MUI : getLuminance a changé');
if (!/contrastThreshold = 3/.test(PALETTE)) throw new Error('MUI : seuil de contraste par défaut a changé');

const parseTable = (id) => {
  const t = texte(id);
  const o = {};
  for (const m of t.matchAll(/^\s{2}(\d+):\s*'(#[0-9a-f]{6})'/gm)) o[m[1]] = { hex: m[2], ligne: ligneDe(t, new RegExp(`^\\s{2}${m[1]}:`, 'm')) };
  return o;
};
const RAMPES = { red: parseTable('muiRed'), orange: parseTable('muiOrange'), lightBlue: parseTable('muiLightBlue'), green: parseTable('muiGreen'), blue: parseTable('muiBlue') };
const COULEURS = { danger: ['error', 'red', 'Error'], warning: ['warning', 'orange', 'Warning'], info: ['info', 'lightBlue', 'Info'], success: ['success', 'green', 'Success'] };

/** main, light, dark par mode, lus dans `getDefault<X>`. */
function intention(nom, mode) {
  const cap = nom[0].toUpperCase() + nom.slice(1);
  const f = PALETTE.match(new RegExp(`function getDefault${cap}\\(mode = 'light'\\) \\{([\\s\\S]*?)\\n\\}`));
  if (!f) throw new Error(`MUI : getDefault${cap} absent`);
  const corps = f[1];
  const bloc = mode === 'dark' ? corps.slice(corps.indexOf("if (mode === 'dark')"), corps.indexOf('    };')) : corps.slice(corps.indexOf('return {', corps.indexOf('    };')));
  const res = {};
  for (const k of ['main', 'light', 'dark']) {
    const m = bloc.match(new RegExp(`${k}:\\s*(?:_(\\w+)\\.default\\[(\\d+)\\]|'(#[0-9a-f]{6})')`));
    if (!m) throw new Error(`MUI : ${nom} ${mode} ${k} absent`);
    if (m[3]) res[k] = { hex: m[3], pas: `littéral`, ligne: ligneDe(PALETTE, m[3]) };
    else {
      const rampe = RAMPES[m[1]];
      if (!rampe?.[m[2]]) throw new Error(`MUI : rampe ${m[1]} ${m[2]} absente`);
      res[k] = { hex: rampe[m[2]].hex, pas: `${m[1]}[${m[2]}]`, ligneRampe: rampe[m[2]].ligne };
    }
  }
  return res;
}

const decomposer = (hex) => lire(hex).rgb;
const rgbVersHex = (rgb) => versHex(rgb.map((x) => parseInt(String(x), 10)));
const darken = (hex, k) => rgbVersHex(decomposer(hex).map((v) => v * (1 - k)));
const lighten = (hex, k) => rgbVersHex(decomposer(hex).map((v) => v + (255 - v) * k));
const luminanceMui = (hex) => {
  const rgb = decomposer(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return Number((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]).toFixed(3));
};
const ratioMui = (a, b) => (Math.max(luminanceMui(a), luminanceMui(b)) + 0.05) / (Math.min(luminanceMui(a), luminanceMui(b)) + 0.05);
const contrastText = (fond) => (ratioMui(fond, '#ffffff') >= 3 ? '#ffffff' : 'rgba(0, 0, 0, 0.87)');

/** Valeur lue dans createPalette (littéral). */
function litteral(token, publie, composant) {
  return valeur({ token, publie, id: 'muiPalette', ligne: ligneDe(PALETTE, publie), aussi: composant ? { composant } : undefined });
}
/** Valeur d'une rampe de couleur. */
function rampe(token, intent, composant) {
  return valeur({ token, publie: intent.hex, id: 'muiPalette', pas: intent.pas, via: { rampe: intent.pas }, aussi: composant ? { composant } : undefined });
}
/** Valeur calculée par une formule de colorManipulator. */
function calcule(token, hex, formule, composant) {
  return { token, valeurPubliee: formule, hex, calcule: `${formule} (formules de colorManipulator.mjs)`, source: { fichier: fichier('muiColorManipulator') }, composant };
}

function modeInfo(theme) {
  const m = theme === 'clair' ? 'light' : 'dark';
  const bloc = PALETTE.slice(PALETTE.indexOf(m === 'light' ? 'function getLight()' : 'function getDark()'), PALETTE.indexOf(m === 'light' ? 'const light =' : 'const dark ='));
  const lire1 = (re) => bloc.match(re)?.[1];
  const textePrimaire = lire1(/primary:\s*([^,\n]+),/).includes('common') ? '#fff' : lire1(/primary:\s*'([^']+)'/);
  return {
    mode: m,
    textePrimaire,
    selected: lire1(/selected:\s*'([^']+)'/),
    selectedOpacity: +lire1(/selectedOpacity:\s*([\d.]+)/),
    hoverOpacity: +lire1(/hoverOpacity:\s*([\d.]+)/),
    paper: lire1(/paper:\s*([^,\n]+)/).includes('common') ? '#ffffff' : lire1(/paper:\s*'([^']+)'/),
    defaut: lire1(/default:\s*([^,\n]+)/).includes('common') ? '#ffffff' : lire1(/default:\s*'([^']+)'/),
  };
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Material UI', version: VERSION };

  // Contrôles des composants
  const chip = texte('muiChip');
  const alerte = texte('muiAlert');
  const bouton = texte('muiButton');
  if (!/backgroundColor: \(theme\.vars \|\| theme\)\.palette\.action\.selected/.test(chip)) throw new Error('MUI : fond du Chip a changé');
  if (!/backgroundColor: \(theme\.vars \|\| theme\)\.palette\[color\]\.main,\s*color: \(theme\.vars \|\| theme\)\.palette\[color\]\.contrastText/.test(chip)) throw new Error('MUI : Chip coloré a changé');
  if (!/selectedOpacity} \+ \$\{\(theme\.vars \|\| theme\)\.palette\.action\.hoverOpacity/.test(chip)) throw new Error('MUI : survol du Chip a changé');
  if (!/'&:hover': \{\s*backgroundColor: \(theme\.vars \|\| theme\)\.palette\[color\]\.dark/.test(chip)) throw new Error('MUI : survol du Chip coloré a changé');
  if (!/getColor\(theme\.palette\[color\]\.light, 0\.6\)/.test(alerte) || !/getBackgroundColor\(theme\.palette\[color\]\.light, 0\.9\)/.test(alerte)) throw new Error('MUI : Alert standard a changé');
  if (!/theme\.palette\.mode === 'dark' \? theme\.palette\[color\]\.dark : theme\.palette\[color\]\.main/.test(alerte)) throw new Error('MUI : Alert filled a changé');
  if (!/'--variant-containedBg': \(theme\.vars \|\| theme\)\.palette\[color\]\.dark/.test(bouton)) throw new Error('MUI : survol du Button contained a changé');
  if (!/'--variant-textBg': theme\.alpha\(\(theme\.vars \|\| theme\)\.palette\[color\]\.main, \(theme\.vars \|\| theme\)\.palette\.action\.hoverOpacity\)/.test(bouton)) throw new Error('MUI : survol du Button text a changé');

  const lCh = (motif) => ({ fichier: fichier('muiChip'), ligne: ligneDe(chip, motif) });
  const lAl = (motif) => ({ fichier: fichier('muiAlert'), ligne: ligneDe(alerte, motif) });
  const lBt = (motif) => ({ fichier: fichier('muiButton'), ligne: ligneDe(bouton, motif) });

  for (const theme of ['clair', 'sombre']) {
    const mi = modeInfo(theme);
    const page = { token: 'palette.background.default', hex: mi.defaut };
    const carte = { token: 'palette.background.paper', hex: mi.paper };
    const sup = { page, carte, source: fichier('muiPalette') };

    // Chip neutre (fond translucide `action.selected`)
    {
      const c = lCh('backgroundColor: (theme.vars || theme).palette.action.selected');
      const alphaSel = lire(mi.selected);
      const survolAlpha = Math.round((mi.selectedOpacity + mi.hoverOpacity) * 1000) / 1000;
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Chip', variante: 'filled (défaut)', ton: 'neutre', theme,
        fond: litteral('palette.action.selected', mi.selected, c),
        texte: litteral('palette.text.primary', mi.textePrimaire === '#fff' ? '#ffffff' : mi.textePrimaire, c),
        contour: null,
        survol: { fond: litteral('alpha(action.selected, selectedOpacity + hoverOpacity)', `rgba(${alphaSel.rgb.join(', ')}, ${survolAlpha})`, lCh('selectedOpacity} +')), note: 'seulement si le Chip est cliquable (`onClick`)' },
        notes: ['Pas de variante teintée par un ton : le Chip sans couleur est un gris translucide.'],
      }, sup));
    }

    for (const [ton, [nom]] of Object.entries(COULEURS)) {
      const it = intention(nom, mi.mode);

      // Chip coloré (plein)
      {
        const c = lCh('backgroundColor: (theme.vars || theme).palette[color].main');
        const txt = contrastText(it.main.hex);
        out.push(evaluer({
          ...base, type: 'badge-plein', composant: 'Chip', variante: `filled color=${nom}`, ton, theme,
          fond: rampe(`palette.${nom}.main`, it.main, c),
          texte: txt === '#ffffff' ? calcule(`palette.${nom}.contrastText`, '#ffffff', `getContrastText(${it.main.hex}) : blanc, rapport ${ratioMui(it.main.hex, '#ffffff').toFixed(2)} (seuil 3)`, c) : calcule(`palette.${nom}.contrastText`, '#000000', 'getContrastText : noir à 87 %', c),
          contour: null,
          survol: { fond: rampe(`palette.${nom}.dark`, it.dark, lCh("'&:hover': {\n          backgroundColor: (theme.vars || theme).palette[color].dark")), note: 'seulement si le Chip est cliquable' },
          notes: ['Pas de changement d\'état à l\'appui : le Chip n\'ajoute qu\'une ombre.'],
        }, sup));
      }

      // Alert standard : fond = lighten(light, 0.9), texte = darken(light, 0.6) (inverse en sombre)
      {
        const c = lAl('getColor(theme.palette[color].light, 0.6)');
        const l = it.light.hex;
        const fondHex = mi.mode === 'light' ? lighten(l, 0.9) : darken(l, 0.9);
        const texteHex = mi.mode === 'light' ? darken(l, 0.6) : lighten(l, 0.6);
        const fn = mi.mode === 'light' ? ['lighten', 'darken'] : ['darken', 'lighten'];
        out.push(evaluer({
          ...base, type: 'alerte', composant: 'Alert', variante: 'standard', ton, theme,
          fond: { ...calcule(`${fn[0]}(palette.${nom}.light, 0.9)`, fondHex, `${fn[0]}(${l}, 0.9)`, c), pas: `light + 90 %` },
          texte: { ...calcule(`${fn[1]}(palette.${nom}.light, 0.6)`, texteHex, `${fn[1]}(${l}, 0.6)`, c), pas: `light ${mi.mode === 'light' ? '- 60 %' : '+ 60 %'}` },
          contour: null,
          icone: rampe(`palette.${nom}.main`, it.main, c),
          notes: [`Le fond et le texte dérivent de \`palette.${nom}.light\` (${it.light.pas}). L'icône prend \`main\`. Pas de contour.`],
        }, sup));
      }

      // Alert filled
      {
        const c = lAl('theme.palette.mode === \'dark\' ? theme.palette[color].dark');
        const src = mi.mode === 'dark' ? it.dark : it.main;
        const txt = contrastText(it.main.hex);
        out.push(evaluer({
          ...base, type: 'alerte', composant: 'Alert', variante: 'filled', ton, theme,
          fond: rampe(`palette.${nom}.${mi.mode === 'dark' ? 'dark' : 'main'}`, src, c),
          texte: txt === '#ffffff' ? calcule(`getContrastText(palette.${nom}.main)`, '#ffffff', `getContrastText(${it.main.hex}) : blanc`, c) : calcule(`getContrastText(palette.${nom}.main)`, '#000000', 'getContrastText : noir', c),
          contour: null,
          notes: [mi.mode === 'dark' ? 'En mode sombre, le fond prend `dark` ; le texte est calculé sur `main`.' : 'Aplat `main` ; texte calculé par `getContrastText`.'],
        }, sup));
      }

      // Button text (survol teinté) et contained
      {
        const c = lBt("'--variant-textColor': (theme.vars || theme).palette[color].main");
        out.push(evaluer({
          ...base, type: 'bouton-teinte', composant: 'Button', variante: 'text (color)', ton, theme,
          fond: valeur({ token: 'background (text)', publie: 'transparent', id: 'muiButton', aussi: { composant: c } }),
          texte: rampe(`palette.${nom}.main`, it.main, c),
          contour: null,
          survol: { fond: valeur({ token: `alpha(palette.${nom}.main, hoverOpacity)`, publie: `rgba(${lire(it.main.hex).rgb.join(', ')}, ${mi.hoverOpacity})`, id: 'muiButton', pas: `main ${Math.round(mi.hoverOpacity * 100)} %`, aussi: { composant: c } }) },
          appui: { note: 'aucun changement de couleur à l\'appui ; l\'effet est l\'ondulation (TouchRipple), non relevée' },
          notes: ['Seul le survol teinte le fond (opacité `hoverOpacity` de la couleur `main`).'],
        }, sup));
        const cc = lBt("'--variant-containedBg': (theme.vars || theme).palette[color].dark");
        const txt = contrastText(it.main.hex);
        out.push(evaluer({
          ...base, type: 'bouton-plein', composant: 'Button', variante: 'contained (color)', ton, theme,
          fond: rampe(`palette.${nom}.main`, it.main, cc),
          texte: txt === '#ffffff' ? calcule(`palette.${nom}.contrastText`, '#ffffff', 'getContrastText : blanc', cc) : calcule(`palette.${nom}.contrastText`, '#000000', 'getContrastText : noir', cc),
          contour: null,
          survol: { fond: rampe(`palette.${nom}.dark`, it.dark, cc) },
          appui: { note: 'aucun changement de couleur à l\'appui ; seule l\'ombre change (`boxShadow`)' },
        }, sup));
      }
    }
  }
  return out;
}
