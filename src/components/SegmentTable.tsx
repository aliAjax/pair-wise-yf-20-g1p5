import { useMemo, useState } from "react";
import type { Segment } from "../types";
import { computeShift, fmtDelta, fmtTime } from "../scheduler";
import { colorOf } from "../categories";

interface Props {
  segments: Segment[];
  selectedId: string | null;
  visibleIds: Set<string> | null; // null = 不过滤
  onSelect: (id: string) => void;
  onApplyDuration: (id: string, newDuration: number) => void;
  onToggleLock: (id: string) => void;
}

/** 段落时值调整表：改时后实时预览“整体顺延至下一个定格”的范围 */
export function SegmentTable({ segments, selectedId, visibleIds, onSelect, onApplyDuration, onToggleLock }: Props) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const draftNum = Number(draftValue);
  const draftValid = draftId !== null && Number.isFinite(draftNum) && draftNum > 0;

  // 顺延预览：改时段落之后、下一个定格之前的所有段落
  const preview = useMemo(() => {
    if (!draftValid) return null;
    const seg = segments.find((s) => s.id === draftId);
    if (!seg || seg.duration === draftNum) return null;
    return computeShift(segments, draftId, draftNum);
  }, [segments, draftId, draftNum, draftValid]);

  const movedSet = new Set(preview?.movedIds ?? []);
  const rows = visibleIds ? segments.filter((s) => visibleIds.has(s.id)) : segments;

  return (
    <div className="seg-table">
      <div className="seg-row seg-head">
        <span>定格</span>
        <span>段落 / 型号</span>
        <span>点位</span>
        <span>点火时间</span>
        <span>时值(s)</span>
        <span>终点</span>
        <span />
      </div>
      {rows.map((s) => {
        const isDraft = s.id === draftId;
        const value = isDraft ? draftValue : String(s.duration);
        const moved = movedSet.has(s.id);
        return (
          <div
            key={s.id}
            className={[
              "seg-row",
              s.id === selectedId ? "selected" : "",
              moved ? "moved" : "",
              s.locked ? "locked" : "",
            ].join(" ")}
            onClick={() => onSelect(s.id)}
          >
            <span onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={s.locked}
                onChange={() => onToggleLock(s.id)}
                title="定格：勾选后该段落不移动，并阻断前段顺延"
              />
            </span>
            <span className="seg-name">
              <i style={{ background: colorOf(s.model) }} />
              <b>{s.name}</b>
              <small>
                {s.model} · {s.caliber} · {s.angle}° · {s.shots}发
              </small>
            </span>
            <span>{s.pointId}点</span>
            <span className="mono">
              {fmtTime(s.start)}
              {moved && preview && <em className="shift-badge">顺延{fmtDelta(preview.delta)}</em>}
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <input
                className="dur-input"
                type="number"
                min={0.5}
                step={0.5}
                value={value}
                onChange={(e) => {
                  setDraftId(s.id);
                  setDraftValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draftValid && isDraft) {
                    onApplyDuration(s.id, draftNum);
                    setDraftId(null);
                  }
                }}
              />
            </span>
            <span className="mono">{fmtTime(s.start + s.duration)}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <button
                className="apply-btn"
                disabled={!isDraft || !draftValid || draftNum === s.duration}
                onClick={() => {
                  onApplyDuration(s.id, draftNum);
                  setDraftId(null);
                }}
              >
                应用顺延
              </button>
            </span>
          </div>
        );
      })}
      {preview && (
        <p className="shift-preview">
          预览：「{segments.find((s) => s.id === draftId)?.name}」时值 {fmtDelta(preview.delta)}，
          {preview.movedIds.length > 0
            ? `其后 ${preview.movedIds.length} 个段落整体顺延至下一个定格前`
            : "其后无可顺延段落（紧邻定格或已是末段）"}
          。校验通过后才会写入时间轴。
        </p>
      )}
    </div>
  );
}
