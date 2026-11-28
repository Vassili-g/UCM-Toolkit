/**
 * Le double de Figma du banc : `handleExportComponent` lit un document généré, et le double sait dessiner ce que les pièces internes
 * demanderont (instances exposées, propriétés effectives, surcharges, slots, modes forcés, maîtres multiples, pages, recherches sous
 * une instance). L'export 14.0 n'emploie pas encore certaines capacités : l'API du double les prouve, pour que le moteur les trouve
 * le jour où il les lira.
 *
 * Borne : le double reste un modèle. Ces tests prouvent que le moteur s'accorde avec lui, pas qu'il copie Figma ; ce point se tranche
 * chez le consommateur (AGENTS.md, « Limites d'environnement »).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { handleExportComponent } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';
import { generer, tirerSpec } from '../../plugin-socle/tests/generateur/generateur';
import { doubleDuDocument } from '../../plugin-socle/tests/generateur/double';
import { alias, modesDuNoeud, ref, valeur } from '../../plugin-socle/tests/generateur/modele';
import { ajouterUnJeu, calqueDe, echanger, forcerUnMode, idDeCopie, instancier, poserUnCalque, poserUnePropriete, surcharger, viderUnCalque } from '../../plugin-socle/tests/generateur/capacites';
import type { DocumentGenere } from '../../plugin-socle/tests/generateur/types';
import { verifierLeLecteur, verifierLeSchema, verifierLesLois } from './lois';

type Anatomie = 'texte' | 'icone';

/** Un composant généré, fixé : même graine, même spec, quelle que soit l'ordre des tests. */
function composant(anatomie: Anatomie[], construction: string[] = ['direct']): DocumentGenere {
  const spec = tirerSpec(4242, 1);
  spec.nom = 'Compose';
  spec.anatomie = anatomie;
  spec.construction = construction;
  spec.variantes = 1;
  spec.profondeur = 1;
  if (construction.some((c) => c.startsWith('wrapper'))) {
    spec.axes = spec.axes.filter((axe) => axe.role !== 'taille');
    spec.wrapperTaille = { nom: 'Size', valeur: 'Medium', commun: false };
  } else {
    spec.axes = [{ nom: 'Size', role: 'taille', valeurs: ['Small', 'Large'] }];
    spec.wrapperTaille = undefined;
  }
  return generer(4242, spec);
}

/** Monte le double sur `globalThis.figma`, exporte, et rend l'état d'avant. */
async function exporter(doc: DocumentGenere) {
  const double = doubleDuDocument(doc);
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = double.figma;
  oublierLIndexDuDocument();
  try {
    const sortie = await handleExportComponent();
    return { double, sortie, contrat: JSON.parse(sortie.content) };
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
    oublierLIndexDuDocument();
  }
}

/** Le dessin de l'icône du composant généré : le maître, son tracé, l'instance et son tracé copié. */
function icone(doc: DocumentGenere) {
  const instance = doc.noeuds.find((n) => n.type === 'INSTANCE' && n.main && n.props.isExposedInstance)!;
  const copie = doc.noeuds.find((n) => n.parent === instance.id)!;
  return { instance, copie };
}

/** Trois maîtres imbriqués : `Feuille` dans `Interieur` dans `Milieu`, que `hote` instancie dans le variant. */
function troisNiveaux(doc: DocumentGenere) {
  poserUnCalque(doc, 'bibliotheque', { id: 'feuille', type: 'COMPONENT', name: 'Feuille', props: { key: 'cle-feuille', remote: false, componentPropertyDefinitions: {} } });
  poserUnCalque(doc, 'feuille', { id: 'trait', type: 'VECTOR', name: 'Trait' });
  poserUnCalque(doc, 'bibliotheque', { id: 'interieur', type: 'COMPONENT', name: 'Interieur', props: { key: 'cle-interieur', remote: false, componentPropertyDefinitions: {} } });
  const profond = instancier(doc, { id: 'profond', parent: 'interieur', maitre: 'feuille', props: { isExposedInstance: true } });
  poserUnCalque(doc, 'bibliotheque', { id: 'milieu', type: 'COMPONENT', name: 'Milieu', props: { key: 'cle-milieu', remote: false, componentPropertyDefinitions: {} } });
  const nid = instancier(doc, { id: 'nid', parent: 'milieu', maitre: 'interieur', props: { isExposedInstance: true } });
  // Les références s'écrivent dans les maîtres : chaque copie les renomme avec son dessin.
  nid.props.exposedInstances = [ref(idDeCopie('nid', profond.id))];
  const hote = instancier(doc, { id: 'hote', parent: 'v', maitre: 'milieu', props: { isExposedInstance: true } });
  hote.props.exposedInstances = [ref(idDeCopie('hote', 'nid'))];
  return { hote: 'hote', milieu: idDeCopie('hote', 'nid'), profond: idDeCopie('hote', idDeCopie('nid', 'profond')) };
}

