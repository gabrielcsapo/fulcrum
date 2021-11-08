import fs from "fs";
import path from "path";
import webpack, { Compiler } from "webpack";
import MemoryFileSystem from "memory-fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import WebpackDevServer from "webpack-dev-server";

import { IReport } from "../types";

module.exports = (report: IReport, options: { outputDir: string }) => {
  const { outputDir } = options;
  return new Promise((resolve, reject) => {
    const outputFile = path.resolve(outputDir, "index.html");

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (ex: any) {
      console.log(ex.message);
    }

    fs.writeFileSync(
      path.resolve(outputDir, "report.json"),
      JSON.stringify(report)
    );

    let NODE_ENV: "development" | "production" = "development";
    if (process.env.NODE_ENV === "production") {
      NODE_ENV = process.env.NODE_ENV as "production";
    }
    const compiler = webpack({
      entry: require.resolve("module-detective-ui"),
      context: path.resolve(__dirname, ".."),
      output: {
        path: outputDir,
        publicPath: "./",
        filename: "bundle.js",
      },
      mode: NODE_ENV,
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
            NODE_ENV,
          },
          // actually bundle the report as a global variable
          // TODO: report is 20MB, it should be split up, and webpack should do that for us
          report: JSON.stringify(report),
        }),
        new HtmlWebpackPlugin({
          filename: outputFile,
          inlineSource: ".(js|css|eot|woff2|woff|ttf|svg)$",
          template: require.resolve("module-detective-ui/src/template.html"),
        }),
      ],
    });

    if (process.env.DEV_SERVER) {
      // don't actually generate the bundle on disk
      const msf = new MemoryFileSystem();
      compiler.outputFileSystem = msf;

      const server = new WebpackDevServer(
        {
          hot: true,
          historyApiFallback: true,
          compress: true,
          port: 8080,
        },
        compiler
      );

      server.listen(8080, "127.0.0.1", () => {
        console.log("Starting server on http://localhost:8080");
      });
    } else {
      compiler.run((error: any, stats: any) => {
        if (error || stats.errors) reject(error || stats.errors); // eslint-disable-line

        resolve(stats);
      });
    }
  });
};
