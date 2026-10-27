/** L'analyse : identité, opération unique, annulation, erreur du moteur, résultat partiel, péremption. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import {
  controlerCouchesParEtapes, controlerLAccessibiliteParEtapes, controlerLaStructure, controlerLaTypographieParEtapes, controlerLeTheme, controlerMapping, controlerNommage, controlerOublisParEtapes, tokensDuComposant,
  type CatalogueDeReference, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { ComponentExportError, type ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { etape, compter, fermerLaMesure, ouvrirLaMesure, abandonnerLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';

import type { PluginMessage } from '../src/messages';
import { constatsDuMoteur } from '../src/constatsDuMoteur';
import { traiter as traiterLesQuestions } from '../src/sandbox/questions';
import { traiterAvec as traiterLesCorrections } from '../src/sandbox/corrections';
import { traiterAvec as traiterLesIgnores } from '../src/sandbox/ignores';
import { traiterAvec as traiterLaPreparation } from '../src/sandbox/preparation';
import { rangerUnePreparation, type PreparationRangee } from '../src/preparations';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { capturerLAnalyse, verifierLaPariteDeLAnalyse } from './parite';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import { analyseCourante, catalogueDeFigma, commencerUneAnalyse, correctionsDeLAnalyse, perimerApresUneEcriture, reinitialiserLAnalyse, sessionDesAnalyses, surChangementDuDocument, surSelection, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import { origineDeLaSelection, retenirLaSelectionDuPlugin } from '../src/sandbox/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

function releveDe(nom: string, lecture: Partial<ReleveDeComposant['lecture']> = {}): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: nom, id: `jeu-${nom}`, nom },
    proprietes: [],
    variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [], ...lecture },
    espaceDeCouleur: 'srgb',
  };
}

function exportDe(points: readonly PointACorriger[] = []): ResultatInterne {
  const phrases = points.map(phraseDe);
  return { warnings: phrases, parties: new Map(points.map((p, i) => [phrases[i], p])), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne;
}

const pointDeTest: PointACorriger = { famille: 'regles', titre: 'Règles : « À compléter » est resté.', impact: 'Impact.', action: 'Action.' };

interface Banc {
  contexte: Contexte;
  envoyes: PluginMessage[];
}

function banc(architecture: 'ucm' | 'libre' | 'absente' = 'absente'): Banc {
  const envoyes: PluginMessage[] = [];
  const declaration = architecture === 'absente' ? '' : JSON.stringify({ version: 1, ucm: architecture === 'ucm' });
  return { envoyes, contexte: { figma: { root: { getSharedPluginData: () => declaration } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} } };
}

/** Des lectures sur des doubles : seul le moteur change d'un test à l'autre. */
function lecteurs(moteur: (jeton: { readonly leve: boolean }) => Promise<ResultatSansPublication>, nom = 'Alert', catalogue: CatalogueDeReference = catalogueVide): Lecteurs {
  return {
    async sujet() {
      return { cle: nom, noeud: { id: `jeu-${nom}` } as never, noeuds: [`jeu-${nom}`, `v-${nom}`] } satisfies SujetAAnalyser;
    },
    async releve(sujet) {
      return { statut: 'lu', releve: releveDe(sujet.cle) };
    },
    async catalogue() {
      return catalogue;
    },
    moteur: async (_sujet, jeton) => moteur(jeton),
  };
}

const complete = (points: readonly PointACorriger[] = []) => async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: exportDe(points) });
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deType = <T extends PluginMessage['type']>(b: Banc, type: T) => b.envoyes.filter((m) => m.type === type) as Array<Extract<PluginMessage, { type: T }>>;

beforeEach(() => reinitialiserLAnalyse());

/** Une annulation pendant les contrôles du kit ou avant eux : aucun provisoire ne part et le moteur n'a pas commencé sa lecture. */
function sansProvisoireNiMoteur(b: Banc): void {
  assert.equal(deType(b, 'analyse-provisoire').length, 0);
  const phases = deType(b, 'analyse-en-cours').map((m) => m.progression?.phase);
  assert.deepEqual(phases.filter((phase) => phase === 'imbriques' || phase === 'structure' || phase === 'regles'), []);
}

test('le banc compare deux analyses indépendantes, leurs constats, corrections, modèles, ignorés et couverture dans leur ordre', async () => {
  let doubles = 0;
  const fabriquer = () => {
    doubles += 1;
    const b = banc();
    const moteur = exportDe([pointDeTest]);
    moteur.localisations = new Map([[phraseDe(pointDeTest), ['v-Alert', 'texte']]]);
    const lectures: Lecteurs = {
      ...lecteurs(async () => ({ etat: 'calculee', interne: moteur })),
      releve: async () => ({ statut: 'lu', releve: releveDeContraste('Alert') }),
      catalogue: async () => ({ ...catalogueVide, collections: [{ cle: 'c', nom: 'Modes', role: null, etat: 'lue', modes: [{ id: 'dark', nom: 'Dark' }, { id: 'light', nom: 'Light' }] }] }),
      regles: async () => ({
        composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false,
        modele: { nom: 'Alert', sections: [{ tag: 'prop', elements: [{ genre: 'regle', tag: 'prop', cible: 'severity.info' }] }] },
        proprietes: ['severity'], documentees: [],
      }),
      ignores: async () => constatsDuMoteur(moteur).map(({ id }) => id),
    };
    return { b, lectures };
  };
  const reference = await verifierLaPariteDeLAnalyse(fabriquer);
  assert.equal(doubles, 2);
  assert.equal(reference.modeles.length, 1);
  assert.equal(reference.corrections.length, 1);
  assert.ok(reference.constatsRetenus.some((c) => c?.code === 'C44' && c.layers.includes('texte')));
  assert.ok(reference.messages.some((m) => m.type === 'ignores' && m.constats.length === 1));
  await assert.rejects(
    () => verifierLaPariteDeLAnalyse(fabriquer, (lectures) => traiterAvec({ ...lectures, ignores: async () => [] })),
    assert.AssertionError,
  );
});


test('le provisoire part après les contrôles du kit et avant le moteur ; le final garde l’ordre contrôles, règles, moteur et ne change pas sans lui', async () => {
  const fabriquer = (sansProvisoire: boolean) => () => {
    const b = banc();
    if (sansProvisoire) {
      const envoyer = b.contexte.envoyer;
      b.contexte.envoyer = (message) => { if (message.type !== 'analyse-provisoire') envoyer(message); };
    }
    const lectures: Lecteurs = {
      ...lecteurs(async () => ({ etat: 'calculee', interne: exportDe([pointDeTest]) })),
      releve: async () => ({ statut: 'lu', releve: releveDeContraste('Alert') }),
      regles: async () => ({
        composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false,
        modele: { nom: 'Alert', sections: [{ tag: 'prop', elements: [{ genre: 'regle', tag: 'prop', cible: 'severity.info' }] }] },
        proprietes: ['severity'], documentees: [],
      }),
      ignores: async () => ['C64:Label:sans-style'],
    };
    return { b, lectures };
  };
  reinitialiserLAnalyse();
  const avec = fabriquer(false)();
  const ordre: string[] = [];
  const base = avec.lectures;
  avec.lectures = {
    ...base,
    ignores: async (contexte) => { ordre.push('ignores'); return base.ignores!(contexte); },
    moteur: async (...appel) => { ordre.push('moteur'); return base.moteur(...appel); },
    regles: async (...appel) => { ordre.push('regles'); return base.regles!(...appel); },
  };
  const envoyer = avec.b.contexte.envoyer;
  avec.b.contexte.envoyer = (message) => { if (message.type === 'analyse-provisoire' || message.type === 'analyse') ordre.push(message.type); envoyer(message); };
  await traiterAvec(avec.lectures)({ type: 'analyser' }, avec.b.contexte);
  assert.deepEqual(ordre, ['ignores', 'analyse-provisoire', 'moteur', 'regles', 'analyse']);

  const [provisoire] = deType(avec.b, 'analyse-provisoire');
  const [final] = deType(avec.b, 'analyse');
  assert.equal(deType(avec.b, 'analyse-provisoire').length, 1);
  assert.deepEqual(provisoire.analyse, final.analyse);
  assert.ok(provisoire.constats.length > 0, 'les contrôles du kit rendent un constat');
  assert.ok(provisoire.constats.every((constat) => constat.correction === undefined && constat.question === undefined), 'aucune correction applicable avant la fin');
  assert.deepEqual(provisoire.lecture, final.lecture);
  assert.deepEqual(provisoire.variants, final.variants);
  assert.equal(correctionsDeLAnalyse(provisoire.analyse)?.size, final.constats.filter((constat) => constat.correction).length);
  // Le final range les constats comme avant : contrôles du kit, puis règles, puis moteur.
  const codes = final.constats.map(({ code }) => code);
  assert.deepEqual(final.constats.slice(0, provisoire.constats.length).map(({ id }) => id), provisoire.constats.map(({ id }) => id));
  assert.deepEqual(codes, ['C64', 'C43', 'C44'], 'contrôle du kit, règles (C43), moteur');
  assert.deepEqual(provisoire.ignores, ['C64:Label:sans-style'], 'le provisoire dit déjà quels constats sont ignorés');
  assert.deepEqual(provisoire.constats.map(({ code }) => code), ['C64']);

  // Sans provisoire, le final, les ignorés et ce que le sandbox retient sont les mêmes.
  const sans = await capturerLAnalyse(fabriquer(true));
  const avecProvisoire = await capturerLAnalyse(fabriquer(false));
  assert.deepEqual(avecProvisoire.messages.filter((message) => message.type !== 'analyse-provisoire'), sans.messages);
  assert.deepEqual({ ...avecProvisoire, messages: null }, { ...sans, messages: null });
});

