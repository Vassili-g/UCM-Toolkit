/**
 * La mémoire de champs d'une demande (16.12) : le relevé, les dépendances et le moteur lisent `name`, `fills`, `strokes`,
 * `boundVariables` et les autres champs d'un même calque une seule fois, la sortie reste celle qu'ils rendaient chacun
 * avec leurs lectures directes, et la demande suivante relit tout.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { lectureNative } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import type { InventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import type { PluginMessage } from '../src/messages';
import { LECTEURS_DE_FIGMA, dependancesDeFigma, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { fabriquerLeMonde, type NoeudFabrique } from './outils/mondeFabrique';

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
});

const globale = globalThis as { figma?: unknown };

/** Les champs que la case 16.12 fait passer par la mémoire de la demande, et que le relevé, les dépendances ou le moteur lisent. */
const CHAMPS_SUIVIS = ['name', 'fills', 'strokes', 'boundVariables', 'visible', 'children', 'parent', 'strokeWeight', 'componentPropertyReferences', 'textStyleId', 'type'] as const;

/** Le monde fabriqué dont chaque lecture d'un champ suivi sur un calque se compte, par calque et champ. */
function monterLeMondeCompte() {
  const monde = fabriquerLeMonde();
  const lectures = new Map<string, number>();
  const suivre = (calque: NoeudFabrique): void => {
    for (const champ of CHAMPS_SUIVIS) {
      const descripteur = Object.getOwnPropertyDescriptor(calque, champ);
      if (!descripteur) continue;
      const lire = descripteur.get ? () => descripteur.get!.call(calque) : () => descripteur.value;
      Object.defineProperty(calque, champ, {
        enumerable: true,
        configurable: true,
        get() {
          const cle = `${calque.id}.${champ}`;
          lectures.set(cle, (lectures.get(cle) ?? 0) + 1);
          return lire();
        },
        ...(descripteur.set ? { set: descripteur.set } : { set(valeur: unknown) { Object.defineProperty(calque, champ, { value: valeur, writable: true, enumerable: true, configurable: true }); } }),
      });
    }
  };
  const visites = new Set<NoeudFabrique>();
  const parcourir = (calque: NoeudFabrique): void => {
    if (visites.has(calque)) return;
    visites.add(calque);
    suivre(calque);
    for (const enfant of calque.children ?? []) parcourir(enfant);
  };
  parcourir(monde.jeu);
  return { monde, lectures };
}

/** Les mêmes lectures, sans la mémoire de champs de la demande : chaque lecteur lit le calque lui-même, comme avant 16.12. */
const LECTEURS_SANS_MEMOIRE_DE_CHAMPS: Lecteurs = (() => {
  const sans = (inventaires?: InventairesDeLaDemande): InventairesDeLaDemande | undefined => (inventaires ? { ...inventaires, champs: lectureNative } : inventaires);
  return {
    ...LECTEURS_DE_FIGMA,
    releve: (sujet, jeton, contexte, progresser, cooperation, inventaires) => LECTEURS_DE_FIGMA.releve(sujet, jeton, contexte, progresser, cooperation, sans(inventaires)),
    dependances: (sujet, contexte, inventaires, cooperation) => LECTEURS_DE_FIGMA.dependances!(sujet, contexte, sans(inventaires), cooperation),
    moteur: (sujet, jeton, contexte, progresser, cooperation, inventaires) => LECTEURS_DE_FIGMA.moteur(sujet, jeton, contexte, progresser, cooperation, sans(inventaires)),
  };
})();

