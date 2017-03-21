const path = require("path")
const webpack = require("webpack")

module.exports = {
    target: 'node',
    entry: {
        'index.ignore': 'file-loader?name=index.html!pug-html-loader!./app/index.pug',
        'preload': './app/src/entry.preload.ts',
        'bundle': './app/src/entry.ts',
    },
    devtool: 'source-map',
    output: {
        path: 'app/assets/webpack',
        pathinfo: true,
        //publicPath: 'assets/webpack/',
        filename: '[name].js'
    },
    resolve: {
        modules: ['app/src/', 'node_modules', 'app/assets/'],
        extensions: ['.ts', '.js'],
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'awesome-typescript-loader',
            },
            {
              test: /\.pug$/,
              exclude: [
                /index.pug/
              ],
              loaders: [
                {
                  loader: 'apply-loader'
                },
                {
                  loader: 'pug-loader'
                }
              ]
            },
            { test: /\.css$/, loader: "style-loader!css-loader" },
            {
              test: /\.less$/,
              loader: "style-loader!css-loader!less-loader",
              exclude: [/app\/src\/components\//],
            },
            {
              test: /\.less$/,
              loader: "to-string-loader!css-loader!less-loader",
              include: [/app\/src\/components\//],
            },
            {
              test: /\.scss$/,
              use: ['style-loader', 'css-loader', 'sass-loader'],
              exclude: [/app\/src\/components\//],
            },
            {
              test: /\.scss$/,
              use: ['to-string-loader', 'css-loader', 'sass-loader'],
              include: [/app\/src\/components\//],
            },
            {
              test: /\.(png|svg)$/,
              loader: "file-loader",
              options: {
                name: 'images/[name].[hash:8].[ext]'
              }
            },
            {
                test: /\.(ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "file-loader",
                options: {
                  name: 'fonts/[name].[hash:8].[ext]'
                }
            },
            { test: /\.yaml$/, loader: "json-loader!yaml-loader" },
        ]
    },
    externals: {
        'fs': 'require("fs")',
        'buffer': 'require("buffer")',
        'system': '{}',
        'file': '{}',

        'net': 'require("net")',
        'electron': 'require("electron")',
        'remote': 'require("remote")',
        'shell': 'require("shell")',
        'ipc': 'require("ipc")',
        'crypto': 'require("crypto")',
        'node-pty': 'require("node-pty")',
        'child-process-promise': 'require("child-process-promise")',
    },
    plugins: [
        new webpack.ProvidePlugin({
            "window.jQuery": "jquery",
        }),
    ]
}


if (!process.env.DEV) {
    module.exports.plugins.push(new webpack.LoaderOptionsPlugin({
        minimize: true,
    }))
    module.exports.plugins.push(new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        mangle: false,
    }))
    module.exports.devtool = 'source-map'
}
