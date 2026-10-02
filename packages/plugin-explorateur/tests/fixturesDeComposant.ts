/**
 * Les composants de test de la vue composant, construits en code. Leurs noms,
 * leurs valeurs et leurs comptes sont ceux que MAQUETTE-VUE-COMPOSANT.html
 * affiche pour Button, Alert, TileLink, StressTest, Tag et Avatar. Aucun ne
 * vient d'un fichier Figma ni d'un contrat.
 *
 * Chaque liaison de la maquette donne une liaison ici : une marge horizontale
 * tient sur `paddingLeft` seul, un rayon sur `topLeftRadius` seul. Les comptes
 * du pied égalent ainsi ceux de la maquette. Une boîte est celle du calque
 * dans le dessin de la maquette, sans réduction.
 */
import type { BoiteDeCalque, LectureDeComposant } from '../src/composant';
import { indexer } from '../src/indexation';
import { texteDeValeur, type TypeDeVariable, type ValeurSource } from '../src/modele';
import { resoudre } from '../src/resolution';
import { alias, constructeur, couleur, nombre, texte } from './fixtures';

type Jeton = readonly [type: TypeDeVariable, valeur: ValeurSource];
type CalqueDeTest = readonly [nom: string, parent: number | null, type: string, boite: readonly [x: number, y: number, largeur: number, hauteur: number], composant?: string];

interface ComposantDeTest {
  readonly id: string;
  readonly nom: string;
  readonly variant: string;
  readonly calques: readonly CalqueDeTest[];
  readonly liaisons: ReadonlyArray<readonly [calque: number, propriete: string, jeton: string]>;
  readonly usages: ReadonlyArray<readonly [calque: number, style: string]>;
  readonly directes?: ReadonlyArray<readonly [calque: number, propriete: string, valeur: string]>;
}

/** Les collections à plusieurs modes ; le premier est le défaut. Les autres n'ont qu'un mode. */
const MODES: Readonly<Record<string, readonly string[]>> = {
  'color-brand-tokens': ['intencial', 'apicil'],
  theme: ['Light', 'Dark'],
  brand: ['Apicil', 'Intencial'],
};

/**
 * Chaque variable par `collection/nom`, avec la cible de son alias ou sa
 * valeur. La table se construit à l'appel : `fixtures.ts` réexporte ce
 * module, et ses constructeurs ne sont pas encore définis au chargement.
 */
