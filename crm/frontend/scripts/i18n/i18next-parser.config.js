const path = require('path');

module.exports = {
  locales: ["ru", "en", "es", "ar", "hi", "kk", "pt", "fr", "de"],
  output: path.resolve(__dirname, '../../src/locales/$LOCALE/$NAMESPACE.json'),
  input: [
    path.resolve(__dirname, '../../src/**/*.{js,jsx,ts,tsx}')
  ],
  defaultNamespace: 'common',
  keySeparator: '.',
  namespaceSeparator: ':',
  createOldCatalogs: false,
  keepRemoved: true,  // ✅ НЕ удаляем ключи автоматически (предотвращаем потерю динамических ключей)
  resetDefaultValueLocale: null,
  sort: true,
  verbose: false,  // Отключаем verbose чтобы не засорять консоль
  useKeysAsDefaultValue: false,
  defaultValue: '',
  lexers: {
    tsx: ['JsxLexer'],
    ts: ['JsxLexer']
  },

  // Namespace autodetection example is intentionally disabled.
  // transform: function(file, enc, done) {
  //   const parser = this;
  //   const content = file.toString(enc);
  //   
  //   // Определяем namespace из пути файла
  //   let namespace = 'common';
  //   
  //   if (file.path.includes('/pages/manager/')) {
  //     const match = file.path.match(/\/pages\/manager\/(\w+)/);
  //     if (match) namespace = `manager/${match[1]}`;
  //   } else if (file.path.includes('/pages/employee/')) {
  //     const match = file.path.match(/\/pages\/employee\/(\w+)/);
  //     if (match) namespace = `employee/${match[1]}`;
  //   } else if (file.path.includes('/pages/auth/')) {
  //     const match = file.path.match(/\/pages\/auth\/(\w+)/);
  //     if (match) namespace = `auth/${match[1]}`;
  //   } else if (file.path.includes('/layouts/')) {
  //     const match = file.path.match(/\/layouts\/(\w+)/);
  //     if (match) namespace = `layouts/${match[1]}`;
  //   } else if (file.path.includes('/components/')) {
  //     const match = file.path.match(/\/components\/(\w+)/);
  //     if (match) namespace = `components/${match[1]}`;
  //   }
  //   
  //   parser.parseTransFromString(content, { 
  //     defaultNamespace: namespace 
  //   });
  //   
  //   done();
  // }
};
