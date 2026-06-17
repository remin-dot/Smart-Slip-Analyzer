type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  tone: "good" | "warn";
};

export function MetricCard({ label, value, note, tone }: MetricCardProps) {
  return (
    <article className="panel min-h-32 p-5">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className={tone === "good" ? "mt-2 text-sm font-bold text-mint" : "mt-2 text-sm font-bold text-coral"}>
        {note}
      </p>
    </article>
  );
}
