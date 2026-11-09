// Read-only checks. The caller supplies Docker's argument-array runner.
export function checkStagingHost({ manifest, platform, nodeVersion, docker, dockerEnvironment = {} }) {
  const errors = [];
  if (!/^ghcr\.io\/vanhien1313\/website_apple_v1@sha256:[a-f0-9]{64}$/.test(manifest?.image ?? '')
      || !/^sha256:[a-f0-9]{64}$/.test(manifest?.imageId ?? '')
      || manifest?.platform !== 'linux/amd64') {
    return ['Use a verified Aura release manifest with registry digest and image ID.'];
  }
  if (platform !== 'linux') errors.push('Run this check directly on the Linux staging host.');
  if (!(Number(nodeVersion.split('.')[0]) >= 24)) errors.push('Node.js 24 or later is required for deployment tools.');
  if (errors.length) return errors;
  try {
    // Resolve the effective endpoint, including DOCKER_HOST/DOCKER_CONTEXT overrides.
    const info = JSON.parse(docker(['info', '--format', '{{json .}}']));
    const context = JSON.parse(docker(['context', 'inspect']));
    const endpoint = dockerEnvironment.DOCKER_CONTEXT ? context[0]?.Endpoints?.docker?.Host
      : dockerEnvironment.DOCKER_HOST || context[0]?.Endpoints?.docker?.Host;
    if (!endpoint?.startsWith('unix://')) errors.push('Use a local Unix Docker socket; remote daemon checks do not validate host secret paths.');
    if (info.OSType !== 'linux' || !['x86_64', 'amd64'].includes(info.Architecture)) errors.push('This release requires a Linux amd64 Docker engine.');
    docker(['compose', 'version', '--short']);
    if (errors.length) return errors;
  } catch {
    return ['Cannot inspect Docker engine/context or Compose. Check installation and socket permissions.'];
  }
  try {
    const [image] = JSON.parse(docker(['image', 'inspect', manifest.image]));
    if (image?.Id !== manifest.imageId) errors.push('Pulled image ID differs from the verified release manifest.');
    if (!image?.RepoDigests?.includes(manifest.image)) errors.push('The exact registry digest is not present locally.');
    if (image?.Os !== 'linux' || image?.Architecture !== 'amd64') errors.push('Pulled image platform must be linux/amd64.');
    if (!['node', '1000', 'node:node', '1000:1000'].includes(image?.Config?.User)) errors.push('Image must run as the expected non-root Node user.');
  } catch {
    errors.push('Verified image is not available locally. Authenticate to GHCR and pull the manifest digest first.');
  }
  return errors;
}
