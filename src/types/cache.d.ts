/**
 * Module that exports types pertaining to cache operations.
 */
declare module '@emulsify-cli/cache' {
  export type CacheBucket = 'systems' | 'variants';
  export type CacheItemPath = string[];
  export type CacheCheckout = string | void;

  export type CachedItemPathOptions = {
    /** Cache bucket containing the item. */
    bucket: CacheBucket;
    /** Path segments identifying the item within the cache entry. */
    itemPath: CacheItemPath;
    /** Repository whose contents are stored in the cache entry. */
    repository: string;
    /** Commit, branch, or tag requested for the repository. */
    checkout: CacheCheckout;
  };
}
