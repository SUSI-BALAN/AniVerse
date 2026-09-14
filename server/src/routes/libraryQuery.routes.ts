import {Router} from 'express';
import {z} from 'zod';
import type {AuthenticatedRequest} from '../types/auth.types.js';
import {collections,libraryQuerySchema,type LibraryQueryRepository} from '../repositories/libraryQuery.repository.js';
export function createLibraryQueryRouter(repository:LibraryQueryRepository){const router=Router();
  router.get('/library-membership',async(req:AuthenticatedRequest,res,next)=>{try{res.json({success:true,data:await repository.membership(req.authUser!.id)});}catch(error){next(error);}});
  router.get('/library/:collection',async(req:AuthenticatedRequest,res,next)=>{try{const collection=z.enum(collections).parse(req.params.collection);const query=libraryQuerySchema.parse(req.query);
    if((collection!=='watchlist'&&query.status)||(!['favorites','watchlist','recently-viewed'].includes(collection)&&['score','year'].includes(query.sort)))throw new z.ZodError([{code:'custom',path:['query'],message:'Filter or sort is not supported by this collection.'}]);
    res.json({success:true,data:await repository.list(req.authUser!.id,collection,query)});
  }catch(error){next(error);}});return router;}
