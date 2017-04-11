module.exports = {
  target: 'node',
  entry: 'index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    library: 'terminusCommunityColorSchemes',
    libraryTarget: 'umd',
  },
  resolve: {
    modules: ['.', 'node_modules', '..'],
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'awesome-typescript-loader' },
      { test: /\/schemes\//, loader: "raw-loader" },
    ]
  },
  externals: {
    'fs': true,
    '@angular/core': true,
    'terminus-terminal': true,
  }
}
