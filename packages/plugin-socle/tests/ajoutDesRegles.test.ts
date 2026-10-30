/**
 * L'ajout de règles dans une instance remplie : une section du même tag se reconstruit hors de
 * l'arbre à partir de ses règles relues, une section absente se crée, aucun `clone` n'est appelé et
 * rien ne s'écrit dans le slot d'une section rangée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ajouterLesRegles } from '../src/composant/template/ecriture';
import type { ModeleDeRegles } from '../src/composant/template/modele';
import type { SourcesDeCreation } from '../src/composant/template/sources';

type Faux = {
  id: string;
  type: string;
  name: string;
  children: Faux[];
  parent: Faux | null;
  maitre?: Faux;
  createInstance?: () => Faux;
  [cle: string]: unknown;
};

let compteur = 0;
const registre = new Map<string, Faux>();
let appels: string[] = [];
/** Les rangements dans un slot de règles, et si sa section était déjà rangée dans un slot à cet instant. */
let rangementsDeRegles: Array<{ slot: string; sectionRangee: boolean }> = [];

function noeud(type: string, name: string, enfants: Faux[] = []): Faux {
  compteur += 1;
  const n: Faux = { id: `n${compteur}`, type, name, children: [], parent: null, layoutSizingHorizontal: 'FIXED' };
  registre.set(n.id, n);
  for (const enfant of enfants) {
    n.children.push(enfant);
    enfant.parent = n;
  }
  n.findOne = (test: (e: Faux) => boolean) => {
    for (const enfant of n.children) {
      if (test(enfant)) return enfant;
      const profond = (enfant.findOne as (t: typeof test) => Faux | null)(test);
      if (profond) return profond;
    }
    return null;
  };
  n.findAll = (test: (e: Faux) => boolean) => {
    const trouves: Faux[] = [];
    for (const enfant of n.children) {
      if (test(enfant)) trouves.push(enfant);
      trouves.push(...(enfant.findAll as (t: typeof test) => Faux[])(test));
    }
    return trouves;
  };
  n.remove = () => {
    appels.push(`remove:${n.id}`);
    if (n.parent) n.parent.children = n.parent.children.filter((e) => e !== n);
    n.parent = null;
    registre.delete(n.id);
  };
  n.appendChild = (enfant: Faux) => {
    appels.push(`appendChild:${n.id}`);
    noterLeRangement(n);
    detacher(enfant);
    enfant.parent = n;
    n.children.push(enfant);
  };
  n.insertChild = (index: number, enfant: Faux) => {
    appels.push(`insertChild:${n.id}:${index}`);
    noterLeRangement(n);
    detacher(enfant);
    enfant.parent = n;
    n.children.splice(index, 0, enfant);
  };
  // Une copie ne vaut rien dans Figma (ses règles gardent des chemins morts) : tout appel se trace.
  n.clone = () => {
    appels.push(`clone:${n.id}`);
    throw new Error('clone interdit');
  };
  n.getMainComponentAsync = async () => n.maitre ?? null;
  return n;
}

function detacher(enfant: Faux): void {
  if (enfant.parent) enfant.parent.children = enfant.parent.children.filter((e) => e !== enfant);
  enfant.parent = null;
}

function noterLeRangement(slot: Faux): void {
  if (slot.name !== 'Rules-Wrapper') return;
  rangementsDeRegles.push({ slot: slot.id, sectionRangee: Boolean(slot.parent?.parent) });
}

function texte(nom: string, caracteres: string): Faux {
  const t = noeud('TEXT', nom);
  let contenu = caracteres;
  t.hasMissingFont = false;
  t.fontName = { family: 'Inter', style: 'Regular' };
  t.getRangeAllFontNames = () => [t.fontName];
  Object.defineProperty(t, 'characters', {
    get: () => contenu,
    set: (valeur: string) => {
      appels.push(`ecrit:${nom}:${valeur}`);
      contenu = valeur;
    },
  });
  return t;
}

