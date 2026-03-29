import { createRunConfigurationStore } from "./configStore.js";
import { createCloudMaterializer } from "./cloudMaterializer.js";
import { listPythonInterpreters, resolvePythonInterpreter } from "./pythonRuntimeLocator.js";
import { listCppToolchains, resolveCppToolchain } from "./cppToolchainLocator.js";
import { createExecutionManager } from "./executionManager.js";

export function createRunSubsystem({
  app,
  nodePty,
  nodePtyLoadError,
  sendToRenderer,
}) {
  const configurationStore = createRunConfigurationStore({ app });
  const materializer = createCloudMaterializer({ app });
  const executionManager = createExecutionManager({
    nodePty,
    nodePtyLoadError,
    sendToRenderer,
    getConfiguration: (workspaceDescriptor, configurationId) =>
      configurationStore.getConfiguration(workspaceDescriptor, configurationId),
    resolvePythonInterpreter,
    resolveCppToolchain,
    materializeSnapshot: (snapshot) => materializer.materializeSnapshot(snapshot),
    prepareSessionDirectory: (sessionId) => materializer.prepareSessionDirectory(sessionId),
  });

  return {
    listConfigurations(workspaceDescriptor) {
      return configurationStore.listConfigurations(workspaceDescriptor);
    },
    createConfiguration(workspaceDescriptor, configurationInput) {
      return configurationStore.createConfiguration(workspaceDescriptor, configurationInput);
    },
    updateConfiguration(workspaceDescriptor, configurationInput) {
      return configurationStore.updateConfiguration(workspaceDescriptor, configurationInput);
    },
    deleteConfiguration(workspaceDescriptor, configurationId) {
      return configurationStore.deleteConfiguration(workspaceDescriptor, configurationId);
    },
    selectConfiguration(workspaceDescriptor, configurationId) {
      return configurationStore.selectConfiguration(workspaceDescriptor, configurationId);
    },
    listPythonInterpreters(options) {
      return listPythonInterpreters(options);
    },
    listCppToolchains() {
      return listCppToolchains();
    },
    startRun(launchRequest) {
      return executionManager.startRun(launchRequest);
    },
    stopRun() {
      return executionManager.stopRun();
    },
    rerun() {
      return executionManager.rerun();
    },
    writeToRun(sessionId, data) {
      return executionManager.writeToRun(sessionId, data);
    },
    resizeRun(sessionId, cols, rows) {
      return executionManager.resizeRun(sessionId, cols, rows);
    },
    getCurrentSession() {
      return executionManager.getCurrentSession();
    },
    dispose() {
      executionManager.dispose();
    },
  };
}
