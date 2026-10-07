/*
 * Les données communes des maquettes M1 à M3 : la palette Bleu de la galerie
 * d'UCM Palettes (#1E6FD9, deux intensités), trois autres palettes Vivid pour
 * les garanties entre palettes, le fond de la page Light et la table des
 * dossiers du thème normal (S2 du plan).
 */
var CR = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
var PAGE = '#F7F7F7';
var TEXTE_DES_BOUTONS = '#FFFFFF';
var BLEU = {
  soft: ['#F4F7FA', '#E9EFF6', '#D6E1EE', '#BCCEE3', '#99B4D5', '#7498C6', '#577DB3', '#446493', '#344D77', '#24375B', '#162643'],
  vivid: ['#F1F8FE', '#E4F0FD', '#CCE2FC', '#ABD0FA', '#7EB5F7', '#4B96F4', '#1E6FD9', '#185EC1', '#10479E', '#08317B', '#041F5E'],
};
var AUTRES = {
  Vert: ['#E6FFE9', '#C9FED2', '#88FEA4', '#2CF376', '#22C55E', '#1EB254', '#179445', '#107736', '#0A5D28', '#05441C', '#033011'],
  Rouge: ['#FEF4F3', '#FCE9E8', '#FAD6D2', '#F7BBB5', '#F4928A', '#EF4444', '#D83738', '#AF2A2B', '#8A1F1F', '#671514', '#4A0C0B'],
  Orange: ['#FFF5EE', '#FEEADE', '#FED6BF', '#FDBB95', '#FD9153', '#F97316', '#C6540E', '#A34009', '#822E05', '#621E03', '#471101'],
};
var TABLE = {
  'solid/default': 700, 'solid/hover': 800, 'solid/pressed': 900,
  'surface/default': 100, 'surface/hover': 200, 'surface/pressed': 300, 'surface/foreground': 800, 'surface/border': 800,
  'page/foreground': 700, 'page/border': 700, 'page/divider': 300, 'page/focus': 600,
};
function nuance(rampe, cran) { return rampe[CR.indexOf(cran)]; }
function v(rampe, variable) { return variable === 'solid/foreground' ? TEXTE_DES_BOUTONS : nuance(rampe, TABLE[variable]); }
function lum(h) {
  var c = [1, 3, 5].map(function (i) { var x = parseInt(h.substr(i, 2), 16) / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function ecrit(x) { return x.toFixed(2).replace('.', ','); }
/* Le résultat d'une mesure, dans la forme de la carte des garanties : ✓ ou ✗, le ratio, le niveau. */
function resultat(x, texte) {
  var seuil = texte ? 4.5 : 3, ok = x >= seuil, niveau = texte ? (x >= 7 ? 'AAA' : x >= 4.5 ? 'AA' : '') : (x >= 3 ? 'AA' : '');
  return '<p class="res' + (ok ? '' : ' ko') + '">' + (ok ? '✓ ' : '✗ ') + ecrit(x) + (niveau ? ' <span class="badge">' + niveau + '</span>' : '') + '</p>';
}
