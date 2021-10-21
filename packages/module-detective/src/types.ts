export interface IDependency {
  breadcrumb: string;
  size: number;
  packageInfo: any;
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
  dependencies: [string, IDependency][];
  suggestions: ISuggestion[];
}
