/**
 * Les opérateurs d'états et de filtres du stress test F9 (section 3.4 du plan) : library à choisir (Li, 20 cas), déclaration UCM (Hu, 19),
 * ignorés (Ig, 19) et table de vérité du statut (St, 38).
 *
 * L'oracle suit l'inventaire (section 5) et la table de la section 2.5 : une analyse dont une part n'a pas été jugée est `partielle` et
 * son écran le dit ; hors UCM, le sandbox saute les familles thème et structure, le panneau ne montre que l'alerte et l'écriture saute
 * en `non-ucm` ; une déclaration illisible est dite, jamais prise pour « libre » ; quand tous les constats sont ignorés, l'écran garde
 * le moyen de les restaurer. Les cas qui dépendent d'une réponse Q-F89-* sont `mesure`.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { ecrireLeLot, type ApiDeLiaisons } from '../../../src/ecriture/liaisons';
import { rangementDeFigma, traiterAvec as traiterLesIgnores } from '../../../src/sandbox/ignores';
import { atelierDEcriture, type VariableDEcriture } from '../../../tests/figmaDeTest';
import { Registre, type CasF8, type SortieDeCas } from './cas';
import { rendre } from './injecteur';
import { point } from './operateursMoteur';
import { lireLaPage } from './pageDeRegles';
import { composantDeLaForme, DECLARATIONS } from './scenarioDeBase';
import {
  ajouterUneSeance, avecLecteurs, barreApres, bibliothequesIllisibles, catalogueDuProduit, DECLARATION_FUTURE, DECLARATION_ILLISIBLE, DIT,
  ecranDe_, etatApres, ignoresDuProduit, jouerSeance, moteurAvecPoints, observationDe, PARTIES, pannesDe, sansConstatsDuKit, statutDesParties, specConforme,
  type Adaptateur, type CasDeSeance, type Ecran, type EtatDeLaBarre, type Partie, type Seance,
} from './seance';

const H13 = 'hypothèse 13 de 6.1 (le statut final ignore les lectures refusées ; AAA devient AA sans le dire)';
const H16 = 'hypothèse 16 de 6.1 (tous les constats ignorés : « Aucun constat » avant la liste des ignorés)';
const H17 = 'hypothèse 17 de 6.1 (une déclaration UCM qui lève donne `architectureUcm` faux en silence)';
const H18 = 'hypothèse 18 de 6.1 (une library illisible ou une collection inaccessible laisse `complete` sans signal)';
const H22 = 'hypothèse 22 de 6.1 (la garde « library à choisir » ne vaut que pour une première analyse, et la prélecture l’ignore)';
const PAS_AUCUN = /Aucun constat/;

// ---------------------------------------------------------------------------------------------------------------------------
// Li : library à choisir

const lectureDeLibrary = (nom: string, collection = 'components', illisibles: unknown[] = []) => ({
  etat: 'lue', illisibles,
  collections: [{ cle: `c-${nom}`, nom: collection, library: nom, variables: [{ cle: `v-${nom}`, nom: 'alert/color/info/background', type: 'COLOR' }] }],
});
const deuxLibraries = (): unknown => ({
  etat: 'lue', illisibles: [],
  collections: ['Intencial', 'Autre'].map((nom) => ({ cle: `c-${nom}`, nom: 'components', library: nom, variables: [{ cle: `v-${nom}`, nom: 'alert/color/info/background', type: 'COLOR' }] })),
});

let messagesDeReference: Promise<readonly import('../../../src/messages').PluginMessage[]> | null = null;
/** Les messages d'une analyse complète d'A0 : l'interface en tire une analyse déjà rendue. */
const analyseDeReference = (): Promise<readonly import('../../../src/messages').PluginMessage[]> => {
  messagesDeReference ??= jouerSeance({}, async (s) => { await s.demander(); }, (s) => ({ messages: [...s.messages] }))
    .then((sortie) => (sortie.donnees as { messages: import('../../../src/messages').PluginMessage[] }).messages);
  return messagesDeReference;
};

