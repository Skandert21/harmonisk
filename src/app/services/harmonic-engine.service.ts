import { Injectable } from '@angular/core';
import { Progression, Chord, Note, Scale } from 'tonal';
import { BehaviorSubject } from 'rxjs';
import { FUNCIONES_MAYOR, FUNCIONES_MENOR, obtenerFuncionModalDinamica, ESCALAS_PARALELAS, TRADUCTOR_NOMBRES_MODOS } from './diatonic-rules';
import { acordePerteneceAEscala, esRaizDiatonica as calcularRaizDiatonica } from './music-math.service';
export interface AnalisisAcorde {
  cifrado: string;
  gradoRomano: string;
  funcionDiatonica: string;
  notas: string[];
  intervalos: string[];  
  explicacion: string;  
  observaciones: string[];
  advertencias?: string[];
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
     
      const esDiatonico =  acordePerteneceAEscala(nombreAcorde, tonica, tipoEscala);

      if (esDiatonico) {
        // 1. Buscamos primero si estamos en los modos clásicos que tienen diccionario propio
        if (tipoEscala === 'major') {
          funcionBase = FUNCIONES_MAYOR[grado] || FUNCIONES_MAYOR[gradoLimpio];
        } else if (tipoEscala === 'minor') {
          funcionBase = FUNCIONES_MENOR[grado] || FUNCIONES_MENOR[gradoLimpio];
        } 
        
        // 2. Generador dinámico para Modos Griegos y otras escalas
       
        if (!funcionBase) {
          const numeroRomano = grado.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || '';
          const resultadoModal = obtenerFuncionModalDinamica(numeroRomano, tipoEscala, tonica);
          
          funcionBase = resultadoModal.funcion;
          textoExplicacion = resultadoModal.explicacion;
        }
      }
      else {
       // B) ¿ES UN DOMINANTE O SUSTITUTO TRITONAL?
        const isDominant = dataAcorde.aliases.includes('7') || dataAcorde.aliases.includes('dom7');
        const rootRomanExact = grado.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || ''; 
          
        // --- NUEVO: ¿LA RAÍZ DEL ACORDE ES DIATÓNICA? ---
       const esRaizDiatonica = calcularRaizDiatonica(dataAcorde.tonic, tonica, tipoEscala);

        // --- CORRECCIÓN 1: DOMINANTE PRINCIPAL EN MODO MENOR ---
        if (tipoEscala === 'minor' && (rootRomanExact === 'V' || rootRomanExact === 'v') && isDominant) {
          funcionBase = 'Dominante Principal (Armónica)';
          textoExplicacion = 'Acorde dominante derivado de la escala menor armónica. Su alteración (la sensible) genera una fuerte atracción resolutiva hacia la tónica menor.';
        }
        else if (isDominant) {
          // --- SEPARACIÓN BERKLEE: Raíz Diatónica vs Raíz Cromática ---
          if (esRaizDiatonica) {
            funcionBase = 'Dominante Secundario';
            textoExplicacion = 'Acorde dominante construido sobre una fundamental diatónica a la escala. Genera tensión direccional hacia otro grado de la tonalidad.';
          } else {
            funcionBase = 'Dominante Cromático / Posible SubV7';
            textoExplicacion = 'Acorde dominante construido sobre una raíz ajena a la escala. Tiende a funcionar como sustituto tritonal resolviendo un semitono hacia abajo, o como puente cromático.';
          }
        }
        
        // C) INTERCAMBIO MODAL DINÁMICO UNIVERSAL (MÚLTIPLES ESCALAS)
        // (Se removió el 'else' para que se evalúe SIEMPRE y se acumule a los dominantes)
        // 1. Agregamos las escalas simétricas al radar
        const modosParaRevisar = ESCALAS_PARALELAS.filter(modo => modo !== tipoEscala);
          
        let modosEncontrados: string[] = [];

        for (const modo of modosParaRevisar) {
          if (acordePerteneceAEscala(nombreAcorde, tonica, modo)) {
            modosEncontrados.push(modo);
          }
        }

        const esAcordeDisminuido = dataAcorde.quality === 'Diminished' || dataAcorde.aliases.includes('dim7');

        if (modosEncontrados.length > 0) {
     
            
          const nombresEspanol = modosEncontrados
            .slice(0, 5) 
            .map(modo => TRADUCTOR_NOMBRES_MODOS[modo] || modo);
            
          // Si el acorde ES disminuido Y proviene de la escala disminuida
          if (esAcordeDisminuido && modosEncontrados.some(m => m.includes('diminished'))) {
            const nombresUnidos = nombresEspanol.join(' / ');
            const funcDis = `Acorde de Paso Disminuido (${nombresUnidos})`;
            const expDis = `Estructura simétrica (${nombresUnidos}). Actúa frecuentemente como un puente cromático de máxima tensión con doble tritono (si es dim7) para conectar acordes diatónicos.`;
            
            // LÓGICA DE ACUMULACIÓN
            if (funcionBase) {
              funcionBase += ` / ${funcDis}`;
              textoExplicacion += ` ${expDis}`;
            } else {
              funcionBase = funcDis;
              textoExplicacion = expDis;
            }
          } 
          
          // Si es un acorde normal (Mayor/Menor/Dominante)
          else {
            const nombresFiltrados = nombresEspanol.filter(n => !n.includes('Disminuida'));
            // 2. SOLO si quedaron nombres después de filtrar, asignamos la función
            if (nombresFiltrados.length > 0) {
              const nombresSinDisminuida = nombresFiltrados.join(' / ');
              const funcMod = `Intercambio Modal (${nombresSinDisminuida})`;
              const expMod = `Acorde cuyas notas encajan perfectamente en los modos paralelos: ${nombresSinDisminuida}. Introduce un color ajeno a la escala original aportando variedad armónica sin perder la estabilidad del centro tonal.`;
              
              // LÓGICA DE ACUMULACIÓN
              if (funcionBase) {
                funcionBase += ` + ${funcMod}`;
                textoExplicacion += ` ${expMod}`;
              } else {
                funcionBase = funcMod;
                textoExplicacion = expMod;
              }
            }
          }
        }

        // D) MEDIANTES CROMÁTICAS (Solo si falló el intercambio modal diatónico/paralelo)
        // Usamos !funcionBase para asegurarnos de que no pise las reglas anteriores
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
      // 1.6 EVALUAR LINE CLICHÉ (EN CUALQUIER VOZ) Y BAJOS CROMÁTICOS 
      if (memoria.raizAbsolutaAnterior && dataAcorde.tonic) {
        
        // A) ¿LA FUNDAMENTAL SE MANTUVO? (Condición principal para Line Cliché)
        if (dataAcorde.tonic === memoria.raizAbsolutaAnterior) {
          
          const acordeAnterior = Chord.get(memoria.cifradoAnterior || '');
          // Extraemos los chromas (0-11) de todas las notas de ambos acordes
          const chromasAnteriores = acordeAnterior.notes.map(n => Note.chroma(n)).filter(n => n !== undefined) as number[];
          const chromasActuales = dataAcorde.notes.map(n => Note.chroma(n)).filter(n => n !== undefined) as number[];

          let hayMovimientoCromatico = false;
          let direccionLinea = '';

          // Comparamos cada nota del acorde anterior con el actual
          for (const cAnt of chromasAnteriores) {
            for (const cAct of chromasActuales) {
              if (cAnt === cAct) continue; // Ignoramos las notas que no se movieron

              const diff = (cAct - cAnt + 12) % 12;
              if (diff === 1) { // Sube medio tono
                hayMovimientoCromatico = true;
                direccionLinea = 'ascendente';
                break;
              } else if (diff === 11) { // Baja medio tono
                hayMovimientoCromatico = true;
                direccionLinea = 'descendente';
                break;
              }
            }
            if (hayMovimientoCromatico) break;
          }

          // Verificamos si, por casualidad, el movimiento ocurrió específicamente en el bajo
          let esEnElBajo = false;
          if (bajoActual && memoria.bajoAnterior) {
            const chBajoAct = Note.chroma(bajoActual);
            const chBajoAnt = Note.chroma(memoria.bajoAnterior);
            if (chBajoAct !== undefined && chBajoAnt !== undefined) {
              const diffBajo = (chBajoAct - chBajoAnt + 12) % 12;
              if (diffBajo === 1 || diffBajo === 11) {
                hayMovimientoCromatico = true;
                esEnElBajo = true;
                direccionLinea = diffBajo === 1 ? 'ascendente' : 'descendente';
              }
            }
          }

          // Si detectamos el movimiento (ya sea en el bajo o en una voz interna)
          if (hayMovimientoCromatico) {
            funcionBase = 'Line Cliché'; 
            const voz = esEnElBajo ? 'el bajo' : 'una voz interna';
            textoExplicacion = `La fundamental se mantiene en ${dataAcorde.tonic}, pero ${voz} hace un movimiento cromático ${direccionLinea}. Crea un hilo conductor cinemático.`;
            observacionesAcorde.push(`Línea cromática ${direccionLinea} detectada en ${voz}.`);
          }
        } 
        
        // B) LA FUNDAMENTAL CAMBIÓ (Solo evaluamos si el bajo conectó cromáticamente como puente)
        else if (bajoActual && memoria.bajoAnterior) {
          const chromaBajoActual = Note.chroma(bajoActual);
          const chromaBajoAnterior = Note.chroma(memoria.bajoAnterior);
          
          if (chromaBajoActual !== undefined && chromaBajoAnterior !== undefined) {
            const diffBajo = (chromaBajoActual - chromaBajoAnterior + 12) % 12;
            
            // Si el bajo sube o baja medio tono exacto
            if (diffBajo === 1 || diffBajo === 11) {
              const direccion = diffBajo === 1 ? 'ascendente' : 'descendente';
              
              if (funcionBase === 'Cromatismo / Acorde de Paso') {
                funcionBase = `Bajo Cromático (${direccion})`;
                textoExplicacion = `Conducción de voces por semitono desde el bajo ${memoria.bajoAnterior} hacia ${bajoActual}.`;
              }
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
           // --- NUEVA RUTA PARA LOS DOMINANTES (Incluye Resolución Engañosa) ---
            else {
              const diff = (chromaAnterior - chromaActual + 12) % 12;

              // 1. RESOLUCIÓN NATURAL (Cae una 5ta Justa / 7 semitonos)
              if (diff === 7) {
                const esCualidadEsperada = acordePerteneceAEscala(nombreAcorde, tonica, tipoEscala);
                
                if (memoria.indiceAnterior !== null) {
                  if (!esCualidadEsperada) {
                    observacionesAcorde.push(`Resolución Inesperada: El ${memoria.cifradoAnterior} resolvió a la raíz correcta, pero la cualidad de ${nombreAcorde} está alterada.`);
                    resultado[memoria.indiceAnterior].funcionDiatonica = `Dominante Secundario (Resolución Inesperada a ${nombreAcorde})`;
                    resultado[memoria.indiceAnterior].explicacion = `Resolvió hacia la fundamental esperada, pero la cualidad del acorde de destino no es diatónica (Ej: dominantes en cadena o cambio modal).`;
                  } else {
                    observacionesAcorde.push(`Resolución Natural: El ${memoria.cifradoAnterior} resolvió a una 4ta justa hacia el ${nombreAcorde}.`);
                    resultado[memoria.indiceAnterior].funcionDiatonica += ` (Resolvió a ${nombreAcorde})`;
                  }
                }
              }
              // 2. RESOLUCIÓN ENGAÑOSA O BACKDOOR (Sube 1 semitono [diff 11] o 1 tono [diff 10])
              else if (diff === 11 || diff === 10) {
                const esBackdoor = diff === 10 && memoria.gradoAnterior?.toUpperCase().includes('BVII');
                
                if (esBackdoor) {
                  observacionesAcorde.push(`Resolución Backdoor: El ${memoria.cifradoAnterior} subió un tono entero hacia el ${nombreAcorde}.`);
                  if (memoria.indiceAnterior !== null) {
                    resultado[memoria.indiceAnterior].funcionDiatonica = `Backdoor Dominant (Resolvió a ${nombreAcorde})`;
                    resultado[memoria.indiceAnterior].explicacion = 'Acorde dominante construido sobre el séptimo grado bemol. Funciona como una subdominante menor que sube un tono para resolver a la tónica.';
                  }
                } else {
                  observacionesAcorde.push(`Resolución Engañosa (Deceptive): El ${memoria.cifradoAnterior} ascendió hacia el ${nombreAcorde} en lugar de caer una 5ta.`);
                  if (memoria.indiceAnterior !== null) {
                    resultado[memoria.indiceAnterior].funcionDiatonica = `Dominante Secundario (Resolución Engañosa a ${nombreAcorde})`;
                    resultado[memoria.indiceAnterior].explicacion = `Creó una expectativa de resolución descendente, pero realizó un gesto engañoso ascendiendo hacia ${nombreAcorde} (Deceptive Cadence).`;
                  }
                }
              }
              // 3. SUSTITUTO TRITONAL (Cae 1 semitono [diff 1])
              else if (diff === 1) {
                observacionesAcorde.push(`Resolución SubV7: El ${memoria.cifradoAnterior} resolvió cromáticamente hacia abajo al ${nombreAcorde}.`);
                if (memoria.indiceAnterior !== null) {
                  resultado[memoria.indiceAnterior].funcionDiatonica = `Sustituto Tritonal (Resolvió a ${nombreAcorde})`;
                  resultado[memoria.indiceAnterior].explicacion = 'Sustituye a un dominante convencional al compartir su tritono, resolviendo con suavidad descendiendo medio tono.';
                }
              } 
              // 4. TENSION ESTÁTICA
              else {
                observacionesAcorde.push(`Tensión Estática: El ${memoria.cifradoAnterior} no resolvió de manera funcional hacia el ${nombreAcorde}.`);
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

      // =========================================================================
      // AVISOS DE ORQUESTACIÓN Y TENSIONES (NOTAS DE CUIDADO)
      // =========================================================================
      const advertenciasAcorde: string[] = [];
      const intervalos = dataAcorde.intervals || [];

      // A) Choque de semitono (b9 interval interno)
      if (intervalos.includes('3M') && intervalos.includes('4P')) {
        advertenciasAcorde.push('Tensión de Cuidado: La 11va (4P) choca a medio tono con la 3ra Mayor. Considera usar #11 (Lidio) o tratarla como nota de paso corta.');
      }
      if (intervalos.includes('3m') && intervalos.includes('2m')) {
        advertenciasAcorde.push('Tensión de Cuidado: La b9 (2m) choca a medio tono con la raíz o la 3ra menor. Genera una sonoridad muy oscura y disonante.');
      }

      // B) Mutación Funcional
      if ((gradoLimpio.toUpperCase() === 'I' || gradoLimpio.toUpperCase() === 'IV') && intervalos.includes('7m') && intervalos.includes('3M')) {
        advertenciasAcorde.push('Mutación Funcional: La 7ma menor ha convertido este acorde estable en un Dominante. Buscará resolver mediante su tritono.');
      }

      // C) Falta de Tercera
      if (!intervalos.includes('3M') && !intervalos.includes('3m') && !nombreAcorde.includes('sus')) {
         advertenciasAcorde.push('Ambigüedad: Acorde sin tercera (Power Chord o clúster). Su función modal queda indefinida al no ser mayor ni menor.');
      }

   
      const analisisActual: AnalisisAcorde = {
        cifrado: nombreAcorde,
        gradoRomano: grado,
        funcionDiatonica: funcionBase,
        notas: dataAcorde.notes,
        intervalos: dataAcorde.intervals,
        explicacion: textoExplicacion,
        observaciones: observacionesAcorde,
        advertencias: advertenciasAcorde
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
        const noEsDiatonico = !acordePerteneceAEscala(resultado[i].cifrado, tonica, tipoEscala);

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
          if (rachaExtendido >= 3) {
            const fin = esSaltoQuinta ? i : i - 1;
            const inicio = fin - rachaExtendido + 1;
            pintarRacha(inicio, fin, 'extendido');
          }
          rachaExtendido = 1;
        }
      }

      // =========================================================================
      // 5. ESCÁNER DE CADENCIAS FINALES DE FRASE (Berklee)
      // =========================================================================
      const n = resultado.length;
      if (n >= 2) {
        const ultimo = resultado[n - 1];
        const penultimo = resultado[n - 2];
        const antepenultimo = n >= 3 ? resultado[n - 3] : null;

        const grUltimo = ultimo.gradoRomano.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || '';
        const grPenultimo = penultimo.gradoRomano.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || '';
        const grAnte = antepenultimo ? antepenultimo.gradoRomano.match(/^[b#]*[IV]+/i)?.[0].toUpperCase() || '' : '';

        const ultimoEsI = grUltimo === 'I';
        const ultimoEsV = grUltimo === 'V' && ultimo.cifrado.includes('7');
        const ultimoEsVI = (grUltimo === 'VI' || grUltimo === 'BVI') && ultimo.cifrado.includes('m');
        
        const penultimoEsV7 = grPenultimo === 'V' && penultimo.cifrado.includes('7');
        const penultimoEsIV = grPenultimo === 'IV';
        const penultimoEsII = grPenultimo === 'II';
        const anteEsII = grAnte === 'II';

        let cadenciaDetectada = '';

        if (ultimoEsI && penultimoEsV7) {
          cadenciaDetectada = (antepenultimo && anteEsII) ? 'Full Jazz Cadence (II-V-I)' : 'Full Dominant Cadence (V-I)';
        } else if (ultimoEsV) {
          cadenciaDetectada = penultimoEsII ? 'Jazz Half Cadence (II-V)' : 'Half Cadence (Termina en Dominante)';
        } else if (ultimoEsI && (penultimoEsIV || penultimoEsII)) {
          cadenciaDetectada = 'Subdominant / Plagal Cadence';
        } else if (grUltimo === 'IV' || (grUltimo === 'II' && ultimo.cifrado.includes('m'))) {
          cadenciaDetectada = 'Incomplete Subdominant Cadence';
        } else if (penultimoEsV7 && ultimoEsVI) {
          cadenciaDetectada = 'Deceptive Cadence (V-VI)';
        }

        if (cadenciaDetectada) {
          ultimo.observaciones.push(`Cadencia Final: La frase concluye con una ${cadenciaDetectada}.`);
        }
      }
      // RESULTADO FINAL
      //PatternEngine.detectarBloquesIIV(resultado);

    this.resultadosSource.next(resultado);
    return resultado;
  }
}