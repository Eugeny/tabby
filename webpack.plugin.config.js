const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const bundleAnalyzer = new BundleAnalyzerPlugin({
    analyzerPort: 0,
})

module.exports = options => {
    const isDev = !!process.env.TERMINUS_DEV
    const devtool = process.env.WEBPACK_DEVTOOL ?? (isDev && process.platform === 'win32' ? 'eval-cheap-module-source-map' : 'cheap-module-source-map')
    const config = {
        target: 'node',
        entry: 'src/index.ts',
        context: options.dirname,
        devtool,
        output: {
            path: path.resolve(options.dirname, 'dist'),
            filename: 'index.js',
            pathinfo: true,
            libraryTarget: 'umd',
            devtoolModuleFilenameTemplate: `webpack-terminus-${options.name}:///[resource-path]`,
        },
        mode: isDev ? 'development' : 'production',
        optimization:{
            minimize: false,
        },
        cache: !isDev ? false : {
            type: 'filesystem',
            cacheDirectory: path.resolve(options.dirname, 'node_modules', '.webpack-cache'),
        },
        resolve: {
            modules: ['.', 'src', 'node_modules', '../app/node_modules'].map(x => path.join(options.dirname, x)),
            extensions: ['.ts', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'awesome-typescript-loader',
                        options: {
                            configFileName: path.resolve(options.dirname, 'tsconfig.json'),
                            typeRoots: [
                                path.resolve(options.dirname, 'node_modules/@types'),
                                path.resolve(options.dirname, '../node_modules/@types'),
                            ],
                            paths: {
                                'terminus-*': [path.resolve(options.dirname, '../terminus-*')],
                                '*': [
                                    path.resolve(options.dirname, '../app/node_modules/*'),
                                    path.resolve(options.dirname, '../node_modules/*'),
                                ],
                            },
                        },
                    },
                },
                { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
                { test: /\.scss$/, use: ['@terminus-term/to-string-loader', 'css-loader', 'sass-loader'] },
                { test: /\.css$/, use: ['@terminus-term/to-string-loader', 'css-loader'], include: /component\.css/ },
                { test: /\.css$/, use: ['style-loader', 'css-loader'], exclude: /component\.css/ },
                { test: /\.yaml$/, use: ['json-loader', 'yaml-loader'] },
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
            'any-promise',
            'child_process',
            'electron-promise-ipc',
            'electron',
            'fontmanager-redux',
            'fs',
            'keytar',
            'macos-native-processlist',
            'native-process-working-directory',
            'net',
            'ngx-toastr',
            'os',
            'path',
            'readline',
            'serialport',
            'socksv5',
            'stream',
            'windows-native-registry',
            'windows-process-tree',
            'windows-process-tree/build/Release/windows_process_tree.node',
            'yargs/yargs',
            /^@angular/,
            /^@ng-bootstrap/,
            /^rxjs/,
            /^terminus-/,
            ...options.externals || [],
        ],
        plugins: [],
    }
    if (process.env.PLUGIN_BUNDLE_ANALYZER === options.name) {
        config.plugins.push(bundleAnalyzer)
    }
    return config
}
