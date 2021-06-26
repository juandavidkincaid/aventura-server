import type {Handler} from 'express';

const asyncHandler = (route: Handler): Handler => (async (req, res, next)=>{
    try{
        return await route(req, res, next);
    }catch(e){
        next(e);
    }
});

export {
    asyncHandler
}