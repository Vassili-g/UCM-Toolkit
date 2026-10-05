
import type { FamilleDePoint, LogLevel, PluginMessage } from '../../messages';
import { FAMILLES_DE_POINT } from '../../messages';
import { versSandbox } from '../pont';

/** Le point à corriger écrit par le moteur, sans son enveloppe de message. */
export type PointACorriger = Omit<Extract<PluginMessage, { type: 'diagnostic' }>, 'type'>;

/** Ce que le routeur UI peut demander à un compte rendu. */
export interface CompteRenduUi {
  element: HTMLElement;
  /** Une nouvelle analyse efface les points, mais garde les sections que le designer a ouvertes ou repliées. */
  reinitialiser(): void;
  /** Le sujet a changé : les choix d'ouverture du designer ne valent plus pour lui. */
  oublierLesChoix(): void;
  ajouterDiagnostic(point: PointACorriger): void;
  ajouterPublication(texte: string, niveau?: LogLevel): void;
  ajouterLien(libelle: string, url: string): void;
}

/** Les libellés des sections, dans les mots que le designer lit dans Figma. */
const LIBELLES_DE_FAMILLE: Record<FamilleDePoint, string> = {
  disposition: 'Auto layout et disposition',
  proprietes: 'Propriétés et variants',
  imbriques: 'Composants imbriqués et icônes',
  variables: 'Variables à relier',
  styles: 'Styles de texte et d’effets',
  regles: 'Règles d’usage',
  'non-exportes': 'Réglages non exportés',
  fichier: 'Collections et variables du fichier',
};

/** Au plus ce nombre de points non bloquants, ou une seule famille : tout s'ouvre. */
const SEUIL_D_OUVERTURE = 5;

/** Une section du compte rendu : l'en-tête, le corps et ce que l'en-tête résume. */
interface SectionRendue {
  element: HTMLElement;
  bascule: HTMLButtonElement;
  corps: HTMLDivElement;
  compte: HTMLSpanElement;
  resume: HTMLSpanElement;
  points: number;
  calques: Set<string>;
}

/** Donne à chaque compte rendu des identifiants de corps qui ne se heurtent pas. */
let compteursDInstance = 0;

/**
 * Pose un texte dont les passages entre `**` sont en gras.
 *
 * Le moteur écrit ces marques pour la demande de fusion, où elles sont du
 * Markdown. Ici elles deviennent un `<strong>`, sans jamais passer par du HTML :
 * un nombre impair de marques n'en ferme aucune, et le texte reste tel quel.
 */
function ecrireAvecGras(element: HTMLElement, texte: string): void {
  const segments = texte.split('**');
  if (segments.length % 2 === 0) {
    element.textContent = texte;
    return;
  }
  element.replaceChildren(...segments.map((segment, rang) => {
    if (rang % 2 === 0) return document.createTextNode(segment);
    const gras = document.createElement('strong');
    gras.textContent = segment;
    return gras;
  }));
}

/**
 * Rend séparément les corrections Figma et le résultat de publication.
 *
 * Les points bloquants se lisent en tête, hors de toute section. Les autres se
 * rangent sous la ligne du total, une section repliable par famille, dans
 * l'ordre de `FAMILLES_DE_POINT`.
 */
