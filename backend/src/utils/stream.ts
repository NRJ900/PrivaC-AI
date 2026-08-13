/**
 * SSE Format utility to ensure data matches the expected frontend contract.
 * data: {"token": "text"}\n\n
 * data: {"done": true}\n\n
 */

export function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}
