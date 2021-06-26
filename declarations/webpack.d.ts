declare var __webpack_public_path__: string;
declare var __webpack_hash__: string;

interface NodeRequire{
    context: (directory: string, includeSubdirs?: boolean, filter?: RegExp, mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once')=> any;
}