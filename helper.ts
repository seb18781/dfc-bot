export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

export function getISODate():string {
    let date: Date = new Date()
    return date.toISOString()
  }