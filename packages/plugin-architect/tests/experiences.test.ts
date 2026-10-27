/**
 * Le build d'expériences : muet sans son drapeau, et chaque expérience rend son objet JSON sur des doubles.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPELS_DE_E3, DELAIS_DE_E6_S, EN_VOL_DE_E1, GESTES_DE_E4, REPETITIONS_DE_E1, SERIES_DE_E6,
  creerLesExperiences, variablesDeLaSelection, type EvenementDExperience, type PortDExperiences, type VariableDExperience,
} from '../src/sandbox/experiences';
import { installerLesExperiences } from '../src/ui/experiences';

function creerLePort(surcharge: Partial<PortDExperiences> = {}) {
  let instant = 0;
  const sorties: Record<string, unknown>[] = [];
  const signaux: string[] = [];
  const ecoutes = new Set<(evenement: EvenementDExperience) => void>();
  const enVol = { courant: 0, max: 0 };
  const port: PortDExperiences = {
    actif: true,
    maintenant: () => instant,
    attendre: async (ms) => { instant += ms; },
    sortie: (objet) => { sorties.push(objet); },
    variablesDeLaSelection: async () => [{ id: 'V:1', key: 'k1' }, { id: 'V:2', key: 'k2' }, { id: 'V:3', key: 'k3' }],
    getVariableByIdAsync: async (id) => { instant += 1; return { id, key: `k${id.slice(2)}`, valuesByMode: { a: 1 } }; },
    importerParCle: async (cle) => {
      enVol.courant += 1;
      enVol.max = Math.max(enVol.max, enVol.courant);
      await Promise.resolve();
      instant += 2;
      enVol.courant -= 1;
      return { id: `V:${cle.slice(1)}`, key: cle, valuesByMode: { a: 1 } };
    },
    lireLesLibraries: async () => { instant += 3; return [{}, {}]; },
    page: { on: (_type, rappel) => { ecoutes.add(rappel); }, off: (_type, rappel) => { ecoutes.delete(rappel); } },
    signaler: (etat) => { signaux.push(etat); },
    ...surcharge,
  };
  return { port, sorties, signaux, ecoutes, enVol, avancer: (ms: number) => { instant += ms; } };
}

const jouer = async (experiences: ReturnType<typeof creerLesExperiences>, code: string): Promise<void> => {
  assert.equal(experiences.traiter({ type: 'experience', code }), true);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

test('sans le drapeau, ni le sandbox ni l\'interface ne font ni n\'envoient rien', () => {
  const { port, sorties, signaux } = creerLePort({ actif: false });
  const experiences = creerLesExperiences(port);
  assert.equal(experiences.traiter({ type: 'experience', code: 'E1' }), false);
  assert.equal(experiences.traiter({ type: 'experience-tic' }), false);
  assert.deepEqual([sorties, signaux], [[], []]);

  const globale: Record<string, unknown> = {};
  const envoyes: unknown[] = [];
  const interface_ = installerLesExperiences({ actif: false, envoyer: (message) => envoyes.push(message), globale });
  assert.equal(interface_.recevoir({ type: 'experience-signal', etat: 'debut' }), false);
  assert.equal('ucmExperience' in globale, false);
  assert.deepEqual(envoyes, []);
});

test('E1 importe les clés avec 1, 4, 8, 16 et 32 en vol, trois fois chacun', async () => {
  const { port, sorties, enVol } = creerLePort();
  await jouer(creerLesExperiences(port), 'E1');
  const sortie = sorties[0] as { experience: string; cles: number; essais: { enVol: number; repetition: number; erreurs: number }[] };
  assert.equal(sortie.experience, 'E1');
  assert.equal(sortie.cles, 3);
  assert.equal(sortie.essais.length, EN_VOL_DE_E1.length * REPETITIONS_DE_E1);
  assert.deepEqual(sortie.essais.slice(0, 4).map((essai) => [essai.enVol, essai.repetition]), [[1, 1], [1, 2], [1, 3], [4, 1]]);
  assert.equal(enVol.max, 3);
});

test('E2 compare identifiant, valuesByMode et durées entre la lecture par identifiant et l\'import', async () => {
  const { port, sorties } = creerLePort({
    importerParCle: async (cle) => ({ id: `V:${cle.slice(1)}`, key: cle, valuesByMode: cle === 'k2' ? { a: 2 } : { a: 1 } }),
  });
  await jouer(creerLesExperiences(port), 'E2');
  const sortie = sorties[0] as { identiques: number; ecarts: { key: string; memesValeurs: boolean }[]; durees: unknown[] };
  assert.equal(sortie.identiques, 2);
  assert.deepEqual(sortie.ecarts.map((ecart) => [ecart.key, ecart.memesValeurs]), [['k2', false]]);
  assert.equal(sortie.durees.length, 3);
});

test('E3 note les tics reçus après son départ, pas ceux d\'avant', async () => {
  let jouees!: ReturnType<typeof creerLesExperiences>;
  const { port, sorties, signaux } = creerLePort({
    getVariableByIdAsync: async (id) => { jouees.traiter({ type: 'experience-tic' }); return { id, key: 'k', valuesByMode: {} }; },
  });
  jouees = creerLesExperiences(port);
  jouees.traiter({ type: 'experience-tic' });
  await jouer(jouees, 'E3');
  assert.deepEqual(signaux, ['debut', 'fin']);
  assert.equal((sorties[0] as { messagesRecus: number }).messagesRecus, APPELS_DE_E3);
});

test('E4 liste ses gestes, journalise type et propriétés reçues, puis rend le journal à E4-fin', async () => {
  const { port, sorties, ecoutes } = creerLePort();
  const experiences = creerLesExperiences(port);
  await jouer(experiences, 'E4');
  assert.deepEqual((sorties[0] as { gestes: unknown }).gestes, GESTES_DE_E4);
  assert.equal(ecoutes.size, 1);
  const rappel = [...ecoutes][0];
  rappel({ nodeChanges: [{ id: '1:2', type: 'PROPERTY_CHANGE', node: { type: 'FRAME', name: 'Button' }, properties: ['boundVariables'] }] });
  await jouer(experiences, 'E4-fin');
  assert.equal(ecoutes.size, 0);
  const fin = sorties.at(-1) as { evenements: { proprietes: string[]; type: string }[] };
  assert.deepEqual(fin.evenements.map((ligne) => [ligne.type, ligne.proprietes]), [['PROPERTY_CHANGE', ['boundVariables']]]);
});

test('E5 écoute de la même façon, et deux écoutes ne se chevauchent pas', async () => {
  const { port, sorties, ecoutes } = creerLePort();
  const experiences = creerLesExperiences(port);
  await jouer(experiences, 'E5');
  await jouer(experiences, 'E4');
  assert.equal(ecoutes.size, 1);
  assert.match(String((sorties.at(-1) as { erreur: string }).erreur), /E5-fin/);
  await jouer(experiences, 'E5-fin');
  assert.equal(ecoutes.size, 0);
});

test('E6 relit les libraries à 0, 5, 10, 20, 30 et 60 s, trois séries, avec la durée de chaque relecture', async () => {
  const { port, sorties } = creerLePort();
  await jouer(creerLesExperiences(port), 'E6');
  const sortie = sorties[0] as { series: { delaiS: number; ms: number; libraries: number }[][] };
  assert.equal(sortie.series.length, SERIES_DE_E6);
  assert.deepEqual(sortie.series[0].map((ligne) => ligne.delaiS), [...DELAIS_DE_E6_S]);
  assert.ok(sortie.series.flat().every((ligne) => ligne.ms === 3 && ligne.libraries === 2));
});

test('un code inconnu et une erreur sortent en objet JSON', async () => {
  const { port, sorties } = creerLePort({ lireLesLibraries: async () => { throw new Error('refus'); } });
  const experiences = creerLesExperiences(port);
  await jouer(experiences, 'E9');
  await jouer(experiences, 'E6');
  assert.match(String((sorties[0] as { erreur: string }).erreur), /inconnue/);
  assert.equal((sorties[1] as { erreur: string }).erreur, 'refus');
});

test('la collecte suit les liaisons de la sélection et de ses descendants, puis les alias', async () => {
  const monde: Record<string, VariableDExperience> = {
    'V:1': { id: 'V:1', key: 'k1', valuesByMode: { m: { type: 'VARIABLE_ALIAS', id: 'V:3' } } },
    'V:2': { id: 'V:2', key: 'k2', valuesByMode: { m: 4 } },
    'V:3': { id: 'V:3', key: 'k3', valuesByMode: { m: 8 } },
  };
  const enfant = { boundVariables: { paddingLeft: { type: 'VARIABLE_ALIAS', id: 'V:2' } }, fills: [{ boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'V:1' } } }] };
  const racine = { boundVariables: {}, findAll: () => [enfant] };
  const lues = await variablesDeLaSelection([racine], async (id) => monde[id] ?? null);
  assert.deepEqual(lues.map((variable) => variable.key).sort(), ['k1', 'k2', 'k3']);
});

test('l\'interface pose ucmExperience et envoie un tic toutes les 16 ms entre le début et la fin signalés', () => {
  const globale: Record<string, unknown> = {};
  const envoyes: unknown[] = [];
  let rappel: (() => void) | null = null;
  const periodes: number[] = [];
  let arrete = false;
  const interface_ = installerLesExperiences({
    actif: true,
    envoyer: (message) => envoyes.push(message),
    globale,
    setInterval: (appel, ms) => { rappel = appel; periodes.push(ms); return 7; },
    clearInterval: (id) => { assert.equal(id, 7); arrete = true; },
  });
  (globale.ucmExperience as (code: string) => void)('E1');
  assert.deepEqual(envoyes, [{ type: 'experience', code: 'E1' }]);
  assert.equal(interface_.recevoir({ type: 'experience-signal', etat: 'debut' }), true);
  rappel!();
  assert.deepEqual(envoyes.at(-1), { type: 'experience-tic' });
  assert.deepEqual(periodes, [16]);
  interface_.recevoir({ type: 'experience-signal', etat: 'fin' });
  assert.equal(arrete, true);
  assert.equal(interface_.recevoir({ type: 'autre' }), false);
});
