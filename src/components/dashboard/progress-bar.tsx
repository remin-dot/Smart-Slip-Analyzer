type ProgressBarProps = {
  progress: number;
  colorClass: string;
};

export function ProgressBar({ progress, colorClass }: ProgressBarProps) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${progress}%` }} />
    </div>
  );
}
