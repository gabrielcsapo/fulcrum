export interface IDependency {
  name: string;
  breadcrumb: string;
  size: number;
  location: string;
  packageInfo: any;
  homepage?: any;
  funding?: any;
}

export interface IActionMeta {
  breadcrumb: string;
  name: string;
  directory: string;
  size?: number;
}

export interface IAction {
  message: string;
  meta: IActionMeta;
}

export interface ISuggestion {
  id: string;
  name: string;
  message: string;
  actions: IAction[];
}

export interface IReport {
  latestPackages: any;
  package: any;
  dependencies: [string, Omit<IDependency, "packageInfo">][];
  suggestions: ISuggestion[];
}
