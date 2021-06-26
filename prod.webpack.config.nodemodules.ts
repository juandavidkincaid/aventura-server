import path from 'path';
import { cpus } from "os";
import fs from 'fs-extra';
import webpack, {Configuration, Compiler} from 'webpack';
/* import { CleanWebpackPlugin } from 'clean-webpack-plugin'; */
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import nodeExternals from './webpack-node-externals';
import TsCheckerPlugin from "fork-ts-checker-webpack-plugin";


const MomentLocalesPlugin = require("moment-locales-webpack-plugin");


const prodOrDev = (a: any, b: any)=>{
    return process.env.NODE_ENV === 'production' ? a : b;
};

const baseConfig: Configuration = {
    module: {
        rules: [
            {
                enforce: "pre",
                // We only want js files, don't add typescript.
                test: /\.js$/,
                loader: "source-map-loader",
            },
            {
                test: /\.svg$|\.ttf$|\.njk$|\.jpg$|\.png$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'static/[hash][ext]'
                }
            },
            {
                test: /\.(ts)$/i,
                exclude: [
                    path.resolve(__dirname, 'src/res'),
                    /(node_modules|bower_components)/,
                ],
                use: [
                    {
                        loader: "thread-loader", // Throw ts-loader into multi-threading to speed things up.
                        options: {
                            workers: cpus.length - 1,
                            poolTimeout: Infinity,
                        },
                    },
                    {
                        loader: "ts-loader",
                        options:{
                            happyPackMode: true,
                            transpileOnly: true,
                        }
                    }
                ]
            }
        ]
    },
    resolve:{
        alias:{
            /*Commons: path.resolve(__dirname, 'src/Commons'),*/
            '@aventura-src': path.resolve(__dirname, 'src'),
            '@aventura-core': path.resolve(__dirname, 'src/core'),
            '@aventura-util': path.resolve(__dirname, 'src/util'),
            '@aventura-modules': path.resolve(__dirname, 'src/modules'),
            '@aventura-res': path.resolve(__dirname, 'src/res'),
            '@aventura-dev': path.resolve(__dirname, prodOrDev('src/dev/prod.ts', 'src/dev')),
            'momentz': path.resolve(__dirname, 'src/core/modules/moment-timezone'),
        },
        extensions: ['.js', '.json', '.ts', '.tsx']
    },
    externals: [
        nodeExternals()
    ]
};


const serverConfig: Configuration = Object.assign({}, baseConfig, {
    target: 'node14.16',
    entry: {
        server: './src/server.ts'
    },
    output:{
        path: path.join(process.cwd(), './dist'),
        library: {
            type: 'commonjs'
        },
        publicPath: '/',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    },
    devtool: "source-map",
    optimization:{
        
    },
    plugins: [
        new TsCheckerPlugin({
            async: prodOrDev(false, true), // Only report after a run, freeing the process to work faster
            typescript: {
                diagnosticOptions: {
                    semantic: true,
                    syntactic: true,
                },
                build: prodOrDev(true, false), // Build mode speeds up consequential builds (evertyhing after the first build, based on the prior build)
                configFile: path.resolve(__dirname, "tsconfig.json"),
                mode: "write-tsbuildinfo",
                profile: prodOrDev(false, true), // Don't slow down production by profiling, only in development do we need this information.
            },
        }),
        /* new CleanWebpackPlugin({
            dry: process.env.NODE_ENV === 'development'
        }), */
        MomentLocalesPlugin({
            localesToKeep: ['es-us', 'en', 'es']
        }),
        new webpack.DefinePlugin({
            PKG_VRS: JSON.stringify(require("./package.json").version)
        }),
        prodOrDev(false, new webpack.HotModuleReplacementPlugin()),
        !!process.env.ANALYZE_BUNDLE && new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: path.resolve(__dirname, 'server-report.html')
        })
    ].filter(Boolean)
});


export default [serverConfig];
