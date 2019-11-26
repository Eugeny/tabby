const path = require('path')
const webpack = require('webpack')

module.exports = {
  name: 'terminus',
  target: 'node',
  entry: {
    'index.ignore': 'file-loader?name=index.html!pug-html-loader!' + path.resolve(__dirname, './index.pug'),
    sentry: path.resolve(__dirname, 'lib/sentry.ts'),
    preload: path.resolve(__dirname, 'src/entry.preload.ts'),
    bundle: path.resolve(__dirname, 'src/entry.ts'),
  },
  mode: process.env.TERMINUS_DEV ? 'development' : 'production',
  optimization:{
     minimize: false,
  },
  context: __dirname,
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    filename: '[name].js',
  },
  resolve: {
    modules: ['src/', 'node_modules', '../node_modules', 'assets/'].map(x => path.join(__dirname, x)),
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
          },
        },
      },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.(png|svg)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'images/[name].[ext]',
          },
        },
      },
      {
        test: /\.(ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      },
    ],
  },
  externals: {
    '@angular/core': 'commonjs @angular/core',
    '@angular/compiler': 'commonjs @angular/compiler',
    '@angular/platform-browser': 'commonjs @angular/platform-browser',
    '@angular/platform-browser-dynamic': 'commonjs @angular/platform-browser-dynamic',
    '@angular/forms': 'commonjs @angular/forms',
    '@angular/common': 'commonjs @angular/common',
    '@ng-bootstrap/ng-bootstrap': 'commonjs @ng-bootstrap/ng-bootstrap',
    child_process: 'commonjs child_process',
    electron: 'commonjs electron',
    'electron-is-dev': 'commonjs electron-is-dev',
    fs: 'commonjs fs',
    'ngx-toastr': 'commonjs ngx-toastr',
    module: 'commonjs module',
    mz: 'commonjs mz',
    path: 'commonjs path',
    rxjs: 'commonjs rxjs',
    'zone.js': 'commonjs zone.js/dist/zone.js',
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.DefinePlugin({
      'process.type': '"renderer"'
    }),
  ],
}
