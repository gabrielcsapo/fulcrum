const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const MemoryFileSystem = require("memory-fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackDevServer = require("webpack-dev-server");

module.exports = (report) => {
  return new Promise((resolve, reject) => {
    const output = path.resolve(process.cwd(), "report");
    const outputFile = path.resolve(output, "index.html");

    try {
      fs.mkdirSync(output, { recursive: true });
    } catch (ex) {
      console.log(ex);
    }

    fs.writeFileSync(
      path.resolve(output, "report.json"),
      JSON.stringify(report)
    );

    const compiler = webpack({
      entry: path.resolve(__dirname, "..", "src", "index.js"),
      context: path.resolve(__dirname, ".."),
      output: {
        path: output,
        publicPath: "./",
        filename: "bundle.js",
      },
      mode: process.env.NODE_ENV || "development",
      module: {
        rules: [
          {
            test: /\.m?js/,
            resolve: {
              fullySpecified: false,
            },
          },
          {
            test: /\.css$/,
            use: [
              {
                loader: "style-loader",
              },
              {
                loader: "css-loader",
              },
            ],
          },
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: [
                  require.resolve("@babel/preset-env"),
                  require.resolve("@babel/preset-react"),
                ],
                plugins: [
                  require.resolve("@babel/plugin-proposal-class-properties"),
                ],
              },
            },
          },
          {
            test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            use: [
              {
                loader: "url-loader?limit=10000&mimetype=application/font-woff",
              },
            ],
          },
        ],
      },
      resolve: {
        extensions: [".js", ".json", ".jsx", ".css"],
        modules: [path.resolve(__dirname, "node_modules"), "node_modules"],
      },
      plugins: [
        new webpack.DefinePlugin({
          "process.env": {
            NODE_ENV: JSON.stringify(process.env.NODE_ENV || "development"),
          },
          report: JSON.stringify(report),
        }),
        new HtmlWebpackPlugin({
          filename: outputFile,
          inlineSource: ".(js|css|eot|woff2|woff|ttf|svg)$",
          template: "./src/template.html",
        }),
      ],
    });

    if (process.env.DEV_FULCRUM) {
      const msf = new MemoryFileSystem();
      compiler.outputFileSystem = msf;

      const server = new WebpackDevServer(compiler, {
        hot: true,
        static: [output],
        historyApiFallback: true,
        compress: true,
        port: 8080,
      });

      server.start(8080, "127.0.0.1", () => {
        console.log("Starting server on http://localhost:8080");
      });
    } else {
      compiler.run((err, stats) => {
        if (err || stats.errors) reject(err || stats.errors); // eslint-disable-line

        resolve();
      });
    }
  });
};
