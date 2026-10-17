/**
 * Chaque message du sandbox possède un état atteignable. L'écran minimal ne
 * les affiche pas encore : chaque état lui envoie son message, et les lots
 * d'interface précisent ce qu'il faut regarder.
 */
const donnees = require('./donnees.cjs');

const rien = 'Le titre et la poignée, sans changement.';
const etat = (id, titre, quand, regarder, message) => ({ id, titre, quand, regarder, existe: true, atteinte: [{ message }] });

module.exports.ETATS = [
  etat('initial', 'Ouverture', 'Le plugin vient de s’ouvrir.', 'Le titre et la poignée de redimensionnement.', donnees.initial),
  etat('lecture', 'Lecture des variables', 'Une analyse parcourt les variables du fichier.', rien, donnees.lecture),
  etat('bilan', 'Bilan', 'L’analyse est terminée et des renommages sont proposés.', rien, donnees.bilan),
  etat('lignes', 'Page de lignes', 'Le designer déplie un groupe de renommages.', rien, donnees.lignes),
  etat('termes', 'Liste des termes', 'Le designer ouvre l’onglet des règles.', rien, donnees.termes),
  etat('fiche', 'Fiche d’un terme', 'Le designer ouvre la fiche d’un terme.', rien, donnees.fiche),
  etat('simulation', 'Simulation d’une règle', 'Le designer règle un terme avant de le valider.', rien, donnees.simulation),
  etat('refus', 'Règle refusée', 'Un geste ou un import contredit une règle du fichier.', rien, donnees.refus),
  etat('application', 'Application', 'Les noms cochés ont été modifiés.', rien, donnees.application),
  etat('regles-exportees', 'Règles exportées', 'Le designer exporte les règles du fichier.', rien, donnees.reglesExportees),
  etat('erreur', 'Erreur', 'Une demande échoue.', rien, donnees.erreur),
];
