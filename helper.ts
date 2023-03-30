import crypto, { createHash } from 'crypto'

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getISODate():string {
  let date: Date = new Date()
  return date.toISOString()
}

export function encrypt(data: string, key: string, initialization_vector: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, initialization_vector)
  let encrypted = cipher.update(data,'utf8','base64').toString()
  encrypted += cipher.final('base64')
  return encrypted
}

export function decrypt(data: string, key: string, initialization_vector: string): string{
  let decipher = crypto.createDecipheriv('aes-256-cbc', key, initialization_vector)
  let decrypted = decipher.update(data,'base64','utf8')
  return decrypted + decipher.final('utf8')
}

export function hash256(data: string){
  return createHash('md5').update(data).digest('hex')
}

export function encryptMnemonic(data: string[], key: string, initialization_vector: string): string{
  let encrypted: string = undefined
  for (let idx: number = 0; idx < data.length; idx++){
    encrypted = encrypt(encrypted + '+++' + data[idx], key, initialization_vector)
  }
  return encrypted
}

export function decryptMnemonic(data: string, length: number, key: string, initialization_vector: string): string[]{
  let decrypted: string[] = new Array(length)
  for (let idx: number = 0; idx < length; idx++){
    [data,decrypted[length-1-idx]] = decrypt(data, key, initialization_vector).split('+++')
  }
  return decrypted
}

export async function taskSpacer(delay_in_ms: number, spacer: string){
  await delay(delay_in_ms)
  console.log(spacer)
  await delay(delay_in_ms)
}