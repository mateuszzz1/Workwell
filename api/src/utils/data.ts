const FUSO_HORARIO = "America/Sao_Paulo";

function partesDaData(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
}

export function dataLocal(data = new Date()) {
  const partes = partesDaData(data);
  return new Date(`${partes.year}-${partes.month}-${partes.day}T00:00:00.000Z`);
}

export function adicionarDias(data: Date, quantidade: number) {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

export function chaveData(data: Date) {
  return data.toISOString().slice(0, 10);
}
