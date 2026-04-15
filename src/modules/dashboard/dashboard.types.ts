export interface DashboardTotals {
  totalVisitas: number;
  totalVistas: number;
  totalClicks: number;
  conversion: number;
}

export interface DashboardMetricPayload {
  totals: DashboardTotals;
  visitSeries: Array<{ day: string; total: number }>;
  topProducts: Array<{ id: string; nombre: string; categoria: string; vistas: number }>;
  byCategory: Array<{ categoria: string; total: number }>;
}
