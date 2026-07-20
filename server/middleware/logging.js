export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      userId: req.userId || 'anonymous',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection.remoteAddress
    };

    const isError = res.statusCode >= 400;
    const level = isError ? 'ERROR' : 'INFO';
    console.log(`[${level}] ${JSON.stringify(logData)}`);
  });

  next();
};

export default requestLogger;
