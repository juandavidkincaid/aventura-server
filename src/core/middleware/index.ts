import { Express, Request, Response, NextFunction } from 'express';
import { Aventura, AventuraConfig } from '@aventura-core';


import senderror from './senderror';
import proxyremoteaddress from './proxyremoteaddress';
import helmet from './helmet';
import csrf from './csrf';


interface MiddlewareGenerator {
    (aventura: Aventura, app: Express, config: AventuraConfig): (req: Request, res: Response, next: NextFunction) => Promise<any> | any
}

const middlewareStack: MiddlewareGenerator[] = [
    senderror,
    proxyremoteaddress,
    helmet,
    csrf
];

const configureMiddleware = async (aventura: Aventura, app: Express, config: AventuraConfig) => {
    for (const midd of middlewareStack) {
        app.use(await midd(aventura, app, config));
    }
}

export {
    MiddlewareGenerator,
    configureMiddleware
}

