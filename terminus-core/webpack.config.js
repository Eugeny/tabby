const path = require('path')
const webpack = require('webpack')

module.exports = {
    target: 'node',
    entry: 'src/index.ts',
    devtool: 'source-map',
    context: __dirname,
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        pathinfo: true,
        libraryTarget: 'umd',
        devtoolModuleFilenameTemplate: 'webpack-terminus-core:///[resource-path]',
    },
    mode: process.env.TERMINUS_DEV ? 'development' : 'production',
    optimization:{
        minimize: false,
    },
    resolve: {
        modules: ['.', 'src', 'node_modules', '../app/node_modules'].map(x => path.join(__dirname, x)),
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'awesome-typescript-loader',
                    options: {
                        configFileName: path.resolve(__dirname, 'tsconfig.json'),
                        typeRoots: [
                            path.resolve(__dirname, 'node_modules/@types'),
                            path.resolve(__dirname, '../node_modules/@types'),
                        ],
                        paths: {
                            "terminus-*": [path.resolve(__dirname, '../terminus-*')],
                            "*": [path.resolve(__dirname, '../app/node_modules/*')],
                        },
                    },
                },
            },
            { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
            { test: /\.scss$/, use: ['to-string-loader', 'css-loader', 'sass-loader'] },
            { test: /\.css$/, use: ['to-string-loader', 'css-loader'], include: /component\.css/ },
            { test: /\.css$/, use: ['style-loader', 'css-loader'], exclude: /component\.css/ },
            { test: /\.yaml$/, use: ['json-loader', 'yaml-loader'] },
            { test: /\.svg/, use: ['svg-inline-loader'] },
        ],
    },
    externals: [
        'electron',
        'fs',
        'os',
        'path',
        'windows-native-registry',
        /^rxjs/,
        /^@angular/,
        /^@ng-bootstrap/,
    ],
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
    ],
}