function operateursLiInterface(r: Registre): void {
  for (const candidates of [0, 1, 2]) {
    for (const choisie of [false, true]) {
      for (const nouvelle of [false, true]) {
        const aChoisir = candidates >= 2 && !choisie;
        r.ajouter('Li', {
          description: `${candidates === 2 ? '2 libraries ou plus' : `${candidates} library`} candidate(s), library ${choisie ? 'choisie' : 'non choisie'}, ${nouvelle ? 'nouvelle analyse' : 'première analyse'} : Analyser ${aChoisir ? 'inactif' : 'actif'}`,
          relations: [],
          jouer: async (): Promise<SortieDeCas> => {
            const etat = await etatApres(nouvelle ? await analyseDeReference() : [], {
              architecture: 'ucm', reference: { library: choisie ? 'Intencial' : null, nom: choisie ? 'Intencial' : null, candidates },
            });
            return { constats: [], donnees: { barre: await barreApres(etat), ecran: await ecranDe_(etat) } };
          },
          verifier: (sortie) => {
            const { barre, ecran } = sortie.donnees as { barre: EtatDeLaBarre; ecran: Ecran };
            const messages: string[] = [];
            if (barre.analyserInactif !== aChoisir) messages.push(`Analyser ${barre.analyserInactif ? 'inactif' : 'actif'}, attendu ${aChoisir ? 'inactif' : 'actif'}`);
            if (aChoisir && !nouvelle && !/library/i.test(ecran.alertes.join(' '))) messages.push(`l’écran ne dit pas de choisir la library (alertes : ${ecran.alertes.join(' | ') || 'aucune'})`);
            return messages;
          },
        });
      }
    }
  }
}

