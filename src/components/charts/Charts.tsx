import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FinancialProfile,
  ScenarioResult,
  SimulationResult,
} from "../../types";
import { money, number } from "../../utils/format";
import { assetColors, scenarioAppearance } from "../../data/visualTheme";

const axis = {
  fontSize: "var(--text-chart)",
  fill: "var(--muted)",
  fontFamily: "inherit",
};
const currencyTick = (v: number) => money(v, true).replace("MYR", "RM");
const tip = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "0 8px 32px var(--shadow-color)",
  fontSize: "var(--text-chart)",
};
const tooltipValue = (v: unknown) => money(Number(v));

export function WealthChart({
  simulation,
  profile,
  real,
  showAccounts = false,
}: {
  simulation: SimulationResult;
  profile: FinancialProfile;
  real: boolean;
  showAccounts?: boolean;
}) {
  const data = simulation.points
    .filter(
      (p, i) =>
        i % 12 === 0 ||
        p.milestones.length > 0 ||
        i === simulation.points.length - 1,
    )
    .map((p) => {
      const factor = real
        ? Math.pow(1 + profile.inflation, p.age - profile.currentAge)
        : 1;
      return {
        age: p.age,
        wealth: p.netWorth / factor,
        accessible: p.accessibleAssets / factor,
        epf: p.epf / factor,
        asb: p.asb / factor,
        stocks: p.stocks / factor,
        other: (p.cash + p.other) / factor,
        milestones: p.milestones.join(", "),
      };
    });
  const milestones = simulation.points.filter((p) =>
    p.milestones.some((m) => m !== "Retirement begins"),
  );
  return (
    <div
      className="chart-frame"
      role="img"
      aria-label={`Projected ${real ? "inflation-adjusted" : "nominal"} net worth from age ${profile.currentAge} to ${profile.lifeExpectancy}. Retirement at ${simulation.retirementAge}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 28, right: 20, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--sage)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--sage)" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="age"
            type="number"
            domain={[profile.currentAge, profile.lifeExpectancy]}
            tick={axis}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
            tickFormatter={(v) => `${number(Number(v))}`}
          />
          <YAxis
            tickFormatter={currencyTick}
            tick={axis}
            axisLine={false}
            tickLine={false}
            width={88}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) =>
              `Age ${number(Number(v))}${data.find((p) => p.age === Number(v))?.milestones ? ` · ${data.find((p) => p.age === Number(v))?.milestones}` : ""}`
            }
            contentStyle={tip}
          />
          <ReferenceLine
            x={simulation.retirementAge}
            stroke="var(--amber-strong)"
            strokeDasharray="4 4"
            label={{
              value: "Financial freedom",
              position: "insideTopRight",
              fontSize: "var(--text-chart)",
              fill: "var(--amber-strong)",
            }}
          />
          {milestones.map((p) => (
            <ReferenceLine
              key={p.month}
              x={p.age}
              stroke="var(--amber-strong)"
              strokeDasharray="2 5"
            />
          ))}
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="wealth"
            name="Net worth"
            stroke="var(--sage-strong)"
            strokeWidth={2.8}
            fill="url(#wealthFill)"
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="accessible"
            name="Accessible investments"
            stroke="var(--blue-strong)"
            strokeWidth={1.7}
            strokeDasharray="4 4"
            fill="transparent"
          />
          {showAccounts && (
            <>
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="epf"
                name="EPF"
                stroke="var(--sage-strong)"
                strokeDasharray="2 3"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="asb"
                name="ASB"
                stroke="var(--amber-strong)"
                strokeDasharray="8 3"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="stocks"
                name="Stocks & ETFs"
                stroke="var(--blue-strong)"
                strokeDasharray="6 3 1 3"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="other"
                name="Cash & other"
                stroke="var(--rose-strong)"
                fill="transparent"
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AllocationChart({ profile }: { profile: FinancialProfile }) {
  const groups = [
    { name: "EPF / KWSP", value: 0 },
    { name: "ASB / ASNB", value: 0 },
    { name: "Stocks & ETFs", value: 0 },
    { name: "Cash & deposits", value: 0 },
    { name: "Other assets", value: 0 },
  ];
  profile.accounts.forEach((a) => {
    const group =
      a.type === "epf"
        ? 0
        : a.type === "asb"
          ? 1
          : ["etf", "stocks-my", "stocks-us", "unit-trust"].includes(a.type)
            ? 2
            : ["cash", "bank", "fixed-deposit"].includes(a.type)
              ? 3
              : 4;
    groups[group].value += a.balance;
  });
  const total = groups.reduce((s, g) => s + g.value, 0);
  return (
    <div className="allocation-content">
      <div
        className="donut-wrap"
        role="img"
        aria-label={`Asset allocation, total ${money(total)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total ? groups : [{ name: "No assets", value: 1 }]}
              dataKey="value"
              innerRadius="70%"
              outerRadius="92%"
              paddingAngle={4}
              stroke="none"
              isAnimationActive={false}
            >
              {(total ? groups : [groups[0]]).map((g, i) => (
                <Cell
                  key={g.name}
                  fill={total ? assetColors[i] : "var(--chart-empty)"}
                />
              ))}
            </Pie>
            <Tooltip formatter={tooltipValue} contentStyle={tip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span>Total assets</span>
          <strong>{money(total, true)}</strong>
        </div>
      </div>
      <div className="allocation-legend">
        {groups.map((g, i) => (
          <div key={g.name}>
            <span
              className="legend-dot"
              style={{ background: assetColors[i] }}
            />
            <span>{g.name}</span>
            <strong>{total ? Math.round((g.value / total) * 100) : 0}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function annualRows(
  simulation: SimulationResult,
  profile: FinancialProfile,
  real: boolean,
) {
  const grouped = new Map<
    number,
    {
      age: number;
      spending: number;
      growth: number;
      withdrawals: number;
      support: number;
      education: number;
      gifts: number;
    }
  >();
  simulation.points.forEach((p, i) => {
    if (i === 0) return;
    const age = Math.floor(p.age - 0.00001);
    const row = grouped.get(age) ?? {
      age,
      spending: 0,
      growth: 0,
      withdrawals: 0,
      support: 0,
      education: 0,
      gifts: 0,
    };
    const factor = real
      ? Math.pow(1 + profile.inflation, p.age - profile.currentAge)
      : 1;
    row.spending += p.spending / factor;
    row.growth += p.investmentGrowth / factor;
    row.withdrawals += p.withdrawals / factor;
    row.support += p.childSupport / factor;
    row.education += p.education / factor;
    row.gifts += p.gifts / factor;
    grouped.set(age, row);
  });
  return [...grouped.values()];
}

export function CashflowChart({
  simulation,
  profile,
  real,
}: {
  simulation: SimulationResult;
  profile: FinancialProfile;
  real: boolean;
}) {
  const data = annualRows(simulation, profile, real).filter(
    (p) => p.age >= simulation.retirementAge,
  );
  return (
    <div
      className="chart-frame small-chart"
      role="img"
      aria-label="Annual retirement spending, investment returns and portfolio withdrawals"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 5, right: 10, top: 10 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="age"
            tick={axis}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={currencyTick}
            tick={axis}
            width={88}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Age ${v}`}
            contentStyle={tip}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "var(--text-chart)" }}
          />
          <Bar
            dataKey="spending"
            name="Living expenses"
            fill="var(--lavender)"
            stroke="var(--lavender-strong)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="growth"
            name="Investment returns"
            fill="var(--sage)"
            stroke="var(--sage-strong)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="withdrawals"
            name="Withdrawals"
            fill="var(--blue)"
            stroke="var(--blue-strong)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FamilyChart({
  simulation,
  profile,
  real,
}: {
  simulation: SimulationResult;
  profile: FinancialProfile;
  real: boolean;
}) {
  const data = annualRows(simulation, profile, real).filter(
    (p) => p.support + p.education + p.gifts > 0,
  );
  if (!data.length)
    return (
      <div className="chart-empty">
        Add a child in your plan to see support, education and gift milestones
        here.
      </div>
    );
  return (
    <div
      className="chart-frame small-chart"
      role="img"
      aria-label="Annual child support, education and gifts"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="age" tick={axis} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={currencyTick}
            width={88}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Your age ${v}`}
            contentStyle={tip}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "var(--text-chart)" }}
          />
          <Bar
            dataKey="support"
            name="Child support"
            stackId="family"
            fill="var(--rose)"
            stroke="var(--rose-strong)"
          />
          <Bar
            dataKey="education"
            name="Education"
            stackId="family"
            fill="var(--lavender)"
            stroke="var(--lavender-strong)"
          />
          <Bar
            dataKey="gifts"
            name="Gifts"
            stackId="family"
            fill="var(--amber)"
            stroke="var(--amber-strong)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScenarioChart({
  scenarios,
  profile,
  real,
}: {
  scenarios: ScenarioResult[];
  profile: FinancialProfile;
  real: boolean;
}) {
  const data =
    scenarios[0]?.result.simulation.points
      .filter((_, i) => i % 12 === 0)
      .map((p) => {
        const row: Record<string, number> = { age: p.age };
        scenarios.forEach((s) => {
          const point = s.result.simulation.points[p.month];
          const inflation = Math.max(
            -0.99,
            profile.inflation + s.assumptions.inflationAdjustment,
          );
          row[s.id] =
            (point?.netWorth ?? 0) /
            (real ? Math.pow(1 + inflation, p.age - profile.currentAge) : 1);
        });
        return row;
      }) ?? [];
  return (
    <div
      className="chart-frame"
      role="img"
      aria-label="Comparison of net worth under four different financial assumptions"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 5"
            stroke="var(--chart-grid)"
          />
          <XAxis dataKey="age" tick={axis} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={currencyTick}
            tick={axis}
            axisLine={false}
            tickLine={false}
            width={88}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Age ${v}`}
            contentStyle={tip}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: "var(--text-chart)" }}
          />
          {scenarios.map((s) => (
            <Line
              key={s.id}
              dataKey={s.id}
              name={s.name}
              stroke={
                (scenarioAppearance[s.id] ?? scenarioAppearance.custom).stroke
              }
              strokeDasharray={
                (scenarioAppearance[s.id] ?? scenarioAppearance.custom).dash
              }
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
