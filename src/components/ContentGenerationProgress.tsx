import type { ScheduledJobProgress } from '../services/threadsAutoPost'

type ContentGenerationProgressProps = {
  progress: ScheduledJobProgress
}

export function ContentGenerationProgress({ progress }: ContentGenerationProgressProps) {
  const targetCount = Math.max(0, progress.targetCount ?? 0)
  const processedCount = Math.min(targetCount, Math.max(0, progress.processedCount ?? 0))
  const percentage = Math.min(100, Math.max(0, progress.percentage ?? 0))

  return (
    <aside className="generation-progress" role="status" aria-live="polite">
      <span className="generation-progress-spinner" aria-hidden="true" />
      <div className="generation-progress-content">
        <div className="generation-progress-copy">
          <strong>{processedCount} of {targetCount} content processing</strong>
          <span>{percentage}%</span>
        </div>
        <div
          className="generation-progress-track"
          role="progressbar"
          aria-label="Content generation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </aside>
  )
}
