import { networkInterfaces } from "os";

/**
 * Get the machine's actual IPv4 address (not 0.0.0.0 or ::)
 * Returns the first non-internal IPv4 address found, or "127.0.0.1" if none exists
 */
export function getMachineIpAddress(): string {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (nets) {
      for (const net of nets) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return "127.0.0.1";
}