/** Une analyse sur le monde compté ; `demandes` en enchaîne plusieurs (la première complète, les suivantes par Actualiser). */
async function analyser(lecteurs: Lecteurs, demandes = 1) {
  const { monde, lectures } = monterLeMondeCompte();
  const precedent = globale.figma;
  globale.figma = monde.figma;
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: monde.figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => [] };
  const parDemande: Array<Record<string, number>> = [];
  try {
    for (let demande = 1; demande <= demandes; demande += 1) {
      lectures.clear();
      await traiterAvec(lecteurs)({ type: 'analyser', demande, ...(demande > 1 ? { intention: 'actualiser' as const } : {}) }, contexte);
      parDemande.push(Object.fromEntries(lectures));
    }
  } finally {
    globale.figma = precedent;
  }
  const finale = envoyes.filter((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse').at(-1)!;
  return { parDemande, sortie: JSON.stringify({ statut: finale.statut, constats: finale.constats, lecture: finale.lecture, variants: finale.variants, sansTokens: finale.sansTokens }) };
}

/** Des lectures que le relevé, les dépendances et le moteur font chacun, et que la mémoire réduit à une. */
const PARTAGEES = ['repos.boundVariables', 'repos.fills', 'repos.strokes', 'repos.strokeWeight', 'survol.boundVariables', 'inactif.boundVariables', 'texte.fills', 'texte.textStyleId', 'texte-survol.textStyleId', 'instance.componentPropertyReferences', 'instance.visible'] as const;

test('une demande lit les champs d’un calque une fois pour le relevé, les dépendances et le moteur, et rend la sortie d’avant', async () => {
  const avant = await analyser(LECTEURS_SANS_MEMOIRE_DE_CHAMPS);
  const apres = await analyser(LECTEURS_DE_FIGMA);
  for (const cle of PARTAGEES) assert.equal(apres.parDemande[0][cle], 1, `${cle} est lu une fois pour toute la demande`);
  const relus = PARTAGEES.filter((cle) => avant.parDemande[0][cle] > 1);
  assert.ok(relus.length >= 4, `sans la mémoire de la demande, chaque lecteur relit le calque (${relus.join(', ')})`);
  for (const cle of Object.keys(apres.parDemande[0])) assert.ok(apres.parDemande[0][cle] <= (avant.parDemande[0][cle] ?? 0), `${cle} ne se lit jamais plus qu’avant`);
  assert.equal(apres.sortie, avant.sortie);
  assert.ok(JSON.parse(apres.sortie).constats.length > 0);
});

test('la demande suivante relit tout : la mémoire de champs meurt avec sa demande', async () => {
  const { parDemande } = await analyser(LECTEURS_DE_FIGMA, 2);
  assert.deepEqual(parDemande[1], parDemande[0]);
  for (const cle of PARTAGEES) assert.equal(parDemande[1][cle], 1, `${cle} est relu une fois par la demande suivante`);
});

test('les dépendances lues avec les inventaires d’une demande partagent leurs champs avec une seconde lecture de la même demande', async () => {
  const { monde, lectures } = monterLeMondeCompte();
  const precedent = globale.figma;
  globale.figma = monde.figma;
  try {
    const contexte = { figma: monde.figma as unknown as PluginAPI, envoyer() {}, surveillerLeDocument: () => [] } as Contexte;
    const sujet = await LECTEURS_DE_FIGMA.sujet(contexte);
    assert.ok(sujet);
    const { creerInventairesDeLaDemande } = await import('ucm-plugin-socle/src/composant/analyse/inventaires');
    const inventaires = creerInventairesDeLaDemande();
    const premieres = await dependancesDeFigma(sujet, contexte, inventaires);
    const memorises = (compte: ReadonlyMap<string, number>) => [...compte].filter(([cle]) => !/\.(children|parent|type)$/.test(cle));
    const apresLaPremiere = memorises(lectures);
    assert.ok(apresLaPremiere.length > 0);
    const secondes = await dependancesDeFigma(sujet, contexte, inventaires);
    assert.deepEqual(secondes, premieres);
    assert.deepEqual(memorises(lectures), apresLaPremiere, 'la seconde lecture ne relit aucun champ de la mémoire : tout vient de la demande');
    lectures.clear();
    const autre = await dependancesDeFigma(sujet, contexte, creerInventairesDeLaDemande());
    assert.deepEqual(autre, premieres);
    assert.ok(memorises(lectures).length > 0, 'une autre demande relit les champs');
  } finally {
    globale.figma = precedent;
  }
});