function operateursLiSandbox(r: Registre): void {
  const li = (description: string, cas: Omit<CasDeSeance, 'description'>): void => ajouterUneSeance(r, 'Li', { description, relations: [], ...cas });
  const surCleDeLibrary = (nom: string): Adaptateur => (b, lecteurs) => {
    for (const layer of b.releve.variants[0].layers.slice(0, 3)) for (const liaison of layer.liaisons.slice(0, 1)) (liaison.variable as { cle: string }).cle = `v-${nom}`;
    return lecteurs;
  };
  li('choix par liaisons : trois layers liés à une des deux libraries, la catalogue est celui de cette library', {
    options: { adaptateurs: [surCleDeLibrary('Intencial'), catalogueDuProduit], plan: rendre('bibliotheques', deuxLibraries()) },
    attente: { statuts: ['complete'] },
    plus: (sortie) => (observationDe(sortie).libraryRetenue === 'Intencial' ? [] : [`library retenue ${String(observationDe(sortie).libraryRetenue)}, attendu Intencial`]),
  });
  li('deux libraries à égalité : aucune n’est choisie, l’analyse ne part pas et l’écran demande la library (Q-F89-20)', {
    options: { adaptateurs: [catalogueDuProduit], plan: rendre('bibliotheques', deuxLibraries()) },
    attente: { statuts: [] },
    plus: (sortie) => (observationDe(sortie).types.includes('library-a-choisir') ? [] : ['le sandbox n’a pas envoyé `library-a-choisir`']),
  });
  li('library illisible : le repli sur le fichier est dit', {
    options: { adaptateurs: [catalogueDuProduit], plan: rendre('bibliotheques', bibliothequesIllisibles) },
    attente: { statut: 'partielle', provisoires: 1, ecran: { dit: [DIT.catalogue], nonDit: [PAS_AUCUN] } }, question: 'Q-F89-4', rattachement: H18,
  });
  li('library inaccessible : une collection de la library ne se lit pas', {
    options: { adaptateurs: [catalogueDuProduit], plan: rendre('bibliotheques', lectureDeLibrary('Intencial', 'components', [{ cle: 'c-ill', nom: 'theme', library: 'Intencial', motif: 'refus' }])) },
    attente: { statut: 'partielle', provisoires: 1, ecran: { dit: [DIT.catalogue], nonDit: [PAS_AUCUN] } }, rattachement: H18,
  });
  li('library qui change entre deux analyses : la seconde ne reprend pas le catalogue de la première', {
    options: { adaptateurs: [catalogueDuProduit, (_b, lecteurs, s) => ({ ...lecteurs, bibliotheques: async () => lectureDeLibrary(s.drapeaux.autre ? 'Autre' : 'Intencial') as never })] },
    flux: async (s) => { await s.demander(); s.drapeaux.autre = true; await s.demander(); },
    attente: { statuts: ['complete', 'complete'] },
    plus: (sortie) => (observationDe(sortie).libraryRetenue === 'Autre' ? [] : [`library retenue ${String(observationDe(sortie).libraryRetenue)} après la seconde analyse, attendu Autre`]),
  });
  li('library lue sans collection components : le composant n’a aucun token, l’analyse le dit', {
    options: { adaptateurs: [catalogueDuProduit], plan: rendre('bibliotheques', lectureDeLibrary('Intencial', 'color')) },
    attente: { statuts: ['complete'] },
    plus: (sortie) => (observationDe(sortie).sansTokens === true ? [] : ['`sansTokens` est faux alors que la library n’a aucune collection components']),
  });

  const prelectureSansChoix = (description: string, nouvelle: boolean): void =>
    li(description, {
      options: { adaptateurs: [catalogueDuProduit, (_b, lecteurs, s) => ({ ...lecteurs, bibliotheques: async () => (s.drapeaux.deux ? deuxLibraries() : lectureDeLibrary('Intencial')) as never })] },
      flux: async (s) => {
        if (nouvelle) { await s.demander(); s.drapeaux.deux = true; s.evenement('noeud'); } else s.drapeaux.deux = true;
        s.photo('avant');
        await s.demander({ type: 'analyser', origine: 'prelecture' });
      },
      attente: { statuts: nouvelle ? ['complete'] : [] }, rattachement: H22,
      plus: (sortie) => {
        const lectures = observationDe(sortie).passages.filter((p) => p.startsWith('releve:')).length;
        return lectures === (nouvelle ? 1 : 0) ? [] : [`${lectures} lecture(s) du relevé, la prélecture ne devait rien lire`];
      },
    });
  prelectureSansChoix('prélecture avec library non choisie, première analyse : aucune prélecture', false);
  prelectureSansChoix('prélecture avec library non choisie, après une analyse : aucune prélecture', true);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Hu : déclaration UCM

type Declaration = 'ucm' | 'libre' | 'absente' | 'illisible' | 'future';
const DECLARATIONS_DU_FICHIER: ReadonlyArray<readonly [Declaration, string]> = [
  ['ucm', DECLARATIONS.ucm], ['libre', DECLARATIONS.libre], ['absente', DECLARATIONS.absente], ['illisible', DECLARATION_ILLISIBLE], ['future', DECLARATION_FUTURE],
];
const NOM_DE_LA_DECLARATION: Readonly<Record<Declaration, string>> = { ucm: '`ucm`', libre: '`libre`', absente: 'absente', illisible: 'JSON illisible', future: 'version inconnue' };

const CIBLE: VariableDEcriture = { id: 'V:1', key: 'k-cible', name: 'button/size/md/padding-x' };
const ANCIENNE: VariableDEcriture = { id: 'V:0', key: 'k-ancienne', name: 'button/size/sm/padding-x' };
const liaison: Correction = { id: 'liaison:1', sorte: 'liaison', cible: { layer: '1:1', champ: 'paddingLeft' }, avant: null, apres: { cle: CIBLE.key, nom: CIBLE.name }, aRelire: { regle: 'liaisons', avant: null } };

/** Écrit une liaison sur un fichier qui porte cette déclaration (ou la rend par une fonction, pour une déclaration qui change). */
async function ecrireUneLiaison(declaration: string | (() => string)): Promise<SortieDeCas> {
  const a = atelierDEcriture({ importables: [CIBLE], lisibles: [ANCIENNE], ...(typeof declaration === 'string' ? { declaration } : {}) });
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const api = a.api as unknown as ApiDeLiaisons;
  if (typeof declaration === 'function') {
    const lire = api.root.getSharedPluginData.bind(api.root);
    (api.root as { getSharedPluginData: (e: string, c: string) => string }).getSharedPluginData = (espace, cle) => (cle === CLE_ARCHITECTURE_DU_FICHIER ? declaration() : lire(espace, cle));
  }
  const rendu = await ecrireLeLot([liaison], { modeles: new Map() }, api);
  return { constats: [], donnees: { rendu } };
}

function operateursHu(r: Registre): void {
  for (const [declaration, texte] of DECLARATIONS_DU_FICHIER) {
    const ucm = declaration === 'ucm';
    const horsUcm = declaration === 'libre' || declaration === 'absente';
    const incertaine = declaration === 'illisible' || declaration === 'future';
    ajouterUneSeance(r, 'Hu', {
      description: `déclaration ${NOM_DE_LA_DECLARATION[declaration]}, côté sandbox : ${ucm ? 'familles thème et structure lancées' : horsUcm ? 'familles thème et structure sautées' : 'analyse partielle'}`,
      options: { declaration: texte }, relations: ['ordre'],
      attente: incertaine ? { statut: 'partielle', provisoires: 1 } : { statut: 'complete', provisoires: 1 }, ...(incertaine ? { rattachement: H17 } : {}),
      plus: (sortie) => {
        if (incertaine) return [];
        const { familles } = observationDe(sortie);
        const presentes = ['controle-theme', 'controle-structure'].filter((nom) => familles.includes(nom));
        return ucm ? ['controle-theme', 'controle-structure'].filter((nom) => !presentes.includes(nom)).map((nom) => `la famille ${nom} n’est pas lancée`) : presentes.map((nom) => `la famille ${nom} est lancée`);
      },
    });
  }
  for (const [declaration, texte] of DECLARATIONS_DU_FICHIER) {
    const ucm = declaration === 'ucm';
    const horsUcm = declaration === 'libre' || declaration === 'absente';
    r.ajouter('Hu', {
      description: `déclaration ${NOM_DE_LA_DECLARATION[declaration]}, côté écran : ${horsUcm ? 'l’alerte seule, Analyser caché' : ucm ? 'le panneau et Analyser' : 'la déclaration illisible est dite'}`,
      relations: [], ...(declaration === 'illisible' || declaration === 'future' ? { rattachement: H17 } : {}),
      jouer: async (): Promise<SortieDeCas> => {
        const etat = await etatApres(await analyseDeReference(), { architecture: lireLArchitectureDuFichier(texte) });
        return { constats: [], donnees: { barre: await barreApres(etat), ecran: await ecranDe_(etat) } };
      },
      verifier: (sortie) => {
        const { barre, ecran } = sortie.donnees as { barre: EtatDeLaBarre; ecran: Ecran };
        const messages: string[] = [];
        if (horsUcm) {
          if (!/UCM/.test(ecran.alertes.join(' '))) messages.push(`l’écran ne montre pas l’alerte hors UCM (alertes : ${ecran.alertes.join(' | ') || 'aucune'})`);
          if (!barre.analyserCache) messages.push('Analyser reste visible hors UCM');
        } else {
          if (barre.analyserCache) messages.push('Analyser est caché alors que le fichier n’est pas déclaré libre');
          if (/n.est pas déclaré UCM/.test(ecran.alertes.join(' '))) messages.push('l’alerte hors UCM est montrée pour une déclaration qui n’est pas « libre »');
          if (!ucm && !DIT.declaration.test(ecran.alertes.join(' '))) messages.push(`l’écran ne dit pas que la déclaration est illisible (alertes : ${ecran.alertes.join(' | ') || 'aucune'})`);
        }
        return messages;
      },
    });
  }
  for (const [declaration, texte] of DECLARATIONS_DU_FICHIER) {
    const ucm = declaration === 'ucm';
    r.ajouter('Hu', {
      description: `déclaration ${NOM_DE_LA_DECLARATION[declaration]}, côté écriture : une liaison ${ucm ? 'est écrite' : 'est sautée'}`, relations: [],
      jouer: () => ecrireUneLiaison(texte),
      verifier: (sortie) => {
        const { rendu } = sortie.donnees as { rendu: { ecrites: string[]; sautees: Array<{ id: string; motif: string }> } };
        if (ucm) return rendu.ecrites.length === 1 && rendu.sautees.length === 0 ? [] : [`écrites ${rendu.ecrites.length}, sautées ${rendu.sautees.length} sur un fichier UCM`];
        if (declaration === 'illisible' || declaration === 'future') return rendu.ecrites.length === 0 && rendu.sautees.length === 1 ? [] : [`écrites ${rendu.ecrites.length}, sautées ${rendu.sautees.length}, attendu une correction sautée`];
        return rendu.ecrites.length === 0 && rendu.sautees.length === 1 && rendu.sautees[0].motif === 'non-ucm' ? [] : [`écrites ${rendu.ecrites.length}, sautées ${JSON.stringify(rendu.sautees)}, attendu non-ucm`];
      },
    });
  }

  ajouterUneSeance(r, 'Hu', {
    description: 'déclaration qui passe de `ucm` à `libre` pendant l’analyse : les familles suivent la déclaration finale', relations: [],
    options: { plan: (s) => ({ releve: [{ quand: 'avant', action: { action: 'appeler', faire: () => { s.declaration = DECLARATIONS.libre; } } }] }) },
    attente: { statuts: ['complete'] },
    plus: (sortie) => observationDe(sortie).familles.filter((nom) => nom === 'controle-theme' || nom === 'controle-structure').map((nom) => `la famille ${nom} est lancée alors que la déclaration finale est « libre »`),
  });
  r.ajouter('Hu', {
    description: 'déclaration qui passe de `ucm` à `libre` pendant une écriture : la liaison est sautée en non-ucm', relations: [],
    jouer: () => { let lectures = 0; return ecrireUneLiaison(() => { lectures += 1; return lectures > 1 ? DECLARATIONS.libre : DECLARATIONS.ucm; }); },
    verifier: (sortie) => {
      const { rendu } = sortie.donnees as { rendu: { ecrites: string[]; sautees: Array<{ id: string; motif: string }> } };
      return rendu.ecrites.length + rendu.sautees.length === 1 ? [] : [`écrites ${rendu.ecrites.length}, sautées ${rendu.sautees.length} : la liaison doit être soit écrite, soit sautée`];
    },
  });

  const reglesHorsUcm = (description: string, spec: 'sans-conteneur' | 'sans-regle'): void => {
    r.ajouter('Hu', {
      description, relations: [], codesJuges: ['C43', 'C45'],
      jouer: async (): Promise<SortieDeCas> => {
        const conforme = specConforme(composantDeLaForme('button-36'));
        const page = spec === 'sans-conteneur' ? { ...conforme, conteneurs: [] } : { ...conforme, conteneurs: [{ ...conforme.conteneurs[0], regles: conforme.conteneurs[0].regles.filter((regle) => !(regle.cible ?? '').toLowerCase().startsWith('size')) }] };
        const lecture = await lireLaPage(page);
        const corrections = lecture.constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
        const a = atelierDEcriture({ declaration: DECLARATIONS.libre });
        const rendu = await ecrireLeLot(corrections, { modeles: lecture.modeles }, a.api as unknown as ApiDeLiaisons);
        return { constats: [], donnees: { rendu, envoyees: corrections.length, appels: a.journal.length } };
      },
      verifier: (sortie) => {
        const { rendu, envoyees, appels } = sortie.donnees as { rendu: { ecrites: string[]; sautees: Array<{ motif: string }> }; envoyees: number; appels: number };
        return [
          ...(envoyees === 0 ? ['aucune correction de règles à écrire : le cas ne juge rien'] : []),
          ...(rendu.ecrites.length === 0 && rendu.sautees.length === envoyees && rendu.sautees.every((saute) => saute.motif === 'non-ucm') ? [] : [`écrites ${rendu.ecrites.length}, sautées ${JSON.stringify(rendu.sautees)}, attendu tout sauté en non-ucm`]),
          ...(appels === 0 ? [] : [`${appels} écriture(s) dans un fichier hors UCM`]),
        ];
      },
    });
  };
  reglesHorsUcm('C43 hors UCM : la création du conteneur de règles est sautée en non-ucm', 'sans-conteneur');
  reglesHorsUcm('C45 hors UCM : l’ajout d’une règle est sauté en non-ucm', 'sans-regle');
}

// ---------------------------------------------------------------------------------------------------------------------------
// Ig : ignorés

const P1 = (impact: string) => ({ point: point('Layer « Card » : il n’utilise pas d’auto layout.', { impact }), noeuds: ['20:2'] });
const POINTS_DISTINCTS = [
  { point: point('Layer « A » : il n’utilise pas d’auto layout.'), noeuds: ['20:2'] },
  { point: point('Layer « B » : il n’utilise pas d’auto layout.'), noeuds: ['20:3'] },
  { point: point('Layer « C » : il n’utilise pas d’auto layout.'), noeuds: ['20:4'] },
];

const identiteDe = (s: Seance) => s.identiteCourante()!;

async function ignorerParLeSandbox(s: Seance, id: string, portee: 'constat' | 'proposition' = 'constat'): Promise<void> {
  await traiterLesIgnores((contexte) => rangementDeFigma(contexte.figma as never))({ type: 'ignorer', analyse: identiteDe(s), constat: id, portee } as never, s.contexte);
}
async function nePlusIgnorerParLeSandbox(s: Seance, id: string): Promise<void> {
  await traiterLesIgnores((contexte) => rangementDeFigma(contexte.figma as never))({ type: 'ne-plus-ignorer', analyse: identiteDe(s), constat: id } as never, s.contexte);
}

function operateursIg(r: Registre): void {
  const ig = (description: string, cas: Omit<CasDeSeance, 'description'>): void => ajouterUneSeance(r, 'Ig', { description, relations: [], codesJuges: [], ...cas });
  const avecUnModele = { avecUnModele: true, adaptateurs: [ignoresDuProduit] };

  // -- les clés rangées ---------------------------------------------------------------------------------------------------------
  interface Ids { constat: string; avecCorrection: string; correction: string }
  const parLesCles = (description: string, cles: (ids: Ids) => string[], plus: (obs: ReturnType<typeof observationDe>, ids: Ids) => string[]): void =>
    ig(description, {
      options: avecUnModele,
      flux: async (s) => {
        await s.demander();
        const constats = s.observer().constats;
        const avecCorrection = constats.find((c) => c.correction)!;
        const ids: Ids = { constat: constats.find((c) => c.code === 'C49')!.id, avecCorrection: avecCorrection.id, correction: avecCorrection.correction!.id };
        s.notes.ids = ids;
        s.ignoresBruts = JSON.stringify(cles(ids));
        await s.demander({ type: 'analyser', intention: 'actualiser', demande: ++s.numero });
      },
      attente: { statuts: ['complete', 'complete'] },
      plus: (sortie) => plus(observationDe(sortie), (sortie.donnees as { notes: { ids: Ids } }).notes.ids),
    });
  parLesCles('clé `constat` : le constat quitte la liste visible', (ids) => [ids.constat],
    (obs, ids) => (obs.ignores.includes(ids.constat) ? [] : [`${ids.constat} n’est pas dans les ignorés`]));
  parLesCles('clé `proposition:` : le constat reste visible, sans correction', (ids) => [`proposition:${ids.avecCorrection}`],
    (obs, ids) => [
      ...(obs.ignores.includes(ids.avecCorrection) ? ['le constat est ignoré alors que seule sa proposition l’est'] : []),
      ...(obs.correctionsRetenues.includes(ids.correction) ? ['la correction du constat reste proposée'] : []),
    ]);
  parLesCles('clé `role-ucm:` : aucun constat n’est ignoré', () => ['role-ucm:page/foreground'],
    (obs) => (obs.ignores.length === 0 ? [] : [`${obs.ignores.length} constat(s) ignoré(s) par une clé de rôle`]));
  parLesCles('clés en mélange : seul le constat est ignoré, la proposition est retirée', (ids) => [ids.constat, `proposition:${ids.avecCorrection}`, 'role-ucm:page/foreground', 'inconnue'],
    (obs, ids) => [
      ...(obs.ignores.length === 1 && obs.ignores[0] === ids.constat ? [] : [`ignorés ${JSON.stringify(obs.ignores)}, attendu [${ids.constat}]`]),
      ...(obs.correctionsRetenues.includes(ids.correction) ? ['la correction du constat reste proposée'] : []),
    ]);
  parLesCles('clés inconnues : rien n’est ignoré, aucune exception', () => ['n:importe:quoi', 'x'],
    (obs) => (obs.ignores.length === 0 ? [] : [`${obs.ignores.length} constat(s) ignoré(s) par des clés inconnues`]));

  // -- tous les constats ignorés --------------------------------------------------------------------------------------------------
  const toutIgnore = (description: string, points: typeof POINTS_DISTINCTS, ignores: number): void =>
    ig(description, {
      options: { adaptateurs: [sansConstatsDuKit, avecLecteurs({ moteur: async () => moteurAvecPoints(points) }), ignoresDuProduit] },
      flux: async (s) => {
        await s.demander();
        const ids = s.observer().constats.map((c) => c.id);
        s.ignoresBruts = JSON.stringify(ids.slice(0, ignores));
        await s.demander({ type: 'analyser', intention: 'actualiser', demande: ++s.numero });
      },
      attente: { statuts: ['complete', 'complete'], ecran: { dit: [/ignorés?/i], nonDit: [PAS_AUCUN], dansLeTexte: true, boutons: [/Ne plus ignorer/i] } },
      rattachement: ignores === points.length ? H16 : undefined,
      plus: (sortie) => (observationDe(sortie).ignores.length === ignores ? [] : [`${observationDe(sortie).ignores.length} constat(s) ignoré(s), attendu ${ignores}`]),
    });
  toutIgnore('tous les constats ignorés, 1 sur 1', POINTS_DISTINCTS.slice(0, 1), 1);
  toutIgnore('tous les constats ignorés, 3 sur 3', POINTS_DISTINCTS, 3);
  toutIgnore('3 constats dont 2 ignorés : un seul reste, les ignorés restent restaurables', POINTS_DISTINCTS, 2);

  // -- Ignorer côté sandbox -------------------------------------------------------------------------------------------------------
  const sansEcriture = (sortie: SortieDeCas): string[] => ((sortie.donnees as { bruts: string }).bruts === '' ? [] : [`des clés ont été rangées : ${(sortie.donnees as { bruts: string }).bruts}`]);
  const brut = (s: Seance) => ({ bruts: s.ignoresBruts });
  ig('ignorer pendant le provisoire : refusé, rien n’est rangé', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { s.surMessage.push((m) => { if (m.type === 'analyse-provisoire') s.garder(ignorerParLeSandbox(s, m.constats[0].id)); }); await s.demander(); },
    attente: { statuts: ['complete'] }, plus: sansEcriture,
  });
  ig('ignorer sur une analyse périmée : refusé, rien n’est rangé (QV-2)', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); s.evenement('noeud'); await ignorerParLeSandbox(s, s.observer().constats[0].id); },
    attente: { statuts: ['complete'], perimes: ['document'] }, plus: sansEcriture,
  });
  ig('ignorer un constat `info` : la clé est rangée', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); await ignorerParLeSandbox(s, s.observer().constats.find((c) => c.type === 'info')!.id); },
    attente: { statuts: ['complete'] },
    plus: (sortie) => (JSON.parse((sortie.donnees as { bruts: string }).bruts || '[]').length === 1 ? [] : ['la clé du constat info n’est pas rangée']),
  });
  ig('ignorer hors UCM : refusé, rien n’est rangé', {
    options: { ...avecUnModele, declaration: DECLARATIONS.libre }, extra: brut,
    flux: async (s) => { await s.demander(); await ignorerParLeSandbox(s, s.observer().constats[0].id); },
    attente: { statuts: ['complete'] }, plus: sansEcriture,
  });
  ig('ignorer avec une écriture qui lève : aucune exception, rien n’est rangé, la place est libre', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); s.drapeaux.ecritureDesIgnoresLeve = true; await ignorerParLeSandbox(s, s.observer().constats[0].id); },
    attente: { statuts: ['complete'] }, plus: sansEcriture,
  });
  ig('ignorer deux fois le même constat : la clé n’est rangée qu’une fois', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); const id = s.observer().constats[0].id; await ignorerParLeSandbox(s, id); await ignorerParLeSandbox(s, id); },
    attente: { statuts: ['complete'] },
    plus: (sortie) => (JSON.parse((sortie.donnees as { bruts: string }).bruts || '[]').length === 1 ? [] : ['la clé est rangée plusieurs fois ou pas du tout']),
  });

  // -- identifiant du moteur instable ----------------------------------------------------------------------------------------------
  const jumeaux = (description: string, impacts: readonly string[], ordre: readonly number[]): void =>
    ig(description, {
      options: { adaptateurs: [sansConstatsDuKit, ignoresDuProduit, (_b, lecteurs, s) => ({ ...lecteurs, moteur: async () => moteurAvecPoints((s.drapeaux.permute ? ordre.map((rang) => impacts[rang]) : [...impacts]).map(P1)) })] },
      flux: async (s) => {
        await s.demander();
        const premier = s.observer().constats.find((c) => c.faits.impact === impacts[0])!;
        s.ignoresBruts = JSON.stringify([premier.id]);
        s.drapeaux.permute = true;
        await s.demander({ type: 'analyser', intention: 'actualiser', demande: ++s.numero });
      },
      attente: { statuts: ['complete', 'complete'] }, rattachement: 'hypothèse 4 de 6.1 (les identifiants de phrases jumelles dépendent de l’ordre)',
      plus: (sortie) => {
        const o = observationDe(sortie);
        const ignore = o.constats.filter((c) => o.ignores.includes(c.id)).map((c) => String(c.faits.impact));
        return ignore.length === 1 && ignore[0] === impacts[0] ? [] : [`le point ignoré après le changement d’ordre porte l’impact « ${ignore.join(', ')} », attendu « ${impacts[0]} »`];
      },
    });
  jumeaux('identifiant du moteur : deux phrases jumelles échangées', ['Impact A.', 'Impact B.'], [1, 0]);
  jumeaux('identifiant du moteur : trois phrases jumelles en rotation', ['Impact A.', 'Impact B.', 'Impact C.'], [1, 2, 0]);
  jumeaux('identifiant du moteur : trois phrases jumelles inversées', ['Impact A.', 'Impact B.', 'Impact C.'], [2, 1, 0]);

  // -- ignorer, ne plus ignorer, péremption ---------------------------------------------------------------------------------------
  ig('ignorer ne périme pas l’analyse, la péremption suivante se dit une fois', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); await ignorerParLeSandbox(s, s.observer().constats[0].id); s.photo('apresIgnorer'); s.evenement('noeud'); },
    attente: { statuts: ['complete'], perimes: ['document'] },
    plus: (sortie) => (sortie.donnees as { photos: Record<string, { perimes: string[] }> }).photos.apresIgnorer.perimes.length === 0 ? [] : ['ignorer a périmé l’analyse'],
  });
  ig('« Ne plus ignorer » ne périme pas l’analyse non plus', {
    options: avecUnModele, extra: brut,
    flux: async (s) => { await s.demander(); const id = s.observer().constats[0].id; await ignorerParLeSandbox(s, id); await nePlusIgnorerParLeSandbox(s, id); },
    attente: { statuts: ['complete'], perimes: [] },
    plus: (sortie) => (JSON.parse((sortie.donnees as { bruts: string }).bruts || '[]').length === 0 ? [] : ['la clé est toujours rangée après « Ne plus ignorer »']),
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// St : table de vérité du statut

function operateursSt(r: Registre): void {
  const libelle = (parties: readonly Partie[]): string => (parties.length === 0 ? 'rien de refusé' : parties.length === PARTIES.length ? 'rien de jugé' : `refusé : ${parties.join(' + ')}`);
  const cas = (parties: readonly Partie[], ordre: boolean): void => {
    const statut = statutDesParties(parties);
    const dependancesSeules = parties.length === 1 && parties[0] === 'dependances';
    const dits = parties.filter((partie) => partie !== 'dependances').map((partie) => DIT[partie]);
    ajouterUneSeance(r, 'St', {
      description: `${libelle(parties)} → ${statut}`, options: pannesDe(parties), relations: ordre ? ['ordre'] : [],
      attente: { statut, provisoires: 1, ...(statut === 'partielle' ? { ecran: { dit: dits, nonDit: [PAS_AUCUN] } } : {}) },
      ...(dependancesSeules ? { question: 'Q-F89-3' } : {}),
      ...(statut === 'partielle' ? { rattachement: H13 } : {}),
    });
  };
  cas([], true);
  for (const partie of PARTIES) cas([partie], true);
  for (let i = 0; i < PARTIES.length; i += 1) for (let j = i + 1; j < PARTIES.length; j += 1) cas([PARTIES[i], PARTIES[j]], false);
  cas(PARTIES, true);
}

// ---------------------------------------------------------------------------------------------------------------------------

export function operateursEtats(): CasF8[] {
  const registre = new Registre('F9');
  operateursLiInterface(registre);
  operateursLiSandbox(registre);
  operateursHu(registre);
  operateursIg(registre);
  operateursSt(registre);
  return registre.cas;
}

