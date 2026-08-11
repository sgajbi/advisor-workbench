export interface ContainerReplacementEvidence {
  service: string;
  before_container_id: string;
  after_container_id: string;
  container_identity_changed: true;
}

export function assertContainerReplacement(input: {
  service: string;
  beforeContainerId: string;
  afterContainerId: string;
}): ContainerReplacementEvidence;
