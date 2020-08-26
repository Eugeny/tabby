const path = require('path')

module.exports = {
    target: 'node',
    entry: 'src/index.ts',
    context: __dirname,
    devtool: 'cheap-module-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        pathinfo: true,
        libraryTarget: 'umd',
        devtoolModuleFilenameTemplate: 'webpack-terminus-terminal:///[resource-path]',
    },
    mode: process.env.TERMINUS_DEV ? 'development' : 'production',
    optimization: {
        minimize: false,
    },
    resolve: {
        modules: ['.', 'src', 'node_modules', '../app/node_modules', 'node_modules/xterm/src'].map(x => path.join(__dirname, x)),
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
                            "*": [
                                path.resolve(__dirname, '../app/node_modules/*'),
                                path.resolve(__dirname, './node_modules/xterm/src/*'),
                            ],
                        },
                    },
                },
            },
            { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
            { test: /\.scss$/, use: ['to-string-loader', 'css-loader', 'sass-loader'] },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.svg/, use: ['svg-inline-loader'] },
            {
                test: /\.(ttf|eot|otf|woff|woff2|ogg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 999999999999,
                    },
                },
            },
        ],
    },
    externals: [
        'child_process',
        'electron',
        'fontmanager-redux',
        'fs',
        'path',
        'macos-native-processlist',
        'windows-native-registry',
        '@terminus-term/node-pty',
        'windows-process-tree',
        'os',
        /^rxjs/,
        /^@angular/,
        /^@ng-bootstrap/,
        'ngx-toastr',
        /^terminus-/,
    ],
}
