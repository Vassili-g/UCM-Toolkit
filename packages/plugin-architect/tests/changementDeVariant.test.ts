/**
 * La vue Composant au changement de variant du même jeu, montée sur un DOM réduit : l'ancienne lecture reste à l'écran pendant la
 * lecture, avec la barre fine, puis les lignes communes, l'en-tête et la section Variants gardent leurs nœuds. Les sections
 * repliées, le filtre et l'aperçu survivent ; une valeur qui change est surlignée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { LectureDeComposant } from '../src/composant';
import { poserLeDom, comme, type ElementDeTest } from './domDeTest';
import { composantSimple, couleur } from './fixtures';

poserLeDom();
const envois: Array<{ type: string; demande?: number; calque?: string | null }> = [];
Object.defineProperty(globalThis, 'parent', { configurable: true, value: { postMessage: (message: { pluginMessage: { type: string } }) => envois.push(message.pluginMessage) } });

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { etatInitial } from '../src/ui/etat';
import { creerVueComposant } from '../src/ui/vues/composant';

const ID_ERREUR = 'alert:v1';
const NOM_INFO = 'Severity=info, Variant=standard';
const NOM_ERREUR = 'Severity=error, Variant=standard';

/** Alert dans un jeu de deux variants. Le variant `info` lie la description au texte ; `error` ne la lie pas. */
function jeu(): { info: LectureDeComposant; erreur: LectureDeComposant } {
  const base = composantSimple();
  const variants = [{ id: base.calques[0].id, nom: NOM_INFO }, { id: ID_ERREUR, nom: NOM_ERREUR }];
  const enJeu = (lecture: LectureDeComposant, nom: string): LectureDeComposant => ({ ...lecture, sujet: { ...lecture.sujet, type: 'COMPONENT_SET', variant: nom, variants } });
  const erreur = JSON.parse(JSON.stringify(base).split(`"${base.calques[0].id}"`).join(`"${ID_ERREUR}"`)) as LectureDeComposant;
  const description = base.calques[4].id;
  const sansDescription = (lecture: LectureDeComposant): LectureDeComposant => ({ ...lecture, liaisons: lecture.liaisons.filter((liaison) => liaison.calque !== description || liaison.propriete !== 'fills[0]') });
  // Lire un variant en fait le sujet : son identifiant remplace celui du variant par défaut.
  return { info: enJeu(sansDescription(base), NOM_INFO), erreur: enJeu(erreur, NOM_ERREUR) };
}

function monter() {
  const { info, erreur } = jeu();
  const etat = etatInitial();
  etat.disposition = 'etroite';
  etat.composant.selection = { id: info.sujet.id, portee: info.calques[0].id } as never;
  etat.composant.selectionConnue = true;
  etat.analyse = {
    identite: { sujet: 'alert-set', generation: 1 }, statut: 'complete', perimee: false, ecriture: null, lecture: null, variants: info.sujet.variants,
    constats: [{ id: 'c1', code: 'C16', type: 'corriger', famille: 'liaisons', variants: [ID_ERREUR], layers: [], faits: {} }],
  } as never;
  let demande = 1;
  const app = { etat, nouvelleDemande: () => (demande += 1), annoncer() {}, servirDeModele() {} };
  const vue = creerVueComposant(app as never);
  const racine = comme(vue.element);
  vue.activer();
  vue.recevoirLecture(etat.composant.demande, info);
  const banc = {
    vue, etat, racine, info, erreur,
    lignes: () => racine.querySelectorAll('.vc-ligne'),
    ligneDe: (debut: string): ElementDeTest => comme(racine.querySelectorAll('.vc-ligne').find((ligne) => ligne.dataset.cle.startsWith(debut))),
    jeton: (ligne: ElementDeTest): ElementDeTest => comme(ligne.parent),
    puceErreur: (): ElementDeTest => comme(racine.querySelectorAll('.valeur-axe').find((puce) => puce.dataset.propriete === 'Severity' && puce.dataset.valeur === 'error')),
    changerDeVariant() {
      this.puceErreur().clic();
      return this;
    },
    livrer() {
      vue.recevoirLecture(etat.composant.demande, erreur);
    },
  };
  return banc;
}

const FOREGROUND = 'components/alert/colors/info/standard/foreground';

