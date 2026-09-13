import type { PersonalPlace, PersonalPlaces } from '../terra/personal-contract';
import { catalogueLabel, cataloguePlace } from './catalogue';

export const personalPlaceRoles = [
  'A place that shaped me',
  'A place I call home',
  'A place I am drawn toward',
] as const;

export type PersonalValidation =
  | { ok: true; places: PersonalPlaces }
  | { ok: false; error: string };

/** Resolve trusted coordinates by ID. Supplied coordinates must match the catalogue. */
export function validatePersonalPlaces(input: unknown): PersonalValidation {
  if (!Array.isArray(input) || input.length !== 3) {
    return { ok: false, error: 'Choose one place for each of the three parts of your story.' };
  }
  const resolved: PersonalPlace[] = [];
  const selectedIds = new Set<string>();
  for (let index = 0; index < 3; index++) {
    const item: unknown = input[index];
    if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'string') {
      return { ok: false, error: `Choose a place from the list for “${personalPlaceRoles[index]}”.` };
    }
    const place = cataloguePlace(item.id);
    if (!place) {
      return { ok: false, error: `Choose a listed place for “${personalPlaceRoles[index]}”. Typed places outside the catalogue cannot become stars yet.` };
    }
    if (('lat' in item || 'lon' in item) && (!('lat' in item) || !('lon' in item) || item.lat !== place.lat || item.lon !== place.lon)) {
      return { ok: false, error: 'A place’s coordinates do not match the catalogue. Choose that place again from the list.' };
    }
    if (selectedIds.has(place.id)) {
      return { ok: false, error: 'Choose three different places so each part of your story has its own star.' };
    }
    if (!('meaning' in item) || typeof item.meaning !== 'string' || !item.meaning.trim()) {
      return { ok: false, error: `Add a meaning for “${personalPlaceRoles[index]}”.` };
    }
    const meaning = item.meaning.trim();
    if (meaning.length > 80) {
      return { ok: false, error: 'Keep each place’s meaning to 80 characters or fewer.' };
    }
    selectedIds.add(place.id);
    resolved.push(Object.freeze({ id: place.id, label: catalogueLabel(place), lat: place.lat, lon: place.lon, meaning }));
  }
  return { ok: true, places: Object.freeze([resolved[0], resolved[1], resolved[2]]) };
}
