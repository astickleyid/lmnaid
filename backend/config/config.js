require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*']
  },

  // Streaming Configuration
  streaming: {
    rtmp: {
      port: parseInt(process.env.RTMP_PORT) || 1935,
      chunkSize: 60000,
      gopCache: true,
      ping: 30,
      pingTimeout: 60
    },
    http: {
      port: parseInt(process.env.STREAM_HTTP_PORT) || 8000,
      mediaRoot: process.env.MEDIA_ROOT || './media'
    },
    hls: {
      enabled: true,
      time: 2,
      listSize: 3,
      flags: 'delete_segments'
    },
    dash: {
      enabled: true,
      windowSize: 3,
      extraWindowSize: 5
    },
    quality: {
      profiles: [
        { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
        { name: '720p', width: 1280, height: 720, bitrate: '3000k' },
        { name: '480p', width: 854, height: 480, bitrate: '1500k' },
        { name: '360p', width: 640, height: 360, bitrate: '800k' }
      ]
    }
  },

  // Database Configuration
  database: {
    maxConnections: 10,
    timeout: 5000,
    busyTimeout: 3000,
    checkpointInterval: 300000, // 5 minutes
    walMode: true
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiry: '7d',
    refreshTokenExpiry: '30d',
    bcryptRounds: 12
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    streaming: {
      windowMs: 60 * 1000, // 1 minute
      max: 5 // 5 stream starts per minute
    }
  },

  // Redis Configuration (for production)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // CDN Configuration
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: process.env.CDN_PROVIDER || 'cloudflare',
    endpoint: process.env.CDN_ENDPOINT,
    key: process.env.CDN_KEY,
    secret: process.env.CDN_SECRET
  },

  // Storage Configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY
    },
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },

  // WebRTC Configuration
  webrtc: {
    enabled: true,
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302'
    ],
    turnServers: process.env.TURN_SERVERS?.split(',') || []
  },

  // Chat Configuration
  chat: {
    maxMessageLength: 2000,
    rateLimit: {
      messages: 5,
      windowMs: 5000 // 5 messages per 5 seconds
    },
    slowMode: {
      enabled: false,
      delay: 3000 // 3 seconds between messages
    }
  },

  // Moderation
  moderation: {
    autoMod: {
      enabled: true,
      profanityFilter: true,
      spamDetection: true,
      linkProtection: true
    },
    timeout: {
      duration: [60, 300, 600, 1800, 3600], // seconds
      maxDuration: 86400 // 24 hours
    }
  },

  // Analytics
  analytics: {
    enabled: true,
    retentionDays: 90,
    aggregationInterval: 300000 // 5 minutes
  },

  // Notifications
  notifications: {
    providers: {
      email: process.env.EMAIL_ENABLED === 'true',
      push: process.env.PUSH_ENABLED === 'true',
      sms: process.env.SMS_ENABLED === 'true'
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },

  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback/google'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:5173/auth/callback/github'
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback/discord'
    }
  },

  // Twitch Integration
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI,
    scopes: [
      'user:read:email',
      'channel:read:stream_key',
      'channel:manage:broadcast',
      'chat:read',
      'chat:edit'
    ]
  },

  // YouTube Integration
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET
  },

  // Monitoring
  monitoring: {
    enabled: true,
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};
