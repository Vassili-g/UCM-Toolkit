/**
 * L'opérateur I de F6 : les icônes (C66), la propriété qui les pilote (C67) et leur définition (E-26), sur la base de 12 variants.
 *
 * L'icône de base est une instance d'`Icon` dont la propriété `Size` vaut la taille du variant et dont le remplissage est lié au token
 * `icon` du composant (`composantF6`, Q-F6-1 option A). I3 compte 5 cas et non 6 : le plan liste « deux fills dont un seul lié » en
 * plus des cinq autres, et le total de 58 cas de I ne tient qu'avec 5.
 */
import type { LayerLu, PeintureLue } from '../../../../src/controles/index.js';
import { axeDePropriete } from '../../../../src/controles/nommage.js';
import { Degradation, Numerotation, type CasDeVariants } from '../cas.js';
import { composantF6, liaisonVers, PROPRIETE_D_ICONE, variableLue } from '../composantDeBase.js';
import type { ComposantDeBase } from '../portF3.js';
import { operateursDefinitions } from './definitionsDIcone.js';
import { a66, a67, casF6, delierLeChamp, layerDe, layerNeuf, RANG_PREMIER, variableParNom, zoneDe } from './operateursTexte.js';

const icone = (d: Degradation, rang = RANG_PREMIER): LayerLu => layerDe(d.releve.variants[rang], 'Icon');

/** Retire les liaisons de ce champ du layer. */
const delier = (d: Degradation, layer: LayerLu, ...champs: string[]): void => { for (const champ of champs) delierLeChamp(d, layer, champ); };

// ---------------------------------------------------------------------------------------------------------------------------
// I1 : l'icône n'est pas une instance d'Icon

function pasUneInstance(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[RANG_PREMIER];
  const specs: readonly (readonly [description: string, motif: string | null, degrader: (d: Degradation) => void])[] = [
    ['une instance du composant Chevron, que Icon#1:2 pilote', 'autre-composant', (d) => d.fixer(icone(d).instanceDe!, 'nom', 'Chevron')],
    ['un vecteur nu', 'pas-une-instance', (d) => { d.fixer(icone(d), 'type', 'VECTOR'); d.fixer(icone(d), 'instanceDe', undefined); }],
    ['un frame qui contient des vecteurs : jamais une icône', null, (d) => {
      const frame = icone(d);
      d.fixer(frame, 'type', 'FRAME');
      d.fixer(frame, 'instanceDe', undefined);
      for (const rang of [1, 2]) d.inserer(d.releve.variants[RANG_PREMIER].layers, layerNeuf(`${frame.id}~v${rang}`, 'Vector', 'VECTOR', frame.id));
    }],
    ['un composant principal local : ni instance ni tracé, donc pas une icône', null, (d) => { d.fixer(icone(d), 'type', 'COMPONENT'); d.fixer(icone(d), 'instanceDe', undefined); }],
  ];
  return specs.map(([description, motif, degrader]) => casF6(base, {
    id: numero.prochain('I1'), operateur: 'I1', description: `l'icône Icon de ${premier.nom} est ${description}`,
    zones: [zoneDe('Icon', premier)], degrader, attendus: () => (motif === null ? [] : [a66('Icon', motif, [premier.nom])]),
  }));
}

// ---------------------------------------------------------------------------------------------------------------------------
// I2 : taille de l'icône

/** Une autre valeur de l'axe de taille que celle du premier variant : celle que l'instance écrit à tort. */
export function autreTailleDuPremierVariant(d: Degradation): string {
  const axe = d.releve.proprietes.find((propriete) => propriete.type === 'VARIANT' && axeDePropriete(propriete.nom) === 'taille')!;
  const courante = d.releve.variants[RANG_PREMIER].valeurs[axe.nom];
  return axe.valeurs!.find((valeur) => valeur !== courante)!;
}

