export type RootStackParamList = {
  Shell: undefined;
  LocalFile: {
    localFileId: string;
    fileName: string;
  };
};

export type AuthStackParamList = {
  GuestHome: undefined;
  Login: undefined;
  Register: undefined;
};

export type AuthenticatedStackParamList = {
  Tabs: undefined;
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
