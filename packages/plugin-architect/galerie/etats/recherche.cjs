/**
 * Les états de la recherche dans l'arbre : le texte tapé, puis les trois liens qui l'écrivent (une question, la feuille d'un terme, la fiche
 * d'une variable). Les cadres `t-questions` et `t-terme` jouent la suite de Nomenclature qui précède le lien ; elle suit l'ordre de `t-renommages` :
 * le relevé et le choix de Interface d'abord, donc le filtre de l'arbre déjà posé quand le bilan arrive et demande les noms de chaque groupe
 * (demandes 2 à 5).
 */
const { preferences, libre, releve, groupe, chevron } = require('./aide.cjs');
const { structureAFaire } = require('../structure/donnees.cjs');
const { releveQuestions, releveTerme, bilanDesQuestions, pagesDuTerme, fiches, messages } = require('../recherche/donnees.cjs');

/** Le relevé, le choix de Interface, puis le bilan et les pages de noms. */
const ouverture = (donnees, bilan, pages) => [
  preferences(), releve(donnees), { message: structureAFaire(1) }, groupe('interface'), chevron('interface'),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilan), attendre: '.liste' },
  ...pages.map((message) => ({ message })),
];
const demandes = { fonds: 2, survols: 3, ecriture: 4, collection: 5, suiteEcriture: 7 };
const lireLesTermes = [6, 7, 8].map((demande) => ({ message: messages.termes(demande) }));
const lireLaFiche = [7, 8, 9].map((demande) => ({ message: messages.fiche(demande, fiches.ucm) }));

const ETATS = [
  { id: 'recherche-globale', titre: 'Recherche dans toutes les collections', quand: 'Le designer cherche « surface ».', regarder: 'L’arbre ne liste que les collections qui ont un résultat, chacune avec son nombre ; le tableau s’intitule Recherche et compte ses variables.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'surface' } }] },
  { id: 'recherche-vide', titre: 'Recherche sans résultat', quand: 'Aucune variable ne correspond.', regarder: 'Le message propose de vider la recherche.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'introuvable-xyz' } }] },
  {
    id: 't-questions', titre: 'Tokens, Questions et recherche', quand: 'Le designer ouvre les questions et suit « Voir les 2 variables », sous la question qui corrige backgrond.',
    regarder: 'La recherche backgrond dans le champ de l’arbre, à bordure bleue ; l’arbre ne liste que Interface avec 2 ; le tableau montre Drawer/backgrond/default et Modal/backgrond/default, le terme en rose ; aucune puce de filtre sous les onglets.',
    existe: true,
    atteinte: [...ouverture(releveQuestions(), bilanDesQuestions, pagesDuTerme(demandes)), { clic: '#onglet-a-trancher' }, { clic: '.question-proposition .btn-texte' }],
  },
  {
    id: 't-terme', titre: 'Tokens, terme filtré depuis Règles', quand: 'Le designer ouvre la feuille de background dans Règles et appuie sur Filtrer le tableau des tokens.',
    regarder: 'La recherche terme:background dans le champ de l’arbre ; la note du tableau énumère background, bg, back ; la feuille du terme reste ouverte sur la barre latérale, le tableau reste visible ; les noms que Corrections renomme gardent leur terme nouveau en vert.',
    existe: true,
    atteinte: [...ouverture(releveTerme(), bilanDesQuestions, pagesDuTerme(demandes)), { clic: '#onglet-regles' }, ...lireLesTermes, { clic: '.ligne-terme[aria-label^="background,"]', attendre: '.feuille' }, ...lireLaFiche, { clic: '.filtre-ligne .btn' }],
  },
];

module.exports = { ETATS, ouverture, demandes, lireLaFiche };
