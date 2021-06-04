const path = require('path')
const webpack = require('webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const bundleAnalyzer = new BundleAnalyzerPlugin({
    analyzerPort: 0,
})

module.exports = options => {
    const sourceMapOptions = {
        exclude: [/node_modules/, /vendor/],
        filename: '[file].map',
        moduleFilenameTemplate: `webpack-terminus-${options.name}:///[resource-path]`,
    }

    if (process.env.CI) {
        sourceMapOptions.append = '\n//# sourceMappingURL=../../../app.asar.unpacked/assets/webpack/[url]'
    }

    const isDev = !!process.env.TERMINUS_DEV
    const config = {
        target: 'node',
        entry: 'src/index.ts',
        context: options.dirname,
        devtool: false,
        output: {
            path: path.resolve(options.dirname, 'dist'),
            filename: 'index.js',
            pathinfo: true,
            libraryTarget: 'umd',
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
                ...options.rules ?? [],
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
                { test: /\.scss$/, use: ['@terminus-term/to-string-loader', 'css-loader', 'sass-loader'], include: /(theme.*|component)\.scss/ },
                { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'], exclude: /(theme.*|component)\.scss/ },
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
            '@electron/remote',
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
            'ssh2',
            'ssh2/lib/protocol/constants',
            'socksv5',
            'stream',
            'windows-native-registry',
            'windows-process-tree',
            'windows-process-tree/build/Release/windows_process_tree.node',
            /^@angular/,
            /^@ng-bootstrap/,
            /^rxjs/,
            /^terminus-/,
            ...options.externals || [],
        ],
        plugins: [
            new webpack.SourceMapDevToolPlugin(sourceMapOptions),
        ],
    }
    if (process.env.PLUGIN_BUNDLE_ANALYZER === options.name) {
        config.plugins.push(bundleAnalyzer)
    }
    return config
}
