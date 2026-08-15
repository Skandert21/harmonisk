import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chord } from 'tonal';
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
  
  // 5. Selector de acordes
  opcionesAcordeDetectado: string[] = [];
  acordeSeleccionado: string = '';

  // --- MÉTODOS ---

  // Se ejecuta al pulsar "Llenar slots"
  aplicarPlantilla() {
    if (!this.templateRoot || !this.templateType) return;
    
    const nombreAcorde = this.templateRoot + this.templateType;
    const notas = Chord.get(nombreAcorde).notes; 

    // Llenamos los slots con las notas devueltas y vaciamos el resto
    for (let i = 0; i < 6; i++) {
      this.slots[i] = notas[i] || '';
    }

    // Llamamos a la detección sin argumentos, ella leerá los slots
    this.detectarAcorde();
  }

  // Se ejecuta cada vez que el usuario cambia un slot manualmente o usa la plantilla
  detectarAcorde() {
    const notasActivas = this.slots.filter(nota => nota !== '');
    
    if (notasActivas.length === 0) {
      this.opcionesAcordeDetectado = [];
      this.acordeSeleccionado = '';
      return;
    }

    // Pedimos a Tonal.js que adivine
    let posibles = Chord.detect(notasActivas);
    
    if (posibles.length > 0) {
      // 1. LIMPIEZA DEL BUG DE TONAL.JS (Doble barra)
      posibles = posibles.map(nombre => {
        // Si Tonal arroja aberraciones como "Am/ma7/G#", lo convertimos a "AmMaj7/G#"
        return nombre
          .replace(/\/ma7\//g, 'Maj7/')
          .replace(/\/m7\//g, 'm7/')
          .replace(/\/ma\//g, 'Maj/');
      });

      // 2. Ordenamos por longitud y quitamos duplicados por si acaso
      this.opcionesAcordeDetectado = [...new Set(posibles)].sort((a, b) => a.length - b.length);
      
      this.acordeSeleccionado = this.opcionesAcordeDetectado[0];
    } else {
      this.opcionesAcordeDetectado = [];
      this.acordeSeleccionado = 'Desconocido';
    }
  }

  // Se ejecuta al pulsar "+ Añadir a la pista"
  agregarAcorde() {
    if (
      this.progresionArray.length < 4 && 
      this.acordeSeleccionado && 
      this.acordeSeleccionado !== 'Desconocido'
    ) {
      // Ahora empujamos el acorde que el usuario validó en el <select>
      this.progresionArray.push(this.acordeSeleccionado);
      
      // Limpiamos los slots y la detección para el siguiente acorde
      this.slots = ['', '', '', '', '', ''];
      this.opcionesAcordeDetectado = [];
      this.acordeSeleccionado = '';
      this.templateRoot = '';
      this.templateType = '';
    }
  }

  eliminarAcorde(index: number) {
    this.progresionArray.splice(index, 1);
  }

  // --- EJECUCIÓN DEL ANÁLISIS ---
  ejecutarAnalisis() {
    if (this.progresionArray.length === 0) return;

    this.harmonicEngine.analizarProgresionContextual(
      this.progresionArray, 
      this.tonicaGlobal, 
      this.escalaGlobal
    );
  }
}