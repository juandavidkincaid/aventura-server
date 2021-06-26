import {Express} from 'express';
import {
    Db,
    Cursor,
    GridFSBucket,
    GridFSBucketErrorCallback,
    GridFSBucketFindOptions,
    GridFSBucketOpenUploadStreamOptions,
    GridFSBucketReadStream,
    GridFSBucketWriteStream,
    ObjectId
} from 'mongodb';
import mongoose from 'mongoose';

import {AventuraConfig} from '@aventura-core';

const configureMongoose = async (app: Express, config: AventuraConfig) => {
    await mongoose.connect(config.security.mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
    return mongoose.connection;
}


/**
 * @description Promise Based Implementation
 */
class GridFS{
    private gridfsbucket?: GridFSBucket;
    private connection: mongoose.Connection;
    private bucketName: string;
    private dbconnected?: Db;

    constructor(connection: mongoose.Connection, bucketName='fs'){
        this.connection = connection;
        this.bucketName = bucketName;
    }

    async getDb(){
        if(this.connection.readyState === 1){ // ReadyState 1 == Connected
            return this.connection.db;
        }else{
            return await new Promise<Db>((rs, rj)=>{
                const onConnected = ()=>{
                    rs(this.connection.db);
                    this.connection.off('error', onError);
                };
                const onError = (...args: any[])=>{
                    rj(...args);
                    this.connection.off('connected', onConnected);
                };

                this.connection.once('connected', onConnected);
                this.connection.once('error', onError);
            });
        }
    }

    async db(){
        if(!this.dbconnected){
            this.dbconnected = await this.getDb();
            this.connection.once('disconnected', ()=>{
                delete this.dbconnected;
            });
        }
        return this.dbconnected;
    }

    async bucket(){
        if(!this.gridfsbucket){
            this.gridfsbucket = await Promise.race([
                (async()=>{
                    const db = await this.db();
                    return new GridFSBucket(db, {
                        bucketName: this.bucketName
                    });
                })(),
                (async()=>{
                    await new Promise((rs, rj)=>setTimeout(rs, 1000 * 10));
                    throw new Error('GridFSBucket was not created due to timeout 10s');
                })()
            ]);
        }
        return this.gridfsbucket;
    }

    async delete(id: ObjectId): Promise<void> {
        const bucket = await this.bucket();
        return new Promise((rs, rj)=>{
            bucket.delete(id, (err, res)=>{
                if(err){
                    rj(err);
                }else{
                    rs();
                }
            });
        });
    }

    async find(filter: object, options?: GridFSBucketFindOptions): Promise<Cursor<any>> {
        const bucket = await this.bucket();
        return bucket.find(filter, options);
    }

    async openDownloadStream(id: ObjectId, options?: { start: number; end: number; }): Promise<GridFSBucketReadStream> {
        const bucket = await this.bucket();
        return bucket.openDownloadStream(id, options);
    }

    async openDownloadStreamByName(filename: string, options?: { revision: number; start: number; end: number; }): Promise<GridFSBucketReadStream> {
        const bucket = await this.bucket();
        return bucket.openDownloadStreamByName(filename, options);
    }

    async openUploadStream(filename: string, options?: GridFSBucketOpenUploadStreamOptions): Promise<GridFSBucketWriteStream> {
        const bucket = await this.bucket();
        return bucket.openUploadStream(filename, options);
    }

    async openUploadStreamWithId(id: string | number | object | ObjectId, filename: string, options?: GridFSBucketOpenUploadStreamOptions): Promise<GridFSBucketWriteStream> {
        const bucket = await this.bucket();
        return bucket.openUploadStreamWithId(id, filename, options);
    }
    
    async drop(): Promise<void> {
        const bucket = await this.bucket();
        return new Promise((rs, rj)=>{
            bucket.drop((err, res)=>{
                if(err){
                    rj(err);
                }else{
                    rs();
                }
            });
        });
    }

    async rename(id: ObjectId, filename: string): Promise<void> {
        const bucket = await this.bucket();
        return new Promise((rs, rj)=>{
            bucket.rename(id, filename, (err, res)=>{
                if(err){
                    rj(err);
                }else{
                    rs();
                }
            });
        });
    }
}

export {
    configureMongoose,
    GridFS
}
