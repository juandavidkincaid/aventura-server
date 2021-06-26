import { MongoMemoryServer } from 'mongodb-memory-server';

import { Aventura, AventuraConfigThunk } from '@aventura-src/core';

const mongod = new MongoMemoryServer();

const config: AventuraConfigThunk = async ()=>({
    dev: true,
    security: {
        mongoDbUrl: await mongod.getUri(),
    }
});

const aventura = new Aventura(config);

(async ()=>{
    /* (async ()=>{
        await aventura.collectStatic('../staticFiles/', false);
        console.log('Collected');
    })(); */

    await aventura.runServer();
})();

export { Aventura, AventuraConfig } from '@aventura-src/core';
export * as models from '@aventura-modules/models';