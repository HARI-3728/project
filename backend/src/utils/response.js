const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode = 500, message = 'An error occurred', errors = null) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
