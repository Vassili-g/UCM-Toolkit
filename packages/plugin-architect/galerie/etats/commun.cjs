/** Les états de ce qui ne dépend d'aucun domaine : les préférences, la bascule des deux modes, la déclaration UCM du fichier et les demandes qu'aucun traitement ne sert encore. */
const { preferences, libre, etroite, bascule, choisir, composant, apercu, alert } = require('./aide.cjs');

const ETATS = [
  { id: 'preferences-rangees', titre: 'Préférence rangée', quand: 'Le sandbox confirme un rangement.', regarder: 'Rien ne bouge à l’écran.', existe: true, atteinte: [preferences(), libre, { message: { type: 'preferences-rangees', reussie: true } }] },
  { id: 'declaration', titre: 'Déclaration UCM du fichier', quand: 'Le sandbox annonce que le fichier se déclare UCM.', regarder: 'Rien ne bouge à l’écran : la déclaration règle les contrôles des lots suivants.', existe: true, atteinte: [preferences(), libre, { message: { type: 'declaration', architecture: 'ucm' } }] },
  { id: 'non-construit', titre: 'Domaine pas encore construit', quand: 'Le sandbox répond à une demande d’un domaine qu’aucun lot n’a encore construit.', regarder: 'Rien ne bouge à l’écran : la réponse ne lit ni n’écrit rien.', existe: true, atteinte: [preferences(), libre, { message: { type: 'non-construit', domaine: 'structure' } }] },
  { id: 'bascule-composant', titre: 'Bascule vers la vue composant', quand: 'Le designer quitte le mode Tokens par la bascule, Alert sélectionné.', regarder: 'Le segment « Composant » est en aplat ; Actualiser a quitté la barre ; la vue lit la sélection.', existe: true, disposition: 'etroite', atteinte: [preferences(), libre, bascule('etroite'), choisir(alert), composant(alert), apercu(alert)] },
  { id: 'bascule-tokens', titre: 'Bascule vers le mode Tokens', quand: 'La fenêtre s’est ouverte sur la vue composant, et le designer choisit « Tokens ».', regarder: 'L’arbre, la table et le panneau latéral prennent la place de la vue ; Actualiser revient dans la barre.', existe: true, atteinte: [preferences(), etroite, libre, bascule('large')] },
];

module.exports = { ETATS };
