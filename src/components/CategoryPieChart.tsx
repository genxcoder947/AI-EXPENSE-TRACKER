import { type CSSProperties, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { formatCurrency } from '../utils/helpers';
import { Expense } from '../types';

type MainTimeRange = 'week' | 'days' | 'months' | 'years';
type ModalTimeRange = 'day' | 'last24h' | 'month' | 'year';

type Slice = {
  label: string;
  value: number;
  color: string;
};

const COLORS = [
  'var(--chart-emerald)',
  'var(--chart-blue)',
  'var(--chart-amber)',
  'var(--chart-violet)',
  'var(--chart-rose)',
  'var(--chart-cyan)',
  'var(--chart-orange)',
  'var(--chart-indigo)',
  'var(--chart-slate)',
];

function parseDateOnly(dateString: string): Date {
  // Avoid timezone shifts by forcing local midnight.
  return new Date(`${dateString}T00:00:00`);
}

function startEndForMainRange(now: Date, range: MainTimeRange): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === 'week') {
    // This calendar week (Monday - Sunday)
    const day = start.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
  } else if (range === 'days') {
    // Last 7 days (including today)
    start.setDate(start.getDate() - 6);
  } else if (range === 'months') {
    // This month (month-to-date)
    start.setDate(1);
  } else if (range === 'years') {
    // This year (year-to-date)
    start.setMonth(0, 1);
  }

  return { start, end };
}

function startEndForModalRange(now: Date, range: ModalTimeRange): { start: Date; end: Date } {
  if (range === 'day') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (range === 'last24h') {
    // We only store date (YYYY-MM-DD), not time. Approximate last 24h as "yesterday + today".
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (range === 'month') {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // year
  const start = new Date(now);
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// Stable unique colors per known category so different categories don't collide.
const CATEGORY_ORDER = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Other',
] as const;

const CATEGORY_COLOR_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    const label = CATEGORY_ORDER[i];
    map[label] = COLORS[i % COLORS.length];
  }
  return map;
})();

function colorForLabel(label: string): string {
  return CATEGORY_COLOR_MAP[label] || '#64748B';
}

