import { useEffect, useState } from 'react';
import {
  DEFAULT_RECHARTS_SCOPES,
  loadRecharts,
  type RechartsModuleFor,
  type RechartsScope,
} from '@/lib/lazyRecharts';

type ResolveScopes<Scopes extends ReadonlyArray<RechartsScope> | undefined> = Scopes extends
  ReadonlyArray<RechartsScope>
  ? Scopes
  : typeof DEFAULT_RECHARTS_SCOPES;

type ModuleForScopes<Scopes extends ReadonlyArray<RechartsScope> | undefined> = RechartsModuleFor<
  ResolveScopes<Scopes>
>;

export const useRecharts = <Scopes extends ReadonlyArray<RechartsScope> | undefined = undefined>(
  scopes?: Scopes,
) => {
  const resolvedScopes = (scopes && scopes.length ? scopes : DEFAULT_RECHARTS_SCOPES) as ResolveScopes<Scopes>;
  const [module, setModule] = useState<ModuleForScopes<Scopes> | null>(null);

  useEffect(() => {
    let mounted = true;

    loadRecharts(resolvedScopes).then((recharts) => {
      if (mounted) {
        setModule(recharts as ModuleForScopes<Scopes>);
      }
    });

    return () => {
      mounted = false;
    };
  }, [resolvedScopes]);

  return module;
};
