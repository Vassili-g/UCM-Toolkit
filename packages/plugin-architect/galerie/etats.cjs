/**
 * Chaque réponse du sandbox possède un état atteignable. Les analyses sont
 * écrites à la main, à la forme que le moteur rend, avec les noms de la
 * maquette validée ; les comptes de détection sont ceux d'un fichier entier.
 */
const tiret = { casse: 'minuscules', separateur: 'tiret' };
const espace = { casse: 'initiale', separateur: 'espace' };
const camel = { casse: 'camelCase', separateur: 'camelCase' };
const pascal = { casse: 'PascalCase', separateur: 'camelCase' };

const CIBLES = {
  collections: (id) => ({ type: 'collection', collectionId: id }),
  variables: (id) => ({ type: 'variable', variableId: id, collectionId: 'c1' }),
  proprietes: (id) => ({ type: 'propriete', ownerId: 'n1', proprieteId: id, typePropriete: 'TEXT' }),
  valeurs: (id) => ({ type: 'valeur', ownerId: 'n1', axe: 'Size', valeur: id, componentIds: ['n2'] }),
};
const portees = { collections: 'document', variables: 'c1', proprietes: 'n1', valeurs: '["n1","Size"]' };

/** Un nom du fichier : son identifiant, sa catégorie et son nom actuel. */
const nom = (id, categorie, texte, categoriesDesSegments) => ({
  nom: { id, categorie, portee: portees[categorie], nom: texte, ...(categoriesDesSegments ? { categoriesDesSegments } : {}) },
  cible: CIBLES[categorie](id), renommable: true,
});
/** Un renommage proposé, avec ses raisons. */
const proposition = (entree, nouveauNom, raisons) => ({ id: entree.nom.id, categorie: entree.nom.categorie, portee: entree.nom.portee, ancienNom: entree.nom.nom, nouveauNom, raisons });
const casseEtSeparateur = ['casse', 'separateur'];

/** Ce que la détection a compté dans tout le fichier : `conformes` noms sur `total` suivent `dominante`. */
function detecter(dominante, conformes, total) {
  const comptes = {
    casse: { minuscules: 0, initiale: 0, camelCase: 0, PascalCase: 0, inchangee: 0, [dominante.casse]: conformes },
    separateur: { tiret: 0, 'tiret-bas': 0, soude: 0, camelCase: 0, espace: 0, inchange: 0, [dominante.separateur]: conformes },
  };
  return { dominante, casse: dominante.casse, separateur: dominante.separateur, comptes, total };
}
const detection = (conformes) => ({
  collections: detecter(tiret, conformes ? 7 : 5, 7),
  variables: detecter(tiret, conformes ? 800 : 734, 800),
  proprietes: detecter(espace, conformes ? 24 : 18, 24),
  valeurs: detecter(tiret, conformes ? 96 : 81, 96),
  palettes: detecter(pascal, 12, 12),
  composants: detecter(pascal, conformes ? 9 : 8, 9),
});

const collection = nom('c1', 'collections', 'Color Brands');
const bleu = nom('v1', 'variables', 'colors/Blue/Light/500');
const taille = nom('v2', 'variables', 'fontSize/bodyLarge');
const doublonA = nom('v3', 'variables', 'Font Size');
const doublonB = nom('v4', 'variables', 'font-size');
const propriete = nom('p1', 'proprietes', 'button_state');
const grande = nom('w1', 'valeurs', 'Extra_Large');
const defaut = nom('w2', 'valeurs', 'Default');
// Une variable dont un segment nomme une palette, une autre dont un segment nomme un composant : ils donnent leurs lignes au tableau d'écriture.
const palette = nom('v5', 'variables', 'colors/Poppy/light/500', [null, 'palettes', null, null]);
const composant = nom('v6', 'variables', 'components/Button/colors/primary', [null, 'composants', null, null]);
const entrees = [collection, bleu, taille, doublonA, doublonB, palette, composant, propriete, grande, defaut];
const inventaire = (liste) => ({ entrees: liste, pages: [{ id: 'page', nom: 'Composants' }] });

const choisies = { collections: tiret, variables: tiret, proprietes: espace, valeurs: tiret, palettes: pascal, composants: pascal };
const propositions = [
  proposition(collection, 'color-brands', casseEtSeparateur),
  proposition(bleu, 'colors/blue/light/500', ['casse']),
  proposition(taille, 'font-size/body-large', casseEtSeparateur),
  proposition(propriete, 'Button state', casseEtSeparateur),
  proposition(grande, 'extra-large', casseEtSeparateur),
  proposition(defaut, 'default', ['casse']),
];
const doublon = { categorie: 'variables', portee: 'c1', nom: 'font-size', ids: ['v3', 'v4'] };

/** Six noms à harmoniser, deux groupes, et un doublon qui bloque « Font Size ». */
const analyse = {
  inventaire: inventaire(entrees), conventions: choisies, termesUcm: false, detection: detection(false),
  normalisation: { propositions, collisions: [doublon] },
};

/** Les variables passent en camelCase : « Font Size » et « font-size » visent le même nom. */
const analyseEnCamelCase = {
  inventaire: inventaire(entrees), conventions: { ...choisies, variables: camel }, termesUcm: false, detection: detection(false),
  normalisation: {
    propositions: propositions.filter((item) => item.id !== 'v2'),
    collisions: [{ categorie: 'variables', portee: 'c1', nom: 'fontSize', ids: ['v3', 'v4'] }],
  },
};

