module.exports = {
  target: 'node',
  entry: 'src/index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: 'webpack-terminus-community-color-schemes:///[resource-path]',
  },
  resolve: {
    modules: ['.', 'node_modules', '../app/node_modules'],
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'awesome-typescript-loader' },
      { test: /\/schemes\//, loader: "raw-loader" },
    ]
  },
  externals: [
    /^rxjs/,
    /^@angular/,
    /^@ng-bootstrap/,
    /^terminus-/,
  ]
}
