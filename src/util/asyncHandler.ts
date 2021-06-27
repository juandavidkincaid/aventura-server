import type {Handler} from 'express';

// Async Handler for reporting failure on promise resolution, fixed on Express 5.0
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