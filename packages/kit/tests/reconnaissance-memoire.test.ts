/**
 * `formeReconnue` est mémorisée et `termeReconnu` lit un index par registre : mêmes sorties que le `find` d'avant, et la lecture
 * répétée des mêmes chaînes ne recalcule plus aucune forme.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { tokensDuComposant, type CatalogueDeReference, type ReleveDeComposant, type VariableDuCatalogue } from '../src/controles/index.js';
import { REGISTRES_ARCHITECTURE } from '../src/referentiel/architecture.js';
import { decouperSegment } from '../src/referentiel/ecriture-des-mots.js';
import { formeReconnue, reinitialiserLaReconnaissance, statistiquesDeReconnaissance, termeReconnu } from '../src/referentiel/reconnaissance.js';
import type { Registre, Terme } from '../src/referentiel/termes.js';
import { REGISTRES } from '../src/referentiel/vocabulaire.js';

/** L'ancienne implémentation, copiée : l'oracle de parité. */
const formeDeReference = (texte: string) => decouperSegment(texte).map((mot) => mot.toLowerCase()).join('-');
function termeReconnuDeReference(registre: Registre, segment: string): Terme | undefined {
  const forme = formeDeReference(segment);
  if (!forme) return undefined;
  return registre.termes.find((terme) => [terme.id, ...(terme.toleres ?? [])].some((ecrit) => formeDeReference(ecrit) === forme));
}

const REGISTRES_TOUS = [...REGISTRES, ...REGISTRES_ARCHITECTURE];

function entrees(): string[] {
  const ecritures = REGISTRES_TOUS.flatMap((registre) => registre.termes.flatMap((terme) => [terme.id, ...(terme.toleres ?? [])]));
  const variantes = ecritures.flatMap((ecrit) => [ecrit.toUpperCase(), ecrit.replace(/-/g, '_'), ecrit.replace(/-/g, ' '), ecrit.charAt(0).toUpperCase() + ecrit.slice(1)]);
  return [...ecritures, ...variantes, 'inconnu', 'zzz-hors-vocabulaire', 'Button', '-', '_', ' ', ''];
}

test('formeReconnue rend la forme d’avant, à froid puis à chaud', () => {
  const chaines = entrees();
  reinitialiserLaReconnaissance();
  const froid = chaines.map(formeReconnue);
  const chaud = chaines.map(formeReconnue);
  assert.deepEqual(froid, chaines.map(formeDeReference));
  assert.deepEqual(chaud, froid);
});

test('termeReconnu rend le terme que rendait le find, sur chaque registre', () => {
  const chaines = entrees();
  for (const registre of REGISTRES_TOUS) {
    for (const chaine of chaines) assert.equal(termeReconnu(registre, chaine), termeReconnuDeReference(registre, chaine), `${registre.id} : « ${chaine} »`);
  }
});

test('termeReconnu garde le premier terme du registre quand deux écritures ont la même forme', () => {
  const terme = (id: string, toleres: string[] = []): Terme => ({ id, libelle: { fr: id, en: id }, definition: { fr: id, en: id }, toleres });
  const registre = { id: 'essai', termes: [terme('alpha', ['Beta-Gamma']), terme('beta-gamma'), terme('delta', ['alpha'])] } as unknown as Registre;
  for (const chaine of ['alpha', 'ALPHA', 'beta_gamma', 'BetaGamma', 'delta', 'absent', '']) assert.equal(termeReconnu(registre, chaine), termeReconnuDeReference(registre, chaine), chaine);
  assert.equal(termeReconnu(registre, 'beta gamma')?.id, 'alpha');
});

test('l’index d’un registre se reconstruit quand son nombre de termes change', () => {
  const terme = (id: string): Terme => ({ id, libelle: { fr: id, en: id }, definition: { fr: id, en: id } });
  const termes = [terme('alpha')];
  const registre = { id: 'essai', termes } as unknown as Registre;
  assert.equal(termeReconnu(registre, 'beta'), undefined);
  termes.push(terme('beta'));
  assert.equal(termeReconnu(registre, 'beta')?.id, 'beta');
});

test('la mémoire de formeReconnue est vidée au plafond sans changer le résultat', () => {
  reinitialiserLaReconnaissance();
  for (let i = 0; i < 20_500; i++) formeReconnue(`mot${i}`);
  assert.equal(formeReconnue('Icon-Button'), formeDeReference('Icon-Button'));
  assert.equal(formeReconnue('mot3'), 'mot3');
});

function catalogueDe600(): { releve: ReleveDeComposant; catalogue: CatalogueDeReference } {
  const modes = [{ id: 'light', nom: 'Light' }];
  const familles = ['primary', 'secondary', 'tertiary', 'success', 'error', 'warning'];
  const styles = ['contained', 'outlined', 'text'];
  const etats = ['default', 'hover', 'focus', 'disabled'];
  const proprietes = ['background', 'border', 'foreground', 'icon', 'ring', 'outline', 'shadow', 'overlay', 'fill'];
  const variables: VariableDuCatalogue[] = [];
  for (const famille of familles) for (const style of styles) for (const etat of etats) for (const propriete of proprietes) {
    if (variables.length < 600) variables.push({ cle: `v${variables.length}`, nom: `Button/color/${famille}/${style}/${etat}/${propriete}`, collection: 'components', type: 'COLOR', etat: 'presente' });
  }
  const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes, etat: 'lue' }], variables };
  const axe = (nom: string, valeurs: string[]) => ({ nom, type: 'VARIANT' as const, valeurs, defaut: valeurs[0] });
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'Button', id: 'Button', nom: 'Button' },
    proprietes: [axe('Palette', familles), axe('Style', styles), axe('State', etats)],
    variants: [], lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  return { releve, catalogue };
}

test('la lecture de 600 tokens compte moins de calculs que d’appels, et une seconde lecture n’en ajoute aucun', () => {
  const { releve, catalogue } = catalogueDe600();
  reinitialiserLaReconnaissance();
  assert.equal(tokensDuComposant(releve, catalogue).length, 600);
  const premiere = statistiquesDeReconnaissance();
  assert.ok(premiere.calculs < premiere.appels, `${premiere.calculs} calculs pour ${premiere.appels} appels`);
  const { releve: autre, catalogue: autreCatalogue } = catalogueDe600();
  assert.equal(tokensDuComposant(autre, autreCatalogue).length, 600);
  const seconde = statistiquesDeReconnaissance();
  assert.equal(seconde.calculs, premiere.calculs);
  assert.ok(seconde.appels > premiere.appels);
});
