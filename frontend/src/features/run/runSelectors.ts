import type { StateType } from "../../store/store";

export const selectRunState = (state: StateType) => state.run;
export const selectRunWorkspaceKey = (state: StateType) => state.run.workspaceKey;
export const selectRunConfigurations = (state: StateType) => state.run.configurations;
export const selectRunSelectedConfigurationId = (state: StateType) => state.run.selectedConfigId;
export const selectSelectedRunConfiguration = (state: StateType) =>
  state.run.configurations.find((configuration) => configuration.id === state.run.selectedConfigId) ?? null;
export const selectRunCurrentSession = (state: StateType) => state.run.currentSession;
export const selectRunSessionHistory = (state: StateType) => state.run.sessionHistory;
export const selectRunInterpreters = (state: StateType) => state.run.interpreters;
export const selectRunToolchains = (state: StateType) => state.run.toolchains;
export const selectRunConfigurationDialogOpen = (state: StateType) =>
  state.run.isConfigurationDialogOpen;
export const selectRunConfigurationsLoading = (state: StateType) =>
  state.run.configurationsLoading;
export const selectRunToolsLoading = (state: StateType) => state.run.toolsLoading;
export const selectRunErrorMessage = (state: StateType) => state.run.errorMessage;
