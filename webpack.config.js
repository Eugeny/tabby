const path = require('path')
const webpack = require('webpack')

module.exports = {
  target: 'web',
  entry: {
    'index.ignore': 'file-loader?name=../index.html!pug-html-loader!' + path.resolve(__dirname, './index.pug'),
    'terminal.ignore': 'file-loader?name=terminal.html!pug-html-loader!' + path.resolve(__dirname, './terminal.pug'),
    index: path.resolve(__dirname, 'index.ts'),
    terminal: path.resolve(__dirname, 'terminal.ts'),
  },
  mode: process.env.TERMINUS_DEV ? 'development' : 'production',
  context: __dirname,
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    filename: '[name].js',
    chunkFilename: '[name].bundle.js',
  },
  resolve: {
    modules: [
      '../terminus/terminus-core/node_modules/',
      '../terminus/terminus-settings/node_modules/',
      '../terminus/terminus-terminal/node_modules/',
      '../terminus/node_modules',
      '../terminus/app/node_modules',
      '../terminus/app/assets/',
    ].map(x => path.join(__dirname, x)),
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
            paths: {
              "terminus-*": [path.resolve(__dirname, '../terminus-*')],
              "*": [path.resolve(__dirname, '../../app/node_modules/*')],
            }
          },
        },
      },
      { test: /terminus\/app\/dist/, use: ['script-loader'] },
      { test: /dist\/index/, use: ['raw-loader'] },
      {
        test: /\.(ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['css-loader', 'sass-loader'] },
      {
        test: /\.(jpeg|png|svg)?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]'
          }
        }
      }
    ],
  },
  externals: {
    'fs': 'commonjs fs',
    'module': 'commonjs module'
  }
}
