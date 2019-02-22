module.exports = {
	mode: 'production',
	entry: {
		bundle: './index.js',
	},
	devtool: 'source-map',
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		sourceMapFilename: '[name].js.map'
	},
	resolve: {
		modules: ['node_modules']
	},
	/*
	module: {
	  rules: [
		{
		  test: /\.js$/,
		  //exclude: /(node_modules|bower_components)/,
		  use: {
			loader: 'babel-loader',
			options: {
			  presets: ['es2015']
			}
		  }
		}
	  ]
	}
	*/
}
