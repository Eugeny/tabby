const path = require('path')
const webpack = require('webpack')

module.exports = {
  name: 'terminus-main',
  target: 'node',
  entry: {
    main: path.resolve(__dirname, 'lib/index.ts'),
  },
  mode: process.env.TERMINUS_DEV ? 'development' : 'production',
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
        test: /\.ts$/,
        use: {
          loader: 'awesome-typescript-loader',
          options: {
            configFileName: path.resolve(__dirname, 'tsconfig.main.json'),
          },
        },
      },
    ],
  },
  externals: {
    electron: 'commonjs electron',
    'electron-config': 'commonjs electron-config',
    'electron-vibrancy': 'commonjs electron-vibrancy',
    fs: 'commonjs fs',
    mz: 'commonjs mz',
    path: 'commonjs path',
    yargs: 'commonjs yargs',
    'windows-swca': 'commonjs windows-swca',
    'windows-blurbehind': 'commonjs windows-blurbehind',
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.DefinePlugin({
      'process.type': '"main"',
    }),
  ],
}
