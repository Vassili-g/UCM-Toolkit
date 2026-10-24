/** Les textes des corrections du panneau des constats : cartes, faits relus, pied et écriture en cours. */
import { de } from './analyse';

const pluriel = (n: number): string => (n > 1 ? 's' : '');

/** Une liste de noms : « a », « a et b », « a, b et c ». */
const liste = (mots: readonly string[]): string => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}`);

/** Le nom que la fenêtre de Figma donne à un champ de l'API. */
const CHAMPS: Readonly<Record<string, string>> = {
  fills: 'Fill',
  strokes: 'Stroke',
  paddingLeft: 'Padding left',
  paddingRight: 'Padding right',
  paddingTop: 'Padding top',
  paddingBottom: 'Padding bottom',
  itemSpacing: 'Gap',
  counterAxisSpacing: 'Gap',
  cornerRadius: 'Radius',
  strokeWeight: 'Stroke weight',
  width: 'Width',
  height: 'Height',
};

/** Le champ d'une taille, dans la ligne grise d'une carte de tailles : left / right padding. */
const CHAMPS_DE_LA_CARTE: Readonly<Record<string, string>> = {
  paddingLeft: 'left / right padding',
  paddingRight: 'left / right padding',
  paddingTop: 'top / bottom padding',
  paddingBottom: 'top / bottom padding',
  itemSpacing: 'gap',
  counterAxisSpacing: 'gap',
  cornerRadius: 'radius',
  strokeWeight: 'stroke weight',
  width: 'width',
  height: 'height',
};

/** Le pied dit ce que la vue d'un seul élément ne montre pas : le total des cochées, dont la part visible. */
const dontDans = (cachees: { readonly dans: number; readonly element: string } | null): string => (cachees === null ? '' : `, dont ${cachees.dans} dans ${cachees.element}`);

export const TEXTES_CORRECTIONS = {
  correctionsDuComposant: {
    lierLeTexte: 'Lier le texte aux tokens sans fond',
    lierLeTexteDe: 'Lier le texte de ',
    auxTokensSansFond: ' aux tokens sans fond',
    lierLaTaille: (famille: string, layers: readonly string[], composant: string): string => `Lier le ${famille} ${layers.length === 0 ? de(composant) : layers.length === 1 ? de(layers[0]) : layers.length === 2 ? `de ${liste(layers)}` : `de ${layers.length} layers`}`,
    enDurEnPixels: (valeur: number): string => `${valeur} px en dur`,
    enPixels: (valeur: number): string => `${valeur} px`,
    existe: 'existe',
    fois: (fois: number): string => `×${fois}`,
    lierLesLayers: (composant: string): string => `Lier les layers de ${composant} à leurs tokens`,
    layerNomme: (nom: string): string => `Layer ${nom}`,
    variablesEnAttente: (nombre: number): string => (nombre === 1 ? '1 variable pas encore publiée.' : `${nombre} variables pas encore publiées.`),
    lier: (layer: string): string => `Lier ${layer} à `,
    creerLesRegles: (composant: string): string => `Créer l’instance de règles ${de(composant)}`,
    renommer: 'Renommer la valeur ',
    en: ' en ',
    copier: 'Copier les liaisons de ',
    copieMeta: (variants: number, liaisons: number, questions: number): string => `${variants} variants, ${liaisons} liaisons exactes, ${questions} cas dans Questions`,
    reglesMeta: (regles: number, proprietes: string): string => `${regles} règle${pluriel(regles)}${proprietes === '' ? '' : ` : ${proprietes}`}. Posée à côté du composant.`,
    tousLesVariants: 'Tous les variants',
    nVariants: (n: number): string => `${n} variants`,
    layers: (noms: readonly string[], inconnus: number): string => (noms.length === 0 ? `${inconnus} layer${pluriel(inconnus)}` : `layer${pluriel(noms.length)} ${liste(noms)}`),
    champDeLaCarte: (champ: string): string => CHAMPS_DE_LA_CARTE[champ] ?? champ,
    champDeFigma: (champ: string): string => CHAMPS[champ] ?? champ,
    famille: (champ: string): string => (/padding/i.test(champ) ? 'padding' : /spacing|gap/i.test(champ) ? 'gap' : /radius/i.test(champ) ? 'radius' : /stroke|borderWidth/i.test(champ) ? 'stroke weight' : /width/i.test(champ) ? 'width' : /height/i.test(champ) ? 'height' : 'taille'),
    enDur: (champ: string): string => (champ === 'fills' || champ === 'strokes' ? 'couleur en dur' : 'valeur en dur'),
    ciblee: 'Sélectionnés dans Figma.',
    propriete: 'Propriété',
    regle: 'Règle',
    duLayer: (champ: string, layer: string): string => `${champ} du layer ${layer}`,
    nePlusProposer: (layers: number): string => (layers > 1 ? `Ne plus proposer pour ces ${layers} layers` : 'Ne plus proposer pour ce layer'),
    pied: (cartes: number, layers: number, instances: number, valeurs: number, cachees: { readonly dans: number; readonly element: string } | null = null): { readonly gras: string; readonly suite: string } => ({
      gras: `${cartes} correction${pluriel(cartes)}`,
      suite: ` cochée${pluriel(cartes)}${dontDans(cachees)}${layers > 0 ? `, ${layers} layer${pluriel(layers)}` : ''}${instances > 0 ? `, ${instances} instance${pluriel(instances)}` : ''}${valeurs > 0 ? `, ${valeurs} valeur${pluriel(valeurs)} de variante` : ''}`,
    }),
    piedDeLaCopie: (liaisons: number, cachees: { readonly dans: number; readonly element: string } | null = null): { readonly gras: string; readonly suite: string } => ({ gras: `${liaisons} liaison${pluriel(liaisons)}`, suite: ` cochée${pluriel(liaisons)}${dontDans(cachees)}` }),
    aucuneCochee: 'Aucune correction cochée.',
    appliquer: 'Appliquer',
    appliquerTout: 'Appliquer tout',
    appliquerLaCarte: (carte: string): string => `Appliquer : ${carte}`,
    ecritureEnCours: (liaisons: number): string => `Écriture de ${liaisons} liaison${pluriel(liaisons)} en cours.`,
    ecritureSansLiaison: 'Écriture en cours.',
    ctrlZ: 'Ctrl+Z dans Figma défait ce lot.',
  },
};
