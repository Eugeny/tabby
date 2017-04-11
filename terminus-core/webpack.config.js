module.exports = {
  target: 'node',
  entry: './index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    library: 'terminusCore',
    libraryTarget: 'commonjs',
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
      { test: /\.yaml$/, use: ['json-loader', 'yaml-loader'] },
    ]
  },
  externals: [{
    'fs': true,
    'os': true,
    'path': true,
    'deepmerge': true,
    'untildify': true,
    '@angular/core': true,
  }]
}
