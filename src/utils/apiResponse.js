function sendSuccess(res, data, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function sendError(res, error, fallbackMessage = "Ocurrio un error.", statusCode = 500) {
  const message = error && error.message ? error.message : fallbackMessage;

  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? String(error) : undefined
  });
}

module.exports = {
  sendSuccess,
  sendError
};