function tableDesJetons(): Readonly<Record<string, Jeton>> {
  return {
    'components/button/sizes/medium/border-radius': ['FLOAT', alias('layouts/radius/md')],
    'layouts/radius/md': ['FLOAT', alias('primitives/dimensions/6')],
    'primitives/dimensions/6': ['FLOAT', nombre(6)],
    'components/button/sizes/medium/gap': ['FLOAT', alias('primitives/dimensions/10')],
    'primitives/dimensions/10': ['FLOAT', nombre(10)],
    'components/button/sizes/medium/padding-x': ['FLOAT', alias('primitives/dimensions/14')],
    'primitives/dimensions/14': ['FLOAT', nombre(14)],
    'components/button/sizes/medium/padding-y': ['FLOAT', alias('primitives/dimensions/12')],
    'primitives/dimensions/12': ['FLOAT', nombre(12)],
    'components/icons/sizes/sm': ['FLOAT', alias('primitives/dimensions/20')],
    'primitives/dimensions/20': ['FLOAT', nombre(20)],
    'components/button/colors/primary/contained/default/background': ['COLOR', alias('color-brand-tokens/primary/default')],
    'color-brand-tokens/primary/default': ['COLOR', alias('color-brands/intencial/primary/500')],
    'color-brands/intencial/primary/500': ['COLOR', alias('primitives/colors/terracota/500')],
    'primitives/colors/terracota/500': ['COLOR', couleur('#B15152')],
    'components/button/colors/primary/contained/default/foreground': ['COLOR', alias('color-utilities/neutral/50')],
    'color-utilities/neutral/50': ['COLOR', alias('primitives/colors/titanium/50')],
    'primitives/colors/titanium/50': ['COLOR', couleur('#FCFCFD')],
    'primitives/fontfamily/base': ['STRING', texte('Open Sans')],
    'typography/label/large/fontsize': ['FLOAT', alias('primitives/fontsize/sm')],
    'primitives/fontsize/sm': ['FLOAT', nombre(14)],
    'typography/label/large/fontweight': ['FLOAT', alias('primitives/fontweight/600')],
    'primitives/fontweight/600': ['FLOAT', nombre(600)],
    'typography/label/large/lineheight': ['FLOAT', alias('primitives/lineheight/xs')],
    'primitives/lineheight/xs': ['FLOAT', nombre(16)],
    'typography/label/large/letterspacing': ['FLOAT', alias('primitives/letterspacing/base')],
    'primitives/letterspacing/base': ['FLOAT', nombre(0)],
    'components/alert/sizes/gap': ['FLOAT', alias('primitives/dimensions/10')],
    'components/alert/sizes/padding-x': ['FLOAT', alias('primitives/dimensions/14')],
    'components/alert/sizes/padding-y': ['FLOAT', alias('primitives/dimensions/8')],
    'primitives/dimensions/8': ['FLOAT', nombre(8)],
    'components/alert/sizes/border-radius': ['FLOAT', alias('layouts/radius/md')],
    'components/icons/sizes/base': ['FLOAT', alias('primitives/dimensions/22')],
    'primitives/dimensions/22': ['FLOAT', nombre(22)],
    'components/alert/colors/info/standard/background': ['COLOR', alias('primitives/colors/sky/50')],
    'primitives/colors/sky/50': ['COLOR', couleur('#F0F9FF')],
    'components/alert/colors/info/standard/icon': ['COLOR', alias('primitives/colors/sky/700')],
    'primitives/colors/sky/700': ['COLOR', couleur('#0369A1')],
    'components/alert/colors/info/standard/foreground': ['COLOR', alias('primitives/colors/sky/700')],
    'typography/body/large/fontsize': ['FLOAT', alias('primitives/fontsize/base')],
    'primitives/fontsize/base': ['FLOAT', nombre(16)],
    'typography/body/large/fontweight': ['FLOAT', alias('primitives/fontweight/600')],
    'typography/body/large/lineheight': ['FLOAT', alias('primitives/lineheight/lg')],
    'primitives/lineheight/lg': ['FLOAT', nombre(24)],
    'typography/body/large/letterspacing': ['FLOAT', alias('primitives/letterspacing/base')],
    'typography/body/small/fontsize': ['FLOAT', alias('primitives/fontsize/sm')],
    'typography/body/small/fontweight': ['FLOAT', alias('primitives/fontweight/400')],
    'primitives/fontweight/400': ['FLOAT', nombre(400)],
    'typography/body/small/lineheight': ['FLOAT', alias('primitives/lineheight/sm')],
    'primitives/lineheight/sm': ['FLOAT', nombre(20)],
    'typography/body/small/letterspacing': ['FLOAT', alias('primitives/letterspacing/base')],
    'components/tilelink/sizes/width': ['FLOAT', alias('primitives/dimensions/96')],
    'primitives/dimensions/96': ['FLOAT', nombre(96)],
    'components/tilelink/sizes/height': ['FLOAT', alias('primitives/dimensions/96')],
    'components/tilelink/sizes/icon': ['FLOAT', alias('components/icons/sizes/xl')],
    'components/icons/sizes/xl': ['FLOAT', alias('primitives/dimensions/28')],
    'primitives/dimensions/28': ['FLOAT', nombre(28)],
    'components/tilelink/colors/info/default/background': ['COLOR', alias('color-utilities/info/50')],
    'color-utilities/info/50': ['COLOR', alias('primitives/colors/sky/50')],
    'components/tilelink/colors/info/default/foreground': ['COLOR', alias('color-utilities/info/700')],
    'color-utilities/info/700': ['COLOR', alias('primitives/colors/sky/700')],
    'components/stresstest/info/base/sizes/max-width': ['FLOAT', nombre(600)],
    'components/stresstest/info/base/sizes/gap': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/base/sizes/padding': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/base/sizes/border-radius': ['FLOAT', alias('layouts/radius/md')],
    'components/stresstest/info/head/sizes/gap': ['FLOAT', alias('primitives/dimensions/4')],
    'primitives/dimensions/4': ['FLOAT', nombre(4)],
    'components/stresstest/info/tilesgrid/sizes/gap-col': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/tilesgrid/sizes/gap-rows': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/tilesgrid/sizes/radius': ['FLOAT', alias('layouts/radius/sm')],
    'layouts/radius/sm': ['FLOAT', alias('primitives/dimensions/4')],
    'components/stresstest/info/userinput/sizes/border-radius': ['FLOAT', alias('layouts/radius/md')],
    'components/stresstest/info/userinput/sizes/padding-left': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/userinput/sizes/padding-right': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/userinput/sizes/padding-top': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/userinput/sizes/padding-bottom': ['FLOAT', alias('primitives/dimensions/48')],
    'primitives/dimensions/48': ['FLOAT', nombre(48)],
    'components/stresstest/info/userinput/sizes/border-radius-tag': ['FLOAT', alias('layouts/radius/md')],
    'components/stresstest/info/userinput/sizes/padding-x-tag': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/userinput/sizes/padding-y-tag': ['FLOAT', alias('primitives/dimensions/4')],
    'components/stresstest/info/textcolumns/sizes/gap': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/textcolumns/sizes/gap-col': ['FLOAT', alias('primitives/dimensions/6')],
    'components/stresstest/info/divider/sizes/height': ['FLOAT', alias('primitives/dimensions/1')],
    'primitives/dimensions/1': ['FLOAT', nombre(1)],
    'components/stresstest/info/divider/sizes/max-width': ['FLOAT', nombre(350)],
    'components/stresstest/info/tilelinkswrap/sizes/gap-x': ['FLOAT', alias('primitives/dimensions/10')],
    'components/stresstest/info/tilelinkswrap/sizes/gap-y': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/scalewrap/sizes/height': ['FLOAT', alias('primitives/dimensions/20')],
    'components/stresstest/info/scalewrap/sizes/radius-top-left': ['FLOAT', alias('layouts/radius/md')],
    'components/stresstest/info/scalewrap/sizes/radius-bottom-left': ['FLOAT', alias('layouts/radius/xl')],
    'layouts/radius/xl': ['FLOAT', alias('primitives/dimensions/12')],
    'components/stresstest/info/scalewrap/sizes/radius-top-right': ['FLOAT', alias('layouts/radius/xs')],
    'layouts/radius/xs': ['FLOAT', alias('primitives/dimensions/2')],
    'primitives/dimensions/2': ['FLOAT', nombre(2)],
    'components/stresstest/info/scalewrap/sizes/radius-bottom-right': ['FLOAT', alias('layouts/radius/3xl')],
    'layouts/radius/3xl': ['FLOAT', alias('primitives/dimensions/24')],
    'primitives/dimensions/24': ['FLOAT', nombre(24)],
    'components/stresstest/info/base/colors/background': ['COLOR', alias('primitives/colors/titanium/0')],
    'primitives/colors/titanium/0': ['COLOR', couleur('#FFFFFF')],
    'components/stresstest/info/head/colors/text': ['COLOR', alias('primitives/colors/titanium/1200')],
    'primitives/colors/titanium/1200': ['COLOR', couleur('#000000')],
    'components/stresstest/info/tilesgrid/colors/tile': ['COLOR', alias('primitives/colors/sky/50')],
    'components/stresstest/info/userinput/colors/background': ['COLOR', alias('primitives/colors/blue/50')],
    'primitives/colors/blue/50': ['COLOR', couleur('#EFF6FF')],
    'components/stresstest/info/userinput/colors/background-tag': ['COLOR', alias('primitives/colors/blue/950')],
    'primitives/colors/blue/950': ['COLOR', couleur('#172554')],
    'components/stresstest/info/userinput/colors/text-color-tag': ['COLOR', alias('primitives/colors/titanium/0')],
    'components/stresstest/info/textcolumns/colors/title': ['COLOR', alias('primitives/colors/titanium/1200')],
    'components/stresstest/info/textcolumns/colors/description': ['COLOR', alias('primitives/colors/titanium/900')],
    'primitives/colors/titanium/900': ['COLOR', couleur('#202939')],
    'components/stresstest/info/textcolumns/colors/link': ['COLOR', alias('primitives/colors/titanium/600')],
    'primitives/colors/titanium/600': ['COLOR', couleur('#697586')],
    'components/stresstest/info/divider/colors/background': ['COLOR', alias('primitives/colors/titanium/300')],
    'primitives/colors/titanium/300': ['COLOR', couleur('#E3E8EF')],
    'components/stresstest/info/scalewrap/colors/scale-1': ['COLOR', alias('primitives/colors/orange/100')],
    'primitives/colors/orange/100': ['COLOR', couleur('#FFEDD5')],
    'components/stresstest/info/scalewrap/colors/scale-2': ['COLOR', alias('primitives/colors/orange/200')],
    'primitives/colors/orange/200': ['COLOR', couleur('#FED7AA')],
    'components/stresstest/info/scalewrap/colors/scale-3': ['COLOR', alias('primitives/colors/orange/300')],
    'primitives/colors/orange/300': ['COLOR', couleur('#FDBA74')],
    'components/stresstest/info/scalewrap/colors/scale-4': ['COLOR', alias('primitives/colors/orange/400')],
    'primitives/colors/orange/400': ['COLOR', couleur('#FB923C')],
    'components/stresstest/info/scalewrap/colors/scale-5': ['COLOR', alias('primitives/colors/orange/600')],
    'primitives/colors/orange/600': ['COLOR', couleur('#EA580C')],
    'components/stresstest/info/scalewrap/colors/scale-6': ['COLOR', alias('primitives/colors/orange/800')],
    'primitives/colors/orange/800': ['COLOR', couleur('#9A3412')],
    'components/stresstest/info/base/colors/border': ['COLOR', alias('primitives/colors/titanium/500')],
    'primitives/colors/titanium/500': ['COLOR', couleur('#9AA4B2')],
    'components/stresstest/info/base/sizes/border-width': ['FLOAT', alias('primitives/dimensions/1')],
    'components/stresstest/info/userinput/colors/border': ['COLOR', alias('primitives/colors/blue/600')],
    'primitives/colors/blue/600': ['COLOR', couleur('#2563EB')],
    'components/stresstest/info/userinput/sizes/border-width': ['FLOAT', alias('primitives/dimensions/1')],
    'typography/title/medium/fontsize': ['FLOAT', alias('primitives/fontsize/xl')],
    'primitives/fontsize/xl': ['FLOAT', nombre(20)],
    'typography/title/medium/fontweight': ['FLOAT', alias('primitives/fontweight/600')],
    'typography/title/medium/lineheight': ['FLOAT', alias('primitives/lineheight/xl')],
    'primitives/lineheight/xl': ['FLOAT', nombre(28)],
    'typography/title/medium/letterspacing': ['FLOAT', alias('primitives/letterspacing/sm')],
    'primitives/letterspacing/sm': ['FLOAT', nombre(-0.25)],
    'typography/body/medium/fontsize': ['FLOAT', alias('primitives/fontsize/base')],
    'typography/body/medium/fontweight': ['FLOAT', alias('primitives/fontweight/400')],
    'typography/body/medium/lineheight': ['FLOAT', alias('primitives/lineheight/base')],
    'primitives/lineheight/base': ['FLOAT', nombre(22)],
    'typography/body/medium/letterspacing': ['FLOAT', alias('primitives/letterspacing/base')],
    'typography/label/small/fontsize': ['FLOAT', alias('primitives/fontsize/3xs')],
    'primitives/fontsize/3xs': ['FLOAT', nombre(10)],
    'typography/label/small/fontweight': ['FLOAT', alias('primitives/fontweight/600')],
    'typography/label/small/lineheight': ['FLOAT', alias('primitives/lineheight/3xs')],
    'primitives/lineheight/3xs': ['FLOAT', nombre(12)],
    'typography/label/small/letterspacing': ['FLOAT', alias('primitives/letterspacing/lg')],
    'primitives/letterspacing/lg': ['FLOAT', nombre(0.25)],
    'components/tag/outline/border': ['COLOR', alias('usage/primary/border/default')],
    'usage/primary/border/default': ['COLOR', alias('theme/primary/600')],
    'theme/primary/600': ['COLOR', alias('brand/palette/primary/light/600')],
    'brand/palette/primary/light/600': ['COLOR', alias('primitives/colors/ruby/light/600')],
    'primitives/colors/ruby/light/600': ['COLOR', couleur('#C34261')],
    'components/tag/outline/foreground': ['COLOR', alias('usage/primary/text/default')],
    'usage/primary/text/default': ['COLOR', alias('bibliotheque/absente')],
  };
}


