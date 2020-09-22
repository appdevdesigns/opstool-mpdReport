module.exports = {
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
}
