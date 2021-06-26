import { Express, NextFunction, Request, Response } from 'express';

import { Aventura, AventuraConfig } from '@aventura-core';
import { bindAllMethods } from '@aventura-util';

import { MiddlewareGenerator } from '.';


declare global {
    namespace Express {
        interface Request {
            remoteAddress: string
        }
    }
}

class ProxyRemoteAddressMiddleware {

    constructor(aventura: Aventura, app: Express, config: AventuraConfig) {
        bindAllMethods(this);
    }

    async processRequest(req: Request, res: Response, next: NextFunction) {
        req.remoteAddress = req.get('X-Real-Ip') || req.socket.remoteAddress || '';
        next();
    }

    get middleware() {
        return this.processRequest;
    }
}

const getProxyRemoteAddress: MiddlewareGenerator = (aventura, app, config) => {
    const errorMid = new ProxyRemoteAddressMiddleware(aventura, app, config);
    return errorMid.middleware;
}


export default getProxyRemoteAddress;
