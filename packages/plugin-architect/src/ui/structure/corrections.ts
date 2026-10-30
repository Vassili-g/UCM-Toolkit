/**
 * Les corrections de structure, à la suite des renommages dans l'onglet Corrections : une carte par rôle de variable manquante, une par
 * rôle et par mode de cran, une par correction de mode, une par dossier de scopes, sous les intertitres Variables manquantes, Crans,
 * Modes et Scopes. Chaque ligne se coche ; le pied compte les lignes cochées et Appliquer envoie leurs identifiants, que le sandbox
 * relit avant d'écrire. Les lignes de crans arrivent décochées : elles changent une couleur affichée. Le designer voit le scope tel
 * que la fenêtre Edit variable de Figma le nomme.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerTermeFigma } from 'ucm-plugin-socle/src/ui/Terme';
import { creerChemin, creerCheminEnPhrase, creerSegmentAncien, creerSegmentNouveau } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerColonnes, creerLigneDeDiff, creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { TEXTES } from '../textes';
import { creerCarte, creerIntertitre, poserLesMorceaux } from './carte';
import {
  segmentsQuiChangent,
  type CarteDeCrans,
  type CarteDeModes,
  type CarteDeScopes,
  type CarteDeVariables,
  type CorrectionsLues,
  type LigneDeCran,
  type LigneDeCreation,
} from './lecture';

export interface CorrectionsDeStructure {
  /** Montre les corrections reçues ; `null` tant que le sandbox n'a pas répondu. */
  poser(lecture: CorrectionsLues | null): void;
  /** Le nombre de corrections que la lecture propose, cochées ou non. */
  nombre(): number;
  /** Décoche toutes les lignes ; le pied se recompte. */
  toutDecocher(): void;
  /**
   * L'application est revenue : la ligne verte dit ce qui s'est écrit. Elle demande de publier la library quand une des lignes
   * envoyées créait une variable que le sandbox n'a pas sautée, et nomme les créations sautées parce que la variable existait déjà.
   */
  appliquee(ecrites: number, sautees: readonly { readonly id: string; readonly motif: string }[]): void;
  /** L'application est en cours : Appliquer reste inactif. */
  attendre(enCours: boolean): void;
}

export interface OptionsDeCorrections {
  readonly element: HTMLElement;
  /** Appelée quand le nombre de corrections change. */
  readonly auChangement: () => void;
  /** Appelée par Appliquer, avec les identifiants des lignes cochées. */
  readonly appliquer: (ids: readonly string[]) => void;
}

/** Un chemin écrit en texte, dont les segments qui changent prennent la couleur de leur colonne. */
function cheminAvecSegments(nom: string, marques: readonly number[], colonne: 'ancien' | 'nouveau'): Node[] {
  const noeuds: Node[] = [];
  let texte = '';
  nom.split('/').forEach((segment, rang) => {
    const devant = rang > 0 ? '/' : '';
    if (!marques.includes(rang)) {
      texte += `${devant}${segment}`;
      return;
    }
    if (`${texte}${devant}` !== '') noeuds.push(document.createTextNode(`${texte}${devant}`));
    texte = '';
    noeuds.push(colonne === 'ancien' ? creerSegmentAncien(segment) : creerSegmentNouveau(segment));
  });
  if (texte !== '') noeuds.push(document.createTextNode(texte));
  return noeuds;
}

const libelles = (scopes: readonly string[]): string => scopes.map(TEXTES.scopeDeFigma).join(', ');

