/**
 * L'inventaire des états de l'interface de l'explorateur. Chaque état
 * atteignable déclare la suite exacte de messages et de gestes qui le
 * produit, jouée dans l'interface compilée. Les relevés viennent des
 * fixtures de `tests/fixtures.ts`, compilées à la volée : ce sont des jeux
 * artificiels, jamais la capture d'un fichier Figma réel.
 *
 * L'interface demande le relevé dès son chargement, sous la demande 1.
 */
const path = require('path');

function compiler(entree, nom) {
  const compile = path.resolve(__dirname, `../dist/${nom}.cjs`);
  require('esbuild').buildSync({ entryPoints: [entree], outfile: compile, bundle: true, format: 'cjs', platform: 'node' });
  return require(compile);
}
const { projetLibre, cinqCollections, grandReleve, constructeur, alias, nombre, couleur } = compiler(path.resolve(__dirname, '../tests/fixtures.ts'), 'galerie-fixtures');

const releve = (donnees, demande = 1) => ({ message: { type: 'releve', demande, releve: donnees } });
const libre = releve(projetLibre());
const multimarque = releve(cinqCollections());
const preferences = (valeurs = {}) => ({ message: { type: 'preferences', preferences: { vueCompacte: false, palettes: false, profilUcm: false, associations: {}, exceptions: {}, ...valeurs } } });
const onglet = (nom) => ({ clic: `#onglet-${nom}` });
const inspecter = (id) => ({ clic: `[data-focus="nom:${id}"]` });
const groupe = (collection, ...segments) => ({ clic: `[data-focus='choix:${JSON.stringify([collection, ...segments])}']` });
const chevron = (collection, ...segments) => ({ clic: `[data-focus='chevron:${JSON.stringify([collection, ...segments])}']` });

/** Un relevé à groupes profonds, sur huit niveaux, avec un nom long et un segment vide. */
function releveProfond() {
  const c = constructeur('Arbre profond');
  c.collection('profond', 'Composants du produit avec un nom de collection particulièrement long', ['Valeur']);
  const nom = 'navigation/barre latérale/section/groupe/élément/état/survol/fond';
  c.variable('profonde', 'profond', nom, 'COLOR', { Valeur: couleur('#336699') });
  c.variable('voisine', 'profond', 'navigation/barre latérale/section/groupe/élément/état/repos/fond', 'COLOR', { Valeur: alias('profonde') });
  c.variable('vide', 'profond', 'navigation//sans-nom', 'FLOAT', { Valeur: nombre(4) });
  return c.releve();
}

/** Une chaîne d'alias de trente variables, pour la chaîne longue. */
function releveLong() {
  const c = constructeur('Chaîne longue');
  c.collection('long', 'Alias', ['Valeur']);
  for (let rang = 0; rang < 30; rang += 1) c.variable(`v${rang}`, 'long', `niveau-${String(rang).padStart(2, '0')}`, 'COLOR', { Valeur: rang === 29 ? couleur('#7A3E9D') : alias(`v${rang + 1}`) });
  return c.releve();
}

const consommateurs = {
  message: {
    type: 'consommateurs',
    demande: 2,
    resultat: {
      perimetre: 'page',
      pages: [{ id: '0:1', nom: 'Écrans' }],
      calques: 42,
      styles: 0,
      occurrences: [
        { consommateur: '1:2', genre: 'calque', nom: 'Carte principale', page: { id: '0:1', nom: 'Écrans' }, propriete: 'fills[0]', variable: 'carte-fond', modes: { couleurs: { mode: 'couleurs:Jour', explicite: true } } },
        { consommateur: '1:3', genre: 'calque', nom: 'En-tête', page: { id: '0:1', nom: 'Écrans' }, propriete: 'fills[0]', variable: 'entete-fond', modes: { couleurs: { mode: 'couleurs:Nuit', explicite: false } } },
        { consommateur: '1:4', genre: 'calque', nom: 'Fond libre', page: { id: '0:1', nom: 'Écrans' }, propriete: 'strokes[0]', variable: 'surface', modes: {} },
      ],
      erreurs: [],
      nonInspecte: ['reactions', 'valeurs-par-defaut', 'calques-masques-des-instances'],
    },
  },
};

const selection = {
  message: {
    type: 'selection',
    page: '0:1',
    calques: [{ id: '1:2', nom: 'Carte principale', type: 'FRAME', modes: { couleurs: { mode: 'couleurs:Jour', explicite: true }, mesures: { mode: 'mesures:Compact', explicite: false } }, liaisons: [{ propriete: 'fills[0]', variable: 'carte-fond' }, { propriete: 'itemSpacing', variable: 'carte-gap' }] }],
  },
};

