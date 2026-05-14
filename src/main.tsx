import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity,
  Archive,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Cloud,
  Command,
  Database,
  GitBranch,
  LayoutDashboard,
  Play,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import './styles.css'

type Agent = {
  name: string
  role: string
  status: 'active' | 'queued' | 'review'
  load: number
  current: string
}

type Task = {
  title: string
  owner: string
  priority: 'High' | 'Medium' | 'Low'
  eta: string
}

const agents: Agent[] = [
  {
    name: 'Ops Architect',
    role: 'Company systems',
    status: 'active',
    load: 78,
    current: 'Mapping autonomous departments',
  },
  {
    name: 'Research Scout',
    role: 'Market intelligence',
    status: 'active',
    load: 63,
    current: 'Collecting competitor signals',
  },
  {
    name: 'Delivery Lead',
    role: 'Execution quality',
    status: 'review',
    load: 44,
    current: 'Reviewing deployment checklist',
  },
  {
    name: 'Finance Clerk',
    role: 'Runway and invoices',
    status: 'queued',
    load: 22,
    current: 'Waiting for billing connectors',
  },
]

const tasks: Task[] = [
  {
    title: 'Define the first autonomous company operating loop',
    owner: 'Ops Architect',
    priority: 'High',
    eta: 'Today',
  },
  {
    title: 'Create knowledge intake rules for project docs',
    owner: 'Research Scout',
    priority: 'High',
    eta: '2h',
  },
  {
    title: 'Prepare Coolify deployment health checks',
    owner: 'Delivery Lead',
    priority: 'Medium',
    eta: '4h',
  },
  {
    title: 'Draft agent budget and approval thresholds',
    owner: 'Finance Clerk',
    priority: 'Low',
    eta: 'Tomorrow',
  },
]

const activity = [
  'Paperclip workspace initialized',
  'GitHub repository linked for deployment',
  'Coolify production target prepared',
  'Agent control surface created',
]

const navItems = [
  { label: 'Command', icon: Command, active: true },
  { label: 'Agents', icon: Bot },
  { label: 'Workflows', icon: Workflow },
  { label: 'Knowledge', icon: Brain },
  { label: 'Deployments', icon: Rocket },
  { label: 'Settings', icon: Settings },
]

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Paperclip navigation">
        <div className="brand">
          <span className="brand-mark">
            <Archive size={19} />
          </span>
          <div>
            <strong>Paperclip</strong>
            <span>Autonomous company OS</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button className={item.active ? 'nav-item active' : 'nav-item'} key={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="deploy-card">
          <div className="deploy-icon">
            <Cloud size={18} />
          </div>
          <strong>Coolify ready</strong>
          <span>Production domain can point at this app when DNS is moved.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyeline">Command center</p>
            <h1>Paperclip</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button">
              <GitBranch size={17} />
              GitHub linked
            </button>
            <button className="primary-button">
              <Plus size={17} />
              New agent
            </button>
          </div>
        </header>

        <section className="status-grid" aria-label="Operational status">
          <Metric icon={ShieldCheck} label="Deployment" value="Ready" tone="green" />
          <Metric icon={Bot} label="Agents online" value="3 / 4" tone="teal" />
          <Metric icon={Database} label="Knowledge sources" value="8" tone="amber" />
          <Metric icon={Activity} label="Open loops" value="12" tone="charcoal" />
        </section>

        <section className="main-grid">
          <div className="panel operations-panel">
            <PanelHeader icon={LayoutDashboard} title="Agent operations" action="Run cycle" />
            <div className="agent-lanes">
              {agents.map((agent) => (
                <article className="agent-card" key={agent.name}>
                  <div className="agent-card-top">
                    <div>
                      <strong>{agent.name}</strong>
                      <span>{agent.role}</span>
                    </div>
                    <StatusPill status={agent.status} />
                  </div>
                  <p>{agent.current}</p>
                  <div className="load-row">
                    <span>Load</span>
                    <strong>{agent.load}%</strong>
                  </div>
                  <div className="load-track">
                    <span style={{ width: `${agent.load}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel queue-panel">
            <PanelHeader icon={ClipboardList} title="Priority queue" action="Triage" />
            <div className="task-list">
              {tasks.map((task) => (
                <button className="task-row" key={task.title}>
                  <span className={`priority-dot ${task.priority.toLowerCase()}`} />
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.owner}</small>
                  </span>
                  <span className="task-meta">{task.eta}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="panel readiness-panel">
            <PanelHeader icon={CheckCircle2} title="Deployment readiness" action="Inspect" />
            <ul className="check-list">
              <li>
                <CheckCircle2 size={17} />
                Dockerfile builds static app
              </li>
              <li>
                <CheckCircle2 size={17} />
                Nginx serves SPA routes
              </li>
              <li>
                <CheckCircle2 size={17} />
                GitHub remote configured
              </li>
              <li className="muted-check">
                <CircleDot size={17} />
                Point paperclip.luckysparrow.ch to Coolify
              </li>
            </ul>
          </div>

          <div className="panel activity-panel">
            <PanelHeader icon={Activity} title="Activity" action="Live" />
            <ol className="activity-list">
              {activity.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
  tone: string
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function PanelHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof LayoutDashboard
  title: string
  action: string
}) {
  return (
    <div className="panel-header">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      <button>
        {action === 'Run cycle' && <Play size={14} />}
        {action}
      </button>
    </div>
  )
}

function StatusPill({ status }: { status: Agent['status'] }) {
  return <span className={`status-pill ${status}`}>{status}</span>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
