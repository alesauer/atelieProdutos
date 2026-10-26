/**
 * Utilitários para formatação de data e hora no fuso horário do Brasil (Horário de Brasília - America/Sao_Paulo).
 * Trata e converte corretamente datetimes UTC vindos do backend.
 */

export const parseUtcDate = (dateVal: string | Date | undefined | null): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  let str = String(dateVal).trim();
  // Se a string não possui indicador de fuso (Z ou offset +/-), adiciona Z para interpretar como UTC
  if (!str.endsWith('Z') && !str.includes('+') && !/T.*\d{2}:\d{2}:\d{2}[+-]/.test(str)) {
    str = `${str}Z`;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (
  dateVal: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = parseUtcDate(dateVal);
  if (!d) return typeof dateVal === 'string' ? dateVal : '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleString('pt-BR', options || defaultOptions);
};

export const formatDateOnly = (
  dateVal: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = parseUtcDate(dateVal);
  if (!d) return typeof dateVal === 'string' ? dateVal : '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  return d.toLocaleDateString('pt-BR', options || defaultOptions);
};
