import path from 'path';
import * as http from 'http';
import * as https from 'https';
import { AddressInfo } from 'net';

import fs from 'fs-extra';
import express, { Express } from 'express';
import nunjucks from 'nunjucks';
import lodash from 'lodash';
import cookieParser from 'cookie-parser';
import mongoose, { Connection } from 'mongoose';
import type { DeepPartial } from 'ts-essentials';

import { bindAllMethods } from '@aventura-util';
import { startRoutes } from '@aventura-modules/controllers';

import {
    configureEnv
} from './env';

import {
    getConfiguration, AventuraConfig
} from './config';

import {
    configureMongoose,
    GridFS
} from './db';

import {
    configureMiddleware
} from './middleware';

import {
    devStatic,
    collectStatic
} from './static';

interface ServerError extends Error {
    code: string;
    message: string;
    response: {
        headers: { [key: string]: string; };
        body: string;
    };
}

declare global {
    namespace Aventura {
        interface Request {

        }

        interface Middleware {

        }
    }

    namespace Express {
        interface Request {
            aventura: Aventura.Request
        }
    }
}

type AventuraConfigThunk = DeepPartial<AventuraConfig> | (()=>(DeepPartial<AventuraConfig> | Promise<DeepPartial<AventuraConfig>>));

class Aventura {
    instanceconfig: AventuraConfigThunk;
    setup: boolean;
    builtconfig: AventuraConfig | null;
    builtapp: Express | null;
    builtserver: http.Server | https.Server | null;
    gridfsbucket: GridFS | null;
    dbconnection: Connection | null;
    middleware: Aventura.Middleware;

    constructor(insconfig: AventuraConfigThunk) {
        bindAllMethods(this);

        this.instanceconfig = insconfig;
        this.setup = false;
        this.builtconfig = null;
        this.builtapp = null;
        this.builtserver = null;
        this.gridfsbucket = null;
        this.dbconnection = null;
        this.middleware = {} as any;

        configureEnv();
    }

    // Async Getters

    get config() {
        return (async () => {
            if (!this.builtconfig) {
                this.builtconfig = await this.buildConfig(this.instanceconfig);
            }
            return this.builtconfig;
        })();

    }

    get app() {
        return (async () => {
            if (!this.builtapp) {
                this.builtapp = await this.buildApp();
            }
            return this.builtapp;
        })();
    }

    get gridfs() {
        return (async () => {
            if (!this.gridfsbucket) {
                this.gridfsbucket = new GridFS(mongoose.connection, (await this.config).db.gridfs.bucketname);
            }
            return this.gridfsbucket;
        })();
    }

    get db() {
        return (async () => {
            if (!this.dbconnection) {
                this.dbconnection = await configureMongoose(await this.app, await this.config);
            }
            return this.dbconnection;
        })();
    }

    get server() {
        return (async () => {
            if (!this.builtserver) {
                this.builtserver = await this.buildServer();
            }
            return this.builtserver;
        })();
    }

    get collectStatic() {
        return collectStatic;
    }

    async buildConfig(configThunk: AventuraConfigThunk) {
        const baseConfig = await getConfiguration();
        let config: DeepPartial<AventuraConfig>;
        if(typeof configThunk === 'function'){
            config = await configThunk();
        }else{
            config = configThunk;
        }
        return lodash.merge(baseConfig, config) as AventuraConfig;
    }

    async buildApp() {
        const config = await this.config;
        const app = express();
        nunjucks.configure(path.resolve(__dirname), {
            autoescape: true,
            express: app
        });

        app.use(express.raw());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.text());
        app.use(express.json());
        app.use(cookieParser());

        await configureMiddleware(this, app, config);

        await startRoutes(this, app, config);

        return app;
    }

    async buildServer() {
        const config = await this.config;
        const app = await this.app;

        if (config.security.ssl) {
            const sslConfig = config.security.ssl;
            const options = {
                key: await fs.readFile(sslConfig.privateKey, 'utf-8'),
                cert: await fs.readFile(sslConfig.certificate, 'utf-8'),
                ca: await fs.readFile(sslConfig.ca, 'utf-8')
            }
            return https.createServer(options, app);

        } else {
            return http.createServer(app);
        }
    }

    async runDevelopmentServer() {
        const config = await this.config;
        const app = await this.app;

        // await dev.db.development(this, app, config);
        // await dev.mailing.development(this, app, config);
    }

    async runServer() {
        const config = await this.config;
        const server = await this.server;

        // Initializes db connection
        await this.db;

        if (process.env.NODE_ENV === 'development' && !!config.dev) {
            await this.runDevelopmentServer();
        }

        return await new Promise<void>((rs, rj) => {

            server.once('error', (err: ServerError) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${config.server.port} is in use, check if no other instance of Aventura is running`);
                }
                rj(err);
            });

            server.listen(config.server.port, config.server.hostname, () => {
                console.log(`Listening on port ${config.server.port} at ${(server.address() as AddressInfo).address}`);
            });

            const closeServer = (signal: string)=>{
                console.log(`Closing Aventura Server due to ${signal} Signal`);
                server.close(()=>{
                    console.log('Aventura Server Closed');
                    rs();

                    process.exit(0);
                });
            };

            process.on('SIGTERM', closeServer);
            process.on('SIGINT', closeServer);
            process.on('SIGBREAK', closeServer);

        });
    }
}

export {
    Aventura,
    AventuraConfigThunk
}