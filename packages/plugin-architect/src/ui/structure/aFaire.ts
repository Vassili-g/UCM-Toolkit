/**
 * Les constats à régler dans Figma, une carte par constat, rangés dans le conteneur de leur famille : la section de la catégorie les
 * montre sous sa bande. Le liseré, l'icône et le mot de la carte disent le type ; la phrase dit le problème, le lieu cite les variables,
 * la ligne grise dit où le régler. Rien ne s'écrit d'ici : le geste se fait dans la fenêtre Variables de Figma, et « Ouvrir la fiche »
 * montre la variable dans l'explorateur.
 *
 * Ignorer (Q6) : la carte d'un rôle absent d'une palette offre un menu à deux choix, « Pour cette palette » et « Dans tout le fichier ».
 * Les constats ignorés pour leur palette et les rôles ignorés partout se rangent sous l'intertitre Ignorés, en cartes muettes, chacune
 * avec « Ne plus ignorer ».
 *
 * Tant que les constats affichés sont ceux de la révision précédente (`figer`), les boutons qui envoient un geste au sandbox (Ignorer,
 * ses deux choix, Ne plus ignorer, la fusion d'un choix) sont désactivés : un geste sur un constat périmé écrirait ou relirait pour rien.
 *
 * Un conteneur de plus de `SEUIL_DE_LISTE` cartes les range dans une liste virtuelle (`virtualisation.ts`) : seules les cartes à l'écran
 * existent dans le DOM. Une carte créée est gardée avec son menu d'Ignorer jusqu'à la lecture suivante.
 */
import { creerGravite, marquerDuTon } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { TEXTES } from '../textes';
import { creerHoteDeCartes, type CarteDeSection } from '../virtualisation';
import { creerCarte, creerIntertitre, poserLesMorceaux } from './carte';
import { GROUPES, type ChoixDeCarte, type ConstatAFaire, type GroupeDeConstat, type Morceau } from './lecture';

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
  /** Fusionne les variables d'un rôle en double dans celle que le designer garde ; absent, les choix restent des lignes. */
  readonly fusionner?: (constat: string, garder: string) => void;
}

export interface AFaire {
  /**
   * Range les constats reçus dans le conteneur de leur famille, et ceux qui sont ignorés dans le conteneur des Ignorés ; `null` tant
   * que le sandbox n'a pas répondu. `questions` nomme les constats qui posent une question : leur carte porte `constat-question`.
   */
  poser(constats: readonly ConstatAFaire[] | null, ignores?: IgnoresLus, questions?: ReadonlySet<string>): void;
  /** Désactive les boutons de geste des cartes affichées et de celles que la liste virtuelle créera ; `false` les rouvre. */
  figer(figees: boolean): void;
}

/** Les boutons qui envoient un geste au sandbox portent cet attribut : `figer` les retrouve. */
const GESTE = 'data-geste';

