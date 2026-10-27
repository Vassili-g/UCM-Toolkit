/** Le monde fabriqué, avec un axe d'états aux valeurs inconnues et deux propriétés qui se confondent. */
import { fabriquerLeMonde } from './mondeFabrique';

/** Le jeu `Button` du monde fabriqué, avec un axe `State` aux valeurs inconnues et deux propriétés qui se confondent. */
export function monterLeMonde() {
  const monde = fabriquerLeMonde();
  const jeu = monde.jeu as unknown as { children: Array<{ name: string; variantProperties: Record<string, string> }>; componentPropertyDefinitions: unknown };
  for (const variant of jeu.children) {
    variant.variantProperties = { State: variant.variantProperties.Etat };
    variant.name = `State=${variant.variantProperties.State}`;
  }
  jeu.componentPropertyDefinitions = {
    State: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol', 'Inactif'] },
    'Avec icone#1:2': { type: 'BOOLEAN', defaultValue: true },
    'Icon Left#1:3': { type: 'TEXT', defaultValue: 'a' },
    'icon-left#1:4': { type: 'TEXT', defaultValue: 'b' },
  };
  return monde;
}