const ETATS = [
  { id: 'chargement', titre: 'Lecture en cours', quand: 'Le sandbox lit les cibles des alias.', regarder: 'La progression nomme la phase et le compte ; aucune table vide ne la précède.', existe: true, atteinte: [{ message: { type: 'progression', demande: 1, phase: 'references', fait: 12, total: 40 } }] },
  { id: 'vide', titre: 'Fichier sans variable', quand: 'Le relevé ne contient aucune collection.', regarder: 'L’accueil le dit, sans alerte d’absence d’UCM.', existe: true, atteinte: [releve(constructeur('Vide').releve())] },
  { id: 'lecture-refusee', titre: 'Lecture refusée', quand: 'La première lecture lève.', regarder: 'Le message nomme l’échec et propose d’actualiser.', existe: true, atteinte: [{ message: { type: 'lecture-echouee', demande: 1, message: 'Accès refusé' } }] },
  { id: 'lecture-annulee', titre: 'Lecture annulée', quand: 'Le designer annule la première lecture.', regarder: 'Aucune donnée partielle ; le bouton relance la lecture.', existe: true, atteinte: [{ message: { type: 'annulation', demande: 1 } }] },
  { id: 'table-libre', titre: 'Projet libre, collection entière', quand: 'Un fichier sans UCM, collection Interface ouverte.', regarder: 'Les quatre types, zéro, faux et texte vide affichés ; aucun onglet ni alerte UCM.', existe: true, atteinte: [preferences(), libre] },
  { id: 'groupe-parent', titre: 'Groupe et descendants', quand: 'Clic sur le groupe card.', regarder: 'card/fill, card/gap et card/header/* ; cardinal exclu ; le chemin est visible.', existe: true, atteinte: [preferences(), libre, chevron('interface', 'card'), groupe('interface', 'card')] },
  { id: 'arbre-replie', titre: 'Parent replié, filtre conservé', quand: 'Le groupe card est choisi puis replié.', regarder: 'L’arbre cache header ; la table garde le contenu de card.', existe: true, atteinte: [preferences(), libre, chevron('interface', 'card'), groupe('interface', 'card'), chevron('interface', 'card')] },
  { id: 'arbre-profond', titre: 'Arbre profond, nom long', quand: 'Huit niveaux de groupes, un segment vide.', regarder: 'Les libellés coupés gardent leur infobulle ; le segment vide se nomme.', existe: true, atteinte: [preferences(), releve(releveProfond()), chevron('profond', 'navigation'), groupe('profond', 'navigation', 'barre latérale', 'section', 'groupe', 'élément')] },
  { id: 'recherche-globale', titre: 'Recherche dans toutes les collections', quand: 'Le designer cherche « surface ».', regarder: 'La portée globale est annoncée ; chaque ligne nomme sa collection.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'surface' } }] },
  { id: 'recherche-vide', titre: 'Recherche sans résultat', quand: 'Aucune variable ne correspond.', regarder: 'Le message propose de vider la recherche.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'introuvable-xyz' } }] },
  { id: 'chaine-cinq-collections', titre: 'Chaîne à travers cinq collections', quand: 'Le fond du bouton est inspecté, thème par défaut Dark.', regarder: 'Chaque étape nomme sa collection, son mode et son origine ; défaut annoncé.', existe: true, atteinte: [preferences(), multimarque, inspecter('bouton-fond')] },
  { id: 'survol-chaine', titre: 'Chaîne au survol', quand: 'Le pointeur reste sur le nom du token.', regarder: 'La bulle montre toutes les étapes sans masquer la ligne.', existe: true, atteinte: [preferences(), multimarque, { survol: '[data-focus="nom:bouton-fond"]' }] },
  { id: 'chaine-longue', titre: 'Chaîne longue', quand: 'Trente alias successifs.', regarder: 'L’inspecteur défile ; la valeur terminale reste en tête.', existe: true, atteinte: [preferences(), releve(releveLong()), inspecter('v0')] },
  { id: 'cycle', titre: 'Cycle', quand: 'essai/a et essai/b se visent.', regarder: 'Le constat nomme la boucle et le geste ; aucune valeur affichée.', existe: true, atteinte: [preferences(), libre, groupe('interface', 'essai'), inspecter('essai-a')] },
  { id: 'cible-distante', titre: 'Cible distante inaccessible', quand: 'legacy/border vise une variable non lue.', regarder: 'Le préfixe connu reste visible ; aucune suppression n’est affirmée.', existe: true, atteinte: [preferences(), libre, groupe('interface', 'legacy'), inspecter('legacy')] },
  { id: 'comparaison', titre: 'Deux contextes', quand: 'Le fond du bouton comparé entre deux marques.', regarder: 'La première cible différente est marquée ; l’égalité des valeurs est dite.', existe: true, atteinte: [preferences(), multimarque, inspecter('bouton-fond'), onglet('comparer')] },
  { id: 'comparaison-partielle', titre: 'Comparaison sans résolution', quand: 'Le token comparé est cyclique dans un contexte.', regarder: 'Aucune égalité n’est affirmée.', existe: true, atteinte: [preferences(), libre, groupe('interface', 'essai'), inspecter('essai-a'), onglet('comparer')] },
  { id: 'dependants', titre: 'Dépendants', quand: 'surface est inspectée.', regarder: 'Directs du contexte, de tous les modes, puis indirects avec leur distance.', existe: true, atteinte: [preferences(), libre, groupe('couleurs'), inspecter('surface'), onglet('dependants')] },
  { id: 'diagnostics', titre: 'Diagnostics groupés', quand: 'Le projet libre porte un cycle et une cible inaccessible.', regarder: 'Un constat par cause, son geste, ses départs et les limites du relevé.', existe: true, atteinte: [preferences(), libre, onglet('diagnostics')] },
  { id: 'types-non-couleur', titre: 'Nombres par mode', quand: 'La collection Mesures a deux modes.', regarder: 'Deux colonnes, zéro affiché, aucune unité ajoutée.', existe: true, atteinte: [preferences(), libre, groupe('mesures')] },
  { id: 'vue-compacte', titre: 'Vue compacte', quand: 'La préférence vue compacte est rangée.', regarder: 'Une seule colonne, celle du contexte actif.', existe: true, atteinte: [preferences({ vueCompacte: true }), libre, groupe('mesures')] },
  { id: 'releve-perime', titre: 'Relevé précédent après un échec', quand: 'Une actualisation échoue après une lecture réussie.', regarder: 'Les données restent ; leur heure et l’échec sont annoncés.', existe: true, atteinte: [preferences(), libre, { clic: '.barre .bouton-discret:nth-of-type(2)' }, { message: { type: 'lecture-echouee', demande: 2, message: 'Délai dépassé' } }] },
  { id: 'calques', titre: 'Consommateurs et sélection', quand: 'Une analyse de page est lue et un calque est sélectionné.', regarder: 'Liaisons directes et par alias ; modes du calque explicites ou hérités.', existe: true, atteinte: [preferences(), libre, groupe('couleurs'), inspecter('surface'), onglet('calques'), { clic: '#panneau-calques .gestes .bouton-discret' }, consommateurs, selection] },
  { id: 'verification-figma', titre: 'Comparaison avec Figma', quand: 'Le designer compare le calque sélectionné avec Figma.', regarder: 'Valeur de Figma, valeur de l’explorateur et verdict.', existe: true, atteinte: [preferences(), libre, onglet('calques'), selection, { clic: '#panneau-calques .calque .bouton-discret' }, { message: { type: 'valeurs-de-figma', demande: 2, calque: '1:2', valeurs: [{ variable: 'carte-fond', valeur: { nature: 'couleur', couleur: { r: 0.9686274509803922, g: 0.9725490196078431, b: 0.9803921568627451, a: 1 } } }, { variable: 'carte-gap', valeur: { nature: 'nombre', nombre: 12 } }] } }] },
  { id: 'calque-introuvable', titre: 'Calque supprimé depuis l’analyse', quand: 'Afficher dans Figma vise un calque disparu.', regarder: 'L’annonce demande de relancer l’analyse.', existe: true, atteinte: [preferences(), libre, { message: { type: 'calque-affiche', demande: 3, calque: '1:9', issue: 'introuvable' } }] },
  { id: 'integrations', titre: 'Intégrations désactivées', quand: 'Aucune intégration n’est active.', regarder: 'Le socle est complet ; les intégrations se décrivent sans alerte.', existe: true, atteinte: [preferences(), libre, onglet('integrations')] },
  { id: 'recette-palettes', titre: 'Recette UCM Palettes absente', quand: 'L’intégration est active sur un fichier sans recette.', regarder: 'L’absence est dite, sans geste imposé.', existe: true, atteinte: [preferences({ palettes: true }), libre, { message: { type: 'recette-palettes', demande: 2, texte: '' } }, onglet('integrations')] },
  { id: 'preferences-rangees', titre: 'Préférence rangée', quand: 'Le sandbox confirme un rangement.', regarder: 'Rien ne bouge à l’écran.', existe: true, atteinte: [preferences(), libre, { message: { type: 'preferences-rangees', reussie: true } }] },
  { id: 'graphe', titre: 'Graphe local', quand: 'Le fond du bouton est inspecté.', regarder: 'La chaîne active est surlignée ; la liste équivalente suit.', existe: true, atteinte: [preferences(), multimarque, inspecter('bouton-fond'), onglet('graphe')] },
  { id: 'releves', titre: 'Relevés et simulation', quand: 'L’onglet Relevés est ouvert sur un token.', regarder: 'Export, import et simulation se lisent sans rien modifier.', existe: true, atteinte: [preferences(), libre, groupe('mesures'), inspecter('espace-carte'), onglet('releves')] },
  { id: 'grand-releve', titre: 'Dix mille variables', quand: 'Vingt collections de cinq cents variables, quatre modes.', regarder: 'La table ne rend que les lignes visibles ; l’arbre reste replié.', existe: true, atteinte: [preferences(), releve(grandReleve())] },
];

module.exports = { ETATS };
