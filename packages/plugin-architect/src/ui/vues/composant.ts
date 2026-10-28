/**
 * La vue composant : le composant que le designer sélectionne dans Figma, et
 * ses tokens. Une ligne par token ou par style de texte, groupée par nature ;
 * la chaîne d'alias se déplie à la demande.
 *
 * Le dessin est celui de la fenêtre du plugin dans
 * MAQUETTE-VUE-COMPOSANT.html. La vue indexe le relevé que porte chaque
 * lecture : elle ne dépend pas du relevé du fichier, et s'affiche seule dans
 * un fichier sans variable locale.
 *
 * La vue suit la sélection. Un calque sélectionné sous le composant déjà lu
 * change la portée sans relecture ; un autre composant déclenche une lecture.
 * Ouvrir un composant imbriqué empile le composant quitté, que le fil
 * d'Ariane rend sans relecture.
 *
 * Un autre variant du même jeu ne remplace pas l'écran. L'ancienne lecture
 * reste affichée sous une barre fine pendant la lecture ; à l'arrivée, l'en-tête,
 * la section Variants et les lignes dont la clé existe encore gardent leurs
 * nœuds, et seul leur contenu change. Les sections, le filtre et le défilement
 * restent. Un nouveau composant garde l'écran « Lecture du composant… ».
 */
import {
  SEUIL_DE_REPLI,
  compteDesLiaisons,
  filtrer,
  frontieresDe,
  lignesDe,
  modesNommes,
  natureDe,
  porteeDe,
  resumeDe,
  sectionsDe,
  type LectureDeComposant,
  type LigneDeComposant,
  type Nature,
  type SectionDeComposant,
} from '../../composant';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { creerChemin } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerSigne } from 'ucm-plugin-socle/src/ui/Signe';
import { indexer, type Index } from '../../indexation';
import type { PluginMessage, SujetSelectionne } from '../../messages';
import { espaceDuReleve, texteDeValeur, type Couleur } from '../../modele';
import { versSrgb } from '../../espace';
import type { Resultat } from '../../resolution';
import type { Application, Composant } from '../application';
import { constatDeResultat } from '../chaine';
import { analyseDe } from '../composant/analyse';
import { signeDeLigne, signeDuTitre } from '../composant/signes';
import { creerSectionVariants } from '../composant/variants';
import type { ApercuRecu } from '../etat';
import { versSandbox } from '../pont';
import { copierTexte } from '../pressePapiers';
import { TEXTES } from '../textes';
import { couleurCss } from '../valeurs';

const T = TEXTES.composant;

/** La place de l'image dans la zone d'aperçu, en pixels. */
const LARGEUR_DE_LAPERCU = 310;
const HAUTEUR_DE_LAPERCU = 170;

const SVG = 'http://www.w3.org/2000/svg';

/** Une correction cochée dans le panneau : la liaison de `avant` passe à `apres` sur ces layers. */
export interface CorrectionAffichee {
  readonly calques: readonly string[];
  readonly avant: string;
  readonly apres: string;
}

export interface VueComposant extends Composant {
  /**
   * Les liaisons que les corrections cochées vont changer : la ligne montre le
   * nom d'après, ses segments nouveaux en vert. Un clic sur un segment appelle
   * `auClic` ; la vue ne change jamais la sélection.
   */
  poserLesCorrections(corrections: readonly CorrectionAffichee[], auClic: (calques: readonly string[]) => void): void;
  /** Les layers que le plugin vient de sélectionner dans Figma au clic sur un constat : l'aperçu les entoure d'un trait de 1 px, jusqu'à la sélection suivante. */
  poserLaSelectionDuPlugin(calques: readonly string[]): void;
  /** La sélection de Figma a changé : la vue suit, si elle est visible. */
  recevoirSelection(sujet: SujetSelectionne | null, ignores: number): void;
  recevoirLecture(demande: number, lecture: LectureDeComposant | null): void;
  recevoirApercu(message: Extract<PluginMessage, { type: 'apercu-du-composant' }>): void;
  /** Rend vrai quand l'échec est celui de la lecture attendue. */
  recevoirEchec(demande: number, message: string): boolean;
  /** La vue devient visible : elle lit le composant de la sélection si elle ne l'affiche pas. */
  activer(): void;
}

const motDeLibelle = (libelle: string): string => T.libelles[libelle] ?? libelle;

/** Vrai quand une couleur est assez claire pour porter une encre sombre. */
const estClaire = (couleur: Couleur, espace: ReturnType<typeof espaceDuReleve>): boolean => {
  const affichee = versSrgb(couleur, espace).couleur;
  return (affichee.r * 299 + affichee.g * 587 + affichee.b * 114) * 0.255 > 150;
};

function icone(largeur: number, tracer: (svg: SVGSVGElement) => void): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(largeur));
  svg.setAttribute('height', String(largeur));
  svg.setAttribute('viewBox', `0 0 ${largeur} ${largeur}`);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('aria-hidden', 'true');
  tracer(svg);
  return svg;
}

function trace(svg: SVGSVGElement, balise: 'path' | 'circle', attributs: Record<string, string>): void {
  const forme = document.createElementNS(SVG, balise);
  for (const [nom, valeur] of Object.entries(attributs)) forme.setAttribute(nom, valeur);
  svg.append(forme);
}

/** Le nœud d'une ligne de token, qui survit aux dessins tant que la clé de la ligne existe. */
interface EntreeDeLigne {
  readonly token: HTMLElement;
  readonly bouton: HTMLElement;
  /** Le texte et l'aspect de la ligne au dernier remplissage : un dessin identique laisse les nœuds intérieurs en place. */
  signature: string;
  valeur: string;
  fois: string;
  /** Le même emplacement dans le composant, d'un variant à l'autre : nature, libellés et noms de layers. */
  emplacement: string;
}

/** Remplit `ancien` du contenu de `frais` et le rend ; sans `ancien`, rend `frais`. */
function garder(ancien: HTMLElement | null, frais: HTMLElement): HTMLElement {
  if (!ancien) return frais;
  ancien.className = frais.className;
  ancien.replaceChildren(...Array.from(frais.childNodes));
  return ancien;
}

/** Deux lectures d'un même jeu portent la même liste de variants, dans le même ordre. */
const memeListeDeVariants = (a: LectureDeComposant, b: LectureDeComposant): boolean =>
  a.sujet.variants.length > 1 && a.sujet.nom === b.sujet.nom && a.sujet.variants.length === b.sujet.variants.length && a.sujet.variants.every((variant, rang) => variant.id === b.sujet.variants[rang].id);

