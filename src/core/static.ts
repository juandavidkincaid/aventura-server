import path from 'path';

import pkgDir from 'pkg-dir';
import fs from 'fs-extra';
import express, { Express } from 'express';

import { Aventura, AventuraConfig } from '.';

const staticMarkers: { path: string, url: string, condition: (config: AventuraConfig) => boolean }[] = [
    {
        path: 'dist/static/',
        url: '/static',
        condition: (config: AventuraConfig) => {
            return !!config.dev;
        }
    },
    {
        path: 'clientdist/',
        url: '/static/client',
        condition: (config: AventuraConfig) => {
            return !!config.dev;
        }
    }
];

const devStatic = (aventura: Aventura, app: Express, config: AventuraConfig) => {
    const result = pkgDir.sync(__dirname);
    if (!result) {
        throw new Error('Internal App Error: pkgRoot didn\'t return anything');
    }
    const root = path.resolve(result);
    for (const marker of staticMarkers) {
        if (!marker.condition(config)) {
            continue;
        }

        console.log('Adding static entry');
        const servePath = path.join(root, marker.path);
        const serveUrl = marker.url;
        console.log(`Serving static '${servePath}' on ${serveUrl}`);

        app.use(serveUrl, express.static(servePath, {

        }));
    }
}

const collectStatic = async (folderPath: string, createLinks: boolean = true) => {
    const result = await pkgDir(__dirname);
    if (!result) {
        throw new Error('Internal App Error: pkgRoot didn\'t return anything');
    }
    const root = path.resolve(result);
    for (const marker of staticMarkers) {
        const destFolder = path.join(folderPath, marker.url);
        const srcFolder = path.join(root, marker.path);
        await fs.ensureDir(destFolder);
        if (createLinks) {
            await fs.ensureLink(srcFolder, destFolder);
        } else {
            await fs.copy(srcFolder, destFolder);
        }
    }
}

const startRoutes = async (aventura: Aventura, app: Express, config: AventuraConfig) => {
    if(process.env.NODE_ENV === 'development' && config.dev){
        devStatic(aventura, app, config);
    }
}

export {
    devStatic,
    collectStatic,
    startRoutes
}