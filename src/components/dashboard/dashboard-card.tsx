import { ReactNode } from "react";

type DashboardCardProps = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  id?: string;
};

export function DashboardCard({ children, title, eyebrow, icon, id }: DashboardCardProps) {
  return (
    <article className="panel p-5" id={id}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h3 className="mt-1 text-xl font-black">{title}</h3>
        </div>
        {icon ? <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal/10 text-teal">{icon}</div> : null}
      </div>
      {children}
    </article>
  );
}
