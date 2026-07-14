export default function TwoPaneLayout({ left, right }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--line)",
          background: "var(--cream-50)",
          overflowY: "auto",
          padding: "20px 16px",
        }}
      >
        {left}
      </aside>
      <main style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>{right}</main>
    </div>
  );
}
