import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CachingService } from '../caching.service';
export declare class HttpCacheInterceptor implements NestInterceptor {
    private cachingService;
    private reflector;
    constructor(cachingService: CachingService, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
    private buildCacheKey;
    private buildDefaultCacheKey;
    private getCacheScope;
}
