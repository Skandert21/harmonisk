import { Component } from '@angular/core';

import { AnalysisResultComponent } from './components/analysis-result/analysis-result.component';
import { InputSectionComponent } from './components/input-section/input-section.component';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, InputSectionComponent, AnalysisResultComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
