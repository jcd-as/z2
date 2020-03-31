let path = require('path');
//let webpack = require('webpack');
module.exports = {
	entry: './test/src/test.js',
	output: {
		path: path.resolve(__dirname, '.'),
		filename: 'test/test.bundle.js'
	},
	module: {
		rules: [
			{ test: /\.css$/, use: 'css-loader' },
			{ test: /\.ts$/, use: 'ts-loader' }
		],
	},
	stats: {
		colors: true
	},
	devtool: 'source-map'
}
