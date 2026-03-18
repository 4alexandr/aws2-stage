// https://eslint.org/docs/rules/
module.exports = {
    extends: 'eslint:recommended',
    rules: {
        'no-case-declarations': 2,
        'no-console': 1,
        'no-constant-condition': 2,
        'no-control-regex': 2,
        'no-debugger': 2,
        'no-dupe-args': 2,
        'no-dupe-keys': 2,
        'no-duplicate-case': 2,
        'no-empty': 2,
        'no-empty-character-class': 2,
        'no-empty-pattern': 2,
        'no-extra-boolean-cast': 2,
        'no-extra-parens': 1,
        'no-extra-semi': 2,
        'no-fallthrough': 2,
        'no-func-assign': 2,
        'no-global-assign': 2,
        'no-inner-declarations': 2,
        'no-invalid-regexp': 2,
        'no-irregular-whitespace': 2,
        'no-obj-calls': 2,
        'no-prototype-builtins': 0,
        'no-redeclare': 1,
        'no-regex-spaces': 2,
        'no-sparse-arrays': 2,
        'no-template-curly-in-string': 1,
        'no-undef': 2,
        'no-unexpected-multiline': 2,
        'no-unreachable': 1,
        'no-unsafe-finally': 2,
        'no-unsafe-negation': 2,
        'no-unused-vars': 1,
        'no-useless-escape': 1,
        'use-isnan': 2,
        'valid-typeof': 2
    },
    globals: {},
    env: {
        browser: true,
        amd: true,
        es6: true
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
            impliedStrict: false
        }
    }
};
