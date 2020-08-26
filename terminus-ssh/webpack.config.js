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
        devtoolModuleFilenameTemplate: 'webpack-terminus-ssh:///[resource-path]',
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
            { test: /\.svg/, use: ['svg-inline-loader'] },
        ],
    },
    externals: [
        'child_process',
        'fs',
        'keytar',
        'path',
        'ngx-toastr',
        'windows-native-registry',
        'windows-process-tree/build/Release/windows_process_tree.node',
        /^rxjs/,
        /^@angular/,
        /^@ng-bootstrap/,
        /^terminus-/,
    ],
}