/** Un maître `Puce` : un texte lié à une propriété `TEXT`, une icône liée à un `BOOLEAN` et à un `INSTANCE_SWAP`. */
function puce(doc: DocumentGenere) {
  const paint = { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } };
  for (const id of ['icone-a', 'icone-b']) {
    poserUnCalque(doc, 'bibliotheque', { id, type: 'COMPONENT', name: id, props: { key: `cle-${id}`, remote: false, componentPropertyDefinitions: {} } });
    poserUnCalque(doc, id, { id: `dessin-${id}`, type: 'VECTOR', name: 'Vector', props: { fills: [paint] } });
  }
  poserUnCalque(doc, 'bibliotheque', {
    id: 'puce', type: 'COMPONENT', name: 'Puce',
    props: {
      key: 'cle-puce', remote: false,
      componentPropertyDefinitions: {
        'Label#1:0': { type: 'TEXT', defaultValue: 'Label' },
        'Icon#2:0': { type: 'BOOLEAN', defaultValue: true },
        'Swap#3:0': { type: 'INSTANCE_SWAP', defaultValue: 'icone-a' },
      },
    },
  });
  poserUnCalque(doc, 'puce', {
    id: 'etiquette', type: 'TEXT', name: 'Etiquette',
    props: { characters: 'Label', componentPropertyReferences: { characters: 'Label#1:0' }, segments: [{ start: 0, end: 5 }] },
  });
  instancier(doc, { id: 'glyphe', parent: 'puce', maitre: 'icone-a', props: { componentPropertyReferences: { visible: 'Icon#2:0', mainComponent: 'Swap#3:0' } } });
  return instancier(doc, { id: 'hote-puce', parent: 'v', maitre: 'puce' });
}

test('un composant généré sans pièce s’exporte et la sortie tient les lois, le schéma et le lecteur', async () => {
  for (const [nom, anatomie, construction] of [
    ['direct', ['texte'], ['direct']],
    ['icône', ['texte', 'icone'], ['direct']],
    ['wrapper exposé', ['texte'], ['wrapper-expose']],
  ] as const) {
    const { contrat, sortie } = await exporter(composant([...anatomie], [...construction]));
    verifierLesLois(contrat, nom);
    verifierLeSchema(contrat, nom);
    verifierLeLecteur(contrat, nom);
    assert.equal(typeof contrat.meta.contractVersion, 'string', nom);
    assert.ok(contrat.variants.length >= 1, nom);
    assert.equal(sortie.warningCount, 0, `${nom} : le composant juste n'avertit pas`);
  }
});

test('un document riche en capacités s’exporte comme un composant sans pièce : le moteur 14.0 ne s’en sert pas', async () => {
  const doc = composant(['texte', 'icone']);
  troisNiveaux(doc);
  puce(doc);
  const { contrat } = await exporter(doc);
  verifierLesLois(contrat, 'riche');
  verifierLeSchema(contrat, 'riche');
  verifierLeLecteur(contrat, 'riche');
});

test('une instance exposée à deux niveaux se lit comme un calque', async () => {
  const doc = composant(['texte']);
  const ids = troisNiveaux(doc);
  const { calque } = doubleDuDocument(doc);
  const hote = calque(ids.hote);
  assert.equal(hote.exposedInstances.length, 1);
  const milieu = hote.exposedInstances[0];
  assert.equal(milieu, calque(ids.milieu), 'le même objet que le calque de cet identifiant');
  assert.equal(milieu.type, 'INSTANCE');
  assert.equal(milieu.parent, hote);
  const profond = milieu.exposedInstances[0];
  assert.equal(profond, calque(ids.profond));
  assert.equal(profond.parent, milieu);
  assert.equal((await profond.getMainComponentAsync()).id, 'feuille');
  assert.deepEqual(profond.children.map((c: any) => c.type), ['VECTOR']);
  assert.equal(profond.exposedInstances, undefined, 'une instance sans exposition ne porte pas le champ');
  assert.equal(hote.exposedInstances, hote.exposedInstances, 'la lecture rend le même tableau');
});

