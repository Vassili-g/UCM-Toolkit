/**
 * Les corrections de structure : une carte par rôle de variable manquante, une par rôle et par mode de cran, une par correction de mode,
 * une par dossier de scopes, rangées dans le conteneur de leur catégorie (Variables manquantes, Crans, Modes, Scopes). Chaque ligne se
 * coche, et toutes arrivent décochées, y compris une ligne qu'une relecture ajoute : le module ne garde que les lignes cochées. Le
 * pied commun (`tokens/cochage.ts`) compte les lignes cochées et envoie leurs identifiants, que le sandbox relit avant d'écrire.
 * « Tout cocher » et « Tout décocher » de chaque catégorie sont rendus ici, et le panneau les pose sous la bande de la section. Le
 * designer voit le scope tel que la fenêtre Edit variable de Figma le nomme.
 *
 * Une catégorie de plus de `SEUIL_DE_LISTE` cartes les range dans une liste virtuelle (`virtualisation.ts`). Les cases cochées et les
 * cartes dépliées vivent dans des ensembles du module, et « Tout cocher » les lit : une carte hors du DOM compte comme les autres.
 * Une carte créée à son arrivée à l'écran prend ses cases dans ces ensembles.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { creerTermeFigma } from 'ucm-plugin-socle/src/ui/Terme';
import { creerChemin, creerCheminEnPhrase, creerSegmentAncien, creerSegmentNouveau } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerColonnes, creerLigneDeDiff, creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { TEXTES } from '../textes';
import { creerLesGestesDeSection } from '../tokens/cochage';
import { creerHoteDeCartes, type CarteDeSection, type HoteDeCartes } from '../virtualisation';
import { creerCarte, poserLesMorceaux } from './carte';
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

/** Les catégories dont les corrections se rangent dans un conteneur à elles. */
export type CategorieDeCorrection = 'manquantes' | 'crans' | 'modes' | 'scopes';

export interface CorrectionsDeStructure {
  /** Montre les corrections reçues ; `null` tant que le sandbox n'a pas répondu. Une ligne nouvelle arrive décochée. */
  poser(lecture: CorrectionsLues | null): void;
  /** Le nombre de lignes de correction que la lecture propose, cochées ou non. */
  nombre(): number;
  /** Les identifiants des lignes cochées, dans l'ordre de la lecture. */
  idsCoches(): readonly string[];
  /** Coche toutes les lignes, ou celles d'une catégorie. */
  toutCocher(categorie?: CategorieDeCorrection): void;
  /** Décoche toutes les lignes, ou celles d'une catégorie. */
  toutDecocher(categorie?: CategorieDeCorrection): void;
  /** « Tout cocher » et « Tout décocher » de chaque catégorie ; l'élément est masqué quand la catégorie n'a aucune ligne. */
  readonly gestes: Readonly<Record<CategorieDeCorrection, HTMLElement>>;
  /**
   * L'application est revenue pour ces lignes envoyées : la ligne verte dit ce qui s'est écrit. Elle demande de publier la library
   * quand une des lignes envoyées créait une variable que le sandbox n'a pas sautée, et nomme les créations sautées parce que la
   * variable existait déjà. Une alerte à vérifier nomme les variables créées que l'Historique ne pourra pas annuler.
   */
  appliquee(envoyees: readonly string[], ecrites: number, sautees: readonly { readonly id: string; readonly motif: string }[], sansAnnulation: readonly string[]): void;
}

