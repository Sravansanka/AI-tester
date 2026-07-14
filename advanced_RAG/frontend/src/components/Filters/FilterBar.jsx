const selectStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--cream-50)",
  color: "var(--ink-900)",
  fontSize: 12,
};

function FacetSelect({ label, value, onChange, options }) {
  return (
    <select style={selectStyle} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{label}: any</option>
      {Object.entries(options || {}).map(([name, count]) => (
        <option key={name} value={name}>
          {name} ({count})
        </option>
      ))}
    </select>
  );
}

export default function FilterBar({ stats, filters, onChange }) {
  if (!stats) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 24px", borderBottom: "1px solid var(--line)" }}>
      <FacetSelect
        label="Component"
        value={filters.component}
        options={stats.components}
        onChange={(v) => onChange({ ...filters, component: v })}
      />
      <FacetSelect
        label="Priority"
        value={filters.priority}
        options={stats.priorities}
        onChange={(v) => onChange({ ...filters, priority: v })}
      />
      <FacetSelect
        label="Scenario"
        value={filters.scenario_type}
        options={stats.scenario_types}
        onChange={(v) => onChange({ ...filters, scenario_type: v })}
      />
      <span style={{ fontSize: 12, color: "var(--ink-500)", marginLeft: "auto", alignSelf: "center" }}>
        {stats.total_points?.toLocaleString()} test cases indexed
      </span>
    </div>
  );
}
