/**
 * A Timeout Error
 */
export class TimeoutError extends Error {
    constructor() {
        super('A timeout has occured');
        this.name = 'TimeoutError';
    }
}

export class RemoteError extends Error {
    constructor(service, msg, stack) {
        super(`A remote service error has occured (${service}) => ${msg}`);
        this.name = "RemoteError";
        this.service = service;
        this.remoteStack = stack;
    }
}

export class UnexpectedResponseError extends Error {
    constructor(service, sample, msg) {
        super(`Remote service (${service}) responded with unexpected data => ${msg}`);
        this.name = "UnexpectedRemoteResponse";
        this.service = service;
        this.sample = sample;
    }
}

export class MockRequestError extends Error {
    constructor(response, request) {
        super(`Mock Request Error: ${response.status}: ${response.statusText}`);
        this.response = response;
        this.request = request;
    }
}