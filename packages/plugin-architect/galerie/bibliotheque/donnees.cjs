/**
 * Les données de l'état de la Library : le fichier Intencial Tokens vu depuis le fichier des composants, que le sandbox lit par noms
 * (`bibliotheque`) puis par valeurs (`valeurs`). Les noms et les valeurs sont ceux du fichier de `structure/donnees.cjs`, rangés sous des
 * clés de library (`k<rang>`) ; un alias porte l'identifiant que Figma donne à une variable de library, `VariableID:<clé>/1:1`.
 */
const { releveDeStructure } = require('../structure/donnees.cjs');
const { bilans, messages } = require('../nomenclature/donnees.cjs');

const fichier = releveDeStructure();
const cles = new Map(fichier.variables.map((variable, rang) => [variable.id, `k${rang}`]));
const parNom = new Map(fichier.variables.map((variable) => [`${variable.collection}/${variable.nom}`, variable]));
const idDeLibrary = (id) => `VariableID:${cles.get(id)}/1:1`;

const collections = fichier.collections.map((collection) => ({
  nom: collection.nom,
  cle: collection.id,
  variables: collection.variables.map((id) => {
    const variable = fichier.variables.find((candidate) => candidate.id === id);
    return { nom: variable.nom, cle: cles.get(id), type: variable.type };
  }),
}));

/** Une variable telle que l'import la rend : son identifiant de library, ses alias vers des identifiants de library. */
const importee = (id) => {
  const variable = fichier.variables.find((candidate) => candidate.id === id);
  const valeurs = Object.fromEntries(Object.entries(variable.valeurs).map(([mode, valeur]) => [mode, valeur.nature === 'alias' ? { ...valeur, cible: idDeLibrary(valeur.cible) } : valeur]));
  return { ...variable, id: idDeLibrary(id), cle: cles.get(id), distante: true, valeurs };
};

/** Les identifiants des `n` premières variables de `primary` dans `theme`, dans l'ordre du tableau. */
const idsDePrimary = (n) => [...parNom.entries()].filter(([nom]) => nom.startsWith('theme/primary/')).slice(0, n).map(([, variable]) => variable.id);

const reponse = (demande, ids) => ({ type: 'valeurs', demande, valeurs: Object.fromEntries(ids.map((id) => [cles.get(id), importee(id)])) });

const library = {
  /** La réponse aux noms : la library et ses cinq collections, avec la clé du fichier des tokens quand Figma la sert. */
  noms: (demande, cleDuFichierDesTokens = 'TOKENS123') => ({ type: 'bibliotheque', demande, library: { nom: 'Intencial Tokens', cle: 'Intencial Tokens' }, collections, cleDuFichierDesTokens }),
  /** Les valeurs de `n` variables de `theme/primary`. */
  valeursDePrimary: (demande, n) => reponse(demande, idsDePrimary(n)),
  /** Les valeurs des cibles de ces `n` variables : les crans de `brands` et le blanc de `primitives`. */
  valeursDesCibles: (demande, n) => reponse(demande, [...new Set(idsDePrimary(n).flatMap((id) => {
    const valeur = fichier.variables.find((variable) => variable.id === id).valeurs['theme:light'];
    return valeur.nature === 'alias' ? [valeur.cible] : [];
  }))]),
  /** Une réponse sans valeur : une collection que la galerie ne regarde pas. */
  sansValeur: (demande) => ({ type: 'valeurs', demande, valeurs: {} }),
};

/** Un fichier sans variable locale, que la lecture du relevé rend vide. */
const releveVide = () => ({ ...fichier, collections: [], variables: [], fichier: 'Intencial Composants' });

module.exports = { library, releveVide, bilans, messages };
