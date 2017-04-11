module.exports = {
  target: 'node',
  entry: './index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    library: 'terminusClickableLinks',
    libraryTarget: 'umd',
  },
  resolve: {
    modules: ['.', 'node_modules', '..'],
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
      },
    ]
  },
  externals: [{
    'fs': true,
    'untildify': true,
    '@angular/core': true,
    'terminus-core': true,
    'terminus-terminal': true,
  }]
}
