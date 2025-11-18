import { beforeEach, describe, expect, it, vi } from 'vitest';

const moduleSpies = {
  cartesianCore: vi.fn(),
  line: vi.fn(),
  bar: vi.fn(),
  pie: vi.fn(),
};

const cartesianCoreModule = {
  ResponsiveContainer: 'ResponsiveContainer',
  CartesianGrid: 'CartesianGrid',
  XAxis: 'XAxis',
  YAxis: 'YAxis',
  Tooltip: 'Tooltip',
  Legend: 'Legend',
};

const lineModule = {
  LineChart: 'LineChart',
  Line: 'Line',
};

const barModule = {
  BarChart: 'BarChart',
  Bar: 'Bar',
};

const pieModule = {
  PieChart: 'PieChart',
  Pie: 'Pie',
  Cell: 'Cell',
};

const loadLazyRechartsModule = async () => {
  vi.doMock('@/lib/rechartsCartesianCore', () => {
    moduleSpies.cartesianCore();
    return cartesianCoreModule;
  });

  vi.doMock('@/lib/rechartsLine', () => {
    moduleSpies.line();
    return lineModule;
  });

  vi.doMock('@/lib/rechartsBar', () => {
    moduleSpies.bar();
    return barModule;
  });

  vi.doMock('@/lib/rechartsPie', () => {
    moduleSpies.pie();
    return pieModule;
  });

  return import('@/lib/lazyRecharts');
};

let loadRecharts: typeof import('@/lib/lazyRecharts').loadRecharts;
let resetCache: typeof import('@/lib/lazyRecharts').__resetRechartsModuleCacheForTesting;

describe('loadRecharts scoped loader', () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.values(moduleSpies).forEach((spy) => spy.mockReset());
    const module = await loadLazyRechartsModule();
    loadRecharts = module.loadRecharts;
    resetCache = module.__resetRechartsModuleCacheForTesting;
    resetCache();
  });

  it('loads cartesian core + line scopes by default', async () => {
    const module = await loadRecharts();

    expect(module).toMatchObject({
      ResponsiveContainer: 'ResponsiveContainer',
      LineChart: 'LineChart',
      Line: 'Line',
    });
    expect(moduleSpies.cartesianCore).toHaveBeenCalledTimes(1);
    expect(moduleSpies.line).toHaveBeenCalledTimes(1);
    expect(moduleSpies.bar).not.toHaveBeenCalled();
    expect(moduleSpies.pie).not.toHaveBeenCalled();
  });

  it('only loads requested pie scope when specified', async () => {
    const module = await loadRecharts(['pie']);

    expect(module).toMatchObject({
      PieChart: 'PieChart',
      Pie: 'Pie',
      Cell: 'Cell',
    });
    expect(moduleSpies.pie).toHaveBeenCalledTimes(1);
    expect(moduleSpies.cartesianCore).not.toHaveBeenCalled();
  });

  it('merges multiple scopes and de-duplicates imports', async () => {
    const module = await loadRecharts(['cartesianCore', 'bar', 'cartesianCore']);

    expect(module).toMatchObject({
      ResponsiveContainer: 'ResponsiveContainer',
      BarChart: 'BarChart',
    });
    expect(moduleSpies.cartesianCore).toHaveBeenCalledTimes(1);
    expect(moduleSpies.bar).toHaveBeenCalledTimes(1);
  });

  it('reuses cached modules across sequential calls', async () => {
    await loadRecharts(['cartesianCore', 'line', 'bar']);
    await loadRecharts(['cartesianCore', 'line', 'bar']);

    expect(moduleSpies.cartesianCore).toHaveBeenCalledTimes(1);
    expect(moduleSpies.line).toHaveBeenCalledTimes(1);
    expect(moduleSpies.bar).toHaveBeenCalledTimes(1);
  });
});
