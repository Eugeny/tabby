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
        moduleFilenameTemplate: `webpack-tabby-${options.name}:///[resource-path]`,
    }
    let SourceMapDevToolPlugin = webpack.SourceMapDevToolPlugin

    if (process.env.CI) {
        sourceMapOptions.append = '\n//# sourceMappingURL=../../../app.asar.unpacked/assets/webpack/[url]'
    }

    if (process.platform === 'win32' && process.env.TABBY_DEV) {
        SourceMapDevToolPlugin = webpack.EvalSourceMapDevToolPlugin
    }

    const isDev = !!process.env.TABBY_DEV
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
            publicPath: 'auto',
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
            alias: options.alias ?? {},
            modules: ['.', 'src', 'node_modules', '../app/node_modules', '../node_modules'].map(x => path.join(options.dirname, x)),
            extensions: ['.ts', '.js'],
        },
        ignoreWarnings: [/Failed to parse source map/],
        module: {
            rules: [
                ...options.rules ?? [],
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    use:                         {
                        loader: 'source-map-loader',
                        options: {
                            filterSourceMappingUrl: (url, resourcePath) => {
                                if (/node_modules/.test(resourcePath)) {
                                    return false
                                }
                                return true
                            },

                        },
                    },
                },
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(options.dirname, 'tsconfig.json'),
                            allowTsInNodeModules: true,
                        },
                    },
                },
                { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
                { test: /\.scss$/, use: ['@tabby-gang/to-string-loader', 'css-loader', 'sass-loader'], include: /(theme.*|component)\.scss/ },
                { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'], exclude: /(theme.*|component)\.scss/ },
                { test: /\.css$/, use: ['@tabby-gang/to-string-loader', 'css-loader'], include: /component\.css/ },
                { test: /\.css$/, use: ['style-loader', 'css-loader'], exclude: /component\.css/ },
                { test: /\.yaml$/, use: ['json-loader', 'yaml-loader'] },
                { test: /\.svg/, use: ['svg-inline-loader'] },
                {
                    test: /\.(ttf|eot|otf|woff|woff2|ogg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    type: 'asset',
                },
            ],
        },
        externals: [
            '@electron/remote',
            '@serialport/bindings',
            'any-promise',
            'child_process',
            'electron-promise-ipc',
            'electron-updater',
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
            'socksv5',
            'stream',
            'windows-native-registry',
            'windows-process-tree',
            'windows-process-tree/build/Release/windows_process_tree.node',
            /^@angular/,
            /^@ng-bootstrap/,
            /^rxjs/,
            /^tabby-/,
            ...options.externals || [],
        ],
        plugins: [
            new SourceMapDevToolPlugin(sourceMapOptions),
        ],
    }
    if (process.env.PLUGIN_BUNDLE_ANALYZER === options.name) {
        config.plugins.push(bundleAnalyzer)
        config.cache = false
    }
    return config
}
