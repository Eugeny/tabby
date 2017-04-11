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
        path: path.join(__dirname, 'app', 'assets', 'webpack'),
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
              use: 'awesome-typescript-loader',
              exclude: [/node_modules/]
            },
            {
              test: /\.scss$/,
              use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader', 'sass-loader'],
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
            }
        ]
    },
    externals: {
      '@angular/core': 'commonjs @angular/core',
      '@angular/compiler': 'commonjs @angular/compiler',
      '@angular/platform-browser': 'commonjs @angular/platform-browser',
      '@angular/platform-browser-dynamic': 'commonjs @angular/platform-browser-dynamic',
      '@angular/forms': 'commonjs @angular/forms',
      '@angular/common': 'commonjs @angular/common',
      '@ng-bootstrap/ng-bootstrap': 'commonjs @ng-bootstrap/ng-bootstrap',
      'rxjs': 'commonjs rxjs',
      'zone.js': 'commonjs zone.js',
    },
    plugins: [
      new webpack.ProvidePlugin({
        "window.jQuery": "jquery",
      }),
    ]
}
