import fs from "fs";
import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import WebpackDevServer from "webpack-dev-server";
import StatoscopeWebpackPlugin from "@statoscope/webpack-plugin";

import { IReport } from "../types";

export default function Report(
  report: IReport,
  options: { outputDir: string }
) {
  const { outputDir } = options;
  return new Promise((resolve, reject) => {
    const outputFile = path.resolve(outputDir, "index.html");

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (ex: unknown) {
      console.log((ex as NodeJS.ErrnoException).message);
    }

    fs.writeFileSync(
      path.resolve(outputDir, "report.json"),
      JSON.stringify(report)
    );

    let _NODE_ENV: "development" | "production" = "development";
    if (process.env.NODE_ENV === "production") {
      _NODE_ENV = process.env.NODE_ENV as "production";
    }
    const compiler = webpack({
      entry: require.resolve("module-detective-ui"),
      context: path.resolve(__dirname, ".."),
      output: {
        path: outputDir,
        publicPath: "./",
        filename: "[name].bundle.js",
      },
      mode: _NODE_ENV,
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
                cacheCompression: true,
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
      optimization: {
        runtimeChunk: "single",
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
            },
          },
        },
      },
      resolve: {
        extensions: [".js", ".json", ".jsx", ".css"],
        modules: [path.resolve(__dirname, "node_modules"), "node_modules"],
      },
      plugins: [
        new StatoscopeWebpackPlugin(),
        new HtmlWebpackPlugin({
          filename: outputFile,
          template: require.resolve("module-detective-ui/src/template.html"),
        }),
      ],
    });
    if (process.env.DEV_SERVER) {
      const server = new WebpackDevServer(
        {
          // graciously writes the output to disk as an FYI (also totally lying b/c it won't work without this)
          devMiddleware: {
            writeToDisk: true,
          },
          hot: true,
          historyApiFallback: true,
          compress: true,
          port: 8080,
          static: {
            directory: outputDir,
            serveIndex: true,
            watch: true,
          },
          client: {
            overlay: true,
          },
        },
        compiler
      );

      server.startCallback(() => {
        console.log("Starting server on http://localhost:8080");
      });
    } else {
      compiler.run((error, stats) => {
        if (error) reject(error); // eslint-disable-line

        resolve(stats);
      });
    }
  });
}
