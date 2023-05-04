/**
 * Represents a unique identifier for a JSON-RPC request or response.
 * Can be a string, number, or null.
 * @typedef {string | number | null} JsonRpcId
 */

/**
 * Represents the parameters for a JSON-RPC method.
 * Can be of any type.
 * @typedef {any} JsonRpcParams
 */

/**
 * Represents the version of the JSON-RPC protocol.
 * Currently, only '2.0' is supported.
 * @typedef {'2.0'} JsonRpcVersion
 */

/**
 * Represents a JSON-RPC request object.
 * @typedef {Object} JsonRpcRequest
 * @property {JsonRpcVersion} jsonrpc - The version of the JSON-RPC protocol.
 * @property {JsonRpcId} [id] - The unique identifier for the JSON-RPC request. Optional.
 * @property {string} method - The name of the method to be invoked.
 * @property {JsonRpcParams} [params] - The parameters for the method. Optional.
 */

/**
 * Represents a JSON-RPC error object.
 * @typedef {Object} JsonRpcError
 * @property {JsonRpcErrorCodes} code - The error code that indicates the type of error.
 * @property {string} message - A short description of the error.
 * @property {any} [data] - Additional information about the error. Optional.
 */

export const JsonRpcErrorCodes = {
  // JSON-RPC 2.0 pre-defined errors
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ParseError: -32700,

  // App defined errors
  BadRequest: -50400, // equivalent to HTTP Status 400
  Unauthorized: -50401, // equivalent to HTTP Status 401
  Forbidden: -50403, // equivalent to HTTP Status 403
};

/**
 * Represents a JSON-RPC response, which can be either a success response or an error response.
 * @typedef {JsonRpcSuccessResponse | JsonRpcErrorResponse} JsonRpcResponse
 */

/**
 * Represents a successful JSON-RPC response object.
 * @typedef {Object} JsonRpcSuccessResponse
 * @property {JsonRpcVersion} jsonrpc - The version of the JSON-RPC protocol.
 * @property {JsonRpcId} id - The unique identifier for the JSON-RPC request.
 * @property {any} result - The result of the invoked method.
 * @property {undefined} [error] - Must be undefined in case of a successful response.
 */

/**
 * Represents an error JSON-RPC response object.
 * @typedef {Object} JsonRpcErrorResponse
 * @property {JsonRpcVersion} jsonrpc - The version of the JSON-RPC protocol.
 * @property {JsonRpcId} id - The unique identifier for the JSON-RPC request.
 * @property {never} [result] - Must not be present in case of an error response.
 * @property {JsonRpcError} error - The error object containing the error details.
 */

/**
 * Creates a JSON-RPC error response object.
 *
 * @function createJsonRpcErrorResponse
 * @param {JsonRpcId} id - The unique identifier for the JSON-RPC request.
 * @param {JsonRpcErrorCodes} code - The error code that indicates the type of error.
 * @param {string} message - A short description of the error.
 * @param {any} [data] - Additional information about the error. Optional.
 * @returns {JsonRpcErrorResponse} - A JSON-RPC error response object.
 */
export const createJsonRpcErrorResponse = (id, code, message, data) => {
  const error = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return {
    jsonrpc: '2.0',
    id,
    error,
  };
};

/**
 * Creates a JSON-RPC notification object.
 *
 * @function createJsonRpcNotification
 * @param {string} method - The name of the method to be invoked.
 * @param {JsonRpcParams} [params] - The parameters for the method. Optional.
 * @returns {JsonRpcRequest} - A JSON-RPC notification object.
 */
export const createJsonRpcNotification = (method, params) => {
  return {
    jsonrpc: '2.0',
    method,
    params,
  };
};

/**
 * Creates a JSON-RPC request object.
 *
 * @function createJsonRpcRequest
 * @param {JsonRpcId} id - The unique identifier for the JSON-RPC request.
 * @param {string} method - The name of the method to be invoked.
 * @param {JsonRpcParams} [params] - The parameters for the method. Optional.
 * @returns {JsonRpcRequest} - A JSON-RPC request object.
 */
export const createJsonRpcRequest = (id, method, params) => {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };
};

/**
 * Creates a JSON-RPC success response object.
 *
 * @function createJsonRpcSuccessResponse
 * @param {JsonRpcId} id - The unique identifier for the JSON-RPC request.
 * @param {any} [result] - The result of the invoked method. Optional.
 * @returns {JsonRpcSuccessResponse} - A JSON-RPC success response object.
 */
export const createJsonRpcSuccessResponse = (id, result) => {
  return {
    jsonrpc : '2.0',
    id,
    result  : result ?? null,
  };
};
