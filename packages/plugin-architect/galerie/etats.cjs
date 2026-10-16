/** Chaque réponse du sandbox possède un état atteignable. */
const analyse = { inventaire: { entrees: [], pages: [] }, conventions: {}, detection: {}, normalisation: { propositions: [], collisions: [] } };
module.exports.ETATS = [
  { id: 'initial', titre: 'Avant analyse', quand: 'Le plugin vient de s’ouvrir.', regarder: 'Le titre et le bouton d’analyse.', existe: true, atteinte: [{ message: { type: 'initial' } }] },
  { id: 'lecture', titre: 'Lecture des pages', quand: 'Une analyse parcourt le fichier.', regarder: 'Le bouton désactivé et l’avancement.', existe: true, atteinte: [{ clic: '#analyser' }, { message: { type: 'lecture', demande: 1, avancement: { phase: 'pages', pagesLues: 2, totalPages: 5 } } }] },
  { id: 'pret', titre: 'Analyse terminée', quand: 'Le fichier a été lu.', regarder: 'Le bilan et le bouton de nouvelle analyse.', existe: true, atteinte: [{ clic: '#analyser' }, { message: { type: 'pret', demande: 1, analyse } }] },
  { id: 'erreur', titre: 'Lecture interrompue', quand: 'Une page n’a pas pu être lue.', regarder: 'Le message et le bouton pour relancer.', existe: true, atteinte: [{ clic: '#analyser' }, { message: { type: 'erreur', demande: 1, message: 'L’analyse du fichier n’a pas abouti. Relancez l’analyse.' } }] },
];
