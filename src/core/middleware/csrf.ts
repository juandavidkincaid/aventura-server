import crypto from 'crypto';
import url from 'url';
import lodash, { bindAll } from 'lodash';
import { Application, CookieOptions, NextFunction, Request, Response } from 'express';
import * as pathRegex from 'path-to-regexp';


import { Aventura, AventuraConfig } from '@aventura-core';
import { asType, asyncHandler, bindAllMethods, b64decu, b64encu } from '@aventura-util';

import { MiddlewareGenerator } from '.';

const randomStr = (len: number, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')=>{
    const chars: string[] = [];
    for(let i = 0; i < len; i++){
        chars.push(alphabet.charAt(crypto.randomInt(alphabet.length)));
    }
    return chars.join('');
}

declare global{
    namespace Aventura{
        interface Middleware{
            csrf: CsrfMiddleware
        }

        interface Request {
            csrf: InstanceType<typeof CsrfToken>
        }
    }
}

class CsrfToken{
    head: InstanceType<typeof CsrfMiddleware>;
    req: Request;
    res: Response;
    validated: boolean;
    private _sessionId: string | null;
    private _token: string | null;
    
    constructor(head: InstanceType<typeof CsrfMiddleware>, req: Request, res: Response){
        bindAllMethods(this);
        this.head = head;
        this.req = req;
        this.res = res;
        this.validated = false;
        this._token = null;
        this._sessionId = null;
        this.retrivePair();
    }

    get token(): string{
        if(!this._token){
            this.generatePair();
        }
        return this._token as string;
    }

    get sessionId(): string{
        if(!this._sessionId){
            this.generatePair();
        }
        return this._sessionId as string;
    }

    retrivePair(){
        this._sessionId = this.req.cookies[this.head.config.cookieName] ?? null;
        this._token = this.req.get(this.head.config.headerName as string) ?? null;

        return {token: this._token, sessionId: this._sessionId};
    }

    setSessionCookie(){
        const sessionId = this.sessionId;
        const config = this.head.config;
        this.res.cookie(config.cookieName, sessionId, {
            domain: config.cookieOpts.domain,
            httpOnly: config.cookieOpts.httpOnly,
            maxAge: config.cookieOpts.maxAge,
            path: config.cookieOpts.path,
            secure: config.cookieOpts.secure,
            signed: false,
            sameSite: config.cookieOpts.sameSite
        });
    }

    generatePair(){
        const sessionId = !!this._sessionId ? this._sessionId : randomStr(255);
        const expedition = Date.now();
        const expiration = expedition + this.head.config.tokenAge;
        const gtoken = [sessionId, expedition, expiration].join('::');
        const {keys: [key], salt} = this.head.generateKeys(null, 1);
        const hasher = crypto.createHmac('sha256', key);
        hasher.update(gtoken);
        const ghmac = b64encu(hasher.digest());
        const csrfToken = b64encu([ghmac, expedition, expiration, salt].join('::'));

        this._sessionId = sessionId;
        this._token = csrfToken;
    }

    validatePair(){
        const {token, sessionId} = this.retrivePair();
        if(!token || !sessionId){
            return false;
        }
        const decodedToken = b64decu(token);
        if(!decodedToken){
            return false;
        }
        let [hmac, expeditionStr, expirationStr, salt] = String(decodedToken).split('::');
        const [expedition, expiration] = [parseInt(expeditionStr, 10), parseInt(expirationStr, 10)];
        const gtoken = [sessionId, expedition, expiration].join('::');
        const {keys: [key]} = this.head.generateKeys(salt, 1);
        const hasher = crypto.createHmac('sha256', key);
        hasher.update(gtoken);
        const ghmac = b64encu(hasher.digest());

        if(crypto.timingSafeEqual(Buffer.from(hmac, 'utf-8'), Buffer.from(ghmac, 'utf-8'))){
            const now = Date.now();
            if(now >= expiration || now >= (expedition + this.head.config.tokenAge)){
                return false;
            }
        }else{
            return false;
        }
        this.validated = true;
        return true;
    }
}

type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

class CsrfMiddleware{
    app: Application | null;
    config: {
        headerName: string;
        trustedOrigins: string[],
        tokenAge: number, // 3 days
        secretKey: string,
        cookieName: string,
        cookieOpts: CookieOptions,
        onCsrfRejection?: (reason: string, req: Request, res: Response)=>void,
        onCsrfAcceptance?: (req: Request, res: Response)=>void,
    };
    exempts: pathRegex.MatchFunction[];

    constructor(config: DeepPartial<CsrfMiddleware["config"]>={}){
        bindAllMethods(this);
        this.app = null;
        this.config = {
            headerName: 'X-CSRF-Token',
            trustedOrigins: [],
            tokenAge: 3 * 24 * 60 * 60 * 1000, // 3 days
            secretKey: 'A-Sacret-Secret-Key',
            cookieName: 'csrftoken',
            cookieOpts: {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secure: true
            }
        }

        this.config = lodash.merge(this.config, config);

        this.exempts = [];
    }

    isSameDomain(host: string, pattern: string){
        if(!pattern){
            return false;
        }
        host = String(host);
        pattern = String(pattern).toLocaleLowerCase();
        return pattern[0] === '.' && (host.endsWith(pattern) || host === pattern.substring(1)) || host === pattern;
    }

