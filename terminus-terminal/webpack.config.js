const path = require('path')

module.exports = {
  target: 'node',
  entry: 'src/index.ts',
  devtool: 'source-map',
  context: __dirname,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    pathinfo: true,
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: 'webpack-terminus-terminal:///[resource-path]',
  },
  resolve: {
    modules: ['.', 'src', 'node_modules', '../app/node_modules'].map(x => path.join(__dirname, x)),
    extensions: ['.ts', '.js'],
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        query: {
          configFileName: path.resolve(__dirname, 'tsconfig.json'),
          paths: {
            "terminus-*": [path.resolve(__dirname, '../terminus-*')],
            "*": [path.resolve(__dirname, '../app/node_modules/*')],
          }
        }
      },
      { test: /schemes\/.*$/, use: "raw-loader" },
      { test: /\.pug$/, use: ['apply-loader', 'pug-loader'] },
      { test: /\.scss$/, use: ['to-string-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['to-string-loader', 'css-loader', 'sass-loader'] },
    ]
  },
  externals: [
    'fs',
    'fs-promise',
    'font-manager',
    'path',
    'node-pty',
    'child-process-promise',
    /^rxjs/,
    /^@angular/,
    /^@ng-bootstrap/,
    /^terminus-/,
  ]
}
