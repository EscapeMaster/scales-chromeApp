const webpack = require( 'webpack' ) ,
  CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin ,
  ExtractTextPlugin = require( 'extract-text-webpack-plugin' );

module.exports = {
  entry : {
    background : './src/background/index' ,
    app : './src/app/index'
  } ,
  output : {
    path : './src/bundle' ,
    filename : '[name].js'
  } ,
  module : {
    loaders : [
      {
        test : /\.js$/ ,

        // 有些模块我使用了源码而非编译好的代码，所以这些模块也要用 babel 转换一下。
        // 在下面的括号中使用竖线 | 分隔开要使用 babel 处理的 npm 包名
        exclude : /node_modules(?!(\/|\\?\\)(connect\.io|connect\.io-client)\1)/ ,
        loader : 'babel' ,
        query : {
          presets : [ 'es2015' , 'stage-3' ] ,
          plugins : [ 'transform-runtime' ]
        }
      } ,
      {
        test : /\.html$/ ,
        loader : 'vue-html'
      } ,
      {
        test : /\.scss$/ ,
        loader : ExtractTextPlugin.extract( 'style-loader' , 'css-loader?sourceMap!sass-loader?sourceMap' )
      }
    ]
  } ,
  plugins : [
    new ExtractTextPlugin( '[name].css' ) ,
    new CommonsChunkPlugin( {
      name : 'commons'
    } )
  ] ,
  watch : true ,
  devtool : '#source-map'
};
