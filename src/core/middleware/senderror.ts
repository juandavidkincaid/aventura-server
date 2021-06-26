import { Express, NextFunction, Request, Response } from 'express';

import { Aventura, AventuraConfig } from '@aventura-core';
import { bindAllMethods } from '@aventura-util';

import { MiddlewareGenerator } from '.';

type ErrorResponse = {
    /**
     * @type {string} The superset or module of failure
     */
    type: string,
    /**
     * @type {string} The reason of failure
     */
    reason: string,
    /**
     * @type {any} Payload response to return
     */
    payload?: any,
    /**
     * @type {any} Any extended error description
     */
    error?: any
}

declare global {
    namespace Express {
        interface Response {
            sendError: (status: number, response: ErrorResponse) => void
        }
    }
}

class SendErrorMiddleware {

    constructor(aventura: Aventura, app: Express, config: AventuraConfig) {
        bindAllMethods(this);
    }

    async processRequest(req: Request, res: Response, next: NextFunction) {
        res.sendError = (status, error) => {
            res.status(status);
            res.send(error);
            res.end();
        };
        next();
    }

    get middleware() {
        return this.processRequest;
    }
}

const getSendErrorMiddleware: MiddlewareGenerator = (aventura, app, config) => {
    const errorMid = new SendErrorMiddleware(aventura, app, config);
    return errorMid.middleware;
}


export default getSendErrorMiddleware;
