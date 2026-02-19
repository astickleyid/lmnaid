function validateRequest(schema) {
  return (req, res, next) => {
    const data = { ...req.body, ...req.query, ...req.params };
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip further validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type check
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
          continue;
        }
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
        if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // Custom validation
      if (rules.validate && !rules.validate(value, data)) {
        errors.push(rules.message || `${field} is invalid`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

// Common validation schemas
const schemas = {
  register: {
    username: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/
    },
    email: {
      required: true,
      type: 'string',
      email: true
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8
    }
  },

  login: {
    username: {
      required: true,
      type: 'string'
    },
    password: {
      required: true,
      type: 'string'
    }
  },

  createStream: {
    title: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 140
    },
    category: {
      required: false,
      type: 'string'
    }
  },

  sendMessage: {
    content: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 2000
    }
  }
};

module.exports = {
  validateRequest,
  schemas
};
