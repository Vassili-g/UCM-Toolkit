/**
 * Le build d'expériences : E1 à E6 de la section « Expériences Figma » du lot 16, jouées sur la sélection et écrites en console,
 * un objet JSON par expérience. Jamais distribué : `UCM_ARCHITECT_EXPERIENCES` vaut `true` seulement dans le build que la bannière
 * esbuild du README prépare. Sans lui, `traiter` rend faux et ne touche à rien.
 *
 * Aucune expérience n'écrit dans le document. E1 et E2 importent des variables par clé, comme le fait déjà l'analyse ; E4 et E5
 * écoutent seulement la page, pendant que le mainteneur fait ses gestes dans Figma.
 */

/** Ce que les expériences lisent d'une variable. */
export interface VariableDExperience { readonly id: string; readonly key: string; readonly valuesByMode: unknown }

/** Un changement de `nodechange`, réduit à ce que E4 et E5 journalisent. */
export interface ChangementDExperience { readonly id: string; readonly type: string; readonly node?: { readonly type?: string; readonly name?: string }; readonly properties?: readonly string[] }
export interface EvenementDExperience { readonly nodeChanges: readonly ChangementDExperience[] }

export interface PortDExperiences {
  /** Vrai dans le build d'expériences seulement. */
  readonly actif: boolean;
  readonly maintenant: () => number;
  readonly attendre: (ms: number) => Promise<void>;
  /** Un objet JSON par expérience, imprimé tel quel en console. */
  readonly sortie: (objet: Record<string, unknown>) => void;
  /** Les variables liées à la sélection et à ses descendants, alias suivis, avec leur clé. */
  readonly variablesDeLaSelection: () => Promise<readonly { readonly id: string; readonly key: string }[]>;
  readonly getVariableByIdAsync: (id: string) => Promise<VariableDExperience | null>;
  readonly importerParCle: (cle: string) => Promise<VariableDExperience>;
  readonly lireLesLibraries: () => Promise<readonly unknown[]>;
  readonly page: {
    on(type: 'nodechange', rappel: (evenement: EvenementDExperience) => void): void;
    off(type: 'nodechange', rappel: (evenement: EvenementDExperience) => void): void;
  };
  /** Demande à l'interface de commencer ou d'arrêter d'envoyer un message toutes les 16 ms. */
  readonly signaler: (etat: 'debut' | 'fin') => void;
}

export type MessageDExperience = { type: 'experience'; code: string } | { type: 'experience-tic' };

export const estUnMessageDExperience = (brut: unknown): brut is MessageDExperience =>
  typeof brut === 'object' && brut !== null && ((brut as { type?: unknown }).type === 'experience' || (brut as { type?: unknown }).type === 'experience-tic');

export const EN_VOL_DE_E1 = [1, 4, 8, 16, 32] as const;
export const REPETITIONS_DE_E1 = 3;
export const APPELS_DE_E3 = 300;
export const DELAIS_DE_E6_S = [0, 5, 10, 20, 30, 60] as const;
export const SERIES_DE_E6 = 3;

export const GESTES_DE_E4 = [
  'Remplacer une variable de padding par une variable de même valeur',
  'Remplacer une variable de remplissage',
  'Retirer une liaison',
  'Changer le mode explicite d\'un variant',
  'Renommer une variable',
  'Changer la valeur d\'une variable',
] as const;
export const GESTES_DE_E5 = [
  'Republier l\'icône d\'un maître distant du Button',
  'Accepter la mise à jour dans le fichier',
] as const;

async function auPlus<T, R>(elements: readonly T[], enVol: number, tache: (element: T) => Promise<R>): Promise<R[]> {
  const rendus: R[] = new Array(elements.length);
  let suivant = 0;
  const travailleur = async (): Promise<void> => {
    while (suivant < elements.length) {
      const rang = suivant++;
      rendus[rang] = await tache(elements[rang]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(enVol, elements.length) }, travailleur));
  return rendus;
}

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

