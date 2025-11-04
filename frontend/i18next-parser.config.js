module.exports = {
  locales: ["ru","en","es","ar","hi","kk","pt","fr","de"],
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  defaultNamespace: 'common',
  keySeparator: false,
  namespaceSeparator: ':',
  createOldCatalogs: false,
  keepRemoved: false,
  sort: true,
  verbose: true,
  lexers: {
    tsx: ['JsxLexer'],
    ts: ['JsxLexer']
  }
};
