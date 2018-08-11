const path = require('path')

module.exports = {
  entry: {
    'index.ignore': 'file-loader?name=../index.html!pug-html-loader!' + path.resolve(__dirname, './index.pug'),
    'bundle': path.resolve(__dirname, 'index.js'),
  },
  context: __dirname,
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.(jpeg|png)?$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'assets/[name].[ext]'
          }
        }
      }
    ]
  },
}
