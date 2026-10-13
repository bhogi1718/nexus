import xss from 'xss';

const xssOptions = {
  whiteList: {},
  stripIgnoredTag: true,
  stripLeadingAndTrailingWhitespace: false
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  return xss(input, xssOptions);
};

export const sanitizeMessage = (content) => {
  if (!content || typeof content !== 'string') {
    return content;
  }
  return sanitizeInput(content.trim()).slice(0, 20000); // Encrypted envelopes are longer than the 5000-character plaintext limit
};

export default {
  sanitizeInput,
  sanitizeMessage
};
