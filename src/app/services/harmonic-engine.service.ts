import { Injectable } from '@angular/core';
import { Progression, Chord, Note } from 'tonal';
import { BehaviorSubject } from 'rxjs';

export interface AnalisisAcorde {
  cifrado: string;
  gradoRomano: string;
  funcionDiatonica: string;
  notas: string[];
  intervalos: string[]; // ¡Nuevo!
  explicacion: string;  // ¡Nuevo texto explicativo!
  observaciones: string[];
}

interface MemoriaArmonica {
  esperaResolucion: boolean;
  raizEsperada: string | null;
  tipoTension: string | null;
  indiceAnterior: number | null;
  cifradoAnterior: string | null; // Guardamos el nombre exacto del acorde anterior
  gradoAnterior: string | null;   // Guardamos el grado anterior para buscar cadencias
}

@Injectable({
  providedIn: 'root'
})
export class HarmonicEngineService {

  private resultadosSource = new BehaviorSubject<AnalisisAcorde[]>([]);
  public resultados$ = this.resultadosSource.asObservable();

  // Diccionario mejorado
 private funcionesMayor: { [grado: string]: string } = {
    'I': 'Tónica', 'IM': 'Tónica', 'Imaj7': 'Tónica',
    'II': 'Subdominante', 'IIm': 'Subdominante', 'IIm7': 'Subdominante',
    'III': 'Tónica (Débil)', 'IIIm': 'Tónica (Débil)', 'IIIm7': 'Tónica (Débil)',
    'IV': 'Subdominante', 'IVM': 'Subdominante', 'IVmaj7': 'Subdominante',
    'V': 'Dominante', 'VM': 'Dominante', 'V7': 'Dominante', 
    'VI': 'Tónica (Relativa)', 'VIm': 'Tónica (Relativa)', 'VIm7': 'Tónica (Relativa)',
    'VIIo': 'Sensible', 'VIIdim': 'Sensible', 'VIIm7b5': 'Sensible'
  };

  constructor() { }

