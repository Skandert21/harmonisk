import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Definimos los nombres exactos de nuestros motores
export type EngineMode = 'TRADICIONAL' | 'BARTOK';

@Injectable({
  providedIn: 'root'
})
export class EngineStateService {
  // Inicializa por defecto en TRADICIONAL
  private currentModeSource = new BehaviorSubject<EngineMode>('TRADICIONAL');
  
  // Observable que los componentes leerán
  public currentMode$ = this.currentModeSource.asObservable();

  constructor() {}

  // Función para cambiar el motor
  setMode(mode: EngineMode) {
    this.currentModeSource.next(mode);
  }
}