/** Les variables de chaque style de texte, champ par champ. */
const STYLES: Readonly<Record<string, ReadonlyArray<readonly [champ: string, jeton: string]>>> = {
  'Label/Large': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/label/large/fontsize'], ['fontWeight', 'typography/label/large/fontweight'], ['lineHeight', 'typography/label/large/lineheight'], ['letterSpacing', 'typography/label/large/letterspacing']],
  'Body/Large': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/body/large/fontsize'], ['fontWeight', 'typography/body/large/fontweight'], ['lineHeight', 'typography/body/large/lineheight'], ['letterSpacing', 'typography/body/large/letterspacing']],
  'Body/Small': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/body/small/fontsize'], ['fontWeight', 'typography/body/small/fontweight'], ['lineHeight', 'typography/body/small/lineheight'], ['letterSpacing', 'typography/body/small/letterspacing']],
  'Title/Medium': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/title/medium/fontsize'], ['fontWeight', 'typography/title/medium/fontweight'], ['lineHeight', 'typography/title/medium/lineheight'], ['letterSpacing', 'typography/title/medium/letterspacing']],
  'Body/Medium': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/body/medium/fontsize'], ['fontWeight', 'typography/body/medium/fontweight'], ['lineHeight', 'typography/body/medium/lineheight'], ['letterSpacing', 'typography/body/medium/letterspacing']],
  'Label/Small': [['fontFamily', 'primitives/fontfamily/base'], ['fontSize', 'typography/label/small/fontsize'], ['fontWeight', 'typography/label/small/fontweight'], ['lineHeight', 'typography/label/small/lineheight'], ['letterSpacing', 'typography/label/small/letterspacing']],
};