/** Des noms déjà conformes : rien à proposer, rien de bloqué. */
const analyseConforme = {
  inventaire: inventaire([nom('c1', 'collections', 'color-brands'), nom('v1', 'variables', 'colors/blue/light/500'), palette, composant, nom('p1', 'proprietes', 'Button state'), nom('w1', 'valeurs', 'extra-large')]),
  conventions: choisies, termesUcm: false, detection: detection(true), normalisation: { propositions: [], collisions: [] },
};

const effectues = [
  { type: 'collection', id: 'c1', ancienNom: 'Color Brands', nouveauNom: 'color-brands' },
  { type: 'variable', id: 'v2', ancienNom: 'fontSize/bodyLarge', nouveauNom: 'font-size/body-large' },
  { type: 'propriete', id: '["propriete","n1","button_state#1:2"]', ownerId: 'n1', proprieteId: 'button_state#1:2', nouvelId: 'Button state#1:2', ancienNom: 'button_state', nouveauNom: 'Button state' },
  { type: 'valeur', id: 'n2', ownerId: 'n1', ancienNom: 'Size=Extra_Large', nouveauNom: 'Size=extra-large' },
];
const reussie = { statut: 'applique', renommages: effectues, ignores: [], conventionRangee: true, annulationPossible: true, erreur: false };
const partielle = {
  statut: 'partiel', renommages: effectues.slice(0, 2), ignores: [{ id: 'p1', motif: 'fichier-modifie' }, { id: 'w1', motif: 'ecriture-interrompue' }],
  conventionRangee: false, annulationPossible: true, erreur: true,
};

const analyser = { clic: '#analyser' };
const pret = (demande, contenu) => ({ message: { type: 'pret', demande, analyseId: demande, analyse: contenu } });
const cocherLeGroupe = { clic: '.groupe summary input' };
const appliquer = { clic: '#appliquer' };

module.exports.ETATS = [
  { id: 'initial', titre: 'Avant analyse', quand: 'Le plugin vient de s’ouvrir.', regarder: 'L’en-tête, le bouton d’analyse et la note de bas de page.', existe: true, atteinte: [{ message: { type: 'initial' } }] },
  { id: 'lecture', titre: 'Lecture des pages', quand: 'Une analyse parcourt le fichier.', regarder: 'Le bouton désactivé et l’avancement.', existe: true, atteinte: [analyser, { message: { type: 'lecture', demande: 1, avancement: { phase: 'pages', pagesLues: 2, totalPages: 5 } } }] },
  { id: 'pret', titre: 'Propositions', quand: 'Le fichier a été lu et des noms sont à harmoniser.', regarder: 'Le titre-bilan, l’écriture détectée par catégorie (dont les noms de palettes et de composants), les deux groupes de renommages et le doublon replié ; le pied désactivé.', existe: true, atteinte: [analyser, pret(1, analyse)] },
  { id: 'aucune-proposition', titre: 'Aucune proposition', quand: 'Tous les noms suivent déjà l’écriture choisie.', regarder: 'Le titre « Aucun nom à harmoniser », sa phrase d’aide, l’absence de liste et de pied.', existe: true, atteinte: [analyser, pret(1, analyseConforme)] },
  { id: 'ecriture-changee', titre: 'Écriture changée', quand: 'Le designer choisit le camelCase pour les variables.', regarder: 'La proposition recalculée, la liste des variables en camelCase et le doublon à deux noms.', existe: true, atteinte: [analyser, pret(1, analyse), { saisie: { dans: 'select[aria-label="Écriture des variables"]', valeur: 'camelCase|camelCase' } }, pret(2, analyseEnCamelCase)] },
  { id: 'lignes-cochees', titre: 'Lignes cochées', quand: 'Le designer coche un groupe, puis une ligne d’un autre.', regarder: 'La case du premier groupe cochée, celle du second partielle, et le pied qui compte cinq noms.', existe: true, atteinte: [analyser, pret(1, analyse), cocherLeGroupe, { clic: '.groupe:nth-of-type(2) .ligne input' }] },
  { id: 'application-reussie', titre: 'Application réussie', quand: 'Les noms cochés ont été modifiés.', regarder: 'Le compte des noms modifiés et le bouton de téléchargement de la table des noms.', existe: true, atteinte: [analyser, pret(1, analyse), cocherLeGroupe, appliquer, { message: { type: 'application', demande: 2, analyseId: 1, resultat: reussie } }] },
  { id: 'application-partielle', titre: 'Application partielle', quand: 'Une écriture a été interrompue.', regarder: 'Le refus de réussite, le geste de nouvelle analyse et le téléchargement de ce qui a été fait.', existe: true, atteinte: [analyser, pret(1, analyse), cocherLeGroupe, appliquer, { message: { type: 'application', demande: 2, analyseId: 1, resultat: partielle } }] },
  { id: 'erreur', titre: 'Lecture interrompue', quand: 'Une page n’a pas pu être lue.', regarder: 'Le message et le bouton pour relancer.', existe: true, atteinte: [analyser, { message: { type: 'erreur', demande: 1, message: 'L’analyse du fichier n’a pas abouti. Relancez l’analyse.' } }] },
];
