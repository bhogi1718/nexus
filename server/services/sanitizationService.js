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
  return sanitizeInput(content.trim()).slice(0, 5000); // Max 5000 chars
};

export default {
  sanitizeInput,
  sanitizeMessage
};