/** Un maître dont les instances portent les enfants que la fabrique rend. */
function maitre(nom: string, fabrique: () => Faux[]): Faux {
  const m = noeud('COMPONENT', nom);
  m.createInstance = () => {
    const i = noeud('INSTANCE', nom, fabrique());
    i.maitre = m;
    return i;
  };
  return m;
}

const maitreDeRegle = maitre('regle', () => [texte('prop', 'aide'), texte('content', 'aide du maître')]);
const maitreDeSeparateur = maitre('separateur', () => []);
const maitreDeSection = (nom: string) =>
  maitre(nom, () => [noeud('SLOT', 'Rules-Wrapper', [maitreDeRegle.createInstance!()])]);

const sections = new Map([
  ['usage', maitreDeSection('s-usage')],
  ['prop', maitreDeSection('s-prop')],
  ['boolean', maitreDeSection('s-boolean')],
  ['icons', maitreDeSection('s-icons')],
]);

function sources(sansRegle: string[] = []): SourcesDeCreation {
  const regles = new Map(
    ['usage', 'prop', 'boolean', 'icons']
      .filter((tag) => !sansRegle.includes(tag))
      .map((tag) => [tag, maitreDeRegle]),
  );
  return {
    maitre: noeud('COMPONENT', '.componentRules'),
    aRemplir: null,
    sections,
    regles,
    separateur: maitreDeSeparateur,
  } as unknown as SourcesDeCreation;
}

const DIVIDER = '|';

/**
 * Une section rangée, dont les règles portent une cible et un texte déjà rédigé ; `|` pose un divider.
 * `descriptions` remplace le texte rédigé d'une cible.
 */
function sectionDe(tag: string, cibles: string[], descriptions: Record<string, string> = {}): Faux {
  const regles = cibles.map((cible) => {
    if (cible === DIVIDER) {
      const divider = noeud('INSTANCE', 'separateur');
      divider.maitre = maitreDeSeparateur;
      return divider;
    }
    const regle = noeud('INSTANCE', 'regle', [texte('prop', cible), texte('content', descriptions[cible] ?? `rédigé pour ${cible}`)]);
    regle.maitre = maitreDeRegle;
    return regle;
  });
  const section = noeud('INSTANCE', `s-${tag}`, [noeud('SLOT', 'Rules-Wrapper', regles)]);
  section.maitre = sections.get(tag);
  return section;
}

function conteneurAvec(
  existantes: Record<string, string[]>,
  descriptions: Record<string, string> = {},
): { conteneur: Faux; slot: Faux; instances: Faux[] } {
  const instances = Object.entries(existantes).map(([tag, cibles]) => sectionDe(tag, cibles, descriptions));
  const slot = noeud('SLOT', 'Sections-Wrapper', instances);
  const conteneur = noeud('INSTANCE', 'Button', [slot, texte('component-name', 'Button')]);
  return { conteneur, slot, instances };
}

/** Le modèle réduit : un tag et ses cibles manquantes, `|` posant un séparateur du modèle. */
function modele(manquantes: Record<string, string[]>): ModeleDeRegles {
  return {
    nom: 'Button',
    sections: Object.entries(manquantes).map(([tag, cibles]) => ({
      tag,
      elements: cibles.map((cible) => (cible === DIVIDER
        ? { genre: 'separateur' }
        : { genre: 'regle', tag, cible })),
    })),
  } as ModeleDeRegles;
}

let page: Faux;

function installer(): void {
  appels = [];
  rangementsDeRegles = [];
  page = noeud('PAGE', 'page');
  (globalThis as unknown as { figma: unknown }).figma = {
    currentPage: page,
    getNodeByIdAsync: async (id: string) => registre.get(id) ?? null,
    loadFontAsync: async () => {},
  };
}

const ordre = (slot: Faux) => slot.children.map((e) => (e.maitre as Faux).name);

/** Les cibles d'une section, `|` pour un divider. */
const cibles = (section: Faux) =>
  section.children[0].children.map((regle) => {
    const t = regle.children.find((e) => e.name === 'prop');
    return t ? (t.characters as string) : DIVIDER;
  });

