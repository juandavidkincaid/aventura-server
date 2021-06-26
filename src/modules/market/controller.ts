import {Readable} from 'stream';
import { Express, Request, Response, Router } from 'express';
import * as yup from 'yup';
import { ObjectId } from 'mongodb';

import { Aventura, AventuraConfig } from '@aventura-core';
import { bindAllMethods, asyncHandler, b64dec } from '@aventura-util';
import * as gmodels from '@aventura-modules/models';


class MarketController {
    aventura: Aventura;
    app: Express;
    config: AventuraConfig;

    constructor(aventura: Aventura, app: Express, config: AventuraConfig) {
        bindAllMethods(this);

        this.aventura = aventura;
        this.app = app;
        this.config = config;
    }

    async decodeRestaurant(restaurant: any){
        const schema = yup.object().shape({
            name: yup.string().required('Restaurant name is required'),
            instagramProfile: yup.string().required('Restaurant instagramProfile is required'),
            phone: yup.string().required('Restaurant phone is required'),
            image: yup.object().required('Restaurant image is required').shape({
                content: yup.string().required('Restaurant image.content is required'),
                mime: yup.string().required('Restaurant image.mime is required')
            })
        });

        try{
            await schema.validate(restaurant);
        }catch(e){
            if(e instanceof yup.ValidationError){
                return e;
            }else{
                throw e;
            }
        }
        

        /* Transform */
        try{
            restaurant.image.content = Readable.from(b64dec(restaurant.image.content));
        }catch(e){
            return new yup.ValidationError(`Unable to decode image content`, '', 'image.content');
        }

        return restaurant;
    }

    async decodeRestaurantPartial(restaurant: any){
        const schema = yup.object().shape({
            name: yup.string(),
            instagramProfile: yup.string(),
            phone: yup.string(),
            image: yup.object().shape({
                content: yup.string(),
                mime: yup.string()
            })
        });

        try{
            await schema.validate(restaurant);
        }catch(e){
            if(e instanceof yup.ValidationError){
                return e;
            }else{
                throw e;
            }
        }
        

        /* Transform */
        try{
            if((restaurant?.image?.content ?? null) !== null){
                restaurant.image.content = Readable.from(b64dec(restaurant.image.content));
            }
        }catch(e){
            return new yup.ValidationError(`Unable to decode image content`, '', 'image.content');
        }

        return restaurant;
    }

    async encodeRestaurant(restaurant: gmodels.market.RestaurantDocument){
        return {
            id: restaurant.id,
            name: restaurant.name,
            instagramProfile: restaurant.instagramProfile,
            phone: restaurant.phone,
            image: {
                url: `/api/v1/market/restaurants/${restaurant.id}/image/`,
                mime: restaurant.image.mime
            },
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt
        }
    }

    async doGetRestaurants(req: Request, res: Response){
        const restaurants = await gmodels.market.Restaurant.find({}).exec();

        res.status(200);
        res.send(await Promise.all(restaurants.map(r=>this.encodeRestaurant(r))));
        res.end();
    }

    async doPostRestaurant(req: Request, res: Response){
        const gridfs = await this.aventura.gridfs;
        const restaurantDec = await this.decodeRestaurant(req.body);
        if(restaurantDec instanceof yup.ValidationError){
            res.sendError(400, {
                type: 'validation-error',
                reason: 'schema-validation-error',
                error: {
                    path: restaurantDec.path,
                    errors: restaurantDec.errors
                }
            });
            return;
        }
        const restaurant = new gmodels.market.Restaurant(restaurantDec);

        // Image
        const mediaId = new ObjectId();
        const uploadStream = await gridfs.openUploadStreamWithId(mediaId, mediaId.toHexString(), {contentType: restaurant.image.mime});
        restaurantDec.image.content.pipe(uploadStream);
        restaurant.image.mediaId = mediaId;

        await restaurant.save();

        res.status(200);
        res.send(await this.encodeRestaurant(restaurant));
        res.end();
    }

