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
  customValueTemplate: null,
  lexers: {
    tsx: ['JsxLexer'],
    ts: ['JsxLexer']
  },
  // Автоматическое определение namespace из пути файла
  defaultValue: (locale, namespace, key) => key,
  
  // ✅ Правило: папка pages -> namespace по пути к файлу
  // src/pages/admin/Dashboard.tsx -> admin/Dashboard
  // src/pages/public/Home.tsx -> public/Home
  useKeysAsDefaultValue: false
};