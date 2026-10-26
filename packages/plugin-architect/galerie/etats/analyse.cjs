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
const COMMENCEE = { message: { type: 'analyse-commencee', analyse: IDENTITE } };
const enCours = (progression, variantsLus = 0, variantsTotal = 0) => ({ message: { type: 'analyse-en-cours', analyse: IDENTITE, variantsLus, variantsTotal, progression } });
const LECTURE_DES_VARIANTS = [COMMENCEE, enCours({ phase: 'releve', fraction: 0.14, fait: 5, total: 11 }, 5, 11)];
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
/** Les premiers constats des contrôles du relevé, avant le résultat final. */
const PROVISOIRE = { message: { type: 'analyse-provisoire', analyse: IDENTITE, constats: constatsPartiels, ignores: [], lecture: lecturePartielle, variants } };

const ETATS = [
  {
    id: 'e-vide', titre: 'Panneau sans composant', quand: 'Rien n’est sélectionné dans Figma ; le panneau est ouvert.',
    regarder: 'Une alerte d’information : « Sélectionnez un composant dans Figma. » ; ni résumé, ni sommaire.',
    existe: true, atteinte: [preferences(), etroite, sansSelection, OUVRIR],
  },
  {
    id: 'e-cours', titre: 'Analyse en cours', quand: 'L’analyse a lu 5 variants sur 11.',
    regarder: 'Le résumé dit « Lecture des variants : 5 sur 11 » ; la barre reste sous 100 %, Annuler est disponible et Analyser est inactif.',
    existe: true, atteinte: [...alertLu, OUVRIR, ...LECTURE_DES_VARIANTS],
  },
  {
    id: 'analyse-library-en-cours', titre: 'Lecture de la library', quand: 'Le relevé est lu et la library est en cours de lecture.',
    regarder: 'Le résumé dit « Lecture de la library », sans compte ni temps restant ; Annuler est disponible.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, enCours({ phase: 'catalogue', fraction: 0.25 })],
  },
  {
    id: 'analyse-structure-en-cours', titre: 'Lecture de la structure', quand: 'Le moteur a traversé les composants imbriqués et lit la structure.',
    regarder: 'Le résumé dit « Lecture de la structure » ; la barre a avancé et ne montre aucun temps restant.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, enCours({ phase: 'imbriques', fraction: 0.35 }), enCours({ phase: 'structure', fraction: 0.5 })],
  },
  {
    id: 'analyse-regles-en-cours', titre: 'Vérification des règles', quand: 'Les lectures sont terminées et les règles sont vérifiées.',
    regarder: 'Le résumé dit « Vérification des règles » ; la barre reste sous 100 % et Annuler est disponible.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, enCours({ phase: 'regles', fraction: 0.7 })],
  },
  {
    id: 'analyse-premiers-constats', titre: 'Premiers constats reçus', quand: 'Les contrôles du relevé ont rendu leurs constats ; la lecture des composants imbriqués continue.',
    regarder: 'Les premiers constats sont visibles sous la barre de progression et Annuler, avec la mention « L’analyse des composants imbriqués est en cours. D’autres points peuvent s’ajouter. » ; aucune section tenue ni pied de corrections ; aucune carte n’est applicable.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, PROVISOIRE],
  },
  {
    id: 'analyse-provisoire-annulee', titre: 'Annulée après les premiers constats', quand: 'Le designer annule l’analyse alors que les premiers constats sont affichés.',
    regarder: 'Les constats provisoires disparaissent ; l’alerte d’information dit que l’analyse a été annulée et qu’aucun constat n’a été rendu ; ni barre, ni mention, ni section.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, PROVISOIRE, lu('annulee', [], null, [])],
  },
  {
    id: 'analyse-provisoire-arretee', titre: 'Arrêtée après les premiers constats', quand: 'Le moteur s’arrête sur une erreur alors que les premiers constats sont affichés.',
    regarder: 'Les constats provisoires disparaissent ; l’alerte « Bloquant » reprend le message de l’exporteur et dit qu’aucun autre contrôle n’a été fait ; ni barre, ni mention, ni section.',
    existe: true,
    atteinte: [...alertLu, OUVRIR, COMMENCEE, PROVISOIRE, lu('arretee', [{ id: 'C0:0', code: 'C0', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message: 'le moteur a rencontré une erreur de lecture' } }], null, [])],
  },
  {
    id: 'analyse-provisoire-partielle', titre: 'Partielle après les premiers constats', quand: 'La lecture est restée incomplète (2 000 layers lus sur 2 640) mais l’analyse est allée à son terme.',
    regarder: 'La barre et la mention disparaissent ; l’alerte « À vérifier » dit que les constats portent sur la partie lue ; les sections tenues et le pied des corrections reviennent ; les corrections sont applicables.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, PROVISOIRE, lu('partielle', constatsPartiels, lecturePartielle)],
  },
  {
    id: 'analyse-provisoire-perimee', titre: 'Périmée après les premiers constats', quand: 'Le document change alors que les premiers constats sont affichés et que le moteur lit encore.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse. » s’ajoute aux constats provisoires, qui restent consultables ; ni barre, ni mention, ni Annuler, ni section tenue, ni pied ; aucune carte n’est applicable ; Analyser est actif.',
    existe: true, atteinte: [...alertLu, OUVRIR, COMMENCEE, PROVISOIRE, perime('document')],
  },
  {
    id: 'analyse-perimee-en-cours', titre: 'Analyse périmée pendant la lecture', quand: 'Le document change pendant la lecture des variants.',
    regarder: 'L’alerte de péremption remplace la progression ; aucun constat n’est rendu.',
    existe: true, atteinte: [...alertLu, OUVRIR, ...LECTURE_DES_VARIANTS, perime('document')],
  },
  {
    id: 'e-aucun', titre: 'Aucun constat', quand: 'L’analyse est complète et ne trouve rien sur les 11 variants.',
    regarder: 'Une alerte « Tenu » : « Aucun constat sur les 11 variants d’Alert. » et la liste de ce qui a été contrôlé ; ni sommaire, ni pastille sur Constats.',
    existe: true, atteinte: [...alertLu, OUVRIR, lu('complete', [])],
  },
  {
    id: 'e-partiel', titre: 'Analyse partielle', quand: 'L’exporteur a lu 2 000 layers sur 2 640 ; les variants Severity=warning n’ont pas été lus.',
    regarder: 'Une alerte « À vérifier » dit que les constats portent sur la partie lue ; jamais « aucun constat » ; les puces gardent leur nombre de points.',
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
    existe: true, atteinte: [...alertLu, OUVRIR, ...LECTURE_DES_VARIANTS, lu('annulee', [], null, [])],
  },
  {
    id: 'e-hors', titre: 'Composant hors UCM', quand: 'Le fichier n’est pas déclaré UCM ; le panneau est ouvert.',
    regarder: 'Une alerte d’information et le bouton « Déclarer dans la Configuration » prennent la place du sommaire.',
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
