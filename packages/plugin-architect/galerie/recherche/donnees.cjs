/**
 * Les fichiers des cadres `t-questions`, `t-terme` et `t-fiche` : le fichier Intencial de `t-renommages` (`releveIntencial`), aux noms
 * près. Chaque fabrique copie le relevé et change ce que son cadre montre.
 */
const { releveIntencial } = require('../etats/nomenclature.cjs');
const { bilans, fiches, messages, pagesInterface } = require('../nomenclature/donnees.cjs');
const { alias, couleur } = require('../etats/aide.cjs');

const copie = (valeur) => JSON.parse(JSON.stringify(valeur));
const cibleDeTheme = (nom) => alias(`theme:${nom}`);
const parId = (releve, id) => releve.variables.find((variable) => variable.id === id);

/** Une variable de Interface : le modèle d'une variable existante, avec son identifiant, son nom et son alias. */
function variableDInterface(modele, id, nom, cible) {
  return { ...copie(modele), id, cle: `cle-${id}`, nom, type: 'COLOR', valeurs: { 'interface:Valeur': cibleDeTheme(cible) } };
}

/** Quatre couleurs du thème que le cadre `t-terme` nomme, prises sur des variables de remplissage. */
function nommerLeTheme(releve) {
  const couleurs = [['theme-9', 'info/soft/surface/default', '#E6F1FB'], ['theme-10', 'neutral/surface/default', '#F1F1F3'], ['theme-11', 'primary/surface/pressed', '#E2B0B0'], ['theme-12', 'neutral/solid/default', '#27272A']];
  for (const [id, nom, valeur] of couleurs) Object.assign(parId(releve, id), { nom, type: 'COLOR', valeurs: { 'theme:light': couleur(valeur), 'theme:dark': couleur(valeur) } });
}

/** t-questions : Drawer et Modal ont chacun un `backgrond` ; Drawer vient d'abord, comme dans la maquette. */
function releveQuestions() {
  const releve = copie(releveIntencial());
  const drawer = releve.variables.find((variable) => variable.nom === 'Drawer/borderWidth0');
  Object.assign(drawer, { nom: 'Drawer/backgrond/default', type: 'COLOR', valeurs: { 'interface:Valeur': cibleDeTheme('neutral/elevation/raised') } });
  const collection = releve.collections.find((candidate) => candidate.id === 'interface');
  collection.variables = collection.variables.filter((id) => id !== drawer.id).flatMap((id) => (id === 'i8' ? [drawer.id, id] : [id]));
  const autres = releve.variables.filter((variable) => variable.id !== drawer.id);
  const rang = autres.findIndex((variable) => variable.id === 'i8');
  releve.variables = [...autres.slice(0, rang), drawer, ...autres.slice(rang)];
  return releve;
}

/** t-terme : 55 variables de Interface emploient background, bg ou back ; les dix premières sont celles de la maquette. */
function releveTerme() {
  const releve = copie(releveIntencial());
  nommerLeTheme(releve);
  const collection = releve.collections.find((candidate) => candidate.id === 'interface');
  const modele = parId(releve, 'i1');
  const anciennes = releve.variables.filter((variable) => variable.collection === 'interface');
  releve.variables = releve.variables.filter((variable) => variable.collection !== 'interface');
  const lignes = [
    ['ta1', 'Alert/background/default', 'info/soft/surface/default'], ['ta2', 'Badge/background/default', 'neutral/surface/default'],
    ['i1', 'Button/bg/default', 'primary/solid/default'], ['i2', 'Button/bg/hovered', 'primary/solid/hover'], ['i4', 'Card/bg/default', 'primary/surface/default'],
    ['ta6', 'Chip/bg/selected', 'primary/surface/pressed'], ['ta7', 'Input/background/default', 'neutral/elevation/raised'], ['ta8', 'Menu/background/default', 'neutral/elevation/raised'],
    ['i9', 'Page/bg/default', 'neutral/elevation/page'], ['ta10', 'Toast/background/default', 'neutral/solid/default'],
  ];
  const premieres = lignes.map(([id, nom, cible]) => variableDInterface(modele, id, nom, cible));
  const gardees = new Set(lignes.map(([id]) => id));
  const reste = anciennes.filter((variable) => !gardees.has(variable.id));
  // 45 autres variables emploient background ; les onze dernières n'emploient aucun des trois termes.
  reste.forEach((variable, rang) => {
    variable.nom = rang < 45 ? `Panel/background/niveau${rang}` : `Panel/border/niveau${rang}`;
    variable.type = 'COLOR';
    variable.valeurs = { 'interface:Valeur': cibleDeTheme('neutral/elevation/raised') };
  });
  const toutes = [...premieres, ...reste];
  releve.variables.push(...toutes);
  collection.variables = toutes.map((variable) => variable.id);
  return releve;
}

/**
 * t-fiche : Card/bg/default a une description et passe par quatre collections ; trois variables la visent. Menu et Popover prennent la place de
 * deux variables de remplissage, pour que Interface garde ses 66 variables.
 */
function releveFiche() {
  const releve = copie(releveIntencial());
  Object.assign(parId(releve, 'i4'), { description: 'Le fond d’une carte, au repos.' });
  Object.assign(parId(releve, 'theme:primary/surface/default'), { valeurs: { 'theme:light': alias('brands-0'), 'theme:dark': alias('brands-0') } });
  Object.assign(parId(releve, 'brands-0'), { nom: 'primary/light/100', type: 'COLOR', valeurs: { 'brands:intencial': alias('primitives-0'), 'brands:apicil': alias('primitives-0') } });
  Object.assign(parId(releve, 'primitives-0'), { nom: 'color/terracota/light/100', type: 'COLOR', valeurs: { 'primitives:Valeur': couleur('#F6E6E6') } });
  const visent = [['Drawer/borderWidth0', 'Drawer/backgrond/default'], ['Tooltip/borderWidth6', 'Menu/bg/default'], ['Tooltip/borderWidth7', 'Popover/bg/default']];
  for (const [avant, apres] of visent) Object.assign(releve.variables.find((variable) => variable.nom === avant), { nom: apres, type: 'COLOR', valeurs: { 'interface:Valeur': alias('i4') } });
  return releve;
}

/** Les lignes que la lecture des groupes de background et de hover rend pour la recherche `terme:background`. */
const ligne = (id, ancien, nouveau, marques) => ({ id, ancien, nouveau, marques, aussi: [] });
const fondsDuTerme = [
  ligne('i1', 'Button/bg/default', 'Button/background/default', [1]), ligne('i2', 'Button/bg/hovered', 'Button/background/hover', [1]), ligne('i4', 'Card/bg/default', 'Card/background/default', [1]),
  ligne('ta6', 'Chip/bg/selected', 'Chip/background/selected', [1]), ligne('i9', 'Page/bg/default', 'Page/background/default', [1]),
];
const survolsDuTerme = [ligne('i2', 'Button/bg/hovered', 'Button/background/hover', [2])];
const pagesDuTerme = (demandes) => {
  const pages = pagesInterface(demandes);
  const page = (modele, lignes) => ({ ...modele, debut: 0, lignes, total: lignes.length });
  return [page(pages[0], fondsDuTerme), page(pages[1], survolsDuTerme), ...pages.slice(2)];
};

/** Le bilan des questions : la faute et les mots collés, une question remise à plus tard, deux autres pistes. */
const bilanDesQuestions = { ...bilans.travail, questions: bilans.travail.questions.slice(1) };

module.exports = { releveQuestions, releveTerme, releveFiche, bilanDesQuestions, pagesDuTerme, fiches, messages, bilans, pagesInterface };