export function creerLesExperiences(port: PortDExperiences): { traiter(message: unknown): boolean } {
  let tics = 0;
  let ecoute: { code: 'E4' | 'E5'; rappel: (evenement: EvenementDExperience) => void; debut: number; journal: Record<string, unknown>[] } | null = null;

  async function e1(): Promise<void> {
    const cles = (await port.variablesDeLaSelection()).map((variable) => variable.key);
    const essais: Record<string, unknown>[] = [];
    for (const enVol of EN_VOL_DE_E1) {
      for (let repetition = 1; repetition <= REPETITIONS_DE_E1; repetition += 1) {
        const debut = port.maintenant();
        let erreurs = 0;
        await auPlus(cles, enVol, (cle) => port.importerParCle(cle).catch(() => { erreurs += 1; }));
        essais.push({ enVol, repetition, ms: port.maintenant() - debut, erreurs });
      }
    }
    port.sortie({ experience: 'E1', cles: cles.length, essais });
  }

  async function e2(): Promise<void> {
    const variables = await port.variablesDeLaSelection();
    const ecarts: Record<string, unknown>[] = [];
    const durees: Record<string, unknown>[] = [];
    let identiques = 0;
    for (const { id, key } of variables) {
      const debutId = port.maintenant();
      const lue = await port.getVariableByIdAsync(id);
      const msId = port.maintenant() - debutId;
      const debutImport = port.maintenant();
      const importee = await port.importerParCle(key).catch(() => null);
      const msImport = port.maintenant() - debutImport;
      const memesIdentifiants = lue !== null && importee !== null && lue.id === importee.id;
      const memesValeurs = lue !== null && importee !== null && JSON.stringify(lue.valuesByMode) === JSON.stringify(importee.valuesByMode);
      if (memesIdentifiants && memesValeurs) identiques += 1;
      else ecarts.push({ key, memesIdentifiants, memesValeurs, importee: importee !== null });
      durees.push({ key, msId, msImport });
    }
    port.sortie({ experience: 'E2', cles: variables.length, identiques, ecarts, durees });
  }

  async function e3(): Promise<void> {
    const variables = await port.variablesDeLaSelection();
    if (variables.length === 0) { port.sortie({ experience: 'E3', erreur: 'Aucune variable liée à la sélection.' }); return; }
    port.signaler('debut');
    try {
      await port.attendre(200);
      tics = 0;
      const debut = port.maintenant();
      for (let appel = 0; appel < APPELS_DE_E3; appel += 1) await port.getVariableByIdAsync(variables[appel % variables.length].id);
      const ms = port.maintenant() - debut;
      port.sortie({ experience: 'E3', appels: APPELS_DE_E3, ms, messagesRecus: tics, messagesAttendus: Math.floor(ms / 16) });
    } finally {
      port.signaler('fin');
    }
  }

  function commencerLEcoute(code: 'E4' | 'E5'): void {
    if (ecoute) { port.sortie({ experience: code, erreur: `${ecoute.code} écoute déjà ; jouer ${ecoute.code}-fin d'abord.` }); return; }
    const journal: Record<string, unknown>[] = [];
    const debut = port.maintenant();
    const rappel = (evenement: EvenementDExperience): void => {
      for (const changement of evenement.nodeChanges) {
        const ligne = { ms: port.maintenant() - debut, type: changement.type, noeud: changement.node?.type ?? null, nom: changement.node?.name ?? null, id: changement.id, proprietes: changement.properties ?? [] };
        journal.push(ligne);
        port.sortie({ experience: code, evenement: ligne });
      }
    };
    ecoute = { code, rappel, debut, journal };
    port.page.on('nodechange', rappel);
    port.sortie({ experience: code, etat: 'ecoute', gestes: code === 'E4' ? GESTES_DE_E4 : GESTES_DE_E5, fin: `ucmExperience('${code}-fin')` });
  }

  function finirLEcoute(code: 'E4' | 'E5'): void {
    if (!ecoute || ecoute.code !== code) { port.sortie({ experience: code, erreur: `${code} n'écoute pas.` }); return; }
    port.page.off('nodechange', ecoute.rappel);
    port.sortie({ experience: code, etat: 'fini', ms: port.maintenant() - ecoute.debut, evenements: ecoute.journal });
    ecoute = null;
  }

  async function e6(): Promise<void> {
    const series: Record<string, unknown>[][] = [];
    for (let serie = 0; serie < SERIES_DE_E6; serie += 1) {
      const lignes: Record<string, unknown>[] = [];
      for (const delai of DELAIS_DE_E6_S) {
        await port.lireLesLibraries();
        await port.attendre(delai * 1000);
        const debut = port.maintenant();
        const libraries = await port.lireLesLibraries();
        lignes.push({ delaiS: delai, ms: port.maintenant() - debut, libraries: libraries.length });
      }
      series.push(lignes);
    }
    port.sortie({ experience: 'E6', series });
  }

  const JOUEES: Readonly<Record<string, () => Promise<void> | void>> = {
    E1: e1, E2: e2, E3: e3, E6: e6,
    E4: () => commencerLEcoute('E4'), 'E4-fin': () => finirLEcoute('E4'),
    E5: () => commencerLEcoute('E5'), 'E5-fin': () => finirLEcoute('E5'),
  };

  return {
    traiter(message) {
      if (!port.actif || !estUnMessageDExperience(message)) return false;
      if (message.type === 'experience-tic') { tics += 1; return true; }
      const jouer = JOUEES[message.code];
      if (!jouer) { port.sortie({ experience: message.code, erreur: `Expérience inconnue ; codes admis : ${Object.keys(JOUEES).join(', ')}.` }); return true; }
      void Promise.resolve().then(jouer).catch((erreur: unknown) => port.sortie({ experience: message.code, erreur: messageDe(erreur) }));
      return true;
    },
  };
}

