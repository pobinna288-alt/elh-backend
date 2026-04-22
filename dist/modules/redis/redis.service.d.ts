import Redis from 'ioredis';
export declare class RedisService {
    private readonly redis;
    constructor(redis: Redis);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    incrementCounter(key: string): Promise<number>;
    setnx(key: string, value: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    incr(key: string): Promise<number>;
    getCounter(key: string): Promise<number>;
    setHash(key: string, field: string, value: string): Promise<void>;
    getHash(key: string, field: string): Promise<string | null>;
    getAllHash(key: string): Promise<Record<string, string>>;
    addToSet(key: string, value: string): Promise<void>;
    removeFromSet(key: string, value: string): Promise<void>;
    getSet(key: string): Promise<string[]>;
    isMemberOfSet(key: string, value: string): Promise<boolean>;
}
