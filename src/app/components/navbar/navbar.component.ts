import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common'; // <-- Necesario para leer el estado
import { EngineStateService, EngineMode } from '../../services/engine-state-service'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe], // <-- Importante agregarlo aquí
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private engineState = inject(EngineStateService);

  // Conectamos la variable mode$ directamente al servicio
  mode$ = this.engineState.currentMode$;

  cambiarMotor(modo: EngineMode) {
    this.engineState.setMode(modo);
  }
}