  analizarProgresionContextual(progresion: string[], tonica: string, tipoEscala: string) {
    const resultado: AnalisisAcorde[] = [];
    const keyContext = tipoEscala === 'major' ? tonica : `${tonica}m`;
    const gradosRomanos = Progression.toRomanNumerals(keyContext, progresion);

    let memoria: MemoriaArmonica = {
      esperaResolucion: false, raizEsperada: null, tipoTension: null,
      indiceAnterior: null, cifradoAnterior: null, gradoAnterior: null
    };

    progresion.forEach((nombreAcorde, index) => {
      const dataAcorde = Chord.get(nombreAcorde);
      const grado = gradosRomanos[index];
      const observacionesAcorde: string[] = [];
      
      // 1. DETERMINAR FUNCIÓN DINÁMICA Y EXPLICACIÓN
      let funcionBase = this.funcionesMayor[grado];
      let textoExplicacion = '';

      if (!funcionBase) {
        // --- MOTOR COGNITIVO AVANZADO PARA ACORDES NO DIATÓNICOS ---
        
        const isDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');
        const isMajor = dataAcorde.quality === 'Major';
        const isMinor = dataAcorde.quality === 'Minor';
        
        // Extraemos la raíz exacta del número romano conservando bemoles/sostenidos (Ej: 'bII', 'IV', 'bVI')
        const rootRomanExact = grado.match(/^[b#]*[IV]+/i)?.[0]; 

        // A. ¿Es un Dominante Secundario?
        if (isDominant) {
          funcionBase = 'Dominante Secundario';
          textoExplicacion = 'Acorde con estructura de dominante (tritono interno) ajeno a la escala. Genera tensión direccional hacia un grado específico.';
        } 
        
        // B. Identificación Precisa de Intercambios Modales (Por Modo)
        else if (rootRomanExact === 'bII' && isMajor) {
          funcionBase = 'Intercambio Modal (Frigio / Napolitano)';
          textoExplicacion = 'Acorde prestado del modo Frigio. Conocido como Acorde Napolitano, aporta un color exótico oscuro y dramático, usado frecuentemente como subdominante para preparar una cadencia.';
        } else if (rootRomanExact === 'II' && isMajor) {
          funcionBase = 'Intercambio Modal (Lidio)';
          textoExplicacion = 'Acorde prestado del modo Lidio. Introduce la cuarta aumentada (#4) de la escala, brindando un carácter sumamente luminoso, flotante y sorpresivo.';
        } else if (rootRomanExact === 'bIII' && isMajor) {
          funcionBase = 'Intercambio Modal (Dórico / Eólico)';
          textoExplicacion = 'Acorde prestado de modos menores. Aporta un sonido épico o de rock/blues, introduciendo la tercera menor armónica directamente en una progresión mayor.';
        } else if (rootRomanExact === 'IV' && isMinor) {
          funcionBase = 'Intercambio Modal (Eólico)';
          textoExplicacion = 'Acorde prestado del modo menor natural. Oscurece la subdominante, creando una resolución melancólica y cinematográfica conocida como Cadencia Plagal Menor.';
        } else if (rootRomanExact === 'V' && isMinor) {
          funcionBase = 'Intercambio Modal (Mixolidio / Eólico)';
          textoExplicacion = 'Acorde prestado de modos menores/planos. Suprime la sensible (el tritono diatónico), eliminando la urgencia clásica de resolver para dar un ambiente más flotante y modal.';
        } else if (rootRomanExact === 'bVI' && isMajor) {
          funcionBase = 'Intercambio Modal (Eólico)';
          textoExplicacion = 'Acorde prestado del modo menor natural. Tiene un impacto épico y grandioso; engaña maravillosamente al oído tras un dominante o prepara un ascenso hacia el bVII.';
        } else if (rootRomanExact === 'bVII' && isMajor) {
          funcionBase = 'Intercambio Modal (Mixolidio)';
          textoExplicacion = 'Funciona como subtónica modal. Es una progresión insignia del rock y el pop para evitar la tensión agresiva del dominante tradicional, resolviendo a un tono de distancia de la tónica.';
        } else if (rootRomanExact === 'bV' && isMajor) { // <-- NUEVO: LOCRIO
          funcionBase = 'Intercambio Modal (Locrio)';
          textoExplicacion = 'Acorde prestado del modo Locrio (o equivalente a la nota blue). Introduce el tritono directamente en la fundamental, ofreciendo un sonido disonante, exótico y oscuro, muy utilizado en jazz y metal.';
         } 
        // C. ¿Es una Mediante Cromática? (Grados III o VI hechos Mayores)
        else if ((rootRomanExact === 'III' || rootRomanExact === 'VI') && isMajor) {
          let baseGrado = rootRomanExact.toUpperCase();
          funcionBase = `Mediante Cromática (${baseGrado})`;
          textoExplicacion = `Acorde cuya fundamental está a distancia de tercera mayor respecto a la tónica, compartiendo al menos una nota en común pero alterando la cualidad diatónica. Produce un cambio de color "mágico" o transicional sin funcionar como dominante.`;
        } 
        
        // D. Fallback: Cromatismo de paso
        else {
          funcionBase = 'Cromatismo / Acorde de Paso';
          textoExplicacion = 'Variación cromática transitoria. Generalmente actúa como un puente armónico lineal conectando dos acordes estructurales de la progresión.';
        }
      } else {
        // --- TEXTOS PARA ACORDES DIATÓNICOS ---
        if (funcionBase === 'Tónica') textoExplicacion = 'Representa el punto de máximo reposo, estabilidad y el "hogar" de la progresión.';
        else if (funcionBase === 'Subdominante') textoExplicacion = 'Genera un movimiento de alejamiento suave. Da color y actúa como puente de preparación antes de ir a una tensión mayor.';
        else if (funcionBase === 'Dominante') textoExplicacion = 'Contiene el punto máximo de tensión diatónica. Su inestabilidad genera urgencia por resolver imperativamente hacia la Tónica.';
        else if (funcionBase.includes('Tónica (Débil)')) textoExplicacion = 'Comparte notas clave con la tónica, pero su sensación de reposo es inestable o suspendida. Ideal para prolongar progresiones.';
        else if (funcionBase.includes('Tónica (Relativa)')) textoExplicacion = 'El centro menor de la tonalidad. Ofrece una base de reposo melancólico o alternativo a la tónica principal.';
        else if (funcionBase === 'Sensible') textoExplicacion = 'Acorde sumamente inestable y disonante por naturaleza debido a la presencia del tritono interno. Su destino natural es resolver al grado I.';
      }

// 2. EVALUAR EL PASADO (Cadencias y Resoluciones)
      if (memoria.cifradoAnterior && memoria.gradoAnterior) {
        
        const baseAnterior = memoria.gradoAnterior.match(/^[b#]*[IV]+/i)?.[0].toUpperCase();
        const baseActual = grado.match(/^[b#]*[IV]+/i)?.[0].toUpperCase();
        const isTargetDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');

        // Detectar Cadencias Clásicas
        if (baseAnterior === 'V' && baseActual === 'I' && !isTargetDominant) {
          observacionesAcorde.push(`Cadencia Auténtica: Fuerte resolución conclusiva del ${memoria.cifradoAnterior} hacia la tónica ${nombreAcorde}.`);
        } else if (baseAnterior === 'IV' && baseActual === 'I' && !isTargetDominant) {
          observacionesAcorde.push(`Cadencia Plagal: Resolución suave (estilo 'Amén') del ${memoria.cifradoAnterior} hacia la tónica ${nombreAcorde}.`);
        } else if (baseAnterior === 'V' && baseActual === 'VI' && !isTargetDominant) { 
          // <-- Al agregar !isTargetDominant, el A7 ya no lanzará este mensaje
          observacionesAcorde.push(`Cadencia Rota: El ${memoria.cifradoAnterior} generó tensión de dominante, pero engañó al oído resolviendo al grado VI (${nombreAcorde}) en vez del reposo esperado.`);
        }

        // Evaluar expectativas de Dominantes Secundarios
        if (memoria.esperaResolucion && memoria.raizEsperada) {
          if (dataAcorde.tonic === memoria.raizEsperada) {
            observacionesAcorde.push(`Resolución de ${memoria.tipoTension}: El ${memoria.cifradoAnterior} resolvió exitosamente de forma natural hacia el ${nombreAcorde}.`);
          } else {
            observacionesAcorde.push(`Resolución Engañosa: El ${memoria.cifradoAnterior} generó tensión hacia un ${memoria.raizEsperada}, pero el movimiento fue interrumpido por el ${nombreAcorde}.`);
          }
        }
      }

      // Limpiamos el flag de resolución de la iteración pasada
      memoria.esperaResolucion = false;
      memoria.raizEsperada = null;
      memoria.tipoTension = null;

      // 3. SETEAR EL FUTURO (¿Este acorde genera tensión para el que sigue?)
      if (dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7')) {
        memoria.esperaResolucion = true;
        memoria.tipoTension = grado === 'V7' ? 'Dominante Principal' : 'Dominante Secundario';
        if (dataAcorde.tonic) {
          memoria.raizEsperada = Note.transpose(dataAcorde.tonic, '4P'); // Esperamos salto de 4ta
        }
      }

      // Construimos el objeto del acorde actual
      const analisisActual: AnalisisAcorde = {
        cifrado: nombreAcorde,
        gradoRomano: grado,
        funcionDiatonica: funcionBase,
        notas: dataAcorde.notes,
        intervalos: dataAcorde.intervals, // ¡Extraemos los intervalos reales!
        explicacion: textoExplicacion,
        observaciones: observacionesAcorde
      };

      // Guardamos este acorde en la memoria para el siguiente ciclo
      memoria.cifradoAnterior = nombreAcorde;
      memoria.gradoAnterior = grado;
      memoria.indiceAnterior = index;
      
      resultado.push(analisisActual);
    });

    this.resultadosSource.next(resultado);
    return resultado;
  }
}