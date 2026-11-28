/**
 * Ce que le modèle sait écrire, au-delà de ce que le générateur tire : des instances qui copient leur maître, des propriétés de
 * composant avec leurs champs effectifs, des surcharges, des slots, des modes forcés, des maîtres multiples. Le double (`double.ts`)
 * rend ces écritures lisibles par le moteur ; le générateur ne les emploie pas encore, et ses tirages n'en changent pas.
 *
 * Règle commune : les champs effectifs d'un calque (`visible`, `opacity`, `fills`, `characters`, maître) sont la vérité du dessin.
 * `overrides` ne dit que ce que Figma rapporte, et n'ajoute aucun dessin : l'échange d'un maître n'y figure pas, et une surcharge
 * posée dans un maître intermédiaire reste sur l'instance de ce maître, pas sur l'instance extérieure.
 *
 * Ces fonctions modifient le document qu'on leur donne ; un test les appelle sur un document fraîchement généré.
 */
import { actualiserLesCouleurs, copie, resoudreLesModes } from './modele';
import type { DocumentGenere, Noeud } from './types';

export function calqueDe(doc: DocumentGenere, id: string): Noeud {
  const trouve = doc.noeuds.find((n) => n.id === id);
  if (!trouve) throw new Error(`noeud absent ${id}`);
  return trouve;
}

/** L'identifiant que Figma donne, sous une instance, à la copie d'un calque du maître : un seul `I` initial, quelle que soit la profondeur. */
export function idDeCopie(instance: string, idDuMaitre: string): string {
  return `I${instance.replace(/^I/, '')};${idDuMaitre.replace(/^I/, '')}`;
}

/** Ajoute un calque sous `parent` (à la fin, ou au rang donné). Ses modes résolus sont ceux du parent. */
export function poserUnCalque(doc: DocumentGenere, parent: string, calque: { id: string; type: string; name: string; props?: Record<string, any>; main?: string }, rang?: number): Noeud {
  const pere = calqueDe(doc, parent);
  const x: Noeud = {
    id: calque.id, type: calque.type, name: calque.name, parent, children: [],
    props: {
      visible: true, opacity: 1, blendMode: 'NORMAL', fills: [], strokes: [], effects: [], boundVariables: {},
      x: 0, y: 0, width: 16, height: 16, absoluteBoundingBox: { x: 0, y: 0, width: 16, height: 16 },
      resolvedVariableModes: copie(pere.props.resolvedVariableModes ?? {}), explicitVariableModes: {},
      ...calque.props,
    },
    ...(calque.main ? { main: calque.main } : {}),
  };
  doc.noeuds.push(x);
  pere.children.splice(rang ?? pere.children.length, 0, x.id);
  return x;
}

/** Retire les descendants d'un calque, pas le calque. */
export function viderUnCalque(doc: DocumentGenere, id: string): void {
  const retirer = (cible: string) => {
    const x = calqueDe(doc, cible);
    for (const enfant of x.children) retirer(enfant);
    doc.noeuds.splice(doc.noeuds.indexOf(x), 1);
  };
  const racine = calqueDe(doc, id);
  for (const enfant of racine.children) retirer(enfant);
  racine.children = [];
}

/** Un jeu de variantes : un `COMPONENT_SET` et un `COMPONENT` par combinaison, le premier étant la variante par défaut. */
export function ajouterUnJeu(doc: DocumentGenere, jeu: { id: string; nom: string; parent?: string; variantes: { id: string; valeurs: Record<string, string>; props?: Record<string, any> }[] }): Noeud {
  const options: Record<string, string[]> = {};
  for (const v of jeu.variantes) for (const [axe, valeur] of Object.entries(v.valeurs)) if (!(options[axe] ??= []).includes(valeur)) options[axe].push(valeur);
  const ensemble = poserUnCalque(doc, jeu.parent ?? 'bibliotheque', {
    id: jeu.id, type: 'COMPONENT_SET', name: jeu.nom,
    props: { key: `cle-${jeu.id}`, remote: false, defaultVariant: jeu.variantes[0].id, componentPropertyDefinitions: Object.fromEntries(Object.entries(options).map(([axe, valeurs]) => [axe, { type: 'VARIANT', defaultValue: valeurs[0], variantOptions: valeurs }])) },
  });
  for (const v of jeu.variantes) {
    poserUnCalque(doc, jeu.id, { id: v.id, type: 'COMPONENT', name: Object.entries(v.valeurs).map(([k, x]) => `${k}=${x}`).join(', '), props: { key: `cle-${v.id}`, remote: false, componentPropertyDefinitions: {}, variantProperties: copie(v.valeurs), ...v.props } });
  }
  return ensemble;
}

