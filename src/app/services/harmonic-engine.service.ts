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
  raizAnterior: string | null;
  tipoTension: string | null;
  indiceAnterior: number | null;
  cifradoAnterior: string | null; 
  gradoAnterior: string | null;   
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

    // INICIALIZACIÓN CORREGIDA (usando raizAnterior en lugar de raizEsperada)
    let memoria: MemoriaArmonica = {
      esperaResolucion: false, 
      raizAnterior: null, 
      tipoTension: null,
      indiceAnterior: null, 
      cifradoAnterior: null, 
      gradoAnterior: null
    };

    progresion.forEach((nombreAcorde, index) => {
      const dataAcorde = Chord.get(nombreAcorde);
      const grado = gradosRomanos[index];
      const observacionesAcorde: string[] = [];
      
      // 1. DETERMINAR FUNCIÓN DINÁMICA Y EXPLICACIÓN
      let funcionBase = this.funcionesMayor[grado];
      let textoExplicacion = '';

      if (!funcionBase) {
        const isDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');
        const isMajor = dataAcorde.quality === 'Major';
        const rootRomanExact = grado.match(/^[b#]*[IV]+/i)?.[0]; 

        
        
        if (rootRomanExact === 'bVII' && isDominant) {
          funcionBase = 'Backdoor Dominant (bVII7)';
          textoExplicacion = 'Acorde dominante construido sobre el séptimo grado bemol (bVII7). Aunque tiene estructura de dominante, funciona armónicamente como una subdominante menor que aporta un color sofisticado, ideal para cadencias hacia la tónica.';
        } 
        else if (isDominant) {
          funcionBase = 'Dominante Secundario';
          textoExplicacion = 'Acorde con estructura de dominante (tritono interno) ajeno a la escala. Genera tensión direccional hacia un grado específico.';
        } else if (rootRomanExact === 'bII' && isMajor) {
          funcionBase = 'Intercambio Modal (Frigio / Napolitano)';
          textoExplicacion = 'Acorde prestado del modo Frigio. Conocido como Acorde Napolitano, aporta un color exótico oscuro y dramático.';
        } else if (rootRomanExact === 'II' && isMajor) {
          funcionBase = 'Intercambio Modal (Lidio)';
          textoExplicacion = 'Acorde prestado del modo Lidio. Introduce la cuarta aumentada (#4) de la escala.';
        } else if (rootRomanExact === 'bV' && isMajor) {
          funcionBase = 'Intercambio Modal (Locrio)';
          textoExplicacion = 'Acorde prestado del modo Locrio. Introduce el tritono directamente en la fundamental.';
        } else if (rootRomanExact === 'bIII' && isMajor) {
          funcionBase = 'Intercambio Modal (Dórico / Eólico)';
          textoExplicacion = 'Acorde prestado de modos menores. Aporta un sonido épico o de rock/blues.';
        } else if (rootRomanExact === 'IV' && dataAcorde.quality === 'Minor') {
          funcionBase = 'Intercambio Modal (Eólico)';
          textoExplicacion = 'Acorde prestado del modo menor natural. Oscurece la subdominante.';
        } else if (rootRomanExact === 'V' && dataAcorde.quality === 'Minor') {
          funcionBase = 'Intercambio Modal (Mixolidio / Eólico)';
          textoExplicacion = 'Acorde prestado de modos menores/planos. Suprime la sensible.';
        } else if (rootRomanExact === 'bVI' && isMajor) {
          funcionBase = 'Intercambio Modal (Eólico)';
          textoExplicacion = 'Acorde prestado del modo menor natural con impacto épico.';
        } else if (rootRomanExact === 'bVII' && isMajor) {
          funcionBase = 'Intercambio Modal (Mixolidio)';
          textoExplicacion = 'Funciona como subtónica modal insignia del rock y pop.';
        } else if ((rootRomanExact === 'III' || rootRomanExact === 'VI') && isMajor) {
          funcionBase = `Mediante Cromática (${rootRomanExact.toUpperCase()})`;
          textoExplicacion = `Acorde a distancia de tercera mayor respecto a la tónica, produciendo un color cinemático.`;
        } else {
          funcionBase = 'Cromatismo / Acorde de Paso';
          textoExplicacion = 'Variación cromática transitoria que actúa como puente lineal.';
        }
      } else {
        if (funcionBase === 'Tónica') textoExplicacion = 'Representa el punto de máximo reposo, estabilidad y el "hogar" de la progresión.';
        else if (funcionBase === 'Subdominante') textoExplicacion = 'Genera un movimiento de alejamiento suave.';
        else if (funcionBase === 'Dominante') textoExplicacion = 'Contiene el punto máximo de tensión diatónica.';
        else if (funcionBase.includes('Tónica (Débil)')) textoExplicacion = 'Comparte notas clave con la tónica, pero su sensación de reposo es inestable.';
        else if (funcionBase.includes('Tónica (Relativa)')) textoExplicacion = 'El centro menor de la tonalidad.';
        else if (funcionBase === 'Sensible') textoExplicacion = 'Acorde sumamente inestable y disonante por naturaleza.';
      }

      // 2. EVALUAR EL PASADO (Cadencias y Resoluciones Retroactivas)
    if (memoria.esperaResolucion && memoria.raizAnterior && dataAcorde.tonic) {
          const chromaAnterior = Note.chroma(memoria.raizAnterior);
          const chromaActual = Note.chroma(dataAcorde.tonic);

          if (chromaAnterior !== undefined && chromaActual !== undefined) {
            // Invertimos la resta para medir correctamente el salto desde el dominante hacia el objetivo
            const diff = (chromaAnterior - chromaActual + 12) % 12;

            if (diff === 7) {
              // 7 semitonos hacia abajo = Resolución a 4ta justa (Ej: G7 -> C o V/VII)
              const chromaDestino = Note.chroma(dataAcorde.tonic);
              const chromaTonica = Note.chroma(tonica);
              
              const resuelveAVII = chromaDestino !== undefined && chromaTonica !== undefined 
                ? (chromaDestino - chromaTonica + 12) % 12 === 11 
                : false;

              if (resuelveAVII) {
                observacionesAcorde.push(`Resolución de V/VII: El ${memoria.cifradoAnterior} resolvió hacia el acorde de sensible (${nombreAcorde}).`);
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = 'Dominante del VII (V/VII)';
                  resultado[memoria.indiceAnterior].explicacion = '¿Dominante secundario? que enfoca su tensión sobre el séptimo grado de la escala. Aunque resuelve a una estructura inestable, opera bajo la misma tensión de quinta.';
                }
              } else {
                observacionesAcorde.push(`Resolución Natural: El ${memoria.cifradoAnterior} resolvió a una 4ta justa hacia el ${nombreAcorde}.`);
              }
            }
            else if (diff === 2) {
              // 2 semitonos hacia abajo (Un tono entero) = ¡El Backdoor Dominant! (Ej: Bb7 -> C)
              observacionesAcorde.push(`Resolución de Backdoor Dominant: El ${memoria.cifradoAnterior} resolvió hacia el ${nombreAcorde} mediante una sustitución de subdominante menor.`);
              
              if (memoria.indiceAnterior !== null) {
                resultado[memoria.indiceAnterior].funcionDiatonica = 'Backdoor Dominant (bVII7)';
                resultado[memoria.indiceAnterior].explicacion = 'Acorde dominante construido sobre el séptimo grado bemol ($bVII7$). Aunque tiene estructura de dominante, funciona armónicamente como una subdominante menor que sube un tono para resolver a la tónica, aportando un color sofisticado y "jazzero".';
              }
            } 
            else if (diff === 1) {
              // 1 semitono hacia abajo = Sustituto Tritonal / SubV7 (Ej: Db7 -> C)
              observacionesAcorde.push(`Resolución de SubV7: El ${memoria.cifradoAnterior} resolvió cromáticamente hacia el ${nombreAcorde}.`);
              
              if (memoria.indiceAnterior !== null) {
                resultado[memoria.indiceAnterior].funcionDiatonica = 'Sustituto Tritonal (SubV7)';
                resultado[memoria.indiceAnterior].explicacion = 'Acorde dominante no diatónico que sustituye a un dominante convencional al compartir el tritono y descender un semitono.';
              }
            } 
            else {
              observacionesAcorde.push(`Resolución Engañosa: El ${memoria.cifradoAnterior} interrumpió su tensión.`);
            }
          }
        }

      // Limpiamos banderas temporales
      memoria.esperaResolucion = false;
      memoria.raizAnterior = null;
      memoria.tipoTension = null;

      // 3. SETEAR EL FUTURO
      if (dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7')) {
        memoria.esperaResolucion = true;
        memoria.tipoTension = grado === 'V7' ? 'Dominante Principal' : 'Dominante Transitorio';
        memoria.raizAnterior = dataAcorde.tonic || null;
      }

      const analisisActual: AnalisisAcorde = {
        cifrado: nombreAcorde,
        gradoRomano: grado,
        funcionDiatonica: funcionBase,
        notas: dataAcorde.notes,
        intervalos: dataAcorde.intervals,
        explicacion: textoExplicacion,
        observaciones: observacionesAcorde
      };

      memoria.cifradoAnterior = nombreAcorde;
      memoria.gradoAnterior = grado;
      memoria.indiceAnterior = index;
      
      resultado.push(analisisActual);
    });

    this.resultadosSource.next(resultado);
    return resultado;
  }
}