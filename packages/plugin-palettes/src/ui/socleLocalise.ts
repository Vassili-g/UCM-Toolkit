/** Les libellés du socle sont liés au contexte de Palettes sans changer Exporter. */
import { createButton as bouton, type OptionsBouton } from 'ucm-plugin-socle/src/ui/Button';
import { createOnglets as onglets, type DefinitionOnglet } from 'ucm-plugin-socle/src/ui/Onglets';
import { createInterrupteur as interrupteur } from 'ucm-plugin-socle/src/ui/Interrupteur';
import { createSettingsButton as reglages, createBackButton as retour } from 'ucm-plugin-socle/src/ui/EnTete';
import { lireTexte, type Localisation, type Texte } from './localisation';

export function creerSocleLocalise(i18n: Localisation) {
  return {
    createButton(options: Omit<OptionsBouton, 'label'> & { label: Texte }) {
      const element = bouton({ ...options, label: '' });
      const libelle = element.firstElementChild!;
      const setLabel = (texte: Texte) => i18n.lier(libelle, 'textContent', texte);
      setLabel(options.label);
      return Object.assign(element, { setLabel });
    },
    createOnglets<Id extends string>(etiquette: Texte, definitions: (Omit<DefinitionOnglet<Id>, 'libelle'> & { libelle: Texte })[], selection?: (id: Id) => void) {
      const resultat = onglets(lireTexte(etiquette), definitions.map((definition) => ({ ...definition, libelle: lireTexte(definition.libelle) })), selection);
      i18n.lier(resultat.liste, 'aria-label', etiquette);
      resultat.liste.querySelectorAll('[role="tab"]').forEach((element, index) => i18n.lier(element, 'textContent', definitions[index].libelle));
      return resultat;
    },
    createInterrupteur(id: string, libelle: Texte, aide: Texte, changer: (active: boolean) => void) {
      const resultat = interrupteur(id, '', '', changer);
      i18n.lier(resultat.element.querySelector('.field-label')!, 'textContent', libelle);
      i18n.lier(resultat.element.querySelector('.field-help')!, 'textContent', aide);
      return resultat;
    },
    createSettingsButton(ouvrir: () => void, libelles: { etiquette: Texte; infobulle: Texte }) {
      const element = reglages(ouvrir);
      i18n.lier(element, 'aria-label', libelles.etiquette);
      i18n.lier(element, 'title', libelles.infobulle);
      return element;
    },
    createBackButton(ouvrir: () => void, libelle: Texte) {
      const element = retour(ouvrir);
      i18n.lier(element, 'textContent', libelle);
      return element;
    },
  };
}