/** Les définitions de propriétés qui valent pour un maître : celles de son jeu s'il en a un, plus les siennes. */
function definitionsDuMaitre(doc: DocumentGenere, maitre: Noeud): Record<string, any> {
  const jeu = maitre.parent ? calqueDe(doc, maitre.parent) : undefined;
  return { ...(jeu?.type === 'COMPONENT_SET' ? jeu.props.componentPropertyDefinitions : {}), ...maitre.props.componentPropertyDefinitions };
}

/** Copie le dessin d'un maître sous une instance, avec les identifiants de copie ; les références et les lignes d'`overrides` suivent. */
function copierLeDessin(doc: DocumentGenere, instance: Noeud, maitre: Noeud): void {
  const renoms = new Map<string, string>();
  const noter = (id: string) => {
    renoms.set(id, idDeCopie(instance.id, id));
    for (const enfant of calqueDe(doc, id).children) noter(enfant);
  };
  for (const enfant of maitre.children) noter(enfant);
  const renommer = (v: any): any => {
    if (Array.isArray(v)) return v.map(renommer);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (k === 'ref' || k === 'id') && typeof x === 'string' ? (renoms.get(x) ?? x) : renommer(x)]));
    return v;
  };
  const cloner = (id: string, parent: string): string => {
    const source = calqueDe(doc, id);
    const x: Noeud = { id: renoms.get(id)!, type: source.type, name: source.name, parent, children: [], props: copie(source.props), ...(source.main ? { main: source.main } : {}) };
    for (const champ of ['exposedInstances', 'overrides']) if (x.props[champ]) x.props[champ] = renommer(x.props[champ]);
    doc.noeuds.push(x);
    x.children = source.children.map((enfant) => cloner(enfant, x.id));
    return x.id;
  };
  instance.children = maitre.children.map((enfant) => cloner(enfant, instance.id));
}

/**
 * Pose une instance de `maitre` : son dessin copie celui du maître, ses propriétés prennent les valeurs par défaut de ses
 * définitions (celles du jeu pour une variante), `isExposedInstance` vaut faux.
 */
export function instancier(doc: DocumentGenere, instance: { id: string; parent: string; maitre: string; name?: string; props?: Record<string, any> }): Noeud {
  const maitre = calqueDe(doc, instance.maitre);
  const definitions = definitionsDuMaitre(doc, maitre);
  const x = poserUnCalque(doc, instance.parent, {
    id: instance.id, type: 'INSTANCE', name: instance.name ?? maitre.name, main: maitre.id,
    props: {
      componentPropertyReferences: {}, overrides: [], isExposedInstance: false,
      variantProperties: copie(maitre.props.variantProperties ?? {}),
      componentProperties: Object.fromEntries(Object.entries(definitions).map(([nom, d]: [string, any]) => [nom, { type: d.type, value: d.type === 'VARIANT' ? (maitre.props.variantProperties?.[nom] ?? d.defaultValue) : d.defaultValue }])),
      ...instance.props,
    },
  });
  copierLeDessin(doc, x, maitre);
  return x;
}

/**
 * L'échange d'un maître, qui vaut aussi un changement de variante dans un même jeu. Le dessin de l'instance devient celui du nouveau
 * maître, ses surcharges disparaissent, et les propriétés `VARIANT` suivent les valeurs du nouveau maître. L'échange n'écrit aucune
 * ligne d'`overrides`.
 */
