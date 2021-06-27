import moment from 'momentz';
import fs from 'fs-extra';
import request from 'supertest';
import {ObjectId} from 'mongodb';

import {Aventura, AventuraConfigThunk} from '@aventura-core';
import * as gmodels from '@aventura-modules/models';
import * as gcontrollers from '@aventura-modules/controllers';
import * as dbHandler from '@aventura-tests/db';
import { lte } from 'lodash';


beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clearDatabase();
});

afterAll(async () => {
    await dbHandler.closeDatabase();
});

describe("Market::Controller", ()=>{

    const config: AventuraConfigThunk = async ()=>({
        dev: true,
        security: {
            mongoDbUrl: await dbHandler.mongod.getUri(),
        }
    });

    const aventura = new Aventura(config);

    test('doGetRestaurants', async ()=>{
        let response;
        // Test Empty
        response = await request(await aventura.app)
            .get('/api/v1/market/restaurants/')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toStrictEqual([]);

        // Test One
        const restaurant = new gmodels.market.Restaurant({
            name: 'test',
            instagramProfile: 'test',
            phone: 'test',
            image: {
                mediaId: new ObjectId(),
                mime: 'test'
            }
        });
        await restaurant.save();

        response = await request(await aventura.app)
            .get('/api/v1/market/restaurants/')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toStrictEqual([{
            id: restaurant.id,
            name: restaurant.name,
            instagramProfile: restaurant.instagramProfile,
            phone: restaurant.phone,
            image: {
                url: `/api/v1/market/restaurants/${restaurant.id}/image/`,
                mime: restaurant.image.mime
            },
            createdAt: restaurant.createdAt.toISOString(),
            updatedAt: restaurant.createdAt.toISOString(),
        }]);
    });

    test('doPostRestaurant', async ()=>{
        let response;

        // Test Success
        response = await request(await aventura.app)
            .post('/api/v1/market/restaurants/')
            .send({
                name: 'test',
                instagramProfile: 'test',
                phone: 'test',
                image: {
                    content: 'test',
                    mime: 'text/text'
                }
            })
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toMatchObject({
            id: expect.stringMatching(/.*/),
            name: 'test',
            instagramProfile: 'test',
            phone: 'test',
            image: {
                url: expect.stringMatching(/\/api\/v1\/market\/restaurants\/\w+\/image\//),
                mime: 'text/text'
            },
            createdAt: expect.stringMatching(/.*/),
            updatedAt: expect.stringMatching(/.*/)
        });

        // Test Error
        response = await request(await aventura.app)
            .post('/api/v1/market/restaurants/')
            .send({
                instagramProfile: 'test',
                phone: 'test',
                image: {
                    content: 'test',
                    mime: 'text/text'
                }
            })
            .expect('Content-Type', /json/)
            .expect(400);

        expect(response.body).toMatchObject({
            type: 'validation-error',
            reason: 'schema-validation-error',
            error: {
                path: 'name',
                errors: expect.anything()
            }
        }); 
    });

    test('doGetRestaurant', async ()=>{
        let response;
        let id = new ObjectId();
        // Test Error
        response = await request(await aventura.app)
            .get(`/api/v1/market/restaurants/${id.toHexString()}/`)
            .expect('Content-Type', /json/)
            .expect(404);

        expect(response.body).toMatchObject({
            type: 'not-found',
            reason: 'resource-not-found',
            error: `Restaurant with id: '${id.toHexString()}' was not found`
        });

        // Test One
        const restaurant = new gmodels.market.Restaurant({
            name: 'test',
            instagramProfile: 'test',
            phone: 'test',
            image: {
                mediaId: new ObjectId(),
                mime: 'test'
            }
        });
        await restaurant.save();

        response = await request(await aventura.app)
            .get(`/api/v1/market/restaurants/${restaurant.id}/`)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toStrictEqual({
            id: restaurant.id,
            name: restaurant.name,
            instagramProfile: restaurant.instagramProfile,
            phone: restaurant.phone,
            image: {
                url: `/api/v1/market/restaurants/${restaurant.id}/image/`,
                mime: restaurant.image.mime
            },
            createdAt: restaurant.createdAt.toISOString(),
            updatedAt: restaurant.createdAt.toISOString(),
        });
    });

    test('doGetRestaurantImage', async ()=>{
        let response;
        let id = new ObjectId();
        // Test Error
        response = await request(await aventura.app)
            .get(`/api/v1/market/restaurants/${id.toHexString()}/image/`)
            .expect('Content-Type', /json/)
            .expect(404);

        expect(response.body).toMatchObject({
            type: 'not-found',
            reason: 'resource-not-found',
            error: `Restaurant with id: '${id.toHexString()}' was not found`
        });

        // Test One
        response = await request(await aventura.app)
            .post('/api/v1/market/restaurants/')
            .send({
                name: 'test',
                instagramProfile: 'test',
                phone: 'test',
                image: {
                    content: 'test',
                    mime: 'text/text'
                }
            })
            .expect('Content-Type', /json/)
            .expect(200);

        response = await request(await aventura.app)
            .get(`/api/v1/market/restaurants/${response.body.id}/image/`)
            .expect('Content-Type', /text\/text/)
            .expect(200);
    });

    test('doPatchRestaurant', async ()=>{
        let response;
        let id = new ObjectId();
        // Test Error
        response = await request(await aventura.app)
            .patch(`/api/v1/market/restaurants/${id.toHexString()}/`)
            .expect('Content-Type', /json/)
            .expect(404);

        expect(response.body).toMatchObject({
            type: 'not-found',
            reason: 'resource-not-found',
            error: `Restaurant with id: '${id.toHexString()}' was not found`
        });

        // Test One
        const restaurant = new gmodels.market.Restaurant({
            name: 'test',
            instagramProfile: 'test',
            phone: 'test',
            image: {
                mediaId: new ObjectId(),
                mime: 'test'
            }
        });
        await restaurant.save();

        response = await request(await aventura.app)
            .patch(`/api/v1/market/restaurants/${restaurant.id}/`)
            .send({
                name: 'test2'
            })
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toStrictEqual({
            id: restaurant.id,
            name: 'test2',
            instagramProfile: restaurant.instagramProfile,
            phone: restaurant.phone,
            image: {
                url: `/api/v1/market/restaurants/${restaurant.id}/image/`,
                mime: restaurant.image.mime
            },
            createdAt: restaurant.createdAt.toISOString(),
            updatedAt:  expect.stringMatching(/.*/)
        });
    });

    test('doDeleteRestaurant', async ()=>{
        let response;
        let id = new ObjectId();
        // Test Error
        response = await request(await aventura.app)
            .delete(`/api/v1/market/restaurants/${id.toHexString()}/`)
            .expect('Content-Type', /json/)
            .expect(404);

        expect(response.body).toMatchObject({
            type: 'not-found',
            reason: 'resource-not-found',
            error: `Restaurant with id: '${id.toHexString()}' was not found`
        });

        // Test One
        const restaurant = new gmodels.market.Restaurant({
            name: 'test',
            instagramProfile: 'test',
            phone: 'test',
            image: {
                mediaId: new ObjectId(),
                mime: 'test'
            }
        });
        await restaurant.save();

        response = await request(await aventura.app)
            .delete(`/api/v1/market/restaurants/${restaurant.id}/`)
            .expect(204);
    });
});