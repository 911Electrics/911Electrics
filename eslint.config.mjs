import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * eslint-config-next 16 ships native flat configs, so they are spread in
 * directly. Loading them through `FlatCompat` (the eslintrc bridge) crashed
 * with "Converting circular structure to JSON" — the compat layer tries to
 * JSON-serialize the config for validation and the plugin objects contain
 * cycles. That crash is why lint was skipped in CI.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      /*
       * Kept visible but non-blocking. The remaining call sites are all
       * deliberate and commented: the quote form's anti-spam time-trap
       * baseline (must be client clock, set on mount), the header/mobile nav
       * closing when the route changes (the header persists across client
       * navigation), and the theme providers reading localStorage on mount.
       * Each is a mount/route-change sync with no cascading-render problem.
       */
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'wp-snapshot/'],
  },
]

export default eslintConfig
