import dns from 'dns';
import https from 'https';

const resolver = new dns.promises.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']);

// In-memory DNS cache with 5-minute TTL
interface CacheEntry {
  ip: string;
  expiresAt: number;
}
const dnsCache = new Map<string, CacheEntry>();

/**
 * Fallback to Google DNS-over-HTTPS (DoH) if UDP port 53 is intercepted or timed out
 */
async function resolveViaDoH(hostname: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.Answer && Array.isArray(data.Answer)) {
      const aRecord = data.Answer.find((ans: any) => ans.type === 1);
      if (aRecord && aRecord.data) {
        return aRecord.data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve hostname using public DNS with fallback to Google DoH and caching
 */
export async function resolveHost(hostname: string): Promise<string | null> {
  // Check cache first
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ip;
  }

  // 1. Try public DNS resolver (8.8.8.8 / 1.1.1.1)
  try {
    const addresses = await resolver.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      const ip = addresses[0];
      dnsCache.set(hostname, { ip, expiresAt: Date.now() + 300000 }); // 5 min TTL
      return ip;
    }
  } catch {
    // Continue to DoH fallback
  }

  // 2. Fallback to Google DNS-over-HTTPS
  const dohIp = await resolveViaDoH(hostname);
  if (dohIp) {
    dnsCache.set(hostname, { ip: dohIp, expiresAt: Date.now() + 300000 });
    return dohIp;
  }

  return null;
}

/**
 * Custom lookup function compatible with Node.js http/https Agent and ws.WebSocket
 */
export function customLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  resolveHost(hostname)
    .then((ip) => {
      if (ip) {
        if (options && options.all) {
          callback(null, [{ address: ip, family: 4 }]);
        } else {
          callback(null, ip, 4);
        }
      } else {
        // Fallback to system lookup if all else fails
        dns.lookup(hostname, options, callback);
      }
    })
    .catch(() => {
      dns.lookup(hostname, options, callback);
    });
}

/**
 * Pre-configured HTTPS agent using the resilient DNS lookup
 */
export const resilientHttpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  timeout: 10000,
});