export function echanger(doc: DocumentGenere, instance: string, nouveauMaitre: string): void {
  const x = calqueDe(doc, instance);
  const maitre = calqueDe(doc, nouveauMaitre);
  viderUnCalque(doc, instance);
  x.main = maitre.id;
  x.props.overrides = [];
  x.props.variantProperties = copie(maitre.props.variantProperties ?? {});
  for (const [nom, propriete] of Object.entries<any>(x.props.componentProperties ?? {})) {
    if (propriete.type === 'VARIANT' && maitre.props.variantProperties?.[nom]) propriete.value = maitre.props.variantProperties[nom];
  }
  copierLeDessin(doc, x, maitre);
}

/**
 * Pose la valeur effective d'une propriété de composant sur une instance, et écrit les champs effectifs que cette propriété commande
 * dans son dessin : `visible` pour un booléen, `characters` pour un texte, l'échange du maître pour un échange d'instance. Les
 * calques qui la citent sont ceux dont `componentPropertyReferences` nomme la propriété, dans le dessin de l'instance.
 */
export function poserUnePropriete(doc: DocumentGenere, instance: string, nom: string, valeur: string | boolean): void {
  const x = calqueDe(doc, instance);
  const propriete = x.props.componentProperties?.[nom];
  if (!propriete) throw new Error(`propriété absente ${nom} sur ${instance}`);
  propriete.value = valeur;
  const dessin = (id: string): Noeud[] => {
    const c = calqueDe(doc, id);
    return [c, ...c.children.flatMap(dessin)];
  };
  // L'échange réécrit le dessin sous la cible : la liste se fige avant, et un calque retiré par un échange n'est plus relu.
  for (const cible of dessin(instance)) {
    if (!doc.noeuds.includes(cible)) continue;
    const refs = cible.props.componentPropertyReferences ?? {};
    if (refs.visible === nom) cible.props.visible = valeur;
    if (refs.characters === nom) {
      cible.props.characters = valeur;
      for (const s of cible.props.segments ?? []) s.end = String(valeur).length;
    }
    if (refs.mainComponent === nom) echanger(doc, cible.id, String(valeur));
  }
}

/**
 * Écrit une surcharge sur un calque du dessin d'une instance : le champ effectif change (`fills` à `[]` pour un effacement, `visible`,
 * `opacity`, `characters`), et une ligne rejoint `overrides` de l'instance sauf si `ligne` vaut faux. Une surcharge qu'un maître
 * intermédiaire porte s'écrit sur l'instance de ce maître, avant l'instanciation de l'instance extérieure.
 */
export function surcharger(doc: DocumentGenere, instance: string, cible: string, champ: 'fills' | 'visible' | 'opacity' | 'characters', valeur: unknown, ligne = true): void {
  const x = calqueDe(doc, instance);
  const c = calqueDe(doc, cible);
  c.props[champ] = copie(valeur);
  if (champ === 'characters') for (const s of c.props.segments ?? []) s.end = String(valeur).length;
  if (champ === 'fills') for (const s of c.props.segments ?? []) s.fills = copie(valeur);
  if (!ligne) return;
  const lignes: { id: string; overriddenFields: string[] }[] = (x.props.overrides ??= []);
  const existante = lignes.find((l) => l.id === cible);
  if (!existante) lignes.push({ id: cible, overriddenFields: [champ] });
  else if (!existante.overriddenFields.includes(champ)) existante.overriddenFields.push(champ);
}

/** Force le mode d'une collection sur un calque : les descendants le reçoivent, et les couleurs liées se recalculent. */
export function forcerUnMode(doc: DocumentGenere, noeud: string, collection: string, mode: string): void {
  const x = calqueDe(doc, noeud);
  x.props.explicitVariableModes = { ...x.props.explicitVariableModes, [collection]: mode };
  resoudreLesModes(doc);
  actualiserLesCouleurs(doc);
}
