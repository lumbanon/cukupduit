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

const colors = ["#8EA66B", "#D8A2A2", "#d1b878", "#91aab0", "#b5b0c4"];
const axis = { fontSize: 11, fill: "#65705b", fontFamily: "inherit" };
const currencyTick = (v: number) => money(v, true).replace("MYR", "RM");
const tip = {
  borderRadius: 12,
  border: "1px solid #e8e9e1",
  boxShadow: "0 8px 32px #30352d0d",
  fontSize: 12,
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
              <stop offset="0%" stopColor="#8EA66B" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#8EA66B" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            stroke="#edeee8"
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
            width={72}
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
            stroke="#a1857b"
            strokeDasharray="4 4"
            label={{
              value: "Financial freedom",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#937b71",
            }}
          />
          {milestones.map((p) => (
            <ReferenceLine
              key={p.month}
              x={p.age}
              stroke="#d1b878"
              strokeDasharray="2 5"
            />
          ))}
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="wealth"
            name="Net worth"
            stroke="#8EA66B"
            strokeWidth={2.8}
            fill="url(#wealthFill)"
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="accessible"
            name="Accessible investments"
            stroke="#D8A2A2"
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
                stroke="#91aab0"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="asb"
                name="ASB"
                stroke="#d1b878"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="stocks"
                name="Stocks & ETFs"
                stroke="#b5b0c4"
                fill="transparent"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="other"
                name="Cash & other"
                stroke="#b9bda7"
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
                <Cell key={g.name} fill={total ? colors[i] : "#eee"} />
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
            <span className="legend-dot" style={{ background: colors[i] }} />
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
          <CartesianGrid vertical={false} stroke="#edeee8" />
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
            width={72}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Age ${v}`}
            contentStyle={tip}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="spending"
            name="Living expenses"
            fill="#D8A2A2"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="growth"
            name="Investment returns"
            fill="#8EA66B"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="withdrawals"
            name="Withdrawals"
            fill="#d1b878"
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
          <CartesianGrid vertical={false} stroke="#edeee8" />
          <XAxis dataKey="age" tick={axis} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={currencyTick}
            width={72}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Your age ${v}`}
            contentStyle={tip}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="support"
            name="Child support"
            stackId="family"
            fill="#8EA66B"
          />
          <Bar
            dataKey="education"
            name="Education"
            stackId="family"
            fill="#d1b878"
          />
          <Bar
            dataKey="gifts"
            name="Gifts"
            stackId="family"
            fill="#D8A2A2"
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
            stroke="#edeee8"
          />
          <XAxis dataKey="age" tick={axis} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={currencyTick}
            tick={axis}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={tooltipValue}
            labelFormatter={(v) => `Age ${v}`}
            contentStyle={tip}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {scenarios.map((s, i) => (
            <Line
              key={s.id}
              dataKey={s.id}
              name={s.name}
              stroke={colors[i]}
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
