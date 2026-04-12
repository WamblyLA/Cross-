export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ProjectsStackParamList = {
  ProjectsHome: undefined;
  Project: {
    projectId: string;
    projectName: string;
  };
  File: {
    projectId: string;
    fileId: string;
    fileName: string;
  };
};

export type AppTabsParamList = {
  ProjectsTab: undefined;
  AccountTab: undefined;
};
