type ModuleLoaders = {
  cartesianCore: () => Promise<typeof import('@/lib/rechartsCartesianCore')>;
  line: () => Promise<typeof import('@/lib/rechartsLine')>;
  bar: () => Promise<typeof import('@/lib/rechartsBar')>;
  pie: () => Promise<typeof import('@/lib/rechartsPie')>;
};

const moduleLoaders: ModuleLoaders = {
  cartesianCore: () => import('@/lib/rechartsCartesianCore'),
  line: () => import('@/lib/rechartsLine'),
  bar: () => import('@/lib/rechartsBar'),
  pie: () => import('@/lib/rechartsPie'),
};

export type RechartsScope = keyof ModuleLoaders;

type ModuleCache = {
  [K in RechartsScope]?: Promise<Awaited<ReturnType<ModuleLoaders[K]>>>;
};

const moduleCache: ModuleCache = {};

export const DEFAULT_RECHARTS_SCOPES = ['cartesianCore', 'line'] as const;

type UnionToIntersection<U> = (U extends U ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;

type CombinedModules<Scopes extends ReadonlyArray<RechartsScope>> = UnionToIntersection<
  Awaited<ReturnType<ModuleLoaders[Scopes[number]]>>
>;

const loadScope = async <K extends RechartsScope>(scope: K) => {
  if (!moduleCache[scope]) {
    moduleCache[scope] = moduleLoaders[scope]();
  }

  return moduleCache[scope]! as Promise<Awaited<ReturnType<ModuleLoaders[K]>>>;
};

const dedupeScopes = <Scopes extends ReadonlyArray<RechartsScope>>(scopes: Scopes) => {
  return Array.from(new Set(scopes)) as Scopes;
};

export type RechartsModuleFor<Scopes extends ReadonlyArray<RechartsScope>> = CombinedModules<Scopes>;

export const loadRecharts = async <
  Scopes extends ReadonlyArray<RechartsScope> = typeof DEFAULT_RECHARTS_SCOPES,
>(scopes?: Scopes): Promise<RechartsModuleFor<Scopes>> => {
  const resolvedScopes = (scopes && scopes.length ? scopes : DEFAULT_RECHARTS_SCOPES) as Scopes;
  const uniqueScopes = dedupeScopes(resolvedScopes);
  const modules = await Promise.all(uniqueScopes.map((scope) => loadScope(scope)));
  return Object.assign({}, ...modules) as RechartsModuleFor<Scopes>;
};

export const __resetRechartsModuleCacheForTesting = () => {
  (Object.keys(moduleCache) as Array<keyof ModuleCache>).forEach((key) => {
    delete moduleCache[key];
  });
};
