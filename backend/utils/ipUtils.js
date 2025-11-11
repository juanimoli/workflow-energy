// IP Utility: Extract and normalize client IP
// - Honors X-Forwarded-For (first entry)
// - Normalizes IPv6 loopback (::1) and IPv6 mapped 127.0.0.1
// - Trims whitespace
// - Falls back to req.ip / remoteAddress

function getClientIp(req) {
  try {
    const xff = req.headers['x-forwarded-for'];
    let ip = Array.isArray(xff)
      ? xff[0]
      : (xff ? xff.split(',')[0] : (req.ip || req.connection?.remoteAddress || ''));
    ip = (ip || '').trim();
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }
    // Basic sanitation: strip port if accidentally included (e.g., '1.2.3.4:1234')
    if (ip.includes(':') && ip.match(/^[0-9.]+:[0-9]+$/)) {
      ip = ip.split(':')[0];
    }
    return ip;
  } catch {
    return '127.0.0.1';
  }
}

module.exports = { getClientIp };
