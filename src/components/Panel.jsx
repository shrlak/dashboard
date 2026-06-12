export default function Panel({ icon, title, titleKo, actions, footer, span, children }) {
  return (
    <section className={`panel span-${span}`}>
      <div className="panel-head">
        <div className="panel-title">
          <span className="icon">{icon}</span>
          <span>
            {title} {titleKo && <span className="ko">{titleKo}</span>}
          </span>
        </div>
        {actions}
      </div>
      {children}
      {footer && <div className="panel-foot">{footer}</div>}
    </section>
  )
}
