/**
 * Senhas.
 *
 * Nunca guardamos a senha em si, só um "hash": uma impressão digital que não
 * pode ser revertida. Usamos o algoritmo scrypt, que já vem no Node.js e é
 * propositalmente lento, para dificultar ataques de tentativa e erro.
 *
 * Formato salvo no banco:  scrypt:<sal em hex>:<hash em hex>
 * O "sal" é um valor aleatório por usuário: duas pessoas com a mesma senha
 * acabam com hashes diferentes.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;
const TAMANHO_HASH = 64;

/** Gera o texto que será salvo em `Usuario.senhaHash`. */
export async function gerarHashSenha(senha: string) {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, TAMANHO_HASH);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}

/** Confere se a senha digitada corresponde ao hash salvo. */
export async function conferirSenha(senha: string, salvo: string | null) {
  const [algoritmo, salHex, hashHex] = salvo?.split(":") ?? [];
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  const calculado = await scryptAsync(senha, Buffer.from(salHex, "hex"), esperado.length);

  // timingSafeEqual compara em tempo constante e não "vaza" quantos bytes acertaram.
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