const BUTTON: ComposantDeTest = {
  id: 'button',
  nom: 'Button',
  variant: 'primary · contained · default',
  calques: [
    ['Button', null, 'COMPONENT', [0, 0, 139, 44]],
    ['.sizeWrapperButton', 0, 'FRAME', [0, 0, 139, 44]],
    ['arrow-left-long', 1, 'FRAME', [14, 12, 20, 20]],
    ['Suivant', 1, 'TEXT', [44, 12, 51, 20]],
    ['arrow-right-long', 1, 'FRAME', [105, 12, 20, 20]],
  ],
  liaisons: [
    [1, 'topLeftRadius', 'components/button/sizes/medium/border-radius'],
    [1, 'itemSpacing', 'components/button/sizes/medium/gap'],
    [1, 'paddingLeft', 'components/button/sizes/medium/padding-x'],
    [1, 'paddingTop', 'components/button/sizes/medium/padding-y'],
    [2, 'width', 'components/icons/sizes/sm'],
    [4, 'width', 'components/icons/sizes/sm'],
    [1, 'fills[0]', 'components/button/colors/primary/contained/default/background'],
    [2, 'fills[0]', 'components/button/colors/primary/contained/default/foreground'],
    [3, 'fills[0]', 'components/button/colors/primary/contained/default/foreground'],
    [4, 'fills[0]', 'components/button/colors/primary/contained/default/foreground'],
  ],
  usages: [[3, 'Label/Large']],
};