test('une référence qui vise un calque absent lève à la lecture, pas à la construction', () => {
  const doc = composant(['texte']);
  troisNiveaux(doc);
  calqueDe(doc, 'hote').props.exposedInstances = [ref('absent')];
  const { calque } = doubleDuDocument(doc);
  assert.throws(() => calque('hote').exposedInstances, /noeud absent absent/);
});

test('une référence dans une copie suit le renommage de son dessin', () => {
  const doc = composant(['texte']);
  const ids = troisNiveaux(doc);
  assert.deepEqual(calqueDe(doc, ids.milieu).props.exposedInstances, [ref(ids.profond)]);
  assert.equal(ids.milieu, 'Ihote;nid');
  assert.equal(ids.profond, 'Ihote;nid;profond');
});

test('une recherche sous une instance écarte un calque masqué quand le drapeau le demande', async () => {
  const doc = composant(['icone']);
  const { instance, copie } = icone(doc);
  copie.props.visible = false;
  poserUnCalque(doc, instance.id, { id: 'cadre-masque', type: 'FRAME', name: 'Masque', props: { visible: false } });
  poserUnCalque(doc, 'cadre-masque', { id: 'texte-sous-masque', type: 'TEXT', name: 'Dessous' });
  poserUnCalque(doc, instance.id, { id: 'visible-sous-instance', type: 'FRAME', name: 'Visible' });
  poserUnCalque(doc, 'v', { id: 'masque-hors-instance', type: 'FRAME', name: 'Hors instance', props: { visible: false } });
  const { figma, calque } = doubleDuDocument(doc);
  const ids = (noeuds: any[]) => noeuds.map((n) => n.id);

  assert.equal(figma.skipInvisibleInstanceChildren, false);
  assert.ok(ids(figma.currentPage.findAll()).includes(copie.id), 'sans le drapeau, tout se voit');
  assert.ok(ids(figma.currentPage.findAll()).includes('texte-sous-masque'));

  figma.skipInvisibleInstanceChildren = true;
  const vus = ids(figma.currentPage.findAll());
  assert.ok(!vus.includes(copie.id), 'le tracé masqué sous l’instance est écarté');
  assert.ok(!vus.includes('cadre-masque') && !vus.includes('texte-sous-masque'), 'un calque masqué emporte ses descendants');
  assert.ok(vus.includes('visible-sous-instance'));
  assert.ok(vus.includes('masque-hors-instance'), 'hors d’une instance, un calque masqué se voit');
  assert.ok(!ids(calque(instance.id).findAll()).includes(copie.id), 'la recherche lancée sur l’instance suit la même règle');
  assert.equal(calque(instance.id).findOne((n: any) => n.id === copie.id), null);
  assert.ok(!ids(figma.currentPage.findAllWithCriteria({ types: ['VECTOR'] })).includes(copie.id));
  assert.ok(ids(calque(instance.id).findChildren()).includes(copie.id), 'findChildren ne subit pas le drapeau');

  figma.skipInvisibleInstanceChildren = false;
  assert.ok(ids(figma.currentPage.findAll()).includes(copie.id), 'le drapeau se relit à chaque recherche');
});

test('l’export rend le drapeau comme il l’a trouvé', async () => {
  const doc = composant(['texte', 'icone']);
  const { double } = await exporter(doc);
  assert.equal(double.figma.skipInvisibleInstanceChildren, false);
});

