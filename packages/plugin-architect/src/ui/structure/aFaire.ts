/**
 * L'onglet « À faire dans Figma » du mode Tokens : un constat par carte, sous l'intertitre de sa famille. Le liseré, l'icône et le mot de la
 * carte disent le type ; la phrase dit le problème, le lieu cite les variables, la ligne grise dit où le régler. Rien ne s'écrit d'ici :
 * le geste se fait dans la fenêtre Variables de Figma, et « Ouvrir la fiche » montre la variable dans l'explorateur.
 *
 * Ignorer (Q6) : la carte d'un rôle absent d'une palette offre un menu à deux choix, « Pour cette palette » et « Dans tout le fichier ».
 * Les constats ignorés pour leur palette et les rôles ignorés partout se rangent sous l'intertitre Ignorés, en cartes muettes, chacune
 * avec « Ne plus ignorer ».
 */
import { creerGravite, marquerDuTon } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { TEXTES } from '../textes';
import { creerCarte, creerIntertitre, poserLesMorceaux } from './carte';
import { GROUPES, type ConstatAFaire, type GroupeDeConstat, type Morceau } from './lecture';

const INTERTITRES: Readonly<Record<GroupeDeConstat, string>> = {
  manquantes: TEXTES.groupeVariablesManquantes,
  crans: TEXTES.groupeCrans,
  alias: TEXTES.groupeAlias,
  modes: TEXTES.groupeModes,
  valeurs: TEXTES.groupeValeurs,
  couches: TEXTES.groupeCouches,
  types: TEXTES.groupeTypes,
  rangement: TEXTES.groupeRangement,
};

/** Ce que le fichier écarte : les constats ignorés pour leur palette et les rôles ignorés dans tout le fichier. */
export interface IgnoresLus {
  readonly constats: readonly ConstatAFaire[];
  readonly roles: readonly string[];
}

/** Les gestes d'Ignorer : chacun part au sandbox, qui range la clé puis relit la structure. */
export interface GestesDIgnorer {
  readonly ignorerPourLaPalette: (constat: string) => void;
  readonly ignorerDansLeFichier: (role: string) => void;
  readonly nePlusIgnorerLeConstat: (constat: string) => void;
  readonly nePlusIgnorerLeRole: (role: string) => void;
}

export interface AFaire {
  /** Montre les constats reçus et ceux qui sont ignorés ; `null` tant que le sandbox n'a pas répondu. */
  poser(constats: readonly ConstatAFaire[] | null, ignores?: IgnoresLus): void;
}

/** Un texte dont les mots entre accents graves sont des chemins. */
function morceauxCites(texte: string): Morceau[] {
  return texte.split('`').map((partie, rang): Morceau => (rang % 2 === 1 ? { chemin: partie } : partie)).filter((partie) => partie !== '');
}

function boutonTexte(libelle: string, nomAccessible: string, auClic: () => void): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-texte';
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', nomAccessible);
  bouton.addEventListener('click', auClic);
  return bouton;
}

/** Le bouton Ignorer d'une carte de rôle absent, et son menu à deux choix. Échap ou un clic ailleurs le referme. */
function creerLeMenuIgnorer(constat: ConstatAFaire, role: string, gestes: GestesDIgnorer): HTMLElement {
  const T = TEXTES.aFaireDuComposant;
  const hote = document.createElement('span');
  hote.className = 'ignorer-hote';
  const declencheur = createButton({ label: T.ignorer, variant: 'secondary', compact: true, onClick: () => basculer(menu.hidden) });
  declencheur.setAttribute('aria-haspopup', 'menu');
  declencheur.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('span');
  menu.className = 'menu-ignorer';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const dehors = (evenement: Event): void => {
    if (!hote.contains(evenement.target as Node)) basculer(false);
  };
  const echap = (evenement: KeyboardEvent): void => {
    if (evenement.key === 'Escape') basculer(false);
  };
  function basculer(ouvert: boolean): void {
    menu.hidden = !ouvert;
    declencheur.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) {
      document.addEventListener('click', dehors);
      document.addEventListener('keydown', echap);
    } else {
      document.removeEventListener('click', dehors);
      document.removeEventListener('keydown', echap);
    }
  }
  const choix = (libelle: string, geste: () => void): HTMLButtonElement => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.setAttribute('role', 'menuitem');
    bouton.textContent = libelle;
    bouton.addEventListener('click', () => {
      basculer(false);
      geste();
    });
    return bouton;
  };
  menu.append(
    choix(TEXTES.ignorerPourLaPalette, () => gestes.ignorerPourLaPalette(constat.id)),
    choix(TEXTES.ignorerDansLeFichier, () => gestes.ignorerDansLeFichier(role)),
  );
  hote.append(declencheur, menu);
  return hote;
}

