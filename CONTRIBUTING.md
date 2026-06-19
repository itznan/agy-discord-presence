# Contributing to Antigravity CLI Discord Rich Presence 🚀

Thank you for your interest in contributing to this project! Contributions are welcome from everyone.

## How to Contribute

### 1. Report Bugs / Suggest Features
- Check the open issues to see if it has already been reported.
- If not, open a new issue using the appropriate template.

### 2. Submit Pull Requests
1. **Fork the Repository** and create your branch from `main`.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Make your changes**. If you edit files in the `src/` directory, you must run the build script to bundle them into the `dist/` directory:
   ```bash
   npm run build
   ```
4. **Test your changes** to verify that they work as expected.
5. **Submit a Pull Request** describing your changes and linking any relevant issues.

## Rebuilding the Bundles

This project uses `esbuild` to compile and minify the files in `src/` into a lightweight single-file package inside `dist/`.
Always remember to run `npm run build` before opening a pull request, or the CI checks will fail.
