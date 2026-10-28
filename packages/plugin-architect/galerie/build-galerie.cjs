/**
 * Les galeries d'Architect, construites par le banc du socle : une à la taille
 * du mode Tokens, une à sa taille minimale, et une à celle du mode Composant
 * (panneau fermé). Les états de Nomenclature se jouent dans le panneau latéral
 * du mode Tokens.
 *
 * Un cadre `seul` du manifeste (`cadres.json`, `sorte: "seul"`) est une barre
 * latérale sans l'arbre, la table ni la barre de l'application : la maquette
 * la montre ainsi, et le comparateur la mesure à la taille du cadre. Le banc
 * du socle ne connaît pas cette forme ; la galerie d'Architect ajoute à la page
 * de l'état la feuille de style qui la rend. Le champ `masque` du manifeste
 * liste ce que la maquette remplace par un extrait : ces éléments sont cachés,
 * donc absents du relevé. Le champ `extrait` donne la ligne que la maquette
 * écrit à leur place ; elle prend sa place dans la page sans y être un texte,
 * donc sans entrer dans le relevé.
 */
const fs = require('fs');
const path = require('path');
const { construireGalerie, MODES, sortieDe } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const larges = ETATS.filter((etat) => etat.disposition !== 'etroite');
const etroits = ETATS.filter((etat) => etat.disposition === 'etroite');
const GALERIES = [
  { racine, etats: larges, largeur: 1360, hauteur: 800 },
  { racine, etats: larges, largeur: 560, hauteur: 480, dossier: 'galerie-minimale' },
  { racine, etats: etroits, largeur: 500, hauteur: 760, dossier: 'galerie-etroite' },
];

/** La barre latérale couvre la fenêtre : tout le reste de l'application disparaît, et la place de ses bordures avec lui. */
const STYLE_DU_CADRE_SEUL = `<style>
.application > :not(.corps):not(.arch-corps-composant) { display: none !important; }
.corps { display: block !important; }
.corps > :not(.panneau-lateral) { display: none !important; }
.arch-corps-composant { display: block !important; }
.arch-corps-composant > :not(.panneau-lateral) { display: none !important; }
.panneau-lateral { height: 100%; border: 0 !important; }
</style>`;

/** Les cadres que le manifeste déclare `seul`. */
function cadresSeuls() {
  const manifeste = JSON.parse(fs.readFileSync(path.join(__dirname, 'cadres.json'), 'utf8'));
  return manifeste.filter((cadre) => cadre.sorte === 'seul');
}

const feuilleDuCadre = (cadre) => {
  const masque = (cadre.masque ?? []).map((selecteur) => `${selecteur} { display: none !important; }
`).join('');
  const extrait = cadre.extrait ? `${cadre.extrait.dans}::before { content: ${JSON.stringify(cadre.extrait.texte)}; display: block; margin-bottom: 8px; color: var(--texte-second); }
` : '';
  return STYLE_DU_CADRE_SEUL.replace('</style>', () => `${masque}${extrait}</style>`);
};

/** Ajoute la feuille du cadre seul à la page de chaque état concerné, dans chaque mode de couleur. */
function poserLesCadresSeuls(galerie) {
  for (const nom of Object.keys(MODES)) {
    for (const cadre of cadresSeuls()) {
      if (!galerie.etats.some((etat) => etat.id === cadre.cadre)) continue;
      const fichier = path.join(sortieDe(galerie), nom, `${cadre.cadre}.html`);
      const page = fs.readFileSync(fichier, 'utf8');
      fs.writeFileSync(fichier, page.replace('</head>', () => `${feuilleDuCadre(cadre)}</head>`));
    }
  }
}

/**
 * Les états dont le texte porte l'heure de la création de variables, que l'interface lit à la réception du message : la page voit
 * « aujourd'hui à 14:31 », comme la maquette, quelle que soit l'heure de la capture.
 */
const ETATS_A_L_HEURE_FIGEE = ['cf-historique', 'annuler-creation'];
const horlogeFigee = () => {
  const maintenant = new Date();
  maintenant.setHours(14, 31, 0, 0);
  return `<script>{ const Reelle = Date; const figee = ${maintenant.getTime()}; globalThis.Date = class extends Reelle { constructor(...arguments_) { if (arguments_.length === 0) super(figee); else super(...arguments_); } static now() { return figee; } }; }</script>`;
};

module.exports = { GALERIES, STYLE_DU_CADRE_SEUL, cadresSeuls };

if (require.main === module) {
  for (const galerie of GALERIES) {
    construireGalerie(galerie);
    poserLesCadresSeuls(galerie);
    for (const etat of galerie.etats.filter((element) => element.id.startsWith('g-'))) {
      for (const nom of Object.keys(MODES)) {
        const fichier = path.join(sortieDe(galerie), nom, `${etat.id}.html`);
        if (!fs.existsSync(fichier)) continue;
        const page = fs.readFileSync(fichier, 'utf8');
        fs.writeFileSync(fichier, page.replace('</head>', () => '<script>Date.now = () => Date.UTC(2026, 0, 1, 13, 2);</script></head>'));
      }
    }
    for (const id of ETATS_A_L_HEURE_FIGEE) {
      for (const nom of Object.keys(MODES)) {
        const fichier = path.join(sortieDe(galerie), nom, `${id}.html`);
        if (!fs.existsSync(fichier)) continue;
        const page = fs.readFileSync(fichier, 'utf8');
        fs.writeFileSync(fichier, page.replace('</head>', () => `${horlogeFigee()}</head>`));
      }
    }
  }
}