export function monterLesCorrections({ element, auChangement, appliquer }: OptionsDeCorrections): CorrectionsDeStructure {
  element.hidden = true;
  const liste = document.createElement('div');
  liste.className = 'structure-liste';
  const pied = document.createElement('div');
  pied.className = 'structure-pied';
  const resume = document.createElement('span');
  resume.className = 'structure-resume';
  const boutonAppliquer = createButton({
    label: TEXTES.appliquer,
    onClick: () => {
      envoyees = cochees();
      appliquer(envoyees);
    },
  });
  pied.append(resume, boutonAppliquer);
  const resultat = document.createElement('div');
  resultat.hidden = true;
  element.append(resultat, liste);

  let ids: string[] = [];
  /** Le nom créé par chaque ligne de variable manquante, pour nommer celles que l'application saute. */
  let creations = new Map<string, string>();
  let envoyees: readonly string[] = [];
  let enCours = false;
  const decochees = new Set<string>();
  /** Les lignes déjà montrées : une ligne de crans nouvelle arrive décochée, une lecture qui revient ne rend pas leur case à celles que le designer a décochées ou cochées. */
  const vues = new Set<string>();
  /** Les cartes dépliées par le designer : une lecture qui revient ne les replie pas. */
  const deplies = new Set<string>();
  const cases = new Map<string, HTMLInputElement>();
  const casesDeCarte: { readonly element: HTMLInputElement; readonly ids: readonly string[] }[] = [];

  const cochees = (): string[] => ids.filter((id) => !decochees.has(id));

  function rafraichir(): void {
    for (const [id, caseACocher] of cases) caseACocher.checked = !decochees.has(id);
    for (const { element: caseACocher, ids: deLaCarte } of casesDeCarte) {
      const nombre = deLaCarte.filter((id) => !decochees.has(id)).length;
      caseACocher.checked = nombre === deLaCarte.length;
      caseACocher.indeterminate = nombre > 0 && nombre < deLaCarte.length;
    }
    const nombre = cochees().length;
    if (nombre === 0) resume.textContent = TEXTES.aucuneCorrectionCochee;
    else {
      const texte = TEXTES.appliquerEcrit(nombre);
      const enGras = document.createElement('b');
      enGras.textContent = texte.nombre;
      resume.replaceChildren(texte.debut, enGras, texte.fin);
    }
    boutonAppliquer.disabled = nombre === 0 || enCours;
  }

  function creerLaCase(libelle: string, deLaCarte: readonly string[]): HTMLInputElement {
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.className = 'case';
    caseACocher.setAttribute('aria-label', libelle);
    caseACocher.addEventListener('change', () => {
      for (const id of deLaCarte) {
        if (caseACocher.checked) decochees.delete(id);
        else decochees.add(id);
      }
      rafraichir();
    });
    return caseACocher;
  }

  /** Une ligne de diff dont la case coche la correction. */
  function creerLaLigne(id: string, nom: string, avant: Node[], apres: Node[]): HTMLElement {
    const dedans = (noeuds: Node[]): DocumentFragment => {
      const morceau = document.createDocumentFragment();
      morceau.append(...noeuds);
      return morceau;
    };
    const ligne = creerLigneDeDiff(dedans(avant), dedans(apres));
    const caseACocher = ligne.querySelector('input') as HTMLInputElement;
    caseACocher.setAttribute('aria-label', TEXTES.caseDeCorrection(nom));
    caseACocher.addEventListener('change', () => {
      if (caseACocher.checked) decochees.delete(id);
      else decochees.add(id);
      rafraichir();
    });
    cases.set(id, caseACocher);
    return ligne;
  }

  /** Une carte repliée ou dépliée, dont la case coche toutes les lignes, sous une phrase qui cite un chemin. */
  function carteDe(cle: string, tete: readonly (string | Node)[], meta: readonly (string | Node)[], nomDeLaCase: string, lignesDeLaCarte: readonly { readonly id: string }[], corps: HTMLElement): HTMLElement {
    const action = document.createElement('span');
    action.className = 'bloc-phrase';
    action.append(...tete);
    const deLaCarte = lignesDeLaCarte.map(({ id }) => id);
    const caseDeCarte = creerLaCase(TEXTES.caseDeCarte(nomDeLaCase), deLaCarte);
    casesDeCarte.push({ element: caseDeCarte, ids: deLaCarte });
    return creerCarte({
      tete: [action],
      meta,
      caseACocher: caseDeCarte,
      corps,
      deplie: deplies.has(cle),
      auBasculement: (ouvert) => (ouvert ? deplies.add(cle) : deplies.delete(cle)),
    }).element;
  }

  function carteDeVariables(carte: CarteDeVariables): HTMLElement {
    const corps = document.createElement('div');
    corps.append(creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres));
    const portees = TEXTES.scopesDeLaVariable(libelles(carte.scopes));
    const ligneDeCreation = (ligne: LigneDeCreation): HTMLElement => {
      const avant = document.createElement('span');
      const absente = document.createElement('span');
      absente.className = 'meta';
      absente.textContent = TEXTES.absente;
      avant.append(creerChemin(ligne.nom), document.createElement('br'), absente);
      const apres = document.createElement('span');
      apres.append(creerChemin(ligne.nom));
      for (const { mode, cible } of ligne.cibles) apres.append(document.createElement('br'), nouveau(TEXTES.cibleDuMode(mode, cible)));
      apres.append(document.createElement('br'), nouveau(portees));
      return creerLaLigne(ligne.id, ligne.nom, [avant], [apres]);
    };
    corps.append(...carte.lignes.map(ligneDeCreation));
    const { debut, fin } = TEXTES.creerDansPalettes(carte.lignes.length);
    const [premier, second] = carte.crans;
    const numeriques = carte.crans.every(({ valeur }) => typeof valeur === 'number');
    const vise = carte.crans.length === 2
      ? (numeriques ? TEXTES.viseLesCrans : TEXTES.viseLesCouleurs)(premier.valeur, second.valeur)
      : carte.crans.map(({ mode, valeur }) => TEXTES.viseUnCran(mode, valeur)).join(' ');
    return carteDe(
      carte.cle,
      [debut, creerCheminEnPhrase(carte.role), fin],
      [vise === '' ? TEXTES.prevueDansChaquePalette : `${TEXTES.prevueDansChaquePalette} ${vise}`],
      carte.role,
      carte.lignes,
      corps,
    );
  }

  function carteDeCrans(carte: CarteDeCrans): HTMLElement {
    const corps = document.createElement('div');
    corps.append(creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres));
    const ligneDeCran = (ligne: LigneDeCran): HTMLElement => {
      const marques = segmentsQuiChangent(ligne.avant, ligne.apres);
      const avant = document.createElement('span');
      const variable = document.createElement('span');
      variable.className = 'meta';
      variable.append(creerCheminEnPhrase(ligne.variable));
      avant.append(...cheminAvecSegments(ligne.avant, marques, 'ancien'), document.createElement('br'), variable);
      const apres = document.createElement('span');
      apres.append(...cheminAvecSegments(ligne.apres, marques, 'nouveau'));
      return creerLaLigne(ligne.id, ligne.variable, [avant], [apres]);
    };
    corps.append(...carte.lignes.map(ligneDeCran));
    const { debut, fin } = TEXTES.viserLeCran(carte.attendu, carte.mode);
    return carteDe(
      carte.cle,
      [debut, creerCheminEnPhrase(carte.role), fin],
      [`${TEXTES.attendLeCranAujourdhui(carte.mode, carte.attendu, carte.lu)} ${TEXTES.changeLaCouleur}`],
      carte.role,
      carte.lignes,
      corps,
    );
  }

  function carteDeModes(carte: CarteDeModes): HTMLElement {
    const [ligne] = carte.lignes;
    const marques = segmentsQuiChangent(ligne.avant, ligne.apres);
    const corps = document.createElement('div');
    corps.append(
      creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres),
      creerLaLigne(ligne.id, ligne.avant, cheminAvecSegments(ligne.avant, marques, 'ancien'), cheminAvecSegments(ligne.apres, marques, 'nouveau')),
    );
    const action = document.createElement('span');
    action.className = 'bloc-phrase';
    action.append(TEXTES.viserLaRampe(carte.mode));
    poserLesMorceaux(action, [{ chemin: carte.variable }]);
    const caseDeCarte = creerLaCase(TEXTES.caseDeCarte(carte.variable), [ligne.id]);
    casesDeCarte.push({ element: caseDeCarte, ids: [ligne.id] });
    return creerCarte({
      tete: [action],
      meta: [TEXTES.attendLeCran(carte.mode, carte.cran)],
      caseACocher: caseDeCarte,
      corps,
      deplie: deplies.has(carte.cle),
      auBasculement: (ouvert) => (ouvert ? deplies.add(carte.cle) : deplies.delete(carte.cle)),
    }).element;
  }

  /** Les scopes d'une phrase, chacun en terme de Figma, joints par des virgules et un « et ». */
  function scopesEnPhrase(scopes: readonly string[]): (string | Node)[] {
    return scopes.flatMap((scope, rang) => [
      ...(rang === 0 ? [] : [rang === scopes.length - 1 ? TEXTES.et : TEXTES.virgule]),
      creerTermeFigma(TEXTES.scopeDeFigma(scope)),
    ]);
  }

  function carteDeScopes(carte: CarteDeScopes): HTMLElement {
    const corps = document.createElement('div');
    corps.append(creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres));
    for (const ligne of carte.lignes) {
      const avant = document.createElement('span');
      const apres = document.createElement('span');
      const scopesAvant = document.createElement('span');
      scopesAvant.className = 'meta';
      scopesAvant.textContent = libelles(carte.avant);
      const scopesApres = document.createElement('span');
      scopesApres.className = 'ch-ajout';
      scopesApres.textContent = carte.apres.length === 0 ? TEXTES.aucunScope : libelles(carte.apres);
      avant.append(creerChemin(ligne.avant), document.createElement('br'), scopesAvant);
      apres.append(creerChemin(ligne.apres), document.createElement('br'), scopesApres);
      corps.append(creerLaLigne(ligne.id, ligne.avant, [avant], [apres]));
    }
    const action = document.createElement('span');
    action.className = 'bloc-phrase';
    const retrait = carte.apres.length === 0;
    const motif: (string | Node)[] = [];
    if (retrait) {
      action.append(TEXTES.retirerLesScopes(carte.lignes.length), creerCheminEnPhrase(carte.collection));
    } else {
      action.append(TEXTES.regler(carte.lignes.length));
      carte.roles.forEach((role, rang) => {
        if (rang > 0) action.append(rang === carte.roles.length - 1 ? TEXTES.et : TEXTES.virgule);
        action.append(creerCheminEnPhrase(role));
      });
      action.append(TEXTES.sur, ...scopesEnPhrase(carte.apres));
      const fonds = carte.apres.length === 2 && carte.apres.includes('FRAME_FILL') && carte.apres.includes('SHAPE_FILL');
      motif.push(TEXTES.reserve(carte.lignes.length));
      if (fonds) motif.push(TEXTES.auxFonds);
      else motif.push(TEXTES.aCesScopes, ...scopesEnPhrase(carte.apres), '.');
      motif.push(' ');
    }
    motif.push(TEXTES.aujourdhuiSujet(carte.avant.length, carte.lignes.length), ...scopesEnPhrase(carte.avant), '.');
    const deLaCarte = carte.lignes.map(({ id }) => id);
    const caseDeCarte = creerLaCase(TEXTES.caseDeCarte(carte.roles.join(', ')), deLaCarte);
    casesDeCarte.push({ element: caseDeCarte, ids: deLaCarte });
    return creerCarte({
      tete: [action],
      meta: motif,
      caseACocher: caseDeCarte,
      corps,
      deplie: deplies.has(carte.cle),
      auBasculement: (ouvert) => (ouvert ? deplies.add(carte.cle) : deplies.delete(carte.cle)),
    }).element;
  }

  /** Un texte qui arrive, en vert. */
  function nouveau(texte: string): HTMLElement {
    const arrive = document.createElement('span');
    arrive.className = 'ch-ajout';
    arrive.textContent = texte;
    return arrive;
  }

  return {
    poser(lecture) {
      const variables = lecture?.variables ?? [];
      const crans = lecture?.crans ?? [];
      const modes = lecture?.modes ?? [];
      const scopes = lecture?.scopes ?? [];
      const lignesDeCrans = crans.flatMap((carte) => carte.lignes);
      ids = [...variables, ...crans, ...modes, ...scopes].flatMap((carte) => carte.lignes.map(({ id }) => id));
      creations = new Map(variables.flatMap((carte) => carte.lignes.map((ligne) => [ligne.id, ligne.nom] as const)));
      cases.clear();
      casesDeCarte.length = 0;
      for (const id of [...decochees]) if (!ids.includes(id)) decochees.delete(id);
      for (const id of [...vues]) if (!ids.includes(id)) vues.delete(id);
      for (const { id } of lignesDeCrans) if (!vues.has(id)) decochees.add(id);
      for (const id of ids) vues.add(id);
      const enfants: HTMLElement[] = [];
      if (variables.length > 0) enfants.push(creerIntertitre(TEXTES.groupeVariablesManquantes), ...variables.map(carteDeVariables));
      if (crans.length > 0) enfants.push(creerIntertitre(TEXTES.groupeCrans), ...crans.map(carteDeCrans));
      if (modes.length > 0) enfants.push(creerIntertitre(TEXTES.groupeModes), ...modes.map(carteDeModes));
      if (scopes.length > 0) enfants.push(creerIntertitre(TEXTES.groupeScopes), ...scopes.map(carteDeScopes));
      if (ids.length > 0) enfants.push(pied);
      liste.replaceChildren(...enfants);
      element.hidden = ids.length === 0 && resultat.hidden;
      rafraichir();
      auChangement();
    },
    nombre: () => ids.length,
    toutDecocher() {
      for (const id of ids) decochees.add(id);
      rafraichir();
    },
    appliquee(ecrites, sautees) {
      const sautee = new Set(sautees.map(({ id }) => id));
      const texte = document.createDocumentFragment();
      texte.append(TEXTES.ecrites(ecrites, sautees.length));
      const suites: HTMLElement[] = [];
      for (const { id, motif } of sautees) {
        const nom = creations.get(id);
        const phrase = TEXTES.motifDeSaut[motif];
        if (nom === undefined || phrase === undefined) continue;
        suites.push(suiteDuResultat(creerCheminEnPhrase(nom), ' ', phrase));
      }
      if (envoyees.some((id) => creations.has(id) && !sautee.has(id))) suites.push(suiteDuResultat(TEXTES.publierLaLibrary));
      texte.append(...suites);
      resultat.replaceChildren(creerResultat(texte));
      resultat.hidden = false;
      element.hidden = false;
    },
    attendre(valeur) {
      enCours = valeur;
      rafraichir();
    },
  };
}

/** Une phrase sous la ligne verte du résultat, en gris. */
function suiteDuResultat(...contenu: (string | Node)[]): HTMLElement {
  const suite = document.createElement('span');
  suite.className = 'resultat-suite';
  suite.append(...contenu);
  return suite;
}