export function creerVueComposant(app: Application): VueComposant {
  const { etat } = app;
  const espace = (): ReturnType<typeof espaceDuReleve> => etat.index ? espaceDuReleve(etat.index.releve) : 'srgb';
  const c = etat.composant;

  const element = document.createElement('div');
  element.className = 'vc';
  const corps = document.createElement('div');
  corps.className = 'vc-corps';
  const pied = document.createElement('div');
  pied.className = 'vc-pied';
  element.append(corps, pied);

  // Ce que le designer a ouvert ou saisi ; tout retombe quand le sujet change.
  let ouverts = new Set<string>();
  let sections = new Map<Nature, boolean>();
  let directesOuvertes = false;
  /** Les choix de la section Variants : ils survivent au changement de variant, pas à celui de jeu. */
  let proprietesDepliees = new Set<string>();
  let corrections: readonly CorrectionAffichee[] = [];
  let selectionDuPlugin: readonly string[] = [];
  let auClicDeCorrection: (calques: readonly string[]) => void = () => {};
  let filtre = '';
  let filtreOuvert = false;
  /** L'élément à qui rendre le focus après un rendu, par son `data-focus`. */
  let focusAttendu: string | null = null;
  /** La ligne à faire défiler dans la vue après un rendu. */
  let aMontrer: string | null = null;
  let lignes: LigneDeComposant[] = [];
  let cadres: HTMLElement | null = null;
  let liste: HTMLElement | null = null;

  // Ce que la vue garde d'un dessin à l'autre : ses nœuds, par clé, et ce qui sépare un changement de variant d'un nouveau composant.
  /** Vrai quand la lecture attendue est celle d'un autre variant du jeu affiché : l'ancienne lecture reste à l'écran. */
  let lectureDuJeu = false;
  /** Le variant que le designer vient de choisir dans la section Variants, tant que sa lecture court. */
  let variantDemande: { readonly id: string; readonly nom: string } | null = null;
  /** Vrai pour le dessin qui suit l'arrivée d'un autre variant du même jeu : ce qui change dans une ligne est surligné. */
  let changementDeVariant = false;
  let teteAffichee: HTMLElement | null = null;
  let variantsAffiches: HTMLElement | null = null;
  let barreDeLecture: HTMLElement | null = null;
  const entreesDeLignes = new Map<string, EntreeDeLigne>();
  /** L'aperçu que la zone montre : la cible `c.apercu` le remplace une fois son image chargée. */
  let zone: { readonly zone: HTMLElement; readonly echelle: HTMLElement; readonly image: HTMLImageElement } | null = null;
  let apercuAffiche: ApercuRecu | null = null;
  let prechargeEnCours: string | null = null;

  const visible = (): boolean => etat.disposition === 'etroite';
  const racineDe = (lecture: LectureDeComposant): string => lecture.calques[0]?.id ?? lecture.sujet.id;

  function oublierLesChoix(): void {
    ouverts = new Set();
    sections = new Map();
    directesOuvertes = false;
    filtre = '';
    filtreOuvert = false;
  }

  function liberer(apercu: ApercuRecu | null): void {
    if (apercu) URL.revokeObjectURL(apercu.url);
  }

  /** L'aperçu de la zone n'est plus le bon : il se libère s'il n'est plus `c.apercu`, et la zone se refait au prochain dessin. */
  function oublierLApercuAffiche(): void {
    if (apercuAffiche && apercuAffiche !== c.apercu) liberer(apercuAffiche);
    apercuAffiche = null;
    prechargeEnCours = null;
    zone = null;
  }

  /** Rend la vue à zéro : aucun nœud ne passe d'un composant à l'autre. */
  function oublierLesNoeuds(): void {
    teteAffichee = null;
    variantsAffiches = null;
    liste = null;
    entreesDeLignes.clear();
    oublierLApercuAffiche();
  }

  function viderLaPile(): void {
    for (const quitte of c.pile) liberer(quitte.apercu);
    c.pile = [];
  }

  function annulerLaLectureEnCours(): void {
    if (c.statut === 'en-cours') versSandbox({ type: 'annuler', demande: c.demande });
  }

  /**
   * Demande une lecture ; la précédente, si elle court encore, est annulée.
   * `variant` nomme l'autre variant du jeu affiché que la section Variants
   * vient de choisir : l'ancienne lecture reste alors à l'écran jusqu'à la réponse.
   */
  function demander(calque: string | null, empiler: boolean, variant: { readonly id: string; readonly nom: string } | null = null): void {
    annulerLaLectureEnCours();
    c.demande = app.nouvelleDemande();
    c.statut = 'en-cours';
    c.empiler = empiler;
    c.deLaSelection = calque === null;
    lectureDuJeu = variant !== null && c.lecture !== null && c.index !== null && c.portee !== null && !empiler;
    variantDemande = lectureDuJeu ? variant : null;
    versSandbox({ type: 'lire-composant', demande: c.demande, calque });
    rendre();
  }

  /** Revient au composant de rang `rang` dans la pile, sans relecture. */
  function depiler(rang: number): void {
    const retrouve = c.pile[rang];
    oublierLesNoeuds();
    liberer(c.apercu);
    for (const quitte of c.pile.slice(rang + 1)) liberer(quitte.apercu);
    c.pile = c.pile.slice(0, rang);
    c.lecture = retrouve.lecture;
    c.index = retrouve.index;
    c.apercu = retrouve.apercu;
    c.portee = racineDe(retrouve.lecture);
    c.statut = 'lu';
    oublierLesChoix();
  }

  function suivreLaSelection(): void {
    if (!visible()) return;
    const sujet = c.selection;
    if (!sujet) {
      annulerLaLectureEnCours();
      viderLaPile();
      oublierLesNoeuds();
      liberer(c.apercu);
      Object.assign(c, { statut: 'vide', lecture: null, index: null, portee: null, apercu: null });
      rendre();
      return;
    }
    // Le sujet est déjà en mémoire : la portée change, rien ne se relit.
    const rang = c.pile.findIndex((quitte) => quitte.lecture.sujet.id === sujet.id);
    const affiche = c.lecture?.sujet.id === sujet.id;
    if ((affiche || rang !== -1) && c.lecture && c.statut !== 'echouee') {
      annulerLaLectureEnCours();
      lectureDuJeu = false;
      variantDemande = null;
      if (!affiche) depiler(rang);
      c.statut = 'lu';
      c.portee = c.lecture.calques.some((calque) => calque.id === sujet.portee) ? sujet.portee : racineDe(c.lecture);
      rendre();
      return;
    }
    viderLaPile();
    demander(null, false);
  }

  // Les éléments de la vue.

  function vide(texte: string, avecPictogramme: boolean): HTMLElement {
    const bloc = document.createElement('div');
    bloc.className = 'vc-vide';
    const centre = document.createElement('div');
    if (avecPictogramme) centre.append(icone(44, (svg) => {
      svg.setAttribute('stroke-dasharray', '3 3');
      trace(svg, 'path', { d: 'M22 4 40 22 22 40 4 22Z' });
    }));
    const phrase = document.createElement('p');
    phrase.textContent = texte;
    centre.append(phrase);
    bloc.append(centre);
    return bloc;
  }

  function filDAriane(lecture: LectureDeComposant, portee: string): HTMLElement | null {
    const racine = racineDe(lecture);
    const base = c.pile[0]?.lecture ?? lecture;
    const miettes: Array<{ nom: string; cle: string; aller?: () => void }> = [];
    for (const ancetre of base.ancetres) {
      miettes.push({ nom: ancetre.nom, cle: `ancetre:${ancetre.id}`, aller: () => {
        viderLaPile();
        demander(ancetre.id, false);
      } });
    }
    c.pile.forEach((quitte, rang) => miettes.push({ nom: quitte.lecture.sujet.nom, cle: `pile:${rang}`, aller: () => {
      depiler(rang);
      focusAttendu = null;
      rendre();
    } }));
    if (portee === racine) miettes.push({ nom: lecture.sujet.nom, cle: 'sujet' });
    else {
      miettes.push({ nom: lecture.sujet.nom, cle: 'sujet', aller: () => {
        c.portee = racine;
        rendre();
      } });
      miettes.push({ nom: lecture.calques.find((calque) => calque.id === portee)?.nom ?? portee, cle: 'portee' });
    }
    if (miettes.length < 2) return null;
    const fil = document.createElement('nav');
    fil.className = 'vc-fil';
    fil.setAttribute('aria-label', T.filDAriane);
    for (const miette of miettes) {
      if (!miette.aller) {
        const courante = document.createElement('span');
        courante.textContent = miette.nom;
        fil.append(courante);
        continue;
      }
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.textContent = miette.nom;
      bouton.dataset.focus = `miette:${miette.cle}`;
      bouton.addEventListener('click', miette.aller);
      const separateur = document.createElement('span');
      separateur.setAttribute('aria-hidden', 'true');
      separateur.textContent = T.glyphes.miette;
      fil.append(bouton, separateur);
    }
    return fil;
  }

  function entete(lecture: LectureDeComposant, index: Index, portee: string): HTMLElement {
    const surLeSujet = portee === racineDe(lecture);
    const tete = document.createElement('div');
    tete.className = 'vc-tete';
    const identite = document.createElement('div');
    const titre = document.createElement('h2');
    const calqueVise = lecture.calques.find((calque) => calque.id === portee);
    titre.append(creerSigne(signeDuTitre(surLeSujet, calqueVise?.type)), surLeSujet ? lecture.sujet.nom : lecture.calques.find((calque) => calque.id === portee)?.nom ?? portee);
    const sous = document.createElement('div');
    sous.className = 'vc-sous';
    // Un jeu de variants n'écrit pas son variant ici : la section Variants le choisit et le nomme.
    if (surLeSujet && lecture.sujet.variants.length <= 1 && lecture.sujet.variant !== null) {
      const variant = document.createElement('span');
      variant.textContent = lecture.sujet.variant;
      sous.append(variant);
    }
    for (const mode of modesNommes(index, lignes)) {
      const pastille = document.createElement('span');
      pastille.className = 'vc-mode';
      pastille.textContent = mode;
      sous.append(pastille);
    }
    identite.append(titre, sous);
    tete.append(identite);
    if (lignes.length === 0) return tete;

    const outils = document.createElement('div');
    outils.className = 'vc-outils';
    const chercher = document.createElement('button');
    chercher.type = 'button';
    chercher.className = 'vc-icone';
    chercher.dataset.focus = 'outil:filtre';
    chercher.setAttribute('aria-pressed', String(filtreOuvert));
    chercher.setAttribute('aria-label', T.filtrer);
    chercher.title = T.filtrer;
    chercher.append(icone(13, (svg) => {
      trace(svg, 'circle', { cx: '5.5', cy: '5.5', r: '4' });
      trace(svg, 'path', { d: 'm8.5 8.5 3.5 3.5' });
    }));
    chercher.addEventListener('click', () => {
      filtreOuvert = !filtreOuvert;
      filtre = '';
      focusAttendu = filtreOuvert ? 'filtre' : 'outil:filtre';
      rendre();
    });
    const tout = document.createElement('button');
    tout.type = 'button';
    tout.className = 'vc-icone';
    tout.dataset.focus = 'outil:tout';
    tout.setAttribute('aria-label', T.toutDeplier);
    tout.title = T.toutDeplier;
    tout.append(creerChevron(lignes.length > SEUIL_DE_REPLI ? 'replie' : 'ouvert'));
    tout.addEventListener('click', () => {
      const toutes = sectionsDe(lignes);
      if (toutes.some((section) => !sectionOuverte(section.nature))) for (const section of toutes) sections.set(section.nature, true);
      else {
        ouverts = new Set();
        sections = new Map();
      }
      focusAttendu = 'outil:tout';
      rendre();
    });
    outils.append(chercher, tout);
    tete.append(outils);
    return tete;
  }

  /** Les cadres des calques dont la boîte coupe l'image, réduits du même facteur qu'elle. */
  function poserLesCadres(calques: readonly string[], genre: 'survol' | 'portee' | 'selection'): void {
    const { lecture } = c;
    const apercu = apercuAffiche ?? c.apercu;
    if (!cadres || !lecture || !apercu) return;
    const facteur = Math.min(1, LARGEUR_DE_LAPERCU / apercu.largeur, HAUTEUR_DE_LAPERCU / apercu.hauteur);
    const voulus = new Set(calques);
    for (const calque of lecture.calques) {
      if (!voulus.has(calque.id) || !calque.boite) continue;
      const x = calque.boite.x - apercu.origine.x;
      const y = calque.boite.y - apercu.origine.y;
      if (x >= apercu.largeur || y >= apercu.hauteur || x + calque.boite.largeur <= 0 || y + calque.boite.hauteur <= 0) continue;
      const cadre = document.createElement('div');
      cadre.className = 'vc-cadre';
      cadre.classList.toggle('vc-cadre-portee', genre === 'portee');
      cadre.classList.toggle('vc-cadre-selection', genre === 'selection');
      cadre.style.left = `${x * facteur}px`;
      cadre.style.top = `${y * facteur}px`;
      cadre.style.width = `${calque.boite.largeur * facteur}px`;
      cadre.style.height = `${calque.boite.hauteur * facteur}px`;
      cadres.append(cadre);
    }
  }

  function retirerLesCadresDeSurvol(): void {
    if (!cadres) return;
    for (const cadre of Array.from(cadres.children)) if (cadre.classList.contains('vc-cadre') && !cadre.classList.contains('vc-cadre-portee') && !cadre.classList.contains('vc-cadre-selection')) cadre.remove();
  }

  /** Montre `cible` à la place de l'aperçu affiché, et libère l'ancien. */
  function afficherLApercu(cible: ApercuRecu): void {
    const ancien = apercuAffiche;
    apercuAffiche = cible;
    prechargeEnCours = null;
    if (ancien && ancien !== cible && ancien !== c.apercu) liberer(ancien);
  }

  /** L'image d'un autre aperçu se charge hors de la page ; la zone ne la montre qu'une fois chargée, pour garder l'ancienne entre-temps. */
  function precharger(cible: ApercuRecu): void {
    if (prechargeEnCours === cible.url) return;
    if (typeof Image === 'undefined') {
      afficherLApercu(cible);
      return;
    }
    prechargeEnCours = cible.url;
    const essai = new Image();
    const fini = (): void => {
      if (prechargeEnCours !== cible.url || c.apercu?.url !== cible.url) return;
      afficherLApercu(cible);
      rendre();
    };
    essai.onload = fini;
    essai.onerror = fini;
    essai.src = cible.url;
  }

  /** La zone d'aperçu garde son nœud d'un dessin à l'autre ; son image change quand la nouvelle est chargée. */
  function zoneDApercu(lecture: LectureDeComposant, portee: string): HTMLElement | null {
    const cible = c.apercu;
    cadres = null;
    if (!cible || !(cible.largeur > 0) || !(cible.hauteur > 0)) {
      oublierLApercuAffiche();
      return null;
    }
    if (!zone || apercuAffiche === null) {
      oublierLApercuAffiche();
      const enveloppe = document.createElement('div');
      enveloppe.className = 'vc-apercu';
      enveloppe.setAttribute('aria-label', T.apercu);
      const echelle = document.createElement('span');
      echelle.className = 'vc-echelle';
      const image = document.createElement('img');
      image.className = 'vc-image';
      image.alt = '';
      zone = { zone: enveloppe, echelle, image };
      enveloppe.append(echelle);
      apercuAffiche = cible;
    } else if (apercuAffiche.url !== cible.url) precharger(cible);
    const montre = apercuAffiche ?? cible;
    const facteur = Math.min(1, LARGEUR_DE_LAPERCU / montre.largeur, HAUTEUR_DE_LAPERCU / montre.hauteur);
    const { zone: enveloppe, echelle, image } = zone;
    echelle.style.width = `${montre.largeur * facteur}px`;
    echelle.style.height = `${montre.hauteur * facteur}px`;
    if (image.src !== montre.url) image.src = montre.url;
    echelle.replaceChildren(image);
    cadres = echelle;
    if (portee !== racineDe(lecture)) poserLesCadres([portee], 'portee');
    poserLesCadres(selectionDuPlugin, 'selection');
    return enveloppe;
  }

  function sectionDesVariants(lecture: LectureDeComposant, portee: string): HTMLElement | null {
    const analyse = analyseDe(etat, lecture);
    if (!analyse || portee !== racineDe(lecture)) return null;
    const lu = lecture.calques[0]?.id;
    const affiche = lecture.sujet.variants.find((variant) => variant.id === lu);
    return creerSectionVariants({
      variants: lecture.sujet.variants,
      constats: analyse.constats,
      nonLus: new Set(analyse.lecture?.variantsNonLus ?? []),
      affiche: affiche?.nom,
      choisi: c.statut === 'en-cours' && variantDemande ? variantDemande.nom : undefined,
      depliees: proprietesDepliees,
      choisir: (variant) => {
        focusAttendu = null;
        demander(variant.id, false, variant);
      },
      deplier: (propriete) => {
        proprietesDepliees = new Set([...proprietesDepliees, propriete]);
        rendre();
      },
    });
  }

  function rangeeDesFrontieres(lecture: LectureDeComposant, portee: ReadonlySet<string>): HTMLElement | null {
    const frontieres = frontieresDe(lecture, portee);
    if (frontieres.length === 0) return null;
    const rangee = document.createElement('div');
    rangee.className = 'vc-imbriques';
    for (const frontiere of frontieres) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.focus = `frontiere:${frontiere.premiere}`;
      bouton.dataset.frontiere = frontiere.premiere;
      bouton.title = T.ouvrir(frontiere.nom);
      bouton.append(creerSigne('instance', { taille: 14 }), frontiere.nom);
      if (frontiere.fois > 1) {
        const fois = document.createElement('small');
        fois.textContent = T.fois(frontiere.fois);
        bouton.append(fois);
      }
      bouton.addEventListener('click', () => demander(frontiere.premiere, true));
      rangee.append(bouton);
    }
    return rangee;
  }

  function champDuFiltre(): HTMLElement {
    const bloc = document.createElement('div');
    bloc.className = 'vc-filtre';
    const champ = document.createElement('input');
    champ.type = 'search';
    champ.placeholder = T.filtrer;
    champ.setAttribute('aria-label', T.filtrerLesTokens);
    champ.dataset.focus = 'filtre';
    champ.value = filtre;
    champ.addEventListener('input', () => {
      filtre = champ.value;
      rendreLaListe();
    });
    bloc.append(champ);
    return bloc;
  }

  const sectionOuverte = (nature: Nature): boolean => (filtre.trim() ? true : sections.get(nature) ?? lignes.length <= SEUIL_DE_REPLI);

  function calquesEnTexte(lecture: LectureDeComposant, ligne: LigneDeComposant): string {
    const compte = new Map<string, number>();
    for (const id of ligne.calques) {
      const nom = lecture.calques.find((calque) => calque.id === id)?.nom ?? id;
      compte.set(nom, (compte.get(nom) ?? 0) + 1);
    }
    return [...compte].map(([nom, fois]) => (fois > 1 ? `${nom} ${T.fois(fois)}` : nom)).join(' · ');
  }

  const libellesEnTexte = (ligne: LigneDeComposant): string => ligne.libelles.map(motDeLibelle).join(', ');

  const couleurDe = (resultat: Resultat | null): Couleur | null => (resultat?.statut === 'resolu' && resultat.valeur.nature === 'couleur' ? resultat.valeur.couleur : null);

  /** Le signe d'une ligne : la sorte d'objet qu'elle montre, en gris ; une couleur de token remplit la tuile. */
  function signeDeLaLigne(lecture: LectureDeComposant, ligne: LigneDeComposant): HTMLElement {
    const couleur = couleurDe(ligne.resultat);
    const css = couleur ? couleurCss(couleur, espace()) : null;
    const { id, couleur: remplie } = signeDeLigne(lecture, ligne, css !== null);
    if (!remplie || !couleur || !css) return creerSigne(id);
    return creerSigne(id, { valeur: css, clair: estClaire(couleur, espace()) });
  }

  /** La chaîne d'un token : une étape par variable, puis la valeur à copier ou la cause de l'arrêt. */
  function chaineDe(lecture: LectureDeComposant, index: Index, ligne: LigneDeComposant, resultat: Resultat): HTMLElement[] {
    const chaine = document.createElement('ol');
    chaine.className = 'vc-chaine';
    for (const etape of resultat.etapes) {
      const element = document.createElement('li');
      const collection = index.collections.get(etape.collection);
      const origine = document.createElement('span');
      origine.className = 'vc-etape-col';
      origine.append(collection?.nom ?? etape.collection);
      const mode = collection?.modes.find((candidat) => candidat.id === etape.mode);
      if (collection && collection.modes.length > 1 && mode) {
        const pastille = document.createElement('span');
        pastille.className = 'vc-mode';
        pastille.textContent = mode.nom;
        origine.append(pastille);
      }
      const nom = document.createElement('span');
      nom.className = 'vc-etape-nom';
      nom.textContent = index.variables.get(etape.variable)?.nom ?? etape.variable;
      element.append(origine, nom);
      chaine.append(element);
    }
    const fin = document.createElement('li');
    if (resultat.statut === 'resolu') {
      fin.className = 'vc-terme';
      const valeur = ligne.valeur ?? texteDeValeur(resultat.valeur, espace());
      const copie = document.createElement('button');
      copie.type = 'button';
      copie.className = 'vc-copie';
      copie.dataset.focus = `copie:${ligne.cle}`;
      copie.setAttribute('aria-label', T.copier(valeur));
      const couleur = couleurDe(resultat);
      const css = couleur ? couleurCss(couleur, espace()) : null;
      if (css) {
        const pastille = document.createElement('i');
        pastille.className = 'vc-pastille';
        pastille.style.background = css;
        copie.append(pastille);
      }
      copie.append(valeur);
      copie.addEventListener('click', async () => {
        const issue = await copierTexte(valeur);
        if (issue === 'refusee') app.annoncer(TEXTES.copieRefusee, valeur);
        else app.annoncer(TEXTES.copieReussie(valeur));
      });
      fin.append(copie);
    } else {
      fin.className = 'vc-rompue';
      const constat = constatDeResultat(index, resultat);
      const cause = document.createElement('span');
      cause.className = 'vc-rompue-texte';
      cause.textContent = constat?.titre ?? TEXTES.statut[resultat.statut];
      if (constat) cause.title = `${constat.detail} ${constat.action}`;
      fin.append(cause);
    }
    chaine.append(fin);
    if (ligne.ecart) {
      const ecart = document.createElement('li');
      ecart.className = 'vc-rompue';
      const texte = document.createElement('span');
      texte.className = 'vc-rompue-texte';
      texte.textContent = T.ecartAvecFigma(texteDeValeur(ligne.ecart, espace()));
      ecart.append(texte);
      chaine.append(ecart);
    }
    const calques = document.createElement('div');
    calques.className = 'vc-sur-calques';
    calques.textContent = `${libellesEnTexte(ligne)} · ${calquesEnTexte(lecture, ligne)}`;
    return [chaine, calques];
  }

  /** Les champs d'un style de texte : le champ, les collections que sa chaîne traverse, sa valeur. */
  function champsDe(lecture: LectureDeComposant, index: Index, ligne: LigneDeComposant): HTMLElement[] {
    const champs = document.createElement('ul');
    champs.className = 'vc-champs';
    for (const champ of ligne.champs) {
      const element = document.createElement('li');
      const nom = document.createElement('span');
      nom.textContent = champ.champ;
      const collections = document.createElement('em');
      collections.textContent = champ.resultat.etapes.map((etape) => index.collections.get(etape.collection)?.nom ?? etape.collection).join(` ${T.glyphes.miette} `);
      const valeur = document.createElement('code');
      valeur.textContent = champ.resultat.statut === 'resolu' ? texteDeValeur(champ.resultat.valeur, espace()) : T.valeurAbsente;
      element.append(nom, collections, valeur);
      champs.append(element);
    }
    const calques = document.createElement('div');
    calques.className = 'vc-sur-calques';
    calques.textContent = calquesEnTexte(lecture, ligne);
    return [champs, calques];
  }

  const correctionDe = (ligne: LigneDeComposant): CorrectionAffichee | undefined => corrections.find((correction) => correction.avant === ligne.nomComplet && ligne.calques.some((calque) => correction.calques.includes(calque)));

  /** Le nom d'après, sans le préfixe que la vue retire aux noms d'avant. */
  function nomApresCorrection(ligne: LigneDeComposant, correction: CorrectionAffichee): string {
    const prefixe = ligne.nomComplet.slice(0, ligne.nomComplet.length - ligne.nomCourt.length);
    return prefixe !== '' && correction.apres.startsWith(prefixe) ? correction.apres.slice(prefixe.length) : correction.apres;
  }

  const segmentsChanges = (avant: string, apres: string): string[] => {
    const anciens = avant.split('/');
    return apres.split('/').filter((segment, rang) => segment !== anciens[rang]);
  };

  /** Ce que le clic sur une ligne fait : suivre le lien d'un segment corrigé, sinon déplier ou replier la chaîne. Il lit l'état courant, car le nœud de la ligne survit aux dessins. */
  function surLeClicDeLaLigne(cle: string, evenement: Event): void {
    const ligne = lignes.find((candidate) => candidate.cle === cle);
    if (!ligne) return;
    const changee = correctionDe(ligne);
    const segment = evenement.target instanceof Element ? evenement.target.closest('.ch-lien') : null;
    if (segment && changee) {
      auClicDeCorrection(changee.calques);
      return;
    }
    if (ouverts.has(cle)) ouverts.delete(cle);
    else ouverts.add(cle);
    focusAttendu = `ligne:${cle}`;
    rendreLaListe();
  }

  function entreeDeLigne(cle: string): EntreeDeLigne {
    const connue = entreesDeLignes.get(cle);
    if (connue) return connue;
    const token = document.createElement('div');
    token.className = 'vc-token';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'vc-ligne';
    bouton.dataset.cle = cle;
    bouton.dataset.focus = `ligne:${cle}`;
    bouton.addEventListener('click', (evenement) => surLeClicDeLaLigne(cle, evenement));
    token.append(bouton);
    const entree: EntreeDeLigne = { token, bouton, signature: '', valeur: '', fois: '', emplacement: '' };
    entreesDeLignes.set(cle, entree);
    return entree;
  }

  /** Où la ligne se range dans le composant, sans l'identité de ses layers : un autre variant les renomme en gardant leur nom. */
  const emplacementDe = (lecture: LectureDeComposant, ligne: LigneDeComposant): string =>
    [ligne.nature, ligne.libelles.join(','), ...ligne.calques.map((id) => lecture.calques.find((calque) => calque.id === id)?.nom ?? id).sort()].join('|');

  /**
   * La ligne d'un token. Son nœud et son bouton survivent tant que la clé existe ; le contenu se refait seulement quand son texte ou son aspect
   * change. `orphelins` garde les valeurs d'avant des lignes qui n'ont plus de clé, par emplacement : une ligne neuve qui prend leur place
   * est surlignée si sa valeur diffère.
   */
  function ligneDe(lecture: LectureDeComposant, index: Index, ligne: LigneDeComposant, orphelins: Map<string, Array<{ valeur: string; fois: string }>>): HTMLElement {
    const connue = entreesDeLignes.has(ligne.cle);
    const entree = entreeDeLigne(ligne.cle);
    const { token, bouton } = entree;
    const ouvert = ouverts.has(ligne.cle);
    bouton.setAttribute('aria-expanded', String(ouvert));
    bouton.title = `${libellesEnTexte(ligne)} · ${calquesEnTexte(lecture, ligne)}`;

    const identite = document.createElement('span');
    const nom = document.createElement('span');
    nom.className = 'vc-nom';
    const sens = document.createElement('bdi');
    const changee = correctionDe(ligne);
    if (changee) bouton.classList.add('corrige');
    else bouton.classList.remove('corrige');
    sens.append(changee ? creerChemin(nomApresCorrection(ligne, changee), { ajouts: segmentsChanges(ligne.nomComplet, changee.apres), lien: true }) : creerChemin(ligne.nomCourt));
    nom.append(sens);
    identite.append(nom);

    const fin = document.createElement('span');
    fin.className = 'vc-fin';
    if (!ouvert && ligne.resultat && ligne.resultat.etapes.length > 0) {
      const points = document.createElement('span');
      points.className = 'vc-points';
      points.title = T.etapes(ligne.resultat.etapes.length);
      for (let rang = 0; rang < ligne.resultat.etapes.length; rang += 1) points.append(document.createElement('i'));
      fin.append(points);
    }
    if (ligne.ecart) {
      const marque = document.createElement('span');
      marque.className = 'vc-valeur vc-rompue-valeur';
      marque.textContent = T.glyphes.ecart;
      marque.title = T.ecartAide;
      fin.append(marque);
    }
    const valeur = document.createElement('span');
    valeur.className = 'vc-valeur';
    if (ligne.valeur === null && ligne.resultat) {
      valeur.classList.add('vc-rompue-valeur');
      valeur.textContent = T.interrompue;
      valeur.title = constatDeResultat(index, ligne.resultat)?.titre ?? '';
    } else valeur.textContent = ligne.valeur ?? '';
    fin.append(valeur);

    const fois = document.createElement('span');
    fois.className = 'vc-fois';
    if (ligne.calques.length > 1) fois.textContent = T.fois(ligne.calques.length);

    const signe = signeDeLaLigne(lecture, ligne);
    const couleur = couleurDe(ligne.resultat);
    const details = ouvert ? (ligne.genre === 'style' || !ligne.resultat ? champsDe(lecture, index, ligne) : chaineDe(lecture, index, ligne, ligne.resultat)) : [];
    const signature = JSON.stringify([
      ouvert, ligne.resultat?.etapes.length ?? 0, changee?.apres ?? null, bouton.title, valeur.title, signe.className, signe.innerHTML, couleur ? couleurCss(couleur, espace()) : null, identite.textContent, fin.textContent, fois.textContent, details.map((detail) => detail.textContent),
    ]);
    const emplacement = emplacementDe(lecture, ligne);
    if (signature !== entree.signature) {
      if (changementDeVariant) {
        const avant = connue ? { valeur: entree.valeur, fois: entree.fois } : orphelins.get(emplacement)?.shift();
        if (avant && avant.valeur !== (valeur.textContent ?? '')) valeur.classList.add('vient-de-changer');
        if (avant && avant.fois !== (fois.textContent ?? '')) fois.classList.add('vient-de-changer');
      }
      bouton.replaceChildren(signe, identite, fin, fois);
      token.replaceChildren(bouton, ...details);
      entree.signature = signature;
    }
    entree.valeur = valeur.textContent ?? '';
    entree.fois = fois.textContent ?? '';
    entree.emplacement = emplacement;
    return token;
  }

  /** Ce qu'une section repliée montre : une pastille par couleur, puis ses valeurs ou ses styles. */
  function resumeDeLaSection(section: SectionDeComposant): HTMLElement | null {
    const { couleurs, textes } = resumeDe(section);
    if (couleurs.length === 0 && textes.length === 0) return null;
    const resume = document.createElement('div');
    resume.className = 'vc-resume';
    for (const couleur of couleurs) {
      const css = couleurCss(couleur.valeur.couleur, espace());
      const pastille = document.createElement('button');
      pastille.type = 'button';
      pastille.dataset.ouvrir = couleur.cle;
      if (css) pastille.style.background = css;
      pastille.title = `${couleur.nom} · ${texteDeValeur(couleur.valeur, espace())}`;
      pastille.setAttribute('aria-label', couleur.nom);
      pastille.addEventListener('click', () => {
        sections.set(section.nature, true);
        ouverts.add(couleur.cle);
        focusAttendu = `ligne:${couleur.cle}`;
        aMontrer = couleur.cle;
        rendreLaListe();
      });
      resume.append(pastille);
    }
    if (textes.length > 0) {
      const texte = document.createElement('span');
      texte.textContent = textes.join(' · ');
      resume.append(texte);
    }
    return resume;
  }

  function elementsDeLaListe(lecture: LectureDeComposant, index: Index): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const gardees = sectionsDe(lignes)
      .map((section): SectionDeComposant => ({ nature: section.nature, lignes: filtrer(section.lignes, filtre, motDeLibelle) }))
      .filter((section) => section.lignes.length > 0);
    // Une ligne dont la clé disparaît laisse son emplacement et sa valeur : la ligne neuve qui le prend sait ce qui change.
    const montrees = new Set(gardees.filter((section) => sectionOuverte(section.nature)).flatMap((section) => section.lignes.map((ligne) => ligne.cle)));
    const orphelins = new Map<string, Array<{ valeur: string; fois: string }>>();
    for (const [cle, entree] of entreesDeLignes) {
      if (montrees.has(cle)) continue;
      if (changementDeVariant) orphelins.set(entree.emplacement, [...(orphelins.get(entree.emplacement) ?? []), { valeur: entree.valeur, fois: entree.fois }]);
      entreesDeLignes.delete(cle);
    }
    for (const section of gardees) {
      const ouverte = sectionOuverte(section.nature);
      const tete = document.createElement('button');
      tete.type = 'button';
      tete.className = 'vc-section-tete';
      tete.dataset.section = section.nature;
      tete.dataset.focus = `section:${section.nature}`;
      tete.setAttribute('aria-expanded', String(ouverte));
      const nom = document.createElement('span');
      nom.textContent = T.natures[section.nature];
      const compte = document.createElement('b');
      compte.textContent = String(section.lignes.length);
      tete.append(nom, compte, creerChevron());
      tete.addEventListener('click', () => {
        sections.set(section.nature, !ouverte);
        focusAttendu = `section:${section.nature}`;
        rendreLaListe();
      });
      elements.push(tete);
      if (ouverte) elements.push(...section.lignes.map((ligne) => ligneDe(lecture, index, ligne, orphelins)));
      else {
        const resume = resumeDeLaSection(section);
        if (resume) elements.push(resume);
      }
    }
    if (elements.length === 0 && filtre.trim()) {
      const aucun = document.createElement('p');
      aucun.className = 'vc-aucun';
      aucun.textContent = T.aucunNeCorrespond;
      elements.push(aucun);
    }
    return elements;
  }

  function rendreLeFocus(): void {
    if (aMontrer !== null) {
      const cle = aMontrer;
      aMontrer = null;
      Array.from(element.querySelectorAll<HTMLElement>('.vc-ligne')).find((candidat) => candidat.dataset.cle === cle)?.scrollIntoView({ block: 'nearest' });
    }
    if (focusAttendu === null) return;
    const cle = focusAttendu;
    focusAttendu = null;
    Array.from(element.querySelectorAll<HTMLElement>('[data-focus]')).find((candidat) => candidat.dataset.focus === cle)?.focus();
  }

  function rendreLaListe(): void {
    if (!liste || !c.lecture || !c.index) return;
    liste.replaceChildren(...elementsDeLaListe(c.lecture, c.index));
    rendreLeFocus();
  }

  function valeursSansToken(lecture: LectureDeComposant, portee: ReadonlySet<string>): HTMLElement[] {
    const directes = lecture.directes.filter((directe) => portee.has(directe.calque));
    const sansToken = lignes.length === 0;
    if (!sansToken && !directesOuvertes) return [];
    if (directes.length === 0) {
      if (!sansToken) return [];
      const aucun = document.createElement('p');
      aucun.className = 'vc-aucun';
      aucun.textContent = T.aucunSurCeCalque;
      return [aucun];
    }
    const titre = document.createElement('div');
    titre.className = 'vc-section-tete';
    const texte = document.createElement('span');
    texte.textContent = sansToken ? T.aucunToken : T.sansToken;
    titre.append(texte);
    const valeurs = document.createElement('ul');
    valeurs.className = 'vc-directes';
    for (const directe of directes) {
      const type = lecture.calques.find((calque) => calque.id === directe.calque)?.type ?? '';
      const element_ = document.createElement('li');
      const propriete = document.createElement('span');
      propriete.textContent = motDeLibelle(natureDe(directe.propriete, type).libelle);
      const valeur = document.createElement('code');
      valeur.textContent = directe.valeur;
      element_.append(propriete, valeur);
      valeurs.append(element_);
    }
    return [titre, valeurs];
  }

  function rendreLePied(lecture: LectureDeComposant, portee: ReadonlySet<string>): void {
    const liaisons = compteDesLiaisons(lecture, portee);
    const comptes = document.createElement('span');
    comptes.textContent = [
      T.tokens(lignes.length),
      liaisons > lignes.length ? T.liaisons(liaisons) : null,
      lecture.calquesNonLus > 0 ? T.calquesNonLus(lecture.calquesNonLus) : null,
      c.ignores > 0 && c.pile.length === 0 ? T.calquesIgnores(c.ignores) : null,
    ].filter((texte): texte is string => texte !== null).join(' · ');
    const directes = lecture.directes.filter((directe) => portee.has(directe.calque)).length;
    if (lignes.length === 0 || directes === 0) {
      pied.replaceChildren(comptes, document.createElement('span'));
      return;
    }
    const bascule = document.createElement('button');
    bascule.type = 'button';
    bascule.dataset.focus = 'directes';
    bascule.setAttribute('aria-expanded', String(directesOuvertes));
    bascule.textContent = T.nombreSansToken(directes);
    bascule.addEventListener('click', () => {
      directesOuvertes = !directesOuvertes;
      focusAttendu = 'directes';
      rendre();
    });
    pied.replaceChildren(comptes, bascule);
  }

  /** La barre fine sous l'en-tête : la lecture d'un autre variant court, l'écran affiche encore l'ancienne. */
  function barreFine(): HTMLElement {
    if (barreDeLecture) return barreDeLecture;
    const barre = document.createElement('div');
    barre.className = 'lecture-fine';
    barre.setAttribute('role', 'progressbar');
    barre.setAttribute('aria-label', T.lectureDuVariant);
    barreDeLecture = barre;
    return barre;
  }

  function rendre(): void {
    const { lecture, index, portee } = c;
    cadres = null;
    const enLecture = c.statut === 'en-cours' && lectureDuJeu;
    if ((c.statut !== 'lu' && !enLecture) || !lecture || !index || portee === null) {
      // La maquette garde le pied, vide, sous un écran sans composant.
      oublierLesNoeuds();
      lignes = [];
      pied.replaceChildren();
      if (c.statut === 'en-cours') corps.replaceChildren(vide(T.lecture, false));
      else if (c.statut === 'echouee') corps.replaceChildren(vide(T.lectureEchouee(c.message), false));
      else corps.replaceChildren(vide(T.vide, true));
      return;
    }
    const defilement = corps.scrollTop;
    const calques = porteeDe(lecture, portee);
    lignes = lignesDe(lecture, index, calques);
    if (!liste) {
      liste = document.createElement('div');
      liste.className = 'vc-liste';
    }
    liste.replaceChildren(...elementsDeLaListe(lecture, index));
    teteAffichee = garder(teteAffichee, entete(lecture, index, portee));
    const variants = sectionDesVariants(lecture, portee);
    variantsAffiches = variants ? garder(variantsAffiches, variants) : null;
    const parties = [
      filDAriane(lecture, portee),
      teteAffichee,
      enLecture ? barreFine() : null,
      zoneDApercu(lecture, portee),
      variantsAffiches,
      rangeeDesFrontieres(lecture, calques),
      filtreOuvert ? champDuFiltre() : null,
      liste,
      ...valeursSansToken(lecture, calques),
    ].filter((partie): partie is HTMLElement => partie !== null);
    corps.replaceChildren(...parties);
    if (defilement > 0) corps.scrollTop = defilement;
    rendreLePied(lecture, calques);
    changementDeVariant = false;
    rendreLeFocus();
  }

  // Le survol ou le focus d'une ligne entoure ses calques dans l'aperçu.
  const ligneVisee = (evenement: Event): LigneDeComposant | undefined => {
    const cle = evenement.target instanceof Element ? evenement.target.closest<HTMLElement>('.vc-ligne')?.dataset.cle : undefined;
    return cle === undefined ? undefined : lignes.find((ligne) => ligne.cle === cle);
  };
  const viser = (evenement: Event): void => {
    retirerLesCadresDeSurvol();
    const ligne = ligneVisee(evenement);
    if (ligne) poserLesCadres(ligne.calques, 'survol');
  };
  element.addEventListener('mouseover', viser);
  element.addEventListener('focusin', viser);
  element.addEventListener('mouseleave', retirerLesCadresDeSurvol);
  element.addEventListener('focusout', retirerLesCadresDeSurvol);

  return {
    element,
    mettreAJour: rendre,
    activer: suivreLaSelection,
    poserLaSelectionDuPlugin(calques) {
      selectionDuPlugin = calques;
      rendre();
    },
    poserLesCorrections(liste, auClic) {
      corrections = liste;
      auClicDeCorrection = auClic;
      rendre();
    },
    recevoirSelection(sujet, ignores) {
      c.selection = sujet;
      c.selectionConnue = true;
      c.ignores = ignores;
      suivreLaSelection();
    },
    recevoirLecture(demande, lecture) {
      if (c.statut !== 'en-cours' || demande !== c.demande) return;
      // Lire un variant fait de lui le sujet : le jeu est le même quand la liste de ses variants l'est.
      const memeJeu = lectureDuJeu && !c.empiler && c.lecture !== null && c.index !== null && lecture !== null && memeListeDeVariants(c.lecture, lecture);
      lectureDuJeu = false;
      variantDemande = null;
      if (!lecture) {
        viderLaPile();
        oublierLApercuAffiche();
        liberer(c.apercu);
        Object.assign(c, { statut: 'vide', lecture: null, index: null, portee: null, apercu: null });
        rendre();
        return;
      }
      if (memeJeu) {
        // Un autre variant du même jeu : l'aperçu d'avant reste jusqu'à l'arrivée du nouveau, les choix du designer aussi.
        c.lecture = lecture;
        c.index = indexer(lecture.releve);
        c.portee = racineDe(lecture);
        c.statut = 'lu';
        changementDeVariant = true;
        rendre();
        return;
      }
      oublierLesNoeuds();
      if (c.empiler && c.lecture && c.index && c.portee !== null) c.pile.push({ lecture: c.lecture, index: c.index, portee: c.portee, apercu: c.apercu });
      else liberer(c.apercu);
      if (c.lecture?.sujet.id !== lecture.sujet.id) {
        proprietesDepliees = new Set();
      }
      const voulue = c.deLaSelection ? c.selection?.portee : undefined;
      c.lecture = lecture;
      c.index = indexer(lecture.releve);
      c.apercu = null;
      c.portee = voulue !== undefined && lecture.calques.some((calque) => calque.id === voulue) ? voulue : racineDe(lecture);
      c.statut = 'lu';
      oublierLesChoix();
      rendre();
    },
    recevoirApercu(message) {
      if (c.statut !== 'lu' || message.demande !== c.demande || c.lecture?.sujet.id !== message.sujet) return;
      const ancien = c.apercu;
      const url = URL.createObjectURL(new Blob([new Uint8Array(message.octets)], { type: 'image/png' }));
      c.apercu = { sujet: message.sujet, url, largeur: message.largeur, hauteur: message.hauteur, origine: message.origine };
      // L'image affichée reste en place jusqu'au chargement de la nouvelle, qui la libère alors.
      if (ancien && ancien !== apercuAffiche) liberer(ancien);
      rendre();
    },
    recevoirEchec(demande, message) {
      if (c.statut !== 'en-cours' || demande !== c.demande) return false;
      lectureDuJeu = false;
      variantDemande = null;
      c.statut = 'echouee';
      c.message = message;
      rendre();
      return true;
    },
  };
}
