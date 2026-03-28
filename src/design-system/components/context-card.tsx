type ContextFact = {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
};

type ContextGroup = {
  key: string;
  title: string;
  facts: ContextFact[];
};

export default function ContextCard({
  title,
  subtitle,
  groups,
}: {
  title: string;
  subtitle: string;
  groups: ContextGroup[];
}) {
  return (
    <div className="context-card">
      <div className="portfolio-card-header">
        <h3 className="portfolio-side-card-title">{title}</h3>
        <p className="portfolio-card-subtitle">{subtitle}</p>
      </div>
      <div className="portfolio-context-panel">
        {groups.map((group) => (
          <section key={group.key} className="portfolio-context-group" aria-label={group.title}>
            <span className="portfolio-context-group-title">{group.title}</span>
            <dl className="portfolio-context-facts">
              {group.facts.map((fact) => (
                <div key={fact.label} className="portfolio-context-row">
                  <dt>{fact.label}</dt>
                  <dd>
                    <span>{fact.value}</span>
                    {fact.action ?? null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