function taillesDIcone(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[RANG_PREMIER];
  const lierA = (d: Degradation, nom: string): void => {
    for (const champ of ['width', 'height']) d.inserer(icone(d).liaisons, liaisonVers(icone(d).id, champ, variableParNom(d, nom)));
  };
  const cas = (description: string, degrader: (d: Degradation) => void, attendus: (d: Degradation) => ReturnType<typeof a66>[]): CasDeVariants => casF6(base, {
    id: numero.prochain('I2'), operateur: 'I2', description: `l'icône Icon de ${premier.nom} : ${description}`,
    zones: [zoneDe('Icon', premier)], degrader, attendus,
  });
  return [
    cas('Size vaut une autre taille que celle du variant', (d) => d.fixer(icone(d).instanceDe!.valeurs!, 'Size', autreTailleDuPremierVariant(d)),
      (d) => [a66('Icon', 'taille-differente', [premier.nom], { detail: autreTailleDuPremierVariant(d) })]),
    cas("Size vaut l'abréviation de la taille du variant", (d) => d.fixer(icone(d).instanceDe!.valeurs!, 'Size', 'sm'), () => []),
    cas("Size n'a pas été lue", (d) => d.fixer(icone(d).instanceDe!, 'valeurs', undefined), () => []),
    cas('Size vaut 24, qui ne dit pas une taille', (d) => d.fixer(icone(d).instanceDe!.valeurs!, 'Size', '24'), () => []),
    cas('largeur et hauteur liées à layout/sizing/16 : la taille ne se juge plus par une liaison', (d) => lierA(d, 'sizing/16'), () => []),
    cas('largeur et hauteur non liées : la taille vient de Size', (d) => delier(d, icone(d), 'width', 'height'), () => []),
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// I3 : couleur de l'icône

function couleursDIcone(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[RANG_PREMIER];
  const remplissage = (d: Degradation) => icone(d).liaisons.find((liaison) => liaison.champ === 'fills')!;
  const lierA = (d: Degradation, nom: string): void => d.fixer(remplissage(d), 'variable', variableLue(variableParNom(d, nom)));
  const cas = (description: string, degrader: (d: Degradation) => void, attendus: () => ReturnType<typeof a66>[]): CasDeVariants => casF6(base, {
    id: numero.prochain('I3'), operateur: 'I3', description: `l'icône Icon de ${premier.nom} : ${description}`,
    zones: [zoneDe('Icon', premier)], degrader, attendus,
  });
  const peintureDeTrait: PeintureLue = { champ: 'strokes', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 } };
  return [
    cas('remplissage non lié', (d) => delier(d, icone(d), 'fills'), () => [a66('Icon', 'couleur-sans-variable', [premier.nom])]),
    cas('remplissage lié à theme/neutral/surface/border', (d) => lierA(d, 'neutral/surface/border'), () => [a66('Icon', 'couleur-hors-premier-plan', [premier.nom], { detail: 'neutral/surface/border' })]),
    cas('remplissage lié à un token foreground du composant', (d) => lierA(d, d.jetons({ nature: 'couleur', role: 'foreground', valeurs: { Size: 'Small', State: 'default' } })[0].nom), () => []),
    cas('remplissage lié à une variable de primitives', (d) => lierA(d, 'color/primary/light/500'), () => [a66('Icon', 'couleur-hors-premier-plan', [premier.nom], { detail: 'color/primary/light/500' })]),
    cas('couleur portée par un trait lié à un token foreground du composant', (d) => {
      const layer = icone(d);
      delier(d, layer, 'fills');
      d.retirer(layer.peintures, layer.peintures.find((peinture) => peinture.champ === 'fills')!);
      d.inserer(layer.peintures, peintureDeTrait);
      const foreground = d.jetons({ nature: 'couleur', role: 'foreground', valeurs: premier.valeurs })[0];
      d.inserer(layer.liaisons, liaisonVers(layer.id, 'strokes', variableParNom(d, foreground.nom), { indice: 0 }));
    }, () => []),
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// I4 : plusieurs icônes, icônes masquées, même défaut partout

/** Une copie du layer Icon sous un autre nom, rangée dans le variant. */
function copierLIcone(d: Degradation, rang: number, nom: string): LayerLu {
  const variant = d.releve.variants[rang];
  const modele = icone(d, rang);
  const copie = structuredClone(modele);
  copie.id = `${modele.id}~${nom}`;
  copie.nom = nom;
  for (const liaison of copie.liaisons) liaison.porteur = copie.id;
  d.inserer(variant.layers, copie);
  return copie;
}

function plusieursIcones(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const premier = variants[RANG_PREMIER];
  const deuxIcones = (fautives: readonly string[]): CasDeVariants => casF6(base, {
    id: numero.prochain('I4'), operateur: 'I4',
    description: `${premier.nom} porte les icônes icon-left et icon-right, ${fautives.join(' et ')} sans couleur liée`,
    zones: [zoneDe('icon-left', premier), zoneDe('icon-right', premier)],
    degrader: (d) => { for (const nom of ['icon-left', 'icon-right']) { const copie = copierLIcone(d, RANG_PREMIER, nom); if (fautives.includes(nom)) delier(d, copie, 'fills'); } },
    attendus: () => fautives.map((nom) => a66(nom, 'couleur-sans-variable', [premier.nom])),
  });
  const uneFautive = deuxIcones(['icon-right']);
  const deuxFautives = deuxIcones(['icon-left', 'icon-right']);
  const masquee = casF6(base, {
    id: numero.prochain('I4'), operateur: 'I4', description: `l'icône Icon masquée de ${premier.nom} n'a pas de couleur liée : une icône masquée n'est jamais jugée`,
    zones: [zoneDe('Icon', premier)], degrader: (d) => { delier(d, icone(d), 'fills'); d.fixer(icone(d), 'visible', false); }, attendus: () => [],
  });
  const sousUnParentMasque = casF6(base, {
    id: numero.prochain('I4'), operateur: 'I4', description: `l'icône Icon de ${premier.nom} est sans couleur liée sous un frame Slot masqué`,
    zones: [zoneDe('Icon', premier)],
    degrader: (d) => {
      const variant = d.releve.variants[RANG_PREMIER];
      const slot = layerNeuf(`${icone(d).id}~slot`, 'Slot', 'FRAME', layerDe(variant, 'Root').id, { visible: false });
      d.inserer(variant.layers, slot);
      d.fixer(icone(d), 'parent', slot.id);
      delier(d, icone(d), 'fills');
    },
    attendus: () => [],
  });
  const partout = casF6(base, {
    id: numero.prochain('I4'), operateur: 'I4', description: `l'icône Icon n'a pas de couleur liée dans les ${variants.length} variants`,
    zones: variants.map((variant) => zoneDe('Icon', variant)),
    degrader: (d) => d.releve.variants.forEach((_, rang) => delier(d, icone(d, rang), 'fills')),
    attendus: () => [a66('Icon', 'couleur-sans-variable', variants.map((variant) => variant.nom))],
  });
  return [uneFautive, deuxFautives, masquee, sousUnParentMasque, partout];
}

// ---------------------------------------------------------------------------------------------------------------------------
// I5 : propriété INSTANCE_SWAP

const SLOTS: readonly (readonly [calque: string, propriete: string])[] = [['Avatar', 'Avatar#2:1'], ['Illustration', 'Illustration#2:2'], ['Content', 'Content#2:3']];

function proprietesDInstance(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const premier = variants[RANG_PREMIER];
  const absente = casF6(base, {
    id: numero.prochain('I5'), operateur: 'I5', description: `Icon de ${premier.nom} est piloté par Missing#9:9, que le jeu ne déclare pas`,
    zones: [zoneDe('Icon', premier)], degrader: (d) => d.fixer(icone(d).instanceDe!, 'pilotee', 'Missing#9:9'),
    attendus: () => [a67('Icon', 'propriete-absente', [premier.nom], 'Missing#9:9')],
  });
  const renommee = casF6(base, {
    id: numero.prochain('I5'), operateur: 'I5', description: `la propriété ${PROPRIETE_D_ICONE} du jeu devient Symbol#1:2, les ${variants.length} instances gardent l'ancienne`,
    zones: variants.map((variant) => zoneDe('Icon', variant)),
    degrader: (d) => d.fixer(d.releve.proprietes.find((propriete) => propriete.nom === PROPRIETE_D_ICONE)!, 'nom', 'Symbol#1:2'),
    attendus: () => [a67('Icon', 'propriete-absente', variants.map((variant) => variant.nom), PROPRIETE_D_ICONE)],
  });
  const nonPilotee = casF6(base, {
    id: numero.prochain('I5'), operateur: 'I5', description: `Icon de ${premier.nom} n'est piloté par aucune propriété`,
    zones: [zoneDe('Icon', premier)], degrader: (d) => d.fixer(icone(d).instanceDe!, 'pilotee', null),
    attendus: () => [a67('Icon', 'icone-non-pilotee', [premier.nom])],
  });
  const slots = SLOTS.map(([calque, propriete]) => casF6(base, {
    id: numero.prochain('I5'), operateur: 'I5',
    description: `${premier.nom} porte un slot INSTANCE_SWAP ${propriete} qui accueille ${calque}, un layer qui n'est pas une icône`,
    zones: [zoneDe(calque, premier)],
    degrader: (d) => {
      d.inserer(d.releve.proprietes, { nom: propriete, type: 'INSTANCE_SWAP', defaut: '2:0' });
      d.inserer(d.releve.variants[RANG_PREMIER].layers, layerNeuf(`${icone(d).id}~${calque}`, calque, 'INSTANCE', layerDe(d.releve.variants[RANG_PREMIER], 'Root').id, {
        instanceDe: { cle: `lib-${calque}`, nom: calque, distante: true, pilotee: propriete },
      }));
    },
    attendus: () => [],
  }));
  const sansLayer = casF6(base, {
    id: numero.prochain('I5'), operateur: 'I5',
    description: 'le jeu déclare une propriété INSTANCE_SWAP Extra#3:3 que nul layer ne pilote', zones: [],
    degrader: (d) => d.inserer(d.releve.proprietes, { nom: 'Extra#3:3', type: 'INSTANCE_SWAP', defaut: '3:3' }),
    attendus: () => [],
  });
  return [absente, renommee, nonPilotee, ...slots, sansLayer];
}

/** I (58) : 4 icônes qui n'en sont pas, 6 tailles, 5 couleurs, 5 sur plusieurs icônes ou masquées, 7 propriétés INSTANCE_SWAP, 31 définitions. */
export function operateursIcones(_base: ComposantDeBase, graine: number): CasDeVariants[] {
  const base = composantF6(graine);
  const numero = new Numerotation();
  return [
    ...pasUneInstance(base, numero), ...taillesDIcone(base, numero), ...couleursDIcone(base, numero), ...plusieursIcones(base, numero),
    ...proprietesDInstance(base, numero), ...operateursDefinitions(base, numero),
  ];
}
