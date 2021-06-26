import { Document, Model, model, Types, Schema, Query } from "mongoose";

interface RestaurantAbstract {
    name: string,
    instagramProfile: string,
    phone: string,
    image: {
        mediaId: Types.ObjectId,
        mime: string
    }
    createdAt: Date,
    updatedAt: Date
}

interface RestaurantDocument extends RestaurantAbstract, Document {}

interface RestaurantModel extends Model<RestaurantDocument> {

}


const RestaurantSchema = new Schema<RestaurantDocument, RestaurantModel>({
    _id: {
        type: Types.ObjectId,
        required: true,
        default: Types.ObjectId
    },
    name: {
        type: String,
        required: true,
    },
    instagramProfile: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    image: {
        type: new Schema({
            mediaId: {
                type: Types.ObjectId,
                required: true
            },
            mime: {
                type: String,
                required: true
            }
        }),
        required: true
    }
}, {
    collection: 'market.restaurants',
    _id: false,
    timestamps: true
});


const Restaurant = model('Market.Restaurant', RestaurantSchema);

export {
    RestaurantAbstract,
    RestaurantDocument,
    RestaurantSchema,
    Restaurant
}