const ALERT: ComposantDeTest = {
  id: 'alert',
  nom: 'Alert',
  variant: 'info · standard',
  calques: [
    ['Alert', null, 'COMPONENT', [0, 0, 400, 60]],
    ['circle-info', 0, 'FRAME', [14, 19, 22, 22]],
    ['Text', 0, 'FRAME', [46, 10, 192, 39]],
    ['Titre', 2, 'TEXT', [46, 10, 192, 22]],
    ['Description', 2, 'TEXT', [46, 33, 192, 17]],
    ['Action', 0, 'FRAME', [248, 8, 139, 44]],
    ['Button', 5, 'INSTANCE', [248, 8, 139, 44], 'Button'],
  ],
  liaisons: [
    [0, 'itemSpacing', 'components/alert/sizes/gap'],
    [0, 'paddingLeft', 'components/alert/sizes/padding-x'],
    [0, 'paddingTop', 'components/alert/sizes/padding-y'],
    [0, 'topLeftRadius', 'components/alert/sizes/border-radius'],
    [1, 'width', 'components/icons/sizes/base'],
    [0, 'fills[0]', 'components/alert/colors/info/standard/background'],
    [1, 'fills[0]', 'components/alert/colors/info/standard/icon'],
    [3, 'fills[0]', 'components/alert/colors/info/standard/foreground'],
    [4, 'fills[0]', 'components/alert/colors/info/standard/foreground'],
  ],
  usages: [[3, 'Body/Large'], [4, 'Body/Small']],
};

const TILELINK: ComposantDeTest = {
  id: 'tilelink',
  nom: 'TileLink',
  variant: 'info · default',
  calques: [
    ['TileLink', null, 'COMPONENT', [0, 0, 96, 96]],
    ['chess', 0, 'FRAME', [34, 34, 28, 28]],
  ],
  liaisons: [
    [0, 'width', 'components/tilelink/sizes/width'],
    [0, 'height', 'components/tilelink/sizes/height'],
    [1, 'width', 'components/tilelink/sizes/icon'],
    [0, 'fills[0]', 'components/tilelink/colors/info/default/background'],
    [1, 'fills[0]', 'components/tilelink/colors/info/default/foreground'],
  ],
  usages: [],
};

