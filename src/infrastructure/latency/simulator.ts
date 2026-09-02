// Infrastructure: Latency & Network Error Simulator

let currentLatencyMs = 220; // default pleasant realistic latency
let simulateError = false;

export const latencyConfig = {
  getLatency: () => currentLatencyMs,
  setLatency: (ms: number) => {
    currentLatencyMs = ms;
  },
  isErrorSimulationActive: () => simulateError,
  setErrorSimulation: (enabled: boolean) => {
    simulateError = enabled;
  },
};

export async function simulateNetworkDelay<T>(fn: () => T | Promise<T>): Promise<T> {
  if (currentLatencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, currentLatencyMs));
  }

  if (simulateError) {
    throw new Error('Falha simulada no backend (HTTP 500: Internal Mock Server Error)');
  }

  return await fn();
}