test('une section prop existante se reconstruit hors de l’arbre et prend la place de l’ancienne', async () => {
  installer();
  const { conteneur, slot, instances } = conteneurAvec({
    usage: ['u'], prop: ['size.sm', 'size.md'], icons: ['i'],
  });
  const ancienne = instances[1];
  const reglesDeLAncienne = ancienne.children[0].id;

  const rendu = await ajouterLesRegles(
    conteneur as never, modele({ prop: ['state.default', 'state.hover'] }), sources(), () => {},
  );

  assert.equal(rendu.regles, 2);
  assert.equal(rendu.conteneur, conteneur);
  assert.deepEqual(ordre(slot), ['s-usage', 's-prop', 's-icons']);
  assert.notEqual(slot.children[1], ancienne);
  assert.deepEqual(
    cibles(slot.children[1]),
    ['size.sm', 'size.md', DIVIDER, 'state.default', 'state.hover'],
  );
  assert.ok(!appels.some((a) => a.startsWith('clone:')));
  assert.ok(!appels.includes(`appendChild:${page.id}`));
  assert.ok(appels.includes(`insertChild:${slot.id}:1`));
  assert.ok(appels.includes(`remove:${ancienne.id}`));
  assert.ok(!appels.some((a) => a.split(':').includes(reglesDeLAncienne)));
  assert.ok(!appels.some((a) => /^(append|insert)Child:/.test(a) && a.split(':')[1] === reglesDeLAncienne));
  assert.ok(!appels.includes(`remove:${instances[0].id}`));
  assert.ok(!appels.includes(`remove:${instances[2].id}`));
  assert.ok(!appels.includes(`remove:${conteneur.id}`));
  assert.ok(!appels.some((a) => a.startsWith('ecrit:component-name')));
  assert.equal(slot.children[1].layoutSizingHorizontal, 'FILL');
  assert.ok(
    slot.children[1].children[0].children.slice(2).every((r) => r.layoutSizingHorizontal === 'FILL'),
  );
});

test('aucune règle ne se range dans le slot d’une section déjà rangée dans le conteneur', async () => {
  installer();
  const { conteneur } = conteneurAvec({ prop: ['size.sm'] });

  await ajouterLesRegles(
    conteneur as never, modele({ prop: ['size.md', 'state.hover'] }), sources(), () => {},
  );

  assert.equal(rangementsDeRegles.length, 4);
  assert.ok(rangementsDeRegles.every((r) => !r.sectionRangee));
});

test('une valeur d’un axe déjà présent entre juste après cet axe, sans divider', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ prop: ['state.default', DIVIDER, 'size.sm'] });

  await ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), sources(), () => {});

  assert.deepEqual(cibles(slot.children[0]), ['state.default', 'state.hover', DIVIDER, 'size.sm']);
});

test('deux axes absents gardent l’ordre du modèle, un divider avant le premier et un entre eux', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ prop: ['size.sm'] });

  await ajouterLesRegles(
    conteneur as never,
    modele({ prop: ['state.default', 'state.hover', DIVIDER, 'tone.soft'] }),
    sources(),
    () => {},
  );

  assert.deepEqual(
    cibles(slot.children[0]),
    ['size.sm', DIVIDER, 'state.default', 'state.hover', DIVIDER, 'tone.soft'],
  );
});

test('une valeur d’un axe présent et un axe absent se rangent chacune à sa place', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ prop: ['size.sm', DIVIDER, 'tone.soft'] });

  await ajouterLesRegles(
    conteneur as never, modele({ prop: ['size.md', 'state.hover'] }), sources(), () => {},
  );

  assert.deepEqual(
    cibles(slot.children[0]),
    ['size.sm', 'size.md', DIVIDER, 'tone.soft', DIVIDER, 'state.hover'],
  );
});

