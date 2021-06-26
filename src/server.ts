import fs from 'fs-extra';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';

import { Aventura, AventuraConfigThunk } from '@aventura-src/core';
import * as gmodels from '@aventura-modules/models';

// Running

const mongod = new MongoMemoryServer();

const config: AventuraConfigThunk = async ()=>({
    dev: true,
    security: {
        mongoDbUrl: await mongod.getUri(),
    }
});

const aventura = new Aventura(config);

// Collect Static and Run Server
(async ()=>{
    /* (async ()=>{
        await aventura.collectStatic('../staticFiles/', false);
        console.log('Static Collected');
    })(); */

    await aventura.runServer();
})();

// Add Restaurant Samples
(async ()=>{
    const gridfs = await aventura.gridfs;
    const imageMediaIds: ObjectId[] = [];

    for(let k = 1; k<=8; k++){
        const mediaId = new ObjectId();
        const imagePath = require(`@aventura-res/samples/sample${k}.png`);
        const rStream = fs.createReadStream(`${__dirname}${imagePath}`);
        const uploadStream = await gridfs.openUploadStreamWithId(mediaId, mediaId.toHexString(), {contentType: 'image/png'});
        rStream.pipe(uploadStream);
        imageMediaIds.push(mediaId);
    }

    for(let i = 1; i <= 15; i++){
        
        const restaurant = new gmodels.market.Restaurant({
            name: `Sample (${i})`,
            instagramProfile: `@sample${i}`,
            phone: '333-444-1234',
            image: {
                mediaId: imageMediaIds[Math.floor(Math.random() * 1000) % imageMediaIds.length],
                mime: 'image/png'
            }
        });

        await restaurant.save();
    }
})();

// Running

export {
    Aventura,
    AventuraConfigThunk,
    gmodels as models
}