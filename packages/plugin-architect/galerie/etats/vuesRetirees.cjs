/** Les états des onglets Comparer, Dépendants, Diagnostics, Intégrations et Relevés, que l'étape 3 du lot A1 retire avec leurs vues. */
const { preferences, libre, multimarque, onglet, inspecter, groupe, profilAvecLimites } = require('./aide.cjs');

const ETATS = [
  { id: 'comparaison', titre: 'Deux contextes', quand: 'Le fond du bouton comparé entre deux marques.', regarder: 'La première cible différente est marquée ; l’égalité des valeurs est dite.', existe: true, atteinte: [preferences(), multimarque, inspecter('bouton-fond'), onglet('comparer')] },
  { id: 'comparaison-partielle', titre: 'Comparaison sans résolution', quand: 'Le token comparé est cyclique dans un contexte.', regarder: 'Aucune égalité n’est affirmée.', existe: true, atteinte: [preferences(), libre, groupe('interface', 'essai'), inspecter('essai-a'), onglet('comparer')] },
  { id: 'dependants', titre: 'Dépendants', quand: 'surface est inspectée.', regarder: 'Directs du contexte, de tous les modes, puis indirects avec leur distance.', existe: true, atteinte: [preferences(), libre, groupe('couleurs'), inspecter('surface'), onglet('dependants')] },
  { id: 'diagnostics', titre: 'Diagnostics groupés', quand: 'Le projet libre porte un cycle et une cible inaccessible.', regarder: 'Un constat par cause, son geste, ses départs et les limites du relevé.', existe: true, atteinte: [preferences(), libre, onglet('diagnostics')] },
  { id: 'integrations', titre: 'Intégrations désactivées', quand: 'Aucune intégration n’est active.', regarder: 'Le socle est complet ; les intégrations se décrivent sans alerte.', existe: true, atteinte: [preferences(), libre, onglet('integrations')] },
  { id: 'recette-palettes', titre: 'Recette UCM Palettes absente', quand: 'L’intégration est active sur un fichier sans recette.', regarder: 'L’absence est dite, sans geste imposé.', existe: true, atteinte: [preferences({ palettes: true }), libre, { message: { type: 'recette-palettes', demande: 2, texte: '' } }, onglet('integrations')] },
  { id: 'profil-limites', titre: 'Profil : contrôles impossibles', quand: 'Le profil contrôle un fichier dont un rôle, un mode, une valeur et une couche manquent.', regarder: '« Aucun écart dans ce qui a été contrôlé », « 4 contrôles n’ont pas pu se faire », puis une ligne par cause, chacune avec son texte.', existe: true, atteinte: profilAvecLimites },
  { id: 'releves', titre: 'Relevés et simulation', quand: 'L’onglet Relevés est ouvert sur un token.', regarder: 'Export, import et simulation se lisent sans rien modifier.', existe: true, atteinte: [preferences(), libre, groupe('mesures'), inspecter('espace-carte'), onglet('releves')] },
];

module.exports = { ETATS };
