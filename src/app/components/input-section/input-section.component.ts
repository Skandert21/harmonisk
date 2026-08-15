import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chord } from 'tonal';
// Asegúrate de que esta ruta apunte correctamente a tu servicio
import { HarmonicEngineService } from '../../services/harmonic-engine.service'; 

@Component({
  selector: 'app-input-section',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './input-section.component.html',
  styleUrl: './input-section.component.scss'
})
export class InputSectionComponent {
  // --- INYECCIÓN DEL MOTOR ARMÓNICO ---
  private harmonicEngine = inject(HarmonicEngineService);

  // --- VARIABLES GLOBALES DE TONALIDAD ---
  tonicaGlobal: string = 'C';
  escalaGlobal: string = 'major';

  // 1. Catálogo de notas para llenar los selectores automáticamente
  notasCromaticas: string[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

  // 2. Estado de los 6 huecos (slots)
  slots: string[] = ['', '', '', '', '', ''];

  // 3. Estado de la plantilla rápida
  templateRoot: string = '';
  templateType: string = '';

  // 4. Estado general
  progresionArray: string[] = [];
  acordeDetectado: string = '';

  // --- MÉTODOS ---

  // Se ejecuta al pulsar "Llenar slots"
  aplicarPlantilla() {
    if (!this.templateRoot || !this.templateType) return;
    
    const nombreAcorde = this.templateRoot + this.templateType;
    const notas = Chord.get(nombreAcorde).notes; // Tonal.js hace la magia aquí

    // Llenamos los slots con las notas devueltas y vaciamos el resto
    for (let i = 0; i < 6; i++) {
      this.slots[i] = notas[i] || '';
    }

    // Forzamos la detección con las nuevas notas
    this.detectarAcorde();
  }

  // Se ejecuta cada vez que el usuario cambia un slot manualmente
  detectarAcorde() {
    // Filtramos los huecos que estén vacíos
    const notasActivas = this.slots.filter(nota => nota !== '');
    
    if (notasActivas.length < 3) {
      this.acordeDetectado = '';
      return;
    }

    // Tonal.js detecta posibles nombres de acordes
    const detectados = Chord.detect(notasActivas);
    
    // Si encuentra coincidencias, tomamos la primera (la más probable)
    this.acordeDetectado = detectados.length > 0 ? detectados[0] : 'Desconocido';
  }

  // Se ejecuta al pulsar "+ Añadir a la pista"
  agregarAcorde() {
    if (
      this.progresionArray.length < 4 && 
      this.acordeDetectado && 
      this.acordeDetectado !== 'Desconocido'
    ) {
      this.progresionArray.push(this.acordeDetectado);
      
      // Limpiamos los slots y la detección para el siguiente acorde
      this.slots = ['', '', '', '', '', ''];
      this.acordeDetectado = '';
      this.templateRoot = '';
      this.templateType = '';
    }
  }

  eliminarAcorde(index: number) {
    this.progresionArray.splice(index, 1);
  }

  // --- NUEVO: EJECUCIÓN DEL ANÁLISIS ---
  ejecutarAnalisis() {
    // Si no hay acordes en la pista, no hacemos nada
    if (this.progresionArray.length === 0) return;

    // Mandamos la progresión y la tonalidad al motor para que calcule
    this.harmonicEngine.analizarProgresionContextual(
      this.progresionArray, 
      this.tonicaGlobal, 
      this.escalaGlobal
    );
  }
}