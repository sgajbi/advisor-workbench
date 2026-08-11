export function assertContainerReplacement({
  service,
  beforeContainerId,
  afterContainerId,
}) {
  if (!beforeContainerId) {
    throw new Error(`Could not resolve the original container for ${service}.`);
  }
  if (!afterContainerId) {
    throw new Error(`Could not resolve the replacement container for ${service}.`);
  }
  if (beforeContainerId === afterContainerId) {
    throw new Error(`${service} restarted without disposable-container replacement.`);
  }
  return {
    service,
    before_container_id: beforeContainerId,
    after_container_id: afterContainerId,
    container_identity_changed: true,
  };
}
