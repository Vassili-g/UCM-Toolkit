/** Typographie et icônes d'un composant : un cas positif et un négatif par contrôle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLaTypographie, controlerLaTypographieParEtapes,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';
import { frequencesDuChamp, valeurUnanimeHorsContribution } from '../src/controles/typographie';

const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const liaison = (champ: string, nom: string, collection: string): LiaisonLue =>
  ({ champ, porteur: 'x', variable: { id: nom, cle: `k:${nom}`, nom, collection, distante: false } });
const catalogue: CatalogueDeReference = {
  version: 1, library: null, variables: [],
  collections: [
    { cle: 'typography', nom: 'typography', role: 'typography', modes: [], etat: 'lue' },
    { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' },
    { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
    { cle: 'primitives', nom: 'primitives', role: 'primitives', modes: [], etat: 'lue' },
  ],
};
function texte(style: string | null, liaisons: LiaisonLue[] = []): LayerLu {
  return {
    id: `t${Math.random()}`, nom: 'message', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: dims,
    peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style, plages: [{ debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: [], liaisons }] },
  };
}
function icone(over: Partial<LayerLu> = {}, liaisons: LiaisonLue[] = [
  liaison('width', 'icon/md', 'layout'), liaison('height', 'icon/md', 'layout'), liaison('fills', 'foreground/default', 'theme'),
]): LayerLu {
  return {
    id: `i${Math.random()}`, nom: 'icon', type: 'INSTANCE', parent: 'r', visible: true, opacite: 1, dimensions: dims,
    peintures: [], liaisons, valeursEnDur: [], instanceDe: { cle: 'c', nom: 'Info', distante: true, pilotee: null }, ...over,
  };
}
const variant = (nom: string, layers: LayerLu[]): VariantLu => ({ id: nom, nom, valeurs: { Severity: nom }, layers, modesEffectifs: {} });
const releve = (variants: VariantLu[], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'k', id: '1', nom: 'x-alert' }, proprietes, variants,
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const code = (r: ReleveDeComposant, c: string, limite = false) =>
  controlerLaTypographie(r, catalogue).filter((x) => x.code === c && !!x.limite === limite);
const bien = (): LiaisonLue[] => [liaison('fontSize', 'body/small/font-size', 'typography')];

test('la typographie par étapes conserve les constats ordonnés et cède par layer', () => {
  const layers = Array.from({ length: 90 }, (_, i) => ({ ...texte(null), id: `t-${i}`, nom: `message-${i}` }));
  const r = releve([variant('a', layers)]);
  const calcul = controlerLaTypographieParEtapes(r, catalogue);
  let etapes = 0;
  let resultat = calcul.next();
  while (!resultat.done) { etapes += 1; resultat = calcul.next(); }
  assert.ok(etapes >= 90);
  assert.deepEqual(resultat.value, controlerLaTypographie(r, catalogue));
});

test('C64 : un texte sans style ni variables est signalé, un texte avec style passe', () => {
  const mauvais = code(releve([variant('a', [texte(null)])]), 'C64');
  assert.equal(mauvais[0].faits.motif, 'sans-style-ni-variables');
  assert.equal(code(releve([variant('a', [texte('Body/Small')])]), 'C64').length, 0);
  assert.equal(code(releve([variant('a', [texte(null, bien())])]), 'C64').length, 0);
});

test('C64 : un style différent de celui des autres variants unanimes est signalé, sans unanimité rien', () => {
  const trois = [variant('a', [texte('Body/Small')]), variant('b', [texte('Body/Small')]), variant('c', [texte('Body/Large')])];
  const c = code(releve(trois), 'C64');
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].variants, ['c']);
  assert.equal(c[0].faits.styleAttendu, 'Body/Small');
  assert.equal(c[0].faits.styleLu, 'Body/Large');
  const partages = [variant('a', [texte('Body/Small')]), variant('b', [texte('Body/Large')]), variant('c', [texte('Body/Medium')])];
  assert.equal(code(releve(partages), 'C64').length, 0);
});

test('C65 : une taille liée à une autre collection est signalée, une liaison de typographie passe', () => {
  const mauvais = code(releve([variant('a', [texte('S', [liaison('fontSize', 'dimension/14', 'primitives')])])]), 'C65');
  assert.equal(mauvais[0].faits.collectionAttendue, 'typography');
  assert.equal(code(releve([variant('a', [texte('S', bien())])]), 'C65').length, 0);
});

test('C65 : une valeur sans liaison alors que les autres variants en ont une est signalée', () => {
  const r = releve([variant('a', [texte('S', bien())]), variant('b', [texte('S', bien())]), variant('c', [texte('S')])]);
  const c = code(r, 'C65');
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].variants, ['c']);
  assert.equal(code(releve([variant('a', [texte('S')]), variant('b', [texte('S')]), variant('c', [texte('S')])]), 'C65').length, 0);
});

test('C66 : une icône qui n\'est pas une instance de la library est signalée, une instance distante passe', () => {
  const mauvais = code(releve([variant('a', [icone({ type: 'VECTOR', instanceDe: undefined })])]), 'C66');
  assert.ok(mauvais.some((c) => c.faits.motif === 'pas-une-instance'));
  assert.equal(code(releve([variant('a', [icone()])]), 'C66').length, 0);
});

test('C66 : taille et couleur hors variables d\'icône ou de premier plan sont signalées', () => {
  const l = [liaison('width', 'sizing/md', 'layout'), liaison('fills', 'background/default', 'theme')];
  const c = code(releve([variant('a', [icone({}, l)])]), 'C66').map((x) => x.faits.motif);
  assert.ok(c.includes('taille-hors-icone'));
  assert.ok(c.includes('couleur-hors-premier-plan'));
  assert.ok(code(releve([variant('a', [icone({}, [])])]), 'C66').some((x) => x.faits.motif === 'couleur-sans-variable'));
});

test('C67 : une icône pilotée par une propriété absente est signalée, sinon la limite est dite', () => {
  const pilotee = icone({ instanceDe: { cle: 'c', nom: 'Info', distante: true, pilotee: 'Icon' } });
  const absente = code(releve([variant('a', [pilotee])]), 'C67');
  assert.equal(absente[0].faits.motif, 'propriete-absente');
  const declaree = releve([variant('a', [pilotee])], [{ nom: 'Icon', type: 'INSTANCE_SWAP', defaut: 'x' }]);
  assert.equal(code(declaree, 'C67').length, 0);
  const limite = code(declaree, 'C67', true);
  assert.equal(limite[0].type, 'info');
  assert.equal(limite[0].faits.cause, 'icones-permises-non-lues');
  assert.equal(code(releve([variant('a', [icone()])]), 'C67', true)[0].faits.cause, 'icone-non-pilotee');
});

/* ---------- fréquences hors contribution courante (4.3) ---------- */

