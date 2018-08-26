const path = require('path')
const webpack = require('webpack')

module.exports = {
  name: 'terminus-main',
  target: 'node',
  entry: {
    main: path.resolve(__dirname, 'lib/index.js'),
  },
  mode: process.env.DEV ? 'development' : 'production',
  context: __dirname,
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    filename: '[name].js',
  },
  resolve: {
    modules: ['lib/', 'node_modules', '../node_modules'].map(x => path.join(__dirname, x)),
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /lib[\\/].*\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-es2015'],
          },
        },
      },
    ],
  },
  externals: {
    electron: 'commonjs electron',
    'electron-config': 'commonjs electron-config',
    'electron-vibrancy': 'commonjs electron-vibrancy',
    'electron-squirrel-startup': 'commonjs electron-squirrel-startup',
    fs: 'commonjs fs',
    mz: 'commonjs mz',
    path: 'commonjs path',
    yargs: 'commonjs yargs',
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
}
