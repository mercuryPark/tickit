// Phase 0 placeholder. Day 3에서 구현.
// SSE (Server-Sent Events) 스트림을 ReadableStream<Uint8Array>에서 청크 단위로 파싱.

export async function* parseSSEStream(
  _stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
  throw new Error('[Tickit] parseSSEStream not implemented yet (Day 3)')
}
