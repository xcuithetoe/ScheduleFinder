# Web Application Workflow

This workflow details how to run, test, and build the React + Vite + TypeScript frontend for ScheduleFinder / ScheduleCleaner.

## Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Local Dev Server**:
   ```bash
   npm run dev
   ```
   - Opens local server at `http://localhost:5173`.
   - Supports Fast Refresh and hot reloading.

3. **Run Automated Unit Tests**:
   ```bash
   npm test
   ```
   - Runs Vitest test suites in `src/tests/` (`csvParser.test.ts`, `scheduler.test.ts`).

4. **Lint and Typecheck**:
   ```bash
   npm run lint
   ```

5. **Production Build**:
   ```bash
   npm run build
   ```
   - Produces bundled static assets in `dist/`.
