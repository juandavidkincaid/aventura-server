// Rewrite of liady/webpack-node-externals for typescript 4.2.3 and webpack 5
// There are missing tests and understandings

import fs from 'fs-extra';
import path from 'path';
import type {Configuration} from 'webpack';

type GetArrays<T> = T extends Array<any> ? T : never;
type ExternalItem = GetArrays<Configuration["externals"]>[0];

type AllowlistOption = string | RegExp | AllowlistFunctionType;

type ImportTypeCallback = (moduleName: string) => string;
/** a function that accepts the module name and returns whether it should be included */
type AllowlistFunctionType = (moduleName: string) => boolean;

interface ModulesFromFileType {
    exclude?: string | string[];
    include?: string | string[];
    fileName?: string;
    includeInBundle?: boolean;
    excludeFromBundle?: boolean;
}

type ExternalsOptions = {
    /**
         * An array for the externals to allow, so they will be included in the bundle.
         * Can accept exact strings ('module_name'), regex patterns (/^module_name/), or a
         * function that accepts the module name and returns whether it should be included.
         * Important - if you have set aliases in your webpack config with the exact
         * same names as modules in node_modules, you need to allowlist them so Webpack will know
         * they should be bundled.
         * @default []
         */
     allowlist?: AllowlistOption[];
     /**
      * @default ['.bin']
      */
     binaryDirs?: string[];
     /**
      * The method in which unbundled modules will be required in the code. Best to leave as
      * 'commonjs' for node modules.
      * @default 'commonjs'
      */
     importType?: 'var' | 'this' | 'commonjs' | 'amd' | 'umd' | ImportTypeCallback;
     /**
      * The folder in which to search for the node modules.
      * @default 'node_modules'
      */
     modulesDir?: string;
     /**
      * Additional folders to look for node modules.
      */
     additionalModuleDirs?: string[];
     /**
      * Read the modules from the package.json file instead of the node_modules folder.
      * @default false
      */
     modulesFromFile?: false | ModulesFromFileType;
     /**
      * @default false
      */
     includeAbsolutePaths?: boolean;
}

class Utils {
    static atPrefix = new RegExp('^@', 'g');

    static contains<T=any>(arr: T[], val: T) {
        return arr.includes(val);
    }

    static readDir(dirName: string) {
        if (!fs.existsSync(dirName)) {
            return [];
        }

        try {
            return fs
                .readdirSync(dirName)
                .map((module) => {
                    if (Utils.atPrefix.test(module)) {
                        Utils.atPrefix.lastIndex = 0;
                        try {
                            return fs
                                .readdirSync(path.join(dirName, module))
                                .map((scopedMod) => {
                                    return `${module}/${scopedMod}`;
                                });
                        } catch (e) {
                            return [module];
                        }
                    }
                    return [module];
                })
                .reduce((pv, cv) => {
                    return [...pv, ...cv];
                }, []);
        } catch (e) {
            return [];
        }
    }

    static getFilePath(options: ModulesFromFileType) {
        return path.resolve(process.cwd(), options.fileName ?? 'package.json');
    }

    static readFromPackageJson(options: boolean | ModulesFromFileType) {
        if (typeof options !== 'object') {
            options = {};
        }

        const includeInBundle = options.exclude || options.includeInBundle;
        const excludeFromBundle = options.include || options.excludeFromBundle;

        // read the file
        let packageJson: Record<any, any>;
        try {
            const packageJsonString = fs.readFileSync(Utils.getFilePath(options), 'utf8');
            packageJson = JSON.parse(packageJsonString);
        } catch (e) {
            return [];
        }

        let sections = [
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
        ];

        if (excludeFromBundle) {
            if(Array.isArray(excludeFromBundle)){
                sections = [
                    ...sections,
                    ...excludeFromBundle
                ]
            }else
            if(typeof excludeFromBundle === 'string'){
                sections = [
                    ...sections,
                    excludeFromBundle
                ]
            }else{

            }
        }

        if (includeInBundle) {
            sections = sections.filter(function (section) {
                if(Array.isArray(includeInBundle)){
                    return [
                        ...includeInBundle
                    ].indexOf(section) === -1;
                }else
                if(typeof includeInBundle === 'string'){
                    return [
                        includeInBundle
                    ].indexOf(section) === -1;
                }else{
    
                }
            });
        }

        // collect dependencies
        const deps = {} as Record<any, any>;
        sections.forEach(function (section) {
            Object.keys(packageJson[section] || {}).forEach(function (dep) {
                deps[dep] = true;
            });
        });
        return Object.keys(deps);
    }

