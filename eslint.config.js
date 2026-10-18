import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/']),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    jsx: false,
    arrowParens: false,
    braceStyle: '1tbs',
    commaDangle: 'always-multiline',
  }),
  {
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
    rules: {
      '@stylistic/max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
      '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'after', ':': 'ignore' } }],
      '@stylistic/indent': ['error', 2, { flatTernaryExpressions: true }],
      // allows flat ternary chains: `a ? x` / `: b ? y` / `: z`
      '@stylistic/multiline-ternary': 'off',
      // conflicts with `indent` on conditional types inside mapped types
      '@stylistic/indent-binary-ops': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
