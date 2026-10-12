import obsidian from 'eslint-plugin-obsidianmd';

export default [
    { ignores: ['main.js', 'node_modules/**', 'dist/**', 'scripts/**', 'tests/**', 'eslint.config.mjs', 'esbuild.config.mjs'] },
    ...obsidian.configs.recommended,
    { languageOptions: { parserOptions: { projectService: true } } },
];