test('une section boolean existante reçoit les règles manquantes à la fin, sans divider', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ prop: ['size.sm'], boolean: ['disabled'] });

  await ajouterLesRegles(
    conteneur as never, modele({ boolean: ['loading', 'busy'] }), sources(), () => {},
  );

  assert.deepEqual(ordre(slot), ['s-prop', 's-boolean']);
  assert.deepEqual(cibles(slot.children[1]), ['disabled', 'loading', 'busy']);
});

const texteDe = (regle: Faux, calque: string) => regle.children.find((e) => e.name === calque)?.characters;

test('la cible et la description de chaque règle relue se retrouvent à l’identique, marqueur compris', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec(
    { prop: ['Size . SM', DIVIDER, 'state.default'] },
    { 'Size . SM': '[À compléter] à rédiger', 'state.default': 'Repos\nsur deux lignes' },
  );

  await ajouterLesRegles(conteneur as never, modele({ prop: ['size.md'] }), sources(), () => {});

  const regles = slot.children[0].children[0].children;
  assert.deepEqual(cibles(slot.children[0]), ['Size . SM', 'size.md', DIVIDER, 'state.default']);
  assert.equal(texteDe(regles[0], 'content'), '[À compléter] à rédiger');
  assert.equal(texteDe(regles[3], 'prop'), 'state.default');
  assert.equal(texteDe(regles[3], 'content'), 'Repos\nsur deux lignes');
  assert.equal(texteDe(regles[1], 'content'), 'aide du maître');
});

test('une règle relue sans calque de description n’en reçoit pas, et une cible vide reste vide', async () => {
  installer();
  const sansDescription = sectionDe('prop', ['size.sm', '']);
  const regles = sansDescription.children[0].children;
  regles[0].children = regles[0].children.filter((e) => e.name !== 'content');
  const slot = noeud('SLOT', 'Sections-Wrapper', [sansDescription]);
  const conteneur = noeud('INSTANCE', 'Button', [slot, texte('component-name', 'Button')]);

  await ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), sources(), () => {});

  const apres = slot.children[0].children[0].children;
  assert.equal(apres.length, 4);
  assert.equal(texteDe(apres[0], 'prop'), 'size.sm');
  assert.equal(texteDe(apres[0], 'content'), 'aide du maître');
  assert.equal(texteDe(apres[1], 'prop'), '');
  assert.equal(texteDe(apres[1], 'content'), 'rédigé pour ');
});

test('une section boolean absente du conteneur se crée après la section prop', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ usage: ['u'], prop: ['size.sm'], icons: ['i'] });

  await ajouterLesRegles(conteneur as never, modele({ boolean: ['disabled'] }), sources(), () => {});

  assert.deepEqual(ordre(slot), ['s-usage', 's-prop', 's-boolean', 's-icons']);
  assert.ok(!appels.some((a) => a.startsWith('clone:')));
  assert.ok(appels.includes(`insertChild:${slot.id}:2`));
  assert.equal(slot.children[2].layoutSizingHorizontal, 'FILL');
});

test('sans section d’un tag placé avant, la section neuve prend la tête', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ icons: ['i'] });

  await ajouterLesRegles(conteneur as never, modele({ prop: ['size.sm'] }), sources(), () => {});

  assert.deepEqual(ordre(slot), ['s-prop', 's-icons']);
});

test('une erreur pendant le remplissage de la section neuve la retire et laisse l’ancienne intacte', async () => {
  installer();
  const { conteneur, slot, instances } = conteneurAvec({ usage: ['u'], prop: ['size.sm'] });
  const ancienne = instances[1];

  await assert.rejects(
    ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), sources(['prop']), () => {}),
    (erreur: Error) => {
      assert.match(erreur.message, /@prop/);
      assert.ok(erreur.message.endsWith(' Les règles déjà rédigées n’ont pas été touchées.'));
      return true;
    },
  );

  assert.deepEqual(ordre(slot), ['s-usage', 's-prop']);
  assert.equal(slot.children[1], ancienne);
  assert.deepEqual(cibles(ancienne), ['size.sm']);
  assert.ok(!appels.includes(`remove:${ancienne.id}`));
  assert.equal(page.children.length, 0);
  assert.ok(appels.some((a) => a.startsWith('remove:')));
  assert.ok(registre.has(conteneur.id));
});

