 /**import { Chord, Note } from 'tonal';
import { AnalisisAcorde } from './harmonic-engine-service';

export class ClassicalAnalysisEngine {
  
 
   * Escanea una progresión buscando resoluciones clásicas de Sextas Aumentadas
   * hacia el acorde de Dominante (V) de la tonalidad.
   
  static detectarSextasAumentadas(progresion: AnalisisAcorde[], tonicaBase: string): void {
    
    for (let i = 0; i < progresion.length - 1; i++) {
      const acordeActual = progresion[i];
      const acordeSiguiente = progresion[i + 1];

      // 1. Validar el destino: El acorde siguiente DEBE ser el Dominante (V)
      const chromaDestino = Note.chroma(acordeSiguiente.notas[0]); // Asumimos que la fundamental está en notas[0]
      const chromaTonica = Note.chroma(tonicaBase);
      
      if (chromaDestino === undefined || chromaTonica === undefined) continue;
      
      const esDestinoV = (chromaDestino - chromaTonica + 12) % 12 === 7;
      if (!esDestinoV) continue;

      // 2. Validar el origen: La Sexta Aumentada se construye sobre el bVI
      const chromaActual = Note.chroma(acordeActual.notas[0]);
      if (chromaActual === undefined) continue;

      const esOrigenBVI = (chromaActual - chromaTonica + 12) % 12 === 8;
      if (!esOrigenBVI) continue;

      // 3. Identificar el tipo exacto (Italiana, Francesa, Alemana)
      const intervalos = acordeActual.intervalos;
      let tipoSexta = '';
      let explicacionSexta = '';

      // NOTA: Tonal.js lee estos acordes como dominantes modernos, así que traducimos 
      // los intervalos modernos a su equivalente clásico.
      
      // Alemana: bVI, I, bIII, #IV (Se lee moderno como 1, 3, 5, b7 -> un dominante 7 puro)
      if (intervalos.includes('3M') && intervalos.includes('5P') && intervalos.includes('7m')) {
        tipoSexta = 'Sexta Aumentada Alemana (Gr+6)';
        explicacionSexta = 'Acorde predominante clásico. Resuelve al V grado mediante doble cromatismo (el bajo desciende medio tono y la sexta aumentada asciende medio tono). Enarmónicamente idéntico a un dominante con séptima menor.';
      }
      // Francesa: bVI, I, II, #IV (Se lee moderno como un 7(b5))
      else if (intervalos.includes('3M') && intervalos.includes('5d') && intervalos.includes('7m')) {
        tipoSexta = 'Sexta Aumentada Francesa (Fr+6)';
        explicacionSexta = 'Acorde predominante clásico que incluye dos tritonos. Conserva la segunda mayor de la tonalidad como nota común para anclar la resolución hacia el V grado.';
      }
      // Italiana: bVI, I, #IV (Falta la quinta)
      else if (intervalos.includes('3M') && !intervalos.includes('5P') && intervalos.includes('7m')) {
        tipoSexta = 'Sexta Aumentada Italiana (It+6)';
        explicacionSexta = 'La forma más pura y austera de la sexta aumentada (3 notas). Resuelve al V grado expandiendo el intervalo de sexta aumentada hacia una octava.';
      }

      // 4. Inyectar el análisis si se encontró una coincidencia
      if (tipoSexta) {
        // Si estuviéramos en un pipeline clásico puro, aquí sobreescribiríamos la funcionDiatonica
        acordeActual.funcionDiatonica = tipoSexta;
        acordeActual.explicacion = explicacionSexta;
        acordeActual.observaciones.push(`Contrapunto Clásico: Este acorde realiza una pinza cromática para resolver estructuralmente al Dominante (${acordeSiguiente.cifrado}).`);
      }
    }
  }
}
  */