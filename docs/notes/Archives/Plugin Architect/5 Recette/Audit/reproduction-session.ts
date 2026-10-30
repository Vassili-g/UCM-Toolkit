import assert from 'node:assert/strict';
import { creerSession } from '../../../../../../packages/plugin-architect/src/nomenclature/session';
import { inventaireDeLectures } from '../../../../../../packages/plugin-architect/src/nomenclature/lecture';
import { serialiserRegle } from '../../../../../../packages/plugin-architect/src/nomenclature/regles';
import type { Bilan, PluginMessage } from '../../../../../../packages/plugin-architect/src/nomenclature/messages';

async function verifierSignature() {
  const collection = { id: 'c', name: 'custom', remote: false };
  const variable = { id: 'v', name: 'primaryBg', remote: false, variableCollectionId: 'c' };
  const stock = new Map<string, string>();
  const messages: PluginMessage[] = [];
  const convention = { casse: 'minuscules', separateur: 'tiret' } as const;
  const ecriture = serialiserRegle({ type: 'ecriture', ecriture: { groupes: convention, variables: convention } });
  stock.set(ecriture.cle, ecriture.texte!);
  const lecteur = { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined };
  let ajouterOrdinaire = false;
  const session = creerSession({
    envoyer: (message) => messages.push(message),
    tranches: { pause: async () => {} },
    port: {
      lecture: { collections: async () => [collection], variables: async () => [variable], ...lecteur },
      regles: {
        cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '',
        ecrire: (cle, texte) => { stock.set(cle, texte); }, effacer: (cle) => { stock.delete(cle); },
      },
      ecriture: { ouvrir: async () => {
        await Promise.resolve();
        if (ajouterOrdinaire) stock.set('ordinaire:primary-bg', JSON.stringify({ version: 1 }));
        return {
          inventaire: inventaireDeLectures([collection], [variable], lecteur),
          collection: () => collection, variable: () => variable, commitUndo: () => {},
        };
      } },
    },
  });
  const bilan = (): Bilan => {
    const message = messages.filter((m) => m.type === 'bilan').at(-1);
    assert.ok(message?.type === 'bilan');
    return message.bilan;
  };
  await session.recevoir({ type: 'analyser', demande: 1 });
  const avant = bilan();
  await session.recevoir({ type: 'lignes', demande: 2, generation: avant.generation, groupe: avant.groupes[0]!.cle, debut: 0 });
  const lignes = messages.filter((m) => m.type === 'lignes').at(-1);
  assert.ok(lignes?.type === 'lignes');
  assert.ok(lignes.lignes.some((ligne) => ligne.nouveau === 'primary-background'), JSON.stringify(lignes));
  ajouterOrdinaire = true;
  await session.recevoir({ type: 'appliquer', demande: 3, generation: avant.generation,
    selection: { groupes: avant.groupes.map((g) => g.cle), exclus: [], inclus: [] } });
  assert.equal(stock.has('ordinaire:primary-bg'), true);
  assert.equal(messages.some((m) => m.type === 'erreur' && m.demande === 3 && m.code === 'regles-modifiees'), true);
  assert.equal(variable.name, 'primaryBg');
  console.log('S1 : règle ordinaire ajoutée pendant ouvrir ; lot refusé en regles-modifiees, nom inchangé :', variable.name);
  await session.recevoir({ type: 'analyser', demande: 4 });
  const frais = bilan();
  for (const groupe of frais.groupes) {
    await session.recevoir({ type: 'lignes', demande: 5, generation: frais.generation, groupe: groupe.cle, debut: 0 });
  }
  const nouvelles = messages.filter((m) => m.type === 'lignes' && m.demande === 5);
  assert.ok(nouvelles.some((m) => m.type === 'lignes' && m.lignes.some((l) => l.nouveau === 'primary-bg')), JSON.stringify(nouvelles));
  console.log('S1 : le calcul frais avec les mêmes règles propose primary-bg.');
}

verifierSignature().catch((cause) => { console.error(cause); process.exitCode = 1; });
