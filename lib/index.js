// Host half: the feature is browser-only, so this row has no host behavior.
// It exists so the Loader can mount the bundle's entry and
// @deepseek-ai/dsh-client-modules can discover the `dsh.client` declaration
// and serve ./client.
export function apply() {}
