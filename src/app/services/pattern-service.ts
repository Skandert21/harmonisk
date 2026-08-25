import { Chord, Note } from 'tonal';
import { AnalisisAcorde } from './harmonic-engine.service';

export class PatternEngine {
  
  /**
   * Escanea un arreglo de acordes ya analizados buscando bloques de jazz (II-V y II-V-I)
   * Modifica las observaciones del arreglo original inyectando la información visual.
   */
  static detectarBloquesIIV(progresion: AnalisisAcorde[]): void {
    
    // Recorremos hasta el penúltimo acorde (necesitamos al menos mirar en pares)
    for (let i = 0; i < progresion.length - 1; i++) {
      const acorde1 = progresion[i];
      const acorde2 = progresion[i + 1];

      // 1. Extraer datos reales usando Tonal
      const dataA1 = Chord.get(acorde1.cifrado);
      const dataA2 = Chord.get(acorde2.cifrado);

      // 2. Validar las cualidades
      // El primero debe ser menor (m7, m7b5, etc.) y el segundo dominante (7, 9, 13)
      const esMenor = dataA1.quality === 'Minor' || dataA1.quality === 'Diminished' || dataA1.aliases.includes('m7b5');
      const esDominante = dataA2.aliases.includes('7') || dataA2.aliases.includes('dom7');

      if (!esMenor || !esDominante) continue; // Si no cumplen, saltamos a la siguiente pareja

      // 3. Validar el movimiento de la fundamental (El salto de Cuarta Justa Ascendente / Quinta Descendente)
      const chroma1 = Note.chroma(dataA1.tonic || '');
      const chroma2 = Note.chroma(dataA2.tonic || '');

      if (chroma1 === undefined || chroma2 === undefined) continue;

      // La distancia de un II a un V es siempre 5 semitonos hacia arriba (Ej: D -> G)
      const distanciaIIV = (chroma2 - chroma1 + 12) % 12;

      // ¡DETECTAMOS EL CORCHETE! (El bloque II-V)
      if (distanciaIIV === 5) {
        acorde1.observaciones.push(`Bloque Relativo: Forma un par [II - V] con el siguiente acorde (${acorde2.cifrado}).`);
        acorde2.observaciones.push(`Bloque Relativo: Precedido por su Segundo Relativo (${acorde1.cifrado}).`);

        // 4. Escanear si hay resolución al I (La Flecha)
        // Miramos si existe un tercer acorde en nuestra ventana
        if (i + 2 < progresion.length) {
          const acorde3 = progresion[i + 2];
          const dataA3 = Chord.get(acorde3.cifrado);
          const chroma3 = Note.chroma(dataA3.tonic || '');

          if (chroma3 !== undefined) {
            // La distancia de un V a un I es 7 semitonos hacia abajo (o 5 hacia arriba)
            const distanciaVI = (chroma3 - chroma2 + 12) % 12;
            
            if (distanciaVI === 5) {
              // ¡DETECTAMOS LA FLECHA! (La resolución de la pareja)
              acorde2.observaciones.push(`Resolución: Este bloque II-V resolvió perfectamente hacia el objetivo esperado (${acorde3.cifrado}).`);
            } else {
               // Resolución engañosa de bloque completo
               acorde2.observaciones.push(`Resolución Rota: El bloque II-V no resolvió al objetivo natural, dirigiéndose a ${acorde3.cifrado}.`);
            }
          }
        }
        
        // Saltamos un índice extra porque ya analizamos el acorde[i+1] como parte de esta pareja
        i++; 
      }
    }
  }
}