function marquerLeGeste<Bouton extends HTMLElement>(bouton: Bouton): Bouton {
  bouton.setAttribute(GESTE, '');
  return bouton;
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

/** Un bouton texte qui envoie un geste au sandbox. */
function boutonDeGeste(libelle: string, nomAccessible: string, auClic: () => void): HTMLButtonElement {
  return marquerLeGeste(boutonTexte(libelle, nomAccessible, auClic));
}

/** Le bouton Ignorer d'une carte de rôle absent, et son menu à deux choix. Échap ou un clic ailleurs le referme. */
function creerLeMenuIgnorer(constat: ConstatAFaire, role: string, gestes: GestesDIgnorer): HTMLElement {
  const T = TEXTES.aFaireDuComposant;
  const hote = document.createElement('span');
  hote.className = 'ignorer-hote';
  const declencheur = createButton({ label: T.ignorer, variant: 'secondary', compact: true, onClick: () => basculer(menu.hidden) });
  marquerLeGeste(declencheur);
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
    marquerLeGeste(bouton);
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

/** Le dessin d'un choix de texte : un bouton et un encadré portent le texte noir ou blanc, chacun sous sa légende. */
function creerLeDessin(texte: 'noir' | 'blanc'): HTMLElement {
  const dessin = document.createElement('span');
  dessin.className = 'sens-dessin';
  const bouton = document.createElement('span');
  bouton.className = 'sens-bouton';
  const encadre = document.createElement('span');
  encadre.className = 'sens-encadre';
  // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
  for (const forme of [bouton, encadre]) {
    if (texte === 'noir') forme.classList.add('texte-noir');
    else forme.classList.add('texte-blanc');
    const trait = document.createElement('span');
    trait.className = 'sens-trait';
    forme.append(trait);
  }
  const sousSaLegende = (forme: HTMLElement, legende: string): HTMLElement => {
    const figure = document.createElement('span');
    figure.className = 'sens-figure';
    const mot = document.createElement('span');
    mot.className = 'sens-legende';
    mot.textContent = legende;
    figure.append(forme, mot);
    return figure;
  };
  dessin.append(sousSaLegende(bouton, TEXTES.dessinBouton), sousSaLegende(encadre, TEXTES.dessinEncadre));
  return dessin;
}

/** Les réponses d'une question, sous la phrase : aucune n'est cochée, le designer la fait dans la fenêtre Variables. */
function creerLesChoix(choix: readonly ChoixDeCarte[], gestes: GestesDIgnorer): HTMLElement {
  const liste = document.createElement('span');
  liste.className = 'constat-choix';
  liste.setAttribute('role', 'list');
  for (const { libelle, dessin, fusion } of choix) {
    const ligne = document.createElement('span');
    ligne.className = 'constat-choix-ligne';
    ligne.setAttribute('role', 'listitem');
    const mot = document.createElement('span');
    mot.textContent = libelle;
    // Une fusion s'écrit sur un clic du designer, jamais cochée d'avance : le choix devient un bouton texte qui porte le libellé.
    if (fusion && gestes.fusionner) {
      const fusionner = gestes.fusionner;
      ligne.append(boutonDeGeste(libelle, libelle, () => fusionner(fusion.constat, fusion.garder)));
    } else {
      ligne.append(...(dessin === null ? [mot] : [creerLeDessin(dessin), mot]));
    }
    liste.append(ligne);
  }
  return liste;
}

function creerLeCorps(constat: ConstatAFaire, ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void, gestes: GestesDIgnorer): HTMLElement | null {
  const { faits, variable, role, variables } = constat;
  if (faits.length === 0 && !variable && role === null && variables.length === 0) return null;
  const corps = document.createElement('div');
  if (variables.length > 0) {
    const liste = document.createElement('div');
    liste.className = 'constat-variables';
    for (const nom of variables) {
      const ligne = document.createElement('div');
      poserLesMorceaux(ligne, [{ chemin: nom }]);
      liste.append(ligne);
    }
    corps.append(liste);
  }
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

export function monterAFaire(
  hotes: Readonly<Record<GroupeDeConstat, HTMLElement>>,
  hoteDesIgnores: HTMLElement,
  ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void,
  gestes: GestesDIgnorer,
  /** Vrai quand la puce Questions du sommaire isole les cartes qui posent une question. */
  questionsSeules: () => boolean = () => false,
): AFaire {
  /** Les constats dépliés par le designer : un nouveau message ne les replie pas. */
  const deplies = new Set<string>();
  const lignes = Object.fromEntries(GROUPES.map((groupe) => [groupe, creerHoteDeCartes(hotes[groupe], questionsSeules)])) as Record<GroupeDeConstat, ReturnType<typeof creerHoteDeCartes>>;
  const ligneDesIgnores = creerHoteDeCartes(hoteDesIgnores);
  let figees = false;

  /** Aligne les boutons de geste d'une carte, ou de tout un conteneur, sur l'état figé. */
  function accorderLesGestes(racine: HTMLElement): void {
    for (const bouton of Array.from(racine.querySelectorAll<HTMLButtonElement>(`[${GESTE}]`))) bouton.disabled = figees;
  }

  function creerLaCarte(constat: ConstatAFaire, question: boolean): HTMLElement {
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
    if (constat.choix.length > 0) meta.push(document.createElement('br'), creerLesChoix(constat.choix, gestes));
    if (constat.variables.length > 0) {
      const voir = document.createElement('span');
      voir.className = 'constat-voir';
      voir.textContent = TEXTES.voirLesVariablesDuGroupe(constat.variables.length);
      meta.push(document.createElement('br'), voir);
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
    if (question) element.classList.add('constat-question');
    marquerDuTon(element, constat.type);
    accorderLesGestes(element);
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
      meta: [lieu, document.createElement('br'), boutonDeGeste(T.nePlusIgnorer, T.nePlusIgnorerCeConstat(dite), () => gestes.nePlusIgnorerLeConstat(constat.id))],
      corps: null,
      deplie: false,
    });
    element.classList.add('bloc-constat', 'muette');
    accorderLesGestes(element);
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
      meta: [boutonDeGeste(T.nePlusIgnorer, T.nePlusIgnorerCeConstat(role), () => gestes.nePlusIgnorerLeRole(role))],
      corps: null,
      deplie: false,
    });
    element.classList.add('bloc-constat', 'muette');
    accorderLesGestes(element);
    return element;
  }

  return {
    figer(suivantes) {
      if (suivantes === figees) return;
      figees = suivantes;
      for (const hote of [...Object.values(hotes), hoteDesIgnores]) accorderLesGestes(hote);
    },
    poser(constats, ignores, questions = new Set()) {
      for (const groupe of GROUPES) {
        const duGroupe = (constats ?? []).filter((constat) => constat.groupe === groupe);
        lignes[groupe].poser(duGroupe.map((constat): CarteDeSection => ({
          cle: constat.id,
          question: questions.has(constat.id),
          creer: () => creerLaCarte(constat, questions.has(constat.id)),
        })), true);
      }
      const ecartes = ignores !== undefined && (ignores.roles.length > 0 || ignores.constats.length > 0);
      hoteDesIgnores.hidden = !ecartes;
      ligneDesIgnores.poser(ignores && ecartes
        ? [
            { cle: 'intertitre', intertitre: true, creer: () => creerIntertitre(TEXTES.aFaireDuComposant.ignores) },
            ...ignores.roles.map((role): CarteDeSection => ({ cle: `role:${role}`, creer: () => creerLaCarteDuRole(role) })),
            ...ignores.constats.map((constat): CarteDeSection => ({ cle: `constat:${constat.id}`, creer: () => creerLaCarteIgnoree(constat) })),
          ]
        : [], true);
    },
  };
}
