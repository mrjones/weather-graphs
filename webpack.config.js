// webpack --watch
module.exports = {
  entry: './clientsrc/d3_legacy.js',
  output: {
    filename: 'nws.js'
  },
  resolve: {
    extensions: ['', '.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  }
} 
