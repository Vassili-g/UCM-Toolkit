/** Les accès à Figma que plusieurs domaines du sandbox partagent. */
import type { NoeudLu } from '../consommateurs';
import { mesurerLePortDeLecture, type PortDeLecture } from '../lecture';

export const portDeLecture = (figma: PluginAPI): PortDeLecture => mesurerLePortDeLecture(figma.variables as unknown as PortDeLecture);

export const selectionLue = (figma: PluginAPI): readonly NoeudLu[] => figma.currentPage.selection as unknown as readonly NoeudLu[];
