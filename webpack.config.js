
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin')
require('dotenv').config({ path: '.env' })

const isProd = process.env.NODE_ENV === 'production'
const appPublic = path.resolve(__dirname, 'public')
const appBuild = path.resolve(__dirname, 'build')
const appSrc = path.resolve(__dirname, 'src')

const sources = {}
const pages = [
  {
    name: 'index',
    js: path.resolve(appSrc, 'index.jsx'),
    html: path.resolve(appPublic, 'index.html')
  }
]

pages.forEach(page => {
  sources[page.name] = page.js
})

const rewrites = pages.map(page => {
  const filename = path.basename(page.html)
  const name = path.basename(page.html, '.html')
  return {
    from: new RegExp(`\/${name}`),
    to: `/${filename}`
  }
})

rewrites.push({
  from: /./,
  to: '/'
})

module.exports = {
  target: ['web', 'es5'],
  stats: 'errors-warnings',
  mode: process.env.NODE_ENV || 'development',
  performance: false,
  devtool: isProd ? false : 'source-map',
  entry: sources,
  output: {
    path: appBuild,
    publicPath: '/',
    filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].bundle.js',
    chunkFilename: isProd ? 'js/[name].[contenthash:8].chunk.js' : 'js/[name].chunk.js'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  plugins: [
    ...pages.map(page => {
      return new HtmlWebpackPlugin({
        inject: true,
        chunks: [page.name],
        template: page.html,
        filename: path.basename(page.html)
      })
    }),
    new InterpolateHtmlPlugin(HtmlWebpackPlugin, process.env),
    isProd && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: appPublic,
          to: appBuild,
          filter: (filepath) => !filepath.endsWith('.html')
        }
      ]
    })
  ].filter(Boolean),
  module: {
    strictExportPresence: true,
    rules: [
      {
        enforce: 'pre',
        exclude: /@babel(?:\/|\\{1,2})runtime/,
        test: /\.(js|jsx|css)$/,
        use: 'source-map-loader'
      },
      {
        test: /\.(js|jsx)$/i,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss)$/i,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(css)$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'images/[name].[hash].[ext]'
            }
          }
        ]
      },
      {
        test: /\.svg$/i,
        use: ['@svgr/webpack']
      }
    ]
  },
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin()
    ]
  },
  devServer: {
    compress: true,
    open: true,
    hot: true,
    liveReload: true,
    port: process.env.PORT || '3000',
    proxy: {
      '/api': 'http://localhost:3001'
    },
    static: {
      directory: appBuild
    },
    historyApiFallback: {
      disableDotRule: true,
      index: appPublic,
      rewrites
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    }
  },
}
