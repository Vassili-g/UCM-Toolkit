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
import { indexer, type Index } from '../../indexation';
import type { PluginMessage, SujetSelectionne } from '../../messages';
import { hexaDeCouleur, texteDeValeur, type Couleur } from '../../modele';
import type { Resultat } from '../../resolution';
import type { Application, Composant } from '../application';
import { constatDeResultat } from '../chaine';
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

export interface VueComposant extends Composant {
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
const estClaire = (couleur: Couleur): boolean => (couleur.r * 299 + couleur.g * 587 + couleur.b * 114) * 0.255 > 150;

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

export function creerVueComposant(app: Application): VueComposant {
  const { etat } = app;
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
  let filtre = '';
  let filtreOuvert = false;
  /** L'élément à qui rendre le focus après un rendu, par son `data-focus`. */
  let focusAttendu: string | null = null;
  /** La ligne à faire défiler dans la vue après un rendu. */
  let aMontrer: string | null = null;
  let lignes: LigneDeComposant[] = [];
  let cadres: HTMLElement | null = null;
  let liste: HTMLElement | null = null;

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

  function viderLaPile(): void {
    for (const quitte of c.pile) liberer(quitte.apercu);
    c.pile = [];
  }

  function annulerLaLectureEnCours(): void {
    if (c.statut === 'en-cours') versSandbox({ type: 'annuler', demande: c.demande });
  }

  /** Demande une lecture ; la précédente, si elle court encore, est annulée. */
  function demander(calque: string | null, empiler: boolean): void {
    annulerLaLectureEnCours();
    c.demande = app.nouvelleDemande();
    c.statut = 'en-cours';
    c.empiler = empiler;
    c.deLaSelection = calque === null;
    versSandbox({ type: 'lire-composant', demande: c.demande, calque });
    rendre();
  }

  /** Revient au composant de rang `rang` dans la pile, sans relecture. */
  function depiler(rang: number): void {
    const retrouve = c.pile[rang];
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
    const glyphe = document.createElement('span');
    glyphe.setAttribute('aria-hidden', 'true');
    glyphe.textContent = surLeSujet ? T.glyphes.composant : T.glyphes.calque;
    titre.append(glyphe, surLeSujet ? lecture.sujet.nom : lecture.calques.find((calque) => calque.id === portee)?.nom ?? portee);
    const sous = document.createElement('div');
    sous.className = 'vc-sous';
    if (surLeSujet && lecture.sujet.variants.length > 1) {
      const choix = document.createElement('select');
      choix.className = 'vc-variants';
      choix.setAttribute('aria-label', T.variantLu);
      choix.dataset.focus = 'variants';
      const lu = lecture.calques[0]?.id;
      for (const variant of lecture.sujet.variants) {
        const option = document.createElement('option');
        option.value = variant.id;
        option.textContent = variant.nom;
        option.selected = variant.id === lu;
        choix.append(option);
      }
      choix.addEventListener('change', () => {
        focusAttendu = 'variants';
        demander(choix.value, false);
      });
      sous.append(choix);
    } else if (surLeSujet && lecture.sujet.variant !== null) {
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
    tout.textContent = lignes.length > SEUIL_DE_REPLI ? T.glyphes.sectionOuverte : T.glyphes.toutReplier;
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
  function poserLesCadres(calques: readonly string[], dePortee: boolean): void {
    const { lecture, apercu } = c;
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
      cadre.classList.toggle('vc-cadre-portee', dePortee);
      cadre.style.left = `${x * facteur}px`;
      cadre.style.top = `${y * facteur}px`;
      cadre.style.width = `${calque.boite.largeur * facteur}px`;
      cadre.style.height = `${calque.boite.hauteur * facteur}px`;
      cadres.append(cadre);
    }
  }

  function retirerLesCadresDeSurvol(): void {
    if (!cadres) return;
    for (const cadre of Array.from(cadres.children)) if (cadre.classList.contains('vc-cadre') && !cadre.classList.contains('vc-cadre-portee')) cadre.remove();
  }

  function zoneDApercu(lecture: LectureDeComposant, portee: string): HTMLElement | null {
    const apercu = c.apercu;
    cadres = null;
    if (!apercu || !(apercu.largeur > 0) || !(apercu.hauteur > 0)) return null;
    const zone = document.createElement('div');
    zone.className = 'vc-apercu';
    zone.setAttribute('aria-label', T.apercu);
    const facteur = Math.min(1, LARGEUR_DE_LAPERCU / apercu.largeur, HAUTEUR_DE_LAPERCU / apercu.hauteur);
    const echelle = document.createElement('span');
    echelle.className = 'vc-echelle';
    echelle.style.width = `${apercu.largeur * facteur}px`;
    echelle.style.height = `${apercu.hauteur * facteur}px`;
    const image = document.createElement('img');
    image.className = 'vc-image';
    image.alt = '';
    image.src = apercu.url;
    echelle.append(image);
    cadres = echelle;
    zone.append(echelle);
    if (portee !== racineDe(lecture)) poserLesCadres([portee], true);
    return zone;
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
      bouton.append(`${T.glyphes.composant} ${frontiere.nom}`);
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

  /** La pastille d'une ligne : pleine pour un fond, évidée pour un contour, marquée pour un texte, signe de la nature pour un nombre. */
  function pastilleDe(ligne: LigneDeComposant): HTMLElement {
    const pastille = document.createElement('i');
    pastille.className = 'vc-pastille';
    const couleur = couleurDe(ligne.resultat);
    const css = couleur ? couleurCss(couleur) : null;
    if (couleur && css) {
      if (ligne.libelles.length === 1 && ligne.libelles[0] === 'contour') {
        pastille.classList.add('vc-pastille-contour');
        pastille.style.borderColor = css;
        return pastille;
      }
      pastille.style.background = css;
      const claire = estClaire(couleur);
      pastille.classList.toggle('vc-pastille-claire', claire);
      pastille.classList.toggle('vc-pastille-sombre', !claire);
      if (ligne.libelles.length === 1 && ligne.libelles[0] === 'texte') pastille.textContent = T.glyphes.texte;
      return pastille;
    }
    pastille.classList.add('vc-pastille-nombre');
    if (ligne.type === 'COLOR' || (ligne.type === null && ligne.nature === 'couleur')) pastille.textContent = T.glyphes.couleurInconnue;
    else if (ligne.libelles[0] === 'epaisseur') pastille.textContent = T.glyphes.epaisseur;
    else if (ligne.genre === 'style' || ligne.nature === 'texte') pastille.textContent = T.glyphes.style;
    else if (ligne.nature === 'forme' || ligne.nature === 'espacement' || ligne.nature === 'taille') pastille.textContent = T.glyphes[ligne.nature];
    else pastille.textContent = T.glyphes.autre;
    return pastille;
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
      const valeur = ligne.valeur ?? texteDeValeur(resultat.valeur);
      const copie = document.createElement('button');
      copie.type = 'button';
      copie.className = 'vc-copie';
      copie.dataset.focus = `copie:${ligne.cle}`;
      copie.setAttribute('aria-label', T.copier(valeur));
      const couleur = couleurDe(resultat);
      const css = couleur ? couleurCss(couleur) : null;
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
      texte.textContent = T.ecartAvecFigma(ligne.ecart.nature === 'couleur' ? hexaDeCouleur(ligne.ecart.couleur).hexa : texteDeValeur(ligne.ecart));
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
      valeur.textContent = champ.resultat.statut === 'resolu' ? texteDeValeur(champ.resultat.valeur) : T.valeurAbsente;
      element.append(nom, collections, valeur);
      champs.append(element);
    }
    const calques = document.createElement('div');
    calques.className = 'vc-sur-calques';
    calques.textContent = calquesEnTexte(lecture, ligne);
    return [champs, calques];
  }

  function ligneDe(lecture: LectureDeComposant, index: Index, ligne: LigneDeComposant): HTMLElement {
    const ouvert = ouverts.has(ligne.cle);
    const token = document.createElement('div');
    token.className = 'vc-token';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'vc-ligne';
    bouton.dataset.cle = ligne.cle;
    bouton.dataset.focus = `ligne:${ligne.cle}`;
    bouton.setAttribute('aria-expanded', String(ouvert));
    bouton.title = `${libellesEnTexte(ligne)} · ${calquesEnTexte(lecture, ligne)}`;

    const identite = document.createElement('span');
    const nom = document.createElement('span');
    nom.className = 'vc-nom';
    const sens = document.createElement('bdi');
    sens.textContent = ligne.nomCourt;
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

    bouton.append(pastilleDe(ligne), identite, fin, fois);
    bouton.addEventListener('click', () => {
      if (ouverts.has(ligne.cle)) ouverts.delete(ligne.cle);
      else ouverts.add(ligne.cle);
      focusAttendu = `ligne:${ligne.cle}`;
      rendreLaListe();
    });
    token.append(bouton);
    if (ouvert) token.append(...(ligne.genre === 'style' || !ligne.resultat ? champsDe(lecture, index, ligne) : chaineDe(lecture, index, ligne, ligne.resultat)));
    return token;
  }

  /** Ce qu'une section repliée montre : une pastille par couleur, puis ses valeurs ou ses styles. */
  function resumeDeLaSection(section: SectionDeComposant): HTMLElement | null {
    const { couleurs, textes } = resumeDe(section);
    if (couleurs.length === 0 && textes.length === 0) return null;
    const resume = document.createElement('div');
    resume.className = 'vc-resume';
    for (const couleur of couleurs) {
      const css = couleurCss(couleur.valeur.couleur);
      const pastille = document.createElement('button');
      pastille.type = 'button';
      pastille.dataset.ouvrir = couleur.cle;
      if (css) pastille.style.background = css;
      pastille.title = `${couleur.nom} · ${hexaDeCouleur(couleur.valeur.couleur).hexa}`;
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
    for (const section of sectionsDe(lignes)) {
      const gardees: SectionDeComposant = { nature: section.nature, lignes: filtrer(section.lignes, filtre, motDeLibelle) };
      if (gardees.lignes.length === 0) continue;
      const ouverte = sectionOuverte(section.nature);
      const tete = document.createElement('button');
      tete.type = 'button';
      tete.className = 'vc-section-tete';
      tete.dataset.section = section.nature;
      tete.dataset.focus = `section:${section.nature}`;
      tete.setAttribute('aria-expanded', String(ouverte));
      const chevron = document.createElement('i');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = ouverte ? T.glyphes.sectionOuverte : T.glyphes.sectionFermee;
      const nom = document.createElement('span');
      nom.textContent = T.natures[section.nature];
      const compte = document.createElement('b');
      compte.textContent = String(gardees.lignes.length);
      tete.append(chevron, nom, compte);
      tete.addEventListener('click', () => {
        sections.set(section.nature, !ouverte);
        focusAttendu = `section:${section.nature}`;
        rendreLaListe();
      });
      elements.push(tete);
      if (ouverte) elements.push(...gardees.lignes.map((ligne) => ligneDe(lecture, index, ligne)));
      else {
        const resume = resumeDeLaSection(gardees);
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

  function rendre(): void {
    const { lecture, index, portee } = c;
    liste = null;
    cadres = null;
    lignes = [];
    if (c.statut !== 'lu' || !lecture || !index || portee === null) {
      // La maquette garde le pied, vide, sous un écran sans composant.
      pied.replaceChildren();
      if (c.statut === 'en-cours') corps.replaceChildren(vide(T.lecture, false));
      else if (c.statut === 'echouee') corps.replaceChildren(vide(T.lectureEchouee(c.message), false));
      else corps.replaceChildren(vide(T.vide, true));
      return;
    }
    const calques = porteeDe(lecture, portee);
    lignes = lignesDe(lecture, index, calques);
    liste = document.createElement('div');
    liste.className = 'vc-liste';
    liste.append(...elementsDeLaListe(lecture, index));
    const parties = [
      filDAriane(lecture, portee),
      entete(lecture, index, portee),
      zoneDApercu(lecture, portee),
      rangeeDesFrontieres(lecture, calques),
      filtreOuvert ? champDuFiltre() : null,
      liste,
      ...valeursSansToken(lecture, calques),
    ].filter((partie): partie is HTMLElement => partie !== null);
    corps.replaceChildren(...parties);
    rendreLePied(lecture, calques);
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
    if (ligne) poserLesCadres(ligne.calques, false);
  };
  element.addEventListener('mouseover', viser);
  element.addEventListener('focusin', viser);
  element.addEventListener('mouseleave', retirerLesCadresDeSurvol);
  element.addEventListener('focusout', retirerLesCadresDeSurvol);

  return {
    element,
    mettreAJour: rendre,
    activer: suivreLaSelection,
    recevoirSelection(sujet, ignores) {
      c.selection = sujet;
      c.ignores = ignores;
      suivreLaSelection();
    },
    recevoirLecture(demande, lecture) {
      if (c.statut !== 'en-cours' || demande !== c.demande) return;
      if (!lecture) {
        viderLaPile();
        liberer(c.apercu);
        Object.assign(c, { statut: 'vide', lecture: null, index: null, portee: null, apercu: null });
        rendre();
        return;
      }
      if (c.empiler && c.lecture && c.index && c.portee !== null) c.pile.push({ lecture: c.lecture, index: c.index, portee: c.portee, apercu: c.apercu });
      else liberer(c.apercu);
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
      liberer(c.apercu);
      const url = URL.createObjectURL(new Blob([new Uint8Array(message.octets)], { type: 'image/png' }));
      c.apercu = { sujet: message.sujet, url, largeur: message.largeur, hauteur: message.hauteur, origine: message.origine };
      rendre();
    },
    recevoirEchec(demande, message) {
      if (c.statut !== 'en-cours' || demande !== c.demande) return false;
      c.statut = 'echouee';
      c.message = message;
      rendre();
      return true;
    },
  };
}