export function createCompteRendu(): CompteRenduUi {
  compteursDInstance += 1;
  const instance = compteursDInstance;

  const section = document.createElement('section');
  section.className = 'compte-rendu';

  section.hidden = true;

  const bloquants = document.createElement('div');
  bloquants.className = 'groupe-liste';
  bloquants.hidden = true;

  const total = document.createElement('div');
  total.className = 'barre-du-total';
  total.hidden = true;
  const totalTexte = document.createElement('span');
  const toutBascule = document.createElement('button');
  toutBascule.type = 'button';
  toutBascule.className = 'bouton-discret';
  total.append(totalTexte, toutBascule);

  const sections = document.createElement('div');
  sections.className = 'sections';

  const publication = document.createElement('div');
  publication.className = 'groupe-liste';
  publication.hidden = true;

  section.append(bloquants, total, sections, publication);

  const rendues = new Map<FamilleDePoint, SectionRendue>();
  let nonBloquants = 0;
  // Les choix du designer : une section précise, ou toutes d'un coup. Un clic
  // sur « Tout déplier » remplace les choix par section.
  const choix = new Map<FamilleDePoint, boolean>();
  let choixDeTout: boolean | null = null;

  function ouvertParDefaut(): boolean {
    return nonBloquants <= SEUIL_D_OUVERTURE || rendues.size === 1;
  }

  function estOuverte(famille: FamilleDePoint): boolean {
    return choix.get(famille) ?? choixDeTout ?? ouvertParDefaut();
  }

  function rafraichir() {
    for (const [famille, rendue] of rendues) {
      const ouverte = estOuverte(famille);
      rendue.element.dataset.ouverte = String(ouverte);
      rendue.bascule.setAttribute('aria-expanded', String(ouverte));
      rendue.corps.hidden = !ouverte;
      rendue.compte.textContent = String(rendue.points);
      rendue.resume.textContent = [...rendue.calques].join(', ');
      rendue.resume.hidden = ouverte || rendue.calques.size === 0;
    }
    total.hidden = rendues.size === 0;
    if (rendues.size === 0) return;
    const points = `${nonBloquants} ${nonBloquants === 1 ? 'point' : 'points'}`;
    const types = `${rendues.size} ${rendues.size === 1 ? 'type' : 'types'}`;
    totalTexte.textContent = `À corriger dans Figma · ${points}, ${types}`;
    const toutesOuvertes = [...rendues.keys()].every(estOuverte);
    // Sous le seuil, le geste ne paraît qu'une fois une section repliée par le designer.
    toutBascule.hidden = rendues.size < 2 || (ouvertParDefaut() && toutesOuvertes);
    toutBascule.textContent = toutesOuvertes ? 'Tout replier' : 'Tout déplier';
  }

  toutBascule.addEventListener('click', () => {
    const toutesOuvertes = [...rendues.keys()].every(estOuverte);
    choix.clear();
    choixDeTout = !toutesOuvertes;
    rafraichir();
  });

  /** La section d'une famille, créée à la première arrivée et rangée dans l'ordre fixe. */
  function sectionDe(famille: FamilleDePoint): SectionRendue {
    const existante = rendues.get(famille);
    if (existante) return existante;

    const element = document.createElement('section');
    element.className = 'section';
    element.dataset.famille = famille;

    const corps = document.createElement('div');
    corps.className = 'section-corps';
    corps.id = `corps-${instance}-${famille}`;

    const bascule = document.createElement('button');
    bascule.type = 'button';
    bascule.className = 'section-bascule';
    bascule.setAttribute('aria-controls', corps.id);
    const chevron = document.createElement('span');
    chevron.className = 'carte-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    bascule.append(chevron, document.createTextNode(LIBELLES_DE_FAMILLE[famille]));
    bascule.addEventListener('click', () => {
      // Le clic fixe cette section, d'après ce que le designer voit.
      choix.set(famille, !estOuverte(famille));
      rafraichir();
    });

    const titre = document.createElement('h3');
    titre.className = 'section-titre';
    titre.append(bascule);
    const compte = document.createElement('span');
    compte.className = 'section-compte';
    const resume = document.createElement('span');
    resume.className = 'section-resume';
    const tete = document.createElement('div');
    tete.className = 'section-tete';
    tete.append(titre, compte, resume);
    element.append(tete, corps);

    const rendue: SectionRendue = { element, bascule, corps, compte, resume, points: 0, calques: new Set() };
    const suivante = FAMILLES_DE_POINT
      .slice(FAMILLES_DE_POINT.indexOf(famille) + 1)
      .map((autre) => rendues.get(autre)?.element)
      .find((candidate) => candidate !== undefined);
    sections.insertBefore(element, suivante ?? null);
    rendues.set(famille, rendue);
    return rendue;
  }

  function ajouterEntree(noeud: Node) {
    section.hidden = false;
    publication.hidden = false;
    publication.appendChild(noeud);
  }

  /**
   * Une carte, pas un paragraphe technique.
   *
   * Quatre parties, dans l'ordre où on les lit : une pastille « Bloquant » sur
   * la seule carte bloquante, un titre qui nomme l'élément Figma et le manque,
   * la conséquence pour le développeur, puis le geste à faire. Les trois dernières viennent du
   * moteur découpées ; rien n'est redécoupé ici, et rien n'est réécrit.
   *
   * **Elle n'empile pas les signaux.** La pastille et le fond discret portent la
   * sévérité ; le poids et la position portent la hiérarchie. Le rouge n'entre
   * pas dans cette carte : il est réservé à l'impossibilité d'exporter, qui vit
   * dans le verdict de rang 1.
   *
   * **Le lien vers Figma est un bouton distinct.** Rendre toute la carte
   * cliquable ferait d'un bloc de trois phrases une cible unique, dont rien ne
   * dit ce que le clic déclenche. Le bouton n'apparaît que si le moteur a passé
   * au moins un node : un message sans `nodeIds` nomme un text style, une
   * variable, ou un calque agrégé sur toute la matrice, et le moteur a déclaré
   * pourquoi.
   *
   * Un bouton, pas un lien : il n'y a pas d'URL, et un `<a href>` factice
   * mentirait au clavier comme au lecteur d'écran.
   */
  function creerDiagnostic(point: PointACorriger): HTMLDivElement {
    // Un point `danger` dit que le contrat décrit déjà le composant de travers.
    // Il se distingue au premier coup d'œil, la pile pouvant en porter un parmi
    // des avertissements qui, eux, laissent le contrat exact.
    const grave = point.severite === 'danger';
    const carte = document.createElement('div');
    carte.className = 'carte carte-avertissement';
    if (grave) carte.className = 'carte carte-danger';

    const titre = document.createElement('p');
    titre.className = 'carte-titre';
    ecrireAvecGras(titre, point.titre);

    // La section dit déjà qu'un point est à corriger : seule la carte bloquante
    // porte une pastille, parce que sa sévérité diffère de celle de ses voisines.
    if (grave) {
      const pastille = document.createElement('span');
      pastille.className = 'pastille pastille-danger';
      pastille.textContent = 'Bloquant';
      carte.append(pastille);
    }
    carte.append(titre);

    // Une liste quand le moteur en a passé une : sept propriétés énumérées dans
    // une phrase ne se relèvent plus une à une dans Figma. Le moteur décide ce
    // qu'elle contient, et son titre l'annonce ; rien n'est découpé ici.
    if (point.elements && point.elements.length > 0) {
      const liste = document.createElement('ul');
      liste.className = 'carte-liste';
      for (const element of point.elements) {
        const ligne = document.createElement('li');
        ligne.textContent = element;
        liste.appendChild(ligne);
      }
      carte.appendChild(liste);
    }

    if (point.impact) {
      const impact = document.createElement('p');
      impact.className = 'carte-impact';
      ecrireAvecGras(impact, point.impact);
      carte.appendChild(impact);
    }

    if (point.action) {
      const action = document.createElement('p');
      action.className = 'carte-action';
      ecrireAvecGras(action, point.action);
      carte.appendChild(action);
    }

    if (point.nodeIds && point.nodeIds.length > 0) {
      const nodeIds = point.nodeIds;
      const versLesCalques = document.createElement('button');
      versLesCalques.type = 'button';
      versLesCalques.className = 'btn btn-secondary carte-lien';
      // Le nombre dit au designer que le même geste vaut pour plusieurs
      // calques, que le titre, qui ne nomme qu'un nom, ne distingue pas.
      versLesCalques.textContent = nodeIds.length === 1
        ? 'Sélectionner le calque'
        : `Sélectionner les ${nodeIds.length} calques`;
      // Seul le sandbox peut poser une sélection : on lui délègue, comme pour
      // l'ouverture d'un lien externe.
      versLesCalques.addEventListener('click', () => {
        versSandbox({ type: 'montrer-les-calques', nodeIds });
      });
      carte.appendChild(versLesCalques);
    }

    return carte;
  }

  function creerLignePublication(texte: string, niveau: LogLevel): HTMLParagraphElement {
    const entree = document.createElement('p');
    entree.className = `entree entree-publication entree-${niveau}`;
    entree.textContent = texte;
    return entree;
  }

  return {
    element: section,
    /** Un export qui commence efface le compte rendu du précédent, pas la cible. */
    reinitialiser() {
      bloquants.hidden = true;
      bloquants.replaceChildren();
      sections.replaceChildren();
      rendues.clear();
      nonBloquants = 0;
      rafraichir();
      publication.hidden = true;
      publication.replaceChildren();
      section.hidden = true;
    },
    oublierLesChoix() {
      choix.clear();
      choixDeTout = null;
    },
    /** `point` est ce que le moteur a écrit : titre, impact, action, nodes. */
    ajouterDiagnostic(point: PointACorriger) {
      section.hidden = false;
      const carte = creerDiagnostic(point);
      if (point.severite === 'danger') {
        bloquants.hidden = false;
        bloquants.appendChild(carte);
        return;
      }
      // Un point sans famille connue ne devrait pas arriver : il se range avec le fichier.
      const famille = FAMILLES_DE_POINT.includes(point.famille) ? point.famille : 'fichier';
      const rendue = sectionDe(famille);
      rendue.corps.appendChild(carte);
      rendue.points += 1;
      if (point.calque) rendue.calques.add(point.calque);
      nonBloquants += 1;
      rafraichir();
    },
    ajouterPublication(texte: string, niveau: LogLevel = 'info') {
      ajouterEntree(creerLignePublication(texte, niveau));
    },
    /** Le lien de la demande est une sortie, pas une ligne de texte. */
    ajouterLien(libelle: string, url: string) {
      const lien = document.createElement('a');
      lien.className = 'entree entree-lien';
      lien.href = url;
      lien.textContent = libelle;
      // Seul le sandbox Figma sait ouvrir le navigateur : on lui délègue.
      lien.addEventListener('click', (evenement) => {
        evenement.preventDefault();
        parent.postMessage({ pluginMessage: { type: 'open-external', url } }, '*');
      });
      ajouterEntree(lien);
    },
  };
}
