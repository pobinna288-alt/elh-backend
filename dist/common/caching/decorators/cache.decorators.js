"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoCache = exports.NO_CACHE_KEY = exports.CacheKey = exports.CACHE_KEY = exports.CacheTTL = exports.CACHE_TTL_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CACHE_TTL_KEY = 'cache_ttl';
const CacheTTL = (ttl) => (0, common_1.SetMetadata)(exports.CACHE_TTL_KEY, ttl);
exports.CacheTTL = CacheTTL;
exports.CACHE_KEY = 'cache_key';
const CacheKey = (key) => (0, common_1.SetMetadata)(exports.CACHE_KEY, key);
exports.CacheKey = CacheKey;
exports.NO_CACHE_KEY = 'no_cache';
const NoCache = () => (0, common_1.SetMetadata)(exports.NO_CACHE_KEY, true);
exports.NoCache = NoCache;
//# sourceMappingURL=cache.decorators.js.map