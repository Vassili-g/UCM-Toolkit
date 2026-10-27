/**
 * La mémoire de ressources d'une demande (16.6) : le relevé, les dépendances et le moteur y lisent un style, un maître ou
 * une variable une seule fois, la sortie reste celle qu'ils rendaient chacun avec leur mémoire, et la demande suivante
 * relit tout. Les noms de composant d'une page se lisent une fois par page dans les dépendances.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { creerInventairesDeLaDemande, type InventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import type { PluginMessage } from '../src/messages';
import { LECTEURS_DE_FIGMA, dependancesDeFigma, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { fabriquerLeMonde, noeud, type NoeudFabrique } from './outils/mondeFabrique';

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
});

const globale = globalThis as { figma?: unknown };

/** Le monde fabriqué dont chaque lecture par identifiant se compte, par ressource. */
function monterLeMondeCompte() {
  const monde = fabriquerLeMonde();
  const appels = new Map<string, number>();
  const compter = (cle: string): void => { appels.set(cle, (appels.get(cle) ?? 0) + 1); };
  const variables = monde.figma.variables;
  const variable = variables.getVariableByIdAsync;
  variables.getVariableByIdAsync = (id: string) => { compter(`variable ${id}`); return variable(id); };
  const collection = variables.getVariableCollectionByIdAsync;
  variables.getVariableCollectionByIdAsync = (id: string) => { compter(`collection ${id}`); return collection(id); };
  const style = monde.figma.getStyleByIdAsync;
  monde.figma.getStyleByIdAsync = (id: string) => { compter(`style ${id}`); return style(id); };
  const maitre = monde.instance.getMainComponentAsync as () => Promise<unknown>;
  monde.instance.getMainComponentAsync = () => { compter('maitre instance'); return maitre(); };
  return { monde, appels };
}

/** Les mêmes lectures, sans la mémoire de la demande : chaque lecteur garde la sienne, comme avant 16.6. */
const LECTEURS_SANS_MEMOIRE_PARTAGEE: Lecteurs = (() => {
  const sans = (inventaires?: InventairesDeLaDemande): InventairesDeLaDemande | undefined => (inventaires ? { ...inventaires, ressources: undefined } : inventaires);
  return {
    ...LECTEURS_DE_FIGMA,
    releve: (sujet, jeton, contexte, progresser, cooperation, inventaires) => LECTEURS_DE_FIGMA.releve(sujet, jeton, contexte, progresser, cooperation, sans(inventaires)),
    dependances: (sujet, contexte, inventaires, cooperation) => LECTEURS_DE_FIGMA.dependances!(sujet, contexte, sans(inventaires), cooperation),
    moteur: (sujet, jeton, contexte, progresser, cooperation, inventaires) => LECTEURS_DE_FIGMA.moteur(sujet, jeton, contexte, progresser, cooperation, sans(inventaires)),
  };
})();

