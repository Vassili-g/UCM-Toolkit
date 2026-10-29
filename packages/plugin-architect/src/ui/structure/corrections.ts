/**
 * Les corrections de modes et de scopes, à la suite des renommages dans l'onglet Corrections : une carte par correction de mode, une par
 * dossier de scopes, sous les intertitres Modes et Scopes. Chaque ligne se coche ; le pied compte les lignes cochées et Appliquer envoie
 * leurs identifiants, que le sandbox relit avant d'écrire. Le designer voit le scope tel que la fenêtre Edit variable de Figma le nomme.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChemin, creerCheminEnPhrase, creerSegmentAncien, creerSegmentNouveau } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerColonnes, creerLigneDeDiff, creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { TEXTES } from '../textes';
import { creerCarte, creerIntertitre, poserLesMorceaux } from './carte';
import { segmentsQuiChangent, type CarteDeModes, type CarteDeScopes, type LigneDeCorrection } from './lecture';

export interface CorrectionsDeStructure {
  /** Montre les corrections reçues ; `null` tant que le sandbox n'a pas répondu. */
  poser(lecture: { readonly modes: readonly CarteDeModes[]; readonly scopes: readonly CarteDeScopes[] } | null): void;
  /** Le nombre de corrections que la lecture propose, cochées ou non. */
  nombre(): number;
  /** L'application est revenue : la ligne verte dit ce qui s'est écrit. */
  appliquee(ecrites: number, sautees: number): void;
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
  const boutonAppliquer = createButton({ label: TEXTES.appliquer, onClick: () => appliquer(cochees()) });
  pied.append(resume, boutonAppliquer);
  const resultat = document.createElement('div');
  resultat.hidden = true;
  element.append(resultat, liste);

  let lignes: LigneDeCorrection[] = [];
  let enCours = false;
  const decochees = new Set<string>();
  /** Les cartes dépliées par le designer : une lecture qui revient ne les replie pas. */
  const deplies = new Set<string>();
  const cases = new Map<string, HTMLInputElement>();
  const casesDeCarte: { readonly element: HTMLInputElement; readonly ids: readonly string[] }[] = [];

  const cochees = (): string[] => lignes.filter(({ id }) => !decochees.has(id)).map(({ id }) => id);

  function rafraichir(): void {
    for (const [id, caseACocher] of cases) caseACocher.checked = !decochees.has(id);
    for (const { element: caseACocher, ids } of casesDeCarte) {
      const nombre = ids.filter((id) => !decochees.has(id)).length;
      caseACocher.checked = nombre === ids.length;
      caseACocher.indeterminate = nombre > 0 && nombre < ids.length;
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

  function creerLaCase(libelle: string, ids: readonly string[]): HTMLInputElement {
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.className = 'case';
    caseACocher.setAttribute('aria-label', libelle);
    caseACocher.addEventListener('change', () => {
      for (const id of ids) {
        if (caseACocher.checked) decochees.delete(id);
        else decochees.add(id);
      }
      rafraichir();
    });
    return caseACocher;
  }

  /** Une ligne de diff dont la case coche la correction. */
  function creerLaLigne(correction: LigneDeCorrection, avant: Node[], apres: Node[]): HTMLElement {
    const dedans = (noeuds: Node[]): DocumentFragment => {
      const morceau = document.createDocumentFragment();
      morceau.append(...noeuds);
      return morceau;
    };
    const ligne = creerLigneDeDiff(dedans(avant), dedans(apres));
    const caseACocher = ligne.querySelector('input') as HTMLInputElement;
    caseACocher.setAttribute('aria-label', TEXTES.caseDeCorrection(correction.avant));
    caseACocher.addEventListener('change', () => {
      if (caseACocher.checked) decochees.delete(correction.id);
      else decochees.add(correction.id);
      rafraichir();
    });
    cases.set(correction.id, caseACocher);
    return ligne;
  }

  function carteDeModes(carte: CarteDeModes): HTMLElement {
    const [ligne] = carte.lignes;
    const marques = segmentsQuiChangent(ligne.avant, ligne.apres);
    const corps = document.createElement('div');
    corps.append(
      creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres),
      creerLaLigne(ligne, cheminAvecSegments(ligne.avant, marques, 'ancien'), cheminAvecSegments(ligne.apres, marques, 'nouveau')),
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
      scopesApres.textContent = libelles(carte.apres);
      avant.append(creerChemin(ligne.avant), document.createElement('br'), scopesAvant);
      apres.append(creerChemin(ligne.apres), document.createElement('br'), scopesApres);
      corps.append(creerLaLigne(ligne, [avant], [apres]));
    }
    const action = document.createElement('span');
    action.className = 'bloc-phrase';
    action.append(TEXTES.regler(carte.lignes.length));
    carte.roles.forEach((role, rang) => {
      if (rang > 0) action.append(rang === carte.roles.length - 1 ? TEXTES.et : TEXTES.virgule);
      action.append(creerCheminEnPhrase(role));
    });
    action.append(TEXTES.sur + TEXTES.listeDeScopes(carte.apres.map(TEXTES.scopeDeFigma)));
    const fonds = carte.apres.length === 2 && carte.apres.includes('FRAME_FILL') && carte.apres.includes('SHAPE_FILL');
    const motif = [`${TEXTES.reserve(carte.lignes.length)}${fonds ? TEXTES.auxFonds : TEXTES.auxScopes(carte.apres.map(TEXTES.scopeDeFigma))} ${TEXTES.aujourdhui(carte.avant.map(TEXTES.scopeDeFigma), carte.lignes.length)}`];
    const ids = carte.lignes.map(({ id }) => id);
    const caseDeCarte = creerLaCase(TEXTES.caseDeCarte(carte.roles.join(', ')), ids);
    casesDeCarte.push({ element: caseDeCarte, ids });
    return creerCarte({
      tete: [action],
      meta: motif,
      caseACocher: caseDeCarte,
      corps,
      deplie: deplies.has(carte.cle),
      auBasculement: (ouvert) => (ouvert ? deplies.add(carte.cle) : deplies.delete(carte.cle)),
    }).element;
  }

  return {
    poser(lecture) {
      const modes = lecture?.modes ?? [];
      const scopes = lecture?.scopes ?? [];
      lignes = [...modes, ...scopes].flatMap((carte) => carte.lignes);
      cases.clear();
      casesDeCarte.length = 0;
      for (const id of [...decochees]) if (!lignes.some((ligne) => ligne.id === id)) decochees.delete(id);
      const enfants: HTMLElement[] = [];
      if (modes.length > 0) enfants.push(creerIntertitre(TEXTES.groupeModes), ...modes.map(carteDeModes));
      if (scopes.length > 0) enfants.push(creerIntertitre(TEXTES.groupeScopes), ...scopes.map(carteDeScopes));
      if (lignes.length > 0) enfants.push(pied);
      liste.replaceChildren(...enfants);
      element.hidden = lignes.length === 0 && resultat.hidden;
      rafraichir();
      auChangement();
    },
    nombre: () => lignes.length,
    appliquee(ecrites, sautees) {
      resultat.replaceChildren(creerResultat(TEXTES.ecrites(ecrites, sautees)));
      resultat.hidden = false;
      element.hidden = false;
    },
    attendre(valeur) {
      enCours = valeur;
      rafraichir();
    },
  };
}