const STRESSTEST: ComposantDeTest = {
  id: 'stresstest',
  nom: 'StressTest',
  variant: 'info',
  calques: [
    ['StressTest', null, 'COMPONENT', [0, 0, 600, 781]],
    ['Head', 0, 'FRAME', [20, 20, 560, 52]],
    ['Titre', 1, 'TEXT', [20, 20, 560, 28]],
    ['Première variante du comp…', 1, 'TEXT', [20, 52, 560, 20]],
    ['Alert', 0, 'INSTANCE', [20, 92, 560, 60], 'Alert'],
    ['TilesGrid', 0, 'FRAME', [20, 171, 560, 70]],
    ['Tile', 5, 'FRAME', [20, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [117, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [213, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [310, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [407, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [503, 171, 77, 30]],
    ['Tile', 5, 'FRAME', [20, 211, 77, 30]],
    ['Tile', 5, 'FRAME', [117, 211, 77, 30]],
    ['Tile', 5, 'FRAME', [213, 211, 77, 30]],
    ['Tile', 5, 'FRAME', [310, 211, 77, 30]],
    ['Tile', 5, 'FRAME', [407, 211, 77, 30]],
    ['Tile', 5, 'FRAME', [503, 211, 77, 30]],
    ['UserInput', 0, 'FRAME', [20, 261, 560, 102]],
    ['Button', 18, 'INSTANCE', [30, 271, 139, 44], 'Button'],
    ['Tag', 18, 'FRAME', [283, 271, 35, 25]],
    ['ou', 20, 'TEXT', [293, 274, 15, 17]],
    ['Button', 18, 'INSTANCE', [432, 271, 139, 44], 'Button'],
    ['TextColumns', 0, 'FRAME', [20, 383, 560, 85]],
    ['Col', 23, 'FRAME', [20, 383, 173, 85]],
    ['Point 1', 24, 'TEXT', [20, 383, 173, 22]],
    ['Ce qui est important de f…', 24, 'TEXT', [20, 411, 173, 34]],
    ['Lien vers ressource 1', 24, 'TEXT', [20, 451, 173, 17]],
    ['Col', 23, 'FRAME', [213, 383, 173, 85]],
    ['Point 2', 28, 'TEXT', [213, 383, 173, 22]],
    ['Ce qui est important de f…', 28, 'TEXT', [213, 411, 173, 34]],
    ['Lien vers ressource 2', 28, 'TEXT', [213, 451, 173, 17]],
    ['Col', 23, 'FRAME', [407, 383, 173, 85]],
    ['Point 3', 32, 'TEXT', [407, 383, 173, 22]],
    ['Ce qui est important de f…', 32, 'TEXT', [407, 411, 173, 34]],
    ['Lien vers ressource 3', 32, 'TEXT', [407, 451, 173, 17]],
    ['Divider', 0, 'FRAME', [20, 488, 350, 1]],
    ['TileLinksWrap', 0, 'FRAME', [20, 509, 560, 212]],
    ['TileLink', 37, 'INSTANCE', [20, 509, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [126, 509, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [232, 509, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [338, 509, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [444, 509, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [20, 625, 96, 96], 'TileLink'],
    ['TileLink', 37, 'INSTANCE', [126, 625, 96, 96], 'TileLink'],
    ['ScaleWrap', 0, 'FRAME', [20, 741, 560, 20]],
    ['Step', 45, 'FRAME', [20, 741, 93, 20]],
    ['Step', 45, 'FRAME', [113, 741, 93, 20]],
    ['Step', 45, 'FRAME', [207, 741, 93, 20]],
    ['Step', 45, 'FRAME', [300, 741, 93, 20]],
    ['Step', 45, 'FRAME', [393, 741, 93, 20]],
    ['Step', 45, 'FRAME', [487, 741, 93, 20]],
  ],
  liaisons: [
    [0, 'maxWidth', 'components/stresstest/info/base/sizes/max-width'],
    [0, 'itemSpacing', 'components/stresstest/info/base/sizes/gap'],
    [0, 'paddingLeft', 'components/stresstest/info/base/sizes/padding'],
    [0, 'paddingTop', 'components/stresstest/info/base/sizes/padding'],
    [0, 'topLeftRadius', 'components/stresstest/info/base/sizes/border-radius'],
    [1, 'itemSpacing', 'components/stresstest/info/head/sizes/gap'],
    [5, 'gridColumnGap', 'components/stresstest/info/tilesgrid/sizes/gap-col'],
    [5, 'gridRowGap', 'components/stresstest/info/tilesgrid/sizes/gap-rows'],
    [6, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [7, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [8, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [9, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [10, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [11, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [12, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [13, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [14, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [15, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [16, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [17, 'topLeftRadius', 'components/stresstest/info/tilesgrid/sizes/radius'],
    [18, 'topLeftRadius', 'components/stresstest/info/userinput/sizes/border-radius'],
    [18, 'paddingLeft', 'components/stresstest/info/userinput/sizes/padding-left'],
    [18, 'paddingRight', 'components/stresstest/info/userinput/sizes/padding-right'],
    [18, 'paddingTop', 'components/stresstest/info/userinput/sizes/padding-top'],
    [18, 'paddingBottom', 'components/stresstest/info/userinput/sizes/padding-bottom'],
    [20, 'topLeftRadius', 'components/stresstest/info/userinput/sizes/border-radius-tag'],
    [20, 'paddingLeft', 'components/stresstest/info/userinput/sizes/padding-x-tag'],
    [20, 'paddingTop', 'components/stresstest/info/userinput/sizes/padding-y-tag'],
    [23, 'itemSpacing', 'components/stresstest/info/textcolumns/sizes/gap'],
    [24, 'itemSpacing', 'components/stresstest/info/textcolumns/sizes/gap-col'],
    [28, 'itemSpacing', 'components/stresstest/info/textcolumns/sizes/gap-col'],
    [32, 'itemSpacing', 'components/stresstest/info/textcolumns/sizes/gap-col'],
    [36, 'height', 'components/stresstest/info/divider/sizes/height'],
    [36, 'maxWidth', 'components/stresstest/info/divider/sizes/max-width'],
    [37, 'itemSpacing', 'components/stresstest/info/tilelinkswrap/sizes/gap-x'],
    [37, 'gridRowGap', 'components/stresstest/info/tilelinkswrap/sizes/gap-y'],
    [45, 'height', 'components/stresstest/info/scalewrap/sizes/height'],
    [46, 'topLeftRadius', 'components/stresstest/info/scalewrap/sizes/radius-top-left'],
    [46, 'bottomLeftRadius', 'components/stresstest/info/scalewrap/sizes/radius-bottom-left'],
    [51, 'topRightRadius', 'components/stresstest/info/scalewrap/sizes/radius-top-right'],
    [51, 'bottomRightRadius', 'components/stresstest/info/scalewrap/sizes/radius-bottom-right'],
    [0, 'fills[0]', 'components/stresstest/info/base/colors/background'],
    [2, 'fills[0]', 'components/stresstest/info/head/colors/text'],
    [3, 'fills[0]', 'components/stresstest/info/head/colors/text'],
    [6, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [7, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [8, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [9, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [10, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [11, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [12, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [13, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [14, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [15, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [16, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [17, 'fills[0]', 'components/stresstest/info/tilesgrid/colors/tile'],
    [18, 'fills[0]', 'components/stresstest/info/userinput/colors/background'],
    [20, 'fills[0]', 'components/stresstest/info/userinput/colors/background-tag'],
    [21, 'fills[0]', 'components/stresstest/info/userinput/colors/text-color-tag'],
    [25, 'fills[0]', 'components/stresstest/info/textcolumns/colors/title'],
    [29, 'fills[0]', 'components/stresstest/info/textcolumns/colors/title'],
    [33, 'fills[0]', 'components/stresstest/info/textcolumns/colors/title'],
    [26, 'fills[0]', 'components/stresstest/info/textcolumns/colors/description'],
    [30, 'fills[0]', 'components/stresstest/info/textcolumns/colors/description'],
    [34, 'fills[0]', 'components/stresstest/info/textcolumns/colors/description'],
    [27, 'fills[0]', 'components/stresstest/info/textcolumns/colors/link'],
    [31, 'fills[0]', 'components/stresstest/info/textcolumns/colors/link'],
    [35, 'fills[0]', 'components/stresstest/info/textcolumns/colors/link'],
    [36, 'fills[0]', 'components/stresstest/info/divider/colors/background'],
    [46, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-1'],
    [47, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-2'],
    [48, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-3'],
    [49, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-4'],
    [50, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-5'],
    [51, 'fills[0]', 'components/stresstest/info/scalewrap/colors/scale-6'],
    [0, 'strokes[0]', 'components/stresstest/info/base/colors/border'],
    [0, 'strokeWeight', 'components/stresstest/info/base/sizes/border-width'],
    [18, 'strokes[0]', 'components/stresstest/info/userinput/colors/border'],
    [18, 'strokeWeight', 'components/stresstest/info/userinput/sizes/border-width'],
  ],
  usages: [[2, 'Title/Medium'], [3, 'Body/Medium'], [21, 'Label/Small'], [25, 'Body/Large'], [26, 'Body/Small'], [27, 'Label/Small'], [29, 'Body/Large'], [30, 'Body/Small'], [31, 'Label/Small'], [33, 'Body/Large'], [34, 'Body/Small'], [35, 'Label/Small']],
};

const TAG: ComposantDeTest = {
  id: 'tag',
  nom: 'Tag',
  variant: 'Outline',
  calques: [
    ['Tag', null, 'COMPONENT', [0, 0, 74, 25]],
    ['Label', 0, 'TEXT', [12, 3, 50, 17]],
  ],
  liaisons: [
    [0, 'strokes[0]', 'components/tag/outline/border'],
    [1, 'fills[0]', 'components/tag/outline/foreground'],
  ],
  usages: [],
  directes: [[0, 'paddingLeft', '11']],
};

const AVATAR: ComposantDeTest = {
  id: 'avatar',
  nom: 'Avatar',
  variant: 'Initiales',
  calques: [
    ['Avatar', null, 'COMPONENT', [0, 0, 44, 44]],
    ['Initiales', 0, 'TEXT', [12, 11, 20, 22]],
  ],
  liaisons: [],
  usages: [],
  directes: [[0, 'fills[0]', '#D7DBE3'], [1, 'fills[0]', '#434852'], [0, 'cornerRadius', '22']],
};

/** La lecture qu'un sandbox rendrait pour ce composant, avec le relevé des seules variables atteintes. */
function lectureDe(composant: ComposantDeTest): LectureDeComposant {
  const jetons = tableDesJetons();
  const c = constructeur(composant.nom);
  const collections = new Set<string>();
  const creees = new Set<string>();
  const creer = (id: string, depuis?: string): void => {
    if (creees.has(id)) return;
    creees.add(id);
    const jeton = jetons[id];
    if (!jeton) {
      c.manquee({ id, genre: 'variable', issue: 'introuvable', message: '', ...(depuis ? { depuis } : {}) });
      return;
    }
    const collection = id.slice(0, id.indexOf('/'));
    const modes = MODES[collection] ?? ['Valeur'];
    if (!collections.has(collection)) {
      collections.add(collection);
      c.collection(collection, collection, [...modes], { distante: true });
    }
    const [type, valeur] = jeton;
    c.variable(id, collection, id.slice(collection.length + 1), type, Object.fromEntries(modes.map((mode) => [mode, valeur])));
    if (valeur.nature === 'alias') creer(valeur.cible, id);
  };
  const idDe = (rang: number): string => `${composant.id}:${rang}`;
  const styles = [...new Set(composant.usages.map(([, style]) => style))];
  for (const [, , jeton] of composant.liaisons) creer(jeton);
  for (const style of styles) for (const [, jeton] of STYLES[style]) creer(jeton);
  return {
    sujet: { id: idDe(0), nom: composant.nom, type: 'COMPONENT', variant: composant.variant, variants: [] },
    ancetres: [],
    calques: composant.calques.map(([nom, parent, type, [x, y, largeur, hauteur], imbrique], rang) => ({
      id: idDe(rang),
      nom,
      type,
      parent: parent === null ? null : idDe(parent),
      modes: {},
      ...(imbrique ? { frontiere: { composant: imbrique } } : {}),
      boite: { x, y, largeur, hauteur },
    })),
    liaisons: composant.liaisons.map(([calque, propriete, variable]) => ({ calque: idDe(calque), propriete, variable })),
    styles: styles.map((style) => ({ id: `S:${style}`, nom: style, liaisons: STYLES[style].map(([champ, variable]) => ({ champ, variable })) })),
    usagesDeStyle: composant.usages.map(([calque, style]) => ({ calque: idDe(calque), style: `S:${style}` })),
    directes: (composant.directes ?? []).map(([calque, propriete, valeur]) => ({ calque: idDe(calque), propriete, valeur })),
    releve: c.releve(),
    calquesNonLus: 0,
    erreurs: [],
  };
}

/** Alert : 7 calques, 1 composant imbriqué, 10 lignes. */
export const composantSimple = (): LectureDeComposant => lectureDe(ALERT);

/** StressTest : 52 calques, 10 composants imbriqués, un token lié à 12 calques, 5 styles de texte, 52 lignes. */
export const composantComplexe = (): LectureDeComposant => lectureDe(STRESSTEST);

/** Button : 5 calques, 8 lignes, une chaîne à travers une collection à deux modes. */
export const composantBouton = (): LectureDeComposant => lectureDe(BUTTON);

/** TileLink : 2 calques, 5 lignes. */
export const composantTuile = (): LectureDeComposant => lectureDe(TILELINK);

/** Tag : une chaîne de cinq étapes, une chaîne interrompue sur une cible non lue, une valeur sans token. */
export const composantInterrompu = (): LectureDeComposant => lectureDe(TAG);

/** Avatar : aucun token, trois valeurs sans token. */
export const composantSansToken = (): LectureDeComposant => lectureDe(AVATAR);

/** Ce qu'un calque peint dans une image d'aperçu de test : sa boîte, sa couleur, et s'il s'agit d'un texte. */
export interface PeintureDeTest {
  readonly boite: BoiteDeCalque;
  readonly hexa: string;
  readonly texte: boolean;
  /** Vrai pour un contour : seul le bord de la boîte se peint. */
  readonly contour: boolean;
}

/** La couleur d'un composant imbriqué dans une image de test : ses calques ne sont pas lus. */
const GRIS_DES_FRONTIERES = '#C9CED6';

/**
 * Les peintures d'une lecture, parent avant enfant : la galerie en tire une
 * image schématique, à la place de celle que Figma exporterait.
 */
export function peinturesDe(lecture: LectureDeComposant): PeintureDeTest[] {
  const index = indexer(lecture.releve);
  const peintures: PeintureDeTest[] = [];
  for (const calque of lecture.calques) {
    if (!calque.boite) continue;
    if (calque.frontiere) {
      peintures.push({ boite: calque.boite, hexa: GRIS_DES_FRONTIERES, texte: false, contour: false });
      continue;
    }
    for (const propriete of ['fills[0]', 'strokes[0]']) {
      const liaison = lecture.liaisons.find((candidate) => candidate.calque === calque.id && candidate.propriete === propriete);
      const resultat = liaison ? resoudre(index, liaison.variable, {}) : null;
      const directe = lecture.directes.find((candidate) => candidate.calque === calque.id && candidate.propriete === propriete);
      const hexa = resultat?.statut === 'resolu' ? texteDeValeur(resultat.valeur) : directe?.valeur;
      if (hexa) peintures.push({ boite: calque.boite, hexa, texte: calque.type === 'TEXT', contour: propriete === 'strokes[0]' });
    }
  }
  return peintures;
}