function creerLeCorps(constat: ConstatAFaire, ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void, gestes: GestesDIgnorer): HTMLElement | null {
  const { faits, variable, role } = constat;
  if (faits.length === 0 && !variable && role === null) return null;
  const corps = document.createElement('div');
  if (faits.length > 0) {
    const liste = document.createElement('div');
    liste.className = 'constat-faits';
    for (const { etiquette, valeur } of faits) {
      const ligne = document.createElement('div');
      ligne.className = 'constat-fait';
      const nom = document.createElement('span');
      nom.textContent = etiquette;
      const contenu = document.createElement('span');
      poserLesMorceaux(contenu, valeur);
      ligne.append(nom, contenu);
      liste.append(ligne);
    }
    corps.append(liste);
  }
  if (variable || role !== null) {
    const actions = document.createElement('div');
    actions.className = 'constat-actions';
    if (variable) {
      const bouton = createButton({ label: TEXTES.ouvrirLaFiche, variant: 'secondary', compact: true, onClick: () => ouvrirLaFiche(variable) });
      bouton.setAttribute('aria-label', TEXTES.ouvrirLaFicheDe(variable.nom));
      actions.append(bouton);
    }
    if (role !== null) actions.append(creerLeMenuIgnorer(constat, role, gestes));
    corps.append(actions);
  }
  return corps;
}

export function monterAFaire(contenu: HTMLElement, ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void, gestes: GestesDIgnorer): AFaire {
  const liste = document.createElement('div');
  liste.className = 'structure-liste';
  const vide = document.createElement('p');
  vide.className = 'meta';
  vide.hidden = true;
  contenu.append(vide, liste);
  /** Les constats dépliés par le designer : un nouveau message ne les replie pas. */
  const deplies = new Set<string>();

  function creerLaCarte(constat: ConstatAFaire): HTMLElement {
    const entete = document.createElement('span');
    entete.className = 'constat-entete';
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    poserLesMorceaux(phrase, constat.phrase);
    entete.append(creerGravite(constat.type), phrase);
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    poserLesMorceaux(lieu, constat.lieu);
    const meta: Node[] = [lieu];
    if (constat.statut !== null) {
      const statut = document.createElement('span');
      statut.className = 'constat-statut';
      statut.textContent = constat.statut;
      meta.push(document.createElement('br'), statut);
    }
    const { element } = creerCarte({
      tete: [entete],
      meta,
      corps: creerLeCorps(constat, ouvrirLaFiche, gestes),
      deplie: deplies.has(constat.id),
      auBasculement: (ouvert) => {
        if (ouvert) deplies.add(constat.id);
        else deplies.delete(constat.id);
      },
    });
    element.classList.add('bloc-constat');
    marquerDuTon(element, constat.type);
    return element;
  }

  /** Un constat ignoré pour sa palette : la carte muette dit le constat et rend « Ne plus ignorer ». */
  function creerLaCarteIgnoree(constat: ConstatAFaire): HTMLElement {
    const T = TEXTES.aFaireDuComposant;
    const entete = document.createElement('span');
    entete.className = 'constat-entete';
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    poserLesMorceaux(phrase, constat.phrase);
    entete.append(creerGravite(constat.type), phrase);
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    poserLesMorceaux(lieu, constat.lieu);
    const dite = constat.phrase.map((morceau) => (typeof morceau === 'string' ? morceau : morceau.chemin)).join('');
    const { element } = creerCarte({
      tete: [entete],
      meta: [lieu, document.createElement('br'), boutonTexte(T.nePlusIgnorer, T.nePlusIgnorerCeConstat(dite), () => gestes.nePlusIgnorerLeConstat(constat.id))],
      corps: null,
      deplie: false,
    });
    element.classList.add('bloc-constat', 'muette');
    return element;
  }

  /** Un rôle ignoré dans tout le fichier : la phrase du rôle, et « Ne plus ignorer ». */
  function creerLaCarteDuRole(role: string): HTMLElement {
    const T = TEXTES.aFaireDuComposant;
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    poserLesMorceaux(phrase, morceauxCites(TEXTES.roleIgnore(role)));
    const entete = document.createElement('span');
    entete.className = 'constat-entete';
    entete.append(phrase);
    const { element } = creerCarte({
      tete: [entete],
      meta: [boutonTexte(T.nePlusIgnorer, T.nePlusIgnorerCeConstat(role), () => gestes.nePlusIgnorerLeRole(role))],
      corps: null,
      deplie: false,
    });
    element.classList.add('bloc-constat', 'muette');
    return element;
  }

  return {
    poser(constats, ignores) {
      vide.hidden = constats === null || constats.length > 0;
      vide.textContent = vide.hidden ? '' : TEXTES.rienAFaireDansFigma;
      const enfants: HTMLElement[] = [];
      for (const groupe of GROUPES) {
        const duGroupe = (constats ?? []).filter((constat) => constat.groupe === groupe);
        if (duGroupe.length === 0) continue;
        enfants.push(creerIntertitre(INTERTITRES[groupe]), ...duGroupe.map(creerLaCarte));
      }
      if (ignores && (ignores.roles.length > 0 || ignores.constats.length > 0)) {
        enfants.push(creerIntertitre(TEXTES.aFaireDuComposant.ignores), ...ignores.roles.map(creerLaCarteDuRole), ...ignores.constats.map(creerLaCarteIgnoree));
      }
      liste.replaceChildren(...enfants);
    },
  };
}
