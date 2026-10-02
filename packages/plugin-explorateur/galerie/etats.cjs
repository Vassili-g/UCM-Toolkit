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
const { projetLibre, cinqCollections, grandReleve, constructeur, alias, nombre, couleur, composantSimple, composantComplexe, composantBouton, composantInterrompu, composantSansToken, peinturesDe } = compiler(path.resolve(__dirname, '../tests/fixtures.ts'), 'galerie-fixtures');
const { imagePng } = require('./image.cjs');

const releve = (donnees, demande = 1) => ({ message: { type: 'releve', demande, releve: donnees } });
const libre = releve(projetLibre());
const multimarque = releve(cinqCollections());
const preferences = (valeurs = {}) => ({ message: { type: 'preferences', preferences: { vueCompacte: false, palettes: false, profilUcm: false, associations: {}, exceptions: {}, largeurs: {}, ...valeurs } } });
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

/*
 * La vue composant. Le sandbox annonce la disposition, puis la sélection ;
 * l'interface demande alors le composant, sous la demande 2, la demande 1
 * étant celle du relevé. Un composant imbriqué ouvert prend la demande 3.
 */
const alert = composantSimple();
const stressTest = composantComplexe();
const bouton = composantBouton();
const tag = composantInterrompu();
const avatar = composantSansToken();
const etroite = { message: { type: 'disposition', disposition: 'etroite' } };
const choisir = (lecture, portee = lecture.sujet.id, ignores = 0) => ({ message: { type: 'selection', sujet: { id: lecture.sujet.id, portee }, ignores } });
const sansSelection = { message: { type: 'selection', sujet: null, ignores: 0 } };
const bascule = (disposition) => ({ clic: `.bascule-choix[data-mode="${disposition}"]` });
const composant = (lecture, demande = 2) => ({ message: { type: 'composant', demande, lecture } });

/** L'image d'un composant de test : chaque calque peint sa boîte. Les octets voyagent en tableau, que le JSON du pilote garde. */
function apercu(lecture, demande = 2) {
  const { largeur, hauteur } = lecture.calques[0].boite;
  return { message: { type: 'apercu-du-composant', demande, sujet: lecture.sujet.id, octets: [...imagePng(largeur, hauteur, peinturesDe(lecture))], largeur, hauteur, origine: { x: 0, y: 0 } } };
}

const ouvrir = (lecture) => [preferences(), etroite, choisir(lecture), composant(lecture), apercu(lecture)];
const ligne = (debut) => ({ clic: `[data-focus^='ligne:${debut}']` });
const calqueNomme = (lecture, nom) => lecture.calques.find((calque) => calque.nom === nom).id;

/** Alert dont Figma rend, pour le fond, une autre couleur que la chaîne. */
const alertAvecEcart = { ...alert, liaisons: alert.liaisons.map((liaison) => (liaison.variable.endsWith('/background') ? { ...liaison, valeurDeFigma: couleur('#E0F2FE') } : liaison)) };
/** Alert lu depuis un jeu de trois variants. */
const alertAVariants = { ...alert, sujet: { ...alert.sujet, type: 'COMPONENT_SET', variants: [{ id: alert.calques[0].id, nom: 'info · standard' }, { id: 'alert:erreur', nom: 'error · standard' }, { id: 'alert:succes', nom: 'success · standard' }] } };

