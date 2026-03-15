/**
 * BLE Peripheral Service for PraiseProjector (Electron Main Process)
 *
 * This implements the BLE Peripheral (GATT Server) role for Electron,
 * allowing Android devices to discover and connect to this computer.
 *
 * IMPORTANT: This requires the @abandonware/bleno native module.
 * To enable BLE Peripheral mode, run:
 *
 *   npm install @abandonware/bleno @electron/rebuild
 *   npx electron-rebuild
 *
 * Windows requires:
 * - Windows 10+ with BLE 4.0 compatible Bluetooth adapter
 * - WinUSB driver for Bluetooth adapter (use Zadig tool)
 *
 * Linux requires:
 * - BlueZ with experimental features enabled
 *   sudo hciconfig hci0 up
 *   sudo hciconfig hci0 leadv 3
 *
 * macOS requires:
 * - macOS 10.15+
 * - No additional setup needed
 *
 * Usage:
 *   import { blePeripheralService } from './blePeripheral';
 *
 *   blePeripheralService.onConnection((deviceId) => { ... });
 *   blePeripheralService.onMessage((deviceId, message) => { ... });
 *   await blePeripheralService.startAdvertising('MyDevice');
 */

import { ipcMain, BrowserWindow } from "electron";

// Service and Characteristic UUIDs (must match Android and webBluetooth.ts)
const PP_SERVICE_UUID = "12345678123456781234567890abcdef0"; // bleno format: no dashes
const PP_CHARACTERISTIC_UUID = "12345678123456781234567890abcdef1";

// Convert standard UUID to bleno format (remove dashes)
// const toBlenoUUID = (uuid: string) => uuid.replace(/-/g, '');

export interface BLEMessage {
  op: string;
  [key: string]: unknown;
}

// Types for bleno (optional, in case module is installed)
interface BlenoCharacteristic {
  uuid: string;
  properties: string[];
  onWriteRequest?: (data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void) => void;
  onSubscribe?: (maxValueSize: number, updateValueCallback: (data: Buffer) => void) => void;
  onUnsubscribe?: () => void;
}

interface BlenoPrimaryService {
  uuid: string;
  characteristics: BlenoCharacteristic[];
}

interface BlenoModule {
  Characteristic: {
    new (options: {
      uuid: string;
      properties: string[];
      onWriteRequest?: (data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void) => void;
      onSubscribe?: (maxValueSize: number, updateValueCallback: (data: Buffer) => void) => void;
      onUnsubscribe?: () => void;
    }): BlenoCharacteristic;
    RESULT_SUCCESS: number;
  };
  PrimaryService: {
    new (options: { uuid: string; characteristics: BlenoCharacteristic[] }): BlenoPrimaryService;
  };
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  startAdvertising: (name: string, serviceUuids: string[], callback?: (error?: Error) => void) => void;
  stopAdvertising: (callback?: () => void) => void;
  setServices: (services: BlenoPrimaryService[], callback?: (error?: Error) => void) => void;
  state: string;
}

class BLEPeripheralService {
  private bleno: BlenoModule | null = null;
  private isAdvertising = false;
  private connectedDevices = new Map<string, (data: Buffer) => void>();
  private connectionCallback: ((deviceId: string, connected: boolean) => void) | null = null;
  private messageCallback: ((deviceId: string, message: BLEMessage) => void) | null = null;
  private deviceName = "PraiseProjector";

  private textDecoder = new TextDecoder();
  private textEncoder = new TextEncoder();

