export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'sus4' | 'seventh';

export interface Chord {
  name: string;
  root: string;
  quality: ChordQuality;
  intervals: number[];
}