test('les propriétés de composant portent leurs valeurs effectives et leurs champs effectifs', async () => {
  const doc = composant(['texte']);
  puce(doc);
  const defaut = doubleDuDocument(doc).calque('hote-puce');
  assert.deepEqual(defaut.componentProperties, {
    'Label#1:0': { type: 'TEXT', value: 'Label' },
    'Icon#2:0': { type: 'BOOLEAN', value: true },
    'Swap#3:0': { type: 'INSTANCE_SWAP', value: 'icone-a' },
  });

  poserUnePropriete(doc, 'hote-puce', 'Icon#2:0', false);
  poserUnePropriete(doc, 'hote-puce', 'Label#1:0', 'Bonjour');
  poserUnePropriete(doc, 'hote-puce', 'Swap#3:0', 'icone-b');
  const { calque } = doubleDuDocument(doc);
  const hote = calque('hote-puce');
  assert.equal(hote.componentProperties['Icon#2:0'].value, false);
  assert.equal(hote.componentProperties['Label#1:0'].value, 'Bonjour');
  assert.equal(hote.componentProperties['Swap#3:0'].value, 'icone-b');
  assert.equal(calque('Ihote-puce;glyphe').visible, false, 'le booléen faux masque le calque qu’il commande');
  assert.equal(calque('Ihote-puce;etiquette').characters, 'Bonjour');
  assert.equal(calque('Ihote-puce;etiquette').getStyledTextSegments(['characters']).at(-1).end, 7, 'le segment suit le texte');
  assert.equal((await calque('Ihote-puce;glyphe').getMainComponentAsync()).id, 'icone-b', 'l’échange change le maître');
  assert.deepEqual(calque('Ihote-puce;glyphe').children.map((c: any) => c.id), ['Ihote-puce;glyphe;dessin-icone-b'], 'et le dessin sous l’instance');
  assert.equal(calque('puce').children.length, 2, 'le maître garde son dessin');
});

test('une propriété absente de l’instance est refusée à l’écriture', () => {
  const doc = composant(['texte']);
  puce(doc);
  assert.throws(() => poserUnePropriete(doc, 'hote-puce', 'Inconnue#9:9', true), /propriété absente/);
});

test('les surcharges : effacement, visibilité, opacité, texte, et surcharge héritée du maître intermédiaire', () => {
  const doc = composant(['texte']);
  puce(doc);
  // Le maître intermédiaire surcharge le texte de la puce qu'il pose, avant d'être lui-même instancié.
  poserUnCalque(doc, 'bibliotheque', { id: 'groupe', type: 'COMPONENT', name: 'Groupe', props: { key: 'cle-groupe', remote: false, componentPropertyDefinitions: {} } });
  instancier(doc, { id: 'puce-du-groupe', parent: 'groupe', maitre: 'puce' });
  surcharger(doc, 'puce-du-groupe', idDeCopie('puce-du-groupe', 'etiquette'), 'characters', 'Hérité');
  instancier(doc, { id: 'hote-groupe', parent: 'v', maitre: 'groupe' });

  const texte = idDeCopie('hote-puce', 'etiquette');
  const glyphe = idDeCopie('hote-puce', 'glyphe');
  const trace = idDeCopie('hote-puce', idDeCopie('glyphe', 'dessin-icone-a'));
  surcharger(doc, 'hote-puce', texte, 'characters', 'Texte');
  surcharger(doc, 'hote-puce', texte, 'opacity', 0.5);
  surcharger(doc, 'hote-puce', glyphe, 'visible', false);
  surcharger(doc, 'hote-puce', trace, 'fills', []);

  const { calque } = doubleDuDocument(doc);
  assert.deepEqual(calque('hote-puce').overrides, [
    { id: texte, overriddenFields: ['characters', 'opacity'] },
    { id: glyphe, overriddenFields: ['visible'] },
    { id: trace, overriddenFields: ['fills'] },
  ]);
  // Les champs effectifs restent la vérité du dessin : `overrides` n'en ajoute aucun.
  assert.equal(calque(texte).characters, 'Texte');
  assert.equal(calque(texte).opacity, 0.5);
  assert.equal(calque(glyphe).visible, false);
  assert.deepEqual(calque(trace).fills, [], 'l’effacement vide la peinture effective');
  assert.equal(calque('etiquette').opacity, 1, 'le maître garde son dessin');

  // Héritée : l'instance extérieure ne dit rien, l'instance du maître intermédiaire porte la ligne, le texte effectif suit.
  assert.deepEqual(calque('hote-groupe').overrides, []);
  assert.deepEqual(calque('Ihote-groupe;puce-du-groupe').overrides, [{ id: 'Ihote-groupe;puce-du-groupe;etiquette', overriddenFields: ['characters'] }]);
  assert.equal(calque('Ihote-groupe;puce-du-groupe;etiquette').characters, 'Hérité');
});