export interface OptionsDeCorrections {
  /** Là où la ligne verte du résultat se pose ; masqué tant qu'il n'y a rien à dire. */
  readonly element: HTMLElement;
  /** Le conteneur des cartes de chaque catégorie. */
  readonly hotes: Readonly<Record<CategorieDeCorrection, HTMLElement>>;
  /** Appelée quand les lignes ou les cases changent : le pied commun se recompte. */
  readonly auChangement: () => void;
  /** Vrai quand la puce Questions du sommaire isole les cartes qui posent une question : aucune correction n'en est une. */
  readonly questionsSeules?: () => boolean;
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

const CATEGORIES: readonly CategorieDeCorrection[] = ['manquantes', 'crans', 'modes', 'scopes'];

export function monterLesCorrections({ element, hotes, auChangement, questionsSeules }: OptionsDeCorrections): CorrectionsDeStructure {
  element.hidden = true;
  const resultat = document.createElement('div');
  resultat.hidden = true;
  element.append(resultat);

  let ids: string[] = [];
  /** Les identifiants de chaque catégorie, pour les gestes d'une section. */
  let idsParCategorie: Readonly<Record<CategorieDeCorrection, readonly string[]>> = { manquantes: [], crans: [], modes: [], scopes: [] };
  /** Le nom créé par chaque ligne de variable manquante, pour distinguer les créations des autres lignes. */
  let creations = new Map<string, string>();
  /** La variable que chaque ligne de correction vise, pour nommer celles que l'application saute. */
  let designations = new Map<string, string>();
  /** Les lignes cochées : une ligne qui n'y est pas est décochée, donc toute ligne arrive décochée, relecture comprise. */
  const cochees = new Set<string>();
  /** Les cartes dépliées par le designer : une lecture qui revient ne les replie pas. */
  const deplies = new Set<string>();
  const cases = new Map<string, HTMLInputElement>();
  const casesDeCarte: { readonly element: HTMLInputElement; readonly ids: readonly string[] }[] = [];
  const listes = Object.fromEntries(CATEGORIES.map((categorie) => [categorie, creerHoteDeCartes(hotes[categorie], questionsSeules)])) as Record<CategorieDeCorrection, HoteDeCartes>;
  const gestes = Object.fromEntries(CATEGORIES.map((categorie) => {
    const deLaCategorie = creerLesGestesDeSection(() => cocherLes(idsParCategorie[categorie], true), () => cocherLes(idsParCategorie[categorie], false));
    deLaCategorie.hidden = true;
    return [categorie, deLaCategorie];
  })) as Record<CategorieDeCorrection, HTMLElement>;

  function rafraichir(): void {
    for (const [id, caseACocher] of cases) caseACocher.checked = cochees.has(id);
    for (const carte of casesDeCarte) accorderLaCaseDeCarte(carte);
  }

  function accorderLaCaseDeCarte({ element: caseACocher, ids: deLaCarte }: { readonly element: HTMLInputElement; readonly ids: readonly string[] }): void {
    const nombre = deLaCarte.filter((id) => cochees.has(id)).length;
    caseACocher.checked = nombre === deLaCarte.length;
    caseACocher.indeterminate = nombre > 0 && nombre < deLaCarte.length;
  }

  /** Coche ou décoche ces lignes, remet les cases d'accord, puis prévient le pied commun. */
  function cocherLes(lignes: readonly string[], coche: boolean): void {
    for (const id of lignes) {
      if (coche) cochees.add(id);
      else cochees.delete(id);
    }
    rafraichir();
    auChangement();
  }

  function creerLaCase(libelle: string, deLaCarte: readonly string[]): HTMLInputElement {
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.className = 'case';
    caseACocher.setAttribute('aria-label', libelle);
    caseACocher.addEventListener('change', () => cocherLes(deLaCarte, caseACocher.checked));
    accorderLaCaseDeCarte({ element: caseACocher, ids: deLaCarte });
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
    caseACocher.addEventListener('change', () => cocherLes([id], caseACocher.checked));
    caseACocher.checked = cochees.has(id);
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
      const idsDe = (cartes: readonly { readonly lignes: readonly { readonly id: string }[] }[]): string[] => cartes.flatMap((carte) => carte.lignes.map(({ id }) => id));
      idsParCategorie = { manquantes: idsDe(variables), crans: idsDe(crans), modes: idsDe(modes), scopes: idsDe(scopes) };
      ids = CATEGORIES.flatMap((categorie) => idsParCategorie[categorie]);
      creations = new Map(variables.flatMap((carte) => carte.lignes.map((ligne) => [ligne.id, ligne.nom] as const)));
      designations = new Map([
        ...creations,
        ...crans.flatMap((carte) => carte.lignes.map((ligne) => [ligne.id, ligne.variable] as const)),
        ...modes.flatMap((carte) => carte.lignes.map((ligne) => [ligne.id, carte.variable] as const)),
        ...scopes.flatMap((carte) => carte.lignes.map((ligne) => [ligne.id, ligne.avant] as const)),
      ]);
      cases.clear();
      casesDeCarte.length = 0;
      for (const id of [...cochees]) if (!ids.includes(id)) cochees.delete(id);
      const cartes = <Carte extends { readonly cle: string }>(liste: readonly Carte[], creer: (carte: Carte) => HTMLElement): CarteDeSection[] => liste.map((carte) => ({ cle: carte.cle, creer: () => creer(carte) }));
      listes.manquantes.poser(cartes(variables, carteDeVariables), true);
      listes.crans.poser(cartes(crans, carteDeCrans), true);
      listes.modes.poser(cartes(modes, carteDeModes), true);
      listes.scopes.poser(cartes(scopes, carteDeScopes), true);
      for (const categorie of CATEGORIES) gestes[categorie].hidden = idsParCategorie[categorie].length === 0;
      element.hidden = ids.length === 0 && resultat.hidden;
      rafraichir();
      auChangement();
    },
    nombre: () => ids.length,
    idsCoches: () => ids.filter((id) => cochees.has(id)),
    toutCocher: (categorie) => cocherLes(categorie ? idsParCategorie[categorie] : ids, true),
    toutDecocher: (categorie) => cocherLes(categorie ? idsParCategorie[categorie] : ids, false),
    gestes,
    appliquee(envoyees, ecrites, sautees, sansAnnulation) {
      const sautee = new Set(sautees.map(({ id }) => id));
      const texte = document.createDocumentFragment();
      texte.append(TEXTES.ecrites(ecrites, sautees.length));
      const suites: HTMLElement[] = [];
      // Chaque motif de saut a sa phrase (E-24) : celle d'une ligne que l'écran connaît cite sa variable, les autres la disent une fois.
      const dits = new Set<string>();
      for (const { id, motif } of sautees) {
        const nom = designations.get(id);
        const phrase = TEXTES.motifDeSaut[motif];
        if (phrase === undefined) continue;
        if (nom !== undefined) suites.push(suiteDuResultat(creerCheminEnPhrase(nom), ' ', phrase));
        else if (!dits.has(motif)) {
          dits.add(motif);
          suites.push(suiteDuResultat(phrase));
        }
      }
      if (envoyees.some((id) => creations.has(id) && !sautee.has(id))) suites.push(suiteDuResultat(TEXTES.publierLaLibrary));
      texte.append(...suites);
      resultat.replaceChildren(creerResultat(texte));
      if (sansAnnulation.length > 0) resultat.append(avertissementSansAnnulation(sansAnnulation));
      resultat.hidden = false;
      element.hidden = false;
    },
  };
}

/** L'alerte des créations que l'Historique ne pourra pas annuler : les noms, sans bouton. */
function avertissementSansAnnulation(noms: readonly string[]): HTMLElement {
  const T = TEXTES.sansAnnulation;
  const liste = document.createElement('div');
  noms.forEach((nom, rang) => {
    if (rang > 0) liste.append(document.createElement('br'));
    liste.append(creerCheminEnPhrase(nom));
  });
  return creerAlerte('verifier', { titre: T.titre, texte: liste, meta: T.suite });
}

/** Une phrase sous la ligne verte du résultat, en gris. */
function suiteDuResultat(...contenu: (string | Node)[]): HTMLElement {
  const suite = document.createElement('span');
  suite.className = 'resultat-suite';
  suite.append(...contenu);
  return suite;
}
