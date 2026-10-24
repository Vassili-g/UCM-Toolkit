/** Les interactions du domaine commun : les surfaces sombres et la bascule des deux modes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, envoyer, avecReleve, fermer, choisir, lecturesDemandees, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { projetLibre, composantSimple } = fixtures;

test('les surfaces restent sombres sous un hôte clair comme sous un hôte sombre', async () => {
  for (const classe of ['', 'figma-dark']) {
    const page = await ouvrir({ classe });
    try {
      await avecReleve(page, projetLibre());
      const fonds = await page.evaluate(() => ['body', '.barre', '.centre', '.panneau-lateral', '.recherche'].map((selecteur) => getComputedStyle(document.querySelector(selecteur)).backgroundColor));
      for (const fond of fonds) {
        const [r, g, b] = fond.match(/\d+/g).map(Number);
        assert.ok(r < 80 && g < 80 && b < 80, `${classe || 'clair'} : ${fond}`);
      }
    } finally { await fermer(page); }
  }
});

test('la bascule passe de l’explorateur de tokens à la vue composant, qui lit alors la sélection, puis revient', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const dispositions = async () => {
      await page.waitForTimeout(30);
      return page.evaluate(() => window.demandes.filter((demande) => demande.type === 'changer-disposition').map((demande) => demande.disposition));
    };
    const alert = composantSimple();
    await envoyer(page, choisir(alert));
    assert.deepEqual(await lecturesDemandees(page), []);
    assert.equal(await page.getByRole('button', { name: 'Tokens' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Composant' }).click();
    assert.deepEqual(await dispositions(), ['etroite']);
    assert.deepEqual(await lecturesDemandees(page), [[2, null]]);
    await envoyer(page, { type: 'composant', demande: 2, lecture: alert });
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'Alert');
    assert.equal(await page.locator('.arbre').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).count(), 0);
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'Alert');
    await page.getByRole('button', { name: 'Tokens' }).click();
    assert.deepEqual(await dispositions(), ['etroite', 'large']);
    assert.equal(await page.locator('.vc').count(), 0);
    assert.equal(await page.locator('.table-titre').textContent(), 'Interface');
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).isVisible(), true);
  } finally { await fermer(page); }
});

test('un fichier hors UCM remplace les onglets de la barre latérale par l’alerte, sans renommage dans la table ; la Configuration reste ouverte', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await envoyer(page, { type: 'declaration', architecture: 'absente' });
    assert.equal(await page.getByText('Ce fichier n’est pas déclaré UCM.').isVisible(), true);
    assert.equal(await page.locator('.panneau-lateral .onglets:has(#onglet-a-appliquer)').isVisible(), false);
    assert.equal(await page.locator('.table-ligne .ch-lien').count(), 0);
    await page.getByRole('button', { name: 'Déclarer dans la Configuration' }).click();
    assert.equal(await page.getByText('Ce fichier n’est pas déclaré UCM.').isVisible(), false);
    assert.equal(await page.locator('.panneau-lateral .header-back-button').isVisible(), true);
    await page.locator('.panneau-lateral .header-back-button').click();
    assert.equal(await page.getByText('Ce fichier n’est pas déclaré UCM.').isVisible(), true);
    await envoyer(page, { type: 'declaration', architecture: 'ucm' });
    assert.equal(await page.getByText('Ce fichier n’est pas déclaré UCM.').isVisible(), false);
  } finally { await fermer(page); }
});
