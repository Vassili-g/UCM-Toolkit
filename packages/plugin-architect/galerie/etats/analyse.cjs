/**
 * Les états de l'analyse dans le panneau des constats : avant, pendant et après la lecture, et chaque raison pour laquelle le
 * panneau n'a pas de liste à montrer. Les données d'Alert viennent de `corrections.cjs`.
 */
const { alertEnJeu, analyseAlert, IDENTITE } = require('../composant/donnees.cjs');
const { preferences, etroite, choisir, sansSelection, composant, apercu } = require('./aide.cjs');
const { alertCorrections, constatsAlert, panneauOuvert, perime } = require('./corrections.cjs');

const variants = analyseAlert.variants;
const lu = (statut, constats, lecture = null, lus = variants) => ({ message: { type: 'analyse', analyse: IDENTITE, statut, constats, lecture, variants: lus } });
const OUVRIR = { clic: '.bouton-panneau' };
const alertLu = [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu)];
const alertAnalyse = [preferences(), etroite, choisir(alertCorrections), composant(alertCorrections), apercu(alertCorrections)];

/**
 * Les 19 constats de base : 3 gardent une correction qui ne change aucune ligne de la vue, 2 gardent leur question, les 14 autres sont
 * à faire dans Figma.
 */
const GARDEES = new Set(['cor:texte:info', 'cor:padding-x']);
const QUESTIONS = new Set(['C16:12', 'C16:6']);
const constatsPartiels = constatsAlert
  .filter((constat) => Number(constat.id.split(':')[1]) <= 18)
  .map(({ correction, question, ...reste }) => {
    const lier = reste.id === 'C16:3' ? { correction: { id: 'cor:lier', sorte: 'liaison', cible: { layer: 'alert:1', champ: 'fills' }, avant: null, apres: { nom: 'alert/colors/info/filled/icon' }, aRelire: { regle: 'Un variant filled emploie le dossier filled.', avant: null } } } : {};
    return { ...reste, ...(correction && GARDEES.has(correction.id) ? { correction } : {}), ...lier, ...(question && QUESTIONS.has(reste.id) ? { question } : {}) };
  });
const lecturePartielle = { layersLus: 2000, layersNonLus: 640, variantsNonLus: variants.filter((variant) => variant.nom.startsWith('Severity=warning')).map((variant) => variant.nom), manquees: [] };

const ETATS = [
  {
    id: 'e-vide', titre: 'Panneau sans composant', quand: 'Rien n’est sélectionné dans Figma ; le panneau est ouvert.',
    regarder: 'Une alerte d’information : « Sélectionnez un composant dans Figma. » ; ni résumé, ni onglets.',
    existe: true, atteinte: [preferences(), etroite, sansSelection, OUVRIR],
  },
  {
    id: 'e-cours', titre: 'Analyse en cours', quand: 'L’analyse a lu 5 variants sur 11.',
    regarder: 'Le résumé dit « analyse en cours, 5 variants sur 11 » ; une ligne grise annonce que les constats viendront à la fin ; Analyser est inactif.',
    existe: true, atteinte: [...alertLu, OUVRIR, { message: { type: 'analyse-commencee', analyse: IDENTITE } }, { message: { type: 'analyse-en-cours', analyse: IDENTITE, variantsLus: 5, variantsTotal: 11 } }],
  },
  {
    id: 'e-aucun', titre: 'Aucun constat', quand: 'L’analyse est complète et ne trouve rien sur les 11 variants.',
    regarder: 'Une alerte « Tenu » : « Aucun constat sur les 11 variants d’Alert. » et la liste de ce qui a été contrôlé ; ni onglets, ni pastille sur Constats.',
    existe: true, atteinte: [...alertLu, OUVRIR, lu('complete', [])],
  },
  {
    id: 'e-partiel', titre: 'Analyse partielle', quand: 'L’exporteur a lu 2 000 layers sur 2 640 ; les variants Severity=warning n’ont pas été lus.',
    regarder: 'Une alerte « À vérifier » dit que les constats portent sur la partie lue ; jamais « aucun constat » ; les onglets gardent leur compte.',
    existe: true, atteinte: [...alertAnalyse, OUVRIR, lu('partielle', constatsPartiels, lecturePartielle)],
  },
  {
    id: 'e-echec', titre: 'Analyse arrêtée', quand: 'L’exporteur refuse de lire le composant : deux properties s’écrivent de la même façon.',
    regarder: 'Une alerte « Bloquant » reprend le message de l’exporteur et dit qu’aucun autre contrôle n’a été fait ; la pastille de Constats est bloquante.',
    existe: true,
    atteinte: [...alertLu, OUVRIR, lu('arretee', [{ id: 'C0:0', code: 'C0', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message: 'deux variant properties s’écrivent de la même façon, State et state. Renommez l’une des deux' } }], null, [])],
  },
  {
    id: 'analyse-annulee', titre: 'Analyse annulée', quand: 'Le designer a annulé l’analyse avant la fin.',
    regarder: 'Une alerte d’information dit que l’analyse a été annulée et qu’aucun constat n’a été rendu ; jamais « aucun constat » en vert.',
    existe: true, atteinte: [...alertLu, OUVRIR, lu('annulee', [], null, [])],
  },
  {
    id: 'e-hors', titre: 'Composant hors UCM', quand: 'Le fichier n’est pas déclaré UCM ; le panneau est ouvert.',
    regarder: 'Une alerte d’information et le bouton « Déclarer dans la Configuration » prennent la place des onglets.',
    existe: true, atteinte: [...alertLu, { message: { type: 'declaration', architecture: 'absente' } }, OUVRIR],
  },
  {
    id: 'e-biblio', titre: 'Library à choisir', quand: 'Deux libraries activées portent des variables ; aucune n’est liée à ce composant.',
    regarder: 'Une alerte d’information dit « Choisissez la library de tokens. » et propose d’ouvrir la Configuration.',
    existe: true, atteinte: [...alertLu, { message: { type: 'configuration', library: null, candidates: [{ cle: 'tokens', nom: 'Intencial Tokens', liaisons: 24 }, { cle: 'autre', nom: 'Autre library', liaisons: 3 }], niveau: 'AA' } }, OUVRIR],
  },
  {
    id: 'analyse-perimee-selection', titre: 'Analyse périmée par une autre sélection', quand: 'Le designer sélectionne un autre jeu de variants dans Figma.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; les constats gardés ; rien ne se relance.',
    existe: true, atteinte: [...panneauOuvert, perime('selection')],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS };
