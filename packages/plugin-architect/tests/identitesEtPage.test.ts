/** Identités des constats du moteur, page du sujet analysé, sélection d'un nœud imbriqué. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { etatInitial } from '../src/ui/etat';
import type { Constat } from '../src/messages/commun';
import { calculEnCours, recevoirUneAnalyse, noterLaDemandeDAnalyse, acquitterLeRenduDeLAnalyse, demandeDAnalyseEnCours } from '../src/ui/composant/analyse';
import { TEXTES_COMPOSANT, dureeLisible } from '../src/ui/textes/composant';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { constatsDuMoteur } from '../src/constatsDuMoteur';
import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, pageDuNoeud, reinitialiserLAnalyse, surSelection } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';

const point = (titre: string): PointACorriger => ({ famille: 'variables', titre, impact: 'Impact.', action: 'Action.' });

function moteurDans(points: readonly PointACorriger[]) {
  const phrases = points.map(phraseDe);
  return { warnings: phrases, parties: new Map(points.map((p, i) => [phrases[i], p])), localisations: new Map<string, string[]>() };
}

const idsParTitre = (points: readonly PointACorriger[]) => new Map(constatsDuMoteur(moteurDans(points)).map((c) => [c.faits.titre, c.id]));

beforeEach(() => reinitialiserLAnalyse());

test('défaut 6 : l’identifiant d’un point du moteur ne dépend pas de son rang', () => {
  const a = point('Layer « A » : son fill n’est relié à aucune variable.');
  const b = point('Layer « B » : son fill n’est relié à aucune variable.');
  const avant = idsParTitre([a, b]);
  const apres = idsParTitre([b, a]);
  assert.equal(avant.get(a.titre), apres.get(a.titre));
  assert.equal(avant.get(b.titre), apres.get(b.titre));
  assert.notEqual(avant.get(a.titre), avant.get(b.titre));
});

test('défaut 6 : deux points de même contenu reçoivent un suffixe dans l’ordre', () => {
  const moteur = moteurDans([point('Layer « A » : x.')]);
  const phrase = moteur.warnings[0];
  const double = { ...moteur, warnings: [phrase, `${phrase} `], parties: new Map([[phrase, point('Layer « A » : x.')], [`${phrase} `, point('Layer « A » : x.')]]) };
  const ids = constatsDuMoteur(double).map((c) => c.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(ids[1], `${ids[0]}:2`);
});

test('défaut 7 : la page du sujet est trouvée en remontant parent, sinon le repli', () => {
  const page = { type: 'PAGE', id: 'p' };
  const jeu = { type: 'COMPONENT_SET', parent: { type: 'FRAME', parent: page } };
  assert.equal(pageDuNoeud(jeu, 'courante'), page);
  assert.equal(pageDuNoeud({ type: 'COMPONENT_SET', parent: null }, 'courante'), 'courante');
});

test('défaut 9 : sélectionner un nœud imbriqué périme l’analyse, un variant non', () => {
  const envoyes: PluginMessage[] = [];
  const contexte = { figma: {}, envoyer: (m: PluginMessage) => envoyes.push(m), surveillerLeDocument() {} } as unknown as Contexte;
  commencerUneAnalyse('cle', ['jeu', 'variant', 'imbrique'], contexte, ['jeu', 'variant']);
  surSelection('variant', 'figma', contexte);
  assert.equal(envoyes.filter((m) => m.type === 'perime').length, 0);
  surSelection('imbrique', 'figma', contexte);
  assert.equal(envoyes.filter((m) => m.type === 'perime').length, 1);
});

test('une ancienne demande ou génération ne remplace pas l’analyse retenue ; un progrès tardif est ignoré', () => {
  const etat = etatInitial();
  noterLaDemandeDAnalyse(etat, 2, false, 0);
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', demande: 2, analyse: { sujet: 'Alert', generation: 2 } });
  const retenue = etat.analyse;
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', demande: 1, analyse: { sujet: 'Button', generation: 3 } });
  assert.equal(etat.analyse, retenue);
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: { sujet: 'Button', generation: 1 } });
  assert.equal(etat.analyse, retenue);
  recevoirUneAnalyse(etat, { type: 'perime', analyse: retenue!.identite, cause: 'document' });
  recevoirUneAnalyse(etat, { type: 'analyse-en-cours', analyse: retenue!.identite, variantsLus: 7, variantsTotal: 8 });
  assert.equal(etat.analyse?.progression, null);
  assert.equal(demandeDAnalyseEnCours(etat), 2);
  recevoirUneAnalyse(etat, { type: 'occupe', analyse: retenue!.identite, demande: 2 });
  assert.equal(demandeDAnalyseEnCours(etat), null);
});

test('le provisoire s’ajoute à l’analyse en cours sans valoir résultat final ; double envoi et provisoire tardif sont refusés', () => {
  const etat = etatInitial();
  const identite = { sujet: 'Button', generation: 5 };
  const constat = (id: string) => ({ id, code: 'C1', type: 'corriger' as const, faits: {}, portee: [] }) as unknown as Constat;
  const provisoire = (constats: readonly Constat[], ignores: readonly string[] = [], demande?: number) => ({
    type: 'analyse-provisoire' as const, analyse: identite, constats, ignores, lecture: null as never, variants: [{ id: 'v1', nom: 'v1' }], ...(demande === undefined ? {} : { demande }),
  });
  noterLaDemandeDAnalyse(etat, 5, false, 0);
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', demande: 5, analyse: identite });
  recevoirUneAnalyse(etat, provisoire([constat('a'), constat('b')], ['b'], 5));
  assert.equal(etat.analyse?.statut, 'provisoire');
  assert.deepEqual(etat.analyse?.tous.map(({ id }) => id), ['a', 'b']);
  assert.deepEqual(etat.analyse?.constats.map(({ id }) => id), ['a'], 'les ignorés du provisoire restent hors des constats visibles');
  assert.equal(demandeDAnalyseEnCours(etat), 5, 'la demande reste en cours : le provisoire ne la termine pas');
  assert.equal(calculEnCours(etat.analyse!), true);
  // Un progrès continue de s'enregistrer ; un second provisoire de la même analyse ne remplace pas le premier.
  recevoirUneAnalyse(etat, { type: 'analyse-en-cours', analyse: identite, variantsLus: 3, variantsTotal: 9 });
  assert.equal(etat.analyse?.progression?.lus, 3);
  const premier = etat.analyse;
  recevoirUneAnalyse(etat, provisoire([constat('c')], [], 5));
  assert.equal(etat.analyse, premier);
  // Le provisoire d'une demande plus ancienne est refusé.
  recevoirUneAnalyse(etat, provisoire([constat('d')], [], 4));
  assert.equal(etat.analyse, premier);
  // Le final remplace le provisoire, garde ses ignorés et termine la demande.
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: identite, statut: 'partielle', constats: [constat('a'), constat('b')], lecture: null, variants: [{ id: 'v1', nom: 'v1' }], sansTokens: false, demande: 5 });
  assert.equal(etat.analyse?.statut, 'partielle', 'partielle reste un statut final distinct de provisoire');
  assert.equal(calculEnCours(etat.analyse!), false);
  assert.deepEqual(etat.analyse?.constats.map(({ id }) => id), ['a']);
  assert.equal(demandeDAnalyseEnCours(etat), null);
  // Un provisoire tardif, après le final de la même identité, ne rouvre rien.
  const final = etat.analyse;
  recevoirUneAnalyse(etat, provisoire([constat('e')], [], 5));
  assert.equal(etat.analyse, final);
  // Une identité plus ancienne est refusée, une génération plus récente ouvre sa propre analyse provisoire.
  recevoirUneAnalyse(etat, { ...provisoire([constat('f')]), analyse: { sujet: 'Button', generation: 4 } });
  assert.equal(etat.analyse, final);
  recevoirUneAnalyse(etat, { ...provisoire([constat('g')], ['g']), analyse: { sujet: 'Button', generation: 6 } });
  assert.equal(etat.analyse?.identite.generation, 6);
  assert.equal(etat.analyse?.statut, 'provisoire');
  assert.equal(etat.analyse?.perimee, false);
  assert.deepEqual(etat.analyse?.constats, []);
  // Une analyse périmée ne reçoit plus de provisoire.
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: { sujet: 'Button', generation: 7 } });
  recevoirUneAnalyse(etat, { type: 'perime', analyse: { sujet: 'Button', generation: 7 }, cause: 'document' });
  const perimee = etat.analyse;
  recevoirUneAnalyse(etat, { ...provisoire([constat('h')]), analyse: { sujet: 'Button', generation: 7 } });
  assert.equal(etat.analyse, perimee);
});

test('le résultat final retient la durée depuis le clic de sa demande, et le résumé l’affiche', () => {
  const etat = etatInitial();
  const final = (demande?: number) => ({ type: 'analyse' as const, analyse: { sujet: 'Button', generation: 4 }, statut: 'complete' as const, constats: [], lecture: null, variants: [], sansTokens: false, ...(demande === undefined ? {} : { demande }) });
  noterLaDemandeDAnalyse(etat, 4, false, performance.now() - 142_000);
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', demande: 4, analyse: { sujet: 'Button', generation: 4 } });
  recevoirUneAnalyse(etat, final(4));
  const duree = etat.analyse?.dureeMs ?? 0;
  assert.ok(duree >= 142_000 && duree < 143_000);
  assert.equal(TEXTES_COMPOSANT.panneau.analyseA('10:19', duree), 'analysé à 10:19 en 2 min 22 s');
  const sansClic = etatInitial();
  recevoirUneAnalyse(sansClic, final());
  assert.equal(sansClic.analyse?.dureeMs, undefined);
  assert.equal(TEXTES_COMPOSANT.panneau.analyseA('10:19', undefined), 'analysé à 10:19');
  assert.deepEqual([400, 42_400, 180_000].map(dureeLisible), ['moins d’une seconde', '42 s', '3 min']);
});

test('les premiers constats s’acquittent au provisoire, et le final ne les acquitte pas une seconde fois', () => {
  const etat = etatInitial();
  noterLaDemandeDAnalyse(etat, 9, true, 0);
  const analyse = { sujet: 'Button', generation: 3 };
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', demande: 9, mesure: true, analyse });
  const constat = { id: 'C8:a', code: 'C8', famille: 'nommage', type: 'erreur', message: 'x' } as unknown as Constat;
  const provisoire = { type: 'analyse-provisoire' as const, demande: 9, analyse, constats: [constat], ignores: [], lecture: null, variants: [] };
  recevoirUneAnalyse(etat, provisoire);
  let instant = 9_500;
  const envoyes: Array<{ rendu: string; depuisClicMs: number }> = [];
  const frames: Array<() => void> = [];
  const acquitter = (message: Parameters<typeof acquitterLeRenduDeLAnalyse>[1]) => acquitterLeRenduDeLAnalyse(etat, message, (m) => envoyes.push(m), (rendre) => frames.push(rendre), () => instant);
  acquitter(provisoire);
  frames.splice(0).forEach((rendre) => rendre());
  const final = { type: 'analyse' as const, demande: 9, analyse, statut: 'complete' as const, constats: [constat], lecture: null, variants: [], sansTokens: false };
  recevoirUneAnalyse(etat, final);
  instant = 24_000;
  acquitter(final);
  frames.splice(0).forEach((rendre) => rendre());
  assert.deepEqual(envoyes.map(({ rendu, depuisClicMs }) => [rendu, depuisClicMs]), [['premiers-constats', 9_500], ['resultat-final', 24_000]]);
});

test('les acquittements corrèlent demande et identité avec une seule horloge locale ; un rendu remplacé se tait', () => {
  const etat = etatInitial();
  noterLaDemandeDAnalyse(etat, 7, true, 1000);
  const message = { type: 'analyse-commencee' as const, demande: 7, mesure: true as const, analyse: { sujet: 'Alert', generation: 2 } };
  recevoirUneAnalyse(etat, message);
  let instant = 1010;
  const frames: Array<() => void> = [];
  const envoyes: unknown[] = [];
  acquitterLeRenduDeLAnalyse(etat, message, (m) => envoyes.push(m), (rendre) => frames.push(rendre), () => instant);
  acquitterLeRenduDeLAnalyse(etat, message, (m) => envoyes.push(m), (rendre) => frames.push(rendre), () => instant);
  assert.equal(frames.length, 1);
  instant = 1034;
  frames.shift()!();
  assert.deepEqual(envoyes, [{ type: 'analyse-rendue', demande: 7, analyse: message.analyse, rendu: 'premier-affichage', depuisClicMs: 34, receptionAuRenduMs: 24 }]);
  const final = { type: 'analyse' as const, demande: 7, analyse: message.analyse, statut: 'complete' as const, constats: [], lecture: null, variants: [], sansTokens: false };
  recevoirUneAnalyse(etat, final);
  acquitterLeRenduDeLAnalyse(etat, final, (m) => envoyes.push(m), (rendre) => frames.push(rendre), () => instant);
  noterLaDemandeDAnalyse(etat, 8, true, 1040);
  frames.shift()!();
  assert.equal(envoyes.length, 1);
});
