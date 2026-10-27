/**
 * Utilitários centralizados de formatação numérica e monetária para o Casa Luma.
 * Regra do Sistema: Todos os valores numéricos (unidades, estoque, quantidades, dinheiro, moedas, totais)
 * devem ser exibidos com apenas e exatamente DUAS casas decimais.
 */

/**
 * Formata um valor numérico para exatamente 2 casas decimais.
 * Exemplo: 3 -> "3.00", 0 -> "0.00", 29.9 -> "29.90", 0.1234 -> "0.12"
 */
export const formatDecimal = (val: number | string | undefined | null, decimals: number = 2): string => {
  if (val === null || val === undefined || val === '') return (0).toFixed(decimals);
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return (0).toFixed(decimals);
  return num.toFixed(decimals);
};

/**
 * Formata valores monetários em Reais (R$) com exatamente 2 casas decimais.
 * Exemplo: 3 -> "R$ 3.00", 29.9 -> "R$ 29.90", 0 -> "R$ 0.00"
 */
export const formatMoney = (val: number | string | undefined | null): string => {
  return `R$ ${formatDecimal(val, 2)}`;
};

/**
 * Formata quantidades de estoque e unidades físicas com exatamente 2 casas decimais.
 * Exemplo: formatQuantity(3) -> "3.00"
 * Exemplo: formatQuantity(3, 'UN') -> "3.00 UN"
 * Exemplo: formatQuantity(0, 'UN') -> "0.00 UN"
 */
export const formatQuantity = (
  val: number | string | undefined | null,
  unit?: string | null
): string => {
  const formatted = formatDecimal(val, 2);
  return unit ? `${formatted} ${unit}` : formatted;
};
