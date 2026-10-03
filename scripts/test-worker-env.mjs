import { join } from 'node:path';

// Test files are isolated Node processes; each models a separate local installation.
// Explicit multiprocess tests pass their chosen shared fixture directory to children.
if (process.env.INTERROGATION_TEST_ROOT) {
  process.env.INTERROGATION_DATA_DIR = join(process.env.INTERROGATION_TEST_ROOT, String(process.pid));
}
