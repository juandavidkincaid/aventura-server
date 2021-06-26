import { Express } from 'express';

import { Aventura, AventuraConfig } from '@aventura-core';

import * as staticCore from '@aventura-core/static';

import * as head from './head';

const routes = [
    staticCore.startRoutes,
    head.startRoutes
];

export const startRoutes = async (aventura: Aventura, app: Express, config: AventuraConfig) => {
    for (const startRoutes of routes) {
        try{
            await startRoutes(aventura, app, config);
        }catch(e){
            if(process.env.NODE_ENV === 'development'){
                throw e;
            }else{
                console.error(e);
            }
        }
        
    }
}

export {
    head,
}