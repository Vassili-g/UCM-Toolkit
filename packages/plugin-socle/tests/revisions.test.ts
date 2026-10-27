/** La révision de travail : la session ne change qu'à la promotion. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ouvrirUneRevision } from '../src/composant/analyse/revisions';
import { creerLaSession, type RequeteRetenue } from '../src/composant/analyse/session';

type Sorties = { readonly releve: string };
type Requetes = { readonly projection: RequeteRetenue<readonly string[]> };

const contenu = (releve: string) => ({
  sorties: { releve },
  requetes: { projection: { resultat: [releve], entrees: ['releve'] } },
  suivi: { curseur: 0, noeuds: new Set<string>(), admis: new Set<string>(), parents: new Map<string, string>(), pages: new Set<string>(), couverture: { instances: 'descendues', complete: true, trous: [] } as const },
});

test('préparer ne touche pas la session ; promouvoir valide la range', () => {
  const session = creerLaSession<Sorties, Requetes>();
  const revision = ouvrirUneRevision(session, 'A');
  revision.preparer(contenu('un'));
  assert.equal(session.entree('A'), null);
  assert.equal(revision.etat, 'ouverte');
  const entree = revision.promouvoir(true);
  assert.equal(session.entree('A'), entree);
  assert.equal(revision.etat, 'promue');
});

test('une promotion invalide jette la révision et laisse l’entrée d’avant', () => {
  const session = creerLaSession<Sorties, Requetes>();
  const avant = session.retenir('A', contenu('avant'));
  const revision = ouvrirUneRevision(session, 'A');
  revision.preparer(contenu('apres'));
  assert.equal(revision.promouvoir(false), null);
  assert.equal(session.entree('A'), avant);
  assert.equal(revision.etat, 'jetee');
});

test('sans contenu préparé, rien n’est promu ; une révision close ne se promeut plus', () => {
  const session = creerLaSession<Sorties, Requetes>();
  const vide = ouvrirUneRevision(session, 'A');
  assert.equal(vide.promouvoir(true), null);
  assert.equal(session.entree('A'), null);
  const jetee = ouvrirUneRevision(session, 'B');
  jetee.preparer(contenu('b'));
  jetee.jeter();
  jetee.preparer(contenu('b2'));
  assert.equal(jetee.promouvoir(true), null);
  assert.equal(session.entree('B'), null);
  const promue = ouvrirUneRevision(session, 'C');
  promue.preparer(contenu('c'));
  const entree = promue.promouvoir(true);
  promue.jeter();
  assert.equal(promue.promouvoir(true), null);
  assert.equal(session.entree('C'), entree);
});