const ETATS_DU_COMPOSANT = [
  { id: 'composant-vide', titre: 'Aucun composant sélectionné', quand: 'Le fichier n’a aucune variable locale et rien n’est sélectionné.', regarder: 'La barre et sa bascule sur « Composant », puis le pictogramme et « Sélectionnez un composant » ; ni arbre, ni onglets.', existe: true, atteinte: [preferences(), etroite, sansSelection] },
  { id: 'composant-lecture', titre: 'Lecture d’un composant', quand: 'Un composant vient d’être sélectionné.', regarder: 'La lecture s’annonce à la place de la liste.', existe: true, atteinte: [preferences(), etroite, choisir(alert)] },
  { id: 'composant-simple', titre: 'Composant simple', quand: 'Alert est sélectionné : 10 lignes.', regarder: 'Nom, variant, aperçu, composant imbriqué, puis une ligne par token, sections ouvertes.', existe: true, atteinte: ouvrir(alert) },
  { id: 'composant-chaine', titre: 'Chaîne dépliée', quand: 'Le rayon d’Alert est déplié.', regarder: 'Trois étapes, la valeur à copier, puis le libellé et le calque.', existe: true, atteinte: [...ouvrir(alert), ligne('components/alert/sizes/border-radius')] },
  { id: 'composant-style', titre: 'Style de texte déplié', quand: 'Body/Large est déplié.', regarder: 'Une ligne par champ : collections traversées et valeur.', existe: true, atteinte: [...ouvrir(alert), ligne('style:S:Body/Large')] },
  { id: 'composant-interrompu', titre: 'Chaîne interrompue', quand: 'Le texte de Tag vise une variable non lue.', regarder: '« interrompue » sur la ligne ; la chaîne s’arrête sur la cause, sans valeur.', existe: true, atteinte: [...ouvrir(tag), ligne('components/tag/outline/foreground')] },
  { id: 'composant-valeurs-sans-token', titre: 'Valeurs sans token', quand: 'Le pied de Tag est ouvert.', regarder: 'La section « Sans token » liste la marge posée à la main.', existe: true, atteinte: [...ouvrir(tag), { clic: '[data-focus="directes"]' }] },
  { id: 'composant-sans-token', titre: 'Composant sans token', quand: 'Avatar ne porte aucune variable.', regarder: '« Aucun token · valeurs directes », puis les trois valeurs ; aucun outil.', existe: true, atteinte: ouvrir(avatar) },
  { id: 'composant-ecart', titre: 'Écart avec Figma', quand: 'Figma rend une autre couleur que la chaîne du fond.', regarder: 'La ligne garde la valeur de la chaîne et porte la marque ; dépliée, elle donne les deux valeurs.', existe: true, atteinte: [...ouvrir(alertAvecEcart), ligne('components/alert/colors/info/standard/background')] },
  { id: 'composant-sans-apercu', titre: 'Aperçu absent', quand: 'L’export de l’image a échoué.', regarder: 'La zone d’aperçu disparaît ; la liste reste entière.', existe: true, atteinte: [preferences(), etroite, choisir(alert), composant(alert)] },
  { id: 'composant-complexe', titre: 'Composant complexe replié', quand: 'StressTest est sélectionné : 52 lignes.', regarder: 'Cinq sections repliées avec leur résumé, sans défilement.', existe: true, atteinte: ouvrir(stressTest) },
  { id: 'composant-section', titre: 'Section dépliée', quand: 'La section Couleur de StressTest est ouverte.', regarder: '18 lignes, le compte ×12 sur les tuiles.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-section="couleur"]' }] },
  { id: 'composant-portee', titre: 'Portée d’un calque', quand: 'Le calque UserInput est sélectionné dans StressTest.', regarder: 'Le fil d’Ariane, le calque en titre, ses 14 tokens, son cadre dans l’aperçu.', existe: true, atteinte: [preferences(), etroite, choisir(stressTest, calqueNomme(stressTest, 'UserInput')), composant(stressTest), apercu(stressTest)] },
  { id: 'composant-frontiere', titre: 'Composant imbriqué ouvert', quand: 'Button est ouvert depuis StressTest.', regarder: 'Le fil d’Ariane ramène à StressTest ; les tokens sont ceux de Button.', existe: true, atteinte: [...ouvrir(stressTest), { clic: `[data-frontiere="${calqueNomme(stressTest, 'Button')}"]` }, composant(bouton, 3), apercu(bouton, 3)] },
  { id: 'composant-filtre', titre: 'Filtre', quand: 'Le designer filtre StressTest sur « radius ».', regarder: 'Les sections s’ouvrent sur les seules lignes gardées.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-focus="outil:filtre"]' }, { saisie: { dans: '.vc-filtre input', valeur: 'radius' } }] },
  { id: 'composant-filtre-vide', titre: 'Filtre sans résultat', quand: 'Aucun token ne porte le texte cherché.', regarder: '« Aucun token ne correspond. »', existe: true, atteinte: [...ouvrir(alert), { clic: '[data-focus="outil:filtre"]' }, { saisie: { dans: '.vc-filtre input', valeur: 'introuvable-xyz' } }] },
  { id: 'composant-variants', titre: 'Jeu de variants', quand: 'Le jeu Alert est sélectionné.', regarder: 'Le choix du variant remplace le nom du variant dans l’en-tête.', existe: true, atteinte: ouvrir(alertAVariants) },
  { id: 'composant-survol', titre: 'Survol d’une ligne', quand: 'Le pointeur est sur la couleur des tuiles de StressTest.', regarder: 'Douze cadres sur les tuiles de l’aperçu.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-section="couleur"]' }, { survol: "[data-focus^='ligne:components/stresstest/info/tilesgrid/colors/tile']" }] },
  { id: 'bascule-composant', titre: 'Bascule vers la vue composant', quand: 'Le designer quitte l’explorateur de tokens par la bascule, Alert sélectionné.', regarder: 'Le segment « Composant » est en aplat ; Actualiser a quitté la barre ; la vue lit la sélection.', existe: true, atteinte: [preferences(), libre, bascule('etroite'), choisir(alert), composant(alert), apercu(alert)] },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

