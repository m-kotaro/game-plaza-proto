import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NetworkManager } from "./NetworkManager";
import { HEARTBEAT_INTERVAL } from "@game-plaza/shared";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }

  simulateMessage(data: string): void {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}

let mockInstances: MockWebSocket[] = [];

beforeEach(() => {
  mockInstances = [];
  vi.useFakeTimers();
  vi.stubGlobal(
    "WebSocket",
    class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockInstances.push(this);
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("NetworkManager", () => {
  const TEST_URL = "ws://localhost:3001";

  describe("connect", () => {
    it("should create a WebSocket connection", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();

      expect(mockInstances).toHaveLength(1);
      expect(mockInstances[0].url).toBe(TEST_URL);
    });

    it("should set state to connecting", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();

      expect(manager.getState()).toBe("connecting");
    });

    it("should set state to connected on open", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      expect(manager.getState()).toBe("connected");
    });

    it("should not create multiple connections if already connecting", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      manager.connect();

      expect(mockInstances).toHaveLength(1);
    });

    it("should not create multiple connections if already connected", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      manager.connect();

      expect(mockInstances).toHaveLength(1);
    });
  });

  describe("disconnect", () => {
    it("should close the WebSocket and set state to disconnected", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      manager.disconnect();

      expect(mockInstances[0].closed).toBe(true);
      expect(manager.getState()).toBe("disconnected");
    });

    it("should not attempt reconnection after explicit disconnect", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      manager.disconnect();

      // Advance past any potential reconnect delay
      vi.advanceTimersByTime(60000);

      expect(mockInstances).toHaveLength(1);
    });
  });

  describe("send", () => {
    it("should send serialized message when connected", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      manager.send({ action: "heartbeat" });

      // init message is sent automatically on open, then the explicit heartbeat
      expect(mockInstances[0].sent).toHaveLength(2);
      expect(JSON.parse(mockInstances[0].sent[0])).toEqual({
        action: "init",
      });
      expect(JSON.parse(mockInstances[0].sent[1])).toEqual({
        action: "heartbeat",
      });
    });

    it("should send move message with position", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      manager.send({ action: "move", position: { x: 100, y: 200 } });

      // init message is sent first on open, then the explicit move
      expect(JSON.parse(mockInstances[0].sent[1])).toEqual({
        action: "move",
        position: { x: 100, y: 200 },
      });
    });

    it("should not send when disconnected", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.send({ action: "heartbeat" });

      expect(mockInstances).toHaveLength(0);
    });

    it("should not send when connecting", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();

      manager.send({ action: "heartbeat" });

      expect(mockInstances[0].sent).toHaveLength(0);
    });
  });

  describe("onMessage", () => {
    it("should dispatch parsed server messages to handlers", () => {
      const manager = new NetworkManager(TEST_URL);
      const handler = vi.fn();
      manager.onMessage(handler);

      manager.connect();
      mockInstances[0].simulateOpen();

      const message = JSON.stringify({
        type: "player_left",
        sessionId: "abc-123",
      });
      mockInstances[0].simulateMessage(message);

      expect(handler).toHaveBeenCalledWith({
        type: "player_left",
        sessionId: "abc-123",
      });
    });

    it("should dispatch to multiple handlers", () => {
      const manager = new NetworkManager(TEST_URL);
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      manager.onMessage(handler1);
      manager.onMessage(handler2);

      manager.connect();
      mockInstances[0].simulateOpen();

      const message = JSON.stringify({
        type: "player_left",
        sessionId: "abc-123",
      });
      mockInstances[0].simulateMessage(message);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should ignore invalid messages", () => {
      const manager = new NetworkManager(TEST_URL);
      const handler = vi.fn();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      manager.onMessage(handler);

      manager.connect();
      mockInstances[0].simulateOpen();

      mockInstances[0].simulateMessage("not valid json {{{");

      expect(handler).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should ignore messages with unknown type", () => {
      const manager = new NetworkManager(TEST_URL);
      const handler = vi.fn();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      manager.onMessage(handler);

      manager.connect();
      mockInstances[0].simulateOpen();

      mockInstances[0].simulateMessage(
        JSON.stringify({ type: "unknown_type", data: "test" }),
      );

      expect(handler).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("heartbeat", () => {
    it("should send heartbeat every HEARTBEAT_INTERVAL when connected", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      vi.advanceTimersByTime(HEARTBEAT_INTERVAL);

      // init message on open + first heartbeat
      expect(mockInstances[0].sent).toHaveLength(2);
      expect(JSON.parse(mockInstances[0].sent[0])).toEqual({
        action: "init",
      });
      expect(JSON.parse(mockInstances[0].sent[1])).toEqual({
        action: "heartbeat",
      });

      vi.advanceTimersByTime(HEARTBEAT_INTERVAL);

      // init + 2 heartbeats
      expect(mockInstances[0].sent).toHaveLength(3);
    });

    it("should stop heartbeat on disconnect", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      manager.disconnect();

      vi.advanceTimersByTime(HEARTBEAT_INTERVAL * 3);

      // Only init message sent before disconnect, no heartbeats
      expect(mockInstances[0].sent).toHaveLength(1);
      expect(JSON.parse(mockInstances[0].sent[0])).toEqual({
        action: "init",
      });
    });
  });

  describe("reconnection with exponential backoff", () => {
    it("should attempt reconnect after connection closes", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      mockInstances[0].simulateClose();

      // First reconnect delay: 1000 * 2^0 = 1000ms
      vi.advanceTimersByTime(1000);

      expect(mockInstances).toHaveLength(2);
    });

    it("should use exponential backoff delays", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      mockInstances[0].simulateClose();

      // Attempt 1: delay = 1000ms
      vi.advanceTimersByTime(999);
      expect(mockInstances).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(mockInstances).toHaveLength(2);

      // Simulate second close
      mockInstances[1].simulateClose();

      // Attempt 2: delay = 2000ms
      vi.advanceTimersByTime(1999);
      expect(mockInstances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(mockInstances).toHaveLength(3);

      // Simulate third close
      mockInstances[2].simulateClose();

      // Attempt 3: delay = 4000ms
      vi.advanceTimersByTime(3999);
      expect(mockInstances).toHaveLength(3);
      vi.advanceTimersByTime(1);
      expect(mockInstances).toHaveLength(4);
    });

    it("should cap delay at 30000ms", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      // Simulate multiple closes to get past 30s cap
      // attempt 0: 1000ms, attempt 1: 2000ms, attempt 2: 4000ms, attempt 3: 8000ms, attempt 4: 16000ms
      // At attempt 5 it would be 32000ms but capped at 30000ms - but max attempts is 5 so it won't happen
      // Let's test attempt 4: 1000 * 2^4 = 16000ms
      mockInstances[0].simulateClose();
      vi.advanceTimersByTime(1000); // attempt 1 fires
      mockInstances[1].simulateClose();
      vi.advanceTimersByTime(2000); // attempt 2 fires
      mockInstances[2].simulateClose();
      vi.advanceTimersByTime(4000); // attempt 3 fires
      mockInstances[3].simulateClose();
      vi.advanceTimersByTime(8000); // attempt 4 fires
      mockInstances[4].simulateClose();
      vi.advanceTimersByTime(16000); // attempt 5 fires
      expect(mockInstances).toHaveLength(6);
    });

    it("should stop reconnecting after max attempts (5)", () => {
      const manager = new NetworkManager(TEST_URL);
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      manager.connect();
      mockInstances[0].simulateOpen();

      // Simulate 5 reconnect attempts that all fail
      mockInstances[0].simulateClose();
      vi.advanceTimersByTime(1000);
      mockInstances[1].simulateClose();
      vi.advanceTimersByTime(2000);
      mockInstances[2].simulateClose();
      vi.advanceTimersByTime(4000);
      mockInstances[3].simulateClose();
      vi.advanceTimersByTime(8000);
      mockInstances[4].simulateClose();
      vi.advanceTimersByTime(16000);

      // 6th instance created from 5th attempt
      expect(mockInstances).toHaveLength(6);

      // Close 6th -> should NOT create another
      mockInstances[5].simulateClose();
      vi.advanceTimersByTime(60000);

      expect(mockInstances).toHaveLength(6);
      consoleSpy.mockRestore();
    });

    it("should reset reconnect attempts on successful connection", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();

      // Close and reconnect
      mockInstances[0].simulateClose();
      vi.advanceTimersByTime(1000);
      expect(mockInstances).toHaveLength(2);

      // Successful reconnection resets counter
      mockInstances[1].simulateOpen();

      // Close again - should start from attempt 0 again (1000ms delay)
      mockInstances[1].simulateClose();
      vi.advanceTimersByTime(1000);

      expect(mockInstances).toHaveLength(3);
    });
  });

  describe("getState", () => {
    it("should return disconnected initially", () => {
      const manager = new NetworkManager(TEST_URL);
      expect(manager.getState()).toBe("disconnected");
    });

    it("should return connecting after connect() is called", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      expect(manager.getState()).toBe("connecting");
    });

    it("should return connected after WebSocket opens", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      expect(manager.getState()).toBe("connected");
    });

    it("should return disconnected after WebSocket closes", () => {
      const manager = new NetworkManager(TEST_URL);
      manager.connect();
      mockInstances[0].simulateOpen();
      mockInstances[0].simulateClose();
      expect(manager.getState()).toBe("disconnected");
    });
  });
});
