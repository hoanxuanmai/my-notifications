// pnpmfile.cjs - pnpm hooks configuration
// Có thể thêm custom logic ở đây nếu cần

function readPackage(pkg, context) {
  // Có thể modify package.json của dependencies ở đây
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};

