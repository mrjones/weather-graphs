// npm install ts-loader --save
module.exports = {
  entry: './clientsrc/d3_legacy.js',
  output: {
    filename: 'nws.js'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  }
} 