test('la lecture d’un autre variant du même jeu garde l’ancien écran et ajoute la barre fine sous l’en-tête', () => {
  const banc = monter();
  const avant = banc.lignes().length;
  assert.ok(avant > 0);
  banc.changerDeVariant();
  assert.equal(envois.at(-1)?.type, 'lire-composant');
  assert.equal(envois.at(-1)?.calque, ID_ERREUR);
  assert.equal(banc.racine.querySelector('.vc-vide'), null, 'l’écran « Lecture du composant… » ne remplace pas la vue');
  assert.equal(banc.lignes().length, avant);
  const barre = comme(banc.racine.querySelector('.lecture-fine'));
  assert.equal(barre.getAttribute('role'), 'progressbar');
  // La valeur cliquée est choisie tout de suite ; le variant affiché garde son nom jusqu'à l'arrivée de la lecture.
  assert.ok(banc.puceErreur().classes.has('choisie'));
  assert.equal(comme(banc.racine.querySelector('.variants-affiche .ch-variant')).textContent, NOM_INFO);
  const corps = comme(banc.racine.querySelector('.vc-corps'));
  const parties = corps.children.map((enfant) => enfant.className);
  assert.equal(parties.indexOf('lecture-fine'), parties.indexOf('vc-tete') + 1, 'la barre suit l’en-tête');
  banc.livrer();
  assert.equal(banc.racine.querySelector('.lecture-fine'), null);
});

test('un nouveau composant garde l’écran « Lecture du composant… »', () => {
  const banc = monter();
  banc.etat.composant.selection = { id: 'autre', portee: 'autre:0' } as never;
  banc.vue.recevoirSelection({ id: 'autre', portee: 'autre:0' } as never, 0);
  assert.ok(banc.racine.querySelector('.vc-vide'));
  assert.equal(banc.racine.querySelector('.lecture-fine'), null);
  assert.equal(banc.lignes().length, 0);
});

test('l’en-tête, la section Variants et les lignes communes gardent leurs nœuds après un changement de variant', () => {
  const banc = monter();
  const tete = banc.racine.querySelector('.vc-tete');
  const variants = banc.racine.querySelector('.variants');
  const liste = banc.racine.querySelector('.vc-liste');
  assert.ok(tete && variants && liste);
  const avant = new Map(banc.lignes().map((ligne) => [ligne.dataset.cle, { ligne, jeton: banc.jeton(ligne) }]));
  banc.changerDeVariant().livrer();
  assert.equal(banc.racine.querySelector('.vc-tete'), tete);
  assert.equal(banc.racine.querySelector('.variants'), variants);
  assert.equal(banc.racine.querySelector('.vc-liste'), liste);
  const apres = banc.lignes();
  assert.equal(apres.length, avant.size);
  for (const ligne of apres) {
    const ancien = avant.get(ligne.dataset.cle);
    assert.ok(ancien, `la ligne ${ligne.dataset.cle} existait`);
    assert.equal(ligne, ancien.ligne);
    assert.equal(banc.jeton(ligne), ancien.jeton);
  }
  assert.equal(comme(banc.racine.querySelector('.variants-affiche .ch-variant')).textContent, NOM_ERREUR);
});

test('une ligne qui n’existe que dans l’un des variants apparaît ou disparaît sans toucher les autres', () => {
  const banc = monter();
  banc.changerDeVariant();
  const padding = banc.lignes().find((ligne) => ligne.dataset.cle.startsWith('components/alert/sizes/padding-x'));
  assert.ok(padding);
  const { erreur } = banc;
  const sansPadding = { ...erreur, liaisons: erreur.liaisons.filter((liaison) => liaison.variable !== 'components/alert/sizes/padding-x') };
  banc.vue.recevoirLecture(banc.etat.composant.demande, sansPadding);
  assert.equal(banc.lignes().some((ligne) => ligne.dataset.cle.startsWith('components/alert/sizes/padding-x')), false);
  const rayon = banc.lignes().find((ligne) => ligne.dataset.cle.startsWith('components/alert/sizes/border-radius'));
  assert.ok(rayon);
});

test('les sections repliées, le filtre et les lignes ouvertes survivent au changement de variant', () => {
  const banc = monter();
  const tete = (nature: string): ElementDeTest => comme(banc.racine.querySelectorAll('.vc-section-tete').find((candidat) => candidat.dataset.section === nature));
  assert.equal(tete('forme').getAttribute('aria-expanded'), 'true');
  tete('forme').clic();
  assert.equal(tete('forme').getAttribute('aria-expanded'), 'false');
  banc.changerDeVariant().livrer();
  assert.equal(tete('forme').getAttribute('aria-expanded'), 'false');
  assert.equal(tete('couleur').getAttribute('aria-expanded'), 'true');
});