const ETATS_LARGES = [
  { id: 'chargement', titre: 'Lecture en cours', quand: 'Le sandbox lit les cibles des alias.', regarder: 'La progression nomme la phase et le compte ; aucune table vide ne la précède.', existe: true, atteinte: [{ message: { type: 'progression', demande: 1, phase: 'references', fait: 12, total: 40 } }] },
  { id: 'vide', titre: 'Fichier sans variable', quand: 'Le relevé ne contient aucune collection.', regarder: 'L’accueil le dit, sans alerte d’absence d’UCM.', existe: true, atteinte: [releve(constructeur('Vide').releve())] },
  { id: 'lecture-refusee', titre: 'Lecture refusée', quand: 'La première lecture lève.', regarder: 'Le message nomme l’échec et propose d’actualiser.', existe: true, atteinte: [{ message: { type: 'lecture-echouee', demande: 1, message: 'Accès refusé' } }] },
  { id: 'lecture-annulee', titre: 'Lecture annulée', quand: 'Le designer annule la première lecture.', regarder: 'Aucune donnée partielle ; le bouton relance la lecture.', existe: true, atteinte: [{ message: { type: 'annulation', demande: 1 } }] },
  { id: 'table-libre', titre: 'Projet libre, collection entière', quand: 'Un fichier sans UCM, collection Interface ouverte.', regarder: 'La bascule sur « Tokens », la recherche sous le titre de l’arbre ; les quatre types, zéro, faux et texte vide affichés ; aucun onglet ni alerte UCM.', existe: true, atteinte: [preferences(), libre] },
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
  { id: 'largeurs-reglees', titre: 'Largeurs réglées', quand: 'Le designer a élargi l’arbre et la colonne du nom.', regarder: 'L’arbre et la colonne gardent leur largeur ; les colonnes de valeur prennent le reste.', existe: true, atteinte: [preferences({ largeurs: { arbre: 320, nom: 320, type: 110 } }), multimarque] },
  { id: 'releve-perime', titre: 'Relevé précédent après un échec', quand: 'Une actualisation échoue après une lecture réussie.', regarder: 'Les données restent ; leur heure et l’échec sont annoncés.', existe: true, atteinte: [preferences(), libre, { clic: '.barre-lecture .bouton-discret:first-child' }, { message: { type: 'lecture-echouee', demande: 2, message: 'Délai dépassé' } }] },
  { id: 'integrations', titre: 'Intégrations désactivées', quand: 'Aucune intégration n’est active.', regarder: 'Le socle est complet ; les intégrations se décrivent sans alerte.', existe: true, atteinte: [preferences(), libre, onglet('integrations')] },
  { id: 'recette-palettes', titre: 'Recette UCM Palettes absente', quand: 'L’intégration est active sur un fichier sans recette.', regarder: 'L’absence est dite, sans geste imposé.', existe: true, atteinte: [preferences({ palettes: true }), libre, { message: { type: 'recette-palettes', demande: 2, texte: '' } }, onglet('integrations')] },
  { id: 'preferences-rangees', titre: 'Préférence rangée', quand: 'Le sandbox confirme un rangement.', regarder: 'Rien ne bouge à l’écran.', existe: true, atteinte: [preferences(), libre, { message: { type: 'preferences-rangees', reussie: true } }] },
  { id: 'releves', titre: 'Relevés et simulation', quand: 'L’onglet Relevés est ouvert sur un token.', regarder: 'Export, import et simulation se lisent sans rien modifier.', existe: true, atteinte: [preferences(), libre, groupe('mesures'), inspecter('espace-carte'), onglet('releves')] },
  { id: 'grand-releve', titre: 'Dix mille variables', quand: 'Vingt collections de cinq cents variables, quatre modes.', regarder: 'La table ne rend que les lignes visibles ; l’arbre reste replié.', existe: true, atteinte: [preferences(), releve(grandReleve())] },
  { id: 'bascule-tokens', titre: 'Bascule vers l’explorateur de tokens', quand: 'La fenêtre s’est ouverte sur la vue composant, et le designer choisit « Tokens ».', regarder: 'L’arbre, la table et l’inspecteur prennent la place de la vue ; Actualiser revient dans la barre.', existe: true, atteinte: [preferences(), etroite, libre, bascule('large')] },
];

/** Tous les états ; `disposition` range ceux de la fenêtre étroite dans leur galerie. */
const ETATS = [...ETATS_LARGES, ...ETATS_DU_COMPOSANT];

module.exports = { ETATS };