test('une surcharge d’avant un échange disparaît avec l’ancien dessin', () => {
  const doc = composant(['texte']);
  puce(doc);
  surcharger(doc, 'hote-puce', idDeCopie('hote-puce', 'etiquette'), 'characters', 'Texte');
  surcharger(doc, 'hote-puce', idDeCopie('hote-puce', 'glyphe'), 'visible', false);
  echanger(doc, idDeCopie('hote-puce', 'glyphe'), 'icone-b');
  const { calque } = doubleDuDocument(doc);
  assert.deepEqual(calque('hote-puce').overrides, [{ id: idDeCopie('hote-puce', 'etiquette'), overriddenFields: ['characters'] }].concat([{ id: idDeCopie('hote-puce', 'glyphe'), overriddenFields: ['visible'] }]), 'l’échange d’un descendant ne touche pas les lignes de l’instance extérieure');
  assert.deepEqual(calque(idDeCopie('hote-puce', 'glyphe')).overrides, [], 'les surcharges du calque échangé repartent à zéro');
});

test('un échange sans ligne d’overrides change le maître effectif', async () => {
  const doc = composant(['texte']);
  puce(doc);
  poserUnePropriete(doc, 'hote-puce', 'Swap#3:0', 'icone-b');
  const { calque } = doubleDuDocument(doc);
  assert.deepEqual(calque('hote-puce').overrides, []);
  assert.equal((await calque('Ihote-puce;glyphe').getMainComponentAsync()).id, 'icone-b');
});

test('un SLOT porte des recherches : contenu par défaut et contenu rempli', () => {
  const doc = composant(['texte']);
  poserUnCalque(doc, 'bibliotheque', { id: 'carte', type: 'COMPONENT', name: 'Carte', props: { key: 'cle-carte', remote: false, componentPropertyDefinitions: {} } });
  poserUnCalque(doc, 'carte', { id: 'contenu', type: 'SLOT', name: 'Contenu' });
  poserUnCalque(doc, 'contenu', { id: 'defaut', type: 'TEXT', name: 'Par défaut', props: { characters: 'Défaut' } });
  instancier(doc, { id: 'carte-vide', parent: 'v', maitre: 'carte' });
  instancier(doc, { id: 'carte-pleine', parent: 'v', maitre: 'carte' });
  const slot = idDeCopie('carte-pleine', 'contenu');
  viderUnCalque(doc, slot);
  poserUnCalque(doc, slot, { id: 'rempli-1', type: 'TEXT', name: 'Rempli 1' });
  poserUnCalque(doc, slot, { id: 'rempli-2', type: 'FRAME', name: 'Rempli 2' });
  poserUnCalque(doc, 'rempli-2', { id: 'rempli-3', type: 'TEXT', name: 'Rempli 3' });

  const { calque, figma } = doubleDuDocument(doc);
  const noms = (noeuds: any[]) => noeuds.map((n) => n.name);
  assert.ok('findAll' in calque('contenu'), 'un SLOT a des recherches');
  assert.ok('findAll' in calque(idDeCopie('carte-vide', 'contenu')));
  assert.deepEqual(noms(calque('contenu').findAll()), ['Par défaut']);
  assert.deepEqual(noms(calque('carte-vide').findAll((n: any) => n.type === 'TEXT')), ['Par défaut']);
  assert.deepEqual(noms(calque('carte-pleine').findAll((n: any) => n.type === 'TEXT')), ['Rempli 1', 'Rempli 3']);
  assert.deepEqual(noms(calque(slot).findChildren()), ['Rempli 1', 'Rempli 2']);
  assert.deepEqual(noms(calque(slot).findAllWithCriteria({ types: ['TEXT'] })), ['Rempli 1', 'Rempli 3']);
  assert.equal(calque(slot).findOne((n: any) => n.name === 'Par défaut'), null, 'le contenu par défaut a disparu du slot rempli');
  assert.deepEqual(noms(figma.root.findAll((n: any) => n.type === 'SLOT')), ['Contenu', 'Contenu', 'Contenu']);
  assert.equal(calque('rempli-1').parent, calque(slot));
});

