import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { EngineStateService } from './services/engine-state-service';
import { NavbarComponent } from './components/navbar/navbar.component';
import { InputSectionComponent } from './components/input-section/input-section.component';
import { AnalysisResultComponent } from './components/analysis-result/analysis-result.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe, 
    NavbarComponent, 
    InputSectionComponent, 
    AnalysisResultComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  mostrarAviso: boolean = true;
  animandoCierre: boolean = false;

  cerrarAviso() {
    // 1. Disparamos la clase CSS para que haga la animación
    this.animandoCierre = true;
    
    // 2. Esperamos a que la animación termine (ej. 400ms) para quitarlo por completo del DOM
    setTimeout(() => {
      this.mostrarAviso = false;
    }, 400);
  }
}