function draine<T>(calcul: Generator<void, T>): T {
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Règle d'avant les fréquences : les autres sources, une à une. */
function unanimeDeReference<V>(valeurs: V[], indice: number): V | undefined {
  const autres = valeurs.filter((_, i) => i !== indice);
  if (autres.length < 2) return undefined;
  const distinctes = new Set(autres);
  return distinctes.size === 1 ? [...distinctes][0] : undefined;
}

test('la valeur unanime hors contribution égale la recherche parmi les autres, absence, null et valeur', () => {
  const univers: (string | null)[] = [null, 'A', 'B'];
  const suites: (string | null)[][] = [[]];
  for (let longueur = 1; longueur <= 5; longueur += 1) {
    for (const suite of suites.filter((s) => s.length === longueur - 1)) for (const v of univers) suites.push([...suite, v]);
  }
  for (const valeurs of suites) {
    const frequences = draine(frequencesDuChamp(valeurs, (v) => v));
    for (let i = 0; i < valeurs.length; i += 1) {
      assert.deepEqual(valeurUnanimeHorsContribution(frequences, valeurs[i]), unanimeDeReference(valeurs, i), JSON.stringify([valeurs, i]));
    }
  }
  const nulle = draine(frequencesDuChamp([null, null, null], (v) => v));
  assert.equal(valeurUnanimeHorsContribution(nulle, null), null, 'null unanime reste une valeur');
  const deux = draine(frequencesDuChamp(['A', 'A'], (v) => v));
  assert.equal(valeurUnanimeHorsContribution(deux, 'A'), undefined, 'un seul autre ne suffit pas');
});

test('les fréquences écartent les sources non retenues et cèdent toutes les 256 sources', () => {
  const sources = Array.from({ length: 600 }, (_, i) => ({ i, pair: i % 2 === 0 }));
  const calcul = frequencesDuChamp(sources, (s) => s.pair, (s) => s.i < 500);
  let cessions = 0;
  let etape = calcul.next();
  while (!etape.done) { cessions += 1; etape = calcul.next(); }
  assert.equal(cessions, 2);
  assert.equal(etape.value.total, 500);
  assert.equal(etape.value.parValeur.get(true), 250);
});

function mesurer(taille: number): { styles: number; liaisons: number } {
  const compteurs = { styles: 0, liaisons: 0 };
  const layers = Array.from({ length: taille }, (_, i): LayerLu => {
    const l = texte(i === 0 ? 'Body/Large' : 'Body/Small');
    const style = l.texte!.style;
    Object.defineProperty(l.texte, 'style', { get() { compteurs.styles += 1; return style; } });
    const liaisons = l.liaisons;
    Object.defineProperty(l, 'liaisons', { get() { compteurs.liaisons += 1; return liaisons; } });
    return l;
  });
  const variants = layers.map((l, i) => variant(`v${i}`, [l]));
  const constats = controlerLaTypographie(releve(variants), catalogue);
  assert.deepEqual(constats.filter((c) => c.faits.motif === 'style-different').map((c) => c.variants), [['v0']]);
  return compteurs;
}

test('lire un champ des autres sources croît linéairement avec leur nombre', () => {
  const petit = mesurer(100);
  const grand = mesurer(400);
  assert.ok(grand.styles < 400 * 8, `lectures de style : ${grand.styles}`);
  assert.ok(grand.styles / petit.styles < 5, `style ${petit.styles} -> ${grand.styles}`);
  assert.ok(grand.liaisons < 400 * 24, `lectures de liaisons : ${grand.liaisons}`);
  assert.ok(grand.liaisons / petit.liaisons < 5, `liaisons ${petit.liaisons} -> ${grand.liaisons}`);
});

test('C64 et C65 : sources sans texte, styles null et exclusions comme avant, sur des dispositions tirées au hasard', () => {
  let graine = 7;
  const alea = (n: number) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % n; };
  for (let essai = 0; essai < 300; essai += 1) {
    const noms = ['message', 'titre'];
    const variants: VariantLu[] = [];
    const sources: { nom: string; variant: string; sansTexte: boolean; style: string | null; lie: { fontSize: boolean; fontWeight: boolean } }[] = [];
    for (let v = 0; v < 1 + alea(7); v += 1) {
      const layers: LayerLu[] = [];
      for (const nom of noms) {
        if (alea(4) === 0) continue;
        const sansTexte = alea(5) === 0;
        const style = [null, 'A', 'B'][alea(3)];
        const lie = { fontSize: alea(2) === 0, fontWeight: alea(2) === 0 };
        const l = texte(style, [
          ...(lie.fontSize ? [liaison('fontSize', 'body/size', 'typography')] : []),
          ...(lie.fontWeight ? [liaison('fontWeight', 'body/weight', 'typography')] : []),
        ]);
        l.nom = nom;
        if (sansTexte) delete l.texte;
        layers.push(l);
        sources.push({ nom, variant: `v${v}`, sansTexte, style, lie });
      }
      variants.push(variant(`v${v}`, layers));
    }
    const attendus: string[] = [];
    for (const s of sources) {
      const memeNom = sources.filter((o) => o.nom === s.nom && o !== s);
      if (!s.sansTexte) {
        const unanime = unanimeDeReference(memeNom.filter((o) => !o.sansTexte).map((o) => o.style), -1);
        if (unanime && s.style !== unanime) attendus.push(`C64:${s.nom}:style:${unanime}:${s.style ?? 'aucun'}|${s.variant}`);
      }
      for (const champ of ['fontSize', 'fontWeight'] as const) {
        if (!s.sansTexte && s.lie[champ]) continue;
        if (unanimeDeReference(memeNom.map((o) => (!o.sansTexte && o.lie[champ] ? 'liee' : null)), -1) === 'liee') {
          attendus.push(`C65:${s.nom}:${champ}:sans-liaison|${s.variant}`);
        }
      }
    }
    const obtenus = controlerLaTypographie(releve(variants), catalogue)
      .filter((c) => c.faits.motif === 'style-different' || c.faits.motif === 'sans-liaison-comme-les-autres')
      .flatMap((c) => c.variants.map((v) => `${c.id}|${v}`));
    assert.deepEqual(obtenus.sort(), attendus.sort(), `essai ${essai}`);
  }
});
