// ============================================
// SOCKET RECONNECTION MANAGER
// Handles socket reconnection with exponential backoff
// ============================================

interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

class SocketReconnectionManager {
  private retryCount = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private config: ReconnectionConfig;

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = {
      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      ...config,
    };
  }

  private calculateDelay(): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(2, this.retryCount);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);
    return Math.floor(cappedDelay + jitter);
  }

  startReconnection(reconnectFunction: () => void) {
    if (this.reconnectionTimer) return;

    this.retryCount++;

    if (this.retryCount > this.config.maxRetries) {
      this.config.onReconnectFailed?.();
      this.reset();
      return;
    }

    const delay = this.calculateDelay();
    this.config.onReconnecting?.(this.retryCount);

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionTimer = null;
      reconnectFunction();
    }, delay);
  }

  onSuccess() {
    this.reset();
    this.config.onReconnected?.();
  }

  reset() {
    this.retryCount = 0;
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}

export default SocketReconnectionManager;