test('un mode forcé : la variable liée suit le mode, une collection forcée sans liaison change seulement les modes résolus', async () => {
  const doc = composant(['texte'], ['mode-force']);
  const cadre = doc.noeuds.find((n) => n.props.explicitVariableModes?.t)!;
  const texte = doc.noeuds.find((n) => n.parent === cadre.id && n.type === 'TEXT')!;
  // Une collection forcée sur un cadre dont aucun descendant ne lie de variable de cette collection.
  poserUnCalque(doc, 'v', { id: 'sans-liaison', type: 'FRAME', name: 'Sans liaison' });
  poserUnCalque(doc, 'sans-liaison', { id: 'plein', type: 'RECTANGLE', name: 'Plein', props: { fills: [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0.3, g: 0.4, b: 0.5 } }] } });
  forcerUnMode(doc, 'sans-liaison', 'u', 'u:Dark');

  const { calque } = doubleDuDocument(doc);
  assert.deepEqual(calque(cadre.id).explicitVariableModes, { t: 't:Dark' });
  assert.equal(calque(cadre.id).resolvedVariableModes.t, 't:Dark');
  assert.deepEqual(calque('v').explicitVariableModes, {});
  assert.equal(calque('v').resolvedVariableModes.t, 't:Light');
  assert.equal(calque(texte.id).resolvedVariableModes.t, 't:Dark', 'le descendant reçoit le mode forcé');
  const sombre = valeur(doc, 'theme-texte', { t: 't:Dark' });
  const clair = valeur(doc, 'theme-texte', { t: 't:Light' });
  assert.notDeepEqual(sombre, clair, 'le mode change la valeur de la variable');
  const [peinture] = calque(texte.id).fills;
  assert.deepEqual(peinture.color, { r: sombre.r, g: sombre.g, b: sombre.b }, 'la couleur effective suit le mode forcé');
  assert.deepEqual(peinture.boundVariables.color, alias('Compose:foreground'), 'la liaison reste celle de la variable');
  assert.deepEqual(modesDuNoeud(doc, calqueDe(doc, texte.id)).t, 't:Dark');

  assert.deepEqual(calque('sans-liaison').explicitVariableModes, { u: 'u:Dark' });
  assert.equal(calque('plein').resolvedVariableModes.u, 'u:Dark');
  assert.equal(calque('plein').resolvedVariableModes.t, 't:Light', 'les autres collections gardent leur mode');
  assert.deepEqual(calque('plein').fills[0].color, { r: 0.3, g: 0.4, b: 0.5 }, 'sans liaison, la couleur ne bouge pas');

  const { contrat } = await exporter(doc);
  verifierLesLois(contrat, 'modes forcés');
});

