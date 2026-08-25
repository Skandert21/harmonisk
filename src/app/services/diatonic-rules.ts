// app/data/harmonic-dictionaries.ts

// 1. DICCIONARIOS DIATÓNICOS
export const FUNCIONES_MAYOR: { [grado: string]: string } = {
  'I': 'Tónica', 'IM': 'Tónica', 'Imaj7': 'Tónica',
  'II': 'Supertónica (Subdominante)', 'IIm': 'Supertónica (Subdominante)', 'IIm7': 'Supertónica (Subdominante)',
  'III': 'Mediante (Tónica Secundaria)', 'IIIm': 'Mediante (Tónica Secundaria)', 'IIIm7': 'Mediante (Tónica Secundaria)',
  'IV': 'Subdominante', 'IVM': 'Subdominante', 'IVmaj7': 'Subdominante',
  'V': 'Dominante', 'VM': 'Dominante', 'V7': 'Dominante', 
  'VI': 'Submediante (Tónica Relativa)', 'VIm': 'Submediante (Tónica Relativa)', 'VIm7': 'Submediante (Tónica Relativa)',
  'VIIo': 'Sensible', 'VIIdim': 'Sensible', 'VIIm7b5': 'Sensible'
};

export const FUNCIONES_MENOR: { [grado: string]: string } = {
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

// 2. LISTA DE ESCALAS PARALELAS (Para Intercambio Modal)
export const ESCALAS_PARALELAS = [
  'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 
  'harmonic minor', 'melodic minor',
  'diminished',             // Octatónica (Tono-Semitono)
  'half-whole diminished'   // Octatónica (Semitono-Tono)
];

// 3. TRADUCTOR DE MODOS
export const TRADUCTOR_NOMBRES_MODOS: { [key: string]: string } = { 
  'major': 'Mayor', 'minor': 'Menor', 'dorian': 'Dórico', 
  'phrygian': 'Frigio', 'lydian': 'Lidio', 'mixolydian': 'Mixolidio', 
  'locrian': 'Locrio', 'harmonic minor': 'Menor Arm.', 'melodic minor': 'Menor Mel.',
  'diminished': 'Disminuida T-S', 'half-whole diminished': 'Disminuida S-T'
};

// app/data/harmonic-dictionaries.ts

export function obtenerFuncionModalDinamica(numeroRomano: string, tipoEscala: string, tonica: string): { funcion: string, explicacion: string } {
  let funcion = 'Acorde Diatónico';
  let explicacion = `Estructura natural derivada de la escala de ${tonica} ${tipoEscala}.`;

  switch (numeroRomano) {
    case 'I': 
      funcion = 'Tónica Modal'; 
      explicacion = `Acorde de reposo principal del modo ${tipoEscala}.`;
      break;
    case 'II': 
    case 'BII': 
    case '#II': 
      funcion = 'Supertónica Modal (Aproximación)'; 
      explicacion = `Genera un movimiento de alejamiento o aproximación preparatoria en el contexto del modo ${tipoEscala}.`;
      break;
    case 'III': 
    case 'BIII': 
      funcion = 'Mediante Modal'; 
      explicacion = `Comparte notas clave con la tónica, funcionando como un puente armónico con color característico.`;
      break;
    case 'IV': 
    case '#IV': 
      funcion = 'Subdominante Modal'; 
      explicacion = `Polo opuesto a la tónica que genera un contraste o suspensión armónica típica del modo ${tipoEscala}.`;
      break;
    case 'V': 
    case 'BV': 
      funcion = 'Dominante Modal / Tensión'; 
      explicacion = `Acorde de tensión característica del modo ${tipoEscala}. En muchos modos carece de función resolutiva fuerte, aportando un color flotante.`;
      break;
    case 'VI': 
    case 'BVI': 
      funcion = 'Submediante Modal'; 
      explicacion = `Punto de tensión intermedia o resolución engañosa dentro del ecosistema modal.`;
      break;
    case 'VII': 
    case 'BVII': 
      funcion = 'Subtónica / Sensible Modal'; 
      explicacion = `Grado que empuja hacia el reinicio del ciclo armónico, aportando la cadencia insignia del modo ${tipoEscala}.`;
      break;
  }

  return { funcion, explicacion };
}