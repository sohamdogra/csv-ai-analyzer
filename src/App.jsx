import { useState, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Pure JS CSV parser
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
  return { headers, rows };
}

// Statistical analysis
function analyzeCSV(text, filename) {
  const { headers, rows } = parseCSV(text);

  const numericCols = headers.filter(h => {
    const vals = rows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
    return vals.length > rows.length * 0.5;
  });

  const categoricalCols = headers.filter(h => !numericCols.includes(h));

  const colStats = {};
  for (const col of numericCols) {
    const vals = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    const median = vals[Math.floor(vals.length / 2)];
    const min = vals[0];
    const max = vals[vals.length - 1];
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const stddev = Math.sqrt(variance);
    colStats[col] = { mean, median, min, max, stddev, count: vals.length };
  }

  const topCol = numericCols.sort((a, b) => {
    const cv = (c) => colStats[c].stddev / (Math.abs(colStats[c].mean) || 1);
    return cv(b) - cv(a);
  })[0];

  let chartData = [];
  if (topCol) {
    if (categoricalCols.length > 0) {
      const groupCol = categoricalCols[0];
      const groups = {};
      rows.forEach(r => {
        const key = r[groupCol]?.slice(0, 12) || "Other";
        const val = parseFloat(r[topCol]);
        if (!isNaN(val)) {
          if (!groups[key]) groups[key] = [];
          groups[key].push(val);
        }
      });
      chartData = Object.entries(groups)
        .map(([label, vals]) => ({ label, value: parseFloat((vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    } else {
      const vals = rows.map(r => parseFloat(r[topCol])).filter(v => !isNaN(v));
      const min = Math.min(...vals), max = Math.max(...vals);
      const bucketSize = (max - min) / 6;
      chartData = Array.from({ length: 6 }, (_, i) => ({
        label: `${(min + i * bucketSize).toFixed(1)}`,
        value: vals.filter(v => v >= min + i * bucketSize && v < min + (i + 1) * bucketSize).length
      }));
    }
  }

  const insights = [];
  if (numericCols.length > 0 && topCol) {
    const s = colStats[topCol];
    insights.push(`"${topCol}" ranges from ${s.min.toLocaleString()} to ${s.max.toLocaleString()}, with a mean of ${s.mean.toFixed(2)} and std dev of ${s.stddev.toFixed(2)}.`);
  }
  if (numericCols.length > 1) {
    const second = numericCols[1];
    const s = colStats[second];
    insights.push(`"${second}" has a median of ${s.median.toLocaleString()} across ${s.count} valid entries.`);
  }
  if (categoricalCols.length > 0) {
    const col = categoricalCols[0];
    const unique = new Set(rows.map(r => r[col])).size;
    insights.push(`"${col}" has ${unique} unique values across ${rows.length} rows.`);
  } else {
    const nullCount = rows.filter(r => headers.some(h => r[h] === "" || r[h] == null)).length;
    insights.push(`${nullCount} rows contain at least one missing value (${((nullCount / rows.length) * 100).toFixed(1)}% of dataset).`);
  }

  const summary = `This dataset "${filename}" contains ${rows.length} rows and ${headers.length} columns — ${numericCols.length} numeric and ${categoricalCols.length} categorical. ${topCol ? `The most variable column is "${topCol}" with values ranging from ${colStats[topCol].min} to ${colStats[topCol].max}.` : ""}`;

  return { summary, rowCount: rows.length, columnCount: headers.length, insights, topColumn: topCol || categoricalCols[0] || headers[0], chartData };
}

export default function CSVAnalyzer() {
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f || !f.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    setFile(f); setError(""); setAnalysis(null);
    const reader = new FileReader();
    reader.onload = (e) => setCsvText(e.target.result);
    reader.readAsText(f);
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const analyze = async () => {
    if (!csvText) return;
    setLoading(true); setError("");
    try {
      await new Promise(r => setTimeout(r, 600));
      const result = analyzeCSV(csvText, file.name);
      setAnalysis(result);
    } catch (e) {
      setError("Analysis failed: " + e.message);
    }
    setLoading(false);
  };

  const reset = () => { setFile(null); setCsvText(""); setAnalysis(null); setError(""); };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
        * { box-sizing: border-box; }
        .scan-line {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px);
          pointer-events: none; z-index: 0;
        }
        .glow { text-shadow: 0 0 20px rgba(0,255,136,0.6); }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(0,255,136,0.15); border-radius: 2px; }
        .btn {
          background: #00ff88; color: #0a0a0f; border: none;
          padding: 12px 32px; font-family: 'Space Mono', monospace;
          font-weight: 700; font-size: 13px; letter-spacing: 2px;
          cursor: pointer; text-transform: uppercase; transition: all 0.2s;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }
        .btn:hover { background: #fff; transform: translateY(-1px); box-shadow: 0 0 24px rgba(0,255,136,0.5); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-ghost {
          background: transparent; color: #00ff88; border: 1px solid rgba(0,255,136,0.3);
          padding: 8px 20px; font-family: 'Space Mono', monospace; font-size: 11px;
          letter-spacing: 1px; cursor: pointer; text-transform: uppercase; transition: all 0.2s;
        }
        .btn-ghost:hover { border-color: #00ff88; background: rgba(0,255,136,0.05); }
        .drop-zone {
          border: 1px dashed rgba(0,255,136,0.3); padding: 48px 24px; text-align: center;
          cursor: pointer; transition: all 0.3s; border-radius: 2px;
        }
        .drop-zone:hover, .drop-zone.active { border-color: #00ff88; background: rgba(0,255,136,0.04); }
        .insight-tag {
          background: rgba(0,255,136,0.07); border: 1px solid rgba(0,255,136,0.2);
          padding: 10px 16px; font-size: 12px; line-height: 1.6; border-left: 3px solid #00ff88;
        }
        .stat-box { background: rgba(0,255,136,0.04); border: 1px solid rgba(0,255,136,0.12); padding: 20px; text-align: center; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="scan-line" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>

        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ color: "#00ff88", fontFamily: "'Space Mono'", fontSize: 12, letterSpacing: 3 }}>SYS://TOOL</span>
            <div style={{ height: 1, flex: 1, background: "rgba(0,255,136,0.2)" }} />
            <span style={{ color: "rgba(0,255,136,0.4)", fontSize: 11 }}>v2.0.0</span>
          </div>
          <h1 className="glow" style={{
            fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 800, margin: 0, lineHeight: 1,
            background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>CSV ANALYZER</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 12, fontFamily: "'Space Mono'" }}>
            &gt; Instant statistical analysis — no sign up, no API key
          </p>
        </div>

        {!analysis ? (
          <div className="card" style={{ padding: 32 }}>
            <div
              className={`drop-zone ${dragging ? "active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              {file ? (
                <div>
                  <div style={{ color: "#00ff88", fontWeight: 700, fontSize: 14 }}>✓ {file.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Drop your CSV file here</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>or click to browse</div>
                </div>
              )}
            </div>

            {error && <div style={{ marginTop: 16, color: "#ff4466", fontSize: 12 }}>&gt; ERR: {error}</div>}

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn" onClick={analyze} disabled={!file || loading}>
                {loading ? <span className="pulse">ANALYZING...</span> : "RUN ANALYSIS"}
              </button>
              {file && <button className="btn-ghost" onClick={reset}>CLEAR</button>}
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "ROWS", value: analysis.rowCount?.toLocaleString() },
                { label: "COLUMNS", value: analysis.columnCount },
                { label: "FILE", value: file?.name?.split(".")[0]?.toUpperCase()?.slice(0, 10) },
              ].map((s, i) => (
                <div key={i} className="stat-box">
                  <div style={{ fontSize: 24, fontFamily: "'Syne'", fontWeight: 800, color: "#00ff88" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#00ff88", marginBottom: 12 }}>SUMMARY</div>
              <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", fontSize: 14 }}>{analysis.summary}</p>
            </div>

            {analysis.chartData?.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#00ff88", marginBottom: 20 }}>
                  DATA VISUALIZATION — {analysis.topColumn?.toUpperCase()}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analysis.chartData}>
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0a0a0f", border: "1px solid rgba(0,255,136,0.3)", fontFamily: "'Space Mono'", fontSize: 11 }} labelStyle={{ color: "#00ff88" }} itemStyle={{ color: "#fff" }} />
                    <Bar dataKey="value" fill="#00ff88" radius={[2, 2, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#00ff88", marginBottom: 16 }}>KEY INSIGHTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analysis.insights?.map((ins, i) => (
                  <div key={i} className="insight-tag">
                    <span style={{ color: "#00ff88", marginRight: 10, fontSize: 10 }}>#{String(i + 1).padStart(2, "0")}</span>
                    {ins}
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-ghost" onClick={reset}>← ANALYZE ANOTHER FILE</button>
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>STATISTICAL ANALYSIS ENGINE</span>
          <span style={{ fontSize: 10, color: "rgba(0,255,136,0.3)" }}>100% client-side</span>
        </div>
      </div>
    </div>
  );
}
