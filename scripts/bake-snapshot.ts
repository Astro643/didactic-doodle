/**
 * One-time bake script: creates a sandbox, installs the tool set,
 * snapshots the filesystem, prints the snapshot ID.
 *
 * Run from the repo root:
 *   npx vercel link          (once — links to the didactic-doodle project)
 *   npx tsx scripts/bake-snapshot.ts
 *
 * The first run opens a browser for Vercel login. The printed SNAPSHOT_ID
 * goes into the SANDBOX_SNAPSHOT_ID environment variable on Vercel.
 * Re-run after editing the package list to produce a fresh snapshot.
 */
import { Sandbox } from "@vercel/sandbox";

const PACKAGES =
  "python3 ripgrep unzip zip dnsutils ca-certificates";

const sbx = await Sandbox.create({ timeout: 5 * 60_000 });
try {
  const install = await sbx.runCommand("sh", [
    "-lc",
    `apt-get update -qq && apt-get install -y --no-install-recommends ${PACKAGES}`,
  ]);
  if (install.exitCode !== 0) {
    console.error("install failed:", await install.stderr());
    process.exit(1);
  }
  const versions = await sbx.runCommand("sh", [
    "-lc",
    "python3 --version && rg --version | head -1 && curl --version | head -1 && jq --version && git --version",
  ]);
  console.log(await versions.stdout());
  const snap = await sbx.snapshot({ expiration: 0 });
  console.log("SNAPSHOT_ID:", snap.snapshotId);
} finally {
  await sbx.stop().catch(() => {});
}
