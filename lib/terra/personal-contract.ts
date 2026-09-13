/** Shared sprint boundary. Coordinates come only from the curated catalogue. */
export type PersonalPlace = Readonly<{
  id: string;
  label: string;
  lat: number;
  lon: number;
  meaning: string;
}>;
export type PersonalPlaces = readonly [PersonalPlace, PersonalPlace, PersonalPlace];
export type TransformationState = Readonly<{
  phase: 'terra' | 'opening' | 'astra' | 'reforming';
  progress: number;
  busy: boolean;
}>;
export type PersonalConstellationFormProps = {
  initialValue?: PersonalPlaces;
  disabled: boolean;
  onSubmit: (places: PersonalPlaces) => void;
  onReset: () => void;
};
