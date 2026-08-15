export interface AnalysisResult {
  title: string;
  key: string;
  type: string;
  summary: string;
  cadences: string[];
  complexity: 'Simple' | 'Moderada' | 'Compleja';
  chords: string[];
}
