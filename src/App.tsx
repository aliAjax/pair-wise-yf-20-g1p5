import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { DEFAULT_SEGMENTS, DEFAULT_SHOW } from "./data";
import { fmt, shiftForDurationChange, validateShow } from "./schedule";
import { clearSaved, loadSegments, saveSegments } from "./storage";
import { Timeline } from "./components/Timeline";
import { PointMap } from "./components/PointMap";
import type { Conflict, Segment } from "./types";

const PROJECT = {
  id: "hxyfront-62008",
  sourceNo: 10,
  port: 62008,
  title: "烟花燃放脚本编排",
};

const TYPE_FILTERS = ["全部", "礼花弹", "罗马烛光", "扇形架", "冷焰火"];

const CONFLICT_LABEL: Record<Conflict["type"], string> = {
  ceasefire: "停火窗",
  distance: "安全距离",
  musicEnd: "配乐终点",
};

interface Attempt {
  ok: boolean;
  title: string;
  conflicts: Conflict[];
}

function App() {
  const [segments, setSegments] = useState<Segment[]>(() => loadSegments(DEFAULT_SEGMENTS));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("全部");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const show = useMemo(() => ({ ...DEFAULT_SHOW, segments }), [segments]);
  const liveConflicts = useMemo(() => validateShow(show), [show]);
  const pointById = useMemo(() => new Map(show.points.map((p) => [p.id, p])), [show.points]);

  // 整场预览播放游标
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const t0 = performance.now() - (playhead ?? 0);
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= show.musicEnd) {
        setPlayhead(show.musicEnd);
        setPlaying(false);
        return;
      }
      setPlayhead(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const visibleSegments =
    filter === "全部" ? segments : segments.filter((s) => s.product.includes(filter));

  const ignitionCount = new Set(segments.map((s) => s.start)).size;

  const minPairDist = useMemo(() => {
    let min = Infinity;
    for (let i = 0; i < show.points.length; i++) {
      for (let j = i + 1; j < show.points.length; j++) {
        const d = Math.hypot(
          show.points[i].x - show.points[j].x,
          show.points[i].y - show.points[j].y
        );
        if (d < min) min = d;
      }
    }
    return min;
  }, [show.points]);

  const pointRows = show.points.map((p) => {
    const assigned = segments.filter((s) => s.pointId === p.id).map((s) => s.name);
    let nearest: { name: string; dist: number } | null = null;
    for (const q of show.points) {
      if (q.id === p.id) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (!nearest || d < nearest.dist) nearest = { name: q.name, dist: d };
    }
    return { p, assigned, nearest };
  });

  const draftOf = (s: Segment) => drafts[s.id] ?? (s.duration / 1000).toFixed(1);

  function bump(id: string, deltaSec: number) {
    const seg = segments.find((s) => s.id === id);
    if (!seg) return;
    const cur = Number(draftOf(seg));
    const base = Number.isFinite(cur) ? cur : seg.duration / 1000;
    const next = Math.max(1, Math.round((base + deltaSec) * 10) / 10);
    setDrafts((d) => ({ ...d, [id]: next.toFixed(1) }));
  }

  function applyDuration(id: string) {
    const seg = segments.find((s) => s.id === id);
    if (!seg) return;
    const seconds = Number(draftOf(seg));
    if (!Number.isFinite(seconds) || seconds <= 0) {
      setAttempt({ ok: false, title: `「${seg.name}」的时值输入无效，请输入大于 0 的秒数`, conflicts: [] });
      return;
    }
    const newDuration = Math.round(seconds * 1000);
    if (newDuration < 1000) {
      setAttempt({ ok: false, title: `「${seg.name}」时值不能小于 1 秒，调整未执行`, conflicts: [] });
      return;
    }
    if (newDuration === seg.duration) {
      setAttempt({ ok: true, title: `「${seg.name}」时值未变化，时间轴保持原样`, conflicts: [] });
      return;
    }

    // 先在副本上顺延并校验，冲突则整次拒绝，原状态保持不变
    const next = shiftForDurationChange(segments, id, newDuration);
    const conflicts = validateShow({ ...show, segments: next });
    if (conflicts.length > 0) {
      setAttempt({
        ok: false,
        title: `「${seg.name}」时值 ${fmt(seg.duration)} → ${fmt(newDuration)} 的调整被整次拒绝，原时间轴、点位表与统计保持不变`,
        conflicts,
      });
      return;
    }

    const moved = next.filter((n, i) => n.start !== segments[i].start).length;
    setSegments(next);
    saveSegments(next);
    setDrafts((d) => ({ ...d, [id]: (newDuration / 1000).toFixed(1) }));
    setAttempt({
      ok: true,
      title: `「${seg.name}」时值调整为 ${fmt(newDuration)}，${
        moved > 0 ? `${moved} 个后续段落已整体顺延（止于下一个定格段落）` : "无后续段落需要顺延"
      }，结果已保存到浏览器`,
      conflicts: [],
    });
  }

  function toggleLock(id: string) {
    const next = segments.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s));
    setSegments(next);
    saveSegments(next);
    setAttempt(null);
  }

  function resetAll() {
    if (!window.confirm("恢复默认编排？浏览器中保存的调整将被清除。")) return;
    clearSaved();
    setSegments(DEFAULT_SEGMENTS.map((s) => ({ ...s })));
    setDrafts({});
    setAttempt(null);
    setPlayhead(null);
    setPlaying(false);
  }

  const metrics = [
    { label: "节目段落", value: String(segments.length) },
    { label: "点火节点", value: String(ignitionCount) },
    { label: "冲突提示", value: String(liveConflicts.length) },
    { label: "点位最小间距", value: `${minPairDist.toFixed(1)}m` },
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>
          {PROJECT.id} · 源提示词{PROJECT.sourceNo} · Port {PROJECT.port}
        </p>
        <h1>{PROJECT.title}</h1>
        <span>
          记录节目段落、烟花型号、口径、发射角度、点火时间、持续时间、安全距离与音乐时间点；支持段落改时整体顺延、定格保护、停火窗 / 安全距离 / 配乐终点三重校验与整场预览。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>时间轴编排</p>
            <h2>燃放时间轴</h2>
          </div>
          <div className="legend">
            <span>📌 定格段落</span>
            <span className="legend-window">停火窗</span>
            <span>┃ 配乐终点</span>
          </div>
        </div>
        <Timeline
          segments={segments}
          windows={show.windows}
          musicEnd={show.musicEnd}
          playhead={playhead}
          filter={filter}
        />
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>段落改时</p>
            <h2>时值调整与整体顺延</h2>
          </div>
          <div className="chips">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="seg-table">
            <thead>
              <tr>
                <th>定格</th>
                <th>节目段落</th>
                <th>型号 · 口径 · 角度</th>
                <th>点位 · 安全距离</th>
                <th>点火时间</th>
                <th>结束时间</th>
                <th>当前时值</th>
                <th>新时值</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleSegments.map((s) => (
                <tr key={s.id} className={s.locked ? "locked-row" : ""}>
                  <td>
                    <label className="lock-toggle">
                      <input
                        type="checkbox"
                        checked={s.locked}
                        onChange={() => toggleLock(s.id)}
                      />
                      <span>{s.locked ? "定格" : "顺延"}</span>
                    </label>
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>
                    {s.product} · {s.caliber} · {s.angle}°
                  </td>
                  <td>
                    {pointById.get(s.pointId)?.name ?? s.pointId} · {s.safety}m
                  </td>
                  <td className="mono">{fmt(s.start)}</td>
                  <td className="mono">{fmt(s.start + s.duration)}</td>
                  <td className="mono">{(s.duration / 1000).toFixed(1)}s</td>
                  <td>
                    <input
                      className="duration-input"
                      type="number"
                      min={1}
                      step={0.5}
                      value={draftOf(s)}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                      }
                      aria-label={`${s.name} 新时值（秒）`}
                    />
                  </td>
                  <td>
                    <div className="duration-cell">
                      <button className="mini" onClick={() => bump(s.id, -1)}>
                        −1s
                      </button>
                      <button className="mini" onClick={() => bump(s.id, 1)}>
                        +1s
                      </button>
                      <button className="mini primary" onClick={() => applyDuration(s.id)}>
                        改时并顺延
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="heading">
            <div>
              <p>冲突时间提示</p>
              <h2>校验结果</h2>
            </div>
          </div>
          {!attempt && <p className="hint">尚未进行改时操作。调整任意段落时值后，这里会显示校验结论。</p>}
          {attempt && (
            <div className={attempt.ok ? "attempt ok" : "attempt fail"}>
              <strong>{attempt.ok ? "✅ 调整已应用" : "⛔ 调整被拒绝"}</strong>
              <p>{attempt.title}</p>
              {attempt.conflicts.length > 0 && (
                <ul>
                  {attempt.conflicts.map((c, i) => (
                    <li key={i}>
                      <span className={`tag ${c.type}`}>{CONFLICT_LABEL[c.type]}</span>
                      {c.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>编排规则</p>
              <h2>定格与顺延说明</h2>
            </div>
            <button onClick={resetAll}>恢复默认编排</button>
          </div>
          <ul className="rules">
            <li>每个段落都可在上表调整时值（秒），确认后触发整体顺延。</li>
            <li>排在其后的段落按同一差值平移，遇到下一个 📌 定格段落即停止；已勾选的定格段落不得移动。</li>
            <li>
              顺延结果需通过三项校验：点火不得落入停火窗；时段重叠段落的相邻点位间距不得小于安全距离之和；任何段落结束不得越过配乐终点。
            </li>
            <li>任一校验失败，整次调整被拒绝并列出全部冲突，原时间轴、点位表与统计保持不变。</li>
            <li>校验通过的调整立即保存到浏览器，刷新页面后继续生效。</li>
          </ul>
          <p className="hint">
            {show.windows.map((w) => `${w.label} ${fmt(w.start)}–${fmt(w.end)}`).join("；")}
            ；配乐终点 {fmt(show.musicEnd)}。
          </p>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="heading">
            <div>
              <p>燃放点位</p>
              <h2>点位平面图</h2>
            </div>
          </div>
          <PointMap points={show.points} segments={segments} />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>点位表</p>
              <h2>点位与间距</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="point-table">
              <thead>
                <tr>
                  <th>点位</th>
                  <th>坐标 (m)</th>
                  <th>承担段落</th>
                  <th>最近邻点位</th>
                  <th>间距</th>
                </tr>
              </thead>
              <tbody>
                {pointRows.map(({ p, assigned, nearest }) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td className="mono">
                      ({p.x}, {p.y})
                    </td>
                    <td>{assigned.length > 0 ? assigned.join("、") : "—"}</td>
                    <td>{nearest?.name ?? "—"}</td>
                    <td className="mono">{nearest ? `${nearest.dist.toFixed(1)}m` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>整场节目预览</p>
            <h2>节目单与播放</h2>
          </div>
          <div className="toolbar">
            <button
              className="primary"
              onClick={() => {
                if (playhead === null || playhead >= show.musicEnd) setPlayhead(0);
                setPlaying(true);
              }}
              disabled={playing}
            >
              ▶ 播放预览
            </button>
            <button onClick={() => setPlaying(false)} disabled={!playing}>
              ⏸ 暂停
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setPlayhead(null);
              }}
              disabled={playhead === null}
            >
              ⏹ 停止
            </button>
            <span className="mono playhead-time">
              {playhead === null ? "未播放" : `播放至 ${fmt(playhead)}`}
            </span>
          </div>
        </div>
        <div className="preview-list">
          {[...segments]
            .sort((a, b) => a.start - b.start)
            .map((s, i) => (
              <article key={s.id}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {s.locked ? "📌 " : ""}
                    {s.name}
                  </h3>
                  <p>
                    {s.product} · {s.caliber} · {s.angle}° · {pointById.get(s.pointId)?.name ?? s.pointId} ·
                    安全距离 {s.safety}m
                  </p>
                </div>
                <span className="mono">
                  {fmt(s.start)} → {fmt(s.start + s.duration)}
                </span>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}

export default App;