  constructor() {
    // Try to load bleno module
    try {
      // Store existing exit listeners before loading bleno
      const existingExitListeners = process.listeners("exit").slice();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.bleno = require("@abandonware/bleno");

      // Bleno registers an exit handler that can crash if Bluetooth isn't properly initialized
      // Remove bleno's exit handler and replace with our safe version
      const blenoExitListeners = process.listeners("exit").filter((listener) => !existingExitListeners.includes(listener));

      for (const listener of blenoExitListeners) {
        process.removeListener("exit", listener);
      }

      // Add our safe exit handler
      process.on("exit", () => {
        try {
          if (this.isAdvertising && this.bleno) {
            this.bleno.stopAdvertising();
          }
        } catch {
          // Ignore errors during exit - Bluetooth may not be available
        }
      });

      // Check if Bluetooth adapter is actually available before setting up
      if (this.bleno == null || this.bleno.state === "unsupported" || this.bleno.state === "unknown") {
        console.log("[BLE Peripheral] Bluetooth adapter not available or unsupported, state:", this.bleno?.state);
        // Don't set to null - keep it so we can listen for state changes
      }

      this.setupBleno();
      console.log("[BLE Peripheral] bleno module loaded, state:", this.bleno?.state);
    } catch (error) {
      console.log("[BLE Peripheral] bleno module not available - BLE peripheral mode disabled");
      console.log("[BLE Peripheral] To enable, run: npm install @abandonware/bleno && npx electron-rebuild");
      console.log("[BLE Peripheral] Error:", error);
      this.bleno = null;
    }
  }

  /**
   * Check if BLE Peripheral mode is available
   */
  public isAvailable(): boolean {
    return this.bleno !== null && this.bleno.state === "poweredOn";
  }

  /**
   * Get the current state
   */
  public getState(): string {
    return this.bleno?.state ?? "unavailable";
  }

  /**
   * Set callback for connection/disconnection events
   */
  public onConnection(callback: (deviceId: string, connected: boolean) => void): void {
    this.connectionCallback = callback;
  }

  /**
   * Set callback for incoming messages
   */
  public onMessage(callback: (deviceId: string, message: BLEMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Start advertising as a BLE peripheral
   */
  public async startAdvertising(name?: string): Promise<boolean> {
    if (!this.bleno) {
      console.error("[BLE Peripheral] bleno not available");
      return false;
    }

    if (this.isAdvertising) {
      return true;
    }

    this.deviceName = name ?? "PraiseProjector";

    return new Promise((resolve) => {
      if (this.bleno!.state === "poweredOn") {
        this.doStartAdvertising(resolve);
      } else {
        // Wait for powered on state
        const stateHandler = () => {
          if (this.bleno!.state === "poweredOn") {
            this.doStartAdvertising(resolve);
          } else {
            console.log(`[BLE Peripheral] Bluetooth state: ${this.bleno!.state}`);
            resolve(false);
          }
        };
        this.bleno!.on("stateChange", stateHandler);
      }
    });
  }

  /**
   * Stop advertising
   */
  public stopAdvertising(): void {
    if (!this.bleno || !this.isAdvertising) {
      return;
    }

    this.bleno.stopAdvertising(() => {
      console.log("[BLE Peripheral] Stopped advertising");
      this.isAdvertising = false;
    });
  }

  /**
   * Send a message to a connected device
   */
  public send(deviceId: string, message: BLEMessage): boolean {
    const notifyCallback = this.connectedDevices.get(deviceId);
    if (!notifyCallback) {
      console.warn(`[BLE Peripheral] Device ${deviceId} not connected`);
      return false;
    }

    try {
      const data = Buffer.from(this.textEncoder.encode(JSON.stringify(message) + "\n"));
      notifyCallback(data);
      return true;
    } catch (error) {
      console.error("[BLE Peripheral] Failed to send message:", error);
      return false;
    }
  }

  /**
   * Broadcast a message to all connected devices
   */
  public broadcast(message: BLEMessage): void {
    for (const [deviceId] of this.connectedDevices) {
      this.send(deviceId, message);
    }
  }

  /**
   * Get list of connected device IDs
   */
  public getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  private setupBleno(): void {
    if (!this.bleno) return;

    this.bleno.on("stateChange", (state) => {
      console.log(`[BLE Peripheral] Bluetooth state: ${state}`);
    });

    this.bleno.on("advertisingStart", (error) => {
      if (error) {
        console.error("[BLE Peripheral] Advertising start error:", error);
        this.isAdvertising = false;
        return;
      }
      console.log("[BLE Peripheral] Advertising started");
      this.isAdvertising = true;
    });

    this.bleno.on("advertisingStop", () => {
      console.log("[BLE Peripheral] Advertising stopped");
      this.isAdvertising = false;
    });
  }

  private doStartAdvertising(callback: (success: boolean) => void): void {
    if (!this.bleno) {
      callback(false);
      return;
    }

    // Create our characteristic
    const ppCharacteristic = new this.bleno.Characteristic({
      uuid: PP_CHARACTERISTIC_UUID,
      properties: ["read", "write", "writeWithoutResponse", "notify"],
      onWriteRequest: (data, _offset, _withoutResponse, cb) => {
        this.handleIncomingData("central", data);
        cb(this.bleno!.Characteristic.RESULT_SUCCESS);
      },
      onSubscribe: (_maxValueSize, updateValueCallback) => {
        console.log("[BLE Peripheral] Client subscribed to notifications");
        const deviceId = "central-" + Date.now(); // Simple device ID
        this.connectedDevices.set(deviceId, updateValueCallback);
        this.connectionCallback?.(deviceId, true);
      },
      onUnsubscribe: () => {
        console.log("[BLE Peripheral] Client unsubscribed from notifications");
        // Note: bleno doesn't provide which device unsubscribed
        // For simplicity, we clear all connections (in practice, you'd track this better)
        for (const [deviceId] of this.connectedDevices) {
          this.connectionCallback?.(deviceId, false);
        }
        this.connectedDevices.clear();
      },
    });

    // Create our service
    const ppService = new this.bleno.PrimaryService({
      uuid: PP_SERVICE_UUID,
      characteristics: [ppCharacteristic],
    });

    // Set services and start advertising
    this.bleno.setServices([ppService], (error) => {
      if (error) {
        console.error("[BLE Peripheral] Failed to set services:", error);
        callback(false);
        return;
      }

      this.bleno!.startAdvertising(this.deviceName, [PP_SERVICE_UUID], (error) => {
        if (error) {
          console.error("[BLE Peripheral] Failed to start advertising:", error);
          callback(false);
        } else {
          console.log(`[BLE Peripheral] Advertising as: ${this.deviceName}`);
          this.isAdvertising = true;
          callback(true);
        }
      });
    });
  }

  private handleIncomingData(deviceId: string, data: Buffer): void {
    try {
      const text = this.textDecoder.decode(data);
      const lines = text.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as BLEMessage;
          this.messageCallback?.(deviceId, message);
        } catch {
          console.warn("[BLE Peripheral] Invalid message:", line);
        }
      }
    } catch (error) {
      console.error("[BLE Peripheral] Failed to decode message:", error);
    }
  }
}