test('le relevé et le moteur reçoivent le même budget ; les cessions conservent constats et corrections', async () => {
  let pauses = 0;
  let horloge = 0;
  const fabriquer = () => {
    const b = banc();
    let budgetDuReleve: unknown;
    const lectures: Lecteurs = {
      ...lecteurs(complete()),
      releve: async (_sujet, _jeton, _contexte, _progresser, cooperation) => {
        assert.ok(cooperation);
        budgetDuReleve = cooperation;
        return { statut: 'lu', releve: releveDeContraste('Alert') };
      },
      moteur: async (_sujet, _jeton, _contexte, _progresser, cooperation) => {
        assert.equal(cooperation, budgetDuReleve);
        await cooperation!.cederSiBesoin();
        return { etat: 'calculee', interne: exportDe([pointDeTest]) };
      },
    };
    return { b, lectures };
  };
  await verifierLaPariteDeLAnalyse(fabriquer, (lectures) => traiterAvec(lectures, {
    horloge: () => horloge += 16, budgetDeCalculMs: 16,
    respirer: async () => { pauses += 1; },
  }));
  assert.ok(pauses >= 8);
});

test('annuler pendant la construction des cibles de contraste abandonne les plages restantes', async () => {
  const b = banc();
  const releve = releveDeContraste('Alert');
  const texte = releve.variants[0].layers[1];
  let plagesLues = 0;
  const modele = texte.texte!.plages[0];
  texte.texte!.plages = Array.from({ length: 600 }, (_, rang) => {
    const plage = { ...modele, debut: rang, fin: rang + 1 };
    Object.defineProperty(plage, 'peintures', { enumerable: true, get() { plagesLues += 1; return modele.peintures; } });
    return plage;
  });
  let horloge = 0;
  const traiter = traiterAvec({ ...lecteurs(complete()), releve: async () => ({ statut: 'lu', releve }) }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (plagesLues > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(plagesLues > 0 && plagesLues < 600, `${plagesLues} plages lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler au milieu du contrôle de contraste arrête avant tout résultat', async () => {
  const b = banc();
  const releve = releveDeContraste('Alert');
  const texte = releve.variants[0].layers[1];
  let mesures = 0;
  const peinture = texte.texte!.plages[0].peintures[0];
  const couleur = peinture.couleur;
  Object.defineProperty(peinture, 'couleur', { get() { mesures += 1; return couleur; } });
  for (let i = 0; i < 128; i += 1) releve.variants[0].layers.push({ ...texte, id: `texte-${i}`, nom: `Label ${i}` });
  let horloge = 0;
  let moteurLu = false;
  const base = lecteurs(complete());
  const traiter = traiterAvec({ ...base, releve: async () => ({ statut: 'lu', releve }), moteur: async () => { moteurLu = true; return { etat: 'calculee', interne: exportDe() }; } }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (mesures > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.equal(moteurLu, false);
  assert.ok(mesures > 0 && mesures < 129, `${mesures} contrastes mesurés`);
  assert.equal(deType(b, 'analyse')[0].statut, 'annulee');
  assert.deepEqual(deType(b, 'analyse')[0].constats, []);
});

test('annuler pendant la matérialisation des modes arrête avant la fin du produit', async () => {
  const b = banc();
  const releve = releveDeContraste('Alert');
  const texte = releve.variants[0].layers[1];
  let nomsLus = 0;
  const modes = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, get nom() { nomsLus += 1; return `M${i}`; } }));
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: ['c1', 'c2', 'c3'].map((cle) => ({ cle, nom: cle, role: null, etat: 'lue', modes })),
    variables: ['c1', 'c2', 'c3'].map((cle) => ({
      cle, nom: cle, collection: cle, type: 'COLOR', etat: 'presente',
      valeurs: Object.fromEntries(modes.map(({ id }) => [id, { valeur: { r: 1, g: 1, b: 1, a: 1 } }])),
    })),
  };
  texte.texte!.plages[0].liaisons = catalogue.variables.map((variable, indice) => ({
    champ: 'fills', indice, porteur: texte.id,
    variable: { id: variable.cle, cle: variable.cle, nom: variable.nom, collection: variable.collection, distante: false },
  }));
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (nomsLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(nomsLus > 0 && nomsLus < 8 + 64 + 512, `${nomsLus} combinaisons matérialisées`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler dans les cibles après le contraste arrête avant la fin des variants', async () => {
  const b = banc();
  const releve = releveDeContraste('Alert');
  let ciblesLues = 0;
  releve.proprietes = [{ nom: 'State', type: 'VARIANT', valeurs: ['default', 'hover'], defaut: 'default' }];
  const modele = releve.variants[0];
  releve.variants = Array.from({ length: 90 }, (_, i) => ({
    ...modele, id: `v-${i}`, nom: `variant ${i}`, valeurs: { State: 'default' },
    layers: modele.layers.map((layer) => layer.parent === null ? {
      ...layer, dimensions: { ...layer.dimensions, get largeur() { ciblesLues += 1; return 20; }, hauteur: 20 },
    } : layer),
  }));
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete()),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (ciblesLues > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(ciblesLues > 0 && ciblesLues < 90, `${ciblesLues} cibles lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler pendant le produit des variantes arrête les oublis avant la matrice complète', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  let valeursLues = 0;
  const valeurs = Array.from({ length: 16 }, (_, i) => String(i));
  for (let i = 0; i < valeurs.length; i += 1) {
    Object.defineProperty(valeurs, i, { get() { valeursLues += 1; return String(i); } });
  }
  releve.proprietes = ['A', 'B', 'C'].map((nom) => ({ nom, type: 'VARIANT', valeurs, defaut: '0' }));
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete()),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (valeursLues > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(valeursLues > 0 && valeursLues < 16 + 256 + 4096, `${valeursLues} valeurs du produit lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler au milieu des couches abandonne les liaisons restantes', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  let typesLus = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'p', nom: 'primitives', role: 'primitives', etat: 'lue', modes: [] }],
    variables: [{ cle: 'v', nom: 'red', collection: 'p', etat: 'presente', get type() { typesLus += 1; return 'COLOR' as const; } }],
  };
  releve.variants[0].layers = Array.from({ length: 128 }, (_, i) => ({
    id: `layer-${i}`, nom: `Layer ${i}`, type: 'FRAME', parent: null, visible: true, opacite: 1,
    dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 }, peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: `layer-${i}`, variable: { id: 'v', cle: 'v', nom: 'red', collection: 'p', distante: false } }],
  }));
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (typesLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(typesLus > 0 && typesLus < 128, `${typesLus} types lus`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});


test('annuler pendant l’index des corrections ne rend aucune correction', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  for (let i = 0; i < 256; i += 1) {
    releve.variants[0].layers.push({
      id: `extra-${i}`, nom: `extra-${i}`, type: 'FRAME', parent: null, visible: true, opacite: 1,
      dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 }, peintures: [], valeursEnDur: [], liaisons: [],
    });
  }
  let pauses = 0;
  let annulee = false;
  let horloge = 0;
  const traiter = traiterAvec({ ...lecteurs(complete()), releve: async () => ({ statut: 'lu', releve }) }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (annulee || deType(b, 'analyse-en-cours').slice(-1)[0]?.progression?.phase !== 'corrections' || ++pauses < 3) return;
      annulee = true;
      await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  assert.equal(annulee, true);
  assert.equal(deType(b, 'analyse-provisoire').length, 1);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler pendant les résolutions C29 abandonne les candidats numériques restants', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  releve.variants[0].layers = [{
    id: 'box', nom: 'Box', type: 'FRAME', parent: null, visible: true, opacite: 1,
    dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'paddingLeft', valeur: 10 }],
  }];
  let valeursLues = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'm', nom: 'Mode' }] }],
    variables: Array.from({ length: 256 }, (_, i) => ({
      cle: `v${i}`, nom: 'alert/size/padding-x', collection: 'c', etat: 'presente', type: 'FLOAT',
      valeurs: { m: { get valeur() { valeursLues += 1; return 10; } } },
    })),
  };
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (valeursLues > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  // Le calcul des corrections suit le provisoire : l'annulation arrive après lui, et rien d'applicable n'est retenu.
  assert.equal(deType(b, 'analyse-provisoire').length, 1);
  assert.ok(valeursLues > 0 && valeursLues < 2 * 256, `${valeursLues} valeurs de candidats lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler pendant les couleurs C25 abandonne le catalogue restant', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  releve.variants[0].layers = [{
    id: 'title', nom: 'title', type: 'TEXT', parent: null, visible: true, opacite: 1,
    dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 }, liaisons: [], valeursEnDur: [],
    peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }],
  }];
  let typesLus = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', etat: 'lue', modes: [] }],
    variables: Array.from({ length: 12000 }, (_, i) => ({
      cle: `v${i}`, nom: 'alert/color/foreground', collection: 'c', etat: 'presente',
      get type() { typesLus += 1; return 'COLOR' as const; },
    })),
  };
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (typesLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  // Le calcul des corrections suit le provisoire : l'annulation arrive après lui, et rien d'applicable n'est retenu.
  assert.equal(deType(b, 'analyse-provisoire').length, 1);
  assert.ok(typesLus > 0 && typesLus < 12000, `${typesLus} couleurs lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler au milieu des signatures du mapping abandonne les modes restants', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  let aliasLus = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', etat: 'lue', modes: [] }],
    variables: [{
      cle: 'v', nom: 'alert/color/background', collection: 'c', etat: 'presente', type: 'COLOR',
      valeurs: Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`m${i}`, { get alias() { aliasLus += 1; return 'absente'; } }])),
    }],
  };
  releve.variants[0].layers = [{
    id: 'layer', nom: 'Container', type: 'FRAME', parent: null, visible: true, opacite: 1,
    dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 }, peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'layer', variable: { id: 'v', cle: 'v', nom: 'alert/color/background', collection: 'c', distante: false } }],
  }];
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (aliasLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(aliasLus > 0 && aliasLus < 256, `${aliasLus} alias lus`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler pendant la découverte des collections de la library arrête avant le moteur, sans repli sur le fichier', async () => {
  const b = banc();
  let demandes = 0;
  let fichierLu = false;
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() { return Array.from({ length: 90 }, (_, i) => ({ key: `c${i}`, name: `Collection ${i}`, libraryName: 'Lib' })); },
    async getVariablesInLibraryCollectionAsync() { demandes += 1; return []; },
  };
  const contexte: Contexte = {
    figma: { teamLibrary, root: { getSharedPluginData: () => '' }, variables: { getLocalVariablesAsync: async () => { fichierLu = true; return []; } } } as unknown as PluginAPI,
    envoyer: (m) => b.envoyes.push(m), surveillerLeDocument() {},
  };
  let horloge = 0;
  let moteurLu = false;
  let pauses = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete()),
    catalogue: catalogueDeFigma,
    moteur: async () => { moteurLu = true; return { etat: 'calculee', interne: exportDe() }; },
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (++pauses >= 12) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, contexte);
    },
  });
  await traiter({ type: 'analyser' }, contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(demandes > 0 && demandes < 90, `${demandes} collections demandées`);
  assert.equal(fichierLu, false);
  assert.equal(moteurLu, false);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
});

test('annuler pendant les tokens du nommage abandonne le catalogue restant', async () => {
  const b = banc();
  const releve = releveDe('Alert');
  let nomsLus = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', etat: 'lue', modes: [] }],
    variables: Array.from({ length: 256 }, (_, i) => ({
      cle: `v${i}`, get nom() { nomsLus += 1; return 'alert/color/background'; }, collection: 'c', etat: 'presente', type: 'COLOR',
    })),
  };
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (nomsLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(nomsLus > 0 && nomsLus < 256, `${nomsLus} noms de tokens lus`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler au milieu de la remontée des fonds du thème abandonne les ancêtres restants', async () => {
  const b = banc('ucm');
  const releve = releveDe('Alert');
  let visiblesLus = 0;
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 't', nom: 'themes', role: 'theme', etat: 'lue', modes: [] }],
    variables: [{ cle: 'fg', nom: 'success/surface/foreground', collection: 't', etat: 'presente', type: 'COLOR' }],
  };
  const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 40 };
  // Les ancêtres sont masqués : l'accessibilité les saute, seule la remontée du thème lit leurs peintures.
  const ancetres = Array.from({ length: 256 }, (_, i) => ({
    id: `a${i}`, nom: `Ancêtre ${i}`, type: 'FRAME' as const, parent: i === 0 ? null : `a${i - 1}`, visible: false, opacite: 1,
    dimensions, valeursEnDur: [], liaisons: [],
    peintures: [{ champ: 'fills' as const, indice: 0, type: 'SOLID' as const, get visible() { visiblesLus += 1; return true; }, opacite: 1, blendMode: 'NORMAL' as const }],
  }));
  releve.variants[0].layers = [...ancetres, {
    id: 'texte', nom: 'Message', type: 'TEXT', parent: 'a255', visible: true, opacite: 1, dimensions, peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'texte', variable: { id: 'fg', cle: 'fg', nom: 'success/surface/foreground', collection: 't', distante: false } }],
  }];
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Alert', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (visiblesLus > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(visiblesLus > 0 && visiblesLus < 256, `${visiblesLus} ancêtres lus`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler au milieu d’un groupe de 256 valeurs de la structure abandonne les sœurs restantes', async () => {
  const b = banc('ucm');
  const releve = releveDe('Button');
  const palettes = Array.from({ length: 257 }, (_, i) => `p${i}`);
  releve.proprietes = [{ nom: 'Severity', type: 'VARIANT', valeurs: palettes, defaut: 'p0' }];
  let valeursLues = 0;
  // Seule la structure est comptée : les autres contrôles ne lisent pas ces valeurs par ce chemin.
  const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', etat: 'lue', modes }],
    variables: palettes.map((palette, i) => {
      const valeurs = i === 0 ? { light: { valeur: '#000' }, dark: { valeur: null } } : { light: { valeur: '#000' }, dark: { valeur: '#111' } };
      return {
        cle: `v${i}`, nom: `Button/color/${palette}/contained/default/ring`, collection: 'c', etat: 'presente' as const, type: 'COLOR' as const,
        get valeurs() { if (/structure/.test(new Error().stack ?? '')) valeursLues += 1; return valeurs; },
      };
    }),
  };
  let horloge = 0;
  const traiter = traiterAvec({
    ...lecteurs(complete(), 'Button', catalogue),
    releve: async () => ({ statut: 'lu', releve }),
  }, {
    horloge: () => horloge += 2, budgetDeCalculMs: 1,
    respirer: async () => {
      if (valeursLues > 0) await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.ok(valeursLues > 0 && valeursLues < 256, `${valeursLues} valeurs lues`);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
  assert.equal(correctionsDeLAnalyse(resultat.analyse)?.size ?? 0, 0);
});

test('annuler à une cession des contrôles ne rend aucun constat', async () => {
  const b = banc();
  let horloge = 0;
  let annulee = false;
  const traiter = traiterAvec(lecteurs(complete([pointDeTest])), {
    horloge: () => horloge += 25, budgetDeCalculMs: 25,
    respirer: async () => {
      if (deType(b, 'analyse-en-cours').slice(-1)[0]?.progression?.phase !== 'controles') return;
      annulee = true;
      await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
    },
  });
  await traiter({ type: 'analyser' }, b.contexte);
  sansProvisoireNiMoteur(b);
  assert.equal(annulee, true);
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
});

test('le banc conserve une lecture partielle, ses manquées localisées et ses variants non lus', async () => {
  let fabriques = 0;
  const fabriquer = () => {
    fabriques += 1;
    const b = banc();
    const releve = releveDe('Alert', {
      layersLus: 2,
      layersNonLus: 4,
      variantsNonLus: ['Alert compact', 'Alert disabled'],
      manquees: [{ layer: 'texte', champ: 'dimensions', motif: 'boîte illisible' }],
    });
    return {
      b,
      lectures: {
        ...lecteurs(async () => ({ etat: 'calculee', interne: { ...exportDe([pointDeTest]), couverture: { etat: 'partielle', lus: 1, nonLus: 2 } } })),
        releve: async () => ({ statut: 'lu' as const, releve }),
      },
    };
  };
  const reference = await verifierLaPariteDeLAnalyse(fabriquer);
  assert.equal(fabriques, 2);
  assert.deepEqual(reference.releve?.lecture, {
    layersLus: 2,
    layersNonLus: 4,
    variantsNonLus: ['Alert compact', 'Alert disabled'],
    manquees: [{ layer: 'texte', champ: 'dimensions', motif: 'boîte illisible' }],
  });
  assert.equal(reference.messages.find((message) => message.type === 'analyse')?.type, 'analyse');
});

test('le banc compare une question C29 avec candidats puis sa correction et son aRelire', async () => {
  const fabriquer = () => {
    const b = banc();
    const releve: ReleveDeComposant = {
      ...releveDe('Alert'),
      variants: [{
        id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, modesEffectifs: {},
        layers: [{
          id: 'root', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1,
          dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [],
          valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }],
        }],
      }],
    };
    const catalogue: CatalogueDeReference = {
      version: 1, library: null,
      collections: [{ cle: 'components', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
      variables: [
        { cle: 'r12', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 12 }, Dark: { valeur: 12 } } },
        { cle: 'r14', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 14 }, Dark: { valeur: 14 } } },
      ],
    };
    return {
      b,
      lectures: {
        ...lecteurs(complete()),
        releve: async () => ({ statut: 'lu' as const, releve }),
        catalogue: async () => catalogue,
      },
    };
  };
  const reference = await verifierLaPariteDeLAnalyse(fabriquer, traiterAvec, async (b, identite) => {
    const resultat = b.envoyes.find((message) => message.type === 'analyse');
    assert.ok(resultat?.type === 'analyse');
    const constat = resultat.constats.find(({ code }) => code === 'C29');
    assert.deepEqual(constat?.question?.candidats.map(({ cle, valeur }) => [cle, valeur]), [['r12', 12], ['r14', 14]]);
    await traiterLesQuestions({ type: 'repondre', analyse: identite, question: constat!.id, reponse: 'r14' }, b.contexte);
  });
  assert.deepEqual(reference.corrections, [['C29:v-Alert:root:cornerRadius:13', {
    id: 'C29:v-Alert:root:cornerRadius:13', sorte: 'liaison', cible: { layer: 'root', champ: 'cornerRadius' }, avant: null,
    apres: { cle: 'r14', nom: 'alert/size/radius' },
    aRelire: { axes: {}, regle: 'Le designer a choisi un token proche. La valeur change.', avant: null, valeur: 13 },
  }]]);
  assert.ok(reference.messages.some((message) => message.type === 'question-repondue' && message.correction?.aRelire.valeur === 13));
});

test('chaque demande d’écriture forgée pendant le provisoire est refusée sans effet ; après le final, les mêmes demandes passent', async () => {
  const stockage = new Map<string, unknown>();
  const effets = { depots: 0, lots: [] as string[][], rangements: [] as string[], creations: 0 };
  const envoyes: PluginMessage[] = [];
  const figma = {
    clientStorage: { async getAsync(cle: string) { return stockage.get(cle); }, async setAsync(cle: string, valeur: unknown) { stockage.set(cle, valeur); effets.depots += 1; } },
    root: { getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : '') },
  };
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
    variables: [
      { cle: 'r12', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 12 }, Dark: { valeur: 12 } } },
      { cle: 'r14', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 14 }, Dark: { valeur: 14 } } },
    ],
  };
  const releve: ReleveDeComposant = {
    ...releveDe('Alert'),
    variants: [{
      id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, modesEffectifs: {},
      layers: [{ id: 'root', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }] }],
    }],
  };
  const CONSTAT = 'C29:v-Alert:root:cornerRadius:13';
  const corrections = traiterLesCorrections({
    async lot(aEcrire) { effets.lots.push(aEcrire.map(({ id }) => id)); return { ecrites: aEcrire.map(({ id }) => id), sautees: [] }; },
    async selectionner(layers) { return layers; },
  });
  const ignores = traiterLesIgnores(() => ({
    ignorer: (constat, portee) => { effets.rangements.push(`ignorer:${portee}:${constat.id}`); return { ecrit: true, cles: [constat.id] }; },
    nePlusIgnorer: (id) => { effets.rangements.push(`ne-plus-ignorer:${id}`); return { ecrit: true, cles: [] }; },
  }));
  const preparation = traiterLaPreparation({
    catalogue: async () => catalogue,
    publiees: async () => new Map(),
    creer: async () => { effets.creations += 1; return { refus: null, collections: [], etats: {}, echecs: [], divergentes: [], creees: 0, remplacees: 0, gardees: 0, sautees: 0, journal: true }; },
    fichier: () => ({ nom: 'Composants', cle: 'abc' }),
    identifiant: () => 'prep-2',
    maintenant: () => '2026-10-23T10:00:00.000Z',
  });
  const rangee: PreparationRangee = { id: 'prep-1', creeLe: '2026-10-23T10:00:00.000Z', regles: [], source: { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'Alert', nom: 'Alert' } }, variables: [] };
  await rangerUnePreparation(figma.clientStorage, rangee);

  /** Toutes les demandes qui écrivent ou qui s'appuient sur les corrections de l'analyse, dans l'ordre où le final les accepte. */
  const forger = async (analyse: IdentiteDAnalyse): Promise<PluginMessage[]> => {
    const avant = envoyes.length;
    await traiterLesQuestions({ type: 'repondre', analyse, question: CONSTAT, reponse: 'r14' }, contexte);
    await traiterLesQuestions({ type: 'annuler-reponse', analyse, question: CONSTAT }, contexte);
    await traiterLesQuestions({ type: 'repondre', analyse, question: CONSTAT, reponse: 'r14' }, contexte);
    await ignores({ type: 'ignorer', analyse, constat: CONSTAT, portee: 'constat' }, contexte);
    await ignores({ type: 'ignorer', analyse, constat: CONSTAT, portee: 'proposition' }, contexte);
    await ignores({ type: 'ne-plus-ignorer', analyse, constat: CONSTAT }, contexte);
    await corrections({ type: 'servir-de-modele', analyse, variant: 'v-Alert' }, contexte);
    await preparation({ type: 'preparer', analyse, reponses: {}, ranger: true }, contexte);
    await preparation({ type: 'lier-preparation', analyse, preparation: 'prep-1' }, contexte);
    await preparation({ type: 'creer-variables', preparation: 'prep-1', reponses: {} }, contexte);
    await corrections({ type: 'appliquer-corrections', analyse, ids: [CONSTAT] }, contexte);
    return envoyes.slice(avant);
  };
  const types = (messages: readonly PluginMessage[]) => messages.map(({ type }) => type);

  let pendantLeProvisoire: PluginMessage[] = [];
  let correctionsAvant: unknown = 'jamais lu';
  const lectures: Lecteurs = {
    ...lecteurs(complete()),
    releve: async () => ({ statut: 'lu', releve }),
    catalogue: async () => catalogue,
    moteur: async () => {
      // Le moteur ne démarre qu'après l'envoi du provisoire.
      assert.deepEqual(types(envoyes).filter((type) => type === 'analyse-provisoire' || type === 'analyse'), ['analyse-provisoire']);
      const analyse = analyseCourante()!;
      effets.depots = 0;
      pendantLeProvisoire = await forger(analyse);
      correctionsAvant = correctionsDeLAnalyse(analyse);
      return { etat: 'calculee', interne: exportDe() };
    },
  };
  await traiterAvec(lectures)({ type: 'analyser' }, contexte);

  // Pendant le provisoire : aucune écriture, aucun stockage, aucune correction retenue, aucune réponse de succès.
  assert.deepEqual(effets, { depots: 0, lots: [], rangements: [], creations: 0 });
  assert.equal(correctionsAvant, null);
  const parType = (type: PluginMessage['type']) => pendantLeProvisoire.filter((m) => m.type === type);
  for (const type of ['question-repondue', 'ignores', 'corrections-appliquees', 'modele-propose', 'preparations', 'perime'] as const) assert.deepEqual(parType(type), [], type);
  assert.deepEqual(parType('plan-de-preparation').map((m) => m.type === 'plan-de-preparation' && m.refus), ['analyse-perimee']);
  assert.deepEqual(parType('liaisons-preparees').map((m) => m.type === 'liaisons-preparees' && m.refus), ['analyse-perimee']);
  assert.deepEqual(parType('variables-creees').map((m) => m.type === 'variables-creees' && m.refus), ['occupe']);

  // Après le final, les mêmes demandes passent.
  const [final] = envoyes.filter((m): m is Extract<PluginMessage, { type: 'analyse' }> => m.type === 'analyse');
  assert.equal(final.statut, 'complete');
  const apres = await forger(final.analyse);
  assert.deepEqual(effets.rangements, [`ignorer:constat:${CONSTAT}`, `ignorer:proposition:${CONSTAT}`, `ne-plus-ignorer:${CONSTAT}`]);
  assert.deepEqual(effets.lots, [[CONSTAT]]);
  assert.equal(effets.creations, 1);
  assert.ok(apres.some((m) => m.type === 'question-repondue' && m.correction !== null));
  assert.ok(apres.some((m) => m.type === 'modele-propose'));
  assert.ok(apres.some((m) => m.type === 'corrections-appliquees' && m.ecrites === 1));
  assert.ok(apres.every((m) => !(m.type === 'plan-de-preparation' && m.refus === 'analyse-perimee')));
  assert.ok(apres.every((m) => !(m.type === 'liaisons-preparees' && m.refus === 'analyse-perimee')));
});

test('une analyse complète rend l’identité dans chaque message et les constats du moteur traduits', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete([pointDeTest])))({ type: 'analyser' }, b.contexte);
  const [commencee] = deType(b, 'analyse-commencee');
  const [enCours] = deType(b, 'analyse-en-cours');
  const [resultat] = deType(b, 'analyse');
  assert.equal(commencee.analyse.sujet, 'Alert');
  assert.deepEqual(enCours.analyse, commencee.analyse);
  assert.deepEqual(resultat.analyse, commencee.analyse);
  assert.equal(resultat.statut, 'complete');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.variants, [{ id: 'v-Alert', nom: 'Alert défaut' }]);
});

test('une analyse rend C43 quand le composant n’a pas d’instance de règles, C45 quand elle ne dit pas ses propriétés', async () => {
  const modele = { nom: 'Alert', sections: [{ tag: 'prop' as const, elements: [{ genre: 'regle' as const, tag: 'prop' as const, cible: 'severity.info' }] }] };
  const avec = (instancePresente: boolean, documentees: string[]): Lecteurs => ({
    ...lecteurs(complete()),
    regles: async () => ({ composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente, modele, proprietes: ['severity'], documentees }),
  });
  const sans = banc();
  await traiterAvec(avec(false, []))({ type: 'analyser' }, sans.contexte);
  assert.deepEqual(deType(sans, 'analyse')[0].constats.map((c) => c.code), ['C43']);
  reinitialiserLAnalyse();
  const incomplete = banc();
  await traiterAvec(avec(true, ['tone']))({ type: 'analyser' }, incomplete.contexte);
  assert.deepEqual(deType(incomplete, 'analyse')[0].constats.map((c) => c.code), ['C45', 'C45']);
  reinitialiserLAnalyse();
  const juste = banc();
  await traiterAvec(avec(true, ['severity']))({ type: 'analyser' }, juste.contexte);
  assert.deepEqual(deType(juste, 'analyse')[0].constats, []);
});

test('une lecture des règles qui lève ne coûte que ses constats', async () => {
  const b = banc();
  await traiterAvec({ ...lecteurs(complete([pointDeTest])), regles: async () => { throw new Error('page illisible'); } })({ type: 'analyser' }, b.contexte);
  assert.deepEqual(deType(b, 'analyse')[0].constats.map((c) => c.code), ['C44']);
});

function catalogueAvecUnToken(nom: string): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'Components', role: 'components', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] }],
    variables: [{ cle: 'fond', nom, collection: 'components', type: 'COLOR', etat: 'presente' }],
  };
}

test('sansTokens : vrai quand la collection components n’a aucune variable du jeu, faux dès qu’elle en a une', async () => {
  const sans = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, sans.contexte);
  assert.equal(deType(sans, 'analyse')[0].sansTokens, true);

  reinitialiserLAnalyse();
  const autreJeu = banc();
  await traiterAvec(lecteurs(complete(), 'Alert', catalogueAvecUnToken('Button/color/info/background')))({ type: 'analyser' }, autreJeu.contexte);
  assert.equal(deType(autreJeu, 'analyse')[0].sansTokens, true);

  reinitialiserLAnalyse();
  const avec = banc();
  await traiterAvec(lecteurs(complete(), 'Alert', catalogueAvecUnToken('Alert/color/info/background')))({ type: 'analyser' }, avec.contexte);
  assert.equal(deType(avec, 'analyse')[0].sansTokens, false);
});

test('sansTokens : faux quand le relevé n’est pas lu', async () => {
  const b = banc();
  await traiterAvec({ ...lecteurs(complete()), releve: async () => ({ statut: 'sans-sujet' }) })({ type: 'analyser' }, b.contexte);
  assert.equal(deType(b, 'analyse')[0].sansTokens, false);
});

test('une analyse lente d’Alert puis la sélection de Button : perime selection, la réponse porte l’ancienne identité', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  const traiter = traiterAvec(lecteurs(async () => { await porte; return complete()(); }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const alert = analyseCourante() as IdentiteDAnalyse;
  surSelection('jeu-Button', 'figma', b.contexte);
  ouvrir();
  await analyse;
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: alert, cause: 'selection' }]);
  assert.deepEqual(deType(b, 'analyse')[0].analyse, alert);
  assert.equal(alert.sujet, 'Alert');
});

test('un clic sur Analyser après la péremption annule le calcul périmé et sert la nouvelle demande, sans occupe', async () => {
  const b = banc();
  let appels = 0;
  const traiter = traiterAvec(lecteurs(async (jeton) => {
    appels += 1;
    if (appels > 1) return complete()();
    while (!jeton.leve) await attendre(2);
    return { etat: 'annulee' };
  }));
  const premiere = traiter({ type: 'analyser', demande: 1 }, b.contexte);
  await attendre(5);
  const alert = analyseCourante() as IdentiteDAnalyse;
  surSelection('jeu-Button', 'figma', b.contexte);
  assert.equal(deType(b, 'perime').length, 1);
  // La péremption seule ne lève rien : le calcul continue.
  await attendre(10);
  assert.equal(deType(b, 'analyse').length, 0);
  await traiter({ type: 'analyser', demande: 2 }, b.contexte);
  await premiere;
  assert.equal(deType(b, 'occupe').length, 0);
  const finals = deType(b, 'analyse');
  assert.deepEqual(finals.map((m) => [m.demande, m.statut]), [[1, 'annulee'], [2, 'complete']]);
  assert.deepEqual(finals[0].analyse, alert);
  assert.equal(finals[1].analyse.generation, alert.generation + 1);
});

test('un clic sur Analyser pendant un calcul non périmé rend occupe, et le calcul continue', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  const traiter = traiterAvec(lecteurs(async () => { await porte; return complete()(); }));
  const premiere = traiter({ type: 'analyser', demande: 1 }, b.contexte);
  await attendre(5);
  await traiter({ type: 'analyser', demande: 2 }, b.contexte);
  assert.equal(deType(b, 'occupe').length, 1);
  ouvrir();
  await premiere;
  assert.deepEqual(deType(b, 'analyse').map((m) => m.statut), ['complete']);
});

test('un changement du sujet émis pendant le calcul et reçu seulement à la cession rend la génération inapplicable avant le résultat final', async () => {
  const b = banc();
  // L'événement part pendant le moteur et n'est livré qu'à la macrotâche suivante : le calcul ne l'a pas vu.
  const traiter = traiterAvec(lecteurs(async () => {
    setTimeout(() => surChangementDuDocument(['v-Alert'], b.contexte), 0);
    return complete()();
  }));
  await traiter({ type: 'analyser' }, b.contexte);
  const identite = analyseCourante() as IdentiteDAnalyse;
  const ordre = b.envoyes.map((m) => m.type).filter((type) => type === 'perime' || type === 'analyse');
  assert.deepEqual(ordre, ['perime', 'analyse'], 'la péremption précède le résultat, qui reste lisible');
  assert.equal(deType(b, 'analyse')[0].statut, 'complete');
  assert.equal(correctionsDeLAnalyse(identite), null, 'aucune correction ne s’appuie sur cette génération');
});

test('sans changement pendant le calcul, la génération est finalisée et applicable', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  assert.equal(deType(b, 'perime').length, 0);
  assert.notEqual(correctionsDeLAnalyse(analyseCourante() as IdentiteDAnalyse), null);
});

test('une seconde analyse pendant une analyse rend occupe et ne lance rien', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  let lancees = 0;
  const traiter = traiterAvec(lecteurs(async () => { lancees += 1; await porte; return complete()(); }));
  const premiere = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  await traiter({ type: 'analyser' }, b.contexte);
  const [occupe] = deType(b, 'occupe');
  assert.deepEqual(occupe.analyse, analyseCourante());
  ouvrir();
  await premiere;
  assert.equal(lancees, 1);
  assert.equal(deType(b, 'analyse-commencee').length, 1);
  assert.equal(deType(b, 'analyse').length, 1);
});

test('annuler-analyse de l’identité courante rend annulee sans constat ; une identité périmée est ignorée', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(async (jeton) => {
    while (!jeton.leve) await attendre(2);
    return { etat: 'annulee' };
  }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const courante = analyseCourante() as IdentiteDAnalyse;
  await traiter({ type: 'annuler-analyse', analyse: { sujet: courante.sujet, generation: courante.generation - 1 } }, b.contexte);
  await attendre(10);
  assert.equal(deType(b, 'analyse').length, 0);
  await traiter({ type: 'annuler-analyse', analyse: courante }, b.contexte);
  await analyse;
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
});

test('une erreur du moteur rend arretee avec un seul constat bloquant', async () => {
  for (const erreur of [new ComponentExportError('Le composant est illisible.'), new Error('boum')]) {
    const b = banc();
    await traiterAvec(lecteurs(async () => { throw erreur; }))({ type: 'analyser' }, b.contexte);
    const [resultat] = deType(b, 'analyse');
    assert.equal(resultat.statut, 'arretee');
    assert.equal(resultat.constats.length, 1);
    assert.equal(resultat.constats[0].type, 'bloquant');
    assert.equal(resultat.constats[0].famille, 'export');
    assert.deepEqual(resultat.constats[0].faits, { message: erreur.message });
    assert.equal(resultat.lecture, null);
    reinitialiserLAnalyse();
  }
});

test('une erreur du moteur après le provisoire rend arretee seule, sans correction retenue ni écriture possible', async () => {
  const b = banc();
  const effets = { lots: [] as string[][], rangements: [] as string[] };
  const corrections = traiterLesCorrections({
    async lot(aEcrire) { effets.lots.push(aEcrire.map(({ id }) => id)); return { ecrites: aEcrire.map(({ id }) => id), sautees: [] }; },
    async selectionner(layers) { return layers; },
  });
  const ignores = traiterLesIgnores(() => ({
    ignorer: (constat, portee) => { effets.rangements.push(`ignorer:${portee}:${constat.id}`); return { ecrit: true, cles: [constat.id] }; },
    nePlusIgnorer: (id) => { effets.rangements.push(`ne-plus-ignorer:${id}`); return { ecrit: true, cles: [] }; },
  }));
  await traiterAvec(lecteurs(async () => { throw new Error('boum'); }))({ type: 'analyser' }, b.contexte);
  const types = b.envoyes.map(({ type }) => type).filter((type) => type === 'analyse-provisoire' || type === 'analyse');
  assert.deepEqual(types, ['analyse-provisoire', 'analyse']);
  const [final] = deType(b, 'analyse');
  assert.equal(final.statut, 'arretee');
  assert.deepEqual(final.constats.map(({ famille, type }) => [famille, type]), [['export', 'bloquant']]);
  assert.equal(correctionsDeLAnalyse(final.analyse), null);
  const avant = b.envoyes.length;
  const constat = final.constats[0].id;
  await corrections({ type: 'appliquer-corrections', analyse: final.analyse, ids: [constat] }, b.contexte);
  await corrections({ type: 'servir-de-modele', analyse: final.analyse, variant: 'v-Alert' }, b.contexte);
  await ignores({ type: 'ignorer', analyse: final.analyse, constat, portee: 'constat' }, b.contexte);
  assert.deepEqual(effets, { lots: [], rangements: [] });
  const apres = b.envoyes.slice(avant);
  assert.deepEqual(apres.filter((m) => m.type === 'corrections-appliquees').map((m) => m.type === 'corrections-appliquees' && [m.ecrites, m.sautees.map(({ motif }) => motif)]), [[0, ['analyse-perimee']]]);
  assert.deepEqual(apres.filter((m) => m.type === 'modele-propose').map((m) => m.type === 'modele-propose' && m.constats), [[]]);
  for (const type of ['ignores', 'perime'] as const) assert.ok(!apres.some((m) => m.type === type), type);
});

test('une lecture incomplète menée à terme rend un final partielle après le provisoire : couverture, corrections retenues, actions permises', async () => {
  const b = banc();
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
    variables: [
      { cle: 'r12', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 12 }, Dark: { valeur: 12 } } },
      { cle: 'r14', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 14 }, Dark: { valeur: 14 } } },
    ],
  };
  const releve: ReleveDeComposant = {
    ...releveDe('Alert', { layersLus: 2, layersNonLus: 4, variantsNonLus: ['Alert compact'], manquees: [{ layer: 'texte', champ: 'dimensions', motif: 'boîte illisible' }] }),
    variants: [{
      id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, modesEffectifs: {},
      layers: [{ id: 'root', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }] }],
    }],
  };
  const CONSTAT = 'C29:v-Alert:root:cornerRadius:13';
  const effets = { lots: [] as string[][], rangements: [] as string[] };
  const lectures: Lecteurs = { ...lecteurs(complete()), releve: async () => ({ statut: 'lu', releve }), catalogue: async () => catalogue };
  await traiterAvec(lectures)({ type: 'analyser' }, b.contexte);

  assert.deepEqual(b.envoyes.map(({ type }) => type).filter((type) => type === 'analyse-provisoire' || type === 'analyse'), ['analyse-provisoire', 'analyse']);
  const [provisoire] = deType(b, 'analyse-provisoire');
  const [final] = deType(b, 'analyse');
  assert.equal(final.statut, 'partielle');
  assert.deepEqual(final.analyse, provisoire.analyse);
  assert.deepEqual(final.lecture, { layersLus: 2, layersNonLus: 4, variantsNonLus: ['Alert compact'], manquees: [{ layer: 'texte', champ: 'dimensions', motif: 'boîte illisible' }] });
  assert.deepEqual(provisoire.lecture, final.lecture);
  assert.ok(final.constats.some((constat) => constat.id === CONSTAT));

  // Le final partielle finalise : les corrections sont retenues et les actions passent.
  assert.ok(correctionsDeLAnalyse(final.analyse) !== null);
  const corrections = traiterLesCorrections({
    async lot(aEcrire) { effets.lots.push(aEcrire.map(({ id }) => id)); return { ecrites: aEcrire.map(({ id }) => id), sautees: [] }; },
    async selectionner(layers) { return layers; },
  });
  const ignores = traiterLesIgnores(() => ({
    ignorer: (constat, portee) => { effets.rangements.push(`ignorer:${portee}:${constat.id}`); return { ecrit: true, cles: [constat.id] }; },
    nePlusIgnorer: () => ({ ecrit: true, cles: [] }),
  }));
  const avant = b.envoyes.length;
  await traiterLesQuestions({ type: 'repondre', analyse: final.analyse, question: CONSTAT, reponse: 'r14' }, b.contexte);
  await corrections({ type: 'servir-de-modele', analyse: final.analyse, variant: 'v-Alert' }, b.contexte);
  await ignores({ type: 'ignorer', analyse: final.analyse, constat: CONSTAT, portee: 'constat' }, b.contexte);
  const apres = b.envoyes.slice(avant);
  assert.ok(apres.some((m) => m.type === 'question-repondue' && m.correction !== null));
  assert.ok(apres.some((m) => m.type === 'modele-propose'));
  assert.deepEqual(effets.rangements, [`ignorer:constat:${CONSTAT}`]);
  await corrections({ type: 'appliquer-corrections', analyse: final.analyse, ids: [CONSTAT] }, b.contexte);
  assert.ok(b.envoyes.slice(avant).some((m) => m.type === 'corrections-appliquees' && m.sautees.every(({ motif }) => motif !== 'analyse-perimee')));
});

test('un résultat partiel du moteur rend partielle, avec ses constats et la lecture', async () => {
  const b = banc();
  const lec = lecteurs(async () => ({ etat: 'calculee', interne: { ...exportDe([pointDeTest]), couverture: { etat: 'partielle', lus: 1, nonLus: 3 } } }));
  await traiterAvec({ ...lec, releve: async (sujet) => ({ statut: 'lu', releve: releveDe(sujet.cle, { variantsNonLus: ['x', 'y', 'z'] }) }) })({ type: 'analyser' }, b.contexte);
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'partielle');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.lecture?.variantsNonLus, ['x', 'y', 'z']);
});

test('un clic sur un constat (sélection du plugin) ne change ni le sujet ni la génération et ne périme rien', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  const avant = analyseCourante();
  retenirLaSelectionDuPlugin(['l1']);
  assert.equal(origineDeLaSelection(['l1']), 'plugin');
  surSelection('jeu-Button', 'plugin', b.contexte);
  surSelection('v-Alert', 'figma', b.contexte);
  assert.deepEqual(analyseCourante(), avant);
  assert.equal(deType(b, 'perime').length, 0);
});

test('Ctrl+Z périme une seule fois sans réanalyse ; Actualiser ouvre une nouvelle génération', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(complete()));
  await traiter({ type: 'analyser' }, b.contexte);
  const premiere = analyseCourante() as IdentiteDAnalyse;
  surChangementDuDocument(['v-Alert'], b.contexte);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: premiere, cause: 'document' }]);
  assert.equal(deType(b, 'analyse').length, 1);
  await traiter({ type: 'analyser' }, b.contexte);
  const seconde = analyseCourante() as IdentiteDAnalyse;
  assert.equal(seconde.generation, premiere.generation + 1);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.equal(deType(b, 'perime').length, 2);
  assert.equal(deType(b, 'perime')[1].analyse.generation, seconde.generation);
});

test('une écriture du plugin périme l’analyse courante', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  perimerApresUneEcriture(b.contexte);
  assert.equal(deType(b, 'perime')[0].cause, 'ecriture');
});

/** Un relevé dont le texte gris (4,8:1 environ sur blanc) passe en AA, échoue en AAA, et n'a ni style ni variable. */
function releveDeContraste(nom: string): ReleveDeComposant {
  const peinture = (v: number) => ({ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: v, g: v, b: v, a: 1 } });
  const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 48 };
  const racine = { id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [peinture(1)], liaisons: [], valeursEnDur: [] };
  const texte = {
    id: 't', nom: 'Label', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions, peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [peinture(0.45)], liaisons: [] }] },
  };
  return { ...releveDe(nom), variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [racine, texte], modesEffectifs: {} }] };
}

const lecteursDeContraste = (niveau?: Lecteurs['niveau']): Lecteurs => ({
  ...lecteurs(complete()),
  async releve(sujet) { return { statut: 'lu', releve: releveDeContraste(sujet.cle) }; },
  ...(niveau ? { niveau } : {}),
});

test('l’analyse ajoute les constats de typographie à ceux du kit', async () => {
  const b = banc();
  await traiterAvec(lecteursDeContraste())({ type: 'analyser' }, b.contexte);
  assert.ok(deType(b, 'analyse')[0].constats.some((c) => c.code === 'C64' && c.famille === 'typographie'));
});

/** Un catalogue UCM qui déclenche la structure : thème, composants et marques, des alias entre eux. */
function catalogueDeStructure(): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [
      { cle: 'theme', nom: 'Theme', role: 'theme', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
      { cle: 'components', nom: 'Components', role: 'components', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
      { cle: 'brands', nom: 'Brands', role: 'brands', etat: 'lue', modes: [{ id: 'light', nom: 'Light' }] },
    ],
    variables: [
      { cle: 'surface-fg', nom: 'success/surface/foreground', collection: 'theme', type: 'COLOR', etat: 'presente', scopes: ['TEXT_FILL'] },
      { cle: 'page-fg', nom: 'success/page/foreground', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'surface-bg', nom: 'success/surface/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'primary', nom: 'Button/color/primary/contained/default/background', collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'theme-primary' } } },
      { cle: 'secondary', nom: 'Button/color/secondary/contained/default/background', collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-secondary' } } },
      { cle: 'theme-primary', nom: 'primary/solid/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'theme-secondary', nom: 'secondary/solid/default', collection: 'theme', type: 'COLOR', etat: 'presente' },
      { cle: 'brand-secondary', nom: 'secondary/light/700', collection: 'brands', type: 'COLOR', etat: 'presente' },
    ],
  };
}

/** Un bouton à trois axes et un texte lié à `success/surface/foreground`. */
function composantDeStructure(): ReleveDeComposant {
  return {
    ...releveDe('Button'),
    proprietes: [
      { nom: 'Palette', type: 'VARIANT', valeurs: ['primary', 'secondary'], defaut: 'primary' },
      { nom: 'Style', type: 'VARIANT', valeurs: ['contained'], defaut: 'contained' },
      { nom: 'State', type: 'VARIANT', valeurs: ['default'], defaut: 'default' },
    ],
    variants: [{ id: 'v-Button', nom: 'Button défaut', valeurs: {}, modesEffectifs: {}, layers: [{
      id: 'text', nom: 'Message', type: 'TEXT', parent: null, visible: true, opacite: 1,
      dimensions: { x: 0, y: 0, largeur: 20, hauteur: 10 }, peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: 'text', variable: { id: 'surface-fg', cle: 'surface-fg', nom: 'success/surface/foreground', collection: 'theme', distante: false } }],
    }] }],
  };
}

test('l’analyse UCM ajoute C59 et C63 de structure, tandis que l’architecture libre les tait', async () => {
  const catalogue = catalogueDeStructure();
  const composant = composantDeStructure();
  const base = lecteurs(complete());
  const avec = { ...base, releve: async () => ({ statut: 'lu' as const, releve: composant }), catalogue: async () => catalogue };

  const ucm = banc('ucm');
  await traiterAvec(avec)({ type: 'analyser' }, ucm.contexte);
  const constatsUcm = deType(ucm, 'analyse')[0].constats;
  assert.ok(constatsUcm.some(({ code }) => code === 'C59'));
  assert.ok(constatsUcm.some(({ code, id }) => code === 'C63' && id.includes('secondary')));

  const libre = banc('libre');
  await traiterAvec(avec)({ type: 'analyser' }, libre.contexte);
  assert.equal(deType(libre, 'analyse')[0].constats.some(({ code }) => code === 'C59' || code === 'C63'), false);
});

test('le niveau rangé sert à l’analyse : AA laisse passer 4,8:1, AAA le signale', async () => {
  const contraste = async (niveau?: Lecteurs['niveau']) => {
    reinitialiserLAnalyse();
    const b = banc();
    await traiterAvec(lecteursDeContraste(niveau))({ type: 'analyser' }, b.contexte);
    return deType(b, 'analyse')[0].constats.filter((c) => c.code === 'C49' && !c.limite);
  };
  assert.equal((await contraste()).length, 0);
  assert.equal((await contraste(async () => 'AA')).length, 0);
  assert.equal((await contraste(async () => 'AAA')).length, 1);
  assert.equal((await contraste(async () => { throw new Error('stockage'); })).length, 0);
});

test('l’analyse passe ses constats par proposerLesCorrections : une valeur en dur sans token du composant ne devient pas une question', async () => {
  const b = banc();
  // Une collection components lue et sans variable : la recherche est complète, et ne trouve rien.
  const composantsVide: CatalogueDeReference = { ...catalogueVide, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }] };
  const base = lecteurs(complete(), 'Alert', composantsVide);
  const layer = { id: 'L1', nom: 'box', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 1, hauteur: 1 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
  const releve = { ...releveDe('Alert'), variants: [{ id: 'v-Alert', nom: 'Alert', valeurs: {}, layers: [layer], modesEffectifs: {} }] } as unknown as ReleveDeComposant;
  await traiterAvec({ ...base, releve: async () => ({ statut: 'lu', releve }) })({ type: 'analyser' }, b.contexte);
  const [resultat] = deType(b, 'analyse');
  const c29 = resultat.constats.find(({ code }) => code === 'C29');
  assert.equal(c29?.question, undefined);
  assert.equal(c29?.correction, undefined);
  assert.equal(c29?.faits.recherche, undefined);
});

test('une clé d’Ignorer rangée garde le constat dans l’analyse et le nomme dans ignores ; la proposition retirée ne l’ignore pas', async () => {
  const analyserAvec = async (cles: string[]) => {
    reinitialiserLAnalyse();
    const b = banc();
    await traiterAvec({ ...lecteurs(complete([pointDeTest])), ignores: async () => cles })({ type: 'analyser' }, b.contexte);
    return b;
  };
  const sans = await analyserAvec([]);
  const id = deType(sans, 'analyse')[0].constats[0].id;
  assert.deepEqual(deType(sans, 'ignores').map(({ constats }) => constats), [[]]);
  const ignore = await analyserAvec([id]);
  const [analyse] = deType(ignore, 'analyse');
  assert.deepEqual(analyse.constats.map(({ id: idDuConstat }) => idDuConstat), [id]);
  assert.deepEqual(deType(ignore, 'ignores'), [{ type: 'ignores', analyse: analyse.analyse, constats: [id] }]);
  const propose = await analyserAvec([`proposition:${id}`]);
  assert.equal(deType(propose, 'analyse')[0].constats.length, 1);
  assert.deepEqual(deType(propose, 'ignores').map(({ constats }) => constats), [[]]);
});

test('la mesure couvre le sujet avant le moteur, ferme la trace et garde les sorties fonctionnelles', async () => {
  const horloge = Date.now;
  let instant = 100;
  Date.now = () => instant;
  try {
    const executer = async (mesurer: boolean) => {
      reinitialiserLAnalyse();
      const b = banc();
      const lectures = lecteurs(complete([pointDeTest]));
      const sujet = lectures.sujet;
      lectures.sujet = async (contexte) => { instant += 37; return sujet(contexte); };
      lectures.moteur = async () => { etape('interne-du-moteur'); compter('nodesParcourus', 13); instant += 19; return complete([pointDeTest])(); };
      await traiterAvec(lectures)({ type: 'analyser', mesurer }, b.contexte);
      return deType(b, 'analyse')[0];
    };
    const sans = await executer(false);
    const avec = await executer(true);
    assert.equal(sans.mesure, undefined);
    assert.deepEqual(avec.constats, sans.constats);
    assert.deepEqual(avec.lecture, sans.lecture);
    assert.deepEqual(avec.variants, sans.variants);
    assert.equal(avec.sansTokens, sans.sansTokens);
    assert.equal(avec.mesure?.etapes[0].nom, 'sujet');
    assert.equal(avec.mesure?.etapes[0].ms, 37);
    assert.equal(avec.mesure?.totalMs, 56);
    assert.ok(avec.mesure?.etapes.some(({ nom }) => nom === 'interne-du-moteur'));
    assert.deepEqual(avec.mesure?.phases?.map(({ nom }) => nom), ['sujet', 'releve', 'catalogue', 'controles', 'moteur', 'regles', 'controles', 'corrections', 'projection', 'projection']);
    assert.equal(avec.mesure?.compteurs.nodesParcourus, 13);
    assert.ok((avec.mesure?.compteurs.tailleSortieArchitect ?? 0) > 0);
    assert.equal(avec.mesure?.fin, 'complete');
    assert.equal(fermerLaMesure(''), null);
  } finally { Date.now = horloge; }
});

/** Un relevé et un catalogue dont chaque lecture avance l'horloge simulée : l'avance d'un contrôle dit ce qu'il a lu. */
function fixtureAvecHorloge(horloge: { instant: number }) {
  const releve = composantDeStructure();
  const catalogue = catalogueDeStructure();
  const { variants } = releve;
  const { variables } = catalogue;
  Object.defineProperty(releve, 'variants', { get() { horloge.instant += 7; return variants; } });
  Object.defineProperty(catalogue, 'variables', { get() { horloge.instant += 11; return variables; } });
  return { releve, catalogue };
}

const epuiser = <T>(calcul: Generator<void, T>): T => {
  for (;;) {
    const suivant = calcul.next();
    if (suivant.done) return suivant.value;
  }
};

test('chaque contrôle du kit ouvre son étape et porte l’avance de son seul contrôle, la fusion la sienne ; la trace ne change aucune sortie', async () => {
  const dateNow = Date.now;
  const horloge = { instant: 100 };
  Date.now = () => horloge.instant;
  try {
    const avanceDeChaqueControle = (architectureUcm: boolean) => {
      const { releve, catalogue } = fixtureAvecHorloge(horloge);
      const controles: Array<[string, () => unknown]> = [
        ['nommage', () => controlerNommage(releve, catalogue)],
        ['mapping', () => controlerMapping(releve, catalogue)],
        ['couches', () => epuiser(controlerCouchesParEtapes(releve, catalogue))],
        ['oublis', () => epuiser(controlerOublisParEtapes(releve, catalogue))],
        ['accessibilite', () => epuiser(controlerLAccessibiliteParEtapes(releve, catalogue, { niveau: 'AA' }))],
        ['typographie', () => epuiser(controlerLaTypographieParEtapes(releve, catalogue))],
        ...(architectureUcm ? [['theme', () => controlerLeTheme(releve, catalogue)], ['structure', () => controlerLaStructure(releve, catalogue)]] as Array<[string, () => unknown]> : []),
      ];
      return controles.map(([nom, controler]) => {
        const avant = horloge.instant;
        controler();
        return [`controle-${nom}`, horloge.instant - avant] as const;
      });
    };
    const analyser = async (architecture: 'ucm' | 'libre', mesurer: boolean) => {
      reinitialiserLAnalyse();
      const { releve, catalogue } = fixtureAvecHorloge(horloge);
      const b = banc(architecture);
      const lectures: Lecteurs = { ...lecteurs(complete()), releve: async () => ({ statut: 'lu', releve }), catalogue: async () => catalogue };
      await traiterAvec(lectures)({ type: 'analyser', mesurer }, b.contexte);
      return deType(b, 'analyse')[0];
    };

    for (const architecture of ['ucm', 'libre'] as const) {
      const attendu = avanceDeChaqueControle(architecture === 'ucm');
      assert.deepEqual(attendu.map(([nom]) => nom), architecture === 'ucm'
        ? ['controle-nommage', 'controle-mapping', 'controle-couches', 'controle-oublis', 'controle-accessibilite', 'controle-typographie', 'controle-theme', 'controle-structure']
        : ['controle-nommage', 'controle-mapping', 'controle-couches', 'controle-oublis', 'controle-accessibilite', 'controle-typographie']);
      const sans = await analyser(architecture, false);
      const avec = await analyser(architecture, true);
      const etapes = avec.mesure!.etapes.filter(({ nom }) => nom.startsWith('controle-'));
      assert.deepEqual(etapes.map(({ nom }) => nom), [...attendu.map(([nom]) => nom), 'controle-fusion']);
      assert.deepEqual(etapes.slice(0, -1).map(({ nom, ms }) => [nom, ms]), attendu.map(([nom, ms]) => [nom, ms]));
      // La fusion lit `releve.variants` une fois, pour les identifiants de variants du moteur.
      assert.equal(etapes.at(-1)!.ms, 7);
      assert.ok(new Set(attendu.map(([, ms]) => ms)).size > 1 && attendu.some(([, ms]) => ms > 0), 'la fixture distingue les contrôles');
      assert.deepEqual(avec.mesure!.phases!.map(({ nom }) => nom), ['sujet', 'releve', 'catalogue', 'controles', 'moteur', 'regles', 'controles', 'corrections', 'projection', 'projection']);
      assert.deepEqual(avec.constats, sans.constats);
      assert.deepEqual(avec.lecture, sans.lecture);
      assert.deepEqual(avec.variants, sans.variants);
      assert.equal(avec.sansTokens, sans.sansTokens);
      const { releve, catalogue } = fixtureAvecHorloge(horloge);
      assert.equal(avec.mesure!.compteurs.variablesDuCatalogue, catalogue.variables.length);
      assert.equal(avec.mesure!.compteurs.tokensDuComposant, tokensDuComposant(releve, catalogue).length);
      assert.ok((avec.mesure!.compteurs.tokensDuComposant ?? 0) > 0);
    }
  } finally { Date.now = dateNow; }
});

test('msTokensDeTailleCatalogue vaut l’avance simulée de l’appel qui attend les tokens de taille de la library', async () => {
  const dateNow = Date.now;
  const horloge = { instant: 500 };
  Date.now = () => horloge.instant;
  try {
    const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };
    const jeu = { cle: 'alert-set', id: 'alert-set', nom: 'Alert' };
    let lecturesDuJeu = 0;
    const releve = {
      version: 1, proprietes: [],
      variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [{
        id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions,
        peintures: [], liaisons: [], valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }],
      }] }],
      lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    } as unknown as ReleveDeComposant;
    Object.defineProperty(releve, 'jeu', { get() { lecturesDuJeu += 1; horloge.instant += 5; return jeu; } });
    const bibliotheque = [{ key: 'cc', name: 'components', libraryName: 'Intencial', variables: [{ key: 'v-pad', name: 'alert/size/padding-left', resolvedType: 'FLOAT' }, { key: 'v-rayon', name: 'alert/size/radius', resolvedType: 'FLOAT' }] }];
    const teamLibrary = {
      async getAvailableLibraryVariableCollectionsAsync() { return bibliotheque.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
      async getVariablesInLibraryCollectionAsync() { return bibliotheque[0].variables; },
    };
    const marge = { ...variableFigma('VariableID:v-pad/1:3', 'comp', 'alert/size/padding-left', 'FLOAT', { 'comp:Valeur': 8 }, true), key: 'v-pad' };
    const { port } = portDeTest([], [], [], [collectionFigma('comp', 'components', ['Valeur'], [], true)], { importables: [marge] });
    const contexte = { figma: { teamLibrary, root: { getSharedPluginData: () => '' }, variables: port } as never } as unknown as Contexte;

    ouvrirLaMesure();
    await catalogueDeFigma(releve, { leve: false }, contexte);
    const trace = fermerLaMesure('');
    assert.ok(lecturesDuJeu > 0);
    assert.equal(trace?.compteurs.msTokensDeTailleCatalogue, 5 * lecturesDuJeu);
  } finally { Date.now = dateNow; abandonnerLaMesure(); }
});

test('un arrêt et une péremption ferment leur mesure', async () => {
  const arret = banc();
  await traiterAvec(lecteurs(async () => { throw new Error('refus'); }))({ type: 'analyser', mesurer: true }, arret.contexte);
  assert.equal(deType(arret, 'analyse')[0].mesure?.fin, 'arretee');
  assert.equal(fermerLaMesure(''), null);
  const annulation = banc();
  const lecturesAnnulees = lecteurs(complete());
  const relever = lecturesAnnulees.releve;
  lecturesAnnulees.releve = async (sujet, jeton, contexte) => {
    await traitement({ type: 'annuler-analyse', analyse: analyseCourante()! }, contexte);
    return relever(sujet, jeton, contexte);
  };
  const traitement = traiterAvec(lecturesAnnulees);
  await traitement({ type: 'analyser', mesurer: true }, annulation.contexte);
  assert.equal(deType(annulation, 'analyse')[0].mesure?.fin, 'annulee');
  assert.equal(fermerLaMesure(''), null);

  const b = banc();
  const lectures = lecteurs(async () => {
    surChangementDuDocument(['jeu-Alert'], b.contexte);
    return complete([pointDeTest])();
  });
  await traiterAvec(lectures)({ type: 'analyser', mesurer: true }, b.contexte);
  assert.equal(deType(b, 'analyse')[0].mesure?.fin, 'perimee');
  assert.equal(fermerLaMesure(''), null);
});

test('annuler par demande avant la résolution du sujet ferme une mesure annulée', async () => {
  const b = banc();
  let resoudre!: () => void;
  const attente = new Promise<void>((resolve) => { resoudre = resolve; });
  const lectures = lecteurs(complete());
  const sujet = lectures.sujet;
  lectures.sujet = async (contexte) => { await attente; return sujet(contexte); };
  const traiter = traiterAvec(lectures);
  const analyse = traiter({ type: 'analyser', demande: 44, mesurer: true }, b.contexte);
  await traiter({ type: 'annuler-analyse', demande: 43 }, b.contexte);
  await traiter({ type: 'annuler-analyse', demande: 44 }, b.contexte);
  resoudre();
  await analyse;
  const resultat = deType(b, 'analyse')[0];
  assert.equal(resultat.statut, 'annulee');
  assert.equal(resultat.mesure?.fin, 'annulee');
  assert.equal(fermerLaMesure(''), null);
});

test('les phases passent même au même pourcentage, la fraction ne recule pas et seule la fin vaut 100 %', async () => {
  const b = banc();
  const lectures = lecteurs(complete());
  lectures.releve = async (_sujet, _jeton, _contexte, progresser) => {
    progresser?.(1, 11);
    progresser?.(2, 11);
    return { statut: 'lu', releve: releveDe('Alert') };
  };
  lectures.moteur = async (_sujet, _jeton, _contexte, progresser) => {
    progresser?.('structure');
    progresser?.('imbriques');
    progresser?.('structure');
    return complete()();
  };
  await traiterAvec(lectures)({ type: 'analyser', demande: 9 }, b.contexte);
  const progres = deType(b, 'analyse-en-cours').map(({ progression }) => progression!);
  assert.ok(progres.some((p, i) => i > 0 && p.phase !== progres[i - 1].phase && p.fraction === progres[i - 1].fraction));
  assert.ok(progres.some((p) => p.fait === 2 && p.total === 11));
  assert.ok(progres.every((p, i) => p.fraction < 1 && (i === 0 || p.fraction >= progres[i - 1].fraction)));
  assert.ok(b.envoyes.every((m) => !('demande' in m) || m.demande === 9));
  assert.equal(deType(b, 'analyse')[0].progression?.fraction, 1);
});

/** Un relevé et un catalogue où le rayon 13 appelle une question C29 : deux tokens de rayon proches, le designer choisit. */
function lecteursAvecQuestion(): Lecteurs {
  const releve: ReleveDeComposant = {
    ...releveDe('Alert'),
    variants: [{
      id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, modesEffectifs: {},
      layers: [{
        id: 'root', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1,
        dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [],
        valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }],
      }],
    }],
  };
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
    variables: [
      { cle: 'r12', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 12 }, Dark: { valeur: 12 } } },
      { cle: 'r14', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 14 }, Dark: { valeur: 14 } } },
    ],
  };
  return { ...lecteurs(complete()), releve: async () => ({ statut: 'lu' as const, releve }), catalogue: async () => catalogue };
}

test('la session retient les sorties, les requêtes et le suivi du sujet, sans rien de l’état affiché', async () => {
  const b = banc();
  await traiterAvec(lecteursAvecQuestion())({ type: 'analyser', demande: 1 }, b.contexte);
  const entree = sessionDesAnalyses().entree('Alert');
  assert.ok(entree, 'une analyse complète retient son sujet');
  assert.deepEqual(Object.keys(entree).sort(), ['rang', 'requetes', 'sorties', 'suivi', 'sujet']);
  assert.deepEqual(Object.keys(entree.sorties).sort(), ['architectureUcm', 'catalogue', 'ignores', 'moteur', 'niveau', 'regles', 'releve']);
  assert.deepEqual(Object.keys(entree.requetes).sort(), ['controles', 'corrections', 'projection']);
  assert.deepEqual(Object.keys(entree.suivi).sort(), ['admis', 'couverture', 'curseur', 'noeuds', 'pages', 'parents']);
  assert.ok(!('pourLaPublication' in entree.sorties.moteur), 'les nœuds Figma du moteur ne sont pas retenus');
  assert.deepEqual(entree.requetes.projection.entrees, ['corrections', 'ignores']);
  assert.ok(entree.requetes.corrections.entrees.includes('moteur'));
  assert.ok(entree.requetes.projection.resultat.visibles.some(({ code }) => code === 'C29'));
});

test('une fin partielle ou annulée ne remplit pas la session', async () => {
  const partielle = banc();
  await traiterAvec(lecteurs(async () => ({ etat: 'calculee', interne: { ...exportDe(), couverture: { etat: 'partielle', lus: 1, nonLus: 2 } } as unknown as ResultatInterne })))({ type: 'analyser' }, partielle.contexte);
  assert.equal(deType(partielle, 'analyse')[0].statut, 'partielle');
  assert.deepEqual(sessionDesAnalyses().sujets(), []);
  const annulee = banc();
  await traiterAvec(lecteurs(async (jeton) => { (jeton as { leve: boolean }).leve = true; return { etat: 'annulee' }; }))({ type: 'analyser' }, annulee.contexte);
  assert.equal(deType(annulee, 'analyse')[0].statut, 'annulee');
  assert.deepEqual(sessionDesAnalyses().sujets(), []);
});

test('une analyse suivante du même sujet ne retrouve ni la correction fixée ni la réponse d’une génération antérieure', async () => {
  const premiere = banc();
  await traiterAvec(lecteursAvecQuestion())({ type: 'analyser', demande: 1 }, premiere.contexte);
  const ancienne = deType(premiere, 'analyse')[0];
  const constat = ancienne.constats.find(({ code }) => code === 'C29');
  assert.ok(constat?.question, 'le rayon 13 pose une question');
  await traiterLesQuestions({ type: 'repondre', analyse: ancienne.analyse, question: constat.id, reponse: 'r14' }, premiere.contexte);
  assert.equal(correctionsDeLAnalyse(ancienne.analyse)?.size, 1, 'la réponse fixe une correction sur la génération affichée');
  const entreeAvant = sessionDesAnalyses().entree('Alert');
  assert.ok(entreeAvant);
  assert.equal(entreeAvant.requetes.projection.resultat.visibles.find(({ code }) => code === 'C29')?.correction, undefined, 'la session ne garde pas la réponse');

  const seconde = banc();
  await traiterAvec(lecteursAvecQuestion())({ type: 'analyser', demande: 2 }, seconde.contexte);
  const recente = deType(seconde, 'analyse')[0];
  assert.notEqual(recente.analyse.generation, ancienne.analyse.generation);
  assert.equal(correctionsDeLAnalyse(ancienne.analyse), null, 'la génération antérieure n’est plus la courante');
  assert.equal(correctionsDeLAnalyse(recente.analyse)?.size, 0, 'aucune correction fixée ne revient');
  assert.equal(recente.constats.find(({ code }) => code === 'C29')?.correction, undefined);
  assert.ok(recente.constats.find(({ code }) => code === 'C29')?.question, 'la question redevient sans réponse');
  const entreeApres = sessionDesAnalyses().entree('Alert');
  assert.ok(entreeApres && entreeApres.rang > entreeAvant.rang, 'la session retient toujours le sujet, remplacé par la nouvelle génération');
  assert.deepEqual(sessionDesAnalyses().sujets(), ['Alert']);
});

/** Une première analyse complète retient l'entrée d'Alert ; la seconde, avec le moteur donné, est celle qu'on juge. */
async function secondeAnalyse(moteur: (jeton: { readonly leve: boolean }, b: Banc) => Promise<ResultatSansPublication>) {
  const premiere = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, premiere.contexte);
  const retenue = sessionDesAnalyses().entree('Alert');
  assert.ok(retenue, 'la première analyse complète est promue');
  const seconde = banc();
  await traiterAvec(lecteurs((jeton) => moteur(jeton, seconde)))({ type: 'analyser' }, seconde.contexte);
  return { retenue, seconde };
}

const entreeInchangee = (retenue: unknown): void => assert.equal(sessionDesAnalyses().entree('Alert'), retenue, 'l’entrée d’avant reste telle quelle');

test('une révision complète, valide et encore courante est promue et remplace l’entrée du sujet', async () => {
  const { retenue, seconde } = await secondeAnalyse(complete());
  assert.equal(deType(seconde, 'analyse')[0].statut, 'complete');
  const promue = sessionDesAnalyses().entree('Alert');
  assert.ok(promue && promue !== retenue && promue.rang > retenue.rang);
  assert.ok(promue.suivi.curseur >= retenue.suivi.curseur);
});

test('une fin annulée ne promeut rien', async () => {
  const { retenue, seconde } = await secondeAnalyse(async (jeton) => { (jeton as { leve: boolean }).leve = true; return { etat: 'annulee' }; });
  assert.equal(deType(seconde, 'analyse')[0].statut, 'annulee');
  entreeInchangee(retenue);
});

test('une fin arrêtée ne promeut rien', async () => {
  const { retenue, seconde } = await secondeAnalyse(async () => { throw new Error('le moteur lève'); });
  assert.equal(deType(seconde, 'analyse')[0].statut, 'arretee');
  entreeInchangee(retenue);
});

test('une fin partielle ne promeut rien', async () => {
  const { retenue, seconde } = await secondeAnalyse(async () => ({ etat: 'calculee', interne: { ...exportDe(), couverture: { etat: 'partielle', lus: 1, nonLus: 2 } } as unknown as ResultatInterne }));
  assert.equal(deType(seconde, 'analyse')[0].statut, 'partielle');
  entreeInchangee(retenue);
});

test('une analyse périmée pendant le calcul ne promeut rien', async () => {
  const { retenue, seconde } = await secondeAnalyse(async (_jeton, b) => {
    surChangementDuDocument(['v-Alert'], b.contexte);
    return complete()();
  });
  assert.equal(deType(seconde, 'perime').length, 1);
  assert.equal(deType(seconde, 'analyse')[0].statut, 'complete');
  entreeInchangee(retenue);
});

test('une génération rendue inapplicable à la cession, avant le résultat final, ne promeut rien', async () => {
  const { retenue, seconde } = await secondeAnalyse(async (_jeton, b) => {
    setTimeout(() => surChangementDuDocument(['v-Alert'], b.contexte), 0);
    return complete()();
  });
  assert.deepEqual(seconde.envoyes.map((m) => m.type).filter((type) => type === 'perime' || type === 'analyse'), ['perime', 'analyse']);
  entreeInchangee(retenue);
});

test('une écriture du plugin pendant le calcul ne promeut rien', async () => {
  const { retenue } = await secondeAnalyse(async (_jeton, b) => {
    perimerApresUneEcriture(b.contexte);
    return complete()();
  });
  entreeInchangee(retenue);
});

test('la révision d’un sujet finie après le passage à un autre sujet ne promeut rien', async () => {
  const { retenue } = await secondeAnalyse(async (_jeton, b) => {
    commencerUneAnalyse('Button', ['jeu-Button', 'v-Button'], b.contexte);
    return complete()();
  });
  entreeInchangee(retenue);
  assert.deepEqual(sessionDesAnalyses().sujets(), ['Alert']);
});
