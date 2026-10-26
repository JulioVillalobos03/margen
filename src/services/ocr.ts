import { Platform } from 'react-native';
import Ocr from '../../modules/margen-ocr';
export const hasLocalOcr = Platform.OS === 'android' && Ocr !== null;
export async function recognizeCapture(uri: string): Promise<string> {
  if (!hasLocalOcr || !Ocr) throw new Error('La lectura de imágenes requiere una compilación Android de Margen con el módulo OCR.');
  return Ocr.recognize(uri);
}
