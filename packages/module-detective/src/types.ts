export type BasicJSON = Record<string, string>;
export type DependenciesList = [string, IDependency][];

// a very weak definition for https://github.com/npm/arborist/blob/48eb8fa01ea1cd1f89f47379b1ba4881a8bb9fbc/lib/node.js
export interface IArboristNode {
  children: Map<string, IArboristNode>;
  dev: boolean;
  devOptional: boolean;
  dummy: boolean;
  edgesIn: Set<IArboristNode>;
  edgesOut: Map<string, IArboristNode>;
  errors: Array<any>;
  extraneous: boolean;
  fsChildren: Set<IArboristNode>;
  hasShrinkwrap: boolean;
  integrity: unknown | null;
  inventory: Map<string, IArboristNode>;
  legacyPeerDeps: boolean;
  linksIn: Set<IArboristNode>;
  location: string;
  name: string;
  optional: boolean;
  path: string;
  peer: string;
  realpath: string;
  resolved: unknown | null;
  sourceReference: unknown | null;
  tops: Set<IArboristNode>;
  package: BasicJSON;
  packageName: string;
  isLink: boolean;
  homepage: string;
  funding: string;
}

export interface IDependency {
  name: string;
  breadcrumb: string;
  size: number;
  location: string;
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

export interface IVersionMeta extends IActionMeta {
  version: string;
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
  latestPackages: BasicJSON;
  package: BasicJSON;
  dependencies: DependenciesList;
  suggestions: ISuggestion[];
}
