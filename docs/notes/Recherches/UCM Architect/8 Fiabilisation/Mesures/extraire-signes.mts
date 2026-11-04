// Écrit galerie/signes.js : les signes du kit (`SIGNES`), le signe de chaque section du mode Composant, les icônes des types de terme
// de Nomenclature et les icônes des cinq types d'alerte, pour la section des icônes de MAQUETTE-FIABILISATION.html.
// Les deux dernières se posent dans un document minimal : elles ne demandent que createElement, setAttribute et append.
// Lancer depuis la racine du dépôt : `npx tsx "docs/notes/Recherches/UCM Architect/8 Fiabilisation/Mesures/extraire-signes.mts"`.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

class Noeud {
  attributs = new Map<string, string>();
  enfants: Noeud[] = [];
  classes = new Set<string>();
  constructor(readonly balise: string) {}
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  append(...enfants: Noeud[]): void { this.enfants.push(...enfants); }
  set className(valeur: string) { this.classes = new Set(valeur.split(' ').filter(Boolean)); }
  set title(valeur: string) { this.attributs.set('title', valeur); }
  classList = {
    add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)),
    toggle: (nom: string, oui: boolean) => (oui ? this.classes.add(nom) : this.classes.delete(nom)),
  };
  get outerHTML(): string {
    const attributs = [...(this.classes.size ? [['class', [...this.classes].join(' ')]] : []), ...this.attributs]
      .map(([nom, valeur]) => ` ${nom}="${valeur.replace(/"/g, '&quot;')}"`).join('');
    return `<${this.balise}${attributs}>${this.enfants.map((enfant) => enfant.outerHTML).join('')}</${this.balise}>`;
  }
}
(globalThis as unknown as { document: unknown }).document = {
  createElement: (balise: string) => new Noeud(balise),
  createElementNS: (_espace: string, balise: string) => new Noeud(balise),
};

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const { FAMILLES_DE_SIGNES, REPRISES_DE_SIGNES, SIGNES, svgDuSigne } = await import(pathToFileURL(path.join(racine, 'packages/kit/src/referentiel/signes.ts')).href);
const { TYPES_D_ALERTE } = await import(pathToFileURL(path.join(racine, 'packages/kit/src/referentiel/index.ts')).href);
const { SIGNE_DE_L_ELEMENT } = await import(pathToFileURL(path.join(racine, 'packages/plugin-architect/src/ui/panneau/elements.ts')).href);
const { creerIconeDeType } = await import(pathToFileURL(path.join(racine, 'packages/plugin-architect/src/ui/nomenclature/icones.ts')).href);
const { creerIcone } = await import(pathToFileURL(path.join(racine, 'packages/plugin-socle/src/ui/Alerte.ts')).href);

const TYPES_DE_TERME = ['a-trancher', 'remplace', 'conforme', 'sans-regle', 'composant', 'palette'];

const donnees = {
  familles: FAMILLES_DE_SIGNES,
  reprises: REPRISES_DE_SIGNES,
  signes: SIGNES.map((s: { id: string; famille: string; libelle: string; sens: string }) => ({ id: s.id, famille: s.famille, libelle: s.libelle, sens: s.sens, svg: svgDuSigne(s.id, 15) })),
  elements: SIGNE_DE_L_ELEMENT,
  termes: TYPES_DE_TERME.map((type) => ({ type, html: creerIconeDeType(type).outerHTML })),
  alertes: TYPES_D_ALERTE.map((t: { id: string; libelle: string }) => ({ id: t.id, libelle: t.libelle, html: creerIcone(t.id).outerHTML })),
};
const sortie = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../galerie/signes.js');
writeFileSync(sortie, `// Généré par Mesures/extraire-signes.mts depuis le kit et Architect ; ne pas modifier à la main.\nwindow.SIGNES_DU_KIT = ${JSON.stringify(donnees)};\n`);
console.log(`signes.js : ${donnees.signes.length} signes, ${donnees.termes.length} types de terme, ${donnees.alertes.length} types d'alerte`);
