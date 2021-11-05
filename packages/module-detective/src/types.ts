export interface IDependency {
  name: string;
  breadcrumb: string;
  size: number;
  location: string;
  packageInfo: any;
  // url to dependecy
  homepage?: string;
  // funding url
  funding?: string;
}

export interface IActionMeta {
  // where it exists in the tree (which dep brought this in) A->B->C
  breadcrumb: string;
  name: string;
  // path to the full directory (might be )
  directory: string;
  // optional b/c the item might not actually exist where specified (the "link" has 0 bytes)
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
