/**
 * Les états de la fiche d'une variable : une feuille sur la barre latérale, ouverte par un clic sur le nom d'une ligne du tableau. Le cadre
 * `t-fiche` joue la suite de Nomenclature de `t-renommages`, puis retire le filtre de l'arbre par la croix de sa puce, comme la maquette.
 */
const { preferences, releve, multimarque, releveLong, libre, inspecter } = require('./aide.cjs');
const { ouverture, demandes } = require('./recherche.cjs');
const { releveFiche, pagesInterface, bilanDesQuestions } = require('../recherche/donnees.cjs');

/** Un clic sur le premier segment du nom, que le renommage ne colore pas. */
const ouvrirLaFiche = (id) => ({ clic: `[data-focus="nom:${id}"] .ch-groupe:first-child` });

const ETATS = [
  {
    id: 't-fiche', titre: 'Tokens, fiche d’une variable', quand: 'Le designer choisit Card/bg/default dans le tableau des tokens.',
    regarder: 'La fiche en feuille sur la barre latérale : le nom en titre, la collection et le type, la description ; la chaîne d’alias à travers quatre collections jusqu’à #F6E6E6 ; Renommage à appliquer avec Card/background/default ; Utilisée par 3 variables ; la ligne choisie du tableau d’un fond uniforme.',
    existe: true,
    atteinte: [...ouverture(releveFiche(), bilanDesQuestions, pagesInterface(demandes)), { clic: '.puce-x' }, ouvrirLaFiche('i4')],
  },
  {
    id: 'chaine-cinq-collections', titre: 'Chaîne à travers cinq collections', quand: 'Le fond du bouton est inspecté, thème par défaut Dark.',
    regarder: 'Une étape par collection, le mode de chaque collection à plusieurs modes, puis la valeur terminale.',
    existe: true, atteinte: [preferences(), multimarque, inspecter('bouton-fond')],
  },
  {
    id: 'chaine-longue', titre: 'Chaîne longue', quand: 'Trente alias successifs.',
    regarder: 'Les trente étapes se suivent dans la feuille, qui défile ; le titre reste visible.',
    existe: true, atteinte: [preferences(), releve(releveLong()), inspecter('v0')],
  },
  {
    id: 'cycle', titre: 'Cycle', quand: 'essai/a et essai/b se visent.',
    regarder: 'La chaîne s’arrête sur le nom du constat, Cycle, et la phrase dit la boucle.',
    existe: true, atteinte: [preferences(), libre, inspecter('essai-a')],
  },
  {
    id: 'cible-distante', titre: 'Cible distante inaccessible', quand: 'legacy/border vise une variable non lue.',
    regarder: 'La chaîne s’arrête sur Cible inaccessible, et la phrase dit que sa suppression n’est pas établie.',
    existe: true, atteinte: [preferences(), libre, inspecter('legacy')],
  },
];

module.exports = { ETATS };
