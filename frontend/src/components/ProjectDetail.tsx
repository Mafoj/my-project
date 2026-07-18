import { useEffect, useMemo } from 'react';
import type { Project } from '../lib/types';
import { fmtEur, fmtPct } from '../lib/format';
import { STATUS_COLORS, STATUS_FALLBACK } from '../lib/constants';

const OPEN_STATUSES = new Set(['Initiation', 'Starting', 'Ongoing', 'Active', 'Planning']);

interface Props {
  project: Project;
  allProjects: Project[];
  onClose: () => void;
}

export function ProjectDetail({ project, allProjects, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const progress = useMemo(() => {
    if (!project.start_date || !project.end_date) return 0;
    const s = new Date(project.start_date).getTime();
    const e = new Date(project.end_date).getTime();
    const n = Date.now();
    if (n >= e) return 100;
    if (n <= s) return 0;
    return Math.round(((n - s) / (e - s)) * 100);
  }, [project.start_date, project.end_date]);

  const related = useMemo(() => {
    if (!project.pm_name) return [];
    const pm = project.pm_name.trim().toLowerCase();
    return allProjects.filter(
      (r) => r !== project && r.pm_name.trim().toLowerCase() === pm && OPEN_STATUSES.has(r.project_status),
    );
  }, [allProjects, project]);

  const rows: [string, string][] = [
    ['ITS1 Name', project.project_name_its],
    ['PM Name', project.pm_name],
    ['Tower', project.tower],
    ['PC Owner', project.pc_ownership],
    ['Int / Ext', project.int_ext],
    ['BU', project.bu],
    ['Salesforce', project.sales_force],
  ];

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer-hdr">
          <button type="button" className="drawer-close" onClick={onClose}>×</button>
          <div className="drawer-eyebrow">Project Details</div>
          <div className="drawer-title">{project.project_name || '—'}</div>
          <div className="drawer-status-row">
            <span className="badge" style={{ background: STATUS_COLORS[project.project_status] || STATUS_FALLBACK }}>
              {project.project_status || '—'}
            </span>
            {project.bso_io && <span className="drawer-bso">BSO {project.bso_io}</span>}
          </div>
        </div>

        <div className="drawer-body">
          <div className="drawer-timeline">
            <div className="drawer-timeline-dates">
              <div>
                <div className="drawer-label">Start</div>
                <div className="drawer-date">{project.start_date || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="drawer-label">End</div>
                <div className="drawer-date">{project.end_date || '—'}</div>
              </div>
            </div>
            <div className="drawer-progress-track">
              <div className="drawer-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="drawer-fin">
            <div>
              <div className="drawer-label">Value 2026</div>
              <div className="drawer-fin-value">{project.value_2026 ? fmtEur(project.value_2026) : '—'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="drawer-label">Probability</div>
              <div className="drawer-fin-value">{fmtPct(project.probability)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="drawer-label">Weighted</div>
              <div className="drawer-fin-value">{project.value_weighted_2026 ? fmtEur(project.value_weighted_2026) : '—'}</div>
            </div>
          </div>

          <div className="drawer-rows">
            {rows.map(([label, value]) => (
              <div key={label} className="drawer-row">
                <span className="drawer-row-label">{label}</span>
                <span className={`drawer-row-value${value ? '' : ' empty'}`}>{value || 'n/a'}</span>
              </div>
            ))}
          </div>

          {project.comments && (
            <div className="drawer-comments">
              <div className="drawer-label">Comments</div>
              <div>{project.comments}</div>
            </div>
          )}

          {related.length > 0 && (
            <div className="drawer-related">
              <div className="drawer-label">Other projects — {project.pm_name} ({related.length})</div>
              <div className="drawer-related-list">
                {related.map((r, i) => (
                  <div key={i} className="drawer-related-row">
                    <div className="drawer-related-name" title={r.project_name}>{r.project_name}</div>
                    <span className="badge" style={{ background: STATUS_COLORS[r.project_status] || STATUS_FALLBACK }}>
                      {r.project_status || '—'}
                    </span>
                    <span className="drawer-related-value">{r.value_weighted_2026 ? fmtEur(r.value_weighted_2026) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