// Singleton instance
export const blePeripheralService = new BLEPeripheralService();

/**
 * Setup IPC handlers for BLE Peripheral (call from main.ts)
 */
export function setupBLEPeripheralIPC(mainWindow: BrowserWindow): void {
  // Forward connection events to renderer
  blePeripheralService.onConnection((deviceId, connected) => {
    mainWindow.webContents.send("ble-peripheral:connection", deviceId, connected);
  });

  // Forward message events to renderer
  blePeripheralService.onMessage((deviceId, message) => {
    mainWindow.webContents.send("ble-peripheral:message", deviceId, message);
  });

  ipcMain.handle("ble-peripheral:is-available", () => {
    return blePeripheralService.isAvailable();
  });

  ipcMain.handle("ble-peripheral:get-state", () => {
    return blePeripheralService.getState();
  });

  ipcMain.handle("ble-peripheral:start-advertising", async (_event, name?: string) => {
    return blePeripheralService.startAdvertising(name);
  });

  ipcMain.handle("ble-peripheral:stop-advertising", () => {
    blePeripheralService.stopAdvertising();
    return true;
  });

  ipcMain.handle("ble-peripheral:send", (_event, deviceId: string, message: BLEMessage) => {
    return blePeripheralService.send(deviceId, message);
  });

  ipcMain.handle("ble-peripheral:broadcast", (_event, message: BLEMessage) => {
    blePeripheralService.broadcast(message);
    return true;
  });

  ipcMain.handle("ble-peripheral:get-connected-devices", () => {
    return blePeripheralService.getConnectedDevices();
  });
}
