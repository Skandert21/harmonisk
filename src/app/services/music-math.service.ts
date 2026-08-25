  import { Chord, Note, Scale } from 'tonal';
  
  export function acordePerteneceAEscala(nombreAcorde: string, tonicaEscala: string, tipoEscala: string): boolean {
    const notasAcorde = Chord.get(nombreAcorde).notes;
    const notasEscala = Scale.get(`${tonicaEscala} ${tipoEscala}`).notes;

    if (!notasAcorde.length || !notasEscala.length) return false;

    // Convertimos a chroma (0-11) para que matemática pura determine la pertenencia
    const chromasAcorde = notasAcorde.map(n => Note.chroma(n)).filter(n => n !== undefined);
    const chromasEscala = notasEscala.map(n => Note.chroma(n)).filter(n => n !== undefined);

    // Retorna TRUE si TODAS las notas del acorde están dentro de la escala
    return chromasAcorde.every(chroma => chromasEscala.includes(chroma));
  }

  export function calcularDistancia(notaOrigen: string | null, notaDestino: string | null): number | null {
  if (!notaOrigen || !notaDestino) return null;

  const chromaOrigen = Note.chroma(notaOrigen);
  const chromaDestino = Note.chroma(notaDestino);

  if (chromaOrigen === undefined || chromaDestino === undefined) return null;

  // Retorna la distancia ascendente en semitonos (ej: de C a F = 5)
  return (chromaDestino - chromaOrigen + 12) % 12;
}

export function obtenerChromasDeAcorde(nombreAcorde: string): number[] {
  const notas = Chord.get(nombreAcorde).notes;
  return notas.map(n => Note.chroma(n)).filter(n => n !== undefined) as number[];
}

export function esRaizDiatonica(raiz: string | null, tonicaEscala: string, tipoEscala: string): boolean {
  if (!raiz) return false;
  
  const notasEscala = Scale.get(`${tonicaEscala} ${tipoEscala}`).notes;
  const chromasEscala = notasEscala.map(n => Note.chroma(n)).filter(n => n !== undefined);
  const chromaRaiz = Note.chroma(raiz);
  
  return chromasEscala.includes(chromaRaiz);
}