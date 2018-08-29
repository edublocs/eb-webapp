const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './app/javascripts/app.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'csv.html',
      template: './app/csv.html'
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './app/index.html'
    }),
    new HtmlWebpackPlugin({
      filename: 'neweval.html',
      template: './app/neweval.html'
    }),
    new HtmlWebpackPlugin({
      filename: 'newstudent.html',
      template: './app/newstudent.html'
    }),
    new HtmlWebpackPlugin({
      filename: 'view.html',
      template: './app/view.html'
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  }
}