test('plusieurs maîtres d’un même jeu, un changement de variante, un maître introuvable', async () => {
  const doc = composant(['texte']);
  ajouterUnJeu(doc, { id: 'jeu-badge', nom: 'Badge', variantes: [{ id: 'badge-s', valeurs: { Size: 'Small' } }, { id: 'badge-l', valeurs: { Size: 'Large' } }] });
  poserUnCalque(doc, 'badge-s', { id: 'point-s', type: 'ELLIPSE', name: 'Point' });
  poserUnCalque(doc, 'badge-l', { id: 'point-l', type: 'ELLIPSE', name: 'Point' });
  poserUnCalque(doc, 'badge-l', { id: 'etiquette-l', type: 'TEXT', name: 'Etiquette' });
  instancier(doc, { id: 'petit', parent: 'v', maitre: 'badge-s' });
  instancier(doc, { id: 'grand', parent: 'v', maitre: 'badge-l' });
  instancier(doc, { id: 'bascule', parent: 'v', maitre: 'badge-s' });
  instancier(doc, { id: 'orphelin', parent: 'v', maitre: 'badge-s' });

  let { calque } = doubleDuDocument(doc);
  const petit = await calque('petit').getMainComponentAsync();
  const grand = await calque('grand').getMainComponentAsync();
  assert.deepEqual([petit.id, grand.id], ['badge-s', 'badge-l']);
  assert.equal(petit.parent, grand.parent, 'deux maîtres, un seul jeu');
  assert.equal(petit.parent.id, 'jeu-badge');
  assert.deepEqual(petit.parent.children.map((c: any) => c.id), ['badge-s', 'badge-l']);
  assert.equal(petit.parent.defaultVariant.id, 'badge-s');
  assert.deepEqual(petit.variantProperties, { Size: 'Small' });
  assert.deepEqual(calque('petit').componentProperties, { Size: { type: 'VARIANT', value: 'Small' } });
  assert.deepEqual(calque('grand').children.map((c: any) => c.id), [idDeCopie('grand', 'point-l'), idDeCopie('grand', 'etiquette-l')]);

  echanger(doc, 'bascule', 'badge-l');
  calqueDe(doc, 'orphelin').main = 'maitre-supprime';
  ({ calque } = doubleDuDocument(doc));
  assert.equal((await calque('bascule').getMainComponentAsync()).id, 'badge-l', 'le changement de variante change le maître');
  assert.deepEqual(calque('bascule').variantProperties, { Size: 'Large' });
  assert.equal(calque('bascule').componentProperties.Size.value, 'Large');
  assert.deepEqual(calque('bascule').children.map((c: any) => c.id), [idDeCopie('bascule', 'point-l'), idDeCopie('bascule', 'etiquette-l')], 'le dessin suit la variante');
  assert.equal(await calque('orphelin').getMainComponentAsync(), null, 'un maître introuvable rend null');

  const { contrat } = await exporter(doc);
  verifierLesLois(contrat, 'maîtres multiples');
});

test('les pages se chargent une fois chacune, dans l’ordre où le moteur rencontre leurs maîtres', async () => {
  const doc = composant(['icone']);
  poserUnCalque(doc, 'document', { id: 'annexe', type: 'PAGE', name: 'Annexe' });
  poserUnCalque(doc, 'annexe', { id: 'maitre-annexe', type: 'COMPONENT', name: 'Annexe', props: { key: 'cle-annexe', remote: false, componentPropertyDefinitions: {} } });
  poserUnCalque(doc, 'document', { id: 'inutile', type: 'PAGE', name: 'Inutile' });
  instancier(doc, { id: 'deux', parent: 'v', maitre: 'maitre-annexe' });
  instancier(doc, { id: 'trois', parent: 'v', maitre: 'maitre-annexe' });

  const premier = await exporter(structuredClone(doc));
  assert.deepEqual(premier.double.chargements, ['bibliotheque', 'annexe'], 'l’icône vient avant les deux instances de l’annexe, et l’annexe ne se charge qu’une fois');

  const variant = calqueDe(doc, 'v');
  variant.children = [...variant.children.slice(-2), ...variant.children.slice(0, -2)];
  const second = await exporter(doc);
  assert.deepEqual(second.double.chargements, ['annexe', 'bibliotheque'], 'l’ordre des calques fait l’ordre des chargements');
  assert.ok(!second.double.chargements.includes('inutile'), 'une page sans maître n’est pas chargée');
});

test('les écouteurs se comptent dans l’ordre des appels, et se rappellent tant qu’ils ne sont pas retirés', async () => {
  const { double } = await exporter(composant(['icone']));
  assert.deepEqual(double.ecouteurs, [
    { noeud: 'bibliotheque', evenement: 'nodechange', action: 'on' },
    { noeud: 'bibliotheque', evenement: 'nodechange', action: 'off' },
  ], 'le moteur écoute la page qu’il balaie, et `exporter` oublie l’index à la fin, ce qui retire l’écoute');

  const { calque, emettre, ecouteurs } = doubleDuDocument(composant(['texte']));
  let appels = 0;
  const action = () => { appels += 1; };
  calque('page').on('nodechange', action);
  emettre('page', 'nodechange');
  emettre('bibliotheque', 'nodechange');
  emettre('page', 'autre');
  assert.equal(appels, 1, 'seul l’événement écouté sur sa page rappelle');
  calque('page').off('nodechange', action);
  emettre('page', 'nodechange');
  assert.equal(appels, 1, 'un écouteur retiré ne rappelle plus');
  assert.deepEqual(ecouteurs.map((e) => e.action), ['on', 'off']);
});
