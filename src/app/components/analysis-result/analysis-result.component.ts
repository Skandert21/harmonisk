import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarmonicEngineService } from '../../services/harmonic-engine.service';

@Component({
  selector: 'app-analysis-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-result.component.html',
  styleUrls: ['./analysis-result.component.scss']
})
export class AnalysisResultComponent {
  private harmonicEngine = inject(HarmonicEngineService);

  public resultados$ = this.harmonicEngine.resultados$;
}