/** Ce que la collecte lit d'un nœud : ses liaisons et ses descendants. */
export interface NoeudDeCollecte {
  readonly boundVariables?: unknown;
  readonly fills?: unknown;
  readonly strokes?: unknown;
  findAll?(): readonly NoeudDeCollecte[];
}

function idsDeLiaisons(valeur: unknown, ids: Set<string>): void {
  if (Array.isArray(valeur)) { for (const element of valeur) idsDeLiaisons(element, ids); return; }
  if (typeof valeur !== 'object' || valeur === null) return;
  const alias = valeur as { type?: unknown; id?: unknown };
  if (alias.type === 'VARIABLE_ALIAS' && typeof alias.id === 'string') { ids.add(alias.id); return; }
  for (const enfant of Object.values(valeur)) idsDeLiaisons(enfant, ids);
}

/**
 * Les variables que la sélection lie, ses descendants compris, puis les cibles de leurs alias. Elle ne suit pas les maîtres
 * d'instance : les expériences portent sur les liaisons du jeu sélectionné.
 */
export async function variablesDeLaSelection(
  selection: readonly NoeudDeCollecte[],
  lire: (id: string) => Promise<VariableDExperience | null>,
): Promise<{ id: string; key: string }[]> {
  const ids = new Set<string>();
  for (const racine of selection) {
    for (const noeud of [racine, ...(racine.findAll?.() ?? [])]) {
      idsDeLiaisons(noeud.boundVariables, ids);
      idsDeLiaisons(noeud.fills, ids);
      idsDeLiaisons(noeud.strokes, ids);
    }
  }
  const rendues = new Map<string, { id: string; key: string }>();
  const aLire = [...ids];
  while (aLire.length > 0) {
    const id = aLire.pop()!;
    if (rendues.has(id)) continue;
    const variable = await lire(id).catch(() => null);
    if (!variable) continue;
    rendues.set(id, { id: variable.id, key: variable.key });
    const cibles = new Set<string>();
    idsDeLiaisons(variable.valuesByMode, cibles);
    for (const cible of cibles) if (!rendues.has(cible)) aLire.push(cible);
  }
  return [...rendues.values()];
}
