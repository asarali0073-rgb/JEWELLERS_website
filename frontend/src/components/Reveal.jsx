export default function Reveal({ as: Component = "section", className = "", children }) {
  return <Component className={className}>{children}</Component>;
}
