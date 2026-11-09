import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStagingHost } from './staging-host-core.mjs';

function fixture() {
  const manifest = { image: `ghcr.io/vanhien1313/website_apple_v1@sha256:${'a'.repeat(64)}`, imageId: `sha256:${'b'.repeat(64)}`, platform: 'linux/amd64' };
  const info = { OSType: 'linux', Architecture: 'x86_64' };
  const context = [{ Endpoints: { docker: { Host: 'unix:///var/run/docker.sock' } } }];
  const image = { Id: manifest.imageId, RepoDigests: [manifest.image], Os: 'linux', Architecture: 'amd64', Config: { User: 'node' } };
  const calls = [];
  const options = { manifest, platform: 'linux', nodeVersion: '24.22.2', docker(args) {
    calls.push(args);
    if (args[0] === 'info') return JSON.stringify(info);
    if (args[0] === 'context') return JSON.stringify(context);
    if (args[0] === 'compose') return '5.6.1';
    if (args[0] === 'image') return JSON.stringify([image]);
    throw new Error('Unexpected mutation or unsupported Docker operation');
  } };
  return { options, info, context, image, calls };
}

test('validates exact release image using only read-only Docker commands', () => {
  const f = fixture();
  assert.deepEqual(checkStagingHost(f.options), []);
  assert.deepEqual(f.calls.map(args => args.slice(0, 2).join(' ')), ['info --format', 'context inspect', 'compose version', 'image inspect']);
  assert.equal(f.calls.at(-1).at(-1), f.options.manifest.image);
});
test('rejects invalid manifest and unsupported host before accessing Docker', () => {
  for (const change of [{ manifest: { image: 'aura:latest' } }, { platform: 'win32' }, { nodeVersion: '22.0.0' }]) {
    const f = fixture();
    assert.ok(checkStagingHost({ ...f.options, ...change }).length);
    assert.equal(f.calls.length, 0);
  }
});
test('rejects remote endpoints, including environment overrides, and wrong engine architecture', () => {
  const remote = fixture(); remote.context[0].Endpoints.docker.Host = 'ssh://server';
  assert.match(checkStagingHost(remote.options).join(), /local Unix/);
  const env = fixture(); env.options.dockerEnvironment = { DOCKER_HOST: 'tcp://server:2376' };
  assert.match(checkStagingHost(env.options).join(), /local Unix/);
  env.options.dockerEnvironment.DOCKER_CONTEXT = 'local';
  assert.deepEqual(checkStagingHost(env.options), []);
  const arm = fixture(); arm.info.Architecture = 'aarch64';
  assert.match(checkStagingHost(arm.options).join(), /amd64/);
  assert.equal(arm.calls.some(args => args[0] === 'image'), false);
});
test('rejects mismatched ID/digest, wrong platform and root image', () => {
  for (const change of [{ Id: `sha256:${'c'.repeat(64)}` }, { RepoDigests: [] }, { Architecture: 'arm64' }, { Config: { User: 'root' } }]) {
    const f = fixture(); Object.assign(f.image, change);
    assert.ok(checkStagingHost(f.options).length);
  }
});
test('does not expose Docker errors or attempt to pull a missing image', () => {
  const f = fixture(); const read = f.options.docker;
  f.options.docker = args => { if (args[0] === 'image') throw new Error('sensitive stderr'); return read(args); };
  const errors = checkStagingHost(f.options);
  assert.match(errors.join(), /pull the manifest digest first/);
  assert.doesNotMatch(errors.join(), /sensitive/);
  f.options.docker = () => { throw new Error('sensitive stderr'); };
  assert.doesNotMatch(checkStagingHost(f.options).join(), /sensitive/);
});
