const config = require('../config/config');

const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const windowMs = options.windowMs || config.rateLimit.windowMs;
  const max = options.max || config.rateLimit.max;
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter
      });
    }

    record.count++;
    next();
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

module.exports = rateLimit;
