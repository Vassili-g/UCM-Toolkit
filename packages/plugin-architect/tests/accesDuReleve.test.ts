/**
 * L'enregistrement des accès du relevé (16.15), sur la capture d'un monde fabriqué : un jeu `Button` de trois variants, un
 * texte à plages liées, une instance d'un maître de library avec des surcharges, des variables locales et de library, un
 * style de texte. La validation d'Analyser relit chaque couple nœud et champ et chaque appel que le relevé complet lit ;
 * une validation qui saute le relevé, les variables ou les cibles de surcharges laisse des couples hors couverture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { capturerLeComposant, type CaptureArchitect } from '../src/sandbox/capture';
import { sessionDesAnalyses } from '../src/sandbox/analyse';
import { enregistrerLesAccesDuReleve } from './outils/accesDuReleve';
import { fabriquerLeMonde } from './outils/mondeFabrique';

const globale = globalThis as { figma?: unknown };

async function capturer(options: Parameters<typeof fabriquerLeMonde>[0] = {}): Promise<CaptureArchitect> {
  const monde = fabriquerLeMonde(options);
  // Une peinture mixte est une manquée, et une entrée qui en porte est à relire : le texte du monde reçoit des peintures lisibles.
  const texte = monde.texte as unknown as Record<string, unknown> & { getStyledTextSegments: (champs: string[]) => Record<string, unknown>[] };
  Object.defineProperty(texte, 'fills', { value: [], configurable: true, enumerable: true });
  const segments = texte.getStyledTextSegments;
  texte.getStyledTextSegments = (champs) => segments(champs).map((segment) => (segment.fills === monde.figma.mixed ? { ...segment, fills: [] } : segment));
  // La variable de library ne se lit qu'importée : sans l'import, le relevé la manque et l'entrée est à relire.
  const importee = await monde.figma.variables.importVariableByKeyAsync('cle-lib-v');
  const precedent = globale.figma;
  globale.figma = monde.figma;
  try {
    const capture = await capturerLeComposant(monde.figma as unknown as PluginAPI, { jeu: monde.jeu, page: monde.page, imports: new Map([['cle-lib-v', { valeur: importee }]]) } as never);
    return JSON.parse(JSON.stringify(capture)) as CaptureArchitect;
  } finally {
    globale.figma = precedent;
  }
}

test('la validation du relevé relit chaque couple nœud et champ et chaque appel du relevé complet, et le reprend', async () => {
  const bilan = await enregistrerLesAccesDuReleve(await capturer());
  assert.deepEqual(bilan.releve, ['repriseDuReleve'], 'l’entrée d’Actualiser est utilisable : Analyser la valide');
  assert.deepEqual(bilan.horsCouverture, []);
  assert.ok(bilan.lus > 50, `${bilan.lus} couples lus`);
  for (const champ of ['boundVariables', 'fills', 'strokes', 'absoluteBoundingBox', 'opacity', 'visible', 'strokeWeight', 'resolvedVariableModes', 'overrides', 'getStyledTextSegments', 'getVariableByIdAsync', 'getVariableCollectionByIdAsync', 'getMainComponentAsync', 'getNodeByIdAsync', 'getStyleByIdAsync']) {
    assert.ok((bilan.champs[champ] ?? 0) > 0, `le monde fait lire ${champ} au relevé`);
  }
});

test('le jeu d’un wrapper de dimensions posé dans le composant est relu par la validation, comme le reste du relevé', async () => {
  const sans = await enregistrerLesAccesDuReleve(await capturer());
  const avec = await enregistrerLesAccesDuReleve(await capturer({ avecWrapper: true }));
  assert.deepEqual(avec.releve, ['repriseDuReleve']);
  assert.deepEqual(avec.horsCouverture, []);
  assert.ok(avec.lus > sans.lus, `${avec.lus} couples lus contre ${sans.lus}`);
  assert.ok((avec.champs.boundVariables ?? 0) >= (sans.champs.boundVariables ?? 0) + 3, 'l’instance et les deux variants du wrapper lisent leurs liaisons');
});

test('une validation qui reprend le relevé sans le relire laisse ses lectures de nœuds hors couverture, la prélecture n’en relit que les ressources', async () => {
  const bilan = await enregistrerLesAccesDuReleve(await capturer(), (lecteurs) => ({
    ...lecteurs,
    async releve(sujet, ...reste) {
      const retenue = sessionDesAnalyses().entree(sujet.cle);
      return retenue ? { statut: 'lu', releve: retenue.sorties.releve } : lecteurs.releve(sujet, ...reste);
    },
  }));
  for (const champ of ['boundVariables', 'fills', 'strokes', 'absoluteBoundingBox', 'opacity', 'visible', 'strokeWeight', 'resolvedVariableModes', 'overrides', 'getStyledTextSegments']) {
    assert.ok(bilan.horsCouverture.some((couple) => couple.endsWith(`.${champ}`) || couple.includes(`.${champ}(`)), `${champ} n’est pas relu`);
  }
});

test('une validation qui sert les variables, ou les cibles de surcharges, de la demande précédente sans les relire laisse leurs appels hors couverture', async () => {
  for (const [methode, ressource] of [['getVariableByIdAsync', 'variables'], ['getNodeByIdAsync', null]] as const) {
    const bilan = await enregistrerLesAccesDuReleve(await capturer(), (lecteurs, figma) => {
      const cible = (ressource ? figma[ressource] : figma) as Record<string, (id: string) => Promise<unknown>>;
      const lire = cible[methode];
      const gardees = new Map<string, Promise<unknown>>();
      // Une copie gardée d'une demande à l'autre : l'appel du double, qui note la lecture, n'a lieu qu'une fois.
      cible[methode] = (id) => { if (!gardees.has(id)) gardees.set(id, lire(id)); return gardees.get(id)!; };
      return lecteurs;
    });
    assert.ok(bilan.horsCouverture.length > 0, methode);
    assert.ok(bilan.horsCouverture.every((couple) => couple.includes(`${methode}(`)), `${methode} : ${bilan.horsCouverture.join(', ')}`);
  }
});
