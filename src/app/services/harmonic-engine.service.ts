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
     
      const gradoLimpio = grado.replace(/[^IVb#m]/gi, ''); 
      
      let funcionBase = '';
      let textoExplicacion = '';

      // A) ¿ES DIATÓNICO A LA ESCALA PRINCIPAL?
     
      const esDiatonico = this.acordePerteneceAEscala(nombreAcorde, tonica, tipoEscala);

      if (esDiatonico) {
        // 1. Buscamos primero si estamos en los modos clásicos que tienen diccionario propio
        if (tipoEscala === 'major') {
          funcionBase = this.funcionesMayor[grado] || this.funcionesMayor[gradoLimpio];
        } else if (tipoEscala === 'minor') {
          funcionBase = this.funcionesMenor[grado] || this.funcionesMenor[gradoLimpio];
        } 
        
        // 2. Generador dinámico para Modos Griegos y otras escalas
        if (!funcionBase) {
          // Extraemos el grado exacto (Ej: 'BII', '#IV', 'V')
          const numeroRomano = grado.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || '';
          
          switch (numeroRomano) {
            case 'I': 
              funcionBase = 'Tónica Modal'; 
              textoExplicacion = `Acorde de reposo principal del modo ${tipoEscala}.`;
              break;
              
            case 'II': 
            case 'BII': // Frigio / Locrio
            case '#II': 
              funcionBase = 'Supertónica Modal (Aproximación)'; 
              textoExplicacion = `Genera un movimiento de alejamiento o aproximación preparatoria en el contexto del modo ${tipoEscala}.`;
              break;
              
            case 'III': 
            case 'BIII': // Dórico / Frigio / Eólico / Locrio
              funcionBase = 'Mediante Modal'; 
              textoExplicacion = `Comparte notas clave con la tónica, funcionando como un puente armónico con color característico.`;
              break;
              
            case 'IV': 
            case '#IV': // Lidio
              funcionBase = 'Subdominante Modal'; 
              textoExplicacion = `Polo opuesto a la tónica que genera un contraste o suspensión armónica típica del modo ${tipoEscala}.`;
              break;
              
            case 'V': 
            case 'BV': // Locrio
              funcionBase = 'Dominante Modal / Tensión'; 
              textoExplicacion = `Acorde de tensión característica del modo ${tipoEscala}. En muchos modos carece de función resolutiva fuerte, aportando un color flotante.`;
              break;
              
            case 'VI': 
            case 'BVI': // Eólico / Frigio / Locrio
              funcionBase = 'Submediante Modal'; 
              textoExplicacion = `Punto de tensión intermedia o resolución engañosa dentro del ecosistema modal.`;
              break;
              
            case 'VII': 
            case 'BVII': // Mixolidio / Dórico / Eólico / Frigio / Locrio
              funcionBase = 'Subtónica / Sensible Modal'; 
              textoExplicacion = `Grado que empuja hacia el reinicio del ciclo armónico, aportando la cadencia insignia del modo ${tipoEscala}.`;
              break;
              
            default:
              funcionBase = 'Acorde Diatónico';
              textoExplicacion = `Estructura natural derivada de la escala de ${tonica} ${tipoEscala}.`;
          }
        }
      }
      else {
        // B) ¿ES UN DOMINANTE O SUSTITUTO TRITONAL?
        const isDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');
        const rootRomanExact = grado.match(/^[b#]*[IV]+/i)?.[0] || ''; 
          
        
        // --- CORRECCIÓN 1: DOMINANTE PRINCIPAL EN MODO MENOR ---
        if (tipoEscala === 'minor' && (rootRomanExact === 'V' || rootRomanExact === 'v') && isDominant) {
          funcionBase = 'Dominante Principal (Armónica)';
          textoExplicacion = 'Acorde dominante derivado de la escala menor armónica. Su alteración (la sensible) genera una fuerte atracción resolutiva hacia la tónica menor.';
        }
        else if (rootRomanExact === 'bVII' && isDominant) {
     
          funcionBase = 'Sustituto Tritonal (SubV7)'; // <- ¡Esto cubre el Db7 de tu imagen!
          textoExplicacion = 'Acorde dominante que sustituye al V7 diatónico compartiendo el mismo tritono. Resuelve descendiendo un semitono.';
        }
        else if (isDominant) {
          funcionBase = 'Dominante Secundario / Alterado';
          textoExplicacion = 'Acorde dominante ajeno a la escala. Genera tensión direccional hacia un grado específico.';
        } 
        else {
          
        // C) INTERCAMBIO MODAL DINÁMICO UNIVERSAL (MÚLTIPLES ESCALAS)
 
          // 1. Agregamos las escalas simétricas al radar
          const todasLasEscalasParalelas = [
            'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 
            'harmonic minor', 'melodic minor',
            'diminished',             // <-- Escala octatónica (Tono-Semitono)
            'half-whole diminished'   // <-- Escala octatónica (Semitono-Tono)
          ];
          
          const modosParaRevisar = todasLasEscalasParalelas.filter(modo => modo !== tipoEscala);
          
          let modosEncontrados: string[] = [];

          for (const modo of modosParaRevisar) {
            if (this.acordePerteneceAEscala(nombreAcorde, tonica, modo)) {
              modosEncontrados.push(modo);
            }
          }

        const esAcordeDisminuido = dataAcorde.quality === 'Diminished' || dataAcorde.aliases.includes('dim7');

          if (modosEncontrados.length > 0) {
            const traductorNombres: { [key: string]: string } = { 
              'major': 'Mayor', 'minor': 'Menor', 'dorian': 'Dórico', 
              'phrygian': 'Frigio', 'lydian': 'Lidio', 'mixolydian': 'Mixolidio', 
              'locrian': 'Locrio', 'harmonic minor': 'Menor Arm.', 'melodic minor': 'Menor Mel.',
              'diminished': 'Disminuida T-S', 'half-whole diminished': 'Disminuida S-T'
            };
            
            const nombresEspanol = modosEncontrados
              .slice(0, 5) 
              .map(modo => traductorNombres[modo] || modo);
            
            // Si el acorde ES disminuido Y proviene de la escala disminuida
            if (esAcordeDisminuido && modosEncontrados.some(m => m.includes('diminished'))) {
              const nombresUnidos = nombresEspanol.join(' / ');
              funcionBase = `Acorde de Paso Disminuido (${nombresUnidos})`;
              textoExplicacion = `Estructura simétrica (${nombresUnidos}). Actúa frecuentemente como un puente cromático de máxima tensión con doble tritono (si es dim7) para conectar acordes diatónicos.`;
            } 
         
        // Si es un acorde normal (Mayor/Menor)
            else {
              const nombresFiltrados = nombresEspanol.filter(n => !n.includes('Disminuida'));
             // 2. SOLO si quedaron nombres después de filtrar, asignamos la función
              if (nombresFiltrados.length > 0) {
                const nombresSinDisminuida = nombresFiltrados.join(' / ');
                funcionBase = `Intercambio Modal (${nombresSinDisminuida})`;
                textoExplicacion = `Acorde cuyas notas encajan perfectamente en los modos paralelos: ${nombresSinDisminuida}. Introduce un color ajeno a la escala original aportando variedad armónica sin perder la estabilidad del centro tonal.`;
              }
            }
          }
 
           // D) MEDIANTES CROMÁTICAS (Solo si falló el intercambio modal diatónico/paralelo)
          // Usamos !funcionBase para asegurarnos de que no pise el Intercambio Modal
          if (!funcionBase && (rootRomanExact === 'III' || rootRomanExact === 'VI' || rootRomanExact === 'bIII' || rootRomanExact === 'bVI') && (dataAcorde.quality === 'Major' || dataAcorde.quality === 'Minor')) {
            funcionBase = `Mediante Cromática (${rootRomanExact.toUpperCase()})`;
            textoExplicacion = 'Acorde a distancia de tercera respecto a la tónica que no pertenece a modos paralelos directos. Produce un contraste cromático dramático.';
          }
          // E) FALLBACK (Si todo falla, es un mero paso cromático)
          if(!funcionBase) {
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

      // 1.4 EVALUAR UPPER STRUCTURES / POLIACORDES (SLASH CHORDS COMPLEJOS)
      if (dataAcorde.bass && dataAcorde.tonic) {
        const rootChroma = Note.chroma(dataAcorde.tonic);
        const bassChroma = Note.chroma(dataAcorde.bass);
        
        if (rootChroma !== undefined && bassChroma !== undefined) {
          // Distancia en semitonos entre la nota fundamental de la tríada y el bajo
          const diffBajo = (bassChroma - rootChroma + 12) % 12;
          
          // Si el bajo NO es la tónica (0), 3ra menor (3), 3ra mayor (4), o 5ta justa (7)
          // significa que no es una inversión normal, es un bajo ajeno a la tríada base.
          if (diffBajo !== 0 && diffBajo !== 3 && diffBajo !== 4 && diffBajo !== 7) {
            funcionBase = `Acorde Híbrido / Upper Structure (${nombreAcorde})`;
            textoExplicacion = `Tríada superior de ${dataAcorde.tonic} tocada sobre un bajo no convencional en ${dataAcorde.bass}. Funcionalmente actúa como un poliacorde que genera tensiones armónicas muy complejas (como 9nas, 11vas o 13vas) de una forma visualmente simplificada.`;
            observacionesAcorde.push(`Poliacorde Detectado: El bajo (${dataAcorde.bass}) es ajeno a la tríada fundamental de ${dataAcorde.tonic}.`);
          }
        }
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
              // Medimos la distancia matemática en semitonos hacia el nuevo acorde
              const diffDisminuido = (chromaActual - chromaAnterior + 12) % 12;
              
              // Verificamos si es un dim7 completo para aplicarle las reglas de simetría (los 'dim' de 3 notas no son simétricos)
              const acordeAnteriorData = memoria.cifradoAnterior ? Chord.get(memoria.cifradoAnterior) : null;
              const esDim7Anterior = acordeAnteriorData ? acordeAnteriorData.aliases.includes('dim7') : false;

              // CASO 1.A: RESOLUCIÓN SIMÉTRICA ASCENDENTE (O INTERCAMBIABLE)
              // 1 semitono natural. O si es dim7, puede saltar por terceras menores (4, 7 o 10 semitonos)
              if (diffDisminuido === 1 || (esDim7Anterior && (diffDisminuido === 4 || diffDisminuido === 7 || diffDisminuido === 10))) {
                
                if (memoria.indiceAnterior !== null && !resultado[memoria.indiceAnterior].funcionDiatonica.includes('Sensible')) {
                  if (diffDisminuido === 1) {
                    observacionesAcorde.push(`Conexión Cromática: El ${memoria.cifradoAnterior} conectó ascendentemente (medio tono) hacia el ${nombreAcorde}.`);
                    resultado[memoria.indiceAnterior].funcionDiatonica = 'Acorde de Paso Disminuido (Ascendente)';
                    resultado[memoria.indiceAnterior].explicacion = 'Acorde disminuido que actúa como puente cromático ascendente (1 semitono) entre dos grados. Su inestabilidad empuja suavemente las voces hacia el acorde de llegada.';
                  } else {
                    observacionesAcorde.push(`Resolución Simétrica: El ${memoria.cifradoAnterior} usó su estructura simétrica para resolver como sensible hacia el ${nombreAcorde}.`);
                    resultado[memoria.indiceAnterior].funcionDiatonica = `Sensible Secundaria Disfrazada (${memoria.cifradoAnterior})`;
                    resultado[memoria.indiceAnterior].explicacion = `¡Truco de simetría! Por la estructura del dim7, este acorde es enarmónicamente equivalente a la sensible que está exactamente medio tono debajo de ${nombreAcorde}. Actúa como un puente de modulación o salto rápido hacia este nuevo centro.`;
                  }
                }
              } 
              // CASO 1.B: RESOLUCIÓN CROMÁTICA DESCENDENTE (O SIMÉTRICA DESCENDENTE)
              // 11 semitonos (medio tono abajo). O sus equivalentes simétricos (8, 5, 2)
              else if (diffDisminuido === 11 || (esDim7Anterior && (diffDisminuido === 8 || diffDisminuido === 5 || diffDisminuido === 2))) {
                observacionesAcorde.push(`Conexión Cromática: El ${memoria.cifradoAnterior} conectó descendentemente hacia el ${nombreAcorde}.`);
                
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = 'Acorde de Paso Disminuido (Descendente)';
                  resultado[memoria.indiceAnterior].explicacion = 'Acorde disminuido que actúa como puente cromático descendente. Suaviza la caída armónica conectando fluidamente las voces con el siguiente acorde (o usando su equivalencia simétrica para caer hacia él).';
                }
              }
              // CASO 2: NO RESUELVE (RESOLUCIÓN ATÍPICA O ENGAÑOSA)
              else {
                observacionesAcorde.push(`Resolución Irregular: El ${memoria.cifradoAnterior} no resolvió por grado conjunto ni usó simetría natural hacia el ${nombreAcorde}.`);
                
                if (memoria.indiceAnterior !== null) {
                  // Retroactivamente le quitamos el título de "Paso" porque realmente no actuó como puente funcional
                  resultado[memoria.indiceAnterior].funcionDiatonica = 'Disminuido de Color / Resolución Irregular';
                  resultado[memoria.indiceAnterior].explicacion = 'Acorde de tensión disminuida que no resolvió mediante la conducción de voces esperada. Se utiliza por su color disonante estático o para generar una sorpresa armónica ("Resolución Engañosa").';
                }
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
                    resultado[memoria.indiceAnterior].funcionDiatonica = `Dominante del VII (Resuelve a ${nombreAcorde})`;
                    resultado[memoria.indiceAnterior].explicacion = 'Dominante secundario que enfoca su tensión sobre el séptimo grado de la escala. Aunque resuelve a una estructura inestable, opera bajo la misma tensión de quinta.';
                  }
                } else {
                  observacionesAcorde.push(`Resolución Natural: El ${memoria.cifradoAnterior} resolvió a una 4ta justa hacia el ${nombreAcorde}.`);
                  if (memoria.indiceAnterior !== null && resultado[memoria.indiceAnterior].funcionDiatonica.includes('Dominante')) {
                    resultado[memoria.indiceAnterior].funcionDiatonica += ` (Resolvió a ${nombreAcorde})`;
                  }
                }
              }
              else if (diff === 2) {
                // 2 semitonos hacia abajo (Un tono entero) = ¡El Backdoor Dominant! (Ej: Bb7 -> C)
                observacionesAcorde.push(`Resolución de Backdoor Dominant: El ${memoria.cifradoAnterior} resolvió hacia el ${nombreAcorde} mediante una sustitución de subdominante menor.`);
                
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = `Backdoor Dominant (Resolvió a ${nombreAcorde})`;
                  resultado[memoria.indiceAnterior].explicacion = 'Acorde dominante construido sobre el séptimo grado bemol ($bVII7$). Aunque tiene estructura de dominante, funciona armónicamente como una subdominante menor que sube un tono para resolver a la tónica, aportando un color sofisticado y "jazzero".';
                }
              } 
              else if (diff === 1) {
                // 1 semitono hacia abajo = Sustituto Tritonal / SubV7 (Ej: Db7 -> C)
                observacionesAcorde.push(`Resolución de SubV7: El ${memoria.cifradoAnterior} resolvió cromáticamente hacia el ${nombreAcorde}.`);
                
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = `Sustituto Tritonal (Resolvió a ${nombreAcorde})`;
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

    // =========================================================================
      // 4. ESCÁNER DE PATRONES ESTRUCTURALES (POST-PROCESAMIENTO GLOBAL)
      // =========================================================================

      // Función auxiliar para pintar las tarjetas de forma masiva
      const pintarRacha = (inicio: number, fin: number, tipo: string) => {
        for (let k = inicio; k <= fin; k++) {
          if (tipo === 'cuartal') {
            resultado[k].funcionDiatonica = k === inicio ? 'Armonía Cuartal' : 'Armonía Cuartal (Paralela)';
            resultado[k].explicacion = k === inicio ? 'Estructura por superposición de cuartas. Genera sonoridad abierta y ambigua.' : 'Movimiento consecutivo de bloques armónicos basados en cuartas.';
          } else if (tipo === 'constante') {
            resultado[k].funcionDiatonica = k === inicio ? `Constante Estructural (${Chord.get(resultado[k].cifrado).type})` : 'Constante Estructural (Eslabón)';
            resultado[k].explicacion = k === inicio ? `Técnica de 'Planing'. Se desplaza la misma estructura armónica exacta ignorando la armadura de clave.` : 'Continuación del movimiento paralelo no diatónico.';
          } else if (tipo === 'extendido') {
            resultado[k].funcionDiatonica = k === inicio ? 'Dominante Extendido (Cadena)' : 'Dominante Extendido (Eslabón)';
            resultado[k].explicacion = k === inicio ? 'Ciclo de dominantes encadenados por quintas sin resolución a tónica estable.' : 'Continuación de la cascada de tensión direccional.';
          }
        }
      };

      // A) ARMONÍA CUARTAL
      let rachaCuartal = 0;
      for (let i = 0; i < resultado.length; i++) {
        const c = Chord.get(resultado[i].cifrado);
        const esCuartal = c.aliases.includes('sus4') || c.aliases.includes('11') || c.aliases.includes('m11') || c.aliases.includes('7sus4');
        
        if (esCuartal) rachaCuartal++;

        // Si la racha se rompe en este acorde, o si llegamos al final de la progresión
        if (!esCuartal || i === resultado.length - 1) {
          if (rachaCuartal >= 2) {
            const fin = esCuartal ? i : i - 1; 
            const inicio = fin - rachaCuartal + 1;
            pintarRacha(inicio, fin, 'cuartal');
          }
          rachaCuartal = 0; // Se resetea el contador
        }
      }

     // B) CONSTANTES ESTRUCTURALES (Con filtro diatónico de protección)
      let rachaConstante = 1; 
      for (let i = 1; i < resultado.length; i++) {
        const cAnterior = Chord.get(resultado[i-1].cifrado);
        const cActual = Chord.get(resultado[i].cifrado);
        
        const chAnterior = Note.chroma(cAnterior.tonic || '');
        const chActual = Note.chroma(cActual.tonic || '');
        
        const esValido = cActual.quality && cActual.quality !== 'Unknown' && cActual.type;
        const esMismoTipo = cActual.type === cAnterior.type;
        const esRaizDiferente = chActual !== chAnterior;
        const noEsCuartal = !resultado[i].funcionDiatonica.includes('Cuartal'); 

        // NUEVO: Verificamos que el acorde actual NO sea diatónico a la escala base
        const noEsDiatonico = !this.acordePerteneceAEscala(resultado[i].cifrado, tonica, tipoEscala);

        // La constante solo es válida si cumple las reglas de paralelismo Y además es ajeno a la escala
        const esConstante = esValido && esMismoTipo && esRaizDiferente && noEsCuartal && noEsDiatonico;

        if (esConstante) rachaConstante++;

        if (!esConstante || i === resultado.length - 1) {
          if (rachaConstante >= 3) {
            const fin = esConstante ? i : i - 1;
            const inicio = fin - rachaConstante + 1;
            pintarRacha(inicio, fin, 'constante');
          }
          rachaConstante = 1; 
        }
      }

      // C) DOMINANTES EXTENDIDOS
      let rachaExtendido = 1;
      for (let i = 1; i < resultado.length; i++) {
        const cAnterior = Chord.get(resultado[i-1].cifrado);
        const cActual = Chord.get(resultado[i].cifrado);
        const isDom = (c: any) => c.aliases.includes('7') || c.aliases.includes('dom7') || c.aliases.includes('9') || c.aliases.includes('13');
        
        let esSaltoQuinta = false;
        if (isDom(cAnterior) && isDom(cActual)) {
          const chAnterior = Note.chroma(cAnterior.tonic || '');
          const chActual = Note.chroma(cActual.tonic || '');
          if (chAnterior !== undefined && chActual !== undefined) {
            const diff = (chActual - chAnterior + 12) % 12;
            if (diff === 5) esSaltoQuinta = true; // Resolución descendente
          }
        }

        if (esSaltoQuinta) rachaExtendido++;

        if (!esSaltoQuinta || i === resultado.length - 1) {
          if (rachaExtendido >= 2) {
            const fin = esSaltoQuinta ? i : i - 1;
            const inicio = fin - rachaExtendido + 1;
            pintarRacha(inicio, fin, 'extendido');
          }
          rachaExtendido = 1;
        }
      }
      // RESULTADO FINAL

    this.resultadosSource.next(resultado);
    return resultado;
  }
}