    static containsPattern(arr: any[], val: any) {
        return arr && arr.some((pattern) => {
            if (pattern instanceof RegExp) {
                return pattern.test(val);
            } else if (typeof pattern === 'function') {
                return pattern(val);
            } else {
                return pattern == val;
            }
        });
    }

    static log(message: string) {
        console.log(`[webpack-node-externals] : ${message}`);
    }

    static error(errors: (string | (Error & any))[]) {
        throw new Error(
            errors
                .map(function (error) {
                    return `[webpack-node-externals] : ${error}`;
                })
                .join('\r\n')
        );
    }
}

class Externals{
    static scopedModuleRegex = new RegExp('@[a-zA-Z0-9][\\w-.]+/[a-zA-Z0-9][\\w-.]+([a-zA-Z0-9./]+)?', 'g');

    static getModuleName(request: string, includeAbsolutePaths: boolean){
        const delimiter = '/';

        if(includeAbsolutePaths){
            request = request.replace(/^.*?\/node_modules\//, '');
        }

        // check if scoped module
        if (Externals.scopedModuleRegex.test(request)) {
            // reset regexp
            Externals.scopedModuleRegex.lastIndex = 0;

            return request.split(delimiter, 2).join(delimiter);
        }
        return request.split(delimiter)[0];
    }

    static nodeExternals(options: ExternalsOptions={}): ExternalItem{
        const webpackInternalAllowlist = [/^webpack\/container\/reference\//];

        const allowlist = [
            ...webpackInternalAllowlist,
            ...(options.allowlist ?? [])
        ];

        const binaryDirs = [
            ...(options.binaryDirs ?? ['.bin'])
        ];

        const importType = options.importType ?? 'commonjs';
        const modulesDir = options.modulesDir ?? 'node_modules';

        const includeAbsolutePaths = !!options.includeAbsolutePaths;
        const additionalModuleDirs = options.additionalModuleDirs ?? [];

        // helper function
        const isNotBinary = (x: string)=>{
            return !Utils.contains(binaryDirs, x);
        }

        // create the node modules list
        let nodeModules = options.modulesFromFile
            ? Utils.readFromPackageJson(options.modulesFromFile)
            : Utils.readDir(modulesDir).filter(isNotBinary);
        
        additionalModuleDirs.forEach((additionalDirectory)=>{
            nodeModules = [
                ...nodeModules,
                ...Utils.readDir(additionalDirectory).filter(isNotBinary)
            ]
        });


        // return an externals function
        return (data, callback) => {

            /* const callback = (...args: any[])=>{
                console.log(args);
                return callbackbc(...args);
            }
             */
            const request = data.request;

            if(!request){
                throw new Error('request cannot be undefined');
            }

            const moduleName = Externals.getModuleName(request, includeAbsolutePaths);
            if (
                Utils.contains(nodeModules, moduleName) &&
                !Utils.containsPattern(allowlist, request)
            ) {
                if (typeof importType === 'function') {
                    return callback(undefined, importType(request));
                }
                // mark this module as external
                // https://webpack.js.org/configuration/externals/
                return callback(undefined, importType + ' ' + request);
            }
            callback();
        };
    }


}

export default Externals.nodeExternals;