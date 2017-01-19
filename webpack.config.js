// webpack --watch
module.exports = {
  entry: './clientsrc/charting.ts',
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
