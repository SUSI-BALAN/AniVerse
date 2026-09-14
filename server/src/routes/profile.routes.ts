import {Router} from 'express';
import type {AuthenticatedRequest} from '../types/auth.types.js';
import type {UserProfileRepository} from '../repositories/repository.contracts.js';
import type {Profile} from '../types/profile.types.js';
import {profilePatchSchema} from '../utils/profileValidation.js';
import {env} from '../utils/env.js';
import {AppError} from '../utils/appError.js';

export function createProfileRouter(repository: UserProfileRepository) {
  const router = Router();
  function identity(request: AuthenticatedRequest) {
    if (!request.authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
    return request.authUser;
  }
  function present(profile: Profile, request: AuthenticatedRequest) {
    const {userId: _internal, ...fields} = profile;
    const user = identity(request);
    return {...fields, mode: env.AUTH_MODE === 'supabase' ? 'cloud' : 'local',
      email: env.AUTH_MODE === 'supabase' ? user.email ?? null : null,
      joinedAt: env.AUTH_MODE === 'supabase' ? user.joinedAt ?? null : null};
  }
  router.get('/profile', async (request: AuthenticatedRequest, response, next) => {
    try { response.json({success: true, data: present(await repository.getProfile(identity(request).id), request)}); }
    catch (error) { next(error); }
  });
  router.patch('/profile', async (request: AuthenticatedRequest, response, next) => {
    try {
      // Legacy ownership hints are ignored. Every other unsupported field is rejected.
      const body = request.body;
      const input = body && typeof body === 'object' && !Array.isArray(body)
        ? Object.fromEntries(Object.entries(body).filter(([key]) => !['userId','user_id','ownerId'].includes(key))) : body;
      const patch = profilePatchSchema.parse(input);
      response.json({success: true, data: present(await repository.updateProfile(identity(request).id, patch), request)});
    } catch (error) { next(error); }
  });
  return router;
}
