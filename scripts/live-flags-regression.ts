import assert from "node:assert/strict";

import {
  LIVE_MUTATION_FLAG_KEYS,
  areLiveMutationFlagsDisabled,
  liveMutationFlags,
  type SafetyEnv,
} from "../src/lib/safety";

assert.equal(areLiveMutationFlagsDisabled({}), true);

const defaultFalseEnv = Object.fromEntries(
  LIVE_MUTATION_FLAG_KEYS.map((key) => [key, "false"]),
) as SafetyEnv;

assert.equal(areLiveMutationFlagsDisabled(defaultFalseEnv), true);
assert.deepEqual(
  liveMutationFlags(defaultFalseEnv),
  Object.fromEntries(LIVE_MUTATION_FLAG_KEYS.map((key) => [key, false])),
);

for (const key of LIVE_MUTATION_FLAG_KEYS) {
  const envWithSingleLiveMutation = {
    ...defaultFalseEnv,
    [key]: "true",
  };

  assert.equal(
    areLiveMutationFlagsDisabled(envWithSingleLiveMutation),
    false,
    `${key} must be detected when enabled`,
  );
  assert.equal(liveMutationFlags(envWithSingleLiveMutation)[key], true);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "live-mutation-flags",
      defaultState: "disabled",
      guardedFlags: LIVE_MUTATION_FLAG_KEYS,
    },
    null,
    2,
  ),
);
