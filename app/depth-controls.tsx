'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { studyRegions, type EarthView, type StudyRegion } from '@/lib/terra/spatial';

type Props = {
  view: EarthView; region: StudyRegion; depth: boolean; disabled: boolean;
  onView: (view: EarthView) => void; onRegion: (region: StudyRegion) => void; onDepth: (enabled: boolean) => void;
};

export function DepthControls({ view, region, depth, disabled, onView, onRegion, onDepth }: Props) {
  return <div className="depth-study" aria-label="Explore Earth's depth">
    <ToggleGroup type="single" value={view} onValueChange={value => { if (value) onView(value as EarthView); }} className="depth-views" aria-label="Earth perspective" disabled={disabled}>
      <ToggleGroupItem value="globe" aria-label="View the globe">Globe</ToggleGroupItem>
      <ToggleGroupItem value="oblique" aria-label="View along the surface">Horizon</ToggleGroupItem>
      <ToggleGroupItem value="cutaway" aria-label="View a cutaway">Cutaway</ToggleGroupItem>
    </ToggleGroup>
    <div className="depth-region">
      <Select value={region} onValueChange={value => onRegion(value as StudyRegion)} disabled={disabled}>
        <SelectTrigger aria-label="Explore a terrain region"><SelectValue /></SelectTrigger>
        <SelectContent className="depth-region-menu">{Object.entries(studyRegions).map(([id, place]) => <SelectItem key={id} value={id}>{place.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="depth-comparison"><label htmlFor="depth-enabled">{depth ? 'Sculpted Earth' : 'Surface reference'}</label><Switch id="depth-enabled" checked={depth} onCheckedChange={onDepth} disabled={disabled} aria-label="Show spatial depth" /></div>
    <p className="depth-note">Relief exaggerated · Interior imagined</p>
  </div>;
}
