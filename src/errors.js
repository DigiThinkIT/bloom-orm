/**
 * A Timeout Error
 */
export class TimeoutError extends Error {
    /**
     * cosntructor
     */
    constructor() {
        super('A timeout has occured');
        this.name = 'TimeoutError';
    }
}

/**
 * Remote Error. Encapsulates the service, a message and remote error stack if available.
 */
export class RemoteError extends Error {
    /**
     * constructor
     * @param {string} service The service or model that threw the exception.
     * @param {string} msg A message indicating the reason.
     * @param {string} stack A stack trace of the remote error if available.
     */
    constructor(service, msg, stack) {
        super(`A remote service error has occured (${service}) => ${msg}`);
        this.name = "RemoteError";
        this.service = service;
        this.remoteStack = stack;
    }
}

/**
 * Unexpected remote response Error. Encapsulates service, a sample of the returned data and a message.
 */
export class UnexpectedResponseError extends Error {
    /**
     * 
     * @param {string} service The service or model that threw the exception.
     * @param {*} sample A sample of the data returned.
     * @param {string} msg A message indicating the reason.
     */
    constructor(service, sample, msg) {
        super(`Remote service (${service}) responded with unexpected data => ${msg}`);
        this.name = "UnexpectedRemoteResponse";
        this.service = service;
        this.sample = sample;
    }
}

/**
 * Mock request error. Encapsulates mock errors thrown on unit test rest services.
 */
export class MockRequestError extends Error {
    /**
     * constructor
     * @param {object} response The response object of the mock request
     * @param {object} request the request object of the mock request
     */
    constructor(response, request) {
        super(`Mock Request Error: ${response.status}: ${response.statusText}`);
        this.response = response;
        this.request = request;
    }
}