test('le filtre saisi reste après le changement de variant', () => {
  const banc = monter();
  comme(banc.racine.querySelectorAll('.vc-icone').find((bouton) => bouton.dataset.focus === 'outil:filtre')).clic();
  const champ = comme(banc.racine.querySelector('.vc-filtre input')) as ElementDeTest & { value: string };
  champ.value = 'padding';
  champ.dispatchEvent(new Event('input'));
  const avant = banc.lignes().map((ligne) => ligne.dataset.cle);
  assert.ok(avant.length > 0 && avant.length < 10);
  banc.changerDeVariant().livrer();
  assert.equal((comme(banc.racine.querySelector('.vc-filtre input')) as ElementDeTest & { value: string }).value, 'padding');
  assert.deepEqual(banc.lignes().map((ligne) => ligne.dataset.cle), avant);
});

test('une valeur qui change est surlignée, et elle seule', () => {
  const banc = monter();
  const fois = (): ElementDeTest => comme(banc.ligneDe(FOREGROUND).querySelector('.vc-fois'));
  assert.equal(fois().textContent, '');
  banc.changerDeVariant().livrer();
  assert.equal(fois().textContent, '×2');
  assert.ok(fois().classes.has('vient-de-changer'));
  assert.equal(banc.racine.querySelectorAll('.vient-de-changer').length, 1);
  // Un redessin sans changement de valeur ne l'efface pas et n'en pose pas d'autre.
  banc.vue.mettreAJour();
  assert.equal(banc.racine.querySelectorAll('.vient-de-changer').length, 1);
});

test('le chevron d’une section de la liste suit le titre et le nombre', () => {
  const banc = monter();
  for (const tete of banc.racine.querySelectorAll('.vc-section-tete').filter((candidat) => candidat.dataset.section !== undefined)) {
    const enfants = tete.children;
    assert.equal(enfants.at(-1)?.classes.has('chevron-svg'), true, tete.dataset.section);
    assert.equal(enfants.filter((enfant) => enfant.classes.has('chevron-svg')).length, 1);
    assert.equal(enfants[0].tagName, 'SPAN');
    assert.equal(enfants[1].tagName, 'B');
  }
});

test('une ligne neuve qui prend l’emplacement d’une ligne disparue est surlignée si sa valeur change', () => {
  const banc = monter();
  const fond = 'alert/colors/info/standard/background';
  const autre = JSON.parse(JSON.stringify(banc.erreur).split(fond).join('alert/colors/error/standard/background')) as LectureDeComposant;
  const variable = autre.releve.variables.find((candidate) => candidate.nom === 'alert/colors/error/standard/background');
  assert.ok(variable);
  for (const mode of Object.keys(variable.valeurs)) Object.assign(variable.valeurs, { [mode]: couleur('#FEF2F2') });
  banc.changerDeVariant();
  const ancienne = banc.ligneDe('components/alert/colors/info/standard/background');
  banc.vue.recevoirLecture(banc.etat.composant.demande, autre);
  assert.equal(banc.lignes().includes(ancienne), false, 'la clé a changé : la ligne est neuve');
  const neuve = banc.ligneDe('components/alert/colors/error/standard/background');
  const valeur = comme(neuve.querySelector('.vc-valeur'));
  assert.equal(valeur.textContent, '#FEF2F2');
  assert.ok(valeur.classes.has('vient-de-changer'));
});

test('la zone d’aperçu garde son nœud et sa place ; la nouvelle image remplace l’ancienne', () => {
  const banc = monter();
  const message = (sujet: string, octets: number[]) => ({ type: 'apercu-du-composant' as const, demande: banc.etat.composant.demande, sujet, octets: new Uint8Array(octets), largeur: 400, hauteur: 60, origine: { x: 0, y: 0 } });
  banc.vue.recevoirApercu(message(banc.info.sujet.id, [1, 2, 3]));
  const zone = comme(banc.racine.querySelector('.vc-apercu'));
  const image = comme(zone.querySelector('.vc-image')) as ElementDeTest & { src: string };
  const premiere = image.src;
  assert.ok(premiere);
  banc.changerDeVariant();
  assert.equal(banc.racine.querySelector('.vc-apercu'), zone, 'l’aperçu reste pendant la lecture');
  assert.equal(image.src, premiere);
  banc.livrer();
  assert.equal(banc.racine.querySelector('.vc-apercu'), zone, 'l’aperçu reste quand la lecture arrive');
  assert.equal(image.src, premiere, 'l’ancienne image reste jusqu’à l’arrivée de la nouvelle');
  banc.vue.recevoirApercu(message(banc.erreur.sujet.id, [4, 5, 6]));
  assert.equal(banc.racine.querySelector('.vc-apercu'), zone);
  assert.equal(comme(zone.querySelector('.vc-image')), image);
  assert.notEqual(image.src, premiere);
});
