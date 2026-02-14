/**
 * Сокращает текст до указанной длины с добавлением многоточия
 */
export function truncateText(text: string, maxLength: number = 20): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Разбивает длинный текст на несколько строк
   */
  export function wrapText(text: string, maxLength: number = 15): string[] {
    if (!text) return [''];
    if (text.length <= maxLength) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxLength) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  /**
   * Умное сокращение - берет первое слово и начало второго
   */
  export function smartTruncate(text: string, maxLength: number = 20): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    const words = text.split(' ');
    if (words.length === 1) {
      return truncateText(text, maxLength);
    }
    
    // Берем первое слово полностью + начало второго
    const firstWord = words[0];
    if (firstWord.length >= maxLength - 3) {
      return truncateText(firstWord, maxLength);
    }
    
    const remainingLength = maxLength - firstWord.length - 4; // -4 для пробела и "..."
    const secondWord = words[1].substring(0, remainingLength);
    
    return `${firstWord} ${secondWord}...`;
  }