/** Une analyse sur le monde compté ; `demandes` en enchaîne plusieurs (la première complète, les suivantes par Actualiser). */
async function analyser(lecteurs: Lecteurs, demandes = 1, preparer: (monde: ReturnType<typeof fabriquerLeMonde>) => void = () => {}) {
  const { monde, appels } = monterLeMondeCompte();
  preparer(monde);
  const precedent = globale.figma;
  globale.figma = monde.figma;
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: monde.figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => [] };
  const parDemande: Array<Record<string, number>> = [];
  try {
    for (let demande = 1; demande <= demandes; demande += 1) {
      appels.clear();
      await traiterAvec(lecteurs)({ type: 'analyser', demande, ...(demande > 1 ? { intention: 'actualiser' as const } : {}) }, contexte);
      parDemande.push(Object.fromEntries(appels));
    }
  } finally {
    globale.figma = precedent;
  }
  const finale = envoyes.filter((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse').at(-1)!;
  return { parDemande, sortie: JSON.stringify({ statut: finale.statut, constats: finale.constats, lecture: finale.lecture, variants: finale.variants, sansTokens: finale.sansTokens }) };
}

test('une demande lit chaque style, maître et variable une fois pour le relevé, les dépendances et le moteur, et rend la sortie d’avant', async () => {
  const avant = await analyser(LECTEURS_SANS_MEMOIRE_PARTAGEE);
  const apres = await analyser(LECTEURS_DE_FIGMA);
  assert.deepEqual(apres.parDemande[0], {
    'variable espace': 1, 'variable fond': 1, 'variable taille': 1, 'variable VariableID:cle-lib-v/1:1': 1, 'collection c': 1, 'style S:titre': 1, 'maitre instance': 1,
  });
  assert.ok(avant.parDemande[0]['style S:titre'] > 1 && avant.parDemande[0]['maitre instance'] > 1, 'sans la mémoire partagée, chaque lecteur lit le style et le maître');
  assert.equal(apres.sortie, avant.sortie);
  assert.ok(JSON.parse(apres.sortie).constats.length > 0);
});

test('la demande suivante relit tout : la mémoire meurt avec sa demande', async () => {
  const { parDemande } = await analyser(LECTEURS_DE_FIGMA, 2);
  assert.deepEqual(parDemande[1], parDemande[0]);
  assert.equal(parDemande[1]['maitre instance'], 1);
  assert.equal(parDemande[1]['style S:titre'], 1);
});

/** Deux maîtres locaux d'une même page, chacun dans une instance du jeu, et une page dont les balayages de noms se comptent. */
function monterLaPage() {
  const maitre = (id: string) => noeud(id, 'COMPONENT', { name: id, key: `cle-${id}`, remote: false, visible: true, componentPropertyDefinitions: {} }, []);
  const [a, b] = [maitre('maitre-a'), maitre('maitre-b')];
  const instance = (id: string, cible: NoeudFabrique) => noeud(id, 'INSTANCE', { name: id, visible: true, getMainComponentAsync: async () => cible }, []);
  const variant = noeud('variant', 'COMPONENT', { name: 'Etat=Repos', visible: true, variantProperties: { Etat: 'Repos' } }, [instance('i-a', a), instance('i-b', b)]);
  const jeu = noeud('jeu', 'COMPONENT_SET', { name: 'Carte', key: 'cle-jeu', remote: false, defaultVariant: variant, componentPropertyDefinitions: {} }, [variant]);
  const balayages = { textes: 0 };
  const page = noeud('page', 'PAGE', { name: 'Composants', selection: [jeu] }, [jeu, a, b]);
  const parCriteres = page.findAllWithCriteria as (criteres: { types: string[] }) => NoeudFabrique[];
  page.findAllWithCriteria = (criteres: { types: string[] }) => {
    if (criteres.types.includes('TEXT')) balayages.textes += 1;
    return parCriteres(criteres);
  };
  const racine = noeud('0:0', 'DOCUMENT', { name: 'Fichier', documentColorProfile: 'SRGB' }, [page]);
  page.parent = racine;
  const figma = {
    skipInvisibleInstanceChildren: false,
    currentPage: page,
    root: racine,
    getStyleByIdAsync: async () => null,
    variables: { getLocalVariableCollectionsAsync: async () => [], getLocalVariablesAsync: async () => [] },
  };
  return { figma, jeu, balayages };
}

test('les dépendances balaient la page des maîtres locaux une fois par demande', async () => {
  const { figma, jeu, balayages } = monterLaPage();
  const precedent = globale.figma;
  globale.figma = figma;
  try {
    const contexte = { figma: figma as unknown as PluginAPI, envoyer() {}, surveillerLeDocument: () => [] } as Contexte;
    const sujet = { cle: 'cle-jeu', noeud: jeu as never, noeuds: [], admis: undefined };
    const sans = await dependancesDeFigma(sujet as never, contexte);
    const balayagesSans = balayages.textes;
    assert.equal(sans.maitres.length, 2);
    assert.ok(sans.maitres.every((maitre) => maitre.nomsDeLaPage !== null), 'les deux maîtres locaux lisent les noms de leur page');
    balayages.textes = 0;
    const inventaires = creerInventairesDeLaDemande();
    const avec = await dependancesDeFigma(sujet as never, contexte, inventaires);
    assert.equal(balayages.textes, balayagesSans - 1, 'le second maître reprend les noms de la page lus pour le premier');
    assert.deepEqual(avec, sans);
    balayages.textes = 0;
    await dependancesDeFigma(sujet as never, contexte, creerInventairesDeLaDemande());
    assert.equal(balayages.textes, balayagesSans - 1, 'une autre demande relit la page');
  } finally {
    globale.figma = precedent;
  }
});

const BIBLIOTHEQUE = 'VariableID:cle-lib-v/1:1';

/** Le variant `repos` lie son fond à la variable de library, que Figma ne rend qu'après l'import du catalogue. */
const lierAuFondDeLibrary = (monde: ReturnType<typeof fabriquerLeMonde>): void => {
  monde.repos.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: BIBLIOTHEQUE } } }];
};

test('une variable que le relevé voit refusée et que l’import du catalogue rend lisible est relue une fois par le moteur, pour la sortie d’avant', async () => {
  const avant = await analyser(LECTEURS_SANS_MEMOIRE_PARTAGEE, 1, lierAuFondDeLibrary);
  const apres = await analyser(LECTEURS_DE_FIGMA, 1, lierAuFondDeLibrary);
  assert.equal(avant.parDemande[0][`variable ${BIBLIOTHEQUE}`], 2, 'le relevé la voit refusée, le moteur la lit après l’import');
  assert.equal(apres.parDemande[0][`variable ${BIBLIOTHEQUE}`], 2, 'la mémoire partagée ne transmet pas le refus d’avant l’import : une relecture, puis mémorisée');
  assert.equal(apres.sortie, avant.sortie);
});
