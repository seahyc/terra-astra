'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { catalogueLabel, cataloguePlace, placeCatalogue, type CataloguePlace } from '@/lib/personal/catalogue';
import { personalPlaceRoles, validatePersonalPlaces } from '@/lib/personal/model';
import type { PersonalConstellationFormProps, PersonalPlaces } from '@/lib/terra/personal-contract';
import styles from './personal-constellation-form.module.css';

type DraftPlace = { id: string; meaning: string };

function initialDraft(initialValue?: PersonalPlaces): DraftPlace[] {
  const checked = validatePersonalPlaces(initialValue);
  return personalPlaceRoles.map((meaning, index) => checked.ok
    ? { id: checked.places[index].id, meaning: checked.places[index].meaning }
    : { id: '', meaning });
}

function PlacePicker({ id, value, disabled, unavailableIds, describedBy, onSelect }: {
  id: string;
  value: CataloguePlace | null;
  disabled: boolean;
  unavailableIds: readonly string[];
  describedBy: string;
  onSelect: (place: CataloguePlace | null) => void;
}) {
  const [query, setQuery] = useState(value ? catalogueLabel(value) : '');
  return <Combobox<CataloguePlace>
    items={placeCatalogue}
    value={value}
    inputValue={query}
    disabled={disabled}
    autoHighlight={false}
    itemToStringLabel={catalogueLabel}
    itemToStringValue={place => place.id}
    isItemEqualToValue={(a, b) => a.id === b.id}
    filter={(place, search) => {
      const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalize(`${catalogueLabel(place)} ${place.searchNames}`).includes(normalize(search.trim()));
    }}
    onInputValueChange={(text, details) => {
      if (disabled) return;
      setQuery(text);
      if (details.reason === 'input-change') onSelect(null);
    }}
    onValueChange={place => {
      if (disabled || (place && unavailableIds.includes(place.id))) return;
      onSelect(place);
      setQuery(place ? catalogueLabel(place) : '');
    }}
  >
    <ComboboxInput id={id} className={styles.input} disabled={disabled} placeholder="Search a city or Singapore place" aria-describedby={describedBy} autoComplete="off" />
    <ComboboxContent className={styles.popup}>
      <ComboboxEmpty className={styles.empty}>No listed place matches. Try a nearby city.</ComboboxEmpty>
      <ComboboxList className={styles.options}>
        {(place: CataloguePlace) => <ComboboxItem key={place.id} value={place} disabled={disabled || unavailableIds.includes(place.id)} className={styles.option}>
          <span>{place.label}<span className={styles.region}>{place.region}{unavailableIds.includes(place.id) ? ' · already chosen' : ''}</span></span>
        </ComboboxItem>}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>;
}

/** Draft state is local. Reset never submits null or removes a rendered constellation. */
export function PersonalConstellationForm({ initialValue, disabled, onSubmit, onReset }: PersonalConstellationFormProps) {
  const id = useId();
  const [draft, setDraft] = useState(() => initialDraft(initialValue));
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const chosenCount = draft.filter(place => place.id).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const checked = validatePersonalPlaces(draft);
    if (!checked.ok) {
      setError(checked.error);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setError('');
    onSubmit(checked.places);
  }

  function reset() {
    if (disabled) return;
    setDraft(initialDraft());
    setResetKey(key => key + 1);
    setError('');
    onReset();
  }

  return <form className={styles.form} onSubmit={submit} aria-labelledby={`${id}-title`} aria-busy={disabled}>
    <div className={styles.heading}>
      <h2 id={`${id}-title`}>Your place in the stars.</h2>
      <p>Three places. One constellation that could only be yours.</p>
    </div>
    <div className={styles.fields}>
      {personalPlaceRoles.map((role, index) => <div className={styles.field} key={`${resetKey}-${index}`}>
        <label htmlFor={`${id}-place-${index}`}>{role}</label>
        <PlacePicker
          id={`${id}-place-${index}`}
          value={cataloguePlace(draft[index].id) ?? null}
          disabled={disabled}
          unavailableIds={draft.filter((_, other) => other !== index).map(place => place.id)}
          describedBy={`${id}-catalogue${error ? ` ${id}-error` : ''}`}
          onSelect={place => {
            if (disabled) return;
            setDraft(current => current.map((item, other) => other === index ? { ...item, id: place?.id ?? '' } : item));
            setError('');
          }}
        />
      </div>)}
    </div>
    <p id={`${id}-catalogue`} className={styles.catalogueNote}>Choose three different places from our {placeCatalogue.length}-place catalogue. Unlisted places are not available yet.</p>
    <p id={`${id}-error`} className={styles.error} role="alert" tabIndex={-1} ref={errorRef} hidden={!error}>{error}</p>
    <div className={styles.actions}>
      <button className={styles.submit} type="submit" disabled={disabled}>Make my constellation <ArrowUpRight size={17} aria-hidden="true" /></button>
      <button className={styles.reset} type="button" onClick={reset} disabled={disabled} aria-label="Reset place choices"><RotateCcw size={15} aria-hidden="true" /><span>Reset choices</span></button>
    </div>
    <div className={styles.footnote}>
      <span role="status" aria-live="polite">{disabled ? 'Your stars are settling…' : `${chosenCount} of 3 places chosen`}</span>
      <details className={styles.sources}>
        <summary>Place sources</summary>
        <p>City points: <a href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/" target="_blank" rel="noreferrer">Natural Earth</a> (public domain). Singapore localities: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>). These are representative place points, not exact addresses.</p>
      </details>
    </div>
  </form>;
}
