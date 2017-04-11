module.exports = {
  target: 'node',
  entry: 'src/index.ts',
  devtool: 'source-map',
  output: {
    filename: './dist/index.js',
    pathinfo: true,
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: 'webpack-terminus-core:///[resource-path]',
  },
  resolve: {
    modules: ['.', 'src', 'node_modules', '../app/node_modules'],
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      { test: /\.ts$/, use: 'awesome-typescript-loader' },
      { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'], exclude: /components\// },
      { test: /\.scss$/, use: ['to-string-loader', 'css-loader', 'sass-loader'], include: /components\// },
      { test: /\.css$/, use: ['to-string-loader', 'css-loader', 'sass-loader'] },
      { test: /\.yaml$/, use: ['json-loader', 'yaml-loader'] },
    ]
  },
  externals: [
    'electron',
    'fs',
    'os',
    'path',
    'deepmerge',
    'untildify',
    'js-yaml',
    /^rxjs/,
    /^@angular/,
    /^@ng-bootstrap/,
  ]
}