    async doGetRestaurant(req: Request, res: Response){
        const restaurant = await gmodels.market.Restaurant.findById(req.params.id).exec();
        if(!restaurant){
            res.sendError(404, {
                type: 'not-found',
                reason: 'resource-not-found',
                error: `Restaurant with id: '${req.params.id}' was not found`
            });
            return;
        }

        res.status(200);
        res.send(await this.encodeRestaurant(restaurant));
        res.end();
    }

    async doGetRestaurantImage(req: Request, res: Response){
        const restaurant = await gmodels.market.Restaurant.findById(req.params.id).exec();
        if(!restaurant){
            res.sendError(404, {
                type: 'not-found',
                reason: 'resource-not-found',
                error: `Restaurant with id: '${req.params.id}' was not found`
            });
            return;
        }

        const gridfs = await this.aventura.gridfs;
        const readStream = await gridfs.openDownloadStream(restaurant.image.mediaId);

        res.status(200);
        res.type(restaurant.image.mime);
        readStream.pipe(res); // Ended automatically
        
    }

    async doPatchRestaurant(req: Request, res: Response){
        const restaurant = await gmodels.market.Restaurant.findById(req.params.id).exec();
        if(!restaurant){
            res.sendError(404, {
                type: 'not-found',
                reason: 'resource-not-found',
                error: `Restaurant with id: '${req.params.id}' was not found`
            });
            return;
        }

        const gridfs = await this.aventura.gridfs;
        const restaurantDec = await this.decodeRestaurantPartial(req.body);
        if(restaurantDec instanceof yup.ValidationError){
            res.sendError(400, {
                type: 'validation-error',
                reason: 'schema-validation-error',
                error: {
                    path: restaurantDec.path,
                    errors: restaurantDec.errors
                }
            });
            return;
        }
        restaurant.set(restaurantDec);

        if((restaurantDec?.image?.content ?? null) !== null){
            // Delete Old
            await gridfs.delete(restaurant.image.mediaId);
            // Image
            const mediaId = new ObjectId();
            const uploadStream = await gridfs.openUploadStreamWithId(mediaId, mediaId.toHexString(), {contentType: restaurant.image.mime});
            restaurantDec.image.content.pipe(uploadStream);
            restaurant.image.mediaId = mediaId;
        }
        

        await restaurant.save();

        res.status(200);
        res.send(await this.encodeRestaurant(restaurant));
        res.end();
    }

    async doDeleteRestaurant(req: Request, res: Response){
        const restaurant = await gmodels.market.Restaurant.findById(req.params.id).exec();
        if(!restaurant){
            res.sendError(404, {
                type: 'not-found',
                reason: 'resource-not-found',
                error: `Restaurant with id: '${req.params.id}' was not found`
            });
            return;
        }

        await restaurant.delete();

        res.sendStatus(204);
        res.end();
    }
}

const startRoutes = async (aventura: Aventura, app: Express, config: AventuraConfig) => {
    const controller = new MarketController(aventura, app, config);

    const router = Router({
        caseSensitive: true,
        strict: true,
    });

    app.use('/api/v1/market/', router);
    router.get('/restaurants/', asyncHandler(controller.doGetRestaurants));
    router.get('/restaurants/:id/', asyncHandler(controller.doGetRestaurant));
    router.get('/restaurants/:id/image/', asyncHandler(controller.doGetRestaurantImage));

    aventura.middleware.csrf.exemptPath('/api/v1/market/restaurants/(.*)');
    router.post('/restaurants/', asyncHandler(controller.doPostRestaurant));
    router.patch('/restaurants/:id/', asyncHandler(controller.doPatchRestaurant));
    router.delete('/restaurants/:id/', asyncHandler(controller.doDeleteRestaurant));
}


export {
    startRoutes,
    MarketController
}