test('une erreur à la section suivante ne range rien : l’ancienne section reste en place', async () => {
  installer();
  const { conteneur, slot, instances } = conteneurAvec({ usage: ['u'], prop: ['size.sm'] });
  const ancienne = instances[1];

  await assert.rejects(
    ajouterLesRegles(
      conteneur as never,
      modele({ prop: ['state.hover'], boolean: ['disabled'] }),
      sources(['boolean']),
      () => {},
    ),
    (erreur: Error) => {
      assert.match(erreur.message, /@boolean/);
      assert.ok(erreur.message.endsWith(' Les règles déjà rédigées n’ont pas été touchées.'));
      return true;
    },
  );

  assert.deepEqual(ordre(slot), ['s-usage', 's-prop']);
  assert.equal(slot.children[1], ancienne);
  assert.ok(!appels.includes(`remove:${ancienne.id}`));
  assert.ok(!appels.includes(`remove:${conteneur.id}`));
  assert.ok(!appels.some((a) => a.startsWith(`insertChild:${slot.id}`)));
  assert.equal(page.children.length, 0);
  assert.ok(registre.has(conteneur.id));
});

test('une règle relue qui n’est pas une instance arrête l’ajout avant toute écriture', async () => {
  installer();
  const { conteneur, slot, instances } = conteneurAvec({ prop: ['size.sm'] });
  const ancienne = instances[0];
  ancienne.children[0].children.push(noeud('FRAME', 'intrus'));

  await assert.rejects(
    ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), sources(), () => {}),
    (erreur: Error) => {
      assert.match(erreur.message, /intrus/);
      assert.ok(erreur.message.endsWith(' Les règles déjà rédigées n’ont pas été touchées.'));
      return true;
    },
  );

  assert.equal(slot.children[0], ancienne);
  assert.ok(!appels.some((a) => a.startsWith('ecrit:') || a.startsWith('insertChild:')));
  assert.ok(!appels.includes(`remove:${ancienne.id}`));
});

test('une ancienne section qui ne se retrouve pas après le rangement fait retirer la section neuve', async () => {
  installer();
  const { conteneur, slot, instances } = conteneurAvec({ usage: ['u'], prop: ['size.sm'] });
  const ancienne = instances[1];
  const vrai = ancienne.maitre as Faux;
  ancienne.getMainComponentAsync = async () => (slot.children.length > 2 ? null : vrai);

  await assert.rejects(
    ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), sources(), () => {}),
    (erreur: Error) => {
      assert.match(erreur.message, /@prop/);
      assert.ok(erreur.message.endsWith(' Les règles déjà rédigées n’ont pas été touchées.'));
      return true;
    },
  );

  assert.deepEqual(slot.children.map((e) => e.id), [instances[0].id, ancienne.id]);
  assert.deepEqual(cibles(ancienne), ['size.sm']);
  assert.ok(!appels.includes(`remove:${ancienne.id}`));
  assert.ok(registre.has(conteneur.id));
});

test('une règle relue garde le tag que son calque affiche, pas celui de la section', async () => {
  installer();
  const { conteneur, slot } = conteneurAvec({ prop: ['size.sm', 'flag'] });
  const regle = slot.children[0].children[0].children[1];
  regle.children.push(texte('@boolean', '@boolean'));
  const maitreDeBoolean = maitre('regle-boolean', () => [texte('prop', 'aide'), texte('content', 'aide')]);
  const jeu = sources();
  jeu.regles.set('boolean', maitreDeBoolean as never);

  await ajouterLesRegles(conteneur as never, modele({ prop: ['state.hover'] }), jeu, () => {});

  const apres = slot.children[0].children[0].children;
  assert.equal(apres[0].maitre, maitreDeRegle);
  assert.equal(apres[1].maitre, maitreDeBoolean);
  assert.equal(texteDe(apres[1], 'prop'), 'flag');
});
