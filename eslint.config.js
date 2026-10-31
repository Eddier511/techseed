import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [
 {ignores:['dist/**','node_modules/**']},
 {files:['src/**/*.{js,jsx}','*.js'], languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals.browser,parserOptions:{ecmaFeatures:{jsx:true}}}, plugins:{'react-hooks':hooks}, rules:{...js.configs.recommended.rules,'no-unused-vars':['warn',{varsIgnorePattern:'^[A-Z_]'}],'react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'warn'}},
 {files:['backend/**/*.js','tests/**/*.cjs'],languageOptions:{ecmaVersion:'latest',sourceType:'commonjs',globals:globals.node},rules:js.configs.recommended.rules}
];