    exemptPath(path: string){
        try{
            const matcher = pathRegex.match(path);
            this.exempts.push(matcher);
        }catch(e){
            throw e;
        }
    }

    exemptRoute(route: string){
        throw new Error('Not Implemented');
    }

    processRequest(req: Request, res: Response, next: NextFunction){
        if(req.aventura === undefined){
            req.aventura = {} as any;
        }
        req.aventura.csrf = new CsrfToken(this, req, res);

        let protect = true;

        for(const matcher of this.exempts){
            if(!!matcher(req.path)){
                protect = false;
                break;
            }
        }

        if(protect){
            this.protectRequest(req, res, next);
        }else{
            this.acceptRequest(req, res, next);
        }

    }

    protectRequest(req: Request, res: Response, next: NextFunction, safeMethods=['GET', 'HEAD', 'OPTIONS', 'TRACE']){
        if(safeMethods.includes(req.method)){
            this.acceptRequest(req, res, next);
            return;
        }

        if(req.secure){
            const referer = req.get('referer') ?? null;
            if(!referer){
                this.rejectRequest(req, res, 'NO REFERER');
                return;
            }
            let refererUrl;
            try{
                refererUrl = new url.URL(referer);
            }catch(e){
                this.rejectRequest(req, res, 'MALFORMED REFERER');
                return;
            }
            
            if([refererUrl.protocol, refererUrl.host].includes('')){
                this.rejectRequest(req, res, 'MALFORMED REFERER');
                return;
            }

            if(refererUrl.protocol !== 'https:'){
                this.rejectRequest(req, res, 'INSECURE REFERER');
                return;
            }

            let goodReferer = this.config.cookieOpts.domain;
            if(goodReferer !== null){
                let serverPortSplitted = req.hostname.split(':');
                let serverPort = serverPortSplitted.length < 2 ? '' : serverPortSplitted[1];
                if(!['443', '80'].includes(serverPort)){
                    goodReferer = `${goodReferer}:${serverPort}`;
                }
            }else{
                goodReferer = req.hostname;
            }

            const goodHosts = [...this.config.trustedOrigins];
            if(goodReferer){
                goodHosts.push(goodReferer);
            }

            let goodRefererHost = false;
            for(const goodHost of goodHosts){
                goodRefererHost = goodRefererHost || this.isSameDomain(refererUrl.host, goodHost);
                if(goodRefererHost){
                    break;
                }
            }

            if(!goodRefererHost){
                this.rejectRequest(req, res, 'BAD REFERER');
                return;
            }
        }

        this.validateRequest(req, res, next);
        return;
    }

    validateRequest(req: Request, res: Response, next: NextFunction){
        if(req.aventura.csrf.validatePair()){
            this.acceptRequest(req, res, next);
        }else{
            this.rejectRequest(req, res, 'INVALID TOKEN');
        }
    }

    rejectRequest(req: Request, res: Response, reason: string){
        const titleCase = (str: string) => str.replace(/(\w)(\S*)/g, (m, g1, g2)=>`${g1.toLocaleUpperCase()}${g2.toLocaleLowerCase()}`);
        if(typeof this.config.onCsrfRejection === 'function'){
            this.config.onCsrfRejection(reason, req, res);
        }else{
            res.status(403).send(`CsrfError: ${titleCase(reason)}`).end();
        }
    }

    acceptRequest(req: Request, res: Response, next: NextFunction){
        req.aventura.csrf.setSessionCookie();
        if(typeof this.config.onCsrfAcceptance === 'function'){
            this.config.onCsrfAcceptance(req, res);
        }
        next();
    }

    get middleware(){
        return asyncHandler(this.processRequest);
    }

    generateKeys(salt: string | null=null, numKeys=1){
        const s = salt === null ? crypto.randomBytes(16) : b64decu(salt);
        if(s !== null){
            const keylen = 32;
            const keysMerged = crypto.scryptSync(this.config.secretKey, s, keylen * numKeys, {cost: 2**14, blockSize: 8, parallelization: 1});
            const keys: Buffer[] = [];
            for(let i = 0; i < numKeys; i++){
                keys.push(keysMerged.slice(i * keylen, (i * keylen) + keylen));
            }
            return {
                keys,
                salt: b64encu(s)
            }
        }
        throw new Error ('Salt Cannot be null!');
    }
}

type CsrfConfig = DeepPartial<CsrfMiddleware["config"]>;

const getCsrfMiddleware: MiddlewareGenerator = (aventura, app, config) => {
    if (!config.csrf) {
        throw new Error('Configured Improperly: config.csrf is not set');
    }
    const csrf = new CsrfMiddleware(lodash.merge(asType<CsrfConfig>({
        secretKey: config.security.secretKey,
        onCsrfRejection: (reason: string, req: Request, res: Response) => {
            res.sendError(400, {
                reason: 'bad-request',
                type: 'csrf',
                error: `csrf:{${reason}}`
            });
        }
    }), config.csrf));

    aventura.middleware.csrf = csrf;

    return csrf.middleware;
}


export default getCsrfMiddleware;