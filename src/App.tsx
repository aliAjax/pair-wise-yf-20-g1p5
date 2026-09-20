import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { AdjustNotice, ShowState } from "./types";
import { loadShow, resetShow, saveShow } from "./storage";
import { computeShift, fmtDelta, fmtTime, linkClearance, validateShow } from "./scheduler";
import { CATEGORY_COLORS, CATEGORY_ORDER, categoryOf } from "./categories";
import { Timeline } from "./components/Timeline";
import { PointMap } from "./components/PointMap";
import { SegmentTable } from "./components/SegmentTable";
import { ModelList } from "./components/ModelList";
import { ConflictPanel } from "./components/ConflictPanel";
import { Preview } from "./components/Preview";

const project = {
  sourceNo: 10,
  id: "hxyfront-62008",
  port: 62008,
  title: "烟花燃放脚本编排",
  prompt:
    "我想做一个面向烟花燃放编排师的燃放脚本前端工具，可以记录节目段落、烟花型号、口径、发射角度、点火时间、持续时间、安全距离和音乐时间点。页面需要有时间轴编排、燃放点位平面图、型号清单、冲突时间提示和整场节目预览。",
};

interface LogEntry {
  at: string;
  ok: boolean;
  text: string;
}

function now(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function App() {
  const [show, setShow] = useState<ShowState>(loadShow);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdjustNotice | null>(null);
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  // 整场预览走带（8 倍速）
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setPlayhead((p) => {
        const next = (p ?? 0) + 0.8;
        if (next >= show.musicEnd) {
          setPlaying(false);
          return show.musicEnd;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [playing, show.musicEnd]);

  // 当前时间轴体检（每次成功变更后重算）
  const currentConflicts = useMemo(
    () => validateShow(show.segments, show.points, show.ceaseWindows, show.musicEnd),
    [show]
  );

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of [...currentConflicts, ...(notice?.ok ? [] : (notice?.conflicts ?? []))]) {
      c.segmentIds?.forEach((id) => ids.add(id));
    }
    return ids;
  }, [currentConflicts, notice]);

  const hotPointIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of show.segments) {
      if (conflictIds.has(s.id)) ids.add(s.pointId);
    }
    return ids;
  }, [show.segments, conflictIds]);

  /** 段落改时：顺延 → 校验 → 通过则保存，冲突则整体拒绝 */
  function applyDuration(segmentId: string, newDuration: number) {
    const seg = show.segments.find((s) => s.id === segmentId);
    if (!seg || newDuration <= 0 || newDuration === seg.duration) return;

    const shift: { segments: ShowState["segments"]; movedIds: string[]; delta: number } = computeShift(
      show.segments,
      segmentId,
      newDuration
    );
    const conflicts = validateShow(shift.segments, show.points, show.ceaseWindows, show.musicEnd);

    if (conflicts.length > 0) {
      // 整体拒绝：原时间轴、点位表、统计保持不变
      const text = `「${seg.name}」时值 ${fmtDelta(shift.delta)} 会产生 ${conflicts.length} 处冲突，本次调整未写入，原时间轴保持不变。`;
      setNotice({ ok: false, text, conflicts, at: now() });
      setLog((l) => [{ at: now(), ok: false, text }, ...l].slice(0, 6));
      return;
    }

    const next = saveShow({ ...show, segments: shift.segments });
    setShow(next);
    const text =
      shift.movedIds.length > 0
        ? `「${seg.name}」时值 ${fmtDelta(shift.delta)}，其后 ${shift.movedIds.length} 个段落已整体顺延（至下一个定格前），校验通过。`
        : `「${seg.name}」时值 ${fmtDelta(shift.delta)}，其后无受影响段落，校验通过。`;
    setNotice({ ok: true, text, conflicts: [], at: now() });
    setLog((l) => [{ at: now(), ok: true, text }, ...l].slice(0, 6));
  }

  /** 定格切换：只影响后续顺延的传播，不移动任何段落 */
  function toggleLock(segmentId: string) {
    const next = saveShow({
      ...show,
      segments: show.segments.map((s) => (s.id === segmentId ? { ...s, locked: !s.locked } : s)),
    });
    setShow(next);
  }

  function exportSummary() {
    const payload = {
      项目: project.id,
      导出时间: new Date().toISOString(),
      配乐终点: fmtTime(show.musicEnd),
      停火窗: show.ceaseWindows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)} ${w.reason}`),
      段落: show.segments.map((s) => ({
        段落: s.name,
        型号: s.model,
        口径: s.caliber,
        发射角度: `${s.angle}°`,
        点位: s.pointId,
        点火时间: fmtTime(s.start),
        时值: `${s.duration}s`,
        安全距离: `${s.safety}m`,
        定格: s.locked ? "是" : "否",
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fireworks-script.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    if (!window.confirm("恢复初始脚本？浏览器中保存的调整将被清除。")) return;
    setShow(resetShow());
    setNotice(null);
    setPlayhead(null);
    setPlaying(false);
    setLog((l) => [{ at: now(), ok: true, text: "已恢复初始脚本。" }, ...l].slice(0, 6));
  }

  function toggleFilter(cat: string) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const visibleIds =
    filters.size > 0
      ? new Set(show.segments.filter((s) => filters.has(categoryOf(s.model))).map((s) => s.id))
      : null;
  const dimmedIds = new Set(
    visibleIds ? show.segments.filter((s) => !visibleIds.has(s.id)).map((s) => s.id) : []
  );

  const totalShots = show.segments.reduce((n, s) => n + s.shots, 0);
  const minLinkDist = Math.min(
    ...show.links.map(([a, b]) => {
      const pa = show.points.find((p) => p.id === a)!;
      const pb = show.points.find((p) => p.id === b)!;
      return linkClearance(pa, pb, show.segments).dist;
    })
  );
  const metrics: [string, string][] = [
    ["节目段落", String(show.segments.length)],
    ["点火节点", `${totalShots}发`],
    ["冲突提示", String(currentConflicts.length)],
    ["安全距离", `${minLinkDist.toFixed(1)}m`],
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong className={label === "冲突提示" && value !== "0" ? "bad-num" : ""}>{value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>时间轴编排</p>
            <h2>燃放时间轴</h2>
          </div>
          <div className="heading-actions">
            {show.savedAt && <small className="saved-at">已保存 {new Date(show.savedAt).toLocaleString("zh-CN")}</small>}
            <button onClick={exportSummary}>导出摘要</button>
            <button onClick={resetAll}>重置脚本</button>
          </div>
        </div>
        <Timeline
          segments={show.segments}
          points={show.points}
          ceaseWindows={show.ceaseWindows}
          musicEnd={show.musicEnd}
          selectedId={selectedId}
          conflictIds={conflictIds}
          dimmedIds={dimmedIds}
          playhead={playhead}
          onSelect={setSelectedId}
        />
        <div className="legend">
          {CATEGORY_ORDER.map((c) => (
            <span key={c}>
              <i className="dot" style={{ background: CATEGORY_COLORS[c] }} />
              {c}
            </span>
          ))}
          <span>
            <i className="swatch cease" /> 停火窗
          </span>
          <span>🔒 定格段落（不移动，阻断顺延）</span>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>型号筛选</h2>
          <div className="chips">
            {CATEGORY_ORDER.map((c) => (
              <button key={c} className={filters.has(c) ? "chip-on" : ""} onClick={() => toggleFilter(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="side-note">
            <h3>顺延规则</h3>
            <ol>
              <li>修改任一段落的时值（持续时间）。</li>
              <li>其后段落整体平移相同时差，直到下一个定格段落前。</li>
              <li>已勾选的定格段落永不移动。</li>
              <li>顺延结果若触碰停火窗、相邻点位安全距离或配乐终点，整次拒绝并列出冲突。</li>
              <li>校验通过的调整自动保存到浏览器，刷新后继续。</li>
            </ol>
          </div>
        </aside>

        <section className="panel">
          <div className="heading">
            <div>
              <p>段落时值</p>
              <h2>节目段落调整</h2>
            </div>
          </div>
          <SegmentTable
            segments={show.segments}
            selectedId={selectedId}
            visibleIds={visibleIds}
            onSelect={setSelectedId}
            onApplyDuration={applyDuration}
            onToggleLock={toggleLock}
          />
        </section>
      </section>

      <section className="duo">
        <section className="panel">
          <div className="heading">
            <div>
              <p>燃放点位</p>
              <h2>点位平面图</h2>
            </div>
          </div>
          <PointMap points={show.points} links={show.links} segments={show.segments} hotPointIds={hotPointIds} />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>库存与用量</p>
              <h2>型号清单</h2>
            </div>
          </div>
          <ModelList segments={show.segments} />
        </section>
      </section>

      <section className="duo">
        <section className="panel">
          <div className="heading">
            <div>
              <p>冲突时间提示</p>
              <h2>校验与拒绝记录</h2>
            </div>
          </div>
          <ConflictPanel currentConflicts={currentConflicts} notice={notice} />
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>整场节目预览</p>
              <h2>流程走带</h2>
            </div>
          </div>
          <Preview
            segments={show.segments}
            musicEnd={show.musicEnd}
            playhead={playhead}
            playing={playing}
            onToggle={() => {
              if (playing) setPlaying(false);
              else {
                if (playhead === null || playhead >= show.musicEnd) setPlayhead(0);
                setPlaying(true);
              }
            }}
          />
        </section>
      </section>

      {log.length > 0 && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>历史记录</p>
              <h2>近期调整</h2>
            </div>
          </div>
          <div className="records">
            {log.map((entry, i) => (
              <article key={i}>
                <b className={entry.ok ? "" : "log-bad"}>{entry.ok ? "✓" : "✕"}</b>
                <div>
                  <h3>{entry.at}</h3>
                  <p>{entry.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
