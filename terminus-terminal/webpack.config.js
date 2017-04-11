module.exports = {
  target: 'node',
  entry: 'index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    library: 'terminusTerminal',
    libraryTarget: 'umd',
  },
  resolve: {
    modules: ['.', 'node_modules', '..'],
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      { test: /\.ts$/, use: 'awesome-typescript-loader' },
      { test: /schemes\/.*$/, use: "raw-loader" },
      { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
    ]
  },
  externals: {
    'fs': true,
    'fs-promise': true,
    'path': true,
    'node-pty': true,
    'child-process-promise': true,
    'fs-promise': true,
    '@angular/core': true,
    'terminus-core': true,
    'terminus-settings': true,
  }
}
