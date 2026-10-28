/** Les états de la vue Composant, dans la fenêtre étroite. */
const { composantSansVariant, alertEnJeu, analyseAlert, analyseSansVariants, enButton, analyseButton } = require('../composant/donnees.cjs');
const { preferences, etroite, choisir, sansSelection, composant, apercu, ouvrir, ligne, calqueNomme, alert, stressTest, bouton, tag, avatar, alertAvecEcart } = require('./aide.cjs');

const ETATS = [
  { id: 'composant-vide', titre: 'Aucun composant sélectionné', quand: 'Le fichier n’a aucune variable locale et rien n’est sélectionné.', regarder: 'La barre compacte et sa bascule sur « Composant », Analyser grisé, puis le pictogramme et « Sélectionnez un composant » ; ni arbre, ni onglets.', existe: true, atteinte: [preferences(), etroite, sansSelection] },
  { id: 'composant-lecture', titre: 'Lecture d’un composant', quand: 'Un composant vient d’être sélectionné.', regarder: 'La lecture s’annonce à la place de la liste.', existe: true, atteinte: [preferences(), etroite, choisir(alert)] },
  { id: 'composant-simple', titre: 'Composant simple', quand: 'Alert est sélectionné : 10 lignes.', regarder: 'Nom, variant, aperçu, composant imbriqué, puis une ligne par token, sections ouvertes.', existe: true, atteinte: ouvrir(alert) },
  { id: 'composant-chaine', titre: 'Chaîne dépliée', quand: 'Le rayon d’Alert est déplié.', regarder: 'Trois étapes, la valeur à copier, puis le libellé et le calque.', existe: true, atteinte: [...ouvrir(alert), ligne('components/alert/sizes/border-radius')] },
  { id: 'composant-style', titre: 'Style de texte déplié', quand: 'Body/Large est déplié.', regarder: 'Une ligne par champ : collections traversées et valeur.', existe: true, atteinte: [...ouvrir(alert), ligne('style:S:Body/Large')] },
  { id: 'composant-interrompu', titre: 'Chaîne interrompue', quand: 'Le texte de Tag vise une variable non lue.', regarder: '« interrompue » sur la ligne ; la chaîne s’arrête sur la cause, sans valeur.', existe: true, atteinte: [...ouvrir(tag), ligne('components/tag/outline/foreground')] },
  { id: 'composant-valeurs-sans-token', titre: 'Valeurs sans token', quand: 'Le pied de Tag est ouvert.', regarder: 'La section « Sans token » liste la marge posée à la main.', existe: true, atteinte: [...ouvrir(tag), { clic: '[data-focus="directes"]' }] },
  { id: 'composant-sans-token', titre: 'Composant sans token', quand: 'Avatar ne porte aucune variable.', regarder: '« Aucun token, valeurs directes », puis les trois valeurs ; aucun outil.', existe: true, atteinte: ouvrir(avatar) },
  { id: 'composant-ecart', titre: 'Écart avec Figma', quand: 'Figma rend une autre couleur que la chaîne du fond.', regarder: 'La ligne garde la valeur de la chaîne et porte la marque ; dépliée, elle donne les deux valeurs.', existe: true, atteinte: [...ouvrir(alertAvecEcart), ligne('components/alert/colors/info/standard/background')] },
  { id: 'composant-sans-apercu', titre: 'Aperçu absent', quand: 'L’export de l’image a échoué.', regarder: 'La zone d’aperçu disparaît ; la liste reste entière.', existe: true, atteinte: [preferences(), etroite, choisir(alert), composant(alert)] },
  { id: 'composant-complexe', titre: 'Composant complexe replié', quand: 'StressTest est sélectionné : 52 lignes.', regarder: 'Cinq sections repliées avec leur résumé, sans défilement.', existe: true, atteinte: ouvrir(stressTest) },
  { id: 'composant-section', titre: 'Section dépliée', quand: 'La section Couleur de StressTest est ouverte.', regarder: '18 lignes, le compte ×12 sur les tuiles.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-section="couleur"]' }] },
  { id: 'composant-portee', titre: 'Portée d’un calque', quand: 'Le calque UserInput est sélectionné dans StressTest.', regarder: 'Le fil d’Ariane, le calque en titre, ses 14 tokens, son cadre dans l’aperçu.', existe: true, atteinte: [preferences(), etroite, choisir(stressTest, calqueNomme(stressTest, 'UserInput')), composant(stressTest), apercu(stressTest)] },
  { id: 'composant-frontiere', titre: 'Composant imbriqué ouvert', quand: 'Button est ouvert depuis StressTest.', regarder: 'Le fil d’Ariane ramène à StressTest ; les tokens sont ceux de Button.', existe: true, atteinte: [...ouvrir(stressTest), { clic: `[data-frontiere="${calqueNomme(stressTest, 'Button')}"]` }, composant(bouton, 3), apercu(bouton, 3)] },
  { id: 'composant-filtre', titre: 'Filtre', quand: 'Le designer filtre StressTest sur « radius ».', regarder: 'Les sections s’ouvrent sur les seules lignes gardées.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-focus="outil:filtre"]' }, { saisie: { dans: '.vc-filtre input', valeur: 'radius' } }] },
  { id: 'composant-filtre-vide', titre: 'Filtre sans résultat', quand: 'Aucun token ne porte le texte cherché.', regarder: '« Aucun token ne correspond. »', existe: true, atteinte: [...ouvrir(alert), { clic: '[data-focus="outil:filtre"]' }, { saisie: { dans: '.vc-filtre input', valeur: 'introuvable-xyz' } }] },
  { id: 'composant-variants', titre: 'Jeu de variants analysé', quand: 'Le jeu Alert est analysé.', regarder: 'La section Variants remplace le choix du variant dans l’en-tête : une ligne par property, les valeurs à constat et la valeur affichée en puces.', existe: true, atteinte: [...ouvrir(alertEnJeu), { message: analyseAlert }] },
  {
    id: 'c-avant', titre: 'Composant, avant la première analyse', quand: 'Alert est sélectionné dans un jeu de 11 variants ; le designer a ouvert le panneau des constats avant d’analyser.',
    regarder: 'Le bouton Analyser est principal ; le bouton Constats n’a pas de pastille ; le panneau montre le résumé « 11 variants, pas encore analysé » et ce que l’analyse lit ; la vue n’a pas de section Variants.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu), { clic: '.bouton-panneau' }],
  },
  {
    id: 'c-replie', titre: 'Composant, panneau fermé', quand: 'Alert est analysé : 19 constats, 11 variants.',
    regarder: 'Le bouton Constats porte la pastille 19, dans la couleur du plus grave ; la section Variants montre les valeurs à constat et la valeur affichée ; Actualiser remplace Analyser ; Configuration n’a que son icône.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu), { message: analyseAlert }],
  },
  {
    id: 'c-bouton-texte', titre: 'Bouton Constats, icône et pastille', quand: 'Un composant sans jeu de variants est analysé : 19 constats.',
    regarder: 'La barre, sans logo ni nom : la bascule, Actualiser, puis Constats avec l’icône du panneau et la pastille 19 mais sans son mot, puis l’engrenage seul.',
    existe: true, atteinte: [...ouvrir(composantSansVariant), { message: analyseSansVariants }],
  },
  {
    id: 'c-gros', titre: 'Composant à 216 variants', quand: 'Button est analysé : 216 variants, 41 constats.',
    regarder: 'Quatre lignes de properties ; seules les valeurs à constat et la valeur affichée ont une puce ; « +N » compte les autres ; la pastille dit 41.',
    existe: true, atteinte: [preferences(), etroite, choisir(enButton()), composant(enButton()), apercu(enButton()), { message: analyseButton }],
  },
  {
    id: 'u1-sans-composant', titre: 'Barre compacte, sélection sans composant', quand: 'Alert a été lu, puis le designer désélectionne tout dans Figma.',
    regarder: 'La barre n’a ni logo ni nom ; Analyser est grisé et sa bulle dit « Sélectionnez un composant dans Figma » ; Constats et Configuration n’ont que leur icône.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu), sansSelection],
  },
  {
    id: 'u1-configuration-vue', titre: 'Configuration, panneau fermé', quand: 'Le designer ouvre la Configuration depuis le mode Composant, panneau des constats fermé.',
    regarder: 'La Configuration prend la place de la vue, à la largeur de la fenêtre ; la bascule reste sur « Composant » ; le bouton Configuration est enfoncé ; les formulaires tiennent sur une colonne.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu), { clic: '.barre .icon-button', attendre: '.config-liste' }],
  },
  {
    id: 'u1-configuration-panneau', titre: 'Configuration, panneau ouvert', quand: 'Le designer ouvre la Configuration depuis le mode Composant, panneau des constats ouvert.',
    regarder: 'La vue reste à gauche ; la Configuration prend la place du panneau, à droite de la frontière ; le bouton Configuration est enfoncé.',
    existe: true, atteinte: [preferences(), etroite, choisir(alertEnJeu), composant(alertEnJeu), apercu(alertEnJeu), { clic: '.bouton-panneau' }, { clic: '.barre .icon-button', attendre: '.config-liste' }],
  },
  { id: 'composant-survol', titre: 'Survol d’une ligne', quand: 'Le pointeur est sur la couleur des tuiles de StressTest.', regarder: 'Douze cadres sur les tuiles de l’aperçu.', existe: true, atteinte: [...ouvrir(stressTest), { clic: '[data-section="couleur"]' }, { survol: "[data-focus^='ligne:components/stresstest/info/tilesgrid/colors/tile']" }] },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS };
