import { Injectable } from '@angular/core';
import { Progression, Chord, Note, Scale } from 'tonal';
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
  bajoAnterior: string | null; 
  raizAbsolutaAnterior: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class HarmonicEngineService {

  private resultadosSource = new BehaviorSubject<AnalisisAcorde[]>([]);
  public resultados$ = this.resultadosSource.asObservable();

  // Diccionario mejorado
// --- DICCIONARIOS DIATÓNICOS COMPLETOS ---
  private funcionesMayor: { [grado: string]: string } = {
    'I': 'Tónica', 'IM': 'Tónica', 'Imaj7': 'Tónica',
    'II': 'Supertónica (Subdominante)', 'IIm': 'Supertónica (Subdominante)', 'IIm7': 'Supertónica (Subdominante)',
    'III': 'Mediante (Tónica Secundaria)', 'IIIm': 'Mediante (Tónica Secundaria)', 'IIIm7': 'Mediante (Tónica Secundaria)',
    'IV': 'Subdominante', 'IVM': 'Subdominante', 'IVmaj7': 'Subdominante',
    'V': 'Dominante', 'VM': 'Dominante', 'V7': 'Dominante', 
    'VI': 'Submediante (Tónica Relativa)', 'VIm': 'Submediante (Tónica Relativa)', 'VIm7': 'Submediante (Tónica Relativa)',
    'VIIo': 'Sensible', 'VIIdim': 'Sensible', 'VIIm7b5': 'Sensible'
  };

  private funcionesMenor: { [grado: string]: string } = {
    'I': 'Tónica Menor', 'Im': 'Tónica Menor', 'Im7': 'Tónica Menor', 'Im(maj7)': 'Tónica Menor',
    'IIo': 'Supertónica (Subdominante)', 'IIdim': 'Supertónica (Subdominante)', 'IIm7b5': 'Supertónica (Subdominante)',
    'bIII': 'Mediante (Relativa Mayor)', 'bIIIM': 'Mediante (Relativa Mayor)', 'bIIImaj7': 'Mediante (Relativa Mayor)',
    'IV': 'Subdominante Menor', 'IVm': 'Subdominante Menor', 'IVm7': 'Subdominante Menor',
    'V': 'Dominante Menor', 'Vm': 'Dominante Menor', 'Vm7': 'Dominante Menor', // Eólico
    'V7': 'Dominante Principal (Armónica)', 'VM': 'Dominante Principal (Armónica)', // Menor Armónica
    'bVI': 'Submediante', 'bVIM': 'Submediante', 'bVImaj7': 'Submediante',
    'bVII': 'Subtónica', 'bVII7': 'Subtónica', 'bVIIM': 'Subtónica', // Eólico
    'VIIo': 'Sensible Disminuida', 'VIIdim': 'Sensible Disminuida', 'VIIdim7': 'Sensible Disminuida' // Menor Armónica
  };

   private acordePerteneceAEscala(nombreAcorde: string, tonicaEscala: string, tipoEscala: string): boolean {
    const notasAcorde = Chord.get(nombreAcorde).notes;
    const notasEscala = Scale.get(`${tonicaEscala} ${tipoEscala}`).notes;

    if (!notasAcorde.length || !notasEscala.length) return false;

    // Convertimos a chroma (0-11) para que matemática pura determine la pertenencia
    const chromasAcorde = notasAcorde.map(n => Note.chroma(n)).filter(n => n !== undefined);
    const chromasEscala = notasEscala.map(n => Note.chroma(n)).filter(n => n !== undefined);

    // Retorna TRUE si TODAS las notas del acorde están dentro de la escala
    return chromasAcorde.every(chroma => chromasEscala.includes(chroma));
  }
  constructor() { }
analizarProgresionContextual(progresion: string[], tonica: string, tipoEscala: string) {
    const resultado: AnalisisAcorde[] = [];
    const keyContext = tipoEscala === 'major' ? tonica : `${tonica}m`;
    const gradosRomanos = Progression.toRomanNumerals(tonica, progresion);
    // INICIALIZACIÓN CORREGIDA (usando raizAnterior en lugar de raizEsperada)
    let memoria: MemoriaArmonica = {
      esperaResolucion: false, 
      raizAnterior: null, 
      tipoTension: null,
      indiceAnterior: null, 
      cifradoAnterior: null, 
      gradoAnterior: null,
      bajoAnterior: null,
      raizAbsolutaAnterior: null
    };

    progresion.forEach((nombreAcorde, index) => {
      const dataAcorde = Chord.get(nombreAcorde);
      const grado = gradosRomanos[index];
      const observacionesAcorde: string[] = [];
      const bajoActual = dataAcorde.bass || dataAcorde.tonic;
      
      // 1. DETERMINAR FUNCIÓN DINÁMICA Y EXPLICACIÓN
     // 1. DETERMINAR FUNCIÓN DINÁMICA Y EXPLICACIÓN
      const gradoLimpio = grado.replace(/[^IVb#m]/gi, ''); 
      
      let funcionBase = '';
      let textoExplicacion = '';

      // A) ¿ES DIATÓNICO A LA ESCALA PRINCIPAL?
      const esDiatonico = this.acordePerteneceAEscala(nombreAcorde, tonica, tipoEscala);

      if (esDiatonico) {
        // Asignamos el nombre diatónico usando los diccionarios base (Tónica, Subdominante, etc.)
        funcionBase = tipoEscala === 'major' 
          ? (this.funcionesMayor[grado] || this.funcionesMayor[gradoLimpio]) 
          : (this.funcionesMenor[grado] || this.funcionesMenor[gradoLimpio]);
        
        if (!funcionBase) funcionBase = 'Acorde Diatónico';
      } 
      else {
        // B) ¿ES UN DOMINANTE O SUSTITUTO TRITONAL?
        const isDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');
        const rootRomanExact = grado.match(/^[b#]*[IV]+/i)?.[0] || ''; 
        
        if (rootRomanExact === 'bVII' && isDominant) {
          funcionBase = 'Backdoor Dominant (bVII7)';
          textoExplicacion = 'Acorde dominante construido sobre el séptimo grado bemol. Resuelve actuando como subdominante menor.';
        } 
        else if (rootRomanExact === 'bII' && isDominant) {
          funcionBase = 'Sustituto Tritonal (SubV7)'; // <- ¡Esto cubre el Db7 de tu imagen!
          textoExplicacion = 'Acorde dominante que sustituye al V7 diatónico compartiendo el mismo tritono. Resuelve descendiendo un semitono.';
        }
        else if (isDominant) {
          funcionBase = 'Dominante Secundario / Alterado';
          textoExplicacion = 'Acorde dominante ajeno a la escala. Genera tensión direccional hacia un grado específico.';
        } 
        else {
          // C) INTERCAMBIO MODAL DINÁMICO (Sin diccionarios)
          // Iteramos sobre todos los modos paralelos para ver en cuál encaja matemáticamente
          const modosParalelos = tipoEscala === 'major' 
            ? ['aeolian', 'mixolydian', 'dorian', 'phrygian', 'lydian', 'locrian'] 
            : ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian']; 
          
          let modoEncontrado = null;

          for (const modo of modosParalelos) {
            if (this.acordePerteneceAEscala(nombreAcorde, tonica, modo)) {
              modoEncontrado = modo;
              break; 
            }
          }

          if (modoEncontrado) {
            // Si encajó, le ponemos el nombre dinámicamente
            const nombresModos: any = { 'aeolian': 'Eólico (Menor)', 'mixolydian': 'Mixolidio', 'dorian': 'Dórico', 'phrygian': 'Frigio', 'lydian': 'Lidio', 'locrian': 'Locrio', 'major': 'Mayor' };
            funcionBase = `Intercambio Modal (${nombresModos[modoEncontrado]})`;
            textoExplicacion = `Acorde prestado del modo ${nombresModos[modoEncontrado]} paralelo.`;
          } 
          // D) MEDIANTES CROMÁTICAS (Evaluación matemática de distancias)
          else if ((rootRomanExact === 'III' || rootRomanExact === 'VI' || rootRomanExact === 'bIII' || rootRomanExact === 'bVI') && (dataAcorde.quality === 'Major' || dataAcorde.quality === 'Minor')) {
            funcionBase = `Mediante Cromática (${rootRomanExact.toUpperCase()})`;
            textoExplicacion = 'Acorde a distancia de tercera respecto a la tónica. Produce un contraste cromático dramático.';
          } 
          // E) FALLBACK (Si todo falla, es un mero paso cromático)
          else {
            funcionBase = 'Cromatismo / Acorde de Paso';
            textoExplicacion = 'Variación cromática transitoria que actúa como puente lineal.';
          }
        }
      }

      // Textos por defecto si es diatónico natural
      if (esDiatonico && !textoExplicacion) {
        if (funcionBase.includes('Tónica')) textoExplicacion = 'Representa el punto de máximo reposo y estabilidad de la progresión.';
        else if (funcionBase.includes('Subdominante') || funcionBase.includes('Supertónica')) textoExplicacion = 'Genera un movimiento de alejamiento suave preparatorio.';
        else if (funcionBase.includes('Dominante')) textoExplicacion = 'Contiene tensión diatónica que busca resolver.';
        else if (funcionBase.includes('Mediante') || funcionBase.includes('Submediante')) textoExplicacion = 'Comparte notas clave con la tónica, funcionando como puente.';
        else if (funcionBase.includes('Sensible')) textoExplicacion = 'Acorde inestable y disonante por naturaleza.';
      }

      // 1.5 EVALUAR PUNTO PEDAL Y OSTINATOS
      if (bajoActual && memoria.bajoAnterior && bajoActual === memoria.bajoAnterior && nombreAcorde !== memoria.cifradoAnterior) {
        observacionesAcorde.push(`Punto Pedal: La nota del bajo (${bajoActual}) se mantiene estática mientras la armonía superior cambia a ${nombreAcorde}.`);
        textoExplicacion += ` Además, descansa sobre un pedal de ${bajoActual}, un recurso (ostinato) que ancla la sonoridad, suspende la sensación de movimiento y unifica la progresión.`;
      }
      // 1.6 EVALUAR LINE CLICHÉ Y BAJOS CROMÁTICOS 
      if (bajoActual && memoria.bajoAnterior && memoria.raizAbsolutaAnterior) {
        const chromaBajoActual = Note.chroma(bajoActual);
        const chromaBajoAnterior = Note.chroma(memoria.bajoAnterior);
        
        if (chromaBajoActual !== undefined && chromaBajoAnterior !== undefined) {
          const diffBajo = (chromaBajoActual - chromaBajoAnterior + 12) % 12;
          
          // Si el bajo se mueve exactamente un semitono hacia arriba (1) o hacia abajo (11)
          if (diffBajo === 1 || diffBajo === 11) {
            const direccion = diffBajo === 1 ? 'ascendente' : 'descendente';
            
            // Si la fundamental se mantuvo igual (Ej: Am -> AmMaj7/G#), es un Line Cliché puro
            if (dataAcorde.tonic === memoria.raizAbsolutaAnterior) {
              // SOBREESCRIBIMOS LA FUNCIÓN PARA QUE SALGA EN LA TARJETA VISUAL
              funcionBase = 'Line Cliché'; 
              textoExplicacion = `La raíz se mantiene en ${dataAcorde.tonic}, pero el bajo hace un movimiento cromático ${direccion} de ${memoria.bajoAnterior} a ${bajoActual}. Crea un hilo conductor cinemático.`;
              observacionesAcorde.push(`Línea descendente detectada.`);
            } 
            // Si la fundamental cambió, es solo un puente cromático de bajos
            else if (funcionBase === 'Cromatismo / Acorde de Paso') {
              funcionBase = `Bajo Cromático (${direccion})`;
              textoExplicacion = `Conducción de voces por semitono desde el bajo ${memoria.bajoAnterior} hacia ${bajoActual}.`;
            }
          }
        }
      }

      // 2. EVALUAR EL PASADO (Cadencias y Resoluciones Retroactivas)
    if (memoria.esperaResolucion && memoria.raizAnterior && dataAcorde.tonic) {
          const chromaAnterior = Note.chroma(memoria.raizAnterior);
          const chromaActual = Note.chroma(dataAcorde.tonic);

         if (chromaAnterior !== undefined && chromaActual !== undefined) {
            
            // --- NUEVO: RUTA PARA LOS ACORDES DE PASO DISMINUIDOS ---
            if (memoria.tipoTension === 'Paso Disminuido') {
              // Medimos la distancia directa hacia adelante
              const diffDisminuido = (chromaActual - chromaAnterior + 12) % 12;

              if (diffDisminuido === 1) {
                observacionesAcorde.push(`Conexión Cromática: El ${memoria.cifradoAnterior} conectó ascendentemente (medio tono) hacia el ${nombreAcorde}.`);
                
                // Evitamos sobreescribir la Sensible diatónica (VII) si ya la habíamos catalogado así
                if (memoria.indiceAnterior !== null && !resultado[memoria.indiceAnterior].funcionDiatonica.includes('Sensible')) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = 'Acorde de Paso Disminuido (Ascendente)';
                  resultado[memoria.indiceAnterior].explicacion = 'Acorde disminuido que actúa como puente cromático ascendente (1 semitono) entre dos grados. Su inestabilidad empuja suavemente las voces hacia el acorde de llegada.';
                }
              } else if (diffDisminuido === 11) {
                observacionesAcorde.push(`Conexión Cromática: El ${memoria.cifradoAnterior} conectó descendentemente (medio tono) hacia el ${nombreAcorde}.`);
                
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = 'Acorde de Paso Disminuido (Descendente)';
                  resultado[memoria.indiceAnterior].explicacion = 'Acorde disminuido que actúa como puente cromático descendente (1 semitono). Suaviza la caída armónica conectando fluidamente con el siguiente acorde.';
                }
              } else {
                observacionesAcorde.push(`Resolución Disminuida Atípica: El ${memoria.cifradoAnterior} saltó hacia el ${nombreAcorde} sin movimiento de grado conjunto.`);
              }
            }
            // --- RUTA ORIGINAL PARA LOS DOMINANTES ---
            else {
              // Invertimos la resta para medir el salto desde el dominante hacia el objetivo
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
                    resultado[memoria.indiceAnterior].explicacion = 'Dominante secundario que enfoca su tensión sobre el séptimo grado de la escala. Aunque resuelve a una estructura inestable, opera bajo la misma tensión de quinta.';
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
                observacionesAcorde.push(`Resolución Engañosa: El ${memoria.cifradoAnterior} interrumpió su tensión de dominante.`);
              }
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
      // --- NUEVO: Activar la memoria si es un Acorde Disminuido ---
      else if (dataAcorde.quality === 'Diminished' || dataAcorde.aliases.includes('dim7') || dataAcorde.aliases.includes('dim')) {
        memoria.esperaResolucion = true;
        memoria.tipoTension = 'Paso Disminuido';
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
      memoria.bajoAnterior = bajoActual || null;
      memoria.raizAbsolutaAnterior = dataAcorde.tonic || null;

      resultado.push(analisisActual);
    });

    this.resultadosSource.next(resultado);
    return resultado;
  }
}