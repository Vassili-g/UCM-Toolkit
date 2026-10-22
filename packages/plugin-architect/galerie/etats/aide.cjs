/**
 * Ce que les états de la galerie se partagent : les fixtures compilées à la
 * volée, les relevés, et les gestes qui reviennent d'un domaine à l'autre. Les
 * relevés viennent de `tests/fixtures.ts` : ce sont des jeux artificiels,
 * jamais la capture d'un fichier Figma réel.
 *
 * L'interface demande le relevé dès son chargement, sous la demande 1.
 */
const path = require('path');

function compiler(entree, nom) {
  const compile = path.resolve(__dirname, `../../dist/${nom}.cjs`);
  require('esbuild').buildSync({ entryPoints: [entree], outfile: compile, bundle: true, format: 'cjs', platform: 'node' });
  return require(compile);
}
const { projetLibre, cinqCollections, grandReleve, constructeur, alias, nombre, couleur, composantSimple, composantComplexe, composantBouton, composantInterrompu, composantSansToken, peinturesDe } = compiler(path.resolve(__dirname, '../../tests/fixtures.ts'), 'galerie-fixtures');
const { imagePng } = require('../image.cjs');

const releve = (donnees, demande = 1) => ({ message: { type: 'releve', demande, releve: donnees } });
const libre = releve(projetLibre());
function releveP3() {
  const c = constructeur('Couleur Display P3');
  c.collection('couleurs', 'Couleurs', ['Valeur']);
  c.variable('corail', 'couleurs', 'corail', 'COLOR', { Valeur: { nature: 'couleur', couleur: { r: 0.8, g: 0.3, b: 0.3, a: 1 } } });
  return { ...c.releve(), espace: 'display-p3' };
}
const displayP3 = releve(releveP3());
const multimarque = releve(cinqCollections());
const preferences = (valeurs = {}) => ({ message: { type: 'preferences', preferences: { vueCompacte: false, largeurs: {}, ...valeurs } } });
const inspecter = (id) => ({ clic: `[data-focus="nom:${id}"]` });
const groupe = (collection, ...segments) => ({ clic: `[data-focus='choix:${JSON.stringify([collection, ...segments])}']` });
const chevron = (collection, ...segments) => ({ clic: `[data-focus='chevron:${JSON.stringify([collection, ...segments])}']` });

/** Un relevé à groupes profonds, sur huit niveaux, avec un nom long et un segment vide. */
function releveProfond() {
  const c = constructeur('Arbre profond');
  c.collection('profond', 'Composants du produit avec un nom de collection particulièrement long', ['Valeur']);
  const nom = 'navigation/barre latérale/section/groupe/élément/état/survol/fond';
  c.variable('profonde', 'profond', nom, 'COLOR', { Valeur: couleur('#336699') });
  c.variable('voisine', 'profond', 'navigation/barre latérale/section/groupe/élément/état/repos/fond', 'COLOR', { Valeur: alias('profonde') });
  c.variable('vide', 'profond', 'navigation//sans-nom', 'FLOAT', { Valeur: nombre(4) });
  return c.releve();
}

/** Une chaîne d'alias de trente variables, pour la chaîne longue. */
function releveLong() {
  const c = constructeur('Chaîne longue');
  c.collection('long', 'Alias', ['Valeur']);
  for (let rang = 0; rang < 30; rang += 1) c.variable(`v${rang}`, 'long', `niveau-${String(rang).padStart(2, '0')}`, 'COLOR', { Valeur: rang === 29 ? couleur('#7A3E9D') : alias(`v${rang + 1}`) });
  return c.releve();
}

/*
 * La vue composant. Le sandbox annonce la disposition, puis la sélection ;
 * l'interface demande alors le composant, sous la demande 2, la demande 1
 * étant celle du relevé. Un composant imbriqué ouvert prend la demande 3.
 */
const alert = composantSimple();
const stressTest = composantComplexe();
const bouton = composantBouton();
const tag = composantInterrompu();
const avatar = composantSansToken();
const etroite = { message: { type: 'disposition', disposition: 'etroite' } };
const choisir = (lecture, portee = lecture.sujet.id, ignores = 0) => ({ message: { type: 'selection', sujet: { id: lecture.sujet.id, portee }, ignores, origine: 'figma' } });
const sansSelection = { message: { type: 'selection', sujet: null, ignores: 0, origine: 'figma' } };
const bascule = (disposition) => ({ clic: `.bascule-choix[data-mode="${disposition}"]` });
const composant = (lecture, demande = 2) => ({ message: { type: 'composant', demande, lecture } });

/** L'image d'un composant de test : chaque calque peint sa boîte. Les octets voyagent en tableau, que le JSON du pilote garde. */
function apercu(lecture, demande = 2) {
  const { largeur, hauteur } = lecture.calques[0].boite;
  return { message: { type: 'apercu-du-composant', demande, sujet: lecture.sujet.id, octets: [...imagePng(largeur, hauteur, peinturesDe(lecture))], largeur, hauteur, origine: { x: 0, y: 0 } } };
}

const ouvrir = (lecture) => [preferences(), etroite, choisir(lecture), composant(lecture), apercu(lecture)];
const ligne = (debut) => ({ clic: `[data-focus^='ligne:${debut}']` });
const calqueNomme = (lecture, nom) => lecture.calques.find((calque) => calque.nom === nom).id;

/** Alert dont Figma rend, pour le fond, une autre couleur que la chaîne. */
const alertAvecEcart = { ...alert, liaisons: alert.liaisons.map((liaison) => (liaison.variable.endsWith('/background') ? { ...liaison, valeurDeFigma: couleur('#E0F2FE') } : liaison)) };
/** Alert lu depuis un jeu de trois variants. */
const alertAVariants = { ...alert, sujet: { ...alert.sujet, type: 'COMPONENT_SET', variants: [{ id: alert.calques[0].id, nom: 'info · standard' }, { id: 'alert:erreur', nom: 'error · standard' }, { id: 'alert:succes', nom: 'success · standard' }] } };

module.exports = { compiler, projetLibre, cinqCollections, grandReleve, constructeur, alias, nombre, couleur, composantSimple, composantComplexe, composantBouton, composantInterrompu, composantSansToken, peinturesDe, imagePng, releve, libre, displayP3, multimarque, preferences, inspecter, groupe, chevron, releveProfond, releveLong, alert, stressTest, bouton, tag, avatar, etroite, choisir, sansSelection, bascule, composant, apercu, ouvrir, ligne, calqueNomme, alertAvecEcart, alertAVariants };
