/**
 * Web Bluetooth Service for PraiseProjector (Central/Client Role)
 *
 * Uses Web Bluetooth API (BLE) which provides hassle-free Bluetooth communication:
 * - No OS-level pairing required
 * - User selects device from a browser-style dialog
 * - Works on Electron, Chrome, Edge, and Android Chrome
 *
 * This implements the BLE CENTRAL (GATT Client) role:
 * - Discovers and connects to BLE peripherals (Android acting as GATT Server)
 * - Reads/writes characteristics and subscribes to notifications
 *
 * For the BLE PERIPHERAL (GATT Server) role on Electron, see:
 * - electron/blePeripheral.ts (requires @abandonware/bleno native module)
 *
 * Bidirectional BLE Architecture:
 * - When Electron is Central: Uses this webBluetooth.ts service
 *   - Electron discovers Android → Android accepts connection → bidirectional messaging
 * - When Electron is Peripheral: Uses blePeripheral.ts service
 *   - Android discovers Electron → Electron accepts connection → bidirectional messaging
 */

// PraiseProjector BLE Service UUID (custom UUID for our app)
const PP_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const PP_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

export interface BLEDevice {
  id: string;
  name: string;
  connected: boolean;
}

export interface BLEMessage {
  op: string;
  [key: string]: unknown;
}

class WebBluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private messageCallback: ((message: BLEMessage) => void) | null = null;
  private disconnectCallback: (() => void) | null = null;
  private textDecoder = new TextDecoder();
  private textEncoder = new TextEncoder();

  /**
   * Check if Web Bluetooth is available
   */
  public isAvailable(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Request a Bluetooth device from the user
   * Shows a browser dialog for device selection - no prior pairing needed!
   */
  public async requestDevice(): Promise<BLEDevice | null> {
    if (!this.isAvailable()) {
      console.warn("Web Bluetooth is not available");
      return null;
    }

    try {
      // Request device with our service UUID or by name
      // The browser will show a picker dialog
      // Note: Android device must be advertising the PP_SERVICE_UUID
      this.device = await navigator.bluetooth.requestDevice({
        // Accept devices that advertise our service UUID
        filters: [{ services: [PP_SERVICE_UUID] }],
        // Also request access to our service (in case not advertised)
        optionalServices: [PP_SERVICE_UUID],
      });

      // Listen for disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        console.info("App", "BLE device disconnected");
        this.disconnectCallback?.();
        this.cleanup();
      });

      return {
        id: this.device.id,
        name: this.device.name || "Unknown Device",
        connected: false,
      };
    } catch (error) {
      if ((error as Error).name === "NotFoundError") {
        // User cancelled the dialog
        console.debug("App", "BLE device selection cancelled");
        return null;
      }
      console.error("Failed to request BLE device:", error);
      throw error;
    }
  }

  /**
   * Connect to the selected device
   */
  public async connect(): Promise<boolean> {
    if (!this.device) {
      console.error("No device selected");
      return false;
    }

    try {
      console.info("App", `Connecting to BLE device: ${this.device.name}`);
      const server = await this.device.gatt?.connect();

      if (!server) {
        throw new Error("Failed to connect to GATT server");
      }

      // Get our service
      const service = await server.getPrimaryService(PP_SERVICE_UUID);

      // Get our characteristic for read/write/notify
      this.characteristic = await service.getCharacteristic(PP_CHARACTERISTIC_UUID);

      // Subscribe to notifications (incoming messages)
      if (this.characteristic.properties.notify) {
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
      }

      console.info("App", `Connected to BLE device: ${this.device.name}`);
      return true;
    } catch (error) {
      console.error("Failed to connect to BLE device:", error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Disconnect from the device
   */
  public disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }

  /**
   * Send a message to the connected device
   */
  public async send(message: BLEMessage): Promise<boolean> {
    if (!this.characteristic) {
      console.error("Not connected to BLE device");
      return false;
    }

    try {
      const data = this.textEncoder.encode(JSON.stringify(message) + "\n");
      await this.characteristic.writeValue(data);
      return true;
    } catch (error) {
      console.error("Failed to send BLE message:", error);
      return false;
    }
  }

  /**
   * Set callback for incoming messages
   */
  public onMessage(callback: (message: BLEMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Set callback for disconnection
   */
  public onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  /**
   * Get the connected device info
   */
  public getConnectedDevice(): BLEDevice | null {
    if (!this.device || !this.isConnected()) {
      return null;
    }
    return {
      id: this.device.id,
      name: this.device.name || "Unknown Device",
      connected: true,
    };
  }

  private handleNotification(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    try {
      const text = this.textDecoder.decode(target.value);
      // Messages are newline-delimited JSON
      const lines = text.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as BLEMessage;
          this.messageCallback?.(message);
        } catch {
          console.warn("Invalid BLE message:", line);
        }
      }
    } catch (error) {
      console.error("Failed to decode BLE message:", error);
    }
  }

  private cleanup(): void {
    this.characteristic = null;
    this.device = null;
  }
}

// Singleton instance
export const webBluetoothService = new WebBluetoothService();
