import path from 'path';

import fs from 'fs-extra';
import pkgDir from 'pkg-dir';
import { Express, Request, Response, Router} from 'express';
import nunjucks from 'nunjucks';

import { Aventura, AventuraConfig } from '@aventura-core';
import logo from '@aventura-res/logo.png';
import headTpl from './templates/head.njk';
import { asType, bindAllMethods, asyncHandler } from '@aventura-util';
import * as gmodels from '@aventura-modules/models';
import { ObjectId } from 'mongodb';

class HeadController{
    app: Express;
    config: AventuraConfig;

    constructor(app: Express, config: AventuraConfig){
        bindAllMethods(this);

        this.app = app;
        this.config = config;
    }

    encodeData(data: Record<any, any>){
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }


    async doGet(req: Request, res: Response){
        const result = await pkgDir(__dirname);
        if(!result){
            throw new Error('Internal App Error: pkgRoot didn\'t return anything');
        }
        
        /*It should read one time and cache in prod*/
        const root = path.resolve(result);
        const clientStats = await fs.readJSON(path.join(root, 'clientdist/clientstats.json'));
        
    
        const appdata: any = {
            backendVersion: PKG_VRS,
            backendHash: __webpack_hash__,
            csrf: req.aventura.csrf.token,
            csrfHeaderName: this.config.csrf.headerName,
            reCaptchaSiteKey: this.config.security.reCaptcha.siteKey
        }
    
    
        res.send(nunjucks.render(path.join(__dirname, headTpl), {
            lang: "es",
            appdatab64: this.encodeData(appdata),
            appdatab64nonce: res.nonces?.pop(),
            scriptPath: `/static/client/${clientStats.app.assets[0].name}`,
            logoPath: logo,
        }));
        res.end();
    }
}

const startRoutes = async (aventura: Aventura, app: Express, config: AventuraConfig) => {
    const controller = new HeadController(app, config);
    
    const routerAll = Router({
        caseSensitive: true,
        strict: true,
    });
    
    app.use('/*', routerAll);
    
    routerAll.get('/*', asyncHandler(controller.doGet));
    
}


export {
    startRoutes,
    HeadController
}