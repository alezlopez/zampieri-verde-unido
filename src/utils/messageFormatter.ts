
export const formatMessage = (text: string): string => {
  if (!text) return text;
  
  // Converter **texto** em <strong>texto</strong>
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Converter \n em <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
};
