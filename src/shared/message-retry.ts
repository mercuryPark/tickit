// SW idle 대비 메시지 재시도. OPERATIONS_GUIDE §2.2 참고.
// chrome.runtime.sendMessage는 SW가 죽어있으면 에러. SW가 깨어난 후 재시도하면 성공함.

export async function sendMessageWithRetry<T>(
  message: unknown,
  maxRetries = 3,
  delayMs = 100,
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.runtime.sendMessage(message)
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message)
      }
      return response as T
    } catch (err) {
      lastError = err
      if (i === maxRetries - 1) break
      await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('sendMessageWithRetry failed')
}