function computeSlices(args: {
  expenses: Expense[];
  start: Date;
  end: Date;
  searchTerm: string;
}): { slices: Slice[]; total: number } {
  const { expenses, start, end, searchTerm } = args;
  const q = searchTerm.trim().toLowerCase();

  const totals = new Map<string, number>();
  for (const e of expenses) {
    const d = parseDateOnly(e.date);
    if (d < start || d > end) continue;

    if (q) {
      const hay = `${e.category} ${e.description}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
  }

  const sorted = Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const topN = 8;
  const top = sorted.slice(0, topN);
  const other = sorted.slice(topN);
  const otherSum = other.reduce((sum, x) => sum + x.value, 0);
  if (otherSum > 0) {
    top.push({ label: 'Other', value: otherSum });
  }

  const computed: Slice[] = top.map((t) => ({
    label: t.label,
    value: t.value,
    color: colorForLabel(t.label),
  }));

  const totalValue = computed.reduce((sum, s) => sum + s.value, 0);
  return { slices: computed, total: totalValue };
}

function PieSvg({
  slices,
  total,
  size,
  r,
  stroke,
  animate = false,
}: {
  slices: Slice[];
  total: number;
  size: number;
  r: number;
  stroke: number;
  animate?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const centerText = total > 0 ? formatCurrency(total) : 'No data';
  const centerRadius = Math.max(18, r - stroke / 2 - 6);

  let currentAngle = 0;
  const piePaths = slices.map((s, index) => {
    const frac = total > 0 ? s.value / total : 0;
    const angle = frac * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    if (angle <= 0.5) return null;
    if (angle >= 359.5) {
      return (
        <circle
          key={s.label}
          cx={cx}
          cy={cy}
          r={r}
          stroke={s.color}
          strokeWidth={stroke}
          fill="none"
          pathLength={100}
          className={animate ? 'pie-slice-draw' : undefined}
          style={
            animate
              ? ({ '--slice-delay': `${index * 110}ms` } as CSSProperties)
              : undefined
          }
        >
          <title>
            {s.label}: {formatCurrency(s.value)} (
            {total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}%)
          </title>
        </circle>
      );
    }

    const d = describeArc(cx, cy, r, startAngle, endAngle);

    return (
      <path
        key={s.label}
        d={d}
        stroke={s.color}
        strokeWidth={stroke}
        strokeLinecap="butt"
        fill="none"
        pathLength={100}
        className={animate ? 'pie-slice-draw' : undefined}
        style={
          animate
            ? ({ '--slice-delay': `${index * 110}ms` } as CSSProperties)
            : undefined
        }
      >
        <title>
          {s.label}: {formatCurrency(s.value)} (
          {total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}%)
        </title>
      </path>
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={animate ? 'pie-chart-pop' : undefined}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="var(--chart-track)"
        strokeWidth={stroke}
        fill="none"
      />
      {piePaths}
      <circle
        cx={cx}
        cy={cy}
        r={centerRadius}
        className="fill-white dark:fill-slate-950"
        opacity={0.82}
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`fill-slate-900 dark:fill-slate-50 font-semibold ${animate ? 'pie-center-fade' : ''}`}
        style={{ fontSize: 16, animationDelay: animate ? '520ms' : undefined }}
      >
        {centerText}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`fill-slate-500 dark:fill-slate-300 ${animate ? 'pie-center-fade' : ''}`}
        style={{ fontSize: 12, animationDelay: animate ? '610ms' : undefined }}
      >
        by category
      </text>
    </svg>
  );
}

export function CategoryPieChart({ expenses }: { expenses: Expense[] }) {
  const [range, setRange] = useState<MainTimeRange>('week');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRange, setModalRange] = useState<ModalTimeRange>('day');
  const [searchTerm, setSearchTerm] = useState('');

  const { slices, total } = useMemo(() => {
    const now = new Date();
    const { start, end } = startEndForMainRange(now, range);
    return computeSlices({ expenses, start, end, searchTerm: '' });
  }, [expenses, range]);

  const mainSize = 220;
  const mainR = 82;
  const mainStroke = 34;

  const modalComputed = useMemo(() => {
    const now = new Date();
    const { start, end } = startEndForModalRange(now, modalRange);
    return computeSlices({ expenses, start, end, searchTerm });
  }, [expenses, modalRange, searchTerm]);

  const modalTotal = modalComputed.total;
  const modalSlices = modalComputed.slices;

  const modalSize = 300;
  const modalR = 118;
  const modalStroke = 44;

  return (
    <>
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-semibold text-slate-800">Category Mix</CardTitle>
              <p className="text-xs text-slate-500">Breakdown by category for the selected range.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              {(
                [
                  ['week', 'Week'],
                  ['days', 'Days'],
                  ['months', 'Months'],
                  ['years', 'Years'],
                ] as Array<[MainTimeRange, string]>
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  disabled={total === 0}
                  className={
                    range === key
                      ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50'
                  }
                >
                  {label}
                </Button>
              ))}

              <Button
                type="button"
                disabled={total === 0}
                onClick={() => setModalOpen(true)}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3 py-2"
              >
                View full chart
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {total === 0 ? (
            <div className="text-sm text-slate-500">Add some expenses to see the pie chart.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex items-center justify-center">
                <PieSvg slices={slices} total={total} size={mainSize} r={mainR} stroke={mainStroke} />
              </div>

              <div className="md:col-span-2">
                <div className="space-y-3">
                  {slices
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((s) => {
                      const pct = total > 0 ? (s.value / total) * 100 : 0;
                      return (
                        <div key={s.label} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="inline-block w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                              aria-hidden
                            />
                            <span className="text-base text-slate-700 dark:text-slate-100 truncate">{s.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-semibold text-slate-800 dark:text-slate-50">
                              {formatCurrency(s.value)}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-300">{pct.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 chart-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-5xl rounded-xl bg-white dark:bg-slate-800 shadow-xl p-5 chart-modal-panel text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Pie chart details
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Search by category/description and view category mix for a specific time window.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setModalOpen(false)}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-3 py-2"
              >
                Close
              </Button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['day', 'Day'],
                    ['last24h', 'Last 24h'],
                    ['month', 'Month'],
                    ['year', 'Year'],
                  ] as Array<[ModalTimeRange, string]>
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    disabled={expenses.length === 0}
                    onClick={() => setModalRange(key)}
                    className={
                      modalRange === key
                        ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50'
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="flex-1">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search category or expense description..."
                  className="w-full"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Example: <span className="font-medium">Zomato</span>, <span className="font-medium">Food &amp; Dining</span>, or any keyword you typed.
                </div>
              </div>
            </div>

            {modalTotal === 0 ? (
              <div className="text-sm text-slate-500">
                No expenses match your filters. Try clearing the search box or changing the time window.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="flex items-center justify-center">
                  <PieSvg
                    slices={modalSlices}
                    total={modalTotal}
                    size={modalSize}
                    r={modalR}
                    stroke={modalStroke}
                    animate
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className="space-y-3">
                    {modalSlices
                      .slice()
                      .sort((a, b) => b.value - a.value)
                      .map((s) => {
                        const pct = modalTotal > 0 ? (s.value / modalTotal) * 100 : 0;
                        return (
                          <div key={s.label} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className="inline-block w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                                aria-hidden
                              />
                              <span className="text-base text-slate-700 dark:text-slate-100 truncate">{s.label}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-semibold text-slate-800 dark:text-slate-50">
                                {formatCurrency(s.value)}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-300">{pct.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
