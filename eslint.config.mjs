import js from "@eslint/js";
import jest from "eslint-plugin-jest";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  // 0. Arquivos e pastas que o ESLint DEVE ignorar
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "dist/**"],
  },

  // 2. Configuração Global de Ambiente (Node e Browser)
  {
    languageOptions: {
      globals: {
        ...globals.node, // Ativa 'process', 'require', etc.
        ...globals.browser, // Ativa 'console', 'window', 'fetch', etc.
        ...globals.jest, // Ativa 'test', 'expect', 'describe', etc.
      },
      // ADICIONE ESTE BLOCO AQUI:
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Diz ao ESLint que o projeto aceita tags <JSX>
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  // 1. Regras recomendadas do ESLint
  js.configs.recommended,

  // 2. Regras recomendadas do Jest
  jest.configs["flat/recommended"],

  // 3. Configurações do Next.js
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // 4. Prettier (sempre por último para desativar regras conflitantes)
  prettierConfig,
];
