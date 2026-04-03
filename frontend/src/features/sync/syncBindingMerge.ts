import type { LinkedWorkspaceBinding } from "./syncTypes";

type ServerBindingInput = Omit<LinkedWorkspaceBinding, "localRootPath" | "status">;

export function mergeLinkedBindings(
  serverBindings: ServerBindingInput[],
  localBindings: LocalLinkBindingRecord[],
): LinkedWorkspaceBinding[] {
  const localBindingById = new Map(localBindings.map((binding) => [binding.bindingId, binding]));

  return serverBindings.map((serverBinding) => {
    const localBinding = localBindingById.get(serverBinding.id) ?? null;

    return {
      ...serverBinding,
      localRootPath: localBinding?.localRootPath ?? null,
      localRootLabel: localBinding?.localRootLabel || serverBinding.localRootLabel,
      projectName: localBinding?.projectName || serverBinding.projectName,
      status: (localBinding?.lastKnownState as LinkedWorkspaceBinding["status"] | undefined) ?? "linked_ready",
    };
  });
}
