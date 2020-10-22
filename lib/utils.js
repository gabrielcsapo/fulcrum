function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

function walkTree(report, callback) {
  if (Array.isArray(report)) {
    report.forEach((dependency) => {
      callback(dependency);

      if (dependency.dependencies) {
        walkTree(dependency.dependencies, callback);
      }
    });
  } else {
    Object.keys(report).forEach((dependency) => {
      callback(report[dependency]);

      if (dependency.dependencies) {
        walkTree(dependency.dependencies, callback);
      }
    });
  }
}

module.exports = {
  walkTree,
  humanFileSize,
};
