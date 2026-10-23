/**
 * Les états du domaine `bibliotheque` : le fichier des composants, qui n'a aucune variable locale, montre la library Intencial Tokens.
 * Le relevé vide déclenche la lecture des noms (demande 1 de ce domaine, numérotée à part) ; le groupe `primary` de `theme` s'ouvre alors,
 * et ses valeurs s'importent à son ouverture (demande 3, après celle de la première collection), suivies de leurs cibles (demande 4).
 * Le bilan de Nomenclature donne la demande 1 de la frontière, et la liste des termes de Règles les demandes 2 et 3.
 */
const { releveVide, library, bilans, messages } = require('../bibliotheque/donnees.cjs');
const { preferences, releve, groupe, chevron } = require('./aide.cjs');

/** Neuf valeurs sur treize sont lues : les quatre dernières restent en attente. */
const LUES = 9;

const bibliotheque = (cleDuFichierDesTokens) => [
  preferences(), releve(releveVide()),
  { message: messages.initial(true) }, { message: messages.bilan(1, { ...bilans.travail, sansVariableLocale: true }), attendre: '.liste' },
  { message: messages.termesAvecNoms(2), attendre: '.ligne-terme' },
  { message: library.noms(1, cleDuFichierDesTokens), attendre: '.arbre-choix' },
  { message: messages.termesAvecNoms(3) },
  { message: library.sansValeur(2) },
  chevron('primitives'), chevron('theme'), groupe('theme', 'primary'),
  { message: library.valeursDePrimary(3, LUES) },
  { message: library.valeursDesCibles(4, LUES), attendre: '.alias' },
];

const ETATS = [
  {
    id: 't-bibliotheque', titre: 'Tokens, library lue depuis le fichier des composants', quand: 'Le fichier n’a aucune variable locale : le plugin lit la library Intencial Tokens et le designer ouvre le groupe primary du thème.',
    regarder: 'Le surtitre de l’arbre dit « Library Intencial Tokens » ; neuf valeurs sur treize sont lues, les quatre dernières sont un trait gris ; Corrections, Questions et À faire dans Figma sont grisés, Règles est ouvert ; l’alerte d’information dit que les variables se renomment dans le fichier des tokens, avec le lien « Ouvrir Intencial Tokens ».',
    existe: true,
    atteinte: bibliotheque('TOKENS123'),
  },
  {
    id: 'bibliotheque-sans-cle', titre: 'Tokens, library sans clé du fichier des tokens', quand: 'Figma ne sert pas la clé du fichier des tokens : le plugin ne sait pas l’ouvrir.',
    regarder: 'L’alerte garde son titre et son texte, sans le lien « Ouvrir Intencial Tokens ».',
    existe: true,
    atteinte: bibliotheque(null),
  },
];

module.exports = { ETATS };
